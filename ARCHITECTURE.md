# System Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  Landing     │  │  Browse      │  │  Property      │   │
│  │  Page (/)    │  │  Page (/...) │  │  Detail Page   │   │
│  └──────────────┘  └──────────────┘  └────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  Landlord    │  │  Admin       │  │  Clerk Auth    │   │
│  │  Dashboard   │  │  Dashboard   │  │  Pages         │   │
│  └──────────────┘  └──────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
        ┌─────────────┐ ┌──────────┐ ┌──────────┐
        │ Next.js     │ │  Clerk   │ │ Supabase │
        │ API Routes  │ │  SDK     │ │ JS SDK   │
        └─────────────┘ └──────────┘ └──────────┘
                │            │            │
        ┌───────┴────────────┼────────────┴───────┐
        │                    │                     │
        ▼                    ▼                     ▼
   ┌────────────┐     ┌────────────┐      ┌──────────────┐
   │  API       │     │  Clerk     │      │  Supabase    │
   │  Routes    │     │  Backend   │      │  Backend     │
   │  /api/*    │     │  Auth      │      │  (PostgreSQL)│
   └────────────┘     └────────────┘      └──────────────┘
                            │                     │
                ┌───────────┴─────────────────────┤
                │                                  │
                ▼                                  ▼
        ┌──────────────┐                  ┌───────────────┐
        │ Clerk        │                  │  PostgreSQL   │
        │ Users &      │                  │  Database     │
        │ Sessions     │                  │  Tables:      │
        └──────────────┘                  │  - users      │
                                          │  - properties │
                                          │  - images     │
                                          │  - apps       │
                                          │  - waitlist   │
                                          │  - tenancies  │
                                          └───────────────┘
                                                 │
                                    ┌────────────┴─────────┐
                                    │                      │
                                    ▼                      ▼
                            ┌──────────────┐      ┌─────────────┐
                            │  Supabase    │      │  Supabase   │
                            │  Storage     │      │  Auth       │
                            │  (property-  │      │  (RLS)      │
                            │   images)    │      └─────────────┘
                            └──────────────┘
```

---

## Component Hierarchy

```
_app.js (Clerk Provider)
├── Header
│   ├── Logo
│   ├── Nav Links
│   └── Auth Button (Clerk)
│
├── [Page Component]
│   ├── For Public Pages:
│   │   └── Content
│   │
│   ├── For Landlord Pages:
│   │   ├── Auth Check
│   │   └── Dashboard/Form
│   │
│   └── For Admin Pages:
│       ├── Role Check
│       └── Dashboard
│
└── Footer
    ├── Links
    └── Contact Info
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────┐
│                       users                             │
├─────────────────────────────────────────────────────────┤
│ id (uuid) PRIMARY KEY                                   │
│ clerk_id (text) UNIQUE                                  │
│ full_name, email, phone                                 │
│ role ('renter' | 'landlord' | 'admin')                 │
│ avatar_url, verified_at                                 │
│ created_at, updated_at                                  │
└─────────────────────────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
┌──────────────────────┐  ┌────────────────────────┐
│    properties        │  │    tenancies           │
├──────────────────────┤  ├────────────────────────┤
│ id PRIMARY KEY       │  │ id PRIMARY KEY         │
│ owner_id FK users    │  │ property_id FK prop    │
│ title, description   │  │ tenant_id FK users     │
│ slug UNIQUE          │  │ start_date, end_date   │
│ parish, town, address│  │ rent_amount, status    │
│ price, currency      │  │ created_at             │
│ bedrooms, bathrooms  │  └────────────────────────┘
│ status (enum)        │
│ is_featured, views   │
│ available_date       │
│ created_at, updated  │
└──────────────────────┘
           │
           ├──────────────────┬──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌────────────────┐ ┌─────────────┐ ┌─────────────┐
    │ property_images│ │applications │ │  waitlist   │
    ├────────────────┤ ├─────────────┤ ├─────────────┤
    │ id PRIMARY KEY │ │ id PRIMARY  │ │ id PRIMARY  │
    │ property_id FK │ │ property_id │ │ full_name   │
    │ image_url      │ │ full_name   │ │ email       │
    │ storage_path   │ │ email       │ │ phone       │
    │ position       │ │ phone       │ │ parish      │
    │ created_at     │ │ message     │ │ max_budget  │
    └────────────────┘ │ status      │ │ bed_needed  │
                       │ created_at  │ │ created_at  │
                       └─────────────┘ └─────────────┘
```

---

## Authentication Flow

```
User visits site
     │
     ▼
Clerk Provider checks session
     │
     ├─ NOT SIGNED IN → Show public pages only
     │                  (/, /properties, /property/[slug])
     │
     └─ SIGNED IN
        │
        ├─ Fetch user from Supabase (via clerk_id)
        │
        ├─ Check role
        │
        ├─ If role = 'renter' → Public pages + /property/[slug]/apply
        │
        ├─ If role = 'landlord' → /landlord/dashboard + /landlord/new-property
        │
        └─ If role = 'admin' → /admin/dashboard
```

---

## Image Upload Flow

```
Landlord uploads images
     │
     ▼
File input accepts up to 5 files
     │
     ▼
For each file:
  ├─ Generate unique filename
  ├─ Upload to Supabase Storage (property-images bucket)
  └─ Get public URL
     │
     ▼
URLs stored in property_images table
     │
     ├─ position: 0 (first image shown in listings)
     └─ image_url: public accessible URL
     │
     ▼
Detail page loads & displays all images
  ├─ Main image (currently selected)
  └─ Thumbnail gallery (click to switch)
```

---

## Page Generation Strategy

```
┌─────────────────────────────────────────────────┐
│              Page Generation Types              │
├─────────────────────────────────────────────────┤
│                                                 │
│ STATIC GENERATION (getStaticProps)              │
│ ├─ /                (landing)                   │
│ ├─ /properties      (with pagination at client) │
│ └─ /property/[slug] (per property)              │
│    └─ Revalidate every 60s (ISR)               │
│                                                 │
│ SERVER SIDE RENDERING (getServerSideProps)     │
│ ├─ /landlord/dashboard (requires auth)         │
│ ├─ /landlord/new-property                      │
│ └─ /admin/dashboard                            │
│                                                 │
│ CLIENT SIDE RENDERING (useEffect)              │
│ ├─ Form submissions                            │
│ ├─ Filters & search                            │
│ └─ Real-time notifications (toast)             │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Security Layers

```
┌──────────────────────────────────────────────┐
│         Security Implementation              │
├──────────────────────────────────────────────┤
│                                              │
│ AUTHENTICATION                               │
│ └─ Clerk handles all auth (secure, managed) │
│                                              │
│ AUTHORIZATION                                │
│ ├─ Next.js middleware checks auth           │
│ └─ Supabase RLS (row-level security)        │
│                                              │
│ API SECURITY                                 │
│ ├─ Clerk secret key for server-side         │
│ └─ Anon key + RLS for client queries        │
│                                              │
│ STORAGE SECURITY                             │
│ ├─ Supabase Storage bucket made public      │
│ └─ Objects are read-only (upload via API)   │
│                                              │
│ DATABASE SECURITY (To implement)             │
│ ├─ Enable RLS on all tables                 │
│ ├─ Policies for user isolation              │
│ └─ Service role for admin operations        │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
Developer
   │
   ▼
GitHub repo (dosnine-26)
   │
   ├─ Automatic deploy to Vercel
   │
   ▼
Vercel CDN
│
├─ Static files (cached globally)
├─ Next.js runtime (serverless functions)
└─ Database → Supabase (external)
   │
   ├─ PostgreSQL
   ├─ Storage
   └─ Auth → Clerk (external)

Result: Fast, scalable, secure platform
```

---

This architecture provides:
- ✅ Scalability (Vercel + Supabase)
- ✅ Security (Clerk + RLS)
- ✅ Performance (Static generation + CDN)
- ✅ Maintainability (Clear separation of concerns)
- ✅ Growth (Easy to add features)
