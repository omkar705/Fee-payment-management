package com.feepayment.controller;

import com.feepayment.model.ApiResponse;
import com.feepayment.model.ReportResponse;
import com.feepayment.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ReportController — Simple REST endpoints exposing live Fee Payment Reports & Analytics.
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse> getSummaryKpi() {
        ReportResponse.SummaryKpi kpi = reportService.getSummaryKpi();
        return ResponseEntity.ok(ApiResponse.ok("Report KPI summary retrieved.", kpi));
    }

    @GetMapping("/department-wise")
    public ResponseEntity<ApiResponse> getDepartmentWiseCollection() {
        List<ReportResponse.DepartmentCollectionRow> list = reportService.getDepartmentWiseCollection();
        return ResponseEntity.ok(ApiResponse.ok("Department-wise collection report retrieved.", list));
    }

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse> getPaymentReport(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status) {
        List<ReportResponse.PaymentReportRow> list = reportService.getPaymentReport(department, status);
        return ResponseEntity.ok(ApiResponse.ok("Payment report retrieved.", list));
    }

    /**
     * Backward-compatible alias for payments report
     */
    @GetMapping("/collection")
    public ResponseEntity<ApiResponse> getFeeCollectionReport(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status) {
        return getPaymentReport(department, status);
    }
}
