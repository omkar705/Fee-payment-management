package com.feepayment.config;

import com.feepayment.model.Role;
import com.feepayment.model.Student;
import com.feepayment.model.User;
import com.feepayment.repository.RoleRepository;
import com.feepayment.repository.StudentRepository;
import com.feepayment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * DataSeeder — Seeds initial demo data on application startup if not present.
 * Uses JdbcTemplate Repositories (no JPA).
 *
 * Demo Credentials (development only — NOT for production):
 *   Admin:    admin@mmcoe.com     / Admin@123
 *   Accounts: accounts@mmcoe.com  / Accounts@123
 *   Student:  b25it2010@mmcoe.com / Student@123
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            ensureTablesExist();
        } catch (Exception e) {
            log.warn("Table verification warning: {}", e.getMessage());
        }

        try {
            seedRoles();
            seedUsers();
            log.info("=== Application initialization complete ===");
        } catch (Exception e) {
            log.error("Application initialization failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    private void ensureTablesExist() {
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS fee_structures (
                id              SERIAL PRIMARY KEY,
                department      VARCHAR(100) NOT NULL,
                category        VARCHAR(50)  NOT NULL DEFAULT 'OPEN',
                tuition_fee     NUMERIC(10, 2) NOT NULL,
                development_fee NUMERIC(10, 2) NOT NULL,
                exam_fee        NUMERIC(10, 2) NOT NULL,
                total_amount    NUMERIC(10, 2) NOT NULL,
                academic_year   VARCHAR(20)  NOT NULL,
                status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
            );
        """);

        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS installment_requests (
                id            SERIAL PRIMARY KEY,
                student_id    BIGINT       NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                academic_year VARCHAR(20)  NOT NULL,
                reason        VARCHAR(255),
                status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
                applied_date  TIMESTAMP    NOT NULL DEFAULT NOW(),
                reviewed_by   VARCHAR(100),
                reviewed_date TIMESTAMP
            );
        """);
    }

    // Removed seedFeeStructures as the user will manually create them

    private void seedRoles() {
        for (String name : new String[]{"ADMIN", "ACCOUNTS", "STUDENT"}) {
            roleRepository.insertIfAbsent(name);
            log.info("Role ensured: {}", name);
        }
    }

    private void seedUsers() {
        createUserIfNotExists("admin@mmcoe.com",    "Admin@123",    "ADMIN");
        createUserIfNotExists("accounts@mmcoe.com", "Accounts@123", "ACCOUNTS");
    }

    private void createUserIfNotExists(String email, String rawPassword, String roleName) {
        if (userRepository.existsByEmail(email)) {
            userRepository.findByEmail(email).ifPresent(user -> {
                userRepository.updatePassword(user.getId(), passwordEncoder.encode(rawPassword));
            });
            return;
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Role not found: " + roleName));

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        // Ananya Mehta (b25it2006) starts as inactive
        user.setEnabled(!"b25it2006@mmcoe.com".equals(email));
        userRepository.save(user);
        log.info("Created user: {} ({})", email, roleName);
    }

    // Removed seedStudents as the user will manually create them
}
