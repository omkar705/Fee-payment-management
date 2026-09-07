package com.feepayment.model;

import java.math.BigDecimal;

public class PaymentOrderResponse {
    private boolean success;
    private String orderId;
    private Long amountInPaise;
    private BigDecimal amount;
    private String currency;
    private String keyId;
    private String receiptNumber;
    private String studentName;
    private String studentEmail;
    private String studentContact;
    private String companyName;
    private String description;

    public PaymentOrderResponse() {}

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public Long getAmountInPaise() { return amountInPaise; }
    public void setAmountInPaise(Long amountInPaise) { this.amountInPaise = amountInPaise; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }

    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStudentEmail() { return studentEmail; }
    public void setStudentEmail(String studentEmail) { this.studentEmail = studentEmail; }

    public String getStudentContact() { return studentContact; }
    public void setStudentContact(String studentContact) { this.studentContact = studentContact; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
