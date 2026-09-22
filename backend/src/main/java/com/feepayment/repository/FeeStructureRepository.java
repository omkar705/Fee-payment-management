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
        fs.setTotalAmount(rs.getBigDecimal("total_amount"));
        fs.setAcademicYear(rs.getString("academic_year"));
        fs.setStatus(rs.getString("status"));
        return fs;
    };

    public List<FeeStructure> findAll() {
        String sql = "SELECT id, department, category, tuition_fee, development_fee, exam_fee, total_amount, academic_year, status " +
                     "FROM fee_structures ORDER BY id ASC";
        return jdbc.query(sql, rowMapper);
    }

    public Optional<FeeStructure> findById(Long id) {
        String sql = "SELECT id, department, category, tuition_fee, development_fee, exam_fee, total_amount, academic_year, status " +
                     "FROM fee_structures WHERE id = ?";
        return jdbc.query(sql, rowMapper, id).stream().findFirst();
    }

    public Optional<FeeStructure> findByDepartmentAndCategory(String department, String category) {
        String sql = "SELECT id, department, category, tuition_fee, development_fee, exam_fee, total_amount, academic_year, status " +
                     "FROM fee_structures WHERE department = ? AND category = ? AND status = 'ACTIVE'";
        return jdbc.query(sql, rowMapper, department, category).stream().findFirst();
    }

    public Optional<FeeStructure> findByDepartment(String department) {
        String sql = "SELECT id, department, category, tuition_fee, development_fee, exam_fee, total_amount, academic_year, status " +
                     "FROM fee_structures WHERE department = ? AND status = 'ACTIVE' LIMIT 1";
        return jdbc.query(sql, rowMapper, department).stream().findFirst();
    }

    public void save(FeeStructure fs) {
        if (fs.getId() == null) {
            String sql = "INSERT INTO fee_structures (department, category, tuition_fee, development_fee, exam_fee, total_amount, academic_year, status) " +
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            jdbc.update(sql, fs.getDepartment(), fs.getCategory(), fs.getTuitionFee(),
                        fs.getDevelopmentFee(), fs.getExamFee(), fs.getTotalAmount(),
                        fs.getAcademicYear(), fs.getStatus() != null ? fs.getStatus() : "ACTIVE");
        } else {
            String sql = "UPDATE fee_structures SET department = ?, category = ?, tuition_fee = ?, development_fee = ?, " +
                         "exam_fee = ?, total_amount = ?, academic_year = ?, status = ? WHERE id = ?";
            jdbc.update(sql, fs.getDepartment(), fs.getCategory(), fs.getTuitionFee(),
                        fs.getDevelopmentFee(), fs.getExamFee(), fs.getTotalAmount(),
                        fs.getAcademicYear(), fs.getStatus(), fs.getId());
        }
    }

    public int count() {
        Integer c = jdbc.queryForObject("SELECT COUNT(*) FROM fee_structures", Integer.class);
        return c != null ? c : 0;
    }
}
