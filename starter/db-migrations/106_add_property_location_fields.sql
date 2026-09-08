-- Store a verified map location for each property listing.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS formatted_address TEXT;

CREATE INDEX IF NOT EXISTS idx_properties_coordinates
  ON public.properties (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
