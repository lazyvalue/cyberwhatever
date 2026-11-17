// The home deck. A rail of apps on the left (a strip on phones), one app open at a time.
import { useEffect } from 'preact/hooks';
import { select, type Engine } from '../../engine/index.ts';
import { audio } from '../../audio/index.ts';
import { ui, keysBlocked, toast, logLine, type HubTab } from '../game.ts';
import { hud, label, randomTip } from '../copy.ts';
import { Icon, Kbd } from '../components/common.tsx';
import { NetPanel } from './hub/NetPanel.tsx';
import { GuideLink, contextSection } from '../overlays/Guide.tsx';
import { DeckPanel } from './hub/DeckPanel.tsx';
import { BotnetPanel } from './hub/BotnetPanel.tsx';
import { MarketPanel } from './hub/MarketPanel.tsx';
import { WalletPanel } from './hub/WalletPanel.tsx';
import { InboxPanel } from './hub/InboxPanel.tsx';
import { JobsPanel } from './hub/JobsPanel.tsx';
import { FilesPanel } from './hub/FilesPanel.tsx';
import { RepPanel, StatsPanel } from './hub/RepStats.tsx';

interface TabDef { id: HubTab; name: string; key: string; title: string; blurb: (e: Engine) => string; badge?: (e: Engine) => number; }

export const TABS: TabDef[] = [
  { id: 'net', name: 'Net', key: 'n', title: 'Address book', blurb: (e) => hud(e, 'greeting') + ' Pick an address and dial in.' },
  { id: 'jobs', name: 'Jobs', key: 'j', title: 'Objectives and jobs', blurb: () => 'What you are after, and paid work from the Dead Drop. Accept a job, do it, turn it in.', badge: (e) => select.jobsView(e).filter((j) => j.status === 'ready' || j.status === 'available').length },
  { id: 'inbox', name: 'Inbox', key: 'i', title: 'Messages', blurb: () => 'DMs, the Dead Drop board, and system notices.', badge: (e) => select.unreadMessages(e) },
  { id: 'deck', name: 'Deck', key: 'd', title: 'Deck and loadout', blurb: () => 'Your hardware and the programs you take into a run. Loaded programs must fit in RAM.' },
  { id: 'botnet', name: 'Botnet', key: 'b', title: 'Botnet', blurb: (e) => hud(e, 'botnetTab') + ' Give every host a job.' },
  { id: 'market', name: 'Market', key: 'm', title: 'Market', blurb: () => 'Hardware, warez, the clinic, the broker, and the fixer.' },
  { id: 'wallet', name: 'Wallet', key: 'w', title: '$HODL wallet', blurb: () => 'Mined coin. The price moves every 10 cycles. Nothing moves while you sit at home.' },
  { id: 'files', name: 'Files', key: 'f', title: 'Files', blurb: () => 'Paydata to sell, keys and passwords, and the lore you found.', badge: (e) => e.state.player.paydata.length },
  { id: 'rep', name: 'Rep', key: 'r', title: 'Rep, perks, implants', blurb: () => 'Rep unlocks shop tiers and jobs. Every second level offers a perk.', badge: (e) => (e.state.player.pendingPerks ? 1 : 0) },
  { id: 'stats', name: 'Stats', key: 's', title: 'Stats', blurb: () => 'What you have done. Some of it is counted somewhere you cannot reset.' },
];

const ICON: Record<HubTab, string> = { net: 'net', deck: 'deck', botnet: 'botnet', market: 'market', wallet: 'wallet', inbox: 'inbox', jobs: 'jobs', files: 'files', rep: 'rep', stats: 'stats' };

export function Hub(p: { engine: Engine; tab: HubTab }) {
  const e = p.engine;
  const tab = TABS.find((t) => t.id === p.tab) ?? TABS[0];

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const tgt = ev.target as HTMLElement;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
      if (keysBlocked()) return;
      const t = TABS.find((x) => x.key === ev.key.toLowerCase());
      if (t) {
        audio.play('ui_click', { volume: 0.4 });
        ui.set({ tab: t.id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [e]);

  // idle tips (script 04 §13): a tip after a minute of nothing, the engine sulks after three
  useEffect(() => {
    let t1 = 0, t2 = 0;
    const arm = () => {
      clearTimeout(t1);
      clearTimeout(t2);
      t1 = window.setTimeout(() => { if (!keysBlocked()) toast(randomTip(e), 'info', 7000); }, 60_000);
      t2 = window.setTimeout(() => { if (!keysBlocked()) logLine('[engine] info: player idle. world paused. world does not enjoy this.', 'engine'); }, 180_000);
    };
    arm();
    window.addEventListener('pointerdown', arm);
    window.addEventListener('keydown', arm);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
    };
  }, [e]);

  return (
    <div class="hub">
      <nav class="rail" aria-label="Home deck apps">
        <div class="rail-title">
          <div class="display">{label('hubTitle', hud(e, 'hubTitle'))}</div>
          <div class="greet">{hud(e, 'idle')}</div>
        </div>
        {TABS.map((t) => {
          const b = t.badge?.(e) ?? 0;
          return (
            <button
              class={`rail-btn ${t.id === tab.id ? 'on' : ''}`}
              data-ui={`hub-${t.id}`}
              aria-current={t.id === tab.id ? 'page' : undefined}
              onClick={() => {
                audio.play('ui_click', { volume: 0.4 });
                ui.set({ tab: t.id });
              }}
            >
              <Icon name={ICON[t.id]} />
              <span>{t.name}</span>
              {b > 0 && <span class="badge">{b}</span>}
              <Kbd>{t.key}</Kbd>
            </button>
          );
        })}
      </nav>
      <section class="hub-main" aria-labelledby="hub-title">
        <header class="hub-head">
          <div>
            <h1 id="hub-title" class="h-screen">{tab.title} <GuideLink section={contextSection(e)} label={tab.title} /></h1>
            <p>{tab.blurb(e)}</p>
          </div>
        </header>
        <div class="hub-content" data-ui={`panel-${tab.id}`}>
          {tab.id === 'net' && <NetPanel engine={e} />}
          {tab.id === 'deck' && <DeckPanel engine={e} />}
          {tab.id === 'botnet' && <BotnetPanel engine={e} />}
          {tab.id === 'market' && <MarketPanel engine={e} />}
          {tab.id === 'wallet' && <WalletPanel engine={e} />}
          {tab.id === 'inbox' && <InboxPanel engine={e} />}
          {tab.id === 'jobs' && <JobsPanel engine={e} />}
          {tab.id === 'files' && <FilesPanel engine={e} />}
          {tab.id === 'rep' && <RepPanel engine={e} />}
          {tab.id === 'stats' && <StatsPanel engine={e} />}
        </div>
      </section>
    </div>
  );
}
