# Analytics Setup Guide

## Overview
The site now tracks page views automatically and displays analytics at `/admin/analytics`.

## Quick Start (3 steps)

### 1. Apply the Database Migration
The `page_clicks` table must exist in your Supabase database.

**Option A: Via Supabase SQL Editor (easiest)**
- Go to your Supabase project → SQL Editor
- Create a new query and paste the contents of `starter/supabase-analytics-migration.sql`
- Click "Run"
- Confirm you see success messages for CREATE TABLE and CREATE INDEX

**Option B: Via psql (CLI)**
```bash
psql postgresql://postgres:password@db.supabase.co/postgres < starter/supabase-analytics-migration.sql
```

### 2. Set Environment Variables
The server needs `SUPABASE_SERVICE_ROLE_KEY` to write analytics data.

**Local Development (`.env.local` in `starter/` folder):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find your keys:
- Go to Supabase Project → Settings → API
- Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **KEEP SECRET**

**Production (Vercel/Netlify/your host):**
- Add `SUPABASE_SERVICE_ROLE_KEY` as a secret environment variable
- Do NOT commit it to version control

### 3. Restart the Server
```bash
npm run dev
```
The site will now:
- Auto-track page views (logged to browser console when visiting pages)
- Insert rows into `page_clicks` table via `/api/track` endpoint
- Display analytics at `/admin/analytics`

---

## How It Works

### Tracking Flow
1. User visits a page → `useAnalyticsTracking()` hook fires (in `_app.js`)
2. Hook sends POST to `/api/track` with: path, source (referrer domain), session ID, user agent
3. Server endpoint (`/api/track`) uses `SUPABASE_SERVICE_ROLE_KEY` to insert into `page_clicks`
4. Admin visits `/admin/analytics` → queries `page_clicks` server-side and displays summary

### Key Files
- **Client tracking:** `starter/lib/useAnalyticsTracking.js` (fires on every route change)
- **Server API:** `starter/pages/api/track.js` (inserts into DB using service role key)
- **Admin UI:** `starter/pages/admin/analytics.js` (server-side queries Supabase)
- **Migration SQL:** `starter/supabase-analytics-migration.sql` (creates table + view)

---

## Verify Setup

### Check if Table Exists
```bash
cd starter
SUPABASE_SERVICE_ROLE_KEY=your_key node check-analytics-setup.js check
```

### Insert Test Data
```bash
cd starter
SUPABASE_SERVICE_ROLE_KEY=your_key node check-analytics-setup.js insert-test
```

Then visit `/admin/analytics` and click "Refresh" — you should see test data.

---

## Debugging

### No data shows in `/admin/analytics`?

1. **Check environment variables:**
   ```bash
   # In starter/ directory
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```
   If empty, `.env.local` is not being read. Restart the dev server.

2. **Check browser console:**
   - Open DevTools → Console
   - Navigate to a page or click a link
   - Look for logs like "Analytics: sending { path: ... }"
   - If you see "Analytics POST success", data was sent to server

3. **Check server logs:**
   - Look at terminal running `npm run dev`
   - Search for error messages from `/api/track`
   - If you see "Insert failed", check Supabase error

4. **Query Supabase directly:**
   ```sql
   -- In Supabase SQL Editor
   SELECT COUNT(*) as total_clicks FROM page_clicks;
   SELECT * FROM page_clicks ORDER BY created_at DESC LIMIT 10;
   ```

5. **Check RLS policies:**
   - Go to Supabase → Authentication → Policies
   - If `page_clicks` has RLS enabled, the anon key may be blocked
   - Solution: Use service role key (which we do in `/api/track`)

### Still stuck?
- Verify all 3 env vars are set correctly (copy/paste from Supabase Settings)
- Ensure migration SQL was run (check Supabase Tables list)
- Check Supabase project URL is correct
- Restart dev server after changing `.env.local`

---

## Optional: Configure Range Filters

The analytics page supports multiple time ranges via URL params:
- `/admin/analytics?range=day` — last 24 hours (default)
- `/admin/analytics?range=week` — last 7 days
- `/admin/analytics?range=month` — last 30 days
- `/admin/analytics?range=year` — last 365 days

Use the "Today / Week / Month" buttons on the page to switch ranges.

---

## Next Steps

- **Export data:** Add CSV export button (future enhancement)
- **Custom date range:** Add date picker UI (future enhancement)
- **Real-time updates:** Add WebSocket subscriptions (future enhancement)
- **Segment analytics:** Track which properties generate most clicks (add property_id)
