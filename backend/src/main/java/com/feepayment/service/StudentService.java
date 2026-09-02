package com.feepayment.service;

import com.feepayment.dao.StudentDao;
import com.feepayment.dao.UserDao;
import com.feepayment.dto.StudentDto;
import com.feepayment.entity.Student;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentDao studentDao;
    private final UserDao userDao;

    public StudentDto getProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Student student = studentDao.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found."));
        return toDto(student);
    }

    public Map<String, Object> getDashboard() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Student student = studentDao.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student profile not found."));

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("student", toDto(student));
        // Demo fee data — two-installment system
        dashboard.put("totalFee",      120000);
        dashboard.put("tuitionFee",    95000);
        dashboard.put("developmentFee", 15000);
        dashboard.put("examFee",        7000);
        dashboard.put("libraryFee",     3000);
        dashboard.put("installment1",   60000);
        dashboard.put("installment2",   60000);
        dashboard.put("paidAmount",     60000);
        dashboard.put("pendingAmount",  60000);
        dashboard.put("paymentStatus", "INSTALLMENT_1_PAID");
        return dashboard;
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

        // Fetch user enabled status
        if (student.getUserId() != null) {
            userDao.findById(student.getUserId()).ifPresent(u -> dto.setEnabled(u.getEnabled()));
        }
        return dto;
    }
}
