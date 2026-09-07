package com.feepayment.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RazorpayConfig {

    private static final Logger log = LoggerFactory.getLogger(RazorpayConfig.class);

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    @Value("${razorpay.currency:INR}")
    private String currency;

    @Value("${razorpay.company-name:MMCOE College Fee Payment}")
    private String companyName;

    public RazorpayClient getClient() {
        try {
            return new RazorpayClient(keyId, keySecret);
        } catch (RazorpayException e) {
            log.error("Failed to initialize RazorpayClient: {}", e.getMessage());
            throw new IllegalStateException("Failed to initialize RazorpayClient: " + e.getMessage(), e);
        }
    }

    public String getKeyId() {
        return keyId;
    }

    public String getKeySecret() {
        return keySecret;
    }

    public String getCurrency() {
        return currency;
    }

    public String getCompanyName() {
        return companyName;
    }
}
