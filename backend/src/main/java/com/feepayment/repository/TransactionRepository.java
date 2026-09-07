package com.feepayment.repository;

import com.feepayment.model.Transaction;
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
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class TransactionRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Transaction> rowMapper = (rs, rowNum) -> {
        Transaction t = new Transaction();
        t.setTransactionId(rs.getLong("transaction_id"));
        long paymentId = rs.getLong("payment_id");
        t.setPaymentId(rs.wasNull() ? null : paymentId);
        long studentId = rs.getLong("student_id");
        t.setStudentId(rs.wasNull() ? null : studentId);
        t.setOrderId(rs.getString("order_id"));
        t.setTransactionReference(rs.getString("transaction_reference"));
        t.setGatewayName(rs.getString("gateway_name"));
        t.setTransactionStatus(rs.getString("transaction_status"));
        t.setAmount(rs.getBigDecimal("amount"));
        t.setCurrency(rs.getString("currency"));
        t.setVerifiedBy(rs.getString("verified_by"));
        Timestamp ts = rs.getTimestamp("created_at");
        t.setCreatedAt(ts != null ? ts.toLocalDateTime() : null);
        return t;
    };

    private static final String SELECT_ALL =
        "SELECT transaction_id, payment_id, student_id, order_id, transaction_reference, " +
        "gateway_name, transaction_status, amount, currency, verified_by, created_at FROM transactions";

    public Optional<Transaction> findById(Long id) {
        String sql = SELECT_ALL + " WHERE transaction_id = ?";
        return jdbc.query(sql, rowMapper, id).stream().findFirst();
    }

    public Optional<Transaction> findByTransactionReference(String reference) {
        String sql = SELECT_ALL + " WHERE transaction_reference = ?";
        return jdbc.query(sql, rowMapper, reference).stream().findFirst();
    }

    public boolean existsByTransactionReference(String reference) {
        String sql = "SELECT COUNT(*) FROM transactions WHERE transaction_reference = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, reference);
        return count != null && count > 0;
    }

    public List<Transaction> findByStudentId(Long studentId) {
        String sql = SELECT_ALL + " WHERE student_id = ? ORDER BY created_at DESC";
        return jdbc.query(sql, rowMapper, studentId);
    }

    public Transaction save(Transaction transaction) {
        if (transaction.getTransactionId() == null) {
            String sql = "INSERT INTO transactions (payment_id, student_id, order_id, transaction_reference, " +
                         "gateway_name, transaction_status, amount, currency, verified_by, created_at) " +
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            LocalDateTime now = LocalDateTime.now();

            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                if (transaction.getPaymentId() != null) ps.setLong(1, transaction.getPaymentId());
                else ps.setNull(1, java.sql.Types.BIGINT);

                if (transaction.getStudentId() != null) ps.setLong(2, transaction.getStudentId());
                else ps.setNull(2, java.sql.Types.BIGINT);

                ps.setString(3, transaction.getOrderId());
                ps.setString(4, transaction.getTransactionReference());
                ps.setString(5, transaction.getGatewayName() != null ? transaction.getGatewayName() : "RAZORPAY");
                ps.setString(6, transaction.getTransactionStatus() != null ? transaction.getTransactionStatus() : "SUCCESS");
                ps.setBigDecimal(7, transaction.getAmount());
                ps.setString(8, transaction.getCurrency() != null ? transaction.getCurrency() : "INR");
                ps.setString(9, transaction.getVerifiedBy() != null ? transaction.getVerifiedBy() : "RAZORPAY_SIGNATURE_VERIFIED");
                ps.setTimestamp(10, Timestamp.valueOf(now));
                return ps;
            }, keyHolder);

            Map<String, Object> keys = keyHolder.getKeys();
            Long generatedId;
            if (keys != null && !keys.isEmpty()) {
                Object val = keys.get("transaction_id");
                if (val == null) val = keys.get("TRANSACTION_ID");
                if (val == null) val = keys.values().iterator().next();
                generatedId = ((Number) val).longValue();
            } else {
                generatedId = Objects.requireNonNull(keyHolder.getKey()).longValue();
            }
            transaction.setTransactionId(generatedId);
            transaction.setCreatedAt(now);
        } else {
            String sql = "UPDATE transactions SET transaction_status=?, verified_by=? WHERE transaction_id=?";
            jdbc.update(sql, transaction.getTransactionStatus(), transaction.getVerifiedBy(), transaction.getTransactionId());
        }
        return transaction;
    }
}
