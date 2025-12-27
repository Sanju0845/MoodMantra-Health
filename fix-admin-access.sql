-- FIX ADMIN PANEL DATA ACCESS
-- This script fixes the "404" or "No data" errors in the Admin Panel
-- by allowing public read access to the necessary tables.

-- 1. Journal Entries Fix
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.journal_entries;
CREATE POLICY "Enable read access for all users" ON public.journal_entries FOR SELECT USING (true);

-- 2. Appointments Fix
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.appointments;
CREATE POLICY "Enable read access for all users" ON public.appointments FOR SELECT USING (true);

-- 3. Mood Logs Fix
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.mood_logs;
CREATE POLICY "Enable read access for all users" ON public.mood_logs FOR SELECT USING (true);

-- 4. Habit Completions (Just in case)
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.habit_completions;
CREATE POLICY "Enable read access for all users" ON public.habit_completions FOR SELECT USING (true);
