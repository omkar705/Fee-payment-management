package com.feepayment.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    private Long auditId;
    private String username;
    private String action;
    private String entityName;
    private String entityId;
    private String details;
    private String ipAddress;
    private LocalDateTime createdAt;
}
