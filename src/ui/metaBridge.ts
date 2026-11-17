// Safe bridge to the fourth-wall layer (src/meta, owned by the meta agent).
// The UI codes against the contract below. Missing exports fall back to inert defaults,
// so the UI works while src/meta is still a stub and keeps working if an export is renamed.
import type { ComponentType } from 'preact';
import * as metaModule from '../meta/index.ts';
import type { Engine } from '../engine/index.ts';

export interface MetaUiState {
  scrambleLabels: boolean;
  endTurnDisabled: boolean;
  buttonsDrift: boolean;
  fakeInfiniteIntegrity: boolean;
  riggedRolls: boolean;
  hudOverride: Record<string, string>;
  glitch: number;
  consoleHint: boolean;
  /** Non-null while a full-screen meta scene is up ('ending', 'fakeWin', 'fakeCrash', …): pause UI hotkeys. */
  overlay: string | null;
}

interface MetaContract {
  installMeta?: (engine: Engine) => void;
  MetaLayer?: ComponentType<{ engine: Engine }>;
  getTitleExtras?: () => string[];
  metaUi?: { get(): Partial<MetaUiState>; subscribe(fn: () => void): () => void };
  /** Opens the meta console (corner button). Falls back to a synthetic backtick key. */
  openMetaConsole?: (open?: boolean) => void;
  /** Fills real-world slots ({playtime}, {localTime}, …) in displayed text. */
  metaText?: (text: string) => string;
  /** The meta layer's label scrambler (used while scrambleLabels is on). */
  scrambleText?: (text: string) => string;
  /** UI callbacks the meta layer may call (e.g. back to the title after the credits). */
  setMetaHooks?: (hk: { toTitle?: () => void }) => void;
  /** Optional: cinematic ids the meta layer plays itself (the UI plays the rest as cards). */
  META_CINEMATICS?: readonly string[];
  /** True when MetaLayer plays this cinematic and dispatches ui/cinematicDone itself. */
  handlesCinematic?: (id: string) => boolean;
}

const m = metaModule as unknown as MetaContract;

export const DEFAULT_META_UI: MetaUiState = {
  scrambleLabels: false,
  endTurnDisabled: false,
  buttonsDrift: false,
  fakeInfiniteIntegrity: false,
  riggedRolls: false,
  hudOverride: {},
  glitch: 0,
  consoleHint: false,
  overlay: null,
};

export function installMeta(engine: Engine): void {
  try {
    m.installMeta?.(engine);
  } catch (e) {
    console.error('[ui] installMeta failed', e);
  }
}

export const MetaLayer: ComponentType<{ engine: Engine }> | null = typeof m.MetaLayer === 'function' ? m.MetaLayer : null;

export function getTitleExtras(): string[] {
  try {
    const x = m.getTitleExtras?.();
    return Array.isArray(x) ? x.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

// QA-only override (window.__cwUi.metaOverride in ?qa builds) so automation can check every MetaUiState field.
let qaOverride: Partial<MetaUiState> | null = null;
const localSubs = new Set<() => void>();
export function setQaMetaOverride(p: Partial<MetaUiState> | null): void {
  qaOverride = p;
  localSubs.forEach((f) => f());
}

export function metaUiState(): MetaUiState {
  let base = DEFAULT_META_UI;
  try {
    const s = m.metaUi?.get();
    if (s) base = { ...DEFAULT_META_UI, ...s, hudOverride: s.hudOverride ?? {} };
  } catch {
    /* fall through to defaults */
  }
  return qaOverride ? { ...base, ...qaOverride, hudOverride: { ...base.hudOverride, ...(qaOverride.hudOverride ?? {}) } } : base;
}

export function subscribeMetaUi(fn: () => void): () => void {
  localSubs.add(fn);
  let off: () => void = () => undefined;
  try {
    off = m.metaUi?.subscribe(fn) ?? off;
  } catch {
    /* ignore */
  }
  return () => {
    localSubs.delete(fn);
    off();
  };
}

export function openMetaConsole(): void {
  if (m.openMetaConsole) {
    m.openMetaConsole(true);
    return;
  }
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '`', code: 'Backquote', bubbles: true }));
}

/** True when the meta layer plays this cinematic itself (then it also dispatches ui/cinematicDone). */
export function metaOwnsCinematic(id: string): boolean {
  if (id.startsWith('ending.')) return true; // endings are always the meta layer's
  try {
    if (m.handlesCinematic) return !!m.handlesCinematic(id);
  } catch {
    /* fall back to the exported list */
  }
  return Array.isArray(m.META_CINEMATICS) && m.META_CINEMATICS.includes(id);
}

export function metaText(text: string): string {
  try {
    return m.metaText ? m.metaText(text) : text;
  } catch {
    return text;
  }
}

export function metaScramble(text: string): string | null {
  try {
    return m.scrambleText ? m.scrambleText(text) : null;
  } catch {
    return null;
  }
}

export function setMetaHooks(hk: { toTitle?: () => void }): void {
  try {
    m.setMetaHooks?.(hk);
  } catch {
    /* ignore */
  }
}

export const metaPresent = !!m.MetaLayer;

/** True while a meta scene owns the screen: UI hotkeys must not fire. */
export function metaOverlayUp(): boolean {
  return !!metaUiState().overlay;
}
