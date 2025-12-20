-- Fix agent_feedback RLS policies for Clerk authentication
-- Drop existing policies
DROP POLICY IF EXISTS "Agents can view own feedback" ON agent_feedback;
DROP POLICY IF EXISTS "Agents can update own responses" ON agent_feedback;
DROP POLICY IF EXISTS "Admins have full access" ON agent_feedback;
DROP POLICY IF EXISTS "Allow all operations for API" ON agent_feedback;

-- Create new policy that allows all operations
-- Since we use Clerk (not Supabase Auth), auth.uid() is null
-- Authorization is handled in the API layer
CREATE POLICY "Allow all operations for API"
  ON agent_feedback
  FOR ALL
  USING (true)
  WITH CHECK (true);
