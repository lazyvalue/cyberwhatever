// Real-world reads (DESIGN §11.1: local only) and per-save tallies the engine does not keep:
// real play time, real time per system, program uses, botnet peak. Fills the templated slots of
// 00-bible §0.3 and 06-endings.
import { select, type Engine, type GameEvent, type GameState } from '../engine/index.ts';
import type { MetaEnv } from './env.ts';
import { EK, MK, type SafeStore } from './storage.ts';

export const SHORT_NAMES: Record<string, string> = {
  fridge: 'the fridge',
  wok: 'the noodle shop',
  vendnet: 'the vending machines',
  bigbyte: 'the ISP',
  parkit: 'the Parking Authority',
  khhappy: 'KH Happiness',
  coinbasement: 'the exchange',
  chromebone: 'the clinic',
  karaoke: 'the karaoke bar',
  seamless: 'the Church',
  orbital: 'the orbital bank',
  aegis: 'Aegis',
  deadmans: "the Deadman's Switch",
  deaddrop: 'the Dead Drop',
  khbackbone: 'the KH backbone',
  arcology: 'the Arcology',
  localhost: 'the game',
};

export interface Tally {
  seed: number;
  ms: number;                        // real play time in this save
  systems: Record<string, number>;   // real ms spent dialled into each system
  programs: Record<string, number>;  // program uses
  botnetPeak: number;
  rootHunt: boolean;                 // fragments injected (fallback when the story flag is missing)
  sudoFails: number;
  crashShown: boolean;
}

export function emptyTally(seed: number): Tally {
  return { seed, ms: 0, systems: {}, programs: {}, botnetPeak: 0, rootHunt: false, sudoFails: 0, crashShown: false };
}

export function botnetCount(s: GameState): number {
  return s.player.hosts.filter((h) => h.role === 'botnet').length;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function fmtDuration(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60000);
  if (min < 1) return 'under a minute';
  if (min < 60) return plural(min, 'minute');
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${plural(h, 'hour')} ${plural(m, 'minute')}` : plural(h, 'hour');
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh ? `${plural(d, 'day')} ${plural(hh, 'hour')}` : plural(d, 'day');
}

/** Coarse format for absences: "40 minutes", "3 hours", "2 days". */
export function fmtAway(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60000);
  if (min < 60) return plural(Math.max(1, min), 'minute');
  const h = Math.floor(min / 60);
  if (h < 24) return plural(h, 'hour');
  return plural(Math.floor(h / 24), 'day');
}

export function fmtClock(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export type HumBand = 'high' | 'mid' | 'low' | 'unit';
export function humBand(humanity: number): HumBand {
  if (humanity >= 70) return 'high';
  if (humanity >= 40) return 'mid';
  if (humanity >= 20) return 'low';
  return 'unit';
}

/**
 * Per-save tallies + total play time. Persisted in `cw.meta.tally` / `cw.meta.playtime`.
 *
 * Before a game is loaded (`engine.active === false`, the title screen) the engine holds a placeholder
 * state with a throwaway seed. The tracker is then *unbound*: it keeps the stored tally in memory as-is,
 * never saves, never counts. Only `sync()` (after a real load) or `reset()` (new game) binds it and decides
 * "same save or a different one". Title-screen time is not play time.
 */
export class Tracker {
  tally: Tally;
  /** False until a real game is loaded or started. While false nothing is counted or written. */
  bound: boolean;
  constructor(private store: SafeStore, seed: number, active = true) {
    const t = store.json<Tally | null>(MK.tally, null);
    const stored = t && typeof t === 'object' && typeof t.seed === 'number' ? { ...emptyTally(t.seed), ...t } : null;
    this.bound = active;
    if (!active) this.tally = stored ?? emptyTally(seed);
    else this.tally = stored && stored.seed === seed ? stored : emptyTally(seed);
  }

  /** Called after a real load: a different seed is a different save. Binds the tracker. */
  sync(s: GameState): void {
    this.bound = true;
    if (this.tally.seed !== s.seed) {
      this.tally = emptyTally(s.seed);
      this.save();
    }
    this.tally.botnetPeak = Math.max(this.tally.botnetPeak, botnetCount(s));
  }

  /** New game. Binds the tracker. */
  reset(seed: number): void {
    this.bound = true;
    this.tally = emptyTally(seed);
    this.save();
  }

  tick(s: GameState, dt: number): void {
    if (!this.bound || !(dt > 0)) return;
    const d = Math.min(dt, 60000); // a sleeping laptop is not play time
    this.tally.ms += d;
    if (s.run) this.tally.systems[s.run.system] = (this.tally.systems[s.run.system] ?? 0) + d;
    this.store.set(MK.playtime, String(Math.round(this.store.num(MK.playtime) + d)));
    this.save();
  }

  onEvents(events: GameEvent[], s: GameState): void {
    if (!this.bound) return;
    let dirty = false;
    for (const e of events) {
      if (e.type === 'combat.program') {
        this.tally.programs[e.program] = (this.tally.programs[e.program] ?? 0) + 1;
        dirty = true;
      }
    }
    const b = botnetCount(s);
    if (b > this.tally.botnetPeak) {
      this.tally.botnetPeak = b;
      dirty = true;
    }
    if (dirty) this.save();
  }

  save(): void {
    if (!this.bound) return;
    this.store.setJson(MK.tally, this.tally);
  }
}

export interface RealStats {
  handle: string;
  playtime: string;
  playtimeMs: number;
  savePlaytime: string;
  flatlines: number;
  reloads: number;
  localTime: string;
  hour: number;
  viewport: string;
  vw: number;
  vh: number;
  timeAway: string | null;
  timeAwayMs: number | null;
  control: string;
  controlPct: number;
  botnetSize: number;
  botnetPeak: number;
  humanity: number;
  hum: HumBand;
  credits: number;
  heat: number;
  rep: number;
  hodl: string;
  topSystem: string | null;
  topSystemTime: string | null;
  creditsEarned: number;
  systemsOwned: number;
  topProgram: string | null;
  topProgramUses: number;
  gremlinUses: number;
  endingsSeen: number;
  cheats: number;
}

export interface StatsInput {
  engine: Engine;
  env: MetaEnv;
  store: SafeStore;
  tally: Tally;
  timeAwayMs: number | null;
}

export function realStats({ engine, env, store, tally, timeAwayMs }: StatsInput): RealStats {
  const s = engine.state;
  const p = s.player;
  const now = new Date(env.now());
  const vw = num(() => env.win?.innerWidth, 0);
  const vh = num(() => env.win?.innerHeight, 0);
  let controlPct = 0;
  try {
    controlPct = select.controlPct(engine);
  } catch {
    controlPct = 0;
  }
  const sysEntries = Object.entries(tally.systems).filter(([id]) => id !== 'localhost').sort((a, b) => b[1] - a[1]);
  const top = sysEntries[0];
  // the engine counts program uses per save (stats.programUses); our own tally is the fallback
  const uses: Record<string, number> = { ...tally.programs };
  for (const [id, n] of Object.entries(s.stats.programUses ?? {})) uses[id] = Math.max(uses[id] ?? 0, n);
  const progEntries = Object.entries(uses).sort((a, b) => b[1] - a[1]);
  const topProg = progEntries[0];
  const gremlinId = engine.content.setup.cheatProgram;
  const progName = (id: string) => engine.content.programs[id]?.name ?? id;
  const systemsOwned = Object.entries(s.world.systems).filter(
    ([id, sp]) => sp.owned && engine.content.systems[id] && engine.content.systems[id].capturable !== false,
  ).length;
  const endings = store.json<string[]>(EK.endings, []);
  const playtimeMs = store.num(MK.playtime);
  return {
    handle: p.handle,
    playtime: fmtDuration(playtimeMs),
    playtimeMs,
    savePlaytime: fmtDuration(tally.ms),
    flatlines: Math.max(p.flatlinesTotal, store.num(EK.flatlines)),
    reloads: store.num(EK.reloads),
    localTime: fmtClock(now),
    hour: now.getHours(),
    viewport: vw && vh ? `${vw}×${vh}` : 'a window we cannot see',
    vw,
    vh,
    timeAway: timeAwayMs !== null ? fmtAway(timeAwayMs) : null,
    timeAwayMs,
    control: `${Math.round(controlPct)}%`,
    controlPct,
    botnetSize: botnetCount(s),
    botnetPeak: Math.max(tally.botnetPeak, s.stats.botnetPeak ?? 0, botnetCount(s)),
    humanity: Math.round(p.humanity),
    hum: humBand(p.humanity),
    credits: Math.round(p.credits),
    heat: Math.round(p.heat),
    rep: p.rep,
    hodl: p.coin.toFixed(2),
    topSystem: top ? SHORT_NAMES[top[0]] ?? engine.content.systems[top[0]]?.name ?? top[0] : null,
    topSystemTime: top ? fmtDuration(top[1]) : null,
    creditsEarned: Math.round(s.stats.creditsEarned),
    systemsOwned,
    topProgram: topProg ? progName(topProg[0]) : null,
    topProgramUses: topProg ? topProg[1] : 0,
    gremlinUses: gremlinId ? uses[gremlinId] ?? 0 : 0,
    endingsSeen: endings.length,
    cheats: store.num(MK.cheats),
  };
}

function num(f: () => number | undefined, fb: number): number {
  try {
    const v = f();
    return typeof v === 'number' && Number.isFinite(v) ? v : fb;
  } catch {
    return fb;
  }
}

/** Fill `{slot}` tokens with real stats. Unknown tokens are left intact. */
export function fillSlots(text: string, st: RealStats | null, extra?: Record<string, string | number>): string {
  if (!text || !text.includes('{')) return text;
  return text.replace(/\{(\w+)\}/g, (m, key: string) => {
    if (extra && extra[key] !== undefined) return String(extra[key]);
    if (!st) return m;
    const v = (st as unknown as Record<string, unknown>)[key];
    if (v === null || v === undefined) {
      if (key === 'timeAway') return 'a while';
      if (key === 'topSystem') return 'nowhere in particular';
      if (key === 'topSystemTime') return 'no time at all';
      return m;
    }
    return typeof v === 'object' ? m : String(v);
  });
}
