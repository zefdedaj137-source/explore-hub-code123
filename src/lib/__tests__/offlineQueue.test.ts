import { describe, it, expect, beforeEach, vi } from "vitest";
import { enqueue, pendingCount, flush, type QueuedAction } from "@/lib/offlineQueue";

const STORAGE_KEY = "offline-queue";

describe("offlineQueue", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("enqueues an action and increases pendingCount", () => {
    expect(pendingCount()).toBe(0);
    enqueue({ table: "superlike_user", method: "rpc", payload: { p_user_id: "u1" } });
    expect(pendingCount()).toBe(1);
  });

  it("assigns an id, createdAt and zero attempts to each action", () => {
    enqueue({ table: "wallets", method: "update", payload: { balance: 5 } });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as QueuedAction[];
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBeTruthy();
    expect(stored[0].attempts).toBe(0);
    expect(typeof stored[0].createdAt).toBe("number");
  });

  it("removes actions from the queue once they execute successfully", async () => {
    enqueue({ table: "superlike_user", method: "rpc", payload: {} });
    await flush(async () => true);
    expect(pendingCount()).toBe(0);
  });

  it("keeps and increments attempts when execution returns false", async () => {
    enqueue({ table: "superlike_user", method: "rpc", payload: {} });
    await flush(async () => false);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as QueuedAction[];
    expect(stored).toHaveLength(1);
    expect(stored[0].attempts).toBe(1);
  });

  it("keeps the action when the executor throws", async () => {
    enqueue({ table: "wallets", method: "update", payload: {} });
    await flush(async () => {
      throw new Error("network down");
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as QueuedAction[];
    expect(stored).toHaveLength(1);
    expect(stored[0].attempts).toBe(1);
  });

  it("discards an action after 5 failed attempts", async () => {
    enqueue({ table: "superlike_user", method: "rpc", payload: {} });
    for (let i = 0; i < 5; i++) {
      await flush(async () => false);
    }
    expect(pendingCount()).toBe(0);
  });

  it("discards actions older than 24 hours without executing them", async () => {
    // Seed a stale action directly
    const stale: QueuedAction = {
      id: "stale-1",
      table: "superlike_user",
      method: "rpc",
      payload: {},
      createdAt: Date.now() - 25 * 60 * 60 * 1000,
      attempts: 0,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([stale]));
    const execute = vi.fn(async () => true);
    await flush(execute);
    expect(execute).not.toHaveBeenCalled();
    expect(pendingCount()).toBe(0);
  });

  it("does nothing when flushing an empty queue", async () => {
    const execute = vi.fn(async () => true);
    await flush(execute);
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns an empty queue when stored data is corrupt", () => {
    localStorage.setItem(STORAGE_KEY, "{not-json");
    expect(pendingCount()).toBe(0);
  });

  it("does not throw when localStorage.setItem fails (quota exceeded)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    // Should swallow the quota error rather than crash the spend/offline path
    expect(() => enqueue({ table: "superlike_user", method: "rpc", payload: {} })).not.toThrow();
    spy.mockRestore();
  });
});
