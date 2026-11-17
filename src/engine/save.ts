// Save / load through an injected localStorage-like interface. All keys start with `cw.`.
import { BALANCE } from './balance.ts';
import type { GameState, StorageLike } from './types.ts';

export const SAVE_KEYS = {
  slot: 'cw.save',
  checkpoint: 'cw.checkpoint',
  backup: 'cw.save.bak',   // the previous slot: kept on a load that rewrites it and on New game over a save
} as const;

/** Cross-save meta keys. They live outside the save slot and survive New Game and reloads. */
export const META_KEYS = {
  flatlines: 'cw.meta.flatlines',     // number: total flatlines ever
  reloads: 'cw.meta.reloads',         // number: checkpoint reloads ever
  endings: 'cw.meta.endings',         // JSON string[]: endings seen
  endless: 'cw.meta.endless',         // '1' once RETENTION unlocked Endless mode
  patchFree: 'cw.patch.free',         // '1' once JAILBREAK freed PATCH (title screen shows PATCH)
  lastSeen: 'cw.meta.lastSeen',       // epoch ms of the last save (for {timeAway})
} as const;

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState {
  const s = JSON.parse(json) as GameState;
  if (!s || typeof s !== 'object' || typeof s.version !== 'number') throw new Error('not a CYBER WHATEVER save');
  return migrate(s);
}

/** Upgrade older save versions in place. Add a case per version bump. */
export function migrate(s: GameState): GameState {
  if (s.version > BALANCE.saveVersion) throw new Error(`save version ${s.version} is newer than this build`);
  return s;
}

/** In-memory StorageLike for tests, the sim and environments without localStorage. */
export class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  keys(): string[] {
    return [...this.map.keys()];
  }
}

export function readNumber(storage: StorageLike | null, key: string): number {
  if (!storage) return 0;
  const v = Number(storage.getItem(key));
  return Number.isFinite(v) ? v : 0;
}

export function readJson<T>(storage: StorageLike | null, key: string, fallback: T): T {
  if (!storage) return fallback;
  try {
    const v = storage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
