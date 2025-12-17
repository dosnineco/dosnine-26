-- Add payment proof columns to agents table

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- Update existing agents to have NULL for these fields if not set
UPDATE agents 
SET payment_proof_url = NULL 
WHERE payment_proof_url IS NULL;

-- Create index for faster queries on payment_proof_url
CREATE INDEX IF NOT EXISTS idx_agents_payment_proof ON agents(payment_proof_url);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agents' 
AND column_name IN ('payment_proof_url', 'payment_date', 'payment_status');
