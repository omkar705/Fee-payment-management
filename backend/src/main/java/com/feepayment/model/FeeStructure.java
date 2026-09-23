package com.feepayment.model;

import java.math.BigDecimal;

public class FeeStructure {
    private Long id;
    private String department;
    private String category; // Note: represents caste in new design (OPEN, OBC, SC, etc.)
    private BigDecimal tuitionFee;
    private BigDecimal developmentFee;
    private BigDecimal examFee;
    
    // New Fee Components
    private BigDecimal universityFee;
    private BigDecimal libraryFee;
    private BigDecimal laboratoryFee;
    private BigDecimal insuranceFee;
    private BigDecimal otherFee;
    
    private BigDecimal totalAmount;
    private String academicYear;
    private String status;

    // New Identification Attributes
    private String btechYear;
    private String gender;
    private String incomeLimit;
    private String quota;

    public FeeStructure() {}

    public FeeStructure(Long id, String department, String category, BigDecimal tuitionFee,
                        BigDecimal developmentFee, BigDecimal examFee, BigDecimal universityFee,
                        BigDecimal libraryFee, BigDecimal laboratoryFee, BigDecimal insuranceFee, BigDecimal otherFee,
                        BigDecimal totalAmount, String academicYear, String status, String btechYear, String gender, String incomeLimit, String quota) {
        this.id = id;
        this.department = department;
        this.category = category;
        this.tuitionFee = tuitionFee;
        this.developmentFee = developmentFee;
        this.examFee = examFee;
        this.universityFee = universityFee;
        this.libraryFee = libraryFee;
        this.laboratoryFee = laboratoryFee;
        this.insuranceFee = insuranceFee;
        this.otherFee = otherFee;
        this.totalAmount = totalAmount;
        this.academicYear = academicYear;
        this.status = status;
        this.btechYear = btechYear;
        this.gender = gender;
        this.incomeLimit = incomeLimit;
        this.quota = quota;
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

    public BigDecimal getUniversityFee() { return universityFee; }
    public void setUniversityFee(BigDecimal universityFee) { this.universityFee = universityFee; }

    public BigDecimal getLibraryFee() { return libraryFee; }
    public void setLibraryFee(BigDecimal libraryFee) { this.libraryFee = libraryFee; }

    public BigDecimal getLaboratoryFee() { return laboratoryFee; }
    public void setLaboratoryFee(BigDecimal laboratoryFee) { this.laboratoryFee = laboratoryFee; }

    public BigDecimal getInsuranceFee() { return insuranceFee; }
    public void setInsuranceFee(BigDecimal insuranceFee) { this.insuranceFee = insuranceFee; }

    public BigDecimal getOtherFee() { return otherFee; }
    public void setOtherFee(BigDecimal otherFee) { this.otherFee = otherFee; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBtechYear() { return btechYear; }
    public void setBtechYear(String btechYear) { this.btechYear = btechYear; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getIncomeLimit() { return incomeLimit; }
    public void setIncomeLimit(String incomeLimit) { this.incomeLimit = incomeLimit; }

    public String getQuota() { return quota; }
    public void setQuota(String quota) { this.quota = quota; }
}
