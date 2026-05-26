/**
 * Translates all remaining English strings in Chat.tsx and Matches.tsx:
 * - Time formatting ("ago", "Just now", "h left")
 * - Buttons: Accept, Decline, Cancel Plan, Chat, Start Chat, View Chat, Reply
 * - Date plan widget labels
 * - Match list section headers
 * - Pull-to-refresh text
 * - "Traveling in", "km away"
 * - Instant message tab strings
 * - Bookmark menu items
 * - "Voice message", "Video" labels
 * - System chat messages (date planned/accepted/declined)
 */
const fs = require('fs');

// ─── 1. LOCALE KEYS ──────────────────────────────────────────────────────────

const newEn = {
  common: {
    justNow: "Just now",
    minutesAgo: "{{min}}m ago",
    hoursAgo: "{{hr}}h ago",
    daysAgo: "{{day}}d ago",
    lessThanHourLeft: "< 1h left",
    hoursLeft: "{{hours}}h left",
    video: "Video",
    youPrefix: "You: ",
    voiceMessage: "🎙️ Voice message",
    kmAway: "{{km}} km away",
    travelingIn: "Traveling in",
    pullToRefresh: "↓ Pull to refresh",
    releaseToRefresh: "↓ Release to refresh",
  },
  matches: {
    yourMatches: "Your Matches",
    messages: "Messages",
    chat: "Chat",
    removeBookmark: "Remove Bookmark",
    bookmark: "Bookmark",
    sayHi: "Say hi to {{name}}! 👋",
    startChat: "Start Chat",
    expired: "Expired",
    bookmarkedSection: "Bookmarked ({{count}})",
    tryDifferentSearch: "Try searching for a different name",
    startDiscovering: "Start Discovering",
    messagesCount: "{{count}} messages",
    sent: "Sent",
    received: "Received",
    viewChat: "View Chat",
    reply: "Reply",
    instantMessageInfo: "Instant messages let you message before matching. Messages stay here until you both like each other!",
    useCreditsPrompt: "Use instant message credits to message users before matching!",
    failedToSendMessage: "Failed to send message",
    matchCount: "{{count}} match",
    matchCountPlural: "{{count}} matches",
    instantMessageCount: "{{count}} instant message",
    instantMessageCountPlural: "{{count}} instant messages",
  },
  chat: {
    dateConfirmedLabel: "✅ Date Confirmed!",
    datePlannedLabel: "📅 Date Planned",
    confirmed: "Confirmed",
    pending: "Pending",
    accept: "Accept",
    decline: "Decline",
    cancelPlan: "Cancel Plan",
    youBlockedUser: "You blocked this user. You won't receive messages or calls. Unblock to continue.",
    kmAway: "{{km}} km away",
    dateAcceptedMsg: "✅ Date accepted!\n📍 {{location}}\n🕐 {{date}}\n\nIt's a date! 🎉",
    dateDeclinedMsg: "❌ Date declined.\n📍 {{location}}\n🕐 {{date}}",
    datePlannedMsg: "📅 I planned a date!\n📍 {{location}}\n🕐 {{date}}{{notes}}\n\nCheck your Date Planner to accept!",
  },
};

const newSq = {
  common: {
    justNow: "Tani",
    minutesAgo: "{{min}}m",
    hoursAgo: "{{hr}}h",
    daysAgo: "{{day}}d",
    lessThanHourLeft: "< 1h mbetur",
    hoursLeft: "{{hours}}h mbetur",
    video: "Video",
    youPrefix: "Ti: ",
    voiceMessage: "🎙️ Mesazh zanor",
    kmAway: "{{km}} km larg",
    travelingIn: "Udhëton në",
    pullToRefresh: "↓ Tërhiq për të rifreskuar",
    releaseToRefresh: "↓ Lësho për të rifreskuar",
  },
  matches: {
    yourMatches: "Ndeshjet tuaja",
    messages: "Mesazhet",
    chat: "Bisedë",
    removeBookmark: "Hiq shënuesin",
    bookmark: "Shëno",
    sayHi: "Thuaj përshëndetje {{name}}! 👋",
    startChat: "Fillo bisedën",
    expired: "Skaduar",
    bookmarkedSection: "Të shënuara ({{count}})",
    tryDifferentSearch: "Provo të kërkosh një emër tjetër",
    startDiscovering: "Fillo zbulimin",
    messagesCount: "{{count}} mesazhe",
    sent: "Dërguar",
    received: "Marrë",
    viewChat: "Shiko bisedën",
    reply: "Përgjigju",
    instantMessageInfo: "Mesazhet e çastit ju lejojnë të dërgoni mesazhe para se të ndesheni. Mesazhet mbeten këtu derisa të dyja ju t'i pelqeni njëri-tjetrit!",
    useCreditsPrompt: "Përdorni kredite mesazhesh të çastit për t'i dërgoni mesazhe përdoruesve para se të ndesheni!",
    failedToSendMessage: "Dërgimi i mesazhit dështoi",
    matchCount: "{{count}} ndeshje",
    matchCountPlural: "{{count}} ndeshje",
    instantMessageCount: "{{count}} mesazh i çastit",
    instantMessageCountPlural: "{{count}} mesazhe të çastit",
  },
  chat: {
    dateConfirmedLabel: "✅ Takimi u konfirmua!",
    datePlannedLabel: "📅 Takim i planifikuar",
    confirmed: "Konfirmuar",
    pending: "Në pritje",
    accept: "Prano",
    decline: "Refuzo",
    cancelPlan: "Anulo planin",
    youBlockedUser: "Ju bllokuat këtë përdorues. Nuk do të merrni mesazhe ose thirrje. Zhbllokoni për të vazhduar.",
    kmAway: "{{km}} km larg",
    dateAcceptedMsg: "✅ Takimi u pranua!\n📍 {{location}}\n🕐 {{date}}\n\nJa koha! 🎉",
    dateDeclinedMsg: "❌ Takimi u refuzua.\n📍 {{location}}\n🕐 {{date}}",
    datePlannedMsg: "📅 Planifikova një takim!\n📍 {{location}}\n🕐 {{date}}{{notes}}\n\nKontrolloni Planifikuesin e Takimeve për të pranuar!",
  },
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      if (target[key] === undefined) target[key] = source[key];
    }
  }
  return target;
}

const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const sq = JSON.parse(fs.readFileSync('src/locales/sq.json', 'utf8'));
deepMerge(en, newEn);
deepMerge(sq, newSq);
fs.writeFileSync('src/locales/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/sq.json', JSON.stringify(sq, null, 2));
console.log('✅ Locale files updated');

// ─── 2. MATCHES.TSX ──────────────────────────────────────────────────────────

let matches = fs.readFileSync('src/pages/Matches.tsx', 'utf8');

// 2a. formatMessageTime — add `t` param + translate return values
matches = matches.replace(
  `const formatMessageTime = (timestamp: string | null | undefined) => {
  if (!timestamp) {
    logger.warn("⚠️ Empty timestamp received");
    return "Just now";
  }

  const date = new Date(timestamp);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    logger.warn("⚠️ Invalid timestamp:", timestamp);
    return "Just now";
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return \`\${Math.floor(diffInSeconds / 60)}m ago\`;
  if (diffInSeconds < 86400) return \`\${Math.floor(diffInSeconds / 3600)}h ago\`;
  if (diffInSeconds < 604800) return \`\${Math.floor(diffInSeconds / 86400)}d ago\`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};`,
  `const formatMessageTime = (timestamp: string | null | undefined, t: (key: string, opts?: Record<string, unknown>) => string) => {
  if (!timestamp) {
    logger.warn("⚠️ Empty timestamp received");
    return t("common.justNow");
  }

  const date = new Date(timestamp);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    logger.warn("⚠️ Invalid timestamp:", timestamp);
    return t("common.justNow");
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t("common.justNow");
  if (diffInSeconds < 3600) return t("common.minutesAgo", { min: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400) return t("common.hoursAgo", { hr: Math.floor(diffInSeconds / 3600) });
  if (diffInSeconds < 604800) return t("common.daysAgo", { day: Math.floor(diffInSeconds / 86400) });

  return date.toLocaleDateString("sq", { month: "short", day: "numeric" });
};`
);

// 2b. getMatchExpiryInfo — add `t` param + translate countdown
matches = matches.replace(
  `const getMatchExpiryInfo = (
  match: Match,
  isPremium: boolean
): { isExpired: boolean; countdown: string | null } => {
  if (isPremium || match.lastMessage) return { isExpired: false, countdown: null };
  if (!match.created_at) return { isExpired: false, countdown: null };
  const expiresAt = new Date(match.created_at).getTime() + MATCH_EXPIRY_HOURS * 3600 * 1000;
  const msLeft = expiresAt - Date.now();
  if (msLeft <= 0) return { isExpired: true, countdown: null };
  const hoursLeft = Math.floor(msLeft / 3600000);
  if (hoursLeft < 48) {
    return { isExpired: false, countdown: hoursLeft < 1 ? "< 1h left" : \`\${hoursLeft}h left\` };
  }
  return { isExpired: false, countdown: null };
};`,
  `const getMatchExpiryInfo = (
  match: Match,
  isPremium: boolean,
  t: (key: string, opts?: Record<string, unknown>) => string
): { isExpired: boolean; countdown: string | null } => {
  if (isPremium || match.lastMessage) return { isExpired: false, countdown: null };
  if (!match.created_at) return { isExpired: false, countdown: null };
  const expiresAt = new Date(match.created_at).getTime() + MATCH_EXPIRY_HOURS * 3600 * 1000;
  const msLeft = expiresAt - Date.now();
  if (msLeft <= 0) return { isExpired: true, countdown: null };
  const hoursLeft = Math.floor(msLeft / 3600000);
  if (hoursLeft < 48) {
    return { isExpired: false, countdown: hoursLeft < 1 ? t("common.lessThanHourLeft") : t("common.hoursLeft", { hours: hoursLeft }) };
  }
  return { isExpired: false, countdown: null };
};`
);

// 2c. Call sites of formatMessageTime — add `t` argument
matches = matches.split('{formatMessageTime(match.lastMessage.created_at)}').join('{formatMessageTime(match.lastMessage.created_at, t)}');
matches = matches.split('{formatMessageTime(message.created_at)}').join('{formatMessageTime(message.created_at, t)}');
matches = matches.split('{formatMessageTime(msg.created_at)}').join('{formatMessageTime(msg.created_at, t)}');

// 2d. Call sites of getMatchExpiryInfo — add `t` argument
matches = matches.split('getMatchExpiryInfo(match, currentUserIsPremium)').join('getMatchExpiryInfo(match, currentUserIsPremium, t)');

// 2e. Pull-to-refresh text
matches = matches.replace(
  '{refreshing ? "↻" : pullDistance > 60 ? "↓ Release to refresh" : "↓ Pull to refresh"}',
  '{refreshing ? "↻" : pullDistance > 60 ? t("common.releaseToRefresh") : t("common.pullToRefresh")}'
);

// 2f. Match count strings
matches = matches.replace(
  '`${matches.length} ${matches.length === 1 ? "match" : "matches"}`',
  '`${matches.length === 1 ? t("matches.matchCount", { count: matches.length }) : t("matches.matchCountPlural", { count: matches.length })}`'
);
matches = matches.replace(
  '`${instantMessages.length} instant ${instantMessages.length === 1 ? "message" : "messages"}`',
  '`${instantMessages.length === 1 ? t("matches.instantMessageCount", { count: instantMessages.length }) : t("matches.instantMessageCountPlural", { count: instantMessages.length })}`'
);

// 2g. "Your Matches" section title
matches = matches.replace(
  '                  Your Matches\n                ',
  '                  {t("matches.yourMatches")}\n                '
);

// 2h. "Messages" section title
matches = matches.replace(
  '                      Messages\n                    ',
  '                      {t("matches.messages")}\n                    '
);

// 2i. "Video" badge labels (replace all occurrences in JSX)
matches = matches.split(`                                    Video\n`).join(`                                    {t("common.video")}\n`);
matches = matches.split(`                                      Video\n`).join(`                                      {t("common.video")}\n`);

// 2j. "You: " prefix in message preview
matches = matches.replace(
  '{match.lastMessage.sender_id === user?.id ? "You: " : ""}',
  '{match.lastMessage.sender_id === user?.id ? t("common.youPrefix") : ""}'
);

// 2k. "🎙️ Voice message" labels
matches = matches.split('"🎙️ Voice message"').join('t("common.voiceMessage")');

// 2l. "Chat" button text
matches = matches.replace(
  `                                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                                  Chat
                                </Button>`,
  `                                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                                  {t("matches.chat")}
                                </Button>`
);

// 2m. "Remove Bookmark" / "Bookmark" dropdown items (two occurrences)
matches = matches.split(
  '                                    {bookmarkedMatchIds.has(match.id)\n                                      ? "Remove Bookmark"\n                                      : "Bookmark"}'
).join(
  '                                    {bookmarkedMatchIds.has(match.id)\n                                      ? t("matches.removeBookmark")\n                                      : t("matches.bookmark")}'
);

// 2n. "Say hi to {name}! 👋"
matches = matches.replace(
  '                                  Say hi to {match.profile.full_name.split(" ")[0]}! 👋',
  '                                  {t("matches.sayHi", { name: match.profile.full_name.split(" ")[0] })}'
);

// 2o. "Start Chat" button
matches = matches.replace(
  `                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Start Chat
                                </Button>`,
  `                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  {t("matches.startChat")}
                                </Button>`
);

// 2p. "Expired" badge
matches = matches.replace(
  `                                          Expired
                                        </Badge>`,
  `                                          {t("matches.expired")}
                                        </Badge>`
);

// 2q. "Bookmarked (n)" section title
matches = matches.replace(
  `                      <BookmarkCheck className="h-5 w-5 text-yellow-500" />
                      Bookmarked ({bookmarkedMatches.length})`,
  `                      <BookmarkCheck className="h-5 w-5 text-yellow-500" />
                      {t("matches.bookmarkedSection", { count: bookmarkedMatches.length })}`
);

// 2r. "Try searching for a different name"
matches = matches.replace(
  '                        Try searching for a different name',
  '                        {t("matches.tryDifferentSearch")}'
);

// 2s. "Start Discovering" buttons (two occurrences — use replaceAll)
matches = matches.split('                    Start Discovering\n').join('                    {t("matches.startDiscovering")}\n');

// 2t. "{n} messages" badge
matches = matches.replace(
  '{message.message_count} messages',
  '{t("matches.messagesCount", { count: message.message_count })}'
);

// 2u. "Sent" / "Received" badges
matches = matches.replace(
  '{message.is_sender ? "Sent" : "Received"}',
  '{message.is_sender ? t("matches.sent") : t("matches.received")}'
);

// 2v. "View Chat" / "Reply" button
matches = matches.replace(
  '{message.message_count > 1 ? "View Chat" : "Reply"}',
  '{message.message_count > 1 ? t("matches.viewChat") : t("matches.reply")}'
);

// 2w. Instant message info text
matches = matches.replace(
  '                    <MessageSquare className="inline h-4 w-4 mb-1" /> Instant messages let you\n                    message before matching. Messages stay here until you both like each other!\n',
  '                    <MessageSquare className="inline h-4 w-4 mb-1" /> {t("matches.instantMessageInfo")}\n'
);

// 2x. "Use instant message credits..." text
matches = matches.replace(
  '                    Use instant message credits to message users before matching!',
  '                    {t("matches.useCreditsPrompt")}'
);

// 2y. Failed to send fallback
matches = matches.replace(
  'toast.error(result.error || "Failed to send message");',
  'toast.error(result.error || t("matches.failedToSendMessage"));'
);

fs.writeFileSync('src/pages/Matches.tsx', matches);
console.log('✅ Matches.tsx');

// ─── 3. CHAT.TSX ─────────────────────────────────────────────────────────────

let chat = fs.readFileSync('src/pages/Chat.tsx', 'utf8');

// 3a. Date plan widget labels
chat = chat.replace(
  '                        ? "✅ Date Confirmed!"\n                        : "📅 Date Planned"}',
  '                        ? t("chat.dateConfirmedLabel")\n                        : t("chat.datePlannedLabel")}'
);

// 3b. "Confirmed" / "Pending" badge
chat = chat.replace(
  '{confirmedDatePlan.status === "confirmed" ? "Confirmed" : "Pending"}',
  '{confirmedDatePlan.status === "confirmed" ? t("chat.confirmed") : t("chat.pending")}'
);

// 3c. "✅ Accept" button
chat = chat.replace(
  '                          ✅ Accept\n                        </Button>',
  '                          ✅ {t("chat.accept")}\n                        </Button>'
);

// 3d. "❌ Decline" button
chat = chat.replace(
  '                          ❌ Decline\n                        </Button>',
  '                          ❌ {t("chat.decline")}\n                        </Button>'
);

// 3e. "Cancel Plan" button
chat = chat.replace(
  '                        <X className="h-3 w-3 mr-1" />\n                        Cancel Plan\n                      </Button>',
  '                        <X className="h-3 w-3 mr-1" />\n                        {t("chat.cancelPlan")}\n                      </Button>'
);

// 3f. "You blocked this user..." span
chat = chat.replace(
  '                  You blocked this user. You won\'t receive messages or calls. Unblock to continue.',
  '                  {t("chat.youBlockedUser")}'
);

// 3g. "Traveling in {city}" — two occurrences
chat = chat.split('<span>Traveling in {matchProfile.travel_city}</span>').join('<span>{t("common.travelingIn")} {matchProfile.travel_city}</span>');

// 3h. "km away"
chat = chat.replace(
  '{Math.round(matchProfile.distance_km)} km away',
  '{t("chat.kmAway", { km: Math.round(matchProfile.distance_km) })}'
);

// 3i. System message: date accepted
chat = chat.replace(
  '          ? `\\u2705 Date accepted!\\n\\u{1F4CD} ${confirmedDatePlan.location}\\n\\u{1F550} ${formattedDate}\\n\\nIt\'s a date! \\uD83C\\uDF89`\n          : `\\u274C Date declined.\\n\\u{1F4CD} ${confirmedDatePlan.location}\\n\\u{1F550} ${formattedDate}`;',
  '          ? t("chat.dateAcceptedMsg", { location: confirmedDatePlan.location, date: formattedDate })\n          : t("chat.dateDeclinedMsg", { location: confirmedDatePlan.location, date: formattedDate });'
);

// 3j. System message: date planned
chat = chat.replace(
  '      const chatMessage = `📅 I planned a date!\\n📍 ${datePlanLocation}\\n🕐 ${formattedDate}${datePlanNotes ? `\\n📝 ${datePlanNotes}` : ""}\\n\\nCheck your Date Planner to accept!`;',
  '      const chatMessage = t("chat.datePlannedMsg", { location: datePlanLocation, date: formattedDate, notes: datePlanNotes ? `\\n📝 ${datePlanNotes}` : "" });'
);

fs.writeFileSync('src/pages/Chat.tsx', chat);
console.log('✅ Chat.tsx');

console.log('\n🎉 Done! All Chat + Matches strings translated.');
