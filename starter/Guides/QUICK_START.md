# Quick Start Guide — Rentals Jamaica

## What Was Built

A complete rental property platform for Jamaica with:

✅ **Public Features**
- Browse & search rental properties
- Filter by parish, price, bedrooms
- View detailed property pages with image gallery
- Apply for properties as a renter

✅ **Landlord Features**
- Dashboard to manage properties
- Post new listings with up to 5 images
- Edit/delete properties
- Track applications

✅ **Admin Features**
- Manage all properties, users, applications
- View analytics (users, properties, applications)

✅ **Technical**
- Clerk authentication integrated
- Supabase database + Storage
- Next.js static generation for fast detail pages
- Tailwind CSS design
- Toast notifications

---

## 5-Minute Setup

### Step 1: Get Your Credentials

**Supabase:**
1. Go to https://supabase.com and create a project
2. Copy your `Project URL` and `Anon Key` from Settings > API

**Clerk:**
1. Go to https://clerk.com and create an app
2. Copy your `Publishable Key` and `Secret Key` from Dashboard

### Step 2: Update `.env.local`

In `/starter` folder, create `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret
```

### Step 3: Set Up Database

1. Go to your Supabase project → SQL Editor
2. Paste the entire content of `../supabase.sql`
3. Click "Run"

### Step 4: Create Storage Bucket

1. Supabase → Storage → Create new bucket
2. Name it: `property-images`
3. Make it **public** (allow all reads)

### Step 5: Create Supabase Storage Policy

In Supabase → Storage → property-images → Policies:
- Create policy to allow authenticated users to upload

Or for testing, allow all:
```sql
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-images')
```

### Step 6: Install & Run

```bash
cd starter
yarn install
yarn dev
```

Open http://localhost:3000 🎉

---

## User Roles

### Renter (Default)
- Browse properties
- View details
- Submit applications
- No dashboard access

### Landlord
- All renter features +
- `/landlord/dashboard` — view/edit/delete properties
- `/landlord/new-property` — post new listings with images

**To make a user a landlord:**
- Supabase → users table → set their `role` to `landlord`

### Admin
- All features +
- `/admin/dashboard` — manage all properties, users, applications

**To make a user an admin:**
- Supabase → users table → set their `role` to `admin`

---

## Key Routes

| Route | Public | Signed In | Purpose |
|-------|--------|-----------|---------|
| `/` | ✅ | ✅ | Landing page + featured properties |
| `/properties` | ✅ | ✅ | Browse all + filters + pagination |
| `/property/[slug]` | ✅ | ✅ | Property detail + apply form |
| `/landlord/dashboard` | ❌ | ✅ Landlord | Manage properties |
| `/landlord/new-property` | ❌ | ✅ Landlord | Post property |
| `/admin/dashboard` | ❌ | ✅ Admin | Admin controls |

---

## Testing Workflow

### 1. Create Accounts

1. Go to http://localhost:3000
2. Sign in with Clerk (email or social)
3. Two separate accounts: one for renter, one for landlord

### 2. Post a Property (as Landlord)

1. Change one user's role to `landlord` in Supabase
2. Sign in as that landlord
3. Click "Post Property" or go to `/landlord/dashboard`
4. Fill in details, upload 1-5 images
5. Click "Post Property"

### 3. Browse & Apply (as Renter)

1. Go to `/properties`
2. Search/filter for properties
3. Click on property card → property detail page
4. Fill in application form → submit
5. Check Supabase `applications` table for submission

### 4. Admin View

1. Change one user's role to `admin`
2. Sign in as that admin
3. Go to `/admin/dashboard`
4. Switch tabs to see properties, applications, users

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Clerk users + role (renter/landlord/admin) |
| `properties` | Rental listings |
| `property_images` | Images per property (max 5) |
| `applications` | Renter applications on properties |
| `waitlist` | Newsletter/interest signups |
| `tenancies` | Track which renter is in which property |

---

## Image Upload Flow

1. Landlord selects 1-5 images
2. Images upload to Supabase Storage (`property-images` bucket)
3. Public URLs stored in `property_images` table
4. Detail page loads images from these URLs

---

## Common Issues & Fixes

**"Cannot find module '@clerk/nextjs'"**
→ Run `yarn install` in `/starter`

**"Missing NEXT_PUBLIC_SUPABASE_URL"**
→ Ensure `.env.local` is in `/starter` folder and has all 4 keys

**Images not uploading**
→ Check Supabase Storage bucket exists and is public
→ Check bucket policies allow authenticated uploads

**Admin dashboard shows nothing**
→ Ensure user's `role` is set to `admin` in Supabase

**Properties not showing**
→ Ensure `status` is `'available'` in database
→ Ensure properties have images before they show in detail page

---

## Next: Going Live

### Before Production:

1. **Enable RLS (Row Level Security)** in Supabase
   - Only users can see/edit their own properties
   - Prevent unauthorized updates

2. **Set up Email Notifications**
   - Notify landlords when applications arrive
   - Notify renters on application status changes

3. **Add WhatsApp Integration**
   - Auto-message renters when property becomes available
   - Two-way chat for inquiries

4. **Deploy to Vercel**
   ```bash
   git push origin main
   # Connect to Vercel, add env vars
   ```

5. **DNS & Domain**
   - Point your domain to Vercel
   - Update Clerk allowed redirect URIs

---

## Support

**Supabase Issues:**
- Check SQL syntax in SQL editor
- Verify storage bucket is public
- Check auth policies under RLS

**Clerk Issues:**
- Verify keys in .env.local
- Check Clerk dashboard for allowed redirect URIs

**Next.js Issues:**
- Clear `.next` folder: `rm -rf .next`
- Restart dev server: `yarn dev`

---

## Congratulations! 🎉

You now have a production-ready rental platform tailored for Jamaica. Share it with landlords and renters in your network!

Questions? Check the main README.md or reach out to your developer.
