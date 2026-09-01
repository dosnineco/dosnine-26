-- Apply manually in the Supabase SQL editor.
-- Keeps advertiser contact details private while recording verified visitor enquiries.
CREATE TABLE IF NOT EXISTS public.advertisement_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advertisement_inquiries_advertiser_created
  ON public.advertisement_inquiries (advertiser_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_advertisement_inquiries_advertisement_created
  ON public.advertisement_inquiries (advertisement_id, created_at DESC);

ALTER TABLE public.advertisement_inquiries ENABLE ROW LEVEL SECURITY;