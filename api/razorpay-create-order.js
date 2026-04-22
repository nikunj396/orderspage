const axios = require('axios');

/**
 * Vercel Serverless Function: Create Razorpay Order
 * POST /api/razorpay/create-order
 * 
 * Body: { amount, currency }
 * Returns: { id, amount, currency }
 * 
 * Environment Variables Required:
 * - RAZORPAY_KEY_ID
 * - RAZORPAY_KEY_SECRET
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, currency = 'INR' } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Missing amount' });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: 'Razorpay credentials not configured' });
  }

  try {
    const response = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount: Math.round(amount), // amount in paise
        currency,
        receipt: `order_${Date.now()}`,
        notes: {
          created_at: new Date().toISOString(),
        },
      },
      {
        auth: {
          username: process.env.RAZORPAY_KEY_ID,
          password: process.env.RAZORPAY_KEY_SECRET,
        },
      }
    );

    return res.status(200).json({
      id: response.data.id,
      amount: response.data.amount,
      currency: response.data.currency,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.description || 'Failed to create payment order',
    });
  }
}
