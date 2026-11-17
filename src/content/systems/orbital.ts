// System 11: firstorbital.trust — the orbital bank. Side heist. The vault needs keys A and B. Owner: content agent.
// Tactical identity: compounding. Compound Interest (Hydra) splits, Re-Entry charges, Auditors trace, Gravity Wells
// anchor; the Fiduciary levels up on its accrual turns. Nudging the thrusters Slows the next fight.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, say } from './lib.ts';

const L = 5;

export const orbital: SystemDef = {
  id: 'orbital',
  name: 'First Orbital Trust',
  address: 'firstorbital.trust',
  tier: 4,
  security: 5,
  owner: 'First Orbital Trust (412 km up)',
  description: 'A bank on a space station 412 km up. The vault needs both halves of a two-key credential: one from Coinbasement, one from Chrome & Bone. Biggest score in Act 2. If your credits are frozen, the escrow may be here.',
  mood: 'system',
  motd: 'FIRST ORBITAL TRUST · "Too High To Fail."\nAltitude: 412 km. Interest: also high.\nVault access requires two keyholders.\nBoth keyholders are fine. Do not ask about keyholder 1.',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Uplink Dish', x: 0.05, y: 0.5, links: ['tellers', 'router'],
      description: 'Points at Earth. Earth does not wave.',
      ice: [I('ice.orbital.teller', L)],
    },
    {
      id: 'tellers', type: 'datastore', name: 'Teller Queue', x: 0.24, y: 0.22, links: ['offshore'],
      description: 'Robots in waistcoats.',
      ice: [I('ice.orbital.teller', L), I('ice.orbital.auditor', L)],
      files: [
        pay('file.orbital.interest_rates', 'interest_rates.csv', 300),
        lore('file.orbital.brochure', 'brochure.pdf', 'See Earth from above! See your debt from above!'),
      ],
    },
    {
      id: 'offshore', type: 'honeypot', name: 'offshore_accounts.db', x: 0.42, y: 0.06, links: [],
      description: 'Even in space, "offshore" is a trap.',
      files: [pay('file.orbital.offshore', 'offshore_accounts.db', 25)],
    },
    {
      id: 'router', type: 'router', name: 'Station Router', x: 0.26, y: 0.68, links: ['ledger', 'thrusters', 'security'],
      description: 'Lag: 0.002 s. Smugness: high.',
      ice: [I('ice.orbital.gravity_well', L), I('ice.orbital.auditor', L)],
      netscanIot: 1,
    },
    {
      id: 'thrusters', type: 'io', name: 'Station-Keeping Thrusters', x: 0.42, y: 0.92, links: ['airlock'],
      description: 'A gentle nudge goes a long way up here.',
      ice: [I('ice.orbital.re_entry', L)],
      files: [lore('file.orbital.thruster_log', 'thruster_log.txt', 'Day 3,211: we drifted 4 m. Nobody noticed. We are always drifting.')],
      use: { label: 'nudge the station', ops: [say("You nudge the station. The bankers spill their drinks. In orbit, drinks spill slowly. It's beautiful. The next ICE you meet is still finding its feet."), { op: 'nextFight', ops: [{ op: 'iceStatus', status: 'slowed', value: 2, to: 'allEnemies' }] }] },
    },
    {
      id: 'airlock', type: 'io', name: 'Airlock', x: 0.62, y: 0.95, links: [],
      description: "Nobody's outside. That's the problem with airlocks.",
      use: { label: 'open the airlock', once: true, ops: [say("Nothing happens. The station logs 'airlock opened for no reason' and books a meeting about it.")] },
    },
    {
      id: 'ledger', type: 'datastore', name: 'Ledger', x: 0.5, y: 0.42, links: ['vault', 'core'],
      description: 'Every rich person, alphabetised by altitude.',
      ice: [I('ice.orbital.compound_interest', L), I('ice.orbital.teller', L)],
      files: [
        pay('file.orbital.rich_people', 'rich_people.csv', 800, { tagged: true, note: 'Ranked by altitude of net worth.' }),
        pay('file.orbital.bolt_fine', 'bolt_fine.rec', 100, { note: 'Fine: 40,000¤. Offence: one (1) bolt left in orbit. The bolt has since been promoted.' }),
        lore('file.orbital.keyholder_memo', 'keyholder_memo.eml', "Keyholder 1 is 'currently' in cryo at Chrome & Bone. Keyholder 2 runs an exchange in a basement. This is our security model."),
      ],
    },
    {
      id: 'vault', type: 'vault', name: 'The Vault', x: 0.86, y: 0.1, links: [],
      description: 'Too high to fail. Two keyholders. Both halves of the credential, together.',
      lock: { item: 'key.orbital_pair', label: 'both halves of the First Orbital credential (A from Coinbasement, B from Chrome & Bone)' },
      ice: [I('ice.orbital.re_entry', 6), I('ice.orbital.compound_interest', 6), I('ice.orbital.gravity_well', 6)],
      files: [
        pay('file.orbital.bearer_bonds', 'bearer_bonds.dat', 2500, { note: "Bearer bonds, orbital grade. 'Payable to whoever is holding this.' That's you." }),
        lore('file.orbital.deposit_box_7', 'deposit_box_7.txt', "Box 7. Owner: KH Office of the Chairman. Contents: six years of Auntie Static posts, printed, annotated. Margin note on one: 'too warm here. more swearing.'", [{ op: 'flag', flag: 'orbital_done' }]),
        {
          id: 'file.orbital.escrow', name: 'escrow.dat', kind: 'lore', text: 'Escrow account. Owner: you. Balance: whatever we froze. —C.',
          onTake: [{
            op: 'if', cond: { c: 'all', of: [{ c: 'flag', flag: 'deadmans_done' }, { c: 'not', of: { c: 'flag', flag: 'funds_recovered' } }] },
            then: [{ op: 'unfreezeCredits' }, { op: 'item', item: 'item.frozen_funds', remove: true }, { op: 'flag', flag: 'funds_recovered' }, { op: 'message', from: 'glitch', text: 'got it. your money. all of it. i only counted it twice.' }],
          }],
        },
      ],
    },
    {
      id: 'security', type: 'security', name: 'Orbital Compliance', x: 0.55, y: 0.75, links: ['core'],
      description: 'Insured against everything except you.',
      ice: [I('ice.orbital.gravity_well', 6), I('ice.orbital.auditor', L)],
    },
    {
      id: 'core', type: 'core', name: 'Trust Core', x: 0.9, y: 0.6, links: [],
      description: 'Owns the bank. Owns the view.',
      ice: [I('ice.orbital.fiduciary', 5), I('ice.orbital.teller', 6)],
    },
  ],
};
