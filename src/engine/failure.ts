// §7 failure states and run ending.
import { BALANCE } from './balance.ts';
import { type K, emit, log, progress, stat, systemDef, hasMod, addCredits, modifiers } from './core.ts';
import { addHeat, burnRandomHost } from './world.ts';
import { pick } from './rng.ts';
import type { CombatState, Id, RunState } from './types.ts';

export type RunEndReason = 'jackout' | 'dumped' | 'traced' | 'flatlined' | 'scripted';

/** Remember what the player learned about the map for later runs. */
function persistRunKnowledge(k: K, run: RunState): void {
  const p = progress(k, run.system);
  for (const n of Object.values(run.nodes)) if (n.revealed && !p.revealed.includes(n.id)) p.revealed.push(n.id);
}

/** Charges spent in combat are written back to the run. */
export function closeCombat(k: K, cs: CombatState): void {
  if (k.state.run) k.state.run.charges = cs.charges;
  k.state.combat = null;
}

export function endRun(k: K, reason: RunEndReason, keepHaul: boolean): void {
  const s = k.state;
  const run = s.run;
  if (!run) return;
  if (s.combat?.context === 'patch' && s.meta.finale === 'patch_fight') {
    // leaving the PATCH fight any way but winning puts the finale back where it was (like a lost fight)
    s.meta.finale = s.meta.chairmanKilled ? 'chairman_dead' : 'chairman';
    emit(k, { type: 'finale.stage', stage: s.meta.finale });
  }
  if (s.combat) closeCombat(k, s.combat);
  persistRunKnowledge(k, run);
  const haul = run.haul.length;
  if (keepHaul) s.player.paydata.push(...run.haul);
  else if (haul > 0) {
    // lost paydata respawns: the system "restored it from backup" (story-critical files can never be lost for good)
    for (const pd of run.haul) {
      const p = progress(k, pd.system);
      p.looted = p.looted.filter((id) => id !== pd.file);
    }
    emit(k, { type: 'paydata.lost', count: haul });
  }
  s.run = null;
  if (reason !== 'flatlined') s.mode = 'hub';
  s.player.integrity = stat(k, 'chassis');
  emit(k, { type: 'run.ended', system: run.system, reason, haul: keepHaul ? haul : 0 });
  if (reason !== 'flatlined') emit(k, { type: 'hub.entered' });
}

function scripted(k: K): boolean {
  const run = k.state.run;
  return !!run && !!systemDef(k, run.system).scriptedFailure;
}

/** Deck integrity hit 0 during a run. */
export function dumped(k: K): void {
  const s = k.state;
  if (s.combat) emit(k, { type: 'combat.ended', result: 'dumped', context: s.combat.context });
  s.stats.fightsLost++;
  if (scripted(k)) {
    endRun(k, 'scripted', true);
    return;
  }
  s.stats.dumped++;
  const candidates = s.player.loadout.filter((id) => !s.player.programs[id]?.corrupted);
  let corrupted: Id | null = null;
  if (candidates.length) {
    corrupted = pick(s, candidates);
    s.player.programs[corrupted].corrupted = true;
    s.player.loadout = s.player.loadout.filter((id) => id !== corrupted);
    emit(k, { type: 'program.corrupted', program: corrupted });
  }
  emit(k, { type: 'player.dumped', program: corrupted });
  log(k, 'DUMPED. Deck integrity zero.', 'warn');
  endRun(k, 'dumped', hasMod(k, 'keepPaydataOnDump'));
  addHeat(k, BALANCE.failure.dumpHeat, 'dumped');
}

/** Trace hit 100. */
export function traced(k: K): void {
  const s = k.state;
  const run = s.run!;
  if (s.combat) emit(k, { type: 'combat.ended', result: 'traced', context: s.combat.context });
  if (scripted(k)) {
    emit(k, { type: 'player.traced', fine: 0 });
    endRun(k, 'scripted', true);
    return;
  }
  s.stats.traced++;
  let ratio: number = BALANCE.failure.traceFine;
  for (const m of modifiers(k)) if (m.mod === 'traceFine') ratio = Math.min(ratio, m.ratio);
  const fine = Math.round(s.player.credits * ratio);
  const sys = run.system;
  log(k, 'TRACED. Account frozen.', 'warn');
  emit(k, { type: 'player.traced', fine });
  endRun(k, 'traced', false);
  addCredits(k, -fine, 'trace fine');
  addHeat(k, BALANCE.failure.traceHeat, 'traced');
  const p = progress(k, sys);
  p.hardenedUntil = s.cycle + BALANCE.failure.hardenCycles;
  emit(k, { type: 'system.hardened', system: sys, until: p.hardenedUntil });
  burnRandomHost(k, s.player.hosts.slice());
}

/** Neural HP hit 0: you die. The UI offers loadCheckpoint(). */
export function flatlined(k: K): void {
  const s = k.state;
  if (s.combat) {
    emit(k, { type: 'combat.ended', result: 'flatlined', context: s.combat.context });
    s.stats.fightsLost++;
  }
  s.stats.flatlines++;
  s.player.flatlinesTotal++;
  log(k, 'FLATLINED.', 'warn');
  if (s.run) endRun(k, 'flatlined', false);
  s.combat = null;
  s.mode = 'flatlined';
  emit(k, { type: 'player.flatlined', total: s.player.flatlinesTotal });
}
