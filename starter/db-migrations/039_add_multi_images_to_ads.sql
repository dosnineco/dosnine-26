-- Add support for up to 3 images on sponsor submissions and advertisements

ALTER TABLE public.sponsor_submissions
  ADD COLUMN IF NOT EXISTS image_urls TEXT[];

ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS image_urls TEXT[];

UPDATE public.sponsor_submissions
SET image_urls = ARRAY[image_url]
WHERE (image_urls IS NULL OR array_length(image_urls, 1) IS NULL)
  AND image_url IS NOT NULL;

UPDATE public.advertisements
SET image_urls = ARRAY[image_url]
WHERE (image_urls IS NULL OR array_length(image_urls, 1) IS NULL)
  AND image_url IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sponsor_submissions_max_3_images'
      AND conrelid = 'public.sponsor_submissions'::regclass
  ) THEN
    ALTER TABLE public.sponsor_submissions
      ADD CONSTRAINT sponsor_submissions_max_3_images
      CHECK (image_urls IS NULL OR array_length(image_urls, 1) <= 3);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'advertisements_max_3_images'
      AND conrelid = 'public.advertisements'::regclass
  ) THEN
    ALTER TABLE public.advertisements
      ADD CONSTRAINT advertisements_max_3_images
      CHECK (image_urls IS NULL OR array_length(image_urls, 1) <= 3);
  END IF;
END $$;
