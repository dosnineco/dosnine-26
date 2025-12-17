-- Enable Row Level Security on agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to read their own agent profile
CREATE POLICY "Users can view own agent profile"
ON agents FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
  )
);

-- Policy: Allow users to update their own agent profile
CREATE POLICY "Users can update own agent profile"
ON agents FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
  )
)
WITH CHECK (
  user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
  )
);

-- Policy: Allow admins to view all agents
CREATE POLICY "Admins can view all agents"
ON agents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.clerk_id = auth.jwt()->>'sub'
    AND users.role = 'admin'
  )
);

-- Policy: Allow admins to update any agent
CREATE POLICY "Admins can update any agent"
ON agents FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.clerk_id = auth.jwt()->>'sub'
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.clerk_id = auth.jwt()->>'sub'
    AND users.role = 'admin'
  )
);

-- Policy: Allow users to insert their own agent profile
CREATE POLICY "Users can create own agent profile"
ON agents FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
  )
);
