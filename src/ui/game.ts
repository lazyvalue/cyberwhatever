// The UI's handle on the engine plus UI-only state (overlays, selection, holds).
import { select, type Action, type Engine, type GameState, type LogLevel } from '../engine/index.ts';
import { audio } from '../audio/index.ts';
import { createStore } from './store.ts';
import { metaOverlayUp, metaText } from './metaBridge.ts';

let _engine: Engine | null = null;
export function bindEngine(e: Engine): void {
  _engine = e;
}
export function engine(): Engine {
  if (!_engine) throw new Error('engine not bound');
  return _engine;
}

export type HubTab = 'net' | 'deck' | 'botnet' | 'market' | 'wallet' | 'inbox' | 'jobs' | 'files' | 'rep' | 'stats';

export interface Toast { id: number; text: string; tone: 'info' | 'money' | 'good' | 'bad' | 'hot'; }
export interface Card { id: number; title?: string; text: string; cinematic?: string; }
export interface Hint { id: string; text: string; anchor?: string; speaker?: string; }
export interface Comms { id: number; from: string; text: string; }
export interface Failure {
  kind: 'dumped' | 'traced' | 'flatlined';
  text: string;
  foot: string;
}
export interface Hold {
  state: GameState;
  kind: 'victory' | 'fail' | 'other';
  banner?: string;
}

export interface UiState {
  phase: 'title' | 'game';
  tab: HubTab;
  selectedNode: string | null;
  target: string | null;
  hold: Hold | null;
  failure: Failure | null;
  cards: Card[];
  hint: Hint | null;
  hintsSeen: string[];
  logOpen: boolean;
  settingsOpen: boolean;
  wipe: number;
  busy: boolean;
  /** Vendors that already said hello this visit home. */
  greeted: string[];
  /** Hints button: show the coach (past hints) even with no active step. */
  coachOpen: boolean;
  /** The tutorial coach is on screen. */
  coaching: boolean;
  /** The Guide (the `?` manual). */
  guideOpen: boolean;
  guideSection: string | null;
  guideAnchor: string | null;
  /** Fight inspector: what is inspected (ICE uid or `daemon:<programId>`; null = the target) and, when narrow, whether it is open. */
  inspect: string | null;
  inspectOpen: boolean;
}

function loadGuideSection(): string | null {
  try {
    return localStorage.getItem('cw.ui.guide');
  } catch {
    return null;
  }
}

function loadSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem('cw.ui.hints') ?? '[]') as string[];
  } catch {
    return [];
  }
}

export const ui = createStore<UiState>({
  phase: 'title',
  tab: 'net',
  selectedNode: null,
  target: null,
  hold: null,
  failure: null,
  cards: [],
  hint: null,
  hintsSeen: loadSeen(),
  logOpen: false,
  settingsOpen: false,
  wipe: 0,
  busy: false,
  greeted: [],
  coachOpen: false,
  coaching: false,
  guideOpen: false,
  guideSection: loadGuideSection(),
  guideAnchor: null,
  inspect: null,
  inspectOpen: false,
});

let seq = 1;
export function nextId(): number {
  return seq++;
}

// ------------------------------------------------------------------ log sink
// Every text the UI shows for a moment (toasts, comms, banners, hints, dialogue lines, combat summaries)
// also goes to the game log through logLine(). Lines are batched and written into the engine's own log
// (ui/log), so they persist with the save. Without engine support they fall back to a session list.

export interface UiLogLine { cycle: number; level: LogLevel; text: string; }
export const sessionLog = createStore<{ lines: UiLogLine[] }>({ lines: [] });
let pendingLines: { text: string; level: LogLevel }[] = [];
let flushQueued = false;

/** Invisible marker at the start of a log line: shown stronger in the log (stories, failures, level-ups, owned systems). */
export const IMPORTANT = '\u2063';

/**
 * The single sink for status and event text. Nothing else may put event text on screen:
 * the log ("the scroll") shows it with an entrance highlight, and the engine saves it.
 */
export function logLine(text: string, level: LogLevel = 'info', important = false): void {
  const t = metaText(text).replace(/\s+\n/g, '\n').trim();
  if (!t || !_engine) return;
  if (_engine.state.ending === 'nogame') return;
  pendingLines.push({ text: important ? IMPORTANT + t : t, level });
  if (!flushQueued) {
    flushQueued = true;
    setTimeout(flushLog, 0);
  }
}

function flushLog(): void {
  flushQueued = false;
  const e = _engine;
  const lines = pendingLines;
  pendingLines = [];
  if (!e || !lines.length || e.state.ending === 'nogame') return;
  const recent = new Set(e.state.log.slice(-12).map((l) => l.text));
  const fresh = lines.filter((l) => !recent.has(l.text));
  if (!fresh.length) return;
  const ev = e.dispatch({ type: 'ui/log', lines: fresh });
  if (!ev.some((x) => x.type === 'action.rejected')) return;
  // fallback: keep it for this session at least
  const cycle = e.state.cycle;
  sessionLog.set((s) => ({ lines: [...s.lines, ...fresh.map((l) => ({ ...l, cycle }))].slice(-500) }));
}

/** A status notice: goes to the log only (owner rule: one scroll for all status and event text). */
export function toast(text: string, tone: Toast['tone'] = 'info', _ms = 0, level?: LogLevel): void {
  logLine(text, level ?? (tone === 'bad' ? 'warn' : 'info'), tone === 'hot' || tone === 'bad');
}

export function dismissHint(): void {
  const h = ui.get().hint;
  if (!h) return;
  const seen = [...ui.get().hintsSeen, h.id];
  try {
    localStorage.setItem('cw.ui.hints', JSON.stringify(seen.slice(-200)));
  } catch {
    /* ignore */
  }
  ui.set({ hint: null, hintsSeen: seen });
}

/** Snapshot of the state before the last combat action (for the end-of-fight hold). */
let pendingSnapshot: GameState | null = null;
export function takeSnapshot(): GameState | null {
  const s = pendingSnapshot;
  pendingSnapshot = null;
  return s;
}

/** Shake a control and say why it is blocked. */
export function refuse(el: Element | null | undefined, reason: string): void {
  audio.play('ui_error');
  if (el instanceof HTMLElement) {
    el.classList.remove('shake-no');
    void el.offsetWidth;
    el.classList.add('shake-no');
  }
  toast(reason, 'bad', 2600);
}

/**
 * Dispatch an action from a control. Checks legality first so a refusal is instant and explained.
 * Returns true when the engine accepted it.
 */
export function act(a: Action, el?: Element | null): boolean {
  audio.unlock();
  const e = engine();
  const chk = select.canDo(e, a);
  if (!chk.ok) {
    refuse(el, chk.reason);
    return false;
  }
  pendingSnapshot = e.state.combat ? (JSON.parse(JSON.stringify(e.state)) as GameState) : null;
  const ev = e.dispatch(a);
  const rej = ev.find((x) => x.type === 'action.rejected');
  if (rej && rej.type === 'action.rejected') {
    pendingSnapshot = null;
    if (el instanceof HTMLElement) {
      el.classList.remove('shake-no');
      void el.offsetWidth;
      el.classList.add('shake-no');
    }
    return false;
  }
  return true;
}

/** Element lookup by data-ui key. */
export function uiEl(key: string): HTMLElement | null {
  return document.querySelector(`[data-ui="${CSS.escape(key)}"]`);
}

/** Log: a drawer on narrow screens, a docked column on wide ones. */
export function toggleLog(narrow = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 1100px)').matches): void {
  // the log is always docked on wide windows; on narrow ones it is a ticker that opens a drawer
  if (narrow) ui.set((s) => ({ logOpen: !s.logOpen }));
}

/** Dev/QA hooks (exposed as window.__cwUi in dev builds only). */
export const testHooks: {
  nodePoint?: (id: string) => { x: number; y: number } | null;
  metaOverride?: (p: Record<string, unknown> | null) => void;
  coachNode?: () => string | null;
} = {};

/** Screen hotkeys pause while a modal or a meta scene owns the screen. */
export function keysBlocked(opts: { allowDialogue?: boolean } = {}): boolean {
  const u = ui.get();
  const st = _engine?.state;
  return metaOverlayUp() || u.cards.length > 0 || !!u.failure || u.settingsOpen || u.guideOpen || !!st?.cinematic || (!opts.allowDialogue && !!st?.dialogue);
}

/**
 * Open the Guide at a section (and optionally an entry inside it). With no section it opens where the player is
 * (see contextSection in overlays/Guide.tsx, passed in by the caller) or at the last section read.
 * The guide sits over anything except cinematics and meta scenes; it never spends a cycle.
 */
export function openGuide(section?: string | null, anchor?: string | null): void {
  if (_engine?.state.cinematic || metaOverlayUp()) return;
  const sec = section ?? ui.get().guideSection;
  if (sec) {
    try {
      localStorage.setItem('cw.ui.guide', sec);
    } catch {
      /* ignore */
    }
  }
  audio.play('ui_open', { volume: 0.5 });
  ui.set({ guideOpen: true, guideSection: sec, guideAnchor: anchor ?? null, coachOpen: false });
}

export function closeGuide(): void {
  audio.play('ui_close', { volume: 0.5 });
  ui.set({ guideOpen: false, guideAnchor: null });
}
