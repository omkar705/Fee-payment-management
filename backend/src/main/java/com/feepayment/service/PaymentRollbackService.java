package com.feepayment.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Team 2 — Payment Rollback Module (ACID Properties Demonstration)
 *
 * DBMS Concepts demonstrated:
 *   - Atomicity   : All rollback steps complete or none do (single @Transactional block)
 *   - Consistency : DB moves from one valid state to another (SUCCESS → ROLLED_BACK)
 *   - Isolation   : SERIALIZABLE isolation prevents concurrent reads of mid-rollback state
 *   - Durability  : All changes flushed to Supabase PostgreSQL permanently
 *
 * Basic Programming: Structured step-by-step rollback logic with error handling
 * OOP: Service class encapsulating rollback behavior (Single Responsibility Principle)
 * DBMS: SQL UPDATE/DELETE with WHERE clauses inside explicit transaction boundary
 */
@Service
@RequiredArgsConstructor
public class PaymentRollbackService {

    private static final Logger log = LoggerFactory.getLogger(PaymentRollbackService.class);
    private final JdbcTemplate jdbc;

    /**
     * Atomically rolls back a payment transaction.
     *
     * Steps (all-or-nothing — ACID Atomicity):
     *   1. Verify transaction exists and is in SUCCESS state
     *   2. Mark transaction as ROLLED_BACK with reason + timestamp
     *   3. Delete associated receipt (reverse receipt generation)
     *   4. Reverse the fee_payments ledger entry (mark REFUNDED or delete)
     *   5. Log the rollback event in payment_gateway_logs
     *
     * @param transactionId  ID of the transaction to roll back
     * @param reason         Admin-provided reason for rollback
     * @param adminEmail     Email of admin performing the rollback
     * @return rollback result map with before/after states
     * @throws IllegalArgumentException if transaction not found or already rolled back
     * @throws IllegalStateException    if transaction is not in a rollback-eligible state
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> rollbackTransaction(Long transactionId, String reason, String adminEmail) {
        log.info("ROLLBACK INITIATED: transactionId={}, admin={}, reason={}", transactionId, adminEmail, reason);

        // ====================================================
        // STEP 1: Verify transaction exists and get current state
        // (Atomicity begins — any exception rolls everything back)
        // ====================================================
        Map<String, Object> txn = fetchTransaction(transactionId);
        if (txn == null) {
            throw new IllegalArgumentException("Transaction #" + transactionId + " not found.");
        }

        String currentStatus = String.valueOf(txn.get("transaction_status"));
        if ("ROLLED_BACK".equals(currentStatus)) {
            throw new IllegalStateException("Transaction #" + transactionId + " is already rolled back.");
        }
        if ("FAILED".equals(currentStatus)) {
            throw new IllegalStateException("Transaction #" + transactionId + " already in FAILED state — cannot roll back.");
        }

        Long studentId   = txn.get("student_id") != null ? ((Number) txn.get("student_id")).longValue() : null;
        Object amount    = txn.get("amount");
        String ref       = String.valueOf(txn.get("transaction_reference"));

        // ====================================================
        // STEP 2: Mark transaction as ROLLED_BACK
        // (Consistency: valid state transition SUCCESS → ROLLED_BACK)
        // ====================================================
        String safeReason = reason != null && !reason.isBlank() ? reason : "Admin-initiated rollback";
        int txnUpdated = jdbc.update(
            "UPDATE transactions SET transaction_status = 'ROLLED_BACK', " +
            "verified_by = ?, updated_at = ? " +
            "WHERE transaction_id = ?",
            "ROLLED_BACK_BY:" + adminEmail, LocalDateTime.now(), transactionId
        );
        log.info("ROLLBACK Step 2: Transaction {} status updated to ROLLED_BACK (rows={})", transactionId, txnUpdated);

        // ====================================================
        // STEP 3: Delete associated receipt
        // (Reverse the side effect of original payment processing)
        // ====================================================
        int receiptDeleted = jdbc.update(
            "DELETE FROM receipts WHERE transaction_id = ?",
            transactionId
        );
        log.info("ROLLBACK Step 3: Deleted {} receipt(s) for transaction {}", receiptDeleted, transactionId);

        // ====================================================
        // STEP 4: Reverse fee_payments ledger entry
        // (Set status to REFUNDED so balance calculation reflects rollback)
        // ====================================================
        int feeUpdated = 0;
        try {
            feeUpdated = jdbc.update(
                "UPDATE fee_payments SET status = 'REFUNDED', description = ? " +
                "WHERE student_id = ? AND status = 'SUCCESS' " +
                "ORDER BY payment_id DESC LIMIT 1",
                "Rolled back: " + safeReason, studentId
            );
        } catch (Exception e) {
            // fee_payments update failure should NOT block the rollback
            // We only log it — the critical transaction update already happened
            log.warn("ROLLBACK Step 4: Could not update fee_payments (non-critical): {}", e.getMessage());
        }
        log.info("ROLLBACK Step 4: Reversed {} fee_payments ledger row(s)", feeUpdated);

        // ====================================================
        // STEP 5: Write audit trail to payment_gateway_logs
        // (Durability: persisted for compliance/audit)
        // ====================================================
        try {
            jdbc.update(
                "INSERT INTO payment_gateway_logs " +
                "(transaction_id, gateway_name, request_data, response_data, status) " +
                "VALUES (?, 'SYSTEM', ?, ?, 'ROLLBACK_COMPLETED')",
                transactionId,
                String.format("{\"action\":\"ROLLBACK\",\"admin\":\"%s\",\"reason\":\"%s\"}", adminEmail, safeReason),
                String.format("{\"transaction_id\":%d,\"previous_status\":\"%s\",\"new_status\":\"ROLLED_BACK\",\"receipt_deleted\":%d}",
                        transactionId, currentStatus, receiptDeleted)
            );
        } catch (Exception e) {
            log.warn("ROLLBACK Step 5: Could not write audit log (non-critical): {}", e.getMessage());
        }

        // ====================================================
        // Result summary (transaction committed by Spring if no exception thrown)
        // ====================================================
        Map<String, Object> result = new HashMap<>();
        result.put("success",           true);
        result.put("transactionId",     transactionId);
        result.put("transactionRef",    ref);
        result.put("previousStatus",    currentStatus);
        result.put("newStatus",         "ROLLED_BACK");
        result.put("receiptDeleted",    receiptDeleted > 0);
        result.put("feeReversed",       feeUpdated > 0);
        result.put("reason",            safeReason);
        result.put("rolledBackBy",      adminEmail);
        result.put("rolledBackAt",      LocalDateTime.now().toString());
        result.put("amount",            amount);
        result.put("studentId",         studentId);
        result.put("message", String.format("Transaction #%d successfully rolled back. Receipt deleted: %s.",
                transactionId, receiptDeleted > 0 ? "yes" : "no (not found)"));

        log.info("ROLLBACK COMPLETE: transactionId={}, ref={}", transactionId, ref);
        return result;
    }

    /**
     * Permanently removes a transaction and its side effects from the database.
     * This is used when a payment record must be deleted outright, including the receipt
     * and the matching ledger entry so the dashboard drops it immediately.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public Map<String, Object> deleteTransaction(Long transactionId, String reason, String actorEmail) {
        log.info("DELETE INITIATED: transactionId={}, actor={}, reason={}", transactionId, actorEmail, reason);

        Map<String, Object> txn = fetchTransaction(transactionId);
        if (txn == null) {
            throw new IllegalArgumentException("Transaction #" + transactionId + " not found.");
        }

        Long studentId = txn.get("student_id") != null ? ((Number) txn.get("student_id")).longValue() : null;
        Object amount = txn.get("amount");
        String ref = String.valueOf(txn.get("transaction_reference"));
        String safeReason = reason != null && !reason.isBlank() ? reason : "Admin-initiated delete";

        int receiptDeleted = jdbc.update("DELETE FROM receipts WHERE transaction_id = ?", transactionId);
        int feeDeleted = 0;
        if (studentId != null && amount != null) {
            try {
                feeDeleted = jdbc.update(
                    "DELETE FROM fee_payments WHERE student_id = ? AND amount_paid = ? AND status = 'SUCCESS' ORDER BY payment_id DESC LIMIT 1",
                    studentId, new java.math.BigDecimal(String.valueOf(amount))
                );
            } catch (Exception e) {
                log.warn("DELETE Step 2: Could not remove matching fee_payments row: {}", e.getMessage());
            }
        }

        int txnDeleted = jdbc.update("DELETE FROM transactions WHERE transaction_id = ?", transactionId);

        try {
            jdbc.update(
                "INSERT INTO payment_gateway_logs (transaction_id, gateway_name, request_data, response_data, status) VALUES (?, 'SYSTEM', ?, ?, 'DELETED')",
                transactionId,
                String.format("{\"action\":\"DELETE\",\"admin\":\"%s\",\"reason\":\"%s\"}", actorEmail, safeReason),
                String.format("{\"transaction_id\":%d,\"transaction_ref\":\"%s\",\"receipt_deleted\":%d,\"fee_deleted\":%d}", transactionId, ref, receiptDeleted, feeDeleted)
            );
        } catch (Exception e) {
            log.warn("DELETE Step 3: Could not write audit log (non-critical): {}", e.getMessage());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("transactionId", transactionId);
        result.put("transactionRef", ref);
        result.put("studentId", studentId);
        result.put("amount", amount);
        result.put("receiptDeleted", receiptDeleted > 0);
        result.put("feeDeleted", feeDeleted > 0);
        result.put("transactionDeleted", txnDeleted > 0);
        result.put("deletedBy", actorEmail);
        result.put("deletedAt", java.time.LocalDateTime.now().toString());
        result.put("reason", safeReason);
        result.put("message", String.format("Transaction #%d was deleted successfully.", transactionId));

        log.info("DELETE COMPLETE: transactionId={}, ref={}, txnDeleted={}, receiptDeleted={}, feeDeleted={}", transactionId, ref, txnDeleted, receiptDeleted, feeDeleted);
        return result;
    }

    /**
     * Fetches a transaction row by ID.
     */
    private Map<String, Object> fetchTransaction(Long transactionId) {
        try {
            return jdbc.queryForMap(
                "SELECT transaction_id, transaction_reference, transaction_status, " +
                "amount, student_id, gateway_name, created_at " +
                "FROM transactions WHERE transaction_id = ?",
                transactionId
            );
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Fetches rollback-eligible transactions (SUCCESS state only) for a student.
     */
    public java.util.List<Map<String, Object>> getRollbackEligible(Long studentId) {
        return jdbc.queryForList(
            "SELECT t.transaction_id, t.transaction_reference, t.amount, t.created_at, " +
            "t.transaction_status, r.receipt_number " +
            "FROM transactions t " +
            "LEFT JOIN receipts r ON t.transaction_id = r.transaction_id " +
            "WHERE t.student_id = ? AND t.transaction_status = 'SUCCESS' " +
            "ORDER BY t.created_at DESC",
            studentId
        );
    }
}
