/**
 * Vercel Serverless Function: Health Check
 * GET /api/health
 * 
 * Simple endpoint to verify the API is running
 * Useful for uptime monitoring
 */

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    status: 'ok',
    service: 'Breakfastclub Orders API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    region: process.env.VERCEL_REGION || 'unknown',
  });
}
