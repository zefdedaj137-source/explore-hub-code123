# Discovery Settings Fix - SQL Migrations to Run

## Overview
The Discovery Settings feature has been added to the Settings page, but requires database schema updates. Run these migrations in your Supabase SQL Editor in the order listed below.

## Migrations to Run (in order):

### 1. Fix Foreign Key Relationships (Issue 5)
**File:** `supabase/migrations/20251031_fix_likes_foreign_key.sql`

This migration:
- Cleans up orphaned records in the likes table
- Adds proper foreign key constraints with CASCADE delete
- Creates indexes for better performance

### 2. Add Spotlight Profiles Function (Issue 6)
**File:** `supabase/migrations/20251031_add_spotlight_profiles_function.sql`

This migration:
- Creates the `get_spotlight_profiles()` function for the spotlight/boost feature
- Includes the `calculate_distance()` helper function using Haversine formula
- Grants proper permissions to authenticated users

### 3. Add Discovery Preference Columns
**File:** `supabase/migrations/20251031_add_discovery_preferences.sql`

This migration:
- Adds `min_age_preference` column (default: 18, range: 18-99)
- Adds `max_age_preference` column (default: 99, range: 18-99)
- Adds `max_distance_km` column (default: 100 km, range: 1-500)
- Creates indexes for query performance
- Updates existing profiles with default values

### 4. Fix looking_for Schema and Add Gender Preference
**File:** `supabase/migrations/20251031_fix_looking_for_add_gender_preference.sql`

This migration:
- Adds `gender_preference` column (for who user wants to see: male, female, everyone)
- Fixes the schema conflict where `looking_for` was both TEXT and TEXT[]
- Migrates existing data appropriately
- Creates proper indexes

## How to Apply:

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. For each migration file (in order 1-4):
   - Copy the entire content of the file
   - Paste into SQL Editor
   - Click "Run" or press Ctrl+Enter
4. Wait for confirmation message for each migration
5. After all migrations are complete, **restart your development server**

## What This Enables:

After running these migrations, users will be able to:
- ✅ Set age range preferences (min and max age)
- ✅ Set maximum distance for profile discovery
- ✅ Choose who they want to see (Men, Women, or Everyone)
- ✅ Have these preferences persist across sessions
- ✅ See profiles filtered by their preferences in the Discover page

## TypeScript Types:

After running the migrations, you may want to regenerate your TypeScript types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

## Testing:

1. Navigate to Settings page
2. Scroll to "Discovery Settings" section
3. Adjust the sliders and radio buttons
4. Click "Save Discovery Settings"
5. Check that a success toast appears
6. Refresh the page and verify settings persisted

## Notes:

- All columns have proper constraints and default values
- Existing users will automatically get default preferences
- The changes are backward compatible
- All migrations include proper error handling
