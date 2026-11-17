// UI settings: text speed, motion, scanlines. Audio volumes live in the audio module (cw.audio.*).
import { audio } from '../audio/index.ts';

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export type MotionPref = 'auto' | 'reduced' | 'full';

export interface UiSettings {
  textSpeed: TextSpeed;
  motion: MotionPref;
  scanlines: boolean;
  showLog: boolean;
  animSpeed: 1 | 2 | 4;
  tutorials: boolean;
  uiScale: number;
}

const KEY = 'cw.ui.settings';
const DEFAULTS: UiSettings = { textSpeed: 'normal', motion: 'auto', scanlines: true, showLog: true, animSpeed: 1, tutorials: true, uiScale: 1 };

function load(): UiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<UiSettings>) };
  } catch {
    /* private mode or bad JSON */
  }
  return { ...DEFAULTS };
}

let current = load();
const listeners = new Set<() => void>();

export const settings = {
  get(): UiSettings {
    return current;
  },
  set(patch: Partial<UiSettings>): void {
    current = { ...current, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* ignore */
    }
    applyMotionClass();
    applyUiScale();
    listeners.forEach((fn) => fn());
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

const mq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
mq?.addEventListener?.('change', () => {
  applyMotionClass();
  listeners.forEach((fn) => fn());
});

/** True when motion should be minimal (user setting or OS preference). */
export function reducedMotion(): boolean {
  if (current.motion === 'reduced') return true;
  if (current.motion === 'full') return false;
  return !!mq?.matches;
}

export function applyMotionClass(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('reduced-motion', reducedMotion());
}

/** Milliseconds per typed character. */
export function charDelay(): number {
  switch (current.textSpeed) {
    case 'slow': return 38;
    case 'normal': return 18;
    case 'fast': return 7;
    case 'instant': return 0;
  }
}

export function audioSettings() {
  return audio.getSettings();
}

export const UI_SCALES = [0.9, 1, 1.15, 1.3] as const;

/** UI scale setting: multiplies the root font-size (every rem-based size follows). */
export function applyUiScale(): void {
  if (typeof document === 'undefined') return;
  const v = UI_SCALES.includes(current.uiScale as (typeof UI_SCALES)[number]) ? current.uiScale : 1;
  document.documentElement.style.setProperty('--ui-scale', String(v));
}
