-- Atomically increment property views for each public property-detail request.
CREATE OR REPLACE FUNCTION public.increment_property_views(property_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_views INTEGER;
BEGIN
  UPDATE properties
  SET views = COALESCE(views, 0) + 1
  WHERE id = property_id
  RETURNING views INTO updated_views;

  RETURN updated_views;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_property_views(UUID) TO anon, authenticated;