package com.feepayment.model;

import jakarta.validation.constraints.*;

/**
 * StudentData — Represents student form and profile information
 * used in requests and responses.
 */
public class StudentData {

    private Long id;

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 255, message = "Name must be between 2 and 255 characters")
    private String name;

    @NotBlank(message = "PRN is required")
    @Pattern(
        regexp = "^B\\d{2}[A-Z]{2,4}\\d{4}$",
        message = "Enter a valid PRN. Example: B25IT2010"
    )
    private String prn;

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    @Pattern(
        regexp = "^[a-zA-Z0-9._%+\\-]+@mmcoe\\.com$",
        message = "Email must be an MMCOE email (example: student@mmcoe.com)"
    )
    private String email;

    @NotBlank(message = "Mobile number is required")
    @Pattern(
        regexp = "^[6-9]\\d{9}$",
        message = "Enter a valid Indian mobile number (10 digits starting with 6-9)"
    )
    private String mobile;

    @NotBlank(message = "Department is required")
    private String department;

    @NotBlank(message = "Course is required")
    private String course;

    @NotBlank(message = "Academic year is required")
    private String academicYear;

    private String status;
    private String createdAt;
    private Boolean enabled;

    public StudentData() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
}
