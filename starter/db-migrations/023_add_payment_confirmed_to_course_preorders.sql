-- Add payment_confirmed column to course_preorders table
ALTER TABLE course_preorders 
ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT FALSE;

-- Add index for faster queries on payment status
CREATE INDEX IF NOT EXISTS idx_course_preorders_payment_confirmed 
ON course_preorders(payment_confirmed);

-- Add index for faster queries on created_at
CREATE INDEX IF NOT EXISTS idx_course_preorders_created_at 
ON course_preorders(created_at DESC);
