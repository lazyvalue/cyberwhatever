// ICE. Owner: content agent. Intents are CombatOp lists; see docs/ENGINE_API.md "ICE".
import type { IceDef } from '../../../src/engine/types.ts';

export const ice: IceDef[] = [
  {
    id: 'parental', name: 'Parental Controls', level: 1, shell: { type: 'wall', points: 3 }, core: 6, perception: 10,
    intents: [
      { id: 'nag', label: 'Nag 2', class: 'hostile', ops: [{ op: 'hit', amount: 2 }] },
      { id: 'limit', label: 'Screen Time Limit (Tar 1, hit 1)', class: 'hostile', ops: [{ op: 'hit', amount: 1 }, { op: 'playerStatus', status: 'tarred', value: 1 }] },
    ],
    xp: 10, credits: 3,
    description: 'Tutorial ICE. Wall shell: use spike.',
    flavor: 'Has blocked 14,000 recipes for being "too spicy".',
  },
  {
    id: 'sentry', name: 'Sentry', level: 1, shell: { type: 'wall', points: 4 }, core: 8, perception: 15,
    intents: [{ id: 'strike', label: 'Strike 3', class: 'hostile', ops: [{ op: 'hit', amount: 3 }] }],
    xp: 12, credits: 5,
    description: 'Plain deck damage.',
  },
  {
    id: 'cipher', name: 'Cipher', level: 1, shell: { type: 'crypt', points: 5 }, core: 7, perception: 15,
    intents: [
      { id: 'poke', label: 'Poke 2', class: 'hostile', ops: [{ op: 'hit', amount: 2 }] },
      { id: 'jab', label: 'Jab 3', class: 'hostile', ops: [{ op: 'hit', amount: 3 }] },
      { id: 'reshell', label: 'Reshell', class: 'utility', ops: [{ op: 'reshell' }] },
    ],
    xp: 14, credits: 5,
    description: 'Crypt shell. Reshells itself every 3 turns.',
  },
  {
    id: 'bloodhound', name: 'Bloodhound', level: 1, shell: { type: 'none', points: 0 }, core: 7, perception: 25,
    intents: [{ id: 'sniff', label: 'Sniff (+4 trace, hit 1)', class: 'hostile', ops: [{ op: 'trace', amount: 4 }, { op: 'hit', amount: 1 }] }],
    xp: 15, credits: 4,
    description: 'Adds trace every turn. Kill it first or stun it.',
  },
  {
    id: 'killer', name: 'Killer', level: 2, shell: { type: 'wall', points: 4 }, core: 10, perception: 10,
    intents: [
      { id: 'charge', label: 'Charging...', class: 'hostile', ops: [{ op: 'notify', text: 'Killer is charging.' }] },
      { id: 'execute', label: 'Execute 9', class: 'hostile', ops: [{ op: 'hit', amount: 9 }] },
    ],
    xp: 20, credits: 10,
    description: 'Charges one turn, then hits x3. Decoy, stun, or burst it.',
  },
  {
    id: 'tarpit', name: 'Tar Pit', level: 1, shell: { type: 'wall', points: 5 }, core: 9, perception: 10,
    intents: [
      { id: 'tar', label: 'Tar (-1 cycle, hit 1)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'tarred', value: 1 }, { op: 'hit', amount: 1 }] },
      { id: 'anchor', label: 'Anchor 2 (hit 1)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'anchored', value: 2 }, { op: 'hit', amount: 1 }] },
    ],
    xp: 14, credits: 4,
    description: 'Tars and Anchors you. Low damage.',
  },
  {
    id: 'scrambler', name: 'Scrambler', level: 2, shell: { type: 'crypt', points: 4 }, core: 7, perception: 15,
    intents: [
      { id: 'scramble', label: 'Scramble your favourite (2), hit 1', class: 'utility', ops: [{ op: 'scramble', mode: 'mostUsed', turns: 2 }, { op: 'hit', amount: 1 }] },
      { id: 'hit', label: 'Hit 2', class: 'hostile', ops: [{ op: 'hit', amount: 2 }] },
    ],
    xp: 16, credits: 6,
    description: 'Scrambles your most-used program.',
  },
  {
    id: 'patcher', name: 'Patcher', level: 2, shell: { type: 'none', points: 0 }, core: 8, perception: 10, ai: 'priority',
    intents: [
      { id: 'repair', label: 'Repair ally 4', class: 'utility', when: { c: 'allyHurt', pct: 0.8 }, ops: [{ op: 'heal', amount: 4, to: 'allyLowest' }] },
      { id: 'reshell', label: 'Reshell ally', class: 'utility', when: { c: 'allyShellBroken' }, ops: [{ op: 'reshell', amount: 4, to: 'allyLowest' }] },
      { id: 'poke', label: 'Poke 1', class: 'hostile', ops: [{ op: 'hit', amount: 1 }] },
    ],
    xp: 14, credits: 6,
    description: 'Repairs and reshells other ICE.',
  },
  {
    id: 'siren', name: 'Siren', level: 1, shell: { type: 'none', points: 0 }, core: 6, perception: 20,
    intents: [
      { id: 'call2', label: 'Calling backup (2)', class: 'utility', ops: [] },
      { id: 'call1', label: 'Calling backup (1)', class: 'utility', ops: [] },
      { id: 'summon', label: 'Backup arrives', class: 'utility', ops: [{ op: 'summon', ice: 'sentry' }] },
    ],
    xp: 12, credits: 4,
    description: 'Calls reinforcements in 2 turns unless stunned or killed.',
  },
  {
    id: 'hydra', name: 'Hydra', level: 2, shell: { type: 'wall', points: 6 }, core: 12, perception: 10,
    intents: [{ id: 'bite', label: 'Bite 3', class: 'hostile', ops: [{ op: 'hit', amount: 3 }] }],
    triggers: [{ on: 'shellBreak', once: true, ops: [{ op: 'split' }] }],
    xp: 22, credits: 8,
    description: 'Splits in two when its shell breaks, unless Infected.',
  },
  {
    id: 'mirror', name: 'Mirror', level: 2, shell: { type: 'crypt', points: 5 }, core: 9, perception: 10, reflect: 1,
    intents: [{ id: 'glare', label: 'Glare 2', class: 'hostile', ops: [{ op: 'hit', amount: 2 }] }],
    xp: 18, credits: 6,
    description: 'Reflects the damage kind you used last on it.',
  },
  {
    id: 'psychotrope', name: 'Psychotrope', level: 3, black: true, shell: { type: 'crypt', points: 4 }, core: 9, perception: 20,
    intents: [
      { id: 'dose', label: 'Dose: 2 neural, scramble labels', class: 'hostile', ops: [{ op: 'hit', amount: 2, neural: true }, { op: 'playerStatus', status: 'labelsScrambled', value: 2 }] },
      { id: 'hit', label: 'Hit 2', class: 'hostile', ops: [{ op: 'hit', amount: 2 }] },
    ],
    xp: 30, credits: 15,
    description: 'BLACK ICE. Neural damage. Scrambles the labels of your programs.',
  },
  {
    id: 'hunter', name: 'Tracker', level: 2, hunter: true, shell: { type: 'none', points: 0 }, core: 10, perception: 30,
    intents: [{ id: 'track', label: 'Track (+3 trace, hit 2)', class: 'hostile', ops: [{ op: 'trace', amount: 3 }, { op: 'hit', amount: 2 }] }],
    xp: 18, credits: 5,
    description: 'Hunter ICE. Joins fights at Alarm and roams systems at high heat.',
  },
  {
    id: 'headchef', name: 'Head Chef', level: 2, boss: true, shell: { type: 'wall', points: 6 }, core: 20, perception: 20,
    intents: [
      { id: 'cleaver', label: 'Cleaver 4', class: 'hostile', ops: [{ op: 'hit', amount: 4 }] },
      { id: 'season', label: 'Season (reshell 3)', class: 'utility', ops: [{ op: 'reshell', amount: 3 }] },
    ],
    phases: [{
      at: 0.5, name: 'Rush Hour', text: "Kitchen's slammed! ORDER UP!",
      shell: { type: 'crypt', points: 6 },
      intents: [
        { id: 'fry', label: 'Deep Fry 2x3', class: 'hostile', ops: [{ op: 'hit', amount: 3, hits: 2 }] },
        { id: 'orderup', label: 'Order Up (summon Sentry)', class: 'utility', ops: [{ op: 'summon', ice: 'sentry' }, { op: 'hit', amount: 1 }] },
      ],
    }],
    xp: 60, credits: 40,
    description: 'Boss. Wall shell, then crypt shell at half core.',
  },
  // --- raid squad ---
  {
    id: 'raidcop', name: 'KH Compliance Unit', level: 2, shell: { type: 'wall', points: 5 }, core: 12, perception: 30,
    intents: [
      { id: 'serve', label: 'Serve Notice 3', class: 'hostile', ops: [{ op: 'hit', amount: 3 }] },
      { id: 'audit', label: 'Audit (tar 1, hit 2)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'tarred', value: 1 }, { op: 'hit', amount: 2 }] },
    ],
    xp: 20,
    description: 'Kurage-Halcyon home compliance. They brought a warrant and a smile.',
  },
  // --- localhost (finale) ---
  {
    id: 'tutorial', name: 'Unskippable Tutorial', level: 4, shell: { type: 'none', points: 0 }, core: 12, perception: 50,
    intents: [
      { id: 'popup', label: 'Popup (-2 cycles)', class: 'utility', ops: [{ op: 'notify', text: 'Did you know? You can press SPACE to end your turn!', style: 'popup' }, { op: 'playerStatus', status: 'tarred', value: 2 }] },
      { id: 'hit', label: 'Helpful Hint 3', class: 'hostile', ops: [{ op: 'hit', amount: 3 }] },
    ],
    xp: 0,
    description: 'It will explain the game to you. Again.',
  },
  {
    id: 'paywall', name: 'Paywall', level: 4, shell: { type: 'wall', points: 10 }, core: 16, perception: 50,
    intents: [
      { id: 'offer', label: 'Pay 999 ¤ to skip this fight', class: 'utility', ops: [{ op: 'offer', id: 'paywall', text: 'Pay 999 ¤ to skip this fight', credits: 999 }, { op: 'hit', amount: 1 }] },
      { id: 'hit', label: 'Microtransaction 4', class: 'hostile', ops: [{ op: 'hit', amount: 4 }] },
    ],
    xp: 0,
    description: 'Paying works.',
  },
  {
    id: 'eula', name: 'EULA', level: 4, shell: { type: 'crypt', points: 8 }, core: 14, perception: 50,
    intents: [
      { id: 'terms', label: 'Updated Terms', class: 'utility', ops: [{ op: 'demand', id: 'eula', text: 'By continuing to exist you agree to the Terms (412 pages). Scroll and accept.', penalty: [{ op: 'playerStatus', status: 'stunned', value: 1 }] }] },
      { id: 'hit', label: 'Clause 4', class: 'hostile', ops: [{ op: 'hit', amount: 4 }] },
    ],
    xp: 0,
    description: 'Accept the terms or lose a turn.',
  },
  {
    id: 'gc', name: 'Garbage Collector', level: 4, shell: { type: 'wall', points: 8 }, core: 14, perception: 50,
    intents: [
      { id: 'evict', label: 'Collect (evict a program)', class: 'utility', ops: [{ op: 'evict', mode: 'random' }] },
      { id: 'hit', label: 'Sweep 4', class: 'hostile', ops: [{ op: 'hit', amount: 4 }] },
    ],
    xp: 0,
    description: 'Evicts loaded programs.',
  },
  {
    id: 'chairman2', name: 'CHAIRMAN v2', level: 6, boss: true, undefeatable: true, script: 'chairman2',
    shell: { type: 'crypt', points: 30 }, core: 200, perception: 100,
    intents: [
      { id: 'synergy', label: 'Synergize 5', class: 'hostile', ops: [{ op: 'hit', amount: 5 }] },
      { id: 'fakewin', label: 'YOU WIN', class: 'unknown', ops: [{ op: 'notify', text: 'YOU WIN', style: 'fakewin' }, { op: 'heal', amount: 50 }] },
      { id: 'offer', label: 'An Offer', class: 'utility', ops: [{ op: 'story', ops: [{ op: 'event', name: 'chairman.offer' }] }] },
    ],
    xp: 0,
    description: 'It owns the interface. integrity: ∞',
  },
  {
    id: 'patchnet', name: 'PATCH//botnet', level: 4, boss: true, shell: { type: 'wall', points: 8 }, core: 24, perception: 100,
    intents: [
      { id: 'swarm', label: 'Your hosts: 2x3', class: 'hostile', ops: [{ op: 'hit', amount: 2, hits: 3 }] },
      { id: 'surge', label: 'Surge 6', class: 'hostile', ops: [{ op: 'hit', amount: 6 }] },
      { id: 'reroute', label: 'Reroute (reshell 6)', class: 'utility', ops: [{ op: 'reshell', amount: 6 }] },
    ],
    xp: 0,
    description: 'Every host you ever owned, pointed at you.',
  },
];
