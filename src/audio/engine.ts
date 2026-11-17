/**
 * engine.ts - AudioContext lifecycle, master chain, persisted settings and
 * the two voice primitives (tone, noise) used by sfx.ts and music.ts.
 *
 * Everything here is a safe no-op when WebAudio is missing (tests, SSR).
 *
 * Master chain:
 *   sfx bus ─┐
 *   music bus┴─ mix ─┬─ dry ──────────────┐
 *                    └─ crush ─ wet ──────┴─ wobble delay ─ stutter gate
 *                       ─ compressor (limiter) ─ master gain ─ soft clip ─ out
 */

export interface Settings {
  master: number;
  sfx: number;
  music: number;
  muted: boolean;
}

export const settings: Settings = { master: 0.8, sfx: 0.8, music: 0.6, muted: false };

const PFX = 'cw.audio.';
const MAX_VOICES = 110;

export const clamp = (x: number, lo: number, hi: number): number =>
  Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo;

/** MIDI note number to Hz. */
export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Keep frequencies inside a range every Biquad and Oscillator accepts. */
const cf = (f: number): number => clamp(f, 20, 18000);

// ---------------------------------------------------------------- storage

function lsRead(k: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(PFX + k);
  } catch {
    return null;
  }
}

function lsWrite(k: string, v: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PFX + k, v);
  } catch {
    /* storage full or blocked: settings simply do not persist */
  }
}

export function loadSettings(): void {
  const num = (k: string): number | null => {
    const v = lsRead(k);
    if (v === null) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? clamp(n, 0, 1) : null;
  };
  const m = num('master');
  const s = num('sfx');
  const mu = num('music');
  if (m !== null) settings.master = m;
  if (s !== null) settings.sfx = s;
  if (mu !== null) settings.music = mu;
  const muted = lsRead('muted');
  if (muted !== null) settings.muted = muted === '1';
}

export function saveSettings(): void {
  lsWrite('master', String(settings.master));
  lsWrite('sfx', String(settings.sfx));
  lsWrite('music', String(settings.music));
  lsWrite('muted', settings.muted ? '1' : '0');
}

// ----------------------------------------------------------------- graph

const makeCurve = (n: number, fn: (x: number) => number) => {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = fn((i / (n - 1)) * 2 - 1);
  return c;
};

export interface ProbeEvent {
  tag: string;
  t: number;
  dur: number;
  g: number;
  f: number;
}

export interface Graph {
  /** Optional instrumentation hook (tests only). */
  probe: ((e: ProbeEvent) => void) | null;
  ctx: AudioContext | null;
  sfx: GainNode | null;
  music: GainNode | null;
  /** Input of the shared music reverb. */
  reverb: GainNode | null;
  master: GainNode | null;
  dry: GainNode | null;
  wet: GainNode | null;
  stutter: GainNode | null;
  wobDepth: GainNode | null;
  wobLfo: OscillatorNode | null;
  white: AudioBuffer | null;
  brown: AudioBuffer | null;
  crushCurve: ReturnType<typeof makeCurve> | null;
  driveCurve: ReturnType<typeof makeCurve> | null;
  /** Live source-node count (oscillators + buffer sources). */
  active: number;
}

export const G: Graph = {
  probe: null,
  ctx: null,
  sfx: null,
  music: null,
  reverb: null,
  master: null,
  dry: null,
  wet: null,
  stutter: null,
  wobDepth: null,
  wobLfo: null,
  white: null,
  brown: null,
  crushCurve: null,
  driveCurve: null,
  active: 0,
};

let corruption = 0;

export function ready(): boolean {
  return G.ctx !== null;
}

/** Create the context and master chain once. Returns true when audio is usable. */
export function ensureContext(): boolean {
  if (G.ctx) {
    if (G.ctx.state !== 'running') G.ctx.resume().catch(() => undefined);
    return true;
  }
  const w = globalThis as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return false;
  let c: AudioContext;
  try {
    c = new Ctor({ latencyHint: 'interactive' });
  } catch {
    return false;
  }

  const sr = c.sampleRate;

  // noise buffers (2 s, looped with random start offsets)
  const len = Math.floor(sr * 2);
  const white = c.createBuffer(1, len, sr);
  const brown = c.createBuffer(1, len, sr);
  const wd = white.getChannelData(0);
  const bd = brown.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w0 = Math.random() * 2 - 1;
    wd[i] = w0;
    last = (last + 0.02 * w0) / 1.02;
    bd[i] = last * 3.5;
  }

  // channel strips
  const sfx = c.createGain();
  const music = c.createGain();
  const mix = c.createGain();
  const dry = c.createGain();
  const wet = c.createGain();
  const crush = c.createWaveShaper();
  const crushCurve = makeCurve(1025, (x) => Math.round(x * 10) / 10);
  crush.curve = crushCurve;
  const sum = c.createGain();
  const wob = c.createDelay(0.05);
  wob.delayTime.value = 0.006;
  const wobLfo = c.createOscillator();
  wobLfo.frequency.value = 0.7;
  const wobDepth = c.createGain();
  wobDepth.gain.value = 0;
  wobLfo.connect(wobDepth);
  wobDepth.connect(wob.delayTime);
  wobLfo.start();
  const stutter = c.createGain();
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.knee.value = 8;
  comp.ratio.value = 12;
  comp.attack.value = 0.002;
  comp.release.value = 0.18;
  const master = c.createGain();
  const soft = c.createWaveShaper();
  soft.curve = makeCurve(2049, (x) => Math.tanh(x * 0.9) / 0.9);

  sfx.connect(mix);
  music.connect(mix);
  mix.connect(dry);
  mix.connect(crush);
  crush.connect(wet);
  dry.connect(sum);
  wet.connect(sum);
  sum.connect(wob);
  wob.connect(stutter);
  stutter.connect(comp);
  comp.connect(master);
  master.connect(soft);
  soft.connect(c.destination);
  wet.gain.value = 0;
  dry.gain.value = 1;

  // shared music reverb (short generated impulse)
  const irLen = Math.floor(sr * 0.7);
  const ir = c.createBuffer(2, irLen, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3);
  }
  const conv = c.createConvolver();
  conv.buffer = ir;
  const revIn = c.createGain();
  const revOut = c.createGain();
  revOut.gain.value = 0.4;
  revIn.connect(conv);
  conv.connect(revOut);
  revOut.connect(music);

  G.ctx = c;
  G.sfx = sfx;
  G.music = music;
  G.reverb = revIn;
  G.master = master;
  G.dry = dry;
  G.wet = wet;
  G.stutter = stutter;
  G.wobDepth = wobDepth;
  G.wobLfo = wobLfo;
  G.white = white;
  G.brown = brown;
  G.crushCurve = crushCurve;
  G.driveCurve = makeCurve(1025, (x) => Math.tanh(x * 3.2) * 0.8);

  applyVolumes(true);
  applyCorruption();
  c.resume().catch(() => undefined);
  return true;
}

export function applyVolumes(immediate = false): void {
  const c = G.ctx;
  if (!c || !G.master || !G.sfx || !G.music) return;
  const t = c.currentTime;
  const set = (p: AudioParam, v: number): void => {
    if (immediate) p.setValueAtTime(v, t);
    else p.setTargetAtTime(v, t, 0.03);
  };
  set(G.master.gain, settings.muted ? 0 : settings.master);
  set(G.sfx.gain, settings.sfx * 0.9);
  set(G.music.gain, settings.music * 0.8);
}

// ------------------------------------------------------------ corruption

let stutterTimer: ReturnType<typeof setTimeout> | undefined;

function stutterLoop(): void {
  stutterTimer = undefined;
  const c = G.ctx;
  const g = G.stutter;
  if (!c || !g || corruption < 0.2) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  let t = c.currentTime + 0.01;
  const bursts = corruption > 0.7 && Math.random() < 0.4 ? 3 : 1;
  for (let i = 0; i < bursts; i++) {
    const len = 0.03 + Math.random() * 0.08 * corruption;
    g.gain.setTargetAtTime(0, t, 0.003);
    g.gain.setTargetAtTime(1, t + len, 0.003);
    t += len + 0.05;
  }
  stutterTimer = setTimeout(stutterLoop, (350 + Math.random() * 1300) / (0.3 + corruption));
}

/** (Re)start the stutter scheduler; called on corruption change and tab show. */
export function kickStutter(): void {
  if (stutterTimer === undefined && G.ctx && corruption >= 0.2) {
    stutterTimer = setTimeout(stutterLoop, 400);
  }
}

export function setCorruptionLevel(x: number): void {
  corruption = clamp(x, 0, 1);
  applyCorruption();
}

function applyCorruption(): void {
  const c = G.ctx;
  if (!c || !G.wet || !G.dry || !G.wobDepth || !G.wobLfo) return;
  const t = c.currentTime;
  G.wet.gain.setTargetAtTime(0.75 * corruption, t, 0.15);
  G.dry.gain.setTargetAtTime(1 - 0.6 * corruption, t, 0.15);
  G.wobDepth.gain.setTargetAtTime(0.005 * corruption * corruption, t, 0.2);
  G.wobLfo.frequency.setTargetAtTime(0.7 + corruption * 5, t, 0.3);
  if (corruption < 0.2 && G.stutter) {
    G.stutter.gain.cancelScheduledValues(t);
    G.stutter.gain.setTargetAtTime(1, t, 0.01);
  }
  kickStutter();
}

// ---------------------------------------------------------- voice helpers

export interface FilterOpts {
  t: BiquadFilterType;
  f: number;
  /** Exponential sweep target over the voice duration. */
  f2?: number;
  q?: number;
}

export const lp = (f: number, f2?: number, q = 0.7): FilterOpts => ({ t: 'lowpass', f, f2, q });
export const hp = (f: number, f2?: number, q = 0.7): FilterOpts => ({ t: 'highpass', f, f2, q });
export const bp = (f: number, f2?: number, q = 1): FilterOpts => ({ t: 'bandpass', f, f2, q });

export interface ToneOpts {
  /** Start offset in seconds from the base time. */
  at?: number;
  type?: OscillatorType;
  f: number;
  /** Exponential glide target. */
  f2?: number;
  /** Fraction of dur the glide takes (default 1). */
  glide?: number;
  dur: number;
  /** Peak gain. */
  g?: number;
  /** Attack seconds (linear). */
  a?: number;
  /** When set: hold at peak, then release over r seconds ending at dur. Otherwise exponential decay from the peak. */
  r?: number;
  /** Detune in cents. */
  det?: number;
  filt?: FilterOpts;
  vib?: { rate: number; depth: number };
  /** Voice-count ceiling for this voice (default MAX_VOICES). Music uses a lower one so sfx always win. */
  cap?: number;
  /** Label for instrumentation. */
  tag?: string;
}

export interface NoiseOpts {
  at?: number;
  dur: number;
  g?: number;
  a?: number;
  r?: number;
  brown?: boolean;
  rate?: number;
  filt?: FilterOpts;
  filt2?: FilterOpts;
  cap?: number;
  tag?: string;
}

const FLOOR = 0.0001;

function envelope(p: AudioParam, t: number, dur: number, peak: number, a0: number, r0: number | undefined): void {
  const a = Math.min(Math.max(a0, 0.001), dur * 0.5);
  p.setValueAtTime(FLOOR, t);
  p.linearRampToValueAtTime(peak, t + a);
  if (r0 !== undefined) {
    const r = Math.max(0.005, Math.min(r0, dur - a));
    p.setValueAtTime(peak, t + dur - r);
  }
  p.exponentialRampToValueAtTime(FLOOR, t + dur);
}

function mkFilter(c: AudioContext, o: FilterOpts, t: number, dur: number): BiquadFilterNode {
  const f = c.createBiquadFilter();
  f.type = o.t;
  f.frequency.setValueAtTime(cf(o.f), t);
  if (o.f2 !== undefined) f.frequency.exponentialRampToValueAtTime(cf(o.f2), t + dur);
  f.Q.value = clamp(o.q ?? 0.7, 0.0001, 30);
  return f;
}

function track(src: AudioScheduledSourceNode, nodes: AudioNode[]): void {
  G.active++;
  src.onended = () => {
    G.active--;
    for (const n of nodes) {
      try {
        n.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  };
}

/** One oscillator voice. Self-cleaning. Never throws. */
export function tone(dest: AudioNode, base: number, o: ToneOpts): void {
  const c = G.ctx;
  if (!c || G.active > (o.cap ?? MAX_VOICES)) return;
  try {
    const t = Math.max(base + (o.at ?? 0), c.currentTime + 0.002);
    const dur = Math.max(0.02, o.dur);
    if (G.probe) G.probe({ tag: o.tag ?? 'sfx', t, dur, g: o.g ?? 0.3, f: o.f });
    const end = t + dur + 0.03;
    const osc = c.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(cf(o.f), t);
    if (o.f2 !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(cf(o.f2), t + dur * clamp(o.glide ?? 1, 0.05, 1));
    }
    if (o.det) osc.detune.value = clamp(o.det, -2400, 2400);
    const g = c.createGain();
    envelope(g.gain, t, dur, Math.max(0.0002, o.g ?? 0.3), o.a ?? 0.004, o.r);
    const nodes: AudioNode[] = [osc, g];
    if (o.filt) {
      const f = mkFilter(c, o.filt, t, dur);
      osc.connect(f);
      f.connect(g);
      nodes.push(f);
    } else {
      osc.connect(g);
    }
    g.connect(dest);
    if (o.vib) {
      const lfo = c.createOscillator();
      lfo.frequency.value = clamp(o.vib.rate, 0.1, 60);
      const lg = c.createGain();
      lg.gain.value = clamp(o.vib.depth, 0, 1200);
      lfo.connect(lg);
      lg.connect(osc.detune);
      lfo.start(t);
      lfo.stop(end);
      track(lfo, [lfo, lg]);
    }
    osc.start(t);
    osc.stop(end);
    track(osc, nodes);
  } catch {
    /* a failed voice must never break the game */
  }
}

/** One filtered noise burst. Self-cleaning. Never throws. */
export function noise(dest: AudioNode, base: number, o: NoiseOpts): void {
  const c = G.ctx;
  const buf = o.brown ? G.brown : G.white;
  if (!c || !buf || G.active > (o.cap ?? MAX_VOICES)) return;
  try {
    const t = Math.max(base + (o.at ?? 0), c.currentTime + 0.002);
    const dur = Math.max(0.01, Math.min(o.dur, 1.9));
    if (G.probe) G.probe({ tag: o.tag ?? 'sfx', t, dur, g: o.g ?? 0.3, f: o.filt ? o.filt.f : 4000 });
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = clamp(o.rate ?? 1, 0.1, 4);
    const g = c.createGain();
    envelope(g.gain, t, dur, Math.max(0.0002, o.g ?? 0.3), o.a ?? 0.002, o.r);
    const nodes: AudioNode[] = [src, g];
    let tail: AudioNode = src;
    for (const fo of [o.filt, o.filt2]) {
      if (!fo) continue;
      const f = mkFilter(c, fo, t, dur);
      tail.connect(f);
      tail = f;
      nodes.push(f);
    }
    tail.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.03);
    track(src, nodes);
  } catch {
    /* ignore */
  }
}
