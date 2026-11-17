// One shared requestAnimationFrame loop for every canvas. Callbacks get (now ms, dt ms).
import { useEffect, useRef } from 'preact/hooks';

type Fn = (t: number, dt: number) => void;
const fns = new Set<Fn>();
let raf = 0;
let last = 0;

function loop(t: number): void {
  const dt = Math.min(64, t - (last || t));
  last = t;
  for (const f of fns) {
    try {
      f(t, dt);
    } catch (e) {
      console.error('[ui] canvas draw failed', e);
      fns.delete(f);
    }
  }
  raf = fns.size ? requestAnimationFrame(loop) : 0;
}

export function onFrame(fn: Fn): () => void {
  fns.add(fn);
  if (!raf) {
    last = 0;
    raf = requestAnimationFrame(loop);
  }
  return () => {
    fns.delete(fn);
  };
}

/** Size a canvas to its CSS box at device pixel ratio (max 2). Returns the 2D context scaled to CSS px. */
export function fitCanvas(c: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const r = c.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/**
 * Hook: draw on a canvas every frame. `draw` is read through a ref so it may close over fresh props.
 * Skips frames while the canvas is off-screen.
 */
export function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let visible = true;
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => (visible = es[0]?.isIntersecting ?? true)) : null;
    io?.observe(c);
    const off = onFrame((t, dt) => {
      if (!visible) return;
      const f = fitCanvas(c);
      if (f) drawRef.current(f.ctx, f.w, f.h, t, dt);
    });
    return () => {
      off();
      io?.disconnect();
    };
  }, []);
  return ref;
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let remCache = 0;
/** Root font-size in px (follows the window size and the UI scale setting). Canvas text uses it. */
export function remPx(): number {
  if (!remCache && typeof document !== 'undefined') {
    remCache = parseFloat(getComputedStyle(document.documentElement).fontSize) || 15;
    const reset = () => (remCache = 0);
    window.addEventListener('resize', reset, { once: true });
    setTimeout(reset, 1000);
  }
  return remCache || 15;
}
