// §5.4 trace: one meter per run, 0-100.
import { BALANCE } from './balance.ts';
import { type K, emit, log, multMod, round1, stat, systemDef, clamp } from './core.ts';
import { proxyPower } from './world.ts';
import type { Ctx, TraceLevel } from './types.ts';

export function traceLevel(trace: number): TraceLevel {
  const T = BALANCE.trace;
  if (trace >= T.max) return 'traced';
  if (trace >= T.alarm) return 'alarm';
  if (trace >= T.suspicious) return 'suspicious';
  return 'calm';
}

/** Alert tier used by sneak: 0 calm, 1 suspicious, 2 alarm+. */
export function alertTier(trace: number): number {
  const l = traceLevel(trace);
  return l === 'calm' ? 0 : l === 'suspicious' ? 1 : 2;
}

const ORDER: TraceLevel[] = ['calm', 'suspicious', 'alarm', 'traced'];

/**
 * Add trace to the current run. Positive gains are halved once Security is captured and
 * scaled by traceGain modifiers unless `raw`.
 */
export function addTrace(k: K, amount: number, source: string, raw = false): void {
  const run = k.state.run;
  if (!run || amount === 0) return;
  // finale fights (CHAIRMAN v2, PATCH's botnet) are not trace fights
  if (amount > 0 && isFinaleFight(k)) return;
  let a = amount;
  if (a > 0 && !raw) {
    if (run.securityCaptured) a *= BALANCE.trace.securityCapturedMult;
    a *= multMod(k, 'traceGain');
  }
  const before = run.trace;
  run.trace = round1(clamp(before + a, 0, BALANCE.trace.max));
  const d = round1(run.trace - before);
  if (d === 0) return;
  emit(k, { type: 'trace.changed', value: run.trace, delta: d, source });
  const ia = ORDER.indexOf(traceLevel(before));
  const ib = ORDER.indexOf(traceLevel(run.trace));
  for (let i = ia + 1; i <= ib; i++) onThreshold(k, ORDER[i]);
}

function onThreshold(k: K, level: TraceLevel): void {
  const run = k.state.run!;
  emit(k, { type: 'trace.threshold', level });
  if (level === 'suspicious') {
    log(k, 'trace: SUSPICIOUS. ICE hardens its shells.', 'warn');
    // all live ICE +1 shell level
    const add = BALANCE.ice.perLevelShell * BALANCE.ice.suspiciousShellLevels;
    const buff = (ice: { shell: { type: string; points: number; max: number }; dead: boolean }) => {
      if (ice.dead || ice.shell.type === 'none') return;
      ice.shell.max += add;
      ice.shell.points += add;
    };
    // combat ICE and node ICE can be the same objects: buff each instance once
    const all = new Set([...(k.state.combat?.ice ?? []), ...Object.values(run.nodes).flatMap((n) => n.ice)]);
    all.forEach(buff);
  } else if (level === 'alarm') {
    log(k, 'trace: ALARM. Hunters are coming.', 'warn');
    if (!run.securityCaptured) {
      const sys = systemDef(k, run.system);
      const sealed: string[] = [];
      for (const nd of sys.nodes) {
        const rn = run.nodes[nd.id];
        if (nd.type === 'vault' && rn && rn.state !== 'cleared' && rn.state !== 'captured') {
          rn.sealed = true;
          sealed.push(nd.id);
        }
      }
      if (sealed.length) emit(k, { type: 'node.sealed', system: run.system, nodes: sealed });
    }
  } else if (level === 'traced') {
    log(k, 'trace: TRACED.', 'warn');
  }
}

/** CHAIRMAN v2 and PATCH fights add no trace. */
export function isFinaleFight(c: Ctx): boolean {
  const ctx = c.state.combat?.context;
  return ctx === 'finale' || ctx === 'patch';
}

/** Trace the current combat turn will add at End Turn, from the formula only (no ICE intents). */
export function turnTraceGain(c: Ctx): number {
  const run = c.state.run;
  const cs = c.state.combat;
  if (!run || !cs || isFinaleFight(c)) return 0;
  const T = BALANCE.trace;
  const sys = systemDef(c, run.system);
  const security = Math.max(0, sys.security + (run.securityDelta ?? 0));
  let g = T.turnBase + security * T.securityMult + cs.noise
    - stat(c, 'mask') * T.maskPerPoint
    - proxyPower(c) * T.proxyPerPower
    - (cs.flowActive ? BALANCE.flow.traceReduction : 0);
  g = Math.max(0, g);
  if (cs.status.masked > 0) g *= T.maskedMult;
  if (run.securityCaptured) g *= T.securityCapturedMult;
  g *= multMod(c, 'traceGain');
  return round1(g + (sys.traceLock ?? 0));
}
