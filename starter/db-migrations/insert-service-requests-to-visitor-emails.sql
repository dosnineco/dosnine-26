-- Insert all service request submitters into visitor_emails table
-- This helps capture leads from service requests for marketing purposes

-- Insert unique emails from service_requests into visitor_emails
-- Use ON CONFLICT to handle duplicates gracefully
INSERT INTO visitor_emails (email, phone, created_at)
SELECT DISTINCT 
  client_email as email,
  client_phone as phone,
  created_at
FROM service_requests
WHERE client_email IS NOT NULL
  AND client_email != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM visitor_emails ve 
    WHERE ve.email = service_requests.client_email
      AND DATE(ve.created_at) = DATE(service_requests.created_at)
  )
ORDER BY created_at;

-- Summary of what was inserted
SELECT 
  COUNT(*) as total_inserted,
  MIN(created_at) as earliest_date,
  MAX(created_at) as latest_date
FROM visitor_emails
WHERE email IN (SELECT DISTINCT client_email FROM service_requests WHERE client_email IS NOT NULL);

