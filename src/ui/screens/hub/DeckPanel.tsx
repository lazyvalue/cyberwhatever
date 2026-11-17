// Deck hardware and program loadout.
import { select, type Engine, type HardwarePart, type ProgramDef } from '../../../engine/index.ts';
import { ui } from '../../game.ts';
import { Btn } from '../../components/common.tsx';
import { CATEGORY_COLOR, descr, flavor } from '../../copy.ts';

export const PART_INFO: Record<HardwarePart, { name: string; stat: string }> = {
  cpu: { name: 'CPU', stat: 'cycles per combat turn' },
  ram: { name: 'RAM', stat: 'program space' },
  firewall: { name: 'Firewall', stat: 'shield each turn' },
  chassis: { name: 'Chassis', stat: 'deck integrity' },
  mask: { name: 'Mask chip', stat: 'masking: less trace, better sneak' },
  uplink: { name: 'Uplink', stat: 'botnet charges and power cap' },
  storage: { name: 'Storage', stat: 'paydata slots per run' },
  neural: { name: 'Neural interface', stat: 'neural HP (black ICE only)' },
};

export function reqText(e: Engine, d: ProgramDef): string | null {
  if (!d.requires) return null;
  const miss = Object.entries(d.requires).filter(([part, tier]) => (e.state.player.hardware[part as HardwarePart] ?? 0) < (tier ?? 0));
  if (!miss.length) return null;
  return miss.map(([part, tier]) => `needs ${PART_INFO[part as HardwarePart]?.name ?? part} tier ${tier}`).join(', ');
}

export function progStats(d: ProgramDef): string {
  return [`${d.cost} cycle${d.cost === 1 ? '' : 's'}`, d.cooldown ? `cooldown ${d.cooldown}` : 'no cooldown', `noise ${d.noise}`, `${d.ram} RAM`].join(', ');
}

export function DeckPanel(p: { engine: Engine }) {
  const e = p.engine;
  const deck = select.deck(e);
  const ram = select.deckStat(e, 'ram');
  const used = select.ramUsed(e);
  const owned = Object.keys(e.state.player.programs).filter((id) => e.content.programs[id]);
  const loadout = e.state.player.loadout;
  const sorted = owned.sort((a, b) => Number(loadout.includes(b)) - Number(loadout.includes(a)) || e.content.programs[a].category.localeCompare(e.content.programs[b].category));
  return (
    <div class="stack">
      <section class="win">
        <div class="win-head">
          <h2 class="h-sub">Hardware</h2>
          <button class="btn small" onClick={() => ui.set({ tab: 'market' })}>Upgrade at the market</button>
        </div>
        <div class="win-body deck-parts">
          {deck.map((d) => (
            <div class="part" data-ui={`part-${d.part}`} data-tip={`${PART_INFO[d.part].name}: ${PART_INFO[d.part].stat}. Tier ${d.tier} of ${d.maxTier}.`}>
              <div class="hstack" style={{ justifyContent: 'space-between' }}>
                <span class="dim" style={{ fontSize: '0.867rem' }}>{PART_INFO[d.part].name}</span>
                <span class="pval">{d.value}</span>
              </div>
              <div class="pname">{d.name}</div>
              <div class="tiers">{Array.from({ length: d.maxTier + 1 }, (_, i) => <i class={i <= d.tier ? 'on' : ''} />)}</div>
              <div class="faint" style={{ fontSize: '0.867rem' }}>{PART_INFO[d.part].stat}</div>
              {flavor(e, d.flavor) && <div class="dim" style={{ fontSize: '0.867rem', marginTop: '4px' }}>{flavor(e, d.flavor)}</div>}
            </div>
          ))}
        </div>
      </section>

      <section class="win">
        <div class="win-head">
          <h2 class="h-sub">Loadout</h2>
          <span class="hstack" data-ui="ram-meter" data-tip={`RAM: ${used} of ${ram} used by loaded programs. Running daemons need their RAM again, free, during a fight.`}>
            <span class="dim" style={{ fontSize: '0.867rem' }}>RAM {used}/{ram}</span>
            <span class="ram-meter">{Array.from({ length: ram }, (_, i) => <i class={i < used ? 'used' : ''} />)}</span>
          </span>
        </div>
        <div class="list">
          {sorted.map((id) => {
            const d = e.content.programs[id];
            const loaded = loadout.includes(id);
            const corrupted = e.state.player.programs[id]?.corrupted;
            const req = reqText(e, d);
            return (
              <div class="row" style={{ gridTemplateColumns: '1fr auto' }} data-ui={`loadout-${id}`}>
                <div>
                  <div class="row-title prog-chip">
                    <span class="cat-dot" style={{ background: CATEGORY_COLOR[d.category] }} />
                    {d.name}
                    {loaded && <span class="tag c-cyan">loaded</span>}
                    {d.category === 'daemon' && <span class="tag c-amber" data-tip="Daemon: runs by itself every turn and holds RAM while it runs.">daemon</span>}
                    {corrupted && <span class="tag c-red">corrupted</span>}
                  </div>
                  <div class="row-meta">{d.category}: {progStats(d)}</div>
                  <div class="row-meta" style={{ color: 'var(--ink)' }}>{descr(e, d.description)}</div>
                  {flavor(e, d.flavor) && <div class="row-meta">{flavor(e, d.flavor)}</div>}
                  {req && <div class="row-meta c-amber">{req}</div>}
                </div>
                <div class="row-actions">
                  {corrupted ? (
                    <Btn class="money small" ui={`repair-${id}`} action={{ type: 'program/repair', program: id }}>
                      Repair {select.repairCost(e, id)}¤
                    </Btn>
                  ) : loaded ? (
                    <Btn class="small" ui={`unload-${id}`} action={{ type: 'loadout/remove', program: id }}>Unload</Btn>
                  ) : (
                    <Btn class="primary small" ui={`load-${id}`} action={{ type: 'loadout/add', program: id }}>Load</Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
