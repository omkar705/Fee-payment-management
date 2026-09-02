package com.feepayment.service;

import com.feepayment.dao.RoleDao;
import com.feepayment.dao.StudentDao;
import com.feepayment.dao.UserDao;
import com.feepayment.dto.StudentDto;
import com.feepayment.entity.Role;
import com.feepayment.entity.Student;
import com.feepayment.entity.User;
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

    private final StudentDao studentDao;
    private final UserDao userDao;
    private final RoleDao roleDao;
    private final PasswordEncoder passwordEncoder;

    public List<StudentDto> getAllStudents(String department, String academicYear, String status) {
        List<Student> students;

        if (department == null && academicYear == null && status == null) {
            students = studentDao.findAll();
        } else {
            students = studentDao.findByFilters(department, academicYear, status);
        }

        return students.stream().map(this::toDto).collect(Collectors.toList());
    }

    public StudentDto getStudentById(Long id) {
        Student student = studentDao.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));
        return toDto(student);
    }

    @Transactional
    public StudentDto createStudent(StudentDto dto) {
        // Validate uniqueness
        if (userDao.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        if (studentDao.existsByPrn(dto.getPrn())) {
            throw new IllegalArgumentException("A student with this PRN already exists.");
        }

        // Get STUDENT role
        Role studentRole = roleDao.findByName("STUDENT")
                .orElseThrow(() -> new IllegalStateException("STUDENT role not found. Please run the seed data."));

        // Create User — default password is Student@123
        User user = new User();
        user.setEmail(dto.getEmail());
        user.setPassword(passwordEncoder.encode("Student@123"));
        user.setRole(studentRole);
        user.setEnabled(true);
        user = userDao.save(user);

        // Create Student
        Student student = new Student();
        student.setUserId(user.getId());
        student.setName(dto.getName());
        student.setPrn(dto.getPrn().toUpperCase());
        student.setEmail(dto.getEmail());
        student.setMobile(dto.getMobile());
        student.setDepartment(dto.getDepartment());
        student.setCourse(dto.getCourse());
        student.setAcademicYear(dto.getAcademicYear());
        student.setStatus("ACTIVE");
        student.setUser(user);
        student = studentDao.save(student);

        return toDto(student);
    }

    @Transactional
    public StudentDto updateStudent(Long id, StudentDto dto) {
        Student student = studentDao.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));

        // Check email uniqueness (excluding current)
        if (!student.getEmail().equals(dto.getEmail()) && userDao.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }
        // Check PRN uniqueness (excluding current)
        if (!student.getPrn().equals(dto.getPrn()) && studentDao.existsByPrn(dto.getPrn())) {
            throw new IllegalArgumentException("A student with this PRN already exists.");
        }

        student.setName(dto.getName());
        student.setPrn(dto.getPrn().toUpperCase());
        student.setEmail(dto.getEmail());
        student.setMobile(dto.getMobile());
        student.setDepartment(dto.getDepartment());
        student.setCourse(dto.getCourse());
        student.setAcademicYear(dto.getAcademicYear());
        student = studentDao.save(student);

        return toDto(student);
    }

    @Transactional
    public StudentDto updateStudentStatus(Long id, String status) {
        Student student = studentDao.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Student not found with id: " + id));

        if (!List.of("ACTIVE", "INACTIVE", "PENDING").contains(status.toUpperCase())) {
            throw new IllegalArgumentException("Invalid status. Allowed: ACTIVE, INACTIVE, PENDING");
        }

        studentDao.updateStatus(id, status.toUpperCase());

        // Also update user.enabled
        userDao.updateEnabled(student.getUserId(), "ACTIVE".equals(status.toUpperCase()));

        student.setStatus(status.toUpperCase());
        return toDto(student);
    }

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        long total   = studentDao.count();
        long active  = studentDao.countByStatus("ACTIVE");
        long inactive = studentDao.countByStatus("INACTIVE");
        long pending  = studentDao.countByStatus("PENDING");

        stats.put("totalStudents",    total);
        stats.put("activeStudents",   active);
        stats.put("inactiveStudents", inactive);
        stats.put("pendingStudents",  pending);
        stats.put("newStudents",      pending);
        return stats;
    }

    /**
     * Fee Collection Analytics — returns chart-ready data.
     * TODO Milestone 2: Replace dummy data with real payment queries.
     *
     * period = "year"  → monthly breakdown for AY 2025-26
     * period = "month" → weekly totals for current month (4 weeks)
     * period = "week"  → daily totals for current week (Mon–Sun)
     */
    public Map<String, Object> getFeeAnalytics(String period) {
        Map<String, Object> result = new HashMap<>();
        List<String> labels;
        List<Long>   amounts;

        switch (period.toLowerCase()) {
            case "month" -> {
                labels  = Arrays.asList("Week 1", "Week 2", "Week 3", "Week 4");
                amounts = Arrays.asList(185000L, 240000L, 310000L, 195000L);
            }
            case "week" -> {
                labels  = Arrays.asList("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun");
                amounts = Arrays.asList(42000L, 67000L, 38000L, 91000L, 55000L, 14000L, 0L);
            }
            default -> {   // year
                labels  = Arrays.asList("Apr", "May", "Jun", "Jul", "Aug", "Sep",
                                        "Oct", "Nov", "Dec", "Jan", "Feb", "Mar");
                amounts = Arrays.asList(
                    825000L, 612000L, 490000L, 278000L, 935000L, 1150000L,
                    720000L, 480000L, 390000L, 1050000L, 680000L, 540000L
                );
            }
        }

        result.put("period",  period.toLowerCase());
        result.put("labels",  labels);
        result.put("amounts", amounts);
        // Calculated summary values
        long total = amounts.stream().mapToLong(Long::longValue).sum();
        result.put("totalCollected", total);
        result.put("currency", "INR");
        return result;
    }

    private StudentDto toDto(Student student) {
        StudentDto dto = new StudentDto();
        dto.setId(student.getId());
        dto.setName(student.getName());
        dto.setPrn(student.getPrn());
        dto.setEmail(student.getEmail());
        dto.setMobile(student.getMobile());
        dto.setDepartment(student.getDepartment());
        dto.setCourse(student.getCourse());
        dto.setAcademicYear(student.getAcademicYear());
        dto.setStatus(student.getStatus());
        dto.setCreatedAt(student.getCreatedAt() != null ? student.getCreatedAt().toString() : null);

        // Fetch user enabled status if needed
        if (student.getUserId() != null) {
            userDao.findById(student.getUserId()).ifPresent(u -> dto.setEnabled(u.getEnabled()));
        } else if (student.getUser() != null) {
            dto.setEnabled(student.getUser().getEnabled());
        }
        return dto;
    }
}
