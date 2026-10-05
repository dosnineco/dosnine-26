ALTER TABLE public.agents
  DROP CONSTRAINT IF EXISTS agents_payment_receipt_status_check;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_payment_receipt_status_check
  CHECK (payment_receipt_status IN ('none', 'pending', 'verified', 'rejected'));

NOTIFY pgrst, 'reload schema';
