-- Supabase SQL schema for Rental Jamaica
-- Run this in Supabase SQL editor (or psql if you prefer)

-- enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique,
  full_name text,
  email text unique,
  phone text,
  role text default 'renter', -- 'renter' | 'landlord' | 'admin'
  verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete cascade,
  title text not null,
  slug text unique,
  description text,
  parish text,
  town text,
  address text,
  price numeric,
  currency text default 'JMD',
  type text default 'rent', -- 'rent' | 'sale'
  bedrooms int,
  bathrooms int,
  status text default 'available', -- 'available' | 'coming_soon' | 'rented'
  is_featured boolean default false,
  views bigint default 0,
  available_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  image_url text,
  storage_path text,
  position int default 0,
  created_at timestamptz default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  monthly_income numeric,
  message text,
  status text default 'new', -- new | reviewed | approved | rejected
  created_at timestamptz default now()
);

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  phone text,
  email text,
  preferred_parish text,
  max_budget numeric,
  bedrooms_needed int,
  created_at timestamptz default now()
);

create table tenancies (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  tenant_id uuid references users(id) on delete cascade,
  start_date date,
  end_date date,
  rent_amount numeric,
  rent_status text default 'active', -- active | ended
  created_at timestamptz default now()
);

-- Property Boosts table for advertising system
create table property_boosts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  owner_id uuid references users(id) on delete cascade,
  payment_id text not null,
  amount numeric not null default 2500,
  currency text default 'JMD',
  boost_start_date timestamptz not null,
  boost_end_date timestamptz not null,
  status text default 'active', -- active | expired | cancelled
  impressions bigint default 0,
  clicks bigint default 0,
  last_shown_at timestamptz,
  rotation_count int default 0,
  created_at timestamptz default now()
);

-- Indexes for faster searches
create index if not exists properties_parish_idx on properties(parish);
create index if not exists properties_price_idx on properties(price);
create index if not exists properties_status_idx on properties(status);
create index if not exists properties_is_featured_idx on properties(is_featured);
create index if not exists properties_slug_idx on properties(slug);
create index if not exists properties_owner_id_idx on properties(owner_id);
create index if not exists users_clerk_id_idx on users(clerk_id);
create index if not exists property_boosts_status_idx on property_boosts(status);
create index if not exists property_boosts_dates_idx on property_boosts(boost_start_date, boost_end_date);
create index if not exists property_boosts_property_id_idx on property_boosts(property_id);
