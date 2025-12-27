# Water Tracker Setup Guide

## Problem
Water logs table exists but is missing the `logged_at` column, causing the error:
```
ERROR: 42703: column "logged_at" does not exist
```

## Solution Steps

### Step 1: Fix the Existing Table

**OPTION A: Add Missing Column (Recommended - Preserves Data)**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `pborbenwojuygkvalurb`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire content from **`fix-water-logs-table.sql`**
6. Click **Run** or press `Ctrl+Enter`

This will add the `logged_at` column to your existing table without deleting any data.

**OPTION B: Recreate Table (If Option A Fails - DELETES ALL DATA!)**

⚠️ **WARNING: This will delete all existing water log data!**

1. Open **`recreate-water-logs-table.sql`**
2. Copy the entire content
3. Paste it into Supabase SQL Editor
4. Click **Run**

This completely drops and recreates the table with the correct structure.

### Step 2: Verify the Table

1. In Supabase Dashboard, go to **Table Editor**
2. Look for the `water_logs` table in the list
3. You should see these columns:
   - `id` (uuid, primary key)
   - `user_id` (text)
   - `amount_ml` (int4)
   - `logged_at` (timestamptz)
   - `date` (date)
   - `created_at` (timestamptz)

### Step 3: Test the Mobile App

1. Make sure your Expo app is running
2. Navigate to the Water Tracker in the mobile app
3. Click the "+ Add Water" button (200ml)
4. Check the terminal/console for these logs:
   ```
   [Water] Attempting to save 200 ml for user <userId>
   [Water] Creating new log with data: {...}
   [Water] ✅ Successfully saved new log: [...]
   [Water] Loaded 1 logs
   ```

### Step 4: Verify Data in Supabase

1. Go back to Supabase Dashboard → **Table Editor**
2. Click on the `water_logs` table
3. You should see your water log entries
4. Each entry should have:
   - A UUID `id`
   - Your `user_id`
   - The `amount_ml` (200, 400, 600, etc.)
   - The `logged_at` timestamp
   - The `date`

### Step 5: Check Admin Panel

1. Open your admin panel
2. Navigate to **Analytics** or **User View**
3. Select a user who has logged water
4. You should see the **Water Analytics** block with:
   - Total Intake
   - Average Daily
   - This Week Total
   - Goal Days
   - Last 7 Days chart
   - Recent Intake list

## Troubleshooting

### If you see an Alert: "Database Error"
This means the table doesn't exist or RLS policies are blocking access.
- Solution: Run the SQL script again (Step 1)

### If you see an Alert: "Please log in to track water intake"
This means no userId is stored.
- Solution: Log out and log back in to the mobile app

### If logs show but don't appear in Supabase
Check the console for error messages. Common issues:
- Table doesn't exist → Run the SQL script
- RLS policy blocking → The SQL script creates permissive policies
- Network issue → Check your internet connection

### If data appears in Supabase but not in Admin Panel
- Check that you're viewing the correct user
- Refresh the admin panel
- Check browser console for errors

## Testing the 1-Minute Consolidation

1. Click "Add Water" button quickly 3 times (within 10 seconds)
2. Check Recent Logs → Should show **1 entry** with 600ml
3. Wait 1+ minute
4. Click "Add Water" again
5. Check Recent Logs → Should now show **2 entries**

## Expected Behavior

### Mobile App:
- ✅ Water bottle fills up as you add water
- ✅ Calendar shows days with water logged (circular indicators)
- ✅ Recent Logs section shows last 5 entries
- ✅ Weekly chart displays last 7 days
- ✅ Analytics stats update in real-time

### Admin Panel:
- ✅ Water Analytics block shows for each user
- ✅ Stats calculate correctly from database
- ✅ Chart displays last 7 days
- ✅ Recent Intake list shows latest entries

## Files Modified

1. `mobile/src/app/(tabs)/wellness/water.jsx` - Enhanced error handling & alerts
2. `admin-panel/src/WaterAnalyticsBlock.jsx` - Fixed to use `logged_at` field
3. `mobile/create-water-logs-table.sql` - SQL script to create the table

---

**Need Help?**
Check the mobile app console logs for detailed error messages starting with `[Water]`
