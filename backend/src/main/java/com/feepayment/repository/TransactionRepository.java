package com.feepayment.repository;

import com.feepayment.model.Transaction;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
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
        return jdbc.query(SELECT_ALL + " WHERE transaction_id = ?", rowMapper, id).stream().findFirst();
    }

    public Optional<Transaction> findByTransactionReference(String reference) {
        return jdbc.query(SELECT_ALL + " WHERE transaction_reference = ?", rowMapper, reference).stream().findFirst();
    }

    public boolean existsByTransactionReference(String reference) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM transactions WHERE transaction_reference = ?", Integer.class, reference);
        return count != null && count > 0;
    }

    public List<Transaction> findByStudentId(Long studentId) {
        return jdbc.query(SELECT_ALL + " WHERE student_id = ? ORDER BY created_at DESC", rowMapper, studentId);
    }

    /**
     * Save a transaction.
     * Uses RETURNING clause for PostgreSQL (works with Supabase PgBouncer in transaction mode).
     */
    public Transaction save(Transaction transaction) {
        if (transaction.getTransactionId() == null) {
            LocalDateTime now = LocalDateTime.now();

            // Use RETURNING to get generated ID — compatible with Supabase PgBouncer
            String sql = "INSERT INTO transactions " +
                         "(payment_id, student_id, order_id, transaction_reference, " +
                         "gateway_name, transaction_status, amount, currency, verified_by, created_at) " +
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
                         "RETURNING transaction_id";

            List<Map<String, Object>> rows = jdbc.queryForList(sql,
                transaction.getPaymentId(),
                transaction.getStudentId(),
                transaction.getOrderId(),
                transaction.getTransactionReference(),
                transaction.getGatewayName() != null ? transaction.getGatewayName() : "RAZORPAY",
                transaction.getTransactionStatus() != null ? transaction.getTransactionStatus() : "SUCCESS",
                transaction.getAmount(),
                transaction.getCurrency() != null ? transaction.getCurrency() : "INR",
                transaction.getVerifiedBy() != null ? transaction.getVerifiedBy() : "RAZORPAY_SIGNATURE_VERIFIED",
                Timestamp.valueOf(now)
            );

            if (rows != null && !rows.isEmpty()) {
                Object val = rows.get(0).get("transaction_id");
                if (val instanceof Number n) {
                    transaction.setTransactionId(n.longValue());
                }
            }
            transaction.setCreatedAt(now);

        } else {
            jdbc.update(
                "UPDATE transactions SET transaction_status=?, verified_by=? WHERE transaction_id=?",
                transaction.getTransactionStatus(), transaction.getVerifiedBy(), transaction.getTransactionId()
            );
        }
        return transaction;
    }
}
