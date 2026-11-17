// Procedural ICE constructs (DESIGN §12: geometric constructs per type; black ICE red and wrong-looking).
// The archetype comes from the ICE id/name; unknown ICE get a stable hashed construct, so new content draws itself.
import { iceFx } from '../fx/fxStore.ts';
import { hash, rng } from './ticker.ts';
import { drawSkull, hexA } from './mapRenderer.ts';

export interface IceDraw {
  uid: string;
  def: string;
  name: string;
  shellType: string;
  shell: number;
  shellMax: number;
  core: number;
  coreMax: number;
  black: boolean;
  boss: boolean;
  hunter: boolean;
  dead: boolean;
  subverted: boolean;
  stunned: boolean;
  infected: number;
  mapped: boolean;
  intentClass: string;
  intentId: string | null;
  phase: number;
}

type Arch = 'turret' | 'lock' | 'hound' | 'tar' | 'scrambler' | 'patcher' | 'killer' | 'mirror' | 'hydra' | 'siren' | 'nanny' | 'cop' | 'popup' | 'boss' | 'generic';

const RULES: [RegExp, Arch][] = [
  [/sentry|guard|turret|watch/i, 'turret'],
  [/cipher|crypt|lock|vault/i, 'lock'],
  [/hound|dog|track|hunt|sniff/i, 'hound'],
  [/tar|glue|sludge|anchor/i, 'tar'],
  [/scram|psych|confus/i, 'scrambler'],
  [/patch|medic|repair|nurse/i, 'patcher'],
  [/kill|execut|assassin|reaper/i, 'killer'],
  [/mirror|reflect/i, 'mirror'],
  [/hydra|split|multi/i, 'hydra'],
  [/siren|alarm|bell|call/i, 'siren'],
  [/parent|nanny|child|filter/i, 'nanny'],
  [/cop|compliance|raid|police|audit/i, 'cop'],
  [/tutorial|paywall|eula|achievement|popup|loading|garbage|collector/i, 'popup'],
];

function archetype(d: IceDraw): Arch {
  if (d.boss) return 'boss';
  const key = `${d.def} ${d.name}`;
  for (const [re, a] of RULES) if (re.test(key)) return a;
  return 'generic';
}

const INTENT_COL: Record<string, string> = { hostile: '#ff4fa8', utility: '#a98bff', unknown: '#a39bcf' };

export function drawIce(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, d: IceDraw, reduced: boolean): void {
  ctx.clearRect(0, 0, w, h);
  const f = iceFx[d.uid] ?? {};
  const cx = w / 2;
  const cy = h / 2 + 4;
  const R = Math.min(w, h) * 0.34;
  if (R < 14) return;
  const seed = hash(d.def);
  const r = rng(seed);
  const main = d.subverted ? '#a6ff4d' : d.black ? '#ff2e3e' : d.boss ? '#ffb13d' : '#4cf0ff';
  const time = d.stunned || reduced ? t * 0.08 : t;

  // die: collapse
  let dieK = 0;
  if (d.dead) dieK = f.dieAt ? Math.min(1, (t - f.dieAt) / 650) : 1;
  if (dieK >= 1) return;

  // hit: displacement and RGB split
  const hitK = f.hitAt ? Math.max(0, 1 - (t - f.hitAt) / 260) : 0;
  const actK = f.actAt ? Math.max(0, 1 - (t - f.actAt) / 380) : 0;
  const jitter = (d.black && !reduced ? 1.5 : 0) + hitK * 7;
  const dx = jitter ? (Math.random() - 0.5) * jitter : 0;
  const dy = jitter ? (Math.random() - 0.5) * jitter : 0;

  ctx.save();
  if (dieK > 0) {
    ctx.translate(cx, cy);
    ctx.scale(1 + dieK * 0.4, 1 - dieK * 0.95);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = 1 - dieK;
  }

  // backdrop halo by intent class
  const ic = d.subverted ? '#a6ff4d' : INTENT_COL[d.intentClass] ?? '#a39bcf';
  const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.8);
  halo.addColorStop(0, hexA(d.black ? '#ff2e3e' : ic, 0.22 + actK * 0.35));
  halo.addColorStop(1, hexA(ic, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  const passes = hitK > 0.05 ? [['#ff2e3e', -3 * hitK], ['#4cf0ff', 3 * hitK], [main, 0]] as const : [[main, 0]] as const;
  for (const [col, off] of passes) {
    ctx.save();
    ctx.translate(dx + off, dy);
    if (off !== 0) ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= off !== 0 ? 0.55 : 1;
    drawBody(ctx, archetype(d), cx, cy, R, time, col, d, r, actK);
    ctx.restore();
  }

  // shell ring
  drawShell(ctx, cx + dx, cy + dy, R * 1.28, time, d, f.shellAt ? (t - f.shellAt) / 600 : 2);

  // core ring
  const coreK = d.coreMax > 0 ? Math.max(0, d.core / d.coreMax) : 0;
  ctx.strokeStyle = hexA(d.black ? '#ff2e3e' : '#ff4fa8', 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx + dx, cy + dy, R * 1.48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * coreK);
  ctx.stroke();

  // statuses as visual tells
  if (d.mapped) {
    const y = cy - R * 1.2 + ((time / 9) % (R * 2.4));
    ctx.strokeStyle = 'rgba(76,240,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - R * 1.3, y);
    ctx.lineTo(cx + R * 1.3, y);
    ctx.stroke();
  }
  if (d.infected > 0) {
    ctx.fillStyle = '#a6ff4d';
    const n = Math.min(14, d.infected * 3);
    for (let i = 0; i < n; i++) {
      const a = i * 2.399 + time / 900;
      const rr = R * (0.3 + ((i * 37) % 70) / 100);
      ctx.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.5, 2.5);
    }
  }
  if (d.stunned) {
    ctx.fillStyle = '#4cf0ff';
    ctx.font = '600 13px "Martian Mono Variable", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('z z z', cx, cy - R * 1.55 - Math.sin(t / 400) * 3);
  }
  if (d.black) {
    drawSkull(ctx, cx, cy + R * 0.05, R * 0.55);
    // wrongness: a few misregistered scan slices
    if (!reduced && Math.random() < 0.18) {
      const sy = cy - R + Math.random() * R * 2;
      const dpr = ctx.getTransform().a || 1;
      const sh = 5 + Math.random() * 6;
      ctx.drawImage(ctx.canvas, 0, sy * dpr, w * dpr, sh * dpr, (Math.random() - 0.5) * 18, sy, w, sh);
    }
  }
  ctx.restore();
}

function poly(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, n: number, rot: number, inner?: number): void {
  ctx.beginPath();
  const k = inner ? n * 2 : n;
  for (let i = 0; i <= k; i++) {
    const a = rot + (i / k) * Math.PI * 2;
    const rr = inner && i % 2 ? inner : R;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawBody(ctx: CanvasRenderingContext2D, arch: Arch, cx: number, cy: number, R: number, t: number, col: string, d: IceDraw, r: () => number, actK: number): void {
  ctx.strokeStyle = col;
  ctx.fillStyle = hexA(col, 0.1);
  ctx.lineWidth = 2;
  ctx.shadowColor = col;
  ctx.shadowBlur = 12;
  const lunge = actK * R * 0.25;
  switch (arch) {
    case 'turret': {
      const a = Math.sin(t / 900) * 0.6;
      poly(ctx, cx, cy, R * 0.9, 3, -Math.PI / 2 + a);
      ctx.fill(); ctx.stroke();
      poly(ctx, cx, cy, R * 0.45, 3, Math.PI / 2 + a);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(-Math.PI / 2 + a) * (R * 1.1 + lunge), cy + Math.sin(-Math.PI / 2 + a) * (R * 1.1 + lunge));
      ctx.stroke();
      eye(ctx, cx, cy, R * 0.16, col);
      break;
    }
    case 'lock': {
      for (let i = 0; i < 3; i++) {
        const rr = R * (0.35 + i * 0.25);
        const rot = (i % 2 ? 1 : -1) * t / (1400 + i * 500);
        ctx.beginPath();
        ctx.arc(cx, cy, rr, rot, rot + Math.PI * 1.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + Math.cos(rot) * rr, cy + Math.sin(rot) * rr, 3, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      }
      ctx.fillStyle = hexA(col, 0.2);
      ctx.fillRect(cx - R * 0.12, cy - R * 0.12, R * 0.24, R * 0.24);
      break;
    }
    case 'hound': {
      const sn = Math.sin(t / 220) * 4 + lunge;
      ctx.beginPath();
      ctx.moveTo(cx - R, cy - R * 0.5);
      ctx.lineTo(cx + R * 0.6 + sn, cy);
      ctx.lineTo(cx - R, cy + R * 0.5);
      ctx.lineTo(cx - R * 0.5, cy);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const k = ((t / 600 + i / 3) % 1);
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.arc(cx + R * 0.7 + sn, cy, R * (0.2 + k * 0.7), -0.6, 0.6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      eye(ctx, cx + R * 0.1, cy - R * 0.1, R * 0.1, col);
      break;
    }
    case 'tar': {
      ctx.beginPath();
      const n = 28;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const drip = Math.sin(a) > 0.2 ? Math.sin(a) * (Math.sin(t / 700 + i) * 0.15 + 0.25) : 0;
        const rr = R * (0.75 + Math.sin(a * 3 + t / 900) * 0.07 + drip);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = hexA(col, 0.18);
      ctx.fill(); ctx.stroke();
      eye(ctx, cx - R * 0.25, cy - R * 0.1, R * 0.1, col);
      eye(ctx, cx + R * 0.25, cy - R * 0.1, R * 0.1, col);
      break;
    }
    case 'scrambler': {
      ctx.font = `600 ${Math.round(R * 0.32)}px "Martian Mono Variable", monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = col;
      const glyphs = '#%&@?!*<>/ΔΞλ';
      for (let i = 0; i < 9; i++) {
        const gx = cx + ((i % 3) - 1) * R * 0.48;
        const gy = cy + (Math.floor(i / 3) - 1) * R * 0.48 + R * 0.1;
        const gi = Math.floor(t / 160 + i * 7) % glyphs.length;
        ctx.fillText(glyphs[gi], gx, gy);
      }
      poly(ctx, cx, cy, R * 0.95, 4, Math.PI / 4 + t / 3000);
      ctx.stroke();
      break;
    }
    case 'patcher': {
      ctx.beginPath();
      const s = R * 0.22;
      ctx.rect(cx - s, cy - R * 0.7, s * 2, R * 1.4);
      ctx.rect(cx - R * 0.7, cy - s, R * 1.4, s * 2);
      ctx.fill(); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = t / 1100 + (i * Math.PI) / 2;
        ctx.strokeRect(cx + Math.cos(a) * R * 1.0 - 4, cy + Math.sin(a) * R * 1.0 - 4, 8, 8);
      }
      break;
    }
    case 'killer': {
      const charging = d.intentId ? /charg/i.test(d.intentId) : false;
      const spike = charging ? 0.55 + Math.sin(t / 90) * 0.15 : 0.3;
      poly(ctx, cx, cy, R * (0.6 + spike) + lunge, 8, t / 1800, R * 0.45);
      ctx.fill(); ctx.stroke();
      if (charging) {
        ctx.strokeStyle = '#ffb13d';
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, R * 0.3 + Math.sin(t / 60) * 3), 0, Math.PI * 2);
        ctx.stroke();
      }
      eye(ctx, cx, cy, R * 0.14, col);
      break;
    }
    case 'mirror': {
      const a = Math.sin(t / 1200) * 0.3;
      poly(ctx, cx, cy, R * 0.95, 4, a);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - Math.PI / 2) * R * 0.95, cy + Math.sin(a - Math.PI / 2) * R * 0.95);
      ctx.lineTo(cx + Math.cos(a + Math.PI / 2) * R * 0.95, cy + Math.sin(a + Math.PI / 2) * R * 0.95);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      poly(ctx, cx + R * 0.1, cy, R * 0.55, 4, -a);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'hydra': {
      const heads = 3;
      for (let i = 0; i < heads; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.7 + Math.sin(t / 600 + i) * 0.12;
        const hx = cx + Math.cos(a) * R * 0.9;
        const hy = cy + Math.sin(a) * R * 0.9 + R * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, cy + R * 0.6);
        ctx.quadraticCurveTo(cx + Math.cos(a) * R * 0.2, cy, hx, hy);
        ctx.stroke();
        poly(ctx, hx, hy, R * 0.24, 3, a);
        ctx.fill(); ctx.stroke();
      }
      break;
    }
    case 'siren': {
      for (let i = 0; i < 4; i++) {
        const k = ((t / 900 + i / 4) % 1);
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (0.25 + k * 1.0), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.28, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'nanny': {
      ctx.beginPath();
      ctx.roundRect(cx - R * 0.75, cy - R * 0.9, R * 1.5, R * 1.8, R * 0.25);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.45, cy - R * 0.2);
      ctx.lineTo(cx + R * 0.45, cy - R * 0.2);
      ctx.stroke();
      const wag = Math.sin(t / 250) * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + R * 0.75, cy);
      ctx.lineTo(cx + R * 0.75 + Math.cos(-1.2 + wag) * R * 0.6, cy + Math.sin(-1.2 + wag) * R * 0.6);
      ctx.stroke();
      eye(ctx, cx, cy - R * 0.5, R * 0.12, col);
      ctx.font = `600 ${Math.round(R * 0.32)}px "Martian Mono Variable", monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = col;
      ctx.fillText('NO', cx, cy + R * 0.45);
      break;
    }
    case 'cop': {
      poly(ctx, cx, cy, R * 0.95, 5, -Math.PI / 2);
      ctx.fill(); ctx.stroke();
      poly(ctx, cx, cy, R * 0.45, 5, -Math.PI / 2, R * 0.2);
      ctx.fillStyle = col;
      ctx.fill();
      break;
    }
    case 'popup': {
      const bob = Math.sin(t / 500) * 3;
      ctx.beginPath();
      ctx.rect(cx - R, cy - R * 0.7 + bob, R * 2, R * 1.4);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - R, cy - R * 0.4 + bob);
      ctx.lineTo(cx + R, cy - R * 0.4 + bob);
      ctx.stroke();
      ctx.strokeRect(cx + R * 0.72, cy - R * 0.64 + bob, R * 0.2, R * 0.18);
      ctx.fillStyle = col;
      ctx.fillRect(cx - R * 0.6, cy + R * 0.25 + bob, R * 1.2 * ((t / 2000) % 1), R * 0.14);
      break;
    }
    case 'boss': {
      for (let i = 0; i < 3; i++) {
        poly(ctx, cx, cy, R * (1.05 - i * 0.25), 5 + i * 2, (i % 2 ? -1 : 1) * t / (2200 - i * 400));
        ctx.fillStyle = hexA(col, 0.06 + i * 0.05);
        ctx.fill(); ctx.stroke();
      }
      eye(ctx, cx, cy, R * 0.18, col);
      for (let p = 0; p < d.phase; p++) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * (1.15 + p * 0.07), 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    default: {
      const sides = 3 + Math.floor(r() * 5);
      const spikes = r() < 0.4;
      poly(ctx, cx, cy, R * 0.95 + lunge * 0.5, sides, t / (1500 + r() * 2000), spikes ? R * 0.55 : undefined);
      ctx.fill(); ctx.stroke();
      poly(ctx, cx, cy, R * 0.45, 3 + Math.floor(r() * 4), -t / 1200);
      ctx.stroke();
      eye(ctx, cx, cy, R * 0.12, col);
    }
  }
  ctx.shadowBlur = 0;
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string): void {
  ctx.save();
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Shell: crypt = violet hex lattice; wall = orange brick ring. Arc = remaining shell. Shards fly when it breaks. */
function drawShell(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number, d: IceDraw, breakK: number): void {
  if (d.shellType === 'none' || d.shellMax <= 0) return;
  const crypt = d.shellType === 'crypt';
  const col = crypt ? '#a98bff' : '#ff8a3d';
  const k = Math.max(0, d.shell / d.shellMax);
  const segs = crypt ? 18 : 14;
  const on = Math.ceil(segs * k);
  ctx.save();
  ctx.strokeStyle = col;
  ctx.fillStyle = hexA(col, 0.2);
  ctx.lineWidth = 1.5;
  ctx.shadowColor = col;
  ctx.shadowBlur = 6;
  const rot = crypt ? t / 5000 : 0;
  for (let i = 0; i < segs; i++) {
    const a0 = rot + (i / segs) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / segs - 0.06;
    const lit = i < on;
    ctx.globalAlpha = lit ? 1 : 0.13;
    if (crypt) {
      const am = (a0 + a1) / 2;
      const hx = cx + Math.cos(am) * R;
      const hy = cy + Math.sin(am) * R;
      poly(ctx, hx, hy, 6.5, 6, am);
      if (lit) ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, R + 4, a0, a1);
      ctx.arc(cx, cy, R - 4, a1, a0, true);
      ctx.closePath();
      if (lit) ctx.fill();
      ctx.stroke();
    }
  }
  // shards
  if (breakK < 1) {
    ctx.globalAlpha = 1 - breakK;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const rr = R + breakK * 60;
      ctx.fillStyle = col;
      ctx.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 4, 4);
    }
  }
  ctx.restore();
}
