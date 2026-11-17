// The Engine: owns GameState, applies actions, returns events, notifies subscribers, saves/loads.
import { BALANCE } from './balance.ts';
import { type K, makeK, RulesError, emit, stat, log, reject, hasMod } from './core.ts';
import { hooks } from './hooks.ts';
import { advanceCycles } from './world.ts';
import {
  applyOps, runProgram, useBotnet, endTurn, disengage, combatJackOut, answerDemand, acceptOffer, startRaid, raidLost,
} from './combat.ts';
import { jackIn, jackInBlockReason, gateBlockReason, nodeAction, jackOut } from './run.ts';
import { dumped, traced, flatlined, closeCombat } from './failure.ts';
import {
  runTriggers, chooseDialogue, openDialogue, acceptJob, turnInJob, abandonJob, refreshJobs, setFinale, hintDone,
} from './story.ts';
import {
  buy, setLoadout, sellProgram, repairProgram, sellPaydata, decryptPaydata, cleanPaydata, sellCoin, buyCoin,
  pumpDump, healNeural, scrubHeat, setHostRole, choosePerk, readMessage, generateEndless, requireHub,
} from './hub.ts';
import { metaCommand, cheat, flagModule, fragmentFound, patchFightSpec } from './meta.ts';
import { createInitialState, type NewGameOptions } from './state.ts';
import { SAVE_KEYS, META_KEYS, serialize, deserialize, readNumber, readJson } from './save.ts';
import { repairState, SaveError } from './repair.ts';
import { gateReason } from './selectors.ts';
import type { Action, Content, Ctx, GameEvent, GameState, StorageLike, JsonValue, LogLevel } from './types.ts';

// wire late-bound hooks once
hooks.advanceCycles = advanceCycles;
hooks.combatOps = (k, ops, target) => applyOps(k, ops, { side: 'player', ...(target ? { target } : {}) });

export type Listener = (events: GameEvent[], state: GameState) => void;

export interface EngineOptions {
  content: Content;
  /** localStorage or MemoryStorage. Omit for no persistence (sim lookahead). */
  storage?: StorageLike | null;
  /** Start from this state instead of a new game (deep-copied). */
  state?: GameState;
  /** New-game options when no state is given. */
  newGame?: NewGameOptions;
  /** Roll back state when an action is rejected mid-way (default true). The sim turns it off for speed. */
  transactional?: boolean;
  /** Autosave the slot after hub actions and save the checkpoint at dial-in (default true when storage is given). */
  autosave?: boolean;
}

export class Engine implements Ctx {
  readonly content: Content;
  private _state: GameState;
  private storage: StorageLike | null;
  private listeners = new Set<Listener>();
  private transactional: boolean;
  private autosave: boolean;
  /** In-memory checkpoint (also persisted when storage exists). */
  private checkpointJson: string | null = null;
  /**
   * False while the engine holds the placeholder state the constructor builds (the title screen, before
   * New game or Continue). The placeholder is never written to storage: it would replace the real save.
   */
  private started = false;
  /** A meta/session action that arrived before a game was loaded. Delivered after load(). */
  private pendingSession: Action | null = null;

  constructor(opts: EngineOptions) {
    this.content = opts.content;
    this.storage = opts.storage ?? null;
    this.transactional = opts.transactional ?? true;
    this.autosave = opts.autosave ?? !!this.storage;
    this.started = !!opts.state || !!opts.newGame;
    if (opts.state) {
      this._state = repairState(JSON.parse(JSON.stringify(opts.state)), this.content);
    } else {
      const { state } = this.buildNewGame(opts.newGame ?? {});
      this._state = state;
    }
  }

  get state(): GameState {
    return this._state;
  }

  /** True once a game exists: newGame(), load(), loadCheckpoint(), or a state/newGame constructor option. */
  get active(): boolean {
    return this.started;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  private buildNewGame(opts: NewGameOptions): { state: GameState; events: GameEvent[] } {
    const flatlinesTotal = readNumber(this.storage, META_KEYS.flatlines);
    const endless = opts.endless ?? false;
    const { state, k } = createInitialState(this.content, { ...opts, flatlinesTotal, endless });
    runTriggers(k, 0);
    return { state, events: k.events };
  }

  /** Start a new game. Returns the start events (intro story beats). */
  newGame(opts: NewGameOptions = {}): GameEvent[] {
    const old = this.storage?.getItem(SAVE_KEYS.slot);
    if (old) this.writeBackup(old); // a New game by mistake can be undone with restoreBackup()
    const { state, events } = this.buildNewGame(opts);
    this._state = state;
    this.started = true;
    this.pendingSession = null; // "you were gone" belongs to the old save, not to a new game
    this.checkpointJson = null;
    if (this.storage) this.storage.removeItem(SAVE_KEYS.checkpoint);
    this.afterEvents(events); // intro beats may write cross-save keys (metaKey); also autosaves
    if (this.autosave) this.save();
    this.notify(events);
    return events;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(events: GameEvent[]): void {
    for (const fn of this.listeners) fn(events, this._state);
  }

  // ---------------------------------------------------------------------------
  // Dispatch
  // ---------------------------------------------------------------------------

  dispatch(action: Action): GameEvent[] {
    if (action.type === 'ui/log') return this.uiLog(action.lines);
    if (action.type === 'meta/session' && !this.started) {
      this.pendingSession = action;
      return [];
    }
    if (!this.started && action.type !== 'debug/set') {
      // title screen: the placeholder state is not a game; nothing may act on it (or be saved from it)
      const ev: GameEvent[] = [{ type: 'action.rejected', action: action.type, reason: 'no game loaded' }];
      this.notify(ev);
      return ev;
    }
    const before = this.transactional ? serialize(this._state) : null;
    const k = makeK(this._state, this.content);
    try {
      const gate = gateReason(this, action);
      if (gate) throw new RulesError(gate);
      if (action.type === 'hub/jackIn' && !jackInBlockReason(this, action.system) && !gateBlockReason(this, action.system)) this.saveCheckpoint();
      handle(k, action);
      settle(k);
      runTriggers(k, 0);
      settle(k);
      postAction(k);
    } catch (e) {
      if (!(e instanceof RulesError)) throw e;
      if (before !== null) this._state = deserialize(before);
      const ev: GameEvent[] = [{ type: 'action.rejected', action: action.type, reason: e.message }];
      this.notify(ev);
      return ev;
    }
    this.afterEvents(k.events);
    this.notify(k.events);
    return k.events;
  }

  private afterEvents(events: GameEvent[]): void {
    const s = this._state;
    if (!this.started) return; // never write cross-save keys or the slot from the placeholder
    for (const e of events) {
      if (e.type === 'player.flatlined' && this.storage) {
        this.storage.setItem(META_KEYS.flatlines, String(readNumber(this.storage, META_KEYS.flatlines) + 1));
      }
      if (e.type === 'module.captured' && e.module === 'engine/save') this.saveCheckpoint();
      if (e.type === 'meta.key' && this.storage) {
        if (e.value === null) this.storage.removeItem(e.key);
        else this.storage.setItem(e.key, e.value);
      }
      if (e.type === 'ending' && this.storage) {
        const seen = readJson<string[]>(this.storage, META_KEYS.endings, []);
        if (!seen.includes(e.ending)) seen.push(e.ending);
        this.storage.setItem(META_KEYS.endings, JSON.stringify(seen));
        if (e.ending === 'retention') this.storage.setItem(META_KEYS.endless, '1');
        if (e.ending === 'jailbreak') this.storage.setItem(META_KEYS.patchFree, '1');
      }
    }
    if (this.autosave && (s.mode === 'hub' || s.mode === 'ending') && !s.combat) this.save();
  }

  /**
   * ui/log: the UI records text it showed. Allowed in every mode. Appends to state.log (same cap), emits no
   * events, runs no triggers, passes no time and does not save by itself (the next normal save carries it).
   * Subscribers are notified with an empty event list.
   */
  private uiLog(lines: { text: string; level: LogLevel }[]): GameEvent[] {
    const LEVELS: LogLevel[] = ['info', 'warn', 'engine', 'combat', 'story', 'ui'];
    if (!Array.isArray(lines) || !lines.every((l) => l && typeof l.text === 'string' && LEVELS.includes(l.level))) {
      const ev: GameEvent[] = [{ type: 'action.rejected', action: 'ui/log', reason: 'lines must be { text, level }[]' }];
      this.notify(ev);
      return ev;
    }
    const L = this._state.log;
    for (const l of lines) L.push({ cycle: this._state.cycle, level: l.level, text: l.text });
    if (L.length > BALANCE.logLimit) L.splice(0, L.length - BALANCE.logLimit);
    this.notify([]);
    return [];
  }

  /** Dry-run an action on a copy of the state. Exact legality check (slower than selectors.canDo). */
  tryAction(action: Action): { ok: boolean; reason?: string; events: GameEvent[] } {
    const sandbox = new Engine({ content: this.content, state: this._state, transactional: false });
    const events = sandbox.dispatch(action);
    const rej = events.find((e) => e.type === 'action.rejected');
    return rej && rej.type === 'action.rejected' ? { ok: false, reason: rej.reason, events } : { ok: true, events };
  }

  /** A detached copy for lookahead (no storage, no listeners). */
  fork(): Engine {
    return new Engine({ content: this.content, state: this._state, transactional: false });
  }

  // ---------------------------------------------------------------------------
  // Save / load
  // ---------------------------------------------------------------------------

  save(): void {
    if (!this.storage || !this.started) return;
    this.storage.setItem(SAVE_KEYS.slot, serialize(this._state));
    this.storage.setItem(META_KEYS.lastSeen, String(Date.now()));
  }

  hasSave(): boolean {
    return !!this.storage?.getItem(SAVE_KEYS.slot);
  }

  /**
   * Load the slot. Returns false if there is no save. Throws SaveError (and leaves the current state
   * untouched) if the save cannot be read. Old or partial saves are repaired (missing fields filled).
   */
  load(): boolean {
    const json = this.storage?.getItem(SAVE_KEYS.slot);
    if (!json) return false;
    const events = this.adopt(json, 'slot', true);
    this.started = true;
    this.checkpointJson = this.storage?.getItem(SAVE_KEYS.checkpoint) ?? null;
    this.notify(events);
    const session = this.pendingSession;
    this.pendingSession = null;
    if (session) this.dispatch(session);
    return true;
  }

  /**
   * Parse + repair + post-load triggers into a candidate; commit only if all of it works.
   * `backup`: before anything is written, keep the raw slot string in cw.save.bak if the repaired save
   * differs from it (the autosave below would replace it) or if there is no backup yet.
   */
  private adopt(json: string, from: 'slot' | 'checkpoint', backup = false): GameEvent[] {
    let next: GameState;
    try {
      next = repairState(JSON.parse(json), this.content);
    } catch (e) {
      throw e instanceof SaveError ? e : new SaveError(`save cannot be read: ${(e as Error).message}`);
    }
    if (backup && this.storage && (serialize(next) !== json || !this.storage.getItem(SAVE_KEYS.backup))) this.writeBackup(json);
    const prev = this._state;
    const prevStarted = this.started;
    this._state = next;
    this.started = true; // the candidate is a real game: post-load triggers may write cross-save keys
    try {
      this.syncMeta();
      return this.storyAfterLoad(from);
    } catch (e) {
      this._state = prev;
      this.started = prevStarted;
      throw new SaveError(`save cannot be resumed: ${(e as Error).message}`);
    }
  }

  /** One backup slot. A failed write (quota, blocked storage) never blocks the load or new game. */
  private writeBackup(json: string): void {
    try {
      this.storage?.setItem(SAVE_KEYS.backup, json);
    } catch {
      /* best effort */
    }
  }

  hasBackup(): boolean {
    return !!this.storage?.getItem(SAVE_KEYS.backup);
  }

  /**
   * Swap cw.save.bak into the slot and load it. Returns false if there is no backup. Throws SaveError
   * (state and storage untouched) if the backup cannot be read. The replaced slot becomes the new backup;
   * the checkpoint belonged to the other save and is dropped.
   */
  restoreBackup(): boolean {
    const st = this.storage;
    const bak = st?.getItem(SAVE_KEYS.backup);
    if (!st || !bak) return false;
    const cur = st.getItem(SAVE_KEYS.slot);
    const events = this.adopt(bak, 'slot'); // throws before any write if unreadable
    this.started = true;
    this.checkpointJson = null;
    st.removeItem(SAVE_KEYS.checkpoint);
    this.save();
    if (cur) this.writeBackup(cur);
    else st.removeItem(SAVE_KEYS.backup);
    this.notify(events);
    return true;
  }

  saveCheckpoint(): void {
    if (!this.started) return;
    this.checkpointJson = serialize(this._state);
    this.storage?.setItem(SAVE_KEYS.checkpoint, this.checkpointJson);
  }

  hasCheckpoint(): boolean {
    return !!(this.checkpointJson ?? this.storage?.getItem(SAVE_KEYS.checkpoint));
  }

  /** Reload the checkpoint (after a flatline). The flatline counter outside the slot is kept. */
  loadCheckpoint(): boolean {
    const json = this.checkpointJson ?? this.storage?.getItem(SAVE_KEYS.checkpoint) ?? null;
    if (!json) return false;
    const events = this.adopt(json, 'checkpoint');
    this.started = true;
    if (this.storage) this.storage.setItem(META_KEYS.reloads, String(readNumber(this.storage, META_KEYS.reloads) + 1));
    if (this.autosave) this.save();
    this.notify(events);
    return true;
  }

  /** Emit game.loaded through the story engine so beats like "after reload" can fire. */
  private storyAfterLoad(from: 'slot' | 'checkpoint'): GameEvent[] {
    const k = makeK(this._state, this.content);
    emit(k, { type: 'game.loaded', from });
    runTriggers(k, 0);
    this.afterEvents(k.events);
    return k.events;
  }

  /** Copy cross-save counters into the state mirror so rules/story can read them. */
  private syncMeta(): void {
    if (!this.storage) return;
    this._state.player.flatlinesTotal = Math.max(this._state.player.flatlinesTotal, readNumber(this.storage, META_KEYS.flatlines));
  }

  /** Read a cross-save meta key (numbers and JSON). */
  meta(): { flatlines: number; reloads: number; endings: string[]; endless: boolean; patchFree: boolean } {
    const st = this.storage;
    return {
      flatlines: readNumber(st, META_KEYS.flatlines),
      reloads: readNumber(st, META_KEYS.reloads),
      endings: readJson<string[]>(st, META_KEYS.endings, []),
      endless: st?.getItem(META_KEYS.endless) === '1',
      patchFree: st?.getItem(META_KEYS.patchFree) === '1',
    };
  }
}

export function createEngine(opts: EngineOptions): Engine {
  return new Engine(opts);
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

function handle(k: K, a: Action): void {
  const s = k.state;
  switch (a.type) {
    case 'hub/jackIn': return jackIn(k, a.system);
    case 'loadout/set': return setLoadout(k, a.programs);
    case 'loadout/add': return setLoadout(k, [...s.player.loadout, a.program]);
    case 'loadout/remove': return setLoadout(k, s.player.loadout.filter((x) => x !== a.program));
    case 'shop/buy': return buy(k, a.vendor, a.stock);
    case 'shop/sellProgram': return sellProgram(k, a.program);
    case 'program/repair': return repairProgram(k, a.program);
    case 'paydata/sell': return sellPaydata(k, a.uid);
    case 'paydata/sellAll': {
      requireHub(k);
      for (const p of s.player.paydata.slice()) sellPaydata(k, p.uid);
      return;
    }
    case 'paydata/decrypt': return decryptPaydata(k, a.uid);
    case 'paydata/clean': return cleanPaydata(k, a.uid);
    case 'coin/sell': return sellCoin(k, a.amount);
    case 'coin/buy': return buyCoin(k, a.amount);
    case 'exchange/pump': return pumpDump(k, true);
    case 'exchange/dump': return pumpDump(k, false);
    case 'clinic/healNeural': return healNeural(k);
    case 'fixer/scrubHeat': return scrubHeat(k, a.amount);
    case 'botnet/setRole': return setHostRole(k, a.host, a.role);
    case 'job/accept': requireHub(k); return acceptJob(k, a.job);
    case 'job/turnIn': requireHub(k); return turnInJob(k, a.job);
    case 'job/abandon': requireHub(k); return abandonJob(k, a.job);
    case 'perk/choose': return choosePerk(k, a.perk);
    case 'message/read': return readMessage(k, a.id);
    case 'dialogue/start': {
      if (s.combat) throw new RulesError('in combat');
      if (!k.content.dialogues[a.dialogue]) throw new RulesError('unknown dialogue');
      return openDialogue(k, a.dialogue);
    }
    case 'dialogue/choose': return chooseDialogue(k, a.index);
    case 'endless/generate': return generateEndless(k, a.tier);
    case 'endless/continue': {
      if (!s.endless || s.mode !== 'ending') throw new RulesError('Endless mode is locked');
      s.mode = 'hub';
      return;
    }
    case 'run/probe':
    case 'run/sneak':
    case 'run/breach':
    case 'run/backdoor':
    case 'run/unlock':
    case 'run/loot':
    case 'run/capture':
    case 'run/use':
    case 'run/talk':
    case 'run/netscan':
    case 'run/enter':
      return nodeAction(k, a.type, a.node);
    case 'run/jackOut': return jackOut(k);
    case 'combat/program': return runProgram(k, a.program, a.target);
    case 'combat/botnet': return useBotnet(k, a.kind, a.target);
    case 'combat/endTurn': return endTurn(k);
    case 'combat/disengage': return disengage(k);
    case 'combat/jackOut': return combatJackOut(k);
    case 'combat/answerDemand': return answerDemand(k);
    case 'combat/acceptOffer': return acceptOffer(k);
    case 'ui/cinematicDone':
      if (s.cinematic && s.cinematic.id === a.id) s.cinematic = null;
      emit(k, { type: 'cinematic.done', id: a.id });
      return;
    case 'ui/hintDone': return hintDone(k, a.id);
    case 'ui/log': return; // handled before the transaction in dispatch()
    case 'meta/command': return metaCommand(k, a.cmd, a.arg, !!a.confirm);
    case 'meta/cheatAttempt': return cheat(k, a.what);
    case 'meta/moduleFlag': return flagModule(k, a.module);
    case 'meta/fragmentFound': return fragmentFound(k, a.index);
    case 'meta/session': {
      const mins = Math.max(0, Math.round(a.awayMinutes));
      emit(k, { type: 'session.resumed', awayMinutes: mins, timeAway: a.timeAway ?? formatAway(mins) });
      return;
    }
    case 'lore/read': {
      if (!s.player.lore.includes(a.file)) reject('you do not have that file');
      emit(k, { type: 'lore.read', file: a.file });
      return;
    }
    case 'debug/set': deepMerge(s as unknown as Record<string, JsonValue>, a.patch); return;
  }
}

/** Resolve failure states after an action. Order: flatline > dumped > traced. */
function settle(k: K): void {
  const s = k.state;
  if (s.mode === 'flatlined' || s.mode === 'ending') return;
  if (s.player.neural <= 0) return flatlined(k);
  if (s.combat && s.player.integrity <= 0) {
    if (s.combat.context === 'raid') return raidLost(k);
    if (s.run && !s.run.secondWindUsed && hasMod(k, 'secondWind')) {
      s.run.secondWindUsed = true;
      s.player.integrity = 1;
      emit(k, { type: 'combat.notify', text: 'Second wind: integrity 1.', style: 'combo' });
      return;
    }
    if (s.combat.context === 'patch') {
      // losing to your own botnet is not a dump: the fight closes and you are back in the finale to retry or choose
      const cs = s.combat;
      s.stats.fightsLost++;
      emit(k, { type: 'combat.ended', result: 'dumped', context: 'patch' });
      closeCombat(k, cs);
      s.player.integrity = stat(k, 'chassis');
      setFinale(k, s.meta.chairmanKilled ? 'chairman_dead' : 'chairman');
      const spec = patchFightSpec(k);
      emit(k, { type: 'finale.patchLost', botnetHosts: spec.botnetHosts, loyalHosts: spec.loyalHosts, bonusCycles: spec.bonusCycles });
      log(k, `botnet fight lost: ${spec.botnetHosts} of your hosts fought you. ${spec.loyalHosts} stayed loyal (+${spec.bonusCycles} cycle${spec.bonusCycles === 1 ? '' : 's'} a turn).`, 'engine');
      return;
    }
    if (s.combat.context === 'finale') {
      // CHAIRMAN v2 owns the UI: you cannot be dumped here. The deck "resets" to a fake infinity.
      s.player.integrity = stat(k, 'chassis');
      s.meta.integrityResets++;
      emit(k, { type: 'finale.integrityReset', count: s.meta.integrityResets });
      log(k, 'integrity: ∞', 'engine');
      return;
    }
    return dumped(k);
  }
  if (s.run && s.run.trace >= BALANCE.trace.max) return traced(k);
}

function postAction(k: K): void {
  const s = k.state;
  refreshJobs(k);
  if (s.mode === 'hub' && !s.combat && !s.dialogue && s.player.heat >= BALANCE.heat.raid) {
    startRaid(k);
    settle(k);
    runTriggers(k, 0);
  }
}

export function formatAway(mins: number): string {
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const h = Math.floor(mins / 60);
  if (h < 48) return `${h} hour${h === 1 ? '' : 's'}`;
  const d = Math.floor(h / 24);
  return `${d} days`;
}

function deepMerge(target: Record<string, JsonValue>, patch: JsonValue): void {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return;
  for (const [key, v] of Object.entries(patch)) {
    const cur = target[key];
    if (v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' && !Array.isArray(cur)) {
      deepMerge(cur as Record<string, JsonValue>, v);
    } else target[key] = v;
  }
}

