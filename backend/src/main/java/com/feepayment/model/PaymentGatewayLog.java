package com.feepayment.model;

import java.time.LocalDateTime;

public class PaymentGatewayLog {
    private Long gatewayLogId;
    private Long transactionId;
    private String gatewayName = "RAZORPAY";
    private String requestData;
    private String responseData;
    private String status;
    private LocalDateTime logTime;

    public PaymentGatewayLog() {}

    public Long getGatewayLogId() { return gatewayLogId; }
    public void setGatewayLogId(Long gatewayLogId) { this.gatewayLogId = gatewayLogId; }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public String getGatewayName() { return gatewayName; }
    public void setGatewayName(String gatewayName) { this.gatewayName = gatewayName; }

    public String getRequestData() { return requestData; }
    public void setRequestData(String requestData) { this.requestData = requestData; }

    public String getResponseData() { return responseData; }
    public void setResponseData(String responseData) { this.responseData = responseData; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getLogTime() { return logTime; }
    public void setLogTime(LocalDateTime logTime) { this.logTime = logTime; }
}
