// Root of the game UI. Chooses the screen from engine state, stacks overlays, mounts the meta layer last.
import { useEffect, useState } from 'preact/hooks';
import { select, type Engine } from '../engine/index.ts';
import { audio } from '../audio/index.ts';
import { ui, toggleLog, keysBlocked, openGuide } from './game.ts';
import { useMedia, useSubscribe } from './store.ts';
import { settings, applyMotionClass } from './settings.ts';
import { MetaLayer, subscribeMetaUi } from './metaBridge.ts';
import { TopBar } from './components/TopBar.tsx';
import { Coach } from './overlays/Coach.tsx';
import { Guide, contextSection } from './overlays/Guide.tsx';
import { LogPanel, LogTicker } from './components/LogPanel.tsx';
import { TooltipHost } from './components/Tooltip.tsx';
import { Title } from './screens/Title.tsx';
import { Hub } from './screens/Hub.tsx';
import { RunScreen } from './screens/Run.tsx';
import { CombatScreen } from './screens/Combat.tsx';
import {
  FxLayer, CardOverlay, FailureScreen, DialogueOverlay, PerkPicker, SettingsModal, JackInWipe,
  MetaCorner, GlitchVeil, useSkipper, CinematicOverlay,
} from './overlays/Overlays.tsx';

export function App({ engine }: { engine: Engine }) {
  useSubscribe((fn) => engine.subscribe(() => fn()), ui.subscribe, settings.subscribe, subscribeMetaUi);
  useSkipper();
  const u = ui.get();
  const s = engine.state;
  const narrow = useMedia('(max-width: 1100px)');
  const [perkLater, setPerkLater] = useState<string | null>(null);

  useEffect(applyMotionClass, []);
  useEffect(() => {
    if (u.phase === 'title') audio.setMood('title');
  }, [u.phase]);

  // global keys: L log, O settings
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const t = ev.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (ui.get().phase !== 'game') return;
      if (ev.key === '?' && !ui.get().guideOpen && !keysBlocked({ allowDialogue: true })) {
        ev.preventDefault();
        openGuide(contextSection(engine));
        return;
      }
      if (keysBlocked({ allowDialogue: true })) return;
      if (ev.key === 'l' || ev.key === 'L') {
        if (engine.state.run && !engine.state.combat) return; // L = loot in a run
        toggleLog(narrow);
      }
      if (ev.key === 'o' || ev.key === 'O') ui.set({ settingsOpen: !ui.get().settingsOpen });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [narrow]);

  const docked = u.phase === 'game' && s.mode !== 'ending' && !narrow;
  useEffect(() => {
    document.body.classList.toggle('no-log-docked', !docked);
  }, [docked]);

  const crt = <div class={`crt ${settings.get().scanlines ? '' : 'off'}`} aria-hidden="true" />;
  const meta = MetaLayer ? <MetaLayer engine={engine} /> : null;

  if (u.phase === 'title') {
    return (
      <>
        <Title engine={engine} />
        {u.settingsOpen && <SettingsModal inGame={false} />}
        <TooltipHost />
        {crt}
        {meta}
      </>
    );
  }

  if (s.mode === 'ending') {
    return (
      <>
        {MetaLayer ? meta : <FallbackEnding engine={engine} />}
        {crt}
      </>
    );
  }

  const screen = select.screen(engine);
  const hold = u.hold;
  let main;
  if (hold && hold.state.combat) main = <CombatScreen engine={engine} ctx={{ state: hold.state, content: engine.content }} live={false} />;
  else if (screen === 'combat') main = <CombatScreen engine={engine} ctx={engine} live />;
  else if (screen === 'run') main = <RunScreen engine={engine} />;
  else if (screen === 'hub') main = <Hub engine={engine} tab={u.tab} />;
  else main = <div />;

  const showDocked = !narrow;
  const perkKey = s.player.pendingPerks?.join(',') ?? null;
  const showPerk = !!perkKey && perkKey !== perkLater && !s.combat && !s.dialogue && !u.failure && !hold && !u.cards.length && s.mode !== 'flatlined';

  return (
    <>
      <div class="shell">
        <TopBar engine={engine} />
        <div class={`shell-body ${showDocked ? '' : 'no-log'}`}>
          <main class="shell-main" id="main">{main}</main>
          {showDocked && <LogPanel engine={engine} mode="docked" />}
        </div>
        {narrow && <LogTicker engine={engine} />}
        <nav class="mnav" aria-label="Quick">
          <button class="btn" data-ui="mnav-log" onClick={() => toggleLog(true)}>Log</button>
          {screen === 'hub' && <button class="btn" data-ui="mnav-net" onClick={() => ui.set({ tab: 'net' })}>Net</button>}
          <button class="btn" data-ui="mnav-settings" onClick={() => ui.set({ settingsOpen: true })}>Settings</button>
        </nav>
      </div>
      {narrow && u.logOpen && <LogPanel engine={engine} mode="drawer" />}
      <DialogueOverlay engine={engine} />
      {showPerk && <PerkPicker engine={engine} onLater={() => setPerkLater(perkKey)} />}
      <FailureScreen engine={engine} />
      <CardOverlay />
      <CinematicOverlay engine={engine} />
      <Coach engine={engine} />
      {u.guideOpen && <Guide engine={engine} />}
      <FxLayer />
      <JackInWipe />
      <MetaCorner />
      <GlitchVeil />
      {u.settingsOpen && <SettingsModal inGame />}
      <TooltipHost />
      {crt}
      {meta}
    </>
  );
}


function FallbackEnding({ engine }: { engine: Engine }) {
  const s = engine.state;
  return (
    <div class="card-ov" style={{ cursor: 'default' }}>
      <div style={{ maxWidth: '640px' }}>
        <div class="ct">{s.ending ?? 'the end'}</div>
        <div class="cx">Control {select.controlPct(engine)}%. {s.stats.runs} runs. {s.player.flatlinesTotal} flatlines.</div>
        <div class="hstack" style={{ marginTop: '24px' }}>
          {s.endless && <button class="btn primary" onClick={() => engine.dispatch({ type: 'endless/continue' })}>Keep playing</button>}
          <button class="btn" onClick={() => ui.set({ phase: 'title' })}>Title</button>
        </div>
      </div>
    </div>
  );
}
