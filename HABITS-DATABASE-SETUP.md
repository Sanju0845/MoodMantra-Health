# Habits Tracker Database Setup - URGENT FIX

## 🚨 The Problem
The admin panel is trying to fetch from `habits` and `habit_logs` tables that don't exist in Supabase.

## ✅ The Solution
Run the SQL script to create the required tables.

---

## 📝 Steps to Fix:

### 1. Go to Supabase Dashboard
- Open https://supabase.com/dashboard
- Select your project

### 2. Open SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "New query"

### 3. Run the Migration
Copy and paste the **entire** contents of `create-habits-tables.sql` into the editor and click "Run"

### 4. Verify Tables Created
Go to "Table Editor" and confirm you see:
- ✅ `habits` table
- ✅ `habit_logs` table

---

## 📋 What These Tables Store:

### **habits** table:
- `id` - Unique habit ID
- `user_id` - User who created the habit
- `title` - Habit name (e.g., "Read 15 mins")
- `icon` - Emoji icon (e.g., "📖")
- `color` - Color code (e.g., "#3B82F6")
- `created_at` - When habit was created

### **habit_logs** table:
- `id` - Auto-incrementing ID
- `user_id` - User ID
- `date` - Date string (YYYY-MM-DD)
- `completed_ids` - Array of habit IDs completed that day
- `created_at` - Timestamp

---

## 🔄 After Running SQL:

1. **Refresh admin panel** at https://raska-wellness-admin.surge.sh
2. **Click on a user** who has created habits in the mobile app
3. **Habits Analytics should now load!**

---

## 📱 Mobile App Sync:

The mobile app is already configured to save to these tables. Once you create the tables:
- New habits created in mobile app → Saved to `habits` table
- Daily completions → Saved to `habit_logs` table
- Admin panel → Reads from both tables

---

## ⚠️ Important Notes:

1. **RLS is enabled** but policies are permissive for development
2. **Unique constraint** on `(user_id, date)` in habit_logs prevents duplicates
3. **completed_ids is an array** - stores list of habit IDs completed each day

---

## 🧪 Test After Setup:

1. Open mobile app
2. Go to Habits screen
3. Create a habit
4. Complete it (check it off)
5. Open admin panel
6. View that user's Habits Analytics
7. Should see the habit, completion, and calendar!

---

**Once tables are created, everything will work perfectly!** 🎉
