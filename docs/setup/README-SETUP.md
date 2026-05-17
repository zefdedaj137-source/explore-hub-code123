# 🚀 Quick Start Guide - Dating App Setup

## ⚠️ IMPORTANT: Database Setup Required!

Your app **WILL NOT WORK** without completing these steps:

---

## 📋 Step-by-Step Setup

### 1️⃣ Execute SQL in Supabase (REQUIRED)

1. Open: https://supabase.com/dashboard
2. Select your project
3. Click: **SQL Editor** → **New Query**
4. Open file: `FINAL_DATING_APP_DATABASE.sql`
5. Copy **ALL** content (Ctrl+A, Ctrl+C)
6. Paste into Supabase SQL Editor
7. Click: **Run** button (or Ctrl+Enter)
8. Wait for "Success. No rows returned"

### 2️⃣ Verify Database Setup

1. In Supabase SQL Editor, create a new query
2. Open file: `VERIFY_DATABASE.sql`
3. Copy and paste entire content
4. Click **Run**
5. Check results - all should show "EXISTS ✓"

### 3️⃣ Test Your App

1. Clear browser cache: `Ctrl+Shift+R`
2. Open: http://localhost:8082
3. Open browser console: `F12`
4. Try liking a profile
5. Check console for any errors

---

## ✅ What the SQL Creates

The `FINAL_DATING_APP_DATABASE.sql` file creates:

- **Tables:**
  - `likes` - Track who liked whom
  - `matches` - Store mutual likes
  - `daily_swipes` - Track swipe limits per user
  - `subscriptions` - Premium user tracking

- **Functions:**
  - `get_remaining_swipes()` - Check how many swipes left
  - `like_user()` - Handle like action with swipe limits
  - `unmatch_user()` - Remove matches

- **Security:**
  - RLS (Row Level Security) policies
  - User authentication checks
  - Data access controls

---

## 🎯 Expected Features After Setup

### Free Users:
- ✅ 10 swipes per 24 hours
- ✅ Swipe counter at top
- ✅ Timer showing reset time
- ✅ Upgrade prompt when out of swipes

### Premium Users:
- ✅ Unlimited swipes
- ✅ "Unlimited Swipes" badge
- ✅ No restrictions

### All Users:
- ✅ Like/Pass profiles
- ✅ Match notifications
- ✅ Match animations
- ✅ Bottom navigation (Discover, Matches, Messages, Profile)
- ✅ Top menu (Settings, Sign Out)

---

## 🐛 Troubleshooting

### Error: "Failed to like profile"

**Cause:** SQL not executed in Supabase

**Fix:** 
1. Run `FINAL_DATING_APP_DATABASE.sql` in Supabase
2. Verify with `VERIFY_DATABASE.sql`
3. Clear browser cache
4. Try again

### Error: "relation 'subscriptions' does not exist"

**Cause:** Old SQL version or SQL not fully executed

**Fix:**
1. Re-run the complete `FINAL_DATING_APP_DATABASE.sql`
2. Don't run partial queries
3. Wait for completion

### Error: "function like_user does not exist"

**Cause:** SQL functions not created

**Fix:**
1. Run `FINAL_DATING_APP_DATABASE.sql`
2. Check Supabase logs for errors
3. Verify functions exist with `VERIFY_DATABASE.sql`

### Buttons Don't Work

**Check:**
1. Open browser console (F12)
2. Look for red error messages
3. Share error message for help

### Can't See Navigation

**Fix:**
1. Hard refresh: `Ctrl+Shift+R`
2. Clear cache completely
3. Restart dev server

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `FINAL_DATING_APP_DATABASE.sql` | **Main setup file** - Run this first! |
| `VERIFY_DATABASE.sql` | Check if setup worked |
| `TROUBLESHOOTING.md` | Detailed debugging guide |
| `EXECUTE_IN_SUPABASE.md` | Step-by-step SQL execution |
| `README-SETUP.md` | This file |

---

## 🆘 Still Having Issues?

1. **Check browser console** (F12) for errors
2. **Run VERIFY_DATABASE.sql** to check setup
3. **Read TROUBLESHOOTING.md** for detailed help
4. **Clear all caches** and restart browser
5. **Share console errors** for specific help

---

## 🎉 Success Checklist

- [ ] SQL executed in Supabase without errors
- [ ] VERIFY_DATABASE.sql shows all "EXISTS ✓"
- [ ] App loads at http://localhost:8082
- [ ] Can see swipe counter at top
- [ ] Like button works (shows toast message)
- [ ] Pass button works (shows toast message)
- [ ] Bottom navigation visible
- [ ] Menu button (☰) opens and shows options
- [ ] No errors in browser console

---

**Once all checkboxes are complete, your app is fully functional!** 🎊
