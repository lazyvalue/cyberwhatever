// Fourth-wall / meta layer public contract (DESIGN §11). Owner: meta agent. The UI imports only this file.
//
//   installMeta(engine)    once at boot (after or before engine.load(); both work)
//   <MetaLayer engine/>    once at the app root, above everything
//   metaUi                 interface-corruption state the UI honours (see MetaUiState)
//   metaText(text)         fill real-world slots ({playtime} {localTime} {viewport} …) in any displayed string
//   getTitleExtras()       extra title-screen lines (PATCH after JAILBREAK, Endless, ROOT)
import { h, type JSX } from 'preact';
import type { Engine } from '../engine/index.ts';
import { MetaController } from './controller.ts';
import { installCw, makeCw } from './cw.ts';
import { browserEnv, guard, type MetaEnv } from './env.ts';
import { MetaRoot } from './MetaLayer.tsx';
import type { RealStats } from './stats.ts';
import { scrambleText as scramble, uiStore, type MetaUiState } from './ui-state.ts';

export type { MetaUiState } from './ui-state.ts';
export type { RealStats } from './stats.ts';

let ctrl: MetaController | null = null;
let pendingHooks: { toTitle?: () => void } = {};

/** Interface-corruption state. `get()` returns a new object after every change (safe for memo checks). */
export const metaUi: { get(): MetaUiState; subscribe(fn: () => void): () => void } = {
  get: () => uiStore.get(),
  subscribe: (fn) => uiStore.subscribe(fn),
};

/** Called once at boot. Idempotent per engine. */
export function installMeta(engine: Engine, env: MetaEnv = browserEnv()): void {
  guard(() => {
    if (ctrl && ctrl.engine === engine) return;
    ctrl?.dispose();
    const c = new MetaController(engine, env);
    c.hooks = { ...pendingHooks };
    ctrl = c;
    c.install();
    const cw = makeCw({
      exec: (line, source) => c.exec(line, source),
      cheat: (what) => c.cheat(what),
      printReal: (lines, ok) => c.printReal(lines, ok),
      isFinale: () => c.engine.state.meta.finale !== 'none',
    });
    installCw(env.win, cw, {
      exec: (line, source) => c.exec(line, source),
      cheat: (what) => c.cheat(what),
      printReal: (lines, ok) => c.printReal(lines, ok),
      isFinale: () => c.engine.state.meta.finale !== 'none',
    });
  }, undefined, 'installMeta');
}

/** Mounted once at the app root above everything. */
export function MetaLayer(props: { engine: Engine }): JSX.Element {
  if (!ctrl || ctrl.engine !== props.engine) installMeta(props.engine);
  if (!ctrl) return null as unknown as JSX.Element;
  return h(MetaRoot, { ctrl });
}

/** Extra lines for the title screen (one rotation per page load). */
export function getTitleExtras(): string[] {
  return guard(() => ctrl?.getTitleExtras() ?? [], []);
}

/** Fill `{playtime} {localTime} {viewport} {timeAway} {botnetSize} {humanity} {topSystem} …`. Unknown tokens stay. */
export function metaText(text: string): string {
  if (!ctrl) return text;
  return ctrl.metaText(text);
}

/** Label scrambler used while `metaUi.get().scrambleLabels` is true. */
export function scrambleText(text: string): string {
  return guard(() => scramble(text), text);
}

/** The player's real, local statistics (Whisper's file, debugging). Null before installMeta. */
export function realStats(): RealStats | null {
  return guard(() => ctrl?.stats() ?? null, null);
}

export function openMetaConsole(open = true): void {
  guard(() => ctrl?.openConsole(open), undefined);
}

/** UI callbacks the meta layer may need (e.g. [ Title ] after the credits). */
export function setMetaHooks(hk: { toTitle?: () => void }): void {
  pendingHooks = { ...pendingHooks, ...hk };
  if (ctrl) ctrl.hooks = { ...ctrl.hooks, ...hk };
}

/** Cinematic ids the meta layer plays itself (driven from `state.cinematic`; it dispatches ui/cinematicDone). */
export { META_CINEMATICS, handlesCinematic } from './controller.ts';

/** For the dev harness and tests only. */
export function _metaController(): MetaController | null {
  return ctrl;
}
