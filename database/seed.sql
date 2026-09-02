-- ============================================================
-- Fee Payment Management Platform — Seed Data
-- Milestone 1
--
-- NOTE: These are DEMO credentials for development only.
--       Never use these in production.
--
-- Demo Credentials:
--   Admin:    admin@mmcoe.com     / Admin@123
--   Accounts: accounts@mmcoe.com  / Accounts@123
--   Student:  b25it2010@mmcoe.com / Student@123
--
-- Passwords are BCrypt-hashed (strength 10).
-- ============================================================

-- Roles
INSERT INTO roles (name) VALUES
    ('ADMIN'),
    ('ACCOUNTS'),
    ('STUDENT')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ADMIN USER
-- Password: Admin@123
-- BCrypt hash (strength 10)
-- ============================================================
INSERT INTO users (email, password, role_id, enabled) VALUES
(
    'admin@mmcoe.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    (SELECT id FROM roles WHERE name = 'ADMIN'),
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- ACCOUNTS OFFICER USER
-- Password: Accounts@123
-- ============================================================
INSERT INTO users (email, password, role_id, enabled) VALUES
(
    'accounts@mmcoe.com',
    '$2a$10$VElcNfQ1T6bPHJBb6V1RXe2Dy/RFVhQE1ypIHrEH5eLuijqmVRmZi',
    (SELECT id FROM roles WHERE name = 'ACCOUNTS'),
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- STUDENT USERS (10 students)
-- All passwords: Student@123
-- BCrypt hash for Student@123
-- ============================================================

INSERT INTO users (email, password, role_id, enabled) VALUES
('b25it2010@mmcoe.com', '$2a$10$slQfSoJkR0X1IjBF5s2A3ezxCQhPblqOiGVOiZtEekRZ7StyQ6hYW', (SELECT id FROM roles WHERE name = 'STUDENT'), TRUE),
('b25it2001@mmcoe.com', '$2a$10$slQfSoJkR0X1IjBF5s2A3ezxCQhPblqOiGVOiZtEekRZ7StyQ6hYW', (SELECT id FROM roles WHERE name = 'STUDENT'), TRUE),
('b25it2002@mmcoe.com', '$2a$10$slQfSoJkR0X1IjBF5s2A3ezxCQhPblqOiGVOiZtEekRZ7StyQ6hYW', (SELECT id FROM roles WHERE name = 'STUDENT'), TRUE),
('b25it2003@mmcoe.com', '$2a$10$slQfSoJkR0X1IjBF5s2A3ezxCQhPblqOiGVOiZtEekRZ7StyQ6hYW', (SELECT id FROM roles WHERE name = 'STUDENT'), TRUE),
('b25it2004@mmcoe.com', '$2a$10$slQfSoJkR0X1IjBF5s2A3ezxCQhPblqOiGVOiZtEekRZ7StyQ6hYW', (SELECT id FROM roles WHERE name = 'STUDENT'), TRUE),
('b25it2005@mmcoe.com', '$2a$10$slQfSoJkR0X1IjBF5s2A3ezxCQhPblqOiGVOiZtEekRZ7StyQ6hYW', (SELECT id FROM roles WHERE name = 'STUDENT'), TRUE),
('b25it2006@mmcoe.com', '$2a$10$slQfSoJkR0X1IjBF5s2A3ezxCQhPblqOiGVOiZtEekRZ7StyQ6hYW', (SELECT id FROM roles WHERE name = 'STUDENT'), FALSE),
('b25it2007@mmcoe.com', '$2a$10$slQfSoJkR0X1IjBF5s2A3ezxCQhPblqOiGVOiZtEekRZ7StyQ6hYW', (SELECT id FROM roles WHERE name = 'STUDENT'), TRUE),
('b25it2008@mmcoe.com', '$2a$10$slQfSoJkR0X1IjBF5s2A3ezxCQhPblqOiGVOiZtEekRZ7StyQ6hYW', (SELECT id FROM roles WHERE name = 'STUDENT'), TRUE),
('b25it2009@mmcoe.com', '$2a$10$slQfSoJkR0X1IjBF5s2A3ezxCQhPblqOiGVOiZtEekRZ7StyQ6hYW', (SELECT id FROM roles WHERE name = 'STUDENT'), TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- STUDENT RECORDS
-- ============================================================
INSERT INTO students (user_id, name, prn, email, mobile, department, course, academic_year, status) VALUES
(
    (SELECT id FROM users WHERE email = 'b25it2010@mmcoe.com'),
    'Manan Tote', 'B25IT2010', 'b25it2010@mmcoe.com', '9876543210',
    'Information Technology', 'B.Tech', '2025-26', 'ACTIVE'
),
(
    (SELECT id FROM users WHERE email = 'b25it2001@mmcoe.com'),
    'Aarav Sharma', 'B25IT2001', 'b25it2001@mmcoe.com', '9876543201',
    'Information Technology', 'B.Tech', '2025-26', 'ACTIVE'
),
(
    (SELECT id FROM users WHERE email = 'b25it2002@mmcoe.com'),
    'Priya Desai', 'B25IT2002', 'b25it2002@mmcoe.com', '9876543202',
    'Information Technology', 'B.Tech', '2025-26', 'ACTIVE'
),
(
    (SELECT id FROM users WHERE email = 'b25it2003@mmcoe.com'),
    'Rohan Kulkarni', 'B25IT2003', 'b25it2003@mmcoe.com', '9876543203',
    'Information Technology', 'B.Tech', '2025-26', 'ACTIVE'
),
(
    (SELECT id FROM users WHERE email = 'b25it2004@mmcoe.com'),
    'Sneha Patil', 'B25IT2004', 'b25it2004@mmcoe.com', '9876543204',
    'Information Technology', 'B.Tech', '2025-26', 'ACTIVE'
),
(
    (SELECT id FROM users WHERE email = 'b25it2005@mmcoe.com'),
    'Vikram Joshi', 'B25IT2005', 'b25it2005@mmcoe.com', '9876543205',
    'Information Technology', 'B.Tech', '2025-26', 'ACTIVE'
),
(
    (SELECT id FROM users WHERE email = 'b25it2006@mmcoe.com'),
    'Ananya Mehta', 'B25IT2006', 'b25it2006@mmcoe.com', '9876543206',
    'Information Technology', 'B.Tech', '2025-26', 'INACTIVE'
),
(
    (SELECT id FROM users WHERE email = 'b25it2007@mmcoe.com'),
    'Karan Verma', 'B25IT2007', 'b25it2007@mmcoe.com', '9876543207',
    'Information Technology', 'B.Tech', '2025-26', 'ACTIVE'
),
(
    (SELECT id FROM users WHERE email = 'b25it2008@mmcoe.com'),
    'Divya Nair', 'B25IT2008', 'b25it2008@mmcoe.com', '9876543208',
    'Information Technology', 'B.Tech', '2025-26', 'ACTIVE'
),
(
    (SELECT id FROM users WHERE email = 'b25it2009@mmcoe.com'),
    'Arjun Rao', 'B25IT2009', 'b25it2009@mmcoe.com', '9876543209',
    'Information Technology', 'B.Tech', '2025-26', 'ACTIVE'
)
ON CONFLICT (prn) DO NOTHING;
