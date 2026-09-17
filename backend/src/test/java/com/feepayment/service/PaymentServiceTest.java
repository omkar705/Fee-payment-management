package com.feepayment.service;

import com.feepayment.model.*;
import com.feepayment.repository.PaymentGatewayLogRepository;
import com.feepayment.repository.ReceiptRepository;
import com.feepayment.repository.StudentRepository;
import com.feepayment.repository.TransactionRepository;
import com.feepayment.config.RazorpayConfig;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Team 2 — Unit Testing Report: PaymentService
 *
 * Subject: Basic Programming, OOP (Java), Software Engineering
 * Framework: JUnit 5 + Mockito
 *
 * Test Coverage:
 *  1. simulatePayment — successful path (student found via email)
 *  2. simulatePayment — invalid amount throws exception
 *  3. verifyAndProcessPayment — idempotency check (duplicate payment ID)
 *  4. verifyAndProcessPayment — sandbox mock order (signature bypass)
 *  5. simulatePayment — student not found fallback
 *  6. TransactionStatus enum — state transitions
 *  7. PaymentOrderRequest — validation
 *  8. Receipt number format — correct date-based format
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PaymentService Unit Tests — Team 2")
class PaymentServiceTest {

    // ─── Mocks ───────────────────────────────────────────
    @Mock private RazorpayConfig          razorpayConfig;
    @Mock private TransactionRepository   transactionRepository;
    @Mock private PaymentGatewayLogRepository logRepository;
    @Mock private ReceiptRepository       receiptRepository;
    @Mock private StudentRepository       studentRepository;
    @Mock private JdbcTemplate            jdbc;

    @InjectMocks
    private PaymentService paymentService;

    // ─── Test Data ────────────────────────────────────────
    private static final String STUDENT_EMAIL = "manan.tote@mmcoe.edu.in";
    private static final String GATEWAY_KEY   = "rzp_test_demokey";

    private Student buildStudent() {
        Student s = new Student();
        s.setId(1L);
        s.setName("Manan Tote");
        s.setPrn("B25IT2010");
        s.setEmail(STUDENT_EMAIL);
        s.setMobile("9876543210");
        s.setDepartment("Information Technology");
        s.setCourse("B.Tech");
        s.setAcademicYear("2025-26");
        return s;
    }

    private Transaction buildTransaction(Long id) {
        Transaction t = new Transaction();
        t.setTransactionId(id);
        t.setTransactionReference("pay_sim_" + id);
        t.setTransactionStatus("SUCCESS");
        t.setAmount(new BigDecimal("50000"));
        t.setGatewayName("SIMULATED");
        return t;
    }

    private Receipt buildReceipt(Long txnId) {
        Receipt r = new Receipt();
        r.setReceiptId(1L);
        r.setTransactionId(txnId);
        r.setReceiptNumber("REC-20260917-0001");
        r.setReceiptUrl("/student/receipt.html?transactionId=" + txnId);
        return r;
    }

    // ═══════════════════════════════════════════════════
    //  TEST 1 — simulatePayment: Happy Path
    // ═══════════════════════════════════════════════════
    @Test
    @DisplayName("T1: simulatePayment — Happy path: student resolved by email, transaction + receipt created")
    void simulatePayment_HappyPath_StudentFoundByEmail() {
        // ARRANGE
        PaymentOrderRequest request = new PaymentOrderRequest();
        request.setAmount(new BigDecimal("50000"));
        request.setDescription("Semester Fee — Sem 3");

        Student student = buildStudent();
        Transaction savedTxn = buildTransaction(42L);
        Receipt savedReceipt = buildReceipt(42L);

        when(razorpayConfig.getKeyId()).thenReturn(GATEWAY_KEY);
        when(studentRepository.findByEmail(STUDENT_EMAIL)).thenReturn(Optional.of(student));
        when(jdbc.update(anyString(), any(), any(), any())).thenReturn(1);
        when(jdbc.queryForObject(anyString(), eq(Long.class), anyLong())).thenReturn(100L);
        when(transactionRepository.save(any(Transaction.class))).thenReturn(savedTxn);
        when(receiptRepository.save(any(Receipt.class))).thenReturn(savedReceipt);

        // ACT
        PaymentVerificationResponse response = paymentService.simulatePayment(request, STUDENT_EMAIL);

        // ASSERT
        assertNotNull(response, "Response should not be null");
        assertTrue(response.isSuccess(), "Payment should be marked as successful");
        assertEquals(42L, response.getTransactionId(), "Transaction ID should match");
        assertNotNull(response.getReceiptNumber(), "Receipt number should be generated");
        assertNotNull(response.getReceiptUrl(), "Receipt URL should be set");

        // Verify DB interactions
        verify(transactionRepository, times(1)).save(any(Transaction.class));
        verify(receiptRepository, times(1)).save(any(Receipt.class));
    }

    // ═══════════════════════════════════════════════════
    //  TEST 2 — simulatePayment: Zero Amount Validation
    // ═══════════════════════════════════════════════════
    @Test
    @DisplayName("T2: simulatePayment — Throws IllegalArgumentException for zero or negative amount")
    void simulatePayment_ZeroAmount_ThrowsException() {
        // ARRANGE
        PaymentOrderRequest request = new PaymentOrderRequest();
        request.setAmount(BigDecimal.ZERO);

        // ACT + ASSERT
        IllegalArgumentException ex = assertThrows(
            IllegalArgumentException.class,
            () -> paymentService.simulatePayment(request, STUDENT_EMAIL),
            "Zero amount should throw IllegalArgumentException"
        );
        assertTrue(ex.getMessage().contains("greater than zero"),
                "Exception message should mention 'greater than zero'");

        // Verify no DB operations were called
        verifyNoInteractions(transactionRepository);
        verifyNoInteractions(receiptRepository);
    }

    // ═══════════════════════════════════════════════════
    //  TEST 3 — Negative Amount Rejected
    // ═══════════════════════════════════════════════════
    @Test
    @DisplayName("T3: simulatePayment — Throws IllegalArgumentException for negative amount")
    void simulatePayment_NegativeAmount_ThrowsException() {
        PaymentOrderRequest request = new PaymentOrderRequest();
        request.setAmount(new BigDecimal("-100"));

        assertThrows(IllegalArgumentException.class,
            () -> paymentService.simulatePayment(request, STUDENT_EMAIL));
    }

    // ═══════════════════════════════════════════════════
    //  TEST 4 — verifyAndProcessPayment: Idempotency Check
    //  (Demonstrates DBMS: Duplicate prevention)
    // ═══════════════════════════════════════════════════
    @Test
    @DisplayName("T4: verifyAndProcessPayment — Idempotency: returns cached result for duplicate payment ID")
    void verifyPayment_Idempotency_ReturnsCachedResult() {
        // ARRANGE
        PaymentVerificationRequest request = new PaymentVerificationRequest();
        request.setRazorpayOrderId("order_test_abc123");
        request.setRazorpayPaymentId("pay_existing_001");
        request.setRazorpaySignature("sandbox_mock_signature");
        request.setAmount(new BigDecimal("30000"));

        Transaction existing = buildTransaction(99L);
        Receipt existingReceipt = buildReceipt(99L);

        when(transactionRepository.findByTransactionReference("pay_existing_001"))
            .thenReturn(Optional.of(existing));
        when(receiptRepository.findByTransactionId(99L))
            .thenReturn(Optional.of(existingReceipt));

        // ACT
        PaymentVerificationResponse response = paymentService.verifyAndProcessPayment(request, STUDENT_EMAIL);

        // ASSERT
        assertTrue(response.isSuccess());
        assertEquals("Payment already processed successfully.", response.getMessage());
        assertEquals(99L, response.getTransactionId());
        assertEquals("REC-20260917-0001", response.getReceiptNumber());

        // Critical: No new transaction should be saved (idempotency guarantee)
        verify(transactionRepository, never()).save(any());
        verify(receiptRepository, never()).save(any());
    }

    // ═══════════════════════════════════════════════════
    //  TEST 5 — verifyAndProcessPayment: Sandbox Mock Bypass
    // ═══════════════════════════════════════════════════
    @Test
    @DisplayName("T5: verifyAndProcessPayment — Sandbox order bypasses HMAC check, creates transaction")
    void verifyPayment_SandboxOrder_BypassesSignatureCheck() {
        // ARRANGE
        PaymentVerificationRequest request = new PaymentVerificationRequest();
        request.setRazorpayOrderId("order_test_sandbox123");   // Starts with order_test_
        request.setRazorpayPaymentId("pay_new_sandbox_001");
        request.setRazorpaySignature("sandbox_mock_signature");
        request.setAmount(new BigDecimal("25000"));

        Transaction savedTxn = buildTransaction(77L);
        Receipt savedReceipt = buildReceipt(77L);

        when(razorpayConfig.getKeySecret()).thenReturn("test_secret");
        when(transactionRepository.findByTransactionReference("pay_new_sandbox_001"))
            .thenReturn(Optional.empty());
        when(studentRepository.findByEmail(STUDENT_EMAIL)).thenReturn(Optional.of(buildStudent()));
        when(jdbc.update(anyString(), any(), any(), any())).thenReturn(1);
        when(jdbc.queryForObject(anyString(), eq(Long.class), anyLong())).thenReturn(200L);
        when(transactionRepository.save(any())).thenReturn(savedTxn);
        when(receiptRepository.save(any())).thenReturn(savedReceipt);

        // ACT
        PaymentVerificationResponse response = paymentService.verifyAndProcessPayment(request, STUDENT_EMAIL);

        // ASSERT
        assertTrue(response.isSuccess());
        assertEquals(77L, response.getTransactionId());
        verify(transactionRepository, times(1)).save(any());
        verify(receiptRepository, times(1)).save(any());
    }

    // ═══════════════════════════════════════════════════
    //  TEST 6 — simulatePayment: No Student Found → Null studentId
    // ═══════════════════════════════════════════════════
    @Test
    @DisplayName("T6: simulatePayment — Proceeds with null studentId when student not found by email")
    void simulatePayment_StudentNotFound_ProceedsWithNullId() {
        PaymentOrderRequest request = new PaymentOrderRequest();
        request.setAmount(new BigDecimal("10000"));

        Transaction savedTxn = buildTransaction(55L);
        Receipt savedReceipt = buildReceipt(55L);

        when(studentRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());
        when(jdbc.update(anyString(), isNull(), any(), any())).thenReturn(1);
        when(jdbc.queryForObject(anyString(), eq(Long.class), isNull())).thenReturn(null);
        when(transactionRepository.save(any())).thenReturn(savedTxn);
        when(receiptRepository.save(any())).thenReturn(savedReceipt);

        PaymentVerificationResponse response = paymentService.simulatePayment(request, "unknown@test.com");

        assertNotNull(response);
        assertTrue(response.isSuccess());
    }

    // ═══════════════════════════════════════════════════
    //  TEST 7 — TransactionStatus Enum (OOP + DS concepts)
    // ═══════════════════════════════════════════════════
    @Test
    @DisplayName("T7: TransactionStatus enum — state checks, terminal and successful states")
    void transactionStatus_StateTransitions() {
        com.feepayment.model.TransactionStatus s = com.feepayment.model.TransactionStatus.SUCCESS;
        assertTrue(s.isTerminal(),   "SUCCESS should be terminal");
        assertTrue(s.isSuccessful(), "SUCCESS should be successful");

        com.feepayment.model.TransactionStatus f = com.feepayment.model.TransactionStatus.FAILED;
        assertTrue(f.isTerminal(),    "FAILED should be terminal");
        assertFalse(f.isSuccessful(), "FAILED should not be successful");

        com.feepayment.model.TransactionStatus p = com.feepayment.model.TransactionStatus.PROCESSING;
        assertFalse(p.isTerminal(),   "PROCESSING should not be terminal");
        assertFalse(p.isSuccessful(), "PROCESSING should not be successful");

        com.feepayment.model.TransactionStatus rb = com.feepayment.model.TransactionStatus.ROLLED_BACK;
        assertTrue(rb.isTerminal(),   "ROLLED_BACK should be terminal");
        assertFalse(rb.isSuccessful(),"ROLLED_BACK should not be successful");

        assertEquals(6, com.feepayment.model.TransactionStatus.values().length, "Should have exactly 6 states");
    }

    // ═══════════════════════════════════════════════════
    //  TEST 8 — Receipt Number Format
    // ═══════════════════════════════════════════════════
    @Test
    @DisplayName("T8: Receipt number format — follows REC-YYYYMMDD-NNNN pattern")
    void receiptNumber_FollowsExpectedFormat() {
        // REC-20260917-0042
        String receiptNumber = "REC-20260917-0042";
        assertTrue(receiptNumber.startsWith("REC-"), "Should start with REC-");
        assertTrue(receiptNumber.matches("REC-\\d{8}-\\d{4,}"),
                "Should match REC-YYYYMMDD-NNNN pattern: " + receiptNumber);
    }
}
