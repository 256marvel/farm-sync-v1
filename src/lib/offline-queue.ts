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

type StatusListener = (status: SyncStatus) => void;
const statusListeners = new Set<StatusListener>();

export interface SyncStatus {
  total: number;
  pendingByFarm: Record<string, number>;
  lastSyncByFarm: Record<string, number>;
  lastSyncOverall: number | null;
}

const LAST_SYNC_KEY = "farmsync-last-sync-by-farm";

function readLastSync(): Record<string, number> {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeLastSync(map: Record<string, number>) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function markFarmSynced(farmId: string | undefined | null) {
  if (!farmId) return;
  const map = readLastSync();
  map[farmId] = Date.now();
  writeLastSync(map);
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const items = await listAll().catch(() => [] as QueuedItem[]);
  const pendingByFarm: Record<string, number> = {};
  for (const it of items) {
    const fid = (it.payload as any)?.farm_id;
    if (!fid) continue;
    pendingByFarm[fid] = (pendingByFarm[fid] ?? 0) + 1;
  }
  const lastSyncByFarm = readLastSync();
  const stamps = Object.values(lastSyncByFarm);
  const lastSyncOverall = stamps.length ? Math.max(...stamps) : null;
  return {
    total: items.length,
    pendingByFarm,
    lastSyncByFarm,
    lastSyncOverall,
  };
}

async function notify() {
  const status = await getSyncStatus();
  listeners.forEach((l) => l(status.total));
  statusListeners.forEach((l) => l(status));
}

export function subscribePending(listener: Listener): () => void {
  listeners.add(listener);
  notify();
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeSyncStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  getSyncStatus().then((s) => listener(s));
  return () => {
    statusListeners.delete(listener);
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
  const id = uid();
  // Stamp the payload with the queue id so retries are idempotent server-side.
  const stampedPayload = { ...(payload as any), client_uuid: (payload as any).client_uuid ?? id } as Tables[T]["Insert"];
  const item: QueuedItem<T> = {
    id,
    table,
    payload: stampedPayload,
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
 * A duplicate-key error means a previous flush attempt actually succeeded
 * server-side even though we never saw the response. Treat it as success.
 */
function isDuplicateError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code ?? "");
  const msg = String(err.message ?? "").toLowerCase();
  return code === "23505" || msg.includes("duplicate key") || msg.includes("client_uuid");
}

async function hasSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
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
  // Always stamp a client_uuid so a future retry (online or offline) is idempotent.
  const stamped = { ...(payload as any), client_uuid: (payload as any).client_uuid ?? uid() } as Tables[T]["Insert"];

  if (!isOnline()) {
    await addToQueue(table, stamped);
    return { queued: true };
  }
  try {
    const { error } = await supabase.from(table).insert(stamped as any);
    if (error) {
      if (isDuplicateError(error)) {
        markFarmSynced((stamped as any).farm_id);
        return { queued: false };
      }
      if (isNetworkError(error)) {
        await addToQueue(table, stamped);
        return { queued: true };
      }
      throw error;
    }
    markFarmSynced((stamped as any).farm_id);
    return { queued: false };
  } catch (err: any) {
    if (isDuplicateError(err)) {
      markFarmSynced((stamped as any).farm_id);
      return { queued: false };
    }
    if (isNetworkError(err)) {
      await addToQueue(table, stamped);
      return { queued: true };
    }
    throw err;
  }
}

let flushing = false;

/**
 * Try to push every queued row to Supabase. Safe to call repeatedly.
 * - Bails when there's no active session (queued rows would be RLS-denied).
 * - Network errors keep the item for retry.
 * - Duplicate-key errors are treated as success (a previous flush already wrote the row).
 * - Other server errors drop the item to avoid a poison-pill loop.
 */
export async function flushQueue(): Promise<{ synced: number; dropped: number; remaining: number }> {
  if (flushing) return { synced: 0, dropped: 0, remaining: (await listAll()).length };
  flushing = true;
  let synced = 0;
  let dropped = 0;
  try {
    if (!(await hasSession())) {
      // No auth yet — keep the queue intact and try again later.
      return { synced: 0, dropped: 0, remaining: (await listAll()).length };
    }
    const items = await listAll();
    for (const item of items) {
      if (!isOnline()) break;
      try {
        const { error } = await supabase.from(item.table).insert(item.payload as any);
        const farmId = (item.payload as any)?.farm_id;
        if (error) {
          if (isDuplicateError(error)) {
            await removeFromQueue(item.id);
            markFarmSynced(farmId);
            synced += 1;
          } else if (isNetworkError(error)) {
            await updateInQueue({ ...item, attempts: item.attempts + 1, lastError: error.message });
          } else {
            console.warn("[offline-queue] dropping poisoned item", item, error);
            await removeFromQueue(item.id);
            dropped += 1;
          }
        } else {
          await removeFromQueue(item.id);
          markFarmSynced(farmId);
          synced += 1;
        }
      } catch (err: any) {
        const farmId = (item.payload as any)?.farm_id;
        if (isDuplicateError(err)) {
          await removeFromQueue(item.id);
          markFarmSynced(farmId);
          synced += 1;
        } else if (isNetworkError(err)) {
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

type FlushResult = { synced: number; dropped: number; remaining: number };
const resultListeners = new Set<(r: FlushResult) => void>();

let installed = false;
let retryTimer: ReturnType<typeof setInterval> | null = null;

async function autoTrigger() {
  if (!isOnline()) return;
  try {
    const result = await flushQueue();
    if (result.synced > 0 || result.dropped > 0) {
      resultListeners.forEach((l) => l(result));
    }
  } catch (e) {
    console.warn("[offline-queue] flush failed", e);
  }
}

/**
 * Install global auto-sync wiring. Safe to call multiple times — only the
 * first call wires up the listeners; subsequent calls just register the
 * onResult callback so any mounted component can react to a successful flush.
 */
export function installAutoSync(onResult?: (r: FlushResult) => void) {
  if (typeof window === "undefined") return () => {};
  if (onResult) resultListeners.add(onResult);

  if (!installed) {
    installed = true;

    window.addEventListener("online", autoTrigger);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") autoTrigger();
    });
    // Flush as soon as a session becomes available (e.g. worker logs in after queueing offline).
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        autoTrigger();
      }
    });
    // Periodic safety-net retry (covers flaky networks where the `online`
    // event never fires, e.g. captive portals or mobile data switches).
    retryTimer = setInterval(autoTrigger, 60_000);
    // Try once on install in case there are already-queued rows.
    autoTrigger();
  }

  return () => {
    if (onResult) resultListeners.delete(onResult);
  };
}

/** Force an immediate auto-flush attempt (no-op if offline). */
export function triggerAutoSync() {
  return autoTrigger();
}

