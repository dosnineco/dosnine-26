# RLS Anonymous Form Submission Issue - Root Cause & Fix

## The Problem

When RLS is added to the database, forms start auto-submitting because:

### 1. **RLS Blocks Anonymous Inserts**
- Anonymous users (not logged in) try to submit forms
- RLS policies deny the INSERT operation
- The database returns a "permission denied" error
- But **the code silently ignores the error** and marks the submission as successful

### 2. **Silent Error Handling**
In `components/VisitorEmailPopup.js` (line 176-181):
```javascript
if (requestError) {
  // Service request insert error logged silently
}

if (error) {
  // Visitor email insert error logged silently
}
```

The code **continues executing** even when inserts fail, and then:

```javascript
localStorage.setItem('visitor-lead-submitted', 'true');  // Marks as submitted!
setSubmitted(true);                                       // Shows success UI
setShowPopup(false);                                      // Hides popup
```

### 3. **Why Forms Look Like They're "Submitting"**
- User fills form → clicks submit
- RLS blocks insert → error returned
- Code ignores error → marks as success
- User sees "success" UI even though data wasn't saved
- **Browser localStorage thinks form was submitted** → next visit shows no popup

## The Solution

Add RLS policies that **allow anonymous users to INSERT** into these tables:

### Two Options:

#### **Option A: Add Anonymous INSERT Policies (Recommended)**
Use the SQL file: `RLS_FIX_ANONYMOUS_INSERTS.sql`

This allows:
- ✅ Anonymous users to submit forms (INSERT)
- ✅ Data is saved to database
- ✅ Admins can read all submissions
- ✅ Maintains security (no unauthorized SELECT/UPDATE/DELETE)

**Run in Supabase Dashboard:**
1. Go to: **Settings → SQL Editor**
2. Create new query
3. Paste content from `RLS_FIX_ANONYMOUS_INSERTS.sql`
4. Click **Run**

#### **Option B: Use Service Role Key (Alternative)**
Modify the API endpoints to use `SUPABASE_SERVICE_ROLE_KEY` for form submissions:

```javascript
// In pages/api/submit-form.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Bypasses RLS
);

export default async function handler(req, res) {
  const { data, error } = await supabaseAdmin
    .from('service_requests')
    .insert(req.body);
  
  if (error) return res.status(400).json(error);
  return res.status(200).json(data);
}
```

## Files Affected

1. **components/VisitorEmailPopup.js** - Homepage popup (anonymous submissions)
2. **pages/request.js** - Request agent page (can be anonymous)
3. **Database tables:**
   - `service_requests` - Needs INSERT policy for anon
   - `visitor_emails` - Needs INSERT policy for anon

## What Changed After RLS Fix

| Aspect | Before | After |
|--------|--------|-------|
| Anonymous can submit | ❌ RLS blocks it | ✅ Policy allows it |
| Data is saved | ❌ Error ignored | ✅ Successfully saved |
| Form shows success | ⚠️ Even if failed | ✅ Only when successful |
| Admin can see all submissions | ✅ Yes | ✅ Yes |
| Security | ⚠️ No row control | ✅ Tight RLS control |

## Quick Verification

After running the SQL fix:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('service_requests', 'visitor_emails');

-- Should return:
-- service_requests | t (true)
-- visitor_emails   | t (true)

-- List policies
SELECT * FROM pg_policies 
WHERE tablename IN ('service_requests', 'visitor_emails');
```

## Test the Fix

1. Open the website in **Incognito/Private mode** (not signed in)
2. Go to homepage → Wait for popup
3. Fill form completely → Submit
4. Should see success message ✓
5. **Important:** Check Supabase → "service_requests" table → New row should appear ✓
6. Refresh page → Popup should NOT appear (localStorage prevents it) ✓

## Why This Happened

RLS is a **good security feature**, but it requires explicit policies for anonymous access. When enabled without proper policies for public-facing forms:
- All anonymous requests are denied
- Developers often silently catch and ignore these errors
- Users experience "ghost submissions" - looks like it worked but nothing saved

**Always add RLS policies for public forms before enabling RLS on those tables!**
