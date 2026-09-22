package com.feepayment.service;

import com.feepayment.model.AuditLog;
import com.feepayment.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository auditLogRepository;

    public void logAction(String username, String action, String entityName, String entityId, String details) {
        try {
            String ipAddress = extractClientIp();
            AuditLog auditLog = new AuditLog();
            auditLog.setUsername(username != null ? username : "SYSTEM");
            auditLog.setAction(action);
            auditLog.setEntityName(entityName);
            auditLog.setEntityId(entityId);
            auditLog.setDetails(details);
            auditLog.setIpAddress(ipAddress);
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.warn("Could not write audit log entry for action {}: {}", action, e.getMessage());
        }
    }

    public List<AuditLog> getRecentLogs(int limit) {
        int cappedLimit = Math.min(Math.max(limit, 1), 200);
        return auditLogRepository.findAll(cappedLimit);
    }

    private String extractClientIp() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                if (request != null) {
                    String xfHeader = request.getHeader("X-Forwarded-For");
                    if (xfHeader != null && !xfHeader.isBlank()) {
                        return xfHeader.split(",")[0].trim();
                    }
                    String remoteAddr = request.getRemoteAddr();
                    if ("0:0:0:0:0:0:0:1".equals(remoteAddr)) {
                        return "127.0.0.1";
                    }
                    return remoteAddr != null ? remoteAddr : "127.0.0.1";
                }
            }
        } catch (Exception ignored) {
        }
        return "127.0.0.1";
    }
}
