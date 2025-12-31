# Setup Impression Tracking

## Problem
The impression tracking isn't working because duplicate database functions exist.

## Solution
Run this SQL in your **Supabase SQL Editor**:

```sql
-- Step 1: Drop ALL existing functions (cleanup)
DROP FUNCTION IF EXISTS increment_ad_impressions(INTEGER);
DROP FUNCTION IF EXISTS increment_ad_clicks(INTEGER);
DROP FUNCTION IF EXISTS increment_ad_impressions(UUID);
DROP FUNCTION IF EXISTS increment_ad_clicks(UUID);

-- Step 2: Create new UUID-compatible functions
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE advertisements
  SET 
    impressions = impressions + 1,
    last_impression_at = NOW()
  WHERE id = ad_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE advertisements
  SET clicks = clicks + 1
  WHERE id = ad_id;
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION increment_ad_impressions(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_ad_clicks(UUID) TO anon, authenticated;
```

## How to Apply

1. Go to your Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire SQL block above
5. Paste it into the editor
6. Click "Run" or press Ctrl/Cmd + Enter

## Verify It Worked

After running the SQL, test it:

```bash
cd /workspaces/dosnine-26/starter
node test-impression-tracking.js
```

You should see:
```
✅ Function executed successfully
✅ Updated data: { impressions: 1, last_impression_at: '2025-...' }
🎉 Impression tracking is working!
```

## What This Does

- **Impressions**: Count when someone sees an ad (50% visible on screen)
- **Clicks**: Count when someone visits the ad detail page
- **Visible to all**: Shows "👁️ X views 🔗 Y clicks" on ads
- **Real-time updates**: Counts update immediately in the UI
