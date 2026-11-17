// Tutorial coach: the active tutorial step (engine objectives of kind 'tutorial', written by the story).
// It stays until the step is done or the player clicks "Got it" (dispatches ui/hintDone). It never fades on a timer.
// It points at its target: pulses the data-ui anchor, opens the right hub tab first, rings a map node for `@node`.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { select, type Engine } from '../../engine/index.ts';
import { audio } from '../../audio/index.ts';
import { ui, uiEl, logLine, type HubTab } from '../game.ts';
import { useStore, useSubscribe, useMedia } from '../store.ts';
import { settings } from '../settings.ts';
import { Portrait, Kbd } from '../components/common.tsx';
import { npcName, fillState } from '../copy.ts';
import { metaOverlayUp } from '../metaBridge.ts';
import { mapFx } from '../fx/fxStore.ts';
import { rich } from './Overlays.tsx';

const loggedSteps = new Set<string>();

export interface Step { id: string; n: number; text: string; anchor: string | null; speaker: string; status: string; engine: boolean; }

/** "Seen" is per save (seed), so a new game shows its tutorial again. */
export function seenKey(e: Engine, id: string): string {
  return `${e.state.seed}:${id}`;
}

export function markSeen(e: Engine, id: string): void {
  const k = seenKey(e, id);
  if (ui.get().hintsSeen.includes(k)) return;
  const seen = [...ui.get().hintsSeen, k].slice(-400);
  try {
    localStorage.setItem('cw.ui.hints', JSON.stringify(seen));
  } catch {
    /* ignore */
  }
  ui.set({ hintsSeen: seen });
}

/**
 * Tutorial steps. `active` is the engine's active step. `catchUp` is the earliest step that got done before
 * the player saw it (its action happened early): the coach shows it first, marked done, so nothing flashes by unseen.
 */
export function tutorialSteps(e: Engine): { active: Step | null; catchUp: Step | null; past: Step[] } {
  const all = select.objectivesView(e).filter((o) => o.kind === 'tutorial');
  const seen = ui.get().hintsSeen;
  const steps: Step[] = all.map((o, i) => ({
    id: o.id, n: i + 1, text: o.text, anchor: o.anchor, speaker: o.speaker ?? 'auntie', status: o.status, engine: true,
  }));
  let active = steps.find((s) => s.status === 'active') ?? null;
  const past = steps.filter((s) => s.status === 'done');
  const catchUp = past.find((s) => !seen.includes(seenKey(e, s.id))) ?? null;
  const legacy = ui.get().hint;
  if (!active && legacy && !seen.includes(legacy.id)) {
    active = { id: legacy.id, n: steps.length + 1, text: legacy.text, anchor: legacy.anchor ?? null, speaker: legacy.speaker ?? 'auntie', status: 'active', engine: false };
  }
  return { active, catchUp, past };
}

export const COMBAT_ANCHOR = /^(program-|ice-|end-turn|flow|cycles|player-vitals|disengage|combat-)/;

type MapV = NonNullable<ReturnType<typeof select.mapView>>;

/** First reachable node on the shortest known path to `goal` (breadth-first from the goal backwards). */
function nextOnPath(v: MapV, goal: string): string | null {
  const byId = new Map(v.nodes.map((n) => [n.id, n]));
  const seen = new Set([goal]);
  let frontier = [goal];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const l of byId.get(id)?.links ?? []) {
        if (seen.has(l)) continue;
        seen.add(l);
        const n = byId.get(l);
        if (!n?.revealed) continue;
        if (n.accessible && n.state !== 'cleared' && n.state !== 'captured') return l;
        if (n.state === 'cleared' || n.state === 'captured' || n.state === 'asleep') continue;
        next.push(l);
      }
    }
    frontier = next;
  }
  return null;
}

const firstEnabled = (sel: string): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>(sel)].find((el) => el.getAttribute('aria-disabled') !== 'true' && !el.classList.contains('is-blocked')) ?? null;

/** What to point at inside a hub tab the coach already opened. */
const TAB_DEFAULT: Record<string, (e: Engine) => HTMLElement | null> = {
  botnet: () => firstEnabled('.seg .btn:not(.on)[data-ui$="-mine"]') ?? firstEnabled('.seg .btn:not(.on)'),
  market: (e) => {
    // the cheapest thing you can buy right now; its vendor tab first if another vendor is open
    let best: { v: string; id: string; price: number } | null = null;
    for (const v of Object.keys(e.content.vendors)) {
      for (const st of select.vendorStock(e, v)) {
        if (st.available && (st.kind === 'program' || st.kind === 'hardware') && (!best || st.price < best.price)) best = { v, id: st.id, price: st.price };
      }
    }
    if (!best) return null;
    return uiEl(`buy-${best.id}`) ?? uiEl(`vendor-${best.v}`);
  },
  deck: (e) => {
    // the newest program you own and have not loaded; if RAM is full, an Unload first
    const owned = Object.keys(e.state.player.programs).filter((id) => !e.state.player.loadout.includes(id) && !e.state.player.programs[id].corrupted);
    const newest = owned[owned.length - 1];
    if (!newest) return null;
    const load = uiEl(`load-${newest}`);
    if (load && load.getAttribute('aria-disabled') !== 'true') return load;
    return firstEnabled('[data-ui^="unload-"]');
  },
  files: () => firstEnabled('[data-ui="sell-all"]'),
  net: () => uiEl('jack-in'),
  jobs: () => firstEnabled('[data-ui^="job-turnin-"]') ?? firstEnabled('[data-ui^="job-accept-"]'),
};

/** Which hub tab holds an anchor that is not on screen. */
function routeTab(anchor: string): HubTab | null {
  if (anchor.startsWith('hub-')) return null;
  if (anchor === 'jack-in' || anchor.startsWith('addr-')) return 'net';
  if (anchor === 'sell-all' || /^(paydata|sell|decrypt|clean|lore|item)-/.test(anchor)) return 'files';
  if (/^(vendor|buy|stock|talk)-/.test(anchor) || anchor === 'clinic-heal' || anchor.startsWith('scrub-')) return 'market';
  if (/^(load|unload|loadout|part|repair)-/.test(anchor) || anchor === 'ram-meter') return 'deck';
  if (anchor.startsWith('host-')) return 'botnet';
  if (anchor.startsWith('job-') || anchor === 'objectives') return 'jobs';
  if (anchor.startsWith('msg-') || anchor.startsWith('inbox-')) return 'inbox';
  if (anchor.startsWith('coin-') || anchor === 'pump' || anchor === 'dump') return 'wallet';
  return null;
}

/** Resolve an anchor key to the element to outline, and the map node to ring. */
function resolve(e: Engine, anchor: string | null): { el: HTMLElement | null; node: string | null } {
  if (!anchor) return { el: null, node: null };
  const [key, nodeId] = anchor.split('@');
  if (key.startsWith('map-node:')) return { el: null, node: key.slice(9) };
  if (nodeId && e.state.run && !e.state.combat) {
    const selNode = ui.get().selectedNode ?? e.state.run.position;
    const v = select.mapView(e);
    const target = v?.nodes.find((n) => n.id === nodeId);
    // the node is not reachable yet: point at the next node on the way there, and at what to do on it
    if (v && target && !target.accessible) {
      const step = nextOnPath(v, nodeId);
      if (step && selNode !== step) return { el: null, node: step };
      if (step) {
        const n = v.nodes.find((x) => x.id === step)!;
        const a = ['run/breach', 'run/probe', 'run/unlock'].find((t) => n.actions.some((x) => x.type === t && !x.reason));
        return { el: a ? uiEl(`node-${a.slice(4)}`) : null, node: null };
      }
    }
    if (selNode !== nodeId) return { el: null, node: nodeId };
    // the button is not offered yet (e.g. Capture behind ICE): point at what clears the way
    if (!uiEl(key) && target) {
      const a = ['run/breach', 'run/probe', 'run/unlock'].find((t) => target.actions.some((x) => x.type === t && !x.reason));
      if (a) return { el: uiEl(`node-${a.slice(4)}`), node: null };
    }
  }
  // a fight lesson outside a fight: point at the way to the next fight
  if (COMBAT_ANCHOR.test(key) && !e.state.combat && e.state.run) {
    const v = select.mapView(e);
    if (v) {
      const selNode = ui.get().selectedNode ?? e.state.run.position;
      const breach = v.nodes.find((n) => n.accessible && n.actions.some((a) => a.type === 'run/breach' && !a.reason));
      const goal = breach ?? v.nodes.find((n) => n.revealed && n.ice.length > 0 && n.state === 'hostile');
      // no ICE known yet: explore (enter or probe the nearest unvisited node)
      const explore = v.nodes.find((n) => n.accessible && n.actions.some((a) => a.type === 'run/probe' && !a.reason));
      const step = breach ? breach.id : goal ? nextOnPath(v, goal.id) ?? explore?.id ?? null : explore?.id ?? null;
      if (step && selNode !== step) return { el: null, node: step };
      if (step) {
        const n = v.nodes.find((x) => x.id === step)!;
        const a = ['run/breach', 'run/probe', 'run/unlock'].find((t) => n.actions.some((x) => x.type === t && !x.reason));
        return { el: a ? uiEl(`node-${a.slice(4)}`) : null, node: null };
      }
    }
  }
  // a hub tab that is already open: point at the thing to do inside it
  if (key.startsWith('hub-') && !e.state.run && ui.get().tab === key.slice(4)) {
    const inner = TAB_DEFAULT[key.slice(4)]?.(e);
    if (inner) return { el: inner, node: null };
  }
  let el: HTMLElement | null = null;
  // a map or home lesson that shows up mid-fight: the fight comes first
  if (e.state.combat && !COMBAT_ANCHOR.test(key) && key !== 'jack-out' && key !== 'trace') return { el: firstEnabled('.prog') ?? uiEl('end-turn'), node: null };
  if (key === 'jack-out' && e.state.combat) el = uiEl('combat-jack-out');
  else if (key === 'program-last') {
    const last = e.state.combat?.lastProgram;
    el = last ? uiEl(`program-${last}`) : null;
  } else el = uiEl(key);
  if (el && key.startsWith('program-slot-')) el = el.closest('.prog') as HTMLElement | null;
  if (!el && !e.state.run && !e.state.combat) {
    const tab = routeTab(key);
    if (tab && ui.get().tab !== tab) el = uiEl(`hub-${tab}`);
  }
  return { el, node: null };
}

export function Coach(p: { engine: Engine }) {
  const e = p.engine;
  const u = useStore(ui);
  useSubscribe(settings.subscribe);
  const narrow = useMedia('(max-width: 1100px)');
  const [history, setHistory] = useState(false);
  const [minId, setMinId] = useState<string | null>(null);
  const [place, setPlace] = useState<'top' | 'bottom'>('top');
  const [lift, setLift] = useState(0);
  const [squeeze, setSqueeze] = useState(false);
  const [topPx, setTopPx] = useState(0);
  const boxRef = useRef<HTMLElement>(null);
  const t = tutorialSteps(e);
  const on = settings.get().tutorials !== false;
  // a step done before it was seen comes first, then the live one
  const active = on && t.catchUp ? t.catchUp : t.active;
  const already = !!active && active.status === 'done';
  const past = t.past;
  const blocked = !!e.state.dialogue || !!e.state.cinematic || !!u.failure || u.cards.length > 0 || u.guideOpen || (u.inspectOpen && narrow) || metaOverlayUp() || u.phase !== 'game' || e.state.mode === 'ending';
  const show = !blocked && ((on && !!active) || u.coachOpen);

  const done = () => {
    if (!active) return;
    audio.play('ui_click', { volume: 0.6 });
    if (active.engine && !already) e.dispatch({ type: 'ui/hintDone', id: active.id });
    if (active.engine) markSeen(e, active.id);
    else {
      const seen = [...ui.get().hintsSeen, active.id];
      try {
        localStorage.setItem('cw.ui.hints', JSON.stringify(seen.slice(-400)));
      } catch {
        /* ignore */
      }
      ui.set({ hintsSeen: seen, hint: null });
    }
    ui.set({ coachOpen: false });
  };

  // a live step that has been on screen for a moment counts as seen (it will not come back as a catch-up)
  useEffect(() => {
    if (!show || !active || already || !active.engine) return;
    const id = window.setTimeout(() => markSeen(e, active.id), 1200);
    return () => clearTimeout(id);
  }, [show, active?.id, already]);

  // outline the target; ring a map node; keep following it as screens change
  useLayoutEffect(() => {
    if (!show || !active || already) {
      mapFx.coach = null;
      return;
    }
    let last: HTMLElement | null = null;
    const tick = () => {
      const r = resolve(e, active.anchor);
      mapFx.coach = r.node;
      if (r.el !== last) {
        last?.classList.remove('coach-target');
        r.el?.classList.add('coach-target');
        // bring it on screen (the phone tab strip scrolls sideways; long lists scroll down)
        r.el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        last = r.el;
      }
      if (narrow) {
        let rect = r.el?.getBoundingClientRect();
        if (!rect && r.node) {
          const c = document.querySelector('[data-ui="map"]')?.getBoundingClientRect();
          if (c) rect = new DOMRect(c.left, c.top, c.width, c.height);
        }
        // try the top slot, then the bottom slot (above the program bar or the log ticker); pick one that leaves the target visible
        const bar = e.state.combat ? document.querySelector('.botnet-row, .cb-bar') : document.querySelector('.log-ticker');
        const h = boxRef.current?.offsetHeight ?? 220;
        // never cover the top bar or the phone's tab strip: the player must always be able to switch tabs
        const railEl = !e.state.run && !e.state.combat ? document.querySelector('.rail') : null;
        const topY = Math.max(document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 50, railEl ? railEl.getBoundingClientRect().bottom : 0) + 6;
        setTopPx(topY);
        const bottomEdge = bar ? bar.getBoundingClientRect().top - 6 : window.innerHeight - 10;
        const hits = (y0: number, y1: number) => !!rect && rect.bottom > y0 && rect.top < y1;
        let pl: 'top' | 'bottom' = 'top';
        if (hits(topY, topY + h)) pl = 'bottom';
        if (pl === 'bottom' && hits(bottomEdge - h, bottomEdge) && rect) pl = rect.top + rect.height / 2 < window.innerHeight / 2 ? 'bottom' : 'top';
        setPlace(pl);
        setLift(pl === 'bottom' ? Math.max(0, window.innerHeight - bottomEdge) : 0);
        setSqueeze(!!rect && hits(topY, topY + h) && hits(bottomEdge - h, bottomEdge));
      }
    };
    tick();
    const iv = window.setInterval(tick, 250);
    return () => {
      clearInterval(iv);
      last?.classList.remove('coach-target');
      mapFx.coach = null;
    };
  }, [show, active?.id, active?.anchor, narrow, already]);

  // Enter = Got it (when the focus is not on another control)
  useEffect(() => {
    if (!show || !active) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter' || ev.metaKey || ev.ctrlKey) return;
      const t = ev.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || (t.tagName === 'BUTTON' && t.dataset.ui !== 'coach-ok'))) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      done();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [show, active?.id]);

  useEffect(() => {
    if (ui.get().coaching !== show) ui.set({ coaching: show });
    // on a phone the coach and toasts would stack on the same strip; toasts are in the log anyway
    document.body.classList.toggle('coaching-narrow', show && narrow);
    return () => document.body.classList.remove('coaching-narrow');
  }, [show, narrow]);
  useEffect(() => {
    if (show && active && !loggedSteps.has(active.id)) {
      loggedSteps.add(active.id);
      logLine(`Tip, ${npcName(e, active.speaker)}: ${fillState(e, active.text)}`, 'ui');
    }
  }, [show, active?.id]);
  if (!show) return null;
  const speaker = active?.speaker ?? 'auntie';
  const mini = !!active && minId === active.id && !history;
  return (
    <aside
      ref={boxRef}
      class={`coach ${narrow ? `coach-narrow coach-${place}` : 'coach-docked'} ${mini ? 'coach-mini' : ''} ${narrow && squeeze ? 'coach-squeeze' : ''}`}
      style={narrow ? (place === 'bottom' && lift ? { bottom: `${lift}px` } : place === 'top' && topPx ? { top: `${topPx}px` } : undefined) : undefined} role="note" aria-live="polite" aria-label="Tutorial" data-ui="coach">
      <div class="coach-head">
        <div class="coach-face"><Portrait id={speaker} talking={false} /></div>
        <div style={{ minWidth: 0 }}>
          <div class="coach-who">{npcName(e, speaker)}</div>
          <div class="coach-step">{active ? `tutorial, step ${active.n}${already ? ', already done' : ''}` : 'past hints'}</div>
        </div>
        {active ? (
          <button class="btn ghost small" aria-label={mini ? 'Show the hint' : 'Shrink the hint'} aria-expanded={!mini} data-ui="coach-min" onClick={() => setMinId(mini ? null : active.id)}>{mini ? '▴' : '▾'}</button>
        ) : (
          <button class="btn ghost small" aria-label="Close" data-ui="coach-close" onClick={() => ui.set({ coachOpen: false })}>×</button>
        )}
      </div>
      {active && !history && !mini && <div class="coach-text">{rich(fillState(e, active.text))}</div>}
      {active && already && !history && !mini && <div class="coach-done" data-ui="coach-already">You did this one before I could say it. Nice.</div>}
      {active && !already && !history && !mini && !!e.state.combat && !COMBAT_ANCHOR.test(active.anchor ?? '') && active.anchor !== 'jack-out' && active.anchor !== 'trace' && (
        <div class="coach-step" data-ui="coach-after-fight">Finish this fight first.</div>
      )}
      {active && !already && !history && !mini && !e.state.combat && COMBAT_ANCHOR.test(active.anchor ?? '') && (
        <div class="coach-step" data-ui="coach-next-fight">This one is for your next fight. The ring shows the way.</div>
      )}
      {(history || !active) && (
        <ol class="coach-past" data-ui="coach-history">
          {past.length === 0 && <li class="faint">Nothing yet.</li>}
          {past.map((s) => <li>{rich(fillState(e, s.text))}</li>)}
        </ol>
      )}
      {!mini && <div class="coach-foot">
        {past.length > 0 && <button class="btn ghost small" data-ui="coach-history-toggle" onClick={() => setHistory(!history)}>{history ? 'Current hint' : `Past hints (${past.length})`}</button>}
        <span class="spacer" />
        {active && <button class="btn primary" data-ui="coach-ok" data-step={active.id} onClick={done}>{already ? 'Next' : 'Got it'} <Kbd>enter</Kbd></button>}
      </div>}
    </aside>
  );
}
