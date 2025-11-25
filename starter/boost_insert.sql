-- Boost Post SQL Insert
-- Property: 1 Bedroom Apartment
-- Property ID: 39462b54-da97-480f-9bde-58905304dfc1
-- Owner ID: b5071f45-f91b-4fa0-a9fb-e5850bfa188e

INSERT INTO property_boosts (
  property_id,
  owner_id,
  payment_id,
  amount,
  currency,
  boost_start_date,
  boost_end_date,
  status,
  impressions,
  clicks,
  last_shown_at,
  rotation_count
) VALUES (
  '39462b54-da97-480f-9bde-58905304dfc1',
  'b5071f45-f91b-4fa0-a9fb-e5850bfa188e',
  'TEST_PAYMENT_' || gen_random_uuid()::text,  -- Generate unique payment ID
  2500,                                          -- JMD $2,500
  'JMD',
  NOW(),                                         -- Start immediately
  NOW() + INTERVAL '10 days',                    -- 10 days duration
  'active',                                      -- Active status
  0,                                             -- Initial impressions
  0,                                             -- Initial clicks
  NULL,                                          -- Not shown yet
  0                                              -- Initial rotation count
);

-- Also update the property to set is_featured = true
UPDATE properties 
SET is_featured = true 
WHERE id = '39462b54-da97-480f-9bde-58905304dfc1';


-- ============================================
-- ALTERNATIVE: If you want to set specific dates
-- ============================================
/*
INSERT INTO property_boosts (
  property_id,
  owner_id,
  payment_id,
  amount,
  currency,
  boost_start_date,
  boost_end_date,
  status,
  impressions,
  clicks,
  last_shown_at,
  rotation_count
) VALUES (
  '39462b54-da97-480f-9bde-58905304dfc1',
  'b5071f45-f91b-4fa0-a9fb-e5850bfa188e',
  'MANUAL_BOOST_001',                           -- Custom payment ID
  2500,                                          -- JMD $2,500
  'JMD',
  '2025-11-25 00:00:00+00',                     -- Start date
  '2025-12-05 23:59:59+00',                     -- End date (10 days)
  'active',
  0,
  0,
  NULL,
  0
);

UPDATE properties 
SET is_featured = true 
WHERE id = '39462b54-da97-480f-9bde-58905304dfc1';
*/


-- ============================================
-- VERIFY THE INSERTION
-- ============================================
-- After running the INSERT, verify with:
/*
SELECT 
  pb.*,
  p.title,
  p.parish,
  p.town,
  u.full_name as owner_name,
  u.email as owner_email
FROM property_boosts pb
JOIN properties p ON pb.property_id = p.id
JOIN users u ON pb.owner_id = u.id
WHERE pb.property_id = '39462b54-da97-480f-9bde-58905304dfc1'
ORDER BY pb.created_at DESC;
*/
