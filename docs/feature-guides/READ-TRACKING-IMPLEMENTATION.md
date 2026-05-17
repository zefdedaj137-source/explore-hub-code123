# Read Tracking System for Instant Chats

## ✅ What Was Added

### 1. Database Changes (`add-read-tracking.sql`)
- Added `read_at` column to `messages` table to track when messages are read
- Created index on `read_at` for efficient unread message queries
- Created `mark_instant_chat_as_read()` function to mark messages as read

### 2. Function Updates
- Updated `get_instant_chats()` to calculate unread count based on `read_at IS NULL`
- Unread count now shows actual number of unread messages received from each person

### 3. Frontend Changes (`Matches.tsx`)
- When user opens a conversation, messages are automatically marked as read
- Unread count updates automatically after marking messages as read
- TypeScript types updated to include the new `mark_instant_chat_as_read` function

## 🚀 How to Deploy

### Step 1: Run the Database Migration
1. Open **Supabase SQL Editor**
2. Copy and paste the entire contents of **`add-read-tracking.sql`**
3. Click **Run**

### Step 2: Verify It Works
1. Refresh your React app
2. Send an instant chat to another user (or have someone send you one)
3. The unread count should show in the Instant Chats tab
4. When you open the conversation, the unread count should go to 0

## 📊 How It Works

### Unread Count Calculation
- Counts messages where:
  - `is_instant_chat = TRUE`
  - `receiver_id = current_user_id` (messages sent TO you)
  - `read_at IS NULL` (not yet read)

### Mark as Read
- When you open a conversation, all messages from the other person to you are marked as read
- Sets `read_at = NOW()` for those messages
- Refreshes the instant chats list to update the unread count

### Example Query
```sql
-- Count unread messages from user A to current user
SELECT COUNT(*)
FROM messages
WHERE is_instant_chat = TRUE
  AND sender_id = 'user_a_id'
  AND receiver_id = 'current_user_id'
  AND read_at IS NULL;
```

## 🎯 Features

✅ **Real-time unread counts** - See how many unread messages you have from each person
✅ **Automatic read marking** - Messages marked as read when conversation opens
✅ **Efficient queries** - Indexed for fast performance
✅ **Privacy-aware** - Only marks YOUR received messages as read, not the other person's

## 📝 Files Modified

1. **`add-read-tracking.sql`** - New migration file with all database changes
2. **`src/integrations/supabase/types.ts`** - Added TypeScript type for `mark_instant_chat_as_read`
3. **`src/pages/Matches.tsx`** - Updated to mark messages as read when opening conversations

## 🔄 Next Steps

After running the migration:
1. Test sending instant chats between users
2. Verify unread counts appear correctly
3. Confirm unread counts update when conversations are opened
4. Check that read tracking doesn't affect regular match messages (it won't - they use `match_id` and don't have `is_instant_chat = TRUE`)
