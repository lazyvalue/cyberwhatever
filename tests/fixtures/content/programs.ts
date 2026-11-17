// Programs. Owner: content agent. Vocabulary: CombatOp in src/engine/types.ts (see docs/ENGINE_API.md).
import type { ProgramDef } from '../../../src/engine/types.ts';

export const programs: ProgramDef[] = [
  // --- starter deck (Potato-9) ---
  {
    id: 'crack', name: 'crack.exe', family: 'crack', version: 1, category: 'attack',
    cost: 1, cooldown: 0, noise: 1, ram: 1, targeting: 'ice', price: 0,
    ops: [{ op: 'damage', kind: 'crack', amount: 3, spread: 1 }],
    description: 'Crack damage 3-4. Strong vs crypt shells, weak vs walls.',
    flavor: 'Downloaded from a forum with a skull GIF in the header.',
  },
  {
    id: 'spike', name: 'spike.sh', family: 'spike', version: 1, category: 'attack',
    cost: 1, cooldown: 0, noise: 1, ram: 1, targeting: 'ice', price: 0,
    ops: [{ op: 'damage', kind: 'spike', amount: 3, spread: 1 }],
    description: 'Spike damage 3-4. Strong vs wall shells, weak vs crypt.',
    flavor: 'One line of shell script. Do not read the line.',
  },
  {
    id: 'ping', name: 'ping.scan', family: 'ping', version: 1, category: 'exploit',
    cost: 1, cooldown: 1, noise: 1, ram: 1, targeting: 'ice', price: 0,
    ops: [{ op: 'iceStatus', status: 'mapped', value: 3 }],
    description: 'Mapped for 3 turns: see exact intent; your next hit on it crits x1.5.',
  },
  {
    id: 'firewall', name: 'firewall.bat', family: 'firewall', version: 1, category: 'defense',
    cost: 1, cooldown: 1, noise: 0, ram: 1, targeting: 'none', price: 0,
    ops: [{ op: 'shield', amount: 4 }],
    description: '+4 shield this turn.',
    flavor: 'Batch file. Runs on vibes.',
  },
  // --- shop ---
  {
    id: 'crack2', name: 'crack.exe v2', family: 'crack', version: 2, category: 'attack',
    cost: 1, cooldown: 0, noise: 1, ram: 1, targeting: 'ice', price: 600, minRep: 3, requires: { cpu: 1 },
    ops: [{ op: 'damage', kind: 'crack', amount: 5, spread: 1 }],
    description: 'Crack damage 5-6. Needs CPU tier 1.',
  },
  {
    id: 'worm', name: 'wormhole.vbs', family: 'worm', version: 1, category: 'attack',
    cost: 2, cooldown: 1, noise: 2, ram: 1, targeting: 'ice', price: 120,
    ops: [{ op: 'damage', kind: 'worm', amount: 3 }],
    description: 'Infected(3): core damage each ICE turn, ignores shells, jumps on death. Stops Hydra splits.',
  },
  {
    id: 'fuzz', name: 'fuzz.py', family: 'fuzz', version: 1, category: 'exploit',
    cost: 1, cooldown: 0, noise: 1, ram: 1, targeting: 'ice', price: 100,
    ops: [{ op: 'iceStatus', status: 'unstable', value: 3 }],
    description: 'Unstable(+3). Overflow programs consume it.',
  },
  {
    id: 'overflow', name: 'overflow.c', family: 'overflow', version: 1, category: 'exploit',
    cost: 2, cooldown: 1, noise: 2, ram: 1, targeting: 'ice', price: 150, tags: ['overflow'],
    ops: [{ op: 'damage', kind: 'spike', amount: 1, overflow: 2 }],
    description: 'Spike 1, +2 per Unstable stack (consumes all).',
  },
  {
    id: 'inject', name: 'inject.dll', family: 'inject', version: 1, category: 'exploit',
    cost: 1, cooldown: 2, noise: 1, ram: 1, targeting: 'ice', price: 180,
    ops: [{ op: 'iceStatus', status: 'backdoored', value: 2 }],
    description: 'Backdoored(2): Rootable after 2 turns.',
  },
  {
    id: 'rootkit', name: 'rootkit.so', family: 'rootkit', version: 1, category: 'exploit',
    cost: 2, cooldown: 1, noise: 2, ram: 2, targeting: 'ice', price: 300, minRep: 2, tags: ['root'],
    ops: [{ op: 'root' }],
    description: 'Subvert a Rootable ICE: it fights for you this fight. Bosses resist.',
  },
  {
    id: 'decoy', name: 'decoy.bin', family: 'decoy', version: 1, category: 'defense',
    cost: 1, cooldown: 2, noise: 0, ram: 1, targeting: 'none', price: 120,
    ops: [{ op: 'playerStatus', status: 'decoy', value: 1 }],
    description: 'Decoy(1): absorbs the next attack.',
  },
  {
    id: 'patchdeck', name: 'patch.deck', family: 'patchdeck', version: 1, category: 'defense',
    cost: 2, cooldown: 2, noise: 0, ram: 1, targeting: 'none', price: 140,
    ops: [{ op: 'repair', amount: 5 }],
    description: 'Repair 5 deck integrity.',
  },
  {
    id: 'neuralbuf', name: 'neural.buffer', family: 'neuralbuf', version: 1, category: 'defense',
    cost: 1, cooldown: 3, noise: 0, ram: 1, targeting: 'none', price: 250, minRep: 2,
    ops: [{ op: 'neuralHeal', amount: 3 }, { op: 'cleanse', status: 'burn' }],
    description: 'Restore 3 neural HP and clear Burn.',
  },
  {
    id: 'mask', name: 'mask.vpn', family: 'mask', version: 1, category: 'stealth',
    cost: 1, cooldown: 2, noise: 0, ram: 1, targeting: 'none', price: 150,
    ops: [{ op: 'playerStatus', status: 'masked', value: 1 }, { op: 'trace', amount: -2 }],
    description: 'Masked: trace gain halved this turn. -2 trace now.',
  },
  {
    id: 'lullaby', name: 'lullaby.wav', family: 'lullaby', version: 1, category: 'stealth',
    cost: 2, cooldown: 3, noise: 1, ram: 1, targeting: 'ice', price: 200,
    ops: [{ op: 'iceStatus', status: 'stunned', value: 1 }],
    description: 'Stun 1 turn (bosses: Slowed).',
  },
  {
    id: 'pinger', name: 'pinger.d', family: 'pinger', version: 1, category: 'daemon',
    cost: 1, cooldown: 4, noise: 1, ram: 1, targeting: 'none', price: 220,
    ops: [],
    daemon: { turns: 3, ops: [{ op: 'damage', kind: 'spike', amount: 2 }] },
    description: 'Daemon (3 turns, holds 1 extra RAM while running): spike 2 to a random ICE each turn.',
  },
  {
    id: 'decrypt', name: 'decrypt.gz', family: 'decrypt', version: 1, category: 'special',
    cost: 1, cooldown: 1, noise: 0, ram: 1, targeting: 'none', price: 150, decrypt: 1, tags: ['decrypt'],
    ops: [{ op: 'notify', text: 'decrypt.gz: nothing to decrypt in here.' }],
    description: 'Hub: decrypt strength-1 paydata (full sale value). Useless in a fight.',
  },
  // --- story / joke ---
  {
    id: 'gremlin', name: 'console.gremlin', family: 'gremlin', version: 1, category: 'special',
    cost: 0, cooldown: 0, noise: 0, ram: 0, targeting: 'none', price: 0, sellValue: 0, noSignature: true, noFlow: true, tags: ['joke'],
    ops: [{ op: 'story', ops: [{ op: 'log', text: 'console.gremlin: yeehaw.' }, { op: 'event', name: 'gremlin.yeehaw' }] }],
    description: "Does nothing. Prints 'yeehaw' to the real console. Has never done anything else. Never will.",
    flavor: 'Nothing adapts to nothing.',
  },
];
