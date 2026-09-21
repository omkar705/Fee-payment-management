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
    student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
    order_id VARCHAR(255),
    transaction_reference VARCHAR(255) NOT NULL UNIQUE,
    gateway_name VARCHAR(100) NOT NULL DEFAULT 'RAZORPAY',
    transaction_status VARCHAR(50) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
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
    receipt_url VARCHAR(500),
    receipt_number VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS fee_payments (
    payment_id     BIGSERIAL PRIMARY KEY,
    student_id     BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount_paid    NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payment_date   DATE,
    description    VARCHAR(255),
    created_at     TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status  ON fee_payments(status);

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

-- ============================================================
-- TABLE: fee_structures (College Fee Slabs)
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_structures (
    id              SERIAL PRIMARY KEY,
    department      VARCHAR(100) NOT NULL,
    category        VARCHAR(50)  NOT NULL DEFAULT 'OPEN',
    tuition_fee     NUMERIC(10, 2) NOT NULL,
    development_fee NUMERIC(10, 2) NOT NULL,
    exam_fee        NUMERIC(10, 2) NOT NULL,
    total_amount    NUMERIC(10, 2) NOT NULL,
    academic_year   VARCHAR(20)  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
);

-- ============================================================
-- TABLE: installment_requests (2-Installment Application)
-- ============================================================
CREATE TABLE IF NOT EXISTS installment_requests (
    id            SERIAL PRIMARY KEY,
    student_id    BIGINT       NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year VARCHAR(20)  NOT NULL,
    reason        VARCHAR(255),
    status        VARCHAR(20)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    applied_date  TIMESTAMP    NOT NULL DEFAULT NOW(),
    reviewed_by   VARCHAR(100),
    reviewed_date TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_dept ON fee_structures (department);
CREATE INDEX IF NOT EXISTS idx_installment_requests_student ON installment_requests (student_id);


