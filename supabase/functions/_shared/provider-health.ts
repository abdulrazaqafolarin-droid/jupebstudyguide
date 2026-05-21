export interface ProviderStats {
  name: string;
  ok: boolean;
  latencyMs: number;
  errorCount: number;
  lastError: string | null;
  consecutiveFailures: number;
  backoffUntil: number | null;
}

const BACKOFF_MS = 30_000;
const MAX_CONSECUTIVE_FAILURES = 3;

function createStore(): Map<string, ProviderStats> {
  return new Map();
}

const store = createStore();

function getOrCreate(name: string): ProviderStats {
  let s = store.get(name);
  if (!s) {
    s = { name, ok: true, latencyMs: 0, errorCount: 0, lastError: null, consecutiveFailures: 0, backoffUntil: null };
    store.set(name, s);
  }
  return s;
}

export function recordSuccess(name: string, latencyMs: number): void {
  const s = getOrCreate(name);
  s.ok = true;
  s.latencyMs = latencyMs;
  s.consecutiveFailures = 0;
  s.backoffUntil = null;
  s.lastError = null;
}

export function recordError(name: string, error: string, latencyMs: number): void {
  const s = getOrCreate(name);
  s.ok = false;
  s.latencyMs = latencyMs;
  s.errorCount++;
  s.lastError = error.slice(0, 200);
  s.consecutiveFailures++;
  if (s.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    s.backoffUntil = Date.now() + BACKOFF_MS;
    console.warn(`Provider ${name}: ${s.consecutiveFailures} consecutive failures, backing off ${BACKOFF_MS}ms`);
  }
}

export function shouldTryProvider(name: string): boolean {
  const s = store.get(name);
  if (!s) return true;
  if (s.backoffUntil && Date.now() < s.backoffUntil) return false;
  return true;
}

export function getProviderStats(): ProviderStats[] {
  return [...store.values()].sort((a, b) => a.latencyMs - b.latencyMs);
}

export function resetProviderHealth(name: string): void {
  store.delete(name);
}

export function resetAllHealth(): void {
  store.clear();
}
