# Instant Chat → Instant Message Rename - Complete Guide

## Overview
All occurrences of "instant chat" have been renamed to "instant message" throughout the codebase, including:
- TypeScript variables, functions, types, and UI strings
- Database tables, columns, and functions
- SQL files and migrations

## Files Changed

### TypeScript/React Files
1. **src/pages/Discover.tsx**
   - Renamed all state variables (`instantChatCredits` → `instantMessageCredits`, etc.)
   - Updated function names (`handleInstantChat` → `handleInstantMessage`, `sendInstantChatMessage` → `sendInstantMessage`)
   - Updated RPC calls (`send_instant_chat` → `send_instant_message`)
   - Updated all UI text ("Instant Chat" → "Instant Message")
   - Updated dialog titles and labels

2. **src/pages/Matches.tsx**
   - Renamed interfaces (`InstantChat` → `InstantMessage`, `InstantChatMessage` → `InstantMessageConversation`)
   - Updated all state variables (`instantChats` → `instantMessages`, `replyingToChat` → `replyingToMessage`, etc.)
   - Renamed functions (`fetchInstantChats` → `fetchInstantMessages`, `viewInstantChatProfile` → `viewInstantMessageProfile`, etc.)
   - Updated RPC calls (`get_instant_chats` → `get_instant_messages`, `reply_to_instant_chat` → `reply_to_instant_message`, etc.)
   - Updated all UI text and tab labels
   - Fixed variable reference (`isViewingFromInstantChat` → `isViewingFromInstantMessage`)

### SQL Files
3. **add-reply-function.sql**
   - Renamed functions: `reply_to_instant_chat` → `reply_to_instant_message`
   - Renamed table references: `instant_chats` → `instant_messages`
   - Updated column references: `is_instant_chat` → `is_instant_message`
   - Updated function: `get_instant_chat_messages` → `get_instant_message_messages`
   - Updated function: `get_instant_chats` → `get_instant_messages`

4. **supabase/migrations/20251117000000_rename_instant_chat_to_instant_message.sql** (NEW)
   - Complete migration script that:
     - Renames `instant_chats` table to `instant_messages`
     - Renames `profiles.instant_chat_credits` to `instant_message_credits`
     - Renames `messages.is_instant_chat` to `is_instant_message`
     - Drops old functions and creates new ones:
       - `send_instant_chat` → `send_instant_message`
       - `reply_to_instant_chat` → `reply_to_instant_message`
       - `get_instant_chats` → `get_instant_messages`
       - `get_instant_chat_messages` → `get_instant_message_messages`
       - `mark_instant_chat_as_read` → `mark_instant_message_as_read`
       - `grant_premium_instant_chat_credits` → `grant_premium_instant_message_credits`

## Migration Steps

### 1. Run the Database Migration
Execute the migration file in your Supabase SQL Editor:
```bash
# The migration file is located at:
supabase/migrations/20251117000000_rename_instant_chat_to_instant_message.sql
```

Or if using Supabase CLI:
```bash
supabase db push
```

This will:
- Rename all database tables and columns
- Drop old functions
- Create new functions with the updated naming
- Add documentation comments

### 2. Regenerate TypeScript Types
After running the migration, regenerate the TypeScript types to match the new database schema:

```bash
# If using Supabase CLI
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

This will update `src/integrations/supabase/types.ts` with the new table/column names and function signatures.

### 3. Current Type Errors (Will be Fixed After Migration)
The following type errors currently exist because the types file still references the old schema:
- `instant_message_credits` property not found (expects `instant_chat_credits`)
- RPC function names not recognized (`send_instant_message`, `get_instant_messages`, etc.)

**These errors will automatically resolve once the database migration is run and types are regenerated.**

## Testing Checklist

After running the migration and regenerating types:

### Frontend Testing
- [ ] Open Discover page - verify instant message button works
- [ ] Send an instant message - verify credit is deducted
- [ ] Check Matches page > Instant Messages tab - verify messages load
- [ ] Reply to an instant message - verify reply sends successfully
- [ ] View instant message conversation - verify all messages display
- [ ] Verify all UI text shows "Instant Message" (not "Instant Chat")

### Database Testing
- [ ] Verify `instant_messages` table exists (not `instant_chats`)
- [ ] Verify `profiles.instant_message_credits` column exists
- [ ] Verify `messages.is_instant_message` column exists
- [ ] Test all RPC functions work correctly:
  - `send_instant_message()`
  - `reply_to_instant_message()`
  - `get_instant_messages()`
  - `get_instant_message_messages()`
  - `mark_instant_message_as_read()`
  - `grant_premium_instant_message_credits()`

## Rollback Plan

If you need to rollback, create a reverse migration:
1. Rename `instant_messages` back to `instant_chats`
2. Rename `instant_message_credits` back to `instant_chat_credits`
3. Rename `is_instant_message` back to `is_instant_chat`
4. Recreate old function names
5. Regenerate types
6. Revert the TypeScript file changes using git

## Summary

✅ **TypeScript/React Code**: All updated and ready
✅ **SQL Files**: Updated with new naming
✅ **Database Migration**: Created and ready to run
⏳ **Database**: Needs migration to be executed
⏳ **Types**: Need regeneration after migration

**Next Action**: Run the database migration in Supabase, then regenerate TypeScript types.
