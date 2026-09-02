-- ============================================================
-- Fee Payment Management Platform — Database Schema
-- Milestone 1: Login, Admin, Accounts, Student Modules
-- ============================================================

-- Drop existing tables (in correct FK order)
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE roles (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    role_id    INTEGER      NOT NULL REFERENCES roles(id),
    enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: students
-- ============================================================
CREATE TABLE students (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER      NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    prn           VARCHAR(20)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    mobile        VARCHAR(15)  NOT NULL,
    department    VARCHAR(100) NOT NULL,
    course        VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20)  NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING')),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: password_reset_tokens
-- ============================================================
CREATE TABLE password_reset_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    expiry_date TIMESTAMP    NOT NULL,
    used        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email       ON users(email);
CREATE INDEX idx_users_role_id     ON users(role_id);
CREATE INDEX idx_students_prn      ON students(prn);
CREATE INDEX idx_students_user_id  ON students(user_id);
CREATE INDEX idx_students_status   ON students(status);
CREATE INDEX idx_prt_token         ON password_reset_tokens(token);
CREATE INDEX idx_prt_user_id       ON password_reset_tokens(user_id);
