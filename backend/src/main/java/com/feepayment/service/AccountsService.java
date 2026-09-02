package com.feepayment.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AccountsService {

    public Map<String, Object> getDashboard() {
        // Milestone 1: Dummy data
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalFeeCollection", 8250000);
        dashboard.put("pendingFees", 1425000);
        dashboard.put("successfulPayments", 1126);
        dashboard.put("pendingTransactions", 42);

        // Recent payment activity (dummy)
        dashboard.put("recentActivity", getRecentActivity());

        return dashboard;
    }

    public Map<String, Object> getProfile() {
        // Placeholder profile for accounts officer
        Map<String, Object> profile = new HashMap<>();
        profile.put("name", "Accounts Officer");
        profile.put("email", "accounts@mmcoe.com");
        profile.put("role", "ACCOUNTS");
        profile.put("department", "Finance Department");
        return profile;
    }

    private List<Map<String, Object>> getRecentActivity() {
        return List.of(
            createActivity("B25IT2001", "Aarav Sharma",  15000, "2025-08-10", "SUCCESS"),
            createActivity("B25IT2002", "Priya Desai",   20000, "2025-08-09", "SUCCESS"),
            createActivity("B25IT2003", "Rohan Kulkarni",10000, "2025-08-08", "PENDING"),
            createActivity("B25IT2004", "Sneha Patil",   25000, "2025-08-07", "SUCCESS"),
            createActivity("B25IT2005", "Vikram Joshi",  18000, "2025-08-06", "FAILED"),
            createActivity("B25IT2007", "Karan Verma",   12000, "2025-08-05", "SUCCESS"),
            createActivity("B25IT2008", "Divya Nair",    22000, "2025-08-04", "PENDING"),
            createActivity("B25IT2009", "Arjun Rao",     15000, "2025-08-03", "SUCCESS")
        );
    }

    private Map<String, Object> createActivity(String prn, String name, int amount,
                                                String date, String status) {
        Map<String, Object> entry = new HashMap<>();
        entry.put("prn", prn);
        entry.put("student", name);
        entry.put("amount", amount);
        entry.put("paymentDate", date);
        entry.put("status", status);
        return entry;
    }
}
