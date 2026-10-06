ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_type TEXT,
  ADD COLUMN IF NOT EXISTS profile_intent TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_account_type_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_account_type_check
      CHECK (account_type IS NULL OR account_type IN ('regular', 'advertiser', 'agent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_profile_intent_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_profile_intent_check
      CHECK (profile_intent IS NULL OR profile_intent IN ('homeowner', 'tenant'));
  END IF;
END
$$;

UPDATE public.users
SET account_type = 'agent'
WHERE user_type = 'agent'
  AND account_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_account_type ON public.users(account_type);
