-- Add payment status to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded'));
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2);
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS paypal_transaction_id TEXT;

-- Add property count limits
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS property_count INTEGER DEFAULT 0;

-- Create index for payment status
CREATE INDEX IF NOT EXISTS idx_agents_payment_status ON public.agents(payment_status);

-- Update RLS policies for agents with payment requirement
DROP POLICY IF EXISTS "Agents can view relevant requests" ON public.service_requests;

CREATE POLICY "Paid agents can view requests"
  ON public.service_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents a
      JOIN public.users u ON u.id = a.user_id
      WHERE u.clerk_id = auth.uid()::text
      AND a.verification_status = 'approved'
      AND a.payment_status = 'paid'
    )
  );

-- Function to increment property count
CREATE OR REPLACE FUNCTION increment_property_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.landlord_user_id IS NOT NULL THEN
    UPDATE public.users 
    SET property_count = property_count + 1
    WHERE id = NEW.landlord_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement property count
CREATE OR REPLACE FUNCTION decrement_property_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.landlord_user_id IS NOT NULL THEN
    UPDATE public.users 
    SET property_count = GREATEST(property_count - 1, 0)
    WHERE id = OLD.landlord_user_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers for property count
DROP TRIGGER IF EXISTS trigger_increment_property_count ON public.properties;
CREATE TRIGGER trigger_increment_property_count
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION increment_property_count();

DROP TRIGGER IF EXISTS trigger_decrement_property_count ON public.properties;
CREATE TRIGGER trigger_decrement_property_count
  AFTER DELETE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION decrement_property_count();
