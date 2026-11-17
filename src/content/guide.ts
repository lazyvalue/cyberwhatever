// The in-game Guide (the `?` button). Owner: story agent. Imported directly by the UI.
// Accuracy rule: every number comes from BALANCE (src/engine/balance.ts) or from content data, so the guide
// cannot drift from the game. Rules are stated exactly; jokes live only in summaries and tips.
// No spoilers: nothing about who is who, the finale, or the console.
import { BALANCE as B } from '../engine/balance.ts';
import { programs } from './programs.ts';
import { implants } from './implants.ts';
import { perks } from './perks.ts';
import { hardware } from './hardware.ts';
import type { HardwarePart } from '../engine/types.ts';

export interface GuideSection { id: string; title: string; summary: string; blocks: GuideBlock[]; related?: string[] }
export type GuideBlock =
  | { kind: 'p'; text: string }
  | { kind: 'rule'; label: string; text: string; id?: string }   // id = deep-link anchor inside the section
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'example'; title: string; steps: string[] }
  | { kind: 'tip'; text: string }
  // the UI renders the list from the registry/engine; notes[key] adds the explanation per item
  | { kind: 'auto'; source: 'iceStatuses' | 'playerStatuses' | 'categories' | 'damageKinds' | 'heat' | 'botnet' | 'nodeTypes' | 'ice' | 'trace'; notes?: Record<string, string> };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const T = B.trace;
const H = B.heat;
const BN = B.botnet;
const E = B.economy;

/** One row per engine status id (ICE side: IceStatuses keys; player side: PlayerStatuses keys). */
export interface GuideStatus { id: string; side: 'ice' | 'player'; name: string; from: string; does: string; payoff: string }
export const GUIDE_STATUSES: GuideStatus[] = [
  { id: 'mapped', side: 'ice', name: 'Mapped (n)', from: 'scan programs (peek, sonar, rainbow, lookout)', does: 'You see its exact next action and numbers for n turns.', payoff: 'Also sets Crit ready.' },
  { id: 'critReady', side: 'ice', name: 'Crit ready', from: 'any program that applies Mapped', does: `Your next hit on it deals ×${B.crit}.`, payoff: 'Spent by that next hit. Hit it with your biggest program.' },
  { id: 'unstable', side: 'ice', name: 'Unstable (n)', from: 'fuzz programs (keysmash, static)', does: 'Stacks. Does nothing on its own.', payoff: 'An overflow program (bucket, popcorn) spends all stacks for extra damage per stack.' },
  { id: 'backdoored', side: 'ice', name: 'Backdoored (t)', from: 'inject programs (giftbox, sleeper)', does: 'Counts down 1 at the end of each ICE turn.', payoff: 'At 0 the ICE becomes Rootable.' },
  { id: 'rootable', side: 'ice', name: 'Rootable', from: 'Backdoored running out', does: 'A root program (rootkit) can subvert it.', payoff: `Subverted ICE fights for you: ${B.ice.rootedDamageBase} + ${B.ice.rootedDamagePerLevel}×level core damage to a random enemy each ICE turn. Bosses cannot be rooted.` },
  { id: 'exposed', side: 'ice', name: 'Exposed (t)', from: 'some attack programs (fever on an Infected target, milspec)', does: 'Its shell is ignored for t turns: every damage kind hits the core at ×1.', payoff: 'Free hits for the wrong damage kind.' },
  { id: 'stunned', side: 'ice', name: 'Stunned (t)', from: 'lullaby, botnet DDoS', does: 'It skips its action. Its intent does not advance.', payoff: 'Bosses get Slowed (1) instead.' },
  { id: 'slowed', side: 'ice', name: 'Slowed (t)', from: 'stuns on bosses, some ICE', does: 'Its next action is delayed by a turn.', payoff: 'A turn to set up.' },
  { id: 'marked', side: 'ice', name: 'Marked (t)', from: 'flare', does: `Botnet actions deal ×${BN.markedMult} to it. Some daemons hit Marked targets harder.`, payoff: 'Mark it, then spend a botnet charge.' },
  { id: 'infected', side: 'ice', name: 'Infected (n)', from: 'worm programs (wiggler, tapeworm, chainletter)', does: 'n core damage at the end of each ICE turn, ignoring shells. Then n drops by 1.', payoff: 'If the ICE dies, the remaining stacks jump to another ICE. A Hydra that is Infected does not split.' },
  { id: 'decoy', side: 'player', name: 'Decoy (n)', from: 'cutout, guard_dog', does: 'Absorbs the next n whole ICE attacks.', payoff: 'Best against a charged Killer hit.' },
  { id: 'masked', side: 'player', name: 'Masked', from: 'moustache', does: `This turn's trace gain ×${T.maskedMult}. Cleared at End Turn.`, payoff: 'Use it on a loud turn.' },
  { id: 'tarred', side: 'player', name: 'Tarred (n)', from: 'Tar Pit and similar ICE', does: 'n fewer cycles at the start of your next turn.', payoff: 'Kill the Tar Pit, or plan a cheap turn.' },
  { id: 'anchored', side: 'player', name: 'Anchored (t)', from: 'Tar Pit and similar ICE', does: 'You cannot disengage or hang up.', payoff: 'Wait it out, or win.' },
  { id: 'burn', side: 'player', name: 'Burn (n)', from: 'Cortex Burner (black ICE)', does: 'n neural damage at the start of your turn, then n drops by 1.', payoff: 'tinfoil clears it. Neural 0 kills you.' },
  { id: 'labelsScrambled', side: 'player', name: 'Scrambled labels (t)', from: 'Psychotrope (black ICE)', does: 'Your program buttons show wrong names. The programs themselves are unchanged.', payoff: 'Use the number keys. Slot order does not change.' },
  { id: 'stunned', side: 'player', name: 'Stunned (t)', from: 'some ICE', does: 'You lose your turn.', payoff: 'Nothing to do but wait.' },
  { id: 'scrambled', side: 'player', name: 'Scrambled program (t)', from: 'Scrambler', does: 'One program (your most used) is locked for t turns.', payoff: 'Carry more than one program of each kind.' },
];

/** Base ICE in the field guide (content ids). */
export const GUIDE_ICE: { id: string; trick: string; answer: string }[] = [
  { id: 'ice.sentry', trick: 'Wall shell. Plain deck damage.', answer: 'Spike it.' },
  { id: 'ice.cipher', trick: 'Crypt shell. Reshells itself every 3 turns.', answer: 'Crack it fast, before the reshell.' },
  { id: 'ice.bloodhound', trick: 'No shell. Adds trace every turn.', answer: 'Kill it first, or stun it.' },
  { id: 'ice.tarpit', trick: 'Wall shell. Tars (−1 cycle) and Anchors you. Low damage.', answer: 'Spike it. Do not plan an escape.' },
  { id: 'ice.scrambler', trick: 'Crypt shell. Locks your most-used program.', answer: 'Vary your programs. Bring backups.' },
  { id: 'ice.patcher', trick: 'No shell. Repairs and reshells the other ICE.', answer: 'Kill it first.' },
  { id: 'ice.killer', trick: 'Wall shell. Charges one turn, then hits ×3.', answer: 'Decoy the big hit, stun it while charging, or kill it first.' },
  { id: 'ice.mirror', trick: 'Crypt shell. The same damage kind twice in a row bounces back at your deck.', answer: 'Alternate crack and spike.' },
  { id: 'ice.hydra', trick: 'Wall shell. Splits in two when its shell breaks.', answer: 'Infect it with a worm first. Infected Hydras do not split.' },
  { id: 'ice.siren', trick: 'No shell. Calls reinforcements in 2 turns.', answer: 'Stun or kill it. Captured Security blocks the call.' },
  { id: 'ice.hunter', trick: 'Joins fights at Alarm, or roams at heat 50+. Adds trace.', answer: 'Capture Security. Keep heat down.' },
  { id: 'ice.flatliner', trick: 'BLACK ICE. Neural damage.', answer: 'Decoy absorbs a hit. Stun delays it. Heal neural at the clinic before you go.' },
  { id: 'ice.cortex_burner', trick: 'BLACK ICE. Burn stacks: neural damage each turn.', answer: 'tinfoil clears Burn. Kill it quickly.' },
  { id: 'ice.psychotrope', trick: 'BLACK ICE. Neural damage, and your button labels lie.', answer: 'Use number keys; slots do not move.' },
];

const PART_INFO: Record<HardwarePart, [string, string]> = {
  cpu: ['CPU', 'Cycles per combat turn.'],
  ram: ['RAM', 'Total size of loaded programs.'],
  firewall: ['Firewall', 'Shield points, refilled at the start of each of your turns.'],
  chassis: ['Chassis', 'Deck integrity. 0 = Dumped. Refilled each time you dial in.'],
  mask: ['Mask chip', `Less trace per combat turn (−${T.maskPerPoint} per point) and +${B.sneak.perMask}% sneak per point.`],
  uplink: ['Uplink', `Botnet charges per run, and usable botnet power (${BN.uplinkPowerPerPoint} per point).`],
  storage: ['Storage', 'Paydata slots per run.'],
  neural: ['Neural interface', 'Neural HP (your brain). Only black ICE hurts it. Does not refill: heal at the clinic.'],
};
const partRange = (p: HardwarePart) => {
  const v = hardware.filter((h) => h.part === p).sort((a, b) => a.tier - b.tier).map((h) => h.value);
  return `${v[0]} → ${v[v.length - 1]}`;
};

const statusNotes = (side: 'ice' | 'player'): Record<string, string> =>
  Object.fromEntries(GUIDE_STATUSES.filter((s) => s.side === side).map((s) => [s.id, `${s.name}. From: ${s.from}. ${s.does} ${s.payoff}`]));
const daemonRows = programs
  .filter((p) => p.category === 'daemon' && p.daemon && p.price > 0 && (p.version ?? 1) === 1)
  .map((p) => [p.name, String(p.ram), p.daemon!.turns > 0 ? `${p.daemon!.turns} turns` : 'until the fight ends', p.description]);

export const GUIDE: GuideSection[] = [
  {
    id: 'basics', title: 'The loop',
    summary: 'Dial in. Take things. Hang up. Sell them. Buy better things. Repeat until you own the city.',
    blocks: [
      { kind: 'rule', label: 'The loop', text: 'Net tab → pick an address → Dial in. Inside, move node to node, fight or sneak past ICE, loot files, capture things. Hang up to leave with what you took. At home: sell paydata, buy programs and parts, give your hosts jobs, take jobs from the board.' },
      { kind: 'rule', label: 'Time', text: 'The world clock counts cycles. One cycle passes per node action and per combat turn. Nothing passes at home. Mining, the $HODL price and heat decay all run on cycles.' },
      { kind: 'rule', label: 'Owning a system', text: 'Capture its Core and the whole system is yours: it becomes a host (power = its tier) and counts toward Control %.' },
      { kind: 'table', head: ['Step', 'Where', 'Why'], rows: [
        ['Dial in', 'Net tab', 'Start a run in that system.'],
        ['Probe / Breach / Loot / Capture', 'Map', 'Learn, fight, take, own.'],
        ['Hang up', 'Run screen (H)', 'Leave with your haul. Free outside a fight.'],
        ['Sell', 'Market (fence)', 'Paydata into credits.'],
        ['Buy / Load', 'Market, Deck', 'Better programs and parts. Only loaded programs come with you.'],
        ['Assign hosts', 'Botnet tab', 'Owned systems mine, fight or hide you.'],
      ] },
      { kind: 'tip', text: 'The first fridge is practice. The second fridge is a lifestyle.' },
    ],
    related: ['nodes', 'combat', 'money', 'botnet'],
  },
  {
    id: 'nodes', title: 'Nodes and moving around',
    summary: 'A system is a map of nodes. Some have ICE. Some have files. One is the brain.',
    blocks: [
      { kind: 'rule', label: 'Reach', text: 'You can act on the gateway, and on any node next to a node you have cleared, captured or sneaked past.' },
      { kind: 'rule', label: 'Empty nodes', text: 'Nodes with no ICE are passed through automatically on the way to your target: 1 cycle each, no trace.' },
      { kind: 'table', head: ['Action', 'Cost', 'Effect'], rows: [
        ['Probe', `1 cycle, +${T.probe} trace`, 'Reveals its ICE (type, level, shell, core) and its real type. Honeypots show as datastores until probed.'],
        ['Sneak', `1 cycle; fail: +${T.sneakFail} trace`, 'Roll the shown %. Success: the ICE sleeps; you can pass and loot, not capture or use. Fail: ambush (the ICE acts first).'],
        ['Breach', 'no cycle (the fight costs turns)', 'Start a fight.'],
        ['Backdoor', `1 cycle, +${T.nodeAction} trace`, 'Needs the right key item. Removes the ICE without a fight.'],
        ['Unlock', `1 cycle, +${T.nodeAction} trace`, 'Vaults need a key or password found elsewhere.'],
        ['Loot', `1 cycle, +${T.nodeAction} trace`, `Takes every file. Paydata fills Storage. Honeypot: +${T.honeypot} trace.`],
        ['Capture', `1 cycle, +${T.nodeAction} trace`, 'Router: reveals the whole map. Security: halves all trace gain for this run, stops reinforcements and hunters, unseals vaults. Core: you own the system.'],
        ['Netscan', `1 cycle, +${T.netscan} trace`, 'Captured router, once per run. Finds new addresses and small IoT devices.'],
        ['Use / Talk', `1 cycle, +${T.nodeAction} trace`, 'Devices and processes. Usually worth it.'],
      ] },
      { kind: 'rule', label: 'Sneak chance', text: `${B.sneak.base}% + ${B.sneak.perMask}% per mask point + ${B.sneak.stealthLoadedBonus}% per stealth program loaded − ${B.sneak.perAlert}% per alert tier (Suspicious 1, Alarm 2) − the ICE's perception. Clamped ${B.sneak.min}–${B.sneak.max}%.` },
      { kind: 'rule', label: 'What persists', text: 'Looted files and used devices stay that way. Map knowledge stays. ICE comes back every run until you own the system. Paydata you lose to Dumped or Traced goes back to its node.' },
      { kind: 'tip', text: 'Probe datastores before looting. A honeypot looks exactly like a good idea.' },
    ],
    related: ['combat', 'trace', 'failure'],
  },
  {
    id: 'combat', title: 'Fights',
    summary: 'Turn-based. You spend cycles on programs. Then the ICE does what its badge said.',
    blocks: [
      { kind: 'rule', label: 'Your turn', text: 'You get cycles equal to your CPU (plus bonuses). Each program costs cycles, has a cooldown in turns, makes noise (trace) and takes RAM. Use them in any order, then End Turn (Space).' },
      { kind: 'rule', label: 'Shield', text: 'At the start of each of your turns your shield refills to your Firewall. ICE hits go through shield first, then deck integrity.' },
      { kind: 'rule', label: 'Targeting', text: 'Programs that hit one ICE need a target: click the ICE, or Tab / arrow keys. Programs with no target fire at once.' },
      { kind: 'example', title: 'Turn order', steps: [
        'Your turn starts: unused programs lose a signature stack, cooldowns drop by 1, cycles and shield refill.',
        'You act: programs and up to one botnet action.',
        'End Turn: daemons act, Flow is checked, this turn\'s trace is added.',
        'Each ICE does its shown intent (unless stunned or slowed). Subverted ICE hits its friends.',
        'Ticks: Infected damage, Backdoored counts down, other timers drop by 1. Reinforcements arrive.',
        '1 cycle passes. Back to the top.',
      ] },
      { kind: 'rule', label: 'Disengage', text: `${B.combat.disengageCost} cycles. Back to the previous node. The ICE recovers ${pct(B.ice.disengageRecover)} of what it lost. Blocked by Anchored.` },
      { kind: 'rule', label: 'Hang up mid-fight', text: 'Spends all your remaining cycles. The ICE takes its turn. If you survive, the run ends and you keep your haul. Blocked by Anchored.' },
      { kind: 'rule', label: 'Ambush', text: 'After a failed sneak the ICE acts before your first turn.' },
      { kind: 'rule', label: 'Levels', text: `Each ICE level above its base: core +${pct(B.ice.perLevelCore)}, shell +${B.ice.perLevelShell}, hits +${B.ice.perLevelHit}.` },
      { kind: 'tip', text: 'End Turn with cycles left is allowed. It is also a waste.' },
    ],
    related: ['shells', 'intents', 'signature', 'flow', 'statuses'],
  },
  {
    id: 'shells', title: 'Shells and damage kinds',
    summary: 'Hit crypt with crack. Hit wall with spike. Worms do not care.',
    blocks: [
      { kind: 'rule', label: 'Shell', text: 'Most ICE have a shell (crypt or wall) over their core. The shell absorbs damage first. When it is gone, the core takes hits. Core 0 = the ICE is gone.' },
      { kind: 'table', head: ['Damage kind', 'vs crypt shell', 'vs wall shell', 'vs no shell / Exposed'], rows: [
        ['crack', `×${B.shell.strong}`, `×${B.shell.weak}`, '×1'],
        ['spike', `×${B.shell.weak}`, `×${B.shell.strong}`, '×1'],
        ['worm', 'ignores shells: becomes Infected stacks', 'ignores shells: becomes Infected stacks', 'Infected stacks'],
      ] },
      { kind: 'rule', label: 'Overflow past the shell', text: 'Damage left over after the shell breaks reaches the core at the normal (×1) rate.' },
      { kind: 'rule', label: 'Exposed', text: 'While an ICE is Exposed its shell is ignored: every kind hits the core at ×1.' },
      { kind: 'example', title: 'Lockpick (3 crack) on a crypt shell of 4', steps: [
        'Crack vs crypt is ×2: 3 becomes 6 against the shell.',
        'The shell takes 4 and breaks.',
        'The other 2 (at ×2) reach the core as 1.',
        'Crowbar (3 spike) on the same shell would do 2 to the shell. Wrong tool.',
      ] },
      { kind: 'tip', text: 'Bring one crack and one spike program. Always. Even to a fridge.' },
    ],
    related: ['combat', 'statuses', 'ice-field-guide'],
  },
  {
    id: 'intents', title: 'Reading ICE intents',
    summary: 'The badge over each ICE is what it will do next. ICE is honest. It is also mean.',
    blocks: [
      { kind: 'rule', label: 'Intent badge', text: 'Every ICE shows its next action. Unmapped ICE only shows a class: hostile (it will hurt you), utility (it will do something else) or unknown.' },
      { kind: 'rule', label: 'Mapped', text: 'Scan programs Map an ICE for some turns: you see the exact action and its numbers, and the projected trace for the turn gets exact too.' },
      { kind: 'rule', label: 'Crit', text: `Mapping also readies a crit: your next hit on that ICE deals ×${B.crit}. The crit is spent by that hit.` },
      { kind: 'table', head: ['Badge', 'Means', 'Usual answer'], rows: [
        ['hostile', 'It hits you this turn.', 'Shield (umbrella), Decoy, or stun it.'],
        ['utility', 'It heals, reshells, summons or buffs.', 'Kill it, or stun it before it finishes.'],
        ['unknown', 'Not mapped, cannot tell.', 'Scan it.'],
      ] },
      { kind: 'tip', text: 'A Killer that shows "charging" is not resting.' },
    ],
    related: ['combos', 'statuses', 'ice-field-guide'],
  },
  {
    id: 'signature', title: 'Signature (repeats get weaker)',
    summary: 'The system learns your favourite moves. Have more than one.',
    blocks: [
      { kind: 'rule', label: 'Stacks', text: `Every use of a program in a fight adds 1 stack to it (shared across all ICE in that fight). Effect = max(${pct(B.signature.min)}, 100% − ${pct(B.signature.perStack)} × stacks), counted before the new stack is added.` },
      { kind: 'rule', label: 'Decay', text: 'At the start of your turn, every program you did not use last turn loses 1 stack.' },
      { kind: 'rule', label: 'Reading it', text: 'Each program button shows its stacks and its current multiplier.' },
      { kind: 'table', head: ['Use in a row', 'Stacks before', 'Effect'], rows: [0, 1, 2, 3, 4].map((s) => [String(s + 1), String(s), pct(Math.max(B.signature.min, 1 - B.signature.perStack * s))]) },
      { kind: 'tip', text: 'Two different hits beat the same hit twice. Most of the time. Do the maths anyway.' },
    ],
    related: ['flow', 'combat'],
  },
  {
    id: 'flow', title: 'Flow',
    summary: 'Use three kinds of program in one turn and the next turn goes better.',
    blocks: [
      { kind: 'rule', label: 'Flow', text: `Use programs from ${B.flow.categories} different categories in one turn (attack, exploit, defense, stealth, daemon, special). Next turn: +${B.flow.bonusCycles} cycle and −${B.flow.traceReduction} trace.` },
      { kind: 'rule', label: 'Meter', text: 'The pips show how many categories you have used this turn.' },
      { kind: 'example', title: 'A cheap Flow turn with the starter kit', steps: [
        'peek (exploit) on the ICE: Mapped, crit ready.',
        'lockpick or crowbar (attack): the crit hit.',
        'umbrella (defense): shield.',
        'End Turn. Three categories: next turn has an extra cycle and less trace.',
      ] },
      { kind: 'tip', text: 'The Polyglot perk lowers the bar to two categories.' },
    ],
    related: ['signature', 'combos', 'trace'],
  },
  {
    id: 'statuses', title: 'Statuses',
    summary: 'Tags on ICE and on you. Most programs set one up for another to cash in.',
    blocks: [
      { kind: 'p', text: 'On ICE:' },
      { kind: 'auto', source: 'iceStatuses', notes: statusNotes('ice') },
      { kind: 'p', text: 'On you:' },
      { kind: 'auto', source: 'playerStatuses', notes: statusNotes('player') },
      { kind: 'rule', label: 'Bosses', text: 'Bosses take Slowed (1) instead of Stunned, and cannot be rooted.' },
    ],
    related: ['combos', 'intents', 'ice-field-guide'],
  },
  {
    id: 'combos', title: 'Combos',
    summary: 'Set up, then cash in. Worked examples.',
    blocks: [
      { kind: 'example', title: 'Scan → crit', steps: [
        'peek (1 cycle): ICE is Mapped and crit-ready.',
        `lockpick on its crypt shell: 3 × ${B.crit} crit = 4.5, then ×${B.shell.strong} vs crypt = 9 against the shell.`,
        'The crit is spent. Next hits are normal.',
      ] },
      { kind: 'example', title: 'Fuzz → overflow', steps: [
        'keysmash: Unstable 3.',
        'keysmash again next turn (or static): more stacks. Watch the signature.',
        'bucket: 1 spike + 2 per Unstable stack, and the stacks are spent.',
      ] },
      { kind: 'example', title: 'Inject → root', steps: [
        'giftbox: Backdoored 2.',
        'Two ICE turns later it is Rootable.',
        `rootkit: the ICE now fights for you, ${B.ice.rootedDamageBase} + ${B.ice.rootedDamagePerLevel}×level core damage to a random enemy each ICE turn. Not on bosses.`,
      ] },
      { kind: 'example', title: 'Infect and let it spread', steps: [
        'wiggler (worm 3): Infected 3. Shells do not matter.',
        'Each ICE turn: 3, then 2, then 1 core damage.',
        'If the ICE dies first, the leftover stacks jump to another ICE.',
        'Worm a Hydra before you break its shell and it will not split.',
      ] },
    ],
    related: ['statuses', 'shells', 'signature'],
  },
  {
    id: 'daemons', title: 'Daemons',
    summary: 'Programs that keep working after you stop paying attention.',
    blocks: [
      { kind: 'rule', label: 'Running', text: 'Once started, a daemon acts by itself at every End Turn on a random target until its duration runs out (or for the whole fight), or until something evicts it.' },
      { kind: 'rule', label: 'RAM', text: 'A daemon uses its RAM once, in your loadout, like any program. Starting it costs its cycles and starts its cooldown.' },
      { kind: 'rule', label: 'One each', text: 'Only one copy of each daemon can run at a time.' },
      { kind: 'table', head: ['Daemon', 'RAM', 'Runs', 'Does'], rows: daemonRows },
      { kind: 'tip', text: 'Start daemons early. A daemon started on the last turn is a very expensive decoration.' },
    ],
    related: ['deck', 'combat'],
  },
  {
    id: 'botnet-combat', title: 'Botnet in fights',
    summary: 'Your hosts, all saying hello at once.',
    blocks: [
      { kind: 'rule', label: 'Charges', text: 'Each run you get min(Uplink, number of hosts in the Botnet role) charges. One botnet action per turn, 0 cycles, 1 charge.' },
      { kind: 'rule', label: 'Power', text: `Botnet power = total power of Botnet-role hosts. Usable power = min(power, Uplink × ${BN.uplinkPowerPerPoint}).` },
      { kind: 'table', head: ['Action', 'Effect'], rows: [
        ['DDoS', 'Stun 1 on every ICE (bosses: Slowed).'],
        ['Distributed Crack', `Crack damage ${BN.dcrackBase} + ${BN.dcrackPerPower} × power.`],
        ['Swarm', `${BN.swarmHitsPerPower} × power hits (max ${BN.swarmMaxHits}) of ${BN.swarmHitDamage} spike on random ICE.`],
        ['Bounce', `−(${BN.bounceBase} + ${BN.bouncePerPower} × power) trace.`],
      ] },
      { kind: 'rule', label: 'Marked', text: `Marked ICE take ×${BN.markedMult} from botnet actions.` },
      { kind: 'rule', label: 'Burn risk', text: `Each use may burn one Botnet host: ${pct(BN.burnBase)} + ${BN.burnPerHeat * 100}% per heat point. IoT junk burns first. If a system host burns, you lose that system and its ICE comes back one level higher.` },
      { kind: 'tip', text: 'Spend charges when they matter. A toaster is cheap; a bank is not.' },
    ],
    related: ['botnet', 'heat', 'deck'],
  },
  {
    id: 'trace', title: 'Trace',
    summary: 'How close they are to your front door. One meter per run.',
    blocks: [
      { kind: 'rule', label: 'Per combat turn', text: `${T.turnBase} + system security + noise of the programs you used − ${T.maskPerPoint} × mask − ${T.proxyPerPower} × proxy power − ${B.flow.traceReduction} if Flow. Never below 0. ×${T.maskedMult} if Masked. ×${T.securityCapturedMult} if Security is captured.` },
      { kind: 'table', head: ['Source', 'Trace'], rows: [
        ['Probe', `+${T.probe}`],
        ['Loot, capture, use, talk, unlock, backdoor', `+${T.nodeAction}`],
        ['Netscan', `+${T.netscan}`],
        ['Failed sneak', `+${T.sneakFail} (and an ambush)`],
        ['Looting a honeypot', `+${T.honeypot}`],
        ['Some ICE (Bloodhound, hunters)', 'every turn'],
        ['Heat 25+', `runs start at ${T.noticedStart}`],
      ] },
      { kind: 'table', head: ['Trace', 'Level', 'Effect'], rows: [
        [`${T.suspicious}+`, 'Suspicious', `All ICE get +${B.ice.perLevelShell * B.ice.suspiciousShellLevels} shell.`],
        [`${T.alarm}+`, 'Alarm', `A hunter joins fights from turn ${B.ice.hunterJoinTurn}. Vaults seal unless Security is captured.`],
        [`${T.max}`, 'Traced', 'Run over. See Failure.'],
      ] },
      { kind: 'rule', label: 'Lowering it', text: 'Captured Security halves all trace gains for the run. Stealth programs (mop, moustache, bounce) cut it. Botnet Bounce cuts it. Hanging up ends it.' },
      { kind: 'tip', text: 'The trace bar shows the projected gain for this turn. Believe it.' },
    ],
    related: ['failure', 'heat', 'nodes'],
  },
  {
    id: 'failure', title: 'Failure',
    summary: 'Three ways to go home early. Only one of them is permanent, and it is labelled.',
    blocks: [
      { kind: 'table', head: ['Failure', 'Trigger', 'Consequence'], rows: [
        ['Dumped', 'Deck integrity 0', `Run ends. This run\'s paydata lost. One loaded program corrupted (repair it in the Deck tab). +${B.failure.dumpHeat} heat.`],
        ['Traced', `Trace ${T.max}`, `Run ends. Paydata lost. +${B.failure.traceHeat} heat. Fine: ${pct(B.failure.traceFine)} of your credits. The system is hardened (ICE +1) for ${B.failure.hardenCycles} cycles. One host burns.`],
        ['Flatlined', 'Neural 0 (black ICE only)', 'You die. Reload the last checkpoint (saved at every dial-in). The flatline count is kept forever.'],
      ] },
      { kind: 'rule', label: 'Black ICE', text: 'Only black ICE hurts neural HP. Black ICE is always labelled: red, with a skull, before you fight it.' },
      { kind: 'rule', label: 'Lost paydata', text: 'Paydata you lose goes back to the node it came from. You can take it again.' },
      { kind: 'rule', label: 'Neural', text: 'Neural HP does not refill between runs. Heal it at the clinic.' },
      { kind: 'tip', text: 'Check your neural before dialing in anywhere that sounds military.' },
    ],
    related: ['trace', 'heat', 'ice-field-guide'],
  },
  {
    id: 'heat', title: 'Heat',
    summary: 'How much the world wants you. Global, slow, and it remembers.',
    blocks: [
      { kind: 'table', head: ['Source', 'Heat'], rows: [
        ['Traced', `+${B.failure.traceHeat}`],
        ['Dumped', `+${B.failure.dumpHeat}`],
        ['Selling tagged paydata', `+${H.taggedSaleHeat} (clean it first to avoid)`],
        ['Loud jobs', 'shown on the job'],
        ['Each mining host', `+${H.miningDripPerHost} per cycle`],
        ['Exchange pump or dump', `+${E.pumpHeat}`],
      ] },
      { kind: 'table', head: ['Sink', 'Effect'], rows: [
        ['Time', `−${H.decayPerCycle} per cycle (only in systems: nothing passes at home)`],
        ['Proxy hosts', `heat gains −${pct(H.proxyHeatPerPower)} per proxy power, max −${pct(H.proxyHeatMax)}`],
        ['Fixer scrub', `${H.scrubPerPoint} + ${H.scrubPerRep} × rep credits per point`],
      ] },
      { kind: 'table', head: ['Heat', 'Level', 'Effect'], rows: [
        [`${H.noticed}+`, 'Noticed', `Runs start at ${T.noticedStart} trace.`],
        [`${H.hunted}+`, 'Hunted', 'A hunter ICE waits in every system you do not own.'],
        [`${H.burned}+`, 'Burned', `Shop prices ×${H.burnedShopMult}. Every ${H.reclaimInterval} cycles, ${pct(H.reclaimChance)} chance an owner takes a system back.`],
        [`${H.raid}`, 'Raid', `A fight at your own deck. Win or lose, heat drops to ${H.raidResetTo}. Losing costs one tier of a random part and ${pct(B.raid.creditLoss)} of your credits.`],
      ] },
      { kind: 'tip', text: 'Reclaimed systems come back harder. Scrubbing is cheaper than re-hacking.' },
    ],
    related: ['trace', 'botnet', 'money'],
  },
  {
    id: 'botnet', title: 'Hosts and roles',
    summary: 'Everything you own works for you. Pick its job.',
    blocks: [
      { kind: 'rule', label: 'Hosts', text: `Every owned system is a host with power = its tier. IoT devices from netscan have power ${B.hosts.iotPower}.` },
      { kind: 'table', head: ['Role', 'Does'], rows: [
        ['Idle', 'Nothing.'],
        ['Mine', `Makes $HODL: ${E.coinPerPowerPerCycle} coin per power per cycle. Adds a little heat.`],
        ['Botnet', 'Charges and power for botnet actions in fights.'],
        ['Proxy', `Less trace per combat turn (−${T.proxyPerPower} per power) and less heat gain.`],
      ] },
      { kind: 'rule', label: 'Losing hosts', text: 'Hosts burn from botnet use and from being Traced. At high heat, owners reclaim systems. A lost system host takes the system with it; re-hacking it means ICE one level higher.' },
      { kind: 'tip', text: 'Roles can change any time at home. There is no wrong answer, only expensive ones.' },
    ],
    related: ['botnet-combat', 'heat', 'money'],
  },
  {
    id: 'money', title: 'Money',
    summary: 'Credits buy things. Paydata becomes credits. $HODL becomes credits, eventually, maybe.',
    blocks: [
      { kind: 'table', head: ['Paydata', 'Rule'], rows: [
        ['Normal', 'Sells for its value at the fence (Market).'],
        ['Encrypted', `Sells for ${pct(E.encryptedSaleRatio)} until decrypted. Decrypting needs a program strong enough.`],
        ['Tagged', `Selling adds ${H.taggedSaleHeat} heat. Cleaning costs max(10, ${pct(E.cleanCostRatio)} of value).`],
        ['Job target', 'Hand it in on the board instead. Usually worth more.'],
      ] },
      { kind: 'rule', label: '$HODL', text: `The price moves every ${E.priceEvery} cycles, between ${E.priceMin} and ${E.priceMax}, drifting back toward ${E.priceMean}. Sell and buy in the Wallet.` },
      { kind: 'table', head: ['Service', 'Cost'], rows: [
        ['Sell a program', `${pct(E.programSellRatio)} of its price`],
        ['Repair a corrupted program', `max(${E.repairMin}, ${pct(E.repairCostRatio)} of its price)`],
        ['Heal neural (clinic)', `${E.neuralHealPerPoint} per point`],
        ['Scrub heat (fixer)', `${H.scrubPerPoint} + ${H.scrubPerRep} × rep per point`],
      ] },
      { kind: 'tip', text: '$HODL is a coin. Its use case is being held. Sell it when the line goes up.' },
    ],
    related: ['heat', 'deck', 'basics'],
  },
  {
    id: 'deck', title: 'Your deck',
    summary: 'Eight parts. Each one is a number that matters.',
    blocks: [
      { kind: 'table', head: ['Part', 'Stat', 'Range'], rows: (Object.keys(PART_INFO) as HardwarePart[]).map((p) => [PART_INFO[p][0], PART_INFO[p][1], partRange(p)]) },
      { kind: 'rule', label: 'Upgrades', text: 'Hardware is bought one tier at a time at the hardware kiosk. Some programs need a minimum part tier to load.' },
      { kind: 'rule', label: 'RAM budget', text: 'The total RAM of loaded programs cannot exceed your RAM. Unload one to load another (Deck tab).' },
      { kind: 'rule', label: 'Integrity', text: 'Deck integrity refills every time you dial in and hang up.' },
      { kind: 'tip', text: 'The starter deck is not a good deck. It is a deck.' },
    ],
    related: ['daemons', 'implants-humanity', 'money'],
  },
  {
    id: 'implants-humanity', title: 'Implants and humanity',
    summary: 'Strong passives, paid for in you.',
    blocks: [
      { kind: 'rule', label: 'Humanity', text: `Starts at ${B.start.humanity}. Implants and some choices lower it. Below ${B.humanity.cold}, descriptions get colder. Below ${B.humanity.unit}, the interface stops using your name. It never blocks progress.` },
      { kind: 'table', head: ['Implant', 'Humanity', 'Effect'], rows: implants.map((i) => [i.name, i.humanity > 0 ? `−${i.humanity}` : `+${-i.humanity}`, i.description]) },
      { kind: 'tip', text: 'One implant does nothing and gives humanity back. The clinic recommends it warmly.' },
    ],
    related: ['rep-perks', 'deck'],
  },
  {
    id: 'rep-perks', title: 'Rep and perks',
    summary: 'Do things, get known. Get known, get perks.',
    blocks: [
      { kind: 'rule', label: 'XP', text: `From defeating ICE, +${B.xp.captureNode} per captured node, +${B.xp.captureSystemPerTier} × tier per owned system, and jobs.` },
      { kind: 'table', head: ['Rep', 'XP needed'], rows: B.xp.table.map((x, i) => [String(i + 1), String(x)]) },
      { kind: 'rule', label: 'Perks', text: `At rep ${B.xp.perkLevels.join(', ')} you pick 1 of ${B.xp.perkOffer} offered perks. Rep also unlocks shop items and jobs.` },
      { kind: 'table', head: ['Perk', 'Effect'], rows: perks.map((p) => [p.name, p.description]) },
    ],
    related: ['implants-humanity', 'money'],
  },
  {
    id: 'net', title: 'Net tab',
    summary: 'Your address book. Numbers you can dial.',
    blocks: [
      { kind: 'rule', label: 'Dial in', text: 'Pick an address, then Dial in. You can only dial addresses you know: from files you loot, jobs, the broker, story messages, and netscan from captured routers.' },
      { kind: 'rule', label: 'Entries', text: 'Each entry shows tier, owner, what you know, and whether you own it or it is hardened (ICE +1 for a while after you were Traced there).' },
      { kind: 'tip', text: 'IoT junk from netscan is easy botnet fodder. It is also junk.' },
    ],
    related: ['basics', 'nodes'],
  },
  {
    id: 'jobs', title: 'Jobs tab',
    summary: 'What you are after, and paid work.',
    blocks: [
      { kind: 'rule', label: 'Objectives', text: 'The top of the tab is your current goal. There is always one main objective. Side objectives are optional.' },
      { kind: 'rule', label: 'Jobs', text: 'Accept a job, do what it says (deliver a file, own a system, use a device), then Turn in for credits and XP. Delivered files are handed over. Loud jobs add heat when finished.' },
      { kind: 'tip', text: 'A file that is a job target is worth more turned in than sold. Usually.' },
    ],
    related: ['files', 'rep', 'money'],
  },
  {
    id: 'inbox', title: 'Inbox',
    summary: 'DMs, the Dead Drop board, and system notices.',
    blocks: [
      { kind: 'rule', label: 'Channels', text: 'DMs are people talking to you. The board is people talking to everyone. System notices are the game talking to you.' },
      { kind: 'tip', text: 'Read the board. Half of it is gossip. The other half is also gossip, but useful.' },
    ],
    related: ['jobs', 'net'],
  },
  {
    id: 'market', title: 'Market tab',
    summary: 'Hardware, programs, the clinic, the broker, the fixer.',
    blocks: [
      { kind: 'table', head: ['Vendor', 'Sells'], rows: [
        ['Hardware kiosk', 'Deck parts, one tier at a time.'],
        ['Warez bin', 'Programs. Also buys yours back.'],
        ['Clinic', `Implants (cost humanity) and neural healing (${E.neuralHealPerPoint} per point).`],
        ['Broker', 'Addresses, passwords, information.'],
        ['Fixer', `The fence (sell paydata), heat scrub (${H.scrubPerPoint} + ${H.scrubPerRep} × rep per point).`],
      ] },
      { kind: 'rule', label: 'Prices', text: `At heat ${H.burned}+ every shop charges ×${H.burnedShopMult}. Some stock needs a minimum rep.` },
    ],
    related: ['money', 'deck', 'implants-humanity'],
  },
  {
    id: 'wallet', title: 'Wallet ($HODL)',
    summary: 'Mined coin. The line goes up. The line goes down.',
    blocks: [
      { kind: 'rule', label: 'Price', text: `The price moves every ${E.priceEvery} cycles, between ${E.priceMin} and ${E.priceMax}, drifting back toward ${E.priceMean}. It does not move while you sit at home.` },
      { kind: 'rule', label: 'Mining', text: `Hosts on Mine make ${E.coinPerPowerPerCycle} coin per power per cycle.` },
      { kind: 'rule', label: 'Pump and dump', text: `If you own the exchange: pump ×${E.pumpMult} or dump ×${E.dumpMult}, +${E.pumpHeat} heat, then a ${E.pumpCooldown}-cycle cooldown.` },
      { kind: 'tip', text: 'Buy low. Sell high. Nobody has ever done this on purpose.' },
    ],
    related: ['money', 'botnet'],
  },
  {
    id: 'files', title: 'Files tab',
    summary: 'Paydata to sell, keys and passwords, and things you read.',
    blocks: [
      { kind: 'rule', label: 'Paydata', text: `Sell at the fence. Encrypted sells for ${pct(E.encryptedSaleRatio)} until you decrypt it (needs a strong enough program). Tagged adds ${H.taggedSaleHeat} heat when sold unless you clean it first.` },
      { kind: 'rule', label: 'Keys and passwords', text: 'Used automatically to unlock vaults and backdoors. You never lose them.' },
      { kind: 'rule', label: 'Lore', text: 'Text files. Free to read. Sometimes they mention an address or a password.' },
    ],
    related: ['money', 'jobs', 'nodes'],
  },
  {
    id: 'rep', title: 'Rep tab',
    summary: 'Rep, perks, implants, humanity. All in one place.',
    blocks: [
      { kind: 'p', text: 'See Rep and perks, and Implants and humanity.' },
      { kind: 'rule', label: 'Perk picker', text: `At rep ${B.xp.perkLevels.join(', ')} a perk is waiting here. Pick 1 of ${B.xp.perkOffer}.` },
    ],
    related: ['rep-perks', 'implants-humanity'],
  },
  {
    id: 'ice-field-guide', title: 'ICE field guide',
    summary: 'What each kind of ICE does, and what to do about it.',
    blocks: [
      { kind: 'table', head: ['ICE', 'Trick', 'Answer'], rows: GUIDE_ICE.map((g) => [g.id.replace('ice.', '').replace('_', ' '), g.trick, g.answer]) },
      { kind: 'rule', label: 'Skins', text: 'Systems dress base ICE up with their own names. Probe to see what it really is.' },
      { kind: 'tip', text: 'Kill the one adding trace first. Then the one healing the others. Then whatever is left.' },
    ],
    related: ['shells', 'statuses', 'failure'],
  },
  {
    id: 'keys', title: 'Keys',
    summary: 'Everything has a key. Mice are optional.',
    blocks: [
      { kind: 'table', head: ['Where', 'Key', 'Does'], rows: [
        ['Home', 'N J I D B M W F R S', 'Net, Jobs, Inbox, Deck, Botnet, Market, Wallet, Files, Rep, Stats'],
        ['Run', 'Arrow keys', 'Move between nodes'],
        ['Run', 'Enter', 'First available action on the node'],
        ['Run', 'P S B K U L C E T N', 'Probe, Sneak, Breach, bacKdoor, Unlock, Loot, Capture, usE, Talk, Netscan'],
        ['Run', 'H', 'Hang up'],
        ['Fight', '1–9', 'Programs by slot'],
        ['Fight', 'Tab, ← →', 'Change target'],
        ['Fight', 'Space', 'End Turn'],
        ['Fight', 'Shift+1–4', 'Botnet: DDoS, Distributed Crack, Swarm, Bounce'],
        ['Fight', 'Esc', 'Skip animation'],
        ['Dialogue', 'Enter / Space, 1–9', 'Finish text, choose'],
        ['Coach', 'Enter', 'Got it'],
        ['Anywhere', 'O', 'Settings'],
        ['Not in a run', 'L', 'Log'],
      ] },
    ],
    related: ['basics', 'combat'],
  },
  {
    id: 'glossary', title: 'Glossary',
    summary: 'Words people on the board use as if you already knew them.',
    blocks: [
      { kind: 'table', head: ['Term', 'Means'], rows: [
        ['deck', 'Your hacking computer.'],
        ['dial in / hang up', 'Enter / leave a system.'],
        ['ICE', 'Security programs that fight you.'],
        ['black ICE', 'ICE that hurts your brain. Always labelled. Can kill.'],
        ['trace', 'How close the system is to finding you. Per run.'],
        ['heat', 'How much the world wants you. Global.'],
        ['cycle', 'One tick of the world clock. Also your action points in a fight.'],
        ['paydata', 'Files worth money.'],
        ['tagged', 'Paydata with a tracker. Selling it adds heat.'],
        ['host', 'A system or device you own.'],
        ['botnet', 'Your hosts working together.'],
        ['burned', 'A host its owner found and took back.'],
        ['$HODL', 'A coin. Mined by hosts. Price moves on its own.'],
        ['the Dead Drop', 'The BBS: shops, jobs, chatter.'],
        ['Control %', 'Your share of the systems that can be owned.'],
      ] },
    ],
    related: ['basics'],
  },
];

/** The name ui-builder's viewer imports. */
export const guide: GuideSection[] = GUIDE;
