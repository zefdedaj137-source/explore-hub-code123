# How to Fix "Failed to like profile" Error

## Quick Fix Instructions:

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Execute the Database Migration
1. Open the file `FINAL_DATING_APP_DATABASE.sql` in this project
2. Copy ALL the contents (Ctrl+A, Ctrl+C)
3. Paste into the Supabase SQL Editor
4. Click "Run" button (or press Ctrl+Enter)

### Step 3: Verify Success
You should see a success message. The script will:
- ✅ Create `daily_swipes` table to track swipe limits
- ✅ Create `get_remaining_swipes()` function 
- ✅ Update `like_user()` function with swipe limit logic
- ✅ Set up 24-hour reset functionality

### Step 4: Test Your App
1. Refresh your app at http://localhost:8082
2. You should now see:
   - Swipe counter at the top (showing remaining swipes)
   - Free users: 10 swipes per 24 hours
   - Premium users: Unlimited swipes
   - Timer showing when swipes will reset

## What This Fixes:
- ❌ "Failed to like profile" error
- ❌ Swipes resetting immediately
- ✅ Proper 24-hour swipe limit tracking
- ✅ Premium user unlimited swipes
- ✅ Countdown timer until reset

## Troubleshooting:
If you still get errors after running the SQL:
1. Make sure you're logged into your Supabase account
2. Check that you selected the correct project
3. Verify the SQL ran successfully (no red error messages)
4. Try refreshing your browser cache (Ctrl+Shift+R)

---

**Note:** This only needs to be run ONCE. After successful execution, all swipe limit features will work correctly!
