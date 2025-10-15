// File: netlify/functions/create-payment.js
// Creates a Stripe Checkout Session for $4.99

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
        const { amount, currency = 'usd', successUrl, cancelUrl } = JSON.parse(event.body);

        // Validate amount ($4.99 = 499 cents)
        if (amount !== 499) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid amount' })
            };
        }

        // Get the actual domain from the request
        const domain = successUrl.split('?')[0];

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency,
                        product_data: {
                            name: 'AI Passport Photo',
                            description: 'Professional passport photo with AI enhancement',
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${domain}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${domain}?payment=cancelled`,
            metadata: {
                product: 'passport_photo',
                version: '1.0'
            }
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                sessionId: session.id,
                url: session.url
            })
        };

    } catch (error) {
        console.error('Payment creation error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Payment creation failed',
                message: error.message 
            })
        };
    }
};
