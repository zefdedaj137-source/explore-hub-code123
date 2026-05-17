# 🐛 RECEIVER NOT GETTING CALLS - DEBUG GUIDE

## Issue: Caller connects, but receiver doesn't get notification

---

## 🔍 **Step 1: Check Receiver's Browser Console**

### **On Receiver's Browser (F12):**

Look for these logs when page loads:
```javascript
🎧 Setting up incoming call listener for user: [USER_ID]
🔌 Realtime subscription status: SUBSCRIBED
✅ Successfully subscribed to incoming calls
```

**If you DON'T see these logs:**
- ❌ IncomingCallDialog not loaded
- ❌ User not logged in
- ❌ Component not rendering

**If you see "CHANNEL_ERROR":**
- ❌ Realtime not enabled in database
- ❌ Network/connection issue

---

## 🔍 **Step 2: Test Realtime Connection**

### **Paste in Receiver's Console:**

```javascript
// Test if realtime is working
const testChannel = supabase.channel('test-123');
testChannel.subscribe((status) => {
  console.log('Test channel status:', status);
});

// Should see: "Test channel status: SUBSCRIBED"
```

**If it works:** Realtime is fine, issue is with call notifications

**If it fails:** Realtime connection broken

---

## 🔍 **Step 3: Check Call Notification is Created**

### **After Caller Clicks Phone Icon:**

**In Supabase SQL Editor, run:**
```sql
-- Check recent call notifications
SELECT * FROM call_notifications 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:**
- Should see a row with `status = 'calling'`
- `caller_id` = Caller's user ID
- `match_id` = The match ID

**If NO rows:**
- ❌ Call notification not being created
- ❌ Check caller's console for errors

**If rows exist but receiver doesn't get notified:**
- ❌ Realtime publication issue
- ❌ Or receiver not subscribed

---

## 🔍 **Step 4: Manual Trigger Test**

### **Manually Insert a Test Notification:**

```sql
-- Get your match ID first
SELECT id, user1_id, user2_id FROM matches 
WHERE (user1_id = 'RECEIVER_USER_ID' OR user2_id = 'RECEIVER_USER_ID')
LIMIT 1;

-- Insert test notification (use actual IDs)
INSERT INTO call_notifications (match_id, caller_id, call_type, status)
VALUES ('YOUR_MATCH_ID', 'CALLER_USER_ID', 'voice', 'calling');
```

**Watch Receiver's Console:**

Should immediately see:
```javascript
📞 Received call notification: {...}
🔍 Match data: {...}
🔍 Is recipient? true
✅ Setting incoming call state
🔔 Starting ringtone...
```

**If you see it:** Realtime works! Issue is with caller's code
**If you don't:** Realtime subscription issue

---

## 🔍 **Step 5: Check User IDs Match**

### **Get Both User IDs:**

**Receiver's Console:**
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Receiver User ID:', user?.id);
```

**Caller's Console:**
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Caller User ID:', user?.id);
```

**Check Match in Database:**
```sql
-- Replace with actual user IDs
SELECT * FROM matches 
WHERE (user1_id = 'RECEIVER_ID' AND user2_id = 'CALLER_ID')
   OR (user1_id = 'CALLER_ID' AND user2_id = 'RECEIVER_ID');
```

**Should return 1 row with `status = 'matched'`**

**If no match:** They're not matched, create one:
```sql
INSERT INTO matches (user1_id, user2_id, status, matched_at)
VALUES ('USER_1_ID', 'USER_2_ID', 'matched', NOW());
```

---

## 🔍 **Step 6: Check Caller's Logs**

### **When Caller Clicks Phone Icon:**

**Should see:**
```javascript
📞 CallDialog useEffect triggered, isOpen: true
🚀 Initializing call...
📱 Initiating new call...
✅ MediaDevices supported
🎥 Requesting media access...
Media stream obtained
📲 Sending call notification: {...}
✅ Call notification sent successfully: [...]
```

**If you see error after "Sending call notification":**
- ❌ Database permission issue
- ❌ RLS policy blocking insert

---

## ✅ **Quick Fixes:**

### **Fix 1: Re-enable Realtime**
```sql
-- Run in Supabase SQL Editor
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS call_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE call_notifications;
```

### **Fix 2: Check RLS Policies**
```sql
-- Verify policies exist
SELECT policyname FROM pg_policies 
WHERE tablename = 'call_notifications';

-- Should see:
-- Users can insert call notifications
-- Users can view their call notifications
-- Users can update their call notifications
```

If missing, run `FIX_CALLS_COMPLETE.sql` again.

### **Fix 3: Refresh Both Browsers**
```
1. Hard refresh: Ctrl+Shift+R
2. Clear cache
3. Reopen browsers
4. Log in again
```

### **Fix 4: Check Both on Same Page**
**IMPORTANT:** Receiver must be on a page where IncomingCallDialog is loaded!

Currently it's loaded globally in App.tsx, so should work on all pages.

But verify by checking console logs when page loads.

---

## 📋 **Complete Test Checklist:**

```
Receiver's Browser Console:
[ ] See: "Setting up incoming call listener"
[ ] See: "Realtime subscription status: SUBSCRIBED"
[ ] See: "Successfully subscribed to incoming calls"

Database Check:
[ ] Tables exist (call_notifications, call_signals)
[ ] Realtime enabled (both tables)
[ ] RLS policies exist (3 for call_notifications)
[ ] Users are matched (check matches table)

Caller's Browser Console:
[ ] See: "Initiating new call..."
[ ] See: "Sending call notification"
[ ] See: "Call notification sent successfully"
[ ] No errors

Test Flow:
[ ] Receiver on any page (Matches, Discover, Chat)
[ ] Caller goes to Chat
[ ] Caller clicks phone icon
[ ] Wait 2-3 seconds
[ ] Check receiver's console for notification log
[ ] Check receiver's screen for popup

Expected Result:
[ ] Receiver console: "Received call notification"
[ ] Receiver screen: Popup appears
[ ] Receiver screen: Ringtone plays
[ ] Receiver can click Answer
```

---

## 💡 **Most Common Issues:**

### **1. Realtime Not Subscribed**
**Symptom:** No subscription logs in console
**Fix:** Hard refresh browser, check IncomingCallDialog is rendered

### **2. User IDs Don't Match**
**Symptom:** "Is recipient? false" in console
**Fix:** Verify match exists in database

### **3. Caller Not Creating Notification**
**Symptom:** No "Call notification sent successfully" log
**Fix:** Check RLS policies, check database permissions

### **4. Realtime Publication Not Enabled**
**Symptom:** Notification created but not received
**Fix:** Run realtime enable SQL commands

---

## 🚀 **Do This Now:**

1. **Open Receiver's Browser Console**
2. **Refresh page**
3. **Check for subscription logs**
4. **Share what you see!**

Copy-paste the console logs here and I'll tell you exactly what's wrong! 🔍
