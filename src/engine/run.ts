// §5 cyberspace runs: jack in, node graph, approach actions, capture, netscan, jack out.
import { BALANCE } from './balance.ts';
import {
  type K, emit, log, reject, stat, systemDef, progress, addAddress, addressKnown, addItem, addProgram,
  addCredits, clamp, hasMod, modifiers, uid, setFlag, iceDef, hasSystem,
} from './core.ts';
import { addXp, ownSystem, chargesPerRun, usableBotnetPower } from './world.ts';
import { addTrace, alertTier } from './trace.ts';
import { endRun } from './failure.ts';
import { makeIce, startCombat, systemIceBonus } from './combat.ts';
import { applyStoryOps, evalCond, openDialogue, nodeCaptureFlag, setFinale } from './story.ts';
import { generateIotSystem } from './procgen.ts';
import { hooks } from './hooks.ts';
import { rand, pick, randInt } from './rng.ts';
import type { Ctx, Id, NodeDef, RunNode, RunState, SystemDef, Paydata, FileDef } from './types.ts';

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

const adjCache = new WeakMap<SystemDef, Record<Id, Id[]>>();

export function adjacency(sys: SystemDef): Record<Id, Id[]> {
  let adj = adjCache.get(sys);
  if (adj) return adj;
  adj = {};
  for (const n of sys.nodes) adj[n.id] = adj[n.id] ?? [];
  for (const n of sys.nodes) {
    for (const l of n.links) {
      if (!adj[l]) throw new Error(`system '${sys.id}': node '${n.id}' links to unknown '${l}'`);
      if (!adj[n.id].includes(l)) adj[n.id].push(l);
      if (!adj[l].includes(n.id)) adj[l].push(n.id);
    }
  }
  adjCache.set(sys, adj);
  return adj;
}

export function nodeDef(sys: SystemDef, id: Id): NodeDef {
  const n = sys.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`system '${sys.id}' has no node '${id}'`);
  return n;
}

export function gatewayOf(sys: SystemDef): NodeDef {
  return sys.nodes.find((n) => n.type === 'gateway') ?? sys.nodes[0];
}

function passable(n: RunNode): boolean {
  return n.state === 'cleared' || n.state === 'captured' || n.state === 'asleep';
}

/**
 * Open (ICE-less, unvisited) nodes the player must pass through to reach `target`, nearest first:
 * [] if the target is the gateway or next to a cleared / sneaked / captured node, null if unreachable.
 * Paths start at passable nodes and run through open nodes only (DESIGN §5.2 + auto-pass, see ENGINE_API §5).
 */
export function openPath(c: Ctx, target: Id): Id[] | null {
  const run = c.state.run;
  if (!run || !hasSystem(c, run.system)) return null;
  const sys = systemDef(c, run.system);
  if (!run.nodes[target]) return null;
  if (gatewayOf(sys).id === target) return [];
  const adj = adjacency(sys);
  const parent = new Map<Id, Id | null>();
  const queue: Id[] = [];
  for (const id of Object.keys(run.nodes)) {
    if (passable(run.nodes[id])) {
      parent.set(id, null);
      queue.push(id);
    }
  }
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of adj[u]) {
      if (v === target) {
        const path: Id[] = [];
        for (let p: Id | null = u; p !== null && run.nodes[p].state === 'open'; p = parent.get(p) ?? null) path.unshift(p);
        return path;
      }
      if (!parent.has(v) && run.nodes[v].state === 'open') {
        parent.set(v, u);
        queue.push(v);
      }
    }
  }
  return null;
}

/** A node can be acted on if it is the gateway or connected to a cleared / sneaked / captured node through open nodes. */
export function isAccessible(c: Ctx, nodeId: Id): boolean {
  return openPath(c, nodeId) !== null;
}

/** Reveal everything next to a passable node or to an open node you could walk through. */
function revealReachable(k: K): void {
  const run = k.state.run!;
  const sys = systemDef(k, run.system);
  const adj = adjacency(sys);
  const ids: Id[] = [];
  for (const id of Object.keys(run.nodes)) {
    const rn = run.nodes[id];
    if (passable(rn) || (rn.state === 'open' && rn.revealed && isAccessible(k, id))) ids.push(...adj[id]);
  }
  reveal(k, ids);
}

function reveal(k: K, ids: Id[]): void {
  const run = k.state.run!;
  const out: Id[] = [];
  for (const id of ids) {
    const rn = run.nodes[id];
    if (rn && !rn.revealed) {
      rn.revealed = true;
      out.push(id);
    }
  }
  if (out.length) emit(k, { type: 'node.revealed', system: run.system, nodes: out });
}

function revealNeighbours(k: K, nodeId: Id): void {
  const sys = systemDef(k, k.state.run!.system);
  reveal(k, adjacency(sys)[nodeId]);
}

function moveTo(k: K, nodeId: Id): void {
  const run = k.state.run!;
  if (run.position !== nodeId) {
    run.previous = run.position;
    run.position = nodeId;
  }
  // standing on a passable node shows you what is next to it
  if (passable(run.nodes[nodeId])) revealNeighbours(k, nodeId);
  revealReachable(k);
}

// ---------------------------------------------------------------------------
// Sneak
// ---------------------------------------------------------------------------

export function sneakChance(c: Ctx, nodeId: Id): number {
  const run = c.state.run;
  if (!run) return 0;
  const rn = run.nodes[nodeId];
  if (!rn || rn.ice.length === 0) return 100;
  if (c.state.meta.modules['engine/rng']) return 100;
  const S = BALANCE.sneak;
  let ch = S.base + stat(c, 'mask') * S.perMask - alertTier(run.trace) * S.perAlert;
  for (const m of modifiers(c)) if (m.mod === 'sneak') ch += m.add;
  const stealthLoaded = c.state.player.loadout.filter((id) => c.content.programs[id]?.category === 'stealth').length;
  ch += stealthLoaded * S.stealthLoadedBonus;
  for (const i of rn.ice) ch -= iceDef(c, i.def).perception;
  return clamp(Math.round(ch), S.min, S.max);
}

// ---------------------------------------------------------------------------
// Jack in
// ---------------------------------------------------------------------------

export function jackInBlockReason(c: Ctx, system: Id): string | null {
  const s = c.state;
  if (s.mode !== 'hub') return 'not in the hub';
  if (s.combat) return 'in combat';
  if (!addressKnown(c, system)) return 'unknown address';
  const lock = systemDef(c, system).lock;
  if (lock && !evalCond(c, lock.cond)) return lock.text;
  if (s.player.loadout.length === 0) return 'no programs loaded';
  return null;
}

/** Botnet power a gated system needs right now (gate items scale it). */
export function gateNeeded(c: Ctx, system: Id): number {
  const g = systemDef(c, system).gate;
  if (!g) return 0;
  let need = g.botnetPower;
  for (const it of g.items ?? []) if (c.state.player.items.includes(it.item)) need *= it.mult;
  return Math.ceil(need);
}

/** Why the DDoS gate would fail (null = it opens, or there is no gate). A failed gate is not a rejected action: it emits gate.denied. */
export function gateBlockReason(c: Ctx, system: Id): string | null {
  const sys = systemDef(c, system);
  if (!sys.gate) return null;
  const need = gateNeeded(c, system);
  if (usableBotnetPower(c) < need) return sys.gate.text ?? `gateway only opens under a DDoS: needs botnet power ${need}`;
  if (chargesPerRun(c) < 1) return 'needs at least 1 botnet charge to DDoS the gateway';
  return null;
}

export function jackIn(k: K, system: Id): void {
  const why = jackInBlockReason(k, system);
  if (why) reject(why);
  const s = k.state;
  const sys = systemDef(k, system);
  if (sys.gate && gateBlockReason(k, system)) {
    emit(k, { type: 'gate.denied', system, power: usableBotnetPower(k), needed: gateNeeded(k, system) });
    log(k, `${sys.address}: gateway holds. ${gateBlockReason(k, system)}`, 'warn');
    return;
  }
  const prog = progress(k, system);
  const extra = systemIceBonus(k, system);
  const nodes: Record<Id, RunNode> = {};
  const gw = gatewayOf(sys);
  for (const nd of sys.nodes) {
    const ice = prog.owned ? [] : (nd.ice ?? []).map((sp) => makeIce(k, sp.ice, { ...(sp.level !== undefined ? { level: sp.level } : {}), extraLevels: extra }));
    const locked = !!nd.lock && !prog.owned;
    nodes[nd.id] = {
      id: nd.id,
      revealed: nd.id === gw.id || prog.revealed.includes(nd.id),
      probed: false,
      // ICE-less nodes are 'open' until you act on them (DESIGN §5.2: you move only next to nodes you have cleared)
      state: locked ? 'locked' : ice.length ? 'hostile' : prog.owned ? 'captured' : nd.id === gw.id ? 'cleared' : 'open',
      ice,
      sealed: false,
    };
  }
  const run: RunState = {
    system,
    trace: 0,
    nodes,
    position: gw.id,
    previous: null,
    haul: [],
    charges: chargesPerRun(k),
    securityCaptured: prog.owned,
    startedCycle: s.cycle,
    ghostUsed: false,
    netscanned: [],
    actions: 0,
  };
  s.run = run;
  s.mode = 'run';
  s.player.integrity = stat(k, 'chassis');
  prog.runs++;
  s.stats.runs++;
  s.stats.runsBySystem[system] = (s.stats.runsBySystem[system] ?? 0) + 1;
  if (sys.gate) {
    run.charges = Math.max(0, run.charges - 1);
    emit(k, { type: 'gate.opened', system, power: usableBotnetPower(k), needed: gateNeeded(k, system) });
    log(k, `gateway DDoSed open (${usableBotnetPower(k)} power).`, 'info');
  }
  // §8 Hunted: a hunter ICE appears in every system
  if (!prog.owned && s.player.heat >= BALANCE.heat.hunted && k.content.setup.hunterIce.length) {
    const candidates = sys.nodes.filter((n) => n.id !== gw.id && nodes[n.id].state !== 'locked' && nodes[n.id].ice.length < 3);
    if (candidates.length) {
      const nd = pick(s, candidates);
      const H = k.content.setup.hunterIce;
      const id = H[clamp(sys.tier - 1, 0, H.length - 1)];
      nodes[nd.id].ice.push(makeIce(k, id, { level: iceDef(k, id).level + Math.max(0, sys.tier - 1) + extra }));
      nodes[nd.id].state = 'hostile';
    }
  }
  emit(k, { type: 'run.started', system, trace: 0 });
  log(k, `dialed in: ${sys.address}`, 'info');
  if (s.player.heat >= BALANCE.heat.noticed) addTrace(k, BALANCE.trace.noticedStart, 'noticed', true);
  if (system === k.content.setup.localhost && s.meta.finale === 'none') setFinale(k, 'entered');
  if (sys.mood) emit(k, { type: 'mood', mood: sys.mood });
  emit(k, { type: 'node.revealed', system, nodes: Object.values(nodes).filter((n) => n.revealed).map((n) => n.id) });
  if (passable(nodes[gw.id])) revealNeighbours(k, gw.id);
  revealReachable(k);
}

// ---------------------------------------------------------------------------
// Node actions
// ---------------------------------------------------------------------------

function ctx(k: K, nodeId: Id): { run: RunState; sys: SystemDef; nd: NodeDef; rn: RunNode } {
  const run = k.state.run;
  if (!run) reject('not in a run');
  if (k.state.combat) reject('in combat');
  const sys = systemDef(k, run.system);
  const rn = run.nodes[nodeId];
  if (!rn) reject(`no node '${nodeId}'`);
  if (!rn.revealed) reject('node not discovered');
  if (!isAccessible(k, nodeId)) reject('not adjacent to a cleared node');
  return { run, sys, nd: nodeDef(sys, nodeId), rn };
}

function tick(k: K, traceAmount: number, source: string): void {
  const run = k.state.run;
  if (!run) return;
  run.actions++;
  if (traceAmount) addTrace(k, traceAmount, source);
  hooks.advanceCycles(k, 1);
}

/** Why a node action is not legal right now (null = legal). Mirrors the checks in the handlers. */
export function nodeActionBlockReason(c: Ctx, type: string, nodeId: Id): string | null {
  const s = c.state;
  const run = s.run;
  if (!run) return 'not in a run';
  if (s.combat) return 'in combat';
  const rn = run.nodes[nodeId];
  if (!rn) return 'no such node';
  if (!rn.revealed) return 'node not discovered';
  if (!isAccessible(c, nodeId)) return 'not adjacent to a cleared node';
  const sys = systemDef(c, run.system);
  const nd = nodeDef(sys, nodeId);
  const prog = s.world.systems[run.system];
  const open = rn.state === 'cleared' || rn.state === 'captured' || rn.state === 'open';
  switch (type) {
    case 'run/probe':
      if (rn.probed) return 'already probed';
      return null;
    case 'run/sneak':
      if (rn.state === 'locked') return 'locked';
      if (rn.state !== 'hostile') return 'no ICE awake here';
      return null;
    case 'run/breach':
      if (rn.state === 'locked') return nd.lock ? `locked: ${nd.lock.label}` : 'locked';
      if (rn.state !== 'hostile' && rn.state !== 'asleep') return 'no ICE here';
      return null;
    case 'run/backdoor':
      if (!nd.backdoor) return 'no backdoor known for this node';
      if (!s.player.items.includes(nd.backdoor)) return `needs ${c.content.items[nd.backdoor]?.name ?? nd.backdoor}`;
      if (rn.state !== 'hostile' && rn.state !== 'asleep') return 'no ICE here';
      return null;
    case 'run/unlock':
      if (rn.state !== 'locked' || !nd.lock) return 'not locked';
      if (rn.sealed) return 'sealed by the alarm (capture Security)';
      if (!s.player.items.includes(nd.lock.item)) return `needs ${nd.lock.label}`;
      return null;
    case 'run/loot': {
      if (!(open || rn.state === 'asleep')) return 'ICE in the way';
      const files = (nd.files ?? []).filter((f) => !prog?.looted.includes(f.id));
      if (files.length === 0) return 'nothing to loot';
      if (rn.sealed) return 'sealed';
      return null;
    }
    case 'run/capture':
      if (rn.state === 'captured') return 'already captured';
      if (rn.state !== 'cleared' && rn.state !== 'open') return rn.state === 'asleep' ? 'cannot capture a node you sneaked past' : 'ICE in the way';
      return null;
    case 'run/use':
      if (!nd.use) return 'nothing to use';
      if (!open) return 'ICE in the way';
      if (nd.use.once && prog?.used.includes(nd.id)) return 'already used';
      if (!evalCond(c, nd.use.cond)) return 'not now';
      return null;
    case 'run/talk':
      if (!nd.talk) return 'nobody to talk to';
      if (!open) return 'ICE in the way';
      return null;
    case 'run/netscan':
      if (nd.type !== 'router') return 'netscan needs a router';
      if (rn.state !== 'captured') return 'capture the router first';
      if (run.netscanned.includes(nodeId)) return 'already scanned this run';
      return null;
    case 'run/enter':
      if (rn.state !== 'open') return 'nothing to enter';
      return null;
  }
  return 'unknown action';
}

export function nodeAction(k: K, type: string, nodeId: Id): void {
  const why = nodeActionBlockReason(k, type, nodeId);
  if (why) reject(why);
  const { run, sys, nd, rn } = ctx(k, nodeId);
  const T = BALANCE.trace;
  const s = k.state;
  const prog = progress(k, run.system);
  // walk through the open nodes between you and the target: 1 cycle each, no trace
  const path = openPath(k, nodeId) ?? [];
  if (path.length) {
    for (const id of path) {
      run.nodes[id].state = 'cleared';
      emit(k, { type: 'node.cleared', system: run.system, node: id });
      moveTo(k, id);
    }
    log(k, `You pass through ${path.map((id) => nodeDef(sys, id).name).join(', ')}.`, 'info');
    hooks.advanceCycles(k, path.length);
  }
  // acting on an open target enters it too; probing is remote and does not
  if (rn.state === 'open' && type !== 'run/probe') {
    rn.state = 'cleared';
    onNodeCleared(k, nodeId);
  }
  switch (type) {
    case 'run/enter':
      tick(k, 0, 'enter');
      return;
    case 'run/probe': {
      rn.probed = true;
      moveTo(k, nodeId);
      emit(k, { type: 'node.probed', system: run.system, node: nodeId, honeypot: nd.type === 'honeypot', ice: rn.ice.map((i) => i.def) });
      tick(k, T.probe, 'probe');
      return;
    }
    case 'run/sneak': {
      const chance = sneakChance(k, nodeId);
      const ok = rand(s) * 100 < chance;
      moveTo(k, nodeId);
      emit(k, { type: 'node.sneak', system: run.system, node: nodeId, chance, success: ok });
      if (ok) {
        rn.state = 'asleep';
        revealNeighbours(k, nodeId);
        tick(k, 0, 'sneak');
        return;
      }
      addTrace(k, T.sneakFail, 'sneak failed');
      run.actions++;
      if (hasMod(k, 'ghost') && !run.ghostUsed) {
        run.ghostUsed = true;
        log(k, 'Ghost: they never saw you coming.', 'combat');
        hooks.advanceCycles(k, 1);
        return;
      }
      if (run.trace >= T.max) return;
      beginNodeFight(k, nodeId, true);
      return;
    }
    case 'run/breach':
      moveTo(k, nodeId);
      run.actions++;
      beginNodeFight(k, nodeId, false);
      return;
    case 'run/backdoor':
      rn.ice = [];
      rn.state = 'cleared';
      moveTo(k, nodeId);
      emit(k, { type: 'node.backdoored', system: run.system, node: nodeId });
      onNodeCleared(k, nodeId);
      tick(k, T.nodeAction, 'backdoor');
      return;
    case 'run/unlock':
      rn.state = rn.ice.length ? 'hostile' : 'cleared';
      moveTo(k, nodeId);
      emit(k, { type: 'node.unlocked', system: run.system, node: nodeId });
      if (rn.state === 'cleared') onNodeCleared(k, nodeId);
      tick(k, T.nodeAction, 'unlock');
      return;
    case 'run/loot':
      moveTo(k, nodeId);
      loot(k, nd);
      return;
    case 'run/capture':
      moveTo(k, nodeId);
      capture(k, sys, nd, rn);
      return;
    case 'run/use': {
      moveTo(k, nodeId);
      if (!prog.used.includes(nodeId)) prog.used.push(nodeId);
      setFlag(k, `used.${run.system}.${nodeId}`);
      emit(k, { type: 'node.used', node: nodeId, system: run.system });
      applyStoryOps(k, nd.use!.ops);
      tick(k, T.nodeAction, 'use');
      return;
    }
    case 'run/talk':
      moveTo(k, nodeId);
      emit(k, { type: 'node.talk', system: run.system, node: nodeId, dialogue: nd.talk! });
      openDialogue(k, nd.talk!);
      tick(k, T.nodeAction, 'talk');
      return;
    case 'run/netscan':
      moveTo(k, nodeId);
      netscan(k, nd);
      return;
  }
}

function beginNodeFight(k: K, nodeId: Id, ambush: boolean): void {
  const run = k.state.run!;
  const rn = run.nodes[nodeId];
  const boss = k.content.setup.finaleBoss;
  if (k.state.meta.chairmanKilled) rn.ice = rn.ice.filter((i) => i.def !== boss);
  rn.state = rn.ice.length ? 'hostile' : 'cleared';
  if (rn.state === 'cleared') return onNodeCleared(k, nodeId);
  const finale = rn.ice.some((i) => i.def === boss);
  // the stage only moves forward: re-breaching after the PATCH fight must not rewind it
  if (finale && (k.state.meta.finale === 'none' || k.state.meta.finale === 'entered')) setFinale(k, 'chairman');
  startCombat(k, { context: finale ? 'finale' : 'node', node: nodeId, ice: rn.ice, ambush });
}

/** Called when a node's ICE is gone (fight won, backdoor, unlocked empty). */
export function onNodeCleared(k: K, nodeId: Id): void {
  const run = k.state.run;
  if (!run) return;
  moveTo(k, nodeId);
  emit(k, { type: 'node.cleared', system: run.system, node: nodeId });
  revealNeighbours(k, nodeId);
}

function loot(k: K, nd: NodeDef): void {
  const s = k.state;
  const run = s.run!;
  const prog = progress(k, run.system);
  const honeypot = nd.type === 'honeypot';
  const taken: Id[] = [];
  const storage = stat(k, 'storage');
  for (const f of nd.files ?? []) {
    if (prog.looted.includes(f.id)) continue;
    if (f.kind === 'paydata' && run.haul.length >= storage) {
      log(k, `storage full: left ${f.name}`, 'warn');
      continue;
    }
    takeFile(k, f, run.system);
    prog.looted.push(f.id);
    taken.push(f.id);
  }
  emit(k, { type: 'node.looted', system: run.system, node: nd.id, files: taken, honeypot });
  if (honeypot) {
    log(k, 'HONEYPOT. That was bait.', 'warn');
    addTrace(k, BALANCE.trace.honeypot, 'honeypot');
  }
  tick(k, BALANCE.trace.nodeAction, 'loot');
}

export function takeFile(k: K, f: FileDef, system: Id): void {
  const s = k.state;
  switch (f.kind) {
    case 'paydata': {
      const pd: Paydata = {
        uid: uid(k, 'p'), file: f.id, name: f.name, value: f.value ?? 0,
        encrypted: f.encrypted ?? 0, tagged: !!f.tagged, system,
      };
      if (s.run) s.run.haul.push(pd);
      else s.player.paydata.push(pd);
      emit(k, { type: 'paydata.gained', uid: pd.uid, file: pd.file, name: pd.name, value: pd.value });
      break;
    }
    case 'program': if (f.program) addProgram(k, f.program); break;
    case 'address': if (f.system) addAddress(k, f.system, `file:${f.id}`); break;
    case 'item': if (f.item) addItem(k, f.item); break;
    case 'lore':
      if (!s.player.lore.includes(f.id)) s.player.lore.push(f.id);
      emit(k, { type: 'lore.gained', file: f.id, text: f.text ?? '' });
      break;
    case 'coin': s.player.coin += f.amount ?? 0; break;
    case 'credits': addCredits(k, f.amount ?? 0, `found: ${f.name}`); break;
  }
  applyStoryOps(k, f.onTake);
}

function capture(k: K, sys: SystemDef, nd: NodeDef, rn: RunNode): void {
  const s = k.state;
  const run = s.run!;
  rn.state = 'captured';
  setFlag(k, nodeCaptureFlag(sys.id, nd.id));
  emit(k, { type: 'node.captured', node: nd.id, nodeType: nd.type, system: sys.id });
  addXp(k, BALANCE.xp.captureNode);
  switch (nd.type) {
    case 'router':
      reveal(k, sys.nodes.map((n) => n.id));
      log(k, 'router captured: map revealed.', 'info');
      break;
    case 'security': {
      run.securityCaptured = true;
      const unsealed = Object.values(run.nodes).filter((n) => n.sealed);
      unsealed.forEach((n) => (n.sealed = false));
      log(k, 'security captured: trace halved, no reinforcements.', 'info');
      break;
    }
    case 'core': {
      ownSystem(k, sys.id);
      addXp(k, BALANCE.xp.captureSystemPerTier * sys.tier);
      for (const n of Object.values(run.nodes)) {
        n.ice = [];
        if (n.state === 'hostile' || n.state === 'asleep') n.state = 'cleared';
        if (n.state === 'locked' || n.state === 'open') n.state = 'cleared';
        n.sealed = false;
      }
      run.securityCaptured = true;
      break;
    }
  }
  if (nd.module && !s.meta.modules[nd.module]) {
    s.meta.modules[nd.module] = true;
    emit(k, { type: 'module.captured', module: nd.module });
    log(k, `module captured: ${nd.module}`, 'engine');
    if (nd.module === 'engine/save') s.meta.finaleCheckpoint = true;
  }
  applyStoryOps(k, nd.capture);
  tick(k, BALANCE.trace.nodeAction, 'capture');
}

function netscan(k: K, nd: NodeDef): void {
  const s = k.state;
  const run = s.run!;
  const prog = progress(k, run.system);
  run.netscanned.push(nd.id);
  const found: Id[] = [];
  if (!prog.netscanned.includes(nd.id)) {
    prog.netscanned.push(nd.id);
    for (const id of nd.netscan ?? []) {
      if (!addressKnown(k, id)) {
        addAddress(k, id, `netscan:${run.system}`);
        found.push(id);
      }
    }
  }
  const n = nd.netscanIot ?? randInt(s, BALANCE.netscan.iotMin, BALANCE.netscan.iotMax);
  for (let i = 0; i < n; i++) {
    const sys = generateIotSystem(k, 1);
    addAddress(k, sys.id, `netscan:${run.system}`, 'IoT junk. Botnet fodder.');
    found.push(sys.id);
  }
  emit(k, { type: 'netscan', system: run.system, node: nd.id, found });
  tick(k, BALANCE.trace.netscan, 'netscan');
}

export function jackOut(k: K): void {
  const s = k.state;
  if (!s.run) reject('not in a run');
  if (s.combat) reject('in combat: hang up from the fight instead');
  const no = systemDef(k, s.run.system).noJackOut;
  if (no) reject(no);
  log(k, 'hung up.', 'info');
  endRun(k, 'jackout', true);
}

hooks.nodeCleared = onNodeCleared;
