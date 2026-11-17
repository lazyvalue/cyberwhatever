// New-game setup and global content hooks. Owner: content agent.
import type { SetupDef } from '../../../src/engine/types.ts';

export const setup: SetupDef = {
  startCredits: 50,
  startPrograms: ['crack', 'spike', 'ping', 'firewall'],
  startLoadout: ['crack', 'spike', 'ping', 'firewall'],
  knownSystems: ['fridge'],
  hunterIce: ['hunter'],
  raidIce: [['raidcop'], ['raidcop', 'sentry'], ['raidcop', 'raidcop'], ['raidcop', 'raidcop', 'patcher'], ['raidcop', 'raidcop', 'patcher']],
  localhost: 'localhost',
  exchange: 'coinbasement',
  finaleBoss: 'chairman2',
  patchIce: 'patchnet',
  cheatProgram: 'gremlin',
};
