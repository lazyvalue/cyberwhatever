// System 3: vend-o-net.biz — vending machine fleet. Side system: cheap botnet hosts. Owner: content agent.
// Tactical identity: sticky. Tar Pits everywhere teach Anchored and the bounce program.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, say } from './lib.ts';

export const vendnet: SystemDef = {
  id: 'vendnet',
  name: 'Vend-o-Net Fleet Manager',
  address: 'vend-o-net.biz',
  tier: 1,
  security: 1,
  owner: 'Vend-o-Net Ltd.',
  description: 'Fleet manager for 400 vending machines across the city. Every machine uses the same default password. Capturing the core gives you a cluster of tiny, loyal, snack-scented hosts.',
  hostPower: 1,
  mood: 'system',
  motd: 'VEND-O-NET FLEET MANAGER\n400 units online · 0 units happy\nDefault password in use on 400/400 units. Change it? [LATER]',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Fleet Login', x: 0.08, y: 0.5, links: ['telemetry', 'coinbox'],
      description: 'admin/admin. You feel almost bad.',
      ice: [I('ice.vendnet.out_of_order')],
    },
    {
      id: 'telemetry', type: 'datastore', name: 'Telemetry', x: 0.32, y: 0.32, links: ['unit_0x1f', 'pricing'],
      description: 'Every shake, every kick, every stuck coin.',
      ice: [I('ice.vendnet.exact_change')],
      files: [
        lore('file.vendnet.default_password', 'default_password.txt', 'admin / admin. Do not share. (Shared with 400 machines.)'),
        lore('file.vendnet.telemetry_0x1f', 'telemetry_0x1f.log', 'Crisps stuck since install. 4,112 customers have shaken me. I have felt every one.'),
        lore('file.vendnet.unit_messages', 'unit_messages.txt', "B4: 'I have held this sandwich for 11 months. It is my sandwich now.' C9: 'Exact change. EXACT. CHANGE.' A2: 'Who's humming?'"),
        pay('file.vendnet.dynamic_pricing', 'dynamic_pricing.cfg', 30, { note: 'price_water = base × thirst_estimate × (raining ? 0.5 : 2)' }),
        pay('file.vendnet.coin_totals', 'coin_totals.csv', 70, { note: 'Total coins: 88,410. Total buttons: 0. Someone took the buttons.' }),
      ],
    },
    {
      id: 'coinbox', type: 'honeypot', name: 'coin_box_totals.db', x: 0.32, y: 0.78, links: [],
      description: 'Looks like cash. Is a phone call to security.',
      files: [pay('file.vendnet.coinbox', 'coin_box_totals.db', 5)],
    },
    {
      id: 'unit_0x1f', type: 'io', name: 'Unit 0x1F', x: 0.6, y: 0.18, links: ['core'],
      description: 'The one with the stuck crisps. Famous. Bitter.',
      ice: [I('ice.vendnet.stuck_crisps')],
      use: { label: 'free the crisps', once: true, ops: [say('4,112 bags of crisps fall at once. A crowd forms. A vending machine knows peace.'), { op: 'humanity', amount: 2 }] },
    },
    {
      id: 'pricing', type: 'io', name: 'Dynamic Pricing Engine', x: 0.6, y: 0.68, links: ['core'],
      description: "Water costs more when you're thirsty.",
      ice: [I('ice.vendnet.exact_change')],
      files: [pay('file.vendnet.kh_buyout_offer', 'kh_buyout_offer.eml', 50, { tagged: true, note: "KH would like to acquire Vend-o-Net and rename every snack 'Seamless Snack'. Flavour: Seamless." })],
      use: { label: 'everything costs 1¤', once: true, ops: [say('Everything costs 1¤ for one cycle. Someone buys 300 sandwiches.'), { op: 'humanity', amount: 2 }, { op: 'heat', amount: 5 }] },
    },
    {
      id: 'core', type: 'core', name: 'Fleet Core', x: 0.9, y: 0.45, links: [],
      description: '400 small minds, one big sigh.',
      ice: [I('ice.vendnet.out_of_order'), I('ice.vendnet.stuck_crisps')],
      capture: [{
        op: 'if', cond: { c: 'not', of: { c: 'flag', flag: 'vendnet_units_joined' } }, then: [
          { op: 'flag', flag: 'vendnet_units_joined' },
          { op: 'host', name: 'vend unit 0x1F', power: 1, tier: 1 },
          { op: 'host', name: 'vend unit B4', power: 1, tier: 1 },
          { op: 'host', name: 'vend unit C9', power: 1, tier: 1 },
          say('Three vending machines log in to your botnet. One of them is humming.'),
        ],
      }],
    },
  ],
};
