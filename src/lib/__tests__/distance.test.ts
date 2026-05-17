import { describe, it, expect } from "vitest";
import { formatDistance, calculateDistance } from "@/lib/distance";

describe("formatDistance", () => {
  it("formats sub-kilometre distances in metres", () => {
    expect(formatDistance(0.5)).toBe("500 m");
    expect(formatDistance(0.123)).toBe("123 m");
  });

  it("formats distances under 10 km with one decimal", () => {
    expect(formatDistance(3.456)).toBe("3.5 km");
    expect(formatDistance(9.9)).toBe("9.9 km");
  });

  it("formats distances 10 km and over as rounded integers", () => {
    expect(formatDistance(10)).toBe("10 km");
    expect(formatDistance(123.7)).toBe("124 km");
  });

  it("formats exactly 1 km", () => {
    expect(formatDistance(1.0)).toBe("1.0 km");
  });
});

describe("calculateDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(calculateDistance(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });

  it("calculates London to Paris (~341 km)", () => {
    const dist = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(dist).toBeGreaterThan(330);
    expect(dist).toBeLessThan(350);
  });

  it("calculates New York to Los Angeles (~3940 km)", () => {
    const dist = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(dist).toBeGreaterThan(3900);
    expect(dist).toBeLessThan(4000);
  });

  it("is symmetric (A→B equals B→A)", () => {
    const ab = calculateDistance(51.5, -0.1, 48.8, 2.3);
    const ba = calculateDistance(48.8, 2.3, 51.5, -0.1);
    expect(Math.abs(ab - ba)).toBeLessThan(0.001);
  });
});
