const { createClient } = require('@supabase/supabase-js');

/**
 * Vercel Serverless Function: Cancel Order
 * POST /api/cancel-order
 * 
 * Body: { orderId, orderName, reason, sessionToken }
 * 
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, orderName, reason, sessionToken } = req.body;

  if (!orderId && !orderName) {
    return res.status(400).json({ error: 'Missing orderId or orderName' });
  }

  try {
    // Update order status to cancelled
    const { error } = await supabase
      .from('orders_cache')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        cancel_reason: reason,
        cancel_requested_at: new Date().toISOString(),
      })
      .or(`shopify_order_id.eq.${orderId},order_name.eq.${orderName}`);

    if (error) {
      console.error('Cancel order error:', error);
      return res.status(500).json({ error: 'Failed to cancel order' });
    }

    // Log cancellation for audit
    try {
      await supabase.from('order_cancellations').insert({
        order_id: orderId,
        order_name: orderName,
        reason,
        cancelled_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.warn('Failed to log cancellation:', logError);
    }

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to cancel order',
    });
  }
}
