// Messages: DMs and mail, the Dead Drop BBS, system notices. Unread badges per channel.
import { useEffect, useState } from 'preact/hooks';
import type { Engine, Message } from '../../../engine/index.ts';
import { Portrait, Btn } from '../../components/common.tsx';
import { rich } from '../../overlays/Overlays.tsx';
import { hud, npcName, npcHandle, fillState } from '../../copy.ts';

type Box = 'dm' | 'bbs' | 'system';
const BOXES: { id: Box; name: string }[] = [
  { id: 'dm', name: 'Direct' },
  { id: 'bbs', name: 'Dead Drop BBS' },
  { id: 'system', name: 'System' },
];
const inBox = (m: Message, b: Box) => (b === 'dm' ? m.channel === 'dm' || m.channel === 'mail' : m.channel === b);

/** A contact's conversation, if the story wrote one: `dlg.<npc>.chat`, else `dlg.<npc>.first_contact`. */
export function contactDialogue(e: Engine, npc: string): string | null {
  for (const id of [`dlg.${npc}.chat`, `dlg.${npc}.first_contact`]) if (e.content.dialogues[id]) return id;
  return null;
}

function markRead(e: Engine, m: Message): void {
  if (!m.read) e.dispatch({ type: 'message/read', id: m.id });
}

export function InboxPanel(p: { engine: Engine }) {
  const e = p.engine;
  const [box, setBox] = useState<Box>('dm');
  const [sel, setSel] = useState<string | null>(null);
  const msgs = e.state.messages.filter((m) => inBox(m, box)).slice().reverse();
  const current = msgs.find((m) => m.id === sel) ?? null;
  const unreadBbs = box === 'bbs' ? msgs.filter((m) => !m.read).length : 0;
  useEffect(() => {
    if (box === 'bbs') e.state.messages.filter((m) => m.channel === 'bbs' && !m.read).forEach((m) => markRead(e, m));
  }, [box, unreadBbs]);

  return (
    <div class="stack">
      <div class="vendor-tabs" role="tablist">
        {BOXES.map((b) => {
          const unread = e.state.messages.filter((m) => inBox(m, b.id) && !m.read).length;
          return (
            <button role="tab" aria-selected={box === b.id} class={`btn small ${box === b.id ? 'primary' : ''}`} data-ui={`inbox-${b.id}`} onClick={() => { setBox(b.id); setSel(null); }}>
              {b.name} {unread > 0 && <span class="badge">{unread}</span>}
            </button>
          );
        })}
        {box !== 'bbs' && msgs.some((m) => !m.read) && (
          <button class="btn small ghost" onClick={() => msgs.forEach((m) => markRead(e, m))}>Mark all read</button>
        )}
      </div>

      {msgs.length === 0 ? (
        <div class="empty">{hud(e, 'inboxEmpty')}</div>
      ) : box === 'bbs' ? (
        <section class="win">
          {msgs.map((m) => {
            const from = e.content.npcs[m.from] ? npcHandle(e, m.from) : m.from;
            return (
              <article class="bbs-post">
                <div class="hstack" style={{ justifyContent: 'space-between' }}>
                  <span class="who">{from}</span>
                  <span class="faint" style={{ fontSize: '0.867rem' }}>{m.from === 'wraith' ? '--:--' : `cycle ${m.cycle}`}</span>
                </div>
                {m.subject && <div class="row-title">{m.subject}</div>}
                <div class="msg-body">{rich(fillState(e, m.text))}</div>
                {m.from === 'wraith' && contactDialogue(e, 'wraith') && (
                  <div style={{ marginTop: '6px' }}><Btn class="small ghost" ui="reply-wraith" action={{ type: 'dialogue/start', dialogue: contactDialogue(e, 'wraith')! }}>Reply</Btn></div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <div class="inbox">
          <section class="win scroll" style={{ maxHeight: '62vh' }}>
            <div class="list">
              {msgs.map((m) => (
                <div
                  class={`row msg-row ${m.read ? '' : 'unread'} ${current?.id === m.id ? 'sel' : ''}`}
                  role="button"
                  tabIndex={0}
                  data-ui={`msg-${m.id}`}
                  onClick={() => { setSel(m.id); markRead(e, m); }}
                  onKeyDown={(ev) => { if (ev.key === 'Enter') { setSel(m.id); markRead(e, m); } }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div class="row-title">{npcName(e, m.from)}</div>
                    <div class="row-meta" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.subject && m.subject !== 'comms' ? m.subject : m.text}</div>
                  </div>
                  <span class="faint" style={{ fontSize: '0.867rem' }}>{m.cycle}</span>
                </div>
              ))}
            </div>
          </section>
          <section class="win" aria-live="polite">
            {current ? (
              <div class="win-body" style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '14px' }}>
                <div class="portrait-box" style={{ width: '72px', height: '72px' }}><Portrait id={current.from} revealed={current.from === 'glitch' ? !!e.state.story.flags.patch_revealed : !!e.state.story.flags.auntie_unmasked} /></div>
                <div>
                  <div class="h-panel" style={{ fontSize: '1.267rem' }}>{npcName(e, current.from)}</div>
                  <div class="faint" style={{ fontSize: '0.867rem', marginBottom: '10px' }}>{current.subject && current.subject !== 'comms' ? current.subject : `${current.subject === 'comms' ? 'comms' : current.channel}, cycle ${current.cycle}`}</div>
                  <div class="msg-body">{rich(fillState(e, current.text))}</div>
                  {contactDialogue(e, current.from) && (
                    <div style={{ marginTop: '14px' }}>
                      <Btn class="small primary" ui={`talk-${current.from}`} action={{ type: 'dialogue/start', dialogue: contactDialogue(e, current.from)! }}>Talk to {npcName(e, current.from)}</Btn>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div class="empty">Pick a message.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
