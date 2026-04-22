# 🚀 Vercel Deployment Guide - Step by Step

## Complete Checklist for Production Deployment

This guide walks you through deploying the Breakfastclub Orders Portal to production.

---

## Step 1: Prepare Your GitHub Repository

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Production-ready orders portal"

# Create a new repo on GitHub and push
git remote add origin https://github.com/yourusername/breakfastclub-orders.git
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" → Choose "GitHub"
3. Authorize GitHub access
4. Create a team or use personal account

---

## Step 3: Create Vercel Project

1. Click "New Project"
2. Select your GitHub repository
3. Configure project:
   - **Framework Preset**: Other
   - **Build Command**: `npm install`
   - **Output Directory**: `.` (root)

4. Click "Deploy" (will fail due to missing env vars - expected)

---

## Step 4: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

### Add all variables from .env.example:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret
WA_PHONE_NUMBER_ID=1234567890
WA_ACCESS_TOKEN=your-whatsapp-token
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
SESSION_SECRET=your-super-secret-key-32-chars-min
NODE_ENV=production
```

**Important**: Mark all as "Sensitive" to prevent leaks in logs

---

## Step 5: Configure Frontend Environment Variables

Your frontend also needs these values. Two options:

### Option A: Inject via HTML Meta Tags (Recommended)
Add to Vercel Build Output Middleware:

Create `api/config.js`:
```javascript
export default async function handler(req, res) {
  return res.status(200).json({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
    API_BASE: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.API_BASE,
  });
}
```

Then in `orders.html`, add to `<head>`:
```html
<script>
  fetch('/api/config')
    .then(r => r.json())
    .then(cfg => {
      window.__BC_SUPABASE_URL__ = cfg.SUPABASE_URL;
      window.__BC_SUPABASE_ANON_KEY__ = cfg.SUPABASE_ANON_KEY;
      window.__BC_RAZORPAY_KEY_ID__ = cfg.RAZORPAY_KEY_ID;
      window.__BC_RECAPTCHA_SITE_KEY__ = cfg.RECAPTCHA_SITE_KEY;
      window.__BC_API_BASE__ = cfg.API_BASE;
    });
</script>
```

### Option B: Direct Configuration
Edit `orders.html` CONFIG object manually with your values.

---

## Step 6: Create Missing Supabase Tables

Execute in Supabase SQL Editor:

```sql
-- OTP Codes Table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  order_id VARCHAR(50),
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  UNIQUE(phone, code)
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_code ON otp_codes(phone, code);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders Cache Table
CREATE TABLE IF NOT EXISTS orders_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id VARCHAR(50) UNIQUE NOT NULL,
  order_name VARCHAR(50),
  customer_name VARCHAR(100),
  phone VARCHAR(20),
  status VARCHAR(50),
  fulfillment_status VARCHAR(50),
  financial_status VARCHAR(50),
  total_price DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  items JSONB,
  tracking_number VARCHAR(50),
  tracking_url TEXT,
  carrier VARCHAR(100),
  expected_delivery DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  cancel_reason VARCHAR(255),
  cancel_requested_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders_cache(phone);
CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders_cache(shopify_order_id);

-- Return Requests Table
CREATE TABLE IF NOT EXISTS aftersale_return_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(50),
  order_item_id UUID,
  reason VARCHAR(255),
  additional_info TEXT,
  product_images TEXT,
  contact_phone VARCHAR(20),
  pickup_address TEXT,
  payee_payment_method VARCHAR(50),
  payee_upi_id VARCHAR(100),
  payee_bank_account_no VARCHAR(20),
  payee_bank_ifsc VARCHAR(11),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Replacement Requests Table
CREATE TABLE IF NOT EXISTS aftersale_replacement_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(50),
  order_item_id UUID,
  reason VARCHAR(255),
  additional_info TEXT,
  product_images JSONB,
  contact_phone VARCHAR(20),
  pickup_address JSONB,
  replacement_product_id VARCHAR(50),
  price_difference DECIMAL(10, 2),
  payee_rzp_payment_id VARCHAR(100),
  payee_payment_method TEXT,
  payer_payment_method VARCHAR(50),
  payee_upi_id VARCHAR(100),
  payee_bank_account_no VARCHAR(20),
  payee_bank_ifsc VARCHAR(11),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security (Optional but recommended)
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE aftersale_return_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE aftersale_replacement_request ENABLE ROW LEVEL SECURITY;
```

---

## Step 7: Verify API Endpoints

After deployment, test each endpoint:

### Test Send OTP
```bash
curl -X POST https://your-vercel-domain.vercel.app/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "orderId": "TEST123",
    "recaptchaToken": "test"
  }'
```

### Test Verify OTP
```bash
curl -X POST https://your-vercel-domain.vercel.app/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "123456",
    "orderId": "TEST123"
  }'
```

---

## Step 8: Set Up Custom Domain

1. Go to Vercel Dashboard → Project Settings → Domains
2. Add your custom domain (e.g., `orders.breakfastclub.co.in`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate issuance (automatic)

---

## Step 9: Enable Monitoring & Logging

### Vercel Analytics
1. Go to Vercel Dashboard → Project
2. Enable "Analytics" tab
3. View performance metrics

### Error Tracking (Optional)
Set up Sentry for error tracking:

1. Create Sentry account at [sentry.io](https://sentry.io)
2. Create new project for Node.js
3. Add Sentry SDK to `package.json`:
```bash
npm install @sentry/node @sentry/tracing
```

4. Add to API functions:
```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

---

## Step 10: Set Up Uptime Monitoring

Add simple uptime check in Vercel:

Create `api/health.js`:
```javascript
export default function handler(req, res) {
  return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

Monitor with services like:
- [UptimeRobot](https://uptimerobot.com) (free)
- [Pingdom](https://www.pingdom.com)
- [Healthchecks.io](https://healthchecks.io)

---

## Troubleshooting Deployment

### Functions timing out
- Increase maxDuration in `vercel.json`
- Optimize database queries
- Use connection pooling

### Environment variables not loading
- Verify in Vercel dashboard Settings
- Check variable names match exactly
- Redeploy after adding new variables

### CORS errors
Add to API handlers:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') return res.status(200).end();
```

### WhatsApp messages not sending
- Verify template is approved
- Check phone number format
- Review Supabase logs

---

## 🎯 Verification Checklist

After deployment, verify:

- [ ] Frontend loads at your domain
- [ ] reCAPTCHA is active (look for badge)
- [ ] OTP sending works
- [ ] Session persists
- [ ] Orders display correctly
- [ ] Return/Replace requests work
- [ ] Razorpay payment works
- [ ] Mobile responsive
- [ ] Logout works

---

## 📊 Performance Tips

1. **Enable Gzip Compression** (auto on Vercel)
2. **Use CDN for static assets** (auto on Vercel)
3. **Cache database queries** in sessionStorage
4. **Lazy load images** (already implemented)
5. **Minimize API calls** with pagination

---

## 🔄 Continuous Deployment

Every time you push to `main`:
1. Vercel automatically deploys
2. Environment variables are used
3. Functions are updated
4. No manual steps needed

```bash
# To deploy changes:
git add .
git commit -m "Update: new feature"
git push origin main
# ✅ Automatically deployed to production
```

---

## 📞 Support & Resources

- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Razorpay Integration](https://razorpay.com/docs/)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/)

---

**Congratulations! Your portal is live! 🎉**
