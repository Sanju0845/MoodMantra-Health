# Quick Fix for Water Logs Error

## Error Message
```
ERROR: 42703: column "logged_at" does not exist
```

## What Happened
The `water_logs` table exists in your Supabase, but it's missing the `logged_at` column that our app needs.

## Quick Fix (2 minutes)

### Step 1: Go to Supabase
1. Open: https://supabase.com/dashboard
2. Select project: `pborbenwojuygkvalurb`
3. Click: **SQL Editor** (left sidebar)

### Step 2: Run This SQL
Copy and paste this into the SQL Editor:

```sql
-- Add the missing column
ALTER TABLE public.water_logs 
ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ DEFAULT now();

-- Update existing rows
UPDATE public.water_logs 
SET logged_at = COALESCE(created_at, now()) 
WHERE logged_at IS NULL;
```

Click **Run** ▶️

### Step 3: Test Mobile App
1. Open Water Tracker in mobile app
2. Click "Add Water" button
3. Check console - should see: `[Water] ✅ Successfully saved new log`
4. Check Recent Logs section - your water should appear!

## That's It! 🎉

Your water tracker should now work perfectly:
- ✅ Logs save to database
- ✅ Data appears in mobile app
- ✅ Admin panel shows water analytics
- ✅ 1-minute consolidation works

---

## If Still Not Working

Check the full guide: `WATER-TRACKER-SETUP.md`

Or use the complete recreation (deletes all data):
File: `recreate-water-logs-table.sql`
