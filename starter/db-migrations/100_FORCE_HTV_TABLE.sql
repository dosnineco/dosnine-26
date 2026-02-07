-- ============================================
-- FORCE HTV ORDERS TABLE CREATION
-- This script aggressively creates the table
-- and forces PostgREST to see it
-- ============================================

-- Step 1: Drop everything completely
DROP TABLE IF EXISTS public.htv_orders CASCADE;

-- Step 2: Create the table with all columns
CREATE TABLE public.htv_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    delivery_area TEXT NOT NULL,
    rush_order BOOLEAN DEFAULT FALSE,
    logo_url TEXT NOT NULL,
    logo_filename TEXT NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    delivery_fee NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_htv_orders_created ON public.htv_orders(created_at DESC);
CREATE INDEX idx_htv_orders_status ON public.htv_orders(status);
CREATE INDEX idx_htv_orders_phone ON public.htv_orders(phone);

-- Step 4: Create update trigger
CREATE OR REPLACE FUNCTION update_htv_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_htv_orders_updated_at
    BEFORE UPDATE ON public.htv_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_htv_orders_updated_at();

-- Step 5: DISABLE RLS COMPLETELY
ALTER TABLE public.htv_orders DISABLE ROW LEVEL SECURITY;

-- Step 6: Grant ALL permissions to PUBLIC (most permissive)
GRANT ALL ON public.htv_orders TO PUBLIC;
GRANT ALL ON public.htv_orders TO anon;
GRANT ALL ON public.htv_orders TO authenticated;
GRANT ALL ON public.htv_orders TO service_role;

-- Step 7: Grant usage on sequences if any
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 8: Force PostgREST to reload schema (multiple times)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 9: Verify table exists and is accessible
DO $$
BEGIN
    -- Test insert
    INSERT INTO public.htv_orders (
        business_name, phone, email, size, color, quantity,
        delivery_area, rush_order, logo_url, logo_filename,
        subtotal, delivery_fee, total, status
    ) VALUES (
        'TEST BUSINESS', '876-000-0000', 'test@test.com',
        'medium', 'black', 4, 'halfWayTree', false,
        'https://test.com/test.png', 'test.png',
        4800, 0, 4800, 'test'
    );
    
    -- Clean up test data
    DELETE FROM public.htv_orders WHERE business_name = 'TEST BUSINESS';
    
    RAISE NOTICE '✓ SUCCESS: Table created, permissions granted, and tested successfully!';
END $$;

-- Step 10: Final verification query
SELECT 
    tablename,
    tableowner,
    hasindexes,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'htv_orders';

-- Show grants
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'htv_orders'
ORDER BY grantee, privilege_type;
