// ICE inspector: everything about the selected ICE (or a rooted ICE, or one of your daemons), in full text.
// The ICE cards stay glanceable; this panel is the full-text home for descriptions, rules, intent, statuses and
// "what each of my programs would do to it right now". Desktop: a column beside the cards. Narrow: an overlay
// opened by clicking the selected ICE or pressing `i`. Phone: a bottom sheet.
import type { ComponentChildren } from 'preact';
import { select, BALANCE, type Ctx, type Engine, type CombatOp, type IceDef } from '../../engine/index.ts';
import { ui, openGuide } from '../game.ts';
import { CATEGORY_COLOR, ICE_STATUS_INFO, descr, fill, fillState, label } from '../copy.ts';
import { GuideLink } from '../overlays/Guide.tsx';
import { metaUiState } from '../metaBridge.ts';
import * as guideContent from '../../content/guide.ts';

type CV = NonNullable<ReturnType<typeof select.combatView>>;
type IceV = CV['ice'][number];

const GUIDE_ICE = (guideContent as unknown as { GUIDE_ICE?: { id: string; trick: string; answer: string }[] }).GUIDE_ICE ?? [];

/** "Cipher" for a skin like "[Cipher] Crypt shell…"; the ICE's own name otherwise. */
export function baseType(e: Engine, def: IceDef | undefined): { name: string; rest: string; baseId: string | null } {
  const desc = def?.description ?? '';
  const m = /^\[([^\]]+)\]\s*/.exec(desc);
  const name = m ? m[1] : def?.name ?? 'ICE';
  const baseId = Object.values(e.content.ice).find((x) => x.name === name && !/^\[/.test(x.description))?.id ?? def?.id ?? null;
  return { name, rest: m ? desc.slice(m[0].length) : desc, baseId };
}

function fieldGuide(e: Engine, def: IceDef | undefined): { trick: string; answer: string } | null {
  const b = baseType(e, def);
  return GUIDE_ICE.find((g) => g.id === b.baseId || g.id === def?.id) ?? null;
}

/** Upcoming intents for sequence ICE: what it does on each of its next turns. */
function pattern(def: IceDef | undefined, i: IceV, intentId: string | null): { label: string; cls: string }[] {
  if (!def || def.script || (def.ai && def.ai !== 'sequence')) return [];
  const intents = (i.phase > 0 && def.phases?.[i.phase - 1]?.intents) || def.intents;
  if (!intents || intents.length < 2) return [];
  const start = intents.findIndex((x) => x.id === intentId);
  if (start < 0) return [];
  const out: { label: string; cls: string }[] = [];
  for (let k = 0; k < Math.min(intents.length, 4); k++) {
    const x = intents[(start + k) % intents.length];
    out.push({ label: x.label, cls: x.class });
  }
  return out;
}

/** What a program applies besides damage (statuses on the target, things for you). */
function sideEffects(e: Engine, ops: CombatOp[]): string[] {
  const out: string[] = [];
  const walk = (list: CombatOp[]) => {
    for (const op of list) {
      if (op.op === 'iceStatus') out.push(`${ICE_STATUS_INFO[op.status]?.short ?? op.status}${op.value > 1 && op.status !== 'mapped' ? ` ${op.value}` : ''}`);
      else if (op.op === 'stripShell') out.push(`shell −${op.amount}`);
      else if (op.op === 'root') out.push('roots it if Rootable');
      else if (op.op === 'shield') out.push(`you: shield +${op.amount}`);
      else if (op.op === 'repair') out.push(`you: deck +${op.amount}`);
      else if (op.op === 'playerStatus') out.push(`you: ${op.status} ${op.value}`);
      else if (op.op === 'trace') out.push(`trace ${op.amount > 0 ? '+' : ''}${op.amount}`);
      else if (op.op === 'cycles') out.push(`+${op.amount} cycles`);
      else if (op.op === 'chance' || op.op === 'ifIce') walk(op.ops);
    }
  };
  walk(ops);
  void e;
  return out;
}

interface Row { id: string; slot: number; name: string; cat: string; cost: number; effect: string; note: string; score: number; usable: boolean; kills: boolean }

function programRows(e: Engine, ctx: Ctx, cv: CV, i: IceV): Row[] {
  const rigged = metaUiState().riggedRolls || select.metaView(ctx).rngRigged;
  const progs = cv.programs.filter((x) => !x.evicted);
  return progs.map((pb, idx) => {
    const def = e.content.programs[pb.id];
    const pv = pb.targeting === 'ice' ? select.damagePreview(ctx, pb.id, i.uid) : [];
    let sMin = 0, sMax = 0, cMin = 0, cMax = 0, inf = 0, refl = 0, crit = false, kills = false;
    for (const x of pv) {
      sMin += x.min.shell; sMax += x.max.shell; cMin += x.min.core; cMax += x.max.core; inf += x.infected; refl += x.reflected;
      crit ||= x.crit; kills ||= x.kills;
    }
    if (rigged) { sMin = sMax; cMin = cMax; }
    const r = (a: number, b: number) => (a === b ? `${a}` : `${a}–${b}`);
    const parts: string[] = [];
    if (sMax > 0) parts.push(`shell ${r(sMin, sMax)}`);
    if (cMax > 0) parts.push(`core ${r(cMin, cMax)}`);
    if (inf > 0) parts.push(`infect ${inf}`);
    if (refl > 0) parts.push(`reflects ${refl} at you`);
    parts.push(...sideEffects(e, def?.ops ?? []).filter((x) => !(inf > 0 && x.startsWith('infected'))));
    if (pb.targeting === 'none' && !parts.length) parts.push('affects you, not the ICE');
    const notes: string[] = [];
    if (crit && pv.length) notes.push('would crit');
    if (pb.mult < 1) notes.push(`signature ×${pb.mult.toFixed(1)}`);
    const dmg = pv.find((x) => x.kind === 'crack' || x.kind === 'spike');
    if (dmg && (i.shell.type === 'none' || i.shell.points <= 0)) notes.push(`no shell: ${dmg.kind} hits the core at ×1`);
    else if (dmg && i.shell.type !== 'none' && i.status.exposed <= 0) {
      const strong = (dmg.kind === 'crack' && i.shell.type === 'crypt') || (dmg.kind === 'spike' && i.shell.type === 'wall');
      notes.push(strong ? `${dmg.kind} vs ${i.shell.type}: ×${BALANCE.shell.strong}` : `${dmg.kind} vs ${i.shell.type}: ×${BALANCE.shell.weak}, wrong tool`);
    }
    if (pb.blocked) notes.unshift(pb.blocked);
    const score = pb.blocked ? -1 : cMax + sMax * 0.6 + inf * 1.5 + (kills ? 50 : 0) - refl * 2;
    return {
      id: pb.id, slot: idx + 1, name: label(`prog:${pb.id}`, pb.name), cat: pb.category, cost: pb.cost,
      effect: parts.join(', ') || 'no effect on it', note: notes.join('; '), score, usable: !pb.blocked, kills,
    };
  });
}

function Section(p: { title: string; children: ComponentChildren; guide?: string; anchor?: string }) {
  return (
    <section class="insp-sec">
      <h4 class="insp-h">{p.title}{p.guide && <GuideLink section={p.guide} anchor={p.anchor} label={p.title} />}</h4>
      {p.children}
    </section>
  );
}

export function IceInspector(p: { engine: Engine; ctx: Ctx; cv: CV; iceUid: string | null; daemon: string | null; mode: 'column' | 'overlay' | 'sheet'; onClose?: () => void }) {
  const { engine: e, ctx, cv } = p;
  const close = p.mode !== 'column' && p.onClose ? <button class="btn ghost small insp-close" data-ui="inspector-close" aria-label="Close the inspector" onClick={p.onClose}>×</button> : null;

  // a daemon of yours
  if (p.daemon) {
    const d = cv.daemons.find((x) => x.program === p.daemon);
    const def = e.content.programs[p.daemon];
    return (
      <aside class={`inspector insp-${p.mode}`} data-ui="ice-inspector" aria-label={`Inspector: ${def?.name ?? p.daemon}`}>
        <header class="insp-head">
          <div><div class="insp-name c-amber">{def?.name ?? p.daemon}</div><span class="tag c-amber">your daemon</span></div>
          {close}
        </header>
        <div class="insp-body">
          <p>{descr(e, def?.description)}</p>
          <Section title="Running">
            <p>{d ? (d.turnsLeft > 0 ? `${d.turnsLeft} more turn${d.turnsLeft === 1 ? '' : 's'}.` : 'Until the fight ends.') : 'Not running.'} It acts on its own at End Turn, on a random enemy, and holds {def?.ram ?? 0} RAM while it runs.</p>
          </Section>
          {def?.daemon && <Section title="Each turn it"><p>{sideEffects(e, def.daemon.ops).join(', ') || 'see its description'}</p></Section>}
          {def?.flavor && <p class="insp-flavor">{def.flavor}</p>}
        </div>
      </aside>
    );
  }

  const i = cv.ice.find((x) => x.uid === p.iceUid) ?? cv.ice.find((x) => !x.subverted) ?? cv.ice[0];
  if (!i) return null;
  const def = e.content.ice[i.def];
  const base = baseType(e, def);
  const fg = fieldGuide(e, def);
  const S = BALANCE.shell;
  const iv = i.intent;
  const rawIntent = ctx.state.combat?.ice.find((x) => x.uid === i.uid)?.intent ?? null;
  const pat = iv.mapped ? pattern(def, i, rawIntent) : [];
  const rows = programRows(e, ctx, cv, i);
  const best = rows.filter((r) => r.usable && r.score > 0).sort((a, b) => b.score - a.score)[0]?.id ?? null;
  const st = i.status;
  const statusList = (Object.keys(ICE_STATUS_INFO) as (keyof typeof ICE_STATUS_INFO)[])
    .map((k) => ({ k, v: k === 'critReady' ? (st.critReady ? 1 : 0) : k === 'rootable' ? (st.rootable ? 1 : 0) : (st as unknown as Record<string, number>)[k] ?? 0 }))
    .filter((x) => x.v);
  const phaseInfo = i.phaseCount > 0 ? `phase ${i.phase + 1} of ${i.phaseCount + 1}` : null;
  const infinite = metaUiState().fakeInfiniteIntegrity && (i.boss || i.undefeatable);
  const pending = cv.pending;

  return (
    <aside class={`inspector insp-${p.mode} ${def?.black ? 'insp-black' : ''}`} data-ui="ice-inspector" aria-label={`Inspector: ${i.name}`}>
      <header class="insp-head">
        <div>
          <div class="insp-name" style={{ color: def?.black ? 'var(--red)' : i.boss ? 'var(--amber)' : undefined }}>{i.name}</div>
          <div class="hstack" style={{ gap: '6px', marginTop: '4px' }}>
            {base.name !== i.name && <span class="tag c-cyan" data-ui="inspector-type">{base.name}</span>}
            <span class="tag faint">level {i.level}{i.bonus ? ` (+${i.bonus})` : ''}</span>
            {i.boss && <span class="tag c-amber">boss{phaseInfo ? `, ${phaseInfo}` : ''}</span>}
            {i.subverted && <span class="tag c-lime">rooted: fights for you</span>}
          </div>
          {def?.black && <div class="black-label" style={{ marginTop: '6px' }}>BLACK ICE: it hits your neural HP. Neural 0 kills you.</div>}
        </div>
        {close}
      </header>

      <div class="insp-body">
        <p class="insp-desc" data-ui="inspector-description">{descr(e, base.rest || def?.description)}</p>

        <Section title="Defences" guide="shells">
          {i.shell.type !== 'none' && i.shell.max > 0 ? (
            <p>
              <b style={{ color: i.shell.type === 'crypt' ? 'var(--violet)' : 'var(--orange)' }}>{i.shell.type} shell {i.shell.points}/{i.shell.max}</b>
              {i.shell.type === 'crypt'
                ? `: crack ×${S.strong}, spike ×${S.weak}.`
                : `: spike ×${S.strong}, crack ×${S.weak}.`} Worm ignores the shell.
              {st.exposed > 0 && ` Exposed for ${st.exposed} more turn${st.exposed === 1 ? '' : 's'}: the shell is ignored.`}
              {i.shell.points <= 0 && ' The shell is broken: everything hits the core at ×1.'}
            </p>
          ) : (
            <p>No shell: crack and spike hit the core at ×1. Worm stacks Infected.</p>
          )}
          <p><b class="c-pink">core {infinite ? '∞' : `${i.core}/${i.coreMax}`}</b>{i.undefeatable ? '. It cannot drop below 1 through normal actions.' : '. At 0 it is gone.'}</p>
        </Section>

        <Section title="Next move" guide="intents">
          {i.subverted ? <p>It works for you: each ICE turn it hits a random enemy.</p> : iv.mapped ? (
            <>
              <p><b class={iv.class === 'hostile' ? 'c-red' : 'c-violet'}>{iv.label}</b>{iv.damage ? `: ${iv.damage} damage${iv.neural ? ' to your neural HP' : ''}` : ''}{iv.trace ? `, +${iv.trace} trace` : ''}.{iv.skipped ? ` It is ${iv.skipped}, so it skips this.` : ''}</p>
              {pat.length > 1 && (
                <p class="insp-pattern">Then: {pat.slice(1).map((x, k) => <span><span class={x.cls === 'hostile' ? 'c-red' : 'c-violet'}>{x.label}</span>{k < pat.length - 2 ? ' → ' : ''}</span>)}</p>
              )}
              {(() => {
                // the trick as a countdown: the next move that is not a plain hit (reshell, charge, call backup…)
                const k = pat.findIndex((x, n) => n > 0 && x.cls !== 'hostile');
                const big = pat.findIndex((x, n) => n > 0 && x.cls === 'hostile' && /×|x3|execute|charge/i.test(x.label));
                const at = k > 0 ? k : big;
                return at > 0 ? <p class="insp-countdown" data-ui="inspector-countdown">Next <b>{pat[at].label}</b> in {at} turn{at === 1 ? '' : 's'}.</p> : null;
              })()}
            </>
          ) : (
            <p>{iv.class === 'hostile' ? 'Hostile' : iv.class === 'utility' ? 'Utility (not a hit)' : 'Unknown'}. Map it (a scan program) to see exactly what it does and how hard.{iv.skipped ? ` It is ${iv.skipped}, so it skips its next action.` : ''}</p>
          )}
          {pending.length > 0 && <p class="c-red">Backup coming: {pending.map((r) => `${e.content.ice[r.ice]?.name ?? r.ice} in ${r.turns}`).join(', ')}.</p>}
        </Section>

        {statusList.length > 0 && (
          <Section title="On it now" guide="statuses">
            <ul class="insp-statuses">
              {statusList.map(({ k, v }) => {
                const info = ICE_STATUS_INFO[k];
                return (
                  <li>
                    <button type="button" class="status-chip g-link" style={{ color: info.color }} data-ui={`inspector-status-${k}`} onClick={() => openGuide('statuses', `status-${k}`)}>{info.short}{typeof v === 'number' && v > 1 && v < 999 ? ` ${v}` : ''}</button>
                    <span>{fill(info.tip, { n: v >= 999 ? '∞' : v })}</span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {!i.subverted && (
          <Section title="Your programs vs this">
            <table class="insp-table" data-ui="inspector-programs">
              <tbody>
                {rows.map((r) => (
                  <tr class={`${r.usable ? '' : 'off'} ${r.id === best ? 'best' : ''}`} data-ui={`inspector-prog-${r.id}`}>
                    <td class="k"><span class="kbd">{r.slot}</span></td>
                    <td>
                      <div class="pname" style={{ borderLeftColor: CATEGORY_COLOR[r.cat as keyof typeof CATEGORY_COLOR] }}>{r.name} <span class="faint">{r.cost}c</span>{r.id === best && <span class="best-tag" title="Most damage right now">best hit</span>}</div>
                      <div class="peff">{r.effect}{r.kills && <b class="c-lime"> kills</b>}</div>
                      {r.note && <div class="pnote">{r.note}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {fg && (
          <Section title="How to beat it" guide="ice-field-guide">
            <p>{fg.trick} <b>{fg.answer}</b></p>
          </Section>
        )}
        {def?.flavor && <p class="insp-flavor">“{fillState(e, def.flavor)}”</p>}
      </div>
    </aside>
  );
}

/** Which mode the inspector uses, from the arena's width. */
export function inspectorMode(arenaWidth: number, phone: boolean): 'column' | 'overlay' | 'sheet' {
  if (phone) return 'sheet';
  return arenaWidth >= 760 ? 'column' : 'overlay';
}

export function toggleInspector(open?: boolean): void {
  ui.set((s) => ({ inspectOpen: open ?? !s.inspectOpen }));
}
