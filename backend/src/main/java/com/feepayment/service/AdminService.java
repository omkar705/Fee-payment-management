package com.feepayment.service;

import com.feepayment.model.AuditLog;
import com.feepayment.model.FeeStructure;
import com.feepayment.model.Role;
import com.feepayment.model.Student;
import com.feepayment.model.StudentData;
import com.feepayment.model.User;
import com.feepayment.repository.FeeStructureRepository;
import com.feepayment.repository.RoleRepository;
import com.feepayment.repository.StudentRepository;
import com.feepayment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final FeeStructureRepository feeStructureRepository;
    private final AuditLogService auditLogService;
    private final JdbcTemplate jdbc;

    public List<StudentData> getAllStudents(String department, String academicYear, String status) {
        List<Student> students;

        if (department == null && academicYear == null && status == null) {
            students = studentRepository.findAll();
        } else {
            students = studentRepository.findByFilters(department, academicYear, status);
        }

        return students.stream().map(this::toData).collect(Collectors.toList());
    }

    public StudentData getStudentById(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));
        return toData(student);
    }

    @Transactional
    public StudentData createStudent(StudentData data) {
        // Validate uniqueness
        if (userRepository.existsByEmail(data.getEmail())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        if (studentRepository.existsByPrn(data.getPrn())) {
            throw new IllegalArgumentException("A student with this PRN already exists.");
        }

        // Get STUDENT role
        Role studentRole = roleRepository.findByName("STUDENT")
                .orElseThrow(() -> new IllegalStateException("STUDENT role not found. Please run the seed data."));

        // Create User — default password is Student@123
        User user = new User();
        user.setEmail(data.getEmail());
        user.setPassword(passwordEncoder.encode("Student@123"));
        user.setRole(studentRole);
        user.setEnabled(true);
        user = userRepository.save(user);

        // Create Student
        Student student = new Student();
        student.setUserId(user.getId());
        student.setName(data.getName());
        student.setPrn(data.getPrn().toUpperCase());
        student.setEmail(data.getEmail());
        student.setMobile(data.getMobile());
        student.setDepartment(data.getDepartment());
        student.setCourse(data.getCourse());
        student.setAcademicYear(data.getAcademicYear());
        student.setStatus("ACTIVE");
        student.setUser(user);
        student.setBtechYear(data.getBtechYear() != null ? data.getBtechYear() : "1st Year");
        student.setCaste(data.getCaste() != null ? data.getCaste() : "OPEN");
        student.setGender(data.getGender() != null ? data.getGender() : "Male");
        student.setAnnualFamilyIncome(data.getAnnualFamilyIncome() != null ? data.getAnnualFamilyIncome() : BigDecimal.ZERO);
        student.setQuota(data.getQuota() != null ? data.getQuota() : "CAP");
        student = studentRepository.save(student);

        // Audit Log entry
        auditLogService.logAction(
                getCurrentUsername(),
                "STUDENT_CREATED",
                "Student",
                student.getPrn(),
                "Registered student " + student.getName() + " in " + student.getDepartment()
        );

        return toData(student);
    }

    @Transactional
    public StudentData updateStudent(Long id, StudentData data) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));

        // Check email uniqueness (excluding current)
        if (!student.getEmail().equals(data.getEmail()) && userRepository.existsByEmail(data.getEmail())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        // Check PRN uniqueness (excluding current)
        if (!student.getPrn().equals(data.getPrn()) && studentRepository.existsByPrn(data.getPrn())) {
            throw new IllegalArgumentException("A student with this PRN already exists.");
        }

        student.setName(data.getName());
        student.setPrn(data.getPrn().toUpperCase());
        student.setEmail(data.getEmail());
        student.setMobile(data.getMobile());
        student.setDepartment(data.getDepartment());
        student.setCourse(data.getCourse());
        student.setAcademicYear(data.getAcademicYear());
        student.setBtechYear(data.getBtechYear() != null ? data.getBtechYear() : "1st Year");
        student.setCaste(data.getCaste() != null ? data.getCaste() : "OPEN");
        student.setGender(data.getGender() != null ? data.getGender() : "Male");
        student.setAnnualFamilyIncome(data.getAnnualFamilyIncome() != null ? data.getAnnualFamilyIncome() : BigDecimal.ZERO);
        student.setQuota(data.getQuota() != null ? data.getQuota() : "CAP");
        student = studentRepository.save(student);

        // Audit Log entry
        auditLogService.logAction(
                getCurrentUsername(),
                "STUDENT_UPDATED",
                "Student",
                student.getPrn(),
                "Updated details for " + student.getName() + " (" + student.getDepartment() + ")"
        );

        return toData(student);
    }

    @Transactional
    public StudentData updateStudentStatus(Long id, String status) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));

        String upperStatus = status.trim().toUpperCase();
        if (!List.of("ACTIVE", "INACTIVE", "PENDING").contains(upperStatus)) {
            throw new IllegalArgumentException("Invalid status. Allowed: ACTIVE, INACTIVE, PENDING");
        }

        studentRepository.updateStatus(id, upperStatus);

        // Also update user.enabled
        userRepository.updateEnabled(student.getUserId(), "ACTIVE".equals(upperStatus));

        student.setStatus(upperStatus);

        // Audit Log entry
        auditLogService.logAction(
                getCurrentUsername(),
                "STUDENT_STATUS_CHANGED",
                "Student",
                student.getPrn(),
                "Changed status of student " + student.getName() + " to " + upperStatus
        );

        return toData(student);
    }

    // ============================================================
    // Fee Structure Management (Admin CRUD)
    // ============================================================
    public List<FeeStructure> getAllFeeStructures() {
        return feeStructureRepository.findAll();
    }

    public FeeStructure getFeeStructureById(Long id) {
        return feeStructureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Fee structure not found with id: " + id));
    }

    @Transactional
    public FeeStructure saveFeeStructure(FeeStructure feeStructure) {
        boolean isNew = (feeStructure.getId() == null);
        if (feeStructure.getTotalAmount() == null || feeStructure.getTotalAmount().compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal total = BigDecimal.ZERO;
            if (feeStructure.getTuitionFee() != null) total = total.add(feeStructure.getTuitionFee());
            if (feeStructure.getDevelopmentFee() != null) total = total.add(feeStructure.getDevelopmentFee());
            if (feeStructure.getExamFee() != null) total = total.add(feeStructure.getExamFee());
            if (feeStructure.getUniversityFee() != null) total = total.add(feeStructure.getUniversityFee());
            if (feeStructure.getLibraryFee() != null) total = total.add(feeStructure.getLibraryFee());
            if (feeStructure.getLaboratoryFee() != null) total = total.add(feeStructure.getLaboratoryFee());
            if (feeStructure.getInsuranceFee() != null) total = total.add(feeStructure.getInsuranceFee());
            if (feeStructure.getOtherFee() != null) total = total.add(feeStructure.getOtherFee());
            feeStructure.setTotalAmount(total);
        }
        feeStructureRepository.save(feeStructure);

        // Audit Log entry
        auditLogService.logAction(
                getCurrentUsername(),
                isNew ? "FEE_STRUCTURE_CREATED" : "FEE_STRUCTURE_UPDATED",
                "FeeStructure",
                feeStructure.getDepartment(),
                (isNew ? "Created" : "Updated") + " fee structure for " + feeStructure.getDepartment() + " (Total: ₹" + feeStructure.getTotalAmount() + ")"
        );

        return feeStructure;
    }

    // ============================================================
    // Real Dynamic Admin Dashboard Stats (Calculated from PostgreSQL)
    // ============================================================
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        // 1. Total Registered Students from PostgreSQL
        long totalStudents = studentRepository.count();
        stats.put("totalStudents", totalStudents);

        // 2. Total Fee Collection from PostgreSQL transactions (SUCCESS)
        BigDecimal totalFeeCollection = BigDecimal.ZERO;
        try {
            totalFeeCollection = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_status = 'SUCCESS'",
                BigDecimal.class
            );
        } catch (Exception ignored) {}
        stats.put("totalFeeCollection", totalFeeCollection != null ? totalFeeCollection : BigDecimal.ZERO);

        // 3. Real Total Pending Fees (Calculated per student: applicable fee - verified paid)
        BigDecimal totalPendingFees = BigDecimal.ZERO;
        try {
            String pendingSql = """
                WITH student_fee AS (
                    SELECT s.id AS student_id,
                           COALESCE(fs.total_amount, 120000.00) AS applicable_fee
                    FROM students s
                    LEFT JOIN fee_structures fs ON s.department = fs.department AND fs.status = 'ACTIVE'
                ),
                student_paid AS (
                    SELECT s.id AS student_id,
                           COALESCE(SUM(t.amount), 0) AS paid_amount
                    FROM students s
                    LEFT JOIN transactions t ON s.id = t.student_id AND t.transaction_status = 'SUCCESS'
                    GROUP BY s.id
                )
                SELECT COALESCE(SUM(GREATEST(0, sf.applicable_fee - sp.paid_amount)), 0)
                FROM student_fee sf
                JOIN student_paid sp ON sf.student_id = sp.student_id
            """;
            totalPendingFees = jdbc.queryForObject(pendingSql, BigDecimal.class);
        } catch (Exception ignored) {}
        stats.put("totalPendingFees", totalPendingFees != null ? totalPendingFees : BigDecimal.ZERO);

        // 4. Recent Student Registrations (5 latest students by ID desc)
        List<StudentData> recentStudents = studentRepository.findAll().stream()
                .sorted((a, b) -> Long.compare(b.getId() != null ? b.getId() : 0, a.getId() != null ? a.getId() : 0))
                .limit(5)
                .map(this::toData)
                .collect(Collectors.toList());
        stats.put("recentStudents", recentStudents);

        // 5. Department-wise Collection from live PostgreSQL aggregation
        String deptSql = """
            WITH student_calc AS (
                SELECT s.department,
                       s.id AS student_id,
                       COALESCE(SUM(CASE WHEN t.transaction_status = 'SUCCESS' THEN t.amount ELSE 0 END), 0) AS paid
                FROM students s
                LEFT JOIN transactions t ON s.id = t.student_id
                GROUP BY s.department, s.id
            ),
            dept_agg AS (
                SELECT department,
                       COUNT(student_id) AS total_students,
                       SUM(paid) AS collected_amount
                FROM student_calc
                GROUP BY department
            )
            SELECT fs.department,
                   COALESCE(da.total_students, 0) AS total_students,
                   COALESCE(da.collected_amount, 0) AS collected_amount
            FROM fee_structures fs
            LEFT JOIN dept_agg da ON fs.department = da.department
            WHERE fs.status = 'ACTIVE'
            ORDER BY da.collected_amount DESC NULLS LAST, fs.department ASC
        """;
        try {
            List<Map<String, Object>> deptCollection = jdbc.query(deptSql, (rs, rowNum) -> {
                Map<String, Object> m = new HashMap<>();
                m.put("department", rs.getString("department"));
                m.put("students", rs.getLong("total_students"));
                m.put("collected", rs.getBigDecimal("collected_amount"));
                return m;
            });
            stats.put("departmentWiseCollection", deptCollection);
        } catch (Exception e) {
            stats.put("departmentWiseCollection", List.of());
        }

        return stats;
    }

    public Map<String, Object> getFeeAnalytics(String period) {
        Map<String, Object> result = new HashMap<>();
        List<String> labels;
        List<Long> amounts;

        switch (period.toLowerCase()) {
            case "month" -> {
                labels  = Arrays.asList("Week 1", "Week 2", "Week 3", "Week 4");
                amounts = Arrays.asList(185000L, 240000L, 310000L, 195000L);
            }
            case "week" -> {
                labels  = Arrays.asList("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun");
                amounts = Arrays.asList(42000L, 67000L, 38000L, 91000L, 55000L, 14000L, 0L);
            }
            default -> {
                labels  = Arrays.asList("Apr", "May", "Jun", "Jul", "Aug", "Sep",
                                        "Oct", "Nov", "Dec", "Jan", "Feb", "Mar");
                amounts = Arrays.asList(
                    825000L, 612000L, 490000L, 278000L, 935000L, 1150000L,
                    720000L, 480000L, 390000L, 1050000L, 680000L, 540000L
                );
            }
        }

        result.put("period", period.toLowerCase());
        result.put("labels", labels);
        result.put("amounts", amounts);
        long total = amounts.stream().mapToLong(Long::longValue).sum();
        result.put("totalCollected", total);
        result.put("currency", "INR");
        return result;
    }

    // ============================================================
    // Audit Logs Retrieval
    // ============================================================
    public List<AuditLog> getAuditLogs() {
        return auditLogService.getRecentLogs(50);
    }

    private StudentData toData(Student student) {
        StudentData data = new StudentData();
        data.setId(student.getId());
        data.setName(student.getName());
        data.setPrn(student.getPrn());
        data.setEmail(student.getEmail());
        data.setMobile(student.getMobile());
        data.setDepartment(student.getDepartment());
        data.setCourse(student.getCourse());
        data.setAcademicYear(student.getAcademicYear());
        data.setStatus(student.getStatus());
        data.setCreatedAt(student.getCreatedAt() != null ? student.getCreatedAt().toString() : null);
        data.setBtechYear(student.getBtechYear());
        data.setCaste(student.getCaste());
        data.setGender(student.getGender());
        data.setAnnualFamilyIncome(student.getAnnualFamilyIncome());
        data.setQuota(student.getQuota());

        // Fetch user enabled status if needed
        if (student.getUserId() != null) {
            userRepository.findById(student.getUserId()).ifPresent(u -> data.setEnabled(u.getEnabled()));
        } else if (student.getUser() != null) {
            data.setEnabled(student.getUser().getEnabled());
        }
        return data;
    }

    private String getCurrentUsername() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                return auth.getName();
            }
        } catch (Exception ignored) {}
        return "admin@mmcoe.com";
    }
}
