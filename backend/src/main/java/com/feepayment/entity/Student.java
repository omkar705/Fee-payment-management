package com.feepayment.entity;

import java.time.LocalDateTime;

public class Student {
    private Long id;
    private Long userId;
    private String name;
    private String prn;
    private String email;
    private String mobile;
    private String department;
    private String course;
    private String academicYear;
    private String status;
    private LocalDateTime createdAt;
    private User user;

    public Student() {}

    public Student(Long id, Long userId, String name, String prn, String email, String mobile, String department, String course, String academicYear, String status, LocalDateTime createdAt, User user) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.prn = prn;
        this.email = email;
        this.mobile = mobile;
        this.department = department;
        this.course = course;
        this.academicYear = academicYear;
        this.status = status;
        this.createdAt = createdAt;
        this.user = user;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPrn() { return prn; }
    public void setPrn(String prn) { this.prn = prn; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getCourse() { return course; }
    public void setCourse(String course) { this.course = course; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
