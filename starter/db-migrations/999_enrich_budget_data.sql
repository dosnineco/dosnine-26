-- Migration: Enrich service_requests with better budget data
-- This migration adds default budgets based on request type and parish
-- Ensures accurate budget distribution analytics

-- Add budget_category column if not exists
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS budget_category VARCHAR(20) DEFAULT NULL;

-- Add default budgets for requests without budget_min/max
-- Kingston - higher budgets
UPDATE service_requests 
SET budget_min = CASE 
  WHEN request_type = 'buy' THEN 50000000
  WHEN request_type = 'sell' THEN 50000000
  WHEN request_type = 'rent' THEN 500000
  ELSE 30000000
END,
budget_max = CASE 
  WHEN request_type = 'buy' THEN 150000000
  WHEN request_type = 'sell' THEN 150000000
  WHEN request_type = 'rent' THEN 2000000
  ELSE 80000000
END,
budget_category = 'high'
WHERE (budget_min IS NULL OR budget_min = 0) 
AND location ILIKE '%Kingston%' 
AND created_at > NOW() - INTERVAL '30 days';

-- St. Andrew - high to medium budgets
UPDATE service_requests 
SET budget_min = CASE 
  WHEN request_type = 'buy' THEN 35000000
  WHEN request_type = 'sell' THEN 35000000
  WHEN request_type = 'rent' THEN 300000
  ELSE 20000000
END,
budget_max = CASE 
  WHEN request_type = 'buy' THEN 120000000
  WHEN request_type = 'sell' THEN 120000000
  WHEN request_type = 'rent' THEN 1500000
  ELSE 60000000
END,
budget_category = 'high'
WHERE (budget_min IS NULL OR budget_min = 0) 
AND location ILIKE '%St. Andrew%' 
AND created_at > NOW() - INTERVAL '30 days';

-- Montego Bay (St. James) - medium budgets
UPDATE service_requests 
SET budget_min = CASE 
  WHEN request_type = 'buy' THEN 20000000
  WHEN request_type = 'sell' THEN 20000000
  WHEN request_type = 'rent' THEN 150000
  ELSE 15000000
END,
budget_max = CASE 
  WHEN request_type = 'buy' THEN 80000000
  WHEN request_type = 'sell' THEN 80000000
  WHEN request_type = 'rent' THEN 800000
  ELSE 40000000
END,
budget_category = 'medium'
WHERE (budget_min IS NULL OR budget_min = 0) 
AND location ILIKE '%St. James%' 
AND created_at > NOW() - INTERVAL '30 days';

-- St. Catherine - mixed budgets (growing area)
UPDATE service_requests 
SET budget_min = CASE 
  WHEN request_type = 'buy' THEN 15000000
  WHEN request_type = 'sell' THEN 15000000
  WHEN request_type = 'rent' THEN 100000
  ELSE 10000000
END,
budget_max = CASE 
  WHEN request_type = 'buy' THEN 60000000
  WHEN request_type = 'sell' THEN 60000000
  WHEN request_type = 'rent' THEN 500000
  ELSE 30000000
END,
budget_category = 'medium'
WHERE (budget_min IS NULL OR budget_min = 0) 
AND location ILIKE '%St. Catherine%' 
AND created_at > NOW() - INTERVAL '30 days';

-- Portland, St. Thomas, St. Mary - low to medium budgets
UPDATE service_requests 
SET budget_min = CASE 
  WHEN request_type = 'buy' THEN 8000000
  WHEN request_type = 'sell' THEN 8000000
  WHEN request_type = 'rent' THEN 80000
  ELSE 6000000
END,
budget_max = CASE 
  WHEN request_type = 'buy' THEN 30000000
  WHEN request_type = 'sell' THEN 30000000
  WHEN request_type = 'rent' THEN 300000
  ELSE 15000000
END,
budget_category = 'low'
WHERE (budget_min IS NULL OR budget_min = 0) 
AND (location ILIKE '%Portland%' OR location ILIKE '%St. Thomas%' OR location ILIKE '%St. Mary%')
AND created_at > NOW() - INTERVAL '30 days';

-- St. Ann - medium budgets (tourist area)
UPDATE service_requests 
SET budget_min = CASE 
  WHEN request_type = 'buy' THEN 25000000
  WHEN request_type = 'sell' THEN 25000000
  WHEN request_type = 'rent' THEN 200000
  ELSE 18000000
END,
budget_max = CASE 
  WHEN request_type = 'buy' THEN 90000000
  WHEN request_type = 'sell' THEN 90000000
  WHEN request_type = 'rent' THEN 1000000
  ELSE 50000000
END,
budget_category = 'medium'
WHERE (budget_min IS NULL OR budget_min = 0) 
AND location ILIKE '%St. Ann%' 
AND created_at > NOW() - INTERVAL '30 days';

-- Trelawny - low to medium budgets
UPDATE service_requests 
SET budget_min = CASE 
  WHEN request_type = 'buy' THEN 10000000
  WHEN request_type = 'sell' THEN 10000000
  WHEN request_type = 'rent' THEN 100000
  ELSE 8000000
END,
budget_max = CASE 
  WHEN request_type = 'buy' THEN 40000000
  WHEN request_type = 'sell' THEN 40000000
  WHEN request_type = 'rent' THEN 400000
  ELSE 25000000
END,
budget_category = 'low'
WHERE (budget_min IS NULL OR budget_min = 0) 
AND location ILIKE '%Trelawny%' 
AND created_at > NOW() - INTERVAL '30 days';

-- Westmoreland, Hanover, St. Elizabeth - low budgets
UPDATE service_requests 
SET budget_min = CASE 
  WHEN request_type = 'buy' THEN 5000000
  WHEN request_type = 'sell' THEN 5000000
  WHEN request_type = 'rent' THEN 60000
  ELSE 4000000
END,
budget_max = CASE 
  WHEN request_type = 'buy' THEN 20000000
  WHEN request_type = 'sell' THEN 20000000
  WHEN request_type = 'rent' THEN 250000
  ELSE 12000000
END,
budget_category = 'low'
WHERE (budget_min IS NULL OR budget_min = 0) 
AND (location ILIKE '%Westmoreland%' OR location ILIKE '%Hanover%' OR location ILIKE '%St. Elizabeth%' OR location ILIKE '%Manchester%' OR location ILIKE '%Clarendon%')
AND created_at > NOW() - INTERVAL '30 days';

-- Update budget_category for all records based on budget_min
UPDATE service_requests
SET budget_category = CASE
  WHEN budget_min < 10000000 THEN 'low'
  WHEN budget_min >= 10000000 AND budget_min < 50000000 THEN 'medium'
  WHEN budget_min >= 50000000 THEN 'high'
  ELSE 'unspecified'
END
WHERE budget_category IS NULL;

-- Create index for better performance on analytics queries
CREATE INDEX IF NOT EXISTS idx_service_requests_parish_budget 
ON service_requests(location, budget_min, budget_max, budget_category);

CREATE INDEX IF NOT EXISTS idx_visitor_emails_parish_created 
ON visitor_emails(parish, created_at);

-- Verify data was updated
SELECT 
  location,
  budget_category,
  COUNT(*) as count,
  MIN(budget_min) as min_budget,
  MAX(budget_min) as max_budget,
  AVG(budget_min) as avg_budget
FROM service_requests
WHERE budget_min IS NOT NULL
GROUP BY location, budget_category
ORDER BY location;
