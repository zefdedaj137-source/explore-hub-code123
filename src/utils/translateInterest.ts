import type { TFunction } from "i18next";

/**
 * Translates a stored interest string (e.g. "🏃 Running") into the current
 * locale, keeping the emoji prefix intact (e.g. "🏃 Laufen" in German).
 * Falls back to the original string if no translation key is found.
 */
export function translateInterest(interest: string, t: TFunction): string {
  // Capture the leading emoji + whitespace prefix (may be empty for plain text entries)
  const prefixMatch = interest.match(
    /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u20E3\s]+/u
  );
  const prefix = prefixMatch ? prefixMatch[0] : "";
  const text = interest.slice(prefix.length).trim();

  if (!text) return interest;

  const translated = t(`interestsList.${text}`, { defaultValue: text });
  return prefix + translated;
}
