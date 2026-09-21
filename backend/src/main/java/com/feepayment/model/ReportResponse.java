package com.feepayment.model;

import java.math.BigDecimal;

/**
 * ReportResponse — Simple DTO models for Reports & Analytics outputs.
 */
public class ReportResponse {

    public static class SummaryKpi {
        private BigDecimal totalFeeCollection;
        private BigDecimal totalOutstandingFee;
        private Long totalSuccessfulPayments;
        private Long pendingInstallments;

        public SummaryKpi() {}

        public SummaryKpi(BigDecimal totalFeeCollection, BigDecimal totalOutstandingFee, Long totalSuccessfulPayments, Long pendingInstallments) {
            this.totalFeeCollection = totalFeeCollection;
            this.totalOutstandingFee = totalOutstandingFee;
            this.totalSuccessfulPayments = totalSuccessfulPayments;
            this.pendingInstallments = pendingInstallments;
        }

        public BigDecimal getTotalFeeCollection() { return totalFeeCollection; }
        public void setTotalFeeCollection(BigDecimal totalFeeCollection) { this.totalFeeCollection = totalFeeCollection; }

        public BigDecimal getTotalOutstandingFee() { return totalOutstandingFee; }
        public void setTotalOutstandingFee(BigDecimal totalOutstandingFee) { this.totalOutstandingFee = totalOutstandingFee; }

        public Long getTotalSuccessfulPayments() { return totalSuccessfulPayments; }
        public void setTotalSuccessfulPayments(Long totalSuccessfulPayments) { this.totalSuccessfulPayments = totalSuccessfulPayments; }

        public Long getPendingInstallments() { return pendingInstallments; }
        public void setPendingInstallments(Long pendingInstallments) { this.pendingInstallments = pendingInstallments; }
    }

    public static class DepartmentCollectionRow {
        private String department;
        private Long totalStudents;
        private BigDecimal collectedAmount;
        private BigDecimal pendingAmount;

        public DepartmentCollectionRow() {}

        public DepartmentCollectionRow(String department, Long totalStudents, BigDecimal collectedAmount, BigDecimal pendingAmount) {
            this.department = department;
            this.totalStudents = totalStudents;
            this.collectedAmount = collectedAmount;
            this.pendingAmount = pendingAmount;
        }

        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }

        public Long getTotalStudents() { return totalStudents; }
        public void setTotalStudents(Long totalStudents) { this.totalStudents = totalStudents; }

        public BigDecimal getCollectedAmount() { return collectedAmount; }
        public void setCollectedAmount(BigDecimal collectedAmount) { this.collectedAmount = collectedAmount; }

        public BigDecimal getPendingAmount() { return pendingAmount; }
        public void setPendingAmount(BigDecimal pendingAmount) { this.pendingAmount = pendingAmount; }
    }

    public static class PaymentReportRow {
        private Long transactionId;
        private String transactionReference;
        private String prn;
        private String studentName;
        private String department;
        private String academicYear;
        private BigDecimal amount;
        private String paymentDate;
        private String status;
        private String gatewayName;
        private String receiptNumber;

        public PaymentReportRow() {}

        public Long getTransactionId() { return transactionId; }
        public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

        public String getTransactionReference() { return transactionReference; }
        public void setTransactionReference(String transactionReference) { this.transactionReference = transactionReference; }

        public String getPrn() { return prn; }
        public void setPrn(String prn) { this.prn = prn; }

        public String getStudentName() { return studentName; }
        public void setStudentName(String studentName) { this.studentName = studentName; }

        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }

        public String getAcademicYear() { return academicYear; }
        public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public String getPaymentDate() { return paymentDate; }
        public void setPaymentDate(String paymentDate) { this.paymentDate = paymentDate; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getGatewayName() { return gatewayName; }
        public void setGatewayName(String gatewayName) { this.gatewayName = gatewayName; }

        public String getReceiptNumber() { return receiptNumber; }
        public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }
    }
}
