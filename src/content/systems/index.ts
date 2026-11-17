// System registry. One file per system (DESIGN §10.2 ids); list it here.
import type { SystemDef } from '../../engine/types.ts';
import { fridge } from './fridge.ts';
import { wok } from './wok.ts';
import { vendnet } from './vendnet.ts';
import { bigbyte } from './bigbyte.ts';
import { parkit } from './parkit.ts';
import { khhappy } from './khhappy.ts';
import { coinbasement } from './coinbasement.ts';
import { chromebone } from './chromebone.ts';
import { karaoke } from './karaoke.ts';
import { seamless } from './seamless.ts';
import { orbital } from './orbital.ts';
import { aegis } from './aegis.ts';
import { deadmans } from './deadmans.ts';
import { deaddrop } from './deaddrop.ts';
import { khbackbone } from './khbackbone.ts';
import { arcology } from './arcology.ts';
import { localhost } from './localhost.ts';

// Paydata values in the system files are the script's ¤ numbers (03-systems-flavor). The economy scales them by
// system tier so a run's haul keeps pace with the hardware curve (DESIGN §9: tier-1 run ~100-200 ¤, final parts
// ~10-16k ¤). Looted files never respawn, so this table is most of the campaign's income.
const PAY_MULT: Record<number, number> = { 1: 2, 2: 2.5, 3: 3, 4: 3, 5: 3, 6: 1 };

function scalePaydata(sys: SystemDef): SystemDef {
  const m = PAY_MULT[sys.tier] ?? 1;
  return {
    ...sys,
    nodes: sys.nodes.map((n) => (n.files ? {
      ...n,
      files: n.files.map((f) => (f.kind === 'paydata' && f.value ? { ...f, value: Math.round((f.value * m) / 5) * 5 } : f)),
    } : n)),
  };
}

export const systems: SystemDef[] = [
  fridge, wok, vendnet, bigbyte, parkit, khhappy,
  coinbasement, chromebone, karaoke, seamless, orbital, aegis, deadmans,
  deaddrop, khbackbone, arcology, localhost,
].map(scalePaydata);
