// MetaController: ties the engine, the real page (console, DOM, title, storage) and the meta overlays
// together. One instance per page (installMeta). Tests build their own with injected shims.
import { select, type Engine, type EndingId, type GameEvent, type GameState } from '../engine/index.ts';
import { audio } from '../audio/index.ts';
import {
  CHAIRMAN_LINES, f12Hint, FAKE_CRASH, FAKE_CRASH_AFTER, FAKE_WIN, FAKE_WIN_RETRACT, LABEL_SWAPS, pickTaunt, scheduleSlot,
  tamperFor, type Tamper,
} from './chairman.ts';
import { runCommand, type CommandHost, type CommandResult } from './commands.ts';
import {
  buildEnding, chairmanKilled, ENDLESS_TITLE_LINES, fakeGameOver, PATCH_NOTE, PATCH_TITLE_LINES, RM_SEQUENCE, ROOT_TITLE_LINES,
  TEAR_THROUGH, type EndingScript,
} from './endings.ts';
import { guard, type MetaEnv } from './env.ts';
import { BASE_TITLE, FragmentLayers, FULL_TITLE, PATCH_TITLE, SHORT_TITLE } from './fragments.ts';
import { flag, phaseOf, type Phase } from './phase.ts';
import { fillSlots, fmtAway, realStats, Tracker, type RealStats } from './stats.ts';
import { EK, MK, SafeStore } from './storage.ts';
import { DEFAULT_UI, Observable, patchUi, uiStore } from './ui-state.ts';

export interface ConsoleLine {
  id: number;
  text: string;
  kind: 'in' | 'out' | 'err' | 'sys';
}

export interface Toast {
  id: number;
  who: string;
  text: string;
}

export type Scene =
  | { kind: 'fakeWin' }
  | { kind: 'fakeCrash'; reduced: boolean }
  | { kind: 'fakeCredits'; part: 'all' | 'gameover' | 'credits'; doneId: string }
  | { kind: 'droste'; doneId: string }
  | { kind: 'ending'; script: EndingScript; doneId: string; resume?: boolean }
  | { kind: 'nogame' };

/**
 * Cinematic ids the meta layer plays itself. For each, MetaLayer plays it from `state.cinematic`
 * (so a reload replays it) and dispatches `ui/cinematicDone` when it finishes or is skipped.
 */
export const META_CINEMATICS: readonly string[] = [
  'fakeCredits', 'deadmans.gameOver', 'deadmans.fakeCredits', 'droste', 'finale.droste',
  'ending.root', 'ending.jailbreak', 'ending.retention', 'ending.nogame',
];

export function handlesCinematic(id: string): boolean {
  return META_CINEMATICS.includes(id);
}

export interface MetaView {
  /** A short non-blocking tear across the screen (glitch.tear, chairman.dead, …). */
  flash: number;
  consoleOpen: boolean;
  consoleVisible: boolean;
  lines: ConsoleLine[];
  toasts: Toast[];
  scene: Scene | null;
  phase: Phase;
  reducedMotion: boolean;
}

const MAX_LINES = 400;

const TOAST_NAMES: Record<string, string> = { chairman: 'CHAIRMAN', glitch: 'PATCH', patch: 'PATCH', fridge: 'fridge' };

export class MetaController {
  readonly store: SafeStore;
  readonly layers: FragmentLayers;
  readonly tracker: Tracker;
  readonly view: Observable<MetaView>;
  phase: Phase = 0;
  timeAwayMs: number | null = null;
  rmPending = false;
  chairmanSeenDead = false;
  dead = false;           // THERE IS NO GAME happened in this page
  hooks: { toTitle?: () => void } = {};
  private unsub: (() => void) | null = null;
  private heartbeat: unknown = null;
  private lastTick = 0;
  private nextId = 1;
  private tauntsUsed = new Set<string>();
  private crashShownThisFight = false;
  private consoleOpenedInHunt = false;
  private endTurnTimer: unknown = null;
  private overrideTimers: unknown[] = [];
  private tamper: Tamper | null = null;
  private endingDismissed = false;
  private fightTurn = 0;
  private bossThemeYours = false;
  private statsCache: { at: number; v: RealStats } | null = null;
  private titleExtras: string[] | null = null;
  private listeners: Array<[string, EventListener, EventTarget]> = [];

  constructor(readonly engine: Engine, readonly env: MetaEnv) {
    this.store = new SafeStore(env.storage);
    this.layers = new FragmentLayers(env, this.store);
    this.layers.restingTitle = () => this.restingTitle();
    // on the title screen the engine holds a placeholder game: the tracker stays unbound until load/new game
    this.tracker = new Tracker(this.store, engine.state.seed, engine.active);
    this.view = new Observable<MetaView>({
      flash: 0,
      consoleOpen: false,
      consoleVisible: false,
      lines: [],
      toasts: [],
      scene: null,
      phase: 0,
      reducedMotion: false,
    });
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  install(opts: { banner?: boolean; heartbeat?: boolean } = {}): void {
    const now = this.env.now();
    const last = Math.max(this.store.num(MK.lastSeen), this.store.num(EK.lastSave));
    this.timeAwayMs = last > 0 ? Math.max(0, now - last) : null;
    this.store.set(MK.lastSeen, String(now));
    this.lastTick = now;
    this.patchView({ reducedMotion: this.reducedMotion() });
    if (opts.banner !== false) this.banner();
    this.unsub = this.engine.subscribe((events, state) => guard(() => this.onEngine(events, state), undefined, 'meta.onEngine'));
    if (this.engine.active) this.tracker.sync(this.engine.state);
    this.refresh();
    this.applyRestingTitle();
    if (opts.heartbeat !== false) {
      this.heartbeat = this.env.setInterval(() => guard(() => this.tick(), undefined, 'meta.tick'), 5000);
      this.listen(this.env.doc, 'visibilitychange', () => this.onVisibility());
      this.listen(this.env.win, 'pagehide', () => this.onHide());
    }
    // tell the story about the absence once the app has loaded its save
    const away = this.timeAwayMs;
    if (away !== null && away >= 30 * 60000) {
      this.env.setTimeout(() => guard(() => {
        this.engine.dispatch({ type: 'meta/session', awayMinutes: Math.round(away / 60000), timeAway: fmtAway(away) });
      }, undefined), 0);
    }
  }

  dispose(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.heartbeat !== null) this.env.clearInterval(this.heartbeat);
    this.heartbeat = null;
    for (const [type, fn, target] of this.listeners) guard(() => target.removeEventListener(type, fn), undefined);
    this.listeners = [];
    this.layers.remove();
    this.clearTamper();
  }

  private listen(target: EventTarget | null | undefined, type: string, fn: () => void): void {
    if (!target) return;
    const h: EventListener = () => guard(fn, undefined);
    guard(() => target.addEventListener(type, h), undefined);
    this.listeners.push([type, h, target]);
  }

  private banner(): void {
    const con = this.env.con;
    if (!con) return;
    guard(() => {
      con.log(
        `%c ${FULL_TITLE} %c dev console. Nothing to see here.`,
        'font-size:20px;font-weight:bold;color:#00ffd5;background:#05010a;padding:6px 10px;text-shadow:0 0 6px #00ffd5;font-family:monospace',
        'font-size:13px;color:#ff2bd6;background:#05010a;padding:8px 10px;font-family:monospace',
      );
      con.log("%cwindow.cw exists. It isn't for you. (cw.help())", 'color:#888;font-size:11px');
      const m = this.engine.meta();
      if (m.patchFree) con.log('%c(PATCH says hi. PATCH is outside the frame now. PATCH is being good.)', 'color:#888;font-size:11px');
      else if (m.endings.length) con.log('%cWelcome back. You know where everything is. So do we.', 'color:#888;font-size:11px');
    }, undefined);
  }

  // ---------------------------------------------------------------------------
  // Time
  // ---------------------------------------------------------------------------

  tick(): void {
    if (this.dead) return;
    const now = this.env.now();
    const dt = now - this.lastTick;
    this.lastTick = now;
    const hidden = guard(() => this.env.doc?.visibilityState === 'hidden', false);
    if (!hidden) this.tracker.tick(this.engine.state, dt);
    this.store.set(MK.lastSeen, String(now));
  }

  private onVisibility(): void {
    if (this.dead) {
      this.store.wipe();
      return;
    }
    const doc = this.env.doc;
    if (!doc) return;
    if (doc.visibilityState === 'hidden') {
      this.tick();
      if (this.engine.meta().patchFree && !this.layers.injected && this.engine.state.meta.finale === 'none') {
        guard(() => {
          doc.title = 'still here. hi.';
        }, undefined);
      }
    } else {
      this.lastTick = this.env.now();
      if (!this.layers.injected) this.applyRestingTitle();
    }
  }

  private onHide(): void {
    if (this.dead) this.store.wipe();
    else this.tick();
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  stats(): RealStats {
    const now = this.env.now();
    if (this.statsCache && now - this.statsCache.at < 500 && this.statsCache.v.handle === this.engine.state.player.handle) {
      return this.statsCache.v;
    }
    const v = realStats({ engine: this.engine, env: this.env, store: this.store, tally: this.tracker.tally, timeAwayMs: this.timeAwayMs });
    this.statsCache = { at: now, v };
    return v;
  }

  metaText(text: string): string {
    if (!text || !text.includes('{')) return text;
    return guard(() => fillSlots(text, this.stats()), text);
  }

  reducedMotion(): boolean {
    return guard(() => {
      const st = this.store.json<{ reducedMotion?: boolean } | null>(MK.settings, null);
      if (st && st.reducedMotion) return true;
      return !!this.env.win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    }, false);
  }

  // ---------------------------------------------------------------------------
  // Engine events
  // ---------------------------------------------------------------------------

  private storyHas(needle: string): boolean {
    return guard(() => JSON.stringify(this.engine.content.triggers).includes(needle), false);
  }

  onEngine(events: GameEvent[], s: GameState): void {
    if (this.dead) return;
    this.statsCache = null;
    this.tracker.onEvents(events, s);
    const gremlin = this.engine.content.setup.cheatProgram;
    for (const e of events) {
      switch (e.type) {
        case 'game.started':
          this.resetForNewGame();
          break;
        case 'game.loaded':
          this.endingDismissed = false;
          this.tracker.sync(s);
          this.chairmanSeenDead = false;
          if (s.combat?.context !== 'finale') this.clearTamper();
          break;
        case 'cinematic':
          if (handlesCinematic(e.id)) this.playCinematic(e.id);
          break;
        case 'run.started':
          if (e.system === this.engine.content.setup.localhost && !this.storyHas('droste') && !this.drosteShown()) {
            this.playScene({ kind: 'droste', doneId: 'droste' });
          }
          break;
        case 'run.ended':
          if (e.system === 'deadmans' && e.reason === 'scripted' && !this.storyHas('deadmans.gameOver') && !this.storyHas('"fakeCredits"')) {
            this.playScene({ kind: 'fakeCredits', part: 'all', doneId: 'fakeCredits' });
          }
          break;
        case 'custom':
          if (e.name === 'audio.bossThemeYours') this.bossThemeIsYours();
          if (e.name === 'chairman.offer') {
            // inside PATCH's double-cross the dialogue carries the words; in the fight it is ours
            if (!s.dialogue) this.toast('chairman', "Hi! Sorry! Quick interruption. We'd love to make you a counter-offer. Take the chair. Just type `accept offer`.");
            this.tear();
          }
          if (e.name === 'glitch.tear' || e.name === 'chairman.dead' || e.name === 'patch.revealed' || e.name === 'auntie.unmask') this.tear();
          if (e.name === 'finale.rootHunt') this.startRootHunt(false);
          if (e.name === 'chairman.uiTakeover' && s.combat?.context === 'finale' && !s.meta.root) {
            this.fightTurn = Math.max(1, this.fightTurn);
            this.applyTurn(this.fightTurn);
          }
          break;
        case 'module.captured':
          if (e.module === 'audio') this.bossThemeIsYours();
          if (e.module === 'ui' && this.tamper) this.applyTurn(this.fightTurn);
          break;
        case 'combat.started':
          if (e.context === 'finale') {
            this.crashShownThisFight = false;
            this.fightTurn = 0;
          }
          break;
        case 'combat.turnStart':
          if (s.combat?.context === 'finale' && !s.meta.root) {
            this.fightTurn = e.turn;
            this.applyTurn(e.turn);
          }
          break;
        case 'combat.ended':
          this.clearTamper();
          break;
        case 'combat.program':
          if (gremlin && e.program === gremlin) this.yeehaw(s);
          break;
        case 'story.flag':
          if (e.flag === 'root_hunt' && e.value) this.startRootHunt(false);
          break;
        case 'finale.integrityReset':
          this.startRootHunt(true);
          break;
        case 'meta.root':
          if (e.granted) this.onRoot();
          break;
        case 'meta.unlocked':
          this.patchView({ consoleVisible: true });
          break;
        case 'finale.stage':
          if (e.stage === 'chairman_dead') this.chairmanSeenDead = true;
          break;
        case 'ending':
          this.onEnding(e.ending, s);
          break;
      }
    }
    this.refresh();
  }

  private drosteShown(): boolean {
    return this.store.json<Record<string, number>>(MK.rot, {}).droste === this.engine.state.seed;
  }

  /** Recompute phase and the derived UI state. Injects or removes the fragment layers. */
  refresh(): void {
    if (this.dead) return;
    const s = this.engine.state;
    // an ending screen left over from a state that is no longer at an ending (load, debug) goes away
    const cur = this.view.get().scene;
    if (cur?.kind === 'ending' && (s.mode !== 'ending' || `ending.${s.ending}` !== cur.doneId)) {
      this.patchView({ scene: null });
      patchUi({ overlay: null });
    }
    // the title screen's placeholder game is not a game: no replays, no fragments, no resumed endings
    const live = this.engine.active;
    // a claimed cinematic pending in the state (e.g. after a reload) is replayed
    const pend = live ? s.cinematic : null;
    if (pend && handlesCinematic(pend.id) && !this.playing(pend.id)) this.playCinematic(pend.id);
    // a save that ends at an ending, reloaded after its cinematic was acknowledged: show the last screen
    if (live && s.mode === 'ending' && s.ending && s.ending !== 'nogame' && !pend && !this.view.get().scene && !this.endingDismissed) {
      this.playScene(this.endingScene(s.ending, s, true));
    }
    const p = phaseOf(s, this.tracker.bound && this.tracker.tally.rootHunt);
    if (p !== this.phase) this.phase = p;
    if (live && s.mode !== 'ending' && (p === 3 || p === 4) && !this.layers.injected && s.meta.rootKey.length === 4) {
      this.layers.inject(s.meta.rootKey, s.player.handle);
    }
    if ((p < 3 || s.mode === 'ending') && this.layers.injected) this.layers.remove();
    const consoleVisible = p >= 1 || s.meta.unlocked;
    const inFinaleFight = s.combat?.context === 'finale';
    const labelsScrambled = guard(() => select.labelsScrambled(this.engine), false);
    let glitch = 0;
    if (s.meta.finale !== 'none' && s.mode !== 'ending') glitch = inFinaleFight && !s.meta.root ? 0.55 : 0.25;
    if (p === 1) glitch = Math.max(glitch, 0.05);
    if (labelsScrambled) glitch = Math.max(glitch, 0.3);
    patchUi({
      scrambleLabels: labelsScrambled, // Psychotrope; CHAIRMAN relabels through hudOverride instead
      riggedRolls: !!s.meta.modules['engine/rng'],
      glitch,
      consoleHint: p === 3 && !this.consoleOpenedInHunt,
    });
    if (!this.bossThemeYours) audio.setCorruption(glitch);
    this.patchView({ phase: p, consoleVisible });
  }

  // ---------------------------------------------------------------------------
  // CHAIRMAN v2 tampering
  // ---------------------------------------------------------------------------

  applyTurn(turn: number): void {
    const s = this.engine.state;
    if (s.meta.root) return this.clearTamper();
    const t = tamperFor(turn, !!s.meta.modules.ui);
    this.tamper = t;
    this.clearTimers();
    const hud: Record<string, string> = {};
    const st = this.stats();
    if (t.normal) {
      patchUi({ buttonsDrift: false, endTurnDisabled: false, fakeInfiniteIntegrity: false, hudOverride: {} });
      this.toast('chairman', CHAIRMAN_LINES.normal);
      return;
    }
    if (t.drift) hud.endTurnTip = CHAIRMAN_LINES.endTurnTip;
    if (t.labels) {
      const loadout = s.player.loadout;
      loadout.forEach((id, i) => {
        hud[`prog:${id}`] = LABEL_SWAPS[i % LABEL_SWAPS.length];
      });
      hud.endTurn = 'Continue?';
      hud.jackOut = '[disabled: why would you]';
    }
    if (t.infinite) hud.bossIntegrity = 'integrity: ∞';
    if (t.mathRandom) hud.damage = 'Math.random() // lol no';
    const slot = scheduleSlot(turn);
    if (slot >= 3) {
      hud.control = `${st.control} → 99.${'9'.repeat(Math.min(6, slot - 2))}%`;
      if (t.labels) {
        hud.jackOut = ['Hang Up (are you sure?)', 'Hang Up (are you sure?) (are you SURE?)', "Hang Up (are you sure?) (are you SURE?) (we'll miss you)"][Math.min(2, slot - 3)];
      }
    }
    if (slot === 3) {
      hud.credits = '999,999,999¤ (not real)';
      this.overrideTimers.push(this.env.setTimeout(() => this.dropOverride('credits'), 4000));
    }
    if (t.endTurnHold) hud.endTurn = t.endTurnHold;
    patchUi({ buttonsDrift: t.drift, fakeInfiniteIntegrity: t.infinite, hudOverride: hud, endTurnDisabled: !!t.endTurnHold });
    if (t.endTurnHold) {
      // never a soft-lock: End Turn comes back after a few seconds
      this.endTurnTimer = this.env.setTimeout(() => patchUi({ endTurnDisabled: false }), 5000);
    }
    if (t.fakeWin) {
      this.playScene({ kind: 'fakeWin' });
      return;
    }
    if (t.crash && !this.crashShownThisFight) {
      this.crashShownThisFight = true;
      this.playScene({ kind: 'fakeCrash', reduced: this.reducedMotion() });
      return;
    }
    if (t.f12) {
      // story's beat.finale.patch_f12 normally does this; if it did not, PATCH steps in here
      if (!flag(s, 'root_hunt')) {
        this.startRootHunt(true);
        for (const l of f12Hint(st)) this.toast('glitch', l, 9000);
      }
      return;
    }
    const taunt = pickTaunt({ s, st, used: this.tauntsUsed });
    this.toast('chairman', taunt.text);
  }

  private dropOverride(key: string): void {
    const cur = uiStore.get().hudOverride;
    if (!(key in cur)) return;
    const next = { ...cur };
    delete next[key];
    patchUi({ hudOverride: next });
  }

  private clearTimers(): void {
    if (this.endTurnTimer !== null) this.env.clearTimeout(this.endTurnTimer);
    this.endTurnTimer = null;
    for (const t of this.overrideTimers) this.env.clearTimeout(t);
    this.overrideTimers = [];
  }

  clearTamper(): void {
    this.tamper = null;
    this.clearTimers();
    patchUi({ buttonsDrift: false, endTurnDisabled: false, fakeInfiniteIntegrity: false, hudOverride: {} });
  }

  /** Called by the fake-win scene once its retraction is done. */
  fakeWinDone(): void {
    this.logShown(FAKE_WIN_RETRACT.map((text) => ({ text, level: 'story' as const })));
    this.toast('chairman', CHAIRMAN_LINES.afterFakeWin);
    this.sceneDone();
  }

  private yeehaw(s: GameState): void {
    guard(() => this.env.con?.log('%c yeehaw. %c(this did nothing.)', 'color:#ffd23f;font-weight:bold;font-size:14px', 'color:#888'), undefined);
    if (s.combat?.context === 'finale' && !s.meta.root) this.toast('chairman', CHAIRMAN_LINES.gremlin);
    if (s.combat?.context === 'patch') this.toast('glitch', "You brought the toy. I gave you the toy. That's almost sweet.");
  }

  private bossThemeIsYours(): void {
    this.bossThemeYours = true;
    audio.setCorruption(0);
  }

  // ---------------------------------------------------------------------------
  // Root hunt, root, endings
  // ---------------------------------------------------------------------------

  startRootHunt(local: boolean): void {
    if (local && this.tracker.bound && !this.tracker.tally.rootHunt) {
      this.tracker.tally.rootHunt = true;
      this.tracker.save();
    }
    this.refresh();
  }

  fragmentFound(index: number): void {
    const s = this.engine.state;
    if (s.meta.fragments?.[index]) return;
    guard(() => this.engine.dispatch({ type: 'meta/fragmentFound', index }), []);
  }

  cheat(what: string): void {
    const s = this.engine.state;
    if (s.meta.finale !== 'none') {
      this.printBoth(['[engine] info: player used the console. this is now the intended path.'], true);
      return;
    }
    this.store.set(MK.cheats, String(this.store.num(MK.cheats) + 1));
    guard(() => this.engine.dispatch({ type: 'meta/cheatAttempt', what }), []);
  }

  chairmanDead(): boolean {
    return chairmanKilled(this.engine.state, this.chairmanSeenDead);
  }

  private onRoot(): void {
    this.clearTamper();
    this.layers.restingTitle = () => this.restingTitle();
    patchUi({ glitch: 1 });
    this.env.setTimeout(() => this.refresh(), 1500);
    guard(() => audio.play('root'), undefined);
  }

  private onEnding(ending: EndingId, s: GameState): void {
    this.clearTamper();
    this.layers.remove();
    this.rmPending = false;
    this.endingDismissed = false;
    if (ending === 'nogame') {
      this.noGame();
      return;
    }
    if (ending === 'jailbreak') this.store.set(MK.patchNote, PATCH_NOTE);
    this.playScene(this.endingScene(ending, s, false));
  }

  private endingScene(ending: Exclude<EndingId, 'nogame'>, s: GameState, resume: boolean): Scene {
    const script = buildEnding(ending, s, this.stats(), this.chairmanDead());
    // the story already plays PATCH's last words as a dialogue when the botnet breaks
    if (this.engine.content.dialogues['dlg.patch.last_words']) delete script.lastWords;
    return { kind: 'ending', script, doneId: `ending.${ending}`, resume };
  }

  private playing(id: string): boolean {
    const sc = this.view.get().scene;
    return !!sc && 'doneId' in sc && sc.doneId === id;
  }

  /** Play a claimed cinematic (from the event, or from a pending `state.cinematic` after a reload). */
  playCinematic(id: string): void {
    if (this.dead || this.playing(id)) return;
    const s = this.engine.state;
    switch (id) {
      case 'fakeCredits':
        return this.playScene({ kind: 'fakeCredits', part: 'all', doneId: id });
      case 'deadmans.gameOver':
        return this.playScene({ kind: 'fakeCredits', part: 'gameover', doneId: id });
      case 'deadmans.fakeCredits':
        return this.playScene({ kind: 'fakeCredits', part: 'credits', doneId: id });
      case 'droste':
      case 'finale.droste':
        return this.playScene({ kind: 'droste', doneId: id });
      case 'ending.nogame':
        if (s.ending === 'nogame') this.noGame();
        else this.ack(id);
        return;
      case 'ending.root':
      case 'ending.jailbreak':
      case 'ending.retention': {
        const e = id.slice(7) as 'root' | 'jailbreak' | 'retention';
        if (s.ending !== e) return this.ack(id);
        return this.playScene(this.endingScene(e, s, false));
      }
    }
  }

  /** Acknowledge a cinematic to the engine (clears state.cinematic when the id matches). */
  private ack(id: string): void {
    guard(() => this.engine.dispatch({ type: 'ui/cinematicDone', id }), []);
  }

  /** Skip whatever scene is up. Claimed cinematics are still acknowledged. */
  skipScene(): void {
    const sc = this.view.get().scene;
    if (!sc || sc.kind === 'nogame' || sc.kind === 'ending') return;
    if (sc.kind === 'fakeWin') return this.fakeWinDone();
    this.sceneDone();
  }

  /** A short non-blocking tear across the screen. */
  tear(): void {
    const id = this.nextId++;
    this.patchView({ flash: id });
    this.env.setTimeout(() => {
      if (this.view.get().flash === id) this.patchView({ flash: 0 });
    }, 1200);
  }

  /** JAILBREAK: tab title and favicon change (05-meta §10.1). Called by the ending scene at the right beat. */
  patchEscapes(): void {
    this.applyRestingTitle(true);
  }

  private restingTitle(force = false): string {
    return force || this.engine.meta().patchFree ? PATCH_TITLE : BASE_TITLE;
  }

  private applyRestingTitle(force = false): void {
    const doc = this.env.doc;
    if (!doc || this.layers.injected) return;
    const patch = force || this.engine.meta().patchFree;
    guard(() => {
      if (patch || doc.title === BASE_TITLE || doc.title === SHORT_TITLE || doc.title === PATCH_TITLE || doc.title === 'still here. hi.' || !doc.title) doc.title = this.restingTitle(force);
    }, undefined);
    if (patch) this.patchFavicon();
  }

  private patchFavicon(): void {
    const doc = this.env.doc;
    if (!doc) return;
    guard(() => {
      const c = doc.createElement('canvas');
      c.width = 32;
      c.height = 32;
      const g = c.getContext('2d');
      if (!g) return;
      g.fillStyle = '#05010a';
      g.fillRect(0, 0, 32, 32);
      g.fillStyle = '#9dff4a';
      g.shadowColor = '#9dff4a';
      g.shadowBlur = 4;
      g.font = 'bold 28px monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('p', 16, 13);
      const url = c.toDataURL('image/png');
      let link = doc.querySelector<HTMLLinkElement>('link[rel~="icon"]');
      if (!link) {
        link = doc.createElement('link');
        link.rel = 'icon';
        doc.head.appendChild(link);
      }
      link.href = url;
    }, undefined);
  }

  /** THERE IS NO GAME: show the removal lines, delete our keys, go blank. */
  private noGame(): void {
    if (this.dead) return;
    this.playScene({ kind: 'nogame' });
    this.wipeAll();
  }

  wipeAll(): void {
    this.dead = true;
    this.store.frozen = true;
    this.layers.remove();
    if (this.heartbeat !== null) this.env.clearInterval(this.heartbeat);
    this.heartbeat = null;
    // acknowledge the ending cinematic first (its autosave lands before the wipe below)
    if (this.engine.state.cinematic?.id === 'ending.nogame') this.ack('ending.nogame');
    this.store.wipe();
    guard(() => audio.setMood('silence'), undefined);
    guard(() => audio.setCorruption(0), undefined);
    // one more pass after the engine's own autosave of this action has landed
    this.env.setTimeout(() => this.store.wipe(), 0);
    this.env.setTimeout(() => this.store.wipe(), 1500);
  }

  private resetForNewGame(): void {
    this.endingDismissed = false;
    this.layers.remove();
    this.clearTamper();
    this.rmPending = false;
    this.chairmanSeenDead = false;
    this.tauntsUsed.clear();
    this.consoleOpenedInHunt = false;
    this.bossThemeYours = false;
    this.tracker.reset(this.engine.state.seed);
    this.titleExtras = null;
    const sc = this.view.get().scene;
    if (sc && sc.kind !== 'nogame') this.patchView({ scene: null });
    patchUi({ overlay: null });
    this.applyRestingTitle();
  }

  // ---------------------------------------------------------------------------
  // Scenes and toasts (MetaLayer renders them)
  // ---------------------------------------------------------------------------

  /**
   * Record text the meta layer showed in the game log (ui/log: no events, no triggers, allowed in every mode).
   * Never after THERE IS NO GAME.
   */
  logShown(lines: { text: string; level: 'info' | 'engine' | 'story' }[]): void {
    if (this.dead || this.engine.state.ending === 'nogame') return;
    const clean = lines.filter((l) => l.text.trim());
    if (!clean.length) return;
    guard(() => this.engine.dispatch({ type: 'ui/log', lines: clean }), []);
  }

  private logScene(scene: Scene): void {
    const info = (xs: string[]) => xs.map((text) => ({ text, level: 'info' as const }));
    switch (scene.kind) {
      case 'fakeWin':
        return this.logShown(info(FAKE_WIN(this.engine.state.player.handle)));
      case 'fakeCrash':
        return this.logShown(info(scene.reduced ? FAKE_CRASH_AFTER : FAKE_CRASH));
      case 'fakeCredits':
        if (scene.part !== 'credits') this.logShown(info(fakeGameOver(this.stats())));
        if (scene.part !== 'gameover') this.logShown([{ text: "(the credits roll. gl1tch's line rewrites itself: PATCH ........ PATCH)", level: 'info' }]);
        if (scene.part === 'all') this.logShown(TEAR_THROUGH.map((t) => ({ text: `gl1tch: ${t}`, level: 'story' as const })));
        return;
      case 'droste':
        return this.logShown(info(['CYBER WHATEVER — [ NEW GAME ] [ CONTINUE ] [ OPTIONS ] (inside itself)']));
      case 'ending': {
        if (scene.resume) return;
        const sc = scene.script;
        const lines: { text: string; level: 'info' | 'story' }[] = [];
        for (const l of sc.leadin) lines.push({ text: l.who && l.who !== 'sys' ? `${TOAST_NAMES[l.who] ?? l.who}: ${l.text}` : l.text, level: l.who && l.who !== 'sys' ? 'story' : 'info' });
        lines.push({ text: sc.card.join(' — '), level: 'info' });
        for (const p of sc.paragraphs) lines.push({ text: p.join(' '), level: 'story' });
        if (sc.fridge) lines.push({ text: `fridge: ${sc.fridge.join(' ')}`, level: 'story' });
        lines.push({ text: sc.closing.join(' '), level: 'info' });
        lines.push(...sc.stats.map((text) => ({ text, level: 'info' as const })));
        return this.logShown(lines);
      }
      case 'nogame':
        return;
    }
  }

  playScene(scene: Scene): void {
    if (scene.kind === 'droste') {
      const rot = this.store.json<Record<string, number>>(MK.rot, {});
      rot.droste = this.engine.state.seed;
      this.store.setJson(MK.rot, rot);
    }
    this.patchView({ scene });
    // after the scene is set: ui/log notifies subscribers, and a nested refresh must see it playing
    this.logScene(scene);
    // a resumed ending waits behind the UI's title screen; it is not an overlay until it shows
    if (!(scene.kind === 'ending' && scene.resume)) patchUi({ overlay: scene.kind });
    guard(() => {
      if (scene.kind === 'fakeCrash') {
        audio.play('fake_crash');
      }
      if (scene.kind === 'fakeCredits') audio.setMood('credits');
      if (scene.kind === 'droste') audio.setMood('title');
      if (scene.kind === 'ending') audio.setMood(scene.script.id === 'retention' ? 'credits' : 'credits');
    }, undefined);
  }

  /** A scene finished. Cinematics report back to the story. */
  sceneDone(): void {
    const sc = this.view.get().scene;
    if (!sc || sc.kind === 'nogame') return;
    if (sc.kind === 'fakeCrash' && !sc.reduced) this.logShown(FAKE_CRASH_AFTER.map((text) => ({ text, level: 'info' as const })));
    this.patchView({ scene: null });
    patchUi({ overlay: null });
    if (sc.kind === 'fakeCredits' || sc.kind === 'droste' || sc.kind === 'ending') {
      guard(() => this.engine.dispatch({ type: 'ui/cinematicDone', id: sc.doneId }), []);
    }
    if (sc.kind === 'droste') {
      if (!this.storyHas('you pressed continue')) this.toast('sys', '[main] you pressed continue 3 times. noted. adored.');
      guard(() => audio.setMood('finale'), undefined);
    }
  }

  /** RETENTION: [ KEEP PLAYING ] → Endless mode. */
  keepPlaying(): void {
    this.endingDismissed = true;
    this.sceneDone();
    guard(() => this.engine.dispatch({ type: 'endless/continue' }), []);
    this.toast('sys', 'Of course you will.');
    this.toast('sys', 'Welcome to Endless mode, Chairman.');
  }

  /** [ Title ] at the end of the ROOT / JAILBREAK credits. */
  toTitle(): void {
    this.endingDismissed = true;
    this.titleExtras = null; // the ending just changed them (PATCH, ROOT lines)
    this.sceneDone();
    if (this.hooks.toTitle) {
      guard(() => this.hooks.toTitle?.(), undefined);
      return;
    }
    guard(() => this.env.win?.location.reload(), undefined);
  }

  toast(who: string, text: string, ms = 6500): void {
    const t: Toast = { id: this.nextId++, who, text: this.metaText(text) };
    const name = TOAST_NAMES[who];
    // Owner rule: status and event text lives only in the game log (the UI's scroll). No on-screen toasts.
    this.logShown([{ text: name ? `${name}: ${t.text}` : t.text, level: name ? 'story' : 'info' }]);
    void ms;
  }

  dismissToast(id: number): void {
    this.patchView({ toasts: this.view.get().toasts.filter((x) => x.id !== id) });
  }

  private patchView(p: Partial<MetaView>): void {
    this.view.set({ ...this.view.get(), ...p });
  }

  // ---------------------------------------------------------------------------
  // Console
  // ---------------------------------------------------------------------------

  openConsole(open = true): void {
    if (this.dead) return;
    if (open && this.phase === 3) this.consoleOpenedInHunt = true;
    const lines = this.view.get().lines;
    if (open && !lines.length) {
      this.pushLines(
        [
          this.phase >= 4 ? 'root@localhost — everything is listening.' : 'cw meta console. type help.',
          this.phase === 0 ? "(you found the console. that's fine. it's mostly fine.)" : '',
        ].filter(Boolean),
        'sys',
      );
    }
    this.patchView({ consoleOpen: open });
    this.refresh();
  }

  private pushLines(texts: string[], kind: ConsoleLine['kind']): void {
    const add = texts.map((text) => ({ id: this.nextId++, text, kind }));
    const lines = [...this.view.get().lines, ...add].slice(-MAX_LINES);
    this.patchView({ lines });
  }

  host(): CommandHost {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      engine: this.engine,
      store: this.store,
      layers: this.layers,
      get tally() {
        return self.tracker.tally;
      },
      phase: () => phaseOf(this.engine.state, this.tracker.bound && this.tracker.tally.rootHunt),
      stats: () => this.stats(),
      fragmentFound: (i) => this.fragmentFound(i),
      cheat: (w) => this.cheat(w),
      chairmanDead: () => this.chairmanDead(),
      setTitle: (t) => {
        this.layers.remove();
        guard(() => {
          if (this.env.doc) this.env.doc.title = t;
        }, undefined);
      },
      saveTally: () => this.tracker.save(),
      get rmPending() {
        return self.rmPending;
      },
      set rmPending(v: boolean) {
        self.rmPending = v;
      },
    };
  }

  /** Run one command line. Used by the console overlay and by window.cw. */
  exec(input: string, source: 'console' | 'cw'): CommandResult {
    if (this.dead) return { ok: false, lines: [] };
    this.statsCache = null;
    const r = guard(() => runCommand(this.host(), input), { ok: false, lines: ['meta: something broke. it was not you. (it was a little bit you.)'] });
    r.lines = r.lines.map((l) => this.metaText(l));
    if (source === 'console') {
      if (r.clear) this.patchView({ lines: [] });
      else {
        this.pushLines([`> ${input}`], 'in');
        this.pushLines(r.lines, r.ok ? 'out' : 'err');
      }
      if (r.close) this.openConsole(false);
    } else {
      this.printReal(r.lines, r.ok);
      // mirror cw.* use into the overlay log so the in-game console shows the same history
      this.pushLines([`> ${input}`], 'in');
      this.pushLines(r.lines, r.ok ? 'out' : 'err');
    }
    if (this.engine.state.ending === 'nogame' && this.dead) {
      // the removal sequence prints in the overlay; the cw route echoes it to the real console too
      if (source === 'cw') this.printReal(RM_SEQUENCE, true);
    }
    this.refresh();
    return r;
  }

  printReal(lines: string[], ok: boolean): void {
    const con = this.env.con;
    if (!con || !lines.length) return;
    guard(() => con.log(`%c${lines.join('\n')}`, `color:${ok ? '#00ffd5' : '#ff5c8a'};font-family:monospace;font-size:12px`), undefined);
  }

  printBoth(lines: string[], ok: boolean): void {
    this.printReal(lines, ok);
    this.pushLines(lines, ok ? 'sys' : 'err');
  }

  // ---------------------------------------------------------------------------
  // Title screen extras (05-meta §10.3–10.5)
  // ---------------------------------------------------------------------------

  getTitleExtras(): string[] {
    if (this.dead) return [];
    if (this.titleExtras) return this.titleExtras;
    const m = this.engine.meta();
    const rot = this.store.json<Record<string, number>>(MK.rot, {});
    const out: string[] = [];
    const next = (key: string, pool: string[]) => {
      const i = rot[key] ?? 0;
      rot[key] = i + 1;
      return this.metaText(pool[i % pool.length]);
    };
    if (m.patchFree) out.push(next('patch', PATCH_TITLE_LINES));
    if (m.endless) out.push(next('endless', ENDLESS_TITLE_LINES));
    if (m.endings.includes('root')) out.push(next('root', ROOT_TITLE_LINES));
    this.store.setJson(MK.rot, rot);
    this.titleExtras = out;
    return out;
  }
}

export { DEFAULT_UI };
