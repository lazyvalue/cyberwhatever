// New-game setup and global content hooks. Owner: content agent.
import type { SetupDef } from '../engine/types.ts';

export const setup: SetupDef = {
  startCredits: 60,
  startPrograms: ['prog.lockpick', 'prog.crowbar', 'prog.peek', 'prog.umbrella'],
  startLoadout: ['prog.lockpick', 'prog.crowbar', 'prog.peek', 'prog.umbrella'],
  knownSystems: ['fridge'],
  // index = system tier - 1: plain hunters early, KH Retention Agents once KH is paying attention
  hunterIce: ['ice.hunter', 'ice.hunter', 'ice.hunter.kh', 'ice.hunter.kh', 'ice.hunter.kh'],
  // index = (rep - 1) / 2
  raidIce: [
    ['ice.raid.compliance'],
    ['ice.raid.compliance', 'ice.raid.compliance'],
    ['ice.raid.compliance', 'ice.raid.bailiff'],
    ['ice.raid.bailiff', 'ice.raid.compliance', 'ice.raid.medic'],
    ['ice.raid.bailiff', 'ice.raid.bailiff', 'ice.raid.medic'],
  ],
  localhost: 'localhost',
  exchange: 'coinbasement',
  finaleBoss: 'ice.chairman_v2',
  patchIce: 'ice.patch_body',
  cheatProgram: 'prog.console_gremlin',
};
