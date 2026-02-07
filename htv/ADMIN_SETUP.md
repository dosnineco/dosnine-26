# Admin Access Setup

## Overview
The HTV application uses admin-only access for the orders dashboard. Only users with `is_admin = true` in the users table can view and manage orders.

**Admin Pages:**
- `/admin` - Main dashboard with analytics and recent orders
- `/admin/orders` - Full order management with filtering

**Sign In:** Click "Admin Sign In" in the footer to authenticate with Clerk.

## Database Setup

The application uses the existing `users` table with the following structure:

```sql
create table public.users (
  id uuid not null default gen_random_uuid (),
  clerk_id text not null,
  email text not null,
  full_name text null,
  created_at timestamp without time zone null default now(),
  updated_at timestamp without time zone null default now(),
  is_admin boolean null default false,
  subscription_date timestamp without time zone null,
  is_subscribed boolean not null default false,
  payment_id text null,
  payment_status text null,
  trial_start_date timestamp without time zone null,
  is_trial_active boolean null default false,
  constraint users_pkey primary key (id),
  constraint users_clerk_id_key unique (clerk_id),
  constraint users_email_key unique (email)
);
```

## Setting Up Admin Access

### 1. Run the Database Migration

Execute the migration file at `/db-migrations/001_create_logo_uploads_bucket.sql` in your Supabase SQL editor. This will:
- Create the storage bucket for logo uploads
- Create the `htv_orders` table
- Set up the `is_admin()` helper function
- Configure admin-only RLS policies

### 2. Sign Up for an Account

1. Visit your HTV site and scroll to the footer
2. Click **"Sign Up for Admin"**
3. Complete the Clerk sign-up process
4. You'll be automatically created in the database with `is_admin = false`

### 3. Grant Admin Access

After signing up, grant yourself admin access via Supabase SQL editor:

```sql
-- Find your user
SELECT * FROM public.users WHERE email = 'your@email.com';

-- Grant admin access
UPDATE public.users
SET is_admin = true
WHERE email = 'your@email.com';
```

**Or by Clerk ID:**
```sql
UPDATE public.users
SET is_admin = true
WHERE clerk_id = 'clerk_user_id_here';
```

### 4. Access Admin Dashboard

1. Refresh the page or sign out and sign back in
2. Click "Sign In" in the footer
3. You'll be redirected to `/admin` dashboard
4. If access is denied, verify `is_admin = true` in the database

## How Admin Access Works

### RLS Policies
The `htv_orders` table has the following Row Level Security policies:

1. **Public Insert**: Anyone can submit orders (no authentication required)
2. **Admin Read**: Only admins can view orders
3. **Admin Update**: Only admins can update order status
4. **Admin Delete**: Only admins can delete orders

### Admin Check Function
```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE clerk_id = auth.jwt() ->> 'sub'
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This function:
- Extracts the Clerk user ID from the JWT token
- Checks if that user exists in the users table with `is_admin = true`
- Returns true/false

### Application-Level Check
The `/admin/orders` page includes additional checks:

```javascript
async function checkAdminStatus() {
  const { data, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('clerk_id', user.id)
    .single()

  if (!data?.is_admin) {
    toast.error('Admin access required')
    router.push('/')
    return
  }

  setIsAdmin(true)
}
```

## Security Features

✅ **Database-Level Security**: RLS policies enforce admin-only access at the database level
✅ **Application-Level Check**: React component verifies admin status before rendering
✅ **JWT Validation**: Supabase validates the Clerk JWT token automatically
✅ **Public Order Submission**: Customers can still submit orders without authentication
✅ **Automatic Redirect**: Non-admin users are automatically redirected to homepage

## Testing Admin Access

1. **Sign up** by clicking "Sign Up for Admin" in the footer
2. **Complete Clerk registration** (you'll be auto-created in database)
3. **Grant yourself admin access** via SQL:
   ```sql
   UPDATE public.users
   SET is_admin = true
   WHERE email = 'your@email.com';
   ```
4. **Sign in** using "Sign In" button in footer
5. You'll automatically be redirected to `/admin` dashboard

## Admin Features

### Analytics Dashboard (`/admin`)
- **Business Metrics**: Total orders, revenue, pending revenue, avg order value
- **Production Stats**: Total logos produced, completed orders, popular sizes, rush orders  
- **Worth Using Assessment**: Conversion rate, revenue per order, growth indicators
- **Recent Submissions**: Last 10 orders with quick actions
- **Download Logos**: Click download icon to save logos for printing

### Order Management (`/admin/orders`)
- **Filter by Status**: All, pending, verified, processing, completed
- **Update Status**: Change order status with dropdown
- **View Logos**: Preview customer-uploaded logos
- **Download for Printing**: One-click download of print-ready files
- **WhatsApp Integration**: Direct contact links
- **Revenue Tracking**: Real-time completed and pending revenue

## Troubleshooting
ount created! Contact admin to request access approval"
- Your account was created successfully but `is_admin = false`
- Run the SQL command to grant yourself admin access
- Then sign in again

### "Admin access required. Contact support to request access"
- Your account exists but doesn't have admin privileges
- Check database: `SELECT * FROM users WHERE email = 'your@email.com';`
- Grant access: `UPDATE users SET is_admin = true WHERE email = 'your@email.com';`

### Can't sign up
- Check Clerk Dashboard settings → Enable email/password authentication
- Ensure Clerk environment variables are set in `.env.local`

### "Access denied" error
- Verify your Clerk user ID matches the `clerk_id` in the users table
- Verify `is_admin = true` for your user
- Check Supabase connection and RLS policiesuser
- Ensure you're logged in with Clerk

### Can't see orders
- Run the database migration to set up RLS policies
- Check Supabase logs for any policy violations
- Verify the `is_admin()` function exists

### Orders not appearing
- Check if orders exist: `SELECT * FROM htv_orders;`
- Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'htv_orders';`
- Test the admin function: `SELECT is_admin();` (should return true when logged in as admin)

## UI Design

The application uses a light gray highlight scheme:
- **Form backgrounds**: `bg-gray-100`, `bg-gray-200`
- **Input fields**: `bg-gray-50`
- **Hover states**: `hover:bg-gray-300`
- **Admin cards**: `bg-gray-100`, `bg-accent/10`
- **No shadows**: All shadow classes removed for a flat, modern design
- **No borders**: All borders removed except for functional table dividers
