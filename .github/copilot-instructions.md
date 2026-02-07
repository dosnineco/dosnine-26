# Dosnine Monorepo - AI Agent Instructions
do not waste token explaing what you have done nor should you make markdown file just code what is asked of you.
## Project Architecture

This is a **monorepo** with multiple Next.js applications sharing common patterns:

- **`/starter`** - Main Dosnine property marketplace (dosnine.com) running on port 3000
  - Property requests marketplace where buyers/renters post requests
  - Agent subscription system with payment plans
  - Lead marketplace for real estate agents
  - Complex RLS policies for data access control

- **`/htv`** - HTV logo cutting business (htv.dosnine.com) running on port 3001
  - Simple 3-step order form for custom logo cutting
  - Logo file uploads to Supabase Storage
  - WhatsApp integration for order communication
  - **No admin authentication** - simplified to public submissions only

## Critical Supabase RLS Pattern ⚠️

**MOST IMPORTANT**: Many tables use Row Level Security (RLS) where:
- Public users can **INSERT** but **CANNOT SELECT**
- Authenticated admins can SELECT/UPDATE/DELETE

**Never do this:**
```javascript
// ❌ WRONG - will fail with permission error
const { data, error } = await supabase
  .from('htv_orders')
  .insert([record])
  .select()  // Public users can't SELECT!
```

**Always do this:**
```javascript
// ✅ CORRECT - no .select() after insert
const { error } = await supabase
  .from('htv_orders')
  .insert([record])

if (error) throw error

// Return synthetic data if needed for UI
return { 
  id: Date.now().toString(36) + Math.random().toString(36).substring(2),
  ...otherData 
}
```

**Why**: RLS policies in `db-migrations/001_*.sql` files allow public INSERT but restrict SELECT to admins via `is_admin()` helper function.

## Database Workflow

1. **All schema changes go in `db-migrations/` as numbered SQL files**
   - Format: `001_descriptive_name.sql`, `002_next_change.sql`
   - Example: `001_create_logo_uploads_bucket.sql`
   - Include RLS policies, indexes, and helper functions in migration files

2. **Common RLS pattern**:
   ```sql
   -- Allow public inserts
   CREATE POLICY "Allow public inserts"
   ON public.table_name FOR INSERT TO public WITH CHECK (true);
   
   -- Only admins can read
   CREATE POLICY "Allow admin reads"
   ON public.table_name FOR SELECT TO authenticated USING (is_admin());
   ```

3. **Execute migrations manually** in Supabase SQL Editor - no migration runner

## UI/Design System

### Core Principles
- **No borders** - clean, flat design
- **No shadows** - except where absolutely necessary
- **Light gray theme** - `bg-gray-100`, `bg-gray-200`, `bg-gray-50` for sections

### Color System
Both projects use custom accent colors defined in **two places**:

1. **`tailwind.config.js`** - for Tailwind utility classes:
   ```javascript
   colors: {
     accent: '#5A7ACD',  // or custom hex
     brand: '#6E026F',
   }
   ```

2. **`styles/globals.css`** - for CSS variables:
   ```css
   :root {
     --accent-color: #F55353;
     --accent-color-hover: #d14a4a;
   }
   ```

**Usage**: Use `bg-accent`, `text-accent` from Tailwind OR `var(--accent-color)` in custom CSS.

### Common UI Patterns
- Form inputs: `bg-gray-50` with `rounded-lg`, no borders, `py-3 px-4`
- Buttons: `bg-accent` with `hover:bg-accent/90`, rounded corners (`rounded-xl`)
- Cards/sections: `bg-gray-100` or `bg-gray-200` backgrounds, generous padding
- Icons from `react-icons/fi` (Feather Icons)

## Development Commands

```bash
# Starter (main marketplace)
cd starter
yarn dev          # Runs on http://localhost:3000

# HTV (logo cutting)
cd htv
yarn dev          # Runs on http://localhost:3001

# Build for production
yarn build
yarn start
```

**Note**: Projects run on **different ports** - check `package.json` scripts for `-p` flag.

## Tech Stack

- **Next.js 13-14** (Pages Router, not App Router)
- **React 18** with functional components and hooks
- **Supabase** for PostgreSQL database + file storage
- **Tailwind CSS 3** for styling
- **React Hot Toast** for notifications
- **React Icons** (Feather Icons library)
- **Clerk** (in starter only) for authentication

## File Structure Conventions

```
project/
├── pages/           # Next.js pages (route-based)
├── components/      # Reusable React components
├── lib/
│   └── supabase.js  # Supabase client initialization
├── styles/
│   └── globals.css  # Global styles + CSS variables
├── db-migrations/   # SQL migration files (numbered)
├── public/          # Static assets
└── package.json     # Check "dev" script for port
```

## Common Gotchas

1. **RLS Permission Errors**: If submissions fail with "permission denied", check if code is trying to `.select()` after `.insert()` - public users often can't read back their own inserts.

2. **Port Conflicts**: Each project runs on a different port. Check `package.json` scripts section.

3. **Environment Variables**: Both projects need:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Clerk keys (starter only)

4. **Currency**: All pricing in **JMD (Jamaican Dollars)** - format with `.toLocaleString()`

5. **WhatsApp Integration**: Phone numbers use Jamaica format (876-xxx-xxxx) and WhatsApp links to `https://wa.me/18763369045`

## Workflow Best Practices

1. **Making UI changes**: Update component files directly, styles cascade from `globals.css` and Tailwind config
2. **Adding features**: Check existing components for patterns (e.g., `PropertyRequestsMarketplace`, `index.js` in HTV)
3. **Database changes**: Create new numbered migration file in `db-migrations/`, include RLS policies
4. **Testing**: Manual testing recommended - no automated test suite currently

## When User Requests Changes

- **"Remove admin login"** → Delete admin pages, remove Clerk imports, simplify to public submission only
- **"Change colors"** → Update both `tailwind.config.js` AND `globals.css` CSS variables
- **"Fix database save error"** → Check RLS policies, likely need to remove `.select()` from insert chain
- **"Update pricing"** → Modify constants at top of page file (e.g., `PRICING` object)

## Key Files to Reference

- `htv/pages/index.js` - Full example of form with file upload, Supabase integration, RLS-safe inserts
- `htv/db-migrations/001_create_logo_uploads_bucket.sql` - Complete example of table + storage bucket + RLS policies
- `starter/styles/globals.css` - Accent color system and standardized button classes
- `starter/components/PropertyRequestsMarketplace.js` - Complex marketplace component with filtering
