# Enable Supabase Realtime for Call Sessions and Messages

The incoming call notifications and real-time messages are not working because **Supabase Realtime** is not enabled for the tables.

## Steps to Fix:

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/fqmleivxlqqnlokconux

2. **Navigate to Database → Replication**:
   - Click on "Database" in the left sidebar
   - Click on "Replication" tab

3. **Enable Realtime for these tables**:
   - Find `call_sessions` in the list of tables → Toggle ON
   - Find `call_signals` in the list of tables → Toggle ON
   - Find `messages` in the list of tables → Toggle ON

4. **Verify it's enabled**:
   - The toggles should be green/on for all three tables
   - You should see "Source: 3 tables" or similar text

## Alternative: SQL Command

If you prefer to use SQL, run this in the SQL Editor:

```sql
-- Enable realtime for call_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;

-- Enable realtime for call_signals
ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

## Test After Enabling:

### For Messages:
1. Open chat on both devices (localhost and ngrok)
2. Send a message from one device
3. **Message should appear IMMEDIATELY on the other device** without refreshing
4. Console should show: `💬 Messages subscription status: SUBSCRIBED`
5. Console should show: `📩 New message received:` when message arrives

### For Calls:
1. Refresh your browser at localhost:8082
2. Try making a call again
3. Open the ngrok URL on your phone/second device
4. You should now see "📞 INCOMING CALL EVENT RECEIVED:" in the receiver's console
5. The incoming call dialog should appear!

---

**Note**: Once Realtime is enabled for all three tables, both the calling system and real-time messaging should work perfectly!
