package com.feepayment.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ReceiptDetails {
    private Long receiptId;
    private String receiptNumber;
    private LocalDateTime generatedDate;
    private Long transactionId;
    private String transactionReference;
    private String orderId;
    private String gatewayName;
    private String transactionStatus;
    private BigDecimal amount;
    private String currency;
    private String verifiedBy;

    // Student Info
    private Long studentId;
    private String studentName;
    private String studentPrn;
    private String studentEmail;
    private String studentMobile;
    private String department;
    private String course;
    private String academicYear;

    // Institution Info
    private String collegeName = "Marathwada Mitra Mandal's College of Engineering (MMCOE)";
    private String collegeAddress = "Karvenagar, Pune - 411052, Maharashtra, India";

    public ReceiptDetails() {}

    public Long getReceiptId() { return receiptId; }
    public void setReceiptId(Long receiptId) { this.receiptId = receiptId; }

    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

    public LocalDateTime getGeneratedDate() { return generatedDate; }
    public void setGeneratedDate(LocalDateTime generatedDate) { this.generatedDate = generatedDate; }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public String getTransactionReference() { return transactionReference; }
    public void setTransactionReference(String transactionReference) { this.transactionReference = transactionReference; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getGatewayName() { return gatewayName; }
    public void setGatewayName(String gatewayName) { this.gatewayName = gatewayName; }

    public String getTransactionStatus() { return transactionStatus; }
    public void setTransactionStatus(String transactionStatus) { this.transactionStatus = transactionStatus; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStudentPrn() { return studentPrn; }
    public void setStudentPrn(String studentPrn) { this.studentPrn = studentPrn; }

    public String getStudentEmail() { return studentEmail; }
    public void setStudentEmail(String studentEmail) { this.studentEmail = studentEmail; }

    public String getStudentMobile() { return studentMobile; }
    public void setStudentMobile(String studentMobile) { this.studentMobile = studentMobile; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getCourse() { return course; }
    public void setCourse(String course) { this.course = course; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getCollegeName() { return collegeName; }
    public void setCollegeName(String collegeName) { this.collegeName = collegeName; }

    public String getCollegeAddress() { return collegeAddress; }
    public void setCollegeAddress(String collegeAddress) { this.collegeAddress = collegeAddress; }
}
