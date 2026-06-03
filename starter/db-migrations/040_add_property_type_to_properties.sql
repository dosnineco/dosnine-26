-- Add the missing property_type column to the public.properties table.
-- This fixes schema cache errors for queries and inserts that reference property_type.

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS property_type text NOT NULL DEFAULT 'other';

ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_property_type_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_property_type_check
CHECK (property_type IN ('house', 'apartment', 'land', 'commercial', 'other'));
