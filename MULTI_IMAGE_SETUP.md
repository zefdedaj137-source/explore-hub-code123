# 📸 MULTI-IMAGE PROFILE UPLOAD - SETUP INSTRUCTIONS

## ✅ What's Been Implemented

### Frontend Changes:
1. **EditProfile.tsx** - Multi-image upload system
   - Upload up to 10 photos at once
   - Drag to reorder photos (first photo = main profile picture)
   - Delete individual photos
   - Beautiful grid gallery layout
   - Image counter showing X/10 photos

2. **Matches.tsx** - Image carousel in profile view
   - Swipeable carousel showing all profile photos
   - Photo counter (1/5, 2/5, etc.)
   - Falls back to single image or gradient if no photos
   - Previous/Next navigation buttons

### Database Changes:
3. **New Migration File** - `20251019000001_add_profile_images_array.sql`
   - Adds `profile_images` column (text array) to profiles table
   - Automatic sync: `profile_images[1]` → `profile_image_url` (backward compatibility)
   - Database trigger keeps everything in sync

## 🚀 SETUP STEPS

### Step 1: Run the Database Migration
1. Open your **Supabase Dashboard** (https://supabase.com/dashboard)
2. Go to **SQL Editor**
3. Copy and paste the contents of:
   ```
   supabase/migrations/20251019000001_add_profile_images_array.sql
   ```
4. Click **Run** to execute the migration

### Step 2: Verify the Migration
Run this query in Supabase SQL Editor to verify:

```sql
-- Check if profile_images column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name = 'profile_images';

-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'sync_profile_image_trigger';
```

Expected results:
- Column: `profile_images` with type `ARRAY` and default `'{}'`
- Trigger: `sync_profile_image_trigger` on `profiles` table

### Step 3: Test the Feature
1. Go to **Edit Profile** page
2. Click "Add Photos" or the upload area
3. Select multiple images (up to 10)
4. Verify:
   - ✅ Images upload successfully
   - ✅ First image has "Main" badge
   - ✅ Counter shows "X/10"
   - ✅ Can delete photos (X button on hover)
   - ✅ Can reorder photos (arrow buttons)

5. Go to **Matches** page
6. Click on a match card
7. Verify:
   - ✅ See carousel with all their photos
   - ✅ Can swipe/click through images
   - ✅ Photo counter appears (1/5, 2/5, etc.)

## 📋 Features

### Edit Profile Page:
- **Grid Gallery**: 2 columns on mobile, 5 columns on desktop
- **Upload Multiple**: Select multiple files at once
- **Image Limit**: Maximum 10 photos (enforced)
- **Reorder Photos**: Use arrow buttons to move images left/right
- **Delete Photos**: Hover and click X to remove
- **Main Photo Badge**: First photo automatically becomes main profile picture
- **Empty State**: Shows upload prompt when no photos exist

### Match Profile View:
- **Image Carousel**: Swipe through all photos
- **Navigation**: Previous/Next buttons (only if multiple photos)
- **Photo Counter**: Shows "3/7" etc.
- **Fallback Support**: 
  - Shows carousel if multiple images exist
  - Shows single image if only one
  - Shows gradient with initial if no photos

## 🔧 Technical Details

### Database Schema:
```sql
ALTER TABLE profiles ADD COLUMN profile_images text[] DEFAULT '{}';
```

### Automatic Sync Trigger:
```sql
-- Keeps profile_image_url in sync with first image
CREATE TRIGGER sync_profile_image_trigger
  BEFORE INSERT OR UPDATE OF profile_images ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_image_url();
```

### Storage Bucket:
- Uses existing `profile-photos` bucket
- File naming: `{user_id}/{timestamp}-{random}.{ext}`
- RLS policies already configured

### State Management:
```typescript
const [profileImages, setProfileImages] = useState<string[]>([]);
```

### Upload Logic:
- Validates 10-image limit before upload
- Uploads all selected files in sequence
- Updates database with new array
- Syncs first image as main profile photo

## ⚡ Performance Notes

1. **Lazy Loading**: Images load as needed in carousel
2. **Optimized Queries**: Only fetch `profile_images` when needed
3. **Storage**: Uses Supabase CDN for fast image delivery
4. **Caching**: Browser caches images for quick re-display

## 🎨 UI/UX Features

- **Hover Effects**: Image controls appear on hover
- **Loading States**: Shows "Uploading..." during upload
- **Error Handling**: Toast notifications for all errors
- **Responsive**: Works on mobile and desktop
- **Touch Support**: Swipe gestures on mobile carousel

## 📝 Notes

- First photo in the array is ALWAYS the main profile picture
- Deleting the first photo makes the second photo the new main
- Reordering updates the database immediately
- Old `profile_image_url` field still works (backward compatible)
- Migration is non-destructive (won't affect existing data)

## 🐛 Troubleshooting

If images don't upload:
1. Check Supabase storage RLS policies
2. Verify `profile-photos` bucket exists
3. Check browser console for errors
4. Ensure file sizes are reasonable (<10MB)

If carousel doesn't work:
1. Verify migration ran successfully
2. Check `profile_images` column exists
3. Refresh the page
4. Check browser console for errors
