-- ============================================================================
-- PUBLIC.USERS TABLE - Complete Schema & RLS Policies
-- ============================================================================
-- NOTE: In Supabase, the base users table is auto-created by the auth system.
-- This file documents the COMPLETE users table structure including all columns
-- added through migrations and all RLS policies currently applied.
-- ============================================================================

-- ============================================================================
-- BASE USERS TABLE STRUCTURE
-- ============================================================================
-- The following columns are part of the Supabase auth.users table but are
-- typically exposed to public.users (which is a view or replica table)
-- Auto-created by Supabase with these core columns:

-- id                          UUID PRIMARY KEY
-- email                       TEXT UNIQUE
-- encrypted_password          TEXT
-- email_confirmed_at          TIMESTAMPTZ
-- invited_at                  TIMESTAMPTZ
-- confirmation_token         TEXT
-- confirmation_sent_at       TIMESTAMPTZ
-- recovery_token             TEXT
-- recovery_sent_at           TIMESTAMPTZ
-- otp_token                  TEXT
-- otp_sent_at                TIMESTAMPTZ
-- last_sign_in_at            TIMESTAMPTZ
-- app_metadata                JSONB
-- user_metadata              JSONB
-- aud                        VARCHAR(255)
-- created_at                 TIMESTAMPTZ DEFAULT NOW()
-- updated_at                 TIMESTAMPTZ DEFAULT NOW()
-- phone                      TEXT
-- phone_confirmed_at         TIMESTAMPTZ

-- ============================================================================
-- CUSTOM COLUMNS ADDED VIA MIGRATIONS
-- ============================================================================

-- From migration 003_create_storage_bucket.sql:
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_license_file_url TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_registration_file_url TEXT;

-- From migration 005_add_agent_columns.sql (deprecated in favor of agents table):
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_service_agreement_signed BOOLEAN DEFAULT false;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_service_agreement_date TIMESTAMPTZ;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_specialization TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_license_number TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_business_name TEXT;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_years_experience INTEGER;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS agent_verification_submitted_at TIMESTAMPTZ;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS data_sharing_consent BOOLEAN DEFAULT false;
-- [NOTE: These columns were REMOVED in migration 006_create_agents_table.sql]

-- From migration 006_create_agents_table.sql:
-- ALTER TABLE public.users DROP COLUMN IF EXISTS agent_verification_status CASCADE;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS agent_business_name CASCADE;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS agent_years_experience CASCADE;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS agent_license_number CASCADE;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS agent_specialization CASCADE;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS agent_license_file_url CASCADE;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS agent_registration_file_url CASCADE;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS agent_service_agreement_signed CASCADE;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS agent_service_agreement_date CASCADE;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS agent_verification_submitted_at CASCADE;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS data_sharing_consent CASCADE;
-- 
-- Added:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'landlord' 
  CHECK (user_type IN ('landlord', 'agent', 'admin'));

-- From migration 010_add_agent_payment.sql:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS property_count INTEGER DEFAULT 0;

-- ============================================================================
-- CURRENT USERS TABLE SCHEMA (COMPLETE)
-- ============================================================================

-- Base columns (Supabase auto-created):
--   id                          UUID PRIMARY KEY
--   email                       TEXT UNIQUE NOT NULL
--   encrypted_password          TEXT
--   email_confirmed_at          TIMESTAMPTZ
--   phone                       TEXT
--   phone_confirmed_at          TIMESTAMPTZ
--   last_sign_in_at             TIMESTAMPTZ
--   app_metadata                JSONB
--   user_metadata               JSONB
--   created_at                  TIMESTAMPTZ DEFAULT NOW()
--   updated_at                  TIMESTAMPTZ DEFAULT NOW()

-- Custom columns (added via migrations):
--   clerk_id                    TEXT (stored in user_metadata or app_metadata)
--   full_name                   TEXT (stored in user_metadata or app_metadata)
--   user_type                   TEXT DEFAULT 'landlord' 
--                               CHECK (user_type IN ('landlord', 'agent', 'admin'))
--   role                        TEXT (admin | null) for admin-only users
--   property_count              INTEGER DEFAULT 0
--   agent_license_file_url      TEXT (deprecated - use agents table instead)
--   agent_registration_file_url TEXT (deprecated - use agents table instead)

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policy 1: Users can update their own profile
-- ============================================================================
-- From migration 005_add_agent_columns.sql:
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (true)
WITH CHECK (true);
-- NOTE: This is very permissive - allows all authenticated users to update

-- ============================================================================
-- RLS Policy 2: Public/Anonymous access to users table
-- ============================================================================
-- Default behavior: SELECT is typically disabled or requires authentication
-- Based on storage policies (003_create_storage_bucket.sql):

-- Admin check for storage access (referenced in storage policies):
-- EXISTS (
--   SELECT 1 FROM public.users
--   WHERE users.clerk_id = auth.uid()::text
--   AND users.role = 'admin'
-- )

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Supabase auto-creates indexes on:
--   - id (PRIMARY KEY)
--   - email (UNIQUE)

-- Additional indexes created via migrations:
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON public.users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON public.users(user_type);

-- ============================================================================
-- RELATED TABLES THAT REFERENCE users
-- ============================================================================
-- agents table:
--   REFERENCES public.users(id) ON DELETE CASCADE
--   user_id UUID NOT NULL UNIQUE (one agent per user)

-- service_requests table:
--   client_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE
--   assigned_agent_id UUID REFERENCES public.users(id)

-- properties table:
--   owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE

-- property_boosts table:
--   owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE

-- visitor_emails table:
--   No direct FK to users (stores email directly)

-- agent_feedback table:
--   admin_clerk_id TEXT (references users.clerk_id)

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- agents_with_users view (created in 006_create_agents_table.sql):
CREATE OR REPLACE VIEW public.agents_with_users AS
SELECT 
  a.*,
  u.email,
  u.full_name,
  u.clerk_id,
  u.phone,
  u.user_type
FROM public.agents a
JOIN public.users u ON u.id = a.user_id;

GRANT SELECT ON public.agents_with_users TO authenticated, anon;

-- ============================================================================
-- CONSTRAINTS AND CHECKS
-- ============================================================================

-- user_type column constraint:
--   CHECK (user_type IN ('landlord', 'agent', 'admin'))
--
-- This ensures only valid user types are stored

-- ============================================================================
-- CURRENT MIGRATION STATUS
-- ============================================================================
-- ✅ Migration 003: Storage bucket for agent documents created
-- ✅ Migration 005: Initial agent columns added to users (DEPRECATED)
-- ✅ Migration 006: Agent columns removed from users, agents table created instead
-- ✅ Migration 010: property_count column added to users
-- ✅ RLS Policies: Users can update own profile (very permissive)

-- ============================================================================
-- NOTES AND RECOMMENDATIONS
-- ============================================================================
-- 1. The Supabase users table cannot be directly created via SQL as it's
--    managed by the auth system. Use ALTER TABLE to add custom columns.
--
-- 2. clerk_id, full_name, phone are typically stored in Clerk and synced
--    to Supabase via webhook or stored in user_metadata/app_metadata.
--
-- 3. Agent-specific data has been moved to the dedicated agents table
--    to avoid cluttering the users table. Always use agents table for
--    agent-related columns.
--
-- 4. RLS policies on users table are very permissive. Consider stricter
--    policies for production environments.
--
-- 5. The property_count column is maintained automatically via triggers
--    on the properties table (increment on INSERT, decrement on DELETE).

-- ============================================================================
-- TO ADD A NEW COLUMN TO users TABLE:
-- ============================================================================
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS new_column_name DATA_TYPE;
--
-- Then create corresponding RLS policies if needed.

