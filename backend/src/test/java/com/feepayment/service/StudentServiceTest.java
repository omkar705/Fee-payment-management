package com.feepayment.service;

import com.feepayment.model.InstallmentRequest;
import com.feepayment.model.Student;
import com.feepayment.repository.FeeStructureRepository;
import com.feepayment.repository.InstallmentRequestRepository;
import com.feepayment.repository.StudentRepository;
import com.feepayment.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("StudentService Unit Tests — Installment Plan & Fee Handling")
class StudentServiceTest {

    @Mock private StudentRepository studentRepository;
    @Mock private UserRepository userRepository;
    @Mock private JdbcTemplate jdbc;
    @Mock private InstallmentRequestRepository installmentRequestRepository;
    @Mock private FeeStructureRepository feeStructureRepository;

    @InjectMocks
    private StudentService studentService;

    private static final String STUDENT_EMAIL = "b25it2010@mmcoe.com";
    private Student testStudent;

    @BeforeEach
    void setUp() {
        testStudent = new Student();
        testStudent.setId(10L);
        testStudent.setName("Manan Vivekanand Tote");
        testStudent.setPrn("B25IT2010");
        testStudent.setEmail(STUDENT_EMAIL);
        testStudent.setDepartment("Information Technology");
        testStudent.setCourse("B.Tech");
        testStudent.setAcademicYear("2025-26");

        when(studentRepository.findByEmail(STUDENT_EMAIL)).thenReturn(Optional.of(testStudent));

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(STUDENT_EMAIL, "password")
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Edge Case A: New Student with no installment request returns hasRequest=false and NOT_APPLIED")
    void testGetInstallmentPlan_NoRequest() {
        when(installmentRequestRepository.findLatestByStudentId(10L)).thenReturn(Optional.empty());

        Map<String, Object> plan = studentService.getInstallmentPlan();

        assertNotNull(plan);
        assertEquals(false, plan.get("hasRequest"));
        assertEquals("NOT_APPLIED", plan.get("status"));
        assertEquals(60000, plan.get("installmentAmount"));
        assertNotNull(plan.get("schedule"));
        List<?> schedule = (List<?>) plan.get("schedule");
        assertEquals(2, schedule.size());
    }

    @Test
    @DisplayName("Edge Case B: Student with PENDING installment request returns hasRequest=true and PENDING status")
    void testGetInstallmentPlan_PendingRequest() {
        InstallmentRequest ir = new InstallmentRequest();
        ir.setId(1L);
        ir.setStudentId(10L);
        ir.setStatus("PENDING");
        ir.setReason("Parent education loan processing");
        ir.setAppliedDate(LocalDateTime.now());

        when(installmentRequestRepository.findLatestByStudentId(10L)).thenReturn(Optional.of(ir));

        Map<String, Object> plan = studentService.getInstallmentPlan();

        assertNotNull(plan);
        assertEquals(true, plan.get("hasRequest"));
        assertEquals("PENDING", plan.get("status"));
        assertEquals("Parent education loan processing", plan.get("reason"));
        assertEquals(60000, plan.get("installmentAmount"));
    }

    @Test
    @DisplayName("Edge Case C: Student with APPROVED installment request returns hasRequest=true and APPROVED status")
    void testGetInstallmentPlan_ApprovedRequest() {
        InstallmentRequest ir = new InstallmentRequest();
        ir.setId(2L);
        ir.setStudentId(10L);
        ir.setStatus("APPROVED");
        ir.setReason("Semester-wise fee payment preference");
        ir.setReviewedBy("accounts@mmcoe.com");
        ir.setAppliedDate(LocalDateTime.now());

        when(installmentRequestRepository.findLatestByStudentId(10L)).thenReturn(Optional.of(ir));

        Map<String, Object> plan = studentService.getInstallmentPlan();

        assertNotNull(plan);
        assertEquals(true, plan.get("hasRequest"));
        assertEquals("APPROVED", plan.get("status"));
        assertEquals("accounts@mmcoe.com", plan.get("reviewedBy"));
    }

    @Test
    @DisplayName("Edge Case D: Student with REJECTED installment request returns hasRequest=true and REJECTED status")
    void testGetInstallmentPlan_RejectedRequest() {
        InstallmentRequest ir = new InstallmentRequest();
        ir.setId(3L);
        ir.setStudentId(10L);
        ir.setStatus("REJECTED");
        ir.setReason("Insufficient documentation");
        ir.setReviewedBy("accounts@mmcoe.com");
        ir.setAppliedDate(LocalDateTime.now());

        when(installmentRequestRepository.findLatestByStudentId(10L)).thenReturn(Optional.of(ir));

        Map<String, Object> plan = studentService.getInstallmentPlan();

        assertNotNull(plan);
        assertEquals(true, plan.get("hasRequest"));
        assertEquals("REJECTED", plan.get("status"));
    }

    @Test
    @DisplayName("Apply installment saves request with student academic year and reason")
    void testApplyForInstallment() {
        studentService.applyForInstallment("Financial difficulty");

        verify(installmentRequestRepository, times(1)).create(eq(10L), eq("2025-26"), eq("Financial difficulty"));
    }
}
