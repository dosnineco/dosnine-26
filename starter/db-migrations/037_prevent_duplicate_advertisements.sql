-- Prevent duplicate ads for the same company/email pair.
-- Normalize by trimming and lowercasing both values.

-- 1) Clean up existing duplicates (keep earliest record)
WITH ranked_ads AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(company_name)), LOWER(TRIM(email))
      ORDER BY created_at ASC, id ASC
    ) AS row_num
  FROM public.advertisements
)
DELETE FROM public.advertisements ad
USING ranked_ads ra
WHERE ad.id = ra.id
  AND ra.row_num > 1;

-- 2) Enforce uniqueness for all future inserts/updates
CREATE UNIQUE INDEX IF NOT EXISTS ux_advertisements_company_email_normalized
ON public.advertisements (
  LOWER(TRIM(company_name)),
  LOWER(TRIM(email))
);
