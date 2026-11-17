# audio

Self-contained WebAudio synthesis. No assets, no dependencies, no imports from outside `src/audio/`.
Import only from `src/audio/index.ts`.

## API

```ts
import { audio } from './audio';

audio.unlock();                       // first user gesture; before this everything is a no-op
audio.play('hit_deck', { volume: 0.8, pitch: 1, pan: 0 });
audio.setMood('combat');              // crossfades the music bed (~1.5 s)
audio.setIntensity(trace / 100);      // 0..1
audio.setMasterVolume(0.8); audio.setSfxVolume(0.8); audio.setMusicVolume(0.5);
audio.setMuted(true); audio.isMuted();
audio.setCorruption(0.6);             // 0..1, finale: bitcrush + pitch wobble + stutter
audio.getSettings();                  // { master, sfx, music, muted } for the options screen
```

- No call throws. No call does anything without WebAudio (tests, SSR).
- Volumes and mute persist in `localStorage` keys `cw.audio.master|sfx|music|muted`.
- `setMood`, `setIntensity` and `setCorruption` called before `unlock()` are remembered and applied on unlock.
- Music scheduling pauses while the tab is hidden.
- Also exported: `SFX_IDS` (runtime list) and `TITLE_MOTIF`.
- Intensity: opens the filter, raises tempo, adds notes and layers, mixes in dissonance.

## Moods to screens

| Mood | Screen |
|---|---|
| `silence` | Boot, loading, fake crash, anywhere a pause is wanted |
| `title` | Title screen, including the nested one in `127.0.0.1` |
| `hub` | Home, shops, clinic, church, dialogue (calm, warm) |
| `system` | Network map inside a system; drive intensity with trace |
| `combat` | Any ICE fight |
| `boss` | Boss fights (heavy, wrong) |
| `finale` | `127.0.0.1` and CHAIRMAN v2 (unstable, quotes the title motif); pair with `setCorruption` |
| `credits` | Real credits (resolved). The fake credits in Act 2 can use `credits` then cut to `silence` + `fake_crash` |

## Sound effects

| Id | Intent |
|---|---|
| `ui_click` | Button press |
| `ui_hover` | Faint tick on hover (rate-limited) |
| `ui_error` | Refused action, double low buzz |
| `ui_open` | Panel or window opens (rising sweep) |
| `ui_close` | Panel closes (falling sweep) |
| `typewriter` | One character of typed text (randomised per call) |
| `message` | Incoming DM or log message chime |
| `jack_in` | Enter cyberspace: riser, data chirps, thunk |
| `jack_out` | Leave cyberspace: falling sweep, click |
| `node_move` | Step to another node |
| `probe` | Sonar ping with echoes |
| `sneak_ok` | Soft pass of a node |
| `sneak_fail` | Detected: harsh stab |
| `combat_start` | Riser, then minor-chord impact |
| `turn_start` | Two-note ping, your turn |
| `program_crack` | Crunchy noise crack, falling square |
| `program_spike` | Fast rising pierce, then thud |
| `program_worm` | Wobbling, creeping descent |
| `program_exploit` | Rising pulse arpeggio, lock click |
| `program_defense` | Shield swell, rising chord |
| `program_stealth` | Whispering noise fade |
| `program_daemon` | Low boot pulses, then a hum |
| `botnet` | Cascade of blips over a sweep, chord |
| `ice_attack` | Heavy ICE hit |
| `ice_black` | Black ICE: tritone drone, reverse swell, hit |
| `hit_shield` | Metallic ping |
| `hit_deck` | Crunchy thud on deck integrity |
| `hit_neural` | Neural damage: ringing tone, sub, burn |
| `shell_break` | Glass shatter |
| `ice_die` | Digital collapse |
| `status_apply` | Small two-note tag |
| `flow` | Bright rising arpeggio, flow bonus earned |
| `trace_tick` | Dull tock; use `pitch` to rise with trace |
| `alarm` | Two-tone siren |
| `dumped` | Power-down fall, static, thud |
| `traced` | Alarm, low doom bells, ice crackle |
| `flatline` | Two beeps, then a long flat tone |
| `loot` | Coin chime |
| `capture` | Sweep and chord lock on a node or module |
| `system_owned` | Rising arpeggio, big major chord, boom |
| `credits` | Gentle pad and bell notes |
| `buy` | Register ticks and a bell |
| `level_up` | Pentatonic fanfare |
| `glitch` | Stuttering random blips and noise |
| `boss_phase` | Riser, boom, diminished stab |
| `fake_crash` | Stuck-buffer buzz, then abrupt silence; follow with `setMood('silence')` |
| `root` | Sub drop, harmonic stack, "sudo" ding |
| `victory` | Timpani and brass-style fanfare |

## Files

- `engine.ts` context, master chain (compressor and soft clip), settings, `tone`/`noise` voices
- `sfx.ts` the effects
- `music.ts` mood definitions, lookahead scheduler, lanes
- `index.ts` public API
