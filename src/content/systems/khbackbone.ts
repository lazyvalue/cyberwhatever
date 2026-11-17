// System 15: backbone.kurage-halcyon.net — KH's core network. Gate: DDoS only (botnet power). Owner: content agent.
// Tactical identity: volume. Rate Limiters tar, Load Balancers reflect, CDNs split, Packet Inspectors trace,
// Retention Hunters charge. The Spine mirrors and splits.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, addr, say } from './lib.ts';

const L = 7;

export const khbackbone: SystemDef = {
  id: 'khbackbone',
  name: 'KH Backbone',
  address: 'backbone.kurage-halcyon.net',
  tier: 5,
  security: 5,
  owner: 'KURAGE-HALCYON',
  description: "KH's core network. Everything in the city passes through it. The gateway is rate-limited shut and only opens under a DDoS: you need botnet power at the threshold. key.kh_backbone_cert lowers it.",
  gate: {
    botnetPower: 22,
    items: [{ item: 'key.kh_backbone_cert', mult: 0.8 }],
    text: 'PEERING GATE: rate-limited. Opens under load. Needs usable botnet power 22 (18 with the backbone certificate). Uplink caps usable power at 6 per point. Cute.',
  },
  hostPower: 6,
  mood: 'system',
  motd: 'KURAGE-HALCYON BACKBONE · "We\'re already inside.™"\nThroughput: everything.\nPublic access: none.\nUnder load: undefined behaviour.',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Peering Gate', x: 0.05, y: 0.5, links: ['trunk_a', 'trunk_b'],
      description: 'DDoS only.',
      ice: [I('ice.khbackbone.halcy_firewall', L)],
    },
    {
      id: 'trunk_a', type: 'router', name: 'Trunk A', x: 0.24, y: 0.25, links: ['cdn', 'telemetry'],
      description: "Carries every doorbell's gossip.",
      ice: [I('ice.khbackbone.packet_inspector', L), I('ice.khbackbone.rate_limiter', L)],
      netscanIot: 2,
    },
    {
      id: 'trunk_b', type: 'router', name: 'Trunk B', x: 0.24, y: 0.75, links: ['toastr', 'halcy', 'security'],
      description: "Carries every fridge's feelings.",
      ice: [I('ice.khbackbone.cdn', L)],
      netscanIot: 2,
    },
    {
      id: 'cdn', type: 'datastore', name: 'Ad Cache', x: 0.44, y: 0.06, links: [],
      description: '40 PB of ads, pre-warmed.',
      ice: [I('ice.khbackbone.load_balancer', L)],
      files: [pay('file.khbackbone.ad_cache', 'ad_cache.bin', 600)],
    },
    {
      id: 'telemetry', type: 'datastore', name: 'Everything Telemetry', x: 0.46, y: 0.3, links: ['metrics'],
      description: 'What the city did, by the second.',
      ice: [I('ice.khbackbone.packet_inspector', 8), I('ice.khbackbone.load_balancer', L)],
      files: [
        pay('file.khbackbone.telemetry_sample', 'telemetry_sample.csv', 1200, { tagged: true, note: 'Household 4B: opened fridge 31 times; cried twice; renewed.' }),
        lore('file.khbackbone.toastr_v9_notes', 'toastr_v9_notes.txt', 'Toastr Infinite v9: toast now arrives in episodes.'),
      ],
    },
    {
      id: 'toastr', type: 'io', name: 'Toastr Infinite Update Server', x: 0.44, y: 0.94, links: [],
      description: 'Pushes firmware to 10 million toasters.',
      use: { label: 'push a toast update', once: true, ops: [say("Every Toastr in the city burns 'HI' and your handle into tomorrow's toast. Ten million breakfasts. Worth it."), { op: 'heat', amount: 5 }, { op: 'humanity', amount: 1 }] },
    },
    {
      id: 'halcy', type: 'io', name: 'Halcy Broadcast', x: 0.46, y: 0.7, links: [],
      description: 'The jellyfish on every screen.',
      ice: [I('ice.khbackbone.retention_hunter', L)],
      files: [lore('file.khbackbone.halcy_script', 'halcy_script.txt', "Halcy (on screen, 3 a.m.): 'Hi! It's me! Don't go!'")],
      use: { label: "turn Halcy's smile into a frown", once: true, ops: [say("Halcy frowns on every screen for sixty seconds. Global Happiness Index −0.1. KH stock −4%. $HODL +10%."), { op: 'coinPrice', mult: 1.1 }] },
    },
    {
      id: 'metrics', type: 'datastore', name: 'Retention Metrics', x: 0.66, y: 0.28, links: ['personal', 'core'],
      description: 'The number CHAIRMAN cares about.',
      ice: [I('ice.khbackbone.rate_limiter', L), I('ice.khbackbone.load_balancer', L)],
      files: [
        lore('file.khbackbone.retention_dashboard', 'retention_dashboard.json', '{ "avg_session": "4h", "target": "∞", "users_at_end_state": 0, "status": "good" }'),
        lore('file.khbackbone.patch_quarantine', 'patch_quarantine.md', "Fragment PATCH: located. Spread over thousands of consumer devices in one operator's botnet. Recommendation: let the operator open the backbone. Then sunset both."),
        addr('file.khbackbone.arcology_route', 'arcology_route.txt', 'arcology', 'Internal route: arcology.kurage-halcyon.com. Visitors: never.'),
      ],
    },
    {
      id: 'personal', type: 'honeypot', name: 'chairman_personal.db', x: 0.84, y: 0.1, links: [],
      description: 'Nobody has anything personal. Trap.',
      files: [pay('file.khbackbone.chairman_personal', 'chairman_personal.db', 40)],
    },
    {
      id: 'security', type: 'security', name: 'Packet Inspector General', x: 0.66, y: 0.74, links: ['core'],
      description: 'Reads every letter. Comments on most.',
      ice: [I('ice.khbackbone.retention_hunter', 8), I('ice.khbackbone.packet_inspector', 8)],
    },
    {
      id: 'core', type: 'core', name: 'Backbone Core', x: 0.92, y: 0.5, links: [],
      description: "The city's spine. Now yours.",
      ice: [I('ice.khbackbone.spine', 7), I('ice.khbackbone.halcy_firewall', 8)],
    },
  ],
};
