// Files: paydata (sell, decrypt, clean), keys and passwords, lore.
import { useState } from 'preact/hooks';
import { select, type Engine } from '../../../engine/index.ts';
import { Btn } from '../../components/common.tsx';
import { money, descr, flavor } from '../../copy.ts';

function loreText(e: Engine, id: string): { name: string; text: string } {
  for (const sys of [...Object.values(e.content.systems), ...Object.values(e.state.world.procSystems)]) {
    for (const n of sys.nodes) for (const f of n.files ?? []) if (f.id === id) return { name: f.name, text: f.text ?? '' };
  }
  return { name: id, text: '' };
}

export function FilesPanel(p: { engine: Engine }) {
  const e = p.engine;
  const pd = select.paydataView(e);
  const items = e.state.player.items;
  const lore = e.state.player.lore;
  const [open, setOpen] = useState<string | null>(null);
  const total = pd.reduce((a, x) => a + x.saleValue, 0);
  return (
    <div class="stack">
      <section class="win">
        <div class="win-head">
          <h2 class="h-sub">Paydata</h2>
          <Btn class="money small" ui="sell-all" action={{ type: 'paydata/sellAll' }} blocked={pd.length ? null : 'no paydata'}>Sell all {money(total)}</Btn>
        </div>
        {pd.length === 0 ? <div class="empty">No paydata. Loot a datastore.</div> : (
          <div class="list">
            {pd.map((x) => (
              <div class="row" data-ui={`paydata-${x.uid}`}>
                <div>
                  <div class="row-title">
                    {x.name}{' '}
                    {x.encrypted > 0 && <span class="tag c-violet" data-tip={`Encrypted (strength ${x.encrypted}). Sells for 25% until decrypted. You need a decrypt program of strength ${x.encrypted}.`}>encrypted {x.encrypted}</span>}{' '}
                    {x.tagged && <span class="tag c-red" data-tip="Tagged: selling it adds heat unless you clean it first.">tagged</span>}{' '}
                    {x.jobTarget && <span class="tag c-pink" data-tip="A job wants this file. Turning in the job consumes it.">job</span>}
                  </div>
                  <div class="row-meta">from {e.content.systems[x.system]?.address ?? e.state.world.procSystems[x.system]?.address ?? x.system}, worth <span class="c-amber">{money(x.saleValue)}</span>{x.encrypted ? ` (${money(x.value)} decrypted)` : ''}</div>
                </div>
                <div class="row-actions">
                  {x.encrypted > 0 && <Btn class="small" ui={`decrypt-${x.uid}`} action={{ type: 'paydata/decrypt', uid: x.uid }} blocked={x.canDecrypt ? null : `needs decrypt strength ${x.encrypted} (you have ${select.decryptStrength(e)})`}>Decrypt</Btn>}
                  {x.tagged && <Btn class="small" ui={`clean-${x.uid}`} action={{ type: 'paydata/clean', uid: x.uid }} blocked={e.state.player.credits < x.cleanCost ? `needs ${money(x.cleanCost)}` : null}>Clean {money(x.cleanCost)}</Btn>}
                  <Btn class="money small" ui={`sell-${x.uid}`} action={{ type: 'paydata/sell', uid: x.uid }} tip={x.jobTarget ? 'A job wants this file. Selling it means you cannot deliver it.' : undefined}>Sell</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section class="win">
        <div class="win-head"><h2 class="h-sub">Keys, passwords, exploits</h2></div>
        {items.length === 0 ? <div class="empty">Nothing on your keyring.</div> : (
          <div class="list">
            {items.map((id) => {
              const it = e.content.items[id];
              return (
                <div class="row" data-ui={`item-${id}`}>
                  <div>
                    <div class="row-title">{it?.name ?? id} <span class="tag c-cyan">{it?.kind ?? 'item'}</span></div>
                    <div class="row-meta">{descr(e, it?.description)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section class="win">
        <div class="win-head"><h2 class="h-sub">Lore</h2><span class="faint" style={{ fontSize: '0.867rem' }}>{lore.length}</span></div>
        {lore.length === 0 ? <div class="empty">No documents yet. Systems are full of other people's mail.</div> : (
          <div class="list">
            {lore.slice().reverse().map((id) => {
              const l = loreText(e, id);
              const isOpen = open === id;
              return (
                <div class="row" style={{ gridTemplateColumns: '1fr' }} data-ui={`lore-${id}`}>
                  <button class="btn ghost" style={{ justifyContent: 'flex-start' }} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)}>
                    {isOpen ? '▾' : '▸'} {l.name}
                  </button>
                  {isOpen && <div class="msg-body" style={{ padding: '4px 10px 8px' }}>{flavor(e, l.text) ?? l.text}</div>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
