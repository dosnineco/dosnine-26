# 🎯 Complete Agent Management Setup Guide

## Overview
Secure admin dashboard to review, approve, or reject agent applications with proper authentication and RLS security.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Run Database Migration
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy entire content of `db-migrations/006_create_agents_table.sql`
3. Click **Run** (F5)
4. Should see: "Success. No rows returned"

### Step 2: Make Yourself Admin
1. In **Supabase SQL Editor**
2. Open `db-migrations/007_setup_admin.sql`
3. **CHANGE THE EMAIL** to your email (line 5)
4. Click **Run**
5. Should see your user with `role = 'admin'`

### Step 3: Access Admin Dashboard
1. Login to your site with the admin email
2. Go to: `http://localhost:3002/admin/agents`
3. Or from main admin dashboard, click **Agent Management** button

---

## 🔐 Security Features

### Multi-Layer Protection
✅ Frontend checks: Only renders if `role='admin'`
✅ API verification: Every request validates admin role
✅ Database RLS: Policies enforce admin-only access
✅ Storage security: Only admins can view verification documents

### What Hackers CANNOT Do
❌ Access admin pages (redirected to dashboard)
❌ Call admin APIs (returns 403 Forbidden)
❌ View verification documents (storage RLS blocks)
❌ Change their own role to admin (database RLS prevents)
❌ Approve their own agent application (API requires admin)

See [ADMIN_SECURITY.md](ADMIN_SECURITY.md) for complete security documentation.

---

## 📋 Admin Dashboard Features

### Dashboard Overview
- **Total Agents**: Count of all registered agents
- **Pending Review**: Agents waiting for approval (orange)
- **Approved**: Verified agents (green)
- **Rejected**: Declined applications (red)

### Filter Options
- **All**: Show all agents regardless of status
- **Pending**: Only agents awaiting review
- **Approved**: Only verified agents
- **Rejected**: Only declined applications

### Agent List Columns
1. **Agent**: Name, email, phone
2. **Business**: Business name, license number
3. **Experience**: Years in real estate
4. **Status**: Current verification status with icon
5. **Submitted**: Date application was submitted
6. **Actions**: View details, approve, or reject

### View Details Modal
Click 👁️ (eye icon) to see:
- Personal information (name, email, phone)
- Business details (name, license, experience, specializations)
- Service areas
- **Verification documents** (license + ID/registration images)
- Admin notes (if any)

### Approve/Reject Actions

#### Approve Agent
1. Click green ✓ button OR open details and click "Approve Agent"
2. Confirm approval
3. Agent status → `approved`
4. Timestamp recorded
5. Agent can now access agent dashboard

#### Reject Agent  
1. Click red ✗ button OR open details and click "Reject Agent"
2. Enter rejection reason (required)
3. Confirm rejection
4. Agent status → `rejected`
5. Notes saved for reference

---

## 🗂️ Database Structure

### users table
```sql
id                  UUID PRIMARY KEY
clerk_id            TEXT (from Clerk auth)
email               TEXT
full_name           TEXT
phone               TEXT
user_type           TEXT ('landlord', 'agent', 'admin')
role                TEXT ('admin' for admins)
created_at          TIMESTAMPTZ
```

### agents table (NEW)
```sql
id                           UUID PRIMARY KEY
user_id                      UUID → users(id)
business_name                TEXT
years_experience             INTEGER
license_number               TEXT
specializations              TEXT[]
service_areas                TEXT
about_me                     TEXT
deals_closed_count           INTEGER
license_file_url             TEXT
registration_file_url        TEXT
verification_status          TEXT ('pending', 'approved', 'rejected')
verification_submitted_at    TIMESTAMPTZ
verification_reviewed_at     TIMESTAMPTZ
verification_notes           TEXT (admin notes)
service_agreement_signed     BOOLEAN
service_agreement_date       TIMESTAMPTZ
data_sharing_consent         BOOLEAN
created_at                   TIMESTAMPTZ
updated_at                   TIMESTAMPTZ
```

---

## 🔍 Useful SQL Queries

### View All Pending Agents
```sql
SELECT 
  a.business_name,
  u.full_name,
  u.email,
  u.phone,
  a.years_experience,
  a.license_number,
  a.verification_submitted_at
FROM agents a
JOIN users u ON u.id = a.user_id
WHERE a.verification_status = 'pending'
ORDER BY a.verification_submitted_at DESC;
```

### Bulk Approve Multiple Agents
```sql
-- Approve all agents with 5+ years experience
UPDATE agents
SET 
  verification_status = 'approved',
  verification_reviewed_at = NOW(),
  verification_notes = 'Auto-approved: 5+ years experience'
WHERE 
  verification_status = 'pending' 
  AND years_experience >= 5;
```

### Check Verification History
```sql
SELECT 
  a.business_name,
  u.full_name,
  a.verification_status,
  a.verification_reviewed_at,
  a.verification_notes
FROM agents a
JOIN users u ON u.id = a.user_id
WHERE a.verification_reviewed_at IS NOT NULL
ORDER BY a.verification_reviewed_at DESC
LIMIT 20;
```

### Agent Statistics
```sql
SELECT 
  verification_status,
  COUNT(*) as count,
  AVG(years_experience) as avg_experience
FROM agents
GROUP BY verification_status;
```

---

## 🛠️ API Routes

All routes require `clerkId` and verify admin role.

### GET `/api/admin/verify-admin`
Verify if user is admin.
```javascript
GET /api/admin/verify-admin?clerkId=user_xxx&email=admin@example.com
Response: { isAdmin: true, userId: "...", email: "...", name: "..." }
```

### GET `/api/admin/agents/list`
List all agents (optionally filtered by status).
```javascript
GET /api/admin/agents/list?clerkId=user_xxx&status=pending
Response: { agents: [...] }
```

### POST `/api/admin/agents/update-status`
Approve or reject an agent.
```javascript
POST /api/admin/agents/update-status
Body: {
  clerkId: "user_xxx",
  agentId: "agent-uuid",
  status: "approved", // or "rejected"
  notes: "All documents verified"
}
Response: { success: true, agent: {...}, message: "Agent approved successfully" }
```

---

## 🎨 User Flow

### Agent Application Flow
```
1. User goes to /agents page
2. Clicks "Become an Agent"
3. Fills 3-step form:
   - Step 1: Basic info (name, business, experience)
   - Step 2: Upload docs (license + ID/registration)
   - Step 3: Review and submit
4. Documents upload to agent-documents bucket
5. Agent record created with status='pending'
6. User redirected to agent signup page (pending state)
```

### Admin Review Flow
```
1. Admin logs in
2. Goes to /admin/agents
3. Sees pending agents with orange "pending" badges
4. Clicks eye icon to view details
5. Reviews documents in modal
6. Clicks "Approve" or "Reject"
7. Agent status updated
8. Agent can now access dashboard (if approved)
```

### Approved Agent Flow
```
1. Agent logs in
2. Dashboard checks user_type='agent' + verification_status
3. If approved → Redirects to /agent/notifications
4. Agent can now receive leads and manage clients
```

---

## 📊 Monitoring & Maintenance

### Daily Admin Tasks
- [ ] Check pending agents queue
- [ ] Review verification documents
- [ ] Approve/reject applications within 24-48 hours
- [ ] Respond to agent inquiries

### Weekly Tasks
- [ ] Review agent statistics
- [ ] Check for duplicate applications
- [ ] Verify license numbers are valid
- [ ] Monitor agent activity

### Monthly Tasks
- [ ] Audit admin user list
- [ ] Review RLS policies
- [ ] Check storage bucket usage
- [ ] Update security documentation

---

## 🚨 Troubleshooting

### "Access Denied" when accessing /admin/agents
**Solution**: Run `007_setup_admin.sql` with YOUR email to set admin role.

### "Failed to fetch agents"
**Solution**: 
1. Check migration 006 ran successfully
2. Verify `agents` table exists in Supabase
3. Check browser console for API errors

### Can't see verification documents
**Solution**:
1. Verify you're logged in as admin
2. Check storage policies in Supabase
3. Ensure images uploaded to `agent-documents` bucket

### Agent status not updating
**Solution**:
1. Check browser console for API errors
2. Verify admin role is set correctly
3. Check RLS policies on agents table

### "relation agents does not exist"
**Solution**: Run migration `006_create_agents_table.sql` in Supabase SQL Editor.

---

## 🎯 Next Steps

After setup:

1. ✅ **Test agent signup**: Create test account, go through agent signup flow
2. ✅ **Test admin review**: Login as admin, review test agent
3. ✅ **Test approval**: Approve test agent, verify status changes
4. ✅ **Test rejection**: Reject another test agent with notes
5. ✅ **Verify security**: Try accessing admin routes as non-admin (should fail)

---

## 📚 Additional Resources

- [AGENT_TABLE_SETUP.md](AGENT_TABLE_SETUP.md) - Complete database schema
- [ADMIN_SECURITY.md](ADMIN_SECURITY.md) - Security documentation
- [STORAGE_SECURITY_SETUP.md](STORAGE_SECURITY_SETUP.md) - Storage policies

---

## ✅ Success Checklist

Before going live:

- [ ] Migration 006 executed successfully
- [ ] Admin user created (your email)
- [ ] Admin dashboard accessible at /admin/agents
- [ ] Can view list of agents
- [ ] Can approve/reject agents
- [ ] Can view verification documents
- [ ] Non-admin users blocked from admin routes
- [ ] API routes return 403 for non-admins
- [ ] Storage documents only visible to admins

**All green? You're ready to go! 🚀**
