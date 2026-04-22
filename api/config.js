/**
 * Vercel Serverless Function: Configuration Endpoint
 * GET /api/config
 * 
 * Returns public configuration for the frontend
 * Used to inject environment variables from server to client
 * 
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY (public, not service role)
 * - RAZORPAY_KEY_ID (public)
 * - RECAPTCHA_SITE_KEY (public)
 */

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Determine API base URL
  let apiBase = process.env.API_BASE || '';
  if (process.env.VERCEL_URL) {
    // Auto-detect Vercel deployment
    const protocol = process.env.VERCEL_ENV === 'production' ? 'https' : 'http';
    apiBase = `${protocol}://${process.env.VERCEL_URL}`;
  }

  const config = {
    // Supabase - public credentials only
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',

    // Razorpay - public key only
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',

    // reCAPTCHA - site key (public)
    RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY || '',

    // API base
    API_BASE: apiBase,

    // Version & environment info
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
  };

  // Validate critical config
  if (!config.SUPABASE_URL || !config.RAZORPAY_KEY_ID) {
    console.warn('Missing critical configuration', {
      hasSB: !!config.SUPABASE_URL,
      hasRZP: !!config.RAZORPAY_KEY_ID,
    });
  }

  return res.status(200).json(config);
}
