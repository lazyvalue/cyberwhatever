// Combat: ICE constructs with intents and statuses, your vitals, cycles, Flow, projected trace,
// the program bar with signature stacks, botnet actions, End Turn. Keyboard: 1-9 programs,
// Tab/arrows target, Space ends turn, Shift+1-4 botnet, Esc skips animation.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import { select, type Action, type Ctx, type Engine, type IceInstance } from '../../engine/index.ts';
import { audio } from '../../audio/index.ts';
import { ui, act, refuse, keysBlocked, openGuide } from '../game.ts';
import { GuideLink } from '../overlays/Guide.tsx';
import { IceInspector, inspectorMode, toggleInspector, baseType } from './Inspector.tsx';
import { useStore, useMedia } from '../store.ts';
import { Bar, Btn, Kbd, Pips } from '../components/common.tsx';
import { useCanvas } from '../canvas/ticker.ts';
import { drawIce } from '../canvas/iceRenderer.ts';
import { drawSkull } from '../canvas/mapRenderer.ts';
import { hud, label, scramble, CATEGORY_COLOR, ICE_STATUS_INFO, PLAYER_STATUS_INFO, BOTNET_INFO, fill, descr } from '../copy.ts';
import { reducedMotion } from '../settings.ts';
import { useSubscribe } from '../store.ts';
import { metaUiState, subscribeMetaUi } from '../metaBridge.ts';
import { fastForward } from '../fx/director.ts';
import { iceFx } from '../fx/fxStore.ts';

type CV = NonNullable<ReturnType<typeof select.combatView>>;
type IceV = CV['ice'][number];

const BOTNET_KINDS = ['ddos', 'dcrack', 'swarm', 'bounce'] as const;

function metaHud(key: string): string | null {
  const v = metaUiState().hudOverride[key];
  return typeof v === 'string' ? v : null;
}

function IntentBadge(p: { iv: IceV['intent']; black: boolean; ui?: string }) {
  const { iv } = p;
  const cls = `intent ${iv.class} ${iv.skipped ? 'skipped' : ''}`;
  const icon = (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      {iv.class === 'hostile' ? (
        <path d="M7 1 L13 12 L1 12 Z" fill="none" stroke="currentColor" stroke-width="1.5" />
      ) : iv.class === 'utility' ? (
        <path d="M7 1 L12.5 4 L12.5 10 L7 13 L1.5 10 L1.5 4 Z" fill="none" stroke="currentColor" stroke-width="1.5" />
      ) : (
        <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5" />
      )}
      <text x="7" y={iv.class === 'hostile' ? 11 : 10} text-anchor="middle" font-size="8" fill="currentColor" font-weight="700">{iv.class === 'hostile' ? '!' : iv.class === 'utility' ? '' : '?'}</text>
    </svg>
  );
  if (!iv.mapped) {
    const tip = `Intent: ${iv.class}. Map it (scan) to see exactly what it will do.${p.black ? '\nBlack ICE: it can hit your neural HP.' : ''}${iv.skipped ? `\nIt is ${iv.skipped}: it skips this action.` : ''}`;
    return <span class={cls} data-ui={p.ui} data-tip={tip} aria-label={`Intent ${iv.class}, unmapped`}>{icon}{iv.skipped && <span class="il">zzz</span>}<GuideLink section="intents" label="Intents" inline /></span>;
  }
  const nums = [iv.damage ? `${iv.damage} dmg` : '', iv.neural ? 'neural' : '', iv.trace ? `+${iv.trace} trace` : ''].filter(Boolean).join(', ');
  return (
    <span class={cls} data-ui={p.ui} data-tip={`Mapped intent: ${iv.label}${nums ? ` (${nums})` : ''}${iv.skipped ? `\nIt is ${iv.skipped}: it skips this action.` : ''}`}>
      {icon}
      <span class="il">{iv.skipped ? `zzz: ${iv.label}` : iv.label}</span>
      {iv.neural && <span class="c-red">◉</span>}
      <GuideLink section="intents" label="Intents" inline />
    </span>
  );
}

function IceCanvas(p: { ice: Omit<IceInstance, 'intent'>; intentId: string | null; black: boolean; boss: boolean; hunter: boolean; mapped: boolean; intentClass: string }) {
  const { ice } = p;
  const ref = useCanvas((ctx, w, h, t) => drawIce(ctx, w, h, t, {
    uid: ice.uid, def: ice.def, name: ice.name, shellType: ice.shell.type, shell: ice.shell.points, shellMax: ice.shell.max,
    core: ice.core, coreMax: ice.coreMax, black: p.black, boss: p.boss, hunter: p.hunter, dead: ice.dead, subverted: ice.subverted,
    stunned: ice.status.stunned > 0, infected: ice.status.infected, mapped: p.mapped, intentClass: p.intentClass, intentId: p.intentId, phase: ice.phase,
  }, reducedMotion()));
  return <canvas ref={ref} aria-hidden="true" />;
}

function statusChips(ice: Omit<IceInstance, 'intent'>) {
  const out: VNode[] = [];
  const st = ice.status;
  const add = (key: keyof typeof ICE_STATUS_INFO, n: number | boolean) => {
    if (!n) return;
    const info = ICE_STATUS_INFO[key];
    const val = typeof n === 'number' ? n : 1;
    out.push(
      <span class="status-chip g-link" role="button" style={{ color: info.color }} data-ui={`guide-link-status-${key}`} data-tip={`${fill(info.tip, { n: val >= 999 ? '∞' : val })}\nClick for the guide.`} tabIndex={0} onClick={(ev) => { ev.stopPropagation(); openGuide('statuses', `status-${key}`); }}>
        {info.short}{typeof n === 'number' && key !== 'mapped' && n > 0 && n < 999 ? ` ${n}` : ''}
      </span>,
    );
  };
  add('mapped', st.mapped);
  add('critReady', st.critReady);
  add('unstable', st.unstable);
  add('backdoored', st.backdoored);
  add('rootable', st.rootable);
  add('exposed', st.exposed);
  add('stunned', st.stunned);
  add('slowed', st.slowed);
  add('marked', st.marked);
  add('infected', st.infected);
  return out;
}

function previewText(ctx: Ctx, programId: string, uid: string, rigged: boolean): { text: string; kills: boolean } | null {
  const pv = select.damagePreview(ctx, programId, uid);
  if (!pv.length) return null;
  let sMin = 0, sMax = 0, cMin = 0, cMax = 0, inf = 0, refl = 0;
  let crit = false, kills = false;
  for (const x of pv) {
    sMin += x.min.shell; sMax += x.max.shell; cMin += x.min.core; cMax += x.max.core; inf += x.infected; refl += x.reflected;
    crit ||= x.crit; kills ||= x.kills;
  }
  if (rigged) { sMin = sMax; cMin = cMax; }
  const r = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);
  const parts = [];
  if (sMax > 0) parts.push(`shell ${r(sMin, sMax)}`);
  if (cMax > 0) parts.push(`core ${r(cMin, cMax)}`);
  if (inf > 0) parts.push(`infect ${inf}`);
  if (refl > 0) parts.push(`reflects ${refl} to you`);
  if (crit) parts.push('crit');
  if (!parts.length) parts.push('no damage');
  return { text: parts.join(', ') + (rigged ? ' (rigged: max)' : ''), kills };
}

export function CombatScreen(p: { engine: Engine; ctx: Ctx; live: boolean }) {
  useSubscribe(subscribeMetaUi);
  const e = p.engine;
  const ctx = p.ctx;
  const cv = select.combatView(ctx);
  const target = ui.get().target;
  const rootRef = useRef<HTMLDivElement>(null);
  const u = useStore(ui);
  const phone = useMedia('(max-width: 760px)');
  const [arenaW, setArenaW] = useState(1000);
  const arenaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = arenaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((es) => setArenaW(es[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (!cv) return null;
  const m = metaUiState();
  const rigged = m.riggedRolls || select.metaView(ctx).rngRigged;
  const scrambled = m.scrambleLabels || cv.labelsScrambled;
  const enemies = cv.ice.filter((i) => !i.subverted);
  const tgt = enemies.find((i) => i.uid === target) ?? enemies[0] ?? null;
  const now = performance.now();
  const allIce = (ctx.state.combat?.ice ?? []).filter((i) => !i.dead || (iceFx[i.uid]?.dieAt !== undefined && now - iceFx[i.uid].dieAt! < 900));
  const boss = cv.ice.some((i) => i.boss);
  const tierCopy = hud(e, 'endTurn');
  const nodeName = cv.context === 'raid' ? 'Raid on your home deck' : (() => {
    const run = ctx.state.run;
    if (!run || !ctx.state.combat?.node) return cv.context;
    const sys = e.content.systems[run.system] ?? ctx.state.world.procSystems[run.system];
    return `${sys?.nodes.find((n) => n.id === ctx.state.combat!.node)?.name ?? ''}, ${sys?.address ?? ''}`;
  })();
  const blockedAll = p.live ? null : 'resolving';
  const programs = cv.programs.filter((x) => !x.evicted);

  const fire = (id: string, el?: Element | null) => {
    if (!p.live) return;
    const pb = cv.programs.find((x) => x.id === id);
    if (!pb) return;
    const a: Action = pb.targeting === 'ice' && tgt ? { type: 'combat/program', program: id, target: tgt.uid } : { type: 'combat/program', program: id };
    act(a, el ?? document.querySelector(`[data-ui="program-${id}"]`));
  };
  const endTurn = (el?: Element | null) => {
    if (!p.live) return;
    if (m.endTurnDisabled) return refuse(el ?? document.querySelector('[data-ui="end-turn"]'), 'End Turn is disabled. Something else owns this button now.');
    act({ type: 'combat/endTurn' }, el ?? document.querySelector('[data-ui="end-turn"]'));
  };
  const cycleTarget = (dir: number) => {
    if (!enemies.length) return;
    const i = Math.max(0, enemies.findIndex((x) => x.uid === tgt?.uid));
    const n = enemies[(i + dir + enemies.length) % enemies.length];
    audio.play('ui_hover', { volume: 0.6 });
    ui.set({ target: n.uid });
  };
  const botnet = (kind: string, el?: Element | null) => {
    if (!p.live) return;
    act({ type: 'combat/botnet', kind: kind as (typeof BOTNET_KINDS)[number], ...(kind === 'dcrack' && tgt ? { target: tgt.uid } : {}) }, el ?? document.querySelector(`[data-ui="botnet-${kind}"]`));
  };

  // keyboard
  const live = useRef({ fire, endTurn, cycleTarget, botnet, programs });
  live.current = { fire, endTurn, cycleTarget, botnet, programs };
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (keysBlocked()) return;
      const L = live.current;
      if (ev.key === 'Tab' || ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        L.cycleTarget(ev.key === 'ArrowLeft' || (ev.key === 'Tab' && ev.shiftKey) ? -1 : 1);
        return;
      }
      if (ev.key === ' ' || ev.code === 'Space') {
        const tgtEl = ev.target as HTMLElement;
        // Space always means End Turn in a fight (Tab is taken by targeting, so focus on a program button only ever
        // comes from a mouse click; Chromium even marks it :focus-visible once a key is pressed). Enter still presses
        // a focused button.
        if (tgtEl?.tagName === 'INPUT' || tgtEl?.tagName === 'TEXTAREA') return;
        ev.preventDefault();
        if (tgtEl?.tagName === 'BUTTON') tgtEl.blur(); // stops the browser's own Space-activates-button on keyup
        L.endTurn();
        return;
      }
      if (ev.key === 'Escape') {
        if (ui.get().inspectOpen) {
          ui.set({ inspectOpen: false });
          return;
        }
        fastForward();
        return;
      }
      if (ev.key === 'i' || ev.key === 'I') {
        ev.preventDefault();
        toggleInspector();
        document.querySelector<HTMLElement>('[data-ui="ice-inspector"] .insp-body')?.focus();
        return;
      }
      if (ev.shiftKey && /^Digit[1-4]$/.test(ev.code)) {
        ev.preventDefault();
        L.botnet(BOTNET_KINDS[Number(ev.code.slice(5)) - 1]);
        return;
      }
      if (/^[1-9]$/.test(ev.key)) {
        const pb = L.programs[Number(ev.key) - 1];
        if (pb) {
          ev.preventDefault();
          L.fire(pb.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [e]);

  const drift = (ev: PointerEvent) => {
    if (!m.buttonsDrift) return;
    const el = ev.currentTarget as HTMLElement;
    el.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 80)}px`);
  };
  const ordered = m.buttonsDrift ? [...programs].sort((a, b) => ((a.id.charCodeAt(0) * 31 + ctx.state.combat!.turn) % 7) - ((b.id.charCodeAt(0) * 31 + ctx.state.combat!.turn) % 7)) : programs;
  const pt = cv.projectedTrace;
  const trace = ctx.state.run?.trace ?? 0;
  const st = cv.status;
  const insMode = inspectorMode(arenaW, phone);
  const inspected = u.inspect && !u.inspect.startsWith('daemon:') && cv.ice.some((x) => x.uid === u.inspect) ? u.inspect : tgt?.uid ?? null;
  const pending = cv.pending;

  return (
    <div ref={rootRef} class={`combat ${boss ? 'boss-fight' : ''} ${m.buttonsDrift ? 'drift-on' : ''} ${ui.get().coaching ? 'coaching' : ''}`} data-ui="combat">
      <header class="cb-head">
        <div class="hstack">
          <span class="turn display">{label('turn', 'Turn')} {cv.turn}</span>
          <span class="cb-guide" aria-label="Guide">
            <button type="button" class="btn ghost small" data-ui="guide-link-signature" onClick={() => openGuide('signature')} data-tip="Why a program gets weaker when you repeat it">×0.8? signature</button>
            <button type="button" class="btn ghost small" data-ui="guide-link-statuses" onClick={() => openGuide('statuses')} data-tip="Every status chip explained">statuses</button>
          </span>
          <span class="dim" style={{ fontSize: '0.867rem' }}>{nodeName}</span>
          {pending.length > 0 && pending.map((r) => <span class="tag c-red" data-tip="Reinforcements arrive in this many ICE turns. Capture Security to stop them.">backup in {r.turns}: {e.content.ice[r.ice]?.name ?? r.ice}</span>)}
          {cv.daemons.map((d) => <button type="button" class="tag c-amber g-link" data-ui={`daemon-${d.program}`} data-tip={`${descr(e, e.content.programs[d.program]?.description)}\nClick to inspect.`} onClick={() => ui.set({ inspect: `daemon:${d.program}`, inspectOpen: true })}>{e.content.programs[d.program]?.name ?? d.program}{d.turnsLeft > 0 ? ` ${d.turnsLeft}` : ''}</button>)}
        </div>
        <div class="hstack">
          <Btn class="small" ui="disengage" action={{ type: 'combat/disengage' }} blocked={blockedAll ?? cv.disengage} tip="2 cycles. Back to the previous node. The ICE recovers half of what it lost.">Disengage</Btn>
          <Btn class="small danger" ui="combat-jack-out" action={{ type: 'combat/jackOut' }} blocked={blockedAll ?? cv.jackOut} tip="Spends all your cycles. The ICE takes its turn, then you leave with your paydata.">{label('jackOut', hud(e, 'jackOut'))}</Btn>
        </div>
      </header>

      <div class={`cb-stage ${insMode === 'column' ? 'with-insp' : ''}`} ref={arenaRef}>
      <section class={`cb-arena n${cv.ice.length}`} aria-label="ICE">
        {allIce.map((raw) => {
          const i = cv.ice.find((x) => x.uid === raw.uid);
          const def = e.content.ice[raw.def];
          const black = !!def?.black;
          const isT = tgt?.uid === raw.uid;
          if (!i) {
            return (
              <div class="ice-card dead" data-ice-uid={raw.uid} aria-hidden="true">
                <div class="ice-name"><span class="n">{raw.name}</span></div>
                <IceCanvas ice={raw} intentId={raw.intent} black={black} boss={!!def?.boss} hunter={!!def?.hunter} mapped={false} intentClass="unknown" />
              </div>
            );
          }
          const infinite = m.fakeInfiniteIntegrity && (i.boss || i.undefeatable);
          return (
            <div
              role="button"
              tabIndex={0}
              class={`ice-card ${black ? 'black' : ''} ${isT ? 'targeted' : ''} ${i.subverted ? 'subverted' : ''}`}
              data-ice-uid={i.uid}
              data-ui={`ice-${i.uid}`}
              aria-pressed={isT}
              aria-label={`${i.name}, level ${i.level}${black ? ', black ICE' : ''}. Shell ${i.shell.points} of ${i.shell.max}. Core ${i.core} of ${i.coreMax}.`}
              onClick={() => {
                audio.play('ui_hover', { volume: 0.6 });
                // clicking the selected ICE (or a rooted one) opens the inspector where it is not a column
                const again = inspected === i.uid;
                if (i.subverted) ui.set({ inspect: i.uid, inspectOpen: insMode !== 'column' });
                else ui.set({ target: i.uid, inspect: null, inspectOpen: again && insMode !== 'column' ? !u.inspectOpen : u.inspectOpen && insMode !== 'column' });
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') ui.set(i.subverted ? { inspect: i.uid } : { target: i.uid, inspect: null });
              }}
            >
              {!i.subverted && <IntentBadge iv={i.intent} black={black} ui={isT ? 'ice-intent' : undefined} />}
              <div class="ice-name">
                <span class="n" style={{ color: black ? 'var(--red)' : i.boss ? 'var(--amber)' : undefined }}>{i.name}</span>
                <span class="lv">L{i.level}{i.bonus ? ` (+${i.bonus})` : ''}</span>
              </div>
              <div class="ice-type">{baseType(e, def).name !== i.name && <span class="tag c-cyan">{baseType(e, def).name}</span>}{insMode !== 'column' && inspected === i.uid && <span class="faint insp-hint">tap again or <span class="kbd">i</span> for details</span>}</div>
              {black && <div class="black-label"><SkullIcon /> BLACK ICE: it can kill you</div>}
              {i.subverted && <div class="c-lime" style={{ fontSize: '0.867rem' }}>rooted: fights for you</div>}
              <IceCanvas ice={i} intentId={raw.intent} black={black} boss={i.boss} hunter={!!def?.hunter} mapped={i.intent.mapped} intentClass={i.intent.class} />
              <div class="ice-bars">
                {i.shell.type !== 'none' && i.shell.max > 0 && (
                  <div class="ice-bar-row" data-ui={isT ? 'ice-shell' : undefined} data-tip={i.shell.type === 'crypt' ? 'Crypt shell: crack does ×2, spike ×0.5.' : 'Wall shell: spike does ×2, crack ×0.5.'}>
                    <span style={{ color: i.shell.type === 'crypt' ? 'var(--violet)' : 'var(--orange)' }}>{i.shell.type}<GuideLink section="shells" label="Shells and damage kinds" inline /></span>
                    <Bar value={i.shell.points} max={i.shell.max} color={i.shell.type === 'crypt' ? 'var(--violet)' : 'var(--orange)'} ghost />
                    <span class="val">{i.shell.points}/{i.shell.max}</span>
                  </div>
                )}
                <div class="ice-bar-row" data-tip={i.undefeatable ? 'Core. It cannot drop below 1 through normal actions.' : 'Core: its HP.'}>
                  <span class="c-pink">core</span>
                  <Bar value={infinite ? 1 : i.core} max={infinite ? 1 : i.coreMax} color={black ? 'var(--red)' : 'var(--pink)'} ghost />
                  <span class="val" data-ui={isT ? 'ice-core' : undefined}>{(i.boss || i.undefeatable) && metaHud('bossIntegrity') ? metaHud('bossIntegrity') : infinite ? '∞' : `${i.core}/${i.coreMax}`}</span>
                </div>
              </div>
              <div class="statuses">{statusChips(i)}</div>
            </div>
          );
        })}
      </section>
      {(insMode === 'column' || u.inspectOpen) && (
        <>
          {insMode === 'sheet' && <div class="insp-scrim" onClick={() => toggleInspector(false)} />}
          <IceInspector engine={e} ctx={ctx} cv={cv} iceUid={inspected} daemon={u.inspect?.startsWith('daemon:') ? u.inspect.slice(7) : null} mode={insMode} onClose={() => toggleInspector(false)} />
        </>
      )}
      </div>

      <section class="cb-player" aria-label="You">
        <div class="vitals" data-ui="player-vitals">
          <div class="vital" data-ui="vital-shield" data-tip="Shield: absorbs hits first. Refills to your Firewall at the start of each turn.">
            <span class="c-cyan">{label('shield', 'shield')}</span>
            <Bar value={cv.shield} max={Math.max(cv.shield, select.deckStat(ctx, 'firewall'))} color="var(--cyan)" />
            <span class="val">{cv.shield}</span>
          </div>
          <div class="vital" data-ui="vital-integrity" data-tip="Deck integrity. At 0 you are dumped: paydata lost, a program corrupted.">
            <span>{label('integrity', 'deck')}</span>
            <Bar value={cv.integrity} max={cv.integrityMax} color="var(--lime)" ghost />
            <span class="val">{cv.integrity}/{cv.integrityMax}</span>
          </div>
          <div class="vital" data-ui="vital-neural" data-tip="Neural: your brain. Only black ICE hurts it. At 0 you flatline.">
            <span class="c-red">{label('neural', 'neural')}</span>
            <Bar value={cv.neural} max={cv.neuralMax} color="var(--red)" ghost />
            <span class="val">{cv.neural}/{cv.neuralMax}</span>
          </div>
          <div class="pstatus">
            {(Object.keys(PLAYER_STATUS_INFO) as (keyof typeof PLAYER_STATUS_INFO)[]).map((k) => {
              const v = st[k];
              if (!v) return null;
              const info = PLAYER_STATUS_INFO[k];
              return <span class="status-chip g-link" role="button" style={{ color: info.good ? 'var(--cyan)' : 'var(--red)' }} data-ui={`guide-link-status-${k}`} data-tip={`${fill(info.tip, { n: v })}\nClick for the guide.`} tabIndex={0} onClick={() => openGuide('statuses', `status-${k}`)}>{info.short} {v}</span>;
            })}
            {Object.entries(st.scrambled).filter(([, v]) => v > 0).map(([id, v]) => (
              <span class="status-chip" style={{ color: 'var(--red)' }} data-tip={`Scrambled: ${e.content.programs[id]?.name ?? id} is locked for ${v} turns.`} tabIndex={0}>locked {e.content.programs[id]?.name ?? id}</span>
            ))}
          </div>
        </div>
        <div class="cyc-block" data-ui="cycles" data-tip="Cycles: your action points this turn. CPU sets the base. Flow adds one.">
          <span>{label('cycles', 'cycles')} <GuideLink section="combat" label="Combat basics" /></span>
          <span class="hstack"><span class="big">{cv.cycles}</span><Pips on={cv.cycles} total={Math.max(cv.cycles, select.deckStat(ctx, 'cpu') + (cv.flow.active ? 1 : 0))} /></span>
          <span class="hstack" data-ui="flow" data-tip={`Flow: run programs from ${cv.flow.needed} different categories in one turn. Next turn: +1 cycle and −2 trace.${cv.flow.categories.length ? `\nThis turn: ${cv.flow.categories.join(', ')}` : ''}`}>
            {label('flow', 'flow')} <GuideLink section="flow" label="Flow" /> <Pips on={Math.min(cv.flow.used, cv.flow.needed)} total={cv.flow.needed} cls="flow" />
            {cv.flow.next && <span class="c-pink" style={{ fontSize: '0.867rem' }}>earned</span>}
            {cv.flow.active && <span class="c-pink" style={{ fontSize: '0.867rem' }}>active</span>}
          </span>
        </div>
        <div class="trace-block" data-ui="trace" data-tip={`Projected trace at End Turn: ${pt.formula} from the system and your noise${pt.ice ? ` + ${pt.ice} from mapped ICE` : ''}${pt.unknown ? ' + unknown (unmapped ICE)' : ''}.`}>
          <span>{label('trace', 'trace')} <GuideLink section="trace" label="Trace" /> <b class="num" style={{ color: trace >= 66 ? 'var(--red)' : trace >= 33 ? 'var(--amber)' : 'var(--ink)', fontSize: '1rem' }}>{Math.round(trace)}</b> <span class="c-amber">+{pt.total}{pt.unknown ? '+?' : ''}</span> this turn</span>
          <Bar value={trace} max={100} color={trace >= 66 ? 'var(--red)' : trace >= 33 ? 'var(--amber)' : 'var(--cyan)'} ticks={[33, 66]} />
          <span>noise this turn {ctx.state.combat?.noise ?? 0}{cv.charges > 0 ? `, botnet charges ${cv.charges}` : ''}</span>
        </div>
        {/* the turn log lives in the scroll (log column / ticker), not here */}
      </section>

      {cv.charges > 0 || cv.botnet.some((b) => !b.blocked) ? (
        <section class="botnet-row" aria-label="Botnet actions">
          <span class="dim" data-ui="botnet" data-tip="Botnet actions cost no cycles and one charge. One per turn. Each use may burn a host.">botnet, {cv.charges} charge{cv.charges === 1 ? '' : 's'} <GuideLink section="botnet-combat" label="Botnet in a fight" /></span>
          {cv.botnet.map((b, i) => {
            const info = BOTNET_INFO[b.kind];
            const extra = b.damage ? ` ${b.damage} crack` : b.hits ? ` ${b.hits} hits` : b.trace ? ` −${b.trace} trace` : '';
            const name = scrambled ? scramble(info.name, i) : info.name;
            return (
              <button
                class={`btn small ${b.blocked || blockedAll ? 'is-blocked' : ''}`}
                data-ui={`botnet-${b.kind}`}
                data-tip={`${info.tip}${extra ? `\nNow:${extra}.` : ''}\nBurn chance ${Math.round(b.burnChance * 100)}%.${b.blocked ? `\nUnavailable: ${b.blocked}` : ''}`}
                onPointerEnter={drift}
                onClick={(ev) => (b.blocked ? refuse(ev.currentTarget, b.blocked) : botnet(b.kind, ev.currentTarget))}
              >
                {name}{extra && <span class="faint">{extra}</span>} <span class="kbd">⇧{i + 1}</span>
              </button>
            );
          })}
        </section>
      ) : null}

      <section class="cb-bar" aria-label="Programs">
        <div class="progs">
          {ordered.map((pb) => {
            const slot = programs.indexOf(pb) + 1;
            const d = e.content.programs[pb.id];
            const base = label(`prog:${pb.id}`, pb.name);
            const name = scrambled ? scramble(base, pb.id.length + slot) : base;
            const blocked = blockedAll ?? pb.blocked;
            const pv = pb.targeting === 'ice' && tgt ? previewText(ctx, pb.id, tgt.uid, rigged) : null;
            const multCls = pb.mult <= 0.4 ? 'mult-floor' : pb.mult < 1 ? 'mult-low' : '';
            const tip = [
              `${name}  (${pb.category})`,
              scrambled ? 'The label is scrambled. The program still works.' : descr(e, pb.description),
              `Cost ${pb.cost} cycle${pb.cost === 1 ? '' : 's'}. Noise ${pb.noise}. ${pb.cooldown ? `Cooldown ${pb.cooldown}.` : 'No cooldown.'}`,
              `Signature ${pb.stacks}: effect ×${pb.mult.toFixed(1)}. Skip it for a turn to cool it down.`,
              pv ? `Against ${tgt?.name}: ${pv.text}${pv.kills ? ', kills' : ''}` : '',
              blocked ? `Unavailable: ${blocked}` : '',
            ].filter(Boolean).join('\n');
            return (
              <button
                type="button"
                class={`prog ${blocked ? 'is-blocked' : ''}`}
                style={{ '--cat': CATEGORY_COLOR[pb.category] } as Record<string, string>}
                data-ui={`program-${pb.id}`}
                data-slot={slot}
                data-tip={tip}
                aria-label={`${slot}: ${name}, ${pb.cost} cycles${blocked ? `, unavailable: ${blocked}` : ''}`}
                onPointerEnter={(ev) => drift(ev)}
                onClick={(ev) => (blocked ? refuse(ev.currentTarget, blocked) : fire(pb.id, ev.currentTarget))}
              >
                <span class="key"><Kbd>{slot}</Kbd></span>
                <span class="pn" data-ui={`program-slot-${slot}`}>{name}</span>
                <span class="cost" aria-hidden="true">{pb.cost}</span>
                <span class="meta stats">
                  <span class="sig" data-tip="Signature stacks">
                    {[0, 1, 2].map((k) => <i class={k < pb.stacks ? 'on' : ''} />)}
                    <span class={multCls}>×{pb.mult.toFixed(1)}</span>
                  </span>
                  <span>noise {pb.noise}</span>
                  {d?.category === 'daemon' && <span class="c-amber">daemon</span>}
                </span>
                <span class="meta preview" style={{ color: 'var(--ink)' }}>
                  {pv ? <>{pv.text}{pv.kills && <b class="c-lime"> kills</b>}</> : <span class="faint">{pb.targeting === 'none' ? 'self' : ''}</span>}
                </span>
                {pb.cooldownLeft > 0 && <span class="cd">cd {pb.cooldownLeft}</span>}
                {pb.scrambled > 0 && <span class="cd" style={{ color: 'var(--red)' }}>locked {pb.scrambled}</span>}
              </button>
            );
          })}
        </div>
        <div class="cb-side">
          {cv.offer && (
            <Btn class="money" ui="accept-offer" action={{ type: 'combat/acceptOffer' }} blocked={blockedAll}>{cv.offer.text}</Btn>
          )}
          <button
            type="button"
            class={`btn hot end-turn ${m.endTurnDisabled || blockedAll ? 'is-blocked' : ''}`}
            data-ui="end-turn"
            aria-disabled={m.endTurnDisabled || blockedAll ? 'true' : undefined}
            style={m.buttonsDrift ? { translate: `${-((cv.turn * 97) % 200)}px 0`, zIndex: '5' } : undefined}
            data-tip={label('endTurnTip', m.endTurnDisabled ? 'End Turn is disabled.' : `End your turn (Space). Then the ICE acts. Trace +${pt.total}${pt.unknown ? '+?' : ''}.`)}
            onClick={(ev) => endTurn(ev.currentTarget)}
          >
            {scrambled && m.scrambleLabels ? scramble(label('endTurn', tierCopy), 3) : label('endTurn', tierCopy)} <span class="kbd">space</span>
          </button>
        </div>
      </section>

      {cv.demand && p.live && <Demand text={cv.demand.text} />}
    </div>
  );
}

function SkullIcon() {
  const ref = useCanvas((c) => {
    c.clearRect(0, 0, 14, 14);
    drawSkull(c, 7, 7, 11);
  });
  return <canvas ref={ref} style={{ width: '14px', height: '14px' }} aria-hidden="true" />;
}

function Demand(p: { text: string }) {
  const [read, setRead] = useState(false);
  return (
    <div class="demand" role="dialog" aria-label="Terms">
      <div class="terms scroll" onScroll={(ev) => {
        const el = ev.currentTarget as HTMLDivElement;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) setRead(true);
      }} ref={(el) => { if (el && el.scrollHeight <= el.clientHeight + 4 && !read) setRead(true); }}>
        {p.text.split('\n').map((l) => <p>{l}</p>)}
      </div>
      <div class="foot">
        <span style={{ fontSize: '0.867rem' }}>{read ? 'Thank you for reading.' : 'Scroll to the end to accept.'} Ending your turn without accepting has a penalty.</span>
        <Btn class="small" ui="accept-demand" action={{ type: 'combat/answerDemand' }} blocked={read ? null : 'scroll to the end first'}>I accept</Btn>
      </div>
    </div>
  );
}
