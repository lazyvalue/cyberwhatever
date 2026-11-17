// Read-only selectors for the UI, meta layer and sim. All take a Ctx ({ state, content }); an Engine is a Ctx.
import { BALANCE } from './balance.ts';
import { stat, systemDef, iceDef, modifiers, HARDWARE_PARTS, hardwareDef, maxHardwareTier, hasSystem } from './core.ts';
import {
  hostile, findIce, currentIntent, isMapped, signatureMult, flowNeeded, programBlockReason, botnetBlockReason,
  botnetPreview, computeDamage, playerDamageMult, freeRam, programCost, programNoise, evalIceCond,
} from './combat.ts';
import { turnTraceGain, traceLevel } from './trace.ts';
import { heatLevel, botnetPower, usableBotnetPower, chargesPerRun, miningPower, proxyPower, hostPower } from './world.ts';
import { sneakChance, isAccessible, nodeActionBlockReason, jackInBlockReason, gateBlockReason, gateNeeded, nodeDef, adjacency } from './run.ts';
import { controlPct, evalCond, jobStatus, objectiveDone, dialogueChoices, currentDialogueNode, interpolate } from './story.ts';
import {
  vendorStock, loadoutBlockReason, exchangeBlockReason, neuralHealCost, scrubCostPerPoint, saleValue,
  decryptStrength, cleanCost, repairCost,
} from './hub.ts';
import { rootKeyString, patchFightSpec } from './meta.ts';
import type {
  Action, BotnetActionKind, CombatOp, Ctx, DamageKind, HardwarePart, Id, IceInstance, IntentClass,
  NodeActionType, ProgramCategory,
} from './types.ts';

export {
  sneakChance, controlPct, vendorStock, heatLevel, traceLevel, botnetPower, usableBotnetPower, chargesPerRun,
  isAccessible, evalCond, jobStatus, dialogueChoices, rootKeyString, patchFightSpec, saleValue, neuralHealCost,
  scrubCostPerPoint, cleanCost, repairCost, decryptStrength, freeRam, botnetPreview, signatureMult, programCost, programNoise,
};

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

export type Screen = 'hub' | 'run' | 'combat' | 'flatlined' | 'ending';

/** Which main screen to show. Overlays (dialogue, perk choice) are separate: see dialogueView, pendingPerks. */
export function screen(c: Ctx): Screen {
  const s = c.state;
  if (s.mode === 'flatlined') return 'flatlined';
  if (s.mode === 'ending') return 'ending';
  if (s.combat) return 'combat';
  if (s.run) return 'run';
  return 'hub';
}

export type HumanityTier = 'warm' | 'cold' | 'unit';
/** §4: below 40 flavor adjectives vanish; below 20 the HUD calls you UNIT. */
export function humanityTier(c: Ctx): HumanityTier {
  const h = c.state.player.humanity;
  if (h < BALANCE.humanity.unit) return 'unit';
  if (h < BALANCE.humanity.cold) return 'cold';
  return 'warm';
}

export function displayHandle(c: Ctx): string {
  return humanityTier(c) === 'unit' ? 'UNIT' : c.state.player.handle;
}

/** Psychotrope: the UI should scramble program labels while this is true. */
export function labelsScrambled(c: Ctx): boolean {
  return (c.state.combat?.status.labelsScrambled ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Deck / player
// ---------------------------------------------------------------------------

export interface DeckPartView {
  part: HardwarePart;
  tier: number;
  maxTier: number;
  name: string;
  value: number;      // stat including modifiers
  flavor?: string;
}

export function deck(c: Ctx): DeckPartView[] {
  return HARDWARE_PARTS.map((part) => {
    const tier = c.state.player.hardware[part];
    const def = hardwareDef(c, part, tier);
    return { part, tier, maxTier: maxHardwareTier(c, part), name: def?.name ?? `${part} t${tier}`, value: stat(c, part), ...(def?.flavor ? { flavor: def.flavor } : {}) };
  });
}

export function deckStat(c: Ctx, part: HardwarePart): number {
  return stat(c, part);
}

export function ramUsed(c: Ctx): number {
  return c.state.player.loadout.reduce((a, id) => a + (c.content.programs[id]?.ram ?? 0), 0);
}

export function xpProgress(c: Ctx): { rep: number; xp: number; current: number; next: number | null } {
  const t = BALANCE.xp.table;
  const rep = c.state.player.rep;
  return { rep, xp: c.state.player.xp, current: t[rep - 1] ?? 0, next: rep < t.length ? t[rep] : null };
}

export function activeModifiers(c: Ctx) {
  return modifiers(c);
}

// ---------------------------------------------------------------------------
// Botnet / economy
// ---------------------------------------------------------------------------

export function botnetView(c: Ctx) {
  const E = BALANCE.economy;
  return {
    hosts: c.state.player.hosts.map((h) => ({ ...h, effectivePower: hostPower(c, h) })),
    botnetPower: botnetPower(c),
    usablePower: usableBotnetPower(c),
    powerCap: stat(c, 'uplink') * BALANCE.botnet.uplinkPowerPerPoint,
    chargesPerRun: chargesPerRun(c),
    miningPower: miningPower(c),
    coinPerCycle: miningPower(c) * E.coinPerPowerPerCycle,
    proxyPower: proxyPower(c),
  };
}

export function economyView(c: Ctx) {
  const w = c.state.world;
  return {
    credits: c.state.player.credits,
    frozenCredits: c.state.player.frozenCredits,
    coin: c.state.player.coin,
    coinPrice: w.coinPrice,
    coinHistory: w.coinHistory,
    coinValue: Math.round(c.state.player.coin * w.coinPrice),
    exchange: exchangeBlockReason(c),
    pumpReadyAt: w.pumpReadyAt,
  };
}

export function paydataView(c: Ctx) {
  return c.state.player.paydata.map((p) => ({
    ...p,
    saleValue: saleValue(c, p),
    cleanCost: p.tagged ? cleanCost(p) : 0,
    canDecrypt: p.encrypted > 0 && decryptStrength(c) >= p.encrypted,
    jobTarget: Object.values(c.content.jobs).some((j) => j.objectives.some((o) => o.kind === 'deliver' && o.file === p.file)),
  }));
}

// ---------------------------------------------------------------------------
// Addresses, jobs, dialogue
// ---------------------------------------------------------------------------

export function addressBook(c: Ctx) {
  return Object.values(c.state.world.addressBook).map((e) => {
    const sys = systemDef(c, e.system);
    const p = c.state.world.systems[e.system];
    return {
      ...e,
      address: sys.address,
      name: sys.name,
      tier: sys.tier,
      security: sys.security,
      owner: sys.owner,
      description: sys.description,
      motd: sys.motd ?? null,
      owned: !!p?.owned,
      hardened: !!p && c.state.cycle < p.hardenedUntil,
      hardenedUntil: p?.hardenedUntil ?? 0,
      patch: p?.patch ?? 0,
      runs: p?.runs ?? 0,
      procedural: !!sys.procedural,
      gate: sys.gate ? { ...sys.gate, needed: gateNeeded(c, e.system) } : null,
      gateBlocked: gateBlockReason(c, e.system), // non-null: dialing in will only emit gate.denied
      jackIn: jackInBlockReason(c, e.system),
    };
  });
}

export function jobsView(c: Ctx) {
  return Object.values(c.content.jobs)
    .map((j) => ({
      ...j,
      status: jobStatus(c, j.id),
      objectivesDone: j.objectives.map((o) => objectiveDone(c, o)),
    }))
    .filter((j) => j.status !== 'locked');
}

export function dialogueView(c: Ctx) {
  const ds = c.state.dialogue;
  if (!ds) return null;
  const d = c.content.dialogues[ds.id];
  const node = currentDialogueNode(c)!;
  const cold = humanityTier(c) !== 'warm';
  const speaker = node.speaker ?? d.speaker;
  const v = node.variants?.find((x) => evalCond(c, x.cond));
  const base = v ? (cold && v.textCold ? v.textCold : v.text) : cold && node.textCold ? node.textCold : node.text;
  return {
    id: ds.id,
    node: ds.node,
    speaker,
    speakerName: c.content.npcs[speaker]?.name ?? speaker,
    text: interpolate(c, base),
    choices: dialogueChoices(c).map((ch) => ({ ...ch, text: interpolate(c, ch.text) })),
  };
}

const KIND_ORDER = { main: 0, side: 1, tutorial: 2 } as const;

/** Tracked objectives (main, then side, then tutorial; each by cycle added), with {n}/{x} filled from n/max. Hidden ones are left out. */
export function objectivesView(c: Ctx) {
  return Object.values(c.state.story.objectives)
    .filter((o) => o.status !== 'hidden')
    .sort((a, b) => (a.kind === b.kind ? a.cycle - b.cycle : KIND_ORDER[a.kind] - KIND_ORDER[b.kind]))
    .map((o) => ({
      id: o.id, kind: o.kind, status: o.status, n: o.n ?? null, max: o.max ?? null,
      anchor: o.anchor ?? null, speaker: o.speaker ?? null,
      text: o.text.replace(/\{n\}/g, String(o.n ?? '')).replace(/\{x\}/g, String(o.max ?? '')),
    }));
}

export function unreadMessages(c: Ctx): number {
  return c.state.messages.filter((m) => !m.read).length;
}

// ---------------------------------------------------------------------------
// Run / map
// ---------------------------------------------------------------------------

const NODE_ACTIONS: NodeActionType[] = [
  'run/probe', 'run/sneak', 'run/breach', 'run/backdoor', 'run/unlock', 'run/loot', 'run/capture', 'run/use', 'run/talk', 'run/netscan',
]; // run/enter still works but is never needed: open nodes on the way are passed through automatically

export function mapView(c: Ctx) {
  const run = c.state.run;
  if (!run) return null;
  const sys = systemDef(c, run.system);
  const adj = adjacency(sys);
  return {
    system: sys.id,
    address: sys.address,
    name: sys.name,
    tier: sys.tier,
    security: sys.security,
    motd: sys.motd ?? null,
    trace: run.trace,
    traceLevel: traceLevel(run.trace),
    position: run.position,
    haul: run.haul,
    storage: stat(c, 'storage'),
    charges: run.charges,
    securityCaptured: run.securityCaptured,
    nodes: sys.nodes.map((nd) => {
      const rn = run.nodes[nd.id];
      return {
        id: nd.id,
        type: rn.revealed ? (rn.probed || nd.type !== 'honeypot' ? nd.type : 'datastore') : 'unknown',
        realType: nd.type,
        name: rn.revealed ? nd.name : '???',
        description: rn.revealed ? nd.description ?? '' : '',
        x: nd.x,
        y: nd.y,
        links: adj[nd.id],
        revealed: rn.revealed,
        probed: rn.probed,
        state: rn.state,
        sealed: rn.sealed,
        accessible: isAccessible(c, nd.id),
        // ICE details are visible once probed or once you have fought it
        ice: rn.ice.map((i) => ({
          uid: i.uid,
          def: i.def,
          name: rn.probed ? i.name : 'ICE',
          known: rn.probed,
          level: rn.probed ? i.level : null,
          shell: rn.probed ? i.shell : null,
          core: rn.probed ? i.core : null,
          coreMax: rn.probed ? i.coreMax : null,
          black: !!iceDef(c, i.def).black, // black ICE is always labelled
        })),
        sneakChance: rn.ice.length ? sneakChance(c, nd.id) : null,
        actions: NODE_ACTIONS.map((a) => ({ type: a, reason: nodeActionBlockReason(c, a, nd.id) })),
        lockLabel: nd.lock?.label ?? null,
        useLabel: nd.use?.label ?? null,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export function signature(c: Ctx, programId: Id): { stacks: number; mult: number } {
  const ps = c.state.combat?.programs[programId];
  const stacks = ps?.stacks ?? 0;
  return { stacks, mult: signatureMult(stacks) };
}

export interface ProgramButton {
  id: Id;
  name: string;
  category: ProgramCategory;
  cost: number;
  cooldown: number;
  cooldownLeft: number;
  noise: number;
  ram: number;
  stacks: number;
  mult: number;
  targeting: 'ice' | 'none';
  blocked: string | null;
  scrambled: number;
  evicted: boolean;
  description: string;
}

export function programButtons(c: Ctx): ProgramButton[] {
  const cs = c.state.combat;
  return c.state.player.loadout.filter((id) => !c.state.player.programs[id]?.corrupted).map((id) => {
    const d = c.content.programs[id];
    const ps = cs?.programs[id];
    const stacks = ps?.stacks ?? 0;
    return {
      id, name: d.name, category: d.category, cost: programCost(c, id), cooldown: d.cooldown, cooldownLeft: ps?.cooldown ?? 0,
      noise: programNoise(c, id), ram: d.ram, stacks, mult: signatureMult(stacks), targeting: d.targeting,
      blocked: cs ? programBlockReason(c, id) : 'not in combat',
      scrambled: cs?.status.scrambled[id] ?? 0, evicted: !!ps?.evicted, description: d.description,
    };
  });
}

export interface IntentView {
  ice: string;
  mapped: boolean;
  class: IntentClass;
  label: string | null;        // null when not Mapped
  damage: number | null;       // total expected hit damage (Mapped only)
  neural: boolean;
  trace: number;               // trace this intent adds (Mapped only)
  skipped: 'stunned' | 'slowed' | null;
}

function sumOps(ops: CombatOp[], bonus: number): { damage: number; neural: boolean; trace: number } {
  let damage = 0;
  let neural = false;
  let trace = 0;
  for (const op of ops) {
    if (op.op === 'hit' || op.op === 'damage') {
      damage += (op.amount + bonus * BALANCE.ice.perLevelHit) * (op.hits ?? 1);
      if (op.op === 'hit' && op.neural) neural = true;
    } else if (op.op === 'trace') trace += op.amount;
    else if (op.op === 'chance' || op.op === 'ifIce') {
      const sub = sumOps(op.ops, bonus);
      damage += sub.damage;
      neural ||= sub.neural;
      trace += sub.trace;
    }
  }
  return { damage, neural, trace };
}

export function intentView(c: Ctx, ice: IceInstance): IntentView {
  const intent = currentIntent(c, ice);
  const mapped = isMapped(c, ice);
  const sums = intent ? sumOps(intent.ops, ice.bonus) : { damage: 0, neural: false, trace: 0 };
  const skipped = ice.status.stunned > 0 ? 'stunned' : ice.status.slowed > 0 ? 'slowed' : null;
  return {
    ice: ice.uid,
    mapped,
    class: intent?.class ?? 'unknown',
    label: mapped ? intent?.label ?? 'idle' : null,
    damage: mapped ? sums.damage : null,
    neural: mapped ? sums.neural : iceDef(c, ice.def).black ? true : false,
    trace: mapped ? sums.trace : 0,
    skipped,
  };
}

export function combatView(c: Ctx) {
  const cs = c.state.combat;
  if (!cs) return null;
  return {
    context: cs.context,
    turn: cs.turn,
    cycles: cs.cycles,
    shield: cs.shield,
    integrity: c.state.player.integrity,
    integrityMax: stat(c, 'chassis'),
    neural: c.state.player.neural,
    neuralMax: stat(c, 'neural'),
    status: cs.status,
    flow: { categories: cs.categories, used: cs.categories.length, needed: flowNeeded(c), active: cs.flowActive, next: cs.flowNext },
    charges: cs.charges,
    botnetUsed: cs.botnetUsed,
    demand: cs.demand,
    offer: cs.offer,
    pending: cs.pending,
    daemons: cs.daemons,
    freeRam: freeRam(c),
    projectedTrace: projectedTrace(c),
    labelsScrambled: cs.status.labelsScrambled > 0,
    ice: cs.ice.filter((i) => !i.dead).map((i) => {
      const d = iceDef(c, i.def);
      return {
        ...i,
        black: !!d.black,
        boss: !!d.boss,
        undefeatable: !!d.undefeatable,
        description: d.description,
        intent: intentView(c, i),
        phaseCount: d.phases?.length ?? 0,
      };
    }),
    programs: programButtons(c),
    botnet: (['ddos', 'dcrack', 'swarm', 'bounce'] as BotnetActionKind[]).map((kind) => ({
      kind, blocked: botnetBlockReason(c, kind), ...botnetPreview(c, kind),
    })),
    disengage: disengageBlockReason(c),
    jackOut: combatJackOutBlockReason(c),
  };
}

export function disengageBlockReason(c: Ctx): string | null {
  const cs = c.state.combat;
  if (!cs) return 'not in combat';
  if (cs.context !== 'node') return 'cannot disengage from this fight';
  const noOut = c.state.run ? systemDef(c, c.state.run.system).noJackOut : undefined;
  if (noOut) return noOut;
  if (cs.status.anchored > 0) return 'Anchored';
  if (cs.cycles < BALANCE.combat.disengageCost) return `needs ${BALANCE.combat.disengageCost} cycles`;
  return null;
}

export function combatJackOutBlockReason(c: Ctx): string | null {
  const cs = c.state.combat;
  if (!cs) return 'not in combat';
  if (cs.context === 'raid' || cs.context === 'patch') return 'there is nowhere to hang up to';
  const noOut = c.state.run ? systemDef(c, c.state.run.system).noJackOut : undefined;
  if (noOut) return noOut;
  if (cs.status.anchored > 0) return 'Anchored';
  return null;
}

/** Projected trace gain at End Turn: formula + trace from Mapped ICE intents (unmapped intents are unknown). */
export function projectedTrace(c: Ctx): { formula: number; ice: number; total: number; unknown: boolean } {
  const cs = c.state.combat;
  const formula = turnTraceGain(c);
  if (!cs || !c.state.run) return { formula, ice: 0, total: formula, unknown: false };
  let ice = 0;
  let unknown = false;
  for (const i of hostile(cs)) {
    const v = intentView(c, i);
    if (v.skipped) continue;
    if (!v.mapped) unknown = true;
    else ice += v.trace;
  }
  const mult = c.state.run.securityCaptured ? BALANCE.trace.securityCapturedMult : 1;
  return { formula, ice: ice * mult, total: Math.round((formula + ice * mult) * 10) / 10, unknown };
}

export interface DamagePreview {
  kind: DamageKind;
  min: { shell: number; core: number };
  max: { shell: number; core: number };
  infected: number;
  crit: boolean;
  mult: number;
  reflected: number;
  kills: boolean;
}

/** Damage preview for each damage op of a program against one ICE (first hit only for multi-hit ops, times hits). */
export function damagePreview(c: Ctx, programId: Id, iceUid: string): DamagePreview[] {
  const cs = c.state.combat;
  const def = c.content.programs[programId];
  if (!cs || !def) return [];
  const ice = findIce(cs, iceUid);
  if (!ice) return [];
  const sig = signatureMult(cs.programs[programId]?.stacks ?? 0);
  const reflect = iceDef(c, ice.def).reflect;
  const out: DamagePreview[] = [];
  const walk = (ops: CombatOp[]) => {
    for (const op of ops) {
      if (op.op === 'chance') walk(op.ops);
      if (op.op === 'ifIce') walk(evalIceCond(c, ice, op.cond, false) ? op.ops : op.else ?? []);
      if (op.op !== 'damage' || (op.to && op.to !== 'target')) continue;
      const mult = sig * playerDamageMult(c, op.kind);
      const hits = op.hits ?? 1;
      const over = op.overflow ? ice.status.unstable * op.overflow : 0;
      const lo = computeDamage(ice, op.kind, op.amount + over, mult, reflect);
      const hi = computeDamage(ice, op.kind, op.amount + (op.spread ?? 0) + over, mult, reflect);
      const coreMax = hi.core * hits + Math.max(0, hi.shell * hits - ice.shell.points);
      out.push({
        kind: op.kind,
        min: { shell: lo.shell * hits, core: lo.core * hits },
        max: { shell: hi.shell * hits, core: hi.core * hits },
        infected: hi.infected * hits,
        crit: lo.crit,
        mult: Math.round(mult * (lo.crit ? BALANCE.crit : 1) * 100) / 100,
        reflected: hi.reflected,
        kills: !iceDef(c, ice.def).undefeatable && coreMax >= ice.core,
      });
    }
  };
  walk(def.ops);
  return out;
}

// ---------------------------------------------------------------------------
// Legality
// ---------------------------------------------------------------------------

export type Check = { ok: true } | { ok: false; reason: string };

function chk(reason: string | null): Check {
  return reason ? { ok: false, reason } : { ok: true };
}

/** Global gating applied before any handler (mode, dialogue, ending). Shared with dispatch. */
export function gateReason(c: Ctx, a: Action): string | null {
  const s = c.state;
  const t = a.type;
  if (t === 'debug/set' || t.startsWith('meta/') || t === 'ui/cinematicDone' || t === 'ui/log' || t === 'message/read') return null;
  if (s.cinematic) return `cinematic playing (${s.cinematic.id}): dispatch ui/cinematicDone`;
  if (t === 'ui/hintDone') return null; // any mode, in combat and during dialogue
  if (s.mode === 'flatlined') return 'flatlined: load the checkpoint';
  if (s.mode === 'ending') return t === 'endless/continue' ? null : 'the game is over';
  if (t === 'endless/continue') return 'not at an ending';
  if (s.dialogue) return t === 'dialogue/choose' ? null : 'finish the conversation first';
  if (!s.dialogue && t === 'dialogue/choose') return 'no dialogue open';
  if (s.combat && !t.startsWith('combat/') && t !== 'perk/choose') return 'in combat';
  if (!s.combat && t.startsWith('combat/')) return 'not in combat';
  return null;
}

/**
 * Fast legality check with a reason. Exact for combat, run, jack-in, shop, loadout and job actions.
 * Other actions only get the global gate check here; dispatch is the final authority.
 */
export function canDo(c: Ctx, a: Action): Check {
  const g = gateReason(c, a);
  if (g) return { ok: false, reason: g };
  const s = c.state;
  switch (a.type) {
    case 'combat/program': {
      const why = programBlockReason(c, a.program);
      if (why) return chk(why);
      if (c.content.programs[a.program]?.targeting === 'ice' && a.target) {
        const t = findIce(s.combat!, a.target);
        if (!t || t.dead || t.subverted) return chk('invalid target');
      }
      return { ok: true };
    }
    case 'combat/botnet': return chk(botnetBlockReason(c, a.kind));
    case 'combat/endTurn': return { ok: true };
    case 'combat/disengage': return chk(disengageBlockReason(c));
    case 'combat/jackOut': return chk(combatJackOutBlockReason(c));
    case 'combat/answerDemand': return chk(s.combat?.demand ? null : 'nothing to answer');
    case 'combat/acceptOffer': {
      const o = s.combat?.offer;
      if (!o) return chk('no offer on the table');
      return chk(s.player.credits < o.credits ? `needs ${o.credits} ¤` : null);
    }
    case 'run/enter': return chk(nodeActionBlockReason(c, a.type, a.node));
    case 'run/jackOut': return chk(!s.run ? 'not in a run' : systemDef(c, s.run.system).noJackOut ?? null);
    case 'hub/jackIn': return chk(jackInBlockReason(c, a.system));
    case 'loadout/set': return chk(s.mode !== 'hub' ? 'only in the hub' : loadoutBlockReason(c, a.programs));
    case 'loadout/add': return chk(s.mode !== 'hub' ? 'only in the hub' : loadoutBlockReason(c, [...s.player.loadout, a.program]));
    case 'loadout/remove': return chk(s.player.loadout.includes(a.program) ? null : 'not loaded');
    case 'shop/buy': {
      const v = vendorStock(c, a.vendor).find((x) => x.id === a.stock);
      if (s.mode !== 'hub') return chk('only in the hub');
      return chk(!v ? 'not in stock' : v.reason ?? null);
    }
    case 'job/accept': {
      const st = jobStatus(c, a.job);
      if (st !== 'available') return chk('job is not available');
      const j = c.content.jobs[a.job];
      return chk(s.player.rep < (j?.minRep ?? 0) ? `needs rep ${j.minRep}` : null);
    }
    case 'job/turnIn': return chk(jobStatus(c, a.job) === 'ready' ? null : 'objectives not complete');
    case 'perk/choose': return chk(s.player.pendingPerks?.includes(a.perk) ? null : 'perk not offered');
    case 'exchange/pump':
    case 'exchange/dump': return chk(exchangeBlockReason(c));
    default:
      if ((NODE_ACTIONS as string[]).includes(a.type)) return chk(nodeActionBlockReason(c, a.type, (a as { node: Id }).node));
      return { ok: true };
  }
}

/**
 * Enumerate the actions that are legal right now (for the sim and for keyboard UIs).
 * Hub enumeration covers jack-in, jobs, perks, loadout swaps are not enumerated (combinatorial).
 */
export function legalActions(c: Ctx): Action[] {
  const s = c.state;
  const out: Action[] = [];
  const push = (a: Action) => { if (canDo(c, a).ok) out.push(a); };
  if (s.cinematic) return [{ type: 'ui/cinematicDone', id: s.cinematic.id }];
  if (s.mode === 'flatlined') return out;
  if (s.mode === 'ending') {
    if (s.endless) push({ type: 'endless/continue' });
    return out;
  }
  if (s.dialogue) {
    for (const ch of dialogueChoices(c)) if (ch.enabled) out.push({ type: 'dialogue/choose', index: ch.index });
    return out;
  }
  if (s.player.pendingPerks) for (const p of s.player.pendingPerks) out.push({ type: 'perk/choose', perk: p });
  const cs = s.combat;
  if (cs) {
    const foes = hostile(cs);
    for (const id of Object.keys(cs.programs)) {
      const d = c.content.programs[id];
      if (d.targeting === 'ice') for (const f of foes) push({ type: 'combat/program', program: id, target: f.uid });
      else push({ type: 'combat/program', program: id });
    }
    for (const kind of ['ddos', 'dcrack', 'swarm', 'bounce'] as BotnetActionKind[]) {
      if (kind === 'dcrack') for (const f of foes) push({ type: 'combat/botnet', kind, target: f.uid });
      else push({ type: 'combat/botnet', kind });
    }
    push({ type: 'combat/answerDemand' });
    push({ type: 'combat/acceptOffer' });
    push({ type: 'combat/disengage' });
    push({ type: 'combat/jackOut' });
    out.push({ type: 'combat/endTurn' });
    return out;
  }
  if (s.run) {
    const sys = systemDef(c, s.run.system);
    for (const nd of sys.nodes) for (const t of NODE_ACTIONS) push({ type: t, node: nd.id } as Action);
    out.push({ type: 'run/jackOut' });
    return out;
  }
  for (const id of Object.keys(s.world.addressBook)) push({ type: 'hub/jackIn', system: id });
  for (const j of Object.keys(c.content.jobs)) {
    push({ type: 'job/accept', job: j });
    push({ type: 'job/turnIn', job: j });
  }
  for (const v of Object.keys(c.content.vendors)) {
    for (const st of vendorStock(c, v)) if (st.available) out.push({ type: 'shop/buy', vendor: v, stock: st.id });
  }
  for (const p of s.player.paydata) out.push({ type: 'paydata/sell', uid: p.uid });
  return out;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export function metaView(c: Ctx) {
  const m = c.state.meta;
  return {
    modules: m.modules,
    rootKeyFragments: m.rootKey,
    root: m.root,
    finale: m.finale,
    unlocked: m.unlocked,
    rngRigged: !!m.modules['engine/rng'],
    iceAlwaysMapped: !!m.modules['ui'],
    finaleCheckpoint: m.finaleCheckpoint,
    ending: c.state.ending,
    endless: c.state.endless,
    patchFight: patchFightSpec(c),
    localhost: c.content.setup.localhost,
    localhostKnown: hasSystem(c, c.content.setup.localhost) && !!c.state.world.addressBook[c.content.setup.localhost],
  };
}

export { nodeDef };
