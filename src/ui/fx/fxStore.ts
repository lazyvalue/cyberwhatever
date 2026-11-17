// Transient visual effects. Kept apart from the UI store so effects never re-render whole screens.
import { createStore } from '../store.ts';
import { reducedMotion } from '../settings.ts';
import { logLine } from '../game.ts';

export interface FloatFx { id: number; x: number; y: number; text: string; cls: string; }
export interface BannerFx { id: number; text: string; sub?: string; cls: string; }

export const fx = createStore<{ floats: FloatFx[]; banners: BannerFx[] }>({ floats: [], banners: [] });

let n = 1;
const MAX_FLOATS = 14;

/** Canvas renderers read these timestamps (performance.now()) to animate without React. */
export const iceFx: Record<string, { hitAt?: number; shellAt?: number; dieAt?: number; actAt?: number; kind?: string }> = {};
export const mapFx: { ping: Record<string, number>; capture: Record<string, number>; reveal: Record<string, number>; alarmAt: number; coach: string | null } = {
  ping: {}, capture: {}, reveal: {}, alarmAt: 0, coach: null,
};

/** Floating text on screen is for numbers only (damage, heal, shield). Words go to the log. */
const NUMERIC = /^(crit )?[+−-]?\d+(\.\d+)?(¤| xp)?( \(rigged: max\))?$/;

export function floatAt(x: number, y: number, text: string, cls = '', force = false): void {
  if (!force && !NUMERIC.test(text.trim())) return;
  const id = n++;
  const jitter = (Math.random() - 0.5) * 36;
  fx.set((s) => ({ floats: [...s.floats.slice(-(MAX_FLOATS - 1)), { id, x: x + jitter, y, text, cls }] }));
  setTimeout(() => fx.set((s) => ({ floats: s.floats.filter((f) => f.id !== id) })), reducedMotion() ? 1300 : 1000);
}

/** Float text over an element (by selector), falling back to screen centre. */
export function floatOn(selector: string, text: string, cls = '', dy = 0, force = false): void {
  const el = document.querySelector(selector);
  if (el) {
    const r = el.getBoundingClientRect();
    floatAt(r.left + r.width / 2, r.top + r.height * 0.45 + dy, text, cls, force);
  } else floatAt(window.innerWidth / 2, window.innerHeight * 0.4 + dy, text, cls, force);
}

/** A headline moment (level up, system owned, alarm, ambush): an important log line, no floating text. */
export function banner(text: string, cls = '', sub?: string, _ms = 0): void {
  logLine(sub ? `${text}. ${sub}` : text, cls === 'red' ? 'warn' : cls === 'lime' || cls === 'pink' ? 'story' : 'info', true);
}

/** Restart a CSS animation class on an element. */
export function pulse(el: Element | null, cls: string): void {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
  const off = () => {
    el.classList.remove(cls);
    el.removeEventListener('animationend', off);
  };
  el.addEventListener('animationend', off);
}

export function pulseSel(selector: string, cls: string): void {
  pulse(document.querySelector(selector), cls);
}

/** Screen shake on the main stage (skipped with reduced motion). */
export function shake(big = false): void {
  if (reducedMotion()) return;
  pulseSel('.shell-main', big ? 'shake-big' : 'shake');
}

export function flash(color: 'red' | 'white'): void {
  pulse(document.body, color === 'red' ? 'flash-red' : 'flash-white');
}

export function chroma(selector = '.shell-main'): void {
  if (reducedMotion()) return;
  pulseSel(selector, 'chroma');
}
