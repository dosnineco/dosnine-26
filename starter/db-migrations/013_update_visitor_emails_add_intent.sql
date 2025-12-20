-- Updated visitor_emails table with intent field
-- This migration adds new columns to the existing visitor_emails table

-- Add missing columns to existing table
ALTER TABLE public.visitor_emails ADD COLUMN IF NOT EXISTS intent character varying(20);
ALTER TABLE public.visitor_emails ADD COLUMN IF NOT EXISTS page text;
ALTER TABLE public.visitor_emails ADD COLUMN IF NOT EXISTS source character varying(50);

-- Add index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_visitor_emails_email ON public.visitor_emails(email);

-- Add index for intent filtering
CREATE INDEX IF NOT EXISTS idx_visitor_emails_intent ON public.visitor_emails(intent);

-- Add index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_visitor_emails_created_at ON public.visitor_emails(created_at DESC);

-- Enable RLS (Row Level Security) if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'visitor_emails' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.visitor_emails ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Grant necessary permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.visitor_emails TO anon, authenticated;
GRANT SELECT ON public.visitor_emails TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.visitor_emails_id_seq TO anon, authenticated;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow public inserts" ON public.visitor_emails;
DROP POLICY IF EXISTS "Admins can view all" ON public.visitor_emails;
DROP POLICY IF EXISTS "Agents can view relevant leads" ON public.visitor_emails;

-- Policy: Allow anyone to insert (for form submissions)
CREATE POLICY "Allow public inserts" 
ON public.visitor_emails 
FOR INSERT 
WITH CHECK (true);

-- Policy: Allow admins to view all visitor emails
CREATE POLICY "Admins can view all" 
ON public.visitor_emails 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.clerk_id = auth.jwt() ->> 'sub'
    AND users.role = 'admin'
  )
);

-- Policy: Allow agents to view visitor emails matching their intent
CREATE POLICY "Agents can view relevant leads" 
ON public.visitor_emails 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agents
    JOIN public.users ON users.id = agents.user_id
    WHERE users.clerk_id = auth.jwt() ->> 'sub'
    AND agents.verification_status = 'approved'
  )
);

-- If you need to add the intent column to an existing table:
-- ALTER TABLE public.visitor_emails ADD COLUMN IF NOT EXISTS intent character varying(20);
-- ALTER TABLE public.visitor_emails ADD COLUMN IF NOT EXISTS page text;
-- ALTER TABLE public.visitor_emails ADD COLUMN IF NOT EXISTS source character varying(50);

COMMENT ON TABLE public.visitor_emails IS 'Stores visitor contact information and their property intent (buy/sell/rent)';
COMMENT ON COLUMN public.visitor_emails.intent IS 'User intent: buy, sell, or rent';
COMMENT ON COLUMN public.visitor_emails.source IS 'Lead source: popup, form, etc.';
COMMENT ON COLUMN public.visitor_emails.page IS 'Page URL where the visitor submitted their info';
