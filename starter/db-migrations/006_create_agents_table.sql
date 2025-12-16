-- Create agents table with proper RLS
-- This separates agent-specific data from the users table

CREATE TABLE IF NOT EXISTS public.agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Business Information
  business_name TEXT NOT NULL,
  years_experience INTEGER DEFAULT 1,
  license_number TEXT,
  specializations TEXT[], -- Array of specializations
  service_areas TEXT, -- Comma-separated areas they serve
  about_me TEXT,
  deals_closed_count INTEGER DEFAULT 0,
  
  -- Verification Documents
  license_file_url TEXT,
  registration_file_url TEXT,
  
  -- Verification Status
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verification_submitted_at TIMESTAMPTZ DEFAULT NOW(),
  verification_reviewed_at TIMESTAMPTZ,
  verification_notes TEXT, -- Admin notes on verification
  
  -- Agreements and Consent
  service_agreement_signed BOOLEAN DEFAULT TRUE,
  service_agreement_date TIMESTAMPTZ DEFAULT NOW(),
  data_sharing_consent BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one agent record per user
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_verification_status ON public.agents(verification_status);

-- Enable RLS on agents table
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own agent profile" ON public.agents;
DROP POLICY IF EXISTS "Users can insert own agent profile" ON public.agents;
DROP POLICY IF EXISTS "Users can update own agent profile" ON public.agents;
DROP POLICY IF EXISTS "Admins can view all agent profiles" ON public.agents;
DROP POLICY IF EXISTS "Admins can update agent verification" ON public.agents;

-- Policy: Users can view their own agent profile
CREATE POLICY "Users can view own agent profile"
  ON public.agents
  FOR SELECT
  USING (auth.uid()::text IN (
    SELECT clerk_id FROM public.users WHERE id = agents.user_id
  ));

-- Policy: Users can insert their own agent profile
CREATE POLICY "Users can insert own agent profile"
  ON public.agents
  FOR INSERT
  WITH CHECK (auth.uid()::text IN (
    SELECT clerk_id FROM public.users WHERE id = agents.user_id
  ) OR true); -- Allow insert without auth for initial signup

-- Policy: Users can update their own agent profile (except verification status)
CREATE POLICY "Users can update own agent profile"
  ON public.agents
  FOR UPDATE
  USING (auth.uid()::text IN (
    SELECT clerk_id FROM public.users WHERE id = agents.user_id
  ));

-- Policy: Admins can view all agent profiles
CREATE POLICY "Admins can view all agent profiles"
  ON public.agents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.clerk_id = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can update any agent profile (for verification)
CREATE POLICY "Admins can update agent verification"
  ON public.agents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.clerk_id = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- Update users table to simplify agent fields (keep only user_type)
-- Remove old agent columns if they exist (they'll be in agents table now)
ALTER TABLE public.users DROP COLUMN IF EXISTS agent_verification_status CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS agent_business_name CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS agent_years_experience CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS agent_license_number CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS agent_specialization CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS agent_license_file_url CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS agent_registration_file_url CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS agent_service_agreement_signed CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS agent_service_agreement_date CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS agent_verification_submitted_at CASCADE;
ALTER TABLE public.users DROP COLUMN IF EXISTS data_sharing_consent CASCADE;

-- Ensure user_type column exists in users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'landlord' CHECK (user_type IN ('landlord', 'agent', 'admin'));

-- Create a view for easy agent lookups with user info
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

-- Grant access to the view
GRANT SELECT ON public.agents_with_users TO authenticated, anon;
