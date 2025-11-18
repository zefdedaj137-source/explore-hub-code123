# Last Active / Spotlight Booster Feature

## Overview
A premium feature that allows users to boost their profile visibility by appearing in a special "Last Active" spotlight section on the Discover page.

## Features Implemented

### 1. Database Schema (`supabase/migrations/20251024_add_spotlight_booster.sql`)
- Added `last_active` timestamp column to track user activity
- Added `booster_active` boolean flag
- Added `booster_expires_at` timestamp for booster expiration
- Created indexes for efficient querying
- Auto-update trigger for `last_active` on profile updates

### 2. Database Functions
- **`activate_booster(user_id, duration_hours)`**: Activates booster for premium users
  - Checks premium status
  - Sets booster_active = true
  - Sets expiration time
  - Returns success/error status

- **`get_spotlight_profiles(current_user_id, max_distance_km)`**: Fetches active boosted profiles
  - Only returns profiles with active boosters
  - Filters by distance
  - Orders by last_active and expiration
  - Limits to 10 profiles

- **`deactivate_expired_boosters()`**: Auto-deactivates expired boosters
  - Should be run periodically (every 5 minutes recommended)

### 3. UI Components

#### Discover Page (`src/pages/Discover.tsx`)
- **Spotlight Section**: Horizontal scrollable cards showing boosted profiles
  - Golden/orange gradient styling
  - "VIP" badge on each card
  - Animated "Active Now" indicator
  - Blurred preview for non-premium users
  - Premium-only access to view full profiles

Features:
- Shows profile image, name, age, location, distance
- Click-to-view (premium required)
- Toast notification for non-premium users

#### Settings Page (`src/pages/Settings.tsx`)
- **Spotlight Booster Card**: Premium users can activate booster
  - Shows current booster status if active
  - Expiration time display
  - Three activation options:
    - 3 hours
    - 6 hours
    - 24 hours (recommended)

## User Flow

### For Premium Users (Boosting):
1. Go to Settings
2. See "Spotlight Booster" card
3. Choose duration (3h, 6h, or 24h)
4. Click to activate
5. Profile appears in "Last Active" section on Discover page for all users

### For All Users (Viewing):
1. Open Discover page
2. See "Last Active" spotlight section at the top (if there are boosted profiles)
3. Scroll through boosted profiles
4. **Premium users**: Click to view full profile
5. **Free users**: See blurred preview, click shows premium upgrade dialog

## Premium Gate
- **Activating Booster**: Requires premium subscription
- **Viewing Spotlight Profiles**: Requires premium subscription
  - Non-premium users see blurred previews
  - Click triggers upgrade dialog

## Technical Details

### TypeScript Types
Updated `src/integrations/supabase/types.ts`:
- Added `last_active`, `booster_active`, `booster_expires_at` to Profile type
- Added `get_spotlight_profiles` RPC function type
- Added `activate_booster` RPC function type

### State Management
- Spotlight profiles fetched on page load
- Auto-refresh not implemented (user can refresh page)
- Booster status checked on Settings page load

## Migration Instructions

### 1. Run the Migration
```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL in Supabase Dashboard
```

### 2. Set Up Policies
The migration includes RLS policies. Verify in Supabase Dashboard:
- Storage → videos → Policies

### 3. Test the Feature

#### Test Booster Activation (Premium User):
1. Ensure test user has `is_premium = true` in profiles table
2. Go to Settings
3. Activate booster
4. Verify `booster_active = true` in database

#### Test Spotlight Display:
1. With boosted profile active, open Discover page on another account
2. Verify spotlight section appears
3. Verify cards show correct data

## Styling
- Golden/orange gradient theme for premium spotlight
- VIP badge with sparkle icon
- Animated "Active Now" indicator (green pulsing dot)
- Blurred preview with crown icon for non-premium users
- Hover effects and smooth transitions

## Future Enhancements
1. Auto-refresh spotlight profiles (real-time updates)
2. Analytics: track views, likes from boosted visibility
3. Push notifications when booster expires
4. Scheduled boosters (activate at specific time)
5. Booster history/statistics
6. Different pricing tiers for different durations

## Notes
- Booster expiration is handled by the database function
- Consider setting up a cron job to call `deactivate_expired_boosters()` every 5 minutes
- Last active is automatically updated on any profile update
- Distance filtering respects user's discovery settings
