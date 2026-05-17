import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit, debounce } from "@/lib/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("calls the function on first invocation", () => {
    const fn = vi.fn(() => 42);
    const limited = rateLimit(fn, 1000);
    expect(limited()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("blocks calls within the interval", () => {
    const fn = vi.fn(() => "result");
    const limited = rateLimit(fn, 1000);
    limited();
    limited(); // within 1000ms — should be blocked
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("returns undefined for blocked calls", () => {
    const fn = vi.fn(() => "result");
    const limited = rateLimit(fn, 1000);
    limited();
    expect(limited()).toBeUndefined();
  });

  it("allows calls again after the interval elapses", () => {
    const fn = vi.fn();
    const limited = rateLimit(fn, 1000);
    limited();
    vi.advanceTimersByTime(1001);
    limited();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("passes arguments to the wrapped function", () => {
    const fn = vi.fn((a: number, b: number) => a + b);
    const limited = rateLimit(fn, 500);
    limited(3, 4);
    expect(fn).toHaveBeenCalledWith(3, 4);
  });
});

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("does not call fn before delay elapses", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
  });

  it("calls fn after delay", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);
    debounced();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets timer on repeated calls (only fires once)", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);
    debounced();
    vi.advanceTimersByTime(200);
    debounced(); // resets timer
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes arguments to the wrapped function", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced("hello", 42);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith("hello", 42);
  });
});
