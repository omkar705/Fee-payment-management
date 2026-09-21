package com.feepayment.controller;

import com.feepayment.model.ApiResponse;
import com.feepayment.service.AccountsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ACCOUNTS')")
public class AccountsController {

    private final AccountsService accountsService;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        return ResponseEntity.ok(ApiResponse.ok("Dashboard data retrieved.", accountsService.getDashboard()));
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        return ResponseEntity.ok(ApiResponse.ok("Profile retrieved.", accountsService.getProfile()));
    }

    @GetMapping("/installment-requests")
    public ResponseEntity<?> getInstallmentRequests() {
        return ResponseEntity.ok(ApiResponse.ok("Installment requests retrieved.", accountsService.getInstallmentRequests()));
    }

    @PostMapping("/installment-requests/{id}/review")
    public ResponseEntity<?> reviewInstallmentRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        try {
            String status = body.getOrDefault("status", "APPROVED");
            String reviewer = auth != null ? auth.getName() : "Accounts Officer";
            accountsService.reviewInstallmentRequest(id, status, reviewer);
            return ResponseEntity.ok(ApiResponse.ok("Installment request marked as " + status + "."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions() {
        return ResponseEntity.ok(ApiResponse.ok("Transactions retrieved.", accountsService.getTransactions()));
    }

    @PostMapping("/transactions/{id}/verify")
    public ResponseEntity<?> verifyPayment(@PathVariable Long id, Authentication auth) {
        try {
            String officer = auth != null ? auth.getName() : "Accounts Officer";
            accountsService.verifyPayment(id, officer);
            return ResponseEntity.ok(ApiResponse.ok("Payment verified successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
