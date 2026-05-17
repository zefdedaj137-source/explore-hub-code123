# 🐛 COMPLETE CALL DEBUGGING GUIDE

## 🚨 **Calls Not Working - Let's Fix It!**

---

## ✅ **STEP 1: Fix Database (CRITICAL!)**

### **Run `FIX_CALLS_COMPLETE.sql` in Supabase:**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Click "New Query"
5. Open `FIX_CALLS_COMPLETE.sql` and copy ALL of it
6. Paste and click **RUN**
7. Should see: `✅ ALL DONE! Try calling now!`

**This fixes:**
- ✅ Creates tables if missing
- ✅ Enables RLS policies (permissions)
- ✅ Enables realtime
- ✅ Verifies everything works

---

## ✅ **STEP 2: Test with Console Open**

### **Setup:**

1. **Open TWO browsers side by side**
2. **Open console in BOTH** (F12 or Right-click → Inspect)
3. **User 1:** Sign in (stay on Matches page)
4. **User 2:** Sign in, go to Chat with User 1

### **Make a Call:**

**User 2 (Caller):**
1. Click phone or video icon
2. Watch console

**Expected Logs:**
```javascript
📞 CallDialog useEffect triggered, isOpen: true
🚀 Initializing call...
🎬 initializeCall started
📊 Call params: {matchId: "...", currentUserId: "...", callType: "voice"}
✅ MediaDevices supported
🎥 Requesting media access...
Requesting media access...
Media stream obtained
📲 Sending call notification: {...}
✅ Call notification sent successfully: [...]
```

**User 1 (Receiver):**

**Expected Logs:**
```javascript
📞 Received call notification: {...}
🔍 Is recipient? true
✅ Setting incoming call state
🔔 Starting ringtone...
🎵 createRingtone function called
🎵 AudioContext created, state: running
```

**Expected on Screen:**
- 🔔 Notification popup: "Incoming call from User 2"
- 🎵 Ringtone plays
- [Answer] [Decline] buttons

### **Accept the Call:**

**User 1 clicks "Answer":**

**Expected:**
- ✅ Dialog closes
- ✅ Navigates to Chat page
- ✅ CallDialog opens automatically
- ✅ Both users see each other's video/hear audio

---

## 🐛 **Common Issues & Fixes:**

### **Issue 1: No console logs at all**

**Problem:** JavaScript not loaded or browser cache
**Fix:**
```
1. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. Clear browser cache
3. Close and reopen browser
```

### **Issue 2: "Error inserting call notification"**

**Problem:** Database permissions not set
**Fix:**
```sql
-- Run in Supabase SQL Editor
-- This is in FIX_CALLS_COMPLETE.sql
CREATE POLICY "Users can insert call notifications"
ON call_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);
```

### **Issue 3: "Is recipient? false"**

**Problem:** Users not properly matched
**Fix:**
```sql
-- Check if match exists
SELECT * FROM matches 
WHERE (user1_id = 'YOUR_USER_1_ID' OR user2_id = 'YOUR_USER_1_ID')
AND (user1_id = 'YOUR_USER_2_ID' OR user2_id = 'YOUR_USER_2_ID')
AND status = 'matched';

-- If no results, create a match manually for testing
INSERT INTO matches (user1_id, user2_id, status, matched_at)
VALUES ('USER_1_ID', 'USER_2_ID', 'matched', NOW());
```

### **Issue 4: No "Received call notification" log**

**Problem:** Realtime not enabled
**Fix:**
```sql
-- Run in Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE call_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
```

### **Issue 5: "NotAllowedError: Permission denied"**

**Problem:** Browser blocked camera/mic
**Fix:**
- **Chrome:** Click camera icon in address bar → Allow
- **Safari:** Safari → Settings → Website → Camera/Microphone → Allow
- **Mobile:** Must use HTTPS (ngrok)

### **Issue 6: "CallDialog useEffect triggered, isOpen: false"**

**Problem:** CallDialog not opening
**Fix:** Check Chat.tsx console for auto-answer logs:
```javascript
// Should see:
🎯 Auto-answering call: voice
```

If not showing, the autoAnswer param isn't being detected.

---

## 📱 **Mobile Safari Specific:**

### **Requirements:**
1. ✅ **MUST use HTTPS** (ngrok)
2. ✅ **Tap screen once** before test (AudioContext)
3. ✅ **Allow permissions** when prompted

### **Test on Mobile:**

1. **Make sure ngrok is running:**
   ```powershell
   ngrok http 8086
   ```

2. **Open ngrok URL on iPhone:**
   ```
   https://jolliest-unfabulously-jamie.ngrok-free.dev
   ```

3. **Click "Visit Site"** (if warning shows)

4. **Tap screen once** (activate AudioContext)

5. **Test call**

### **Debug Mobile:**

**On Mac:**
- Safari → Develop → [Your iPhone] → [Page]
- See console logs from phone!

---

## 🎯 **Testing Checklist:**

```
Database:
[ ] FIX_CALLS_COMPLETE.sql executed
[ ] Tables exist (call_signals, call_notifications)
[ ] Realtime enabled
[ ] RLS policies created

Browser Setup:
[ ] Two browsers open
[ ] Console open in both (F12)
[ ] Two different users signed in
[ ] Users are matched
[ ] User 1 on any page (Matches, Discover, etc.)
[ ] User 2 on Chat page

Making Call:
[ ] User 2 clicks phone/video icon
[ ] See "initializeCall started" log
[ ] See "Call notification sent successfully" log
[ ] User 1 sees "Received call notification" log
[ ] User 1 sees popup notification
[ ] User 1 hears ringtone

Accepting Call:
[ ] User 1 clicks "Answer"
[ ] Dialog closes
[ ] Navigates to Chat page
[ ] See "Auto-answering call" log
[ ] CallDialog opens
[ ] Call connects
[ ] Can see/hear each other
```

---

## 🔍 **Get Your User IDs:**

### **In Browser Console (while logged in):**
```javascript
// Paste this
const { data: { user } } = await supabase.auth.getUser();
console.log('My User ID:', user?.id);
```

### **Check Match Exists:**
```sql
-- Paste in Supabase SQL Editor
-- Replace with your actual user IDs
SELECT * FROM matches 
WHERE (user1_id = 'USER_1_ID' OR user2_id = 'USER_1_ID')
AND (user1_id = 'USER_2_ID' OR user2_id = 'USER_2_ID');
```

---

## 💡 **Quick Test Commands:**

### **Test Realtime Connection:**
```javascript
// Paste in console
const channel = supabase.channel('test-channel');
channel.subscribe((status) => {
  console.log('Realtime status:', status);
});
```

### **Test Media Access:**
```javascript
// Paste in console
navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  .then(stream => {
    console.log('✅ Media access granted!', stream);
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('❌ Media access denied:', err));
```

---

## 🎊 **Expected Working Flow:**

### **Making a Call:**
```
User 2 (Caller):
  → Clicks phone icon
  → Console: "initializeCall started"
  → Gets media access (camera/mic)
  → Creates WebRTC offer
  → Sends to database
  → Console: "Call notification sent successfully"
  → Status: "Ringing..."

User 1 (Receiver):
  → Console: "Received call notification"
  → Popup appears with ringtone
  → Can click Answer or Decline
```

### **Accepting a Call:**
```
User 1:
  → Clicks "Answer"
  → Console: "Accepting call, closing notification dialog"
  → Navigates to /chat/123?autoAnswer=voice
  → Console: "Auto-answering call: voice"
  → CallDialog opens
  → Gets media access
  → Creates WebRTC answer
  → Sends to database
  → Connects to User 2

Both Users:
  → Status: "Connected!"
  → Can see/hear each other
  → Call controls work
```

---

## 🚀 **Do This Now:**

1. **Run `FIX_CALLS_COMPLETE.sql`** ← Most important!
2. **Open 2 browsers with console**
3. **Try making a call**
4. **Share the console logs** if still not working

The console will tell us exactly where it's failing! 🔍✨
