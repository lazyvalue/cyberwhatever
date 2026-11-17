// The Guide: the in-game manual behind the `?` button. Content is data (src/content/guide.ts, written by the
// story agent); lists of things that exist in the game (statuses, categories, heat levels, botnet actions, node
// types, ICE you know about) are rendered from the content registry and the engine, so they cannot go stale.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { BALANCE, type Engine, type ProgramCategory } from '../../engine/index.ts';
import { audio } from '../../audio/index.ts';
import { ui, closeGuide, openGuide } from '../game.ts';
import { useStore, useMedia } from '../store.ts';
import {
  CATEGORY_COLOR, ICE_STATUS_INFO, PLAYER_STATUS_INFO, HEAT_BANDS, BOTNET_INFO, NODE_TYPE_INFO, fill, fillState,
} from '../copy.ts';

// ------------------------------------------------------------------ content contract

export interface GuideSection { id: string; title: string; summary: string; blocks: GuideBlock[]; related?: string[] }
export type AutoSource = 'iceStatuses' | 'playerStatuses' | 'categories' | 'damageKinds' | 'heat' | 'botnet' | 'nodeTypes' | 'ice' | 'trace';
export type GuideBlock =
  | { kind: 'p'; text: string }
  | { kind: 'rule'; label: string; text: string; id?: string }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'example'; title: string; steps: string[] }
  | { kind: 'tip'; text: string }
  | { kind: 'auto'; source: AutoSource; notes?: Record<string, string> };

// src/content/guide.ts may not exist yet: a glob import keeps the build working either way.
type GuideModule = { guide?: GuideSection[]; GUIDE?: GuideSection[]; GUIDE_STATUSES?: { id: string; name: string }[] };
const mods = import.meta.glob('../../content/guide.ts', { eager: true }) as Record<string, GuideModule>;
const MOD = Object.values(mods)[0];
const LOADED = MOD?.GUIDE ?? MOD?.guide;
/** Status row name → status key, so table rows and chips can deep-link (`status-<key>`). */
const STATUS_BY_NAME = new Map((MOD?.GUIDE_STATUSES ?? []).map((x) => [x.name.toLowerCase(), x.id]));

/** Used only until src/content/guide.ts exists. Short, exact, and built mostly from the registry. */
const FALLBACK: GuideSection[] = [
  { id: 'basics', title: 'The basics', summary: 'What you do, and what time is.', blocks: [
    { kind: 'p', text: 'Dial in to an address, work through its nodes, hang up with the loot. Sell it, buy better gear, put hosts in your botnet, repeat.' },
    { kind: 'rule', label: 'Cycles', text: 'Time passes in cycles: one per node action and one per combat turn. Nothing passes at home.' },
  ] },
  { id: 'nodes', title: 'Nodes and approach', summary: 'Probe, sneak, breach, loot, capture.', blocks: [
    { kind: 'p', text: 'You can act on nodes next to a node you cleared. Empty nodes are passed through automatically, 1 cycle each.' },
    { kind: 'rule', label: 'Probe', text: `1 cycle, +${BALANCE.trace.probe} trace. Shows the ICE and unmasks honeypots.` },
    { kind: 'rule', label: 'Sneak', text: `Roll the shown chance. Success: the ICE sleeps; you can loot and pass, not capture. Fail: ambush and +${BALANCE.trace.sneakFail} trace.` },
    { kind: 'rule', label: 'Breach', text: 'Fight the ICE.' },
    { kind: 'auto', source: 'nodeTypes' },
  ] },
  { id: 'combat', title: 'Combat basics', summary: 'Turns, cycles, End Turn.', blocks: [
    { kind: 'p', text: 'Spend your cycles on programs ([key:1]–[key:9]), then End Turn ([key:Space]). Then every ICE does what its badge said.' },
    { kind: 'rule', label: 'Shield', text: 'Absorbs hits first and refills to your Firewall each turn.' },
  ] },
  { id: 'shells', title: 'Shells and damage kinds', summary: 'Match the damage to the shell.', blocks: [{ kind: 'auto', source: 'damageKinds' }] },
  { id: 'intents', title: 'Intents', summary: 'The badge over each ICE.', blocks: [
    { kind: 'p', text: 'Each ICE shows what it will do next. Unmapped: only the kind (hostile, utility, unknown). [status:mapped]: the exact action and numbers.' },
  ] },
  { id: 'signature', title: 'Signature', summary: 'Repeating a program makes it weaker.', blocks: [
    { kind: 'rule', label: 'Stacks', text: 'Each use adds 1 stack (shared across all ICE in the fight). Effect = max(0.4, 1 − 0.2 × stacks). A program you skip for a turn loses 1 stack.' },
  ] },
  { id: 'flow', title: 'Flow', summary: 'Three kinds of program in one turn.', blocks: [
    { kind: 'rule', label: 'Flow', text: 'Run programs from 3 different categories in one turn: next turn +1 cycle and −2 trace.' },
    { kind: 'auto', source: 'categories' },
  ] },
  { id: 'statuses', title: 'Statuses', summary: 'Every tag on ICE and on you.', blocks: [{ kind: 'auto', source: 'iceStatuses' }, { kind: 'auto', source: 'playerStatuses' }] },
  { id: 'trace', title: 'Trace', summary: 'How close they are to finding you.', blocks: [{ kind: 'auto', source: 'trace' }] },
  { id: 'botnet-combat', title: 'Botnet in a fight', summary: 'Free actions, one per turn.', blocks: [{ kind: 'auto', source: 'botnet' }] },
  { id: 'heat', title: 'Heat', summary: 'How much the world wants you.', blocks: [{ kind: 'auto', source: 'heat' }] },
  { id: 'ice', title: 'ICE you know about', summary: 'From the systems in your address book.', blocks: [{ kind: 'auto', source: 'ice' }] },
];

export function guideSections(): GuideSection[] {
  return LOADED && LOADED.length ? LOADED : FALLBACK;
}

// ------------------------------------------------------------------ context

/** Candidate sections per hub tab, first that exists wins (the content may name them differently). */
const TAB_SECTION: Record<string, string[]> = {
  net: ['net', 'nodes', 'basics'], deck: ['deck'], botnet: ['botnet'], market: ['market', 'money'], wallet: ['wallet', 'money'],
  jobs: ['jobs', 'money', 'basics'], files: ['files', 'money'], rep: ['rep', 'rep-perks', 'implants-humanity'], inbox: ['inbox', 'basics'],
  stats: ['stats', 'basics'],
};

/** Where the guide opens when the player presses `?`: the screen they are looking at. */
export function contextSection(e: Engine): string {
  const has = new Set(guideSections().map((x) => x.id));
  const pick = (ids: string[]) => ids.find((id) => has.has(id)) ?? guideSections()[0]?.id ?? 'basics';
  if (e.state.combat) return pick(['combat', 'basics']);
  if (e.state.run) return pick(['nodes', 'basics']);
  return pick(TAB_SECTION[ui.get().tab] ?? ['basics']);
}

// ------------------------------------------------------------------ inline tokens

function Token(p: { e: Engine; type: string; arg: string }) {
  const { e, type, arg } = p;
  if (type === 'prog') {
    const d = e.content.programs[arg];
    return <span class="g-chip" style={{ color: d ? CATEGORY_COLOR[d.category] : undefined }}>{d?.name ?? arg}</span>;
  }
  if (type === 'status') {
    const info = (ICE_STATUS_INFO as Record<string, { short: string; color: string }>)[arg];
    const pinfo = (PLAYER_STATUS_INFO as Record<string, { short: string; good: boolean }>)[arg];
    const color = info?.color ?? (pinfo ? (pinfo.good ? 'var(--cyan)' : 'var(--red)') : undefined);
    return (
      <button type="button" class="status-chip g-link" style={{ color }} onClick={() => openGuide('statuses', `status-${arg}`)}>
        {info?.short ?? pinfo?.short ?? arg}
      </button>
    );
  }
  if (type === 'cat') return <span class="g-chip" style={{ color: CATEGORY_COLOR[arg as ProgramCategory] }}>{arg}</span>;
  if (type === 'kind') return <span class="g-chip" style={{ color: arg === 'crack' ? 'var(--violet)' : arg === 'spike' ? 'var(--orange)' : 'var(--lime)' }}>{arg}</span>;
  if (type === 'ice') {
    const d = e.content.ice[arg];
    return <span class="g-chip" style={{ color: d?.black ? 'var(--red)' : 'var(--pink)' }}>{d?.name ?? arg}</span>;
  }
  if (type === 'node') return <span class="g-chip c-cyan">{arg}</span>;
  if (type === 'key') return <span class="kbd">{arg}</span>;
  return <>{`[${type}:${arg}]`}</>;
}

function Rich(p: { e: Engine; text: string; q: string }) {
  const out: ComponentChildren[] = [];
  const re = /\[(prog|status|cat|kind|ice|node|key):([^\]]+)\]|\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  const text = fillState(p.e, p.text);
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Mark text={text.slice(last, m.index)} q={p.q} />);
    if (m[1]) out.push(<Token e={p.e} type={m[1]} arg={m[2]} />);
    else if (m[3]) out.push(<strong><Mark text={m[3]} q={p.q} /></strong>);
    else if (m[4]) out.push(<em><Mark text={m[4]} q={p.q} /></em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<Mark text={text.slice(last)} q={p.q} />);
  return <>{out}</>;
}

function Mark(p: { text: string; q: string }) {
  if (!p.q) return <>{p.text}</>;
  const i = p.text.toLowerCase().indexOf(p.q.toLowerCase());
  if (i < 0) return <>{p.text}</>;
  return <>{p.text.slice(0, i)}<mark>{p.text.slice(i, i + p.q.length)}</mark><Mark text={p.text.slice(i + p.q.length)} q={p.q} /></>;
}

// ------------------------------------------------------------------ auto lists (from the registry)

function knownIce(e: Engine): string[] {
  const ids = new Set<string>();
  for (const sysId of Object.keys(e.state.world.addressBook)) {
    const sys = e.content.systems[sysId] ?? e.state.world.procSystems[sysId];
    for (const n of sys?.nodes ?? []) for (const i of n.ice ?? []) ids.add(i.ice);
  }
  return [...ids].filter((id) => e.content.ice[id] && !e.content.ice[id].boss);
}

function Auto(p: { e: Engine; source: AutoSource; notes?: Record<string, string>; q: string }) {
  const { e, notes = {}, q } = p;
  const Item = (x: { k: string; anchor?: string; head: ComponentChildren; text: string }) => (
    <div class="g-item" data-ui={x.anchor ? `guide-anchor-${x.anchor}` : undefined} id={x.anchor ? `guide-${x.anchor}` : undefined}>
      <div class="g-item-head">{x.head}</div>
      <div class="g-item-text">
        <Rich e={e} text={x.text} q={q} />
        {notes[x.k] && <div class="g-note"><Rich e={e} text={notes[x.k]} q={q} /></div>}
      </div>
    </div>
  );
  switch (p.source) {
    case 'iceStatuses':
      return (
        <div class="g-list">
          <h4 class="g-h4">On ICE</h4>
          {Object.entries(ICE_STATUS_INFO).map(([k, v]) => <Item k={k} anchor={`status-${k}`} head={<span class="status-chip" style={{ color: v.color }}>{v.short}</span>} text={fill(v.tip, { n: 'n' })} />)}
        </div>
      );
    case 'playerStatuses':
      return (
        <div class="g-list">
          <h4 class="g-h4">On you</h4>
          {Object.entries(PLAYER_STATUS_INFO).map(([k, v]) => <Item k={k} anchor={`status-${k}`} head={<span class="status-chip" style={{ color: v.good ? 'var(--cyan)' : 'var(--red)' }}>{v.short}</span>} text={fill(v.tip, { n: 'n' })} />)}
        </div>
      );
    case 'categories': {
      const cats = [...new Set(Object.values(e.content.programs).map((x) => x.category))];
      return (
        <div class="g-list">
          {cats.map((c) => {
            const owned = Object.keys(e.state.player.programs).filter((id) => e.content.programs[id]?.category === c).map((id) => e.content.programs[id].name);
            return <Item k={c} head={<span class="g-chip" style={{ color: CATEGORY_COLOR[c] }}>{c}</span>} text={owned.length ? `You own: ${owned.join(', ')}.` : 'You own none yet.'} />;
          })}
        </div>
      );
    }
    case 'damageKinds': {
      const S = BALANCE.shell;
      const x = (n: number) => `×${n}`;
      return (
        <table class="g-table">
          <thead><tr><th>damage</th><th><span class="c-violet">crypt</span> shell</th><th><span class="c-orange">wall</span> shell</th><th>no shell</th></tr></thead>
          <tbody>
            <tr><td><Token e={e} type="kind" arg="crack" /></td><td>{x(S.strong)}</td><td>{x(S.weak)}</td><td>×1</td></tr>
            <tr><td><Token e={e} type="kind" arg="spike" /></td><td>{x(S.weak)}</td><td>{x(S.strong)}</td><td>×1</td></tr>
            <tr><td><Token e={e} type="kind" arg="worm" /></td><td colSpan={3}>ignores shells: becomes Infected stacks{notes.worm ? '. ' : ''}{notes.worm && <Rich e={e} text={notes.worm} q={q} />}</td></tr>
          </tbody>
        </table>
      );
    }
    case 'heat': {
      const H = BALANCE.heat;
      const at: Record<string, number> = { cool: 0, noticed: H.noticed, hunted: H.hunted, burned: H.burned, raid: H.raid };
      return <div class="g-list">{Object.entries(HEAT_BANDS).map(([k, b]) => <Item k={k} head={<span class="g-chip c-amber">{at[k]}+ {b.label}</span>} text={b.tip} />)}</div>;
    }
    case 'botnet':
      return <div class="g-list">{Object.entries(BOTNET_INFO).map(([k, b]) => <Item k={k} head={<span class="g-chip c-pink">{b.name}</span>} text={b.tip} />)}</div>;
    case 'nodeTypes':
      return <div class="g-list">{Object.entries(NODE_TYPE_INFO).filter(([k]) => k !== 'unknown').map(([k, t]) => <Item k={k} head={<span class="g-chip c-cyan">{k}</span>} text={t} />)}</div>;
    case 'trace': {
      const T = BALANCE.trace;
      return (
        <div class="g-list">
          <Item k="suspicious" head={<span class="g-chip c-amber">{T.suspicious}+ suspicious</span>} text="Every ICE gets +1 shell level." />
          <Item k="alarm" head={<span class="g-chip c-red">{T.alarm}+ alarm</span>} text="A hunter ICE joins fights after 2 turns. Vaults seal unless Security is captured." />
          <Item k="traced" head={<span class="g-chip c-red">{T.max} traced</span>} text="You are thrown out, lose this run's paydata, pay a fine and get heat. The system hardens." />
        </div>
      );
    }
    case 'ice': {
      const ids = knownIce(e);
      if (!ids.length) return <p class="dim">None yet. Dial in somewhere.</p>;
      return (
        <div class="g-list">
          {ids.map((id) => {
            const d = e.content.ice[id];
            return <Item k={id} head={<span class="g-chip" style={{ color: d.black ? 'var(--red)' : 'var(--pink)' }}>{d.name}{d.black ? ' (black)' : ''}</span>} text={`${d.shell.type === 'none' ? 'No shell' : `${d.shell.type} shell`}. ${d.description}`} />;
          })}
        </div>
      );
    }
  }
}

function Block(p: { e: Engine; b: GuideBlock; q: string }) {
  const { e, b, q } = p;
  switch (b.kind) {
    case 'p': return <p class="g-p"><Rich e={e} text={b.text} q={q} /></p>;
    case 'rule':
      return (
        <div class="g-rule" data-ui={b.id ? `guide-anchor-${b.id}` : undefined} id={b.id ? `guide-${b.id}` : undefined}>
          <span class="g-rule-label">{b.label}</span>
          <span><Rich e={e} text={b.text} q={q} /></span>
        </div>
      );
    case 'table':
      return (
        <div class="g-table-wrap"><table class="g-table">
          <thead><tr>{b.head.map((h) => <th><Rich e={e} text={h} q={q} /></th>)}</tr></thead>
          <tbody>
            {b.rows.map((r) => {
              const key = STATUS_BY_NAME.get((r[0] ?? '').replace(/\*/g, '').trim().toLowerCase());
              return (
                <tr data-ui={key ? `guide-anchor-status-${key}` : undefined} id={key ? `guide-status-${key}` : undefined}>
                  {r.map((c) => <td><Rich e={e} text={c} q={q} /></td>)}
                </tr>
              );
            })}
          </tbody>
        </table></div>
      );
    case 'example':
      return (
        <div class="g-example">
          <div class="g-example-title">{b.title}</div>
          <ol>{b.steps.map((s) => <li><Rich e={e} text={s} q={q} /></li>)}</ol>
        </div>
      );
    case 'tip': return <div class="g-tip"><Rich e={e} text={b.text} q={q} /></div>;
    case 'auto': return <Auto e={e} source={b.source} notes={b.notes} q={q} />;
  }
}

function blockText(b: GuideBlock): string {
  switch (b.kind) {
    case 'p': case 'tip': return b.text;
    case 'rule': return `${b.label} ${b.text}`;
    case 'table': return [...b.head, ...b.rows.flat()].join(' ');
    case 'example': return `${b.title} ${b.steps.join(' ')}`;
    case 'auto': return `${b.source} ${Object.values(b.notes ?? {}).join(' ')} ${autoText(b.source)}`;
  }
}
function autoText(src: AutoSource): string {
  if (src === 'iceStatuses') return Object.entries(ICE_STATUS_INFO).map(([k, v]) => `${k} ${v.short} ${v.tip}`).join(' ');
  if (src === 'playerStatuses') return Object.entries(PLAYER_STATUS_INFO).map(([k, v]) => `${k} ${v.short} ${v.tip}`).join(' ');
  if (src === 'heat') return Object.values(HEAT_BANDS).map((b) => `${b.label} ${b.tip}`).join(' ');
  if (src === 'botnet') return Object.values(BOTNET_INFO).map((b) => `${b.name} ${b.tip}`).join(' ');
  if (src === 'nodeTypes') return Object.entries(NODE_TYPE_INFO).map(([k, t]) => `${k} ${t}`).join(' ');
  if (src === 'damageKinds') return 'crack spike worm crypt wall shell';
  if (src === 'trace') return 'suspicious alarm traced trace';
  return '';
}

// ------------------------------------------------------------------ the modal

export function Guide(p: { engine: Engine }) {
  const e = p.engine;
  const u = useStore(ui);
  const narrow = useMedia('(max-width: 760px)');
  const sections = guideSections();
  const [q, setQ] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const cur = sections.find((s) => s.id === u.guideSection) ?? sections[0];

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return sections;
    return sections.filter((s) => `${s.title} ${s.summary} ${s.blocks.map(blockText).join(' ')}`.toLowerCase().includes(t));
  }, [q, sections]);

  useEffect(() => {
    navRef.current?.querySelector('.guide-nav-btn.on')?.scrollIntoView({ block: 'nearest' });
  }, [cur?.id]);

  useEffect(() => {
    if (q.trim() && matches.length && !matches.some((x) => x.id === cur?.id)) ui.set({ guideSection: matches[0].id, guideAnchor: null });
  }, [q, matches]);

  // scroll to the deep-linked entry, or to the top of a new section
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (u.guideAnchor) {
      const el = body.querySelector<HTMLElement>(`[data-ui="guide-anchor-${CSS.escape(u.guideAnchor)}"]`);
      if (el) {
        el.scrollIntoView({ block: 'center' });
        el.classList.remove('g-flash');
        void el.offsetWidth;
        el.classList.add('g-flash');
        return;
      }
    }
    body.scrollTop = 0;
  }, [cur?.id, u.guideAnchor]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        if (q) setQ('');
        else closeGuide();
        return;
      }
      const t = ev.target as HTMLElement;
      const typing = t?.tagName === 'INPUT';
      if (ev.key === '/' && !typing) {
        ev.preventDefault();
        (document.querySelector('[data-ui="guide-search"]') as HTMLInputElement | null)?.focus();
        return;
      }
      if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && !typing) {
        ev.preventDefault();
        const list = matches;
        const i = Math.max(0, list.findIndex((s) => s.id === cur?.id));
        const n = list[(i + (ev.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length];
        if (n) openGuide(n.id);
        return;
      }
      // the game underneath does not see keys while the guide is open
      ev.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [q, matches, cur?.id]);

  if (!cur) return null;
  const related = (cur.related ?? []).map((id) => sections.find((s) => s.id === id)).filter((s): s is GuideSection => !!s);

  return (
    <div class="overlay guide-ov" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={(ev) => { if (ev.target === ev.currentTarget) closeGuide(); }}>
      <div class="guide" data-ui="guide">
        <div class="guide-head">
          <h2 id="guide-title" class="h-screen" style={{ fontSize: '1.6rem' }}>Guide</h2>
          <input
            class="field guide-search"
            data-ui="guide-search"
            type="search"
            placeholder="Search the guide ( / )"
            value={q}
            aria-label="Search the guide"
            onInput={(ev) => setQ((ev.target as HTMLInputElement).value)}
          />
          <button class="btn ghost" data-ui="guide-close" aria-label="Close the guide" onClick={() => closeGuide()}>Close <span class="kbd">esc</span></button>
        </div>
        <div class="guide-main">
          {narrow ? (
            <select class="field guide-picker" data-ui="guide-picker" value={cur.id} aria-label="Section" onChange={(ev) => openGuide((ev.target as HTMLSelectElement).value)}>
              {matches.map((s) => <option value={s.id}>{s.title}</option>)}
            </select>
          ) : (
            <nav class="guide-nav scroll" ref={navRef} aria-label="Guide sections">
              {matches.length === 0 && <div class="dim" style={{ padding: '.5rem' }}>Nothing matches "{q}".</div>}
              {matches.map((s) => (
                <button
                  class={`guide-nav-btn ${s.id === cur.id ? 'on' : ''}`}
                  data-ui={`guide-${s.id}`}
                  aria-current={s.id === cur.id ? 'true' : undefined}
                  onClick={() => {
                    audio.play('ui_click', { volume: 0.4 });
                    openGuide(s.id);
                  }}
                >
                  <span class="t">{s.title}</span>
                  <span class="s">{s.summary}</span>
                </button>
              ))}
            </nav>
          )}
          <article class="guide-body scroll" ref={bodyRef} data-ui={`guide-section-${cur.id}`} tabIndex={0}>
            <h3 class="h-panel">{cur.title}</h3>
            <p class="g-summary"><Rich e={e} text={cur.summary} q={q} /></p>
            {cur.blocks.map((b) => <Block e={e} b={b} q={q} />)}
            {related.length > 0 && (
              <div class="g-related">
                See also: {related.map((r) => <button class="btn small" data-ui={`guide-related-${r.id}`} onClick={() => openGuide(r.id)}>{r.title}</button>)}
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}

/** Small "?" next to a confusing widget: opens the guide at the matching section or entry. */
export function GuideLink(p: { section: string; anchor?: string; label?: string; inline?: boolean }) {
  const open = (ev: Event) => {
    ev.stopPropagation();
    ev.preventDefault();
    openGuide(p.section, p.anchor);
  };
  const props = {
    class: 'qhelp',
    'data-ui': `guide-link-${p.anchor ?? p.section}`,
    'aria-label': `Guide: ${p.label ?? p.section}`,
    'data-tip': `Guide: ${p.label ?? p.section}`,
    onClick: open,
  };
  // inside a clickable card a nested <button> is not allowed: use a span with a button role
  return p.inline
    ? <span role="button" tabIndex={0} {...props} onKeyDown={(ev) => { if (ev.key === 'Enter') open(ev); }}>?</span>
    : <button type="button" {...props}>?</button>;
}
