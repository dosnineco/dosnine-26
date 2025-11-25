-- Boost existing property: 1 bed Apartment For Rent - Forest Ridge
-- Property already exists, just adding boost to make it featured

-- Update property to set is_featured = true
UPDATE "public"."properties"
SET 
  "is_featured" = true,
  "updated_at" = now()
WHERE "id" = 'd80143b6-8998-4555-a096-1b696eabdcf1';

-- Insert boost record to make it featured for 10 days
INSERT INTO "public"."property_boosts" (
  "id",
  "property_id",
  "owner_id",
  "payment_id",
  "amount",
  "currency",
  "boost_start_date",
  "boost_end_date",
  "status",
  "impressions",
  "clicks",
  "rotation_count",
  "created_at"
) VALUES (
  gen_random_uuid(), -- Generate a random UUID for boost ID
  'd80143b6-8998-4555-a096-1b696eabdcf1', -- Property ID
  '7e368c81-081c-434d-ab31-89c99909ee55', -- Owner ID
  'MANUAL_BOOST_' || extract(epoch from now())::text, -- Generate payment ID
  2500, -- JMD $2,500 boost price
  'JMD',
  now(), -- Start immediately
  now() + interval '10 days', -- End in 10 days
  'active',
  0, -- Initial impressions
  0, -- Initial clicks
  0, -- Initial rotation count
  now()
);

-- Verify the inserts
SELECT 
  p.id,
  p.title,
  p.parish,
  p.price,
  p.is_featured,
  p.views,
  b.id as boost_id,
  b.amount as boost_amount,
  b.boost_start_date,
  b.boost_end_date,
  b.status as boost_status
FROM properties p
LEFT JOIN property_boosts b ON p.id = b.property_id
WHERE p.id = 'd80143b6-8998-4555-a096-1b696eabdcf1';
