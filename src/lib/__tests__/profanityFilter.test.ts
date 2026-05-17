import { describe, it, expect } from "vitest";
import { containsProfanity, cleanText } from "@/lib/profanityFilter";

describe("containsProfanity", () => {
  it("returns false for clean text", () => {
    expect(containsProfanity("Hello, how are you?")).toBe(false);
  });

  it("detects basic profanity", () => {
    expect(containsProfanity("what the fuck")).toBe(true);
  });

  it("detects repeated-letter evasions", () => {
    expect(containsProfanity("fuuuck")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(containsProfanity("SHIT")).toBe(true);
    expect(containsProfanity("Shit")).toBe(true);
  });

  it("detects self-harm phrases", () => {
    expect(containsProfanity("kill yourself")).toBe(true);
    expect(containsProfanity("kys")).toBe(true);
  });

  it("returns false for words that merely contain similar letters", () => {
    expect(containsProfanity("classic")).toBe(false);
    expect(containsProfanity("assessment")).toBe(false);
  });
});

describe("cleanText", () => {
  it("leaves clean text unchanged", () => {
    expect(cleanText("Nice to meet you")).toBe("Nice to meet you");
  });

  it("replaces profanity with asterisks of same length", () => {
    const result = cleanText("what the fuck off");
    expect(result).not.toMatch(/fuck/i);
    expect(result).toMatch(/\*+/);
  });

  it("replaces all occurrences in the same string", () => {
    const result = cleanText("shit and more shit");
    expect(result.match(/shit/gi)).toBeNull();
  });
});
