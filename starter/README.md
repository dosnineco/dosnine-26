# Rentals Jamaica — Starter

A complete Next.js + Supabase rental property listing platform tailored for Jamaica with Clerk authentication, landlord dashboards, image uploads, and admin controls.

## Features

✅ **Public Browsing**
- Search and filter properties by parish, price, bedrooms
- Pagination with 12 properties per page
- Static generation for fast slug-based property details
- Image gallery for each property

✅ **Landlord Features**
- Dashboard to manage properties
- Post new properties with up to 5 images
- Image upload to Supabase Storage
- Edit/delete properties
- View applications from renters

✅ **Admin Dashboard**
- View all properties, applications, users
- Manage listings and user roles
- Track application status

✅ **Authentication**
- Clerk authentication (sign in, sign up)
- Automatic user sync to Supabase
- Role-based access control (renter, landlord, admin)

✅ **Application System**
- Renters can submit applications on property pages
- Store applications in database
- Admin can review and manage applications

## Tech Stack

- **Frontend:** Next.js 13, React, Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Clerk
- **Storage:** Supabase Storage (for images)
- **Hosting:** Vercel (recommended)

## Setup Instructions

### 1. Prerequisites
- Node.js 16+ and Yarn/npm
- Supabase account (https://supabase.com)
- Clerk account (https://clerk.com)

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-publishable-key
CLERK_SECRET_KEY=your-secret-key
```

### 3. Database Setup

1. Create a Supabase project
2. In the SQL editor, run the entire `../supabase.sql` file
3. Create a storage bucket called `property-images`:
   - Go to Storage → Create new bucket
   - Name: `property-images`
   - Make it public

### 4. Install & Run

```bash
yarn install
yarn dev
```

The app will start at `http://localhost:3000`

## File Structure

```
starter/
├── pages/
│   ├── index.js              # Landing page
│   ├── properties.js         # Browse all properties (with filters & pagination)
│   ├── property/[slug].js    # Detail page (static generation)
│   ├── landlord/
│   │   ├── dashboard.js      # Manage properties
│   │   └── new-property.js   # Post property with images
│   ├── admin/
│   │   └── dashboard.js      # Admin controls
│   └── _app.js               # Clerk provider, global layout
├── components/
│   ├── Header.js
│   ├── Footer.js
│   ├── PropertyCard.js
│   └── Filters.js
├── lib/
│   └── supabase.js           # Supabase client init
├── styles/
│   └── globals.css
├── public/
│   └── placeholder.png
└── package.json
```

## Key Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero + featured properties + stats |
| Browse | `/properties` | All properties with filters & pagination |
| Detail | `/property/[slug]` | Full property view + application form |
| Landlord Dashboard | `/landlord/dashboard` | Manage your properties |
| Post Property | `/landlord/new-property` | Create listing + upload images |
| Admin | `/admin/dashboard` | Manage all properties, users, applications |

## Database Schema

See `../supabase.sql` for the complete schema. Key tables:

- `users` — Store Clerk users + their role
- `properties` — Rental listings
- `property_images` — Gallery images for properties
- `applications` — Renter applications on properties
- `waitlist` — Newsletter/waitlist signups
- `tenancies` — Link tenants to properties (for tracking occupancy)

## Deployment

### Deploy to Vercel

```bash
git push origin main
# Connect repo to Vercel and deploy
```

Then update environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## Customization

### Update Parishes List
Edit `PARISHES` in `pages/landlord/new-property.js`

### Change Colors
Update Tailwind classes in components (blue-600, green-600, etc.)

### Modify Image Upload Limit
Change `if (images.length + files.length > 5)` in `pages/landlord/new-property.js`

### Add New Tabs to Admin
Edit the admin dashboard tabs in `pages/admin/dashboard.js`

## Next Steps (Optional Features)

- [ ] WhatsApp integration for auto-messaging
- [ ] Email notifications for applications
- [ ] Tenant rent payment tracking
- [ ] Property maintenance request system
- [ ] Automated availability alerts
- [ ] Landlord earnings dashboard
- [ ] Tenant reviews/ratings

## Support

For issues or questions:
1. Check Supabase logs for database errors
2. Check Clerk dashboard for auth issues
3. Review browser console for client errors

## License

MIT
