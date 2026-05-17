# 🐛 CALL DEBUGGING CHECKLIST

## Issue: Incoming calls not showing + Ringtone not working

---

## ✅ **Step 1: Check Database Tables**

### **Run this SQL in Supabase:**

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_notifications', 'call_signals');

-- Check if realtime is enabled
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('call_notifications', 'call_signals');
```

### **Expected Results:**
```
table_name
-----------------
call_notifications
call_signals

tablename
-----------------
call_notifications
call_signals
```

### **If Tables Missing:**
Run this SQL:
```sql
-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE call_notifications;
```

---

## ✅ **Step 2: Test Call Initiation**

### **Setup:**

1. **Open TWO browsers** (or one desktop + one phone)
2. **Sign in as different users** in each
3. **Make sure users are matched**
4. **Both users should be on Chat page** (important!)

### **In Browser Console:**

1. **Open browser console** (F12 on desktop, Safari Web Inspector on iPhone)
2. **Click the phone or video icon** in one browser

### **Look for these console logs:**

#### **On Caller Side (person making call):**
```
📲 Sending call notification: {match_id: "...", caller_id: "...", call_type: "voice", status: "calling"}
✅ Call notification sent successfully: [...]
```

#### **On Receiver Side (person receiving call):**
```
📞 Received call notification: {...}
🔍 Match data: {...}
🔍 Current user: "..."
🔍 Caller: "..."
🔍 Is recipient? true
✅ Setting incoming call state
🔔 Starting ringtone...
🎵 createRingtone function called
🎵 Initializing AudioContext...
🎵 AudioContext created, state: running
🔔 Ringtone started
```

---

## 🐛 **Common Issues & Fixes:**

### **Issue 1: No "Received call notification" log**
**Problem:** Realtime not enabled or receiver not on Chat page
**Fix:**
1. Make sure receiver is on Chat page (IncomingCallDialog only works there)
2. Run SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE call_notifications;
```

### **Issue 2: "Is recipient? false"**
**Problem:** Match IDs don't match or user IDs wrong
**Fix:** 
1. Check console logs for user IDs
2. Verify match exists in database:
```sql
SELECT * FROM matches WHERE user1_id = 'YOUR_USER_ID' OR user2_id = 'YOUR_USER_ID';
```

### **Issue 3: "AudioContext state: suspended"**
**Problem:** Browser blocked audio (needs user interaction first)
**Fix:** 
- On mobile: Tap screen once before test
- This is normal Safari behavior - audio only works after user interaction

### **Issue 4: No console logs at all on receiver**
**Problem:** Receiver not subscribed to realtime channel
**Fix:** 
1. Make sure receiver is logged in
2. Make sure receiver is on Chat page (not Matches or Discover)
3. Check browser console for subscription errors

### **Issue 5: "Error inserting call notification"**
**Problem:** Database permissions or missing columns
**Fix:** Run the complete database setup SQL from CHEAT_SHEET.md

---

## ✅ **Step 3: Quick Test Commands**

### **Check if you're logged in:**
```javascript
// Paste in browser console
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.id);
```

### **Check if realtime is working:**
```javascript
// Paste in browser console
const channel = supabase.channel('test');
console.log('Channel created:', channel);
```

### **Manually trigger ringtone (for testing):**
```javascript
// Paste in browser console on receiver
const audioContext = new AudioContext();
console.log('AudioContext state:', audioContext.state);
if (audioContext.state === 'suspended') {
  audioContext.resume().then(() => console.log('Resumed!'));
}
```

---

## 📱 **Mobile Safari Specific:**

### **For HTTPS (ngrok) testing:**

1. Make sure using `https://` URL (not `http://`)
2. Click "Visit Site" on ngrok warning page
3. Tap screen once to activate audio
4. Check Safari console via:
   - Mac: Safari → Develop → [Your iPhone] → [Page]
   - Windows: Use Chrome DevTools remote debugging

### **Common Safari Issues:**

- **No audio:** Tap screen first (AudioContext requires user interaction)
- **No camera:** Make sure using HTTPS
- **Connection fails:** Check ngrok is still running
- **403 Forbidden:** Restart dev server (`npm run dev`)

---

## 🎯 **Testing Checklist:**

```
Setup:
[ ] Database tables created
[ ] Realtime enabled on tables
[ ] Two users created
[ ] Users matched
[ ] Both users logged in

Testing (Desktop):
[ ] Open two browsers
[ ] Both on Chat page
[ ] Click call button
[ ] See console logs on both sides
[ ] Notification appears
[ ] Ringtone plays
[ ] Call connects

Testing (Mobile):
[ ] ngrok running (for HTTPS)
[ ] Open on iPhone Safari
[ ] Tap screen once (activate audio)
[ ] Open Safari console (via Mac)
[ ] Test call from desktop to phone
[ ] Check console logs
[ ] Verify notification + ringtone
```

---

## 🚀 **Next Steps:**

1. **Run Step 1** - Check database
2. **Run Step 2** - Test with console open
3. **Share console logs** if still not working
4. Look for specific error messages

The debug logging is now active - you'll see exactly where the problem is! 🔍


<function_calls>
<invoke name="grep_search">
<parameter name="includePattern">src/**/*.tsx