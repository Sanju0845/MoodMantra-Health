-- Remove ALL unique constraints on water_logs table
-- Run this in Supabase SQL Editor

-- Drop the specific constraint that's causing the error
ALTER TABLE public.water_logs 
DROP CONSTRAINT IF EXISTS unique_water_user_date;

-- Also drop any other similar constraints (just in case)
ALTER TABLE public.water_logs 
DROP CONSTRAINT IF EXISTS water_logs_user_id_date_key;

-- Verify all constraints are removed
SELECT conname AS constraint_name, contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.water_logs'::regclass;

-- This will show remaining constraints. 
-- You should only see 'p' (primary key) for the id column.
-- If you see any 'u' (unique) constraints, let me know!
