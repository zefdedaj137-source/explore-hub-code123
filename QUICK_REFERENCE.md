# 🎯 QUICK REFERENCE - Supabase Database Setup

## 📝 3-Step Process:

```
┌─────────────────────────────────────────┐
│  STEP 1: CLEANUP                        │
│  File: CLEANUP_SUPABASE.sql             │
│  Purpose: Remove old/duplicate code     │
│  ⚠️  Warning: Deletes all data!         │
└─────────────────────────────────────────┘
              ⬇️
┌─────────────────────────────────────────┐
│  STEP 2: INSTALL                        │
│  File: FINAL_DATING_APP_DATABASE.sql    │
│  Purpose: Create fresh database         │
│  ✅ Tables, Functions, Security         │
└─────────────────────────────────────────┘
              ⬇️
┌─────────────────────────────────────────┐
│  STEP 3: VERIFY                         │
│  File: VERIFY_DATABASE.sql              │
│  Purpose: Check everything works        │
│  ✅ All should show "EXISTS ✓"          │
└─────────────────────────────────────────┘
```

---

## 🚀 Copy-Paste Checklist:

### In Supabase SQL Editor:

**1. Clean Up (removes old code)**
```
✓ Open CLEANUP_SUPABASE.sql
✓ Copy all → Paste → Run
✓ See "CLEANUP COMPLETE"
```

**2. Install Fresh (creates new database)**
```
✓ Open FINAL_DATING_APP_DATABASE.sql
✓ Copy all → Paste → Run
✓ See success messages
```

**3. Verify (check it worked)**
```
✓ Open VERIFY_DATABASE.sql
✓ Copy all → Paste → Run
✓ All show "EXISTS ✓"
```

**4. Test App**
```
✓ Hard refresh: Ctrl+Shift+R
✓ Like button works
✓ Pass button works
✓ No errors in console
```

---

## 📊 What Each Script Does:

| Script | What It Does | What You See |
|--------|--------------|--------------|
| `CLEANUP_SUPABASE.sql` | Drops old functions & tables | "CLEANUP COMPLETE" |
| `FINAL_DATING_APP_DATABASE.sql` | Creates fresh database | Success notices + feature list |
| `VERIFY_DATABASE.sql` | Checks installation | All items "EXISTS ✓" |

---

## ✅ Expected Results:

### After Cleanup:
- Old functions removed
- Old tables dropped (data deleted!)
- Clean slate ready

### After Install:
- 4 tables created (likes, matches, daily_swipes, subscriptions)
- 3 functions created (like_user, unmatch_user, get_remaining_swipes)
- RLS policies enabled
- Indexes created

### After Verify:
- All functions exist ✓
- All tables exist ✓
- Policies configured ✓
- Ready to use ✓

---

## 🎯 Your App Features:

After successful installation:

✅ **Swipe Limits**
- Free: 10 swipes per 24 hours
- Premium: Unlimited swipes

✅ **Like/Pass**
- Click ❤️ to like
- Click ❌ to pass
- Profiles never reappear

✅ **Matching**
- Automatic match on mutual like
- Match animation
- Match notifications

✅ **Navigation**
- Bottom nav: Discover, Matches, Messages, Profile
- Top menu: Settings, Sign Out

---

## 📁 All Helper Files:

- `CLEANUP_SUPABASE.sql` ← Run this FIRST
- `FINAL_DATING_APP_DATABASE.sql` ← Then run this
- `VERIFY_DATABASE.sql` ← Finally verify with this
- `INSTALLATION_GUIDE.md` ← Detailed instructions
- `COMPLETE_FIX_GUIDE.md` ← Technical details
- `TROUBLESHOOTING.md` ← If something goes wrong
- `README-SETUP.md` ← Quick start guide

---

## ⏱️ Total Time: ~5 minutes

1 min - Run cleanup
1 min - Run install  
1 min - Run verify
2 min - Test app

**That's it! Your database will be clean and working!** 🎉
