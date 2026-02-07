# Dosnine HTV Logo Cutting

Professional HTV logo cutting service for barbers, food spots, churches, and schools in Kingston, Jamaica.

## 🔒 Admin-Only Access

This application uses **admin-only access** for the orders dashboard. Only users with `is_admin = true` in the database can view and manage orders. Customers can still submit orders without authentication.

**See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for detailed admin configuration instructions.**

## Features

✅ **3-Step Order Process**
- Order details (size, color, quantity, rush)
- Logo upload with preview (PNG, JPG, SVG, PDF)
- Delivery & contact information

✅ **Pricing Features**
- Automatic bulk discounts (10-20%)
- Kingston delivery fees
- Rush order option (+50%)
- Live price calculation
- Minimum 4 logos per order

✅ **Supabase Integration**
- Logo files stored in Supabase Storage (`htv-logos` bucket)
- Orders saved to database with full tracking
- Row-level security for admin-only access

✅ **Clerk Authentication**
- Sign-in button in footer
- Secure admin access via email validation
- Protected admin routes
- Automatic admin verification

✅ **Admin Analytics Dashboard** (`/admin`)
- Business health metrics (conversion rate, growth indicators)
- Total orders, revenue, and production stats
- "Worth using" assessment with clear indicators
- Recent submissions overview
- Download logos for printing
- Quick action buttons

✅ **Order Management** (`/admin/orders`)
- View all orders with filtering
- Filter by status (pending, verified, processing, completed)
- Update order status
- Download uploaded logos for printing
- Revenue tracking (completed + pending)
- WhatsApp integration

## Setup Instructions

### 1. Install Dependencies

```bash
cd htv
yarn install
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to Project Settings → API
3. Copy your `URL` and `anon public` key
4. Run the migration file in SQL Editor:
   ```
   db-migrations/001_create_logo_uploads_bucket.sql
   ```

### 3. Set Up Clerk

1. Create a Clerk account at https://clerk.com
2. Create a new application
3. Copy your `Publishable Key` and `Secret Key`

### 4. Configure Environment Variables

Update `.env.local` with your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
```

### 5. Run Development Server

```bash
yarn dev
```

Open [http://localhost:3001](http://localhost:3001)

## Pricing Structure

- **Small (3-5"):** JMD 800
- **Medium (6-9"):** JMD 1,200
- **Large (10-12"):** JMD 1,800

**Bulk Discounts:**
- 10-19 logos → 10% off
- 20-49 logos → 15% off
- 50+ logos → 20% off

**Delivery Fees:**
- Half Way Tree: JMD 500
- Constant Spring: JMD 700
- New Kingston: JMD 500
- Portmore: JMD 1,000
- Knutsford Express: JMD 300

## Admin Access

**Sign In:** Click "Admin Sign In" in the footer (uses Clerk authentication)

**Admin Pages:**
- `/admin` - Analytics dashboard with business metrics and "worth using" assessment
- `/admin/orders` - Full order management with filtering and downloads

**Key Features:**
- 📊 Business health indicators (conversion rate, growth stage)
- 💰 Revenue tracking (completed + pending)
- 📥 Download logos for printing (one-click download)
- 📈 Production stats (total logos, popular sizes, rush orders)
- 🏢 Recent order overview with quick actions

See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for setup instructions.

## Color Scheme

- **Brand Purple:** #6E026F
- **Accent Blue:** #5A7ACD
- Black & White base

## Database Schema

### `htv_orders` table:
- id (UUID)
- business_name (TEXT)
- phone (TEXT)
- email (TEXT)
- size (TEXT)
- color (TEXT)
- quantity (INTEGER, min 4)
- delivery_area (TEXT)
- rush_order (BOOLEAN)
- logo_url (TEXT)
- logo_filename (TEXT)
- subtotal (INTEGER)
- delivery_fee (INTEGER)
- total (INTEGER)
- status (TEXT: pending, verified, processing, completed)
- notes (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Set custom domain: `htv.dosnine.com`
5. Deploy!

## Support

Questions? WhatsApp +1 876 336 9045

