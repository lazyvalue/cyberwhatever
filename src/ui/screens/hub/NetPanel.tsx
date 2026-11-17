// Address book: well-known vs discovered addresses, tier, owner, notes, status, dial in.
import { useRef, useState } from 'preact/hooks';
import { select, type Engine, type SystemDef } from '../../../engine/index.ts';
import { ui } from '../../game.ts';
import { Btn } from '../../components/common.tsx';
import { hud, descr, label, fillState } from '../../copy.ts';
import { useCanvas } from '../../canvas/ticker.ts';
import { drawMap, type MapNode, type Particle } from '../../canvas/mapRenderer.ts';
import { reducedMotion } from '../../settings.ts';

type Entry = ReturnType<typeof select.addressBook>[number];

function group(e: Entry): 'known' | 'found' | 'iot' | 'endless' {
  if (e.source === 'endless') return 'endless';
  if (e.procedural) return 'iot';
  return /^(file|netscan|vendor|job|endless)/.test(e.source) ? 'found' : 'known';
}

function sourceText(engine: Engine, src: string): string {
  if (src === 'well-known') return 'Public address.';
  if (src === 'story') return 'Given to you.';
  const [k, v] = src.split(':');
  if (k === 'file') return `Found in a file (${v}).`;
  if (k === 'netscan') return `Found by netscan from ${engine.content.systems[v]?.address ?? v}.`;
  if (k === 'vendor') return `Bought from ${engine.content.vendors[v]?.name ?? v}.`;
  if (k === 'job') return `From the job "${engine.content.jobs[v]?.title ?? v}".`;
  if (k === 'endless') return 'Generated (Endless).';
  if (engine.content.npcs[src]) return `From ${engine.content.npcs[src].name}.`;
  return src;
}

export function sysDef(engine: Engine, id: string): SystemDef | undefined {
  return engine.content.systems[id] ?? engine.state.world.procSystems[id];
}

export function MiniMap(p: { engine: Engine; system: string }) {
  const def = sysDef(p.engine, p.system);
  const prog = p.engine.state.world.systems[p.system];
  const particles = useRef<Particle[]>([]).current;
  const nodes: MapNode[] = (def?.nodes ?? []).map((n) => {
    const revealed = !!prog?.owned || !!prog?.revealed.includes(n.id) || n.type === 'gateway';
    return {
      id: n.id, x: n.x, y: n.y, type: revealed ? (n.type === 'honeypot' ? 'datastore' : n.type) : 'unknown',
      state: prog?.owned ? 'captured' : 'hostile', revealed, accessible: true,
      links: n.links, ice: n.ice?.length ?? 0, black: !!n.ice?.some((i) => p.engine.content.ice[i.ice]?.black), name: n.name,
    };
  });
  const ref = useCanvas((ctx, w, h, t, dt) =>
    drawMap(ctx, w, h, t, dt, { nodes, position: null, selected: null, hover: null, alarm: 0, reduced: reducedMotion(), compact: true }, particles));
  return <canvas class="preview-map" ref={ref} aria-label={`Map of ${def?.address ?? p.system}: ${nodes.filter((n) => n.revealed).length} of ${nodes.length} nodes known`} />;
}

function Sec(p: { n: number }) {
  return (
    <span class="sec-dots" data-tip={`Security ${p.n} of 5. Adds trace every combat turn.`}>
      {[1, 2, 3, 4, 5].map((i) => <i class={i <= p.n ? 'on' : ''} />)}
    </span>
  );
}

function StatusTags(p: { e: Entry; cycle: number }) {
  const { e } = p;
  return (
    <span class="addr-status">
      {e.owned && <span class="tag c-lime" data-tip="You own this system. It is a botnet host and counts toward Control.">owned</span>}
      {e.hardened && <span class="tag c-amber" data-tip={`Hardened after a trace: ICE +1 until cycle ${e.hardenedUntil} (${e.hardenedUntil - p.cycle} cycles).`}>hardened</span>}
      {e.patch > 0 && <span class="tag c-violet" data-tip={`Patched ${e.patch}×: ICE +${e.patch} level.`}>patched +{e.patch}</span>}
      {e.gate && <span class="tag c-pink" data-tip={e.gate.text ?? `The gateway only opens under a DDoS: botnet power ${e.gate.botnetPower} needed.`}>gate {e.gate.botnetPower}</span>}
    </span>
  );
}

export function NetPanel(p: { engine: Engine }) {
  const e = p.engine;
  const book = select.addressBook(e);
  const [sel, setSel] = useState<string | null>(null);
  const current = book.find((b) => b.system === sel) ?? book.find((b) => !b.owned && !b.jackIn) ?? book[0];
  const groups: { id: 'known' | 'found' | 'iot' | 'endless'; title: string }[] = [
    { id: 'endless', title: 'Endless targets' },
    { id: 'known', title: 'Well-known' },
    { id: 'found', title: 'Discovered' },
    { id: 'iot', title: 'IoT junk' },
  ];
  const order = (a: Entry, b: Entry) => Number(a.owned) - Number(b.owned) || a.tier - b.tier || a.address.localeCompare(b.address);

  if (!book.length) return <div class="empty">No addresses yet. Someone will send you one.</div>;

  return (
    <div class="addr-grid">
      <div class="stack">
        {e.state.endless && <EndlessButton engine={e} book={book} />}
        {groups.map((g) => {
          const list = book.filter((b) => group(b) === g.id).sort(order);
          if (!list.length) return null;
          return (
            <section class="win" aria-label={g.title}>
              <div class="win-head"><h2 class="h-sub">{g.title}</h2><span class="faint" style={{ fontSize: '0.867rem' }}>{list.length}</span></div>
              <div class="list" role="listbox" aria-label={g.title}>
                {list.map((b) => (
                  <div
                    role="option"
                    tabIndex={0}
                    aria-selected={current?.system === b.system}
                    class={`row addr-row ${current?.system === b.system ? 'sel' : ''}`}
                    data-ui={`addr-${b.system}`}
                    onClick={() => setSel(b.system)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        setSel(b.system);
                      }
                    }}
                  >
                    <span class="tier" data-tip={`Tier ${b.tier}`}>{b.tier > 5 ? '∞' : b.tier}</span>
                    <span>
                      <div class="addr">{b.address}</div>
                      <div class="owner">{b.name}, {b.owner}</div>
                    </span>
                    <span class="stack" style={{ gap: '4px', alignItems: 'flex-end' }}>
                      <Sec n={b.security} />
                      <StatusTags e={b} cycle={e.state.cycle} />
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {current && (
        <section class="win" aria-label={`Details for ${current.address}`} style={{ position: 'sticky', top: '0' }}>
          <div class="win-head">
            <div>
              <div class="h-panel">{current.name}</div>
              <div class="dim" style={{ fontSize: '0.867rem' }}>{current.address}</div>
            </div>
            <StatusTags e={current} cycle={e.state.cycle} />
          </div>
          <div class="win-body stack">
            <Btn
              class="primary big"
              ui="jack-in"
              action={{ type: 'hub/jackIn', system: current.system }}
              tip={`Connect to ${current.address}. The game saves a checkpoint first.`}
              onClick={() => ui.set({ selectedNode: null })}
            >
              {label('jackIn', hud(e, 'jackIn'))} <span class="faint">{current.address}</span>
            </Btn>
            <MiniMap engine={e} system={current.system} />
            <p style={{ margin: 0 }}>{descr(e, current.description)}</p>
            {current.runs > 0 && current.motd && (
              <div class="motd-static" data-ui="addr-motd"><span class="motd-k">login banner</span>{fillState(e, current.motd)}</div>
            )}
            <dl class="kv">
              <dt>owner</dt><dd>{current.owner}</dd>
              <dt>tier</dt><dd>{current.tier > 5 ? '∞' : current.tier}</dd>
              <dt>security</dt><dd><Sec n={current.security} /></dd>
              <dt>runs</dt><dd>{current.runs}</dd>
              <dt>source</dt><dd>{sourceText(e, current.source)}</dd>
            </dl>
            {current.notes.length > 0 && (
              <div>
                <div class="h-sub" style={{ marginBottom: '4px' }}>Notes</div>
                {current.notes.map((n) => <div class="dim" style={{ fontSize: '0.867rem' }}>{n}</div>)}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/** Endless mode (after RETENTION): procedural systems forever. Harder the more of them you own. */
function EndlessButton(p: { engine: Engine; book: Entry[] }) {
  const open = p.book.filter((b) => b.source === 'endless' && !b.owned).length;
  return (
    <Btn
      class="hot big"
      ui="endless-generate"
      action={{ type: 'endless/generate' }}
      blocked={open >= 3 ? `you already have ${open} open targets. Take one first.` : null}
      tip="Endless mode: a new system to take. Harder the more of them you own."
    >
      New target <span class="faint">Endless</span>
    </Btn>
  );
}
