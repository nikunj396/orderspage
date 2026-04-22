# Breakfastclub Orders Portal - Production Deployment Guide

## 📋 Overview

This is a production-ready orders management portal built with:
- **Frontend**: HTML5 + Tailwind CSS + Vanilla JavaScript
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Razorpay
- **Messaging**: WhatsApp (Meta Cloud API)
- **Security**: reCAPTCHA v3, JWT Session Tokens

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (for local development)
- Vercel account (free tier is sufficient)
- Supabase account (free tier included)
- Razorpay account
- Meta Business account (for WhatsApp)

### 1. Clone & Setup Locally

```bash
# Clone your repository
git clone <your-repo-url>
cd orders

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit with your credentials
nano .env.local  # or use your editor
```

### 2. Configure Services

#### A. Supabase Setup

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your **Project URL** and **Service Role Key** to `.env.local`
4. Create these tables:

```sql
-- OTP Codes Table
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  order_id VARCHAR(50),
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  UNIQUE(phone, code)
);

CREATE INDEX idx_otp_phone_code ON otp_codes(phone, code);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- Customers Table (optional, for customer profiles)
CREATE TABLE customers (
  id VARCHAR(50) PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders Cache Table
CREATE TABLE orders_cache (
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

CREATE INDEX idx_orders_phone ON orders_cache(phone);
CREATE INDEX idx_orders_shopify_id ON orders_cache(shopify_order_id);
```

#### B. reCAPTCHA v3 Setup

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Create a new site for reCAPTCHA v3
3. Add your domain (e.g., `yourdomain.com`)
4. Copy **Site Key** and **Secret Key** to `.env.local`

#### C. Razorpay Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Go to Settings → API Keys
3. Copy **Key ID** and **Key Secret** to `.env.local`
4. Add your domain to allowed domains in Razorpay dashboard

#### D. WhatsApp Setup (Meta Cloud API)

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a Business Account and WhatsApp Business Account
3. Get your **Phone Number ID** and **Access Token**
4. Create an OTP template in your WhatsApp Business Account:
   - Template Name: `otp_verification`
   - Content: `Your OTP is {{1}}. Valid for 5 minutes.`
   - Wait for approval
5. Add credentials to `.env.local`

### 3. Local Development

```bash
# Start Vercel dev server (emulates serverless functions)
npm run dev

# In another terminal, serve the static files
npx serve .

# Visit http://localhost:3000
```

### 4. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Add environment variables via Vercel dashboard
# Settings → Environment Variables
```

#### Option B: GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" → Select your repository
4. Add environment variables in Settings
5. Deploy automatically

## 📦 Project Structure

```
orders/
├── orders.html           # Main frontend (SPA)
├── api/
│   ├── send-otp.js       # Send OTP via WhatsApp + reCAPTCHA verify
│   ├── verify-otp.js     # Verify OTP and create session
│   ├── cancel-order.js   # Cancel order endpoint
│   └── razorpay-create-order.js  # Razorpay order creation
├── package.json          # Node dependencies
├── vercel.json           # Vercel config
├── .env.example          # Environment template
└── README.md             # This file
```

## 🔐 Security Best Practices

1. **API Keys**: Never commit `.env.local`. Use Vercel's environment variables.
2. **reCAPTCHA**: Verify on backend (done in `send-otp.js`)
3. **Session Tokens**: Signed with SESSION_SECRET
4. **CORS**: Configure if needed in API handlers
5. **Rate Limiting**: Consider adding rate limiting middleware
6. **HTTPS**: Always use HTTPS in production (Vercel auto-enables)

## 📊 Database Schema Notes

- `otp_codes`: Auto-expires after 5 minutes
- `orders_cache`: Sync with Shopify daily (webhooks recommended)
- `customers`: Optional customer management

## 🔧 API Endpoints

### POST `/api/send-otp`
Send OTP via WhatsApp

**Request:**
```json
{
  "phone": "+919876543210",
  "orderId": "ORD123456",
  "recaptchaToken": "token_from_grecaptcha"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to WhatsApp",
  "messageId": "wamid.xxxxx"
}
```

### POST `/api/verify-otp`
Verify OTP and create session

**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "123456",
  "orderId": "ORD123456"
}
```

**Response:**
```json
{
  "success": true,
  "customerId": "CUST_9876543210",
  "customerName": "John Doe",
  "phone": "+919876543210",
  "sessionToken": "eyJ....",
  "expiresIn": 2592000
}
```

### POST `/api/razorpay/create-order`
Create Razorpay order

**Request:**
```json
{
  "amount": 500.00,
  "currency": "INR"
}
```

**Response:**
```json
{
  "id": "order_xyz",
  "amount": 50000,
  "currency": "INR"
}
```

## 🐛 Troubleshooting

### OTP not being sent
- Check WhatsApp template is approved
- Verify WA_PHONE_NUMBER_ID and WA_ACCESS_TOKEN
- Check Supabase connection

### Payment not working
- Verify Razorpay keys
- Check browser console for errors
- Ensure RAZORPAY_KEY_ID is correct (public key)

### Session not persisting
- Check SESSION_SECRET is set
- Verify sessionStorage is enabled
- Check browser console for errors

## 📈 Monitoring & Logs

- **Vercel**: Logs available in Vercel dashboard → Functions
- **Supabase**: Logs in SQL Editor & API Logs
- **Browser**: Open DevTools (F12) for frontend errors

## 🚢 Production Checklist

- [ ] All environment variables set in Vercel
- [ ] Supabase backups enabled
- [ ] Razorpay in production mode (not test)
- [ ] WhatsApp template approved
- [ ] reCAPTCHA keys for your domain
- [ ] Custom domain configured
- [ ] SSL certificate enabled (auto on Vercel)
- [ ] Monitoring & alerts set up
- [ ] Error logging configured (Sentry, LogRocket, etc.)

## 📝 License

MIT License - Feel free to use and modify

## 💬 Support

For issues:
1. Check logs in Vercel dashboard
2. Check Supabase error messages
3. Review environment variable configuration
4. Check browser DevTools console

---

**Happy Deploying! 🎉**
