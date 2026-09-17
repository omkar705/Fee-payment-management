package com.feepayment.controller;

import com.feepayment.config.RazorpayConfig;
import com.feepayment.model.*;
import com.feepayment.service.PaymentQueueService;
import com.feepayment.service.PaymentRollbackService;
import com.feepayment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.util.*;

/**
 * Team 2 — Payment Processing & Transaction Management REST API Controller
 *
 * Web Technology: Secure REST endpoints over HTTP/HTTPS
 * SWE: Controller layer following MVC pattern
 *
 * Endpoints:
 *   GET  /api/payments/config                          — Gateway configuration (public)
 *   POST /api/payments/create-order                    — Initiate Razorpay order
 *   POST /api/payments/verify-payment                  — HMAC-SHA256 verification
 *   POST /api/payments/simulate-payment                — Demo payment simulation
 *   GET  /api/payments/transactions                    — Student's transaction history
 *   GET  /api/payments/transactions/{id}               — Single transaction detail
 *   GET  /api/payments/receipts/{receiptNumber}        — Receipt by number
 *   GET  /api/payments/receipts/transaction/{id}       — Receipt by transaction ID
 *   POST /api/payments/queue                           — Enqueue async payment (concurrency demo)
 *   GET  /api/payments/queue/status                    — Queue monitoring dashboard
 *   POST /api/payments/rollback/{transactionId}        — ACID rollback (admin only)
 *   GET  /api/payments/gateway-logs                    — Paginated audit logs (admin)
 *   GET  /api/payments/stats                           — Payment statistics summary
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentQueueService paymentQueueService;
    private final PaymentRollbackService paymentRollbackService;
    private final RazorpayConfig razorpayConfig;
    private final JdbcTemplate jdbc;

    // ================================================================
    //  CONFIGURATION
    // ================================================================

    /** GET /api/payments/config — Returns gateway public config (Key ID, currency) */
    @GetMapping("/config")
    public ResponseEntity<ApiResponse> getPaymentConfig() {
        Map<String, String> config = Map.of(
            "keyId",       razorpayConfig.getKeyId(),
            "currency",    razorpayConfig.getCurrency(),
            "companyName", razorpayConfig.getCompanyName()
        );
        return ResponseEntity.ok(ApiResponse.ok("Payment gateway configuration retrieved.", config));
    }

    // ================================================================
    //  CORE PAYMENT PROCESSING
    // ================================================================

    /** POST /api/payments/create-order — Step 1: Initiate Razorpay order */
    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse> createOrder(
            @Valid @RequestBody PaymentOrderRequest request,
            Authentication auth) {
        try {
            String userEmail = auth != null ? auth.getName() : null;
            PaymentOrderResponse response = paymentService.createOrder(request, userEmail);
            return ResponseEntity.ok(ApiResponse.ok("Payment order created successfully.", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to create order: " + e.getMessage()));
        }
    }

    /** POST /api/payments/verify-payment — Step 2: HMAC-SHA256 signature verification */
    @PostMapping("/verify-payment")
    public ResponseEntity<ApiResponse> verifyPayment(
            @Valid @RequestBody PaymentVerificationRequest request,
            Authentication auth) {
        try {
            String userEmail = auth != null ? auth.getName() : null;
            PaymentVerificationResponse response = paymentService.verifyAndProcessPayment(request, userEmail);
            return ResponseEntity.ok(ApiResponse.ok("Payment verified successfully.", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Payment verification error: " + e.getMessage()));
        }
    }

    /** POST /api/payments/simulate-payment — Direct simulation (no real gateway) */
    @PostMapping("/simulate-payment")
    public ResponseEntity<ApiResponse> simulatePayment(
            @Valid @RequestBody PaymentOrderRequest request,
            Authentication auth) {
        try {
            String userEmail = auth != null ? auth.getName() : null;
            PaymentVerificationResponse response = paymentService.simulatePayment(request, userEmail);
            return ResponseEntity.ok(ApiResponse.ok("Payment simulated and recorded successfully.", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Payment simulation error: " + e.getMessage()));
        }
    }

    // ================================================================
    //  TRANSACTION MANAGEMENT
    // ================================================================

    /** GET /api/payments/transactions — Student's full transaction history */
    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse> getMyTransactions(Authentication auth) {
        try {
            String email = auth != null ? auth.getName() : null;
            if (email == null) return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));

            List<Map<String, Object>> rows = jdbc.query(
                "SELECT t.transaction_id, t.transaction_reference, t.amount, t.created_at, " +
                "t.transaction_status, t.gateway_name, t.order_id, t.verified_by, t.updated_at, " +
                "r.receipt_number, r.receipt_url, r.generated_date " +
                "FROM transactions t " +
                "LEFT JOIN receipts r ON t.transaction_id = r.transaction_id " +
                "JOIN students s ON t.student_id = s.id " +
                "JOIN users u ON s.user_id = u.id " +
                "WHERE u.email = ? ORDER BY t.created_at DESC",
                (rs, rowNum) -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("transactionId",        rs.getLong("transaction_id"));
                    map.put("transactionReference", rs.getString("transaction_reference"));
                    map.put("orderId",              rs.getString("order_id"));
                    map.put("amount",               rs.getBigDecimal("amount"));
                    map.put("transactionStatus",    rs.getString("transaction_status"));
                    map.put("gatewayName",          rs.getString("gateway_name"));
                    map.put("verifiedBy",           rs.getString("verified_by"));
                    map.put("receiptNumber",        rs.getString("receipt_number"));
                    map.put("receiptUrl",           rs.getString("receipt_url"));
                    Timestamp ts = rs.getTimestamp("created_at");
                    map.put("transactionDate", ts != null ? ts.toString() : null);
                    Timestamp genDate = rs.getTimestamp("generated_date");
                    map.put("receiptGeneratedDate", genDate != null ? genDate.toString() : null);
                    return map;
                },
                email
            );
            return ResponseEntity.ok(ApiResponse.ok("Transactions retrieved.", rows));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to fetch transactions: " + e.getMessage()));
        }
    }

    /** GET /api/payments/transactions/{id} — Single transaction detail */
    @GetMapping("/transactions/{id}")
    public ResponseEntity<ApiResponse> getTransactionById(
            @PathVariable Long id, Authentication auth) {
        try {
            String email = auth != null ? auth.getName() : null;
            Map<String, Object> row = jdbc.queryForMap(
                "SELECT t.*, r.receipt_number, r.receipt_url, r.generated_date " +
                "FROM transactions t LEFT JOIN receipts r ON t.transaction_id = r.transaction_id " +
                "WHERE t.transaction_id = ?",
                id
            );
            return ResponseEntity.ok(ApiResponse.ok("Transaction retrieved.", row));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** GET /api/payments/stats — Payment statistics for dashboard (admin/accounts) */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse> getPaymentStats(Authentication auth) {
        try {
            Map<String, Object> stats = new HashMap<>();

            // Total transactions breakdown
            List<Map<String, Object>> statusBreakdown = jdbc.queryForList(
                "SELECT transaction_status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total " +
                "FROM transactions GROUP BY transaction_status ORDER BY count DESC"
            );
            stats.put("statusBreakdown", statusBreakdown);

            // Overall totals
            Map<String, Object> totals = jdbc.queryForMap(
                "SELECT COUNT(*) as total_transactions, " +
                "COALESCE(SUM(CASE WHEN transaction_status='SUCCESS' THEN amount ELSE 0 END), 0) as total_collected, " +
                "COALESCE(SUM(CASE WHEN transaction_status='ROLLED_BACK' THEN amount ELSE 0 END), 0) as total_rolled_back, " +
                "COUNT(DISTINCT student_id) as unique_students " +
                "FROM transactions"
            );
            stats.put("totals", totals);

            // Daily trend (last 7 days)
            List<Map<String, Object>> dailyTrend = jdbc.queryForList(
                "SELECT DATE(created_at) as date, COUNT(*) as txn_count, " +
                "COALESCE(SUM(CASE WHEN transaction_status='SUCCESS' THEN amount ELSE 0 END), 0) as amount_collected " +
                "FROM transactions WHERE created_at >= NOW() - INTERVAL '7 days' " +
                "GROUP BY DATE(created_at) ORDER BY date"
            );
            stats.put("dailyTrend", dailyTrend);

            // Queue stats
            stats.put("queueStatus", paymentQueueService.getQueueStatus());

            return ResponseEntity.ok(ApiResponse.ok("Payment statistics retrieved.", stats));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to retrieve stats: " + e.getMessage()));
        }
    }

    // ================================================================
    //  RECEIPT RETRIEVAL
    // ================================================================

    /** GET /api/payments/receipts/transaction/{transactionId} — Receipt by transaction ID */
    @GetMapping("/receipts/transaction/{transactionId}")
    public ResponseEntity<ApiResponse> getReceiptByTransactionId(@PathVariable Long transactionId) {
        try {
            ReceiptDetails details = paymentService.getReceiptDetails(transactionId);
            return ResponseEntity.ok(ApiResponse.ok("Receipt retrieved.", details));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to fetch receipt: " + e.getMessage()));
        }
    }

    /** GET /api/payments/receipts/{receiptNumber} — Receipt by receipt number */
    @GetMapping("/receipts/{receiptNumber}")
    public ResponseEntity<ApiResponse> getReceiptByNumber(@PathVariable String receiptNumber) {
        try {
            ReceiptDetails details = paymentService.getReceiptDetailsByNumber(receiptNumber);
            return ResponseEntity.ok(ApiResponse.ok("Receipt retrieved.", details));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to fetch receipt: " + e.getMessage()));
        }
    }

    // ================================================================
    //  PAYMENT QUEUE (Concurrency Demonstration)
    // ================================================================

    /**
     * POST /api/payments/queue — Enqueue a payment request for async processing.
     *
     * Demonstrates: DS Queue + OS Thread Pool / Semaphore
     * Returns immediately with a correlationId; processing happens on background thread.
     */
    @PostMapping("/queue")
    public ResponseEntity<ApiResponse> enqueuePayment(
            @Valid @RequestBody PaymentOrderRequest request,
            Authentication auth) {
        try {
            String userEmail = auth != null ? auth.getName() : null;
            PaymentQueueService.QueueTicket ticket = paymentQueueService.enqueue(request, userEmail);
            return ResponseEntity.ok(ApiResponse.ok("Payment queued for processing.", ticket));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(503).body(ApiResponse.error("Queue full: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to enqueue: " + e.getMessage()));
        }
    }

    /**
     * GET /api/payments/queue/status — Real-time queue monitoring.
     *
     * Returns: depth, active workers, available slots, counters, recent events
     */
    @GetMapping("/queue/status")
    public ResponseEntity<ApiResponse> getQueueStatus() {
        Map<String, Object> status = paymentQueueService.getQueueStatus();
        return ResponseEntity.ok(ApiResponse.ok("Queue status retrieved.", status));
    }

    // ================================================================
    //  PAYMENT ROLLBACK (ACID Demonstration)
    // ================================================================

    /**
     * POST /api/payments/rollback/{transactionId} — Admin-initiated ACID rollback.
     *
     * Demonstrates: ACID Atomicity (all steps in one @Transactional block)
     * Request body: { "reason": "..." }
     */
    @PostMapping("/rollback/{transactionId}")
    public ResponseEntity<ApiResponse> rollbackTransaction(
            @PathVariable Long transactionId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        try {
            String adminEmail = auth != null ? auth.getName() : "system";
            String reason = body != null ? body.getOrDefault("reason", "Admin-initiated rollback") : "Admin-initiated rollback";

            Map<String, Object> result = paymentRollbackService.rollbackTransaction(transactionId, reason, adminEmail);
            return ResponseEntity.ok(ApiResponse.ok(String.valueOf(result.get("message")), result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Rollback failed: " + e.getMessage()));
        }
    }

    /**
     * DELETE /api/payments/transactions/{transactionId} — Permanently delete a payment record.
     * Removes transaction, receipt, and matching fee ledger row so the dashboard clears immediately.
     */
    @DeleteMapping("/transactions/{transactionId}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTS')")
    public ResponseEntity<ApiResponse> deleteTransaction(
            @PathVariable Long transactionId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        try {
            String actorEmail = auth != null ? auth.getName() : "system";
            String reason = body != null ? body.getOrDefault("reason", "Admin-initiated delete") : "Admin-initiated delete";

            Map<String, Object> result = paymentRollbackService.deleteTransaction(transactionId, reason, actorEmail);
            return ResponseEntity.ok(ApiResponse.ok(String.valueOf(result.get("message")), result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Delete failed: " + e.getMessage()));
        }
    }

    // ================================================================
    //  GATEWAY AUDIT LOGS
    // ================================================================

    /**
     * GET /api/payments/gateway-logs — Paginated payment gateway audit log.
     *
     * Query params: ?page=0&size=20
     * Demonstrates: CN — secure audit trail over HTTPS; DBMS — indexed queries
     */
    @GetMapping("/gateway-logs")
    public ResponseEntity<ApiResponse> getGatewayLogs(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            int offset = page * size;
            List<Map<String, Object>> logs = jdbc.queryForList(
                "SELECT gl.gateway_log_id, gl.transaction_id, gl.gateway_name, " +
                "gl.request_data, gl.response_data, gl.status, gl.log_time " +
                "FROM payment_gateway_logs gl " +
                "ORDER BY gl.log_time DESC LIMIT ? OFFSET ?",
                size, offset
            );

            long total = jdbc.queryForObject("SELECT COUNT(*) FROM payment_gateway_logs", Long.class);

            Map<String, Object> result = new HashMap<>();
            result.put("logs",        logs);
            result.put("page",        page);
            result.put("size",        size);
            result.put("totalCount",  total);
            result.put("totalPages",  (int) Math.ceil((double) total / size));

            return ResponseEntity.ok(ApiResponse.ok("Gateway logs retrieved.", result));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to fetch gateway logs: " + e.getMessage()));
        }
    }
}
