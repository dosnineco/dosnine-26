-- Add fields for hill lot interest registration in visitor_emails
ALTER TABLE public.visitor_emails
  ADD COLUMN IF NOT EXISTS full_name text NULL,
  ADD COLUMN IF NOT EXISTS tier text NULL,
  ADD COLUMN IF NOT EXISTS message text NULL;

CREATE INDEX IF NOT EXISTS idx_visitor_emails_full_name ON public.visitor_emails USING btree (full_name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_visitor_emails_tier ON public.visitor_emails USING btree (tier) TABLESPACE pg_default;
