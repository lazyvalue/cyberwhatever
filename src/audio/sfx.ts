/**
 * sfx.ts - every sound effect, synthesised. Each entry schedules a handful of
 * tone/noise voices relative to the moment of the call.
 *
 * Rules kept throughout: frequencies > 0, all gains > 0, durations > 0,
 * offsets >= 0 (so nothing is scheduled in the past).
 */
import { bp, hp, lp } from './engine.ts';
import type { NoiseOpts, ToneOpts } from './engine.ts';

export const SFX_IDS = [
  'ui_click', 'ui_hover', 'ui_error', 'ui_open', 'ui_close', 'typewriter', 'message',
  'jack_in', 'jack_out', 'node_move', 'probe', 'sneak_ok', 'sneak_fail',
  'combat_start', 'turn_start',
  'program_crack', 'program_spike', 'program_worm', 'program_exploit', 'program_defense',
  'program_stealth', 'program_daemon', 'botnet',
  'ice_attack', 'ice_black', 'hit_shield', 'hit_deck', 'hit_neural', 'shell_break', 'ice_die',
  'status_apply', 'flow', 'trace_tick', 'alarm', 'dumped', 'traced', 'flatline',
  'loot', 'capture', 'system_owned', 'credits', 'buy', 'level_up',
  'glitch', 'boss_phase', 'fake_crash', 'root', 'victory',
] as const;

export type SfxId = (typeof SFX_IDS)[number];

/** Per-call voice factory handed to each effect. */
export interface S {
  tone(o: ToneOpts): void;
  noise(o: NoiseOpts): void;
  /** Random number in [0, 1). */
  rnd(): number;
}

type Fx = (s: S) => void;

// note frequencies used repeatedly
const A2 = 110, C3 = 130.81, E3 = 164.81, A3 = 220, Cs4 = 277.18, E4 = 329.63;
const A4 = 440, Cs5 = 554.37, E5 = 659.25, A5 = 880, C5 = 523.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5;

export const SFX: Record<SfxId, Fx> = {
  // ------------------------------------------------------------------ UI
  ui_click: (s) => {
    s.tone({ type: 'square', f: 1900, f2: 1100, dur: 0.045, g: 0.16 });
    s.noise({ dur: 0.02, g: 0.1, filt: hp(5000) });
  },
  ui_hover: (s) => {
    s.tone({ f: 2600, dur: 0.03, g: 0.07, a: 0.004 });
  },
  ui_error: (s) => {
    for (let i = 0; i < 2; i++) {
      s.tone({ at: i * 0.11, type: 'sawtooth', f: 150, f2: 120, dur: 0.09, g: 0.25, filt: lp(900) });
    }
    s.tone({ type: 'square', f: 75, dur: 0.2, g: 0.12 });
  },
  ui_open: (s) => {
    s.tone({ type: 'triangle', f: 380, f2: 1300, dur: 0.13, g: 0.2 });
    s.noise({ dur: 0.13, g: 0.08, filt: bp(1000, 5000, 1.2) });
  },
  ui_close: (s) => {
    s.tone({ type: 'triangle', f: 1300, f2: 380, dur: 0.12, g: 0.18 });
    s.noise({ dur: 0.12, g: 0.07, filt: bp(5000, 1000, 1.2) });
  },
  typewriter: (s) => {
    s.noise({ dur: 0.018, g: 0.22, rate: 0.8 + s.rnd() * 0.6, filt: bp(2800 + s.rnd() * 1800, undefined, 2) });
    s.tone({ f: 170 + s.rnd() * 40, dur: 0.03, g: 0.07 });
  },
  message: (s) => {
    s.tone({ f: 988, dur: 0.35, g: 0.2 });
    s.tone({ at: 0.12, f: 1319, dur: 0.5, g: 0.18 });
    s.tone({ at: 0.12, type: 'triangle', f: 2638, dur: 0.25, g: 0.04 });
  },

  // ------------------------------------------------------- jack / navigate
  jack_in: (s) => {
    s.noise({ dur: 0.7, g: 0.25, a: 0.35, filt: bp(200, 5000, 3) });
    s.tone({ type: 'sawtooth', f: 60, f2: 440, dur: 0.7, g: 0.15, a: 0.3, filt: lp(1500) });
    for (let i = 0; i < 6; i++) s.tone({ at: 0.1 + i * 0.07, type: 'square', f: 800 + i * 300, dur: 0.04, g: 0.1 });
    s.tone({ at: 0.72, f: 55, f2: 30, dur: 0.35, g: 0.5 });
    s.noise({ at: 0.72, dur: 0.15, g: 0.4, filt: lp(200) });
  },
  jack_out: (s) => {
    s.noise({ dur: 0.5, g: 0.22, filt: bp(5000, 200, 3) });
    s.tone({ type: 'sawtooth', f: 440, f2: 50, dur: 0.5, g: 0.14, filt: lp(1800, 300) });
    for (let i = 0; i < 4; i++) s.tone({ at: i * 0.06, type: 'square', f: 1800 - i * 350, dur: 0.04, g: 0.09 });
    s.noise({ at: 0.5, dur: 0.03, g: 0.3, filt: hp(3000) });
  },
  node_move: (s) => {
    s.tone({ type: 'triangle', f: 520, f2: 780, dur: 0.06, g: 0.16 });
    s.tone({ at: 0.06, type: 'triangle', f: 780, f2: 1040, dur: 0.07, g: 0.14 });
    s.noise({ dur: 0.12, g: 0.05, filt: bp(900, 2600, 1) });
  },
  probe: (s) => {
    s.tone({ f: 900, f2: 1500, dur: 0.04, g: 0.15 });
    s.tone({ at: 0.03, f: 1500, dur: 0.5, g: 0.22 });
    s.tone({ at: 0.03, f: 3000, dur: 0.3, g: 0.05 });
    s.tone({ at: 0.23, f: 1500, dur: 0.4, g: 0.1 });
    s.tone({ at: 0.43, f: 1500, dur: 0.4, g: 0.05 });
  },
  sneak_ok: (s) => {
    s.tone({ type: 'triangle', f: 330, dur: 0.25, g: 0.15, filt: lp(900) });
    s.tone({ at: 0.14, type: 'triangle', f: 440, dur: 0.3, g: 0.13, filt: lp(900) });
    s.noise({ dur: 0.3, g: 0.04, filt: lp(1200) });
  },
  sneak_fail: (s) => {
    s.tone({ type: 'sawtooth', f: 330, f2: 180, dur: 0.35, g: 0.25, filt: lp(2000) });
    s.noise({ dur: 0.25, g: 0.25, filt: bp(1200, undefined, 1.5) });
    s.tone({ type: 'square', f: 90, dur: 0.3, g: 0.15 });
  },

  // --------------------------------------------------------------- combat
  combat_start: (s) => {
    s.noise({ dur: 0.35, g: 0.12, a: 0.3, filt: bp(300, 3000, 2) });
    s.tone({ f: 55, f2: 40, dur: 1.0, g: 0.4, a: 0.3 });
    for (const f of [A2, C3, E3]) {
      s.tone({ at: 0.35, type: 'sawtooth', f, dur: 0.9, g: 0.1, filt: lp(1200, 300) });
    }
    s.noise({ at: 0.35, dur: 0.3, g: 0.35, filt: lp(1500) });
  },
  turn_start: (s) => {
    s.tone({ type: 'square', f: 880, dur: 0.07, g: 0.14 });
    s.tone({ at: 0.08, type: 'square', f: 1320, dur: 0.1, g: 0.14 });
  },

  // ------------------------------------------------------------- programs
  program_crack: (s) => {
    s.noise({ dur: 0.08, g: 0.4, filt: hp(2000) });
    s.tone({ type: 'square', f: 600, f2: 90, dur: 0.18, g: 0.2, filt: lp(3000) });
    for (let i = 0; i < 5; i++) s.tone({ at: 0.03 * i, type: 'square', f: 200 + i * 260, dur: 0.02, g: 0.08 });
  },
  program_spike: (s) => {
    s.tone({ type: 'sawtooth', f: 180, f2: 2400, dur: 0.12, g: 0.22, filt: hp(300) });
    s.noise({ dur: 0.1, g: 0.2, filt: hp(4000) });
    s.tone({ at: 0.1, f: 150, f2: 60, dur: 0.18, g: 0.3 });
  },
  program_worm: (s) => {
    s.tone({ type: 'triangle', f: 300, f2: 110, dur: 0.6, g: 0.25, vib: { rate: 9, depth: 60 } });
    s.tone({ f: 450, f2: 150, dur: 0.6, g: 0.1, vib: { rate: 6, depth: 100 } });
    s.noise({ dur: 0.5, g: 0.06, filt: bp(400, undefined, 4) });
    s.tone({ at: 0.35, type: 'triangle', f: 700, f2: 400, dur: 0.1, g: 0.08 });
  },
  program_exploit: (s) => {
    [A4, Cs5, E5, A5, 1109].forEach((f, i) => s.tone({ at: i * 0.05, type: 'square', f, dur: 0.05, g: 0.12 }));
    s.tone({ at: 0.26, type: 'sawtooth', f: 220, f2: 1760, dur: 0.1, g: 0.15 });
    s.tone({ at: 0.36, type: 'square', f: 1760, dur: 0.08, g: 0.1 });
    s.noise({ at: 0.36, dur: 0.03, g: 0.2, filt: hp(4000) });
  },
  program_defense: (s) => {
    for (const f of [330, 495, 660]) s.tone({ f, dur: 0.5, g: 0.18, a: 0.15, r: 0.2 });
    s.tone({ type: 'triangle', f: 990, dur: 0.5, g: 0.08, a: 0.15, r: 0.2 });
    s.noise({ dur: 0.4, g: 0.05, a: 0.2, filt: bp(800, 3000, 1.5) });
    s.tone({ at: 0.4, f: 1320, dur: 0.3, g: 0.1 });
  },
  program_stealth: (s) => {
    s.noise({ dur: 0.6, g: 0.22, a: 0.1, filt: lp(3000, 200) });
    s.tone({ f: 220, f2: 110, dur: 0.6, g: 0.1 });
    s.noise({ dur: 0.4, g: 0.05, filt: hp(6000) });
  },
  program_daemon: (s) => {
    for (let i = 0; i < 3; i++) s.tone({ at: i * 0.14, f: 110, f2: 90, dur: 0.12, g: 0.35 });
    s.tone({ at: 0.45, type: 'triangle', f: 660, f2: 880, dur: 0.08, g: 0.12 });
    s.tone({ at: 0.55, type: 'triangle', f: 990, dur: 0.08, g: 0.12 });
    s.tone({ at: 0.45, f: 440, dur: 0.4, g: 0.08, a: 0.05, r: 0.3 });
  },
  botnet: (s) => {
    for (let i = 0; i < 12; i++) {
      s.tone({ at: i * 0.035, type: i % 2 ? 'sine' : 'triangle', f: 500 + s.rnd() * 1500, dur: 0.05, g: 0.1 });
    }
    s.tone({ f: 80, f2: 200, dur: 0.5, g: 0.15 });
    s.tone({ at: 0.45, type: 'square', f: 330, dur: 0.25, g: 0.1 });
    s.tone({ at: 0.45, type: 'square', f: 495, dur: 0.25, g: 0.1 });
    s.noise({ dur: 0.5, g: 0.2, brown: true, filt: lp(300) });
  },

  // ------------------------------------------------------------------ ICE
  ice_attack: (s) => {
    s.tone({ f: 140, f2: 45, dur: 0.3, g: 0.6 });
    s.tone({ type: 'sawtooth', f: 220, f2: 60, dur: 0.25, g: 0.2, filt: lp(800) });
    s.noise({ dur: 0.15, g: 0.3, filt: lp(1500) });
    s.tone({ type: 'square', f: 700, dur: 0.05, g: 0.08 });
  },
  ice_black: (s) => {
    s.tone({ type: 'sawtooth', f: 110, dur: 1.0, g: 0.15, a: 0.3, filt: lp(700, 200) });
    s.tone({ type: 'sawtooth', f: 155.6, det: 14, dur: 1.0, g: 0.15, a: 0.3, filt: lp(700, 200) });
    s.tone({ f: 40, dur: 1.1, g: 0.4 });
    s.noise({ dur: 0.9, g: 0.15, a: 0.6, filt: bp(2000, 300, 2) });
    s.tone({ f: 2400, f2: 2300, dur: 0.8, g: 0.05, vib: { rate: 30, depth: 200 } });
    s.tone({ at: 0.8, f: 120, f2: 30, dur: 0.4, g: 0.55 });
    s.noise({ at: 0.8, dur: 0.25, g: 0.4, filt: lp(1200) });
  },
  hit_shield: (s) => {
    s.tone({ f: 1800, dur: 0.3, g: 0.22 });
    s.tone({ f: 2790, dur: 0.22, g: 0.1 });
    s.tone({ f: 4100, dur: 0.12, g: 0.06 });
    s.noise({ dur: 0.03, g: 0.15, filt: hp(6000) });
  },
  hit_deck: (s) => {
    s.noise({ dur: 0.22, g: 0.5, filt: lp(1200, 300) });
    s.tone({ f: 120, f2: 50, dur: 0.2, g: 0.5 });
    s.tone({ type: 'square', f: 90, dur: 0.12, g: 0.15, filt: lp(400) });
    s.noise({ dur: 0.02, g: 0.25, filt: hp(3000) });
  },
  hit_neural: (s) => {
    s.tone({ f: 3100, dur: 0.6, g: 0.12, vib: { rate: 7, depth: 20 } });
    s.tone({ type: 'sawtooth', f: 400, f2: 100, dur: 0.3, g: 0.25, filt: lp(1500) });
    s.tone({ f: 55, dur: 0.35, g: 0.5 });
    s.noise({ dur: 0.1, g: 0.3, filt: bp(2500, undefined, 6) });
  },
  shell_break: (s) => {
    s.noise({ dur: 0.05, g: 0.4, filt: bp(1000) });
    s.tone({ f: 100, f2: 60, dur: 0.15, g: 0.3 });
    for (let i = 0; i < 8; i++) {
      s.noise({ at: i * 0.012, dur: 0.03, g: 0.25, filt: hp(4000 + s.rnd() * 3000) });
      const f = 2000 + s.rnd() * 2500;
      s.tone({ at: 0.02 + i * 0.02, f, f2: f * 0.7, dur: 0.1, g: 0.08 });
    }
  },
  ice_die: (s) => {
    s.tone({ type: 'square', f: 900, f2: 40, dur: 0.6, g: 0.22, filt: lp(3000, 200) });
    s.noise({ dur: 0.6, g: 0.3, filt: lp(4000, 200) });
    s.tone({ f: 200, f2: 30, dur: 0.5, g: 0.4 });
    for (let i = 0; i < 6; i++) s.tone({ at: 0.08 * i, type: 'square', f: 1200 - i * 180, dur: 0.04, g: 0.1 });
  },
  status_apply: (s) => {
    s.tone({ type: 'triangle', f: 700, dur: 0.07, g: 0.15 });
    s.tone({ at: 0.06, type: 'triangle', f: 520, dur: 0.12, g: 0.15 });
    s.tone({ f: 1400, dur: 0.03, g: 0.06 });
  },
  flow: (s) => {
    [C5, E5, G5, C6, E6].forEach((f, i) => s.tone({ at: i * 0.06, f, dur: 0.35, g: 0.15 }));
    s.tone({ at: 0.24, type: 'triangle', f: 2093, dur: 0.3, g: 0.05 });
    s.noise({ dur: 0.3, g: 0.03, a: 0.1, filt: hp(8000) });
  },
  trace_tick: (s) => {
    s.tone({ f: 220, f2: 160, dur: 0.06, g: 0.3 });
    s.noise({ dur: 0.015, g: 0.15, filt: bp(1800, undefined, 1.5) });
  },

  // ----------------------------------------------------------- failure
  alarm: (s) => {
    for (let i = 0; i < 4; i++) {
      s.tone({ at: i * 0.18, type: 'square', f: i % 2 ? 660 : 880, dur: 0.16, g: 0.18, r: 0.04, filt: lp(2500) });
    }
    s.tone({ type: 'sawtooth', f: 110, dur: 0.7, g: 0.1, filt: lp(500) });
  },
  dumped: (s) => {
    for (let i = 0; i < 3; i++) s.tone({ at: i * 0.05, type: 'square', f: 800, dur: 0.03, g: 0.1 });
    s.tone({ type: 'sawtooth', f: 440, f2: 35, dur: 1.1, g: 0.25, filt: lp(3000, 100) });
    s.noise({ dur: 0.9, g: 0.2, filt: hp(2000) });
    s.tone({ at: 1.0, f: 90, f2: 30, dur: 0.3, g: 0.5 });
    s.noise({ at: 1.0, dur: 0.2, g: 0.3, filt: lp(500) });
  },
  traced: (s) => {
    for (let i = 0; i < 3; i++) s.tone({ at: 0.15 * i, type: 'square', f: 880, dur: 0.1, g: 0.16, filt: lp(2500) });
    s.tone({ at: 0.5, type: 'sawtooth', f: 200, f2: 30, dur: 0.9, g: 0.3, filt: lp(1200) });
    s.tone({ at: 0.5, f: 220, dur: 1.2, g: 0.18 });
    s.tone({ at: 0.5, f: 311, dur: 1.2, g: 0.15 });
    s.tone({ at: 0.5, f: 70, f2: 30, dur: 0.4, g: 0.5 });
    for (let i = 0; i < 10; i++) s.noise({ at: 0.5 + i * 0.06, dur: 0.015, g: 0.15, filt: hp(6000) });
  },
  flatline: (s) => {
    s.tone({ f: 1000, dur: 0.12, g: 0.22 });
    s.tone({ at: 0.6, f: 1000, dur: 0.12, g: 0.22 });
    s.tone({ at: 1.2, f: 1000, dur: 2.2, g: 0.2, r: 0.5 });
    s.tone({ at: 1.2, f: 50, dur: 1.5, g: 0.15, a: 0.3 });
  },

  // ----------------------------------------------------------- rewards
  loot: (s) => {
    s.tone({ type: 'square', f: 988, dur: 0.06, g: 0.15 });
    s.tone({ at: 0.06, type: 'square', f: 1319, dur: 0.35, g: 0.15 });
    s.tone({ at: 0.1, f: 2637, dur: 0.2, g: 0.06 });
    s.tone({ at: 0.16, f: 3136, dur: 0.2, g: 0.06 });
    s.noise({ at: 0.06, dur: 0.15, g: 0.04, filt: hp(9000) });
  },
  capture: (s) => {
    s.tone({ type: 'sawtooth', f: 100, f2: 800, dur: 0.2, g: 0.12, filt: lp(2500) });
    for (const f of [A3, Cs4, E4]) s.tone({ at: 0.2, type: 'sawtooth', f, dur: 0.5, g: 0.1, filt: lp(3000, 500) });
    s.tone({ at: 0.2, f: 55, dur: 0.4, g: 0.4 });
    s.tone({ at: 0.25, f: 1760, dur: 0.4, g: 0.1 });
    s.noise({ at: 0.2, dur: 0.12, g: 0.3, filt: lp(2000) });
  },
  system_owned: (s) => {
    [A3, Cs4, E4, A4, Cs5, E5, A5].forEach((f, i) => s.tone({ at: i * 0.07, type: 'square', f, dur: 0.3, g: 0.1 }));
    for (const f of [A2, A3, Cs4, E4]) s.tone({ at: 0.55, type: 'sawtooth', f, dur: 1.4, g: 0.09, a: 0.02, filt: lp(2500, 400) });
    s.tone({ at: 0.55, f: 55, dur: 1.4, g: 0.4 });
    s.noise({ dur: 0.6, g: 0.1, a: 0.5, filt: hp(3000) });
    s.noise({ at: 0.55, dur: 0.5, g: 0.4, filt: lp(400) });
    for (const f of [1760, 2217, 2637]) s.tone({ at: 0.6, f, dur: 1.0, g: 0.05, a: 0.05, r: 0.8 });
  },
  credits: (s) => {
    for (const f of [A3, Cs4, E4]) s.tone({ type: 'triangle', f, dur: 2.2, g: 0.1, a: 0.4, r: 0.8 });
    s.tone({ f: A4, dur: 2.2, g: 0.08, a: 0.4, r: 0.8 });
    s.tone({ at: 0.5, f: A5, dur: 1.2, g: 0.1 });
    s.tone({ at: 0.9, f: 1109, dur: 1.2, g: 0.1 });
    s.tone({ at: 1.3, f: E6, dur: 1.2, g: 0.1 });
  },
  buy: (s) => {
    s.tone({ type: 'square', f: 3000, dur: 0.015, g: 0.1 });
    s.tone({ at: 0.05, type: 'square', f: 3000, dur: 0.015, g: 0.1 });
    s.noise({ at: 0.05, dur: 0.05, g: 0.1, filt: bp(5000) });
    s.tone({ at: 0.09, f: 1568, dur: 0.6, g: 0.2 });
    s.tone({ at: 0.09, f: 2350, dur: 0.4, g: 0.08 });
  },
  level_up: (s) => {
    [C5, E5, G5, C6, E6, 1568].forEach((f, i) => s.tone({ at: i * 0.075, type: 'square', f, dur: 0.12, g: 0.14 }));
    for (const f of [C5, E5, G5]) s.tone({ at: 0.5, type: 'square', f, dur: 0.6, g: 0.1 });
    s.tone({ at: 0.5, type: 'triangle', f: C6, dur: 0.6, g: 0.1 });
    s.noise({ at: 0.5, dur: 0.3, g: 0.04, filt: hp(8000) });
  },

  // ---------------------------------------------------- fourth wall / story
  glitch: (s) => {
    for (let i = 0; i < 7; i++) {
      s.tone({ at: i * 0.035, type: 'square', f: 200 + s.rnd() * 2500, dur: 0.03, g: 0.12 });
      if (i % 2 === 0) s.noise({ at: i * 0.035, dur: 0.03, g: 0.2, rate: 0.5 + s.rnd() * 2, filt: hp(1500 + s.rnd() * 4000) });
    }
    s.tone({ type: 'sawtooth', f: 2000, f2: 100, dur: 0.2, g: 0.08 });
  },
  boss_phase: (s) => {
    s.noise({ dur: 0.9, g: 0.25, a: 0.8, filt: bp(200, 4000, 2) });
    s.tone({ type: 'sawtooth', f: 40, f2: 160, dur: 0.9, g: 0.2, a: 0.7, filt: lp(600, 2500) });
    s.tone({ at: 0.9, f: 80, f2: 25, dur: 0.8, g: 0.7 });
    for (const f of [130.81, 155.56, 185.0]) {
      s.tone({ at: 0.9, type: 'sawtooth', f, dur: 0.8, g: 0.12, filt: lp(2500, 300) });
    }
    s.noise({ at: 0.9, dur: 0.5, g: 0.5, filt: lp(800) });
    s.noise({ at: 0.9, dur: 1.0, g: 0.15, filt: hp(5000) });
  },
  fake_crash: (s) => {
    for (let i = 0; i < 6; i++) {
      s.tone({ at: i * 0.07, type: 'sawtooth', f: 440, dur: 0.06, g: 0.2 });
      s.tone({ at: i * 0.07, type: 'sawtooth', f: 466, dur: 0.06, g: 0.2 });
    }
    s.noise({ dur: 0.42, g: 0.12, filt: hp(2500) });
    s.tone({ at: 0.1, type: 'square', f: 3000, dur: 0.3, g: 0.05 });
    s.noise({ at: 0.44, dur: 0.02, g: 0.3, filt: hp(1000) });
  },
  root: (s) => {
    s.tone({ f: 55, f2: 110, dur: 0.4, g: 0.5 });
    [110, 165, 220, 330, 440, 660, 880].forEach((f, i) => {
      s.tone({ at: i * 0.05, type: 'sawtooth', f, dur: 0.5, g: 0.09, filt: lp(800 + i * 500) });
    });
    for (const f of [A2, A3, Cs4, E4]) s.tone({ at: 0.4, type: 'sawtooth', f, dur: 1.3, g: 0.1, filt: lp(3000, 500) });
    s.tone({ at: 0.45, f: 1760, dur: 0.8, g: 0.15 });
    s.tone({ at: 0.45, f: 2637, dur: 0.6, g: 0.07 });
    s.noise({ at: 0.4, dur: 0.6, g: 0.4, filt: lp(300) });
    s.noise({ dur: 0.4, g: 0.1, a: 0.35, filt: bp(300, 5000, 2) });
  },
  victory: (s) => {
    s.tone({ f: 110, f2: 80, dur: 0.3, g: 0.5 });
    s.tone({ at: 0.25, f: 110, f2: 80, dur: 0.3, g: 0.5 });
    [[0, C5], [0.14, C5], [0.28, C5], [0.42, E5]].forEach(([at, f]) => {
      s.tone({ at: at ?? 0, type: 'square', f: f ?? C5, dur: 0.14, g: 0.14 });
    });
    s.tone({ at: 0.56, type: 'square', f: G5, dur: 0.2, g: 0.14 });
    for (const f of [C5, E5, G5]) s.tone({ at: 0.75, type: 'square', f, dur: 1.2, g: 0.09 });
    s.tone({ at: 0.75, type: 'sawtooth', f: 261.63, dur: 1.2, g: 0.1, filt: lp(2500, 500) });
    s.tone({ at: 0.75, f: 65, dur: 1.2, g: 0.35 });
    s.tone({ at: 0.85, f: C6, dur: 1.0, g: 0.06 });
    s.noise({ at: 0.75, dur: 0.4, g: 0.2, filt: hp(5000) });
  },
};
