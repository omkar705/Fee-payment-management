package com.feepayment.dao;

import com.feepayment.entity.Role;
import com.feepayment.entity.User;
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
 * UserDao — JdbcTemplate-based data access for the users table.
 * Replaces the Spring Data JPA UserRepository.
 */
@Repository
@RequiredArgsConstructor
public class UserDao {

    private final JdbcTemplate jdbc;

    private final RowMapper<User> userRowMapper = (rs, rowNum) -> {
        User user = new User();
        user.setId(rs.getLong("id"));
        user.setEmail(rs.getString("email"));
        user.setPassword(rs.getString("password"));
        user.setEnabled(rs.getBoolean("enabled"));
        Timestamp ts = rs.getTimestamp("created_at");
        user.setCreatedAt(ts != null ? ts.toLocalDateTime() : null);

        // Map embedded role
        Role role = new Role();
        role.setId(rs.getInt("role_id"));
        role.setName(rs.getString("role_name"));
        user.setRole(role);
        return user;
    };

    private static final String SELECT_WITH_ROLE =
        "SELECT u.id, u.email, u.password, u.enabled, u.created_at, u.role_id, r.name AS role_name " +
        "FROM users u JOIN roles r ON u.role_id = r.id";

    public Optional<User> findByEmail(String email) {
        String sql = SELECT_WITH_ROLE + " WHERE u.email = ?";
        return jdbc.query(sql, userRowMapper, email).stream().findFirst();
    }

    public Optional<User> findById(Long id) {
        String sql = SELECT_WITH_ROLE + " WHERE u.id = ?";
        return jdbc.query(sql, userRowMapper, id).stream().findFirst();
    }

    public boolean existsByEmail(String email) {
        String sql = "SELECT COUNT(*) FROM users WHERE email = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, email);
        return count != null && count > 0;
    }

    /**
     * Insert a new user and return the generated id.
     */
    public User save(User user) {
        if (user.getId() == null) {
            // INSERT
            String sql = "INSERT INTO users (email, password, role_id, enabled, created_at) VALUES (?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            LocalDateTime now = LocalDateTime.now();
            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, user.getEmail());
                ps.setString(2, user.getPassword());
                ps.setInt(3, user.getRole().getId());
                ps.setBoolean(4, user.getEnabled() != null ? user.getEnabled() : true);
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
            user.setId(generatedId);
            user.setCreatedAt(now);
        } else {
            // UPDATE
            String sql = "UPDATE users SET email=?, password=?, role_id=?, enabled=? WHERE id=?";
            jdbc.update(sql,
                user.getEmail(),
                user.getPassword(),
                user.getRole().getId(),
                user.getEnabled(),
                user.getId()
            );
        }
        return user;
    }

    public void updateEnabled(Long userId, boolean enabled) {
        jdbc.update("UPDATE users SET enabled=? WHERE id=?", enabled, userId);
    }

    public void updatePassword(Long userId, String encodedPassword) {
        jdbc.update("UPDATE users SET password=? WHERE id=?", encodedPassword, userId);
    }
}
