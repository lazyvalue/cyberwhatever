// Story engine: conditions, story ops, triggers, dialogue, jobs.
import { BALANCE } from './balance.ts';
import {
  type K, emit, log, message, setFlag, addItem, removeItem, addProgram, changeHumanity, addAddress,
  addCredits, reject, hasSystem,
} from './core.ts';
import {
  addHeat, setHeat, addXp, ownSystem, loseSystem, addHost, burnRandomHost, botnetPower, setCoinPrice,
} from './world.ts';
import { addTrace } from './trace.ts';
import { endRun } from './failure.ts';
import { rand, pick } from './rng.ts';
import { hooks } from './hooks.ts';
import { sneakChance, isAccessible } from './run.ts';
import type {
  Condition, Ctx, DialogueChoice, DialogueNode, FinaleStage, GameEvent, Id, JobStatus, ObjectiveDef,
  ScriptApi, StoryOp, TriggerDef, EndingId, MatchValue, ObjectiveStatus,
} from './types.ts';

// ---------------------------------------------------------------------------
// Derived values used by conditions
// ---------------------------------------------------------------------------

/** Control %: weighted share of capturable (non-procedural, non-localhost) systems owned. */
export function controlPct(c: Ctx): number {
  if (c.state.ending === 'root') return 100;
  let total = 0;
  let owned = 0;
  for (const s of Object.values(c.content.systems)) {
    if (s.capturable === false || s.procedural || s.id === c.content.setup.localhost) continue;
    const w = s.controlWeight ?? s.tier;
    total += w;
    if (c.state.world.systems[s.id]?.owned) owned += w;
  }
  return total === 0 ? 0 : Math.round((owned / total) * 1000) / 10;
}

function statValue(c: Ctx, stat: string): number {
  const s = c.state;
  const p = s.player;
  switch (stat) {
    case 'rep': return p.rep;
    case 'xp': return p.xp;
    case 'humanity': return p.humanity;
    case 'heat': return p.heat;
    case 'credits': return p.credits;
    case 'coin': return p.coin;
    case 'coinPrice': return s.world.coinPrice;
    case 'control': return controlPct(c);
    case 'cycle': return s.cycle;
    case 'botnetPower': return botnetPower(c);
    case 'hosts': return p.hosts.length;
    case 'botnetHosts': return p.hosts.filter((h) => h.role === 'botnet').length;
    case 'fragments': return s.meta.fragments.filter(Boolean).length;
    case 'cheats': return s.meta.cheatCount;
    case 'combatTurn': return s.combat?.turn ?? 0;
    case 'trace': return s.run?.trace ?? 0;
    case 'integrity': return p.integrity;
    case 'neural': return p.neural;
    case 'flatlines': return p.flatlinesTotal;
    case 'ownedSystems': return Object.values(s.world.systems).filter((x) => x.owned).length;
    default: return 0;
  }
}

export function jobStatus(c: Ctx, job: Id): JobStatus {
  return c.state.story.jobs[job]?.status ?? 'locked';
}

export function evalCond(c: Ctx, cond: Condition | undefined): boolean {
  if (!cond) return true;
  const s = c.state;
  switch (cond.c) {
    case 'all': return cond.of.every((x) => evalCond(c, x));
    case 'any': return cond.of.some((x) => evalCond(c, x));
    case 'not': return !evalCond(c, cond.of);
    case 'flag': {
      const v = s.story.flags[cond.flag];
      return cond.is === undefined ? !!v : v === cond.is;
    }
    case 'stat': {
      const v = statValue(c, cond.stat);
      return (cond.gte === undefined || v >= cond.gte) && (cond.lte === undefined || v <= cond.lte);
    }
    case 'owns': return !!s.world.systems[cond.system]?.owned;
    case 'knows': return !!s.world.addressBook[cond.system];
    case 'item': return s.player.items.includes(cond.item);
    case 'program': return !!s.player.programs[cond.program];
    case 'implant': return s.player.implants.includes(cond.implant);
    case 'perk': return s.player.perks.includes(cond.perk);
    case 'job': {
      const st = jobStatus(c, cond.job);
      return Array.isArray(cond.status) ? cond.status.includes(st) : st === cond.status;
    }
    case 'inSystem': return !!s.run && (cond.system === undefined || s.run.system === cond.system);
    case 'inCombat': return !!s.combat;
    case 'mode': return s.mode === cond.mode;
    case 'module': return !!s.meta.modules[cond.module];
    case 'finale': return Array.isArray(cond.stage) ? cond.stage.includes(s.meta.finale) : s.meta.finale === cond.stage;
    case 'root': return s.meta.root;
    case 'endless': return s.endless;
    case 'trigger': return s.story.fired.includes(cond.trigger);
    case 'elapsed': {
      const v = s.story.flags[cond.flag];
      return typeof v === 'number' && s.cycle - v >= cond.gte;
    }
    case 'paydata': return s.player.paydata.some((p) => p.file === cond.file) || !!s.run?.haul.some((p) => p.file === cond.file);
    case 'hostRole': return s.player.hosts.some((h) => h.system === cond.system && h.role === cond.role);
    case 'sneakable': {
      const run = s.run;
      if (!run || s.combat) return false;
      return Object.values(run.nodes).some((n) => n.revealed && n.state === 'hostile' && n.ice.length > 0
        && isAccessible(c, n.id) && sneakChance(c, n.id) >= cond.gte);
    }
    case 'nodeRevealed': {
      const run = s.run;
      if (!run) return false;
      const sys = c.content.systems[run.system] ?? s.world.procSystems[run.system];
      return sys.nodes.some((nd) => nd.type === cond.type && run.nodes[nd.id]?.revealed);
    }
    case 'objective': {
      const st = s.story.objectives[cond.id]?.status;
      if (!st) return false;
      return Array.isArray(cond.status) ? cond.status.includes(st) : st === cond.status;
    }
    case 'chairmanKilled': return s.meta.chairmanKilled;
    case 'patchBroken': return s.meta.patchBroken;
  }
}

// ---------------------------------------------------------------------------
// Story ops
// ---------------------------------------------------------------------------

export function scriptApi(k: K): ScriptApi {
  return {
    state: k.state,
    content: k.content,
    combatOps: (ops, target) => {
      if (!k.state.combat) return;
      hooks.combatOps(k, ops, target);
    },
    storyOps: (ops) => applyStoryOps(k, ops),
    rng: () => rand(k.state),
    emit: (e: GameEvent) => emit(k, e),
  };
}

export function setFinale(k: K, stage: FinaleStage): void {
  if (k.state.meta.finale === stage) return;
  k.state.meta.finale = stage;
  emit(k, { type: 'finale.stage', stage });
}

export function setEnding(k: K, ending: EndingId): void {
  const s = k.state;
  if (s.ending) return;
  s.ending = ending;
  s.mode = 'ending';
  s.combat = null;
  s.run = null;
  s.dialogue = null;
  if (ending === 'retention') {
    s.endless = true;
    emit(k, { type: 'endless.unlocked' });
  }
  setFinale(k, 'done');
  emit(k, { type: 'ending', ending });
}

export type Vars = Record<string, unknown>;

/**
 * Text templating for story text: `{handle}`, `{credits}`, `{rep}`, `{heat}`, `{cycle}`, `{flatlines}`,
 * `{control}`, plus any field of the event that fired the trigger (e.g. `{name}` on host.burned,
 * `{timeAway}` on session.resumed). Unknown tokens are left as-is.
 */
export function interpolate(c: Ctx, text: string, vars?: Vars): string {
  if (!text.includes('{')) return text;
  const p = c.state.player;
  return text.replace(/\{(\w+)\}/g, (m, key: string) => {
    if (vars && vars[key] !== undefined && vars[key] !== null && typeof vars[key] !== 'object') return String(vars[key]);
    switch (key) {
      case 'handle': return p.handle;
      case 'credits': return String(p.credits);
      case 'rep': return String(p.rep);
      case 'heat': return String(Math.round(p.heat));
      case 'cycle': return String(c.state.cycle);
      case 'flatlines': return String(p.flatlinesTotal);
      case 'control': return String(controlPct(c));
      default: return m;
    }
  });
}

export function applyStoryOps(k: K, ops: StoryOp[] | undefined, vars?: Vars): void {
  if (!ops) return;
  for (const op of ops) applyStoryOp(k, op, vars);
}

function applyStoryOp(k: K, op: StoryOp, vars?: Vars): void {
  const s = k.state;
  switch (op.op) {
    case 'message': message(k, op.from, interpolate(k, op.text, vars), op.channel ?? 'dm', op.subject ? interpolate(k, op.subject, vars) : undefined); break;
    case 'log': log(k, interpolate(k, op.text, vars), op.level ?? 'story'); break;
    case 'flag': setFlag(k, op.flag, op.value ?? true); break;
    case 'incFlag': {
      const v = Number(s.story.flags[op.flag] ?? 0);
      setFlag(k, op.flag, v + (op.by ?? 1));
      break;
    }
    case 'address': addAddress(k, op.system, op.source ?? 'story', op.note); break;
    case 'note': {
      const e = s.world.addressBook[op.system];
      if (e && !e.notes.includes(op.note)) e.notes.push(op.note);
      break;
    }
    case 'job': setJobStatus(k, op.job, op.status ?? 'available'); break;
    case 'dialogue': openDialogue(k, op.dialogue); break;
    case 'item': op.remove ? removeItem(k, op.item) : addItem(k, op.item); break;
    case 'program': addProgram(k, op.program); break;
    case 'credits': addCredits(k, op.amount, 'story'); break;
    case 'freezeCredits': {
      const amt = Math.round(s.player.credits * op.ratio);
      s.player.frozenCredits += amt;
      addCredits(k, -amt, 'frozen');
      break;
    }
    case 'unfreezeCredits': {
      const amt = Math.round(s.player.frozenCredits * (op.ratio ?? 1));
      s.player.frozenCredits -= amt;
      addCredits(k, amt, 'unfrozen');
      break;
    }
    case 'coin': s.player.coin = Math.max(0, s.player.coin + op.amount); break;
    case 'coinPrice': setCoinPrice(k, op.set ?? s.world.coinPrice * (op.mult ?? 1)); break;
    case 'heat': addHeat(k, op.amount, 'story', true); break;
    case 'setHeat': setHeat(k, op.value); break;
    case 'humanity': changeHumanity(k, op.amount); break;
    case 'xp': addXp(k, op.amount); break;
    case 'trace': addTrace(k, op.amount, 'story', true); break;
    case 'own': ownSystem(k, op.system); break;
    case 'unown': loseSystem(k, op.system, 'story'); break;
    case 'host': addHost(k, op.name, op.power, op.tier ?? 1, op.system); break;
    case 'burnHosts': for (let i = 0; i < op.count; i++) burnRandomHost(k, s.player.hosts.slice()); break;
    case 'neural': {
      s.player.neural = Math.max(0, s.player.neural + op.amount);
      emit(k, { type: 'combat.neural', value: s.player.neural, delta: op.amount });
      break;
    }
    case 'endRun':
      if (s.run) {
        if (s.combat) emit(k, { type: 'combat.ended', result: 'scripted', context: s.combat.context });
        log(k, op.reason ?? 'connection closed', 'story');
        endRun(k, 'scripted', true);
      }
      break;
    case 'cinematic':
      s.cinematic = { id: op.id, ...(op.data !== undefined ? { data: op.data } : {}) };
      emit(k, { type: 'cinematic', id: op.id, ...(op.data !== undefined ? { data: op.data } : {}) });
      break;
    case 'event': emit(k, { type: 'custom', name: op.name, ...(op.data !== undefined ? { data: op.data } : {}) }); break;
    case 'finale': setFinale(k, op.stage); break;
    case 'ending': setEnding(k, op.ending); break;
    case 'unlockMeta':
      if (!s.meta.unlocked) {
        s.meta.unlocked = true;
        emit(k, { type: 'meta.unlocked' });
      }
      break;
    case 'endless':
      if (!s.endless) {
        s.endless = true;
        emit(k, { type: 'endless.unlocked' });
      }
      break;
    case 'mood': emit(k, { type: 'mood', mood: op.mood }); break;
    case 'if': applyStoryOps(k, evalCond(k, op.cond) ? op.then : op.else, vars); break;
    case 'mark': setFlag(k, op.flag, s.cycle); break;
    case 'random': applyStoryOps(k, rand(s) < op.p ? op.then : op.else, vars); break;
    case 'oneOf': if (op.options.length) applyStoryOps(k, pick(s, op.options), vars); break;
    case 'objective': setObjective(k, op, vars); break;
    case 'combat': if (s.combat) hooks.combatOps(k, op.ops); break;
    case 'nextFight': if (s.run) s.run.nextFight = [...(s.run.nextFight ?? []), ...op.ops]; break;
    case 'runSecurity': if (s.run) s.run.securityDelta = (s.run.securityDelta ?? 0) + op.add; break;
    case 'metaCommand': hooks.metaCommand(k, op.cmd, op.arg, !!op.confirm); break;
    case 'metaKey':
      if (!op.key.startsWith('cw.') || op.key.startsWith('cw.save')) throw new Error(`metaKey '${op.key}' not allowed`);
      emit(k, { type: 'meta.key', key: op.key, value: op.value });
      break;
    case 'script': {
      const fn = k.content.scripts?.[op.id];
      if (!fn) throw new Error(`unknown script '${op.id}'`);
      fn(scriptApi(k), op.params);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

export function matchValue(actual: unknown, want: MatchValue): boolean {
  if (Array.isArray(want)) return want.some((w) => w === actual);
  if (want !== null && typeof want === 'object') {
    if (typeof actual !== 'number') return false;
    return (want.gte === undefined || actual >= want.gte) && (want.lte === undefined || actual <= want.lte);
  }
  if (Array.isArray(actual)) return actual.includes(want);
  return actual === want;
}

function matches(t: TriggerDef, e: GameEvent): boolean {
  if (t.on !== e.type) return false;
  if (!t.match) return true;
  const rec = e as unknown as Record<string, unknown>;
  for (const [key, v] of Object.entries(t.match)) if (!matchValue(rec[key], v)) return false;
  return true;
}

function exhausted(k: K, t: TriggerDef): boolean {
  if (t.once ?? true) return k.state.story.fired.includes(t.id);
  return t.max !== undefined && (k.state.story.counts[t.id] ?? 0) >= t.max;
}

function fire(k: K, t: TriggerDef, e?: GameEvent): void {
  const st = k.state.story;
  if (!st.fired.includes(t.id)) st.fired.push(t.id);
  st.counts[t.id] = (st.counts[t.id] ?? 0) + 1;
  emit(k, { type: 'story.trigger', id: t.id });
  applyStoryOps(k, t.ops, e as unknown as Vars | undefined);
}

let sortedCache: { src: TriggerDef[]; sorted: TriggerDef[] } | null = null;
function sortedTriggers(list: TriggerDef[]): TriggerDef[] {
  if (sortedCache && sortedCache.src === list) return sortedCache.sorted;
  const sorted = list.slice().sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  sortedCache = { src: list, sorted };
  return sorted;
}

/**
 * Run story triggers against the events produced so far (from `cursor`) and current state.
 * Repeats while new events appear, up to a depth limit. Returns nothing; ops emit into k.events.
 */
export function runTriggers(k: K, cursor = 0): void {
  const triggers = sortedTriggers(k.content.triggers);
  const firedThisDispatch = new Set<string>();
  let pos = cursor;
  for (let pass = 0; pass < BALANCE.storyDepthLimit; pass++) {
    const evs = k.events.slice(pos);
    pos = k.events.length;
    let any = false;
    for (const t of triggers) {
      const once = t.once ?? true;
      if (exhausted(k, t)) continue;
      if (t.on) {
        for (const e of evs) {
          if (!matches(t, e) || !evalCond(k, t.cond)) continue;
          fire(k, t, e);
          any = true;
          if (once || exhausted(k, t)) break;
        }
      } else if (!firedThisDispatch.has(t.id) && evalCond(k, t.cond)) {
        firedThisDispatch.add(t.id);
        fire(k, t);
        any = true;
      }
    }
    refreshJobs(k);
    refreshObjectives(k);
    if (!any && pos === k.events.length) return;
  }
}

// ---------------------------------------------------------------------------
// Dialogue
// ---------------------------------------------------------------------------

export function openDialogue(k: K, id: Id): void {
  const d = k.content.dialogues[id];
  if (!d) throw new Error(`unknown dialogue '${id}'`);
  k.state.dialogue = { id, node: d.start };
  emit(k, { type: 'dialogue.opened', dialogue: id, node: d.start });
  applyStoryOps(k, d.nodes[d.start]?.ops);
}

export function currentDialogueNode(c: Ctx): DialogueNode | null {
  const ds = c.state.dialogue;
  if (!ds) return null;
  return c.content.dialogues[ds.id]?.nodes[ds.node] ?? null;
}

export interface ChoiceView {
  index: number;
  text: string;
  enabled: boolean;
  lockedText?: string;
}

/** Choices to show for the current dialogue node. Index is the index into node.choices. */
export function dialogueChoices(c: Ctx): ChoiceView[] {
  const node = currentDialogueNode(c);
  if (!node) return [];
  if (!node.choices || node.choices.length === 0) return [{ index: 0, text: node.next ? 'continue' : 'end', enabled: true }];
  const out: ChoiceView[] = [];
  node.choices.forEach((ch: DialogueChoice, i) => {
    const ok = evalCond(c, ch.cond);
    if (ok) out.push({ index: i, text: ch.text, enabled: true });
    else if (ch.showLocked) out.push({ index: i, text: ch.text, enabled: false, ...(ch.lockedText ? { lockedText: ch.lockedText } : {}) });
  });
  return out;
}

function closeDialogue(k: K): void {
  const ds = k.state.dialogue;
  if (!ds) return;
  k.state.dialogue = null;
  emit(k, { type: 'dialogue.closed', dialogue: ds.id });
}

function gotoNode(k: K, to: Id | undefined): void {
  const ds = k.state.dialogue!;
  const d = k.content.dialogues[ds.id];
  if (!to) return closeDialogue(k);
  if (!d.nodes[to]) throw new Error(`dialogue '${ds.id}' has no node '${to}'`);
  ds.node = to;
  emit(k, { type: 'dialogue.node', dialogue: ds.id, node: to });
  applyStoryOps(k, d.nodes[to].ops);
}

export function chooseDialogue(k: K, index: number): void {
  const node = currentDialogueNode(k);
  if (!node) reject('no dialogue open');
  if (!node.choices || node.choices.length === 0) {
    if (index !== 0) reject('only choice 0 (continue) is available');
    return gotoNode(k, node.next);
  }
  const ch = node.choices[index];
  if (!ch) reject(`no choice ${index}`);
  if (!evalCond(k, ch.cond)) reject(ch.lockedText ?? 'that choice is locked');
  const before = k.state.dialogue;
  applyStoryOps(k, ch.ops);
  // a choice op may have opened another dialogue; only advance if we are still in the same one
  if (k.state.dialogue === before) gotoNode(k, ch.to);
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export function setJobStatus(k: K, job: Id, status: JobStatus): void {
  if (!k.content.jobs[job]) throw new Error(`unknown job '${job}'`);
  const js = k.state.story.jobs[job] ?? { status: 'locked' };
  if (js.status === status) return;
  if ((js.status === 'done' || js.status === 'failed') && status === 'available') return;
  js.status = status;
  if (status === 'active') js.acceptedCycle = k.state.cycle;
  k.state.story.jobs[job] = js;
  emit(k, { type: 'job.status', job, status });
}

export function objectiveDone(c: Ctx, o: ObjectiveDef): boolean {
  const s = c.state;
  switch (o.kind) {
    case 'deliver': return s.player.paydata.some((p) => p.file === o.file);
    case 'own': return !!s.world.systems[o.system]?.owned;
    case 'capture': return !!s.story.flags[`captured.${o.system}.${o.node}`];
    case 'use': return !!s.story.flags[`used.${o.system}.${o.node}`];
    case 'flag': {
      const v = s.story.flags[o.flag];
      return o.is === undefined ? !!v : v === o.is;
    }
  }
}

export function refreshJobs(k: K): void {
  for (const job of Object.values(k.content.jobs)) {
    const st = jobStatus(k, job.id);
    if (st === 'locked' && job.autoOffer && k.state.player.rep >= (job.minRep ?? 0) && evalCond(k, job.cond)) {
      setJobStatus(k, job.id, 'available');
    } else if (st === 'active' || st === 'ready') {
      const done = job.objectives.every((o) => objectiveDone(k, o));
      if (done && st === 'active') setJobStatus(k, job.id, 'ready');
      if (!done && st === 'ready') setJobStatus(k, job.id, 'active');
    }
  }
}

export function acceptJob(k: K, id: Id): void {
  const job = k.content.jobs[id];
  if (!job) reject(`unknown job '${id}'`);
  if (jobStatus(k, id) !== 'available') reject('job is not available');
  if (k.state.player.rep < (job.minRep ?? 0)) reject(`needs rep ${job.minRep}`);
  setJobStatus(k, id, 'active');
  if (job.target && hasSystem(k, job.target)) addAddress(k, job.target, `job:${id}`);
  refreshJobs(k);
}

export function turnInJob(k: K, id: Id): void {
  const job = k.content.jobs[id];
  if (!job) reject(`unknown job '${id}'`);
  refreshJobs(k);
  if (jobStatus(k, id) !== 'ready') reject('objectives not complete');
  for (const o of job.objectives) {
    if (o.kind === 'deliver') {
      const i = k.state.player.paydata.findIndex((p) => p.file === o.file);
      if (i >= 0) k.state.player.paydata.splice(i, 1);
    }
  }
  setJobStatus(k, id, 'done');
  if (job.reward.credits) addCredits(k, job.reward.credits, `job ${job.title}`);
  if (job.reward.xp) addXp(k, job.reward.xp);
  if (job.heat) addHeat(k, job.heat, `loud job: ${job.title}`);
  applyStoryOps(k, job.reward.ops);
}

export function abandonJob(k: K, id: Id): void {
  const st = jobStatus(k, id);
  if (st !== 'active' && st !== 'ready') reject('job is not active');
  setJobStatus(k, id, 'available');
}

// ---------------------------------------------------------------------------
// Objectives (the main/side tracker; separate from fixer-board jobs)
// ---------------------------------------------------------------------------

function setObjective(k: K, op: Extract<StoryOp, { op: 'objective' }>, vars?: Vars): void {
  const all = k.state.story.objectives;
  const cur = all[op.id];
  const next = cur ?? { id: op.id, kind: op.kind ?? 'main', text: op.text ?? op.id, status: 'active' as ObjectiveStatus, cycle: k.state.cycle };
  if (op.text !== undefined) next.text = interpolate(k, op.text, vars);
  if (op.kind) next.kind = op.kind;
  if (op.n !== undefined) next.n = op.n;
  if (op.max !== undefined) next.max = op.max;
  if (op.doneWhen) next.doneWhen = op.doneWhen;
  if (op.anchor !== undefined) next.anchor = op.anchor;
  if (op.speaker !== undefined) next.speaker = op.speaker;
  const status = op.status ?? (cur ? cur.status : 'active');
  const changed = !cur || cur.status !== status;
  next.status = status;
  all[op.id] = next;
  if (changed) emit(k, { type: 'objective', id: op.id, status, kind: next.kind });
}

/** ui/hintDone: the player dismissed a tutorial step. */
export function hintDone(k: K, id: Id): void {
  const o = k.state.story.objectives[id];
  if (!o || o.kind !== 'tutorial') reject('no such tutorial step');
  if (o.status === 'done') return;
  o.status = 'done';
  emit(k, { type: 'objective', id, status: 'done', kind: o.kind });
}

export function refreshObjectives(k: K): void {
  for (const o of Object.values(k.state.story.objectives)) {
    if (o.status === 'active' && o.doneWhen && evalCond(k, o.doneWhen)) {
      o.status = 'done';
      emit(k, { type: 'objective', id: o.id, status: 'done', kind: o.kind });
    }
  }
}

export function nodeCaptureFlag(system: Id, node: Id): string {
  return `captured.${system}.${node}`;
}
