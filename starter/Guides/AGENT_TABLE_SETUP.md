# Agent Table Setup - IMMEDIATE FIX

## What This Fixes
✅ Separates agent data from users table (cleaner architecture)
✅ Sets proper RLS policies for agent table
✅ Allows admins to view/approve agent verifications
✅ Fixes all database update errors

## Step 1: Run Migration in Supabase

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the entire content of `db-migrations/006_create_agents_table.sql`
3. Click **Run** (or press F5)

This will:
- Create `agents` table with all agent-specific fields
- Set up RLS policies (users can insert/update their own, admins can view/approve all)
- Remove old agent columns from users table (cleaner separation)
- Create `agents_with_users` view for easy lookups

## Step 2: Verify Migration

Run this query to confirm:
```sql
SELECT * FROM public.agents LIMIT 1;
```

Should show columns: id, user_id, business_name, years_experience, license_number, specializations, service_areas, about_me, deals_closed_count, license_file_url, registration_file_url, verification_status, etc.

## Step 3: Test Agent Signup

1. Go to `/agents` page
2. Click "Become an Agent"
3. Fill out the form with all required info
4. Upload license + ID/business registration
5. Submit

**Expected Result**: ✅ Success message, no errors, data saved in agents table

## What Changed in Code

### API Route (`pages/api/agents/signup.js`)
- Now inserts into `agents` table instead of updating `users` table with agent fields
- Only sets `user_type='agent'` in users table
- All agent-specific data goes to agents table

### Helper (`lib/getUserProfile.js`)
- Queries `agents` table for verification_status when user_type='agent'
- Returns combined user + agent verification status

### Dashboard (`pages/dashboard/index.js`)
- Still uses same logic, but now gets verification_status from agents table join

## Admin Verification Flow

### View Pending Agents
```sql
SELECT 
  a.id,
  a.business_name,
  a.verification_status,
  a.license_file_url,
  a.registration_file_url,
  u.full_name,
  u.email,
  u.phone
FROM agents a
JOIN users u ON u.id = a.user_id
WHERE a.verification_status = 'pending'
ORDER BY a.verification_submitted_at DESC;
```

### Approve Agent
```sql
UPDATE agents 
SET 
  verification_status = 'approved',
  verification_reviewed_at = NOW(),
  verification_notes = 'All documents verified'
WHERE id = '<agent-id>';
```

### Reject Agent
```sql
UPDATE agents 
SET 
  verification_status = 'rejected',
  verification_reviewed_at = NOW(),
  verification_notes = 'Invalid license number'
WHERE id = '<agent-id>';
```

## RLS Policies Explained

### For Users
- ✅ Can INSERT their own agent profile (signup)
- ✅ Can SELECT their own agent profile (view status)
- ✅ Can UPDATE their own agent profile (edit info, but not verification_status)

### For Admins
- ✅ Can SELECT all agent profiles (review applications)
- ✅ Can UPDATE any agent profile (approve/reject, add notes)

### Security
- Users **cannot** change their own `verification_status` (only admins can)
- All verification documents stored in `agent-documents` bucket (admin-only viewing)
- Admins identified by `role='admin'` in users table

## Set Admin User

To make yourself admin for testing:
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## Database Schema

### users table (simplified)
- `id`, `clerk_id`, `email`, `full_name`, `phone`, `user_type`, `role`, `created_at`

### agents table (all agent data)
- `id`, `user_id` (FK to users)
- Business: `business_name`, `years_experience`, `license_number`, `specializations[]`, `service_areas`, `about_me`, `deals_closed_count`
- Documents: `license_file_url`, `registration_file_url`
- Verification: `verification_status`, `verification_submitted_at`, `verification_reviewed_at`, `verification_notes`
- Agreements: `service_agreement_signed`, `service_agreement_date`, `data_sharing_consent`
- Timestamps: `created_at`, `updated_at`

## Troubleshooting

### "relation agents does not exist"
→ Run the migration SQL in Supabase SQL Editor

### "Failed to create agent profile"
→ Check Supabase logs, verify RLS policies are applied

### "Users can't view their own profile"
→ Make sure Clerk authentication is passing through correctly, check RLS policy

### "Admins can't see agents"
→ Set role='admin' in users table for admin users

## Migration Rollback (if needed)

```sql
DROP TABLE IF EXISTS public.agents CASCADE;
DROP VIEW IF EXISTS public.agents_with_users CASCADE;
```

Then add back agent columns to users table if needed.
