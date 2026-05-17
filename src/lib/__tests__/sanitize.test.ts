import { describe, it, expect } from "vitest";
import { sanitize, sanitizeText } from "@/lib/sanitize";

describe("sanitize", () => {
  it("allows safe HTML tags", () => {
    expect(sanitize("<b>bold</b> and <i>italic</i>")).toBe("<b>bold</b> and <i>italic</i>");
  });

  it("strips script tags", () => {
    expect(sanitize('<script>alert("xss")</script>Hello')).toBe("Hello");
  });

  it("strips event handlers", () => {
    expect(sanitize('<img onerror="alert(1)" src="x">')).toBe("");
  });

  it("strips dangerous attributes", () => {
    expect(sanitize('<b onclick="alert(1)">text</b>')).toBe("<b>text</b>");
  });
});

describe("sanitizeText", () => {
  it("strips all HTML tags", () => {
    expect(sanitizeText("<b>bold</b> text")).toBe("bold text");
  });

  it("strips script tags completely", () => {
    expect(sanitizeText('<script>alert("xss")</script>safe')).toBe("safe");
  });

  it("returns plain text unchanged", () => {
    expect(sanitizeText("Hello World")).toBe("Hello World");
  });
});
