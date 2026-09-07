package com.feepayment.controller;

import com.feepayment.config.RazorpayConfig;
import com.feepayment.model.*;
import com.feepayment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final RazorpayConfig razorpayConfig;

    /**
     * Get public gateway configuration (Key ID, currency, company name)
     */
    @GetMapping("/config")
    public ResponseEntity<ApiResponse> getPaymentConfig() {
        Map<String, String> config = Map.of(
            "keyId", razorpayConfig.getKeyId(),
            "currency", razorpayConfig.getCurrency(),
            "companyName", razorpayConfig.getCompanyName()
        );
        return ResponseEntity.ok(ApiResponse.ok("Payment gateway configuration retrieved.", config));
    }

    /**
     * Step 1: Initiate Razorpay Order
     */
    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse> createOrder(
            @Valid @RequestBody PaymentOrderRequest request,
            Authentication auth
    ) {
        try {
            String userEmail = auth != null ? auth.getName() : null;
            PaymentOrderResponse response = paymentService.createOrder(request, userEmail);
            return ResponseEntity.ok(ApiResponse.ok("Payment order created successfully.", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to create payment order: " + e.getMessage()));
        }
    }

    /**
     * Step 2: Cryptographically verify payment signature & record transaction
     */
    @PostMapping("/verify-payment")
    public ResponseEntity<ApiResponse> verifyPayment(
            @Valid @RequestBody PaymentVerificationRequest request,
            Authentication auth
    ) {
        try {
            String userEmail = auth != null ? auth.getName() : null;
            PaymentVerificationResponse response = paymentService.verifyAndProcessPayment(request, userEmail);
            return ResponseEntity.ok(ApiResponse.ok("Payment verified successfully.", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Payment verification error: " + e.getMessage()));
        }
    }

    /**
     * Step 2 (Alternative / Fallback): Direct simulated payment for seamless demo/testing
     */
    @PostMapping("/simulate-payment")
    public ResponseEntity<ApiResponse> simulatePayment(
            @Valid @RequestBody PaymentOrderRequest request,
            Authentication auth
    ) {
        try {
            String userEmail = auth != null ? auth.getName() : null;
            PaymentVerificationResponse response = paymentService.simulatePayment(request, userEmail);
            return ResponseEntity.ok(ApiResponse.ok("Payment simulated and verified successfully.", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Payment simulation error: " + e.getMessage()));
        }
    }

    /**
     * Fetch printable receipt details by transaction ID
     */
    @GetMapping("/receipts/transaction/{transactionId}")
    public ResponseEntity<ApiResponse> getReceiptByTransactionId(@PathVariable Long transactionId) {
        try {
            ReceiptDetails details = paymentService.getReceiptDetails(transactionId);
            return ResponseEntity.ok(ApiResponse.ok("Receipt retrieved.", details));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to fetch receipt: " + e.getMessage()));
        }
    }

    /**
     * Fetch printable receipt details by receipt number (e.g. REC-20260906-0001)
     */
    @GetMapping("/receipts/{receiptNumber}")
    public ResponseEntity<ApiResponse> getReceiptByNumber(@PathVariable String receiptNumber) {
        try {
            ReceiptDetails details = paymentService.getReceiptDetailsByNumber(receiptNumber);
            return ResponseEntity.ok(ApiResponse.ok("Receipt retrieved.", details));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error("Failed to fetch receipt: " + e.getMessage()));
        }
    }
}
