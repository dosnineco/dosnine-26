-- Clean up any existing tables and policies
DROP TABLE IF EXISTS public.service_requests CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Create service_requests table for clients requesting agents
CREATE TABLE public.service_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Client info (nullable for anonymous requests)
  client_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  
  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN ('buy', 'rent', 'sell', 'lease', 'valuation')),
  property_type TEXT NOT NULL CHECK (property_type IN ('house', 'apartment', 'land', 'commercial', 'other')),
  location TEXT NOT NULL,
  budget_min DECIMAL(12, 2),
  budget_max DECIMAL(12, 2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  description TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  
  -- Assignment
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'withdrawn', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_service_requests_client_user_id ON public.service_requests(client_user_id);
CREATE INDEX idx_service_requests_assigned_agent_id ON public.service_requests(assigned_agent_id);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);
CREATE INDEX idx_service_requests_request_type ON public.service_requests(request_type);

-- Enable RLS
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies (you can tighten these later)
CREATE POLICY "Anyone can create requests"
  ON public.service_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view requests"
  ON public.service_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update requests"
  ON public.service_requests
  FOR UPDATE
  USING (true);

-- Create notifications table for email/SMS tracking
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'push')),
  
  -- Content
  subject TEXT,
  message TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Context
  related_entity_type TEXT, -- 'agent', 'service_request', 'property'
  related_entity_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (true);

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Grant access
GRANT ALL ON public.service_requests TO authenticated, anon;
GRANT ALL ON public.notifications TO authenticated, anon;
