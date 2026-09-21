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
        dashboard.put("totalFeeCollection", 8250000);
        dashboard.put("pendingFees", 1425000);
        dashboard.put("successfulPayments", 1126);
        dashboard.put("pendingTransactions", 42);

        // Recent payment activity
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
        return List.of(
            createActivity("B25IT2001", "Aarav Sharma",  15000, "2025-08-10", "SUCCESS"),
            createActivity("B25IT2002", "Priya Desai",   20000, "2025-08-09", "SUCCESS"),
            createActivity("B25IT2003", "Rohan Kulkarni",10000, "2025-08-08", "PENDING"),
            createActivity("B25IT2004", "Sneha Patil",   25000, "2025-08-07", "SUCCESS"),
            createActivity("B25IT2005", "Vikram Joshi",  18000, "2025-08-06", "FAILED"),
            createActivity("B25IT2007", "Karan Verma",   12000, "2025-08-05", "SUCCESS"),
            createActivity("B25IT2008", "Divya Nair",    22000, "2025-08-04", "PENDING"),
            createActivity("B25IT2009", "Arjun Rao",     15000, "2025-08-03", "SUCCESS")
        );
    }

    private Map<String, Object> createActivity(String prn, String name, int amount,
                                                String date, String status) {
        Map<String, Object> entry = new HashMap<>();
        entry.put("prn", prn);
        entry.put("student", name);
        entry.put("amount", amount);
        entry.put("paymentDate", date);
        entry.put("status", status);
        return entry;
    }
}
