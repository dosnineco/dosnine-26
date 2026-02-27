-- Ensure public listing pages can read visible properties when RLS is enabled.

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view visible properties" ON public.properties;

CREATE POLICY "Public can view visible properties"
ON public.properties
FOR SELECT
TO anon, authenticated
USING (
  COALESCE(status, '') IN ('', 'available', 'active', 'coming_soon')
);
