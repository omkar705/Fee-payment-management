package com.feepayment.entity;

import java.time.LocalDateTime;

public class PasswordResetToken {
    private Long id;
    private Long userId;
    private String token;
    private LocalDateTime expiryDate;
    private Boolean used = false;
    private LocalDateTime createdAt;
    private User user;

    public PasswordResetToken() {}

    public PasswordResetToken(Long id, Long userId, String token, LocalDateTime expiryDate, Boolean used, LocalDateTime createdAt, User user) {
        this.id = id;
        this.userId = userId;
        this.token = token;
        this.expiryDate = expiryDate;
        this.used = used;
        this.createdAt = createdAt;
        this.user = user;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }

    public Boolean getUsed() { return used; }
    public void setUsed(Boolean used) { this.used = used; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiryDate);
    }
}
