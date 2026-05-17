// Basic profanity filter — blocks obvious slurs and offensive terms
// This is a client-side pre-check; server-side moderation should also be in place

const BLOCKED_PATTERNS = [
  /\bf+u+c+k+/i,
  /\bs+h+i+t+/i,
  /\ba+s+s+h+o+l+e/i,
  /\bb+i+t+c+h/i,
  /\bd+i+c+k/i,
  /\bc+u+n+t/i,
  /\bn+i+g+g/i,
  /\bf+a+g+/i,
  /\bwh+o+r+e/i,
  /\br+e+t+a+r+d/i,
  /\bk+i+l+l\s*(your|ur|my)?self/i,
  /\bk+y+s\b/i,
];

export function containsProfanity(text: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

export function cleanText(text: string): string {
  let cleaned = text;
  for (const pattern of BLOCKED_PATTERNS) {
    // Ensure global flag so all occurrences are replaced, not just the first
    const globalPattern = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"
    );
    cleaned = cleaned.replace(globalPattern, (match) => "*".repeat(match.length));
  }
  return cleaned;
}
