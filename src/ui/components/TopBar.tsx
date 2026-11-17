// Persistent top bar: who you are, what you have, how hot you are, how much of cyberspace is yours.
import type { ComponentChildren } from 'preact';
import { select, type Engine } from '../../engine/index.ts';
import { audio } from '../../audio/index.ts';
import { ui, toggleLog, openGuide } from '../game.ts';
import { contextSection } from '../overlays/Guide.tsx';
import { hud, label, HEAT_BANDS, fillState } from '../copy.ts';
import { Icon } from './common.tsx';
import { useSubscribe } from '../store.ts';
import { metaUiState } from '../metaBridge.ts';

export function objectiveHint(e: Engine): string {
  const f = e.state.story.flags.objective;
  if (typeof f === 'string' && f) return fillState(e, f);
  const objs = select.objectivesView(e).filter((o) => o.status === 'active' && o.kind !== 'tutorial');
  const main = objs.find((o) => o.kind === 'main');
  const jobs = select.jobsView(e);
  if (main) return fillState(e, main.text);
  const ready = jobs.find((j) => j.status === 'ready');
  if (ready) return `Turn in "${ready.title}" on the fixer board.`;
  const active = jobs.find((j) => j.status === 'active');
  if (active) {
    const i = active.objectivesDone.findIndex((d) => !d);
    return i >= 0 ? active.objectives[i].text : active.title;
  }
  const avail = jobs.find((j) => j.status === 'available');
  if (avail) return `New job on the board: "${avail.title}".`;
  return '';
}

function Cell(p: { k: string; ui: string; tip: string; children: ComponentChildren; class?: string; onClick?: () => void }) {
  const Tag = p.onClick ? 'button' : 'div';
  return (
    <Tag class={`tb-cell ${p.class ?? ''}`} data-ui={`topbar-${p.ui}`} data-tip={p.tip} tabIndex={p.onClick ? undefined : 0} onClick={p.onClick}>
      <span class="k">{p.k}</span>
      <span class="v">{p.children}</span>
    </Tag>
  );
}

export function TopBar(p: { engine: Engine }) {
  useSubscribe(audioSub);
  const e = p.engine;
  const s = e.state;
  const pl = s.player;
  const xp = select.xpProgress(e);
  const heatLvl = select.heatLevel(pl.heat);
  const band = HEAT_BANDS[heatLvl];
  const eco = select.economyView(e);
  const control = select.controlPct(e);
  const obj = objectiveHint(e);
  const muted = audio.isMuted();
  const m = metaUiState();
  const glitchy = m.glitch > 0.5;
  const handle = label('handle', select.displayHandle(e));
  const hist = eco.coinHistory;
  const prev = hist.length > 1 ? hist[hist.length - 2] : eco.coinPrice;
  const up = eco.coinPrice >= prev;

  return (
    <header class="topbar" role="banner">
      <Cell k={label('handle.k', 'handle')} ui="handle" tip={`${hud(e, 'greeting')}\nFlatlines: ${pl.flatlinesTotal}`} class="tb-handle">
        {glitchy ? handle.replace(/[aeio]/g, '#') : handle}
      </Cell>
      <Cell k={label('rep.k', 'rep')} ui="rep" tip={`Rep ${xp.rep}. ${xp.xp} xp${xp.next ? ` / ${xp.next} for rep ${xp.rep + 1}` : ' (max)'}. Rep unlocks shop tiers, jobs and perks.`}>
        {xp.rep}
        <span class="faint" style={{ fontSize: '0.867rem', marginLeft: '5px' }}>{xp.next ? `${Math.floor(((xp.xp - xp.current) / Math.max(1, xp.next - xp.current)) * 100)}%` : 'max'}</span>
      </Cell>
      <Cell k={label('credits.k', 'credits')} ui="credits" tip={`Credits. Spend them on gear.${eco.frozenCredits ? `\n${eco.frozenCredits}¤ frozen.` : ''}`}>
        <span class="c-amber">{label('credits', `${pl.credits.toLocaleString('en-US')}¤`)}</span>
        {eco.frozenCredits > 0 && <span class="faint" style={{ fontSize: '0.867rem', marginLeft: '5px' }}>+{eco.frozenCredits} frozen</span>}
      </Cell>
      <Cell k={label('hodl.k', '$HODL')} ui="hodl" tip={`$HODL: ${pl.coin.toFixed(3)} coins at ${eco.coinPrice}¤ = ${eco.coinValue}¤. The price moves every 10 cycles.`}>
        {pl.coin.toFixed(2)}
        <span style={{ fontSize: '0.867rem', marginLeft: '5px', color: up ? 'var(--lime)' : 'var(--red)' }}>{up ? '▲' : '▼'}{eco.coinPrice}</span>
      </Cell>
      <Cell k={label('heat.k', 'heat')} ui="heat" onClick={() => openGuide('heat')} tip={`${hud(e, 'heatTip')}\n${band.label}: ${band.tip}\nThresholds: 25 Noticed, 50 Hunted, 75 Burned, 100 Raid.\nClick for the guide.`}>
        <span style={{ color: heatLvl === 'cool' ? 'var(--ink)' : heatLvl === 'noticed' ? 'var(--amber)' : 'var(--red)' }}>
          {Math.round(pl.heat)} <span style={{ fontSize: '0.867rem', fontWeight: 500 }}>{band.label}</span>
        </span>
        <span class="heat-meter"><i style={{ width: `${Math.min(100, pl.heat)}%`, background: pl.heat >= 50 ? 'var(--red)' : 'var(--amber)' }} /></span>
      </Cell>
      <Cell k={label('humanity.k', 'humanity')} ui="humanity" tip={`${hud(e, 'humanityTip')}\nBelow 40 the world gets colder. Below 20 it calls you UNIT.`}>
        <span style={{ color: pl.humanity < 20 ? 'var(--red)' : pl.humanity < 40 ? 'var(--amber)' : 'var(--ink)' }}>{pl.humanity}</span>
      </Cell>
      <Cell k={label('control.k', 'control')} ui="control" tip="Control: your weighted share of every capturable system. It is the goal. It is also the trap.">
        <span class="c-lime">{label('control', `${control}%`)}</span>
      </Cell>
      <Cell k={label('cycle.k', 'cycle')} ui="cycle" tip="The world clock. One cycle passes per node action and per combat turn. Nothing passes at home.">
        {s.cycle}
      </Cell>
      {obj && (
        <Cell k={label('objective.k', 'next')} ui="objective" tip={obj} class="tb-objective" onClick={() => ui.set({ phase: 'game', tab: 'jobs' })}>
          {label('objective', obj)}
        </Cell>
      )}
      <div class="tb-tools">
        <button
          class="btn ghost small"
          data-ui="topbar-mute"
          data-tip={muted ? 'Sound off. Click to turn it on.' : 'Sound on. Click to mute.'}
          aria-label={muted ? 'Unmute' : 'Mute'}
          onClick={() => {
            audio.unlock();
            audio.setMuted(!muted);
            audioListeners.forEach((f) => f());
          }}
        >
          <Icon name={muted ? 'mute' : 'sound'} />
        </button>
        <button class="btn ghost small guide-btn" data-ui="guide-open" data-tip="Guide: how everything works (?)" aria-label="Open the guide" onClick={() => openGuide(contextSection(e))}>
          ?
        </button>
        <button class="btn ghost small" data-ui="topbar-log" data-tip="Game log (L)" aria-label="Game log" onClick={() => toggleLog()}>
          <Icon name="log" />
        </button>
        <button class="btn ghost small" data-ui="topbar-settings" data-tip="Settings (O)" aria-label="Settings" onClick={() => ui.set({ settingsOpen: true })}>
          <Icon name="settings" />
        </button>
      </div>
    </header>
  );
}

const audioListeners = new Set<() => void>();
function audioSub(fn: () => void): () => void {
  audioListeners.add(fn);
  return () => audioListeners.delete(fn);
}
