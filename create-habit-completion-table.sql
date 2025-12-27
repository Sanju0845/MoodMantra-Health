-- Create habit_completion table to store when users complete habits
CREATE TABLE IF NOT EXISTS public.habit_completion (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    habit_id TEXT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habit_completion_user_id ON public.habit_completion(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completion_habit_id ON public.habit_completion(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completion_completed_at ON public.habit_completion(completed_at);
CREATE INDEX IF NOT EXISTS idx_habit_completion_user_habit ON public.habit_completion(user_id, habit_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.habit_completion ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.habit_completion
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.habit_completion
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id" ON public.habit_completion
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for users based on user_id" ON public.habit_completion
    FOR DELETE USING (true);
