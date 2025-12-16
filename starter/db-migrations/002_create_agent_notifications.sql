-- Create agent_notifications table to track service requests
CREATE TABLE IF NOT EXISTS public.agent_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  service_request_id uuid NOT NULL,
  notification_type text NULL DEFAULT 'new_request'::text,
  is_read boolean NULL DEFAULT false,
  read_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT agent_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT agent_notifications_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT agent_notifications_service_request_id_fkey FOREIGN KEY (service_request_id) REFERENCES service_requests (id) ON DELETE CASCADE,
  CONSTRAINT agent_notifications_type_check CHECK (
    notification_type = ANY(ARRAY['new_request'::text, 'request_updated'::text, 'request_completed'::text])
  )
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS agent_notifications_agent_id_idx ON public.agent_notifications USING btree (agent_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS agent_notifications_is_read_idx ON public.agent_notifications USING btree (is_read) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS agent_notifications_created_at_idx ON public.agent_notifications USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS agent_notifications_agent_is_read_idx ON public.agent_notifications USING btree (agent_id, is_read) TABLESPACE pg_default;
