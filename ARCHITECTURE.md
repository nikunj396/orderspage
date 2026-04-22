# 🏗️ Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            orders.html (SPA)                             │   │
│  │  ┌─ Login        ┌─ Dashboard    ┌─ Orders             │   │
│  │  │  • OTP        │  • Session    │  • Track            │   │
│  │  │  • reCAPTCHA  │  • Orders     │  • Return           │   │
│  │  │               │  • Returns    │  • Replace          │   │
│  │  │               │  • Support    │  • Cancel           │   │
│  │  └───────────────┴────────────────┴────────────────────│   │
│  │                                                          │   │
│  │  Supabase JS SDK ──────────────────────┐               │   │
│  │  Razorpay SDK ─────────────────────────┼─────┐         │   │
│  │  reCAPTCHA v3 ─────────────────────────┼─────┼─┐       │   │
│  └──────────────────────────────────────────┼─────┼─┼───────┘   │
│                                              │     │ │            │
│  HTTPS                                       │     │ │            │
├──────────────────────────────────────────────┼─────┼─┼────────────┤
│                      VERCEL EDGE                  │ │ │            │
│                                                  │ │ │            │
└──────────────────────────────────────────────────┼─┼─┼────────────┘
                                                   │ │ │
        ┌──────────────────────────────────────────┘ │ │
        │                                             │ │
        ▼                                             │ │
┌─────────────────────────────────────┐               │ │
│  VERCEL SERVERLESS FUNCTIONS        │               │ │
│  ┌─────────────────────────────────┐│               │ │
│  │ /api/send-otp                   ││               │ │
│  │ • Verify reCAPTCHA              ││               │ │
│  │ • Generate OTP                  ││               │ │
│  │ • Store in DB                   ││               │ │
│  │ • Send WhatsApp                 ││               │ │
│  └─────────────────────────────────┘│               │ │
│  ┌─────────────────────────────────┐│               │ │
│  │ /api/verify-otp                 ││               │ │
│  │ • Check OTP valid               ││               │ │
│  │ • Generate session token        ││               │ │
│  │ • Return customer info          ││               │ │
│  └─────────────────────────────────┘│               │ │
│  ┌─────────────────────────────────┐│               │ │
│  │ /api/cancel-order               ││               │ │
│  │ • Update order status           ││               │ │
│  │ • Log cancellation              ││               │ │
│  └─────────────────────────────────┘│               │ │
│  ┌─────────────────────────────────┐│               │ │
│  │ /api/razorpay/create-order      ││───────────────┘ │
│  │ • Create payment order          ││                 │
│  │ • Return order details          ││                 │
│  └─────────────────────────────────┘│                 │
│  ┌─────────────────────────────────┐│                 │
│  │ /api/config                     ││─────────────────┘
│  │ • Return frontend config        ││
│  │ • Inject env variables          ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ /api/health                     ││
│  │ • Return service status         ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
         │         │          │
         │         │          │
   ┌─────▼──┐  ┌───▼────┐  ┌──▼─────┐
   │Supabase│  │Razorpay│  │WhatsApp│
   │Database│  │API     │  │Meta API│
   │        │  │        │  │        │
   │• OTP   │  │• Order │  │• Send  │
   │• Orders│  │• Pay   │  │• OTP   │
   │• Users │  │• Refund│  │  MSG   │
   └────────┘  └────────┘  └────────┘
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                USER LOGIN FLOW                          │
└─────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │    USER      │
  │  BROWSER     │
  └──────┬───────┘
         │
         │ 1. Enter phone & order ID
         ▼
  ┌──────────────────────┐
  │   Frontend          │
  │ Validation          │
  │ reCAPTCHA Ready     │
  └──────┬───────────────┘
         │
         │ 2. Get reCAPTCHA token
         ▼
  ┌──────────────────────┐
  │  Google reCAPTCHA    │
  │  v3                  │
  │ (Score Check)        │
  └──────┬───────────────┘
         │ Token
         │
         │ 3. POST /api/send-otp
         │    { phone, orderId, token }
         ▼
  ┌──────────────────────────────────────┐
  │  Vercel Function: send-otp          │
  │  ✓ Verify reCAPTCHA score           │
  │  ✓ Generate 6-digit OTP             │
  │  ✓ Store in Supabase (5min expiry)  │
  │  ✓ Send via WhatsApp                │
  └──────┬───────────────────────────────┘
         │
         │ 4. Response: { success: true }
         ▼
  ┌──────────────────────┐
  │   User Phone         │
  │   Receives OTP       │
  │   via WhatsApp       │
  │   "Your OTP: 123456" │
  └──────┬───────────────┘
         │
         │ 5. Enter OTP in form
         ▼
  ┌──────────────────────┐
  │   Frontend          │
  │ Submit OTP          │
  │ POST /api/verify-otp│
  └──────┬───────────────┘
         │
         │ 6. { phone, otp, orderId }
         ▼
  ┌──────────────────────────────────────┐
  │ Vercel Function: verify-otp         │
  │ ✓ Check OTP valid & not expired     │
  │ ✓ Mark OTP as used                  │
  │ ✓ Generate session token            │
  │ ✓ Return customer info              │
  └──────┬───────────────────────────────┘
         │
         │ 7. { customerId, sessionToken, ... }
         ▼
  ┌──────────────────────┐
  │   Frontend          │
  │ Save to sessionStore│
  │ Load Dashboard      │
  │ Show Orders         │
  └──────────────────────┘
```

---

## Order Return Flow

```
┌─────────────────────────────────────────────────────────┐
│            ORDER RETURN REQUEST FLOW                    │
└─────────────────────────────────────────────────────────┘

  ┌──────────────┐
  │   CUSTOMER   │
  │   Sees Order │
  └──────┬───────┘
         │ Click "Return"
         │ (Within 3 days of delivery)
         ▼
  ┌──────────────────────────────────────┐
  │       Return Modal Opens             │
  │  ┌─────────────────────────────────┐ │
  │  │ • Product preview               │ │
  │  │ • Select return reason          │ │
  │  │ • Upload photos (drag & drop)   │ │
  │  │ • Enter details                 │ │
  │  │ • Contact phone                 │ │
  │  │ • Pickup address                │ │
  │  │ • Refund method (UPI/Bank)      │ │
  │  │ • Confirm conditions            │ │
  │  └─────────────────────────────────┘ │
  └──────┬───────────────────────────────┘
         │
         │ Upload images
         ▼
  ┌──────────────────────┐
  │  Supabase Storage    │
  │  (Images)            │
  │  Get public URLs     │
  └──────┬───────────────┘
         │
         │ Submit form
         ▼
  ┌──────────────────────────────────────┐
  │    Frontend Processing               │
  │  • Validate all fields               │
  │  • Get image URLs                    │
  │  • Collect form data                 │
  └──────┬───────────────────────────────┘
         │
         │ Submit via Supabase
         │ INSERT into aftersale_return_request
         ▼
  ┌──────────────────────┐
  │  Supabase Database   │
  │  aftersale_return_   │
  │  request table       │
  │  Row created ✓       │
  └──────┬───────────────┘
         │
         │ Success response
         ▼
  ┌──────────────────────────────────────┐
  │    Frontend Shows Success            │
  │  ┌─────────────────────────────────┐ │
  │  │  ✓ Return Submitted!            │ │
  │  │                                 │ │
  │  │  Our team will contact you      │ │
  │  │  within 48 hours.               │ │
  │  │  [Close]                        │ │
  │  └─────────────────────────────────┘ │
  └──────┬───────────────────────────────┘
         │
         │ Background: Notify admin
         ▼
  ┌──────────────────────────────────────┐
  │   Admin Panel / Email Notification   │
  │   New return request received        │
  │   • Customer: +91XXXXXXXXXX          │
  │   • Order: #ORD123                   │
  │   • Reason: Damaged item             │
  │   • Images: [links]                  │
  │   [Review Request]                   │
  └──────────────────────────────────────┘
```

---

## Replacement with Price Difference

```
┌─────────────────────────────────────────────────────────┐
│     REPLACEMENT WITH UPGRADE (Price Difference)         │
└─────────────────────────────────────────────────────────┘

  Customer clicks "Replace" on ₹500 item
         │
         ▼
  ┌──────────────────────────────────────┐
  │  Replace Modal Opens                 │
  │  ┌─────────────────────────────────┐ │
  │  │ Current product: ₹500            │ │
  │  │ Replacement type:                │ │
  │  │  ○ Same product                  │ │
  │  │  ○ Different product    [SELECT] │ │
  │  └─────────────────────────────────┘ │
  └──────┬───────────────────────────────┘
         │ Choose "Different product"
         ▼
  ┌──────────────────────────────────────┐
  │  Product Selection Dropdown          │
  │  • Item A - ₹400                     │
  │  • Item B - ₹600  ◄─ SELECTED       │
  │  • Item C - ₹700                     │
  └──────┬───────────────────────────────┘
         │
         │ Item B = ₹600, Current = ₹500
         │ Difference = ₹100 (upgrade)
         ▼
  ┌──────────────────────────────────────┐
  │  Price Calculation                   │
  │  New: ₹600                           │
  │  Original: ₹500                      │
  │  ─────────────────                   │
  │  Additional: ₹100                    │
  │  Banner: "Payment required: ₹100"    │
  └──────┬───────────────────────────────┘
         │
         │ Click "Pay ₹100 with Razorpay"
         ▼
  ┌──────────────────────────────────────┐
  │  Frontend → Backend                  │
  │  POST /api/razorpay/create-order     │
  │  { amount: 100, currency: "INR" }    │
  └──────┬───────────────────────────────┘
         │
         │ Returns: { id: order_xyz, ... }
         ▼
  ┌──────────────────────────────────────┐
  │  Open Razorpay Checkout              │
  │  ┌─────────────────────────────────┐ │
  │  │  Razorpay Payment Gateway       │ │
  │  │                                 │ │
  │  │  Amount: ₹100                   │ │
  │  │  [Card] [UPI] [Wallet]          │ │
  │  │                                 │ │
  │  │  Customer: +91XXXXXXXXXX        │ │
  │  │                                 │ │
  │  │  [Pay Securely]                 │ │
  │  └─────────────────────────────────┘ │
  └──────┬───────────────────────────────┘
         │
         │ Payment successful
         │ callback: { razorpay_payment_id: ... }
         ▼
  ┌──────────────────────────────────────┐
  │  Show Payment Success Badge          │
  │  ✓ Payment successful                │
  │  ID: pay_XXXXXXXXX                   │
  │                                      │
  │  Now fill remaining details          │
  └──────┬───────────────────────────────┘
         │ Upload images, reason, address, etc.
         ▼
  ┌──────────────────────────────────────┐
  │  Frontend Submits Complete Request   │
  │  INSERT into replacement_request     │
  │  { payment_id, product_id, ... }     │
  └──────┬───────────────────────────────┘
         │
         ▼
  ┌──────────────────────────────────────┐
  │  ✓ Replacement Submitted!            │
  │  New item: Item B (₹600)             │
  │  Payment received: ₹100              │
  │  Status: Pending pickup              │
  └──────────────────────────────────────┘
```

---

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────┐
│                SUPABASE DATABASE                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────┐
│   otp_codes         │  (Auto-expires after 5 min)
├─────────────────────┤
│ id (UUID)           │
│ phone VARCHAR(20)   │◄─ Foreign key
│ order_id VARCHAR    │
│ code VARCHAR(6)     │
│ expires_at TIMESTAMP│
│ used_at TIMESTAMP   │
│ created_at TIMESTAMP│
└─────────────────────┘

┌─────────────────────────────────────┐
│   customers                         │
├─────────────────────────────────────┤
│ id VARCHAR(50) PRIMARY KEY          │
│ phone VARCHAR(20) UNIQUE            │
│ name VARCHAR(100)                   │
│ email VARCHAR(100)                  │
│ created_at TIMESTAMP                │
│ updated_at TIMESTAMP                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   orders_cache                      │  (Synced from Shopify)
├─────────────────────────────────────┤
│ id (UUID)                           │
│ shopify_order_id VARCHAR UNIQUE     │
│ order_name VARCHAR                  │
│ customer_name VARCHAR               │
│ phone VARCHAR(20)◄─ Foreign key    │
│ status VARCHAR                      │
│ fulfillment_status VARCHAR          │
│ financial_status VARCHAR            │
│ total_price DECIMAL                 │
│ items JSONB                         │
│ tracking_number VARCHAR             │
│ tracking_url TEXT                   │
│ carrier VARCHAR                     │
│ expected_delivery DATE              │
│ created_at TIMESTAMP                │
│ updated_at TIMESTAMP                │
│ cancel_reason VARCHAR               │
│ cancel_requested_at TIMESTAMP       │
└─────────────────────────────────────┘

┌──────────────────────────────────────┐
│   aftersale_return_request          │
├──────────────────────────────────────┤
│ id (UUID)                            │
│ customer_id VARCHAR◄─ Foreign key   │
│ order_item_id UUID◄─ From orders    │
│ reason VARCHAR(255)                  │
│ additional_info TEXT                 │
│ product_images TEXT (comma-sep URLs) │
│ contact_phone VARCHAR(20)            │
│ pickup_address TEXT                  │
│ payee_payment_method VARCHAR         │
│ payee_upi_id VARCHAR                 │
│ payee_bank_account_no VARCHAR        │
│ payee_bank_ifsc VARCHAR              │
│ status VARCHAR (pending/approved)    │
│ created_at TIMESTAMP                 │
│ updated_at TIMESTAMP                 │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   aftersale_replacement_request     │
├──────────────────────────────────────┤
│ id (UUID)                            │
│ customer_id VARCHAR◄─ Foreign key   │
│ order_item_id UUID◄─ From orders    │
│ reason VARCHAR(255)                  │
│ additional_info TEXT                 │
│ product_images JSONB (array of URLs) │
│ contact_phone VARCHAR(20)            │
│ pickup_address JSONB                 │
│ replacement_product_id VARCHAR       │
│ price_difference DECIMAL             │
│ payee_rzp_payment_id VARCHAR         │
│ payee_payment_method TEXT            │
│ payer_payment_method VARCHAR         │
│ status VARCHAR (pending/approved)    │
│ created_at TIMESTAMP                 │
│ updated_at TIMESTAMP                 │
└──────────────────────────────────────┘
```

---

## API Request/Response Flow

```
┌─────────────────────────────────────────────────────┐
│              SEND OTP REQUEST                       │
└─────────────────────────────────────────────────────┘

REQUEST:
POST /api/send-otp
Content-Type: application/json

{
  "phone": "+919876543210",
  "orderId": "ORD123456",
  "recaptchaToken": "03AOJjzqb_...[very long token]"
}

BACKEND PROCESSING:
1. Verify reCAPTCHA with Google
   GET https://www.google.com/recaptcha/api/siteverify
   
2. Generate OTP: 123456
   
3. Store in Supabase:
   INSERT INTO otp_codes (phone, code, expires_at, ...)
   
4. Send WhatsApp:
   POST https://graph.instagram.com/v18.0/.../messages
   Template: "Your OTP is 123456. Valid for 5 minutes."

RESPONSE:
HTTP 200 OK

{
  "success": true,
  "message": "OTP sent to WhatsApp",
  "messageId": "wamid.xxx..."
}

ERROR RESPONSE:
HTTP 403 Forbidden

{
  "error": "reCAPTCHA verification failed. Bot detected."
}
```

---

## Deployment Flow

```
┌─────────────────────────────────────────────────────┐
│              GITHUB TO VERCEL DEPLOYMENT            │
└─────────────────────────────────────────────────────┘

LOCAL DEVELOPMENT
  ├─ Make code changes
  ├─ Test locally with npm run dev
  ├─ Commit: git commit -m "..."
  └─ Push: git push origin main
         │
         ▼
┌──────────────────────────────────────┐
│   GITHUB REPOSITORY                  │
│   (Webhook triggered)                │
└──────┬───────────────────────────────┘
       │ Sends webhook to Vercel
       ▼
┌──────────────────────────────────────┐
│   VERCEL BUILD PROCESS               │
│  1. Checkout code from GitHub        │
│  2. Install dependencies             │
│     npm install                      │
│  3. Build (if needed)                │
│     npm run build                    │
│  4. Deploy functions                 │
│     • Upload api/*.js                │
│     • Set environment variables      │
│  5. Deploy static files              │
│     • Deploy orders.html             │
│     • Set cache headers              │
│  6. DNS routing                      │
│     • Route to CDN                   │
│     • Route /api/* to functions      │
└──────┬───────────────────────────────┘
       │ Deployment complete
       ▼
┌──────────────────────────────────────┐
│   PRODUCTION                         │
│   https://yourdomain.vercel.app      │
│                                      │
│   Static hosting:                    │
│   • orders.html (cached)             │
│                                      │
│   Serverless functions:              │
│   • /api/send-otp                    │
│   • /api/verify-otp                  │
│   • /api/cancel-order                │
│   • /api/razorpay-create-order       │
│   • /api/config                      │
│   • /api/health                      │
│                                      │
│   Environment variables:             │
│   • SUPABASE_URL                     │
│   • WA_PHONE_NUMBER_ID               │
│   • RAZORPAY_KEY_ID                  │
│   • etc...                           │
└──────────────────────────────────────┘
```

---

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────┐
│           MONITORING DASHBOARD                      │
└─────────────────────────────────────────────────────┘

VERCEL DASHBOARD
├─ Deployments (history)
├─ Function Invocations
│  ├─ /api/send-otp (count, duration)
│  ├─ /api/verify-otp (count, duration)
│  └─ /api/health (uptime %)
├─ Edge Caching
│  └─ Hit rate, size
├─ Analytics
│  ├─ Page views
│  ├─ Unique visitors
│  └─ Top pages
└─ Error logs

SUPABASE DASHBOARD
├─ Database
│  ├─ Row counts
│  ├─ Storage usage
│  └─ Queries
├─ Logs
│  ├─ Query logs
│  ├─ Error logs
│  └─ Function logs
└─ Monitoring
   ├─ Response times
   └─ Error rates

RAZORPAY DASHBOARD
├─ Transactions
├─ Payments (success/failed)
├─ Refunds
└─ Settlement

GOOGLE CLOUD CONSOLE
├─ reCAPTCHA
│  ├─ Bot scores
│  ├─ Valid/invalid requests
│  └─ Traffic trends
└─ Cloud Trace
```

---

**End of Diagrams**
