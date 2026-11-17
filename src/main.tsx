// Entry point: fonts, theme, engine, meta layer, UI.
import '@fontsource-variable/martian-mono/standard.css';
import '@fontsource-variable/tilt-neon';
import './ui/theme.css';
import { render } from 'preact';
import { createEngine, select, type StorageLike } from './engine/index.ts';
import { content } from './content/index.ts';
import { App } from './ui/App.tsx';
import { bindEngine, testHooks, ui, logLine } from './ui/game.ts';
import { startDirector } from './ui/fx/director.ts';
import { installMeta, setMetaHooks, setQaMetaOverride } from './ui/metaBridge.ts';
import { applyMotionClass, applyUiScale } from './ui/settings.ts';
import { mapFx } from './ui/fx/fxStore.ts';

/**
 * Browsers that block site data throw on the localStorage getter itself (SecurityError), and some throw on every
 * call. The game then runs without saving instead of showing a white page.
 */
function safeStorage(): StorageLike | null {
  let st: Storage;
  try {
    st = window.localStorage;
    st.getItem('cw.save');
  } catch {
    return null;
  }
  // a full or flaky store must never break a dial-in: a failed write costs that save, not the game
  let warned = false;
  return {
    getItem: (k) => {
      try {
        return st.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      try {
        st.setItem(k, v);
      } catch (err) {
        console.warn('[ui] could not save', k, err);
        if (!warned) {
          warned = true;
          setTimeout(() => logLine('Could not save: browser storage is full or blocked. Progress since the last save is not kept.', 'warn', true), 0);
        }
      }
    },
    removeItem: (k) => {
      try {
        st.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };
}
const storage = safeStorage();
const engine = createEngine({ content, storage });
bindEngine(engine);
startDirector(engine);
setMetaHooks({ toTitle: () => ui.set({ phase: 'title', failure: null, hold: null, cards: [] }) });
installMeta(engine);
applyMotionClass();
applyUiScale();

// Dev builds, or any build opened with ?qa, expose read access for the Playwright scripts in scripts/.
if (import.meta.env.DEV || new URLSearchParams(location.search).has('qa')) {
  const g = globalThis as unknown as { __engine: typeof engine; __cwUi: typeof testHooks; __cwSelect: typeof select };
  g.__engine = engine;
  g.__cwSelect = select;
  testHooks.metaOverride = (p) => setQaMetaOverride(p);
  testHooks.coachNode = () => mapFx.coach;
  g.__cwUi = testHooks;
}

render(<App engine={engine} />, document.getElementById('app')!);
