/**
 * Lightweight conflict log: records when a user's edit collided with a
 * newer server-side change so the SyncStatusPanel can surface it.
 *
 * Stored per-tab in sessionStorage; pub/sub keeps the panel reactive.
 */

export interface ConflictEntry {
  id: string;
  table: string;
  recordId: string;
  farmId?: string | null;
  recordLabel?: string;
  resolvedAt: number;
  resolution: "kept-mine" | "kept-theirs" | "merged" | "cancelled";
}

const KEY = "farmsync-conflict-log";
const MAX = 25;

type Listener = (entries: ConflictEntry[]) => void;
const listeners = new Set<Listener>();

function read(): ConflictEntry[] {
  try {
    if (typeof sessionStorage === "undefined") return [];
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ConflictEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: ConflictEntry[]) {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX)));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(entries));
}

export function recordConflict(entry: Omit<ConflictEntry, "id" | "resolvedAt">) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next = [...read(), { ...entry, id, resolvedAt: Date.now() }];
  write(next);
}

export function listConflicts(): ConflictEntry[] {
  return read();
}

export function clearConflicts() {
  write([]);
}

export function subscribeConflicts(listener: Listener): () => void {
  listeners.add(listener);
  listener(read());
  return () => {
    listeners.delete(listener);
  };
}
