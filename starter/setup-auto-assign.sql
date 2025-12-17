-- Setup Auto-Assign Feature for Service Requests
-- This enables fair round-robin distribution of client requests to paid agents

-- Step 1: Add last_request_assigned_at column to agents table (if not exists)
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS last_request_assigned_at TIMESTAMPTZ;

-- Step 2: Create index for faster sorting in auto-assign queries
CREATE INDEX IF NOT EXISTS idx_agents_last_request_assigned 
ON public.agents(last_request_assigned_at);

-- Step 3: Add assigned_agent_id column to service_requests (if not exists)
ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES public.agents(id);

-- Step 4: Add assigned_at timestamp (if not exists)
ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Step 5: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_agent 
ON public.service_requests(assigned_agent_id);

-- Step 6: Add helpful comments
COMMENT ON COLUMN agents.last_request_assigned_at IS 'Timestamp of last request assigned to this agent for fair round-robin distribution';
COMMENT ON COLUMN service_requests.assigned_agent_id IS 'Agent assigned to handle this service request via auto-assign or manual assignment';
COMMENT ON COLUMN service_requests.assigned_at IS 'When the request was assigned to an agent';

-- Verify setup
SELECT 
    'Auto-assign setup complete!' as message,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'last_request_assigned_at'
    ) as agents_column_exists,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_requests' AND column_name = 'assigned_agent_id'
    ) as service_requests_column_exists;
