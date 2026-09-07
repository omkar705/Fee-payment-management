package com.feepayment.repository;

import com.feepayment.model.Receipt;
import com.feepayment.model.ReceiptDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ReceiptRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Receipt> rowMapper = (rs, rowNum) -> {
        Receipt r = new Receipt();
        r.setReceiptId(rs.getLong("receipt_id"));
        r.setReceiptNumber(rs.getString("receipt_number"));
        r.setTransactionId(rs.getLong("transaction_id"));
        long studentId = rs.getLong("student_id");
        r.setStudentId(rs.wasNull() ? null : studentId);
        r.setReceiptUrl(rs.getString("receipt_url"));
        Timestamp ts = rs.getTimestamp("generated_date");
        r.setGeneratedDate(ts != null ? ts.toLocalDateTime() : null);
        return r;
    };

    public Optional<Receipt> findByTransactionId(Long transactionId) {
        String sql = "SELECT receipt_id, receipt_number, transaction_id, student_id, receipt_url, generated_date " +
                     "FROM receipts WHERE transaction_id = ?";
        return jdbc.query(sql, rowMapper, transactionId).stream().findFirst();
    }

    public Optional<Receipt> findByReceiptNumber(String receiptNumber) {
        String sql = "SELECT receipt_id, receipt_number, transaction_id, student_id, receipt_url, generated_date " +
                     "FROM receipts WHERE receipt_number = ?";
        return jdbc.query(sql, rowMapper, receiptNumber).stream().findFirst();
    }

    public Optional<ReceiptDetails> getReceiptDetailsByTransactionId(Long transactionId) {
        String sql = """
            SELECT r.receipt_id, r.receipt_number, r.generated_date,
                   t.transaction_id, t.transaction_reference, t.order_id, t.gateway_name,
                   t.transaction_status, t.amount, t.currency, t.verified_by,
                   s.id AS student_id, s.name AS student_name, s.prn AS student_prn,
                   s.email AS student_email, s.mobile AS student_mobile,
                   s.department, s.course, s.academic_year
            FROM receipts r
            JOIN transactions t ON r.transaction_id = t.transaction_id
            LEFT JOIN students s ON t.student_id = s.id
            WHERE t.transaction_id = ?
        """;

        return jdbc.query(sql, (rs, rowNum) -> {
            ReceiptDetails d = new ReceiptDetails();
            d.setReceiptId(rs.getLong("receipt_id"));
            d.setReceiptNumber(rs.getString("receipt_number"));
            Timestamp genTs = rs.getTimestamp("generated_date");
            d.setGeneratedDate(genTs != null ? genTs.toLocalDateTime() : null);

            d.setTransactionId(rs.getLong("transaction_id"));
            d.setTransactionReference(rs.getString("transaction_reference"));
            d.setOrderId(rs.getString("order_id"));
            d.setGatewayName(rs.getString("gateway_name"));
            d.setTransactionStatus(rs.getString("transaction_status"));
            d.setAmount(rs.getBigDecimal("amount"));
            d.setCurrency(rs.getString("currency"));
            d.setVerifiedBy(rs.getString("verified_by"));

            long sId = rs.getLong("student_id");
            if (!rs.wasNull()) {
                d.setStudentId(sId);
                d.setStudentName(rs.getString("student_name"));
                d.setStudentPrn(rs.getString("student_prn"));
                d.setStudentEmail(rs.getString("student_email"));
                d.setStudentMobile(rs.getString("student_mobile"));
                d.setDepartment(rs.getString("department"));
                d.setCourse(rs.getString("course"));
                d.setAcademicYear(rs.getString("academic_year"));
            }
            return d;
        }, transactionId).stream().findFirst();
    }

    public Receipt save(Receipt receipt) {
        if (receipt.getReceiptId() == null) {
            String sql = "INSERT INTO receipts (receipt_number, transaction_id, student_id, receipt_url, generated_date) " +
                         "VALUES (?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            LocalDateTime now = LocalDateTime.now();

            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, receipt.getReceiptNumber());
                ps.setLong(2, receipt.getTransactionId());
                if (receipt.getStudentId() != null) ps.setLong(3, receipt.getStudentId());
                else ps.setNull(3, java.sql.Types.BIGINT);
                ps.setString(4, receipt.getReceiptUrl());
                ps.setTimestamp(5, Timestamp.valueOf(now));
                return ps;
            }, keyHolder);

            Map<String, Object> keys = keyHolder.getKeys();
            Long generatedId;
            if (keys != null && !keys.isEmpty()) {
                Object val = keys.get("receipt_id");
                if (val == null) val = keys.get("RECEIPT_ID");
                if (val == null) val = keys.values().iterator().next();
                generatedId = ((Number) val).longValue();
            } else {
                generatedId = Objects.requireNonNull(keyHolder.getKey()).longValue();
            }
            receipt.setReceiptId(generatedId);
            receipt.setGeneratedDate(now);
        }
        return receipt;
    }
}
