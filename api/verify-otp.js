const { createClient } = require('@supabase/supabase-js');

/**
 * Vercel Serverless Function: Verify OTP and Create Session
 * POST /api/verify-otp
 * 
 * Body: { phone, otp, orderId }
 * 
 * Returns: { success, customerId, customerName, phone, sessionToken }
 * 
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - SESSION_SECRET (for signing session tokens)
 */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple JWT-like session token generator
function generateSessionToken(phone, customerId) {
  if (!process.env.SESSION_SECRET) {
    console.warn('SESSION_SECRET not configured. Using basic token.');
    return Buffer.from(`${phone}:${Date.now()}`).toString('base64');
  }

  // In production, use a proper JWT library like jsonwebtoken
  // For now, create a simple verifiable token
  const timestamp = Date.now();
  const payload = `${phone}|${customerId}|${timestamp}`;
  const hash = require('crypto')
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(payload)
    .digest('hex');

  return `${payload}|${hash}`;
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, otp, orderId } = req.body;

  // Validate input
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Missing phone or OTP' });
  }

  try {
    // 1. Query OTP from Supabase
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', otp)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log('OTP verification failed:', error?.message || 'No valid OTP found');
      return res.status(400).json({
        error: 'Invalid or expired OTP. Please request a new one.',
        success: false,
      });
    }

    // 2. Mark OTP as used
    await supabase.from('otp_codes').update({ used_at: new Date().toISOString() }).eq('id', data.id);

    // 3. Get or create customer in orders_cache or customer table
    let customerId = `CUST_${phone.replace(/\D/g, '').slice(-10)}`;
    let customerName = 'Customer';

    // Try to fetch customer details from a customer table if it exists
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, name')
        .eq('phone', phone)
        .single();

      if (customerData) {
        customerId = customerData.id;
        customerName = customerData.name || 'Customer';
      }
    } catch (e) {
      console.log('Customer lookup skipped (table may not exist)');
    }

    // 4. Generate session token
    const sessionToken = generateSessionToken(phone, customerId);

    // 5. Return session data
    return res.status(200).json({
      success: true,
      customerId,
      customerName,
      phone,
      sessionToken,
      expiresIn: 86400 * 30, // 30 days in seconds
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to verify OTP',
      success: false,
    });
  }
}
