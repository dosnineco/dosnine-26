# ⚡ 5-Minute Quick Start

Get the Agent Sign-Up feature running in 5 minutes!

---

## Step 1: Database Setup (2 minutes)

### Option A: Supabase SQL Editor
1. Go to your Supabase project
2. Click "SQL Editor" in sidebar
3. Copy and paste content from:
   - `db-migrations/001_create_service_requests.sql`
   - `db-migrations/002_create_agent_notifications.sql`
4. Run each migration

### Option B: Command Line
```bash
cd /workspaces/dosnine-26/starter

# Run migrations (adjust connection string)
psql YOUR_DATABASE_URL -f db-migrations/001_create_service_requests.sql
psql YOUR_DATABASE_URL -f db-migrations/002_create_agent_notifications.sql
```

---

## Step 2: Environment Check (1 minute)

Verify `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_client_id
```

---

## Step 3: Start Dev Server (30 seconds)

```bash
cd /workspaces/dosnine-26/starter
npm run dev
```

Visit: http://localhost:3000

---

## Step 4: Create Test Agent (1 minute)

1. Go to: http://localhost:3000/agent/signup
2. Fill the form (use dummy data for testing)
3. Upload any PDF/image files for documents
4. Submit

**Manual approval required!** Run this SQL to approve your test agent:

```sql
-- In Supabase SQL Editor
UPDATE users 
SET 
  agent_verification_status = 'approved',
  agent_verified = true
WHERE email = 'YOUR_TEST_EMAIL@example.com';
```

---

## Step 5: Test the Flow (1 minute)

### Test Agent Dashboard:
```
http://localhost:3000/agent/notifications
```
You should see "No requests yet"

### Test Service Request:
```
http://localhost:3000/service-request
```
- Use PayPal sandbox for testing
- Or manually set premium status:
```sql
UPDATE users 
SET 
  premium_service_request = true,
  premium_service_request_expires = NOW() + INTERVAL '30 days'
WHERE email = 'YOUR_EMAIL@example.com';
```

### Test Complete Flow:
1. Go to `/service-request`
2. Select your test agent
3. Fill property requirements
4. Submit
5. Check `/agent/notifications` → Should see the request!

---

## 🎉 Done!

You now have:
- ✅ Agent registration working
- ✅ Service requests working
- ✅ Agent notifications working
- ✅ Full user flow operational

---

## 🧪 Quick Test Checklist

```bash
# 1. Can I register as agent?
→ http://localhost:3000/agent/signup

# 2. Can I see agent dashboard?
→ http://localhost:3000/agent/notifications

# 3. Can I submit service request?
→ http://localhost:3000/service-request

# 4. Does agent see my request?
→ Refresh agent/notifications page

# 5. Can agent mark as read?
→ Click notification → Mark as Read
```

---

## 🐛 Quick Troubleshooting

### "Method not allowed" errors
→ Check API route exists and HTTP method matches (GET/POST/PUT)

### Agent dashboard shows nothing
→ Make sure agent_verified = true in database

### PayPal not working
→ Use sandbox mode or manually set premium_service_request = true

### Notifications not showing
→ Create a test service request via API or form

---

## 📱 Test URLs

| URL | What It Does |
|-----|--------------|
| `/onboarding` | Choose user role |
| `/agent/signup` | Register as agent |
| `/agent/notifications` | View service requests |
| `/service-request` | Request agent service |

---

## 🔥 Pro Tips

1. **Use Supabase Table Editor** to manually verify data
2. **Check browser console** for client-side errors
3. **Check terminal** for API errors
4. **Use Postman** to test API endpoints directly
5. **Clear browser cache** if seeing stale data

---

## 📊 Database Quick Queries

```sql
-- Check agent signups
SELECT full_name, agent_verification_status, agent_verified
FROM users WHERE user_type = 'agent';

-- Check service requests
SELECT * FROM service_requests ORDER BY created_at DESC;

-- Check notifications
SELECT * FROM agent_notifications WHERE is_read = false;

-- Approve an agent
UPDATE users 
SET agent_verification_status = 'approved', agent_verified = true
WHERE id = 'agent-user-id';

-- Grant premium access
UPDATE users 
SET premium_service_request = true,
    premium_service_request_expires = NOW() + INTERVAL '30 days'
WHERE id = 'user-id';
```

---

## 🎯 What to Test

### User Flow 1: Become Agent
1. Sign in
2. Go to `/agent/signup`
3. Fill 3-step form
4. Upload docs
5. Submit
6. Verify status in database

### User Flow 2: Request Service
1. Sign in
2. Go to `/service-request`
3. Pay (or manually grant premium)
4. Select agent
5. Fill requirements
6. Submit
7. Check agent dashboard

### User Flow 3: Agent Receives Request
1. Sign in as agent
2. Go to `/agent/notifications`
3. See new request
4. Expand details
5. View client contact
6. Mark as read

---

## 🚀 Ready for Production?

Before deploying:
- [ ] Set up email notifications
- [ ] Configure PayPal production keys
- [ ] Add admin approval dashboard
- [ ] Set up proper file storage for documents
- [ ] Add rate limiting to APIs
- [ ] Enable HTTPS
- [ ] Test on mobile devices

---

**That's it! You're ready to go! 🎉**

Need help? Check:
- `SETUP_INSTRUCTIONS.md` - Detailed setup
- `AGENT_SERVICE_FEATURE.md` - Complete docs
- `USER_FLOW_DIAGRAMS.md` - Visual guides
