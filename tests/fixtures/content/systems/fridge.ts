// System 1: the neighbour's smart fridge (tutorial). Owner: content agent.
import type { SystemDef } from '../../../../src/engine/types.ts';

export const fridge: SystemDef = {
  id: 'fridge',
  name: 'FrostLink Smart Fridge',
  address: 'fridge.local',
  tier: 1,
  security: 1,
  owner: 'your neighbour',
  description: 'A fridge with a touchscreen, a subscription, and opinions about your diet.',
  hostPower: 1,
  mood: 'system',
  nodes: [
    { id: 'gw', type: 'gateway', name: 'FrostLink login', x: 0.12, y: 0.5, links: ['ds', 'io'], ice: [{ ice: 'parental' }] },
    {
      id: 'ds', type: 'datastore', name: 'grocery list', x: 0.45, y: 0.25, links: ['core'],
      files: [
        { id: 'fridge-groceries', name: 'grocery list (organic, smug)', kind: 'paydata', value: 30 },
        { id: 'fridge-note', name: 'sticky_note.jpg', kind: 'item', item: 'fridge_pw' },
      ],
    },
    {
      id: 'io', type: 'io', name: 'ice dispenser', x: 0.45, y: 0.75, links: ['core'],
      use: { label: 'dispense ice', once: true, ops: [{ op: 'log', text: 'Somewhere, a neighbour hears the ice dispenser at 3 a.m.' }, { op: 'flag', flag: 'fridge_ice' }] },
    },
    { id: 'core', type: 'core', name: 'FrostLink firmware', x: 0.82, y: 0.5, links: [], ice: [{ ice: 'parental' }], backdoor: 'fridge_pw' },
  ],
};
