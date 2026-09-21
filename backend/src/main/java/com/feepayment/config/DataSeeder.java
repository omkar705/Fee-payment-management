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
            seedFeeStructures();
        } catch (Exception e) {
            log.warn("Table verification / fee structure seeding warning: {}", e.getMessage());
        }

        try {
            if (studentRepository.count() >= 10 && userRepository.existsByEmail("admin@mmcoe.com")) {
                log.info("Database is already initialized with students and admin. Skipping redundant data seeding.");
                return;
            }
        } catch (Exception e) {
            log.warn("Could not check student count (tables may not exist yet): {}. Proceeding with seeding.", e.getMessage());
        }
        try {
            seedRoles();
            seedUsers();
            seedStudents();
            log.info("=== Data seeding complete ===");
        } catch (Exception e) {
            log.error("Data seeding failed: {}", e.getMessage(), e);
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

    private void seedFeeStructures() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM fee_structures", Integer.class);
        if (count == null || count == 0) {
            jdbc.update("INSERT INTO fee_structures (department, category, tuition_fee, development_fee, exam_fee, total_amount, academic_year, status) VALUES " +
                "('Information Technology', 'OPEN', 95000, 15000, 10000, 120000, '2025-26', 'ACTIVE')," +
                "('Computer Science', 'OPEN', 95000, 15000, 10000, 120000, '2025-26', 'ACTIVE')," +
                "('Mechanical', 'OPEN', 85000, 15000, 10000, 110000, '2025-26', 'ACTIVE')," +
                "('Civil', 'OPEN', 80000, 15000, 10000, 105000, '2025-26', 'ACTIVE')," +
                "('Electronics', 'OPEN', 88000, 15000, 10000, 113000, '2025-26', 'ACTIVE')");
            log.info("Default fee structures seeded.");
        }
    }

    private void seedRoles() {
        for (String name : new String[]{"ADMIN", "ACCOUNTS", "STUDENT"}) {
            roleRepository.insertIfAbsent(name);
            log.info("Role ensured: {}", name);
        }
    }

    private void seedUsers() {
        createUserIfNotExists("admin@mmcoe.com",    "Admin@123",    "ADMIN");
        createUserIfNotExists("accounts@mmcoe.com", "Accounts@123", "ACCOUNTS");

        // 10 demo student user accounts
        String[] studentEmails = {
            "b25it2010@mmcoe.com", "b25it2001@mmcoe.com", "b25it2002@mmcoe.com",
            "b25it2003@mmcoe.com", "b25it2004@mmcoe.com", "b25it2005@mmcoe.com",
            "b25it2006@mmcoe.com", "b25it2007@mmcoe.com", "b25it2008@mmcoe.com",
            "b25it2009@mmcoe.com"
        };
        for (String email : studentEmails) {
            createUserIfNotExists(email, "Student@123", "STUDENT");
        }
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

    private void seedStudents() {
        Object[][] students = {
            {"b25it2010@mmcoe.com", "Manan Vivekanand Tote", "B25IT2010", "9876543210", "ACTIVE"},
            {"b25it2001@mmcoe.com", "Aarav Sharma",           "B25IT2001", "9876543201", "ACTIVE"},
            {"b25it2002@mmcoe.com", "Priya Desai",            "B25IT2002", "9876543202", "ACTIVE"},
            {"b25it2003@mmcoe.com", "Rohan Kulkarni",         "B25IT2003", "9876543203", "ACTIVE"},
            {"b25it2004@mmcoe.com", "Sneha Patil",            "B25IT2004", "9876543204", "ACTIVE"},
            {"b25it2005@mmcoe.com", "Vikram Joshi",           "B25IT2005", "9876543205", "ACTIVE"},
            {"b25it2006@mmcoe.com", "Ananya Mehta",           "B25IT2006", "9876543206", "INACTIVE"},
            {"b25it2007@mmcoe.com", "Karan Verma",            "B25IT2007", "9876543207", "ACTIVE"},
            {"b25it2008@mmcoe.com", "Divya Nair",             "B25IT2008", "9876543208", "ACTIVE"},
            {"b25it2009@mmcoe.com", "Arjun Rao",              "B25IT2009", "9876543209", "ACTIVE"}
        };

        for (Object[] data : students) {
            String email  = (String) data[0];
            String name   = (String) data[1];
            String prn    = (String) data[2];
            String mobile = (String) data[3];
            String status = (String) data[4];

            if (studentRepository.existsByPrn(prn)) continue;

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) continue;

            Student student = new Student();
            student.setUserId(user.getId());
            student.setName(name);
            student.setPrn(prn);
            student.setEmail(email);
            student.setMobile(mobile);
            student.setDepartment("Information Technology");
            student.setCourse("B.Tech");
            student.setAcademicYear("2025-26");
            student.setStatus(status);
            studentRepository.save(student);
            log.info("Created student: {} ({})", name, prn);
        }
    }
}
