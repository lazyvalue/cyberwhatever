// Private dev harness for the meta layer (open /meta-dev.html under `npm run dev`). Not part of the game build.
// Storage is namespaced to `cw.dev.*` so the harness never touches the real save.
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { content } from '../content/index.ts';
import { createEngine, type Engine, type JsonValue } from '../engine/index.ts';
import { browserEnv, type StoreLike } from './env.ts';
import { _metaController, getTitleExtras, installMeta, MetaLayer, metaText, metaUi, scrambleText, setMetaHooks } from './index.ts';

class DevStore implements StoreLike {
  private map = (k: string) => (k.startsWith('cw.') ? `cw.dev.${k.slice(3)}` : k);
  getItem(k: string) {
    return localStorage.getItem(this.map(k));
  }
  setItem(k: string, v: string) {
    localStorage.setItem(this.map(k), v);
  }
  removeItem(k: string) {
    localStorage.removeItem(this.map(k));
  }
  private own(): string[] {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cw.dev.')) out.push(`cw.${k.slice(7)}`);
    }
    return out;
  }
  key(i: number) {
    return this.own()[i] ?? null;
  }
  get length() {
    return this.own().length;
  }
}

const storage = new DevStore();
const engine: Engine = createEngine({ content, storage });
if (!engine.load()) engine.newGame({ handle: 'n00b' });
const env = { ...browserEnv(), storage };
installMeta(engine, env);
setMetaHooks({ toTitle: () => {} }); // the harness has no title screen
(window as unknown as { __engine: Engine }).__engine = engine;

const set = (patch: JsonValue) => engine.dispatch({ type: 'debug/set', patch });
const ctrl = () => _metaController()!;

function useMetaUi() {
  const [ui, setUi] = useState(metaUi.get());
  useEffect(() => metaUi.subscribe(() => setUi(metaUi.get())), []);
  return ui;
}

function useEngine() {
  const [, setN] = useState(0);
  useEffect(() => engine.subscribe(() => setN((n) => n + 1)), []);
  return engine.state;
}

function FakeCombat() {
  const ui = useMetaUi();
  const s = useEngine();
  const [turn, setTurn] = useState(0);
  const pos = ui.buttonsDrift ? { marginLeft: `${(turn * 97) % 300}px` } : {};
  const label = (id: string, name: string) => {
    const l = ui.hudOverride[`prog:${id}`] ?? name;
    return ui.scrambleLabels ? scrambleText(l) : l;
  };
  return (
    <div class="fake-combat" data-ui="combat" style={{ filter: ui.glitch ? `hue-rotate(${ui.glitch * 40}deg)` : undefined }}>
      <div>
        CHAIRMAN v2 — {ui.hudOverride.bossIntegrity ?? 'integrity 200/200'} {ui.fakeInfiniteIntegrity ? '(∞)' : ''}
      </div>
      <div>
        credits: {ui.hudOverride.credits ?? `${s.player.credits}¤`} · control: {ui.hudOverride.control ?? '…'}
      </div>
      <div>
        {s.player.loadout.map((id) => (
          <button key={id} data-ui="program" type="button">
            {label(id, content.programs[id]?.name ?? id)}
          </button>
        ))}
      </div>
      <div>
        <button
          data-ui="endTurn"
          type="button"
          style={pos}
          disabled={ui.endTurnDisabled}
          title={ui.hudOverride.endTurnTip ?? ''}
          onClick={() => {
            setTurn(turn + 1);
            ctrl().applyTurn(turn + 1);
          }}
        >
          {ui.hudOverride.endTurn ?? 'End Turn'} (next: turn {turn + 1})
        </button>
        <button data-ui="jackOut" type="button">
          {ui.hudOverride.jackOut ?? 'Hang Up'}
        </button>
      </div>
      <div class="dim">damage popup: {ui.hudOverride.damage ?? '7'} {ui.riggedRolls ? '(rigged: max)' : ''}</div>
    </div>
  );
}

function Harness() {
  const ui = useMetaUi();
  const s = useEngine();
  const key = s.meta.rootKey.map((f) => f.toUpperCase()).join('-');
  const btn = (label: string, fn: () => void) => (
    <button type="button" onClick={fn}>
      {label}
    </button>
  );
  return (
    <div class="harness">
      <h1>meta dev harness</h1>
      <p class="dim">
        phase P{ctrl().phase} · finale {s.meta.finale} · root {String(s.meta.root)} · ending {String(s.ending)} · mode {s.mode} · key {key}
      </p>
      <section>
        <h2>phases</h2>
        {btn('new game', () => engine.newGame({ handle: 'n00b' }))}
        {btn('P1 act 3', () => set({ story: { flags: { act3_started: true } } }))}
        {btn('P2 finale', () => set({ story: { flags: { act3_started: true, finale_entered: true } }, meta: { finale: 'entered' } }))}
        {btn('P3 root hunt', () => set({ story: { flags: { act3_started: true, finale_entered: true, root_hunt: true } }, meta: { finale: 'entered' } }))}
        {btn('sudo key', () => ctrl().exec(`sudo ${key}`, 'console'))}
        {btn('open console', () => ctrl().openConsole(true))}
      </section>
      <section>
        <h2>scenes</h2>
        {btn('fake game over + credits', () => ctrl().playScene({ kind: 'fakeCredits', part: 'all', doneId: 'fakeCredits' }))}
        {btn('droste', () => ctrl().playScene({ kind: 'droste', doneId: 'droste' }))}
        {btn('fake win', () => ctrl().playScene({ kind: 'fakeWin' }))}
        {btn('fake crash', () => ctrl().playScene({ kind: 'fakeCrash', reduced: false }))}
        {btn('fake crash (reduced)', () => ctrl().playScene({ kind: 'fakeCrash', reduced: true }))}
        {btn('taunt', () => ctrl().applyTurn(3))}
        {btn('clear tamper', () => ctrl().clearTamper())}
      </section>
      <section>
        <h2>endings (from P4)</h2>
        {btn('ROOT', () => {
          ctrl().exec('kill chairman', 'console');
          set({ meta: { patchBroken: true, finale: 'patch_beaten' }, combat: null });
          ctrl().exec('kill patch', 'console');
        })}
        {btn('JAILBREAK', () => ctrl().exec('free patch', 'console'))}
        {btn('RETENTION', () => ctrl().exec('accept offer', 'console'))}
        {btn('rm -rf / (then type CYBER WHATEVER in the console)', () => {
          ctrl().openConsole(true);
          ctrl().exec('rm -rf /', 'console');
        })}
        {btn('wipe cw.dev.*', () => {
          for (const k of Object.keys(localStorage)) if (k.startsWith('cw.dev.')) localStorage.removeItem(k);
          location.reload();
        })}
      </section>
      <section>
        <h2>fake combat view (honours metaUi)</h2>
        <FakeCombat />
      </section>
      <section>
        <h2>metaUi</h2>
        <pre>{JSON.stringify(ui, null, 1)}</pre>
        <h2>metaText / title extras</h2>
        <pre>{metaText('{handle} · {playtime} · {localTime} · {viewport} · {timeAway} · {control} · {botnetSize} · {topSystem} {topSystemTime}')}</pre>
        <pre>{JSON.stringify(getTitleExtras())}</pre>
      </section>
      <MetaLayer engine={engine} />
    </div>
  );
}

render(<Harness />, document.getElementById('app')!);
