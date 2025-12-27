-- Drop the unused habit_logs table
-- This table is not being used. The app uses:
-- - habits: stores habit definitions
-- - habit_completion: stores when habits are completed

DROP TABLE IF EXISTS public.habit_logs CASCADE;
