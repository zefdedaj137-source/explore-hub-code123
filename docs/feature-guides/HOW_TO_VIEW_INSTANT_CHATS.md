# Where to See Your Instant Chat Messages

## 📍 Location: Matches Page → Instant Chats Tab

### How to View Your Instant Chats

1. **Navigate to Matches page**
   - Click on the Matches icon in the bottom navigation (heart icon)
   - Or go to http://localhost:8080/matches

2. **Switch to Instant Chats tab**
   - You'll see two tabs at the top:
     - **Matches** (heart icon) - Your normal matches
     - **Instant Chats** (message square icon) - Your instant chat messages
   
3. **View your messages**
   - **Sent messages**: Shows messages you sent to others (marked with "Sent" badge)
   - **Received messages**: Shows instant chats others sent to you (marked with "Received" badge)

### What You'll See

Each instant chat card displays:
- **Profile picture** of the other person
- **Name** of the sender/receiver
- **Badge** showing if you sent it or received it
- **Message content** in a cyan/blue gradient box
- **Timestamp** showing when it was sent
- **View Profile** button to see their full profile

### Features

- ✅ See all instant chats you've sent
- ✅ See all instant chats you've received
- ✅ Quick access to view their profile
- ✅ See when the message was sent
- ✅ Beautiful cyan/blue design matching the instant chat theme

### Empty State

If you haven't sent or received any instant chats yet, you'll see:
- A friendly empty state with a message icon
- A button to go back to Discover page to send your first instant chat

## 🎯 Full Instant Chat Workflow

### 1. Send Instant Chat
- Go to **Discover** page
- See a profile you like
- Click the **cyan MessageSquare icon** between Pass and Superlike
- Type your message (up to 500 characters)
- Click **Send Instant Chat** (costs 1 credit)

### 2. View Instant Chat
- Go to **Matches** page
- Click **Instant Chats** tab
- See your sent message in the list
- Click **View Profile** to see their full profile

### 3. If They Respond (Future Feature)
- When instant chat turns into a match, the conversation moves to the Chat page
- You can continue chatting normally

## 💡 Tips

- Instant chats are **one-time messages** sent before matching
- Each instant chat costs **1 credit**
- You can't send multiple instant chats to the same person
- You can't instant chat someone you're already matched with
- Premium users get **5 free credits per month**

## 🔧 Troubleshooting

**Can't see instant chats?**
1. Make sure you've run the fixed migration: `20251026_add_instant_chat_fixed.sql`
2. Make sure you have credits: Check with `SELECT instant_chat_credits FROM profiles WHERE id = 'YOUR_ID';`
3. Refresh the page after sending an instant chat

**Error sending instant chat?**
1. Check browser console for detailed error
2. Verify migration ran successfully
3. Make sure you have at least 1 credit

## 🎨 Design Details

The Instant Chats tab uses:
- **Cyan/blue gradient** theme (matching the instant chat button)
- **Card-based layout** for each message
- **Badges** to show sent vs received
- **Responsive design** that works on mobile and desktop
- **Smooth animations** for a polished feel
