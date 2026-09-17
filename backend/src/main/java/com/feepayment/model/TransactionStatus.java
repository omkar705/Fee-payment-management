package com.feepayment.model;

/**
 * Team 2 — Transaction Management Module
 * Represents all possible lifecycle states of a payment transaction.
 *
 * State Machine:
 *   PENDING → PROCESSING → SUCCESS
 *                       → FAILED
 *                       → ROLLED_BACK
 *   SUCCESS → REFUNDED
 */
public enum TransactionStatus {

    /** Initial state: payment request received but not yet processed */
    PENDING,

    /** Payment is being actively processed by the payment gateway thread */
    PROCESSING,

    /** Payment verified and committed to the database successfully */
    SUCCESS,

    /** Payment failed at gateway or verification stage */
    FAILED,

    /** Transaction was manually rolled back by admin (ACID rollback applied) */
    ROLLED_BACK,

    /** Payment was refunded after initial success */
    REFUNDED;

    public boolean isTerminal() {
        return this == SUCCESS || this == FAILED || this == ROLLED_BACK || this == REFUNDED;
    }

    public boolean isSuccessful() {
        return this == SUCCESS || this == REFUNDED;
    }
}
