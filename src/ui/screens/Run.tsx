// In-system view: the node graph, the selected node's panel, trace, haul, hang up.
import { useEffect, useRef, useState } from 'preact/hooks';
import { select, BALANCE, type Action, type Engine, type NodeActionType } from '../../engine/index.ts';
import { audio } from '../../audio/index.ts';
import { ui, act, refuse, testHooks, keysBlocked } from '../game.ts';
import { Btn, Kbd, Bar } from '../components/common.tsx';
import { useCanvas } from '../canvas/ticker.ts';
import { drawMap, hitTest, layout, type MapData, type MapNode, type Particle } from '../canvas/mapRenderer.ts';
import { hud, label, descr, NODE_TYPE_INFO, NODE_ACTION_LABEL, NODE_ACTION_TIP, TRACE_TIPS, money } from '../copy.ts';
import { reducedMotion } from '../settings.ts';
import { useStore } from '../store.ts';
import { GuideLink } from '../overlays/Guide.tsx';

type MapView = NonNullable<ReturnType<typeof select.mapView>>;
type NodeView = MapView['nodes'][number];

const KEYS: Record<string, NodeActionType> = {
  p: 'run/probe', s: 'run/sneak', b: 'run/breach', k: 'run/backdoor', u: 'run/unlock',
  l: 'run/loot', c: 'run/capture', e: 'run/use', t: 'run/talk', n: 'run/netscan',
};
const KEY_OF: Record<string, string> = Object.fromEntries(Object.entries(KEYS).map(([k, v]) => [v, k]));

/** Which actions make sense to show for this node (blocked ones still show with their reason). */
function relevant(e: Engine, n: NodeView, type: NodeActionType, reason: string | null): boolean {
  if (!reason) return true;
  const hasIce = n.ice.length > 0 && n.state !== 'cleared' && n.state !== 'captured';
  switch (type) {
    case 'run/probe': return hasIce || n.state === 'locked';
    case 'run/sneak': return hasIce && n.state !== 'asleep';
    case 'run/breach': return hasIce;
    case 'run/backdoor': return !/no backdoor known|no ICE here/.test(reason);
    case 'run/unlock': return !!n.lockLabel && n.state === 'locked';
    case 'run/loot': {
      const nd = e.content.systems[e.state.run!.system]?.nodes.find((x) => x.id === n.id) ?? e.state.world.procSystems[e.state.run!.system]?.nodes.find((x) => x.id === n.id);
      return !!nd?.files?.length || n.type === 'datastore';
    }
    case 'run/capture': return reason !== 'already captured' && reason !== 'ICE in the way';
    case 'run/use': return !!n.useLabel;
    case 'run/talk': return reason !== 'nobody to talk to';
    case 'run/netscan': return n.type === 'router';
  }
  return false;
}

function toMapNodes(v: MapView): MapNode[] {
  return v.nodes.map((n) => ({
    id: n.id, x: n.x, y: n.y, type: n.type, state: n.state, revealed: n.revealed, accessible: n.accessible,
    links: n.links, ice: n.ice.length, black: n.ice.some((i) => i.black), name: n.name,
  }));
}

function nearestInDirection(v: MapView, from: NodeView, dx: number, dy: number): string | null {
  let best: string | null = null;
  let bs = Infinity;
  for (const n of v.nodes) {
    if (n.id === from.id || !n.revealed) continue;
    const vx = n.x - from.x;
    const vy = n.y - from.y;
    const d = Math.hypot(vx, vy);
    if (d === 0) continue;
    const cos = (vx * dx + vy * dy) / d;
    if (cos < 0.35) continue;
    const score = d / (cos * cos);
    if (score < bs) {
      bs = score;
      best = n.id;
    }
  }
  return best;
}

export function RunScreen(p: { engine: Engine }) {
  const e = p.engine;
  const v = select.mapView(e)!;
  const u = useStore(ui);
  const sel = v.nodes.find((n) => n.id === u.selectedNode) ?? v.nodes.find((n) => n.id === v.position)!;
  const [hover, setHover] = useState<string | null>(null);
  const particles = useRef<Particle[]>([]).current;
  const dataRef = useRef<MapData | null>(null);
  dataRef.current = {
    nodes: toMapNodes(v), position: v.position, selected: sel?.id ?? null, hover,
    alarm: v.trace / 100, reduced: reducedMotion(),
  };
  const sizeRef = useRef({ w: 1, h: 1 });
  const canvasRef = useCanvas((ctx, w, h, t, dt) => {
    sizeRef.current = { w, h };
    if (dataRef.current) drawMap(ctx, w, h, t, dt, dataRef.current, particles);
  });

  useEffect(() => {
    testHooks.nodePoint = (id: string) => {
      const c = canvasRef.current;
      const n = dataRef.current?.nodes.find((x) => x.id === id);
      if (!c || !n) return null;
      const r = c.getBoundingClientRect();
      const pt = layout(n, r.width, r.height);
      return { x: r.left + pt.x, y: r.top + pt.y };
    };
    return () => {
      delete testHooks.nodePoint;
    };
  }, []);

  const select_ = (id: string | null) => {
    if (!id || id === sel?.id) return;
    audio.play('node_move', { volume: 0.5 });
    ui.set({ selectedNode: id });
  };

  const doAction = (type: NodeActionType, el?: Element | null) => {
    if (!sel) return;
    act({ type, node: sel.id } as Action, el ?? document.querySelector(`[data-ui="node-${type.slice(4)}"]`));
  };

  // keyboard: arrows move, letters act, H hangs up
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (keysBlocked() || !e.state.run || e.state.combat) return;
      const tgt = ev.target as HTMLElement;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
      const view = select.mapView(e);
      if (!view) return;
      const cur = view.nodes.find((n) => n.id === ui.get().selectedNode) ?? view.nodes.find((n) => n.id === view.position)!;
      const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (dirs[ev.key]) {
        ev.preventDefault();
        const next = nearestInDirection(view, cur, dirs[ev.key][0], dirs[ev.key][1]);
        if (next) {
          audio.play('node_move', { volume: 0.5 });
          ui.set({ selectedNode: next });
        }
        return;
      }
      if (ev.key === 'Enter') {
        const tgt = ev.target as HTMLElement;
        if (tgt?.tagName === 'BUTTON') return;
        const first = ['run/loot', 'run/capture', 'run/probe', 'run/breach', 'run/use', 'run/talk', 'run/unlock', 'run/netscan']
          .find((t) => cur.actions.some((a) => a.type === t && !a.reason));
        if (first) {
          ev.preventDefault();
          act({ type: first, node: cur.id } as Action, document.querySelector(`[data-ui="node-${first.slice(4)}"]`));
        }
        return;
      }
      const k = ev.key.toLowerCase();
      if (k === 'h') {
        ev.preventDefault();
        act({ type: 'run/jackOut' }, document.querySelector('[data-ui="jack-out"]'));
        return;
      }
      const type = KEYS[k];
      if (type) {
        ev.preventDefault();
        act({ type, node: cur.id } as Action, document.querySelector(`[data-ui="node-${type.slice(4)}"]`));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [e]);

  const pointer = (ev: PointerEvent, click: boolean) => {
    const c = ev.currentTarget as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    const id = hitTest(dataRef.current!, sizeRef.current.w, sizeRef.current.h, ev.clientX - r.left, ev.clientY - r.top);
    const node = id ? v.nodes.find((n) => n.id === id) : null;
    if (click) {
      if (node && node.revealed) select_(id);
      else if (node) refuse(null, 'Not discovered yet. Clear a neighbouring node first.');
    } else if (ev.pointerType === 'mouse') {
      const h = node && node.revealed ? id : null;
      if (h !== hover) setHover(h);
      c.style.cursor = h ? 'pointer' : 'default';
    }
  };

  const traceLvl = v.traceLevel;
  const traceCol = v.trace >= 66 ? 'var(--red)' : v.trace >= 33 ? 'var(--amber)' : 'var(--cyan)';
  const haulValue = v.haul.reduce((a, x) => a + x.value, 0);
  const ORDER = ['run/probe', 'run/sneak', 'run/breach', 'run/backdoor', 'run/unlock', 'run/loot', 'run/use', 'run/talk', 'run/capture', 'run/netscan'];
  const actions = sel ? sel.actions.filter((a) => relevant(e, sel, a.type, a.reason)).sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type)) : [];
  const general = sel && !sel.accessible && sel.id !== v.position ? (sel.revealed ? 'Not adjacent to a cleared node. Clear a neighbour first.' : 'Not discovered yet.') : null;

  return (
    <div class="run">
      <section class="map-wrap" aria-label={`Map of ${v.address}`}>
        <canvas
          ref={canvasRef}
          data-ui="map"
          role="img"
          aria-label={`Network map of ${v.name}. ${v.nodes.filter((n) => n.revealed).length} nodes known. Use arrow keys to move between nodes.`}
          onPointerMove={(ev) => pointer(ev, false)}
          onPointerLeave={() => setHover(null)}
          onClick={(ev) => pointer(ev as unknown as PointerEvent, true)}
          onDblClick={() => {
            const def = actions.find((a) => !a.reason);
            if (def) doAction(def.type);
          }}
        />
        <div class="map-head">
          <div class="display">{v.name}</div>
          <div class="sub">{v.address}, tier {v.tier}, security {v.security}{v.securityCaptured ? ', security captured' : ''}</div>
        </div>
        <div class="map-bottom">
        <div class="trace-strip" data-ui="trace" data-tip={TRACE_TIPS[traceLvl as keyof typeof TRACE_TIPS] ?? TRACE_TIPS.calm}>
            <div class="trace-row">
              <span>
                {label('trace', 'trace')} <GuideLink section="trace" label="Trace" /> <b class="num" style={{ color: traceCol, fontSize: '1rem' }}>{Math.round(v.trace)}</b>
                <span style={{ color: traceCol, marginLeft: '8px' }}>{traceLvl}</span>
              </span>
              <span class="dim" data-ui="haul" data-tip={v.haul.length ? v.haul.map((h) => `${h.name} (${h.value}¤)`).join('\n') : 'Paydata you carry. Lost if you are dumped or traced.'}>
                paydata {v.haul.length}/{v.storage} <span class="c-amber">{money(haulValue)}</span>
                {v.charges > 0 && <span style={{ marginLeft: '10px' }}>botnet charges {v.charges}</span>}
              </span>
            </div>
            <div class="trace-bar">
              <i style={{ width: `${Math.min(100, v.trace)}%`, background: traceCol, boxShadow: `0 0 10px ${traceCol}` }} />
              <span class="th" style={{ left: `${BALANCE.trace.suspicious}%` }}><span>suspicious</span></span>
              <span class="th" style={{ left: `${BALANCE.trace.alarm}%` }}><span>alarm</span></span>
            </div>
          </div>
        </div>
      </section>

      <aside class="node-panel" aria-label="Selected node">
        {sel && (
          <>
            <div class="np-head">
              <div class="np-type" data-tip={NODE_TYPE_INFO[sel.type] ?? ''}>{sel.type}{sel.id === v.position ? ', you are here' : ''}</div>
              <div class="np-name">{sel.name}</div>
              <div class="hstack">
                <span class={`tag ${sel.state === 'captured' ? 'c-lime' : sel.state === 'cleared' ? 'c-cyan' : sel.state === 'asleep' ? 'c-violet' : sel.state === 'open' ? 'faint' : 'c-pink'}`} data-tip={sel.state === 'open' ? 'No ICE here. You pass through it on the way to what is behind it.' : undefined}>{sel.state === 'open' ? (sel.actions.some((x) => !x.reason && x.type !== 'run/probe') ? 'no ICE' : 'empty') : sel.state}</span>
                {sel.sealed && <span class="tag c-red">sealed</span>}
                {sel.lockLabel && sel.state === 'locked' && <span class="tag c-amber">{sel.lockLabel}</span>}
              </div>
            </div>
            <div class="np-body">
              {sel.description && <p class="dim" style={{ margin: 0, fontSize: '0.867rem' }}>{descr(e, sel.description)}</p>}
              {!sel.description && <p class="faint" style={{ margin: 0, fontSize: '0.867rem' }}>{NODE_TYPE_INFO[sel.type]}</p>}

              {sel.ice.length > 0 && sel.state !== 'cleared' && sel.state !== 'captured' && (
                <div class="stack" style={{ gap: '6px' }} data-ui="node-ice">
                  {sel.ice.map((i) => (
                    <div class={`ice-mini ${i.black ? 'black' : ''}`}>
                      <span>{i.black && <b class="c-red">BLACK ICE </b>}{i.known || i.black ? (i.known ? i.name : 'black ICE') : 'unknown ICE'}{i.level ? ` L${i.level}` : ''}</span>
                      <span class="dim">{i.shell ? `${i.shell.type === 'none' ? 'no shell' : `${i.shell.type} ${i.shell.points}`}, core ${i.core}` : 'probe to see'}</span>
                    </div>
                  ))}
                  {sel.sneakChance !== null && sel.state === 'hostile' && (
                    <div class="sneak-meter" data-tip="Sneak chance: mask chip + stealth programs − ICE perception − alert level.">
                      <span class="dim">sneak <GuideLink section="nodes" label="Nodes and approach" /></span>
                      <Bar value={sel.sneakChance} max={100} color={sel.sneakChance >= 60 ? 'var(--lime)' : sel.sneakChance >= 35 ? 'var(--amber)' : 'var(--red)'} />
                      <b class="num">{Math.round(sel.sneakChance)}%</b>
                    </div>
                  )}
                </div>
              )}

              {sel.useLabel && <div class="dim" style={{ fontSize: '0.867rem' }}>Device: <span class="c-cyan">{sel.useLabel}</span></div>}
              <LootList engine={e} node={sel} />

              {general && <div class="np-why c-amber">{general}</div>}
              {actions.length > 0 ? (
                <div class="np-actions">
                  {actions.map((a) => (
                    <Btn
                      class={a.type === 'run/breach' ? 'hot' : a.type === 'run/capture' || a.type === 'run/loot' ? 'primary' : ''}
                      ui={`node-${a.type.slice(4)}`}
                      action={{ type: a.type, node: sel.id } as Action}
                      tip={`${NODE_ACTION_TIP[a.type]}${a.type === 'run/sneak' && sel.sneakChance !== null ? `\nChance: ${Math.round(sel.sneakChance)}%` : ''}${a.type === 'run/use' && sel.useLabel ? `\n${sel.useLabel}` : ''}`}
                    >
                      <span>{NODE_ACTION_LABEL[a.type]}{a.type === 'run/sneak' && sel.sneakChance !== null ? ` ${Math.round(sel.sneakChance)}%` : ''}</span>
                      <Kbd>{KEY_OF[a.type]}</Kbd>
                    </Btn>
                  ))}
                </div>
              ) : (
                !general && <div class="np-why" data-ui="node-empty">{emptyText(v, sel)}</div>
              )}
              {actions.some((a) => a.reason) && (
                <ul class="np-why" style={{ margin: 0, paddingLeft: '14px' }}>
                  {actions.filter((a) => a.reason && a.reason !== 'not adjacent to a cleared node' && a.reason !== 'node not discovered').map((a) => (
                    <li>{NODE_ACTION_LABEL[a.type]}: {a.reason}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
        <div class="np-foot">
          <Btn class="danger" ui="jack-out" action={{ type: 'run/jackOut' }} tip="Free outside a fight. You keep your paydata.">
            {label('jackOut', hud(e, 'jackOut'))} <Kbd>h</Kbd>
          </Btn>
          <span class="faint" style={{ fontSize: '0.867rem', alignSelf: 'center' }}>arrows move, letters act</span>
        </div>
      </aside>
    </div>
  );
}

const FILE_KIND: Record<string, string> = { paydata: 'paydata', program: 'program', address: 'address', item: 'key', lore: 'lore', coin: '$HODL', credits: 'credits' };

/** Files still on a node. Shown once you can see inside: probed, cleared, captured, or sneaked past. */
function LootList(p: { engine: Engine; node: NodeView }) {
  const e = p.engine;
  const n = p.node;
  const run = e.state.run;
  if (!run) return null;
  const sys = e.content.systems[run.system] ?? e.state.world.procSystems[run.system];
  const nd = sys?.nodes.find((x) => x.id === n.id);
  if (!nd?.files?.length) return null;
  const visible = n.probed || n.state === 'open' || n.state === 'cleared' || n.state === 'captured' || n.state === 'asleep';
  const looted = e.state.world.systems[run.system]?.looted ?? [];
  const left = nd.files.filter((f) => !looted.includes(f.id));
  if (!visible) return <div class="np-why">Files: {nd.files.length} inside. Probe or clear the node to see them.</div>;
  if (!left.length) return <div class="np-why">Files: all taken.</div>;
  return (
    <div class="stack" style={{ gap: '4px' }} data-ui="node-files">
      <div class="h-sub">Files here</div>
      {left.map((f) => (
        <div class="hstack" style={{ justifyContent: 'space-between', fontSize: '0.867rem' }}>
          <span>{f.name}</span>
          <span class="hstack" style={{ gap: '4px' }}>
            {f.encrypted ? <span class="tag c-violet">encrypted</span> : null}
            {f.tagged ? <span class="tag c-red">tagged</span> : null}
            <span class="tag c-cyan">{FILE_KIND[f.kind] ?? f.kind}{f.kind === 'paydata' && f.value ? ` ${f.value}¤` : ''}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** What the panel says on a node with nothing to do: it is empty, and what lies beyond it. */
function emptyText(v: MapView, n: NodeView): string {
  const beyond = n.links.map((id) => v.nodes.find((x) => x.id === id)).filter((x): x is NodeView => !!x && x.id !== v.position);
  const names = beyond.filter((x) => x.revealed).map((x) => x.name);
  const hidden = beyond.filter((x) => !x.revealed).length;
  const where = [...names, ...(hidden ? [`${hidden} unknown`] : [])];
  return `Empty. Nothing to do here; you pass through it automatically.${where.length ? ` Beyond it: ${where.join(', ')}.` : ''}`;
}
