/**
 * Offline action queue – stores failed mutations in localStorage
 * and replays them when the browser comes back online.
 */

const MAX_RETRIES = 5;
/** Actions older than 24 hours are silently discarded */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface QueuedAction {
  id: string;
  table: string;
  method: "insert" | "update" | "delete" | "rpc";
  payload: unknown;
  createdAt: number;
  attempts: number;
}

const STORAGE_KEY = "offline-queue";

function load(): QueuedAction[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function save(queue: QueuedAction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Quota exceeded (or storage unavailable). Drop the oldest half and retry
    // once so the newest actions are still persisted rather than losing them all.
    try {
      const trimmed = queue.slice(Math.floor(queue.length / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Storage is fully unavailable — nothing more we can safely do.
    }
  }
}

/** Add an action to the offline queue */
export function enqueue(action: Omit<QueuedAction, "id" | "createdAt" | "attempts">) {
  const queue = load();
  queue.push({
    ...action,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    attempts: 0,
  });
  save(queue);
}

/** Number of pending actions */
export function pendingCount(): number {
  return load().length;
}

/** Flush the queue by replaying each action via the provided executor */
export async function flush(execute: (action: QueuedAction) => Promise<boolean>) {
  const queue = load();
  if (!queue.length) return;

  const remaining: QueuedAction[] = [];
  const now = Date.now();

  for (const action of queue) {
    // Discard actions that are too old
    if (now - action.createdAt > MAX_AGE_MS) continue;

    try {
      const ok = await execute(action);
      if (!ok) {
        const updated = { ...action, attempts: (action.attempts ?? 0) + 1 };
        if (updated.attempts < MAX_RETRIES) remaining.push(updated);
        // else: silently discard after MAX_RETRIES failures
      }
    } catch {
      const updated = { ...action, attempts: (action.attempts ?? 0) + 1 };
      if (updated.attempts < MAX_RETRIES) remaining.push(updated);
    }
  }

  save(remaining);
}

/** Start listening for online events and auto-flush */
export function initOfflineQueue(execute: (action: QueuedAction) => Promise<boolean>) {
  const handler = () => flush(execute);
  window.addEventListener("online", handler);

  // Also flush immediately if already online
  if (navigator.onLine) {
    flush(execute);
  }

  return () => window.removeEventListener("online", handler);
}

export type { QueuedAction };
