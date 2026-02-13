-- Migration: create agent_request_applications table
-- Tracks agent applications for service_requests. Admin approves one agent per request.

CREATE TABLE IF NOT EXISTS public.agent_request_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_request_applications_request_id ON public.agent_request_applications(request_id);
CREATE INDEX IF NOT EXISTS idx_agent_request_applications_agent_id ON public.agent_request_applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_request_applications_status ON public.agent_request_applications(status);
CREATE INDEX IF NOT EXISTS idx_agent_request_applications_applied_at ON public.agent_request_applications(applied_at DESC);



-- Policies: agents can insert/view their own applications; admins can manage
DROP POLICY IF EXISTS "Agents view own applications" ON public.agent_request_applications;
DROP POLICY IF EXISTS "Agents insert own applications" ON public.agent_request_applications;
DROP POLICY IF EXISTS "Admins manage applications" ON public.agent_request_applications;

CREATE POLICY "Agents view own applications"
  ON public.agent_request_applications FOR SELECT
  USING (
    agent_id = (SELECT id FROM public.agents WHERE user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY "Agents insert own applications"
  ON public.agent_request_applications FOR INSERT
  WITH CHECK (
    agent_id = (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage applications - select"
  ON public.agent_request_applications FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins manage applications - update"
  ON public.agent_request_applications FOR UPDATE
  USING (is_admin());

GRANT INSERT, SELECT, UPDATE ON public.agent_request_applications TO authenticated;

-- END
