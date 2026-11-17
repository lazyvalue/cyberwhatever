// Fixer board: jobs and objectives.
import { select, type Engine } from '../../../engine/index.ts';
import { Btn } from '../../components/common.tsx';
import { npcName, money, descr, fillState } from '../../copy.ts';

const PAID_LINES = ['Lovely.', "You're my favourite.", 'Next!', "Don't stop now.", "That's how we do it, kiddo."];

const STATUS: Record<string, { label: string; cls: string }> = {
  available: { label: 'OPEN', cls: 'c-cyan' },
  active: { label: 'ON IT', cls: 'c-pink' },
  ready: { label: 'READY', cls: 'c-lime' },
  done: { label: 'PAID', cls: 'faint' },
  failed: { label: 'FAILED', cls: 'c-red' },
};

export function JobsPanel(p: { engine: Engine }) {
  const e = p.engine;
  const jobs = select.jobsView(e);
  const order = { ready: 0, active: 1, available: 2, done: 3, failed: 4, locked: 5 } as Record<string, number>;
  const list = jobs.slice().sort((a, b) => order[a.status] - order[b.status]);
  const objs = select.objectivesView(e).filter((o) => o.kind !== 'tutorial');
  const unmasked = !!e.state.story.flags.auntie_unmasked;
  return (
    <div class="stack">
      {objs.length > 0 && (
        <section class="win" data-ui="objectives">
          <div class="win-head"><h2 class="h-sub">Objectives</h2></div>
          <div class="list">
            {objs.map((o) => (
              <div class="row" style={{ gridTemplateColumns: 'auto 1fr auto', opacity: o.status === 'active' ? 1 : 0.55 }}>
                <span class={o.status === 'done' ? 'c-lime' : o.status === 'failed' ? 'c-red' : o.kind === 'main' ? 'c-pink' : 'c-cyan'}>{o.status === 'done' ? '[x]' : o.status === 'failed' ? '[-]' : '[ ]'}</span>
                <span class="row-title" style={{ fontWeight: o.kind === 'main' ? 600 : 400 }}>{fillState(e, o.text)}</span>
                <span class="tag faint">{o.kind}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {!list.length && <div class="empty">The board is empty. Check your messages.</div>}
      {list.map((j, i) => {
        const st = STATUS[j.status] ?? { label: j.status, cls: '' };
        const target = j.target ? e.content.systems[j.target]?.address ?? j.target : null;
        return (
          <section class="win" data-ui={`job-${j.id}`} style={j.status === 'done' ? { opacity: 0.6 } : undefined}>
            <div class="win-head">
              <div>
                <div class="h-panel" style={{ fontSize: '1.267rem' }}>{j.title}</div>
                <div class="dim" style={{ fontSize: '0.867rem' }}>from {npcName(e, j.giver)}{target ? `, target ${target}` : ''}</div>
              </div>
              <span class={`tag ${st.cls}`}>{st.label}</span>
            </div>
            <div class="win-body stack" style={{ gap: '8px' }}>
              <p style={{ margin: 0 }}>{descr(e, j.description)}</p>
              <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none' }}>
                {j.objectives.map((o, k) => (
                  <li class={j.objectivesDone[k] ? 'c-lime' : ''} style={{ fontSize: '0.867rem' }}>
                    {j.objectivesDone[k] ? '[x] ' : '[ ] '}{o.text}
                  </li>
                ))}
              </ul>
              <div class="hstack" style={{ justifyContent: 'space-between' }}>
                <span class="dim" style={{ fontSize: '0.867rem' }}>
                  Pays {j.reward.credits ? <span class="c-amber">{money(j.reward.credits)}</span> : 'nothing'}
                  {j.reward.xp ? `, ${j.reward.xp} xp` : ''}
                  {j.heat ? <span class="c-red">, loud: +{j.heat} heat</span> : ''}
                  {j.minRep ? `, rep ${j.minRep}+` : ''}
                </span>
                <span class="hstack">
                  {j.status === 'available' && <Btn class="primary small" ui={`job-accept-${j.id}`} action={{ type: 'job/accept', job: j.id }}>Accept</Btn>}
                  {j.status === 'ready' && <Btn class="money" ui={`job-turnin-${j.id}`} action={{ type: 'job/turnIn', job: j.id }}>Turn in</Btn>}
                  {(j.status === 'active' || j.status === 'ready') && <Btn class="ghost small" ui={`job-abandon-${j.id}`} action={{ type: 'job/abandon', job: j.id }}>Abandon</Btn>}
                  {j.status === 'done' && <span class="faint" style={{ fontSize: '0.867rem' }}>Auntie says: "{unmasked ? 'Engagement up 3%!' : PAID_LINES[i % PAID_LINES.length]}"</span>}
                </span>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
