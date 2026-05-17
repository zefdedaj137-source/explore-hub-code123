import DOMPurify from "dompurify";

/**
 * Sanitize user-generated HTML content to prevent XSS.
 * Use this on any content that originates from user input
 * before rendering it or inserting into the DOM.
 */
export function sanitize(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "br", "p", "span"],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize text content, stripping ALL HTML.
 * Use for plain-text fields like names, bios, messages.
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
