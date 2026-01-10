-- Goals Table
create table if not exists public.goals (
    id uuid default gen_random_uuid() primary key,
    user_id text not null,
    title text not null,
    category text default 'wellness',
    frequency text default 'daily',
    streak integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_active boolean default true
);

-- Goal Completions Table (for tracking history)
create table if not exists public.goal_completions (
    id uuid default gen_random_uuid() primary key,
    user_id text not null,
    goal_id uuid references public.goals on delete cascade not null,
    completed_date date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, goal_id, completed_date)
);

-- RLS Policies (Disabled for now since we're using custom auth)
-- You can enable these later if you switch to Supabase Auth
alter table public.goals disable row level security;
alter table public.goal_completions disable row level security;

-- Optional: Create indexes for better performance
create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists goal_completions_user_id_idx on public.goal_completions(user_id);
create index if not exists goal_completions_date_idx on public.goal_completions(completed_date);
