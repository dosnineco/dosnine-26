-- Grant Admin Access to Your Account
-- Run this after signing up through the website

-- Option 1: Grant admin access by email
UPDATE public.users
SET is_admin = true
WHERE email = 'your@email.com';  -- Replace with your email

-- Option 2: Grant admin access by Clerk ID (if you know it)
-- UPDATE public.users
-- SET is_admin = true
-- WHERE clerk_id = 'clerk_user_xxxxx';  -- Replace with your Clerk user ID

-- Verify the change
SELECT clerk_id, email, full_name, is_admin, created_at
FROM public.users
WHERE email = 'your@email.com';  -- Replace with your email

-- Expected result: is_admin should be TRUE

-- If you need to find all users in the system:
-- SELECT clerk_id, email, full_name, is_admin, created_at
-- FROM public.users
-- ORDER BY created_at DESC;
