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

-- ============================================================
-- PAYMENT GATEWAY & TRANSACTION AUDIT MODULE TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    transaction_reference VARCHAR(255) NOT NULL UNIQUE,
    gateway_name VARCHAR(100) NOT NULL,
    transaction_status VARCHAR(50) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    amount NUMERIC(12, 2) NOT NULL,
    verified_by VARCHAR(100),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_gateway_logs (
    gateway_log_id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    gateway_name VARCHAR(100) NOT NULL,
    request_data TEXT,
    response_data TEXT,
    status VARCHAR(50) NOT NULL,
    log_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipts (
    receipt_id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL UNIQUE REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL,
    generated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    receipt_url VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS payment_settlements (
    settlement_id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    merchant_account VARCHAR(100) NOT NULL,
    settled_amount NUMERIC(12, 2) NOT NULL,
    commission_fee NUMERIC(10, 2) DEFAULT 0.00,
    settlement_status VARCHAR(50) DEFAULT 'PENDING' CHECK (settlement_status IN ('PENDING', 'PROCESSED', 'FAILED', 'ON_HOLD')),
    settlement_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions (transaction_reference);
CREATE INDEX IF NOT EXISTS idx_gateway_logs_txn ON payment_gateway_logs (transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipts_student ON receipts (student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_txn ON receipts (transaction_id);
CREATE INDEX IF NOT EXISTS idx_settlements_transaction ON payment_settlements (transaction_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON payment_settlements (settlement_status);

