CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_settings'
      AND policyname = 'Public read site settings'
  ) THEN
    CREATE POLICY "Public read site settings" ON public.site_settings
      FOR SELECT TO public USING (true);
  END IF;
END;
$$;

INSERT INTO public.site_settings (key, value)
VALUES ('ad_plan_prices', '{"14-day":17999,"30-day":52499}'::JSONB)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
