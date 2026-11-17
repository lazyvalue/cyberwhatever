// Title: a broken neon sign over a live fake network. New game, continue, settings.
import { useMemo, useRef, useState } from 'preact/hooks';
import { SAVE_KEYS, type Engine, type GameState } from '../../engine/index.ts';
import { audio } from '../../audio/index.ts';
import { ui } from '../game.ts';
import { useCanvas, rng } from '../canvas/ticker.ts';
import { drawMap, type MapData, type MapNode, type Particle } from '../canvas/mapRenderer.ts';
import { reducedMotion } from '../settings.ts';
import { getTitleExtras } from '../metaBridge.ts';

function fakeNet(): MapNode[] {
  const r = rng(2028);
  const nodes: MapNode[] = [];
  const types = ['gateway', 'router', 'datastore', 'io', 'security', 'vault', 'process', 'core'];
  for (let i = 0; i < 22; i++) {
    nodes.push({
      id: `n${i}`, x: r(), y: r(), type: types[Math.floor(r() * types.length)],
      state: r() < 0.4 ? 'captured' : r() < 0.6 ? 'cleared' : 'hostile',
      revealed: r() > 0.15, accessible: true, links: [], ice: Math.floor(r() * 3), black: r() < 0.06, name: '',
    });
  }
  for (const n of nodes) {
    const near = nodes.filter((m) => m !== n).sort((a, b) => (a.x - n.x) ** 2 + (a.y - n.y) ** 2 - ((b.x - n.x) ** 2 + (b.y - n.y) ** 2));
    n.links = near.slice(0, 2).map((m) => m.id);
  }
  return nodes;
}

function savedSummary(): { handle: string; rep: number; cycle: number } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEYS.slot);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return { handle: s.player.handle, rep: s.player.rep, cycle: s.cycle };
  } catch {
    return null;
  }
}

export function Title(p: { engine: Engine }) {
  const nodes = useMemo(fakeNet, []);
  const particles = useRef<Particle[]>([]).current;
  const ref = useCanvas((ctx, w, h, t, dt) => {
    const data: MapData = { nodes, position: null, selected: null, hover: null, alarm: 0, reduced: reducedMotion(), compact: true };
    drawMap(ctx, w, h, t, dt, data, particles);
  });
  const saved = useMemo(savedSummary, []);
  const hasSave = p.engine.hasSave() && !!saved;
  const [naming, setNaming] = useState(!hasSave);
  const [handle, setHandle] = useState('n00b');
  const extras = getTitleExtras();
  const storageOk = useMemo(() => {
    try {
      localStorage.getItem(SAVE_KEYS.slot);
      return true;
    } catch {
      return false;
    }
  }, []);

  const start = () => {
    audio.unlock();
    const h = handle.trim().slice(0, 16) || 'n00b';
    p.engine.newGame({ handle: h });
    audio.play('jack_in');
    ui.set((s) => ({ phase: 'game', tab: 'net', failure: null, hold: null, cards: [], wipe: s.wipe + 1 }));
  };
  const [loadError, setLoadError] = useState<string | null>(null);
  const cont = () => {
    audio.unlock();
    try {
      if (p.engine.load()) {
        audio.play('jack_in');
        ui.set((s) => ({ phase: 'game', failure: null, hold: null, wipe: s.wipe + 1 }));
      } else setLoadError('There is no save to continue. Start a new game.');
    } catch (err) {
      console.warn('[ui] save could not be loaded', err);
      audio.play('ui_error');
      setLoadError("This save can't be read by this version. Start a new game.");
      setNaming(true);
    }
  };

  return (
    <main class="title-screen" onPointerDown={() => audio.unlock()}>
      <canvas class="backdrop" ref={ref} aria-hidden="true" />
      <div class="title-inner">
        <h1 class="title-logo" aria-label="CYBER WHATEVER 2028: The future already sucks.">
          <span class="line">CYBER</span>
          <span class="line">
            <span class="tube">WHAT</span><span class="tube buzz">E</span><span class="tube">V</span><span class="tube dead">E</span><span class="tube">R</span><span class="year" aria-hidden="true">2028</span>
          </span>
        </h1>
        <div class="title-sub" aria-hidden="true">The future already sucks.</div>
        <p class="title-tag">Hack the net. Build a botnet. Hack that. Own as much of cyberspace as you can. Or do whatever.</p>
        <div class="title-menu">
          {loadError && <div class="title-error" role="alert" data-ui="title-load-error">{loadError}</div>}
          {hasSave && saved && !loadError && (
            <button class="btn primary big" data-ui="title-continue" onClick={cont} autoFocus>
              <span>Continue</span>
              <span class="faint">{saved.handle}, rep {saved.rep}</span>
            </button>
          )}
          {!naming && (
            <button class="btn big" data-ui="title-new" onClick={() => setNaming(true)}>
              <span>New game</span>
              <span class="faint">overwrites the save</span>
            </button>
          )}
          {naming && (
            <form
              class="stack"
              style={{ gap: '8px' }}
              onSubmit={(e) => {
                e.preventDefault();
                start();
              }}
            >
              <label class="h-sub" for="handle">Your handle</label>
              <input
                id="handle"
                class="field"
                data-ui="title-handle"
                value={handle}
                maxLength={16}
                autoFocus
                autoComplete="off"
                spellcheck={false}
                onInput={(e) => setHandle((e.target as HTMLInputElement).value)}
              />
              <button type="submit" class="btn hot big" data-ui="title-start">
                <span>Do whatever</span>
                <span class="kbd">enter</span>
              </button>
              {hasSave && !loadError && <span class="faint" style={{ fontSize: '0.867rem' }}>This replaces the save of {saved?.handle}. The flatline counter stays.</span>}
            </form>
          )}
          {!storageOk && <div class="title-error" role="status" data-ui="title-no-storage">This browser blocks site data, so the game can't save. You can still play.</div>}
          <button class="btn ghost" data-ui="title-settings" onClick={() => ui.set({ settingsOpen: true })}>
            Settings
          </button>
        </div>
        {extras.length > 0 && (
          <div class="title-extras" data-ui="title-extras">
            {extras.map((l) => <div>{l}</div>)}
          </div>
        )}
      </div>
      <div class="title-foot">
        <span>Everything stays on this machine. No network.</span>
        <span>v0.1</span>
      </div>
    </main>
  );
}
