-- Create water_logs table
CREATE TABLE IF NOT EXISTS public.water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT now(),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_water_logs_user_id ON public.water_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_water_logs_date ON public.water_logs(date);
CREATE INDEX IF NOT EXISTS idx_water_logs_logged_at ON public.water_logs(logged_at DESC);

-- Enable RLS
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.water_logs;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.water_logs;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.water_logs;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.water_logs;

-- Create policies (permissive for development)
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
