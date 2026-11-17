// System 2: Wok This Way noodle shop POS. Owner: content agent.
import type { SystemDef } from '../../../../src/engine/types.ts';

export const wok: SystemDef = {
  id: 'wok',
  name: 'Wok This Way POS',
  address: 'wokthisway.biz',
  tier: 1,
  security: 1,
  owner: 'Wok This Way (franchise #4)',
  description: 'Point of sale, loyalty card, and a deep fryer on the network for some reason.',
  mood: 'system',
  nodes: [
    { id: 'gw', type: 'gateway', name: 'POS login', x: 0.08, y: 0.5, links: ['rt'], ice: [{ ice: 'sentry' }] },
    { id: 'rt', type: 'router', name: 'back-office router', x: 0.3, y: 0.5, links: ['ds', 'hp', 'sec'], ice: [{ ice: 'cipher' }], netscanIot: 2 },
    {
      id: 'ds', type: 'datastore', name: 'receipts', x: 0.52, y: 0.25, links: ['io'], ice: [{ ice: 'sentry' }],
      files: [
        { id: 'wok-receipts', name: 'card receipts', kind: 'paydata', value: 80, tagged: true },
        { id: 'wok-recipe', name: 'secret sauce recipe', kind: 'paydata', value: 120, encrypted: 1 },
        { id: 'wok-isp', name: 'isp_invoice.pdf', kind: 'address', system: 'bigbyte' },
      ],
    },
    {
      id: 'hp', type: 'honeypot', name: 'employee_passwords.xls', x: 0.52, y: 0.5, links: [],
      files: [{ id: 'wok-bait', name: 'employee_passwords.xls (it is all "wok123")', kind: 'paydata', value: 5 }],
    },
    {
      id: 'io', type: 'io', name: 'deep fryer', x: 0.75, y: 0.2, links: ['core'],
      use: { label: 'crank the deep fryer to 11', once: true, ops: [{ op: 'flag', flag: 'wok_fryer' }, { op: 'log', text: 'The deep fryer reaches a temperature usually reserved for stars.' }] },
    },
    { id: 'sec', type: 'security', name: 'loss prevention', x: 0.52, y: 0.78, links: ['core'], ice: [{ ice: 'bloodhound' }] },
    { id: 'core', type: 'core', name: 'POS core', x: 0.9, y: 0.5, links: [], ice: [{ ice: 'headchef' }] },
  ],
};
