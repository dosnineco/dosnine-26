ALTER TABLE public.giveaway_campaigns
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';
