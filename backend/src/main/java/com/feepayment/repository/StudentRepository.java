package com.feepayment.repository;

import com.feepayment.model.Student;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * StudentRepository — JdbcTemplate-based data access for the students table.
 */
@Repository
@RequiredArgsConstructor
public class StudentRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<Student> studentRowMapper = (rs, rowNum) -> {
        Student s = new Student();
        s.setId(rs.getLong("id"));
        s.setUserId(rs.getLong("user_id"));
        s.setName(rs.getString("name"));
        s.setPrn(rs.getString("prn"));
        s.setEmail(rs.getString("email"));
        s.setMobile(rs.getString("mobile"));
        s.setDepartment(rs.getString("department"));
        s.setCourse(rs.getString("course"));
        s.setAcademicYear(rs.getString("academic_year"));
        s.setStatus(rs.getString("status"));
        Timestamp ts = rs.getTimestamp("created_at");
        s.setCreatedAt(ts != null ? ts.toLocalDateTime() : null);
        
        s.setBtechYear(rs.getString("btech_year"));
        s.setCaste(rs.getString("caste"));
        s.setGender(rs.getString("gender"));
        s.setAnnualFamilyIncome(rs.getBigDecimal("annual_family_income"));
        s.setQuota(rs.getString("quota"));
        
        return s;
    };

    private static final String SELECT_ALL =
        "SELECT id, user_id, name, prn, email, mobile, department, course, academic_year, status, created_at, btech_year, caste, gender, annual_family_income, quota FROM students";

    public List<Student> findAll() {
        return jdbc.query(SELECT_ALL, studentRowMapper);
    }

    public Optional<Student> findById(Long id) {
        String sql = SELECT_ALL + " WHERE id = ?";
        return jdbc.query(sql, studentRowMapper, id).stream().findFirst();
    }

    public Optional<Student> findByEmail(String email) {
        String sql = SELECT_ALL + " WHERE email = ?";
        return jdbc.query(sql, studentRowMapper, email).stream().findFirst();
    }

    public Optional<Student> findByPrn(String prn) {
        String sql = SELECT_ALL + " WHERE prn = ?";
        return jdbc.query(sql, studentRowMapper, prn).stream().findFirst();
    }

    public Optional<Student> findByUserId(Long userId) {
        String sql = SELECT_ALL + " WHERE user_id = ?";
        return jdbc.query(sql, studentRowMapper, userId).stream().findFirst();
    }

    public boolean existsByPrn(String prn) {
        String sql = "SELECT COUNT(*) FROM students WHERE prn = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, prn);
        return count != null && count > 0;
    }

    public boolean existsByEmail(String email) {
        String sql = "SELECT COUNT(*) FROM students WHERE email = ?";
        Integer count = jdbc.queryForObject(sql, Integer.class, email);
        return count != null && count > 0;
    }

    public long countByStatus(String status) {
        String sql = "SELECT COUNT(*) FROM students WHERE status = ?";
        Long count = jdbc.queryForObject(sql, Long.class, status);
        return count != null ? count : 0L;
    }

    public long count() {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM students", Long.class);
        return count != null ? count : 0L;
    }

    /**
     * Filter by optional department, academicYear, and status.
     * Null parameters are ignored (treated as "no filter").
     */
    public List<Student> findByFilters(String department, String academicYear, String status) {
        StringBuilder sql = new StringBuilder(SELECT_ALL + " WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (department != null) {
            sql.append(" AND department = ?");
            params.add(department);
        }
        if (academicYear != null) {
            sql.append(" AND academic_year = ?");
            params.add(academicYear);
        }
        if (status != null) {
            sql.append(" AND status = ?");
            params.add(status);
        }

        return jdbc.query(sql.toString(), studentRowMapper, params.toArray());
    }

    /**
     * Insert or update a student record.
     */
    public Student save(Student student) {
        if (student.getId() == null) {
            // INSERT
            String sql = "INSERT INTO students (user_id, name, prn, email, mobile, department, course, academic_year, status, created_at, btech_year, caste, gender, annual_family_income, quota) " +
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            LocalDateTime now = LocalDateTime.now();
            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, student.getUserId());
                ps.setString(2, student.getName());
                ps.setString(3, student.getPrn());
                ps.setString(4, student.getEmail());
                ps.setString(5, student.getMobile());
                ps.setString(6, student.getDepartment());
                ps.setString(7, student.getCourse());
                ps.setString(8, student.getAcademicYear());
                ps.setString(9, student.getStatus() != null ? student.getStatus() : "ACTIVE");
                ps.setTimestamp(10, Timestamp.valueOf(now));
                ps.setString(11, student.getBtechYear());
                ps.setString(12, student.getCaste());
                ps.setString(13, student.getGender());
                ps.setBigDecimal(14, student.getAnnualFamilyIncome());
                ps.setString(15, student.getQuota());
                return ps;
            }, keyHolder);
            Map<String, Object> keys = keyHolder.getKeys();
            Long generatedId;
            if (keys != null && !keys.isEmpty()) {
                Object val = keys.get("id");
                if (val == null) val = keys.get("ID");
                if (val == null) val = keys.values().iterator().next();
                generatedId = ((Number) val).longValue();
            } else {
                generatedId = Objects.requireNonNull(keyHolder.getKey()).longValue();
            }
            student.setId(generatedId);
            student.setCreatedAt(now);
        } else {
            // UPDATE
            String sql = "UPDATE students SET name=?, prn=?, email=?, mobile=?, department=?, course=?, academic_year=?, status=?, btech_year=?, caste=?, gender=?, annual_family_income=?, quota=? WHERE id=?";
            jdbc.update(sql,
                student.getName(),
                student.getPrn(),
                student.getEmail(),
                student.getMobile(),
                student.getDepartment(),
                student.getCourse(),
                student.getAcademicYear(),
                student.getStatus(),
                student.getBtechYear(),
                student.getCaste(),
                student.getGender(),
                student.getAnnualFamilyIncome(),
                student.getQuota(),
                student.getId()
            );
        }
        return student;
    }

    public void updateStatus(Long studentId, String status) {
        jdbc.update("UPDATE students SET status=? WHERE id=?", status, studentId);
    }
}
