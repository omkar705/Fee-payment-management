package com.feepayment.controller;

import com.feepayment.model.ApiResponse;
import com.feepayment.model.StudentData;
import com.feepayment.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        Map<String, Object> stats = adminService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.ok("Dashboard data retrieved.", stats));
    }

    /**
     * Fee Collection Analytics endpoint.
     * period: "year" | "month" | "week" (defaults to "year")
     * Returns chart-ready data: labels[] + amounts[]
     */
    @GetMapping("/analytics")
    public ResponseEntity<?> getFeeAnalytics(
            @RequestParam(defaultValue = "year") String period
    ) {
        Map<String, Object> analyticsData = adminService.getFeeAnalytics(period);
        return ResponseEntity.ok(ApiResponse.ok("Analytics data retrieved.", analyticsData));
    }

    @GetMapping("/students")
    public ResponseEntity<?> getStudents(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(
            ApiResponse.ok("Students retrieved.", adminService.getAllStudents(department, academicYear, status))
        );
    }

    @PostMapping("/students")
    public ResponseEntity<?> createStudent(@Valid @RequestBody StudentData data) {
        try {
            StudentData created = adminService.createStudent(data);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.ok("Student account created successfully.", created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/students/{id}")
    public ResponseEntity<?> getStudent(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ApiResponse.ok("Student retrieved.", adminService.getStudentById(id)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/students/{id}")
    public ResponseEntity<?> updateStudent(@PathVariable Long id, @Valid @RequestBody StudentData data) {
        try {
            return ResponseEntity.ok(ApiResponse.ok("Student updated successfully.", adminService.updateStudent(id, data)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PatchMapping("/students/{id}/status")
    public ResponseEntity<?> updateStudentStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        try {
            String status = body.get("status");
            if (status == null) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Status is required."));
            }
            return ResponseEntity.ok(ApiResponse.ok("Student status updated.", adminService.updateStudentStatus(id, status)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ============================================================
    // Fee Structure Endpoints
    // ============================================================
    @GetMapping("/fee-structures")
    public ResponseEntity<?> getAllFeeStructures() {
        return ResponseEntity.ok(ApiResponse.ok("Fee structures retrieved.", adminService.getAllFeeStructures()));
    }

    @GetMapping("/fee-structures/{id}")
    public ResponseEntity<?> getFeeStructure(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ApiResponse.ok("Fee structure retrieved.", adminService.getFeeStructureById(id)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/fee-structures")
    public ResponseEntity<?> createFeeStructure(@RequestBody com.feepayment.model.FeeStructure feeStructure) {
        feeStructure.setId(null);
        com.feepayment.model.FeeStructure saved = adminService.saveFeeStructure(feeStructure);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Fee structure created.", saved));
    }

    @PutMapping("/fee-structures/{id}")
    public ResponseEntity<?> updateFeeStructure(@PathVariable Long id, @RequestBody com.feepayment.model.FeeStructure feeStructure) {
        feeStructure.setId(id);
        com.feepayment.model.FeeStructure saved = adminService.saveFeeStructure(feeStructure);
        return ResponseEntity.ok(ApiResponse.ok("Fee structure updated.", saved));
    }
}

