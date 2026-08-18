-- ============================================================================
-- FEE PAYMENT MANAGEMENT PLATFORM - POSTGRESQL DDL SCRIPT
-- ============================================================================


-- ============================================================================
-- 1. Roles Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Roles" (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 2. Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Users" (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(15),
    role_id INT NOT NULL,
    account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    last_login TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES "Roles"(role_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


-- ============================================================================
-- 3. Students Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Students" (
    student_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE,
    prn VARCHAR(20) NOT NULL UNIQUE,
    program VARCHAR(100) NOT NULL,
    year_semester VARCHAR(30) NOT NULL,
    admission_date DATE,
    full_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15),
    department VARCHAR(100),
    gender VARCHAR(20),
    address TEXT,
    dob DATE,
    enrollment_date DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_students_user
        FOREIGN KEY (user_id)
        REFERENCES "Users"(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);


-- ============================================================================
-- 4. FeeStructure Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "FeeStructure" (
    fee_structure_id SERIAL PRIMARY KEY,
    department VARCHAR(100) NOT NULL,
    fee_type VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    academic_year VARCHAR(20) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 5. FeeAssignment Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "FeeAssignment" (
    assignment_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,
    fee_structure_id INT NOT NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00
        CHECK (paid_amount >= 0),
    outstanding_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00
        CHECK (outstanding_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    CONSTRAINT fk_assignment_student
        FOREIGN KEY (student_id)
        REFERENCES "Students"(student_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_assignment_structure
        FOREIGN KEY (fee_structure_id)
        REFERENCES "FeeStructure"(fee_structure_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


-- ============================================================================
-- 6. FeeInstallment Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "FeeInstallment" (
    installment_id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL,
    installment_number INT NOT NULL CHECK (installment_number > 0),
    due_date DATE NOT NULL,
    installment_amount NUMERIC(10, 2) NOT NULL
        CHECK (installment_amount > 0),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00
        CHECK (paid_amount >= 0),
    late_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00
        CHECK (late_fee >= 0),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_installment_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES "FeeAssignment"(assignment_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ============================================================================
-- 7. FeePayment Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "FeePayments" (
    payment_id SERIAL PRIMARY KEY,
    installment_id INT NOT NULL,
    student_id INT NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid > 0),
    payment_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payments_installment
        FOREIGN KEY (installment_id)
        REFERENCES "FeeInstallment"(installment_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_payments_student
        FOREIGN KEY (student_id)
        REFERENCES "Students"(student_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ============================================================================
-- 8. Transactions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Transactions" (
    transaction_id SERIAL PRIMARY KEY,
    payment_id INT NOT NULL,
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    gateway_name VARCHAR(50) NOT NULL,
    transaction_status VARCHAR(30) NOT NULL,
    transaction_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    verified_by INT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transactions_payment
        FOREIGN KEY (payment_id)
        REFERENCES "FeePayments"(payment_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_transactions_verified_by
        FOREIGN KEY (verified_by)
        REFERENCES "Users"(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);


-- ============================================================================
-- 9. Receipts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Receipts" (
    receipt_id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL UNIQUE,
    student_id INT NOT NULL,
    generated_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    receipt_url VARCHAR(500),

    CONSTRAINT fk_receipts_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES "Transactions"(transaction_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_receipts_student
        FOREIGN KEY (student_id)
        REFERENCES "Students"(student_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ============================================================================
-- 10. PaymentGatewayLogs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "PaymentGatewayLogs" (
    gateway_log_id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL,
    gateway_name VARCHAR(50) NOT NULL,
    request_data TEXT,
    response_data TEXT,
    status VARCHAR(30),
    log_time TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_gateway_logs_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES "Transactions"(transaction_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ============================================================================
-- 11. Reports Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Reports" (
    report_id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    generated_by INT NOT NULL,
    file_path VARCHAR(500),
    generated_on TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reports_user
        FOREIGN KEY (generated_by)
        REFERENCES "Users"(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


-- ============================================================================
-- 12. AuditLogs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "AuditLogs" (
    audit_log_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id)
        REFERENCES "Users"(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- ============================================================================
-- 13. SecurityLogs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "SecurityLogs" (
    security_log_id SERIAL PRIMARY KEY,
    user_id INT,
    activity VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    device_info TEXT,
    status VARCHAR(30),
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_security_logs_user
        FOREIGN KEY (user_id)
        REFERENCES "Users"(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);


-- ============================================================================
-- 14. BackupHistory Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "BackupHistory" (
    backup_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    backup_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    backup_location VARCHAR(500) NOT NULL,
    backup_status VARCHAR(30) NOT NULL,
    remarks TEXT,

    CONSTRAINT fk_backup_user
        FOREIGN KEY (user_id)
        REFERENCES "Users"(user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


-- ============================================================================
-- PERFORMANCE & FOREIGN KEY INDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role_id
    ON "Users"(role_id);

CREATE INDEX IF NOT EXISTS idx_students_user_id
    ON "Students"(user_id);

CREATE INDEX IF NOT EXISTS idx_students_prn
    ON "Students"(prn);

CREATE INDEX IF NOT EXISTS idx_fee_assignment_student_id
    ON "FeeAssignment"(student_id);

CREATE INDEX IF NOT EXISTS idx_fee_assignment_structure_id
    ON "FeeAssignment"(fee_structure_id);

CREATE INDEX IF NOT EXISTS idx_fee_assignment_status
    ON "FeeAssignment"(status);

CREATE INDEX IF NOT EXISTS idx_fee_installment_assignment_id
    ON "FeeInstallment"(assignment_id);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id
    ON "FeePayments"(student_id);

CREATE INDEX IF NOT EXISTS idx_fee_payments_installment_id
    ON "FeePayments"(installment_id);

CREATE INDEX IF NOT EXISTS idx_fee_payments_status
    ON "FeePayments"(status);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_id
    ON "Transactions"(payment_id);

CREATE INDEX IF NOT EXISTS idx_transactions_reference
    ON "Transactions"(transaction_reference);

CREATE INDEX IF NOT EXISTS idx_transactions_verified_by
    ON "Transactions"(verified_by);

CREATE INDEX IF NOT EXISTS idx_gateway_logs_transaction_id
    ON "PaymentGatewayLogs"(transaction_id);

CREATE INDEX IF NOT EXISTS idx_receipts_student_id
    ON "Receipts"(student_id);

CREATE INDEX IF NOT EXISTS idx_reports_generated_by
    ON "Reports"(generated_by);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON "AuditLogs"(user_id);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id
    ON "SecurityLogs"(user_id);

CREATE INDEX IF NOT EXISTS idx_backup_history_user_id
    ON "BackupHistory"(user_id);
