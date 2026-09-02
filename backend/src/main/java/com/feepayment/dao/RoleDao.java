package com.feepayment.dao;

import com.feepayment.entity.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * RoleDao — JdbcTemplate-based data access for the roles table.
 */
@Repository
@RequiredArgsConstructor
public class RoleDao {

    private final JdbcTemplate jdbc;

    private final RowMapper<Role> roleRowMapper = (rs, rowNum) -> new Role(
            rs.getInt("id"),
            rs.getString("name")
    );

    public Optional<Role> findByName(String name) {
        String sql = "SELECT id, name FROM roles WHERE name = ?";
        return jdbc.query(sql, roleRowMapper, name).stream().findFirst();
    }

    public Optional<Role> findById(int id) {
        String sql = "SELECT id, name FROM roles WHERE id = ?";
        return jdbc.query(sql, roleRowMapper, id).stream().findFirst();
    }

    /**
     * Insert role if it doesn't already exist.
     */
    public void insertIfAbsent(String name) {
        String check = "SELECT COUNT(*) FROM roles WHERE name = ?";
        Integer count = jdbc.queryForObject(check, Integer.class, name);
        if (count != null && count == 0) {
            jdbc.update("INSERT INTO roles (name) VALUES (?)", name);
        }
    }
}
