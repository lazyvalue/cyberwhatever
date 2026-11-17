// Implants (clinic). Owner: content agent. `humanity` is the cost (negative = gain).
import type { ImplantDef } from '../../../src/engine/types.ts';

export const implants: ImplantDef[] = [
  {
    id: 'wired_reflexes', name: 'Wired Reflexes', humanity: 15, price: 600, minRep: 2,
    mods: [{ mod: 'firstTurnCycles', add: 2 }],
    description: '+2 cycles on turn 1 of every fight.',
  },
  {
    id: 'mnemonic_buffer', name: 'Mnemonic Buffer', humanity: 10, price: 450,
    mods: [{ mod: 'keepPaydataOnDump' }],
    description: 'Keep your paydata when dumped.',
  },
  {
    id: 'second_stomach', name: 'Second Stomach', humanity: -5, price: 200,
    mods: [{ mod: 'tag', tag: 'second_stomach' }],
    description: 'Does nothing. +5 humanity. People will ask about it.',
    flavor: 'Doc Tungsten: "I just think you deserve it."',
  },
];
