// Key / password / exploit items. Owner: content agent.
import type { ItemDef } from '../../../src/engine/types.ts';

export const items: ItemDef[] = [
  { id: 'fridge_pw', name: 'fridge password', kind: 'password', description: 'It was on a sticky note. On the fridge.' },
  { id: 'noc_badge', name: 'NOC badge', kind: 'key', description: 'Opens the BigByte NOC vault.' },
];
