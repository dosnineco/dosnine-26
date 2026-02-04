-- Update existing agent payment amounts to new pricing structure
-- Run this in your Supabase SQL editor

UPDATE agents 
SET payment_amount = CASE 
  WHEN payment_status = '7-day' THEN 1500
  WHEN payment_status = '30-day' THEN 6000  
  WHEN payment_status = '90-day' THEN 15000
  WHEN payment_status = 'free' THEN NULL
  ELSE payment_amount
END
WHERE payment_status IN ('7-day', '30-day', '90-day', 'free');

-- Verify the update
SELECT 
  user_id,
  payment_status,
  payment_amount,
  payment_date
FROM agents 
WHERE payment_status IS NOT NULL
ORDER BY payment_status, payment_date DESC;