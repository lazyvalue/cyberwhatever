// Deck hardware tiers. Owner: content agent. Tier 0 = the Potato-9 starting part (required for every part).
// DESIGN §4.1 ranges: CPU 3->8, RAM 4->16, Firewall 2->12, Chassis 20->80, Mask 0->6, Uplink 0->6, Storage 3->12, Neural 10->30.
import type { HardwareDef } from '../../../src/engine/types.ts';

export const hardware: HardwareDef[] = [
  { id: 'cpu0', part: 'cpu', tier: 0, name: 'Potato-9 Core', value: 3, price: 0, flavor: 'Thermal paste: optimism.' },
  { id: 'cpu1', part: 'cpu', tier: 1, name: 'Hamster Wheel Duo', value: 4, price: 250 },
  { id: 'cpu2', part: 'cpu', tier: 2, name: 'Overclock Lite', value: 5, price: 900, minRep: 3 },

  { id: 'ram0', part: 'ram', tier: 0, name: 'Potato-9 Memory', value: 4, price: 0 },
  { id: 'ram1', part: 'ram', tier: 1, name: 'Used Stick (Lightly Chewed)', value: 6, price: 200 },
  { id: 'ram2', part: 'ram', tier: 2, name: 'Dual Channel Regret', value: 8, price: 700, minRep: 3 },

  { id: 'fw0', part: 'firewall', tier: 0, name: 'Potato-9 Firewall', value: 2, price: 0, flavor: 'A sticky note that says NO.' },
  { id: 'fw1', part: 'firewall', tier: 1, name: 'Brick Wall Basic', value: 4, price: 200 },
  { id: 'fw2', part: 'firewall', tier: 2, name: 'Brick Wall Pro', value: 6, price: 750, minRep: 3 },

  { id: 'ch0', part: 'chassis', tier: 0, name: 'Potato-9 Shell', value: 20, price: 0 },
  { id: 'ch1', part: 'chassis', tier: 1, name: 'Lunchbox Chassis', value: 30, price: 180 },
  { id: 'ch2', part: 'chassis', tier: 2, name: 'Toolbox Chassis', value: 40, price: 650, minRep: 2 },

  { id: 'mask0', part: 'mask', tier: 0, name: 'none', value: 0, price: 0 },
  { id: 'mask1', part: 'mask', tier: 1, name: 'Fake Mustache Chip', value: 1, price: 220 },
  { id: 'mask2', part: 'mask', tier: 2, name: 'Trench Coat Chip', value: 2, price: 800, minRep: 3 },

  { id: 'up0', part: 'uplink', tier: 0, name: 'none', value: 0, price: 0 },
  { id: 'up1', part: 'uplink', tier: 1, name: 'Borrowed Wi-Fi', value: 1, price: 150 },
  { id: 'up2', part: 'uplink', tier: 2, name: 'Stolen Fibre', value: 2, price: 600, minRep: 2 },

  { id: 'st0', part: 'storage', tier: 0, name: 'Potato-9 Drive', value: 3, price: 0 },
  { id: 'st1', part: 'storage', tier: 1, name: 'Thumb Drive Necklace', value: 5, price: 120 },
  { id: 'st2', part: 'storage', tier: 2, name: 'External HDD (Clicking)', value: 7, price: 500, minRep: 2 },

  { id: 'neu0', part: 'neural', tier: 0, name: 'Factory Brain', value: 10, price: 0 },
  { id: 'neu1', part: 'neural', tier: 1, name: 'Surge Protector (Cranial)', value: 14, price: 300, minRep: 2 },
  { id: 'neu2', part: 'neural', tier: 2, name: 'Grounded Skull', value: 18, price: 900, minRep: 4 },
];
