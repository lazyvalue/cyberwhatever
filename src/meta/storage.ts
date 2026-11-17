// Safe access to the game's own localStorage keys. Only keys that start with `cw.` are ever read,
// written or deleted (DESIGN §11.1). Every call is wrapped in try/catch.
import { META_KEYS, SAVE_KEYS } from '../engine/index.ts';
import type { StoreLike } from './env.ts';

export const PREFIX = 'cw.';

/** Keys owned by the meta layer (the engine owns cw.save.* and the cw.meta.* keys in ENGINE_API §3.1). */
export const MK = {
  diary: 'cw.chairman.diary',
  patchNote: 'cw.patch.note',
  cheats: 'cw.meta.cheats',       // cheat attempts, all saves
  lastSeen: 'cw.meta.lastSeen',   // epoch ms, heartbeat while the tab is open
  playtime: 'cw.meta.playtime',   // total real play time in ms, all saves
  tally: 'cw.meta.tally',         // JSON per-save tallies keyed by seed (see stats.ts)
  rot: 'cw.meta.rot',             // JSON rotation counters (title lines, …)
  settings: 'cw.settings',        // UI options (read only here: reducedMotion)
} as const;

/** Engine keys we read (ENGINE_API §3.1). Taken from the engine so a rename cannot drift. */
export const EK = {
  slot: SAVE_KEYS.slot,
  checkpoint: SAVE_KEYS.checkpoint,
  flatlines: META_KEYS.flatlines,
  reloads: META_KEYS.reloads,
  endings: META_KEYS.endings,
  endless: META_KEYS.endless,
  patchFree: META_KEYS.patchFree,
  lastSave: META_KEYS.lastSeen,
} as const;

export class SafeStore {
  /** After THERE IS NO GAME nothing may be written again. */
  frozen = false;
  constructor(readonly raw: StoreLike | null) {}

  get(key: string): string | null {
    if (!key.startsWith(PREFIX) || !this.raw) return null;
    try {
      return this.raw.getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): boolean {
    if (this.frozen || !key.startsWith(PREFIX) || !this.raw) return false;
    try {
      this.raw.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  del(key: string): void {
    if (!key.startsWith(PREFIX) || !this.raw) return;
    try {
      this.raw.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  num(key: string): number {
    const n = Number(this.get(key));
    return Number.isFinite(n) ? n : 0;
  }

  json<T>(key: string, fallback: T): T {
    const v = this.get(key);
    if (v === null) return fallback;
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }

  setJson(key: string, value: unknown): boolean {
    try {
      return this.set(key, JSON.stringify(value));
    } catch {
      return false;
    }
  }

  /** Every existing `cw.*` key, sorted. Never looks at anything else. */
  keys(): string[] {
    const r = this.raw;
    if (!r) return [];
    const out: string[] = [];
    try {
      const n = typeof r.length === 'number' ? r.length : 0;
      if (typeof r.key === 'function') {
        for (let i = 0; i < n; i++) {
          const k = r.key(i);
          if (k && k.startsWith(PREFIX)) out.push(k);
        }
      } else {
        // fallback for minimal shims: enumerate own keys
        for (const k of Object.keys(r)) if (k.startsWith(PREFIX)) out.push(k);
      }
    } catch {
      /* ignore */
    }
    return out.sort();
  }

  /** Delete every `cw.*` key (THERE IS NO GAME). Returns the keys removed. */
  wipe(): string[] {
    const ks = this.keys();
    for (const k of ks) this.del(k);
    return ks;
  }
}

export function byteSize(s: string): number {
  try {
    return new TextEncoder().encode(s).length;
  } catch {
    return s.length;
  }
}

export function fmtBytes(n: number): string {
  if (n < 1000) return `${n} B`;
  return `${(n / 1000).toFixed(1)} kB`;
}
