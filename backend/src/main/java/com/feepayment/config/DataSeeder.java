package com.feepayment.config;

import com.feepayment.dao.RoleDao;
import com.feepayment.dao.StudentDao;
import com.feepayment.dao.UserDao;
import com.feepayment.entity.Role;
import com.feepayment.entity.Student;
import com.feepayment.entity.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * DataSeeder — Seeds initial demo data on application startup if not present.
 * Uses JdbcTemplate DAOs (no JPA).
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

    private final RoleDao roleDao;
    private final UserDao userDao;
    private final StudentDao studentDao;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedRoles();
        seedUsers();
        seedStudents();
        log.info("=== Data seeding complete ===");
    }

    private void seedRoles() {
        for (String name : new String[]{"ADMIN", "ACCOUNTS", "STUDENT"}) {
            roleDao.insertIfAbsent(name);
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
        if (userDao.existsByEmail(email)) return;

        Role role = roleDao.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Role not found: " + roleName));

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        // Ananya Mehta (b25it2006) starts as inactive
        user.setEnabled(!"b25it2006@mmcoe.com".equals(email));
        userDao.save(user);
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

            if (studentDao.existsByPrn(prn)) continue;

            User user = userDao.findByEmail(email).orElse(null);
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
            studentDao.save(student);
            log.info("Created student: {} ({})", name, prn);
        }
    }
}
