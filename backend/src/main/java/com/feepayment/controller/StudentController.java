package com.feepayment.controller;

import com.feepayment.model.ApiResponse;
import com.feepayment.service.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class StudentController {

    private final StudentService studentService;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        try {
            return ResponseEntity.ok(ApiResponse.ok("Profile retrieved.", studentService.getProfile()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        try {
            return ResponseEntity.ok(ApiResponse.ok("Dashboard data retrieved.", studentService.getDashboard()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Lightweight fee-status endpoint — called after payment to refresh the UI
     * without reloading the full dashboard.
     */
    @GetMapping("/fee-status")
    public ResponseEntity<?> getFeeStatus() {
        try {
            return ResponseEntity.ok(ApiResponse.ok("Fee status retrieved.", studentService.getFeeStatus()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
