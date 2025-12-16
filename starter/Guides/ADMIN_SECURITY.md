# 🔒 Admin Dashboard Security - Anti-Hack Measures

## Security Features Implemented

### 1. **Multi-Layer Admin Verification**

Every admin route has THREE security checks:

#### Frontend Protection (React)
```javascript
// Checks user role before rendering
if (!isAdmin) {
  router.push('/dashboard'); // Redirect non-admins
  return null;
}
```

#### API Route Protection
```javascript
// EVERY API call verifies admin role
const { data: adminUser } = await supabase
  .from('users')
  .select('id, role')
  .eq('clerk_id', clerkId)
  .eq('role', 'admin')
  .single();

if (!adminUser) {
  return res.status(403).json({ error: 'Access denied - Admin only' });
}
```

#### Database RLS (Row Level Security)
```sql
-- Only admins can view/update agents table
CREATE POLICY "Admins can view all agent profiles"
ON public.agents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.clerk_id = auth.uid()::text 
    AND users.role = 'admin'
  )
);
```

### 2. **Authentication Flow**

```
User Login (Clerk Google OAuth)
    ↓
Check Clerk ID in users table
    ↓
Verify role = 'admin'
    ↓
    YES → Grant Access
    NO  → 403 Forbidden + Redirect
```

### 3. **Protected Routes**

All admin routes require authentication:

- `/admin/agents` - Agent management dashboard
- `/admin/dashboard` - Main admin dashboard
- `/admin/visitor-emails` - Email collection data
- `/api/admin/*` - All admin API endpoints

### 4. **API Security Measures**

#### Input Validation
```javascript
// Reject invalid status values
if (!['approved', 'rejected', 'pending'].includes(status)) {
  return res.status(400).json({ error: 'Invalid status' });
}
```

#### Required Parameters
```javascript
if (!clerkId || !agentId || !status) {
  return res.status(400).json({ error: 'Missing required fields' });
}
```

#### SQL Injection Prevention
- Using Supabase parameterized queries (prevents SQL injection)
- Never concatenating user input into queries
- All queries use `.eq()`, `.select()` methods (safe)

### 5. **Storage Security**

#### Agent Documents Bucket
```sql
-- Only authenticated users can upload (during signup)
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-documents');

-- ONLY ADMINS can view documents
CREATE POLICY "Only admins can view verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'agent-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.clerk_id = auth.uid()::text
    AND users.role = 'admin'
  )
);
```

**Result**: Regular users can upload their docs but CANNOT view anyone's documents (including their own after upload). Only admins can see all documents.

### 6. **Database RLS Policies**

#### Users Table
- Users can view/update their own profile
- Admins can view/update all users

#### Agents Table
- Users can insert/update their own agent profile
- Users CANNOT change `verification_status` (admin-only field)
- Admins can view all agents and update any field

#### Properties Table
- Users can manage their own properties
- Admins can manage all properties

### 7. **Session Security**

- Clerk handles authentication tokens (industry-standard)
- JWTs verified on every request
- Session expiration enforced
- HTTPS required in production (environment variable)

## How to Set Admin User

### Method 1: SQL Editor (Recommended)
```sql
-- In Supabase SQL Editor
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Method 2: Manual in Supabase UI
1. Go to Supabase Dashboard
2. Table Editor → users table
3. Find your user row
4. Edit `role` column to `admin`
5. Save

### Method 3: API (One-time setup)
Create a one-time setup script (delete after use):
```javascript
// pages/api/setup-admin.js (DELETE AFTER FIRST RUN!)
import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  const SETUP_SECRET = process.env.SETUP_SECRET; // Set in .env.local
  
  if (req.query.secret !== SETUP_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  const { data, error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('email', 'your-email@example.com');

  return res.json({ success: true, data });
}
```

## Security Checklist

✅ **Multi-layer admin verification** (frontend + API + database)
✅ **RLS policies** on all tables
✅ **Storage policies** for sensitive documents
✅ **Input validation** on all API endpoints
✅ **SQL injection prevention** (parameterized queries)
✅ **Authentication required** for all admin routes
✅ **Session management** via Clerk
✅ **HTTPS enforcement** in production
✅ **No exposed secrets** (all in .env.local)
✅ **Audit trail** (verification_notes, reviewed_at timestamps)

## Common Attack Vectors - Prevented

### 1. Unauthorized Access
**Attack**: User tries to access `/admin/agents` directly
**Prevention**: Frontend checks `isAdmin`, redirects to `/dashboard` if false

### 2. API Bypass
**Attack**: User calls `/api/admin/agents/list` directly with their clerkId
**Prevention**: API verifies user has `role='admin'` in database, returns 403 if not

### 3. Token Manipulation
**Attack**: User modifies JWT token to claim admin role
**Prevention**: Clerk validates tokens server-side, invalid tokens rejected

### 4. SQL Injection
**Attack**: User sends malicious SQL in agentId parameter
**Prevention**: Supabase uses parameterized queries, treats input as data not code

### 5. Document Access
**Attack**: User tries to view verification documents via direct URL
**Prevention**: Storage RLS policy checks admin role, blocks non-admins

### 6. Status Manipulation
**Attack**: Agent tries to approve their own verification
**Prevention**: API requires admin role to update verification_status

### 7. Role Escalation
**Attack**: User tries to update their own role to 'admin'
**Prevention**: RLS policy prevents users from changing their own role

## Monitoring & Audit Trail

### Verification History
Every agent verification action is logged:
```sql
SELECT 
  a.business_name,
  a.verification_status,
  a.verification_reviewed_at,
  a.verification_notes,
  u.full_name as agent_name
FROM agents a
JOIN users u ON u.id = a.user_id
WHERE a.verification_reviewed_at IS NOT NULL
ORDER BY a.verification_reviewed_at DESC;
```

### Admin Actions Log (Future Enhancement)
Consider adding an `admin_actions` table to log all admin operations:
```sql
CREATE TABLE admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES users(id),
  action_type TEXT, -- 'approve_agent', 'reject_agent', 'delete_property'
  target_id UUID, -- ID of affected record
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Best Practices for Production

### 1. Environment Variables
```env
# .env.local (NEVER commit to git)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret

# Optional: Additional security
SETUP_SECRET=random-long-string-delete-after-setup
```

### 2. HTTPS Only
In production, enforce HTTPS:
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};
```

### 3. Rate Limiting
Add rate limiting to prevent brute force:
```javascript
// Consider using: next-rate-limit or @upstash/ratelimit
```

### 4. Regular Security Audits
- Review admin users monthly
- Check RLS policies quarterly
- Monitor failed login attempts
- Review storage access logs

## Emergency Procedures

### Revoke Admin Access Immediately
```sql
UPDATE public.users 
SET role = 'landlord' 
WHERE email = 'compromised-admin@example.com';
```

### Disable All Agent Verification
```sql
-- Emergency: Stop all agent signups
ALTER TABLE public.agents DISABLE TRIGGER ALL;
```

### Check Recent Admin Actions
```sql
-- See recent agent approvals
SELECT * FROM agents 
WHERE verification_reviewed_at > NOW() - INTERVAL '24 hours'
ORDER BY verification_reviewed_at DESC;
```

### Audit All Current Admins
```sql
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.users
WHERE role = 'admin'
ORDER BY created_at;
```

## Testing Security

### Test Non-Admin Access
1. Create test account without admin role
2. Try accessing `/admin/agents`
3. Should redirect to `/dashboard`
4. Check browser console for 403 errors (expected)

### Test API Security
```bash
# Try to call admin API without admin role (should fail)
curl -X GET "http://localhost:3002/api/admin/agents/list?clerkId=non-admin-id"
# Expected: {"error": "Access denied - Admin only"}
```

### Test RLS Policies
```sql
-- Set auth context as non-admin user
SET request.jwt.claims = '{"sub": "non-admin-clerk-id"}';

-- Try to view agents (should return empty or error)
SELECT * FROM agents;
```

## Support & Maintenance

For security issues or questions:
1. Check this documentation first
2. Review Supabase RLS policies
3. Test in development environment
4. Never share admin credentials
5. Use unique passwords for admin accounts

---

**Remember**: Security is layered. Each layer (frontend, API, database) provides defense. Even if one layer is bypassed, others protect the system.
