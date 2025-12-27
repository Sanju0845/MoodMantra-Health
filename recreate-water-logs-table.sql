-- Complete recreation of water_logs table
-- WARNING: This will DELETE all existing water log data!
-- Run this in Supabase SQL Editor ONLY if fix-water-logs-table.sql doesn't work

-- Drop the existing table (WARNING: DELETES ALL DATA!)
DROP TABLE IF EXISTS public.water_logs CASCADE;

-- Create the correct structure
CREATE TABLE public.water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT now(),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_water_logs_user_id ON public.water_logs(user_id);
CREATE INDEX idx_water_logs_date ON public.water_logs(date);
CREATE INDEX idx_water_logs_logged_at ON public.water_logs(logged_at DESC);

-- Enable Row Level Security
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development
CREATE POLICY "Enable read access for all users" ON public.water_logs 
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON public.water_logs 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.water_logs 
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON public.water_logs 
    FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON public.water_logs TO anon;
GRANT ALL ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;

-- Verify the structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'water_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;
