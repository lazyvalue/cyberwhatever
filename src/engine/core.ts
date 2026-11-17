// Shared kernel helpers used by every rules module.
import { BALANCE } from './balance.ts';
import { rand } from './rng.ts';
import type {
  Content, Ctx, GameEvent, GameState, HardwarePart, HardwareDef, Id, LogLevel, MessageChannel,
  Modifier, ProgramDef, IceDef, SystemDef, SystemProgress, FlagValue,
} from './types.ts';

/** Kernel: state + content + the event list of the action being processed. */
export interface K extends Ctx {
  readonly state: GameState;
  readonly content: Content;
  readonly events: GameEvent[];
  depth: number;
}

export function makeK(state: GameState, content: Content): K {
  return { state, content, events: [], depth: 0 };
}

export function emit(k: K, e: GameEvent): void {
  k.events.push(e);
}

export function uid(k: K, prefix: string): string {
  const n = k.state.nextUid++;
  return `${prefix}${n.toString(36)}`;
}

export function r(k: K): number {
  return rand(k.state);
}

export const HARDWARE_PARTS: readonly HardwarePart[] = [
  'cpu', 'ram', 'firewall', 'chassis', 'mask', 'uplink', 'storage', 'neural',
];

export class RulesError extends Error {}

export function reject(reason: string): never {
  throw new RulesError(reason);
}

// ---------------------------------------------------------------------------
// Content lookups
// ---------------------------------------------------------------------------

export function programDef(c: Ctx, id: Id): ProgramDef {
  const p = c.content.programs[id];
  if (!p) throw new Error(`unknown program '${id}'`);
  return p;
}

export function iceDef(c: Ctx, id: Id): IceDef {
  const d = c.content.ice[id];
  if (!d) throw new Error(`unknown ICE '${id}'`);
  return d;
}

export function systemDef(c: Ctx, id: Id): SystemDef {
  const s = c.content.systems[id] ?? c.state.world.procSystems[id];
  if (!s) throw new Error(`unknown system '${id}'`);
  return s;
}

export function hasSystem(c: Ctx, id: Id): boolean {
  return !!(c.content.systems[id] ?? c.state.world.procSystems[id]);
}

export function allSystemIds(c: Ctx): Id[] {
  return [...Object.keys(c.content.systems), ...Object.keys(c.state.world.procSystems)];
}

export function progress(k: K | Ctx, id: Id): SystemProgress {
  const w = k.state.world;
  let p = w.systems[id];
  if (!p) {
    p = { owned: false, patch: 0, hardenedUntil: 0, revealed: [], looted: [], used: [], netscanned: [], runs: 0 };
    w.systems[id] = p;
  }
  return p;
}

export function hardwareDef(c: Ctx, part: HardwarePart, tier: number): HardwareDef | undefined {
  return c.content.hardware.find((h) => h.part === part && h.tier === tier);
}

export function maxHardwareTier(c: Ctx, part: HardwarePart): number {
  let m = 0;
  for (const h of c.content.hardware) if (h.part === part && h.tier > m) m = h.tier;
  return m;
}

// ---------------------------------------------------------------------------
// Modifiers and derived stats
// ---------------------------------------------------------------------------

export function modifiers(c: Ctx): Modifier[] {
  const out: Modifier[] = [];
  for (const id of c.state.player.implants) {
    const d = c.content.implants[id];
    if (d) out.push(...d.mods);
  }
  for (const id of c.state.player.perks) {
    const d = c.content.perks[id];
    if (d) out.push(...d.mods);
  }
  return out;
}

export function modsOf<T extends Modifier['mod']>(c: Ctx, kind: T): Extract<Modifier, { mod: T }>[] {
  return modifiers(c).filter((m): m is Extract<Modifier, { mod: T }> => m.mod === kind);
}

export function hasMod(c: Ctx, kind: Modifier['mod']): boolean {
  return modifiers(c).some((m) => m.mod === kind);
}

export function multMod(c: Ctx, kind: 'traceGain' | 'burnChance' | 'shopPrice' | 'xp' | 'mining' | 'heatGain'): number {
  let m = 1;
  for (const mod of modifiers(c)) if (mod.mod === kind) m *= mod.mult;
  return m;
}

/** Hardware stat value including modifiers. */
export function stat(c: Ctx, part: HardwarePart): number {
  const tier = c.state.player.hardware[part] ?? 0;
  const def = hardwareDef(c, part, tier);
  let v = def ? def.value : 0;
  for (const m of modifiers(c)) if (m.mod === 'stat' && m.stat === part) v += m.add;
  return Math.max(0, v);
}

export function isImmune(c: Ctx, status: string): boolean {
  return modifiers(c).some((m) => m.mod === 'immune' && m.status === status);
}

// ---------------------------------------------------------------------------
// Player resource changes (all emit events)
// ---------------------------------------------------------------------------

export function log(k: K, text: string, level: LogLevel = 'info'): void {
  const L = k.state.log;
  L.push({ cycle: k.state.cycle, level, text });
  if (L.length > BALANCE.logLimit) L.splice(0, L.length - BALANCE.logLimit);
  emit(k, { type: 'log', level, text });
}

export function message(k: K, from: Id, text: string, channel: MessageChannel = 'dm', subject?: string): void {
  const id = uid(k, 'm');
  const M = k.state.messages;
  M.push({ id, from, text, channel, cycle: k.state.cycle, read: false, ...(subject ? { subject } : {}) });
  if (M.length > BALANCE.messageLimit) M.splice(0, M.length - BALANCE.messageLimit);
  emit(k, { type: 'message.received', id, from, channel });
}

export function addCredits(k: K, delta: number, reason: string): void {
  const p = k.state.player;
  const d = Math.round(delta);
  if (d === 0) return;
  p.credits = Math.max(0, p.credits + d);
  if (d > 0) k.state.stats.creditsEarned += d;
  emit(k, { type: 'credits.changed', value: p.credits, delta: d, reason });
}

export function spend(k: K, amount: number, reason: string): void {
  const a = Math.round(amount);
  if (k.state.player.credits < a) reject(`not enough credits (need ${a} ¤)`);
  addCredits(k, -a, reason);
}

export function setFlag(k: K, flag: string, value: FlagValue = true): void {
  k.state.story.flags[flag] = value;
  emit(k, { type: 'story.flag', flag, value });
}

export function addItem(k: K, item: Id): void {
  if (k.state.player.items.includes(item)) return;
  k.state.player.items.push(item);
  emit(k, { type: 'item.gained', item });
}

export function removeItem(k: K, item: Id): void {
  const i = k.state.player.items.indexOf(item);
  if (i < 0) return;
  k.state.player.items.splice(i, 1);
  emit(k, { type: 'item.lost', item });
}

export function addProgram(k: K, program: Id): void {
  if (!k.content.programs[program]) throw new Error(`unknown program '${program}'`);
  const owned = k.state.player.programs[program];
  if (owned) {
    if (owned.corrupted) {
      owned.corrupted = false;
      emit(k, { type: 'program.repaired', program });
    }
    return;
  }
  k.state.player.programs[program] = { corrupted: false };
  emit(k, { type: 'program.gained', program });
}

export function changeHumanity(k: K, delta: number): void {
  const p = k.state.player;
  const v = Math.max(0, Math.min(100, p.humanity + delta));
  const d = v - p.humanity;
  if (d === 0) return;
  p.humanity = v;
  emit(k, { type: 'humanity.changed', value: v, delta: d });
}

export function addressKnown(c: Ctx, system: Id): boolean {
  return !!c.state.world.addressBook[system];
}

export function addAddress(k: K, system: Id, source: string, note?: string): void {
  const book = k.state.world.addressBook;
  const existing = book[system];
  if (existing) {
    if (note && !existing.notes.includes(note)) existing.notes.push(note);
    return;
  }
  if (!hasSystem(k, system)) throw new Error(`address for unknown system '${system}'`);
  book[system] = { system, source, cycle: k.state.cycle, notes: note ? [note] : [] };
  progress(k, system);
  emit(k, { type: 'address.added', system, source });
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
