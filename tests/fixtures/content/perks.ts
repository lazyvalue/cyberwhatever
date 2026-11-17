// Perks (offered 3 at a time at rep 2/4/6/8/10). Owner: content agent.
import type { PerkDef } from '../../../src/engine/types.ts';

export const perks: PerkDef[] = [
  { id: 'polyglot', name: 'Polyglot', description: 'Flow needs only 2 categories.', mods: [{ mod: 'flowCategories', count: 2 }] },
  { id: 'slumlord', name: 'Slumlord', description: '+1 power on tier-1 hosts.', mods: [{ mod: 'hostPower', tier: 1, add: 1 }] },
  { id: 'ghost', name: 'Ghost', description: 'Once per run, a failed sneak does not ambush.', mods: [{ mod: 'ghost' }] },
];
