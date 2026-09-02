package com.feepayment.reports.dto;

import java.math.BigDecimal;

/**
 * ReportResponse — Plain Java DTO for Reports & Analytics outputs.
 */
public class ReportResponse {

    public static class SummaryKpi {
        private BigDecimal totalFeeCollection;
        private BigDecimal totalOutstandingFee;
        private Double paymentSuccessRate;
        private Long pendingInstallments;

        public SummaryKpi() {}

        public SummaryKpi(BigDecimal totalFeeCollection, BigDecimal totalOutstandingFee, Double paymentSuccessRate, Long pendingInstallments) {
            this.totalFeeCollection = totalFeeCollection;
            this.totalOutstandingFee = totalOutstandingFee;
            this.paymentSuccessRate = paymentSuccessRate;
            this.pendingInstallments = pendingInstallments;
        }

        public BigDecimal getTotalFeeCollection() { return totalFeeCollection; }
        public void setTotalFeeCollection(BigDecimal totalFeeCollection) { this.totalFeeCollection = totalFeeCollection; }

        public BigDecimal getTotalOutstandingFee() { return totalOutstandingFee; }
        public void setTotalOutstandingFee(BigDecimal totalOutstandingFee) { this.totalOutstandingFee = totalOutstandingFee; }

        public Double getPaymentSuccessRate() { return paymentSuccessRate; }
        public void setPaymentSuccessRate(Double paymentSuccessRate) { this.paymentSuccessRate = paymentSuccessRate; }

        public Long getPendingInstallments() { return pendingInstallments; }
        public void setPendingInstallments(Long pendingInstallments) { this.pendingInstallments = pendingInstallments; }
    }

    public static class FeeCollectionRow {
        private Long paymentId;
        private Long installmentId;
        private Long studentId;
        private String prn;
        private String fullName;
        private String department;
        private String program;
        private String yearSemester;
        private String feeType;
        private String academicYear;
        private BigDecimal totalAmount;
        private BigDecimal amountPaid;
        private String paymentMethod;
        private String paymentDate;
        private String status;

        public FeeCollectionRow() {}

        public Long getPaymentId() { return paymentId; }
        public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }

        public Long getInstallmentId() { return installmentId; }
        public void setInstallmentId(Long installmentId) { this.installmentId = installmentId; }

        public Long getStudentId() { return studentId; }
        public void setStudentId(Long studentId) { this.studentId = studentId; }

        public String getPrn() { return prn; }
        public void setPrn(String prn) { this.prn = prn; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }

        public String getProgram() { return program; }
        public void setProgram(String program) { this.program = program; }

        public String getYearSemester() { return yearSemester; }
        public void setYearSemester(String yearSemester) { this.yearSemester = yearSemester; }

        public String getFeeType() { return feeType; }
        public void setFeeType(String feeType) { this.feeType = feeType; }

        public String getAcademicYear() { return academicYear; }
        public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

        public BigDecimal getAmountPaid() { return amountPaid; }
        public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

        public String getPaymentDate() { return paymentDate; }
        public void setPaymentDate(String paymentDate) { this.paymentDate = paymentDate; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public static class PendingFeeRow {
        private Long assignmentId;
        private Long studentId;
        private String prn;
        private String fullName;
        private String department;
        private String program;
        private String yearSemester;
        private String feeType;
        private String academicYear;
        private BigDecimal totalAmount;
        private BigDecimal paidAmount;
        private BigDecimal outstandingAmount;
        private String dueDate;
        private String status;

        public PendingFeeRow() {}

        public Long getAssignmentId() { return assignmentId; }
        public void setAssignmentId(Long assignmentId) { this.assignmentId = assignmentId; }

        public Long getStudentId() { return studentId; }
        public void setStudentId(Long studentId) { this.studentId = studentId; }

        public String getPrn() { return prn; }
        public void setPrn(String prn) { this.prn = prn; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }

        public String getProgram() { return program; }
        public void setProgram(String program) { this.program = program; }

        public String getYearSemester() { return yearSemester; }
        public void setYearSemester(String yearSemester) { this.yearSemester = yearSemester; }

        public String getFeeType() { return feeType; }
        public void setFeeType(String feeType) { this.feeType = feeType; }

        public String getAcademicYear() { return academicYear; }
        public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

        public BigDecimal getPaidAmount() { return paidAmount; }
        public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

        public BigDecimal getOutstandingAmount() { return outstandingAmount; }
        public void setOutstandingAmount(BigDecimal outstandingAmount) { this.outstandingAmount = outstandingAmount; }

        public String getDueDate() { return dueDate; }
        public void setDueDate(String dueDate) { this.dueDate = dueDate; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
