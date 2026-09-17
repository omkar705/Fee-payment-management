package com.feepayment.service;

import com.feepayment.model.PaymentOrderRequest;
import com.feepayment.model.PaymentVerificationResponse;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Team 2 — Concurrent Payment Handling Module
 *
 * Demonstrates OS concepts:
 *   - Thread Synchronization     : ReentrantLock guards critical section (slot acquisition)
 *   - Semaphore                  : Limits max concurrent payments to MAX_CONCURRENT_SLOTS
 *   - Producer-Consumer Pattern  : LinkedBlockingQueue between web thread (producer) and worker pool (consumer)
 *   - Thread Pool Management     : ExecutorService with fixed pool of worker threads
 *   - Atomic Operations          : AtomicInteger for lock-free counters
 *
 * Demonstrates DS concepts:
 *   - Queue (FIFO)               : LinkedBlockingQueue for payment request ordering
 *
 * Demonstrates DBMS concepts:
 *   - Concurrent transaction isolation: each worker processes its own transaction independently
 */
@Service
@RequiredArgsConstructor
public class PaymentQueueService {

    private static final Logger log = LoggerFactory.getLogger(PaymentQueueService.class);

    /** Maximum number of payment requests that can be queued */
    private static final int MAX_QUEUE_CAPACITY = 50;

    /** Maximum concurrent payment processing threads (semaphore permits) */
    private static final int MAX_CONCURRENT_SLOTS = 5;

    private final PaymentService paymentService;

    // ===== DATA STRUCTURES =====
    /** FIFO queue for incoming payment requests */
    private final LinkedBlockingQueue<QueuedPayment> paymentQueue =
            new LinkedBlockingQueue<>(MAX_QUEUE_CAPACITY);

    /** Thread pool for draining the queue concurrently */
    private ExecutorService workerPool;

    /** Semaphore — limits concurrent payment processing (OS: resource management) */
    private final Semaphore processingSlots = new Semaphore(MAX_CONCURRENT_SLOTS, true); // fair

    /** ReentrantLock — guards queue statistics update (OS: mutual exclusion) */
    private final ReentrantLock statsLock = new ReentrantLock();

    // ===== ATOMIC COUNTERS (lock-free thread-safe reads) =====
    private final AtomicInteger totalEnqueued   = new AtomicInteger(0);
    private final AtomicInteger totalProcessed  = new AtomicInteger(0);
    private final AtomicInteger totalSucceeded  = new AtomicInteger(0);
    private final AtomicInteger totalFailed     = new AtomicInteger(0);
    private final AtomicInteger activeWorkers   = new AtomicInteger(0);
    private final AtomicInteger rejectedPayments = new AtomicInteger(0);

    /** In-memory log of last 100 queue events (circular) */
    private final ConcurrentLinkedDeque<QueueEvent> eventLog = new ConcurrentLinkedDeque<>();

    @PostConstruct
    public void initWorkerPool() {
        workerPool = Executors.newFixedThreadPool(MAX_CONCURRENT_SLOTS, r -> {
            Thread t = new Thread(r, "payment-worker-" + System.nanoTime());
            t.setDaemon(true);
            return t;
        });
        log.info("PaymentQueueService initialized: {} worker threads, queue capacity={}",
                MAX_CONCURRENT_SLOTS, MAX_QUEUE_CAPACITY);
    }

    @PreDestroy
    public void shutdown() {
        if (workerPool != null && !workerPool.isShutdown()) {
            workerPool.shutdown();
            try {
                if (!workerPool.awaitTermination(10, TimeUnit.SECONDS)) {
                    workerPool.shutdownNow();
                }
            } catch (InterruptedException e) {
                workerPool.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }

    /**
     * Enqueue a payment request for async processing.
     * Returns immediately with a queue ticket / correlation ID.
     *
     * @param request   payment order details
     * @param userEmail authenticated student email
     * @return QueueTicket with correlationId and position
     */
    public QueueTicket enqueue(PaymentOrderRequest request, String userEmail) {
        String correlationId = "QUEUE-" + System.currentTimeMillis() + "-" +
                               Integer.toHexString((int)(Math.random() * 0xFFFF)).toUpperCase();

        QueuedPayment queued = new QueuedPayment(correlationId, request, userEmail, Instant.now());

        boolean accepted = paymentQueue.offer(queued);
        if (!accepted) {
            rejectedPayments.incrementAndGet();
            addEvent(correlationId, "REJECTED", "Queue at capacity (" + MAX_QUEUE_CAPACITY + ")");
            throw new IllegalStateException("Payment queue is at capacity. Please try again shortly.");
        }

        int position = totalEnqueued.incrementAndGet();
        addEvent(correlationId, "ENQUEUED", "Position: " + paymentQueue.size());

        // Submit worker to process this payment asynchronously
        workerPool.submit(() -> processPayment(queued));

        log.info("Payment enqueued: {} | Queue depth: {}", correlationId, paymentQueue.size());
        return new QueueTicket(correlationId, position, paymentQueue.size());
    }

    /**
     * Worker method — runs on thread pool thread.
     * Demonstrates OS concept: Semaphore-based critical section.
     */
    private void processPayment(QueuedPayment queued) {
        // Remove from queue
        paymentQueue.remove(queued);

        // Acquire a processing slot (OS: Semaphore — blocks if all slots busy)
        boolean acquired = false;
        try {
            acquired = processingSlots.tryAcquire(30, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            queued.setStatus("FAILED");
            queued.setError("Worker interrupted while waiting for processing slot");
            addEvent(queued.getCorrelationId(), "INTERRUPTED", "Semaphore wait interrupted");
            totalFailed.incrementAndGet();
            return;
        }

        if (!acquired) {
            queued.setStatus("FAILED");
            queued.setError("Timed out waiting for a payment processing slot");
            addEvent(queued.getCorrelationId(), "TIMEOUT", "No slot available after 30s");
            totalFailed.incrementAndGet();
            totalProcessed.incrementAndGet();
            return;
        }

        activeWorkers.incrementAndGet();
        queued.setStatus("PROCESSING");
        queued.setProcessingStartedAt(Instant.now());
        addEvent(queued.getCorrelationId(), "PROCESSING", "Thread: " + Thread.currentThread().getName());

        try {
            // === CRITICAL SECTION: one payment at a time per slot ===
            // ReentrantLock not strictly needed here since semaphore handles slot limits,
            // but demonstrates the concept explicitly
            statsLock.lock();
            try {
                log.info("Processing payment {} on thread {}",
                        queued.getCorrelationId(), Thread.currentThread().getName());
            } finally {
                statsLock.unlock();
            }
            // === END CRITICAL SECTION ===

            // Simulate processing delay (realistic network latency)
            Thread.sleep(200 + (long)(Math.random() * 300));

            // Delegate to PaymentService (handles actual DB transaction)
            PaymentVerificationResponse result = paymentService.simulatePayment(
                    queued.getRequest(), queued.getUserEmail());

            queued.setStatus("SUCCESS");
            queued.setResult(result);
            queued.setCompletedAt(Instant.now());
            totalSucceeded.incrementAndGet();
            addEvent(queued.getCorrelationId(), "SUCCESS",
                    "TxnID: " + result.getTransactionId() + " | Receipt: " + result.getReceiptNumber());

        } catch (Exception e) {
            queued.setStatus("FAILED");
            queued.setError(e.getMessage());
            queued.setCompletedAt(Instant.now());
            totalFailed.incrementAndGet();
            addEvent(queued.getCorrelationId(), "FAILED", e.getMessage());
            log.error("Payment processing failed for {}: {}", queued.getCorrelationId(), e.getMessage());
        } finally {
            processingSlots.release(); // Always release the semaphore slot
            activeWorkers.decrementAndGet();
            totalProcessed.incrementAndGet();
        }
    }

    /**
     * Returns current queue status snapshot for monitoring dashboard.
     */
    public Map<String, Object> getQueueStatus() {
        Map<String, Object> status = new java.util.LinkedHashMap<>();
        status.put("queueDepth",         paymentQueue.size());
        status.put("maxQueueCapacity",   MAX_QUEUE_CAPACITY);
        status.put("activeWorkers",      activeWorkers.get());
        status.put("maxConcurrentSlots", MAX_CONCURRENT_SLOTS);
        status.put("availableSlots",     processingSlots.availablePermits());
        status.put("totalEnqueued",      totalEnqueued.get());
        status.put("totalProcessed",     totalProcessed.get());
        status.put("totalSucceeded",     totalSucceeded.get());
        status.put("totalFailed",        totalFailed.get());
        status.put("rejectedPayments",   rejectedPayments.get());
        status.put("recentEvents",       getRecentEvents(10));
        return status;
    }

    private void addEvent(String correlationId, String event, String detail) {
        eventLog.addFirst(new QueueEvent(correlationId, event, detail, Instant.now()));
        // Keep only last 100 events (prevent unbounded growth)
        while (eventLog.size() > 100) {
            eventLog.pollLast();
        }
    }

    public List<QueueEvent> getRecentEvents(int limit) {
        List<QueueEvent> result = new ArrayList<>();
        int count = 0;
        for (QueueEvent e : eventLog) {
            if (count++ >= limit) break;
            result.add(e);
        }
        return result;
    }

    // ===== INNER CLASSES =====

    /** Represents a payment request waiting in or being processed from the queue */
    @Getter
    public static class QueuedPayment {
        private final String correlationId;
        private final PaymentOrderRequest request;
        private final String userEmail;
        private final Instant enqueuedAt;
        private volatile String status = "QUEUED";
        private volatile String error;
        private volatile Instant processingStartedAt;
        private volatile Instant completedAt;
        private volatile PaymentVerificationResponse result;

        public QueuedPayment(String correlationId, PaymentOrderRequest request, String userEmail, Instant enqueuedAt) {
            this.correlationId = correlationId;
            this.request = request;
            this.userEmail = userEmail;
            this.enqueuedAt = enqueuedAt;
        }

        public void setStatus(String status) { this.status = status; }
        public void setError(String error) { this.error = error; }
        public void setProcessingStartedAt(Instant t) { this.processingStartedAt = t; }
        public void setCompletedAt(Instant t) { this.completedAt = t; }
        public void setResult(PaymentVerificationResponse r) { this.result = r; }
    }

    /** Queue ticket returned immediately to the caller */
    @Getter
    public static class QueueTicket {
        private final String correlationId;
        private final int queueNumber;
        private final int currentQueueDepth;
        private final String message;

        public QueueTicket(String correlationId, int queueNumber, int depth) {
            this.correlationId = correlationId;
            this.queueNumber = queueNumber;
            this.currentQueueDepth = depth;
            this.message = "Payment enqueued. Correlation ID: " + correlationId;
        }
    }

    /** Event log entry for monitoring */
    @Getter
    public static class QueueEvent {
        private final String correlationId;
        private final String event;
        private final String detail;
        private final String timestamp;

        public QueueEvent(String correlationId, String event, String detail, Instant ts) {
            this.correlationId = correlationId;
            this.event = event;
            this.detail = detail;
            this.timestamp = ts.toString();
        }
    }
}
