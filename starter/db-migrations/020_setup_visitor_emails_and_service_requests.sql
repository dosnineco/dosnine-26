-- Migration: Setup visitor_emails and service_requests tables
-- Creates both tables with proper indexes, constraints, and RLS policies

-- ============================================================================
-- VISITOR_EMAILS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.visitor_emails (
  id bigserial NOT NULL,
  email character varying(255) NOT NULL,
  phone character varying(20) NULL,
  user_agent text NULL,
  ip_address character varying(45) NULL,
  referrer text NULL,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  intent character varying(20) NULL,
  page text NULL,
  source character varying(50) NULL,
  budget_min integer NULL,
  bedrooms integer NULL,
  parish character varying(255) NULL DEFAULT NULL::character varying,
  area character varying(255) NULL DEFAULT NULL::character varying,
  email_status text NULL DEFAULT 'not_contacted'::text,
  last_emailed_at timestamp with time zone NULL,
  email_campaign_count integer NULL DEFAULT 0,
  CONSTRAINT visitor_emails_pkey PRIMARY KEY (id),
  CONSTRAINT visitor_emails_email_status_check CHECK (
    (
      email_status = any (
        array[
          'not_contacted'::text,
          'emailed'::text,
          'bounced'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Indexes for visitor_emails
CREATE INDEX IF NOT EXISTS idx_visitor_emails_email ON public.visitor_emails USING btree (email) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_visitor_emails_intent ON public.visitor_emails USING btree (intent) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_visitor_emails_created_at ON public.visitor_emails USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_visitor_emails_parish ON public.visitor_emails USING btree (parish) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_visitor_emails_budget ON public.visitor_emails USING btree (budget_min) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_visitor_emails_email_status ON public.visitor_emails USING btree (email_status) TABLESPACE pg_default;

-- Enable RLS on visitor_emails
ALTER TABLE public.visitor_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public inserts" ON public.visitor_emails;
DROP POLICY IF EXISTS "Admins can view all" ON public.visitor_emails;
DROP POLICY IF EXISTS "Agents can view relevant leads" ON public.visitor_emails;

-- Policies for visitor_emails
-- Allow anyone to insert (for form submissions)
CREATE POLICY "Allow public inserts" 
ON public.visitor_emails 
FOR INSERT 
WITH CHECK (true);

-- Allow admins to view all visitor emails
CREATE POLICY "Admins can view all" 
ON public.visitor_emails 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- Allow agents to view leads relevant to their target market
CREATE POLICY "Agents can view relevant leads" 
ON public.visitor_emails 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.agents a 
    WHERE a.user_id = auth.uid()
  )
);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.visitor_emails TO anon, authenticated;
GRANT SELECT ON public.visitor_emails TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.visitor_emails_id_seq TO anon, authenticated;

-- ============================================================================
-- SERVICE_REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_user_id uuid NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  request_type text NOT NULL,
  property_type text NOT NULL,
  location text NOT NULL,
  budget_min numeric(12, 2) NULL,
  budget_max numeric(12, 2) NULL,
  bedrooms integer NULL,
  bathrooms integer NULL,
  description text NULL,
  urgency text NULL DEFAULT 'normal'::text,
  assigned_agent_id uuid NULL,
  status text NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  assigned_at timestamp with time zone NULL,
  completed_at timestamp with time zone NULL,
  withdrawn_at timestamp with time zone NULL,
  is_contacted boolean NULL DEFAULT false,
  comment text NULL,
  comment_updated_at timestamp with time zone NULL,
  CONSTRAINT service_requests_pkey PRIMARY KEY (id),
  CONSTRAINT service_requests_client_user_id_fkey FOREIGN KEY (client_user_id) REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT service_requests_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES public.agents (id) ON DELETE SET NULL,
  CONSTRAINT service_requests_urgency_check CHECK (
    (
      urgency = any (
        array[
          'low'::text,
          'normal'::text,
          'high'::text,
          'urgent'::text
        ]
      )
    )
  ),
  CONSTRAINT service_requests_property_type_check CHECK (
    (
      property_type = any (
        array[
          'house'::text,
          'apartment'::text,
          'land'::text,
          'commercial'::text,
          'other'::text
        ]
      )
    )
  ),
  CONSTRAINT service_requests_request_type_check CHECK (
    (
      request_type = any (
        array[
          'buy'::text,
          'rent'::text,
          'sell'::text,
          'lease'::text,
          'valuation'::text
        ]
      )
    )
  ),
  CONSTRAINT service_requests_status_check CHECK (
    (
      status = any (
        array[
          'open'::text,
          'assigned'::text,
          'in_progress'::text,
          'completed'::text,
          'withdrawn'::text,
          'cancelled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Indexes for service_requests
CREATE INDEX IF NOT EXISTS service_requests_is_contacted_idx ON public.service_requests USING btree (is_contacted) TABLESPACE pg_default
WHERE (is_contacted = true);

CREATE INDEX IF NOT EXISTS service_requests_comment_updated_at_idx ON public.service_requests USING btree (comment_updated_at DESC NULLS LAST) TABLESPACE pg_default
WHERE (comment IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_service_requests_client_user_id ON public.service_requests USING btree (client_user_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_agent_id ON public.service_requests USING btree (assigned_agent_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests USING btree (created_at DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_service_requests_request_type ON public.service_requests USING btree (request_type) TABLESPACE pg_default;

-- Enable RLS on service_requests
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create requests" ON public.service_requests;
DROP POLICY IF EXISTS "Anyone can view requests" ON public.service_requests;
DROP POLICY IF EXISTS "Anyone can update requests" ON public.service_requests;

-- Policies for service_requests
-- Anyone can create requests
CREATE POLICY "Anyone can create requests"
  ON public.service_requests
  FOR INSERT
  WITH CHECK (true);

-- Anyone can view requests
CREATE POLICY "Anyone can view requests"
  ON public.service_requests
  FOR SELECT
  USING (true);

-- Anyone can update requests
CREATE POLICY "Anyone can update requests"
  ON public.service_requests
  FOR UPDATE
  USING (true);

-- Grant permissions on service_requests
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.service_requests TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.service_requests_id_seq TO anon, authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
