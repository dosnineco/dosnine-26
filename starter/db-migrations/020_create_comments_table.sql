-- Create comments table for service requests
CREATE TABLE IF NOT EXISTS public.service_request_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_comments_service_request ON public.service_request_comments(service_request_id);
CREATE INDEX idx_comments_user ON public.service_request_comments(user_id);
CREATE INDEX idx_comments_agent ON public.service_request_comments(agent_id);
CREATE INDEX idx_comments_created_at ON public.service_request_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.service_request_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can read comments, only authenticated users can create
CREATE POLICY "Anyone can view comments"
  ON public.service_request_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.service_request_comments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own comments"
  ON public.service_request_comments
  FOR UPDATE
  USING (user_id = auth.uid() OR agent_id IN (
    SELECT id FROM public.agents WHERE user_id = auth.uid()
  ));

-- Add comment_count column to service_requests for easy display
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Create function to update comment count
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.service_requests 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.service_request_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.service_requests 
    SET comment_count = GREATEST(comment_count - 1, 0) 
    WHERE id = OLD.service_request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update comment count
DROP TRIGGER IF EXISTS trigger_update_comment_count ON public.service_request_comments;
CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR DELETE ON public.service_request_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_count();
