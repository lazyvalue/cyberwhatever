// Overlays: fx layer, toasts, comms, hints, cards, failure screens, dialogue, perk picker, settings.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { select, type Engine } from '../../engine/index.ts';
import { audio } from '../../audio/index.ts';
import { ui, engine, logLine } from '../game.ts';
import { fx } from '../fx/fxStore.ts';
import { useStore, useSubscribe } from '../store.ts';
import { Portrait, Kbd } from '../components/common.tsx';
import { settings, charDelay, reducedMotion, UI_SCALES, type TextSpeed, type MotionPref } from '../settings.ts';
import { FAILURE, npcName, npcHandle, tierOf, fillState, descr } from '../copy.ts';
import { metaUiState, subscribeMetaUi, openMetaConsole, metaOverlayUp, metaOwnsCinematic } from '../metaBridge.ts';
import { isPlaying, fastForward } from '../fx/director.ts';

/** `*emphasis*` → <em>. */
export function rich(text: string): ComponentChildren {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return parts.map((p) => (p.length > 2 && p.startsWith('*') && p.endsWith('*') ? <em>{p.slice(1, -1)}</em> : p));
}

/** Join parts into sentences without doubling the full stop ("—C.." → "—C."). */
export function sentences(parts: (string | null | undefined)[]): string {
  return parts
    .filter((x): x is string => !!x && !!x.trim())
    .map((x) => x.trim())
    .map((x) => (/[.!?…]$/.test(x) ? x : `${x}.`))
    .join(' ');
}

// ------------------------------------------------------------------ fx

export function FxLayer() {
  const f = useStore(fx);
  return (
    <>
      <div class="fx-layer" aria-hidden="true">
        {f.floats.map((x) => (
          <div key={x.id} class={`fx-float ${x.cls}`} style={{ left: `${x.x}px`, top: `${x.y}px` }}>{x.text}</div>
        ))}
      </div>
    </>
  );
}

export function CardOverlay() {
  const u = useStore(ui);
  const c = u.cards[0];
  const next = () => {
    if (!c) return;
    audio.play('ui_close', { volume: 0.6 });
    ui.set((s) => ({ cards: s.cards.slice(1) }));
    if (c.cinematic) engine().dispatch({ type: 'ui/cinematicDone', id: c.cinematic });
  };
  useEffect(() => {
    if (c) logLine(`${c.title ? `${c.title}: ` : ''}${c.text}`, 'story');
  }, [c?.id]);
  useEffect(() => {
    if (!c) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        next();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [c?.id]);
  if (!c) return null;
  return (
    <div class="card-ov" role="dialog" aria-modal="true" aria-label={c.title ?? 'Message'} onClick={next} data-ui="card">
      <div style={{ maxWidth: '640px' }}>
        {c.title && <div class="ct">{c.title}</div>}
        <div class="cx">{rich(c.text)}</div>
        <div class="cc">click or press enter</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pending cinematic (state.cinematic)

/**
 * The engine holds every action while state.cinematic is set. Ids the meta layer handles are its job;
 * any other id (act cards, unknown ids) is shown here as a card and acknowledged with ui/cinematicDone.
 * Driven from state, so a reload with a pending cinematic replays it.
 */
export function CinematicOverlay(p: { engine: Engine }) {
  const e = p.engine;
  const c = e.state.cinematic;
  const mine = !!c && !metaOwnsCinematic(c.id);
  const done = () => {
    if (!c) return;
    audio.play('ui_close', { volume: 0.6 });
    e.dispatch({ type: 'ui/cinematicDone', id: c.id });
  };
  useEffect(() => {
    if (!mine || !c) return;
    const d = c.data && typeof c.data === 'object' && !Array.isArray(c.data) ? (c.data as Record<string, unknown>) : {};
    const ls = Array.isArray(d.lines) ? (d.lines as unknown[]).map(String) : typeof d.text === 'string' ? [d.text] : [];
    logLine([typeof d.title === 'string' ? d.title : '', ...ls].filter(Boolean).map((l) => fillState(e, l)).join(' '), 'story');
  }, [mine, c?.id]);
  useEffect(() => {
    if (!mine) return;
    const onKey = (ev: KeyboardEvent) => {
      if (metaOverlayUp()) return;
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        done();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [mine, c?.id]);
  if (!c || !mine) return null;
  const d = c.data && typeof c.data === 'object' && !Array.isArray(c.data) ? (c.data as Record<string, unknown>) : {};
  const lines = Array.isArray(d.lines) ? (d.lines as unknown[]).map(String) : typeof d.text === 'string' ? d.text.split('\n') : [];
  const title = typeof d.title === 'string' ? d.title : null;
  return (
    <div class="card-ov" role="dialog" aria-modal="true" aria-label={title ?? 'Story card'} onClick={done} data-ui="cinematic" data-cinematic={c.id}>
      <div style={{ maxWidth: '640px' }}>
        {title && <div class="ct">{fillState(e, title)}</div>}
        <div class="cx">{lines.length ? lines.map((l) => <div style={{ minHeight: '1.2em' }}>{rich(fillState(e, l))}</div>) : '…'}</div>
        <div class="cc">click or press enter</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ failure

export function FailureScreen(p: { engine: Engine }) {
  const u = useStore(ui);
  const e = p.engine;
  const flat = e.state.mode === 'flatlined';
  const f = u.failure ?? (flat ? { kind: 'flatlined' as const, text: FAILURE.flatlined.lines[1], foot: `flatlines: ${e.state.player.flatlinesTotal}` } : null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (f) setTimeout(() => btn.current?.focus(), 50);
    if (f) logLine(sentences([FAILURE[f.kind].title[0], f.text, f.foot]), 'warn', true);
  }, [f?.kind, f?.text]);
  if (!f || u.hold) return null;
  const t = tierOf(e);
  const ti = t === 'warm' ? 0 : t === 'cold' ? 1 : 2;
  const title = FAILURE[f.kind].title[ti];
  const reload = () => {
    audio.unlock();
    const ok = e.loadCheckpoint();
    if (!ok) e.newGame({ handle: e.state.player.handle });
    ui.set({ failure: null, selectedNode: null, target: null });
  };
  return (
    <div class={`fail f-${f.kind}`} role="alertdialog" aria-modal="true" aria-labelledby="fail-title" data-ui={`failure-${f.kind}`}>
      <div class="fail-inner">
        {f.kind === 'flatlined' && (
          <svg class="flatline-line" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 30 H180 L195 8 L210 52 L225 30 H300 L315 6 L330 54 L345 30 H600" fill="none" stroke="var(--red)" stroke-width="2" vector-effect="non-scaling-stroke" />
          </svg>
        )}
        <h1 id="fail-title" class="fail-title">{title}</h1>
        {f.text && <p class="fail-text">{rich(f.text)}</p>}
        <div class="fail-foot">{f.foot}</div>
        {f.kind === 'flatlined' ? (
          <button ref={btn} class="btn danger big" data-ui="reload-checkpoint" onClick={reload}>Reload checkpoint</button>
        ) : (
          <button ref={btn} class="btn primary big" data-ui="failure-continue" onClick={() => ui.set({ failure: null })}>Back to the deck</button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ dialogue

export function DialogueOverlay(p: { engine: Engine }) {
  const e = p.engine;
  const dv = select.dialogueView(e);
  const key = dv ? `${dv.id}:${dv.node}` : '';
  const text = dv ? fillState(e, dv.text) : '';
  const [shown, setShown] = useState(0);
  const done = shown >= text.length;
  useEffect(() => {
    setShown(charDelay() === 0 || reducedMotion() ? text.length : 0);
    if (dv) logLine(`${npcName(e, dv.speaker)}: ${text}`, 'story');
  }, [key]);
  useEffect(() => {
    if (!dv || done) return;
    const d = charDelay();
    const id = window.setTimeout(() => {
      const step = d < 10 ? 3 : 1;
      setShown((s) => Math.min(text.length, s + step));
      if (shown % 3 === 0) audio.play('typewriter', { volume: 0.35 });
    }, d);
    return () => clearTimeout(id);
  }, [shown, key, done]);

  const choose = (index: number, el?: Element | null) => {
    if (!dv) return;
    const c = dv.choices.find((x) => x.index === index);
    if (c && !c.enabled) {
      audio.play('ui_error');
      if (el instanceof HTMLElement) {
        el.classList.remove('shake-no');
        void el.offsetWidth;
        el.classList.add('shake-no');
      }
      return;
    }
    audio.play('ui_click', { volume: 0.6 });
    if (c) logLine(`You: ${fillState(e, c.text)}`, 'story');
    e.dispatch({ type: 'dialogue/choose', index });
  };

  useEffect(() => {
    if (!dv) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ui.get().cards.length || metaOverlayUp() || e.state.cinematic) return;
      if (!done && (ev.key === ' ' || ev.key === 'Enter' || ev.key === 'Escape')) {
        ev.preventDefault();
        setShown(text.length);
        return;
      }
      if (!done) return;
      if (dv.choices.length === 0 && (ev.key === ' ' || ev.key === 'Enter')) {
        ev.preventDefault();
        choose(0);
        return;
      }
      if (/^[1-9]$/.test(ev.key)) {
        const c = dv.choices[Number(ev.key) - 1];
        if (c) {
          ev.preventDefault();
          choose(c.index, document.querySelector(`[data-ui="choice-${Number(ev.key)}"]`));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!dv) return null;
  const revealed = dv.speaker === 'glitch' ? !!e.state.story.flags.patch_revealed : dv.speaker === 'auntie' ? !!e.state.story.flags.auntie_unmasked : false;
  return (
    <>
      <div class="dlg-scrim" />
      <div class="dlg" role="dialog" aria-modal="true" aria-label={`Conversation with ${npcName(e, dv.speaker)}`} data-ui="dialogue">
        <Portrait id={dv.speaker} talking={!done} revealed={revealed} />
        <div>
          <div class="speaker">{npcName(e, dv.speaker)}</div>
          <div class="handle">@{npcHandle(e, dv.speaker)}</div>
          <div class="text" aria-live="polite" onClick={() => setShown(text.length)}>
            {rich(text.slice(0, shown))}
            {!done && <span class="caret" />}
          </div>
          {done && (
            <div class="choices">
              {dv.choices.length === 0 ? (
                <button class="btn primary choice" data-ui="choice-1" onClick={() => choose(0)} autoFocus>Continue <Kbd>enter</Kbd></button>
              ) : (
                dv.choices.map((c, i) => (
                  <button
                    class={`btn choice ${c.enabled ? '' : 'is-blocked'}`}
                    data-ui={`choice-${i + 1}`}
                    aria-disabled={c.enabled ? undefined : 'true'}
                    data-tip={c.enabled ? undefined : c.lockedText ?? 'Not available.'}
                    onClick={(ev) => choose(c.index, ev.currentTarget)}
                    autoFocus={i === 0}
                  >
                    <span>
                      <Kbd>{i + 1}</Kbd> {rich(fillState(e, c.text))}
                      {!c.enabled && c.lockedText && <span class="locked">{c.lockedText}</span>}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ perks

export function PerkPicker(p: { engine: Engine; onLater: () => void }) {
  const e = p.engine;
  const perks = e.state.player.pendingPerks;
  if (!perks) return null;
  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="perk-title" data-ui="perk-picker">
      <div class="modal" style={{ width: 'min(720px, 100%)' }}>
        <div class="modal-head">
          <h2 id="perk-title" class="h-screen" style={{ fontSize: '1.733rem' }}>Pick a perk</h2>
          <div class="dim" style={{ fontSize: '0.867rem' }}>Rep {e.state.player.rep}. One of three. It shapes how you play.</div>
        </div>
        <div class="modal-body perk-grid">
          {perks.map((id, i) => {
            const d = e.content.perks[id];
            return (
              <button
                class="perk-card"
                data-ui={`perk-${id}`}
                autoFocus={i === 0}
                onClick={() => {
                  audio.play('level_up', { volume: 0.7 });
                  e.dispatch({ type: 'perk/choose', perk: id });
                }}
              >
                <span class="pn">{d?.name ?? id}</span>
                <span class="pd">{descr(e, d?.description)}</span>
                <Kbd>{i + 1}</Kbd>
              </button>
            );
          })}
        </div>
        <div class="modal-foot">
          <button class="btn ghost" onClick={p.onLater}>Decide later</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ settings

export function SettingsModal(p: { inGame: boolean }) {
  useSubscribe(settings.subscribe);
  const s = settings.get();
  const [a, setA] = useState(() => audio.getSettings());
  const e = engine();
  const close = () => ui.set({ settingsOpen: false });
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  const vol = (k: 'master' | 'sfx' | 'music', v: number) => {
    audio.unlock();
    if (k === 'master') audio.setMasterVolume(v);
    if (k === 'sfx') audio.setSfxVolume(v);
    if (k === 'music') audio.setMusicVolume(v);
    setA(audio.getSettings());
  };
  const inRun = !!e.state.run;
  return (
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(ev) => { if (ev.target === ev.currentTarget) close(); }}>
      <div class="modal" data-ui="settings">
        <div class="modal-head"><h2 id="settings-title" class="h-screen" style={{ fontSize: '1.733rem' }}>Settings</h2></div>
        <div class="modal-body stack">
          {(['master', 'sfx', 'music'] as const).map((k) => (
            <label class="stack" style={{ gap: '4px' }}>
              <span class="h-sub">{k === 'sfx' ? 'Sound effects' : k === 'music' ? 'Music' : 'Master volume'} <span class="faint">{Math.round(a[k] * 100)}%</span></span>
              <input type="range" min={0} max={1} step={0.05} value={a[k]} data-ui={`vol-${k}`} onInput={(ev) => vol(k, Number((ev.target as HTMLInputElement).value))} />
            </label>
          ))}
          <label class="hstack">
            <input type="checkbox" checked={a.muted} data-ui="mute" onChange={(ev) => { audio.unlock(); audio.setMuted((ev.target as HTMLInputElement).checked); setA(audio.getSettings()); }} />
            Mute everything
          </label>
          <div class="stack" style={{ gap: '4px' }}>
            <span class="h-sub">Text speed</span>
            <div class="hstack">
              {(['slow', 'normal', 'fast', 'instant'] as TextSpeed[]).map((t) => (
                <button class={`btn small ${s.textSpeed === t ? 'primary' : ''}`} aria-pressed={s.textSpeed === t} onClick={() => settings.set({ textSpeed: t })}>{t}</button>
              ))}
            </div>
          </div>
          <div class="stack" style={{ gap: '4px' }}>
            <span class="h-sub">Motion <span class="faint">(auto follows your system setting)</span></span>
            <div class="hstack">
              {(['auto', 'reduced', 'full'] as MotionPref[]).map((t) => (
                <button class={`btn small ${s.motion === t ? 'primary' : ''}`} aria-pressed={s.motion === t} data-ui={`motion-${t}`} onClick={() => settings.set({ motion: t })}>{t}</button>
              ))}
            </div>
          </div>
          <div class="stack" style={{ gap: '4px' }}>
            <span class="h-sub">UI scale</span>
            <div class="hstack">
              {UI_SCALES.map((t) => (
                <button class={`btn small ${s.uiScale === t ? 'primary' : ''}`} aria-pressed={s.uiScale === t} data-ui={`ui-scale-${Math.round(t * 100)}`} onClick={() => settings.set({ uiScale: t })}>{Math.round(t * 100)}%</button>
              ))}
            </div>
          </div>
          <div class="stack" style={{ gap: '4px' }}>
            <span class="h-sub">Animation speed</span>
            <div class="hstack">
              {([1, 2, 4] as const).map((t) => (
                <button class={`btn small ${s.animSpeed === t ? 'primary' : ''}`} aria-pressed={s.animSpeed === t} onClick={() => settings.set({ animSpeed: t })}>×{t}</button>
              ))}
            </div>
          </div>
          <label class="hstack"><input type="checkbox" checked={s.tutorials !== false} data-ui="tutorials" onChange={(ev) => settings.set({ tutorials: (ev.target as HTMLInputElement).checked })} /> Tutorial hints (the ? button shows past hints)</label>
          <label class="hstack"><input type="checkbox" checked={s.scanlines} onChange={(ev) => settings.set({ scanlines: (ev.target as HTMLInputElement).checked })} /> CRT scanlines</label>
        </div>
        <div class="modal-foot">
          {p.inGame && (
            <button
              class="btn"
              data-ui="quit-title"
              data-tip={inRun ? 'The run is not saved. You return to your last save (before this dial-in).' : 'Saves, then goes to the title screen.'}
              onClick={() => {
                if (!inRun && !e.state.combat) e.save();
                ui.set({ settingsOpen: false, phase: 'title', failure: null, hold: null });
                audio.setMood('title');
              }}
            >
              {inRun ? 'Quit to title (lose this run)' : 'Save and quit to title'}
            </button>
          )}
          <button class="btn primary" data-ui="settings-close" onClick={close} autoFocus>Done</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ misc

export function JackInWipe() {
  const u = useStore(ui);
  const [k, setK] = useState(0);
  useEffect(() => {
    if (u.wipe === 0) return;
    setK(u.wipe);
    const id = setTimeout(() => setK(0), 600);
    return () => clearTimeout(id);
  }, [u.wipe]);
  if (!k || reducedMotion()) return null;
  return <div key={k} class="jackin-wipe" aria-hidden="true" />;
}

export function MetaCorner() {
  useSubscribe(subscribeMetaUi);
  const m = metaUiState();
  if (!m.consoleHint) return null;
  return <button class="meta-corner" data-ui="meta-console" aria-label="Open the console" data-tip="…" onClick={() => openMetaConsole()}>{'>_'}</button>;
}

/** Global click/Esc to fast-forward event playback. */
export function useSkipper(): void {
  useEffect(() => {
    const onDown = (ev: PointerEvent) => {
      if (!isPlaying()) return;
      const t = ev.target as HTMLElement;
      if (t.closest('button, input, a, [role=button], canvas')) return;
      fastForward();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && isPlaying()) fastForward();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}

export function GlitchVeil() {
  useSubscribe(subscribeMetaUi);
  const g = metaUiState().glitch;
  useEffect(() => {
    document.documentElement.style.setProperty('--glitch', String(Math.max(0, Math.min(1, g))));
  }, [g]);
  return g > 0 ? <div class="glitch-veil" aria-hidden="true" /> : null;
}
