# Troubleshooting Instant Chat Reply Issues

## Common Error: "Failed to Delivery"

This usually means there's an issue with the database setup or the reply function. Follow these steps to diagnose and fix:

## Step 1: Verify Migration Was Applied

Run this in Supabase SQL Editor:

```sql
-- Check if reply_to_instant_chat function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'reply_to_instant_chat'
AND routine_schema = 'public';
```

**Expected:** 1 row returned
**If 0 rows:** The migration didn't run completely. Run the full migration again.

## Step 2: Check Database Structure

```sql
-- Verify messages table has all required columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages'
AND column_name IN ('match_id', 'receiver_id', 'is_instant_chat')
ORDER BY column_name;
```

**Expected output:**
- `is_instant_chat` | boolean | YES
- `match_id` | uuid | **YES** (should be nullable!)
- `receiver_id` | uuid | YES

**If match_id shows NO (not nullable):** Run this fix:
```sql
ALTER TABLE messages ALTER COLUMN match_id DROP NOT NULL;
```

## Step 3: Check if Instant Chats Exist

```sql
-- See all instant chats
SELECT 
  ic.*,
  sender.full_name as sender_name,
  receiver.full_name as receiver_name,
  m.content
FROM instant_chats ic
JOIN profiles sender ON ic.sender_id = sender.id
JOIN profiles receiver ON ic.receiver_id = receiver.id
LEFT JOIN messages m ON ic.message_id = m.id;
```

**If empty:** You need to send an instant chat first before you can reply.

## Step 4: Test the Reply Function Manually

```sql
-- First, get user IDs
SELECT id, full_name FROM profiles LIMIT 5;

-- Test reply (replace with ACTUAL UUIDs from above)
SELECT reply_to_instant_chat(
  '596116f8-cde5-4a9e-bb4c-6e91f7b94eae'::uuid,  -- Person replying (receiver)
  'SECOND-USER-ID'::uuid,                         -- Original sender
  'Test reply message'
);
```

## Step 5: Check Browser Console Errors

Open browser DevTools (F12) → Console tab, then try replying. Look for:

```
🔄 Sending reply to instant chat: {...}
```

Then check if you see:
- ✅ `✅ Reply sent successfully!` → Everything working
- ❌ `❌ Supabase error:` → Database error (check message)
- ❌ `❌ Reply failed:` → Function returned error

## Common Issues and Fixes

### Issue 1: "column 'receiver_id' does not exist"

**Cause:** Migration didn't add receiver_id column

**Fix:**
```sql
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
```

### Issue 2: "null value in column 'match_id' violates not-null constraint"

**Cause:** match_id is still required (not nullable)

**Fix:**
```sql
ALTER TABLE messages ALTER COLUMN match_id DROP NOT NULL;
```

### Issue 3: "violates check constraint 'messages_match_or_receiver_check'"

**Cause:** The constraint is working correctly, but something wrong with the insert

**Check:**
```sql
-- See if constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'messages_match_or_receiver_check';
```

**Fix if missing:**
```sql
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_match_or_receiver_check;

ALTER TABLE messages
ADD CONSTRAINT messages_match_or_receiver_check 
CHECK (
  (match_id IS NOT NULL AND receiver_id IS NULL) OR 
  (match_id IS NULL AND receiver_id IS NOT NULL)
);
```

### Issue 4: "No instant chat found to reply to"

**Cause:** Trying to reply when no instant chat exists OR replying to wrong person

**Fix:** 
1. Make sure an instant chat was sent first
2. Check that you're the RECEIVER (not the sender) trying to reply
3. Verify the instant chat exists:
```sql
SELECT * FROM instant_chats 
WHERE receiver_id = 'YOUR-USER-ID';
```

### Issue 5: Function doesn't exist

**Cause:** Migration didn't create the function

**Fix:** Run just the function creation part:
```sql
CREATE OR REPLACE FUNCTION reply_to_instant_chat(
  sender_user_id UUID,
  receiver_user_id UUID,
  message_text TEXT
)
RETURNS JSONB AS $$
DECLARE
  new_message_id UUID;
  existing_match_id UUID;
  new_match_id UUID;
  instant_chat_exists BOOLEAN;
BEGIN
  -- Check if there's an instant chat from receiver to sender (they sent us the instant chat)
  SELECT EXISTS (
    SELECT 1 FROM instant_chats 
    WHERE sender_id = receiver_user_id AND receiver_id = sender_user_id
  ) INTO instant_chat_exists;

  IF NOT instant_chat_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No instant chat found to reply to'
    );
  END IF;

  -- Check if users are already matched
  SELECT id INTO existing_match_id
  FROM matches
  WHERE (user1_id = sender_user_id AND user2_id = receiver_user_id)
     OR (user1_id = receiver_user_id AND user2_id = sender_user_id);

  -- If not matched, create a match (replying creates a match automatically)
  IF existing_match_id IS NULL THEN
    INSERT INTO matches (user1_id, user2_id)
    VALUES (sender_user_id, receiver_user_id)
    RETURNING id INTO new_match_id;
    
    existing_match_id := new_match_id;
  END IF;

  -- Create message with the match_id (now they're matched, so use match_id)
  INSERT INTO messages (match_id, sender_id, content, is_instant_chat)
  VALUES (existing_match_id, sender_user_id, message_text, FALSE)
  RETURNING id INTO new_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', new_message_id,
    'match_id', existing_match_id,
    'matched', (new_match_id IS NOT NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reply_to_instant_chat(UUID, UUID, TEXT) TO authenticated;
```

## Complete Test Flow

### Setup
```sql
-- 1. Make sure you have instant chat credits
UPDATE profiles 
SET instant_chat_credits = 5 
WHERE id = '596116f8-cde5-4a9e-bb4c-6e91f7b94eae';

-- 2. Get two user IDs for testing
SELECT id, full_name FROM profiles LIMIT 2;
```

### Send Instant Chat (Account A → Account B)
```sql
-- Account A sends to Account B
SELECT send_instant_chat(
  'ACCOUNT_A_ID'::uuid,
  'ACCOUNT_B_ID'::uuid,
  'Hey, want to chat?'
);
```

### Verify Instant Chat Created
```sql
SELECT * FROM instant_chats;
SELECT * FROM messages WHERE is_instant_chat = TRUE ORDER BY created_at DESC LIMIT 1;
```

### Reply (Account B → Account A) - FREE
```sql
-- Account B replies to Account A
SELECT reply_to_instant_chat(
  'ACCOUNT_B_ID'::uuid,   -- Replier (receiver of original)
  'ACCOUNT_A_ID'::uuid,   -- Original sender
  'Sure! Let''s talk!'
);
```

### Verify Match Created
```sql
-- Check match was created
SELECT * FROM matches 
WHERE (user1_id = 'ACCOUNT_A_ID' AND user2_id = 'ACCOUNT_B_ID')
   OR (user1_id = 'ACCOUNT_B_ID' AND user2_id = 'ACCOUNT_A_ID');

-- Check reply message was created
SELECT * FROM messages 
WHERE match_id IS NOT NULL 
ORDER BY created_at DESC LIMIT 1;
```

## If Still Not Working

1. **Copy error message** from browser console (all the red text)
2. **Run test-reply-instant-chat.sql** (all queries in order)
3. **Share the output** of which queries return 0 rows
4. **Check Supabase Dashboard** → Database → Tables → Check if `instant_chats` table exists

## Quick Reset (If Everything Broken)

```sql
-- Start fresh - WARNING: This deletes all instant chats!
DROP FUNCTION IF EXISTS reply_to_instant_chat(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS send_instant_chat(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS get_instant_chats(UUID);
DROP TABLE IF EXISTS instant_chats CASCADE;

-- Then run the FULL migration file: 20251026_add_instant_chat_fixed.sql
```
