// Jobs (fixer board). Owner: content agent / story agent.
import type { JobDef } from '../../../src/engine/types.ts';

export const jobs: JobDef[] = [
  {
    id: 'job_fridge', title: 'Cold Open', giver: 'auntie', target: 'fridge',
    description: 'Own the neighbour\'s smart fridge. Learn the ropes. Do not eat anything.',
    objectives: [{ kind: 'own', system: 'fridge', text: 'Capture the fridge core' }],
    reward: { credits: 60, xp: 30 },
  },
  {
    id: 'job_wok', title: 'Secret Sauce', giver: 'auntie', target: 'wok',
    description: 'A rival noodle shop wants Wok This Way\'s sauce recipe. Bring the file. Decrypted is nice, not required.',
    objectives: [{ kind: 'deliver', file: 'wok-recipe', text: 'Deliver the sauce recipe' }],
    reward: { credits: 250, xp: 60 },
  },
];
