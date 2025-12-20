# Fix for Visitor Email RLS Error

## The Problem
The API was using the anon key which is subject to RLS policies. Even with permissive policies, there can be issues.

## The Solution
The API now uses the service role key which bypasses RLS completely.

## Required Setup

### 1. Add Service Role Key to Environment

You need to add `SUPABASE_SERVICE_ROLE_KEY` to your environment:

#### For Local Development (.env.local):
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Get the Service Role Key:
1. Go to your Supabase Dashboard
2. Navigate to: **Settings → API**
3. Copy the `service_role` key (⚠️ **KEEP THIS SECRET**)
4. Add it to your `.env.local` file

### 2. For Production (Vercel/Other):
Add `SUPABASE_SERVICE_ROLE_KEY` as an environment variable in your hosting platform.

### 3. Restart Dev Server
```bash
# Stop the server (Ctrl+C)
npm run dev
```

## Files Changed
- ✅ Created `/lib/supabaseAdmin.js` - Admin client with service role
- ✅ Updated `/api/visitor-email.js` - Now uses admin client
- ✅ Updated `/components/VisitorEmailPopup.js` - Fixed agent check query

## Test After Setup
1. Make sure `SUPABASE_SERVICE_ROLE_KEY` is in your environment
2. Restart your dev server
3. Wait for the popup (3 seconds)
4. Fill out the form and submit
5. Should see success without RLS errors!
