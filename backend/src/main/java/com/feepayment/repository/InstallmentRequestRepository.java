package com.feepayment.repository;

import com.feepayment.model.InstallmentRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class InstallmentRequestRepository {

    private final JdbcTemplate jdbc;

    private final RowMapper<InstallmentRequest> rowMapper = (rs, rowNum) -> {
        InstallmentRequest ir = new InstallmentRequest();
        ir.setId(rs.getLong("id"));
        ir.setStudentId(rs.getLong("student_id"));
        ir.setStudentName(rs.getString("student_name"));
        ir.setStudentPrn(rs.getString("student_prn"));
        ir.setAcademicYear(rs.getString("academic_year"));
        ir.setReason(rs.getString("reason"));
        ir.setStatus(rs.getString("status"));
        Timestamp applied = rs.getTimestamp("applied_date");
        ir.setAppliedDate(applied != null ? applied.toLocalDateTime() : null);
        ir.setReviewedBy(rs.getString("reviewed_by"));
        Timestamp reviewed = rs.getTimestamp("reviewed_date");
        ir.setReviewedDate(reviewed != null ? reviewed.toLocalDateTime() : null);
        return ir;
    };

    public List<InstallmentRequest> findAll() {
        String sql = "SELECT ir.id, ir.student_id, s.name AS student_name, s.prn AS student_prn, " +
                     "ir.academic_year, ir.reason, ir.status, ir.applied_date, ir.reviewed_by, ir.reviewed_date " +
                     "FROM installment_requests ir " +
                     "JOIN students s ON ir.student_id = s.id " +
                     "ORDER BY ir.id DESC";
        return jdbc.query(sql, rowMapper);
    }

    public Optional<InstallmentRequest> findById(Long id) {
        String sql = "SELECT ir.id, ir.student_id, s.name AS student_name, s.prn AS student_prn, " +
                     "ir.academic_year, ir.reason, ir.status, ir.applied_date, ir.reviewed_by, ir.reviewed_date " +
                     "FROM installment_requests ir " +
                     "JOIN students s ON ir.student_id = s.id " +
                     "WHERE ir.id = ?";
        return jdbc.query(sql, rowMapper, id).stream().findFirst();
    }

    public Optional<InstallmentRequest> findLatestByStudentId(Long studentId) {
        String sql = "SELECT ir.id, ir.student_id, s.name AS student_name, s.prn AS student_prn, " +
                     "ir.academic_year, ir.reason, ir.status, ir.applied_date, ir.reviewed_by, ir.reviewed_date " +
                     "FROM installment_requests ir " +
                     "JOIN students s ON ir.student_id = s.id " +
                     "WHERE ir.student_id = ? ORDER BY ir.id DESC LIMIT 1";
        return jdbc.query(sql, rowMapper, studentId).stream().findFirst();
    }

    public void create(Long studentId, String academicYear, String reason) {
        String sql = "INSERT INTO installment_requests (student_id, academic_year, reason, status, applied_date) " +
                     "VALUES (?, ?, ?, 'PENDING', NOW())";
        jdbc.update(sql, studentId, academicYear, reason);
    }

    public void updateStatus(Long id, String status, String reviewedBy) {
        String sql = "UPDATE installment_requests SET status = ?, reviewed_by = ?, reviewed_date = NOW() WHERE id = ?";
        jdbc.update(sql, status, reviewedBy, id);
    }
}
