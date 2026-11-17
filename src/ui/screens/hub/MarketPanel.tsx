// Market: one tab per vendor from content. Hardware, warez, clinic, broker, fixer services.
import { useEffect, useState } from 'preact/hooks';
import { select, type Engine, type VendorDef } from '../../../engine/index.ts';
import { ui } from '../../game.ts';
import { Btn, Portrait } from '../../components/common.tsx';
import { CATEGORY_COLOR, descr, npcName, tierOf, money, fillState } from '../../copy.ts';
import { PART_INFO, reqText, progStats } from './DeckPanel.tsx';

const KIND_BLURB: Record<VendorDef['kind'], string> = {
  hardware: 'Deck parts. One tier at a time.',
  warez: 'Programs. Some of them work.',
  clinic: 'Implants and neural repair. Implants cost humanity.',
  broker: 'Addresses, passwords, and information.',
  fixer: 'Fence paydata, scrub heat, repair programs, take jobs.',
};

function vendorVisible(e: Engine, v: VendorDef): boolean {
  if (!v.cond) return true;
  try {
    return select.evalCond(e, v.cond);
  } catch {
    return true;
  }
}

// Greeting dialogue per vendor kind (story convention); any `dlg.<npc>.greet` also works.
const GREET_BY_KIND: Record<string, string> = {
  fixer: 'dlg.auntie.board_greet', hardware: 'dlg.kiosk.greet', warez: 'dlg.ratking.greet', clinic: 'dlg.doc.greet', broker: 'dlg.whisper.greet',
};

export function greetDialogue(e: Engine, v: VendorDef): string | null {
  const byNpc = v.npc ? `dlg.${v.npc}.greet` : null;
  for (const id of [byNpc, GREET_BY_KIND[v.kind]]) if (id && e.content.dialogues[id]) return id;
  if (!v.npc) return null;
  return Object.values(e.content.dialogues).find((d) => d.speaker === v.npc && /greet/i.test(d.id))?.id ?? null;
}

function greeting(e: Engine, v: VendorDef): { text: string; dialogue: string | null; speaker: string } {
  const id = greetDialogue(e, v);
  const dlg = id ? e.content.dialogues[id] : null;
  if (!dlg) return { text: v.npc ? e.content.npcs[v.npc]?.description ?? KIND_BLURB[v.kind] : KIND_BLURB[v.kind], dialogue: null, speaker: v.npc ?? v.kind };
  const node = dlg ? dlg.nodes[dlg.start] : null;
  const cold = tierOf(e) !== 'warm';
  const text = node ? (cold && node.textCold ? node.textCold : node.text) : KIND_BLURB[v.kind];
  return { text: fillState(e, text.split('\n')[0]), dialogue: dlg.id, speaker: node?.speaker ?? dlg.speaker };
}

export function MarketPanel(p: { engine: Engine }) {
  const e = p.engine;
  const vendors = Object.values(e.content.vendors).filter((v) => vendorVisible(e, v));
  const [vid, setVid] = useState(vendors[0]?.id ?? '');
  const v = vendors.find((x) => x.id === vid) ?? vendors[0];
  if (!v) return <div class="empty">Nobody is selling anything right now.</div>;
  const g = greeting(e, v);
  const stock = select.vendorStock(e, v.id);
  // the greeting dialogue opens by itself only until the player has met the vendor (story flag `met_*`);
  // after that the hello line stays inline and the Talk button opens the dialogue
  useEffect(() => {
    if (!g.dialogue || ui.get().greeted.includes(v.id)) return;
    if (e.state.story.flags[v.kind === 'fixer' ? 'met_board' : `met_${v.npc}`]) return;
    ui.set((st) => ({ greeted: [...st.greeted, v.id] }));
    if (select.canDo(e, { type: 'dialogue/start', dialogue: g.dialogue }).ok) e.dispatch({ type: 'dialogue/start', dialogue: g.dialogue });
  }, [v.id]);

  return (
    <div class="stack">
      <div class="vendor-tabs" role="tablist" aria-label="Vendors">
        {vendors.map((x) => (
          <button role="tab" aria-selected={x.id === v.id} class={`btn small ${x.id === v.id ? 'primary' : ''}`} data-ui={`vendor-${x.id}`} onClick={() => setVid(x.id)}>
            {x.name}
          </button>
        ))}
      </div>
      <div class="vendor-hello">
        <Portrait id={g.speaker} />
        <div>
          <div class="h-panel" style={{ fontSize: '1.2rem' }}>{v.name}{e.content.npcs[g.speaker] ? <span class="dim" style={{ fontSize: '0.867rem', fontFamily: 'var(--font-mono)' }}> {npcName(e, g.speaker)}</span> : null}</div>
          <q>{g.text}</q>
        </div>
        {g.dialogue && <Btn class="small" ui={`talk-${v.id}`} action={{ type: 'dialogue/start', dialogue: g.dialogue }}>Talk</Btn>}
      </div>

      {v.kind === 'clinic' && <ClinicServices engine={e} />}
      {v.kind === 'fixer' && <FixerServices engine={e} />}

      <section class="win">
        <div class="win-head"><h2 class="h-sub">For sale</h2><span class="faint" style={{ fontSize: '0.867rem' }}>credits: <span class="c-amber">{money(e.state.player.credits)}</span></span></div>
        {v.kind === 'hardware' ? <HardwareStock engine={e} vendor={v.id} stock={stock} /> : (
          stock.length === 0 ? <div class="empty">Sold out. Come back later.</div> : (
            <div class="list">
              {stock.map((s) => {
                const prog = s.kind === 'program' && s.ref ? e.content.programs[s.ref] : null;
                const owned = s.reason === 'owned' || s.reason === 'already owned' || s.reason === 'installed';
                return (
                  <div class="row" data-ui={`stock-${s.id}`} style={owned ? { opacity: 0.55 } : undefined}>
                    <div>
                      <div class="row-title prog-chip">
                        {prog && <span class="cat-dot" style={{ background: CATEGORY_COLOR[prog.category] }} />}
                        {s.name}
                        {s.kind === 'implant' && s.ref && e.content.implants[s.ref] && (
                          <span class="tag c-pink" data-tip="Humanity cost">−{e.content.implants[s.ref].humanity} humanity</span>
                        )}
                      </div>
                      {prog && <div class="row-meta">{prog.category}: {progStats(prog)}</div>}
                      <div class="row-meta" style={{ color: 'var(--ink)' }}>{descr(e, s.description)}</div>
                      {prog && reqText(e, prog) && <div class="row-meta c-amber">{reqText(e, prog)}</div>}
                    </div>
                    <div class="row-actions">
                      <Btn class="money small" ui={`buy-${s.id}`} action={{ type: 'shop/buy', vendor: v.id, stock: s.id }}>
                        {owned ? 'Owned' : `Buy ${money(s.price)}`}
                      </Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </section>

      {v.kind === 'warez' && <SellPrograms engine={e} />}
    </div>
  );
}

function HardwareStock(p: { engine: Engine; vendor: string; stock: ReturnType<typeof select.vendorStock> }) {
  const e = p.engine;
  const byPart = new Map<string, typeof p.stock>();
  for (const s of p.stock) {
    const h = e.content.hardware.find((x) => x.id === s.ref);
    if (!h) continue;
    if (h.tier <= e.state.player.hardware[h.part]) continue;
    const arr = byPart.get(h.part) ?? [];
    arr.push(s);
    byPart.set(h.part, arr);
  }
  if (!byPart.size) return <div class="empty">Your deck is maxed out. Somehow.</div>;
  return (
    <div class="list">
      {[...byPart.entries()].map(([part, list]) => {
        const next = list[0];
        const h = e.content.hardware.find((x) => x.id === next.ref)!;
        const cur = select.deck(e).find((d) => d.part === part);
        return (
          <div class="row" data-ui={`stock-${next.id}`}>
            <div>
              <div class="row-title">{next.name} <span class="dim" style={{ fontSize: '0.867rem' }}>{PART_INFO[h.part].name} tier {h.tier}</span></div>
              <div class="row-meta">{PART_INFO[h.part].stat}: {cur?.value} → <span class="c-cyan">{h.value}</span></div>
              <div class="row-meta" style={{ color: 'var(--ink)' }}>{descr(e, next.description)}</div>
              {list.length > 1 && <div class="row-meta faint">Later: {list.slice(1).map((x) => x.name).join(', ')}</div>}
            </div>
            <div class="row-actions">
              <Btn class="money small" ui={`buy-${next.id}`} action={{ type: 'shop/buy', vendor: p.vendor, stock: next.id }}>Buy {money(next.price)}</Btn>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClinicServices(p: { engine: Engine }) {
  const e = p.engine;
  const cost = select.neuralHealCost(e);
  const max = select.deckStat(e, 'neural');
  return (
    <section class="win">
      <div class="win-body hstack" style={{ justifyContent: 'space-between' }}>
        <span>Neural <span class={e.state.player.neural < max ? 'c-red' : 'c-lime'}>{e.state.player.neural}/{max}</span>. Only black ICE hurts it. It does not heal by itself.</span>
        <Btn class="money" ui="clinic-heal" action={{ type: 'clinic/healNeural' }} blocked={cost <= 0 ? 'neural is full' : null}>Heal {money(cost)}</Btn>
      </div>
    </section>
  );
}

function FixerServices(p: { engine: Engine }) {
  const e = p.engine;
  const per = select.scrubCostPerPoint(e);
  const heat = Math.ceil(e.state.player.heat);
  const pd = select.paydataView(e);
  const total = pd.reduce((a, x) => a + x.saleValue, 0);
  const corrupted = Object.entries(e.state.player.programs).filter(([, v]) => v.corrupted).map(([id]) => id);
  return (
    <section class="win">
      <div class="win-body stack">
        <div class="hstack" style={{ justifyContent: 'space-between' }}>
          <span>Fence: {pd.length} paydata worth {money(total)}{pd.some((x) => x.tagged) ? ', some tagged (+heat)' : ''}.</span>
          <span class="hstack">
            <button class="btn small" onClick={() => ui.set({ tab: 'files' })}>Review</button>
            <Btn class="money" ui="sell-all" action={{ type: 'paydata/sellAll' }} blocked={pd.length ? null : 'no paydata'}>Sell all</Btn>
          </span>
        </div>
        <div class="hstack" style={{ justifyContent: 'space-between' }}>
          <span>Heat scrub: {per}¤ per point. Heat now {heat}.</span>
          <span class="hstack">
            {[5, 10].map((n) => (
              <Btn class="small" ui={`scrub-${n}`} action={{ type: 'fixer/scrubHeat', amount: n }} blocked={heat < 1 ? 'no heat' : e.state.player.credits < per * n ? `needs ${per * n}¤` : null}>−{n} ({per * n}¤)</Btn>
            ))}
            <Btn class="small" ui="scrub-all" action={{ type: 'fixer/scrubHeat', amount: heat }} blocked={heat < 1 ? 'no heat' : e.state.player.credits < per * heat ? `needs ${per * heat}¤` : null}>all ({per * heat}¤)</Btn>
          </span>
        </div>
        {corrupted.map((id) => (
          <div class="hstack" style={{ justifyContent: 'space-between' }}>
            <span>Repair <b>{e.content.programs[id]?.name ?? id}</b> (corrupted)</span>
            <Btn class="money small" ui={`repair-${id}`} action={{ type: 'program/repair', program: id }}>{money(select.repairCost(e, id))}</Btn>
          </div>
        ))}
        <div class="hstack" style={{ justifyContent: 'space-between' }}>
          <span>Jobs are on the fixer board.</span>
          <button class="btn small" onClick={() => ui.set({ tab: 'jobs' })}>Open board</button>
        </div>
      </div>
    </section>
  );
}

function SellPrograms(p: { engine: Engine }) {
  const e = p.engine;
  const owned = Object.keys(e.state.player.programs).filter((id) => e.content.programs[id]);
  return (
    <section class="win">
      <div class="win-head"><h2 class="h-sub">Sell your programs</h2><span class="faint" style={{ fontSize: '0.867rem' }}>unload first</span></div>
      <div class="list">
        {owned.map((id) => {
          const d = e.content.programs[id];
          const val = d.sellValue ?? Math.round(d.price * 0.4);
          return (
            <div class="row">
              <div><div class="row-title">{d.name}</div><div class="row-meta">{d.category}</div></div>
              <div class="row-actions">
                <Btn class="small" ui={`sell-${id}`} action={{ type: 'shop/sellProgram', program: id }} blocked={e.state.player.loadout.includes(id) ? 'loaded: unload it first' : val <= 0 ? 'worthless' : null}>
                  Sell {money(val)}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
