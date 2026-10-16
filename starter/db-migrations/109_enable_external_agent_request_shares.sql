ALTER TABLE public.buyer_request_agent_shares
  ALTER COLUMN agent_user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS agent_email text,
  ADD COLUMN IF NOT EXISTS invite_token_hash text,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;

UPDATE public.buyer_request_agent_shares AS share
SET agent_email = lower(users.email)
FROM public.users AS users
WHERE share.agent_user_id = users.id
  AND share.agent_email IS NULL
  AND nullif(trim(users.email), '') IS NOT NULL;

WITH duplicate_emails AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY service_request_id, lower(agent_email)
      ORDER BY created_at DESC, id
    ) AS duplicate_number
  FROM public.buyer_request_agent_shares
  WHERE agent_email IS NOT NULL
)
UPDATE public.buyer_request_agent_shares AS share
SET agent_email = NULL
FROM duplicate_emails
WHERE share.id = duplicate_emails.id
  AND duplicate_emails.duplicate_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS buyer_request_agent_shares_request_email_unique
  ON public.buyer_request_agent_shares (service_request_id, lower(agent_email))
  WHERE agent_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_buyer_request_agent_shares_invite_token
  ON public.buyer_request_agent_shares (invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

GRANT ALL ON public.buyer_request_agent_shares TO service_role;
