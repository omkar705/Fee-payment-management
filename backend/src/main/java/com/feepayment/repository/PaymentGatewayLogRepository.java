package com.feepayment.repository;

import com.feepayment.model.PaymentGatewayLog;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;

@Repository
@RequiredArgsConstructor
public class PaymentGatewayLogRepository {

    private final JdbcTemplate jdbc;

    public PaymentGatewayLog save(PaymentGatewayLog log) {
        String sql = "INSERT INTO payment_gateway_logs (transaction_id, gateway_name, request_data, response_data, status, log_time) " +
                     "VALUES (?, ?, ?, ?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        LocalDateTime now = LocalDateTime.now();

        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            if (log.getTransactionId() != null) ps.setLong(1, log.getTransactionId());
            else ps.setNull(1, java.sql.Types.BIGINT);

            ps.setString(2, log.getGatewayName() != null ? log.getGatewayName() : "RAZORPAY");
            ps.setString(3, log.getRequestData());
            ps.setString(4, log.getResponseData());
            ps.setString(5, log.getStatus());
            ps.setTimestamp(6, Timestamp.valueOf(now));
            return ps;
        }, keyHolder);

        Map<String, Object> keys = keyHolder.getKeys();
        Long generatedId;
        if (keys != null && !keys.isEmpty()) {
            Object val = keys.get("gateway_log_id");
            if (val == null) val = keys.get("GATEWAY_LOG_ID");
            if (val == null) val = keys.values().iterator().next();
            generatedId = ((Number) val).longValue();
        } else {
            generatedId = Objects.requireNonNull(keyHolder.getKey()).longValue();
        }
        log.setGatewayLogId(generatedId);
        log.setLogTime(now);
        return log;
    }
}
