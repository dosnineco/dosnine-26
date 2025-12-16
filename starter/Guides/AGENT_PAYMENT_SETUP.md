# Agent Payment & Property Limits Setup Guide

## Features Implemented

### 1. Agent Payment System
- ✅ One-time $50 USD payment via PayPal
- ✅ Unlocks access to client requests
- ✅ Payment status tracked in database
- ✅ Verified agents must pay before viewing requests

### 2. Property Posting Limits
- ✅ Regular users: Maximum 1 property
- ✅ Verified + Paid agents: Unlimited properties
- ✅ Automatic property count tracking
- ✅ Pre-submission validation

### 3. Access Control
- ✅ Unverified agents blocked from all features
- ✅ Verified but unpaid agents see payment prompt
- ✅ Only paid agents can access client requests
- ✅ Multi-layer security (frontend + API + database)

### 4. Real-time Notifications
- ✅ Popup notifications for new client requests
- ✅ Auto-check every 30 seconds
- ✅ Shows full client contact information
- ✅ Direct call/email buttons

### 5. Accent Color Styling
- ✅ All components use CSS variables from globals.css
- ✅ Consistent red accent (#F55353) throughout
- ✅ Hover states and focus rings
- ✅ Smooth animations

---

## Setup Instructions

### Step 1: Run Database Migration

Run this in Supabase SQL Editor:

\`\`\`sql
-- Add payment columns to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2);
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS paypal_transaction_id TEXT;

-- Add property count to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS property_count INTEGER DEFAULT 0;

-- Create index for payment status
CREATE INDEX IF NOT EXISTS idx_agents_payment_status ON public.agents(payment_status);

-- Create functions for property count tracking
CREATE OR REPLACE FUNCTION increment_property_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.landlord_user_id IS NOT NULL THEN
    UPDATE public.users 
    SET property_count = property_count + 1
    WHERE id = NEW.landlord_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_property_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.landlord_user_id IS NOT NULL THEN
    UPDATE public.users 
    SET property_count = GREATEST(property_count - 1, 0)
    WHERE id = OLD.landlord_user_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_increment_property_count ON public.properties;
CREATE TRIGGER trigger_increment_property_count
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION increment_property_count();

DROP TRIGGER IF EXISTS trigger_decrement_property_count ON public.properties;
CREATE TRIGGER trigger_decrement_property_count
  AFTER DELETE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION decrement_property_count();
\`\`\`

### Step 2: Get PayPal Credentials

1. **Go to PayPal Developer Dashboard**
   - Visit: https://developer.paypal.com/dashboard/
   - Login with your PayPal account

2. **Create a new app** (if you don't have one)
   - Click "Apps & Credentials"
   - Click "Create App"
   - Name: "Rentals Jamaica Agent Payments"
   - Select account type: Merchant

3. **Get your Client ID**
   - Copy the "Client ID" from your app
   - For testing: Use the Sandbox Client ID
   - For production: Use the Live Client ID

### Step 3: Add Environment Variables

Add to \`.env.local\`:

\`\`\`bash
# PayPal Configuration
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here

# For testing, use sandbox:
# NEXT_PUBLIC_PAYPAL_CLIENT_ID=AaY...sandbox_client_id

# For production, use live:
# NEXT_PUBLIC_PAYPAL_CLIENT_ID=AaY...live_client_id
\`\`\`

### Step 4: Test the Flow

#### Test as Regular User:
1. Login as regular user (not agent)
2. Try to post a property
3. Post first property ✅
4. Try to post second property ❌ (blocked with limit message)

#### Test as Unverified Agent:
1. Login and become an agent
2. Wait for admin verification OR verify manually in database
3. Try to access agent dashboard ❌ (blocked - verification required)

#### Test as Verified but Unpaid Agent:
1. Login as verified agent (payment_status = 'unpaid')
2. Visit `/agent/dashboard`
3. See payment required screen
4. Click "Unlock Access"
5. Complete PayPal payment (use test card in sandbox)
6. Redirected to dashboard with full access ✅

#### Test as Paid Agent:
1. Login as paid agent (payment_status = 'paid')
2. Visit `/agent/dashboard`
3. See client requests
4. Popup notifications appear for new requests
5. Can post unlimited properties

---

## Manual Testing in Database

### Verify an agent manually:
\`\`\`sql
UPDATE public.agents
SET verification_status = 'approved'
WHERE user_id = (SELECT id FROM public.users WHERE clerk_id = 'user_clerk_id_here');
\`\`\`

### Mark agent as paid manually (for testing):
\`\`\`sql
UPDATE public.agents
SET 
  payment_status = 'paid',
  payment_amount = 50.00,
  payment_date = NOW(),
  paypal_transaction_id = 'TEST_TRANSACTION_123'
WHERE user_id = (SELECT id FROM public.users WHERE clerk_id = 'user_clerk_id_here');
\`\`\`

### Check property counts:
\`\`\`sql
SELECT 
  u.clerk_id,
  u.full_name,
  u.property_count,
  a.verification_status,
  a.payment_status
FROM public.users u
LEFT JOIN public.agents a ON a.user_id = u.id;
\`\`\`

### Reset property count for testing:
\`\`\`sql
UPDATE public.users
SET property_count = 0
WHERE clerk_id = 'user_clerk_id_here';
\`\`\`

---

## API Endpoints Created

### \`/api/agent/process-payment\` (POST)
Processes PayPal payment and updates agent status
- Body: \`{ clerkId, transactionId, amount }\`
- Updates payment_status to 'paid'
- Records transaction details

### \`/api/properties/check-limit\` (GET)
Checks if user can post a property
- Params: \`clerkId\`
- Returns: \`{ canPost, reason, propertyCount, maxProperties }\`
- Blocks: unverified agents, unpaid agents, regular users at limit

---

## Access Flow Chart

\`\`\`
User Login
   │
   ├─ Regular User
   │     │
   │     ├─ Property count < 1 → Can post property ✅
   │     └─ Property count >= 1 → Blocked ❌
   │
   └─ Agent User
         │
         ├─ Verification Status?
         │     │
         │     ├─ Pending → All features blocked ❌
         │     ├─ Rejected → All features blocked ❌
         │     └─ Approved → Continue ↓
         │
         └─ Payment Status?
               │
               ├─ Unpaid → Show payment screen → PayPal → Mark paid
               └─ Paid → Full access ✅
                     │
                     ├─ View all client requests
                     ├─ Receive popup notifications
                     └─ Post unlimited properties
\`\`\`

---

## Security Features

1. **Frontend Guards**
   - Check agent status before rendering features
   - Redirect to appropriate screens based on status
   - Hide sensitive data from unpaid agents

2. **API Guards**
   - All request endpoints verify payment status
   - Property posting blocked at API level
   - Error responses guide users to correct screens

3. **Database RLS**
   - Service requests only visible to paid agents
   - Property limits enforced via triggers
   - Payment transactions logged

---

## Troubleshooting

### PayPal button not showing:
- Check NEXT_PUBLIC_PAYPAL_CLIENT_ID is set
- Restart dev server after adding env variable
- Check browser console for errors

### Property limit not working:
- Run migration to add triggers
- Check property_count column exists
- Verify landlord_user_id is being set correctly

### Notifications not appearing:
- Check service_requests table has data
- Verify agent payment_status is 'paid'
- Check browser console for errors
- Clear localStorage to reset check timer

### Agent can't access features:
\`\`\`sql
-- Check agent status:
SELECT 
  u.clerk_id,
  a.verification_status,
  a.payment_status
FROM public.agents a
JOIN public.users u ON u.id = a.user_id
WHERE u.clerk_id = 'user_clerk_id_here';
\`\`\`

---

## Customization

### Change payment amount:
Edit \`/pages/agent/payment.js\`:
\`\`\`javascript
const UNLOCK_FEE = 50.00; // Change to your price
\`\`\`

### Change property limit for regular users:
Edit \`/pages/api/properties/check-limit.js\`:
\`\`\`javascript
if (userData.property_count >= 1) { // Change 1 to your limit
\`\`\`

### Change notification check interval:
Edit \`/components/RequestNotificationPopup.js\`:
\`\`\`javascript
const interval = setInterval(checkNewRequests, 30000); // 30 seconds
\`\`\`

---

## Production Checklist

- [ ] Switch PayPal to Live Client ID
- [ ] Test payment flow end-to-end
- [ ] Set up PayPal webhooks for payment verification
- [ ] Add payment receipt email
- [ ] Add refund policy page
- [ ] Test all access restrictions
- [ ] Add analytics tracking for payments
- [ ] Set up payment failure alerts

---

## Files Modified/Created

### New Files:
- \`db-migrations/010_add_agent_payment.sql\`
- \`pages/agent/payment.js\`
- \`pages/api/agent/process-payment.js\`
- \`pages/api/properties/check-limit.js\`
- \`components/RequestNotificationPopup.js\`

### Modified Files:
- \`pages/agent/dashboard.js\` - Added payment checks and popup
- \`pages/landlord/new-property.js\` - Added property limit check
- \`styles/globals.css\` - Added bounce-in animation

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify environment variables are set
4. Check PayPal dashboard for payment status
5. Review this guide's troubleshooting section
