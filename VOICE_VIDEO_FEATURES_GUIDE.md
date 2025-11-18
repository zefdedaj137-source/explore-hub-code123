# Voice & Video Features Setup Guide

## ✅ Features Added

### 1. **Voice Messages** 🎤
- Press and hold the microphone button to record
- Release to stop recording
- Preview and send or cancel
- Voice messages are stored in Supabase Storage

### 2. **Voice Calls** 📞
- Click the phone icon in chat header
- Currently shows "Coming Soon" notification
- Ready for WebRTC integration

### 3. **Video Calls** 📹
- Click the video icon in chat header
- Currently shows "Coming Soon" notification
- Ready for video service integration

---

## 🔧 Setup Instructions

### Step 1: Update Messages Table
Run `FIX_MESSAGES_RLS.sql` in Supabase SQL Editor to:
- Add `voice_url` column to messages table
- Set up RLS policies for messages

### Step 2: Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name it: `voice-messages`
4. Make it **PUBLIC** (so users can play voice messages)
5. Click "Create bucket"

### Step 3: Set Storage Policies
After creating the bucket, run `SETUP_VOICE_MESSAGES_STORAGE.sql` in SQL Editor

---

## 🎯 How to Use

### Voice Messages:
1. Click the **microphone button** 🎤
2. Button will turn red and pulse while recording
3. Click **stop button** (square) to finish
4. Preview appears with option to Cancel or Send
5. Click Send to deliver the voice message

### Voice/Video Calls:
- Click **phone icon** 📞 for voice call (coming soon)
- Click **video icon** 📹 for video call (coming soon)

---

## 🚀 Production Integration (Next Steps)

### For Real Voice/Video Calls:

#### Option 1: Twilio (Recommended)
```bash
npm install twilio-video
```
- Supports both voice and video
- Enterprise-grade quality
- Pay-as-you-go pricing

#### Option 2: Agora.io
```bash
npm install agora-rtc-sdk-ng
```
- Great for large-scale apps
- Free tier: 10,000 minutes/month
- Excellent for dating apps

#### Option 3: Daily.co
```bash
npm install @daily-co/daily-js
```
- Simple to integrate
- Built-in UI components
- Free tier available

---

## 📝 Current Status

✅ **Working Now:**
- Voice message recording
- Voice message playback
- Text messaging
- Real-time message updates

⏳ **Coming Soon:**
- Real-time voice calls
- Real-time video calls
- Screen sharing
- Call history

---

## 🐛 Troubleshooting

**Voice recording not working?**
- Make sure you allow microphone permissions in browser
- Check browser console for errors

**Voice messages not sending?**
- Verify storage bucket is created
- Check storage policies are set up
- Ensure RLS policies are applied

**403 Forbidden errors?**
- Run FIX_MESSAGES_RLS.sql script
- Check user authentication is working

---

## 💡 Tips

1. **Test voice messages**: Record a short message to test
2. **Microphone permissions**: Browser will ask for permission first time
3. **Storage limits**: Free tier includes 1GB storage
4. **Call quality**: For production, use professional services (Twilio/Agora)

---

Enjoy the new features! 🎉
