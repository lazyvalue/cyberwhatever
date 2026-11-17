// Injected environment for the meta layer. Production uses the real browser globals; tests pass shims.
// Every access is wrapped: the meta layer must never throw into the game loop (DESIGN §11.1).

export interface StoreLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key?(index: number): string | null;
  readonly length?: number;
}

export interface ConsoleLike {
  log(...args: unknown[]): void;
}

export interface MetaEnv {
  storage: StoreLike | null;
  doc: Document | null;
  con: ConsoleLike | null;
  win: (Window & typeof globalThis) | null;
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
  setInterval(fn: () => void, ms: number): unknown;
  clearInterval(id: unknown): void;
}

function safe<T>(f: () => T, fallback: T): T {
  try {
    return f();
  } catch {
    return fallback;
  }
}

export function browserEnv(): MetaEnv {
  const g = globalThis as unknown as Record<string, unknown>;
  return {
    storage: safe(() => (typeof localStorage !== 'undefined' ? localStorage : null), null),
    doc: typeof document !== 'undefined' ? document : null,
    con: typeof console !== 'undefined' ? console : null,
    win: typeof window !== 'undefined' ? window : null,
    now: () => Date.now(),
    setTimeout: (fn, ms) => (g.setTimeout as (f: () => void, m: number) => unknown)(fn, ms),
    clearTimeout: (id) => (g.clearTimeout as (i: unknown) => void)(id),
    setInterval: (fn, ms) => (g.setInterval as (f: () => void, m: number) => unknown)(fn, ms),
    clearInterval: (id) => (g.clearInterval as (i: unknown) => void)(id),
  };
}

/** Run f; swallow and report any error. The meta layer is decoration: it must never break the game. */
export function guard<T>(f: () => T, fallback: T, where = 'meta'): T {
  try {
    return f();
  } catch (e) {
    try {
      // eslint-disable-next-line no-console
      console.debug?.(`[${where}]`, e);
    } catch {
      /* nothing */
    }
    return fallback;
  }
}
