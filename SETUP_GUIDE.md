# 🚀 Setup Guide - Spotlight Booster System

## Errors Found & Solutions

### 1. ❌ Database Functions Missing (400 Error on `get_spotlight_profiles`)
**Error:** `Failed to load resource: the server responded with a status of 400`

**Solution:** Run the migration SQL in Supabase Dashboard

#### Steps to Fix:
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **gh-explore-hub**
3. Navigate to: **SQL Editor** (left sidebar)
4. Click **"+ New Query"**
5. Copy the entire content of: `supabase/migrations/20251024_add_spotlight_booster.sql`
6. Paste it into the SQL Editor
7. Click **"Run"** (or press Ctrl+Enter)
8. Wait for "Success. No rows returned" message

This will create:
- ✅ New columns: `boost_credits`, `booster_active`, `booster_expires_at`, `last_active`
- ✅ Functions: `activate_booster()`, `activate_booster_with_credit()`, `get_spotlight_profiles()`, etc.
- ✅ Automatic triggers for last_active updates

---

### 2. ❌ Storage Bucket Not Found
**Error:** `Bucket not found` when uploading profile photos

**Solution:** Create the `avatars` storage bucket

#### Steps to Fix:
1. Go to your Supabase Dashboard
2. Navigate to: **Storage** (left sidebar)
3. Click **"Create a new bucket"**
4. Bucket name: `avatars`
5. Set to **Public** (check the box)
6. Click **"Create bucket"**
7. Click on the `avatars` bucket
8. Click **"Policies"** tab
9. Click **"New Policy"** → **"Create a policy from scratch"**
10. Create these two policies:

**Policy 1: Allow Public Read**
```sql
-- Name: Public read access
-- Target roles: public
-- Policy command: SELECT

CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

**Policy 2: Allow Authenticated Upload**
```sql
-- Name: Users can upload their own avatars
-- Target roles: authenticated
-- Policy command: INSERT

CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Policy 3: Allow Authenticated Update**
```sql
-- Name: Users can update their own avatars
-- Target roles: authenticated
-- Policy command: UPDATE

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 3. ✅ Code Fixed - Storage Bucket Name
Changed from `profile-images` to `avatars` in `MyProfile.tsx`

---

## Testing the Boost System

After completing the above setup:

### Grant yourself 5 boost credits:
1. Go to **SQL Editor** in Supabase
2. Run this command (replace with your user ID):
```sql
UPDATE profiles 
SET boost_credits = 5 
WHERE id = '596116f8-cde5-4a9e-bb4c-6e91f7b94eae';
```

### Activate a booster:
1. Navigate to the **Discover** page
2. You should see "5" credits displayed in the boost button
3. Click the **"BOOST"** button
4. Choose "Use Free Boost" option
5. The booster will activate for 3 hours

### View boosted profiles:
1. Stay on the **Discover** page
2. Click the **"Last Active"** tab (blue/cyan theme)
3. You should see users who have active boosters
4. These profiles appear in a grid layout

---

## Verification Checklist

- [ ] Run migration SQL in Supabase SQL Editor
- [ ] Create `avatars` storage bucket with public access
- [ ] Set up storage policies (read, insert, update)
- [ ] Grant yourself boost credits
- [ ] Test boost activation
- [ ] Test "Last Active" tab in Discover page
- [ ] Test photo upload in MyProfile page
- [ ] Verify boost countdown in Settings page

---

## Current Database Connection

Your DATABASE_URL is configured in `.env` file.
The app is connected to: **fqmleivxlqqnlokconux.supabase.co**

---

## Need Help?

If you encounter any issues:
1. Check browser console for detailed error messages
2. Verify all SQL ran successfully (no red errors in Supabase SQL Editor)
3. Confirm storage bucket exists and is public
4. Check that your user has boost_credits > 0
