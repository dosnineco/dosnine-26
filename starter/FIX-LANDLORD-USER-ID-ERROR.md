# Fix: "new" has no field "landlord_user_id"

## Problem
The database trigger functions `increment_property_count()` and `decrement_property_count()` were referencing a non-existent field `landlord_user_id`. The properties table actually uses `owner_id`.

## Solution
Run the fix migration script to update the trigger functions with the correct column name.

## Steps to Fix

### Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the contents of `/starter/db-migrations/fix-property-count-trigger.sql`

### Option 2: Via Supabase CLI (if available)
```bash
cd /workspaces/dosnine-26/starter
supabase db execute --file db-migrations/fix-property-count-trigger.sql
```

## What was Fixed

### Database Functions
- Updated `increment_property_count()` to use `NEW.owner_id` instead of `NEW.landlord_user_id`
- Updated `decrement_property_count()` to use `OLD.owner_id` instead of `OLD.landlord_user_id`

### Documentation
- Fixed `/starter/Guides/AGENT_PAYMENT_SETUP.md` to show correct column names

## Verification
After running the fix, try creating a new property. The error should no longer occur and the property count should increment correctly.
