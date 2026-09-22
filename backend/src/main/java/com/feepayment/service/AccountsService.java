package com.feepayment.service;

import com.feepayment.model.InstallmentRequest;
import com.feepayment.repository.InstallmentRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AccountsService {

    private final InstallmentRequestRepository installmentRequestRepository;
    private final JdbcTemplate jdbc;

    public Map<String, Object> getDashboard() {
        Map<String, Object> dashboard = new HashMap<>();

        java.math.BigDecimal totalCollection = java.math.BigDecimal.ZERO;
        java.math.BigDecimal pendingFees = java.math.BigDecimal.ZERO;
        Long successCount = 0L;
        Long pendingCount = 0L;

        try {
            totalCollection = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_status = 'SUCCESS'",
                java.math.BigDecimal.class
            );
            String pendingSql = """
                WITH student_fee AS (
                    SELECT s.id AS student_id,
                           COALESCE(fs.total_amount, 120000.00) AS applicable_fee
                    FROM students s
                    LEFT JOIN fee_structures fs ON s.department = fs.department AND fs.status = 'ACTIVE'
                ),
                student_paid AS (
                    SELECT s.id AS student_id,
                           COALESCE(SUM(t.amount), 0) AS paid_amount
                    FROM students s
                    LEFT JOIN transactions t ON s.id = t.student_id AND t.transaction_status = 'SUCCESS'
                    GROUP BY s.id
                )
                SELECT COALESCE(SUM(GREATEST(0, sf.applicable_fee - sp.paid_amount)), 0)
                FROM student_fee sf
                JOIN student_paid sp ON sf.student_id = sp.student_id
            """;
            pendingFees = jdbc.queryForObject(pendingSql, java.math.BigDecimal.class);
            successCount = jdbc.queryForObject("SELECT COUNT(*) FROM transactions WHERE transaction_status = 'SUCCESS'", Long.class);
            pendingCount = jdbc.queryForObject("SELECT COUNT(*) FROM transactions WHERE transaction_status = 'PENDING'", Long.class);
        } catch (Exception ignored) {}

        dashboard.put("totalFeeCollection", totalCollection != null ? totalCollection : java.math.BigDecimal.ZERO);
        dashboard.put("pendingFees", pendingFees != null ? pendingFees : java.math.BigDecimal.ZERO);
        dashboard.put("successfulPayments", successCount != null ? successCount : 0L);
        dashboard.put("pendingTransactions", pendingCount != null ? pendingCount : 0L);
        dashboard.put("recentActivity", getRecentActivity());

        return dashboard;
    }

    public Map<String, Object> getProfile() {
        Map<String, Object> profile = new HashMap<>();
        profile.put("name", "Accounts Officer");
        profile.put("email", "accounts@mmcoe.com");
        profile.put("role", "ACCOUNTS");
        profile.put("department", "Finance & Accounts Department");
        return profile;
    }

    // ============================================================
    // 2-Installment Requests Management
    // ============================================================
    public List<InstallmentRequest> getInstallmentRequests() {
        List<InstallmentRequest> list = installmentRequestRepository.findAll();
        if (list.isEmpty()) {
            // Seed a sample request if none
            return List.of();
        }
        return list;
    }

    public void reviewInstallmentRequest(Long id, String status, String reviewedBy) {
        installmentRequestRepository.updateStatus(id, status, reviewedBy);
    }

    // ============================================================
    // Transactions & Payment Verification
    // ============================================================
    public List<Map<String, Object>> getTransactions() {
        String sql = "SELECT t.transaction_id, t.transaction_reference, t.amount, t.created_at, " +
                     "t.transaction_status, t.gateway_name, t.verified_by, s.name AS student_name, s.prn " +
                     "FROM transactions t " +
                     "LEFT JOIN students s ON t.student_id = s.id " +
                     "ORDER BY t.created_at DESC LIMIT 50";
        try {
            return jdbc.query(sql, (rs, rowNum) -> {
                Map<String, Object> row = new HashMap<>();
                row.put("transactionId", rs.getLong("transaction_id"));
                row.put("reference", rs.getString("transaction_reference"));
                row.put("amount", rs.getBigDecimal("amount"));
                row.put("status", rs.getString("transaction_status"));
                row.put("gateway", rs.getString("gateway_name"));
                row.put("verifiedBy", rs.getString("verified_by"));
                row.put("studentName", rs.getString("student_name"));
                row.put("prn", rs.getString("prn"));
                Timestamp ts = rs.getTimestamp("created_at");
                row.put("date", ts != null ? ts.toLocalDateTime().toLocalDate().toString() : "");
                return row;
            });
        } catch (Exception e) {
            return List.of();
        }
    }

    public void verifyPayment(Long transactionId, String officerEmail) {
        String sql = "UPDATE transactions SET verified_by = ?, updated_at = NOW() WHERE transaction_id = ?";
        jdbc.update(sql, officerEmail, transactionId);
    }

    private List<Map<String, Object>> getRecentActivity() {
        String sql = """
            SELECT s.prn, s.name AS student, t.amount, t.created_at, t.transaction_status AS status
            FROM transactions t
            JOIN students s ON t.student_id = s.id
            ORDER BY t.created_at DESC LIMIT 8
        """;
        try {
            return jdbc.query(sql, (rs, rowNum) -> {
                Map<String, Object> entry = new HashMap<>();
                entry.put("prn", rs.getString("prn"));
                entry.put("student", rs.getString("student"));
                entry.put("amount", rs.getBigDecimal("amount"));
                Timestamp ts = rs.getTimestamp("created_at");
                entry.put("paymentDate", ts != null ? ts.toLocalDateTime().toLocalDate().toString() : "");
                entry.put("status", rs.getString("status"));
                return entry;
            });
        } catch (Exception e) {
            return List.of();
        }
    }
}
