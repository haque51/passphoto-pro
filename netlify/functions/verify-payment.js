// File: netlify/functions/verify-payment.js
// Verifies that a Stripe payment was completed successfully

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { sessionId } = JSON.parse(event.body);

        if (!sessionId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Session ID required' })
            };
        }

        // Retrieve the Checkout Session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // Check if payment was successful
        const verified = session.payment_status === 'paid';
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                verified,
                paymentStatus: session.payment_status,
                amount: session.amount_total,
                currency: session.currency,
                customerEmail: session.customer_details?.email || null
            })
        };

    } catch (error) {
        console.error('Payment verification error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Verification failed',
                message: error.message 
            })
        };
    }
};
