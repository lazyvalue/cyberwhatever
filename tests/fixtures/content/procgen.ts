// Tables for procedural IoT hosts and Endless mode. Owner: content agent.
import type { ProcgenTables } from '../../../src/engine/types.ts';

export const procgen: ProcgenTables = {
  devices: ['toaster', 'doorbell', 'e-scooter', 'baby monitor', 'smart bulb', 'aquarium thermometer', 'label printer', 'smart kettle', 'treadmill', 'litter box'],
  brands: ['Snugg', 'HomeHub', 'Glo', 'Kettlr', 'BrightlyKH', 'Toastie', 'Purrfect'],
  tlds: ['iot', 'home', 'local'],
  iceByTier: [
    ['parental', 'sentry'],
    ['sentry', 'cipher', 'bloodhound', 'tarpit'],
    ['cipher', 'killer', 'hydra', 'scrambler', 'mirror'],
    ['killer', 'hydra', 'scrambler', 'mirror', 'patcher'],
    ['killer', 'hydra', 'mirror', 'patcher', 'scrambler'],
  ],
  paydata: [
    { name: 'usage telemetry', value: 15 },
    { name: 'wi-fi password list', value: 25 },
    { name: 'voice recordings (mostly sighing)', value: 30 },
    { name: 'firmware signing key (expired)', value: 40 },
  ],
};
