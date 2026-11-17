// Vendors. Owner: content agent. autoStock lists every hardware tier / priced program / implant automatically.
import type { VendorDef } from '../../../src/engine/types.ts';

export const vendors: VendorDef[] = [
  { id: 'hardware', name: 'Chrome Bucket', kind: 'hardware', autoStock: 'hardware', stock: [] },
  { id: 'warez', name: 'w4rez.zip', kind: 'warez', autoStock: 'programs', stock: [] },
  { id: 'clinic', name: "Doc Tungsten's", npc: 'doc', kind: 'clinic', autoStock: 'implants', stock: [] },
  {
    id: 'broker', name: 'Mx. Whisper', npc: 'whisper', kind: 'broker',
    stock: [
      { id: 'addr_bigbyte', kind: 'address', ref: 'bigbyte', price: 150, minRep: 2 },
      { id: 'noc_badge', kind: 'item', ref: 'noc_badge', price: 300, minRep: 2 },
      { id: 'stats', kind: 'info', name: 'A file about you', price: 50, text: 'You hesitate before every purchase. You always buy anyway. That is not advice, it is a profile.' },
    ],
  },
  { id: 'fixer', name: 'The Dead Drop', npc: 'auntie', kind: 'fixer', stock: [] },
];
