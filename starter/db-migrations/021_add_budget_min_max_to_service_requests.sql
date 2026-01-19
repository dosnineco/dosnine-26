-- Migration: Ensure budget_min and budget_max columns exist in service_requests
-- Date: 2026-01-19
-- Description: Verify budget columns are present for filtering requests by price range

ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS budget_min DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS budget_max DECIMAL(12, 2);

-- Create indexes for budget range queries
CREATE INDEX IF NOT EXISTS idx_service_requests_budget_min ON public.service_requests(budget_min);
CREATE INDEX IF NOT EXISTS idx_service_requests_budget_max ON public.service_requests(budget_max);

-- Create composite index for budget range queries
CREATE INDEX IF NOT EXISTS idx_service_requests_budget_range ON public.service_requests(budget_min, budget_max);

COMMENT ON COLUMN public.service_requests.budget_min IS 'Minimum budget for the request (e.g., J$10,000)';
COMMENT ON COLUMN public.service_requests.budget_max IS 'Maximum budget for the request (e.g., J$100,000,000+)';
