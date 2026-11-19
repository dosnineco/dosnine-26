ALTER TABLE public.bank_transfer_payments
  ADD COLUMN IF NOT EXISTS payer_reference TEXT;

ALTER TABLE public.sponsor_submissions
  ADD COLUMN IF NOT EXISTS payer_reference TEXT;

UPDATE public.sponsor_submissions AS submission
SET payer_reference = upper(left(account.id::text, 8))
FROM public.users AS account
WHERE account.clerk_id = submission.created_by_clerk_id
  AND submission.payer_reference IS NULL;

UPDATE public.bank_transfer_payments AS payment
SET payer_reference = upper(left(account.id::text, 8))
FROM public.users AS account
WHERE payment.source_type = 'premium'
  AND account.id::text = payment.source_id
  AND payment.payer_reference IS NULL;

UPDATE public.bank_transfer_payments AS payment
SET payer_reference = upper(left(account.id::text, 8))
FROM public.paid_property_search_requests AS request
JOIN public.users AS account ON account.id = request.user_id
WHERE payment.source_type = 'property_search'
  AND request.id::text = payment.source_id
  AND payment.payer_reference IS NULL;

UPDATE public.bank_transfer_payments AS payment
SET payer_reference = upper(left(account.id::text, 8))
FROM public.properties AS property
JOIN public.users AS account ON account.id = property.owner_id
WHERE payment.source_type = 'property_boost'
  AND property.id::text = payment.source_id
  AND payment.payer_reference IS NULL;

UPDATE public.bank_transfer_payments AS payment
SET payer_reference = upper(left(account.id::text, 8))
FROM public.service_request_urgency_payments AS urgency
JOIN public.service_requests AS request ON request.id = urgency.service_request_id
JOIN public.users AS account ON account.id = request.client_user_id
WHERE payment.source_type = 'request_urgency'
  AND urgency.id::text = payment.source_id
  AND payment.payer_reference IS NULL;

UPDATE public.bank_transfer_payments AS payment
SET payer_reference = upper(left(account.id::text, 8))
FROM public.service_request_urgency_boost_batches AS boost
JOIN public.users AS account ON account.id = boost.client_user_id
WHERE payment.source_type = 'request_urgency_batch'
  AND boost.id::text = payment.source_id
  AND payment.payer_reference IS NULL;

UPDATE public.bank_transfer_payments AS payment
SET payer_reference = upper(left(account.id::text, 8))
FROM public.agent_request_applications AS application
JOIN public.agents AS agent ON agent.id = application.agent_id
JOIN public.users AS account ON account.id = agent.user_id
WHERE payment.source_type = 'agent_request_applications'
  AND application.id::text = ANY(string_to_array(payment.source_id, ','))
  AND payment.payer_reference IS NULL;
