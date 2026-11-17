/**
 * Public audio API. Self-contained WebAudio synthesis: no assets, no deps.
 * Every call is a safe no-op before unlock() and without WebAudio, and none
 * of them throws.
 */
import {
  G, applyVolumes, clamp, ensureContext, kickStutter, loadSettings, noise, saveSettings, setCorruptionLevel, settings, tone,
} from './engine.ts';
import { SFX } from './sfx.ts';
import type { S, SfxId } from './sfx.ts';
import { music } from './music.ts';
import type { Mood } from './music.ts';

export type { SfxId, Mood };
export { SFX_IDS } from './sfx.ts';
export { TITLE_MOTIF } from './music.ts';

export interface PlayOpts {
  /** Gain multiplier, 0..1.5 (default 1). */
  volume?: number;
  /** Frequency multiplier, 0.25..4 (default 1). */
  pitch?: number;
  /** Stereo position, -1 (left) .. 1 (right). */
  pan?: number;
}

loadSettings();

const MIN_GAP = 0.015; // seconds between identical ids (guards against spam)
const lastPlayed = new Map<string, number>();
let visibilityHooked = false;

function hookVisibility(): void {
  if (visibilityHooked || typeof document === 'undefined') return;
  visibilityHooked = true;
  document.addEventListener('visibilitychange', () => {
    try {
      music.setHidden(document.hidden);
      if (!document.hidden) kickStutter();
    } catch {
      /* ignore */
    }
  });
  music.setHidden(document.hidden);
}

function guard(fn: () => void): void {
  try {
    fn();
  } catch {
    /* audio must never break the game */
  }
}

export const audio = {
  /** Call from the first user gesture. Creates or resumes the AudioContext. */
  unlock(): void {
    guard(() => {
      const first = G.ctx === null;
      if (!ensureContext()) return;
      hookVisibility();
      if (first) music.onReady();
    });
  },

  play(id: SfxId, opts?: PlayOpts): void {
    guard(() => {
      const c = G.ctx;
      const bus = G.sfx;
      if (!c || !bus || settings.muted) return;
      const fx = SFX[id];
      if (!fx) return;
      if (c.state === 'suspended') c.resume().catch(() => undefined);
      const now = c.currentTime;
      const last = lastPlayed.get(id);
      if (last !== undefined && now - last < MIN_GAP) return;
      lastPlayed.set(id, now);

      const vol = clamp(opts?.volume ?? 1, 0, 1.5);
      const pitch = clamp(opts?.pitch ?? 1, 0.25, 4);
      const pan = clamp(opts?.pan ?? 0, -1, 1);
      if (vol <= 0) return;

      const out = c.createGain();
      out.gain.value = vol;
      const nodes: AudioNode[] = [out];
      if (pan !== 0 && typeof c.createStereoPanner === 'function') {
        const p = c.createStereoPanner();
        p.pan.value = pan;
        out.connect(p);
        p.connect(bus);
        nodes.push(p);
      } else {
        out.connect(bus);
      }

      const t0 = now + 0.005;
      let end = 0.05;
      const s: S = {
        tone: (o) => {
          end = Math.max(end, (o.at ?? 0) + o.dur + 0.05);
          tone(out, t0, { ...o, f: o.f * pitch, f2: o.f2 === undefined ? undefined : o.f2 * pitch });
        },
        noise: (o) => {
          end = Math.max(end, (o.at ?? 0) + o.dur + 0.05);
          noise(out, t0, o);
        },
        rnd: Math.random,
      };
      fx(s);

      setTimeout(() => {
        for (const n of nodes) {
          try {
            n.disconnect();
          } catch {
            /* already gone */
          }
        }
      }, (end + 0.4) * 1000);
    });
  },

  /** Crossfade the generative bed to a mood (~1.5 s). */
  setMood(mood: Mood): void {
    guard(() => music.setMood(mood));
  },

  /** 0..1, driven by the trace meter. */
  setIntensity(x: number): void {
    guard(() => music.setIntensity(x));
  },

  setMasterVolume(x: number): void {
    guard(() => {
      settings.master = clamp(x, 0, 1);
      saveSettings();
      applyVolumes();
    });
  },
  setSfxVolume(x: number): void {
    guard(() => {
      settings.sfx = clamp(x, 0, 1);
      saveSettings();
      applyVolumes();
    });
  },
  setMusicVolume(x: number): void {
    guard(() => {
      settings.music = clamp(x, 0, 1);
      saveSettings();
      applyVolumes();
    });
  },
  setMuted(m: boolean): void {
    guard(() => {
      settings.muted = !!m;
      saveSettings();
      applyVolumes();
    });
  },
  isMuted(): boolean {
    return settings.muted;
  },

  /** 0..1 finale effect: bitcrush, pitch wobble and stutter on the whole mix. */
  setCorruption(x: number): void {
    guard(() => setCorruptionLevel(x));
  },

  /** Current persisted volume settings (for the options screen). */
  getSettings(): { master: number; sfx: number; music: number; muted: boolean } {
    return { master: settings.master, sfx: settings.sfx, music: settings.music, muted: settings.muted };
  },
};
