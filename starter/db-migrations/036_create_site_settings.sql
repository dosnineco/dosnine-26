-- 036_create_site_settings.sql
-- Table to store global site settings (pricing, feature flags)

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Allow public SELECT so client can read pricing without admin auth

-- Helper function to check if user is admin (created here so subsequent policies can reference it)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE clerk_id = auth.jwt() ->> 'sub'
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Public read site settings" ON public.site_settings
  FOR SELECT TO public USING (true);

-- Only admins can INSERT/UPDATE/DELETE
CREATE POLICY "Admin modify site settings" ON public.site_settings
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Insert sensible defaults
INSERT INTO public.site_settings (key, value)
VALUES
  ('request_cost', '{"amount": 500}'),
  ('verified_lead_cost', '{"amount": 500}'),
  ('plan_prices', '{"7-day":1500, "30-day":6000, "90-day":15000, "free":0}')
ON CONFLICT (key) DO NOTHING;
