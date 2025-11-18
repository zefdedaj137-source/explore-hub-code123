# 🔧 How to Regenerate Supabase TypeScript Types

✅ **Supabase CLI installed and updated to v2.54.11**

After applying the premium features migration, you need to regenerate the TypeScript types so the app recognizes the new tables (`stories`, `story_views`, `video_profiles`, etc.).

## Quick Steps:

### 1. Find Your Project Reference ID
- Go to your Supabase Dashboard
- Look at the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Or go to: Settings → General → Reference ID
- Copy the Project Reference ID (looks like: `fqmleivxlqqnlokconux`)

### 2. Link Your Project
```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Generate Types
```powershell
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

That's it! The types will be regenerated with all the new premium features tables.

---

## Alternative: Manual Dashboard Method

1. Go to your Supabase Dashboard
2. Go to Settings → API → API Settings
3. Scroll down to "Type Definitions"
4. Click "Generate Types"
5. Copy the generated TypeScript code
6. Paste into `src/integrations/supabase/types.ts`

---

## What You Need:
- **Project Reference ID**: `fqmleivxlqqnlokconux` (from your URL/settings)
- **Access Token**: Get it from https://supabase.com/dashboard/account/tokens (NOT the service role key!)

## Getting Your Access Token:
1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Generate New Token"
3. Give it a name like "CLI Access"
4. Copy the token (starts with `sbp_`)
5. Use it with the command below:

```powershell
# Set the token as environment variable
$env:SUPABASE_ACCESS_TOKEN = "sbp_your_token_here"

# Link your project
supabase link --project-ref fqmleivxlqqnlokconux

# Generate types
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## After Regeneration:
- ✅ All TypeScript errors will disappear
- ✅ IntelliSense will work for new tables
- ✅ Type safety for Stories, Video Profiles, Verifications, etc.
- ✅ Can remove `as any` type casts from API files
