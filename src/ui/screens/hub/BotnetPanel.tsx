// Botnet: hosts, power, roles, heat drip, charges.
import { select, BALANCE, type Engine, type HostRole } from '../../../engine/index.ts';
import { Btn } from '../../components/common.tsx';

const ROLES: { id: HostRole; name: string; tip: string }[] = [
  { id: 'idle', name: 'Idle', tip: 'Does nothing. Adds no heat.' },
  { id: 'mine', name: 'Mine', tip: 'Mines $HODL every cycle by power. Each mining host adds a slow heat drip.' },
  { id: 'botnet', name: 'Botnet', tip: 'Gives botnet charges and power for DDoS, Distributed Crack, Swarm and Bounce. Hosts can burn.' },
  { id: 'proxy', name: 'Proxy', tip: 'Cuts trace gain in runs and heat gain at home.' },
];

export function BotnetPanel(p: { engine: Engine }) {
  const e = p.engine;
  const v = select.botnetView(e);
  const mining = v.hosts.filter((h) => h.role === 'mine').length;
  const drip = mining * BALANCE.heat.miningDripPerHost;
  return (
    <div class="stack">
      <section class="stat-tiles" aria-label="Botnet summary">
        <Tile k="botnet power" v={v.botnetPower} cls="c-pink" s={`usable ${v.usablePower} of cap ${v.powerCap}`} tip="Sum of Botnet-role host power. Usable power in a fight is capped by your Uplink." />
        <Tile k="charges per run" v={v.chargesPerRun} s="one per botnet action" tip="Botnet actions per run. Each costs 1 charge. Limited by Uplink and Botnet hosts." />
        <Tile k="mining" v={v.coinPerCycle.toFixed(3)} cls="c-amber" s={`$HODL per cycle, power ${v.miningPower}`} tip="Coin mined per cycle. Cycles pass only inside systems." />
        <Tile k="heat drip" v={`+${drip.toFixed(2)}`} s="heat per cycle from mining" tip="Heat added per cycle by mining hosts. Heat also decays by itself as cycles pass." />
        <Tile k="proxy power" v={v.proxyPower} cls="c-cyan" s="less trace, less heat" tip="Proxy hosts cut trace gain in runs and heat gain at home." />
        <Tile k="hosts" v={v.hosts.length} s={`${v.hosts.filter((h) => h.role === 'idle').length} idle`} tip="Every host you own." />
      </section>
      <section class="win">
        <div class="win-head"><h2 class="h-sub">Hosts</h2></div>
        {v.hosts.length === 0 ? (
          <div class="empty">No hosts yet. Capture a system's core, or netscan from a captured router to find IoT junk.</div>
        ) : (
          <div class="list">
            {v.hosts.map((h) => (
              <div class="row" data-ui={`host-${h.uid}`}>
                <div>
                  <div class="row-title">{h.name}</div>
                  <div class="row-meta">
                    power {h.effectivePower}{h.effectivePower !== h.power ? ` (base ${h.power})` : ''}, tier {h.tier}
                    {h.system ? `, owned system ${e.content.systems[h.system]?.address ?? e.state.world.procSystems[h.system]?.address ?? h.system}` : ''}
                  </div>
                </div>
                <div class="row-actions">
                  {/\(Enterprise\)\s*$/.test(h.name) && e.content.dialogues['dlg.deacon.mind_checkup'] && (
                    <Btn class="small" ui={`host-${h.uid}-talk`} action={{ type: 'dialogue/start', dialogue: 'dlg.deacon.mind_checkup' }}>Talk</Btn>
                  )}
                  <div class="seg" role="radiogroup" aria-label={`Role for ${h.name}`}>
                    {ROLES.map((r) => (
                      h.role === r.id ? (
                        <button class={`btn small on ${r.id === 'botnet' ? 'hot' : ''}`} role="radio" aria-checked="true" data-ui={`host-${h.uid}-${r.id}`} data-tip={r.tip}>{r.name}</button>
                      ) : (
                        <Btn class="small" ui={`host-${h.uid}-${r.id}`} tip={r.tip} action={{ type: 'botnet/setRole', host: h.uid, role: r.id }}>{r.name}</Btn>
                      )
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tile(p: { k: string; v: string | number; s?: string; cls?: string; tip?: string }) {
  return (
    <div class="stat-tile" data-tip={p.tip} tabIndex={0}>
      <div class="k">{p.k}</div>
      <div class={`v ${p.cls ?? ''}`}>{p.v}</div>
      {p.s && <div class="s">{p.s}</div>}
    </div>
  );
}
