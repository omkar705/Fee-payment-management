package com.feepayment.controller;

import com.feepayment.model.ApiResponse;
import com.feepayment.model.ReportResponse;
import com.feepayment.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ReportController — REST endpoints exposing Fee Payment Reports & Analytics data.
 */
@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse> getSummaryKpi() {
        ReportResponse.SummaryKpi kpi = reportService.getSummaryKpi();
        return ResponseEntity.ok(ApiResponse.ok("Report KPI summary retrieved.", kpi));
    }

    @GetMapping("/collection")
    public ResponseEntity<ApiResponse> getFeeCollectionReport() {
        List<ReportResponse.FeeCollectionRow> list = reportService.getFeeCollectionReport();
        return ResponseEntity.ok(ApiResponse.ok("Fee collection report retrieved.", list));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse> getPendingFeeReport() {
        List<ReportResponse.PendingFeeRow> list = reportService.getPendingFeeReport();
        return ResponseEntity.ok(ApiResponse.ok("Pending fee report retrieved.", list));
    }
}
