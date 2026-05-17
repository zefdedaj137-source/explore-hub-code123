# 🚨 TROUBLESHOOTING GUIDE - Dating App Issues

## Issues You're Experiencing:
1. ❌ Cannot like or dislike profiles
2. ❌ Auto-login (no proper authentication)
3. ❌ Missing navigation (Matches, Settings, etc.)

---

## ✅ SOLUTION STEPS:

### Step 1: Execute the SQL Migration (CRITICAL!)

**The app WILL NOT WORK without running this SQL file first!**

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**
5. Copy **ALL** contents from `FINAL_DATING_APP_DATABASE.sql`
6. Paste into SQL Editor
7. Click **"Run"** (or Ctrl+Enter)

**Expected Result:** You should see "Success. No rows returned"

---

### Step 2: Verify Database Functions Were Created

In Supabase SQL Editor, run this query to check:

```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name IN ('like_user', 'get_remaining_swipes', 'unmatch_user');
```

**Expected Result:** Should show 3 functions:
- `like_user`
- `get_remaining_swipes`
- `unmatch_user`

---

### Step 3: Verify Tables Were Created

In Supabase SQL Editor, run:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('likes', 'matches', 'daily_swipes', 'profiles');
```

**Expected Result:** Should show 4 tables:
- `likes`
- `matches`
- `daily_swipes`
- `profiles`

---

### Step 4: Check Browser Console for Errors

1. Open your app at http://localhost:8082
2. Press **F12** to open Developer Tools
3. Click **"Console"** tab
4. Try to like a profile
5. Look for red errors

**Common Errors and Solutions:**

#### Error: "function like_user does not exist"
**Solution:** SQL migration wasn't run. Go back to Step 1.

#### Error: "Failed to like profile"
**Solution:** Check console for detailed error. Usually means:
- SQL migration not run
- RLS policies blocking access
- Network issues

#### Error: "No data returned from like_user function"
**Solution:** Function exists but might have errors. Check Supabase logs.

---

### Step 5: Fix Authentication Issues

The app should show:
- Landing page at `/`
- Auth page at `/auth`
- Only authenticated users can access `/discover`

**To fix auto-login:**

1. Clear browser cache (Ctrl+Shift+Delete)
2. Sign out completely
3. Go to http://localhost:8082
4. You should see landing page
5. Click "Sign In" or "Get Started"

**If still auto-logging in:**

Open browser console and run:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

### Step 6: Test Navigation

After successful login:

1. **Bottom Navigation Bar** should show:
   - ❤️ Discover (current page)
   - 👥 Matches
   - 💬 Messages
   - ⚙️ Profile

2. **Top Menu (☰)** should show:
   - My Matches
   - Edit Profile
   - Settings
   - Sign Out

**If navigation is missing:**
- Clear cache and refresh (Ctrl+Shift+R)
- Check console for errors

---

### Step 7: Test Like/Dislike

1. Go to Discover page
2. You should see swipe counter at top: "X free swipes left"
3. Click ❤️ (Like) button
4. You should see toast: "Profile liked!"
5. Click ❌ (Pass) button
6. You should see toast: "Profile passed"

**If buttons don't work:**
- Open console (F12)
- Look for error messages
- Copy error and check against Step 4 solutions

---

## 🔍 DETAILED DEBUGGING

### Check Supabase Connection

Open console and run:
```javascript
import { supabase } from '@/integrations/supabase/client';
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data, 'Error:', error);
```

### Test RPC Function Manually

In Supabase SQL Editor:
```sql
-- Test get_remaining_swipes (replace with your user ID)
SELECT get_remaining_swipes('your-user-id-here');

-- Test like_user (replace with actual user IDs)
SELECT like_user('your-user-id', 'target-user-id');
```

### Check RLS Policies

In Supabase Dashboard:
1. Go to **Authentication > Policies**
2. Check each table has policies enabled
3. Verify policies allow authenticated users to read/write

---

## 📊 EXPECTED BEHAVIOR

### ✅ What Should Happen:

1. **Landing Page**
   - Shows marketing content
   - "Get Started" button
   - "Sign In" button

2. **After Sign In**
   - Redirects to Profile Setup (first time)
   - Or Discover page (existing user)

3. **Discover Page**
   - Shows swipe counter
   - Shows profile cards
   - Like/Pass buttons work
   - Bottom navigation visible
   - Menu button (☰) works

4. **Swipe Limits**
   - Free users: 10 swipes per 24 hours
   - Premium users: Unlimited
   - Counter updates after each swipe
   - Shows reset timer when out of swipes

5. **Matches**
   - Creates match when mutual like
   - Shows "It's a match! 🎉" animation
   - Match appears in Matches page

---

## 🆘 STILL NOT WORKING?

### Share These Details:

1. **Browser Console Errors** (F12 > Console)
2. **Supabase SQL Result** (from Step 2 & 3)
3. **Network Tab** (F12 > Network > filter "like_user")
4. **Supabase Logs** (Dashboard > Logs > API Logs)

### Quick Fixes to Try:

```bash
# Clear all caches
1. Ctrl+Shift+Delete (Clear browsing data)
2. Select "All time"
3. Check all boxes
4. Click "Clear data"

# Hard refresh
Ctrl+Shift+R

# Restart dev server
Ctrl+C (stop server)
npm run dev
```

---

## 📝 CHECKLIST

Before reporting issues, verify:

- [ ] SQL migration executed successfully
- [ ] Functions exist in database (Step 2)
- [ ] Tables exist in database (Step 3)
- [ ] Browser console shows no errors
- [ ] Supabase RLS policies enabled
- [ ] User is authenticated
- [ ] Cache cleared
- [ ] Dev server restarted

---

**Need more help?** Check the browser console first - it usually shows exactly what's wrong!
