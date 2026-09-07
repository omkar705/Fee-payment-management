package com.feepayment.controller;

import com.feepayment.model.ApiResponse;
import com.feepayment.service.AccountsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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
}
