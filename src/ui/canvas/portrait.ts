// Procedural NPC portraits. Known cast members get a designed look; anyone else gets a stable hashed face,
// so new NPCs from the story agent draw themselves.
import { hash, rng } from './ticker.ts';
import { drawSkull, hexA } from './mapRenderer.ts';

export interface PortraitOpts {
  id: string;
  talking: boolean;
  revealed?: boolean;   // glitch → PATCH, auntie → CHAIRMAN
  reduced: boolean;
}

const PALETTES = ['#4cf0ff', '#ff4fa8', '#ffb13d', '#a6ff4d', '#a98bff', '#ff8a3d', '#6dffc1'];

export function drawPortrait(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, o: PortraitOpts): void {
  ctx.clearRect(0, 0, w, h);
  const s = Math.min(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const blink = !o.reduced && (t % 4200) < 120;
  const mouth = o.talking && !o.reduced ? Math.abs(Math.sin(t / 70)) : 0;

  // background
  ctx.fillStyle = '#0a0720';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(76,240,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = 0; y < h; y += 3) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
  ctx.stroke();

  switch (o.id) {
    case 'auntie': return auntie(ctx, cx, cy, s, t, blink, mouth, !!o.revealed);
    case 'glitch': return o.revealed ? patch(ctx, cx, cy, s, t, mouth) : glitch(ctx, cx, cy, s, t, blink, mouth, o.reduced);
    case 'wraith': return wraith(ctx, cx, cy, s, t, mouth);
    case 'chairman': return chairman(ctx, cx, cy, s, t, mouth);
    case 'whisper': return whisper(ctx, cx, cy, s, t, blink, mouth);
    case 'doc': return doc(ctx, cx, cy, s, t, blink, mouth);
    case 'deacon': return deacon(ctx, cx, cy, s, t, blink, mouth);
    case 'system':
    case 'sys':
    case 'engine': return terminal(ctx, cx, cy, s, t);
    default: return generic(ctx, cx, cy, s, t, blink, mouth, o.id);
  }
}

function glow(ctx: CanvasRenderingContext2D, col: string, blur = 10): void {
  ctx.strokeStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = blur;
  ctx.lineWidth = 2;
}

function eyes(ctx: CanvasRenderingContext2D, cx: number, y: number, gap: number, r: number, col: string, blink: boolean): void {
  ctx.fillStyle = col;
  for (const sx of [-1, 1]) {
    if (blink) ctx.fillRect(cx + sx * gap - r, y - 1, r * 2, 2);
    else {
      ctx.beginPath();
      ctx.arc(cx + sx * gap, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function mouthLine(ctx: CanvasRenderingContext2D, cx: number, y: number, wdt: number, open: number, smile = 0): void {
  ctx.beginPath();
  ctx.moveTo(cx - wdt, y);
  ctx.quadraticCurveTo(cx, y + smile + open * 8, cx + wdt, y);
  if (open > 0.1) ctx.quadraticCurveTo(cx, y - open * 3, cx - wdt, y);
  ctx.stroke();
}

function auntie(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, blink: boolean, m: number, revealed: boolean): void {
  const col = revealed && Math.sin(t / 300) > 0.6 ? '#4cf0ff' : '#ffb13d';
  glow(ctx, col);
  // hair cloud
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ctx.arc(cx + Math.cos(a) * s * 0.28, cy - s * 0.08 + Math.sin(a) * s * 0.22, s * 0.1, 0, Math.PI * 2);
  }
  ctx.fillStyle = hexA(col, 0.18);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.02, s * 0.24, s * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();
  // headset
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.3, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.fillRect(cx - s * 0.33, cy - s * 0.04, s * 0.06, s * 0.12);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.06);
  ctx.quadraticCurveTo(cx - s * 0.25, cy + s * 0.22, cx - s * 0.08, cy + s * 0.18);
  ctx.stroke();
  // cat-eye glasses
  ctx.strokeRect(cx - s * 0.17, cy - s * 0.06, s * 0.13, s * 0.08);
  ctx.strokeRect(cx + s * 0.04, cy - s * 0.06, s * 0.13, s * 0.08);
  eyes(ctx, cx, cy - s * 0.02, s * 0.105, s * 0.022, col, blink);
  mouthLine(ctx, cx, cy + s * 0.14, s * 0.08, m, 5);
  ctx.shadowBlur = 0;
}

function glitch(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, blink: boolean, m: number, reduced: boolean): void {
  const px = Math.max(3, Math.round(s / 22));
  const r = rng(Math.floor(t / (reduced ? 10000 : 180)));
  for (let y = -6; y <= 6; y++) {
    for (let x = -5; x <= 5; x++) {
      if (x * x / 30 + y * y / 42 > 1) continue;
      const v = r();
      if (v < 0.25) continue;
      ctx.fillStyle = v > 0.92 ? '#ff4fa8' : hexA('#a6ff4d', 0.25 + v * 0.5);
      ctx.fillRect(cx + x * px - px / 2 + (v > 0.97 ? 4 : 0), cy + y * px - px / 2, px - 1, px - 1);
    }
  }
  ctx.fillStyle = '#a6ff4d';
  if (!blink) {
    ctx.fillRect(cx - px * 2.5, cy - px * 2, px * 1.6, px * 1.6);
    ctx.fillRect(cx + px * 1, cy - px * 2, px * 1.6, px * 1.6);
  }
  ctx.fillRect(cx - px * 2, cy + px * 2.5, px * 4, px * (0.6 + m * 1.2));
  ctx.font = `600 ${Math.round(s * 0.09)}px "Martian Mono Variable", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(':)', cx + s * 0.32, cy - s * 0.32);
}

function patch(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, m: number): void {
  glow(ctx, '#e6defc', 14);
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.25, s * 0.31, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t / 4000;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * s * 0.33, cy + Math.sin(a) * s * 0.38);
    ctx.lineTo(cx + Math.cos(a) * s * 0.45, cy + Math.sin(a) * s * 0.47);
    ctx.stroke();
  }
  ctx.fillStyle = '#e6defc';
  ctx.fillRect(cx - s * 0.13, cy - s * 0.04, s * 0.08, s * 0.02);
  ctx.fillRect(cx + s * 0.05, cy - s * 0.04, s * 0.08, s * 0.02);
  ctx.fillRect(cx - s * 0.06, cy + s * 0.14, s * 0.12, s * 0.01 + m * 3);
  ctx.shadowBlur = 0;
}

function wraith(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, m: number): void {
  glow(ctx, '#a98bff');
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.42);
  ctx.quadraticCurveTo(cx - s * 0.34, cy - s * 0.36, cx, cy - s * 0.38);
  ctx.quadraticCurveTo(cx + s * 0.34, cy - s * 0.36, cx + s * 0.3, cy + s * 0.42);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.7)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.02, s * 0.18, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // flicker: an old save loading
  const vis = Math.sin(t / 130) > -0.7 ? 1 : 0.2;
  ctx.globalAlpha = vis;
  ctx.fillStyle = '#a98bff';
  ctx.fillRect(cx - s * 0.1, cy - s * 0.02, s * 0.06, s * 0.025);
  ctx.fillRect(cx + s * 0.04, cy - s * 0.02, s * 0.06, s * 0.025);
  ctx.fillRect(cx - s * 0.05, cy + s * 0.12, s * 0.1, 1.5 + m * 3);
  ctx.globalAlpha = 1;
  ctx.font = `500 ${Math.round(s * 0.07)}px "Martian Mono Variable", monospace`;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(169,139,255,.6)';
  ctx.fillText('--:--', 6, s * 0.12);
  ctx.shadowBlur = 0;
}

function chairman(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, m: number): void {
  // KH jellyfish mark with a too-wide smile
  glow(ctx, '#ffd6ee', 16);
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.04, s * 0.26, Math.PI, 0);
  ctx.quadraticCurveTo(cx + s * 0.26, cy + s * 0.06, cx, cy + s * 0.06);
  ctx.quadraticCurveTo(cx - s * 0.26, cy + s * 0.06, cx - s * 0.26, cy - s * 0.04);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const x = cx - s * 0.18 + i * s * 0.09;
    ctx.beginPath();
    ctx.moveTo(x, cy + s * 0.07);
    for (let k = 1; k <= 6; k++) ctx.lineTo(x + Math.sin(t / 400 + i + k) * 4, cy + s * 0.07 + k * s * 0.05);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd6ee';
  ctx.beginPath();
  ctx.arc(cx - s * 0.09, cy - s * 0.1, s * 0.025, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.09, cy - s * 0.1, s * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.06, s * 0.13, 0.15, Math.PI - 0.15);
  ctx.lineWidth = 2 + m * 2;
  ctx.stroke();
  ctx.font = `600 ${Math.round(s * 0.07)}px "Martian Mono Variable", monospace`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,214,238,.6)';
  ctx.fillText('™', cx + s * 0.38, cy - s * 0.26);
  ctx.shadowBlur = 0;
}

function whisper(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, blink: boolean, m: number): void {
  glow(ctx, '#6dffc1');
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.22, s * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(109,255,193,.15)';
  ctx.fillRect(cx - s * 0.3, cy - s * 0.09, s * 0.6, s * 0.1);
  ctx.strokeRect(cx - s * 0.3, cy - s * 0.09, s * 0.6, s * 0.1);
  eyes(ctx, cx, cy - s * 0.04, s * 0.09, s * 0.018, '#6dffc1', blink);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.04, cy + s * 0.15);
  ctx.lineTo(cx + s * 0.04, cy + s * 0.15 + m * 2);
  ctx.stroke();
  // finger to lips
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.4);
  ctx.lineTo(cx, cy + s * 0.13);
  ctx.stroke();
  ctx.shadowBlur = 0;
  void t;
}

function doc(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, blink: boolean, m: number): void {
  glow(ctx, '#4cf0ff');
  ctx.beginPath();
  ctx.ellipse(cx, cy, s * 0.23, s * 0.29, 0, 0, Math.PI * 2);
  ctx.stroke();
  // head mirror
  ctx.beginPath();
  ctx.arc(cx + s * 0.02, cy - s * 0.25, s * 0.08, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = hexA('#4cf0ff', 0.3 + 0.2 * Math.sin(t / 500));
  ctx.fill();
  eyes(ctx, cx, cy - s * 0.04, s * 0.09, s * 0.02, '#4cf0ff', blink);
  // loupe
  ctx.beginPath();
  ctx.arc(cx + s * 0.09, cy - s * 0.04, s * 0.05, 0, Math.PI * 2);
  ctx.stroke();
  // surgical mask
  ctx.fillStyle = 'rgba(76,240,255,.18)';
  ctx.fillRect(cx - s * 0.17, cy + s * 0.06, s * 0.34, s * 0.16);
  ctx.strokeRect(cx - s * 0.17, cy + s * 0.06, s * 0.34, s * 0.16);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.12, cy + s * 0.12 + m * 3);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.12 + m * 3);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function deacon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, blink: boolean, m: number): void {
  glow(ctx, '#f5ef8a', 14);
  ctx.beginPath();
  ctx.ellipse(cx, cy - s * 0.36, s * 0.18, s * 0.05, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.02, s * 0.21, s * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();
  eyes(ctx, cx, cy - s * 0.02, s * 0.08, s * 0.018, '#f5ef8a', blink);
  mouthLine(ctx, cx, cy + s * 0.14, s * 0.07, m, 3);
  ctx.font = `600 ${Math.round(s * 0.06)}px "Martian Mono Variable", monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(245,239,138,.75)';
  ctx.fillText('premium', cx, cy - s * 0.42 + Math.sin(t / 700) * 2);
  ctx.shadowBlur = 0;
}

function terminal(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number): void {
  glow(ctx, '#4cf0ff', 6);
  ctx.strokeRect(cx - s * 0.32, cy - s * 0.24, s * 0.64, s * 0.48);
  ctx.fillStyle = '#4cf0ff';
  ctx.font = `600 ${Math.round(s * 0.14)}px "Martian Mono Variable", monospace`;
  ctx.textAlign = 'left';
  ctx.fillText('>_', cx - s * 0.22, cy + s * 0.05);
  if (Math.floor(t / 500) % 2) ctx.fillRect(cx + s * 0.06, cy - s * 0.04, s * 0.06, s * 0.1);
  ctx.shadowBlur = 0;
}

function generic(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, blink: boolean, m: number, id: string): void {
  const r = rng(hash(id));
  const col = PALETTES[Math.floor(r() * PALETTES.length)];
  glow(ctx, col);
  const shape = Math.floor(r() * 3);
  ctx.beginPath();
  if (shape === 0) ctx.ellipse(cx, cy, s * (0.2 + r() * 0.06), s * (0.26 + r() * 0.06), 0, 0, Math.PI * 2);
  else if (shape === 1) ctx.rect(cx - s * 0.22, cy - s * 0.28, s * 0.44, s * 0.56);
  else {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = cx + Math.cos(a) * s * 0.28;
      const y = cy + Math.sin(a) * s * 0.3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.stroke();
  if (/bofh|sysadmin|admin/.test(id)) {
    ctx.fillStyle = col;
    ctx.font = `600 ${Math.round(s * 0.08)}px "Martian Mono Variable", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('# root', cx, cy - s * 0.34);
  }
  if (/fridge|parental/.test(id)) drawSkull(ctx, cx + s * 0.3, cy - s * 0.3, s * 0.06);
  eyes(ctx, cx, cy - s * 0.05, s * (0.07 + r() * 0.04), s * 0.022, col, blink);
  mouthLine(ctx, cx, cy + s * 0.13, s * (0.05 + r() * 0.05), m, (r() - 0.3) * 8);
  ctx.shadowBlur = 0;
  void t;
}
