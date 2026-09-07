-- ============================================================
-- Fee Payment Management Platform — Database Schema
-- Milestone 1: Login, Admin, Accounts, Student Modules
-- ============================================================

-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS students (
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
CREATE TABLE IF NOT EXISTS password_reset_tokens (
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
CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id     ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_students_prn      ON students(prn);
CREATE INDEX IF NOT EXISTS idx_students_user_id  ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_status   ON students(status);
CREATE INDEX IF NOT EXISTS idx_prt_token         ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_user_id       ON password_reset_tokens(user_id);

-- ============================================================
-- CONFIRMED REPORTS TABLES: fee_structures, fee_assignments, fee_installments, fee_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_structures (
    fee_structure_id SERIAL PRIMARY KEY,
    department       VARCHAR(100) NOT NULL,
    fee_type         VARCHAR(100) NOT NULL,
    amount           NUMERIC(12,2) NOT NULL,
    academic_year    VARCHAR(20) NOT NULL,
    description      TEXT,
    status           VARCHAR(20) DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS fee_assignments (
    assignment_id      SERIAL PRIMARY KEY,
    student_id         INTEGER REFERENCES students(id),
    fee_structure_id   INTEGER REFERENCES fee_structures(fee_structure_id),
    total_amount       NUMERIC(12,2) NOT NULL,
    paid_amount        NUMERIC(12,2) DEFAULT 0,
    outstanding_amount NUMERIC(12,2) NOT NULL,
    due_date           VARCHAR(20),
    status             VARCHAR(20) DEFAULT 'UNPAID'
);

CREATE TABLE IF NOT EXISTS fee_installments (
    installment_id     SERIAL PRIMARY KEY,
    assignment_id      INTEGER REFERENCES fee_assignments(assignment_id),
    installment_number INTEGER NOT NULL,
    installment_amount NUMERIC(12,2) NOT NULL,
    paid_amount        NUMERIC(12,2) DEFAULT 0,
    due_date           VARCHAR(20),
    status             VARCHAR(20) DEFAULT 'PENDING',
    reason             TEXT
);

CREATE TABLE IF NOT EXISTS fee_payments (
    payment_id     SERIAL PRIMARY KEY,
    student_id     INTEGER REFERENCES students(id),
    installment_id INTEGER REFERENCES fee_installments(installment_id),
    amount_paid    NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50),
    status         VARCHAR(20) DEFAULT 'SUCCESS',
    payment_date   VARCHAR(20)
);

-- ============================================================
-- RAZORPAY PAYMENT MODULE TABLES: transactions, payment_gateway_logs, receipts
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id        SERIAL PRIMARY KEY,
    payment_id            INTEGER REFERENCES fee_payments(payment_id) ON DELETE SET NULL,
    student_id            INTEGER REFERENCES students(id) ON DELETE SET NULL,
    order_id              VARCHAR(255),
    transaction_reference VARCHAR(255) UNIQUE NOT NULL,
    gateway_name          VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
    transaction_status    VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    amount                NUMERIC(12,2) NOT NULL,
    currency              VARCHAR(10) NOT NULL DEFAULT 'INR',
    verified_by           VARCHAR(100) NOT NULL DEFAULT 'RAZORPAY_SIGNATURE_VERIFIED',
    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_reference   ON transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_txn_student_id  ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_txn_order_id    ON transactions(order_id);

CREATE TABLE IF NOT EXISTS payment_gateway_logs (
    gateway_log_id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    gateway_name   VARCHAR(50) NOT NULL DEFAULT 'RAZORPAY',
    request_data   TEXT,
    response_data  TEXT,
    status         VARCHAR(50),
    log_time       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pgl_transaction_id ON payment_gateway_logs(transaction_id);

CREATE TABLE IF NOT EXISTS receipts (
    receipt_id      SERIAL PRIMARY KEY,
    receipt_number  VARCHAR(100) UNIQUE NOT NULL,
    transaction_id  INTEGER UNIQUE REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    student_id      INTEGER REFERENCES students(id) ON DELETE SET NULL,
    receipt_url     VARCHAR(255),
    generated_date  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_number        ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipts_student_id    ON receipts(student_id);
