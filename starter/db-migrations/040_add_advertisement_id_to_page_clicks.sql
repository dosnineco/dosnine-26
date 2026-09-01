-- Apply manually in the Supabase SQL editor.
-- Associates page-view analytics records with a specific advertisement.
ALTER TABLE public.page_clicks
  ADD COLUMN IF NOT EXISTS advertisement_id UUID REFERENCES public.advertisements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_page_clicks_advertisement_created
  ON public.page_clicks (advertisement_id, created_at DESC)
  WHERE advertisement_id IS NOT NULL;