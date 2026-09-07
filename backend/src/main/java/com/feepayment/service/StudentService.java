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

    public StudentData getProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Student student = studentRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found."));
        return toData(student);
    }

    public Map<String, Object> getDashboard() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Student student = studentRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found."));

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("student", toData(student));

        BigDecimal totalFee = new BigDecimal("120000.00");

        // Sum payments from fee_payments
        BigDecimal feePaid = jdbc.queryForObject(
            "SELECT COALESCE(SUM(amount_paid), 0) FROM fee_payments WHERE student_id = ? AND status = 'SUCCESS'",
            BigDecimal.class, student.getId()
        );
        // Also check transactions in case any direct transactions were recorded
        BigDecimal txnPaid = jdbc.queryForObject(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE student_id = ? AND transaction_status = 'SUCCESS'",
            BigDecimal.class, student.getId()
        );

        BigDecimal actualPaid = (feePaid != null && feePaid.compareTo(BigDecimal.ZERO) > 0)
                ? feePaid
                : (txnPaid != null ? txnPaid : BigDecimal.ZERO);

        if (txnPaid != null && txnPaid.compareTo(actualPaid) > 0) {
            actualPaid = txnPaid;
        }

        BigDecimal pendingAmount = totalFee.subtract(actualPaid);
        if (pendingAmount.compareTo(BigDecimal.ZERO) < 0) {
            pendingAmount = BigDecimal.ZERO;
        }

        String paymentStatus;
        boolean isCleared = pendingAmount.compareTo(BigDecimal.ZERO) <= 0;
        if (isCleared) {
            paymentStatus = "PAID_IN_FULL";
        } else if (actualPaid.compareTo(BigDecimal.ZERO) > 0) {
            paymentStatus = "PARTIALLY_PAID";
        } else {
            paymentStatus = "UNPAID";
        }

        dashboard.put("totalFee",       totalFee.doubleValue());
        dashboard.put("tuitionFee",     95000);
        dashboard.put("developmentFee", 15000);
        dashboard.put("examFee",        7000);
        dashboard.put("libraryFee",     3000);
        dashboard.put("installment1",   60000);
        dashboard.put("installment2",   60000);
        dashboard.put("paidAmount",     actualPaid.doubleValue());
        dashboard.put("pendingAmount",  pendingAmount.doubleValue());
        dashboard.put("paymentStatus",  paymentStatus);
        dashboard.put("isCleared",      isCleared);

        // Fetch verified transaction records for the student
        List<Map<String, Object>> paymentHistory = jdbc.query(
            "SELECT t.transaction_id, t.transaction_reference, t.amount, t.created_at, t.transaction_status, r.receipt_number, r.receipt_url " +
            "FROM transactions t LEFT JOIN receipts r ON t.transaction_id = r.transaction_id " +
            "WHERE t.student_id = ? ORDER BY t.created_at DESC",
            (rs, rowNum) -> {
                Map<String, Object> map = new HashMap<>();
                map.put("txId", rs.getString("transaction_reference"));
                map.put("transactionId", rs.getLong("transaction_id"));
                map.put("amount", rs.getBigDecimal("amount"));
                map.put("status", rs.getString("transaction_status"));
                Timestamp ts = rs.getTimestamp("created_at");
                map.put("date", ts != null ? ts.toLocalDateTime().toLocalDate().toString() : "");
                map.put("receiptNumber", rs.getString("receipt_number"));
                map.put("receiptUrl", rs.getString("receipt_url"));
                return map;
            },
            student.getId()
        );
        dashboard.put("paymentHistory", paymentHistory);

        return dashboard;
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

        // Fetch user enabled status
        if (student.getUserId() != null) {
            userRepository.findById(student.getUserId()).ifPresent(u -> data.setEnabled(u.getEnabled()));
        }
        return data;
    }
}
