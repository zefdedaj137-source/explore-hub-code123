# Database Migrations

This project uses [Supabase migrations](https://supabase.com/docs/guides/cli/managing-environments) for database schema changes.

## Directory Structure

```
supabase/
  migrations/          # Timestamped SQL migration files (applied in order)
  config.toml          # Supabase CLI configuration
  functions/           # Supabase Edge Functions
```

## Creating a New Migration

```bash
# Using the helper script
npm run db:new <description>

# Or manually
# Create a file: supabase/migrations/<YYYYMMDDHHMMSS>_<description>.sql
```

## Applying Migrations

```bash
# Against a local Supabase instance
npx supabase db push

# Against remote (linked project)
npx supabase db push --linked
```

## Root-Level SQL Files

The root directory contains legacy SQL files that were run manually before the migration system was set up. Key files:

| File                              | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| `FRESH_SUPABASE_SETUP.sql`        | Full schema bootstrap (tables, RLS, functions) |
| `COMPLETE_SCHEMA_FIX.sql`         | Schema corrections applied after initial setup |
| `FINAL_DATING_APP_DATABASE.sql`   | Comprehensive database definition              |
| `supabase_purchase_coins_rpc.sql` | RPC function for coin purchases                |
| `FIX_RLS_POLICIES.sql`            | Row-Level Security policy fixes                |
| `SETUP_CALLS_COMPLETE.sql`        | WebRTC call signalling tables                  |
| `SETUP_REALTIME_CALLS.sql`        | Realtime subscription setup for calls          |

These files are kept for reference. All **new** schema changes must go into `supabase/migrations/`.

## Conventions

- File names: `YYYYMMDDHHMMSS_short_description.sql`
- Each migration should be idempotent when possible (use `IF NOT EXISTS`, `CREATE OR REPLACE`)
- Include `-- Description:` comment at the top of each migration
- Test migrations locally before pushing to production
