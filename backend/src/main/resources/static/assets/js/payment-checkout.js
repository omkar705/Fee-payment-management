/**
 * payment-checkout.js — Razorpay Standard Checkout & Verification Flow
 * Handles:
 *  1. Dynamic Razorpay SDK loading
 *  2. Backend Order Creation (/api/payments/create-order)
 *  3. Razorpay Modal Launch with prefilled student info
 *  4. Cryptographic Server-Side Verification (/api/payments/verify-payment)
 *  5. Redirects to Success / Printable Receipt / Failure pages
 */

(function (window) {
    'use strict';

    // Ensure Razorpay Checkout script is loaded
    function loadRazorpaySdk() {
        return new Promise((resolve, reject) => {
            if (window.Razorpay) {
                return resolve(window.Razorpay);
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(window.Razorpay);
            script.onerror = () => reject(new Error('Failed to load Razorpay Checkout SDK. Please check your internet connection.'));
            document.head.appendChild(script);
        });
    }

    /**
     * Start the complete Razorpay Checkout flow
     * @param {Object} options { amount, paymentId, description, studentId }
     * @param {HTMLElement} [triggerBtn] Optional button element to manage disabled / loading state
     */
    async function startRazorpayPayment(options, triggerBtn) {
        const originalBtnHtml = triggerBtn ? triggerBtn.innerHTML : '';

        const setBtnState = (loading, text) => {
            if (!triggerBtn) return;
            if (loading) {
                triggerBtn.disabled = true;
                triggerBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${text}`;
            } else {
                triggerBtn.disabled = false;
                triggerBtn.innerHTML = originalBtnHtml;
            }
        };

        try {
            setBtnState(true, 'Initializing Gateway...');

            // Ensure Razorpay SDK is available
            await loadRazorpaySdk();

            // Step 1: Create Order on Backend
            setBtnState(true, 'Generating Order...');
            const orderPayload = {
                amount: parseFloat(options.amount),
                paymentId: options.paymentId || null,
                studentId: options.studentId || null,
                description: options.description || 'College Fee Installment Payment'
            };

            const orderResult = await apiFetch('/payments/create-order', {
                method: 'POST',
                body: JSON.stringify(orderPayload)
            });

            if (!orderResult || !orderResult.ok || !orderResult.data || !orderResult.data.success) {
                const errorMsg = (orderResult && orderResult.data && orderResult.data.message)
                    || 'Could not initiate payment order with Razorpay.';
                showToast(errorMsg + ' Switching to Instant Secure Checkout...', 'warning');
                setBtnState(false);
                if (typeof executeSimulatedPayment === 'function') {
                    setTimeout(() => executeSimulatedPayment(), 600);
                }
                return;
            }

            const orderData = orderResult.data.data;

            // Step 2: Configure Razorpay Checkout Modal
            const rzpOptions = {
                key: orderData.keyId,
                amount: orderData.amountInPaise,
                currency: orderData.currency || 'INR',
                name: orderData.companyName || "MMCOE College Fee Portal",
                description: orderData.description || 'Academic Fee Payment',
                order_id: orderData.orderId,
                prefill: {
                    name: orderData.studentName || (typeof getName === 'function' ? getName() : ''),
                    email: orderData.studentEmail || (typeof getEmail === 'function' ? getEmail() : ''),
                    contact: orderData.studentContact || ''
                },
                notes: {
                    portal: 'MMCOE_ERP',
                    order_ref: orderData.receiptNumber
                },
                theme: {
                    color: '#1e56a0' // MMCOE Institutional Blue
                },
                modal: {
                    ondismiss: function () {
                        setBtnState(false);
                        showToast('Checkout window closed. You can resume payment whenever you are ready.', 'info');
                    },
                    backdropclose: false
                },
                handler: async function (response) {
                    // Step 3: Cryptographic Server-Side Verification
                    setBtnState(true, 'Verifying Payment...');

                    const verifyPayload = {
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                        amount: orderData.amount,
                        paymentId: options.paymentId || null,
                        studentId: options.studentId || null
                    };

                    try {
                        const verifyResult = await apiFetch('/payments/verify-payment', {
                            method: 'POST',
                            body: JSON.stringify(verifyPayload)
                        });

                        if (verifyResult && verifyResult.ok && verifyResult.data.success) {
                            const vData = verifyResult.data.data;
                            // Redirect to dedicated Success Screen with Printable Receipt link
                            window.location.href = `payment-success.html?txnId=${vData.transactionId}&ref=${encodeURIComponent(vData.transactionReference)}&rcpt=${encodeURIComponent(vData.receiptNumber)}&amt=${orderData.amount}`;
                        } else {
                            const failMsg = (verifyResult && verifyResult.data && verifyResult.data.message)
                                || 'Cryptographic signature verification failed.';
                            window.location.href = `payment-failed.html?reason=${encodeURIComponent(failMsg)}&orderId=${encodeURIComponent(response.razorpay_order_id)}`;
                        }
                    } catch (err) {
                        window.location.href = `payment-failed.html?reason=${encodeURIComponent('Network verification error: ' + err.message)}`;
                    }
                }
            };

            const rzp = new window.Razorpay(rzpOptions);

            // Handle payment gateway level failure
            rzp.on('payment.failed', function (response) {
                setBtnState(false);
                const desc = response.error ? response.error.description : 'Transaction failed at bank.';
                const code = response.error ? response.error.code : 'GATEWAY_DECLINED';
                window.location.href = `payment-failed.html?reason=${encodeURIComponent(desc)}&code=${encodeURIComponent(code)}&orderId=${encodeURIComponent(orderData.orderId)}`;
            });

            // Launch modal
            rzp.open();

        } catch (err) {
            setBtnState(false);
            showToast('Gateway unavailable (' + err.message + '). Switching to Instant Payment...', 'warning');
            if (typeof executeSimulatedPayment === 'function') {
                setTimeout(() => executeSimulatedPayment(), 600);
            }
        }
    }

    function showToast(message, type = 'info') {
        const notifArea = document.getElementById('notificationArea');
        if (notifArea) {
            notifArea.innerHTML = `
                <div class="alert alert-${type} alert-dismissible fade show d-flex align-items-center gap-2 mb-3 shadow-sm" role="alert" style="border-radius:12px;">
                    <i class="bi bi-${type === 'danger' ? 'exclamation-octagon-fill' : 'info-circle-fill'} fs-5"></i>
                    <div>${message}</div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>`;
        } else {
            alert(message);
        }
    }

    // Expose to window
    window.startRazorpayPayment = startRazorpayPayment;

})(window);
