-- Fix property count trigger functions to use correct column name
-- The properties table uses 'owner_id', not 'landlord_user_id'

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_increment_property_count ON public.properties;
DROP TRIGGER IF EXISTS trigger_decrement_property_count ON public.properties;

-- Recreate function to increment property count (using owner_id)
CREATE OR REPLACE FUNCTION increment_property_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    UPDATE public.users 
    SET property_count = property_count + 1
    WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate function to decrement property count (using owner_id)
CREATE OR REPLACE FUNCTION decrement_property_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.owner_id IS NOT NULL THEN
    UPDATE public.users 
    SET property_count = GREATEST(property_count - 1, 0)
    WHERE id = OLD.owner_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER trigger_increment_property_count
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION increment_property_count();

CREATE TRIGGER trigger_decrement_property_count
  AFTER DELETE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION decrement_property_count();

-- Verify the properties table has owner_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'owner_id'
  ) THEN
    RAISE EXCEPTION 'Column owner_id does not exist in properties table';
  END IF;
END $$;
