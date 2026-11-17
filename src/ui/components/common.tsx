// Shared small components: action buttons, bars, pips, portraits, icons.
import type { ComponentChildren } from 'preact';
import { select, type Action } from '../../engine/index.ts';
import { audio } from '../../audio/index.ts';
import { act, engine, refuse } from '../game.ts';
import { useCanvas } from '../canvas/ticker.ts';
import { drawPortrait } from '../canvas/portrait.ts';
import { reducedMotion } from '../settings.ts';

type BtnProps = {
  action?: Action;
  onClick?: (e: MouseEvent) => void;
  /** Reason the button cannot be used. The button stays focusable and explains itself when pressed. */
  blocked?: string | null;
  tip?: string;
  ui?: string;
  class?: string;
  children: ComponentChildren;
  title?: string;
  style?: Record<string, string>;
  type?: 'button' | 'submit';
  ariaLabel?: string;
};

/**
 * Button bound to an engine action. Legality comes from the engine (select.canDo); a blocked button
 * shows the reason as its tooltip and, if pressed, shakes and says why. Never silently disabled.
 */
export function Btn(p: BtnProps) {
  const e = engine();
  const chk = p.action ? select.canDo(e, p.action) : null;
  const blocked = p.blocked ?? (chk && !chk.ok ? chk.reason : null);
  const tip = [p.tip, blocked ? `Unavailable: ${blocked}` : ''].filter(Boolean).join('\n');
  return (
    <button
      type={p.type ?? 'button'}
      class={`btn ${p.class ?? ''} ${blocked ? 'is-blocked' : ''}`}
      data-ui={p.ui}
      data-tip={tip || undefined}
      aria-disabled={blocked ? 'true' : undefined}
      aria-label={p.ariaLabel}
      style={p.style}
      onClick={(ev) => {
        const el = ev.currentTarget as HTMLElement;
        if (blocked) return refuse(el, blocked);
        if (!p.action) audio.play('ui_click', { volume: 0.6 });
        if (p.onClick) p.onClick(ev);
        if (p.action) act(p.action, el);
      }}
    >
      {p.children}
    </button>
  );
}

export function Bar(p: { value: number; max: number; color: string; ghost?: boolean; ticks?: number[]; thick?: boolean; label?: string }) {
  const k = p.max > 0 ? Math.max(0, Math.min(1, p.value / p.max)) : 0;
  return (
    <div class={`bar ${p.thick ? 'thick' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={p.max} aria-valuenow={p.value} aria-label={p.label}>
      {p.ghost && <b style={{ width: `${k * 100}%` }} />}
      <i style={{ width: `${k * 100}%`, background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
      {p.ticks?.map((t) => <span class="tick" style={{ left: `${(t / p.max) * 100}%` }} />)}
    </div>
  );
}

export function Pips(p: { on: number; total: number; cls?: string; spentFrom?: number }) {
  const out = [];
  for (let i = 0; i < p.total; i++) out.push(<span class={`pip ${p.cls ?? ''} ${i < p.on ? 'on' : ''}`} />);
  return <span class="pips" aria-label={`${p.on} of ${p.total}`}>{out}</span>;
}

export function Portrait(p: { id: string; talking?: boolean; revealed?: boolean; size?: number }) {
  const talking = !!p.talking;
  const ref = useCanvas((ctx, w, h, t) => drawPortrait(ctx, w, h, t, { id: p.id, talking, revealed: !!p.revealed, reduced: reducedMotion() }));
  return <canvas ref={ref} aria-hidden="true" />;
}

export function Kbd(p: { children: ComponentChildren }) {
  return <span class="kbd">{p.children}</span>;
}

const ICONS: Record<string, string> = {
  net: 'M8 1v3M8 12v3M1 8h3M12 8h3M3 3l2 2M11 11l2 2M3 13l2-2M11 5l2-2M8 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  deck: 'M2 4h12v8H2zM4 6h3v2H4zM9 6h3M9 8h3M4 10h8',
  botnet: 'M3 3h3v3H3zM10 3h3v3h-3zM3 10h3v3H3zM10 10h3v3h-3zM6 4.5h4M6 11.5h4M4.5 6v4M11.5 6v4',
  market: 'M2 5h12l-1 8H3zM5 5V3h6v2M6 8v2M10 8v2',
  wallet: 'M2 4h11v9H2zM10 7h4v3h-4zM4 2h7',
  inbox: 'M2 4h12v8H2zM2 4l6 5 6-5',
  jobs: 'M3 3h10v10H3zM5 6h6M5 8h6M5 10h4',
  files: 'M3 2h6l4 4v8H3zM9 2v4h4',
  rep: 'M8 1l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z',
  stats: 'M3 13V8M7 13V4M11 13V6M2 13h12',
  settings: 'M8 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3',
  log: 'M3 3h10M3 6h10M3 9h7M3 12h9',
  sound: 'M2 6h3l4-3v10l-4-3H2zM11 5c1 1 1 5 0 6',
  mute: 'M2 6h3l4-3v10l-4-3H2zM11 6l4 4M15 6l-4 4',
};

export function Icon(p: { name: string }) {
  return (
    <svg viewBox="0 0 16 16" style={{ width: "1.15rem", height: "1.15rem" }} fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={ICONS[p.name] ?? ICONS.net} />
    </svg>
  );
}
