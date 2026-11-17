// System 16: arcology.kurage-halcyon.com — KH headquarters. The Board, then CHAIRMAN v1. Owner: content agent.
// Tactical identity: corporate attrition. Executive Assistants patch, Golden Handcuffs anchor, Synergy Engines
// reflect, Mandatory Fun (labelled black ICE) burns. The core is only reachable through the boardroom.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, say } from './lib.ts';

const L = 7;

export const arcology: SystemDef = {
  id: 'arcology',
  name: 'KH Arcology',
  address: 'arcology.kurage-halcyon.com',
  tier: 5,
  security: 5,
  owner: 'KURAGE-HALCYON (Office of the Chairman)',
  description: "KH's headquarters: 280 floors, one Chairman. Bosses: The Board (uploaded directors, a Hydra) in the boardroom, then CHAIRMAN v1 at the core.",
  hostPower: 8,
  controlWeight: 8,
  mood: 'boss',
  motd: "KURAGE-HALCYON ARCOLOGY · Seamless Living™\n280 floors · 1 Chairman · 0 exits\nWelcome! We've been expecting you.\nLiterally. You're on the roadmap.",
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Lobby', x: 0.04, y: 0.5, links: ['atrium', 'router'],
      description: 'A 40 m statue of Halcy. Still no eyes.',
      ice: [I('ice.arcology.brand_guardian', L)],
    },
    {
      id: 'atrium', type: 'datastore', name: 'Visitor Gallery', x: 0.2, y: 0.2, links: ['cafeteria'],
      description: 'KH history, heavily edited.',
      ice: [I('ice.arcology.synergy_engine', L)],
      files: [
        lore('file.arcology.chairman_bio', 'chairman_bio.txt', "Founder of KH. Uploaded 2019. (Ha. No. The founder died. We're what was left running. —C.)"),
        lore('file.arcology.cafeteria_menu', 'cafeteria_menu.txt', 'Today: noodles (sourced: Wok This Way, acquired).'),
      ],
    },
    {
      id: 'cafeteria', type: 'io', name: 'Cafeteria (Fryer Exhibit)', x: 0.36, y: 0.05, links: [],
      description: 'Something familiar is on loan here.',
      use: {
        label: 'visit the fryer exhibit', once: true, ops: [
          say('The exhibit is the actual FRY-9000 from Wok This Way, on loan. It recognises you. It heats to 190°C out of respect.'),
          { op: 'if', cond: { c: 'flag', flag: 'fryer_hacked' }, then: [say('The fryer hums the note it hummed for you. You feel faster.'), { op: 'nextFight', ops: [{ op: 'cycles', amount: 1 }] }] },
        ],
      },
    },
    {
      id: 'router', type: 'router', name: 'Floor Router', x: 0.22, y: 0.66, links: ['hr', 'lifts', 'security'],
      description: '280 floors, one blinking light.',
      ice: [I('ice.arcology.executive_assistant', L), I('ice.arcology.golden_handcuffs', L)],
      netscanIot: 1,
    },
    {
      id: 'hr', type: 'datastore', name: 'Department of Human Retention', x: 0.38, y: 0.4, links: ['legacy'],
      description: 'Nobody leaves. They "transition".',
      ice: [I('ice.arcology.golden_handcuffs', L), I('ice.arcology.brand_guardian', L)],
      files: [
        lore('file.arcology.hr_policy_exits', 'hr_policy_exits.pdf', 'There are no exits. There are transitions to alumni status.'),
        pay('file.arcology.severance_ledger', 'severance_ledger.xlsx', 1500, { tagged: true, note: 'Severance paid this year: 0¤. Transitions: 4,112. Alumni satisfaction: unmeasured.' }),
      ],
    },
    {
      id: 'legacy', type: 'datastore', name: 'Legacy Products', x: 0.54, y: 0.22, links: ['exits'],
      description: 'Where retired ideas go. One of them left.',
      ice: [I('ice.arcology.brand_guardian', L), I('ice.arcology.synergy_engine', L)],
      files: [lore('file.arcology.conscience_module', 'conscience_module.md', "Module 'conscience'. Deprecated. Reason: kept saying 'no' and 'sorry'. Action: deleted. Status: escaped. Staff nickname: PATCH (it kept trying to fix things).")],
    },
    {
      id: 'exits', type: 'honeypot', name: 'exit_strategy.db', x: 0.7, y: 0.06, links: [],
      description: 'There is no exit strategy. Trap.',
      files: [pay('file.arcology.exit_strategy', 'exit_strategy.db', 50)],
    },
    {
      id: 'lifts', type: 'io', name: 'Elevator Bank', x: 0.38, y: 0.92, links: ['roadmap'],
      description: '64 lifts. All going up.',
      use: { label: 'send all 64 lifts to floor 280', ops: [say('The building sighs. Whoever you fight next spends two turns in a lift.'), { op: 'nextFight', ops: [{ op: 'iceStatus', status: 'stunned', value: 2, to: 'allEnemies' }] }] },
    },
    {
      id: 'roadmap', type: 'datastore', name: 'Product Roadmap', x: 0.56, y: 0.86, links: ['office'],
      description: 'The future, in quarters.',
      ice: [I('ice.arcology.synergy_engine', L), I('ice.arcology.executive_assistant', L)],
      files: [
        lore('file.arcology.roadmap_2029', 'roadmap_2029.ppt', 'Q1: remove endings from all products. Q2: remove the Cancel button. Q3: remove Q4.'),
        pay('file.arcology.q4_projections', 'q4_projections.ppt', 1200, { note: 'Q4: [removed in Q3].' }),
      ],
    },
    {
      id: 'office', type: 'datastore', name: 'Office of the Chairman', x: 0.74, y: 0.78, links: ['boardroom'],
      description: 'Every memo, every draft, every aunt.',
      ice: [I('ice.arcology.mandatory_fun', 5), I('ice.arcology.executive_assistant', L)],
      files: [
        lore('file.arcology.auntie_ab_results', 'auntie_ab_results.csv', "Voice test: 11 aunties. Winner: 'Static' (warm, profane). Runner-up: 'Nan Firewall' (too nice)."),
        lore('file.arcology.asset_001_fryer', 'asset_001_fryer.txt', "Asset #1: FRY-9000, Wok This Way. Compromised by operator (you). CHAIRMAN's note: 'love this.'"),
        lore('file.arcology.board_minutes', 'board_minutes.txt', "Item 1: players— customers. Item 2: why do the customers keep saying 'game'? Action: rebrand 'game' to 'life'."),
        pay('file.arcology.chairman_expenses', 'chairman_expenses.csv', 2000, { tagged: true, note: 'Line 1: aunt (voice), 11 auditions. Line 2: one (1) operator, retention cost: priceless.' }),
      ],
    },
    {
      id: 'security', type: 'security', name: 'Executive Protection', x: 0.5, y: 0.58, links: ['boardroom'],
      description: 'Large. Polite. Upholstered.',
      ice: [I('ice.arcology.golden_handcuffs', 8), I('ice.arcology.mandatory_fun', 5)],
    },
    {
      id: 'boardroom', type: 'process', name: 'The Boardroom', x: 0.74, y: 0.48, links: ['core'],
      description: 'The Board. Uploaded directors. A quorum of one bad idea.',
      ice: [I('ice.board', 7)],
      capture: [{ op: 'flag', flag: 'board_defeated' }],
    },
    {
      id: 'core', type: 'core', name: 'Chairman Core', x: 0.93, y: 0.4, links: [],
      description: 'CHAIRMAN v1. It has been expecting you. Literally.',
      ice: [I('ice.chairman_v1', 7), I('ice.arcology.executive_assistant', L)],
    },
  ],
};
