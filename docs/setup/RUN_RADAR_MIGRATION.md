# Running the Radar Database Migration

Since Supabase CLI is not available in this terminal session, you'll need to run the SQL migration manually.

## Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project (fqmleivxlqqnlokconux)
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the entire SQL from: `supabase/migrations/20251020000002_add_distance_calculation.sql`
6. Click "Run" or press Ctrl+Enter

## Option 2: Copy SQL Here

```sql
-- Add location columns to profiles if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);

-- Function to calculate distance between two points using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance(
  user_lat DOUBLE PRECISION,
  user_long DOUBLE PRECISION,
  max_distance DOUBLE PRECISION DEFAULT 0.1
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  age INTEGER,
  profile_image_url TEXT,
  bio TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  interests TEXT[],
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.age,
    p.profile_image_url,
    p.bio,
    p.latitude,
    p.longitude,
    p.interests,
    (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(user_long)) + 
        sin(radians(user_lat)) * 
        sin(radians(p.latitude))
      )
    ) AS distance
  FROM profiles p
  WHERE 
    p.latitude IS NOT NULL 
    AND p.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(user_long)) + 
        sin(radians(user_lat)) * 
        sin(radians(p.latitude))
      )
    ) <= max_distance
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql;
```

## After Running the SQL

1. **Regenerate TypeScript types:**
   ```bash
   supabase gen types typescript --project-id fqmleivxlqqnlokconux > src/integrations/supabase/types.ts
   ```
   
   Or manually add to your types file in `src/integrations/supabase/types.ts`:
   ```typescript
   export interface Database {
     public: {
       Functions: {
         calculate_distance: {
           Args: {
             user_lat: number
             user_long: number
             max_distance?: number
           }
           Returns: Array<{
             id: string
             full_name: string
             age: number
             profile_image_url: string
             bio: string
             latitude: number
             longitude: number
             interests: string[]
             distance: number
           }>
         }
       }
     }
   }
   ```

2. **Test the Radar feature:**
   - Navigate to http://localhost:8080/radar
   - Allow location access when prompted
   - The radar should now work!

## Verification

To verify the migration worked:
1. Check if columns exist:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name IN ('latitude', 'longitude', 'location');
   ```

2. Check if function exists:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'calculate_distance';
   ```

Both queries should return results if the migration was successful.
