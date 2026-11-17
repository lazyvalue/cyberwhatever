// Implants (Doc Tungsten's clinic). Owner: content agent. `humanity` is the cost (negative = gain).
// Names, effects and Doc's pitches: docs/script/04-items-flavor.md §4. Ids `imp.<name>`.
import type { ImplantDef } from '../engine/types.ts';

export const implants: ImplantDef[] = [
  {
    id: 'imp.wired_reflexes', name: 'Wired Reflexes', humanity: 10, price: 900, minRep: 3,
    mods: [{ mod: 'firstTurnCycles', add: 2 }],
    description: '+2 cycles on turn 1 of every fight.',
    flavor: '"Your nerves, but caffeinated. Permanently."',
  },
  {
    id: 'imp.pain_editor', name: 'Pain Editor', humanity: 10, price: 1200, minRep: 4,
    mods: [{ mod: 'firstNeuralHitHalved' }],
    description: 'The first neural hit each fight is halved.',
    flavor: '"Pain is just information. I edit the information."',
  },
  {
    id: 'imp.mnemonic_buffer', name: 'Mnemonic Buffer', humanity: 15, price: 1500, minRep: 3,
    mods: [{ mod: 'keepPaydataOnDump' }],
    description: 'Keep your paydata when dumped.',
    flavor: '"A little shelf in your head. For files. And one childhood memory, to make room."',
  },
  {
    id: 'imp.cold_cortex', name: 'Cold Cortex', humanity: 20, price: 2400, minRep: 5,
    mods: [{ mod: 'immune', status: 'scrambled' }, { mod: 'tag', tag: 'cold_cortex' }],
    description: 'Immune to Scramble.',
    flavor: '"You\'ll feel calm. You\'ll feel *less*. Marketing says \'calm\'."',
  },
  {
    id: 'imp.ghost_glands', name: 'Ghost Glands', humanity: 10, price: 1800, minRep: 4,
    mods: [{ mod: 'stat', stat: 'mask', add: 1 }],
    description: 'Mask +1 (less trace per turn, better sneak).',
    flavor: '"You\'ll stop sweating. Entirely. Your shirts will be suspicious."',
  },
  {
    id: 'imp.eidetic_lens', name: 'Eidetic Lens', humanity: 15, price: 2800, minRep: 5,
    mods: [{ mod: 'startMapped', count: 1 }],
    description: 'One random ICE starts each fight Mapped.',
    flavor: '"You\'ll see everything. You\'ll forget nothing. You\'ll be *so* tired."',
  },
  {
    id: 'imp.botnet_spine', name: 'Botnet Spine', humanity: 15, price: 3200, minRep: 5,
    mods: [{ mod: 'stat', stat: 'uplink', add: 1 }],
    description: 'Uplink +1 (one more botnet charge, +6 usable botnet power).',
    flavor: '"I wire your spine to your hosts. You\'ll feel them. Every single one. Something might feel you back."',
  },
  {
    id: 'imp.second_stomach', name: 'Second Stomach', humanity: -5, price: 250,
    mods: [{ mod: 'tag', tag: 'second_stomach' }],
    description: 'Does nothing. +5 humanity. People will ask about it.',
    flavor: '"Pointless. Gorgeous. Like a sunset."',
  },
];
