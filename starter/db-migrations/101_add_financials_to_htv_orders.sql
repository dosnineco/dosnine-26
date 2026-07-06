-- Add missing financial and tracking fields to htv_orders table

ALTER TABLE public.htv_orders
ADD COLUMN IF NOT EXISTS raw_materials JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS raw_material_cost NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_expenses NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS expenses NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_month DATE,
ADD COLUMN IF NOT EXISTS order_week DATE;

-- Create indexes for financial filtering
CREATE INDEX IF NOT EXISTS idx_htv_orders_order_month ON public.htv_orders(order_month DESC);
CREATE INDEX IF NOT EXISTS idx_htv_orders_order_week ON public.htv_orders(order_week DESC);
CREATE INDEX IF NOT EXISTS idx_htv_orders_revenue ON public.htv_orders(revenue DESC);
CREATE INDEX IF NOT EXISTS idx_htv_orders_profit ON public.htv_orders(profit DESC);

-- Verify the columns were added
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: Financial fields added';
END $$;
