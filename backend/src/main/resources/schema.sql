-- =========================================================================
-- Fee Payment Management Platform — Full Database Schema (Reset + Recreate)
-- Target Database: Supabase PostgreSQL
-- =========================================================================

-- Drop all tables in reverse FK order
DROP TABLE IF EXISTS payment_settlements CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS payment_gateway_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS fee_payments CASCADE;
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
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
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
-- TABLE: fee_payments  (core ledger — one row per payment attempt)
-- ============================================================
CREATE TABLE fee_payments (
    payment_id     BIGSERIAL PRIMARY KEY,
    student_id     BIGINT       NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount_paid    NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50)  NOT NULL DEFAULT 'RAZORPAY',
    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    payment_date   DATE,
    description    VARCHAR(255),
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Core Indexes
-- ============================================================
CREATE INDEX idx_users_email           ON users(email);
CREATE INDEX idx_users_role_id         ON users(role_id);
CREATE INDEX idx_students_prn          ON students(prn);
CREATE INDEX idx_students_user_id      ON students(user_id);
CREATE INDEX idx_students_email        ON students(email);
CREATE INDEX idx_prt_token             ON password_reset_tokens(token);
CREATE INDEX idx_fee_payments_student  ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_status   ON fee_payments(status);

-- ============================================================
-- PAYMENT GATEWAY & TRANSACTION TABLES
-- ============================================================
CREATE TABLE transactions (
    transaction_id        BIGSERIAL PRIMARY KEY,
    payment_id            BIGINT,
    student_id            BIGINT REFERENCES students(id) ON DELETE SET NULL,
    order_id              VARCHAR(255),
    transaction_reference VARCHAR(255) NOT NULL UNIQUE,
    gateway_name          VARCHAR(100) NOT NULL DEFAULT 'RAZORPAY',
    transaction_status    VARCHAR(50)  NOT NULL DEFAULT 'SUCCESS',
    amount                NUMERIC(12,2) NOT NULL,
    currency              VARCHAR(10)   NOT NULL DEFAULT 'INR',
    verified_by           VARCHAR(100),
    created_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_gateway_logs (
    gateway_log_id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    gateway_name   VARCHAR(100) NOT NULL,
    request_data   TEXT,
    response_data  TEXT,
    status         VARCHAR(50) NOT NULL,
    log_time       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE receipts (
    receipt_id     BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL UNIQUE REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    student_id     BIGINT REFERENCES students(id) ON DELETE SET NULL,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    generated_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    receipt_url    VARCHAR(500)
);

CREATE TABLE payment_settlements (
    settlement_id     BIGSERIAL PRIMARY KEY,
    transaction_id    BIGINT REFERENCES transactions(transaction_id),
    merchant_account  VARCHAR(100) NOT NULL,
    settled_amount    NUMERIC(12,2) NOT NULL,
    commission_fee    NUMERIC(10,2) DEFAULT 0.00,
    settlement_status VARCHAR(50)   DEFAULT 'PENDING',
    settlement_date   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment indexes
CREATE INDEX idx_transactions_student   ON transactions(student_id);
CREATE INDEX idx_transactions_reference ON transactions(transaction_reference);
CREATE INDEX idx_transactions_status    ON transactions(transaction_status);
CREATE INDEX idx_gateway_logs_txn       ON payment_gateway_logs(transaction_id);
CREATE INDEX idx_receipts_student       ON receipts(student_id);
CREATE INDEX idx_receipts_number        ON receipts(receipt_number);
CREATE INDEX idx_settlements_txn        ON payment_settlements(transaction_id);
