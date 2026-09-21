package com.feepayment.model;

import java.time.LocalDateTime;

public class InstallmentRequest {
    private Long id;
    private Long studentId;
    private String studentName;
    private String studentPrn;
    private String academicYear;
    private String reason;
    private String status; // PENDING, APPROVED, REJECTED
    private LocalDateTime appliedDate;
    private String reviewedBy;
    private LocalDateTime reviewedDate;

    public InstallmentRequest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStudentPrn() { return studentPrn; }
    public void setStudentPrn(String studentPrn) { this.studentPrn = studentPrn; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getAppliedDate() { return appliedDate; }
    public void setAppliedDate(LocalDateTime appliedDate) { this.appliedDate = appliedDate; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public LocalDateTime getReviewedDate() { return reviewedDate; }
    public void setReviewedDate(LocalDateTime reviewedDate) { this.reviewedDate = reviewedDate; }
}
