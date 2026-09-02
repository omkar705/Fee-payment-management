/**
 * reportsDummyData.js — Confirmed ER Dataset for Reports & Analysis Module
 * Confirmed Tables: students, fee_structures, fee_assignments, fee_installments, fee_payments
 */

const REPORTS_DUMMY_DATA = {
    // ------------------------------------------------------------------------
    // TABLE 1: students
    // PK: student_id
    // Attributes: student_id, prn, full_name, last_name, program, year_semester, department, email, phone
    // ------------------------------------------------------------------------
    students: [
        {
            student_id: 1,
            prn: "B25IT2010",
            full_name: "Manan",
            last_name: "Tote",
            program: "Information Technology",
            year_semester: "Second Year - Semester 3",
            department: "IT",
            email: "b25it2010@mmcoe.com",
            phone: "9876543210"
        },
        {
            student_id: 2,
            prn: "B25IT2014",
            full_name: "Aditi",
            last_name: "Wani",
            program: "Information Technology",
            year_semester: "Second Year - Semester 3",
            department: "IT",
            email: "b25it2014@mmcoe.com",
            phone: "9876543201"
        },
        {
            student_id: 3,
            prn: "B25IT2002",
            full_name: "Priya",
            last_name: "Desai",
            program: "Information Technology",
            year_semester: "Second Year - Semester 3",
            department: "IT",
            email: "b25it2002@mmcoe.com",
            phone: "9876543202"
        },
        {
            student_id: 4,
            prn: "B25CS2003",
            full_name: "Rohan",
            last_name: "Kulkarni",
            program: "Computer Engineering",
            year_semester: "Third Year - Semester 5",
            department: "Computer",
            email: "b25cs2003@mmcoe.com",
            phone: "9876543203"
        },
        {
            student_id: 5,
            prn: "B25CS2004",
            full_name: "Sneha",
            last_name: "Patil",
            program: "Computer Engineering",
            year_semester: "Third Year - Semester 5",
            department: "Computer",
            email: "b25cs2004@mmcoe.com",
            phone: "9876543204"
        },
        {
            student_id: 6,
            prn: "B25ME2005",
            full_name: "Vikram",
            last_name: "Joshi",
            program: "Mechanical Engineering",
            year_semester: "Fourth Year - Semester 7",
            department: "Mechanical",
            email: "b25me2005@mmcoe.com",
            phone: "9876543205"
        },
        {
            student_id: 7,
            prn: "B25AI2006",
            full_name: "Ananya",
            last_name: "Mehta",
            program: "AI & Data Science",
            year_semester: "First Year - Semester 1",
            department: "AI & DS",
            email: "b25ai2006@mmcoe.com",
            phone: "9876543206"
        },
        {
            student_id: 8,
            prn: "B25CE2007",
            full_name: "Karan",
            last_name: "Verma",
            program: "Civil Engineering",
            year_semester: "Third Year - Semester 5",
            department: "Civil",
            email: "b25ce2007@mmcoe.com",
            phone: "9876543207"
        },
        {
            student_id: 9,
            prn: "B25IT2008",
            full_name: "Divya",
            last_name: "Nair",
            program: "Information Technology",
            year_semester: "First Year - Semester 1",
            department: "IT",
            email: "b25it2008@mmcoe.com",
            phone: "9876543208"
        },
        {
            student_id: 10,
            prn: "B25CS2009",
            full_name: "Arjun",
            last_name: "Rao",
            program: "Computer Engineering",
            year_semester: "Fourth Year - Semester 7",
            department: "Computer",
            email: "b25cs2009@mmcoe.com",
            phone: "9876543209"
        },
        {
            student_id: 11,
            prn: "B25ME2011",
            full_name: "Neha",
            last_name: "Gupta",
            program: "Mechanical Engineering",
            year_semester: "Second Year - Semester 3",
            department: "Mechanical",
            email: "b25me2011@mmcoe.com",
            phone: "9876543211"
        },
        {
            student_id: 12,
            prn: "B25AI2012",
            full_name: "Siddharth",
            last_name: "Bhosale",
            program: "AI & Data Science",
            year_semester: "Second Year - Semester 3",
            department: "AI & DS",
            email: "b25ai2012@mmcoe.com",
            phone: "9876543212"
        }
    ],

    // ------------------------------------------------------------------------
    // TABLE 2: fee_structures
    // PK: fee_structure_id
    // Attributes: fee_structure_id, department, fee_type, amount, academic_year, description, status
    // ------------------------------------------------------------------------
    fee_structures: [
        {
            fee_structure_id: 101,
            department: "IT",
            fee_type: "Tuition Fee",
            amount: 95000,
            academic_year: "2025-26",
            description: "Annual Instructional Tuition Fee",
            status: "ACTIVE"
        },
        {
            fee_structure_id: 102,
            department: "IT",
            fee_type: "Development Fee",
            amount: 15000,
            academic_year: "2025-26",
            description: "Campus & Digital Infra Development",
            status: "ACTIVE"
        },
        {
            fee_structure_id: 103,
            department: "Computer",
            fee_type: "Tuition Fee",
            amount: 98000,
            academic_year: "2025-26",
            description: "Annual Instructional Tuition Fee",
            status: "ACTIVE"
        },
        {
            fee_structure_id: 104,
            department: "Computer",
            fee_type: "Development Fee",
            amount: 16000,
            academic_year: "2025-26",
            description: "Advanced Computing Lab Development",
            status: "ACTIVE"
        },
        {
            fee_structure_id: 105,
            department: "Mechanical",
            fee_type: "Tuition Fee",
            amount: 88000,
            academic_year: "2025-26",
            description: "Annual Instructional Tuition Fee",
            status: "ACTIVE"
        },
        {
            fee_structure_id: 106,
            department: "AI & DS",
            fee_type: "Tuition Fee",
            amount: 105000,
            academic_year: "2025-26",
            description: "Annual Artificial Intelligence Tuition",
            status: "ACTIVE"
        },
        {
            fee_structure_id: 107,
            department: "Civil",
            fee_type: "Tuition Fee",
            amount: 82000,
            academic_year: "2025-26",
            description: "Annual Structural & Civil Engineering Tuition",
            status: "ACTIVE"
        }
    ],

    // ------------------------------------------------------------------------
    // TABLE 3: fee_assignments
    // PK: assignment_id
    // FK: student_id -> students(student_id), fee_structure_id -> fee_structures(fee_structure_id)
    // Attributes: assignment_id, student_id, fee_structure_id, total_amount, paid_amount, outstanding_amount, due_date, status
    // Statuses: UNPAID, PARTIALLY_PAID, PAID
    // ------------------------------------------------------------------------
    fee_assignments: [
        {
            assignment_id: 1001,
            student_id: 1, // Manan Tote
            fee_structure_id: 101,
            total_amount: 110000,
            paid_amount: 60000,
            outstanding_amount: 50000,
            due_date: "2025-11-15",
            status: "PARTIALLY_PAID"
        },
        {
            assignment_id: 1002,
            student_id: 2, // Aarav Sharma
            fee_structure_id: 101,
            total_amount: 110000,
            paid_amount: 110000,
            outstanding_amount: 0,
            due_date: "2025-06-15",
            status: "PAID"
        },
        {
            assignment_id: 1003,
            student_id: 3, // Priya Desai
            fee_structure_id: 101,
            total_amount: 110000,
            paid_amount: 70000,
            outstanding_amount: 40000,
            due_date: "2025-10-31",
            status: "PARTIALLY_PAID"
        },
        {
            assignment_id: 1004,
            student_id: 4, // Rohan Kulkarni
            fee_structure_id: 103,
            total_amount: 114000,
            paid_amount: 114000,
            outstanding_amount: 0,
            due_date: "2025-06-15",
            status: "PAID"
        },
        {
            assignment_id: 1005,
            student_id: 5, // Sneha Patil
            fee_structure_id: 103,
            total_amount: 114000,
            paid_amount: 57000,
            outstanding_amount: 57000,
            due_date: "2025-11-30",
            status: "PARTIALLY_PAID"
        },
        {
            assignment_id: 1006,
            student_id: 6, // Vikram Joshi
            fee_structure_id: 105,
            total_amount: 100000,
            paid_amount: 0,
            outstanding_amount: 100000,
            due_date: "2025-07-15",
            status: "UNPAID"
        },
        {
            assignment_id: 1007,
            student_id: 7, // Ananya Mehta
            fee_structure_id: 106,
            total_amount: 120000,
            paid_amount: 120000,
            outstanding_amount: 0,
            due_date: "2025-06-30",
            status: "PAID"
        },
        {
            assignment_id: 1008,
            student_id: 8, // Karan Verma
            fee_structure_id: 107,
            total_amount: 95000,
            paid_amount: 47500,
            outstanding_amount: 47500,
            due_date: "2025-10-15",
            status: "PARTIALLY_PAID"
        },
        {
            assignment_id: 1009,
            student_id: 9, // Divya Nair
            fee_structure_id: 101,
            total_amount: 110000,
            paid_amount: 110000,
            outstanding_amount: 0,
            due_date: "2025-06-15",
            status: "PAID"
        },
        {
            assignment_id: 1010,
            student_id: 10, // Arjun Rao
            fee_structure_id: 103,
            total_amount: 114000,
            paid_amount: 0,
            outstanding_amount: 114000,
            due_date: "2025-08-01",
            status: "UNPAID"
        },
        {
            assignment_id: 1011,
            student_id: 11, // Neha Gupta
            fee_structure_id: 105,
            total_amount: 100000,
            paid_amount: 50000,
            outstanding_amount: 50000,
            due_date: "2025-11-15",
            status: "PARTIALLY_PAID"
        },
        {
            assignment_id: 1012,
            student_id: 12, // Siddharth Bhosale
            fee_structure_id: 106,
            total_amount: 120000,
            paid_amount: 60000,
            outstanding_amount: 60000,
            due_date: "2025-12-01",
            status: "PARTIALLY_PAID"
        }
    ],

    // ------------------------------------------------------------------------
    // TABLE 4: fee_installments
    // PK: installment_id
    // FK: assignment_id -> fee_assignments(assignment_id)
    // Attributes: installment_id, assignment_id, installment_number, installment_amount, paid_amount, due_date, status, reason
    // Statuses: PENDING, APPROVED, REJECTED, PAID
    // ------------------------------------------------------------------------
    fee_installments: [
        {
            installment_id: 2001,
            assignment_id: 1001,
            installment_number: 1,
            installment_amount: 60000,
            paid_amount: 60000,
            due_date: "2025-06-15",
            status: "PAID",
            reason: "Semester 1 Initial Clearance"
        },
        {
            installment_id: 2002,
            assignment_id: 1001,
            installment_number: 2,
            installment_amount: 50000,
            paid_amount: 0,
            due_date: "2025-11-15",
            status: "PENDING",
            reason: "Awaiting Semester 2 Due Date"
        },
        {
            installment_id: 2003,
            assignment_id: 1002,
            installment_number: 1,
            installment_amount: 55000,
            paid_amount: 55000,
            due_date: "2025-06-15",
            status: "PAID",
            reason: "Full Term Part 1"
        },
        {
            installment_id: 2004,
            assignment_id: 1002,
            installment_number: 2,
            installment_amount: 55000,
            paid_amount: 55000,
            due_date: "2025-08-10",
            status: "PAID",
            reason: "Full Term Part 2"
        },
        {
            installment_id: 2005,
            assignment_id: 1003,
            installment_number: 1,
            installment_amount: 70000,
            paid_amount: 70000,
            due_date: "2025-06-15",
            status: "PAID",
            reason: "First Phase Payment"
        },
        {
            installment_id: 2006,
            assignment_id: 1003,
            installment_number: 2,
            installment_amount: 40000,
            paid_amount: 0,
            due_date: "2025-10-31",
            status: "APPROVED",
            reason: "Extended Concession Approved by Accounts"
        },
        {
            installment_id: 2007,
            assignment_id: 1004,
            installment_number: 1,
            installment_amount: 57000,
            paid_amount: 57000,
            due_date: "2025-06-15",
            status: "PAID",
            reason: "Term 1 Paid"
        },
        {
            installment_id: 2008,
            assignment_id: 1004,
            installment_number: 2,
            installment_amount: 57000,
            paid_amount: 57000,
            due_date: "2025-07-20",
            status: "PAID",
            reason: "Term 2 Paid"
        },
        {
            installment_id: 2009,
            assignment_id: 1005,
            installment_number: 1,
            installment_amount: 57000,
            paid_amount: 57000,
            due_date: "2025-06-15",
            status: "PAID",
            reason: "Phase 1 Paid"
        },
        {
            installment_id: 2010,
            assignment_id: 1005,
            installment_number: 2,
            installment_amount: 57000,
            paid_amount: 0,
            due_date: "2025-11-30",
            status: "PENDING",
            reason: "Pending Mid-Term Installment"
        },
        {
            installment_id: 2011,
            assignment_id: 1006,
            installment_number: 1,
            installment_amount: 50000,
            paid_amount: 0,
            due_date: "2025-07-15",
            status: "REJECTED",
            reason: "Bounced Cheque / Failed Verification"
        },
        {
            installment_id: 2012,
            assignment_id: 1007,
            installment_number: 1,
            installment_amount: 120000,
            paid_amount: 120000,
            due_date: "2025-06-30",
            status: "PAID",
            reason: "Single Lump Sum Settlement"
        },
        {
            installment_id: 2013,
            assignment_id: 1008,
            installment_number: 1,
            installment_amount: 47500,
            paid_amount: 47500,
            due_date: "2025-06-15",
            status: "PAID",
            reason: "Installment 1 Clearance"
        },
        {
            installment_id: 2014,
            assignment_id: 1008,
            installment_number: 2,
            installment_amount: 47500,
            paid_amount: 0,
            due_date: "2025-10-15",
            status: "PENDING",
            reason: "Upcoming Due Date"
        },
        {
            installment_id: 2015,
            assignment_id: 1009,
            installment_number: 1,
            installment_amount: 110000,
            paid_amount: 110000,
            due_date: "2025-06-15",
            status: "PAID",
            reason: "Annual One-Time Clearance"
        },
        {
            installment_id: 2016,
            assignment_id: 1010,
            installment_number: 1,
            installment_amount: 57000,
            paid_amount: 0,
            due_date: "2025-08-01",
            status: "PENDING",
            reason: "Overdue Pending Notice Dispatched"
        }
    ],

    // ------------------------------------------------------------------------
    // TABLE 5: fee_payments
    // PK: payment_id
    // FK: student_id -> students(student_id), installment_id -> fee_installments(installment_id)
    // Attributes: payment_id, student_id, installment_id, amount_paid, payment_method, status, payment_date
    // Statuses: PENDING, SUCCESS, FAILED
    // ------------------------------------------------------------------------
    fee_payments: [
        {
            payment_id: 3001,
            student_id: 1, // Manan Tote
            installment_id: 2001,
            amount_paid: 60000,
            payment_method: "ONLINE",
            status: "SUCCESS",
            payment_date: "2025-06-12"
        },
        {
            payment_id: 3002,
            student_id: 2, // Aarav Sharma
            installment_id: 2003,
            amount_paid: 55000,
            payment_method: "UPI",
            status: "SUCCESS",
            payment_date: "2025-06-14"
        },
        {
            payment_id: 3003,
            student_id: 2, // Aarav Sharma
            installment_id: 2004,
            amount_paid: 55000,
            payment_method: "NET_BANKING",
            status: "SUCCESS",
            payment_date: "2025-08-09"
        },
        {
            payment_id: 3004,
            student_id: 3, // Priya Desai
            installment_id: 2005,
            amount_paid: 70000,
            payment_method: "DEBIT_CARD",
            status: "SUCCESS",
            payment_date: "2025-06-15"
        },
        {
            payment_id: 3005,
            student_id: 4, // Rohan Kulkarni
            installment_id: 2007,
            amount_paid: 57000,
            payment_method: "ONLINE",
            status: "SUCCESS",
            payment_date: "2025-06-10"
        },
        {
            payment_id: 3006,
            student_id: 4, // Rohan Kulkarni
            installment_id: 2008,
            amount_paid: 57000,
            payment_method: "CHEQUE",
            status: "SUCCESS",
            payment_date: "2025-07-18"
        },
        {
            payment_id: 3007,
            student_id: 5, // Sneha Patil
            installment_id: 2009,
            amount_paid: 57000,
            payment_method: "UPI",
            status: "SUCCESS",
            payment_date: "2025-06-14"
        },
        {
            payment_id: 3008,
            student_id: 6, // Vikram Joshi
            installment_id: 2011,
            amount_paid: 50000,
            payment_method: "CHEQUE",
            status: "FAILED",
            payment_date: "2025-07-12"
        },
        {
            payment_id: 3009,
            student_id: 7, // Ananya Mehta
            installment_id: 2012,
            amount_paid: 120000,
            payment_method: "NET_BANKING",
            status: "SUCCESS",
            payment_date: "2025-06-28"
        },
        {
            payment_id: 3010,
            student_id: 8, // Karan Verma
            installment_id: 2013,
            amount_paid: 47500,
            payment_method: "CASH",
            status: "SUCCESS",
            payment_date: "2025-06-14"
        },
        {
            payment_id: 3011,
            student_id: 9, // Divya Nair
            installment_id: 2015,
            amount_paid: 110000,
            payment_method: "ONLINE",
            status: "SUCCESS",
            payment_date: "2025-06-11"
        },
        {
            payment_id: 3012,
            student_id: 10, // Arjun Rao
            installment_id: 2016,
            amount_paid: 57000,
            payment_method: "UPI",
            status: "FAILED",
            payment_date: "2025-08-02"
        },
        {
            payment_id: 3013,
            student_id: 11, // Neha Gupta
            installment_id: 2010,
            amount_paid: 50000,
            payment_method: "NET_BANKING",
            status: "SUCCESS",
            payment_date: "2025-07-25"
        },
        {
            payment_id: 3014,
            student_id: 12, // Siddharth Bhosale
            installment_id: 2014,
            amount_paid: 60000,
            payment_method: "ONLINE",
            status: "SUCCESS",
            payment_date: "2025-08-01"
        }
    ]
};

// Export to global window context for browser script consumption
window.REPORTS_DUMMY_DATA = REPORTS_DUMMY_DATA;
