-- Insert newsletter subscribers into service_requests table
-- These are leads from the newsletter that agents can process

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
) VALUES
  (
    'Demario Facey',
    'demariofacey@gmail.com',
    '8768959108',
    'rent',
    'house',
    'Jamaica',
    'open',
    'normal',
    'Newsletter subscriber - interested in properties',
    '2025-12-12'
  ),
  (
    'Amelia King',
    'ameliakingg5@gmail.com',
    '18765286186',
    'rent',
    'house',
    'Jamaica',
    'open',
    'normal',
    'Newsletter subscriber - interested in properties',
    '2025-12-12'
  ),
  (
    'Regina Graham',
    'reginas.graham@gmail.com',
    '8768027234',
    'rent',
    'house',
    'Jamaica',
    'open',
    'normal',
    'Newsletter subscriber - interested in properties',
    '2025-12-11'
  ),
  (
    'Nejah Davis',
    'nejahdavis4@gmail.com',
    '8768558952',
    'rent',
    'house',
    'Jamaica',
    'open',
    'normal',
    'Newsletter subscriber - interested in properties',
    '2025-12-11'
  ),
  (
    'Shadrack Walker',
    'shadrackwalker123@gmail.com',
    '8762196532',
    'rent',
    'house',
    'Jamaica',
    'open',
    'normal',
    'Newsletter subscriber - interested in properties',
    '2025-12-11'
  );

-- Note: Missing information (budget, bedrooms, bathrooms, specific location) left as NULL
-- Agents can follow up with clients to gather additional details
