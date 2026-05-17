# 🧹 Supabase Cleanup & Fresh Install Guide

## 📋 What This Does:
Removes all old, duplicate, and problematic code from your Supabase database and installs a clean, working version.

---

## 🚀 STEP-BY-STEP INSTRUCTIONS:

### Step 1: Clean Up Old Code

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click: **SQL Editor** → **New Query**

2. **Run Cleanup Script**
   - Open: `CLEANUP_SUPABASE.sql`
   - Copy **ALL** content
   - Paste in Supabase SQL Editor
   - Click: **Run** (or Ctrl+Enter)

3. **Verify Cleanup**
   - Should see: "CLEANUP COMPLETE"
   - Should see: "REMAINING FUNCTIONS" section with NO rows
   - This means all old code is removed ✅

### Step 2: Install Fresh Database

1. **In Same SQL Editor**
   - Click: **New Query**

2. **Run Main Install Script**
   - Open: `FINAL_DATING_APP_DATABASE.sql`
   - Copy **ALL** content (Ctrl+A, Ctrl+C)
   - Paste in Supabase SQL Editor
   - Click: **Run**

3. **Look for Success Messages**
   ```
   ✅ Dating app database setup complete!
   Created:
     - Tables: likes, matches, daily_swipes, subscriptions
     - Functions: like_user, unmatch_user, get_remaining_swipes
     - RLS Policies for security
   ```

### Step 3: Verify Installation

1. **Run Verification Script**
   - Click: **New Query**
   - Open: `VERIFY_DATABASE.sql`
   - Copy and paste
   - Click: **Run**

2. **Check Results**
   - All functions should show: "EXISTS ✓"
   - All tables should show: "EXISTS ✓"
   - RLS policies should be listed
   - Record counts should show

### Step 4: Test Your App

1. **Hard Refresh Browser**
   - Press: `Ctrl+Shift+R`
   - Or clear cache completely

2. **Open Browser Console**
   - Press: `F12`
   - Click: **Console** tab

3. **Test Features**
   - ✅ Like a profile → Should work
   - ✅ Pass a profile → Should work
   - ✅ See swipe counter → "X free swipes left"
   - ✅ No console errors

---

## ⚠️ IMPORTANT NOTES:

### Data Loss Warning:
- `CLEANUP_SUPABASE.sql` will **DELETE ALL DATA** in:
  - `likes` table
  - `matches` table
  - `daily_swipes` table
  - `subscriptions` table

### If You Want to Keep Data:
Edit `CLEANUP_SUPABASE.sql` and **comment out** these lines:
```sql
-- DROP TABLE IF EXISTS likes CASCADE;
-- DROP TABLE IF EXISTS matches CASCADE;
-- DROP TABLE IF EXISTS daily_swipes CASCADE;
-- DROP TABLE IF EXISTS subscriptions CASCADE;
```

Then only the functions will be removed and recreated.

---

## 📁 Files You Need:

| Order | File | Purpose |
|-------|------|---------|
| 1️⃣ | `CLEANUP_SUPABASE.sql` | Remove old code |
| 2️⃣ | `FINAL_DATING_APP_DATABASE.sql` | Install fresh database |
| 3️⃣ | `VERIFY_DATABASE.sql` | Verify installation |

---

## ✅ Success Checklist:

- [ ] Ran `CLEANUP_SUPABASE.sql` successfully
- [ ] Saw "CLEANUP COMPLETE" message
- [ ] Ran `FINAL_DATING_APP_DATABASE.sql` successfully
- [ ] Saw success messages about tables/functions created
- [ ] Ran `VERIFY_DATABASE.sql` successfully
- [ ] All items show "EXISTS ✓"
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Cleared browser console
- [ ] Tested like button - works! ✅
- [ ] Tested pass button - works! ✅
- [ ] Swipe counter shows correctly ✅
- [ ] No console errors ✅

---

## 🎯 What Gets Installed:

### Tables:
- ✅ `likes` - Who liked whom
- ✅ `matches` - Mutual likes
- ✅ `daily_swipes` - Swipe limit tracking
- ✅ `subscriptions` - Premium users

### Functions:
- ✅ `get_remaining_swipes(user_id)` - Check swipe limits
- ✅ `like_user(current_user_id, target_user_id)` - Like + match
- ✅ `unmatch_user(current_user_id, other_user_id)` - Remove match

### Security:
- ✅ Row Level Security (RLS) enabled
- ✅ Policies for data access
- ✅ User authentication checks

---

## 🐛 Troubleshooting:

### Error: "permission denied"
**Fix:** Make sure you're the owner of the Supabase project

### Error: "relation already exists"
**Fix:** Run `CLEANUP_SUPABASE.sql` again to remove all tables first

### Cleanup didn't work
**Fix:** Check Supabase logs for errors. You might need to manually delete tables:
```sql
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS daily_swipes CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
```

---

## 🚀 Quick Start (TL;DR):

```bash
1. Open Supabase SQL Editor
2. Run CLEANUP_SUPABASE.sql
3. Run FINAL_DATING_APP_DATABASE.sql
4. Run VERIFY_DATABASE.sql (to verify)
5. Refresh browser (Ctrl+Shift+R)
6. Test app - should work perfectly! ✅
```

---

**After following these steps, you'll have a clean, working database!** 🎉
