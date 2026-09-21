package com.feepayment.model;

import java.math.BigDecimal;

public class FeeStructure {
    private Long id;
    private String department;
    private String category;
    private BigDecimal tuitionFee;
    private BigDecimal developmentFee;
    private BigDecimal examFee;
    private BigDecimal totalAmount;
    private String academicYear;
    private String status;

    public FeeStructure() {}

    public FeeStructure(Long id, String department, String category, BigDecimal tuitionFee,
                        BigDecimal developmentFee, BigDecimal examFee, BigDecimal totalAmount,
                        String academicYear, String status) {
        this.id = id;
        this.department = department;
        this.category = category;
        this.tuitionFee = tuitionFee;
        this.developmentFee = developmentFee;
        this.examFee = examFee;
        this.totalAmount = totalAmount;
        this.academicYear = academicYear;
        this.status = status;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getTuitionFee() { return tuitionFee; }
    public void setTuitionFee(BigDecimal tuitionFee) { this.tuitionFee = tuitionFee; }

    public BigDecimal getDevelopmentFee() { return developmentFee; }
    public void setDevelopmentFee(BigDecimal developmentFee) { this.developmentFee = developmentFee; }

    public BigDecimal getExamFee() { return examFee; }
    public void setExamFee(BigDecimal examFee) { this.examFee = examFee; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
