// Rep, perks, implants; and the stats page.
import { select, type Engine } from '../../../engine/index.ts';
import { ui } from '../../game.ts';
import { Bar } from '../../components/common.tsx';
import { descr, flavor, money } from '../../copy.ts';

export function RepPanel(p: { engine: Engine }) {
  const e = p.engine;
  const xp = select.xpProgress(e);
  const pl = e.state.player;
  return (
    <div class="stack">
      <section class="win">
        <div class="win-body stack">
          <div class="hstack" style={{ justifyContent: 'space-between' }}>
            <span class="h-panel">Rep {xp.rep}</span>
            <span class="dim">{xp.xp} xp{xp.next ? ` / ${xp.next}` : ' (max)'}</span>
          </div>
          <Bar value={xp.xp - xp.current} max={Math.max(1, (xp.next ?? xp.xp) - xp.current)} color="var(--pink)" thick label="Progress to next rep" />
          <div class="faint" style={{ fontSize: '0.867rem' }}>Perks at rep 2, 4, 6, 8 and 10. Jobs, ICE, captures and owning systems give xp.</div>
          {pl.pendingPerks && (
            <button class="btn hot big" data-ui="perk-open" onClick={() => ui.set({})}>
              A perk is waiting. Pick it now.
            </button>
          )}
        </div>
      </section>
      <section class="win">
        <div class="win-head"><h2 class="h-sub">Perks</h2></div>
        {pl.perks.length === 0 ? <div class="empty">No perks yet. Reach rep 2.</div> : (
          <div class="list">
            {pl.perks.map((id) => {
              const d = e.content.perks[id];
              return (
                <div class="row" style={{ gridTemplateColumns: '1fr' }}>
                  <div class="row-title c-pink">{d?.name ?? id}</div>
                  <div class="row-meta">{descr(e, d?.description)}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section class="win">
        <div class="win-head"><h2 class="h-sub">Implants</h2><span class="dim" style={{ fontSize: '0.867rem' }}>humanity {pl.humanity}</span></div>
        {pl.implants.length === 0 ? <div class="empty">All original parts. Doc would like to change that.</div> : (
          <div class="list">
            {pl.implants.map((id) => {
              const d = e.content.implants[id];
              return (
                <div class="row" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div>
                    <div class="row-title">{d?.name ?? id}</div>
                    <div class="row-meta">{descr(e, d?.description)}</div>
                    {flavor(e, d?.flavor) && <div class="row-meta">{flavor(e, d?.flavor)}</div>}
                  </div>
                  <span class="tag c-pink">−{d?.humanity ?? 0}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function StatsPanel(p: { engine: Engine }) {
  const e = p.engine;
  const st = e.state.stats;
  const m = e.meta();
  const owned = Object.entries(e.state.world.systems).filter(([, v]) => v.owned).map(([id]) => e.content.systems[id]?.name ?? e.state.world.procSystems[id]?.name ?? id);
  const rows: [string, string | number][] = [
    ['Control', `${select.controlPct(e)}%`],
    ['Systems owned', owned.length],
    ['Runs', st.runs],
    ['Fights won', st.fightsWon],
    ['Fights lost', st.fightsLost],
    ['Disengaged', st.disengages],
    ['Dumped', st.dumped],
    ['Traced', st.traced],
    ['Flatlines (this save)', st.flatlines],
    ['Flatlines (ever)', m.flatlines],
    ['Checkpoint reloads (ever)', m.reloads],
    ['Raids won / lost', `${st.raidsWon} / ${st.raidsLost}`],
    ['Credits earned', money(st.creditsEarned)],
    ['Programs run', st.programsRun],
    ['Hosts burned', st.hostsBurned],
    ['Cycles', e.state.cycle],
    ['Endings seen', m.endings.length ? m.endings.join(', ') : 'none'],
  ];
  const bySys = Object.entries(st.cyclesBySystem).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div class="grid-2">
      <section class="win">
        <div class="win-body">
          <dl class="kv" style={{ fontSize: '0.867rem', gap: '6px 18px' }}>
            {rows.map(([k, v]) => [<dt>{k}</dt>, <dd class="num">{v}</dd>])}
          </dl>
        </div>
      </section>
      <section class="win">
        <div class="win-head"><h2 class="h-sub">Where your cycles went</h2></div>
        <div class="win-body stack" style={{ gap: '8px' }}>
          {bySys.length === 0 ? <div class="dim">Nowhere yet.</div> : bySys.map(([id, c]) => (
            <div>
              <div class="hstack" style={{ justifyContent: 'space-between', fontSize: '0.867rem' }}>
                <span>{e.content.systems[id]?.address ?? e.state.world.procSystems[id]?.address ?? id}</span>
                <span class="dim">{c}</span>
              </div>
              <Bar value={c} max={bySys[0][1]} color="var(--cyan)" />
            </div>
          ))}
          {owned.length > 0 && <div class="dim" style={{ fontSize: '0.867rem', marginTop: '8px' }}>Owned: {owned.join(', ')}</div>}
        </div>
      </section>
    </div>
  );
}
