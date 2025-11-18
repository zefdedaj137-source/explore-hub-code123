# How to Regenerate Supabase Types

## Step 1: Install Supabase CLI

Run this in PowerShell:
```powershell
npm install -g supabase
```

Or using Chocolatey:
```powershell
choco install supabase
```

Or using Scoop:
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

## Step 3: Link Your Project

You'll need your Supabase project reference ID (found in your project settings):
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

## Step 4: Run the Database Migration First

Before regenerating types, add the `looking_for` column to your database:

1. Go to https://app.supabase.com
2. Open your project
3. Go to SQL Editor
4. Run this SQL:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS looking_for text[] DEFAULT '{}';
```

## Step 5: Generate Types

After the migration is complete:
```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

Or if you have the project reference:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

## Alternative: Skip Type Generation (Quick Fix)

If you don't want to install Supabase CLI right now, you can:

1. Just run the SQL migration in Supabase dashboard
2. Ignore the TypeScript warnings - the app will still work
3. The types will auto-correct once you save and load data with the new column

The TypeScript errors won't prevent the app from running. They're just type mismatches that will resolve once the database column exists and data is loaded.
