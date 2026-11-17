// System 4: bigbyte-isp.net — regional ISP. Routers, netscan, first Bloodhounds. Owner: content agent.
// Tactical identity: trace pressure. Packet Sniffers add trace every turn; Tier 3 Support holds you in place.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, key, prog, say } from './lib.ts';

const L = 2;

export const bigbyte: SystemDef = {
  id: 'bigbyte',
  name: 'BigByte Regional ISP',
  address: 'bigbyte-isp.net',
  tier: 2,
  security: 2,
  owner: 'BigByte Communications (a Kurage-Halcyon company)',
  description: 'Regional ISP. Half the street\'s traffic flows through its routers. Grab a router node and netscan to find new addresses. First Bloodhound ICE. Support queue is a crime scene.',
  mood: 'system',
  motd: 'BIGBYTE ISP · "Up to" fast™\nNetwork status: Mostly.\nYour call is important to us. Estimated wait: yes.',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Customer Portal', x: 0.06, y: 0.5, links: ['support', 'router_n'],
      description: 'Login, logout, cry.',
      ice: [I('ice.bigbyte.support_bot', L)],
    },
    {
      id: 'support', type: 'datastore', name: 'Support Ticket Queue', x: 0.25, y: 0.2, links: ['freebies'],
      description: '81,000 open tickets. 3 closed, by accident.',
      ice: [I('ice.bigbyte.packet_sniffer', L)],
      files: [
        key('file.bigbyte.support_ticket_4471', 'support_ticket_4471.txt', 'pw.parkit_archive', "From: City Parking Authority. 'Archive login stopped working.' Resolution: reset to ParkingIsLife4471. Customer satisfied. Customer has never been satisfied."),
        prog('file.bigbyte.pingback', 'pingback.prog', 'prog.pinger_v1', 'a tiny daemon. Readme: "pings things. things ping back. friendship."'),
        lore('file.bigbyte.outage_excuses', 'outage_excuses.txt', "1. Solar flare. 2. Squirrel. 3. The squirrel's lawyer. 4. 'Upstream.' 5. You."),
        lore('file.bigbyte.complaint_wraith', 'complaint_wraith.txt', "Customer xX_Wraith_Xx: 'connection dropped mid-run. lost EVERYTHING. i was at 94%.' Account created: —. Status: no such customer."),
        lore('file.bigbyte.up_to', 'up_to.txt', "Legal: 'up to' includes zero."),
      ],
    },
    {
      id: 'freebies', type: 'honeypot', name: 'free_upgrades.db', x: 0.45, y: 0.06, links: [],
      description: 'No ISP has ever given a free upgrade. Probe it.',
      files: [pay('file.bigbyte.free_upgrades', 'free_upgrades.db', 10)],
    },
    {
      id: 'router_n', type: 'router', name: 'Router — North', x: 0.28, y: 0.58, links: ['router_s', 'billing'],
      description: 'Blinks green. Means nothing.',
      ice: [I('ice.bigbyte.support_bot', L), I('ice.bigbyte.fair_use', L)],
      netscan: ['parkit'], netscanIot: 2,
    },
    {
      id: 'billing', type: 'datastore', name: 'Billing', x: 0.55, y: 0.35, links: ['core'],
      description: 'The only part that works perfectly.',
      ice: [I('ice.bigbyte.fair_use', L), I('ice.bigbyte.support_bot', L)],
      files: [
        pay('file.bigbyte.customer_list', 'customer_list.csv', 150, { tagged: true, note: 'Names, addresses, and what each household streams at 2 a.m. Mostly cooking shows.' }),
        pay('file.bigbyte.client_debt', 'client_debt.rec', 60, { note: 'Account: B. Mother (CEO\'s). Owed: 9,000¤. Service received: none. Nobody ever receives it.' }),
        pay('file.bigbyte.upsell_list', 'premium_tier_upsell.csv', 110, { note: "Customers who will pay to be throttled less. That's everyone." }),
        lore('file.bigbyte.throttle_policy', 'throttle_policy.md', 'Throttle customers who stream, game, or breathe near the router. Never throttle: KH.'),
        lore('file.bigbyte.kh_peering', 'kh_peering.eml', 'KH Happiness Division surveys get priority. Every home must be asked if it is happy. happiness.kurage-halcyon.com'),
      ],
    },
    {
      id: 'router_s', type: 'router', name: 'Router — South', x: 0.48, y: 0.78, links: ['throttle', 'noc'],
      description: 'Blinks amber. Also means nothing.',
      ice: [I('ice.bigbyte.hold_music', L), I('ice.bigbyte.support_bot', L)],
      netscanIot: 1,
    },
    {
      id: 'throttle', type: 'io', name: 'Throttle Box', x: 0.7, y: 0.93, links: [],
      description: 'A dial from "fast" to "up to".',
      use: { label: 'unthrottle the street', once: true, ops: [say('You unthrottle the whole street for one night. Every teenager on the block levels up. The logs drown in traffic.'), { op: 'humanity', amount: 3 }, { op: 'trace', amount: -8 }] },
    },
    {
      id: 'noc', type: 'security', name: 'Network Ops Centre', x: 0.72, y: 0.65, links: ['core'],
      description: 'One tired person and a wall of graphs.',
      ice: [I('ice.bigbyte.packet_sniffer', L), I('ice.bigbyte.hold_music', L)],
    },
    {
      id: 'core', type: 'core', name: 'ISP Core', x: 0.92, y: 0.45, links: [],
      description: 'Owns the pipes. Owns the excuses.',
      ice: [I('ice.bigbyte.escalation', 3)],
    },
  ],
};
