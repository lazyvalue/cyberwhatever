// §6 combat: cycles, shells and damage kinds, intents, signature adaptation, Flow, statuses,
// daemons, botnet actions, disengage / jack out, boss phases, reinforcements, raid.
import { BALANCE } from './balance.ts';
import {
  type K, emit, log, reject, stat, iceDef, programDef, modifiers, hasMod, isImmune, uid,
  systemDef, addCredits, multMod, clamp, HARDWARE_PARTS,
} from './core.ts';
import { addXp, setHeat, burnRandomHost, usableBotnetPower, chargesPerRun } from './world.ts';
import { addTrace, turnTraceGain, traceLevel } from './trace.ts';
import { closeCombat, endRun } from './failure.ts';
import { applyStoryOps, setFinale } from './story.ts';
import { hooks } from './hooks.ts';
import { rand, pick, weightedPick } from './rng.ts';
import type {
  BotnetActionKind, CombatContext, CombatOp, CombatState, Ctx, DamageKind, IceCond, IceInstance,
  IceScriptApi, IceStatuses, IceStatusKey, IntentDef, PlayerStatuses, TargetSel, Id, IceAi,
  ProgramCombatState, HardwarePart,
} from './types.ts';

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function emptyIceStatus(): IceStatuses {
  return {
    mapped: 0, critReady: false, unstable: 0, backdoored: 0, rootable: false,
    exposed: 0, stunned: 0, slowed: 0, marked: 0, infected: 0,
  };
}

export function emptyPlayerStatus(): PlayerStatuses {
  return { decoy: 0, masked: 0, tarred: 0, anchored: 0, burn: 0, labelsScrambled: 0, stunned: 0, scrambled: {} };
}

export interface MakeIceOpts {
  level?: number;        // absolute level (default def.level)
  extraLevels?: number;  // added on top (hardened, patched, endless)
  coreMult?: number;     // extra core scaling (PATCH fight)
}

/** Build an ICE instance. Applies level scaling and the Suspicious shell bonus. */
export function makeIce(k: K, defId: Id, opts: MakeIceOpts = {}): IceInstance {
  const def = iceDef(k, defId);
  const level = (opts.level ?? def.level) + (opts.extraLevels ?? 0);
  const bonus = level - def.level;
  const I = BALANCE.ice;
  const coreMax = Math.max(1, Math.round(def.core * (1 + I.perLevelCore * bonus) * (opts.coreMult ?? 1)));
  let shellLevels = bonus;
  if (k.state.run && traceLevel(k.state.run.trace) !== 'calm') shellLevels += I.suspiciousShellLevels;
  const shellMax = def.shell.type === 'none' ? 0 : Math.max(0, def.shell.points + I.perLevelShell * shellLevels);
  const ice: IceInstance = {
    uid: uid(k, 'i'),
    def: defId,
    name: def.name,
    level,
    bonus,
    shell: { type: def.shell.type, points: shellMax, max: shellMax },
    core: coreMax,
    coreMax,
    status: emptyIceStatus(),
    intent: null,
    seq: 0,
    phase: 0,
    subverted: false,
    dead: false,
    lastHitKind: null,
    turns: 0,
    firedTriggers: [],
  };
  if (k.state.meta.modules['ui']) ice.status.mapped = I.permanentMapped;
  chooseIntent(k, ice);
  return ice;
}

/** Extra ICE levels for a system right now (hardened, patched). */
export function systemIceBonus(c: Ctx, system: Id): number {
  const p = c.state.world.systems[system];
  if (!p) return 0;
  let b = p.patch;
  if (c.state.cycle < p.hardenedUntil) b += BALANCE.ice.hardenedLevels;
  return b;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function hostile(cs: CombatState): IceInstance[] {
  return cs.ice.filter((i) => !i.dead && !i.subverted);
}

export function findIce(cs: CombatState, id: string): IceInstance | undefined {
  return cs.ice.find((i) => i.uid === id);
}

export function intentsOf(c: Ctx, ice: IceInstance): { intents: IntentDef[]; ai: IceAi } {
  const def = iceDef(c, ice.def);
  let intents = def.intents;
  let ai: IceAi = def.ai ?? 'sequence';
  if (def.phases) {
    for (let p = 0; p < ice.phase && p < def.phases.length; p++) {
      const ph = def.phases[p];
      if (ph.intents) intents = ph.intents;
      if (ph.ai) ai = ph.ai;
    }
  }
  return { intents, ai };
}

export function currentIntent(c: Ctx, ice: IceInstance): IntentDef | null {
  if (!ice.intent) return null;
  return intentsOf(c, ice).intents.find((i) => i.id === ice.intent) ?? null;
}

export function isMapped(c: Ctx, ice: IceInstance): boolean {
  return ice.status.mapped > 0 || !!c.state.meta.modules['ui'];
}

export function signatureMult(stacks: number): number {
  return Math.max(BALANCE.signature.min, 1 - BALANCE.signature.perStack * stacks);
}

export function flowNeeded(c: Ctx): number {
  let n: number = BALANCE.flow.categories;
  for (const m of modifiers(c)) if (m.mod === 'flowCategories') n = Math.min(n, m.count);
  return n;
}

/** Cycle cost of a program right now (programCost and coldOpen modifiers). */
export function programCost(c: Ctx, programId: Id): number {
  const def = c.content.programs[programId];
  if (!def) return 0;
  const cs = c.state.combat;
  const mods = modifiers(c);
  if (cs && mods.some((m) => m.mod === 'coldOpen') && Object.values(cs.programs).every((p) => p.uses === 0)) return 0;
  let cost = def.cost;
  let min = 0;
  for (const m of mods) {
    if (m.mod === 'programCost' && (m.version === undefined || m.version === (def.version ?? 1))) {
      cost += m.add;
      if (m.min !== undefined) min = Math.max(min, m.min);
    }
  }
  return Math.max(Math.min(def.cost, min), cost);
}

/** Noise a program adds right now (noise modifiers, floor 0). */
export function programNoise(c: Ctx, programId: Id): number {
  const def = c.content.programs[programId];
  if (!def) return 0;
  let n = def.noise;
  for (const m of modifiers(c)) if (m.mod === 'noise' && (m.category === undefined || m.category === def.category)) n += m.add;
  return Math.max(0, n);
}

function comboRefund(k: K): void {
  const cs = k.state.combat;
  if (!cs || cs.comboRefunded || !hasMod(k, 'comboRefund')) return;
  cs.comboRefunded = true;
  cs.cycles += 1;
  emit(k, { type: 'combat.notify', text: 'Combo: +1 cycle.', style: 'combo' });
}

export function kindMult(kind: DamageKind, shell: IceInstance['shell'], exposed: boolean): number {
  if (exposed || shell.type === 'none' || shell.points <= 0) return 1;
  const S = BALANCE.shell;
  if (kind === 'crack') return shell.type === 'crypt' ? S.strong : S.weak;
  if (kind === 'spike') return shell.type === 'wall' ? S.strong : S.weak;
  return 1;
}

export function playerDamageMult(c: Ctx, kind: DamageKind): number {
  let m = 1;
  for (const mod of modifiers(c)) if (mod.mod === 'damage' && (mod.kind === kind || mod.kind === 'all')) m *= mod.mult;
  return m;
}

function rigged(c: Ctx): boolean {
  return !!c.state.meta.modules['engine/rng'];
}

export function evalIceCond(k: K | Ctx, ice: IceInstance, cond: IceCond | undefined, rollable = true): boolean {
  if (!cond) return true;
  const cs = k.state.combat;
  switch (cond.c) {
    case 'shellBroken': return ice.shell.type !== 'none' && ice.shell.points <= 0;
    case 'coreBelow': return ice.core / ice.coreMax < cond.pct;
    case 'allyHurt': {
      if (!cs) return false;
      const pct = cond.pct ?? 1;
      return hostile(cs).some((o) => o !== ice && o.core / o.coreMax < pct);
    }
    case 'allyShellBroken':
      return !!cs && hostile(cs).some((o) => o !== ice && o.shell.type !== 'none' && o.shell.points < o.shell.max);
    case 'turn': {
      const t = ice.turns + 1;
      if (cond.atLeast !== undefined && t < cond.atLeast) return false;
      if (cond.atMost !== undefined && t > cond.atMost) return false;
      if (cond.every !== undefined && t % cond.every !== 0) return false;
      return true;
    }
    case 'playerStatus': {
      if (!cs) return false;
      return (cs.status[cond.status] as number) >= (cond.atLeast ?? 1);
    }
    case 'enemies': {
      if (!cs) return false;
      const n = hostile(cs).length;
      return (cond.gte === undefined || n >= cond.gte) && (cond.lte === undefined || n <= cond.lte);
    }
    case 'trace': return (k.state.run?.trace ?? 0) >= cond.gte;
    case 'chance': return rollable ? rand(k.state) < cond.p : false;
    case 'flag': {
      const v = k.state.story.flags[cond.flag];
      return cond.is === undefined ? !!v : v === cond.is;
    }
    case 'not': return !evalIceCond(k, ice, cond.of, rollable);
    case 'all': return cond.of.every((x) => evalIceCond(k, ice, x, rollable));
    case 'any': return cond.of.some((x) => evalIceCond(k, ice, x, rollable));
    case 'status': {
      const v = ice.status[cond.status];
      const n = typeof v === 'boolean' ? (v ? 1 : 0) : v;
      return n >= (cond.atLeast ?? 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Intent choice
// ---------------------------------------------------------------------------

function iceApi(k: K, ice: IceInstance): IceScriptApi {
  return {
    state: k.state,
    ice,
    content: k.content,
    apply: (ops) => applyOps(k, ops, { side: 'ice', uid: ice.uid }),
    rng: () => rand(k.state),
    emit: (e) => emit(k, e),
    setIntent: (id) => {
      ice.intent = id;
      emit(k, { type: 'combat.intent', ice: ice.uid, intent: id });
    },
  };
}

export function chooseIntent(k: K, ice: IceInstance): void {
  const def = iceDef(k, ice.def);
  const script = def.script ? k.content.iceScripts?.[def.script] : undefined;
  let id: Id | undefined = script?.chooseIntent?.(iceApi(k, ice));
  if (!id) {
    const { intents, ai } = intentsOf(k, ice);
    if (intents.length === 0) id = undefined;
    else if (ai === 'sequence') {
      id = intents[ice.seq % intents.length].id;
      ice.seq++;
    } else if (ai === 'priority') {
      id = (intents.find((i) => evalIceCond(k, ice, i.when)) ?? intents[intents.length - 1]).id;
    } else {
      const ok = intents.filter((i) => evalIceCond(k, ice, i.when));
      id = weightedPick(k.state, ok.length ? ok : intents, (i) => i.weight ?? 1).id;
    }
  }
  ice.intent = id ?? null;
  if (k.state.combat) emit(k, { type: 'combat.intent', ice: ice.uid, intent: ice.intent });
}

// ---------------------------------------------------------------------------
// Op interpreter
// ---------------------------------------------------------------------------

export type Src =
  | { side: 'player'; program?: Id; target?: string; mult?: number }
  | { side: 'ice'; uid: string };

function cs_(k: K): CombatState {
  const cs = k.state.combat;
  if (!cs) throw new Error('not in combat');
  return cs;
}

function srcIce(k: K, src: Src): IceInstance | undefined {
  return src.side === 'ice' ? findIce(cs_(k), src.uid) : undefined;
}

/** Resolve ICE targets for an op. Returns [] when the op targets the player. */
function iceTargets(k: K, src: Src, sel: TargetSel | undefined, dflt: TargetSel): IceInstance[] {
  const cs = cs_(k);
  const s = sel ?? dflt;
  const foes = hostile(cs);
  if (src.side === 'player') {
    switch (s) {
      case 'target': {
        const t = src.target ? findIce(cs, src.target) : undefined;
        if (t && !t.dead && !t.subverted) return [t];
        return foes.length ? [foes[0]] : [];
      }
      case 'allEnemies': return foes;
      case 'randomEnemy': return foes.length ? [pick(k.state, foes)] : [];
      case 'lowestEnemy': return foes.length ? [foes.reduce((a, b) => (b.core < a.core ? b : a))] : [];
      default: return [];
    }
  }
  const me = srcIce(k, src);
  if (!me) return [];
  const others = foes.filter((i) => i !== me);
  switch (s) {
    case 'self': return [me];
    case 'allAllies': return foes;
    case 'allyLowest': {
      if (others.length === 0) return [me];
      return [others.reduce((a, b) => (b.core / b.coreMax < a.core / a.coreMax ? b : a))];
    }
    case 'allyRandom': return others.length ? [pick(k.state, others)] : [me];
    default: return [];
  }
}

export function applyOps(k: K, ops: CombatOp[], src: Src): void {
  for (const op of ops) {
    if (!k.state.combat) return; // fight ended mid-list (offer, scripted end)
    applyOp(k, op, src);
  }
}

function addPlayerStatus(k: K, status: keyof Omit<PlayerStatuses, 'scrambled'>, value: number): void {
  const cs = cs_(k);
  if (isImmune(k, status)) return;
  if (status === 'decoy' || status === 'tarred' || status === 'burn') cs.status[status] += value;
  else cs.status[status] = Math.max(cs.status[status], value);
  emit(k, { type: 'combat.playerStatus', status, value: cs.status[status] });
}

export function addIceStatus(k: K, ice: IceInstance, status: IceStatusKey, value: number, force = false): void {
  const def = iceDef(k, ice.def);
  const st = ice.status;
  switch (status) {
    case 'mapped':
      st.mapped = Math.max(st.mapped, value);
      st.critReady = true;
      break;
    case 'unstable': st.unstable += value; break;
    case 'infected': st.infected += value; break;
    case 'backdoored':
      if (st.rootable) return;
      st.backdoored = st.backdoored > 0 ? Math.min(st.backdoored, value) : value;
      break;
    case 'stunned':
      if (!force && (def.boss || def.resist?.stun)) {
        st.slowed = Math.max(st.slowed, 1);
        emit(k, { type: 'combat.iceStatus', target: ice.uid, status: 'slowed', value: st.slowed });
        return;
      }
      st.stunned = Math.max(st.stunned, value);
      break;
    case 'exposed': st.exposed = Math.max(st.exposed, value); break;
    case 'slowed': st.slowed = Math.max(st.slowed, value); break;
    case 'marked': st.marked = Math.max(st.marked, value); break;
    default: return;
  }
  const v = st[status as keyof IceStatuses];
  emit(k, { type: 'combat.iceStatus', target: ice.uid, status: status as never, value: typeof v === 'number' ? v : 1 });
}

function applyOp(k: K, op: CombatOp, src: Src): void {
  const cs = cs_(k);
  const s = k.state;
  switch (op.op) {
    case 'damage': {
      if (src.side === 'ice') {
        // ICE using 'damage' against the player: treat as a hit
        hitPlayer(k, src, op.amount, op.hits ?? 1, false, false);
        return;
      }
      const hits = op.hits ?? 1;
      for (let h = 0; h < hits; h++) {
        const targets = iceTargets(k, src, op.to, 'target');
        for (const t of targets) {
          let amt = op.amount + (op.spread ? (rigged(k) ? op.spread : Math.floor(rand(s) * (op.spread + 1))) : 0);
          if (op.overflow && t.status.unstable > 0) {
            amt += t.status.unstable * op.overflow;
            t.status.unstable = 0;
            emit(k, { type: 'combat.iceStatus', target: t.uid, status: 'unstable', value: 0 });
            comboRefund(k);
          }
          dealDamage(k, t, op.kind, amt, (src.mult ?? 1) * playerDamageMult(k, op.kind));
          if (!k.state.combat) return;
        }
      }
      return;
    }
    case 'iceStatus':
      for (const t of iceTargets(k, src, op.to, src.side === 'player' ? 'target' : 'self')) {
        const v = op.status === 'unstable' || op.status === 'infected' ? Math.round(op.value * (src.side === 'player' ? src.mult ?? 1 : 1)) : op.value;
        addIceStatus(k, t, op.status, Math.max(1, v), !!op.force);
      }
      return;
    case 'root':
      for (const t of iceTargets(k, src, op.to, 'target')) {
        const def = iceDef(k, t.def);
        if (!t.status.rootable) continue;
        if (def.boss || def.resist?.root || def.undefeatable) {
          emit(k, { type: 'combat.notify', text: `${t.name} resists root.` });
          continue;
        }
        t.subverted = true;
        emit(k, { type: 'combat.iceSubverted', ice: t.uid, def: t.def });
        comboRefund(k);
        log(k, `${t.name} now works for you.`, 'combat');
      }
      checkVictory(k);
      return;
    case 'stripShell':
      for (const t of iceTargets(k, src, op.to, 'target')) {
        if (t.shell.points <= 0) continue;
        const d = Math.min(t.shell.points, Math.round(op.amount * (src.side === 'player' ? src.mult ?? 1 : 1)));
        t.shell.points -= d;
        emit(k, { type: 'combat.damage', target: t.uid, kind: 'raw', shell: d, core: 0, crit: false, mult: 1, reflected: 0 });
        if (t.shell.points <= 0) onShellBreak(k, t);
      }
      return;
    case 'cleanseIce':
      for (const t of iceTargets(k, src, op.to, src.side === 'player' ? 'target' : 'self')) {
        const keep = { mapped: t.status.mapped, critReady: t.status.critReady };
        if (op.status === 'all') {
          t.status = { ...emptyIceStatus(), ...(src.side === 'ice' ? keep : {}) };
        } else if (op.status === 'mapped') {
          t.status.mapped = s.meta.modules['ui'] ? t.status.mapped : 0;
          t.status.critReady = false;
        } else {
          (t.status[op.status] as number) = 0;
        }
        emit(k, { type: 'combat.iceStatus', target: t.uid, status: op.status === 'all' ? 'stunned' : op.status, value: 0 });
      }
      return;
    case 'shield':
      cs.shield += Math.round(op.amount * (src.side === 'player' ? src.mult ?? 1 : 1));
      emit(k, { type: 'combat.shield', value: cs.shield, delta: op.amount });
      return;
    case 'repair': {
      const before = s.player.integrity;
      s.player.integrity = Math.min(stat(k, 'chassis'), before + Math.round(op.amount * (src.side === 'player' ? src.mult ?? 1 : 1)));
      emit(k, { type: 'combat.repair', integrity: s.player.integrity, delta: s.player.integrity - before });
      return;
    }
    case 'neuralHeal': {
      const before = s.player.neural;
      s.player.neural = Math.min(stat(k, 'neural'), before + op.amount);
      emit(k, { type: 'combat.neural', value: s.player.neural, delta: s.player.neural - before });
      return;
    }
    case 'playerStatus':
      addPlayerStatus(k, op.status, op.value);
      return;
    case 'cleanse': {
      const st = cs.status;
      const negatives = ['tarred', 'anchored', 'burn', 'labelsScrambled', 'stunned'] as const;
      if (op.status === 'all') {
        for (const n of negatives) st[n] = 0;
        st.scrambled = {};
      } else if (op.status === 'scrambled') st.scrambled = {};
      else st[op.status] = 0;
      emit(k, { type: 'combat.playerStatus', status: op.status === 'all' ? 'stunned' : op.status, value: 0 });
      return;
    }
    case 'trace':
      addTrace(k, op.amount, src.side === 'ice' ? `ice:${srcIce(k, src)?.name ?? '?'}` : 'program', src.side === 'player');
      return;
    case 'cycles':
      cs.cycles += op.amount;
      return;
    case 'cooldowns':
      for (const p of Object.values(cs.programs)) p.cooldown = Math.max(0, p.cooldown - op.amount);
      return;
    case 'signature':
      for (const [id, p] of Object.entries(cs.programs)) {
        if (op.program && op.program !== id) continue;
        p.stacks = Math.max(0, p.stacks - op.amount);
      }
      return;
    case 'hit':
      hitPlayer(k, src, op.amount, op.hits ?? 1, !!op.neural, !!op.pierce);
      return;
    case 'scramble': {
      if (isImmune(k, 'scrambled')) {
        emit(k, { type: 'combat.notify', text: 'Scramble failed: cold cortex.' });
        return;
      }
      const ids = Object.keys(cs.programs).filter((id) => !cs.programs[id].evicted);
      if (ids.length === 0) return;
      let id: Id;
      if (op.mode === 'lastUsed' && cs.lastProgram) id = cs.lastProgram;
      else if (op.mode === 'mostUsed' || op.mode === 'lastUsed') {
        const max = Math.max(...ids.map((i) => cs.programs[i].uses));
        id = pick(s, ids.filter((i) => cs.programs[i].uses === max));
      } else id = pick(s, ids);
      cs.status.scrambled[id] = Math.max(cs.status.scrambled[id] ?? 0, op.turns);
      emit(k, { type: 'combat.playerStatus', status: 'scrambled', value: op.turns, program: id });
      return;
    }
    case 'evict': {
      let id: Id | undefined;
      if (op.mode === 'daemon') id = cs.daemons[0]?.program;
      else {
        const ids = Object.keys(cs.programs).filter((i) => !cs.programs[i].evicted);
        if (ids.length === 0) return;
        if (op.mode === 'mostUsed') {
          const max = Math.max(...ids.map((i) => cs.programs[i].uses));
          id = pick(s, ids.filter((i) => cs.programs[i].uses === max));
        } else id = pick(s, ids);
      }
      if (!id) return;
      if (cs.programs[id]) cs.programs[id].evicted = true;
      cs.daemons = cs.daemons.filter((d) => d.program !== id);
      emit(k, { type: 'combat.evicted', program: id });
      return;
    }
    case 'drainCharges':
      cs.charges = Math.max(0, cs.charges - op.amount);
      return;
    case 'reshell':
      for (const t of iceTargets(k, src, op.to, 'self')) {
        if (t.shell.type === 'none') continue;
        t.shell.points = op.amount === undefined ? t.shell.max : Math.min(t.shell.max, t.shell.points + op.amount);
        emit(k, { type: 'combat.iceStatus', target: t.uid, status: 'exposed', value: t.status.exposed });
      }
      return;
    case 'heal':
      for (const t of iceTargets(k, src, op.to, 'self')) {
        t.core = Math.min(t.coreMax, t.core + op.amount);
        emit(k, { type: 'combat.damage', target: t.uid, kind: 'raw', shell: 0, core: -op.amount, crit: false, mult: 1, reflected: 0 });
      }
      return;
    case 'summon': {
      const n = op.count ?? 1;
      if (s.run?.securityCaptured) {
        emit(k, { type: 'combat.notify', text: 'Reinforcements blocked: Security is yours.' });
        return;
      }
      for (let i = 0; i < n; i++) {
        const level = op.level ?? iceDef(k, op.ice).level;
        if (op.delay && op.delay > 0) {
          cs.pending.push({ ice: op.ice, level, turns: op.delay });
          emit(k, { type: 'combat.reinforcements', ice: op.ice, turns: op.delay });
        } else spawnIce(k, op.ice, level, 'summon');
      }
      return;
    }
    case 'split': {
      const me = srcIce(k, src);
      if (!me || me.dead) return;
      if (me.status.infected > 0) {
        emit(k, { type: 'combat.notify', text: `${me.name} cannot split while Infected.` });
        return;
      }
      if (hostile(cs).length >= BALANCE.ice.maxPerFight || me.core < 2) return;
      const half = Math.floor(me.core / 2);
      me.core -= half;
      const clone = makeIce(k, me.def, { level: me.level });
      clone.core = half;
      clone.coreMax = me.coreMax;
      clone.shell.points = 0;
      clone.firedTriggers = me.firedTriggers.slice();
      cs.ice.push(clone);
      emit(k, { type: 'combat.iceSpawned', ice: clone.uid, def: clone.def, reason: 'split' });
      return;
    }
    case 'buff':
      for (const t of iceTargets(k, src, op.to, 'self')) {
        if (op.shellLevels && t.shell.type !== 'none') {
          const add = op.shellLevels * BALANCE.ice.perLevelShell;
          t.shell.max += add;
          t.shell.points += add;
        }
        if (op.levels) {
          t.level += op.levels;
          t.bonus += op.levels;
          const add = Math.round(iceDef(k, t.def).core * BALANCE.ice.perLevelCore * op.levels);
          t.coreMax += add;
          t.core += add;
        }
      }
      return;
    case 'demand':
      cs.demand = { id: op.id, text: op.text, penalty: op.penalty, source: src.side === 'ice' ? src.uid : 'player' };
      emit(k, { type: 'combat.demand', id: op.id, text: op.text });
      return;
    case 'offer':
      cs.offer = { id: op.id, text: op.text, credits: op.credits };
      emit(k, { type: 'combat.offer', id: op.id, text: op.text, credits: op.credits });
      return;
    case 'notify':
      emit(k, { type: 'combat.notify', text: op.text, ...(op.style ? { style: op.style } : {}) });
      return;
    case 'chance': {
      const p = src.side === 'player' && rigged(k) ? 1 : op.p;
      applyOps(k, rand(s) < p ? op.ops : op.else ?? [], src);
      return;
    }
    case 'ifIce': {
      const subject = src.side === 'ice' ? srcIce(k, src) : iceTargets(k, src, 'target', 'target')[0];
      const ok = !!subject && evalIceCond(k, subject, op.cond);
      applyOps(k, ok ? op.ops : op.else ?? [], src);
      return;
    }
    case 'story':
      applyStoryOps(k, op.ops);
      return;
    case 'script': {
      const fn = k.content.scripts?.[op.id];
      if (!fn) throw new Error(`unknown script '${op.id}'`);
      fn({
        state: k.state,
        content: k.content,
        combatOps: (ops, target) => applyOps(k, ops, { side: 'player', ...(target ? { target } : {}) }),
        storyOps: (ops) => applyStoryOps(k, ops),
        rng: () => rand(k.state),
        emit: (e) => emit(k, e),
      }, op.params);
      return;
    }
  }
}


// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------

export interface DamageResult {
  shell: number;
  core: number;
  crit: boolean;
  reflected: number;
  infected: number;
}

/** Pure damage math shared by dealDamage and previews. Does not mutate. */
export function computeDamage(ice: IceInstance, kind: DamageKind, amount: number, mult: number, reflectRatio: number | undefined): DamageResult {
  let amt = amount * mult;
  const crit = ice.status.critReady;
  if (crit) amt *= BALANCE.crit;
  if (reflectRatio && ice.lastHitKind === kind) {
    return { shell: 0, core: 0, crit, reflected: Math.round(amt * reflectRatio), infected: 0 };
  }
  if (kind === 'worm') return { shell: 0, core: 0, crit, reflected: 0, infected: Math.max(1, Math.round(amt)) };
  const exposed = ice.status.exposed > 0;
  const km = kindMult(kind, ice.shell, exposed);
  let shell = 0;
  let coreRaw = amt;
  if (!exposed && ice.shell.type !== 'none' && ice.shell.points > 0) {
    const eff = Math.round(amt * km);
    shell = Math.min(ice.shell.points, eff);
    coreRaw = (eff - shell) / km;
  }
  return { shell, core: Math.max(0, Math.round(coreRaw)), crit, reflected: 0, infected: 0 };
}

export function dealDamage(k: K, ice: IceInstance, kind: DamageKind, amount: number, mult: number): DamageResult {
  const def = iceDef(k, ice.def);
  const res = computeDamage(ice, kind, amount, mult, def.reflect);
  if (res.crit) {
    ice.status.critReady = false;
    comboRefund(k);
  }
  ice.lastHitKind = kind;
  if (res.reflected > 0) {
    emit(k, { type: 'combat.damage', target: ice.uid, kind, shell: 0, core: 0, crit: res.crit, mult, reflected: res.reflected });
    log(k, `${ice.name} reflects ${kind}.`, 'combat');
    hitPlayer(k, { side: 'ice', uid: ice.uid }, res.reflected, 1, false, false, true);
    return res;
  }
  if (res.infected > 0) {
    addIceStatus(k, ice, 'infected', res.infected);
    emit(k, { type: 'combat.damage', target: ice.uid, kind, shell: 0, core: 0, crit: res.crit, mult, reflected: 0 });
    return res;
  }
  const hadShell = ice.shell.points > 0;
  ice.shell.points -= res.shell;
  applyCoreDamage(k, ice, res.core);
  emit(k, { type: 'combat.damage', target: ice.uid, kind, shell: res.shell, core: res.core, crit: res.crit, mult, reflected: 0 });
  if (hadShell && ice.shell.points <= 0 && ice.shell.type !== 'none') onShellBreak(k, ice);
  if (!ice.dead) fireIceTriggers(k, ice, 'damaged');
  afterIceDamage(k, ice);
  return res;
}

function applyCoreDamage(k: K, ice: IceInstance, dmg: number): void {
  const def = iceDef(k, ice.def);
  ice.core -= dmg;
  const phasesLeft = (def.phases?.length ?? 0) > ice.phase;
  if ((def.undefeatable || phasesLeft) && ice.core < 1) ice.core = 1;
}

/** Raw core damage (infection, rooted ICE): ignores shell. */
function rawCoreDamage(k: K, ice: IceInstance, dmg: number): void {
  applyCoreDamage(k, ice, dmg);
  emit(k, { type: 'combat.damage', target: ice.uid, kind: 'raw', shell: 0, core: dmg, crit: false, mult: 1, reflected: 0 });
  afterIceDamage(k, ice);
}

function afterIceDamage(k: K, ice: IceInstance): void {
  checkPhase(k, ice);
  if (ice.core <= 0 && !ice.dead) killIce(k, ice);
}

function onShellBreak(k: K, ice: IceInstance): void {
  emit(k, { type: 'combat.shellBroken', target: ice.uid });
  fireIceTriggers(k, ice, 'shellBreak');
}

function checkPhase(k: K, ice: IceInstance): void {
  const def = iceDef(k, ice.def);
  if (!def.phases) return;
  while (ice.phase < def.phases.length && ice.core / ice.coreMax <= def.phases[ice.phase].at) {
    const ph = def.phases[ice.phase];
    ice.phase++;
    if (ph.shell) {
      const pts = ph.shell.type === 'none' ? 0 : ph.shell.points + BALANCE.ice.perLevelShell * ice.bonus;
      ice.shell = { type: ph.shell.type, points: pts, max: pts };
    }
    if (ph.healTo !== undefined) ice.core = Math.max(ice.core, Math.round(ice.coreMax * ph.healTo));
    ice.seq = 0;
    emit(k, { type: 'combat.phase', ice: ice.uid, phase: ice.phase, ...(ph.name ? { name: ph.name } : {}), ...(ph.text ? { text: ph.text } : {}) });
    if (ph.ops) applyOps(k, ph.ops, { side: 'ice', uid: ice.uid });
    const script = def.script ? k.content.iceScripts?.[def.script] : undefined;
    script?.onPhase?.(iceApi(k, ice), ice.phase);
    chooseIntent(k, ice);
  }
}

function killIce(k: K, ice: IceInstance): void {
  const cs = cs_(k);
  const def = iceDef(k, ice.def);
  ice.dead = true;
  ice.core = 0;
  emit(k, { type: 'combat.iceDefeated', ice: ice.uid, def: ice.def });
  log(k, `${ice.name} derezzed.`, 'combat');
  if (cs.context !== 'patch' && cs.context !== 'finale') {
    addXp(k, def.xp * (1 + 0.25 * Math.max(0, ice.bonus)));
    if (def.credits) addCredits(k, def.credits, `${ice.name} loot`);
  }
  // worm stacks jump
  if (ice.status.infected > 0) {
    const others = hostile(cs);
    if (others.length) {
      const t = pick(k.state, others);
      addIceStatus(k, t, 'infected', ice.status.infected);
    }
    ice.status.infected = 0;
  }
  fireIceTriggers(k, ice, 'death');
  for (const o of hostile(cs)) fireIceTriggers(k, o, 'allyDeath');
  const script = def.script ? k.content.iceScripts?.[def.script] : undefined;
  script?.onDefeat?.(iceApi(k, ice));
  checkVictory(k);
}

function fireIceTriggers(k: K, ice: IceInstance, on: string): void {
  const def = iceDef(k, ice.def);
  if (!def.triggers || !k.state.combat) return;
  def.triggers.forEach((t, i) => {
    if (t.on !== on) return;
    if (t.once && ice.firedTriggers.includes(i)) return;
    if (!evalIceCond(k, ice, t.when)) return;
    if (t.once) ice.firedTriggers.push(i);
    applyOps(k, t.ops, { side: 'ice', uid: ice.uid });
  });
}

// ---------------------------------------------------------------------------
// Player takes hits
// ---------------------------------------------------------------------------

function hitPlayer(k: K, src: Src, amount: number, hits: number, neural: boolean, pierce: boolean, noDecoy = false): void {
  const cs = cs_(k);
  const s = k.state;
  const ice = srcIce(k, src);
  const bonus = ice ? ice.bonus * BALANCE.ice.perLevelHit : 0;
  const source = ice?.name ?? 'reflect';
  if (!noDecoy && cs.status.decoy > 0) {
    cs.status.decoy--;
    emit(k, { type: 'combat.playerHit', amount: 0, shield: 0, integrity: 0, neural: 0, decoyed: true, source });
    emit(k, { type: 'combat.playerStatus', status: 'decoy', value: cs.status.decoy });
    return;
  }
  for (let h = 0; h < hits; h++) {
    let dmg = Math.max(0, amount + bonus);
    if (neural) {
      if (hasMod(k, 'firstNeuralHitHalved') && !cs.painEditorUsed) {
        cs.painEditorUsed = true;
        dmg = Math.ceil(dmg / 2);
      }
      for (const m of modifiers(k)) if (m.mod === 'neuralTaken') dmg = Math.max(1, dmg + m.add);
      s.player.neural = Math.max(0, s.player.neural - dmg);
      emit(k, { type: 'combat.playerHit', amount: dmg, shield: 0, integrity: 0, neural: dmg, decoyed: false, source });
      if (s.player.neural <= 0) return;
      continue;
    }
    let absorbed = 0;
    if (!pierce) {
      absorbed = Math.min(cs.shield, dmg);
      cs.shield -= absorbed;
    }
    const through = dmg - absorbed;
    s.player.integrity = Math.max(0, s.player.integrity - through);
    emit(k, { type: 'combat.playerHit', amount: dmg, shield: absorbed, integrity: through, neural: 0, decoyed: false, source });
    if (s.player.integrity <= 0) return;
  }
}

export function playerDown(k: K | Ctx): boolean {
  const p = k.state.player;
  return p.neural <= 0 || p.integrity <= 0;
}

// ---------------------------------------------------------------------------
// Start / end
// ---------------------------------------------------------------------------

export interface StartCombatOpts {
  context: CombatContext;
  node: Id | null;
  ice: IceInstance[];
  ambush: boolean;
  charges?: number;
  bonusCycles?: number;
}

export function startCombat(k: K, o: StartCombatOpts): void {
  const s = k.state;
  const programs: Record<Id, ProgramCombatState> = {};
  for (const id of s.player.loadout) {
    if (s.player.programs[id]?.corrupted) continue;
    programs[id] = { stacks: 0, cooldown: 0, usedThisTurn: 0, usedLastTurn: false, uses: 0, evicted: false };
  }
  const cs: CombatState = {
    context: o.context,
    node: o.node,
    turn: 0,
    cycles: 0,
    shield: 0,
    ice: o.ice,
    programs,
    daemons: [],
    categories: [],
    flowNext: false,
    flowActive: false,
    noise: 0,
    botnetUsed: false,
    status: emptyPlayerStatus(),
    demand: null,
    offer: null,
    pending: [],
    hunterJoined: false,
    painEditorUsed: false,
    ambush: o.ambush,
    lastProgram: null,
    charges: o.charges ?? s.run?.charges ?? 0,
    bonusCycles: o.bonusCycles ?? 0,
  };
  s.combat = cs;
  for (const ice of cs.ice) {
    ice.status = { ...emptyIceStatus(), mapped: s.meta.modules['ui'] ? BALANCE.ice.permanentMapped : 0 };
    if (!ice.intent) chooseIntent(k, ice);
  }
  emit(k, { type: 'combat.started', context: o.context, system: s.run?.system ?? null, node: o.node, ambush: o.ambush, ice: cs.ice.map((i) => i.uid), defs: cs.ice.map((i) => i.def) });
  for (const ice of hostile(cs)) fireIceTriggers(k, ice, 'fightStart');
  if (!s.combat) return;
  for (const m of modifiers(k)) {
    if (m.mod !== 'startMapped') continue;
    const pool = hostile(cs).filter((i) => i.status.mapped === 0);
    for (let n = 0; n < m.count && pool.length; n++) {
      const t = pool.splice(Math.floor(rand(s) * pool.length), 1)[0];
      addIceStatus(k, t, 'mapped', 2);
    }
  }
  if (o.ambush) {
    log(k, 'AMBUSH. ICE acts first.', 'combat');
    iceTurn(k);
    if (!s.combat || playerDown(k)) return;
  }
  startPlayerTurn(k);
  const queued = s.run?.nextFight;
  if (s.combat && queued && queued.length) {
    s.run!.nextFight = [];
    applyOps(k, queued, { side: 'player' });
    checkVictory(k);
  }
}

function spawnIce(k: K, defId: Id, level: number, reason: 'summon' | 'hunter' | 'reinforcement'): IceInstance | null {
  const cs = cs_(k);
  if (hostile(cs).length >= BALANCE.ice.maxPerFight) return null;
  const extra = k.state.run ? systemIceBonus(k, k.state.run.system) : 0;
  const ice = makeIce(k, defId, { level, extraLevels: extra });
  cs.ice.push(ice);
  emit(k, { type: 'combat.iceSpawned', ice: ice.uid, def: defId, reason });
  fireIceTriggers(k, ice, 'fightStart');
  return ice;
}

function startPlayerTurn(k: K): void {
  const cs = cs_(k);
  const s = k.state;
  cs.turn++;
  // signature decay: programs not used last turn lose 1 stack
  for (const p of Object.values(cs.programs)) {
    p.usedLastTurn = p.usedThisTurn > 0;
    if (!p.usedLastTurn && p.stacks > 0) p.stacks--;
    p.usedThisTurn = 0;
    if (p.cooldown > 0) p.cooldown--;
  }
  cs.flowActive = cs.flowNext;
  cs.flowNext = false;
  let cycles = stat(k, 'cpu') + cs.bonusCycles + (cs.flowActive ? BALANCE.flow.bonusCycles : 0) - cs.status.tarred;
  if (cs.turn === 1) for (const m of modifiers(k)) if (m.mod === 'firstTurnCycles') cycles += m.add;
  cs.status.tarred = 0;
  cs.cycles = Math.max(0, cycles);
  cs.shield = stat(k, 'firewall');
  if (cs.turn === 1) for (const m of modifiers(k)) if (m.mod === 'shieldStart') cs.shield += m.add;
  cs.categories = [];
  cs.noise = 0;
  cs.botnetUsed = false;
  cs.comboRefunded = false;
  if (cs.status.burn > 0) {
    const b = cs.status.burn;
    s.player.neural = Math.max(0, s.player.neural - b);
    cs.status.burn--;
    emit(k, { type: 'combat.playerHit', amount: b, shield: 0, integrity: 0, neural: b, decoyed: false, source: 'burn' });
    if (playerDown(k)) return;
  }
  emit(k, { type: 'combat.turnStart', turn: cs.turn, cycles: cs.cycles, flow: cs.flowActive });
  if (cs.status.stunned > 0) {
    cs.status.stunned--;
    emit(k, { type: 'combat.notify', text: 'You are stunned. Turn lost.' });
    endTurn(k);
  }
}

/** Victory check: no hostile ICE left. */
export function checkVictory(k: K): void {
  const cs = k.state.combat;
  if (!cs || hostile(cs).length > 0 || cs.pending.length > 0) return;
  winCombat(k, 'victory');
}

function winCombat(k: K, result: 'victory' | 'offer'): void {
  const s = k.state;
  const cs = cs_(k);
  s.stats.fightsWon++;
  emit(k, { type: 'combat.ended', result, context: cs.context });
  if (cs.context === 'raid') {
    closeCombat(k, cs);
    endRaid(k, true);
    return;
  }
  if (cs.context === 'patch') {
    closeCombat(k, cs);
    k.state.meta.patchBroken = true;
    setFinale(k, 'patch_beaten');
    return;
  }
  if (cs.context === 'finale') setFinale(k, 'chairman_dead');
  // node fight: clear the node
  const run = s.run;
  if (run && cs.node) {
    const rn = run.nodes[cs.node];
    rn.ice = [];
    rn.state = 'cleared';
    closeCombat(k, cs);
    hooks.nodeCleared(k, cs.node);
  } else closeCombat(k, cs);
}

/** Defeat the current fight without combat (meta `kill`). */
export function forceVictory(k: K): void {
  const cs = k.state.combat;
  if (!cs) return;
  for (const i of hostile(cs)) {
    i.dead = true;
    i.core = 0;
    emit(k, { type: 'combat.iceDefeated', ice: i.uid, def: i.def });
  }
  cs.pending = [];
  winCombat(k, 'victory');
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

export function programBlockReason(c: Ctx, programId: Id): string | null {
  const cs = c.state.combat;
  if (!cs) return 'not in combat';
  const ps = cs.programs[programId];
  if (!ps) return 'program not loaded';
  if (ps.evicted) return 'evicted by garbage collection';
  if ((cs.status.scrambled[programId] ?? 0) > 0) return `scrambled (${cs.status.scrambled[programId]} turns)`;
  const def = c.content.programs[programId];
  if (!def) return 'unknown program';
  if (ps.cooldown > 0) return `cooldown ${ps.cooldown}`;
  const cost = programCost(c, programId);
  if (cs.cycles < cost) return `needs ${cost} cycles`;
  if (def.category === 'daemon' && def.daemon) {
    if (cs.daemons.some((d) => d.program === programId)) return 'daemon already running';
    const cap: number = BALANCE.combat.maxDaemons;
    if (cap > 0 && cs.daemons.length >= cap) return `${cap} daemon${cap === 1 ? '' : 's'} already running`;
  }
  if (def.targeting === 'ice' && hostile(cs).length === 0) return 'no target';
  return null;
}

/** RAM not used by the loadout. A daemon uses its RAM once, in the loadout: running it costs no extra RAM. */
export function freeRam(c: Ctx): number {
  const loaded = c.state.player.loadout.reduce((a, id) => a + (c.content.programs[id]?.ram ?? 0), 0);
  return stat(c, 'ram') - loaded;
}

export function runProgram(k: K, programId: Id, target: string | undefined): void {
  const cs = cs_(k);
  const why = programBlockReason(k, programId);
  if (why) reject(why);
  const def = programDef(k, programId);
  if (def.targeting === 'ice') {
    const t = target ? findIce(cs, target) : hostile(cs)[0];
    if (!t || t.dead || t.subverted) reject('invalid target');
    target = t.uid;
  }
  const ps = cs.programs[programId];
  const mult = signatureMult(ps.stacks);
  cs.cycles -= programCost(k, programId);
  if (!def.noSignature) ps.stacks++;
  ps.usedThisTurn++;
  ps.uses++;
  ps.cooldown = def.cooldown;
  cs.noise += programNoise(k, programId);
  const uses = (k.state.stats.programUses ??= {});
  uses[programId] = (uses[programId] ?? 0) + 1;
  cs.lastProgram = programId;
  if (!def.noFlow && !cs.categories.includes(def.category)) cs.categories.push(def.category);
  k.state.stats.programsRun++;
  emit(k, { type: 'combat.program', program: programId, target: target ?? null, mult, stacks: ps.stacks });
  if (def.category === 'daemon' && def.daemon) {
    cs.daemons.push({ program: programId, turnsLeft: def.daemon.turns > 0 ? def.daemon.turns : -1, ram: def.ram });
    emit(k, { type: 'combat.daemon', program: programId, started: true });
  }
  applyOps(k, def.ops, { side: 'player', program: programId, ...(target ? { target } : {}), mult });
  if (k.state.combat) emitFlowProgress(k);
  checkVictory(k);
}

function emitFlowProgress(k: K): void {
  const cs = cs_(k);
  emit(k, { type: 'combat.flow', earned: cs.categories.length >= flowNeeded(k), categories: cs.categories.length, needed: flowNeeded(k) });
}

export function botnetBlockReason(c: Ctx, kind: BotnetActionKind): string | null {
  const cs = c.state.combat;
  if (!cs) return 'not in combat';
  if (cs.context === 'patch') return 'your botnet is not yours anymore';
  if (cs.botnetUsed) return 'botnet already used this turn';
  if (cs.charges <= 0) return 'no botnet charges';
  if (usableBotnetPower(c) <= 0) return 'no botnet power (assign hosts to Botnet, buy an Uplink)';
  if (kind === 'bounce' && !c.state.run) return 'nothing to bounce';
  if (hostile(cs).length === 0) return 'no target';
  return null;
}

export function botnetPreview(c: Ctx, kind: BotnetActionKind): { power: number; damage?: number; hits?: number; trace?: number; burnChance: number } {
  const B = BALANCE.botnet;
  const power = usableBotnetPower(c);
  const burn = rigged(c) ? 0 : (B.burnBase + c.state.player.heat * B.burnPerHeat) * multMod(c, 'burnChance');
  switch (kind) {
    case 'dcrack': return { power, damage: Math.round(B.dcrackBase + B.dcrackPerPower * power), burnChance: burn };
    case 'swarm': return { power, hits: Math.min(B.swarmMaxHits, Math.max(1, Math.ceil(power * B.swarmHitsPerPower))), burnChance: burn };
    case 'bounce': return { power, trace: Math.round(B.bounceBase + B.bouncePerPower * power), burnChance: burn };
    default: return { power, burnChance: burn };
  }
}

export function useBotnet(k: K, kind: BotnetActionKind, target: string | undefined): void {
  const cs = cs_(k);
  const why = botnetBlockReason(k, kind);
  if (why) reject(why);
  const B = BALANCE.botnet;
  const pv = botnetPreview(k, kind);
  cs.botnetUsed = true;
  cs.charges--;
  emit(k, { type: 'combat.botnet', kind, power: pv.power, charges: cs.charges });
  const markedMult = (i: IceInstance) => (i.status.marked > 0 ? B.markedMult : 1);
  switch (kind) {
    case 'ddos':
      for (const i of hostile(cs)) addIceStatus(k, i, 'stunned', 1);
      break;
    case 'dcrack': {
      const t = (target ? findIce(cs, target) : undefined) ?? hostile(cs)[0];
      if (t && !t.dead) dealDamage(k, t, 'crack', pv.damage!, markedMult(t));
      break;
    }
    case 'swarm':
      for (let h = 0; h < pv.hits! && k.state.combat; h++) {
        const foes = hostile(cs);
        if (!foes.length) break;
        const t = pick(k.state, foes);
        dealDamage(k, t, 'spike', B.swarmHitDamage, markedMult(t));
      }
      break;
    case 'bounce':
      addTrace(k, -pv.trace!, 'bounce', true);
      break;
  }
  if (rand(k.state) < pv.burnChance) {
    burnRandomHost(k, k.state.player.hosts.filter((h) => h.role === 'botnet'));
  }
  checkVictory(k);
}

export function answerDemand(k: K): void {
  const cs = cs_(k);
  if (!cs.demand) reject('nothing to answer');
  const id = cs.demand.id;
  cs.demand = null;
  emit(k, { type: 'combat.demandAnswered', id });
}

export function acceptOffer(k: K): void {
  const cs = cs_(k);
  if (!cs.offer) reject('no offer on the table');
  if (k.state.player.credits < cs.offer.credits) reject(`needs ${cs.offer.credits} ¤`);
  addCredits(k, -cs.offer.credits, cs.offer.id);
  for (const i of hostile(cs)) {
    i.dead = true;
    emit(k, { type: 'combat.iceDefeated', ice: i.uid, def: i.def });
  }
  cs.pending = [];
  winCombat(k, 'offer');
}

// ---------------------------------------------------------------------------
// End turn / ICE turn
// ---------------------------------------------------------------------------

export function endTurn(k: K, leaving = false): void {
  const cs = cs_(k);
  const s = k.state;
  // unanswered demand
  if (cs.demand) {
    const d = cs.demand;
    cs.demand = null;
    emit(k, { type: 'combat.notify', text: `Unanswered: ${d.id}.` });
    applyOps(k, d.penalty, d.source === 'player' ? { side: 'player' } : { side: 'ice', uid: d.source });
    if (!s.combat || playerDown(k)) return;
  }
  // daemons
  for (const d of cs.daemons.slice()) {
    const def = programDef(k, d.program);
    if (def.daemon) {
      const foes = hostile(cs);
      const target = foes.length ? pick(s, foes).uid : undefined;
      applyOps(k, def.daemon.ops, { side: 'player', program: d.program, ...(target ? { target } : {}) });
      if (!s.combat) return;
    }
    if (d.turnsLeft > 0) {
      d.turnsLeft--;
      if (d.turnsLeft === 0) {
        cs.daemons = cs.daemons.filter((x) => x !== d);
        emit(k, { type: 'combat.daemon', program: d.program, started: false });
      }
    }
  }
  checkVictory(k);
  if (!s.combat) return;
  // flow
  const needed = flowNeeded(k);
  if (cs.categories.length >= needed) {
    cs.flowNext = true;
    emit(k, { type: 'combat.flow', earned: true, categories: cs.categories.length, needed });
  }
  // trace for this turn
  if (s.run) addTrace(k, turnTraceGain(k), 'turn', true);
  cs.status.masked = 0;
  if (s.run && s.run.trace >= BALANCE.trace.max) return; // settle() handles traced
  iceTurn(k);
  if (!s.combat || playerDown(k)) return;
  if (s.run) {
    hooks.advanceCycles(k, 1);
    if (s.run.trace >= BALANCE.trace.max) return;
  }
  if (leaving) {
    emit(k, { type: 'combat.ended', result: 'jackedOut', context: cs.context });
    endRun(k, 'jackout', true);
    return;
  }
  startPlayerTurn(k);
}

function iceTurn(k: K): void {
  const cs = cs_(k);
  const s = k.state;
  for (const ice of hostile(cs)) {
    if (!s.combat || playerDown(k)) return;
    if (ice.dead || ice.subverted) continue;
    fireIceTriggers(k, ice, 'turnStart');
    if (!s.combat || ice.dead) continue;
    if (ice.status.stunned > 0) {
      ice.status.stunned--;
      emit(k, { type: 'combat.iceAct', ice: ice.uid, intent: ice.intent ?? '', label: 'stunned', skipped: 'stunned' });
      continue;
    }
    if (ice.status.slowed > 0) {
      ice.status.slowed--;
      emit(k, { type: 'combat.iceAct', ice: ice.uid, intent: ice.intent ?? '', label: 'slowed', skipped: 'slowed' });
      continue;
    }
    const intent = currentIntent(k, ice);
    ice.turns++;
    if (intent) {
      emit(k, { type: 'combat.iceAct', ice: ice.uid, intent: intent.id, label: intent.label, skipped: null });
      applyOps(k, intent.ops, { side: 'ice', uid: ice.uid });
    }
    if (!s.combat) return;
    if (!ice.dead) {
      fireIceTriggers(k, ice, 'turnEnd');
      const def = iceDef(k, ice.def);
      const script = def.script ? k.content.iceScripts?.[def.script] : undefined;
      script?.onTurnEnd?.(iceApi(k, ice));
      if (!ice.dead && s.combat) chooseIntent(k, ice);
    }
  }
  if (!s.combat || playerDown(k)) return;
  // subverted ICE fight for you
  for (const ally of cs.ice.filter((i) => i.subverted && !i.dead)) {
    const foes = hostile(cs);
    if (!foes.length) break;
    const def = iceDef(k, ally.def);
    const dmg = def.rootedDamage ?? BALANCE.ice.rootedDamageBase + BALANCE.ice.rootedDamagePerLevel * ally.level;
    rawCoreDamage(k, pick(s, foes), dmg);
    if (!s.combat) return;
  }
  endOfIceTurnTicks(k);
}

function endOfIceTurnTicks(k: K): void {
  const cs = cs_(k);
  const s = k.state;
  // stacks that jump to a new host this tick start ticking next turn
  const infectedNow = new Set(cs.ice.filter((i) => i.status.infected > 0).map((i) => i.uid));
  for (const ice of cs.ice) {
    if (ice.dead) continue;
    const st = ice.status;
    if (st.infected > 0 && !ice.subverted && infectedNow.has(ice.uid)) {
      const n = st.infected;
      if (!(hasMod(k, 'infectedSlowDecay') && cs.turn % 2 === 1)) st.infected--;
      rawCoreDamage(k, ice, n);
      if (!s.combat) return;
    }
    if (st.backdoored > 0) {
      st.backdoored--;
      if (st.backdoored === 0) {
        st.rootable = true;
        emit(k, { type: 'combat.iceStatus', target: ice.uid, status: 'rootable', value: 1 });
      }
    }
    if (st.exposed > 0) st.exposed--;
    if (st.marked > 0) st.marked--;
    if (st.mapped > 0 && st.mapped < BALANCE.ice.permanentMapped) {
      st.mapped--;
      if (st.mapped === 0) st.critReady = false;
    }
  }
  // player status ticks
  const ps = cs.status;
  if (ps.anchored > 0) ps.anchored--;
  if (ps.labelsScrambled > 0) ps.labelsScrambled--;
  for (const id of Object.keys(ps.scrambled)) {
    ps.scrambled[id]--;
    if (ps.scrambled[id] <= 0) delete ps.scrambled[id];
  }
  // reinforcements
  for (const p of cs.pending.slice()) {
    p.turns--;
    if (p.turns <= 0) {
      cs.pending = cs.pending.filter((x) => x !== p);
      if (s.run?.securityCaptured) emit(k, { type: 'combat.notify', text: 'Reinforcements blocked: Security is yours.' });
      else spawnIce(k, p.ice, p.level, 'reinforcement');
    }
  }
  // hunter ICE at Alarm
  const run = s.run;
  if (run && !cs.hunterJoined && !run.securityCaptured && cs.context === 'node'
    && run.trace >= BALANCE.trace.alarm && cs.turn >= BALANCE.ice.hunterJoinTurn) {
    cs.hunterJoined = true;
    const tier = systemDef(k, run.system).tier;
    const H = k.content.setup.hunterIce;
    if (H.length) {
      const id = H[clamp(tier - 1, 0, H.length - 1)];
      const ice = spawnIce(k, id, iceDef(k, id).level + Math.max(0, tier - 1), 'hunter');
      if (ice) log(k, `${ice.name} joins the fight.`, 'combat');
    }
  }
  checkVictory(k);
}

// ---------------------------------------------------------------------------
// Leaving
// ---------------------------------------------------------------------------

export function disengage(k: K): void {
  const cs = cs_(k);
  const s = k.state;
  if (cs.context !== 'node') reject('cannot disengage from this fight');
  const noOut = s.run ? systemDef(k, s.run.system).noJackOut : undefined;
  if (noOut) reject(noOut);
  if (cs.status.anchored > 0) reject('Anchored');
  if (cs.cycles < BALANCE.combat.disengageCost) reject(`needs ${BALANCE.combat.disengageCost} cycles`);
  const run = s.run!;
  const rn = run.nodes[cs.node!];
  const R = BALANCE.ice.disengageRecover;
  rn.ice = cs.ice.filter((i) => !i.dead && !i.subverted).map((i) => {
    i.core = Math.min(i.coreMax, Math.round(i.core + (i.coreMax - i.core) * R));
    i.shell.points = Math.min(i.shell.max, Math.round(i.shell.points + (i.shell.max - i.shell.points) * R));
    i.status = emptyIceStatus();
    return i;
  });
  if (rn.ice.length === 0) rn.state = 'cleared';
  s.stats.disengages++;
  emit(k, { type: 'combat.ended', result: 'disengaged', context: cs.context });
  closeCombat(k, cs);
  if (run.previous) {
    run.position = run.previous;
  }
  hooks.advanceCycles(k, 1);
}

export function combatJackOut(k: K): void {
  const cs = cs_(k);
  if (cs.context === 'raid' || cs.context === 'patch') reject('there is nowhere to hang up to');
  const noOut = k.state.run ? systemDef(k, k.state.run.system).noJackOut : undefined;
  if (noOut) reject(noOut);
  if (cs.status.anchored > 0) reject('Anchored');
  cs.cycles = 0;
  endTurn(k, true);
}

// ---------------------------------------------------------------------------
// Raid (§8)
// ---------------------------------------------------------------------------

export function startRaid(k: K): void {
  const s = k.state;
  const R = k.content.setup.raidIce;
  const tier = clamp(Math.floor((s.player.rep - 1) / 2), 0, R.length - 1);
  const ids = R[tier] ?? [];
  s.player.integrity = stat(k, 'chassis');
  log(k, 'RAID. They found your deck.', 'warn');
  emit(k, { type: 'raid.started', ice: ids });
  const ice = ids.map((id) => makeIce(k, id));
  startCombat(k, { context: 'raid', node: null, ice, ambush: false, charges: chargesPerRun(k) });
}

export function endRaid(k: K, won: boolean): void {
  const s = k.state;
  let lostPart: HardwarePart | null = null;
  let lostCredits = 0;
  if (won) s.stats.raidsWon++;
  else {
    s.stats.raidsLost++;
    const parts = HARDWARE_PARTS.filter((p) => s.player.hardware[p] > 0);
    if (parts.length) {
      lostPart = pick(s, parts);
      s.player.hardware[lostPart]--;
      emit(k, { type: 'hardware.changed', part: lostPart, tier: s.player.hardware[lostPart] });
    }
    lostCredits = Math.round(s.player.credits * BALANCE.raid.creditLoss);
    addCredits(k, -lostCredits, 'raid');
  }
  s.combat = null;
  s.player.integrity = stat(k, 'chassis');
  s.player.neural = Math.min(s.player.neural, stat(k, 'neural'));
  setHeat(k, BALANCE.heat.raidResetTo);
  emit(k, { type: 'raid.ended', won, lostPart, lostCredits });
}

/** Called by settle() when integrity hits 0 in a raid. */
export function raidLost(k: K): void {
  const cs = k.state.combat;
  if (cs) {
    k.state.stats.fightsLost++;
    emit(k, { type: 'combat.ended', result: 'dumped', context: 'raid' });
  }
  endRaid(k, false);
}
