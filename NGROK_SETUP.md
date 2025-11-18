# 🚀 NGROK SETUP - QUICK GUIDE

## ✅ Vite Config Updated!

Your `vite.config.ts` is now configured to work with ngrok!

---

## 📋 Current Status:

✅ **App Running:** Port **8085**
✅ **Vite Config:** ngrok-compatible
⏳ **Next Step:** Start ngrok

---

## 🎯 COPY-PASTE COMMANDS:

### **Step 1: Open NEW PowerShell Window**

### **Step 2: Navigate to ngrok folder**
```powershell
cd C:\ngrok
```

### **Step 3: Add your authtoken (first time only)**
```powershell
.\ngrok config add-authtoken YOUR_TOKEN_HERE
```
Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken

### **Step 4: Start ngrok**
```powershell
.\ngrok http 8085
```

**IMPORTANT:** Use port **8085** (not 8083 or 8084)!

---

## 📱 What You'll See:

```
ngrok                                                                                                                                              

Session Status    online
Account           Your Name (Plan: Free)
Version           3.x.x
Region            United States (us)
Latency           -
Web Interface     http://127.0.0.1:4040
Forwarding        https://abc123.ngrok-free.app -> http://localhost:8085

Connections       ttl     opn     rt1     rt5     p50     p90
                  0       0       0.00    0.00    0.00    0.00
```

### **Copy This URL:** `https://abc123.ngrok-free.app`
(Your URL will be different!)

---

## 📱 Test on iPhone:

### **Step 1: Open Safari**

### **Step 2: Go to your ngrok URL**
```
https://abc123.ngrok-free.app
```
(Use YOUR actual URL from ngrok!)

### **Step 3: Click "Visit Site"**
ngrok may show a warning page - just click "Visit Site" button

### **Step 4: Test Camera/Mic**
- Sign in to your app
- Go to a matched chat
- Click video call icon 📹
- Allow camera/microphone ✅
- **IT WORKS!** 🎉

---

## 🔧 Troubleshooting:

### **"This site can't be reached"**
- Make sure `npm run dev` is running
- Make sure ngrok is running
- Check you're using the correct port (8085)

### **"Blocked Request" Error**
✅ **FIXED!** We updated `vite.config.ts`
Just restart your dev server (already done!)

### **ngrok "Visit Site" Page**
- This is normal for free ngrok
- Just click "Visit Site" button
- It only shows once per session

### **Camera Still Doesn't Work**
- Make sure you're using the `https://` URL (not `http://`)
- Check Safari Settings → Camera/Microphone
- Try clearing Safari cache
- Make sure camera/mic are not being used by another app

---

## 💡 Pro Tips:

### **Keep Both Terminals Open:**
```
Terminal 1: npm run dev  ← Keep this running
Terminal 2: ngrok http 8085  ← Keep this running too
```

### **Share Your App:**
- Send the ngrok URL to friends
- They can test from anywhere!
- Works on mobile data too!

### **Check ngrok Dashboard:**
Open: http://127.0.0.1:4040
- See all requests
- Debug issues
- Replay requests

---

## 🎊 Complete Checklist:

```
✅ vite.config.ts updated
✅ npm run dev running (port 8085)
⬜ ngrok downloaded
⬜ ngrok authtoken added
⬜ ngrok running
⬜ Copied HTTPS URL
⬜ Opened URL on iPhone Safari
⬜ Clicked "Visit Site"
⬜ Camera/mic working!
```

---

## 📞 Quick Commands Reference:

### **Terminal 1 (keep running):**
```powershell
npm run dev
```

### **Terminal 2 (keep running):**
```powershell
cd C:\ngrok
.\ngrok http 8085
```

### **Get ngrok:**
https://ngrok.com/download

### **Get authtoken:**
https://dashboard.ngrok.com/get-started/your-authtoken

---

## ✨ That's It!

Your app is now ready for Safari camera/microphone access! 🎥🎤

Just start ngrok and test! 🚀
