package com.feepayment.service;

import com.feepayment.model.FeeStructure;
import com.feepayment.model.Student;
import com.feepayment.model.StudentData;
import com.feepayment.repository.FeeStructureRepository;
import com.feepayment.repository.InstallmentRequestRepository;
import com.feepayment.repository.StudentRepository;
import com.feepayment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final JdbcTemplate jdbc;
    private final InstallmentRequestRepository installmentRequestRepository;
    private final FeeStructureRepository feeStructureRepository;

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

        // Dynamic fee structure breakdown (from fee_structures table)
        FeeStructure fs = getStudentFeeStructure(student);
        BigDecimal totalFee = fs.getTotalAmount();
        BigDecimal inst1Amount = totalFee.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        BigDecimal inst2Amount = totalFee.subtract(inst1Amount);

        dashboard.put("tuitionFee",     fs.getTuitionFee());
        dashboard.put("developmentFee", fs.getDevelopmentFee());
        dashboard.put("examFee",        fs.getExamFee());
        dashboard.put("installment1",   inst1Amount);
        dashboard.put("installment2",   inst2Amount);

        // Fetch verified transaction records for the student
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
        // Exactly 2 installments (50% + 50%)
        // ---------------------------------------------------------------
        BigDecimal paidAmount  = new BigDecimal(String.valueOf(feeStatus.get("paidAmount")));

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

        // Tag payment history records with installment allocation for clear auditing
        Map<Long, String> allocationMap = new HashMap<>();
        if (inst1TxnId != null) allocationMap.put(inst1TxnId, "Installment 1 (50%)");
        if (inst2TxnId != null) allocationMap.put(inst2TxnId, "Installment 2 (50%)");
        for (Map<String, Object> p : paymentHistory) {
            Long tid = (Long) p.get("transactionId");
            p.put("allocation", allocationMap.getOrDefault(tid, "Excess / Test Payment"));
        }

        boolean inst1Paid = paidAmount.compareTo(inst1Amount) >= 0;
        boolean inst2Paid = paidAmount.compareTo(inst1Amount.add(inst2Amount)) >= 0;

        List<Map<String, Object>> installments = new ArrayList<>();

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
     * Compute paid / pending amounts for a student dynamically from the DB.
     * Uses transactions table as the single authoritative record of verified successful payments.
     *
     * In accordance with college policy:
     * - Prescribed annual fee is partitioned into exactly 2 installments (50% + 50%).
     * - Maximum applicable paid amount credited towards the annual fee obligation is totalFee.
     * - Pending balance is max(totalFee - validPaidAmount, 0).
     * - Any payments beyond the total prescribed fee are recognized as excess/overpayment.
     */
    private Map<String, Object> buildFeeStatus(Student student) {
        FeeStructure fs = getStudentFeeStructure(student);
        BigDecimal totalFee = fs.getTotalAmount();
        if (totalFee == null || totalFee.compareTo(BigDecimal.ZERO) <= 0) {
            totalFee = new BigDecimal("120000.00");
        }

        // Single authoritative query: verified successful payments from transactions table
        BigDecimal totalSuccessfulPaid = BigDecimal.ZERO;
        try {
            totalSuccessfulPaid = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE student_id = ? AND transaction_status = 'SUCCESS'",
                BigDecimal.class, student.getId()
            );
        } catch (Exception e) {
            try {
                totalSuccessfulPaid = jdbc.queryForObject(
                    "SELECT COALESCE(SUM(amount_paid), 0) FROM fee_payments WHERE student_id = ? AND status = 'SUCCESS'",
                    BigDecimal.class, student.getId()
                );
            } catch (Exception ignored) {}
        }

        if (totalSuccessfulPaid == null) totalSuccessfulPaid = BigDecimal.ZERO;

        // Valid paid amount credited towards student's prescribed annual fee (cannot exceed total annual fee)
        BigDecimal validPaidAmount = totalSuccessfulPaid.min(totalFee);
        BigDecimal pendingAmount = totalFee.subtract(validPaidAmount).max(BigDecimal.ZERO);
        BigDecimal excessAmount = totalSuccessfulPaid.subtract(validPaidAmount).max(BigDecimal.ZERO);

        boolean isCleared = pendingAmount.compareTo(BigDecimal.ZERO) <= 0;
        String paymentStatus;
        if (isCleared) {
            paymentStatus = "PAID_IN_FULL";
        } else if (validPaidAmount.compareTo(BigDecimal.ZERO) > 0) {
            paymentStatus = "PARTIALLY_PAID";
        } else {
            paymentStatus = "UNPAID";
        }

        Map<String, Object> status = new HashMap<>();
        status.put("totalFee",               totalFee.doubleValue());
        status.put("paidAmount",             validPaidAmount.doubleValue());
        status.put("pendingAmount",          pendingAmount.doubleValue());
        status.put("totalTransactionAmount", totalSuccessfulPaid.doubleValue());
        status.put("excessAmount",           excessAmount.doubleValue());
        status.put("paymentStatus",          paymentStatus);
        status.put("isCleared",              isCleared);
        return status;
    }

    private FeeStructure getStudentFeeStructure(Student student) {
        if (student.getDepartment() != null) {
            var opt = feeStructureRepository.findByDepartment(student.getDepartment());
            if (opt.isPresent()) return opt.get();
        }

        FeeStructure defaultFs = new FeeStructure();
        defaultFs.setDepartment(student.getDepartment() != null ? student.getDepartment() : "Information Technology");
        defaultFs.setCategory("OPEN");
        defaultFs.setTuitionFee(new BigDecimal("95000.00"));
        defaultFs.setDevelopmentFee(new BigDecimal("15000.00"));
        defaultFs.setExamFee(new BigDecimal("10000.00"));
        defaultFs.setTotalAmount(new BigDecimal("120000.00"));
        defaultFs.setAcademicYear(student.getAcademicYear() != null ? student.getAcademicYear() : "2025-26");
        defaultFs.setStatus("ACTIVE");
        return defaultFs;
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

        FeeStructure fs = getStudentFeeStructure(student);
        BigDecimal totalFee = fs.getTotalAmount();
        BigDecimal inst1Amount = totalFee.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        BigDecimal inst2Amount = totalFee.subtract(inst1Amount);

        // Exactly 2 installments schedule
        plan.put("installmentCount", 2);
        plan.put("installments", List.of(
            Map.of("installmentNumber", 1, "amount", inst1Amount, "dueDate", "15 Oct 2025", "term", "Semester 1 (50%)"),
            Map.of("installmentNumber", 2, "amount", inst2Amount, "dueDate", "15 Feb 2026", "term", "Semester 2 (50%)")
        ));

        return plan;
    }
}
