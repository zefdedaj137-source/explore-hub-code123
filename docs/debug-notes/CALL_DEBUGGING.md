# Call System Debugging Guide

## Current Status
The call system has been completely rebuilt with:
- ✅ Database tables (call_sessions, call_signals)
- ✅ Supabase Realtime enabled
- ✅ CallDialog component (caller side)
- ✅ IncomingCallDialog component (receiver side)
- ✅ WebRTC peer connection setup
- ✅ Premium-only access control

## What Should Happen

### When Caller Initiates Call:
1. Click phone/video icon
2. Browser asks for microphone/camera permission
3. CallDialog opens showing "Connecting..." then "Ringing..."
4. Console shows:
   ```
   🎤 Getting user media, callType: voice/video
   🌐 Browser info: {...}
   📞 Requesting media with constraints: {...}
   ✅ Got user media: {audioTracks: 1, videoTracks: 0/1}
   📱 Initiating call...
   ✅ Call session created: {id: "...", status: "ringing"}
   📝 Creating WebRTC offer...
   ✅ Local description set
   📤 Sending offer to database...
   ✅ Offer sent successfully!
   📡 Setting up signaling channel for sessionId: xxx
   📡 Signaling channel status: SUBSCRIBED
   ✅ Signaling channel ready
   ```

### When Receiver Gets Call:
1. IncomingCallDialog pops up automatically
2. Console shows:
   ```
   📞 INCOMING CALL EVENT RECEIVED: {...}
   ✅ Call is ringing, fetching caller profile...
   👤 Caller profile: {...}
   🔔 Incoming call state set!
   ```
3. Click "Accept" button
4. Console shows:
   ```
   🎤 Getting user media, callType: voice/video
   🌐 Browser info: {...}
   ✅ Got user media: {audioTracks: 1, videoTracks: 0/1}
   📺 Received remote track: audio
   📺 Received remote track: video (for video calls)
   🎬 Setting remote stream to video element
   ✅ Remote video playing
   ```

### When Call Connects:
1. **Caller** should see:
   ```
   📨 Received signal: {signal_type: "answer", ...}
   🔍 Checking signal - mySessionId: xxx, signal sessionId: xxx
   ✅ Processing answer signal
   ✅ Remote description set, call should be active
   📺 Received remote track: audio
   📺 Received remote track: video
   ```
2. **Both sides** timer should start counting: 00:00, 00:01, 00:02...
3. **Both sides** can hear/see each other

## Common Issues & Solutions

### Issue 1: "getUserMedia undefined"
**Symptom:** Error about navigator.mediaDevices
**Cause:** Not using HTTPS or localhost
**Solution:** 
- On localhost: Make sure URL is `http://localhost:8082`
- On ngrok: Make sure URL is `https://xxxxx.ngrok-free.app` (HTTPS!)
- Check console for "🌐 Browser info" - `isSecure` should be `true`

### Issue 2: Caller stuck on "Ringing..."
**Symptom:** Receiver accepts but caller doesn't update
**Cause:** Caller not receiving "answer" signal
**Check:**
1. Look for `📨 Received signal` in caller console
2. If missing, check Supabase Realtime is enabled for `call_signals` table
3. Check `🔍 Checking signal` logs - session IDs should match

### Issue 3: No audio/video
**Symptom:** Call connects but can't hear/see
**Check:**
1. Look for `📺 Received remote track` logs
2. Check browser permissions - should allow microphone/camera
3. Check `✅ Got user media` - audioTracks/videoTracks should be > 0
4. For voice calls, check hidden `<audio>` element exists

### Issue 4: Timer running fast
**Symptom:** Timer shows 00:00, 00:01 very quickly
**Cause:** Timer started before call actually connected
**Fix:** Already fixed - timer only starts when status = "active"

## Testing Checklist

- [ ] Refresh BOTH browsers
- [ ] Check both users are premium (is_premium = true)
- [ ] Ngrok URL uses HTTPS
- [ ] Grant microphone/camera permissions
- [ ] Try voice call first (simpler than video)
- [ ] Check console logs on BOTH sides
- [ ] Verify Supabase Realtime enabled for both tables

## Next Steps

If still not working, provide:
1. Full console logs from caller
2. Full console logs from receiver
3. Which browser/device on each side
4. Exact URLs being used (localhost vs ngrok)
5. Any error messages or warnings
