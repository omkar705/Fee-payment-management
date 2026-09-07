package com.feepayment.service;

import com.feepayment.model.ReportResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * ReportService — Service layer computing reports, summary KPIs, and collection breakdowns.
 * Uses JdbcTemplate queries conforming strictly to the confirmed ER relationships.
 */
@Service
public class ReportService {

    private final JdbcTemplate jdbc;

    public ReportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Compute KPI Metrics (Total Collection, Outstanding, Success Rate, Pending Installments)
     */
    public ReportResponse.SummaryKpi getSummaryKpi() {
        BigDecimal feePaymentsSum = jdbc.queryForObject(
            "SELECT COALESCE(SUM(amount_paid), 0) FROM fee_payments WHERE status = 'SUCCESS'", BigDecimal.class
        );
        BigDecimal transactionsSum = jdbc.queryForObject(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE transaction_status = 'SUCCESS'", BigDecimal.class
        );
        BigDecimal totalCollection = (feePaymentsSum != null && feePaymentsSum.compareTo(BigDecimal.ZERO) > 0)
                ? feePaymentsSum
                : (transactionsSum != null ? transactionsSum : BigDecimal.ZERO);

        BigDecimal totalOutstanding = jdbc.queryForObject(
            "SELECT COALESCE(SUM(outstanding_amount), 0) FROM fee_assignments WHERE outstanding_amount > 0", BigDecimal.class
        );

        Long totalPayments = jdbc.queryForObject("SELECT COUNT(*) FROM fee_payments", Long.class);
        Long successPayments = jdbc.queryForObject("SELECT COUNT(*) FROM fee_payments WHERE status = 'SUCCESS'", Long.class);
        Long totalTxns = jdbc.queryForObject("SELECT COUNT(*) FROM transactions", Long.class);
        Long successTxns = jdbc.queryForObject("SELECT COUNT(*) FROM transactions WHERE transaction_status = 'SUCCESS'", Long.class);

        long effectiveTotal = (totalPayments != null ? totalPayments : 0L) + (totalTxns != null ? totalTxns : 0L);
        long effectiveSuccess = (successPayments != null ? successPayments : 0L) + (successTxns != null ? successTxns : 0L);

        Double successRate = (effectiveTotal > 0)
                ? (double) effectiveSuccess / effectiveTotal * 100.0
                : 100.0;

        Long pendingInst = jdbc.queryForObject("SELECT COUNT(*) FROM fee_installments WHERE status = 'PENDING'", Long.class);

        return new ReportResponse.SummaryKpi(
                totalCollection,
                totalOutstanding != null ? totalOutstanding : BigDecimal.ZERO,
                Math.round(successRate * 10.0) / 10.0,
                pendingInst != null ? pendingInst : 0L
        );
    }

    /**
     * Fee Collection Report Query
     */
    public List<ReportResponse.FeeCollectionRow> getFeeCollectionReport() {
        String sql = """
            SELECT p.payment_id, p.installment_id, s.id AS student_id, s.prn, s.name AS full_name, s.department,
                   s.course AS program, s.academic_year AS year_semester,
                   COALESCE(fs.fee_type, 'Tuition Fee') AS fee_type,
                   COALESCE(fs.academic_year, s.academic_year) AS academic_year,
                   COALESCE(fa.total_amount, p.amount_paid) AS total_amount,
                   p.amount_paid,
                   p.payment_method, p.payment_date, p.status
            FROM fee_payments p
            JOIN students s ON p.student_id = s.id
            LEFT JOIN fee_installments fi ON p.installment_id = fi.installment_id
            LEFT JOIN fee_assignments fa ON fi.assignment_id = fa.assignment_id
            LEFT JOIN fee_structures fs ON fa.fee_structure_id = fs.fee_structure_id
            WHERE p.status = 'SUCCESS'
            ORDER BY p.payment_id DESC
        """;

        try {
            return jdbc.query(sql, (rs, rowNum) -> {
                ReportResponse.FeeCollectionRow row = new ReportResponse.FeeCollectionRow();
                row.setPaymentId(rs.getLong("payment_id"));
                row.setInstallmentId(rs.getLong("installment_id"));
                row.setStudentId(rs.getLong("student_id"));
                row.setPrn(rs.getString("prn"));
                row.setFullName(rs.getString("full_name"));
                row.setDepartment(rs.getString("department"));
                row.setProgram(rs.getString("program"));
                row.setYearSemester(rs.getString("year_semester"));
                row.setFeeType(rs.getString("fee_type"));
                row.setAcademicYear(rs.getString("academic_year"));
                row.setTotalAmount(rs.getBigDecimal("total_amount"));
                row.setAmountPaid(rs.getBigDecimal("amount_paid"));
                row.setPaymentMethod(rs.getString("payment_method"));
                row.setPaymentDate(rs.getString("payment_date"));
                row.setStatus(rs.getString("status"));
                return row;
            });
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /**
     * Pending Fee Report Query
     */
    public List<ReportResponse.PendingFeeRow> getPendingFeeReport() {
        String sql = """
            SELECT fa.assignment_id, s.id AS student_id, s.prn, s.name AS full_name, s.department, s.course AS program,
                   s.academic_year AS year_semester, fs.fee_type, fs.academic_year, fa.total_amount, fa.paid_amount,
                   fa.outstanding_amount, fa.due_date, fa.status
            FROM fee_assignments fa
            JOIN students s ON fa.student_id = s.id
            JOIN fee_structures fs ON fa.fee_structure_id = fs.fee_structure_id
            WHERE fa.outstanding_amount > 0 OR fa.status != 'PAID'
            ORDER BY fa.due_date ASC
        """;

        try {
            return jdbc.query(sql, (rs, rowNum) -> {
                ReportResponse.PendingFeeRow row = new ReportResponse.PendingFeeRow();
                row.setAssignmentId(rs.getLong("assignment_id"));
                row.setStudentId(rs.getLong("student_id"));
                row.setPrn(rs.getString("prn"));
                row.setFullName(rs.getString("full_name"));
                row.setDepartment(rs.getString("department"));
                row.setProgram(rs.getString("program"));
                row.setYearSemester(rs.getString("year_semester"));
                row.setFeeType(rs.getString("fee_type"));
                row.setAcademicYear(rs.getString("academic_year"));
                row.setTotalAmount(rs.getBigDecimal("total_amount"));
                row.setPaidAmount(rs.getBigDecimal("paid_amount"));
                row.setOutstandingAmount(rs.getBigDecimal("outstanding_amount"));
                row.setDueDate(rs.getString("due_date"));
                row.setStatus(rs.getString("status"));
                return row;
            });
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
