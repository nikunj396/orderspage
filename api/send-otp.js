const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

/**
 * Vercel Serverless Function: Send OTP via WhatsApp & Verify reCAPTCHA
 * POST /api/send-otp
 * 
 * Body: { phone, orderId, recaptchaToken }
 * 
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - RECAPTCHA_SECRET_KEY
 * - WA_PHONE_NUMBER_ID (Meta WhatsApp Business Account Phone Number ID)
 * - WA_ACCESS_TOKEN (Meta WhatsApp Access Token)
 */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, orderId, recaptchaToken } = req.body;

  // Validate input
  if (!phone || !orderId) {
    return res.status(400).json({ error: 'Missing phone or orderId' });
  }

  try {
    // 1. Verify reCAPTCHA
    if (recaptchaToken && process.env.RECAPTCHA_SECRET_KEY) {
      const captchaRes = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
      );

      if (!captchaRes.data.success || (captchaRes.data.score && captchaRes.data.score < 0.5)) {
        return res.status(403).json({ error: 'reCAPTCHA verification failed. Bot detected.' });
      }
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes expiry

    // 3. Store OTP in Supabase
    const { error: insertError } = await supabase.from('otp_codes').insert({
      phone,
      order_id: orderId,
      code: otp,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('OTP insert error:', insertError);
      return res.status(500).json({ error: 'Failed to generate OTP' });
    }

    // 4. Send WhatsApp Message via Meta Cloud API
    try {
      if (!process.env.WA_PHONE_NUMBER_ID || !process.env.WA_ACCESS_TOKEN) {
        console.warn('WhatsApp credentials not configured. OTP stored but message not sent.');
        return res.status(200).json({
          success: true,
          message: 'OTP generated (WhatsApp delivery skipped - credentials missing)',
          _debug: process.env.NODE_ENV === 'development',
        });
      }

      const waResponse = await axios.post(
        `https://graph.instagram.com/v18.0/${process.env.WA_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'template',
          template: {
            name: 'otp_verification', // Must be an approved template in your Meta account
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: otp },
                ],
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('WhatsApp message sent:', waResponse.data.messages?.[0]?.id);

      return res.status(200).json({
        success: true,
        message: 'OTP sent to WhatsApp',
        messageId: waResponse.data.messages?.[0]?.id,
      });
    } catch (waError) {
      console.error('WhatsApp API error:', waError.response?.data || waError.message);

      // Even if WhatsApp fails, OTP is stored in DB
      // Return success but note the delivery issue
      return res.status(200).json({
        success: true,
        message: 'OTP generated but WhatsApp delivery failed. Please try again or contact support.',
        error: waError.response?.data?.error?.message || 'WhatsApp delivery failed',
      });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to send OTP',
    });
  }
}
