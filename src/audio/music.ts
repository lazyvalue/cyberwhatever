/**
 * music.ts - driving generative cyberpunk bed: dark synthwave / industrial / acid.
 *
 * Structure
 * - One "lane" (its own buses, filters, echo, sidechain duck) per active mood.
 *   setMood() fades the old lane out and the new one in (~1.5 s).
 * - A lookahead scheduler places 16th-note steps on the AudioContext clock.
 *   The JS timer only keeps ~0.3 s queued, so timer jitter never reaches the audio.
 * - Each mood is a 16-bar form: two 8-bar sections (A, B). Every 4th bar is a fill
 *   (drum roll, bass run, filter sweep, zap); the last bar of a section has a riser;
 *   the first bar of the next one a crash.
 * - Kick sidechain: every kick ducks bass, stabs and pads so the mix pumps.
 * - setIntensity(0..1): opens filters, adds tempo, hats, open hats, snare, stabs, arp,
 *   lead, bass octave and fifth doubling, more drive, and dissonance.
 */
import { G, bp, clamp, hp, lp, mtof, noise, tone } from './engine.ts';
import type { NoiseOpts, ToneOpts } from './engine.ts';

export type Mood = 'silence' | 'title' | 'hub' | 'system' | 'combat' | 'boss' | 'finale' | 'credits';

/** [startStep, semitones above lead root, lengthSteps] */
type Motif = ReadonlyArray<readonly [number, number, number]>;

interface Chord {
  /** Root offset in semitones from the mood root. */
  r: number;
  /** Chord tones in semitones above the chord root. */
  t: readonly number[];
}

const mi = (r: number): Chord => ({ r, t: [0, 3, 7] });
const ma = (r: number): Chord => ({ r, t: [0, 4, 7] });
const di = (r: number): Chord => ({ r, t: [0, 3, 6] });
const m7 = (r: number): Chord => ({ r, t: [0, 3, 7, 10] });
const M7 = (r: number): Chord => ({ r, t: [0, 4, 7, 11] });
const wr = (r: number): Chord => ({ r, t: [0, 1, 6] });

/** Collected pattern-authoring mistakes (checked by tests). */
export const PATTERN_ERRORS: string[] = [];

interface BassNote {
  semi: number;
  acc: boolean;
  slide: boolean;
}

/** Bass tokens: `.` rest, `N` semitone, `N!` accent, `sN` slide in from the previous note. 16 per bar. */
function parseBass(src: string): Array<BassNote | null> {
  const toks = src.trim().split(/\s+/);
  if (toks.length !== 16) PATTERN_ERRORS.push(`bass pattern has ${toks.length} steps: ${src}`);
  const out: Array<BassNote | null> = [];
  for (let i = 0; i < 16; i++) {
    const m = /^(s)?(-?\d+)(!)?$/.exec(toks[i] ?? '.');
    out.push(m ? { semi: parseInt(m[2] ?? '0', 10), acc: m[3] === '!', slide: m[1] === 's' } : null);
  }
  return out;
}

/** Hard cap for music voices so sfx always get room (engine cap is higher). */
const MUSIC_CAP = 90;

/** The title motif: A C E D | C A G E, as an A minor hook over two bars. */
export const TITLE_MOTIF: Motif = [
  [0, 12, 3], [4, 15, 3], [8, 19, 4], [14, 17, 2],
  [16, 15, 3], [20, 12, 3], [24, 10, 6], [30, 7, 2],
];

/** The credits motif: the same shape, resolved into A major over four bars. */
const CREDITS_MOTIF: Motif = [
  [0, 12, 3], [4, 16, 3], [8, 19, 4], [14, 17, 2],
  [16, 16, 3], [20, 12, 3], [24, 14, 6],
  [32, 16, 3], [36, 19, 3], [40, 21, 4], [46, 19, 2],
  [48, 16, 3], [52, 14, 3], [56, 12, 8],
];

interface SectionSrc {
  /** One chord per bar of a 4-bar phrase. */
  prog: readonly Chord[];
  /** Bass bars: [bar 1 and 3, bar 2]; fill on bar 4. */
  bass: readonly [string, string];
  fill: string;
  /** 16 chars: x short hard-gated chord stab, X long. */
  stab: string;
  /** 16 chars: digit = chord-tone index (3 octaves), . rest. */
  arp: string;
  kick: string;
  snare: string;
  /** X accent, x normal, g ghost (only at intensity >= .55). */
  hat: string;
  /** o = open hat. */
  open: string;
  motif?: Motif;
}

interface Section extends SectionSrc {
  bassP: Array<Array<BassNote | null>>;
  fillP: Array<BassNote | null>;
}

function section(s: SectionSrc): Section {
  for (const k of ['stab', 'arp', 'kick', 'snare', 'hat', 'open'] as const) {
    if (s[k].length !== 16) PATTERN_ERRORS.push(`${k} pattern has ${s[k].length} steps: ${s[k]}`);
  }
  return { ...s, bassP: [parseBass(s.bass[0]), parseBass(s.bass[1])], fillP: parseBass(s.fill) };
}

interface Layers {
  pad: number;
  bass: number;
  arp: number;
  kick: number;
  snare: number;
  hat: number;
  open: number;
  stab: number;
  lead: number;
}

interface MoodDef {
  bpm: number;
  /** MIDI of the bass root. */
  root: number;
  stabOct: number;
  arpOct: number;
  wave: { bass: OscillatorType; arp: OscillatorType; lead: OscillatorType };
  /** Intensity at which each layer enters (9 = never). */
  mins: Layers;
  gain: { pad: number; bass: number; stab: number; arp: number; perc: number; lead: number };
  bassLen: number;
  bassCut: number;
  reso: number;
  /** Base pre-gain of the bass waveshaper; grows with intensity. */
  drive: number;
  /** Gain the sidechain ducks to on every kick (lower = more pump). */
  duck: number;
  stabCut: number;
  arpCut: number;
  /** Lane lowpass cutoff at intensity 0 and its growth at intensity 1. */
  cutoff: number;
  open: number;
  tempoUp: number;
  swing: number;
  echo: number;
  reverb: number;
  motifEvery: number;
  motif?: Motif;
  hat32?: boolean;
  vib?: boolean;
  riser?: boolean;
  zaps?: boolean;
  crush?: boolean;
  /** Random cents of detune on bass/arp. */
  wrong?: number;
  /** Chords, tempo and drums wander; glitch bursts. */
  unstable?: boolean;
  /** Mangle the motif (finale). */
  quote?: boolean;
  sections: Section[];
}

const N = 9;
const HAT16 = 'xxXxxxXxxxXxxxXx';
const OPEN_OFF = '..o...o...o...o.';
const FOUR = 'X...X...X...X...';
const BACKBEAT = '....X.......X...';

const DEFS: Record<Exclude<Mood, 'silence'>, MoodDef> = {
  // ~110: A minor, the hummable hook over a four-on-the-floor synthwave pulse.
  title: {
    bpm: 110, root: 33, stabOct: 36, arpOct: 36,
    wave: { bass: 'sawtooth', arp: 'square', lead: 'sawtooth' },
    mins: { pad: 0.3, bass: 0, arp: 0.15, kick: 0, snare: 0, hat: 0, open: 0.5, stab: 0, lead: 0 },
    gain: { pad: 1, bass: 1, stab: 0.8, arp: 0.9, perc: 0.95, lead: 1.2 },
    bassLen: 1.5, bassCut: 900, reso: 6, drive: 0.9, duck: 0.3, stabCut: 2600, arpCut: 3200,
    cutoff: 5500, open: 1.5, tempoUp: 0.05, swing: 0, echo: 0.3, reverb: 0.1,
    motifEvery: 4, motif: TITLE_MOTIF, vib: true, riser: true, zaps: true,
    sections: [
      section({
        prog: [mi(0), ma(8), ma(10), ma(7)],
        bass: ['0! . 0 12 . 0 . 0  0! . 0 12 . 3 . 7', '0! . 0 12 . 0 1 0  0! . 0 12 . 10 s12 7'],
        fill: '0! 0 12 0 0! 0 12 0  0! 12 . 12 7 10 s12 s13',
        stab: 'x..x..x.x..x..x.', arp: '0.2.4.2.0.2.4.7.',
        kick: FOUR, snare: BACKBEAT, hat: HAT16, open: OPEN_OFF,
      }),
      section({
        prog: [ma(8), ma(10), mi(0), ma(7)],
        bass: ['0! 0 . 0 12 . 0 0  0! 0 . 0 12 . 7 s10', '0! . 0 . 0! . 12 .  0! . 7 . 0! . 10 12'],
        fill: '0! 0 12 0 0! 0 12 0  0! 12 . 12 7 10 s12 s13',
        stab: '..x...X...x...X.', arp: '0.2.4.7.9.7.4.2.',
        kick: 'X...X...X...X..x', snare: BACKBEAT, hat: HAT16, open: OPEN_OFF,
      }),
    ],
  },

  // ~100: D dorian, laid-back head-nod beat, mellow stabs, short bell arp. Still a beat.
  hub: {
    bpm: 100, root: 38, stabOct: 36, arpOct: 36,
    wave: { bass: 'sawtooth', arp: 'triangle', lead: 'triangle' },
    mins: { pad: 0.2, bass: 0, arp: 0, kick: 0, snare: 0, hat: 0, open: 0.55, stab: 0.1, lead: 0.4 },
    gain: { pad: 1, bass: 0.9, stab: 0.55, arp: 0.9, perc: 0.8, lead: 0.9 },
    bassLen: 2.2, bassCut: 650, reso: 4, drive: 0.7, duck: 0.4, stabCut: 1800, arpCut: 2600,
    cutoff: 4200, open: 1.5, tempoUp: 0.05, swing: 0.08, echo: 0.35, reverb: 0.12,
    motifEvery: 4, vib: true,
    sections: [
      section({
        prog: [m7(0), M7(8), m7(5), M7(10)],
        bass: ['0! . . 0 . . 12 .  0! . . 0 . 7 . 10', '0! . 0 . . 12 . 7  0! . . 0 . . 12 s10'],
        fill: '0! . 0 . 7 . 10 .  12 . 10 . 7 . 5 s3',
        stab: '..x.......x...x.', arp: '0...2...4...2...',
        kick: 'X.....x...X..x..', snare: BACKBEAT, hat: 'x.X.x.X.x.X.x.X.', open: '......o.......o.',
        motif: [[0, 7, 2], [4, 10, 2], [8, 12, 4], [16, 10, 2], [20, 7, 2], [24, 3, 6]],
      }),
      section({
        prog: [m7(0), m7(5), M7(8), M7(10)],
        bass: ['0! . . 0 . 12 . 0  . . 7 . 0! . . .', '0! . 0 . . 12 . 7  0! . . 0 . . 12 s10'],
        fill: '0! . 0 . 7 . 10 .  12 . 10 . 7 . 5 s3',
        stab: '..x...x...x...x.', arp: '0.2.4.2.0.2.5.4.',
        kick: 'X.....x...X..x..', snare: BACKBEAT, hat: 'x.X.x.X.x.X.x.X.', open: '......o.......o.',
        motif: [[0, 12, 3], [4, 10, 2], [8, 7, 4], [16, 3, 2], [20, 7, 2], [24, 10, 6]],
      }),
    ],
  },

  // ~120: E phrygian, tense 16th acid bass, gated stabs, ticking hats.
  system: {
    bpm: 120, root: 40, stabOct: 36, arpOct: 36,
    wave: { bass: 'sawtooth', arp: 'square', lead: 'sawtooth' },
    mins: { pad: 0.25, bass: 0, arp: 0.1, kick: 0, snare: 0, hat: 0, open: 0.55, stab: 0.05, lead: N },
    gain: { pad: 0.9, bass: 1, stab: 0.8, arp: 0.9, perc: 0.95, lead: 0 },
    bassLen: 1.1, bassCut: 1000, reso: 9, drive: 1.1, duck: 0.28, stabCut: 2400, arpCut: 3600,
    cutoff: 4500, open: 2.0, tempoUp: 0.06, swing: 0, echo: 0.3, reverb: 0.08,
    motifEvery: 4, riser: true, zaps: true,
    sections: [
      section({
        prog: [mi(0), ma(1), mi(0), di(7)],
        bass: ['0! 0 0 0 12 0 0 1  0! 0 0 0 12 0 s7 s6', '0! 0 12 0 0! 0 1 0  0! 0 12 0 6 . 7 s1'],
        fill: '0! 0 0 12 0! 0 0 13  0! 0 12 12 0 6 7 s12',
        stab: 'x.x.x.x.x.x.x.x.', arp: '0.2.0.3.0.2.4.3.',
        kick: FOUR, snare: BACKBEAT, hat: HAT16, open: OPEN_OFF,
      }),
      section({
        prog: [mi(0), mi(0), ma(1), di(7)],
        bass: ['0! 0 0 0 0! 0 0 0  0! 0 12 0 0! 6 7 1', '0! 0 12 0 0! 0 1 0  0! 0 12 0 6 . 7 s1'],
        fill: '0! 0 0 12 0! 0 0 13  0! 0 12 12 0 6 7 s12',
        stab: 'X..x..X..x..X.x.', arp: '0.3.0.4.0.3.5.4.',
        kick: 'X...X...X..xX...', snare: BACKBEAT, hat: HAT16, open: OPEN_OFF,
      }),
    ],
  },

  // ~138: G phrygian dominant, four on the floor, rolling 16th bass, 16th saw arp. A chase at intensity 1.
  combat: {
    bpm: 138, root: 43, stabOct: 24, arpOct: 36,
    wave: { bass: 'sawtooth', arp: 'sawtooth', lead: 'sawtooth' },
    mins: { pad: 0.35, bass: 0, arp: 0.2, kick: 0, snare: 0, hat: 0, open: 0.3, stab: 0, lead: 0.5 },
    gain: { pad: 0.7, bass: 1, stab: 0.9, arp: 0.9, perc: 1, lead: 1 },
    bassLen: 1.05, bassCut: 1300, reso: 10, drive: 1.2, duck: 0.22, stabCut: 3200, arpCut: 4200,
    cutoff: 5000, open: 2.0, tempoUp: 0.06, swing: 0, echo: 0.28, reverb: 0.07,
    motifEvery: 4, riser: true, zaps: true,
    sections: [
      section({
        prog: [mi(0), ma(1), mi(0), ma(10)],
        bass: ['0! 0 12 0 0! 0 12 1  0! 0 12 0 0! 7 s10 s12', '0! 0 0 12 0! 0 s3 0  0! 0 0 12 1 0 s6 s7'],
        fill: '0! 12 0! 12 0! 12 0! 12  0! 0 12 0 6 7 s10 s13',
        stab: 'X.xx.xx.X.xx.xx.', arp: '0347034703470347',
        kick: 'X...X..xX...X.x.', snare: '....X.......X..x', hat: HAT16, open: OPEN_OFF,
      }),
      section({
        prog: [mi(0), ma(1), di(7), ma(10)],
        bass: ['0! 0 12 0 12 0 1 0  0! 0 12 0 7 0 s6 s7', '0! 0 12 0 0! 0 12 1  0! 0 12 0 0! 7 s10 s12'],
        fill: '0! 12 0! 12 0! 12 0! 12  0! 0 12 0 6 7 s10 s13',
        stab: 'X..X..X.X..X..X.', arp: '0.470.470.47.470',
        kick: 'X...X..xX...X.x.', snare: '....X.......X..x', hat: HAT16, open: OPEN_OFF,
        motif: [
          [0, 12, 2], [3, 13, 1], [4, 12, 2], [8, 15, 2], [11, 13, 1], [12, 12, 2],
          [16, 7, 2], [19, 8, 1], [20, 7, 2], [24, 12, 3], [28, 13, 1], [30, 19, 2],
        ],
      }),
    ],
  },

  // ~150 half-time feel, double-time hats: the heaviest thing in the game. Clusters, tritones, distortion.
  boss: {
    bpm: 150, root: 36, stabOct: 24, arpOct: 24,
    wave: { bass: 'sawtooth', arp: 'sawtooth', lead: 'sawtooth' },
    mins: { pad: 0.3, bass: 0, arp: 0.3, kick: 0, snare: 0, hat: 0, open: 0.3, stab: 0, lead: 0.35 },
    gain: { pad: 0.8, bass: 1.1, stab: 1, arp: 0.9, perc: 1.1, lead: 1 },
    bassLen: 2, bassCut: 900, reso: 12, drive: 1.6, duck: 0.2, stabCut: 2200, arpCut: 3000,
    cutoff: 4000, open: 2.5, tempoUp: 0.05, swing: 0, echo: 0.25, reverb: 0.07,
    motifEvery: 4, hat32: true, riser: true, zaps: true, wrong: 30,
    sections: [
      section({
        prog: [di(0), ma(1), wr(0), mi(6)],
        bass: ['0! . . 0 0! . 1 .  0! . . 0 12 . 6 .', '0! . 0 0 . . 0! .  0! . 0 0 12 . 1 s6'],
        fill: '0! 0 0 0 0! 0 0 0  0! 1 6 7 12 6 1 s0',
        stab: 'X.....X...x..x..', arp: '0.0.3.0.0.3.4.3.',
        kick: 'X.....X...x..X..', snare: '........X.....x.', hat: HAT16, open: OPEN_OFF,
      }),
      section({
        prog: [mi(0), di(7), ma(1), wr(6)],
        bass: ['0! 0 . 0! 0 . 0! .  12 . 0! 0 . 6 7 .', '0! . 0 0 . . 0! .  0! . 0 0 12 . 1 s6'],
        fill: '0! 0 0 0 0! 0 0 0  0! 1 6 7 12 6 1 s0',
        stab: 'X..X..X.X..X.X..', arp: '0.0.3.0.0.3.4.3.',
        kick: 'X.....X...x..X..', snare: '........X.....x.', hat: HAT16, open: OPEN_OFF,
        motif: [[0, 0, 4], [6, 1, 2], [8, 0, 4], [14, 6, 2], [16, 0, 4], [22, 1, 2], [24, 12, 4], [30, 6, 2]],
      }),
    ],
  },

  // ~144, unstable and self-aware: a hard beat that drifts, mutates, and quotes the title hook mangled.
  finale: {
    bpm: 144, root: 33, stabOct: 36, arpOct: 36,
    wave: { bass: 'sawtooth', arp: 'square', lead: 'sawtooth' },
    mins: { pad: 0.3, bass: 0, arp: 0.1, kick: 0, snare: 0.1, hat: 0, open: 0.3, stab: 0, lead: 0 },
    gain: { pad: 0.8, bass: 1, stab: 0.9, arp: 0.9, perc: 1, lead: 1.1 },
    bassLen: 1.2, bassCut: 1100, reso: 10, drive: 1.4, duck: 0.22, stabCut: 3000, arpCut: 3800,
    cutoff: 4500, open: 2.5, tempoUp: 0.06, swing: 0, echo: 0.4, reverb: 0.1,
    motifEvery: 2, motif: TITLE_MOTIF, riser: true, zaps: true, crush: true, wrong: 60, unstable: true, quote: true,
    sections: [
      section({
        prog: [mi(0), ma(8), ma(10), ma(7)],
        bass: ['0! . 0 12 0! . 1 0  0! 6 0 12 . 0! 7 .', '0! 0 0 0 12 0 6 1  0! . 0 . 0! 7 s6 s1'],
        fill: '0! 0 12 0 6 0 1 0  0! 1 6 7 12 13 6 s1',
        stab: 'X.x..x.xX..x.x..', arp: '0.1.4.3.0.5.4.2.',
        kick: 'X..x..X..x.xX...', snare: '....X.......X..x', hat: HAT16, open: OPEN_OFF,
      }),
      section({
        prog: [ma(8), mi(0), ma(10), wr(7)],
        bass: ['0! 0 . 0 12 0 . 1  0! 0 . 0 6 0 s7 12', '0! 0 0 0 12 0 6 1  0! . 0 . 0! 7 s6 s1'],
        fill: '0! 0 12 0 6 0 1 0  0! 1 6 7 12 13 6 s1',
        stab: 'x.x.x.xxX..x..x.', arp: '0.3.1.4.2.5.3.6.',
        kick: 'X..x.xX..x.xX.x.', snare: '....X.......X..x', hat: HAT16, open: OPEN_OFF,
      }),
    ],
  },

  // ~112: A major, the hook resolved, warm but still a pulse.
  credits: {
    bpm: 112, root: 33, stabOct: 36, arpOct: 36,
    wave: { bass: 'sawtooth', arp: 'triangle', lead: 'sawtooth' },
    mins: { pad: 0, bass: 0, arp: 0, kick: 0, snare: 0, hat: 0, open: N, stab: 0, lead: 0 },
    gain: { pad: 1.1, bass: 0.9, stab: 0.6, arp: 0.9, perc: 0.75, lead: 1.1 },
    bassLen: 2.2, bassCut: 700, reso: 4, drive: 0.7, duck: 0.4, stabCut: 2400, arpCut: 3000,
    cutoff: 5000, open: 1.2, tempoUp: 0.04, swing: 0, echo: 0.35, reverb: 0.14,
    motifEvery: 4, motif: CREDITS_MOTIF, vib: true,
    sections: [
      section({
        prog: [M7(0), ma(5), m7(9), ma(7)],
        bass: ['0! . . 0 . . 12 .  0! . . 0 . 7 . 12', '0! . 0 . 12 . 0 7  0! . . 0 . . 12 s11'],
        fill: '0! . 0 . 7 . 12 .  0! . 7 . 12 . 14 s16',
        stab: 'x..x..x.x..x..x.', arp: '0.2.4.7.9.7.4.2.',
        kick: FOUR, snare: BACKBEAT, hat: 'x.x.x.x.x.x.x.x.', open: OPEN_OFF,
      }),
      section({
        prog: [ma(5), m7(9), ma(7), M7(0)],
        bass: ['0! . . 0 . . 12 .  0! . . 0 . 7 . 12', '0! . 0 . 12 . 0 7  0! . . 0 . . 12 s11'],
        fill: '0! . 0 . 7 . 12 .  0! . 7 . 12 . 14 s16',
        stab: '..x...x...x...x.', arp: '0.2.4.7.9.7.4.2.',
        kick: FOUR, snare: BACKBEAT, hat: 'x.x.x.x.x.x.x.x.', open: OPEN_OFF,
      }),
    ],
  },
};

// ---------------------------------------------------------------- helpers

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}

const pick = <T>(r: () => number, a: readonly T[], fallback: T): T => a[Math.floor(r() * a.length)] ?? fallback;
const at = <T>(a: ArrayLike<T>, i: number, fallback: T): T => a[i] ?? fallback;

const mtn = (dest: AudioNode, t: number, o: ToneOpts): void => tone(dest, t, { cap: MUSIC_CAP, ...o });
const mno = (dest: AudioNode, t: number, o: NoiseOpts): void => noise(dest, t, { cap: MUSIC_CAP, ...o });

// ------------------------------------------------------------------ lanes

interface Lane {
  mood: Exclude<Mood, 'silence'>;
  def: MoodDef;
  bus: GainNode;
  /** Lane filter for melodic parts (intensity opens it). */
  lpf: BiquadFilterNode;
  /** Arp, lead and stab input: lpf + echo + reverb send. */
  fx: GainNode;
  /** Sidechain gain on bass, stabs and pads. */
  duck: GainNode;
  /** Bass pre-gain into the waveshaper. */
  drivePre: GainNode;
  /** Sub path (skips distortion, still ducked). */
  subIn: GainNode;
  /** Kick saturator. */
  kickIn: AudioNode;
  /** Zap / bitcrush input. */
  crushIn: AudioNode;
  /** Stereo stab destinations: left, right. */
  pl: AudioNode;
  pr: AudioNode;
  nodes: AudioNode[];
  seed: number;
  rng: () => number;
  step: number;
  bar: number;
  nextTime: number;
  bpm: number;
  chord: Chord;
  lastBassF: number;
  /** Absolute step counter (never wraps). */
  abs: number;
  /** Motif notes queued for later steps, so voices are only created just in time. */
  pend: PendingNote[];
}

interface PendingNote {
  when: number;
  f: number;
  det: number;
  dur: number;
  cut: number;
  vib: boolean;
}

const LOOKAHEAD = 0.3;
const TICK_MS = 60;

let lane: Lane | null = null;
let wanted: Mood = 'silence';
let intensity = 0;
let hidden = false;
let timer: ReturnType<typeof setTimeout> | undefined;

const cutoffFor = (d: MoodDef): number => clamp(d.cutoff * (1 + d.open * intensity), 200, 16000);
const driveFor = (d: MoodDef): number => d.drive * (0.85 + intensity * 1.2);

function createLane(mood: Exclude<Mood, 'silence'>): Lane | null {
  const c = G.ctx;
  const out = G.music;
  const rev = G.reverb;
  if (!c || !out || !rev) return null;
  const d = DEFS[mood];
  const now = c.currentTime;
  const nodes: AudioNode[] = [];
  const keep = <T extends AudioNode>(n: T): T => {
    nodes.push(n);
    return n;
  };

  const bus = keep(c.createGain());
  bus.gain.setValueAtTime(0, now);
  bus.gain.setTargetAtTime(1, now + 0.01, 0.4);
  bus.connect(out);

  const duck = keep(c.createGain());
  duck.connect(bus);

  const lpf = keep(c.createBiquadFilter());
  lpf.type = 'lowpass';
  lpf.frequency.value = cutoffFor(d);
  lpf.Q.value = 0.7;
  lpf.connect(duck);

  // melodic input
  const fx = keep(c.createGain());
  if (d.crush && G.crushCurve) {
    const ws = keep(c.createWaveShaper());
    ws.curve = G.crushCurve;
    fx.connect(ws);
    ws.connect(lpf);
  } else {
    fx.connect(lpf);
  }

  // stereo stab destinations
  const mkPan = (v: number): AudioNode => {
    if (typeof c.createStereoPanner === 'function') {
      const p = keep(c.createStereoPanner());
      p.pan.value = v;
      p.connect(fx);
      return p;
    }
    return fx;
  };
  const pl = mkPan(-0.8);
  const pr = mkPan(0.8);

  // short echo (dotted 8th) and a touch of reverb, both from fx only
  const send = keep(c.createGain());
  send.gain.value = d.echo;
  const dl = keep(c.createDelay(2));
  dl.delayTime.value = Math.min(1.9, (60 / d.bpm) * 0.75);
  const fbLp = keep(c.createBiquadFilter());
  fbLp.type = 'lowpass';
  fbLp.frequency.value = 3500;
  const fb = keep(c.createGain());
  fb.gain.value = 0.3;
  fx.connect(send);
  send.connect(dl);
  dl.connect(fbLp);
  fbLp.connect(fb);
  fb.connect(dl);
  fbLp.connect(bus);
  const rs = keep(c.createGain());
  rs.gain.value = d.reverb;
  fx.connect(rs);
  rs.connect(rev);

  // bass: pre-gain -> saturator -> duck
  const drivePre = keep(c.createGain());
  drivePre.gain.value = driveFor(d);
  const bws = keep(c.createWaveShaper());
  if (G.driveCurve) bws.curve = G.driveCurve;
  drivePre.connect(bws);
  bws.connect(duck);
  const subIn = keep(c.createGain());
  subIn.connect(duck);

  // kick saturator (not ducked)
  const kws = keep(c.createWaveShaper());
  if (G.driveCurve) kws.curve = G.driveCurve;
  kws.connect(bus);

  // zaps: bitcrushed
  const zws = keep(c.createWaveShaper());
  if (G.crushCurve) zws.curve = G.crushCurve;
  zws.connect(lpf);

  const seed = hashStr(mood);
  return {
    mood, def: d, bus, lpf, fx, duck, drivePre, subIn, kickIn: kws, crushIn: zws, pl, pr, nodes,
    seed, rng: mulberry32(seed), step: 0, bar: 0, nextTime: now + 0.12, bpm: d.bpm,
    chord: d.sections[0]?.prog[0] ?? mi(0), lastBassF: 0, abs: 0, pend: [],
  };
}

function retire(L: Lane): void {
  const c = G.ctx;
  if (c) L.bus.gain.setTargetAtTime(0, c.currentTime, 0.4);
  setTimeout(() => {
    for (const n of L.nodes) {
      try {
        n.disconnect();
      } catch {
        /* already gone */
      }
    }
  }, 2600);
}

const stepDur = (L: Lane): number => 60 / (L.bpm * (1 + intensity * L.def.tempoUp)) / 4;

// ------------------------------------------------------------------ voices

/** Supersaw voicing: 3 saws on the root, 2 on each of the next two chord tones (7 total), spread wide. */
const SAW_DET: ReadonlyArray<readonly number[]> = [[-14, 0, 14], [-9, 9], [-9, 9]];

function stab(L: Lane, t: number, sd: number, long: boolean, sweep: number): void {
  const d = L.def;
  const ch = L.chord;
  const base = d.root + d.stabOct + ch.r;
  const cut = d.stabCut * (1 + intensity * d.open * 0.6) * sweep;
  const dur = sd * (long ? 1.7 : 0.8);
  const spread: AudioNode[][] = [[L.pl, L.fx, L.pr], [L.pl, L.pr], [L.pl, L.pr]];
  ch.t.slice(0, 3).forEach((semi, i) => {
    const f = mtof(base + semi);
    const dets = at(SAW_DET, i, [0]);
    const dests = at(spread, i, [L.fx]);
    dets.forEach((det, k) => {
      mtn(at(dests, k, L.fx), t, {
        type: 'sawtooth', f, det, dur, a: 0.003, r: 0.02,
        g: 0.045 * d.gain.stab, filt: lp(cut, cut * 0.5, 2), tag: 'stab',
      });
    });
  });
}

function pad(L: Lane, t: number, sd: number): void {
  const d = L.def;
  if (intensity < d.mins.pad) return;
  const barLen = sd * 16;
  const base = d.root + 24 + L.chord.r;
  const g = (0.1 * d.gain.pad) / Math.sqrt(L.chord.t.length);
  for (const semi of L.chord.t) {
    mtn(L.lpf, t, { type: 'sawtooth', f: mtof(base + semi), det: 6, dur: barLen + 0.3, a: barLen * 0.08, r: 0.4, g, tag: 'pad' });
  }
}

/** Queue a motif; notes are voiced step by step in flushMotif(). */
function motif(L: Lane, sd: number, m: Motif): void {
  const d = L.def;
  if (intensity < d.mins.lead) return;
  const r = L.rng;
  const wrong = d.quote ? 0.25 + intensity * 0.5 : 0;
  const semis = m.map((n) => n[1]);
  if (wrong > 0 && r() < wrong * 0.4) semis.reverse();
  m.forEach((n, i) => {
    if (wrong > 0 && r() < wrong * 0.3) return; // dropout
    let semi = at(semis, i, n[1]);
    let when = n[0];
    let len = n[2];
    let det = 0;
    if (wrong > 0) {
      if (r() < wrong) semi += pick(r, [1, -1, 6, -5, 12, -12], 1);
      when = Math.max(0, when + (r() - 0.5) * wrong * 1.5);
      len = Math.max(1, len * (0.5 + r()));
      det = (r() - 0.5) * wrong * 120;
    }
    const f = mtof(d.root + 24 + semi);
    const reps = wrong > 0 && r() < wrong * 0.3 ? 3 : 1;
    for (let k = 0; k < reps; k++) {
      L.pend.push({ when: L.abs + when + k * 0.5, f, det, dur: len * sd + 0.15, cut: 3200 * (1 + intensity), vib: !!d.vib });
    }
  });
  L.pend.sort((x, y) => x.when - y.when);
}

function flushMotif(L: Lane, t: number, sd: number): void {
  const d = L.def;
  while (L.pend.length > 0) {
    const n = L.pend[0];
    if (!n || n.when >= L.abs + 1) break;
    L.pend.shift();
    const start = t + Math.max(0, n.when - L.abs) * sd;
    const vib = n.vib ? { rate: 5.5, depth: 10 } : undefined;
    const o = { type: d.wave.lead, f: n.f, dur: n.dur, a: 0.01, r: 0.12, g: 0.075 * d.gain.lead, filt: lp(n.cut, n.cut * 0.6, 3), tag: 'lead' } as const;
    mtn(L.fx, start, { ...o, det: n.det + 8, vib });
    mtn(L.fx, start, { ...o, det: n.det - 8 });
  }
}

/** Sidechain pump: gain dips on every kick and recovers. */
function pump(L: Lane, t: number, sd: number): void {
  const p = L.duck.gain;
  p.setValueAtTime(L.def.duck, t);
  p.linearRampToValueAtTime(1, t + Math.min(0.17, sd * 3.5));
}

function kick(L: Lane, t: number, sd: number): void {
  const g = L.def.gain.perc;
  mtn(L.kickIn, t, { f: 165, f2: 44, glide: 0.3, dur: 0.34, g: 0.55 * g, a: 0.002, tag: 'kick' });
  mtn(L.bus, t, { type: 'triangle', f: 1400, f2: 250, dur: 0.02, g: 0.16 * g, tag: 'kick' });
  mno(L.bus, t, { dur: 0.012, g: 0.2 * g, filt: hp(3000), tag: 'kick' });
  pump(L, t, sd);
}

function snare(L: Lane, t: number, amp: number): void {
  const g = L.def.gain.perc * amp;
  mno(L.bus, t, { dur: 0.2, g: 0.42 * g, filt: bp(1900, undefined, 0.7), tag: 'snare' });
  mno(L.bus, t + 0.011, { dur: 0.14, g: 0.2 * g, filt: hp(5500), tag: 'snare' });
  mtn(L.bus, t, { type: 'triangle', f: 230, f2: 140, dur: 0.1, g: 0.3 * g, tag: 'snare' });
}

function hat(L: Lane, t: number, kind: 'closed' | 'accent' | 'ghost' | 'open'): void {
  const g = L.def.gain.perc;
  if (kind === 'open') mno(L.bus, t, { dur: 0.15, g: 0.11 * g, filt: hp(7500), tag: 'hat' });
  else {
    const a = kind === 'accent' ? 0.15 : kind === 'ghost' ? 0.05 : 0.09;
    mno(L.bus, t, { dur: 0.03, g: a * g, filt: hp(8500), tag: 'hat' });
  }
}

function zap(L: Lane, t: number): void {
  mtn(L.crushIn, t, { type: 'square', f: 3400, f2: 180, dur: 0.14, g: 0.07, tag: 'zap' });
  mno(L.crushIn, t, { dur: 0.08, g: 0.05, filt: hp(4000), tag: 'zap' });
}

function crash(L: Lane, t: number): void {
  mno(L.bus, t, { dur: 1.0, g: 0.13 * L.def.gain.perc, filt: hp(4500), tag: 'hat' });
}

function riser(L: Lane, t: number, barLen: number): void {
  mno(L.bus, t, { dur: Math.min(1.9, barLen), g: 0.15, a: barLen * 0.9, filt: bp(300, 7000, 3), tag: 'zap' });
  mtn(L.fx, t, { type: 'sawtooth', f: 150, f2: 1500, dur: barLen, g: 0.05, a: barLen * 0.85, filt: lp(2500), tag: 'zap' });
}

function glitchBurst(L: Lane, t: number): void {
  const r = L.rng;
  for (let i = 0; i < 4; i++) {
    mno(L.bus, t, { at: i * 0.03, dur: 0.02, g: 0.1 * L.def.gain.perc, rate: 0.5 + r() * 2, filt: hp(2500 + r() * 4000), tag: 'zap' });
    mtn(L.crushIn, t, { at: i * 0.03, type: 'square', f: 300 + r() * 2000, dur: 0.025, g: 0.05, tag: 'zap' });
  }
}

function nextChord(L: Lane, prog: readonly Chord[], q: number): Chord {
  const base = at(prog, q, L.chord);
  if (!L.def.unstable || L.rng() > 0.3) return base;
  return {
    r: clamp(base.r + pick(L.rng, [1, 6, -1, 5, 2], 1), -6, 14),
    t: pick(L.rng, [[0, 3, 7], [0, 1, 6], [0, 3, 6], [0, 6, 7]] as const, [0, 3, 7] as const),
  };
}

// --------------------------------------------------------------- scheduler

function scheduleStep(L: Lane, t: number): void {
  const d = L.def;
  const I = intensity;
  const s = L.step;
  const sd = stepDur(L);
  const barLen = sd * 16;
  const sb = L.bar % 8;
  const q = sb % 4;
  const fill = q === 3;
  const sec = d.sections[Math.floor(L.bar / 8) % d.sections.length] as Section;
  const sweep = fill ? 1 + (s / 16) * 2.5 : 1;
  const sw = s % 2 === 1 ? d.swing * sd : 0;
  const mut = d.unstable ? 0.08 + 0.14 * I : 0;

  if (s === 0) {
    L.chord = nextChord(L, sec.prog, q);
    pad(L, t, sd);
    const mo = sec.motif ?? d.motif;
    if (mo && sb % d.motifEvery === 0) motif(L, sd, mo);
    if (sb === 0 && L.bar > 0) crash(L, t);
    if (sb === 7 && d.riser && I >= d.mins.stab) riser(L, t, barLen);
    if (d.unstable) {
      L.bpm = clamp(L.bpm + (L.rng() - 0.5) * 10, d.bpm * 0.8, d.bpm * 1.25);
      if (L.rng() < 0.5) glitchBurst(L, t + L.rng() * sd * 12);
    }
  }

  flushMotif(L, t, sd);

  // --- drums
  const on = (ch: string, min: number): boolean => I >= min && (ch === 'X' || (ch === 'x' && I >= 0.35));
  let kOn = on(sec.kick.charAt(s), d.mins.kick);
  let snOn = on(sec.snare.charAt(s), d.mins.snare);
  if (mut > 0) {
    const r = L.rng();
    if (kOn && r < mut) kOn = false;
    else if (!kOn && sec.kick.charAt(s) === '.' && r > 1 - mut * 0.5 && I >= d.mins.kick) kOn = true;
  }
  if (fill && s >= 12) {
    kOn = kOn && s < 14;
    snOn = false;
    if (I >= d.mins.snare) snare(L, t, 0.55 + 0.15 * (s - 12));
  }
  if (kOn) kick(L, t, sd);
  if (snOn) snare(L, t, 1);

  const h = sec.hat.charAt(s);
  if (I >= d.mins.hat && h !== '.') {
    const isOpen = I >= d.mins.open && sec.open.charAt(s) === 'o';
    if (isOpen) hat(L, t + sw, 'open');
    else if (h === 'X') hat(L, t + sw, 'accent');
    else if (h === 'x') hat(L, t + sw, 'closed');
    else if (h === 'g' && I >= 0.55) hat(L, t + sw, 'ghost');
    if (d.hat32 && I >= 0.6 && !isOpen) hat(L, t + sw + sd / 2, 'ghost');
  }

  // --- bass: acid-style 16ths, filter envelope, accent, slide, octave jumps
  const bp0 = fill ? sec.fillP : at(sec.bassP, q % 2, sec.fillP);
  const bn = at(bp0, s, null);
  if (bn && I >= d.mins.bass) {
    const m = d.root + L.chord.r + bn.semi;
    const f = mtof(m);
    const cents = d.wrong ? (L.rng() - 0.5) * 2 * d.wrong : 0;
    const cut = d.bassCut * (1 + I * d.open * 0.7) * sweep * (bn.acc ? 1.7 : 1);
    const slideFrom = bn.slide && L.lastBassF > 0 ? L.lastBassF : 0;
    const len = sd * d.bassLen * (bn.acc ? 1.2 : 1);
    const g = 0.3 * d.gain.bass * (bn.acc ? 1.25 : 1);
    mtn(L.drivePre, t + sw, {
      type: d.wave.bass, f: slideFrom || f, f2: slideFrom ? f : undefined, glide: 0.3, det: cents,
      dur: len, g, filt: lp(cut, cut * 0.22, d.reso + (bn.acc ? 4 : 0)), tag: 'bass',
    });
    if (s % 4 === 0 || bn.acc) {
      mtn(L.subIn, t + sw, { f: mtof(m >= 45 ? m - 12 : m), dur: len * 1.1, g: 0.26 * d.gain.bass, tag: 'sub' });
    }
    if (I > 0.55) mtn(L.drivePre, t + sw, { type: 'square', f: f * 2, dur: len, g: 0.1 * d.gain.bass, filt: lp(cut, cut * 0.3, 3), tag: 'bass' });
    if (I > 0.8) mtn(L.drivePre, t + sw, { type: 'sawtooth', f: f * 1.4983, dur: len, g: 0.08 * d.gain.bass, filt: lp(cut, cut * 0.3, 3), tag: 'bass' });
    L.lastBassF = f;
  } else if (!bn) {
    L.lastBassF = 0;
  }

  // --- stabs: hard-gated supersaw chords
  const sc = sec.stab.charAt(s);
  if (I >= d.mins.stab && (sc === 'x' || sc === 'X')) stab(L, t + sw, sd, sc === 'X', sweep);

  // --- arp: bright plucks, fast filter envelope
  if (I >= d.mins.arp) {
    const dig = sec.arp.charAt(s);
    let idx = dig >= '0' && dig <= '9' ? dig.charCodeAt(0) - 48 : -1;
    if (idx < 0 && I >= 0.75 && s % 2 === 1 && L.rng() < 0.5) idx = Math.floor(L.rng() * 7);
    if (idx >= 0) {
      const ch = L.chord;
      const n = ch.t.length;
      let m = d.root + d.arpOct + ch.r + at(ch.t, idx % n, 0) + 12 * Math.floor(idx / n);
      if (I > 0.4 && L.rng() < (I - 0.4) * 0.5) m += pick(L.rng, [1, 6, -1], 1);
      const cut = d.arpCut * (1 + I * d.open * 0.6) * sweep;
      const cents = d.wrong ? (L.rng() - 0.5) * 2 * d.wrong : 0;
      mtn(L.fx, t + sw, {
        type: d.wave.arp, f: mtof(m), det: cents, dur: sd * 1.4, g: 0.09 * d.gain.arp * (s % 4 === 0 ? 1.15 : 0.85),
        filt: lp(cut, cut * 0.25, 5), tag: 'arp',
      });
    }
  }

  // --- fills: zap at the end of every 4th bar
  if (fill && s === 14 && d.zaps && I >= d.mins.kick) zap(L, t);

  L.abs++;
  L.step = (s + 1) % 16;
  if (L.step === 0) L.bar++;
  L.nextTime = t + sd;
}

function tick(): void {
  timer = undefined;
  const c = G.ctx;
  const L = lane;
  if (!c || !L || hidden) return;
  try {
    if (L.nextTime < c.currentTime - 0.05) L.nextTime = c.currentTime + 0.02; // resumed after a stall
    let guard = 0;
    while (L.nextTime < c.currentTime + LOOKAHEAD && guard++ < 8) scheduleStep(L, L.nextTime);
  } catch {
    /* never let the scheduler die loudly */
  }
  timer = setTimeout(tick, TICK_MS);
}

function startTimer(): void {
  if (timer === undefined && lane && G.ctx && !hidden) timer = setTimeout(tick, 0);
}

function stopTimer(): void {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
}

// -------------------------------------------------------------- public API

export const music = {
  /** Called once the AudioContext exists: starts whatever mood was requested earlier. */
  onReady(): void {
    music.setMood(wanted, true);
  },

  setMood(mood: Mood, force = false): void {
    if (!force && mood === wanted && (mood === 'silence' ? lane === null : lane?.mood === mood)) return;
    wanted = mood;
    if (!G.ctx) return;
    if (lane) {
      retire(lane);
      lane = null;
    }
    if (mood !== 'silence') lane = createLane(mood);
    if (lane) startTimer();
    else stopTimer();
  },

  setIntensity(x: number): void {
    intensity = clamp(x, 0, 1);
    const c = G.ctx;
    if (c && lane) {
      lane.lpf.frequency.setTargetAtTime(cutoffFor(lane.def), c.currentTime, 0.4);
      lane.drivePre.gain.setTargetAtTime(driveFor(lane.def), c.currentTime, 0.4);
    }
  },

  /** Pause scheduling while the tab is hidden; resume cleanly when shown. */
  setHidden(h: boolean): void {
    hidden = h;
    if (h) {
      stopTimer();
    } else {
      if (lane && G.ctx) lane.nextTime = G.ctx.currentTime + 0.05;
      startTimer();
    }
  },
};
