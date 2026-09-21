package com.feepayment.service;

import com.feepayment.model.Student;
import com.feepayment.model.StudentData;
import com.feepayment.repository.StudentRepository;
import com.feepayment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbc;
    private final com.feepayment.repository.InstallmentRequestRepository installmentRequestRepository;

    // Total annual fee per student (can be made configurable per course later)
    private static final BigDecimal TOTAL_FEE = new BigDecimal("120000.00");


    public StudentData getProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Student student = studentRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found."));
        return toData(student);
    }

    /**
     * Lightweight fee status — called after payment to refresh dashboard without full reload.
     */
    public Map<String, Object> getFeeStatus() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Student student = studentRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student not found."));
        return buildFeeStatus(student);
    }

    public Map<String, Object> getDashboard() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Student student = studentRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found."));

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("student", toData(student));

        // Add fee status data
        Map<String, Object> feeStatus = buildFeeStatus(student);
        dashboard.putAll(feeStatus);

        // Fee structure breakdown (per semester)
        dashboard.put("tuitionFee",     95000);
        dashboard.put("developmentFee", 15000);
        dashboard.put("examFee",         7000);
        dashboard.put("libraryFee",      3000);
        dashboard.put("installment1",   60000);
        dashboard.put("installment2",   60000);

        // Fetch verified transaction records for the student (enriched with transactionReference)
        List<Map<String, Object>> paymentHistory = jdbc.query(
            "SELECT t.transaction_id, t.transaction_reference, t.amount, t.created_at, " +
            "t.transaction_status, t.gateway_name, r.receipt_number, r.receipt_url " +
            "FROM transactions t LEFT JOIN receipts r ON t.transaction_id = r.transaction_id " +
            "WHERE t.student_id = ? ORDER BY t.created_at DESC",
            (rs, rowNum) -> {
                Map<String, Object> map = new HashMap<>();
                map.put("txId",                 rs.getString("transaction_reference"));
                map.put("transactionId",        rs.getLong("transaction_id"));
                map.put("transactionReference", rs.getString("transaction_reference"));
                map.put("amount",               rs.getBigDecimal("amount"));
                map.put("status",               rs.getString("transaction_status"));
                map.put("gateway",              rs.getString("gateway_name"));
                Timestamp ts = rs.getTimestamp("created_at");
                map.put("date", ts != null ? ts.toLocalDateTime().toLocalDate().toString() : "");
                map.put("receiptNumber", rs.getString("receipt_number"));
                map.put("receiptUrl",    rs.getString("receipt_url"));
                return map;
            },
            student.getId()
        );
        dashboard.put("paymentHistory", paymentHistory);

        // ---------------------------------------------------------------
        // Build per-installment PAID/PENDING list — live from Supabase
        // Total = ₹1,20,000 as 2 × ₹60,000 installments
        // ---------------------------------------------------------------
        BigDecimal paidAmount  = new BigDecimal(String.valueOf(feeStatus.get("paidAmount")));
        BigDecimal inst1Amount = new BigDecimal("60000");
        BigDecimal inst2Amount = new BigDecimal("60000");

        // Walk transactions oldest-first to assign receipt/date to each installment threshold
        List<Map<String, Object>> chrono = jdbc.query(
            "SELECT t.transaction_id, t.amount, t.created_at, r.receipt_number " +
            "FROM transactions t LEFT JOIN receipts r ON t.transaction_id = r.transaction_id " +
            "WHERE t.student_id = ? AND t.transaction_status = 'SUCCESS' ORDER BY t.created_at ASC",
            (rs, rowNum) -> {
                Map<String, Object> m = new HashMap<>();
                m.put("transactionId",  rs.getLong("transaction_id"));
                m.put("amount",         rs.getBigDecimal("amount"));
                m.put("receiptNumber",  rs.getString("receipt_number"));
                Timestamp ts = rs.getTimestamp("created_at");
                m.put("date", ts != null ? ts.toLocalDateTime().toLocalDate().toString() : "");
                return m;
            },
            student.getId()
        );

        Long   inst1TxnId = null; String inst1ReceiptNo = null; String inst1PaidDate = null;
        Long   inst2TxnId = null; String inst2ReceiptNo = null; String inst2PaidDate = null;
        BigDecimal running = BigDecimal.ZERO;
        for (Map<String, Object> t : chrono) {
            running = running.add((BigDecimal) t.get("amount"));
            if (inst1TxnId == null && running.compareTo(inst1Amount) >= 0) {
                inst1TxnId     = (Long)   t.get("transactionId");
                inst1ReceiptNo = (String) t.get("receiptNumber");
                inst1PaidDate  = (String) t.get("date");
            } else if (inst1TxnId != null && inst2TxnId == null
                       && running.compareTo(inst1Amount.add(inst2Amount)) >= 0) {
                inst2TxnId     = (Long)   t.get("transactionId");
                inst2ReceiptNo = (String) t.get("receiptNumber");
                inst2PaidDate  = (String) t.get("date");
            }
        }

        boolean inst1Paid = paidAmount.compareTo(inst1Amount) >= 0;
        boolean inst2Paid = paidAmount.compareTo(inst1Amount.add(inst2Amount)) >= 0;

        List<Map<String, Object>> installments = new java.util.ArrayList<>();

        Map<String, Object> i1 = new HashMap<>();
        i1.put("installmentNo", 1);
        i1.put("label",         "Installment 1 (50%)");
        i1.put("amount",        inst1Amount);
        i1.put("dueDate",       "15 Jun 2025");
        i1.put("status",        inst1Paid ? "PAID" : "PENDING");
        i1.put("paidDate",      inst1Paid ? inst1PaidDate  : null);
        i1.put("receiptNumber", inst1Paid ? inst1ReceiptNo : null);
        i1.put("transactionId", inst1Paid ? inst1TxnId     : null);
        installments.add(i1);

        Map<String, Object> i2 = new HashMap<>();
        i2.put("installmentNo", 2);
        i2.put("label",         "Installment 2 (50%)");
        i2.put("amount",        inst2Amount);
        i2.put("dueDate",       "15 Nov 2025");
        i2.put("status",        inst2Paid ? "PAID" : "PENDING");
        i2.put("paidDate",      inst2Paid ? inst2PaidDate  : null);
        i2.put("receiptNumber", inst2Paid ? inst2ReceiptNo : null);
        i2.put("transactionId", inst2Paid ? inst2TxnId     : null);
        installments.add(i2);

        dashboard.put("installments", installments);

        return dashboard;
    }


    /**
     * Compute paid / pending amounts for a student from the DB.
     * Reads from both fee_payments (ledger) and transactions (gateway records),
     * taking the higher of the two to avoid double counting.
     */
    private Map<String, Object> buildFeeStatus(Student student) {
        BigDecimal feePaid = BigDecimal.ZERO;
        BigDecimal txnPaid = BigDecimal.ZERO;

        try {
            feePaid = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount_paid), 0) FROM fee_payments WHERE student_id = ? AND status = 'SUCCESS'",
                BigDecimal.class, student.getId()
            );
        } catch (Exception e) {
            // fee_payments may not exist yet — handled by schema migration
        }

        try {
            txnPaid = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE student_id = ? AND transaction_status = 'SUCCESS'",
                BigDecimal.class, student.getId()
            );
        } catch (Exception e) {
            // ignore
        }

        if (feePaid == null) feePaid = BigDecimal.ZERO;
        if (txnPaid == null) txnPaid = BigDecimal.ZERO;

        // Use the higher amount (avoid double-counting if both tables record the same payment)
        BigDecimal actualPaid = feePaid.max(txnPaid);

        BigDecimal pendingAmount = TOTAL_FEE.subtract(actualPaid);
        if (pendingAmount.compareTo(BigDecimal.ZERO) < 0) {
            pendingAmount = BigDecimal.ZERO;
        }

        boolean isCleared = pendingAmount.compareTo(BigDecimal.ZERO) <= 0;
        String paymentStatus;
        if (isCleared) {
            paymentStatus = "PAID_IN_FULL";
        } else if (actualPaid.compareTo(BigDecimal.ZERO) > 0) {
            paymentStatus = "PARTIALLY_PAID";
        } else {
            paymentStatus = "UNPAID";
        }

        Map<String, Object> status = new HashMap<>();
        status.put("totalFee",      TOTAL_FEE.doubleValue());
        status.put("paidAmount",    actualPaid.doubleValue());
        status.put("pendingAmount", pendingAmount.doubleValue());
        status.put("paymentStatus", paymentStatus);
        status.put("isCleared",     isCleared);
        return status;
    }

    private StudentData toData(Student student) {
        StudentData data = new StudentData();
        data.setId(student.getId());
        data.setName(student.getName());
        data.setPrn(student.getPrn());
        data.setEmail(student.getEmail());
        data.setMobile(student.getMobile());
        data.setDepartment(student.getDepartment());
        data.setCourse(student.getCourse());
        data.setAcademicYear(student.getAcademicYear());
        data.setStatus(student.getStatus());
        data.setCreatedAt(student.getCreatedAt() != null ? student.getCreatedAt().toString() : null);

        if (student.getUserId() != null) {
            userRepository.findById(student.getUserId()).ifPresent(u -> data.setEnabled(u.getEnabled()));
        }
        return data;
    }

    // ============================================================
    // Exactly 2-Installment Plan Methods
    // ============================================================
    public void applyForInstallment(String reason) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Student student = studentRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student not found."));

        installmentRequestRepository.create(student.getId(), student.getAcademicYear(), reason);
    }

    public Map<String, Object> getInstallmentPlan() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Student student = studentRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student not found."));

        Map<String, Object> plan = new HashMap<>();
        var opt = installmentRequestRepository.findLatestByStudentId(student.getId());

        if (opt.isPresent()) {
            var ir = opt.get();
            plan.put("hasRequest", true);
            plan.put("status", ir.getStatus());
            plan.put("reason", ir.getReason());
            plan.put("appliedDate", ir.getAppliedDate() != null ? ir.getAppliedDate().toString() : "");
            plan.put("reviewedBy", ir.getReviewedBy());
        } else {
            plan.put("hasRequest", false);
            plan.put("status", "NOT_APPLIED");
        }

        // Exactly 2 installments schedule
        plan.put("installmentCount", 2);
        plan.put("installments", List.of(
            Map.of("installmentNumber", 1, "amount", 60000, "dueDate", "15 Oct 2025", "term", "Semester 1 (50%)"),
            Map.of("installmentNumber", 2, "amount", 60000, "dueDate", "15 Feb 2026", "term", "Semester 2 (50%)")
        ));

        return plan;
    }
}

