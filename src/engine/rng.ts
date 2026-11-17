// Seeded RNG (mulberry32). The whole generator state is one uint32 held in GameState.rng,
// so saving the state saves the RNG. Never use Math.random in the engine.

export interface RngHolder {
  rng: number;
}

export function seedFrom(input: number | string): number {
  if (typeof input === 'number') return input >>> 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Uniform float in [0, 1). Advances the generator. */
export function rand(s: RngHolder): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max] inclusive. */
export function randInt(s: RngHolder, min: number, max: number): number {
  return min + Math.floor(rand(s) * (max - min + 1));
}

export function chance(s: RngHolder, p: number): boolean {
  return rand(s) < p;
}

export function pick<T>(s: RngHolder, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick from empty array');
  return arr[Math.floor(rand(s) * arr.length)];
}

export function weightedPick<T>(s: RngHolder, items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((a, t) => a + Math.max(0, weight(t)), 0);
  if (total <= 0) return pick(s, items);
  let r = rand(s) * total;
  for (const t of items) {
    r -= Math.max(0, weight(t));
    if (r < 0) return t;
  }
  return items[items.length - 1];
}

export function shuffle<T>(s: RngHolder, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Approximately normal (Irwin-Hall, 4 samples), mean 0, sd ~1. */
export function gauss(s: RngHolder): number {
  return (rand(s) + rand(s) + rand(s) + rand(s) - 2) * Math.sqrt(3);
}

export function hex(s: RngHolder, len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) out += Math.floor(rand(s) * 16).toString(16);
  return out;
}
