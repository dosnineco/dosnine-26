-- Normalize parish names in existing properties
-- Removes extra spaces and periods from "St." variations for consistency

-- Update St. variations to standardized format
UPDATE public.properties
SET parish = TRIM(REGEXP_REPLACE(parish, 'St\.\s+', 'St ', 'g'))
WHERE parish SIMILAR TO '%St\.%';

-- Show the changes that were made
SELECT DISTINCT parish 
FROM public.properties 
WHERE parish IS NOT NULL
ORDER BY parish;

-- Verify the normalization
DO $$
DECLARE
  invalid_parishes TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT parish) INTO invalid_parishes
  FROM public.properties
  WHERE parish NOT IN (
    'Kingston', 'St Andrew', 'St Catherine', 'St James', 'Clarendon',
    'Manchester', 'St Ann', 'Portland', 'St Thomas', 'St Elizabeth',
    'Trelawny', 'Hanover'
  ) AND parish IS NOT NULL;
  
  IF array_length(invalid_parishes, 1) > 0 THEN
    RAISE NOTICE 'Found non-standard parishes: %', invalid_parishes;
  ELSE
    RAISE NOTICE 'All parishes are now standardized!';
  END IF;
END $$;
