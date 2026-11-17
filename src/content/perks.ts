// Perks (offered 3 at a time at rep 2/4/6/8/10). Owner: content agent.
// Names, effects and flavor: docs/script/04-items-flavor.md §5. Ids `perk.<name>`.
import type { PerkDef } from '../engine/types.ts';

export const perks: PerkDef[] = [
  {
    id: 'perk.polyglot', name: 'Polyglot', mods: [{ mod: 'flowCategories', count: 2 }],
    description: 'Flow needs 2 program categories in a turn, not 3. You speak fluent Everything, badly.',
  },
  {
    id: 'perk.slumlord', name: 'Slumlord', mods: [{ mod: 'hostPower', tier: 1, add: 1 }],
    description: '+1 power on tier-1 hosts (fridges, toasters, vending machines). Toasters pay rent now.',
  },
  {
    id: 'perk.ghost', name: 'Ghost', mods: [{ mod: 'ghost' }, { mod: 'sneak', add: 5 }],
    description: 'Once per run, a failed sneak does not ambush. Sneak +5%. They felt a draught. That\'s all.',
  },
  {
    id: 'perk.packrat', name: 'Packrat', mods: [{ mod: 'stat', stat: 'storage', add: 2 }, { mod: 'saleValue', mult: 1.1 }],
    description: '+2 storage. Paydata sells for +10%. You keep everything. Some of it is valuable.',
  },
  {
    id: 'perk.kiddie_forever', name: 'Script Kiddie Forever', mods: [{ mod: 'programCost', version: 1, add: -1, min: 1 }],
    description: 'v1 programs cost 1 fewer cycle (min 1). You never upgraded. You never had to.',
  },
  {
    id: 'perk.cold_open', name: 'Cold Open', mods: [{ mod: 'coldOpen' }],
    description: 'The first program each fight costs 0 cycles. You start talking before they say hello.',
  },
  {
    id: 'perk.combo_breaker', name: 'Combo Breaker', mods: [{ mod: 'comboRefund' }],
    description: 'Consuming a status (a Mapped crit, Unstable, Rootable) refunds 1 cycle, once per turn. Every setup is a discount.',
  },
  {
    id: 'perk.worm_farmer', name: 'Worm Farmer', mods: [{ mod: 'infectedSlowDecay' }],
    description: 'Infected decays every other turn. You raise them. You love them. You set them loose.',
  },
  {
    id: 'perk.quiet_hands', name: 'Quiet Hands', mods: [{ mod: 'noise', category: 'stealth', add: -99 }, { mod: 'noise', add: -1 }],
    description: 'Stealth programs make 0 noise. Other programs make 1 less. Even your typing whispers.',
  },
  {
    id: 'perk.landlord', name: 'Landlord', mods: [{ mod: 'proxyMult', mult: 2 }],
    description: 'Proxy hosts count double. You hide behind a lot of property.',
  },
  {
    id: 'perk.market_maker', name: 'Market Maker', minLevel: 4, mods: [{ mod: 'pumpCooldown', mult: 0.5 }, { mod: 'heatGain', mult: 1.1 }],
    description: 'Exchange pump/dump cooldown halved. All heat gains +10%. You *are* the market.',
  },
  {
    id: 'perk.deep_pockets', name: 'Deep Pockets', mods: [{ mod: 'traceFine', ratio: 0.05 }],
    description: 'The Traced fine is 5% of your credits, not 20%. Most of your money is somewhere they can\'t find.',
  },
  {
    id: 'perk.iron_stomach', name: 'Iron Stomach', mods: [{ mod: 'immune', status: 'labelsScrambled' }, { mod: 'neuralTaken', add: -1 }],
    description: 'Immune to Psychotrope label scrambling. Black ICE neural hits deal 1 less. You\'ve seen worse labels.',
  },
  {
    id: 'perk.second_wind', name: 'Second Wind', mods: [{ mod: 'secondWind' }],
    description: 'Once per run, survive deck integrity 0 with 1. The deck refuses. It\'s very rude about it.',
  },
];
