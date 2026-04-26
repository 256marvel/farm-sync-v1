/**
 * Offline-first queue for worker daily logs.
 *
 * - Persists pending inserts in IndexedDB (no extra dependencies).
 * - When online: tries to insert immediately; falls back to queue on network error.
 * - When offline: queues the row and returns success.
 * - Auto-flushes when the browser regains connectivity.
 * - Exposes a small subscriber API so the UI can show pending count + status.
 *
 * Realtime subscriptions on the manager dashboards already listen for
 * `INSERT` events, so as soon as a queued row is flushed it will appear
 * on every connected client without a manual refresh.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type QueueableTable =
  | "egg_production"
  | "feed_usage"
  | "mortality"
  | "vaccination"
  | "worker_notes";

export interface QueuedItem<T extends QueueableTable = QueueableTable> {
  id: string;
  table: T;
  payload: Tables[T]["Insert"];
  createdAt: number;
  attempts: number;
  lastError?: string;
}

const DB_NAME = "farmsync-offline";
const DB_VERSION = 1;
const STORE = "pending_logs";

// ---------- IndexedDB helpers ----------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    Promise.resolve(fn(store))
      .then((result) => {
        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      })
      .catch((err) => {
        db.close();
        reject(err);
      });
  });
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- Pub/sub for status ----------

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

async function notify() {
  const items = await listAll().catch(() => [] as QueuedItem[]);
  listeners.forEach((l) => l(items.length));
}

export function subscribePending(listener: Listener): () => void {
  listeners.add(listener);
  // Push current value asynchronously
  notify();
  return () => {
    listeners.delete(listener);
  };
}

// ---------- Public API ----------

export async function listAll(): Promise<QueuedItem[]> {
  try {
    return await tx("readonly", (store) => {
      return new Promise<QueuedItem[]>((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as QueuedItem[]) ?? []);
        req.onerror = () => reject(req.error);
      });
    });
  } catch {
    return [];
  }
}

async function addToQueue<T extends QueueableTable>(table: T, payload: Tables[T]["Insert"]): Promise<QueuedItem<T>> {
  const item: QueuedItem<T> = {
    id: uid(),
    table,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  await tx("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
  notify();
  return item;
}

async function removeFromQueue(id: string): Promise<void> {
  await tx("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
  notify();
}

async function updateInQueue(item: QueuedItem): Promise<void> {
  await tx("readwrite", (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
  notify();
}

function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/**
 * Heuristic: treat fetch/network errors as "should queue", but real
 * server-side errors (RLS denials, validation, FK violations, etc.) as
 * permanent failures that should bubble up.
 */
function isNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message ?? err).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("timeout") ||
    msg.includes("typeerror") ||
    !isOnline()
  );
}

/**
 * Insert a row, or queue it for later if the device is offline / the
 * request fails for network reasons.
 *
 * Returns `{ queued: true }` when the row was stored locally, or
 * `{ queued: false }` when the row was successfully inserted online.
 *
 * Throws only on permanent (server-side) errors.
 */
export async function enqueueOrInsert<T extends QueueableTable>(
  table: T,
  payload: Tables[T]["Insert"],
): Promise<{ queued: boolean }> {
  if (!isOnline()) {
    await addToQueue(table, payload);
    return { queued: true };
  }
  try {
    const { error } = await supabase.from(table).insert(payload as any);
    if (error) {
      // PostgREST returns errors here. If it looks like a network failure, queue it.
      if (isNetworkError(error)) {
        await addToQueue(table, payload);
        return { queued: true };
      }
      throw error;
    }
    return { queued: false };
  } catch (err: any) {
    if (isNetworkError(err)) {
      await addToQueue(table, payload);
      return { queued: true };
    }
    throw err;
  }
}

let flushing = false;

/**
 * Try to push every queued row to Supabase. Safe to call repeatedly.
 * Items that fail with a network error stay in the queue; permanent
 * failures are removed and counted as "dropped" so the queue cannot
 * get stuck on a poison record.
 */
export async function flushQueue(): Promise<{ synced: number; dropped: number; remaining: number }> {
  if (flushing) return { synced: 0, dropped: 0, remaining: (await listAll()).length };
  flushing = true;
  let synced = 0;
  let dropped = 0;
  try {
    const items = await listAll();
    for (const item of items) {
      if (!isOnline()) break;
      try {
        const { error } = await supabase.from(item.table).insert(item.payload as any);
        if (error) {
          if (isNetworkError(error)) {
            // keep for next attempt
            await updateInQueue({ ...item, attempts: item.attempts + 1, lastError: error.message });
          } else {
            // permanent — drop after marking attempts (avoid silent loss for dev visibility)
            console.warn("[offline-queue] dropping poisoned item", item, error);
            await removeFromQueue(item.id);
            dropped += 1;
          }
        } else {
          await removeFromQueue(item.id);
          synced += 1;
        }
      } catch (err: any) {
        if (isNetworkError(err)) {
          await updateInQueue({ ...item, attempts: item.attempts + 1, lastError: String(err?.message ?? err) });
        } else {
          console.warn("[offline-queue] dropping poisoned item", item, err);
          await removeFromQueue(item.id);
          dropped += 1;
        }
      }
    }
  } finally {
    flushing = false;
  }
  const remaining = (await listAll()).length;
  return { synced, dropped, remaining };
}

// ---------- Auto-flush wiring ----------

let installed = false;
export function installAutoSync(onResult?: (r: { synced: number; dropped: number; remaining: number }) => void) {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const trigger = async () => {
    if (!isOnline()) return;
    try {
      const result = await flushQueue();
      if (onResult && (result.synced > 0 || result.dropped > 0)) onResult(result);
    } catch (e) {
      console.warn("[offline-queue] flush failed", e);
    }
  };

  window.addEventListener("online", trigger);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") trigger();
  });
  // Also try once on install in case there are already-queued rows.
  trigger();
}
