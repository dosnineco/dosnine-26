# 🚀 Quick Start Guide

## Step 1: Local Setup (5 minutes)

```bash
cd /workspaces/dosnine-26/starter
yarn install
```

## Step 2: Configure Accounts

### Clerk Account
1. Visit https://dashboard.clerk.com
2. Create new app
3. Copy keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### Supabase Account
1. Visit https://supabase.com
2. Create new project
3. Copy keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Setup Database

In Supabase SQL editor, run:
```sql
-- Copy entire contents of /supabase.sql and paste here
```

Then create storage bucket:
- Name: `property-images`
- Make it **Public**

## Step 4: Environment File

Create `.env.local` in `/starter/`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
```

## Step 5: Run Locally

```bash
cd starter
yarn dev
```

Visit: http://localhost:3000

Test:
- [ ] Sign up with email
- [ ] Post a property
- [ ] Upload images
- [ ] Browse properties

## Step 6: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Add environment variables in Vercel dashboard (same 4 keys from `.env.local`).

## Step 7: Go Live

- [ ] Test on production domain
- [ ] Add custom domain (if you have one)
- [ ] Enable RLS on Supabase (security)
- [ ] Share with users

---

## 🎯 Key Files to Know

| File | Purpose |
|------|---------|
| `pages/index.js` | Home page |
| `pages/properties.js` | Browse all listings |
| `pages/property/[slug].js` | Individual property |
| `pages/landlord/dashboard.js` | Your properties |
| `pages/landlord/new-property.js` | Post new property |
| `pages/_app.js` | Auth setup |
| `lib/supabase.js` | Database connection |

---

## 🔧 Common Tasks

### Add a test property manually

```sql
INSERT INTO properties (owner_id, title, slug, parish, town, price, bedrooms, bathrooms, status)
VALUES (
  (SELECT id FROM users LIMIT 1),
  'Test House',
  'test-house',
  'Kingston',
  'Kingston 6',
  50000,
  3,
  2,
  'available'
);
```

### View all users

```sql
SELECT * FROM users;
```

### Check property images

```sql
SELECT * FROM property_images;
```

---

## 📱 Test Credentials

- **User Role**: Sign up as normal user (renter)
- **Landlord Role**: Manually update user `role` in DB to 'landlord'
- **Admin Role**: Manually update user `role` in DB to 'admin'

---

## ⚡ Tips

1. **Images take time to upload** — Users can upload up to 5 images (each ~5MB)
2. **Pagination is client-side** — Shows 12 properties per page
3. **Slug is auto-generated** — From property title
4. **Static pages regenerate every 60 seconds** — (ISR)
5. **Clerk handles all auth** — No manual user tables needed

---

## ❌ If Something Breaks

### Port 3000 already in use
```bash
lsof -ti:3000 | xargs kill -9
yarn dev
```

### Tailwind not working
```bash
rm -rf .next node_modules
yarn install
yarn dev
```

### Database errors
- Check your `.env.local` keys
- Verify `supabase.sql` was run
- Check Supabase credentials

### Images not uploading
- Check `property-images` bucket exists
- Make bucket **public**
- Verify Supabase Storage is enabled

---

## ✅ Production Checklist

- [ ] All `.env` vars set on Vercel
- [ ] Custom domain configured
- [ ] SSL certificate installed (automatic on Vercel)
- [ ] RLS policies enabled on Supabase
- [ ] Backup scheduled (Supabase auto-backups)
- [ ] Analytics dashboard checked
- [ ] Email notifications ready (for later)
- [ ] Tested full user flow (signup → post → browse)

---

**You're all set! 🎉 Start accepting rentals now.**
