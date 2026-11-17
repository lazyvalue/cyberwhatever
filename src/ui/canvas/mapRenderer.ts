// Network map renderer (Canvas 2D). Pure drawing: takes plain node data, never touches the engine.
import { mapFx } from '../fx/fxStore.ts';
import { hash, rng, remPx } from './ticker.ts';

export interface MapNode {
  id: string;
  x: number;
  y: number;
  type: string;           // displayed type ('unknown' when not revealed)
  state: string;          // locked | hostile | asleep | cleared | captured
  revealed: boolean;
  accessible: boolean;
  links: string[];
  ice: number;
  black: boolean;
  name: string;
}

export interface MapData {
  nodes: MapNode[];
  position: string | null;
  selected: string | null;
  hover: string | null;
  alarm: number;          // 0..1 trace intensity
  reduced: boolean;
  compact?: boolean;      // small previews: no labels
}

const COL = {
  cyan: '#4cf0ff', pink: '#ff4fa8', lime: '#a6ff4d', amber: '#ffb13d', red: '#ff2e3e', violet: '#a98bff',
  ink: '#e6defc', dim: '#6c649c', line: '#2f2660', asleep: '#5b7bd6',
};

export function nodeColor(n: MapNode): string {
  if (!n.revealed) return COL.dim;
  if (n.black && n.state === 'hostile') return COL.red;
  switch (n.state) {
    case 'captured': return COL.lime;
    case 'cleared': return COL.cyan;
    case 'asleep': return COL.asleep;
    case 'open': return '#5fb7c4';
    case 'hostile': return n.ice > 0 ? COL.pink : COL.cyan;
    default: return n.ice > 0 ? COL.pink : COL.violet;
  }
}

export interface Particle { a: string; b: string; t: number; v: number; }
const MAX_PARTICLES = 36;

export function layout(n: { x: number; y: number }, w: number, h: number, compact = false): { x: number; y: number } {
  const padX = compact ? 18 : Math.max(48, w * 0.07);
  const padTop = compact ? 18 : Math.max(70, h * 0.13);
  const padBot = compact ? 18 : Math.max(96, h * 0.2);
  return { x: padX + n.x * (w - padX * 2), y: padTop + n.y * (h - padTop - padBot) };
}

export function hitTest(data: MapData, w: number, h: number, px: number, py: number): string | null {
  let best: string | null = null;
  let bd = 34 * 34;
  for (const n of data.nodes) {
    const p = layout(n, w, h, data.compact);
    const d = (p.x - px) ** 2 + (p.y - py) ** 2;
    if (d < bd) {
      bd = d;
      best = n.id;
    }
  }
  return best;
}

function passable(n: MapNode | undefined): boolean {
  return !!n && (n.state === 'cleared' || n.state === 'captured' || n.state === 'asleep');
}

export function drawMap(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number, data: MapData, particles: Particle[]): void {
  ctx.clearRect(0, 0, w, h);
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const pos = new Map(data.nodes.map((n) => [n.id, layout(n, w, h, data.compact)]));
  const k = remPx() / 15;
  const R = data.compact ? 7 : Math.max(15, Math.min(24, Math.min(w, h) / 26)) * Math.min(1.3, k);

  // grid backdrop
  ctx.save();
  ctx.strokeStyle = 'rgba(76,240,255,0.045)';
  ctx.lineWidth = 1;
  const g = data.compact ? 18 : 36;
  ctx.beginPath();
  for (let x = (t * 0.004) % g; x < w; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y < h; y += g) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.restore();

  // alarm wash
  if (data.alarm > 0.33 && !data.reduced) {
    const a = (data.alarm - 0.33) * 0.35 * (0.6 + 0.4 * Math.sin(t / (data.alarm > 0.66 ? 180 : 420)));
    const grd = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    grd.addColorStop(0, 'rgba(255,46,62,0)');
    grd.addColorStop(1, `rgba(255,46,62,${a})`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  }

  // edges
  const edges: [MapNode, MapNode][] = [];
  const seen = new Set<string>();
  for (const n of data.nodes) {
    for (const l of n.links) {
      const m = byId.get(l);
      if (!m) continue;
      const k = n.id < m.id ? `${n.id}|${m.id}` : `${m.id}|${n.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      edges.push([n, m]);
    }
  }
  for (const [a, b] of edges) {
    const pa = pos.get(a.id)!;
    const pb = pos.get(b.id)!;
    const known = a.revealed && b.revealed;
    if (!a.revealed && !b.revealed) continue;
    ctx.save();
    if (known) {
      const live = passable(a) || passable(b) || a.id === data.position || b.id === data.position;
      ctx.strokeStyle = live ? 'rgba(76,240,255,0.55)' : 'rgba(169,139,255,0.28)';
      ctx.lineWidth = live ? 1.6 : 1;
      if (live && !data.compact) {
        ctx.shadowColor = COL.cyan;
        ctx.shadowBlur = 8;
      }
    } else {
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(108,100,156,0.35)';
      ctx.lineWidth = 1;
    }
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.restore();
  }

  // packets on live edges
  if (!data.reduced) {
    const live = edges.filter(([a, b]) => a.revealed && b.revealed && (passable(a) || passable(b)));
    if (live.length && particles.length < Math.min(MAX_PARTICLES, live.length * 3) && Math.random() < 0.12) {
      const [a, b] = live[Math.floor(Math.random() * live.length)];
      const fwd = Math.random() < 0.5;
      particles.push({ a: fwd ? a.id : b.id, b: fwd ? b.id : a.id, t: 0, v: 0.00035 + Math.random() * 0.0005 });
    }
    ctx.save();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t += p.v * dt;
      const pa = pos.get(p.a);
      const pb = pos.get(p.b);
      if (!pa || !pb || p.t >= 1) {
        particles.splice(i, 1);
        continue;
      }
      const x = pa.x + (pb.x - pa.x) * p.t;
      const y = pa.y + (pb.y - pa.y) * p.t;
      ctx.fillStyle = byId.get(p.b)?.state === 'captured' ? COL.lime : COL.cyan;
      ctx.globalAlpha = Math.sin(p.t * Math.PI);
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    ctx.restore();
  } else particles.length = 0;

  // nodes
  for (const n of data.nodes) {
    const p = pos.get(n.id)!;
    if (!n.revealed) {
      drawFog(ctx, p.x, p.y, R, t, n.id, data.reduced);
      continue;
    }
    const revealAt = mapFx.reveal[n.id];
    const appear = revealAt ? Math.min(1, Math.max(0, (t - revealAt) / 500)) : 1;
    ctx.save();
    ctx.globalAlpha = appear;
    const col = nodeColor(n);
    const isPos = n.id === data.position;
    const sel = n.id === data.selected;
    const hov = n.id === data.hover;

    // glow
    if (!data.compact) {
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * 2.6);
      glow.addColorStop(0, hexA(col, n.accessible || isPos ? 0.33 : 0.14));
      glow.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // body
    ctx.fillStyle = '#0a0720';
    ctx.strokeStyle = col;
    ctx.lineWidth = data.compact ? 1.2 : 2;
    if (!data.compact) {
      ctx.shadowColor = col;
      ctx.shadowBlur = n.accessible || isPos ? 14 : 4;
    }
    glyph(ctx, n.type, p.x, p.y, R, t, n.state === 'captured');
    ctx.shadowBlur = 0;

    // ICE pips
    if (n.ice > 0 && n.state !== 'cleared' && n.state !== 'captured' && !data.compact) {
      for (let i = 0; i < n.ice; i++) {
        ctx.fillStyle = n.black ? COL.red : n.state === 'asleep' ? COL.asleep : COL.pink;
        const a = -Math.PI / 2 + (i - (n.ice - 1) / 2) * 0.42;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * (R + 9), p.y + Math.sin(a) * (R + 9), 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (n.black) drawSkull(ctx, p.x + R + 8, p.y + R + 4, 7);
    }
    if (n.state === 'asleep' && !data.compact) {
      ctx.fillStyle = COL.asleep;
      ctx.font = '600 11px "Martian Mono Variable", monospace';
      ctx.fillText('z', p.x + R * 0.8, p.y - R * 0.8 - Math.sin(t / 500) * 3);
    }

    // you-are-here
    if (isPos) {
      ctx.strokeStyle = COL.pink;
      ctx.lineWidth = 2;
      ctx.globalAlpha = appear * (0.6 + 0.4 * Math.sin(t / 300));
      ctx.beginPath();
      ctx.arc(p.x, p.y, R + (data.compact ? 4 : 9), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = appear;
    }
    if (sel || hov) {
      ctx.save();
      ctx.strokeStyle = sel ? '#ffffff' : 'rgba(230,222,252,.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -t / 40;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R + 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // tutorial pointer: the coach wants this node
    if (mapFx.coach === n.id && !data.compact) {
      ctx.save();
      const k = (t % 1200) / 1200;
      ctx.strokeStyle = '#ffb13d';
      ctx.shadowColor = '#ffb13d';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R + 10 + k * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffb13d';
      ctx.font = `700 ${Math.round(remPx() * 0.85)}px "Martian Mono Variable", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('click here', p.x, p.y - R - 22 - Math.sin(t / 250) * 3);
      ctx.restore();
    }

    // ping & capture rings
    const ping = mapFx.ping[n.id];
    if (ping && t - ping < 1200) {
      const k = (t - ping) / 1200;
      ctx.strokeStyle = hexA(COL.cyan, 1 - k);
      ctx.lineWidth = 2;
      for (const off of [0, 0.3]) {
        const kk = Math.max(0, k - off);
        ctx.beginPath();
        ctx.arc(p.x, p.y, R + kk * 90, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const cap = mapFx.capture[n.id];
    if (cap && t - cap < 900) {
      const k = (t - cap) / 900;
      ctx.fillStyle = hexA(n.state === 'captured' ? COL.lime : COL.cyan, 0.5 * (1 - k));
      ctx.beginPath();
      ctx.arc(p.x, p.y, R + k * 40, 0, Math.PI * 2);
      ctx.fill();
    }

    // label
    if (!data.compact) {
      ctx.font = `600 ${Math.round(remPx() * 0.82)}px "Martian Mono Variable", monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = n.accessible || isPos || sel ? COL.ink : '#a39bcf';
      const label = n.name.length > 22 ? `${n.name.slice(0, 21)}…` : n.name;
      ctx.fillText(label, p.x, p.y + R + remPx() * 1.3);
    }
    ctx.restore();
  }
}

function drawFog(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, t: number, id: string, reduced: boolean): void {
  const r = rng(hash(id));
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.4);
  g.addColorStop(0, 'rgba(108,100,156,0.32)');
  g.addColorStop(1, 'rgba(108,100,156,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, R * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(163,155,207,0.5)';
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2 + (reduced ? 0 : t / (2400 + r() * 2000));
    const d = r() * R * 1.6;
    ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5, 1.5);
  }
  ctx.font = '600 13px "Martian Mono Variable", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(163,155,207,0.7)';
  ctx.fillText('?', x, y + 4);
  ctx.restore();
}

export function drawSkull(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.fillStyle = '#ff2e3e';
  ctx.beginPath();
  ctx.arc(x, y - s * 0.15, s * 0.62, Math.PI, 0);
  ctx.lineTo(x + s * 0.62, y + s * 0.25);
  ctx.lineTo(x + s * 0.35, y + s * 0.25);
  ctx.lineTo(x + s * 0.35, y + s * 0.55);
  ctx.lineTo(x - s * 0.35, y + s * 0.55);
  ctx.lineTo(x - s * 0.35, y + s * 0.25);
  ctx.lineTo(x - s * 0.62, y + s * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0a0004';
  ctx.beginPath();
  ctx.arc(x - s * 0.24, y - s * 0.08, s * 0.16, 0, Math.PI * 2);
  ctx.arc(x + s * 0.24, y - s * 0.08, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Node glyphs by type. Each type has one shape; colour carries state. */
function glyph(ctx: CanvasRenderingContext2D, type: string, x: number, y: number, R: number, t: number, owned: boolean): void {
  const path = () => {
    ctx.beginPath();
    switch (type) {
      case 'gateway': {
        ctx.moveTo(x - R, y - R * 0.8);
        ctx.lineTo(x + R * 0.2, y - R * 0.8);
        ctx.lineTo(x + R, y);
        ctx.lineTo(x + R * 0.2, y + R * 0.8);
        ctx.lineTo(x - R, y + R * 0.8);
        ctx.lineTo(x - R * 0.5, y);
        ctx.closePath();
        break;
      }
      case 'router': {
        ctx.moveTo(x, y - R);
        ctx.lineTo(x + R, y);
        ctx.lineTo(x, y + R);
        ctx.lineTo(x - R, y);
        ctx.closePath();
        break;
      }
      case 'datastore':
      case 'honeypot': {
        const rw = R * 0.85;
        ctx.rect(x - rw, y - R * 0.85, rw * 2, R * 1.7);
        break;
      }
      case 'security': {
        ctx.moveTo(x, y - R);
        ctx.lineTo(x + R * 0.85, y - R * 0.55);
        ctx.lineTo(x + R * 0.7, y + R * 0.35);
        ctx.lineTo(x, y + R);
        ctx.lineTo(x - R * 0.7, y + R * 0.35);
        ctx.lineTo(x - R * 0.85, y - R * 0.55);
        ctx.closePath();
        break;
      }
      case 'io': {
        const teeth = 8;
        for (let i = 0; i <= teeth * 2; i++) {
          const a = (i / (teeth * 2)) * Math.PI * 2 + t / 3000;
          const rr = i % 2 ? R * 0.78 : R;
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
      case 'vault': {
        ctx.rect(x - R * 0.9, y - R * 0.9, R * 1.8, R * 1.8);
        break;
      }
      case 'process': {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const px = x + Math.cos(a) * R;
          const py = y + Math.sin(a) * R;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
      case 'core': {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 - Math.PI / 2 + t / 6000;
          const rr = i % 2 ? R * 0.6 : R * 1.12;
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;
      }
      default:
        ctx.arc(x, y, R * 0.9, 0, Math.PI * 2);
    }
  };
  path();
  ctx.fill();
  if (owned) {
    ctx.save();
    ctx.globalAlpha *= 0.22;
    ctx.fillStyle = ctx.strokeStyle;
    path();
    ctx.fill();
    ctx.restore();
  }
  path();
  ctx.stroke();

  // inner marks
  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  switch (type) {
    case 'datastore':
    case 'honeypot':
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(x - R * 0.5, y + i * R * 0.42);
        ctx.lineTo(x + R * 0.5, y + i * R * 0.42);
      }
      ctx.stroke();
      if (type === 'honeypot') {
        ctx.fillStyle = '#ffb13d';
        ctx.beginPath();
        ctx.arc(x, y + R * 1.1, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'router':
      ctx.moveTo(x - R * 0.45, y);
      ctx.lineTo(x + R * 0.45, y);
      ctx.moveTo(x, y - R * 0.45);
      ctx.lineTo(x, y + R * 0.45);
      ctx.stroke();
      break;
    case 'vault':
      ctx.arc(x, y - R * 0.12, R * 0.28, Math.PI, 0);
      ctx.rect(x - R * 0.38, y - R * 0.1, R * 0.76, R * 0.55);
      ctx.stroke();
      break;
    case 'process':
      ctx.ellipse(x, y, R * 0.5, R * 0.26, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, R * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      break;
    case 'core':
      ctx.arc(x, y, R * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'security':
      ctx.moveTo(x - R * 0.3, y);
      ctx.lineTo(x - R * 0.05, y + R * 0.3);
      ctx.lineTo(x + R * 0.35, y - R * 0.25);
      ctx.stroke();
      break;
    case 'io':
      ctx.arc(x, y, R * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'gateway':
      ctx.moveTo(x - R * 0.2, y - R * 0.3);
      ctx.lineTo(x + R * 0.15, y);
      ctx.lineTo(x - R * 0.2, y + R * 0.3);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}
