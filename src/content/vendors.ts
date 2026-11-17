// Vendors. Owner: content agent. autoStock lists every hardware tier / priced program / implant automatically,
// each gated by its own minRep (hardware: t1 rep 1-2, t2 rep 3-4, t3 rep 5-6, t4 rep 7-8; see hardware.ts).
// Whisper's files about you are dialogues (story agent) sold as services.
import type { VendorDef } from '../engine/types.ts';

const act2 = { c: 'flag', flag: 'act2_started' } as const;
const act3 = { c: 'flag', flag: 'act3_started' } as const;

export const vendors: VendorDef[] = [
  { id: 'hardware', name: 'BITS4LESS (kiosk)', npc: 'kiosk', kind: 'hardware', autoStock: 'hardware', stock: [] },
  { id: 'warez', name: "ratking's Bin", npc: 'ratking', kind: 'warez', autoStock: 'programs', stock: [] },
  {
    id: 'clinic', name: 'Chrome & Bone (front desk)', npc: 'doc', kind: 'clinic', autoStock: 'implants',
    stock: [],
  },
  {
    id: 'broker', name: "Mx. Whisper's Shelf", npc: 'whisper', kind: 'broker',
    stock: [
      // addresses
      { id: 'addr_vendnet', kind: 'address', ref: 'vendnet', name: 'Address: vend-o-net.biz', price: 60 },
      { id: 'addr_parkit', kind: 'address', ref: 'parkit', name: 'Address: parkit.city.gov', price: 180, minRep: 2 },
      { id: 'addr_karaoke', kind: 'address', ref: 'karaoke', name: 'Address: neonlarynx.bar', price: 350, cond: act2 },
      // passwords (§H: pw.aegis_blacklab from Wraith's booth, or Whisper for 600)
      { id: 'pw_parkit', kind: 'item', ref: 'pw.parkit_archive', name: 'Password: Parking Authority archive', price: 250, minRep: 2 },
      { id: 'pw_aegis', kind: 'item', ref: 'pw.aegis_blacklab', name: 'Password: Aegis Black Lab', price: 600, cond: { c: 'flag', flag: 'aegis_offered' } },
      // facts (dialogues by the story agent)
      { id: 'auntie_fact', kind: 'service', name: 'A fact about Auntie Static', price: 0, once: true, cond: act2, ops: [{ op: 'dialogue', dialogue: 'dlg.whisper.auntie_fact' }] },
      { id: 'you_v1', kind: 'service', name: 'A file about you (vol. 1)', price: 120, once: true, ops: [{ op: 'dialogue', dialogue: 'dlg.whisper.you_v1' }] },
      { id: 'you_v2', kind: 'service', name: 'A file about you (vol. 2)', price: 900, once: true, cond: act2, ops: [{ op: 'dialogue', dialogue: 'dlg.whisper.you_v2' }] },
      { id: 'you_v3', kind: 'service', name: 'A file about you (vol. 3)', price: 5000, once: true, cond: act3, ops: [{ op: 'dialogue', dialogue: 'dlg.whisper.you_v3' }] },
      { id: 'wraith_stats', kind: 'service', name: "xX_Wraith_Xx's file", price: 300, once: true, cond: { c: 'flag', flag: 'karaoke_done' }, ops: [{ op: 'dialogue', dialogue: 'dlg.whisper.wraith_stats' }] },
    ],
  },
  { id: 'fixer', name: 'The Dead Drop (fixer board)', npc: 'auntie', kind: 'fixer', stock: [] },
];
