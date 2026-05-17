import { describe, it, expect } from "vitest";
import { messageSchema, profileSchema, discoverySettingsSchema, reportSchema } from "@/lib/schemas";

describe("messageSchema", () => {
  it("accepts a valid message", () => {
    expect(messageSchema.safeParse({ content: "Hello!" }).success).toBe(true);
  });

  it("rejects empty content", () => {
    expect(messageSchema.safeParse({ content: "" }).success).toBe(false);
  });

  it("rejects whitespace-only content", () => {
    expect(messageSchema.safeParse({ content: "   " }).success).toBe(false);
  });

  it("rejects content exceeding 2000 characters", () => {
    expect(messageSchema.safeParse({ content: "a".repeat(2001) }).success).toBe(false);
  });

  it("accepts content at exactly 2000 characters", () => {
    expect(messageSchema.safeParse({ content: "a".repeat(2000) }).success).toBe(true);
  });
});

describe("profileSchema", () => {
  const validProfile = {
    full_name: "Jane Doe",
    bio: "Hello world",
    age: 25,
    gender: "female" as const,
    location: "New York",
  };

  it("accepts a valid profile", () => {
    expect(profileSchema.safeParse(validProfile).success).toBe(true);
  });

  it("rejects age below 18", () => {
    expect(profileSchema.safeParse({ ...validProfile, age: 17 }).success).toBe(false);
  });

  it("rejects age above 99", () => {
    expect(profileSchema.safeParse({ ...validProfile, age: 100 }).success).toBe(false);
  });

  it("rejects full_name shorter than 2 characters", () => {
    expect(profileSchema.safeParse({ ...validProfile, full_name: "X" }).success).toBe(false);
  });

  it("rejects full_name longer than 50 characters", () => {
    expect(profileSchema.safeParse({ ...validProfile, full_name: "A".repeat(51) }).success).toBe(
      false
    );
  });

  it("rejects invalid gender", () => {
    expect(profileSchema.safeParse({ ...validProfile, gender: "robot" }).success).toBe(false);
  });

  it("rejects bio longer than 500 characters", () => {
    expect(profileSchema.safeParse({ ...validProfile, bio: "b".repeat(501) }).success).toBe(false);
  });

  it("accepts empty bio", () => {
    expect(profileSchema.safeParse({ ...validProfile, bio: "" }).success).toBe(true);
  });

  it("accepts missing bio (optional)", () => {
    const { bio: _bio, ...withoutBio } = validProfile;
    expect(profileSchema.safeParse(withoutBio).success).toBe(true);
  });
});

describe("discoverySettingsSchema", () => {
  const validSettings = {
    minAge: 18,
    maxAge: 35,
    maxDistance: 50,
    gender: "everyone" as const,
  };

  it("accepts valid settings", () => {
    expect(discoverySettingsSchema.safeParse(validSettings).success).toBe(true);
  });

  it("rejects minAge below 18", () => {
    expect(discoverySettingsSchema.safeParse({ ...validSettings, minAge: 17 }).success).toBe(false);
  });

  it("rejects maxAge above 99", () => {
    expect(discoverySettingsSchema.safeParse({ ...validSettings, maxAge: 100 }).success).toBe(
      false
    );
  });

  it("rejects maxDistance above 500", () => {
    expect(discoverySettingsSchema.safeParse({ ...validSettings, maxDistance: 501 }).success).toBe(
      false
    );
  });

  it("rejects invalid gender option", () => {
    expect(discoverySettingsSchema.safeParse({ ...validSettings, gender: "alien" }).success).toBe(
      false
    );
  });
});

describe("reportSchema", () => {
  it("accepts a valid report reason", () => {
    expect(
      reportSchema.safeParse({ reason: "This person sent me inappropriate messages." }).success
    ).toBe(true);
  });

  it("rejects reason shorter than 10 characters", () => {
    expect(reportSchema.safeParse({ reason: "Spam" }).success).toBe(false);
  });

  it("rejects reason longer than 1000 characters", () => {
    expect(reportSchema.safeParse({ reason: "r".repeat(1001) }).success).toBe(false);
  });

  it("rejects whitespace-only reason", () => {
    expect(reportSchema.safeParse({ reason: "          " }).success).toBe(false);
  });
});
