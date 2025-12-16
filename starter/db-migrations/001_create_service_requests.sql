-- Create service_requests table for premium user service requests
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  agent_id uuid NULL,
  property_type text NULL,
  location text NULL,
  budget_min numeric NULL,
  budget_max numeric NULL,
  bedrooms integer NULL,
  bathrooms integer NULL,
  timeline text NULL DEFAULT 'flexible'::text,
  requirements text NULL,
  status text NULL DEFAULT 'pending'::text,
  viewed_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT service_requests_pkey PRIMARY KEY (id),
  CONSTRAINT service_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT service_requests_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT service_requests_status_check CHECK (
    status = ANY(ARRAY['pending'::text, 'viewed'::text, 'matched'::text, 'completed'::text, 'rejected'::text])
  ),
  CONSTRAINT service_requests_property_type_check CHECK (
    property_type = ANY(ARRAY['residential'::text, 'commercial'::text, 'land'::text, 'mixed'::text])
  )
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS service_requests_agent_id_idx ON public.service_requests USING btree (agent_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS service_requests_user_id_idx ON public.service_requests USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON public.service_requests USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS service_requests_created_at_idx ON public.service_requests USING btree (created_at DESC) TABLESPACE pg_default;
