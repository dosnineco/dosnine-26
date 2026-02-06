# Course Signups Not Showing in Admin Dashboard - Troubleshooting Guide

## Problem
You have 2 signups in the database but the admin dashboard at `/admin/course` shows 0 signups.

## Most Likely Causes

### 1. 🔒 **Row Level Security (RLS) Policies** (MOST COMMON)
The `course_preorders` table likely has RLS enabled but no policies allowing admins to read the data.

**How to Check:**
1. Go to your Supabase dashboard
2. Navigate to: Database → Tables → course_preorders
3. Click on "RLS" (Row Level Security)
4. Check if RLS is enabled and what policies exist

**How to Fix:**
Run this SQL in Supabase SQL Editor:

```sql
-- Check current policies
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'course_preorders';

-- If no read policies exist, run the migration:
-- Use the file: db-migrations/024_fix_course_preorders_rls.sql
```

Or **manually add policy** in Supabase:
1. Go to Authentication → Policies
2. Find `course_preorders` table
3. Add new policy:
   - **Name:** "Enable read for admins"
   - **Command:** SELECT
   - **Target Roles:** authenticated
   - **USING expression:** 
   ```sql
   EXISTS (
     SELECT 1 FROM users 
     WHERE users.clerk_id = auth.jwt() ->> 'sub' 
     AND users.role = 'admin'
   )
   ```

### 2. 👤 **Admin Authentication Issue**
Your user account might not be marked as admin in the database.

**How to Check:**
1. Open browser console on `/admin/course` page
2. Look for these logs:
   - `🔍 Fetching course signups...`
   - `📊 Query result:` followed by data
   - `❌ Database error:` if there's an issue

**How to Fix:**
Run this SQL in Supabase to check your admin status:

```sql
-- Replace 'your-clerk-id' with your actual Clerk ID
SELECT clerk_id, email, full_name, role 
FROM users 
WHERE clerk_id = 'your-clerk-id';
```

If `role` is not 'admin':
```sql
UPDATE users 
SET role = 'admin' 
WHERE clerk_id = 'your-clerk-id';
```

### 3. 📍 **Wrong Table Name or Database**
The table might not exist or have a different name.

**How to Check:**
Visit: `http://localhost:3000/api/debug/course-signups`

This will show:
- ✅ If table exists
- ✅ Row count
- ✅ Actual data
- ❌ Any errors

**How to Fix:**
If table doesn't exist, run in Supabase SQL Editor:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'course_preorders';

-- If it doesn't exist, create it:
CREATE TABLE IF NOT EXISTS course_preorders (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  price_choice TEXT,
  buy_now BOOLEAN DEFAULT FALSE,
  discounted_amount INTEGER DEFAULT 0,
  payment_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE course_preorders ENABLE ROW LEVEL SECURITY;

-- Add policies (see RLS section above)
```

### 4. 🌐 **Supabase Client Configuration**
Environment variables might be missing or incorrect.

**How to Check:**
1. Check `.env.local` file has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. Restart your dev server after adding/changing env vars

**How to Fix:**
1. Go to Supabase Dashboard → Settings → API
2. Copy the URL and anon key
3. Update `.env.local`
4. Restart: `npm run dev`

## Step-by-Step Diagnosis

### Step 1: Check Debug Endpoint
1. Visit: `http://localhost:3000/api/debug/course-signups`
2. Look at the JSON response:

**If you see:**
```json
{
  "tableExists": false,
  "schemaError": { "message": "..." }
}
```
→ **Problem:** Table doesn't exist. Create it using SQL above.

**If you see:**
```json
{
  "signupsQuery": {
    "success": false,
    "error": { "message": "permission denied for table course_preorders" }
  }
}
```
→ **Problem:** RLS policies blocking access. Fix policies using SQL above.

**If you see:**
```json
{
  "signupsQuery": {
    "success": true,
    "count": 2,
    "rowsReturned": 2
  },
  "data": [...]
}
```
→ **Problem:** Data is accessible but admin check is failing. Check browser console.

### Step 2: Check Browser Console
1. Open `/admin/course` page
2. Open browser console (F12 → Console tab)
3. Look for logs:

**If you see:**
```
🔍 Fetching course signups...
📊 Query result: { success: true, count: 2, rowsReturned: 2 }
✅ Signups loaded: [...]
```
→ **Data loaded successfully!** Page should show signups.

**If you see:**
```
❌ Database error: { message: "..." }
```
→ **RLS or permissions issue.** Check policies.

**If you don't see any logs:**
→ **Admin check failing.** User is not authenticated as admin.

### Step 3: Verify Admin Status
1. Open browser console
2. Run:
```javascript
// Check current user
console.log('User:', window.Clerk?.user)

// Test database query directly
const { createClient } = window.supabase
const client = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY'
)
const result = await client.from('course_preorders').select('*')
console.log('Direct query result:', result)
```

### Step 4: Check Supabase Dashboard
1. Go to: Table Editor → course_preorders
2. Manually verify the 2 signups are there
3. Check the data columns match expected schema

## Quick Fixes

### Quick Fix #1: Temporarily Disable RLS (TESTING ONLY)
```sql
-- ⚠️ WARNING: Do this ONLY for testing, not in production!
ALTER TABLE course_preorders DISABLE ROW LEVEL SECURITY;
```
If this makes data appear → RLS policies are the problem.
Remember to re-enable: `ALTER TABLE course_preorders ENABLE ROW LEVEL SECURITY;`

### Quick Fix #2: Allow All Authenticated Users (TEMPORARY)
```sql
-- Temporarily allow all authenticated users to read
CREATE POLICY "temp_read_all" 
ON course_preorders 
FOR SELECT
TO authenticated
USING (true);
```
If this works → Admin check in policy is failing.

### Quick Fix #3: Check Service Role Key
If nothing works, try using service role key (server-side only!):

In `/pages/api/admin/course-signups.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Bypasses RLS
)
```

## Success Checklist

Once fixed, you should see:

- ✅ Admin dashboard shows: "2 signups loaded"
- ✅ Stats cards show: Total=2, Paid=0, Pending=2
- ✅ Table displays both signup rows
- ✅ Browser console shows: `✅ Signups loaded: [...]`
- ✅ Debug endpoint returns: `"count": 2, "rowsReturned": 2`

## Still Not Working?

If none of the above fixes work:

1. **Export the data manually:**
   - Go to Supabase Table Editor
   - Select course_preorders table
   - Export as CSV
   - Manually review the data

2. **Check if using correct Supabase project:**
   - Verify the Supabase URL matches your project
   - Check you're logged into the correct account

3. **Create a new API endpoint to fetch data:**
   ```javascript
   // pages/api/admin/get-signups.js
   import { createClient } from '@supabase/supabase-js'
   
   export default async function handler(req, res) {
     const supabase = createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL,
       process.env.SUPABASE_SERVICE_ROLE_KEY
     )
     
     const { data } = await supabase
       .from('course_preorders')
       .select('*')
     
     return res.json({ signups: data })
   }
   ```
   Then visit: `/api/admin/get-signups`

## Contact for Help

If still stuck, provide:
1. Result from `/api/debug/course-signups`
2. Browser console logs from `/admin/course`
3. Screenshot of Supabase RLS policies for `course_preorders`
4. Your Supabase project URL (without sensitive keys)
