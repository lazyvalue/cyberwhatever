// The scroll: the one place for status and event text. Engine lines plus everything the UI reports through
// logLine() (game.ts). Desktop: a docked column, always visible. Phone: a 3-line ticker that opens the drawer.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Engine, LogEntry } from '../../engine/index.ts';
import { ui, sessionLog, IMPORTANT } from '../game.ts';
import { metaText } from '../metaBridge.ts';
import { useStore } from '../store.ts';

type Filter = 'all' | 'combat' | 'story' | 'system' | 'hints';
const KIND: Record<string, { f: Filter; tag: string }> = {
  combat: { f: 'combat', tag: 'fight' },
  story: { f: 'story', tag: 'story' },
  info: { f: 'system', tag: 'sys' },
  warn: { f: 'system', tag: 'warn' },
  engine: { f: 'system', tag: 'eng' },
  ui: { f: 'hints', tag: 'hint' },
};

function allLines(e: Engine, session: LogEntry[]): LogEntry[] {
  return session.length ? [...e.state.log, ...session].sort((a, b) => a.cycle - b.cycle) : e.state.log;
}

export function lineView(l: LogEntry): { text: string; important: boolean; turn: boolean } {
  const important = l.text.startsWith(IMPORTANT);
  const text = metaText(important ? l.text.slice(1) : l.text);
  return { text, important: important || l.level === 'warn' || l.level === 'engine', turn: l.level === 'combat' && /^Turn \d+\./.test(text) };
}

export function LogPanel(p: { engine: Engine; mode: 'docked' | 'drawer' }) {
  const [filter, setFilter] = useState<Filter>('all');
  const session = useStore(sessionLog).lines;
  const ref = useRef<HTMLDivElement>(null);
  const all = allLines(p.engine, session);
  const lines = all.filter((l) => filter === 'all' || (KIND[l.level]?.f ?? 'system') === filter).slice(-500);
  const lastLen = useRef(all.length);
  const fresh = Math.max(0, all.length - lastLen.current);
  const stick = useRef(true);
  const auto = useRef(false);
  const [unseen, setUnseen] = useState(0);

  useEffect(() => {
    lastLen.current = all.length;
    const el = ref.current;
    if (!el) return;
    if (stick.current) {
      // our own scroll is not the player scrolling up: set it now and again after layout settles
      auto.current = true;
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(() => {
        auto.current = true;
        el.scrollTop = el.scrollHeight;
      });
    } else if (fresh > 0) setUnseen((n) => n + fresh);
  });

  const toBottom = () => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    stick.current = true;
    setUnseen(0);
  };

  return (
    <aside class={`log ${p.mode}`} aria-label="Game log" data-ui="log">
      <div class="log-head">
        <span class="h-sub">log</span>
        <span class="hstack" style={{ gap: '2px' }}>
          {(['all', 'combat', 'story', 'system', 'hints'] as Filter[]).map((f) => (
            <button class={`btn ghost small ${filter === f ? 'c-cyan' : ''}`} data-ui={`log-${f}`} onClick={() => setFilter(f)} aria-pressed={filter === f}>{f}</button>
          ))}
          {p.mode === 'drawer' && <button class="btn ghost small" data-ui="log-close" onClick={() => ui.set({ logOpen: false })} aria-label="Close log">×</button>}
        </span>
      </div>
      <div
        class="log-lines scroll"
        ref={ref}
        role="log"
        aria-live="polite"
        onScroll={(ev) => {
          const el = ev.currentTarget as HTMLDivElement;
          if (auto.current) {
            auto.current = false;
            return;
          }
          stick.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
          if (stick.current && unseen) setUnseen(0);
        }}
      >
        {lines.map((l, i) => {
          const v = lineView(l);
          return (
            <div class={`log-line l-${l.level} ${v.important ? 'important' : ''} ${v.turn ? 'turn' : ''} ${i >= lines.length - fresh ? 'fresh' : ''}`}>
              <span class="cyc">{l.cycle}</span>
              <span class="kind">{KIND[l.level]?.tag ?? l.level}</span>
              <span class="txt">{v.text}</span>
            </div>
          );
        })}
      </div>
      {unseen > 0 && (
        <button class="log-new" data-ui="log-new" onClick={toBottom}>{unseen} new ↓</button>
      )}
    </aside>
  );
}

/** Phone and narrow windows: the latest three lines, always on screen. Tap to open the full log. */
export function LogTicker(p: { engine: Engine }) {
  const session = useStore(sessionLog).lines;
  const all = allLines(p.engine, session);
  const last = all.slice(-3);
  const lastLen = useRef(all.length);
  const fresh = Math.max(0, all.length - lastLen.current);
  useEffect(() => {
    lastLen.current = all.length;
  });
  return (
    <button class="log-ticker" data-ui="log-ticker" aria-label="Latest log lines. Open the log." onClick={() => ui.set({ logOpen: true })}>
      {last.map((l, i) => {
        const v = lineView(l);
        return (
          <span class={`log-line l-${l.level} ${v.important ? 'important' : ''} ${i >= last.length - fresh ? 'fresh' : ''}`}>
            <span class="kind">{KIND[l.level]?.tag ?? l.level}</span>
            <span class="txt">{v.text.split('\n')[0]}</span>
          </span>
        );
      })}
      <span class="log-ticker-more" aria-hidden="true">log ▴</span>
    </button>
  );
}
