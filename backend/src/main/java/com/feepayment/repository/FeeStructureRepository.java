package com.feepayment.repository;

import com.feepayment.model.FeeStructure;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class FeeStructureRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<FeeStructure> rowMapper = (rs, rowNum) -> {
        FeeStructure fs = new FeeStructure();
        fs.setId(rs.getLong("id"));
        fs.setDepartment(rs.getString("department"));
        fs.setCategory(rs.getString("category"));
        fs.setTuitionFee(rs.getBigDecimal("tuition_fee"));
        fs.setDevelopmentFee(rs.getBigDecimal("development_fee"));
        fs.setExamFee(rs.getBigDecimal("exam_fee"));
        
        fs.setUniversityFee(rs.getBigDecimal("university_fee"));
        fs.setLibraryFee(rs.getBigDecimal("library_fee"));
        fs.setLaboratoryFee(rs.getBigDecimal("laboratory_fee"));
        fs.setInsuranceFee(rs.getBigDecimal("insurance_fee"));
        fs.setOtherFee(rs.getBigDecimal("other_fee"));
        
        fs.setTotalAmount(rs.getBigDecimal("total_amount"));
        fs.setAcademicYear(rs.getString("academic_year"));
        fs.setStatus(rs.getString("status"));
        
        fs.setBtechYear(rs.getString("btech_year"));
        fs.setGender(rs.getString("gender"));
        fs.setIncomeLimit(rs.getString("income_limit"));
        fs.setQuota(rs.getString("quota"));
        return fs;
    };

    private static final String SELECT_ALL = 
        "SELECT id, department, category, tuition_fee, development_fee, exam_fee, university_fee, library_fee, laboratory_fee, insurance_fee, other_fee, total_amount, academic_year, status, btech_year, gender, income_limit, quota FROM fee_structures";

    public List<FeeStructure> findAll() {
        return jdbc.query(SELECT_ALL + " ORDER BY id ASC", rowMapper);
    }

    public Optional<FeeStructure> findById(Long id) {
        return jdbc.query(SELECT_ALL + " WHERE id = ?", rowMapper, id).stream().findFirst();
    }

    public Optional<FeeStructure> findByDepartmentAndCategory(String department, String category) {
        return jdbc.query(SELECT_ALL + " WHERE department = ? AND category = ? AND status = 'ACTIVE'", rowMapper, department, category).stream().findFirst();
    }

    public Optional<FeeStructure> findByDepartment(String department) {
        return jdbc.query(SELECT_ALL + " WHERE department = ? AND status = 'ACTIVE' LIMIT 1", rowMapper, department).stream().findFirst();
    }

    public Optional<FeeStructure> findApplicableFeeStructure(String academicYear, String department, String btechYear, String caste, String gender, String incomeLimit, String quota) {
        String sql = SELECT_ALL + " WHERE academic_year = ? AND department = ? AND btech_year = ? AND category = ? AND gender = ? AND income_limit = ? AND quota = ? AND status = 'ACTIVE' LIMIT 1";
        return jdbc.query(sql, rowMapper, academicYear, department, btechYear, caste, gender, incomeLimit, quota).stream().findFirst();
    }

    public void save(FeeStructure fs) {
        if (fs.getId() == null) {
            String sql = "INSERT INTO fee_structures (department, category, tuition_fee, development_fee, exam_fee, university_fee, library_fee, laboratory_fee, insurance_fee, other_fee, total_amount, academic_year, status, btech_year, gender, income_limit, quota) " +
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            jdbc.update(sql, 
                fs.getDepartment(), fs.getCategory(), fs.getTuitionFee(), fs.getDevelopmentFee(), fs.getExamFee(),
                fs.getUniversityFee(), fs.getLibraryFee(), fs.getLaboratoryFee(), fs.getInsuranceFee(), fs.getOtherFee(),
                fs.getTotalAmount(), fs.getAcademicYear(), fs.getStatus() != null ? fs.getStatus() : "ACTIVE",
                fs.getBtechYear(), fs.getGender(), fs.getIncomeLimit(), fs.getQuota()
            );
        } else {
            String sql = "UPDATE fee_structures SET department = ?, category = ?, tuition_fee = ?, development_fee = ?, " +
                         "exam_fee = ?, university_fee = ?, library_fee = ?, laboratory_fee = ?, insurance_fee = ?, other_fee = ?, " +
                         "total_amount = ?, academic_year = ?, status = ?, btech_year = ?, gender = ?, income_limit = ?, quota = ? WHERE id = ?";
            jdbc.update(sql, 
                fs.getDepartment(), fs.getCategory(), fs.getTuitionFee(), fs.getDevelopmentFee(), fs.getExamFee(),
                fs.getUniversityFee(), fs.getLibraryFee(), fs.getLaboratoryFee(), fs.getInsuranceFee(), fs.getOtherFee(),
                fs.getTotalAmount(), fs.getAcademicYear(), fs.getStatus(),
                fs.getBtechYear(), fs.getGender(), fs.getIncomeLimit(), fs.getQuota(), 
                fs.getId()
            );
        }
    }

    public int count() {
        Integer c = jdbc.queryForObject("SELECT COUNT(*) FROM fee_structures", Integer.class);
        return c != null ? c : 0;
    }
}
