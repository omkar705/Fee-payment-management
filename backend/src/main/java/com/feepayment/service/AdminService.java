package com.feepayment.service;

import com.feepayment.model.Role;
import com.feepayment.model.Student;
import com.feepayment.model.StudentData;
import com.feepayment.model.User;
import com.feepayment.repository.RoleRepository;
import com.feepayment.repository.StudentRepository;
import com.feepayment.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final com.feepayment.repository.FeeStructureRepository feeStructureRepository;

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
        student = studentRepository.save(student);

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
        student = studentRepository.save(student);

        return toData(student);
    }

    @Transactional
    public StudentData updateStudentStatus(Long id, String status) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));

        if (!List.of("ACTIVE", "INACTIVE", "PENDING").contains(status.toUpperCase())) {
            throw new IllegalArgumentException("Invalid status. Allowed: ACTIVE, INACTIVE, PENDING");
        }

        studentRepository.updateStatus(id, status.toUpperCase());

        // Also update user.enabled
        userRepository.updateEnabled(student.getUserId(), "ACTIVE".equals(status.toUpperCase()));

        student.setStatus(status.toUpperCase());
        return toData(student);
    }

    // ============================================================
    // Fee Structure Management (Admin CRUD)
    // ============================================================
    public List<com.feepayment.model.FeeStructure> getAllFeeStructures() {
        return feeStructureRepository.findAll();
    }

    public com.feepayment.model.FeeStructure getFeeStructureById(Long id) {
        return feeStructureRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Fee structure not found with id: " + id));
    }

    @Transactional
    public com.feepayment.model.FeeStructure saveFeeStructure(com.feepayment.model.FeeStructure feeStructure) {
        if (feeStructure.getTotalAmount() == null) {
            java.math.BigDecimal total = java.math.BigDecimal.ZERO;
            if (feeStructure.getTuitionFee() != null) total = total.add(feeStructure.getTuitionFee());
            if (feeStructure.getDevelopmentFee() != null) total = total.add(feeStructure.getDevelopmentFee());
            if (feeStructure.getExamFee() != null) total = total.add(feeStructure.getExamFee());
            feeStructure.setTotalAmount(total);
        }
        feeStructureRepository.save(feeStructure);
        return feeStructure;
    }

    // ============================================================
    // Simple Admin Dashboard Stats
    // ============================================================
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        long totalStudents = studentRepository.count();

        stats.put("totalStudents", totalStudents);
        stats.put("totalFeeCollection", 8250000);

        // Recent 5 registered students
        List<StudentData> recentStudents = studentRepository.findAll().stream()
                .limit(5)
                .map(this::toData)
                .collect(Collectors.toList());
        stats.put("recentStudents", recentStudents);

        // Department-wise fee collection
        List<Map<String, Object>> deptCollection = List.of(
            Map.of("department", "Information Technology", "students", 280, "collected", 3150000),
            Map.of("department", "Computer Science",        "students", 260, "collected", 2950000),
            Map.of("department", "Mechanical",            "students", 140, "collected", 1120000),
            Map.of("department", "Electronics",           "students", 120, "collected", 820000),
            Map.of("department", "Civil",                 "students", 95,  "collected", 510000)
        );
        stats.put("departmentWiseCollection", deptCollection);

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

        // Fetch user enabled status if needed
        if (student.getUserId() != null) {
            userRepository.findById(student.getUserId()).ifPresent(u -> data.setEnabled(u.getEnabled()));
        } else if (student.getUser() != null) {
            data.setEnabled(student.getUser().getEnabled());
        }
        return data;
    }
}
