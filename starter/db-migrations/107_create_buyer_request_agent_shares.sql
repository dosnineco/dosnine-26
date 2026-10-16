-- Buyers can share linked purchase requests with registered agents for read-only review.
CREATE TABLE IF NOT EXISTS public.buyer_request_agent_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT buyer_request_agent_shares_unique
    UNIQUE (service_request_id, agent_user_id)
);

CREATE INDEX IF NOT EXISTS idx_buyer_request_agent_shares_agent
  ON public.buyer_request_agent_shares (agent_user_id, created_at DESC);

ALTER TABLE public.buyer_request_agent_shares ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.buyer_request_agent_shares TO service_role;
