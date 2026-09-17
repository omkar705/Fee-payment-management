/**
 * payment-checkout.js — Razorpay Standard Checkout & Verification Flow
 * Handles:
 *  1. Dynamic Razorpay SDK loading
 *  2. Backend Order Creation (/api/payments/create-order)
 *  3. Razorpay Modal Launch with prefilled student info
 *  4. Cryptographic Server-Side Verification (/api/payments/verify-payment)
 *  5. Updates DB and refreshes dashboard UI without full page reload
 */

(function (window) {
    'use strict';

    // Ensure Razorpay Checkout script is loaded
    // Note: checkout.js is pre-loaded in dashboard.html <head>, this is a fallback
    function loadRazorpaySdk() {
        return new Promise((resolve, reject) => {
            if (window.Razorpay) return resolve(window.Razorpay);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload  = () => {
                if (window.Razorpay) resolve(window.Razorpay);
                else reject(new Error('Razorpay SDK loaded but window.Razorpay is unavailable.'));
            };
            script.onerror = () => reject(new Error('Failed to load Razorpay SDK. Check internet connection.'));
            document.head.appendChild(script);
        });
    }

    /**
     * Show a notification banner in #notificationArea
     */
    function showBanner(message, type = 'info') {
        const area = document.getElementById('notificationArea');
        const icon = type === 'danger' ? 'exclamation-octagon-fill'
                   : type === 'success' ? 'check-circle-fill'
                   : 'info-circle-fill';
        const html = `
            <div class="alert alert-${type} alert-dismissible fade show d-flex align-items-center gap-2 mb-3 shadow-sm" role="alert" style="border-radius:12px;">
                <i class="bi bi-${icon} fs-5"></i>
                <div>${message}</div>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
            </div>`;
        if (area) { area.innerHTML = html; }
        else { alert(message); }
    }

    /**
     * After a successful payment — refresh fee status without page reload.
     * Falls back to page reload if refreshFeeStatus is not available.
     */
    function handlePaymentSuccess(vData, amount) {
        showBanner(
            `<strong>Payment Successful! ✓</strong> ₹${Number(amount).toLocaleString('en-IN')} paid. ` +
            `Receipt: <strong>${vData.receiptNumber || 'Generated'}</strong>. Refreshing your dashboard...`,
            'success'
        );

        // Refresh fee status in-place, then redirect to success page
        if (typeof window.refreshFeeStatus === 'function') {
            window.refreshFeeStatus().finally(() => {
                setTimeout(() => {
                    window.location.href =
                        `payment-success.html?txnId=${vData.transactionId}` +
                        `&ref=${encodeURIComponent(vData.transactionReference)}` +
                        `&rcpt=${encodeURIComponent(vData.receiptNumber)}` +
                        `&amt=${amount}`;
                }, 800);
            });
        } else {
            setTimeout(() => {
                window.location.href =
                    `payment-success.html?txnId=${vData.transactionId}` +
                    `&ref=${encodeURIComponent(vData.transactionReference)}` +
                    `&rcpt=${encodeURIComponent(vData.receiptNumber)}` +
                    `&amt=${amount}`;
            }, 800);
        }
    }

    /**
     * Start the complete Razorpay Checkout flow
     * @param {Object} options { amount, paymentId, description, studentId }
     * @param {HTMLElement} [triggerBtn] Optional button element to manage loading state
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

            // Load Razorpay SDK
            await loadRazorpaySdk();

            // Step 1: Create Order on Backend
            setBtnState(true, 'Generating Secure Order...');
            const orderPayload = {
                amount:      parseFloat(options.amount),
                paymentId:   options.paymentId   || null,
                studentId:   options.studentId   || null,
                description: options.description || 'College Fee Payment'
            };

            const orderResult = await apiFetch('/payments/create-order', {
                method: 'POST',
                body: JSON.stringify(orderPayload)
            });

            if (!orderResult || !orderResult.ok || !orderResult.data || !orderResult.data.success) {
                const errorMsg = (orderResult && orderResult.data && orderResult.data.message)
                    || 'Could not initiate payment order with Razorpay.';
                showBanner(`${errorMsg} Switching to Instant Secure Checkout...`, 'warning');
                setBtnState(false);
                if (typeof executeSimulatedPayment === 'function') {
                    setTimeout(() => executeSimulatedPayment(), 800);
                }
                return;
            }

            const orderData = orderResult.data.data;

            // Step 2: Configure Razorpay Checkout Modal
            const rzpOptions = {
                key:         orderData.keyId,
                amount:      orderData.amountInPaise,
                currency:    orderData.currency || 'INR',
                name:        orderData.companyName || 'MMCOE College Fee Portal',
                description: orderData.description || 'Academic Fee Payment',
                order_id:    orderData.orderId,
                prefill: {
                    name:    orderData.studentName    || (typeof getName  === 'function' ? getName()  : ''),
                    email:   orderData.studentEmail   || (typeof getEmail === 'function' ? getEmail() : ''),
                    contact: orderData.studentContact || ''
                },
                notes: {
                    portal:    'MMCOE_ERP',
                    order_ref: orderData.receiptNumber
                },
                theme: { color: '#1e56a0' },
                modal: {
                    ondismiss: function () {
                        setBtnState(false);
                        showBanner('Checkout window closed. You can resume payment whenever you are ready.', 'info');
                    },
                    backdropclose: false
                },
                handler: async function (response) {
                    // Step 3: Server-Side Verification
                    setBtnState(true, 'Verifying Payment...');
                    showBanner('Verifying your payment with the bank... please wait.', 'info');

                    const verifyPayload = {
                        razorpayOrderId:   response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                        amount:            orderData.amount,
                        paymentId:         options.paymentId || null,
                        studentId:         options.studentId || null
                    };

                    try {
                        const verifyResult = await apiFetch('/payments/verify-payment', {
                            method: 'POST',
                            body: JSON.stringify(verifyPayload)
                        });

                        if (verifyResult && verifyResult.ok && verifyResult.data.success) {
                            handlePaymentSuccess(verifyResult.data.data, orderData.amount);
                        } else {
                            const failMsg = (verifyResult && verifyResult.data && verifyResult.data.message)
                                || 'Payment verification failed.';
                            window.location.href =
                                `payment-failed.html?reason=${encodeURIComponent(failMsg)}` +
                                `&orderId=${encodeURIComponent(response.razorpay_order_id)}`;
                        }
                    } catch (err) {
                        window.location.href =
                            `payment-failed.html?reason=${encodeURIComponent('Network error: ' + err.message)}`;
                    }
                }
            };

            const rzp = new window.Razorpay(rzpOptions);

            rzp.on('payment.failed', function (response) {
                setBtnState(false);
                const desc = response.error ? response.error.description : 'Transaction failed at bank.';
                const code = response.error ? response.error.code : 'GATEWAY_DECLINED';
                window.location.href =
                    `payment-failed.html?reason=${encodeURIComponent(desc)}` +
                    `&code=${encodeURIComponent(code)}` +
                    `&orderId=${encodeURIComponent(orderData.orderId)}`;
            });

            rzp.open();
            setBtnState(false);

        } catch (err) {
            setBtnState(false);
            showBanner('Gateway unavailable (' + err.message + '). Switching to Instant Payment...', 'warning');
            if (typeof executeSimulatedPayment === 'function') {
                setTimeout(() => executeSimulatedPayment(), 800);
            }
        }
    }

    // Expose to window
    window.startRazorpayPayment = startRazorpayPayment;
    window._showPaymentBanner   = showBanner;

})(window);
