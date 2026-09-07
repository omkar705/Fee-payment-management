package com.feepayment.repository;

import com.feepayment.model.PasswordResetToken;
import com.feepayment.model.User;
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

/**
 * PasswordResetTokenRepository — JdbcTemplate-based repository for password_reset_tokens table.
 */
@Repository
@RequiredArgsConstructor
public class PasswordResetTokenRepository {

    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;

    private final RowMapper<PasswordResetToken> tokenRowMapper = (rs, rowNum) -> {
        PasswordResetToken t = new PasswordResetToken();
        t.setId(rs.getLong("id"));
        t.setUserId(rs.getLong("user_id"));
        t.setToken(rs.getString("token"));
        Timestamp expiry = rs.getTimestamp("expiry_date");
        t.setExpiryDate(expiry != null ? expiry.toLocalDateTime() : null);
        t.setUsed(rs.getBoolean("used"));
        Timestamp created = rs.getTimestamp("created_at");
        t.setCreatedAt(created != null ? created.toLocalDateTime() : null);
        return t;
    };

    public Optional<PasswordResetToken> findByToken(String token) {
        String sql = "SELECT id, user_id, token, expiry_date, used, created_at FROM password_reset_tokens WHERE token = ?";
        return jdbc.query(sql, tokenRowMapper, token).stream()
                .peek(t -> {
                    // Eagerly load the associated user
                    userRepository.findById(t.getUserId()).ifPresent(t::setUser);
                })
                .findFirst();
    }

    public void deleteByUser(User user) {
        jdbc.update("DELETE FROM password_reset_tokens WHERE user_id = ?", user.getId());
    }

    public PasswordResetToken save(PasswordResetToken token) {
        if (token.getId() == null) {
            String sql = "INSERT INTO password_reset_tokens (user_id, token, expiry_date, used, created_at) VALUES (?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            LocalDateTime now = LocalDateTime.now();
            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, token.getUserId() != null ? token.getUserId() : token.getUser().getId());
                ps.setString(2, token.getToken());
                ps.setTimestamp(3, Timestamp.valueOf(token.getExpiryDate()));
                ps.setBoolean(4, token.getUsed() != null ? token.getUsed() : false);
                ps.setTimestamp(5, Timestamp.valueOf(now));
                return ps;
            }, keyHolder);
            Map<String, Object> keys = keyHolder.getKeys();
            Long generatedId;
            if (keys != null && !keys.isEmpty()) {
                Object val = keys.get("id");
                if (val == null) val = keys.get("ID");
                if (val == null) val = keys.values().iterator().next();
                generatedId = ((Number) val).longValue();
            } else {
                generatedId = Objects.requireNonNull(keyHolder.getKey()).longValue();
            }
            token.setId(generatedId);
            token.setCreatedAt(now);
        } else {
            jdbc.update("UPDATE password_reset_tokens SET used=? WHERE id=?", token.getUsed(), token.getId());
        }
        return token;
    }
}
