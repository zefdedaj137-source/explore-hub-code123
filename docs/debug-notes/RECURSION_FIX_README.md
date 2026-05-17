# 🚨 CRITICAL: Fix for "infinite recursion detected in policy for relation profiles"

## Problem
Your Supabase database has a recursive Row Level Security (RLS) policy that causes infinite recursion when trying to fetch profiles.

## ⚡ IMMEDIATE SOLUTION

### Step 1: Fix Database Policy
1. **Go to**: https://supabase.com/dashboard/project/ojefwfokxsifdxylrwca
2. **Navigate to**: SQL Editor
3. **Copy the entire content** of `FIX_SUPABASE_RECURSION.sql`
4. **Paste and Execute** the SQL script

### Step 2: Verify Fix
After running the SQL:
1. Refresh your app at http://localhost:8080/
2. Try navigating to the Discover page
3. The infinite recursion error should be gone

## 🔧 What This Fix Does

1. **Removes** the problematic recursive policy
2. **Creates** a secure database function that bypasses recursion
3. **Updates** the app to use the new function
4. **Adds** fallback support for gradual migration

## 📋 Files Modified
- `FIX_SUPABASE_RECURSION.sql` - Database fix script
- `src/pages/Discover.tsx` - Updated to use RPC function
- This README with instructions

## ✅ Benefits
- ✅ Eliminates infinite recursion
- ✅ Improves query performance  
- ✅ Maintains security
- ✅ Provides fallback support
- ✅ Future-proof solution

## 🆘 If You Need Help
The app will continue working with a basic fallback until you run the SQL fix. The error message will appear in console but won't break functionality.

**Priority**: HIGH - Please run the SQL fix as soon as possible for optimal performance.