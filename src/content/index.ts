// Content registry: assembles every content file into the engine's Content shape.
// Content agents: add new files under the matching folder and register them in that folder's index.
import type { Content } from '../engine/types.ts';
import { programs } from './programs.ts';
import { ice } from './ice.ts';
import { hardware } from './hardware.ts';
import { implants } from './implants.ts';
import { perks } from './perks.ts';
import { items } from './items.ts';
import { npcs } from './npcs.ts';
import { vendors } from './vendors.ts';
import { jobs } from './jobs.ts';
import { systems } from './systems/index.ts';
import { triggers } from './story/index.ts';
import { dialogues } from './dialogue/index.ts';
import { procgen } from './procgen.ts';
import { setup } from './setup.ts';
import { iceScripts, scripts } from './scripts.ts';

export function byId<T extends { id: string }>(list: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const x of list) {
    if (out[x.id]) throw new Error(`duplicate content id '${x.id}'`);
    out[x.id] = x;
  }
  return out;
}

export const content: Content = {
  programs: byId(programs),
  ice: byId(ice),
  hardware,
  implants: byId(implants),
  perks: byId(perks),
  items: byId(items),
  npcs: byId(npcs),
  systems: byId(systems),
  vendors: byId(vendors),
  jobs: byId(jobs),
  triggers,
  dialogues: byId(dialogues),
  setup,
  procgen,
  iceScripts,
  scripts,
};

export default content;
