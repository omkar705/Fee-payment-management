package com.feepayment.repository;

import com.feepayment.model.AuditLog;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class AuditLogRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<AuditLog> rowMapper = (rs, rowNum) -> {
        AuditLog log = new AuditLog();
        log.setAuditId(rs.getLong("audit_id"));
        log.setUsername(rs.getString("username"));
        log.setAction(rs.getString("action"));
        log.setEntityName(rs.getString("entity_name"));
        log.setEntityId(rs.getString("entity_id"));
        log.setDetails(rs.getString("details"));
        log.setIpAddress(rs.getString("ip_address"));
        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) {
            log.setCreatedAt(ts.toLocalDateTime());
        }
        return log;
    };

    public void save(AuditLog log) {
        String sql = "INSERT INTO audit_logs (username, action, entity_name, entity_id, details, ip_address, created_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, NOW())";
        jdbc.update(sql,
                log.getUsername(),
                log.getAction(),
                log.getEntityName(),
                log.getEntityId(),
                log.getDetails(),
                log.getIpAddress()
        );
    }

    public List<AuditLog> findAll(int limit) {
        String sql = "SELECT audit_id, username, action, entity_name, entity_id, details, ip_address, created_at " +
                     "FROM audit_logs ORDER BY created_at DESC LIMIT ?";
        return jdbc.query(sql, rowMapper, limit);
    }
}
