-- Create habits table
CREATE TABLE IF NOT EXISTS public.habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create habit_logs table
CREATE TABLE IF NOT EXISTS public.habit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    completed_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON public.habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON public.habit_logs(date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for habits table
CREATE POLICY "Enable read access for all users" ON public.habits
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.habits
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id" ON public.habits
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for users based on user_id" ON public.habits
    FOR DELETE USING (true);

-- Create RLS policies for habit_logs table
CREATE POLICY "Enable read access for all users" ON public.habit_logs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.habit_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id" ON public.habit_logs
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for users based on user_id" ON public.habit_logs
    FOR DELETE USING (true);
