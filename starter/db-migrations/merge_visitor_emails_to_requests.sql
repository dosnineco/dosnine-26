-- Migrate existing visitor_emails with phone numbers to service_requests
-- This consolidates visitor leads into the request management system

BEGIN;

-- Insert all visitor_emails that have phone numbers into service_requests
INSERT INTO public.service_requests (
  client_name,
  client_email,
  client_phone,
  request_type,
  property_type,
  location,
  status,
  urgency,
  description,
  created_at
)
SELECT 
  'Website Visitor' as client_name,
  email as client_email,
  phone as client_phone,
  CASE 
    WHEN intent = 'buy' THEN 'buy'
    WHEN intent = 'sell' THEN 'sell'
    WHEN intent = 'rent' THEN 'rent'
    ELSE 'rent'
  END as request_type,
  'house' as property_type,
  'Not captured' as location,
  'open' as status,
  'normal' as urgency,
  'Lead from homepage limited capture' as description,
  created_at
FROM public.visitor_emails
WHERE phone IS NOT NULL 
  AND phone != ''
  AND email NOT IN (
    SELECT client_email FROM public.service_requests 
    WHERE description LIKE '%visitor capture%'
  )
ORDER BY created_at DESC;

-- Log how many records were migrated
SELECT COUNT(*) as migrated_leads 
FROM public.visitor_emails
WHERE phone IS NOT NULL 
  AND phone != '';

COMMIT;
