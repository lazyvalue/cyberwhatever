// UI copy: HUD strings by humanity tier (script 04 §14), heat bands (§7), failure screens (§8), tips (§13).
// Content-specific text (systems, programs, NPC lines) always comes from the content registry, never from here.
import { select, type Engine, type HeatLevel, type ProgramCategory, type IceStatusKey, type PlayerStatusKey } from '../engine/index.ts';
import { metaUiState, metaText, metaScramble } from './metaBridge.ts';

export type Tier = 'warm' | 'cold' | 'unit';

const HUD = {
  hubTitle: ['home deck', 'deck', 'TERMINAL 0'],
  greeting: ['Welcome back, {handle}.', '{handle}. Online.', 'UNIT ONLINE.'],
  jackIn: ['Dial in', 'Connect', 'EXECUTE'],
  jackOut: ['Hang up', 'Disconnect', 'TERMINATE SESSION'],
  endTurn: ['End turn', 'End turn', 'YIELD'],
  combatWin: ['ICE down! Nice.', 'ICE terminated.', 'TARGET NULL.'],
  loot: ['You grab {file}. Nice find.', '{file} acquired.', '+1 OBJECT.'],
  capture: ['{system} is yours. Hosts love you.', '{system} captured.', '{system}: ASSIMILATED.'],
  sold: ['Sold {file} for {x}¤. Treat yourself.', 'Sold {file}: {x}¤.', '+{x}.'],
  inboxEmpty: ['No messages. Peace and quiet. Suspicious.', 'No messages.', '0.'],
  heatTip: ['How much the world wants you.', 'Heat.', 'EXPOSURE INDEX.'],
  humanityTip: ["What's left of you. It's a lot. Keep it.", 'Humanity remaining.', 'LEGACY VALUE.'],
  botnetTab: ['Your hosts. Your little army.', 'Hosts.', 'LIMBS.'],
  repUp: ["Rep up! You're somebody now.", 'Rep {rep}.', 'RANK {rep}.'],
  idle: ["The deck hums. The coffee's cold.", 'Idle.', 'AWAITING INSTRUCTION.'],
} as const;
export type HudKey = keyof typeof HUD;

export function tierOf(engine: Engine): Tier {
  return select.humanityTier(engine);
}

export function hud(engine: Engine, key: HudKey, vars: Record<string, string | number> = {}): string {
  const t = tierOf(engine);
  const i = t === 'warm' ? 0 : t === 'cold' ? 1 : 2;
  return fill(HUD[key][i], { handle: select.displayHandle(engine), rep: engine.state.player.rep, ...vars });
}

/** A HUD label the meta layer may override (MetaUiState.hudOverride). */
export function label(key: string, fallback: string): string {
  const o = metaUiState().hudOverride[key];
  return typeof o === 'string' ? o : fallback;
}

export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Placeholders the script uses inside story/hint text. All local reads (DESIGN §11.1). */
export function fillState(engine: Engine, text: string): string {
  const s = engine.state;
  return metaText(fill(text, {
    handle: select.displayHandle(engine),
    rep: s.player.rep,
    credits: s.player.credits,
    heat: Math.round(s.player.heat),
    humanity: s.player.humanity,
    control: `${select.controlPct(engine)}%`,
    flatlines: s.player.flatlinesTotal,
    hodl: s.player.coin.toFixed(2),
    botnetSize: s.player.hosts.filter((h) => h.role === 'botnet').length,
    localTime: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
    viewport: `${window.innerWidth}×${window.innerHeight}`,
  }));
}

/** Flavor text vanishes below 40 humanity (DESIGN §4). Descriptions shout at UNIT tier. */
export function flavor(engine: Engine, text: string | undefined): string | null {
  if (!text) return null;
  return tierOf(engine) === 'warm' ? text : null;
}
export function descr(engine: Engine, text: string | undefined): string {
  if (!text) return '';
  return tierOf(engine) === 'unit' ? text.toUpperCase() : text;
}

// ------------------------------------------------------------------ heat

export const HEAT_BANDS: Record<HeatLevel, { label: string; tip: string; toast: string | null }> = {
  cool: { label: 'Cool', tip: "Nobody's looking. Enjoy it.", toast: null },
  noticed: { label: 'Noticed', tip: 'Runs start at 10 trace. Someone has your name on a sticky note.', toast: "Heat: Noticed. You're a name on a sticky note." },
  hunted: { label: 'Hunted', tip: 'Hunter ICE in every system. The sticky note is now a folder.', toast: "Heat: Hunted. You have a folder now. It's thick." },
  burned: { label: 'Burned', tip: 'Owned systems get reclaimed. Shops +25%. The folder has a photo.', toast: "Heat: Burned. They have a photo. It's not your good side." },
  raid: { label: 'Raid', tip: 'They come to you.', toast: 'RAID. Your deck has visitors.' },
};

export const TRACE_TIPS = {
  calm: 'Trace. At 33 the system gets Suspicious, at 66 it sounds the Alarm, at 100 you are Traced.',
  suspicious: 'Suspicious: every ICE has +1 shell level.',
  alarm: 'Alarm: a hunter ICE joins fights after 2 turns. Vaults seal unless Security is captured.',
  traced: 'Traced.',
};

// ------------------------------------------------------------------ npc names

export function npcName(engine: Engine, id: string): string {
  const f = engine.state.story.flags;
  if (id === 'glitch' && f.patch_revealed) return 'PATCH';
  if (id === 'auntie' && f.auntie_unmasked) return 'Auntie Static (CHAIRMAN)';
  return engine.content.npcs[id]?.name ?? id;
}
export function npcHandle(engine: Engine, id: string): string {
  if (id === 'glitch' && engine.state.story.flags.patch_revealed) return 'PATCH';
  return engine.content.npcs[id]?.handle ?? id;
}

export function act(engine: Engine): number {
  const f = engine.state.story.flags;
  if (typeof f.act === 'number') return f.act;
  if (f.act3_started || f.act2_done) return 3;
  if (f.act2_started || f.act1_done) return 2;
  return 1;
}

// ------------------------------------------------------------------ failure screens

export const FAILURE = {
  dumped: {
    title: ['DUMPED', 'DUMPED', 'DECK FAULT.'],
    lines: [
      'Your deck hit zero. The system threw you out like a bad date. You lost this run\'s paydata. One program is corrupted.',
      "The Potato-9 has made a noise it has never made before. You're out. Paydata gone. One program is now mostly static.",
      'Ejected. Your deck is smoking. Not in the cool way. One program needs repairs, and so does your pride.',
      "Integrity: 0. Dignity: also 0. You're back home with less than you left with.",
    ],
    act3: "Dumped! Don't worry. We kept your seat warm. —C.",
  },
  traced: {
    title: ['TRACED', 'TRACED', 'LOCATED.'],
    lines: [
      'They found you. Not your deck. *You*. Account frozen: 20%. The system is hardened. One host burned.',
      "Trace complete. Somewhere a van has your address. It's a nice van. You don't want to meet it.",
      "100%. A KH compliance bot just said your real name out loud. It mispronounced it. That's the only good news.",
      'You stayed one node too long. Greed is a lovely feeling right up until this one.',
    ],
    act3: 'Traced! Hi! We already knew where you were. We always know. —C.',
  },
  flatlined: {
    title: ['FLATLINED', 'FLATLINED', 'PROCESS ENDED. RESTART.'],
    lines: [
      'Black ICE stopped your heart. You were warned. It was red. It had a skull on it.',
      "Neural: 0. You are dead. This is the part where you reload. The counter doesn't.",
      'Your brain has been formatted. Reload the checkpoint. Someone is keeping score.',
      "Flatline #{flatlines}. That number lives outside your save. It isn't going anywhere.",
    ],
    act3: "Flatline #{flatlines}! Every time, you come back. That's not failure. That's loyalty. —C.",
  },
};

// ------------------------------------------------------------------ tips

const TIPS: { t: string; act?: [number, number] }[] = [
  { t: 'Probe before you poke. Knowing costs a cycle. Not knowing costs a deck.' },
  { t: 'Same program twice is a pattern. Three times is a subscription. Mix it up.' },
  { t: 'Three categories in one turn is Flow. Flow is free cycles. Free is good.' },
  { t: 'Crack beats crypt. Spike beats walls. Worm beats everyone, slowly.' },
  { t: "Kill the Bloodhound first. It's the one telling everyone where you are." },
  { t: "A Killer that's charging is a Killer about to ruin your day. Decoy, stun, or burst." },
  { t: 'Honeypots look like loot. Probes find them. Greed finds them faster.' },
  { t: 'Hanging up is free outside a fight. Pride is expensive.' },
  { t: 'Black ICE is always red, always labelled, and always serious.' },
  { t: 'Hosts in Proxy hide you. Hosts in Mine pay you. Hosts in Botnet… are very popular with someone.' },
  { t: 'Heat decays with time. Time passes in systems, not at home.' },
  { t: 'Owned systems can be reclaimed at high heat. Keep it cool.' },
  { t: 'Tagged data is hot. Fence it, or wear the heat.' },
  { t: 'The Potato-9 is not a good deck. It is *a* deck.' },
  { t: 'Doc can remove anything. Doc will offer.' },
  { t: 'Whisper sells addresses, passwords, and information about you. Mostly you.' },
  { t: 'You can always come back to a system. It will remember you. So will its ICE.' },
  { t: 'Tip: tips are written by someone who wants you to keep reading tips.' },
  { t: 'Did you know? You can stop playing at any time. This tip has been retired.', act: [1, 2] },
  { t: "There's a button in the corner now.", act: [3, 9] },
  { t: "Press the backtick key. Or don't. It's not like it's important.", act: [3, 9] },
  { t: "Loading… (it isn't loading. it's waiting for you.)", act: [3, 9] },
];

export function randomTip(engine: Engine): string {
  const a = act(engine);
  const pool = TIPS.filter((x) => !x.act || (a >= x.act[0] && a <= x.act[1]));
  return pool[Math.floor(Math.random() * pool.length)].t;
}

// ------------------------------------------------------------------ vocab

export const CATEGORY_COLOR: Record<ProgramCategory, string> = {
  attack: 'var(--cat-attack)',
  exploit: 'var(--cat-exploit)',
  defense: 'var(--cat-defense)',
  stealth: 'var(--cat-stealth)',
  daemon: 'var(--cat-daemon)',
  special: 'var(--cat-special)',
};
export const CATEGORY_HEX: Record<ProgramCategory, string> = {
  attack: '#ff5c7a', exploit: '#a98bff', defense: '#4cf0ff', stealth: '#6dffc1', daemon: '#ffb13d', special: '#f5ef8a',
};

export const ICE_STATUS_INFO: Record<IceStatusKey | 'rootable' | 'critReady', { short: string; color: string; tip: string }> = {
  mapped: { short: 'mapped', color: 'var(--cyan)', tip: 'Mapped: you see its exact intent. Turns left: {n}.' },
  critReady: { short: 'crit', color: 'var(--amber)', tip: 'Crit ready: your next hit on it does ×1.5.' },
  unstable: { short: 'unstable', color: 'var(--violet)', tip: 'Unstable({n}): an overflow program consumes these stacks for bonus damage.' },
  backdoored: { short: 'backdoor', color: 'var(--violet)', tip: 'Backdoored: Rootable in {n} turns.' },
  rootable: { short: 'rootable', color: 'var(--lime)', tip: 'Rootable: a root program subverts it. It fights for you for the rest of the fight.' },
  exposed: { short: 'exposed', color: 'var(--pink)', tip: 'Exposed: its shell is ignored for {n} turns.' },
  stunned: { short: 'stunned', color: 'var(--cyan)', tip: 'Stunned: it skips its next {n} actions. Its intent stays.' },
  slowed: { short: 'slowed', color: 'var(--cyan)', tip: 'Slowed: its intent is delayed one turn.' },
  marked: { short: 'marked', color: 'var(--amber)', tip: 'Marked: botnet actions do ×1.5 against it for {n} turns.' },
  infected: { short: 'infected', color: 'var(--lime)', tip: 'Infected({n}): takes n core damage at the end of each ICE turn, ignoring shells. Decays by 1. Jumps to another ICE when this one dies.' },
};

export const PLAYER_STATUS_INFO: Record<PlayerStatusKey, { short: string; good: boolean; tip: string }> = {
  decoy: { short: 'decoy', good: true, tip: 'Decoy({n}): absorbs the next {n} ICE attacks.' },
  masked: { short: 'masked', good: true, tip: 'Masked: trace gain is halved this turn.' },
  tarred: { short: 'tarred', good: false, tip: 'Tarred({n}): −{n} cycles next turn.' },
  anchored: { short: 'anchored', good: false, tip: 'Anchored: you cannot disengage or hang up for {n} turns.' },
  burn: { short: 'burn', good: false, tip: 'Burn({n}): {n} neural damage at the start of your turn. Decays by 1.' },
  labelsScrambled: { short: 'scrambled ui', good: false, tip: 'Your program labels are scrambled. The buttons still work. Probably.' },
  stunned: { short: 'stunned', good: false, tip: 'Stunned: you lose your next turn.' },
};

export const NODE_TYPE_INFO: Record<string, string> = {
  gateway: 'Gateway. The way in.',
  router: 'Router. Capture it to reveal the whole map. Netscan here finds new addresses.',
  datastore: 'Datastore. Files: paydata, programs, addresses, keys, lore.',
  security: 'Security. Capture it to halve trace gain and stop reinforcements.',
  io: 'IO device. Do something to the real world.',
  vault: 'Vault. Locked. Needs a key or password from somewhere else.',
  process: 'Process. Something lives here. You can talk to it.',
  honeypot: 'Honeypot. Looks like a datastore. Looting it spikes trace.',
  core: 'Core. Capture it and you own the system.',
  unknown: 'Not revealed yet.',
};

export const NODE_ACTION_LABEL: Record<string, string> = {
  'run/probe': 'Probe',
  'run/sneak': 'Sneak',
  'run/breach': 'Breach',
  'run/backdoor': 'Backdoor',
  'run/unlock': 'Unlock',
  'run/loot': 'Loot',
  'run/capture': 'Capture',
  'run/use': 'Use',
  'run/talk': 'Talk',
  'run/netscan': 'Netscan',
};
export const NODE_ACTION_TIP: Record<string, string> = {
  'run/probe': '1 cycle, +2 trace. Reveals ICE types, levels, shells, and honeypots.',
  'run/sneak': 'Roll the sneak chance. Success: ICE sleeps; you may loot and pass, not capture. Fail: ambush and +10 trace.',
  'run/breach': 'Start a fight with the ICE here.',
  'run/backdoor': 'Use the key or exploit you hold to skip this ICE.',
  'run/unlock': 'Open the vault with the item it needs.',
  'run/loot': 'Take every file here. Paydata goes in your haul (limited by Storage).',
  'run/capture': 'Take the node. Router: map. Security: half trace. Core: the whole system.',
  'run/use': 'Operate the device.',
  'run/talk': 'Talk to the process that lives here.',
  'run/netscan': 'Scan from this router for new addresses. Once per run.',
};

export const BOTNET_INFO: Record<string, { name: string; tip: string }> = {
  ddos: { name: 'DDoS', tip: 'Stun all ICE 1 turn (bosses: Slowed). Everyone you own says "hello" at once. Loudly.' },
  dcrack: { name: 'Distributed Crack', tip: 'Crack damage scaled by botnet power. A thousand toasters guess one password.' },
  swarm: { name: 'Swarm', tip: 'Many small spike hits on random ICE. Death by a thousand doorbells.' },
  bounce: { name: 'Bounce', tip: 'Lowers trace. Your signal visits every fridge in town on its way here.' },
};

// ------------------------------------------------------------------ scrambling (Psychotrope / CHAIRMAN v2)

const GLYPHS = '#%&@$?!*+=<>/\\|~^ΔΞΨλ¤§░▒▓';
export function scramble(text: string, seed = 0): string {
  const viaMeta = metaUiState().scrambleLabels ? metaScramble(text) : null;
  if (viaMeta) return viaMeta;
  let h = seed + 7;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    h = (h * 1103515245 + 12345 + text.charCodeAt(i)) >>> 0;
    const ch = text[i];
    out += ch === ' ' || ch === '.' ? ch : (h >> 8) % 3 === 0 ? ch : GLYPHS[(h >> 4) % GLYPHS.length];
  }
  return out;
}

export function money(n: number): string {
  return `${Math.round(n).toLocaleString('en-US')}¤`;
}
