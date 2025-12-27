-- Fix water_logs table by adding missing logged_at column
-- Run this in Supabase SQL Editor

-- Option 1: Add the missing column (if table has some structure)
ALTER TABLE public.water_logs 
ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ DEFAULT now();

-- Update existing rows to have logged_at = created_at (if created_at exists)
UPDATE public.water_logs 
SET logged_at = created_at 
WHERE logged_at IS NULL AND created_at IS NOT NULL;

-- Or if created_at doesn't exist, use current timestamp
UPDATE public.water_logs 
SET logged_at = now() 
WHERE logged_at IS NULL;

-- Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'water_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;
