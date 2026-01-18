-- Migration: Update agent payment status to support new access plans
-- Date: 2026-01-18
-- Description: Change payment_status from paid/unpaid to free/7-day/30-day/90-day

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS access_expiry TIMESTAMP WITH TIME ZONE;

ALTER TABLE agents 
DROP CONSTRAINT IF EXISTS agents_payment_status_check;

-- Drop the old payment_status check constraint first
-- Migrate existing data BEFORE adding new constraint: 'paid' -> '30-day', 'unpaid' -> 'free'
UPDATE agents 
SET payment_status = CASE 
  WHEN payment_status = 'paid' THEN '30-day'
  WHEN payment_status = 'unpaid' THEN 'free'
  WHEN payment_status = 'refunded' THEN 'free'
  ELSE 'free'
END
WHERE payment_status IN ('paid', 'unpaid', 'refunded');

-- Now add the new payment_status check constraint with new values
ALTER TABLE agents 
ADD CONSTRAINT agents_payment_status_check 
CHECK (
  payment_status = ANY (
    ARRAY['free'::text, '7-day'::text, '30-day'::text, '90-day'::text]
  )
);
-- Set default payment_status to 'free' for new agents
ALTER TABLE agents 
ALTER COLUMN payment_status SET DEFAULT 'free'::text;

-- Add comment explaining premium parishes
COMMENT ON COLUMN agents.service_areas IS 'Parishes where agent operates. Kingston, St. Andrew, and St. Catherine are premium parishes with higher fees.';

COMMENT ON COLUMN agents.payment_status IS 'Access plan: free (limited access), 7-day, 30-day, or 90-day (full access with time limits)';

COMMENT ON COLUMN agents.payment_amount IS 'Amount paid for current access plan. Premium parishes (Kingston, St. Andrew, St. Catherine) have higher rates.';

COMMENT ON COLUMN agents.access_expiry IS 'When the current paid access plan expires. NULL for free tier.';

-- Create index for access expiry queries
CREATE INDEX IF NOT EXISTS idx_agents_access_expiry 
ON agents USING btree (access_expiry) 
WHERE access_expiry IS NOT NULL;

-- Create function to check if access is expired
CREATE OR REPLACE FUNCTION is_agent_access_expired(agent_row agents)
RETURNS BOOLEAN AS $$
BEGIN
  -- Free access never expires
  IF agent_row.payment_status = 'free' THEN
    RETURN FALSE;
  END IF;
  
  -- No expiry date means expired (paid plan without expiry)
  IF agent_row.access_expiry IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if expiry date has passed
  RETURN agent_row.access_expiry < NOW();
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_agent_access_expired IS 'Returns true if agent access plan has expired (excluding free tier)';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_agent_access_expired TO authenticated;
GRANT EXECUTE ON FUNCTION is_agent_access_expired TO anon;
