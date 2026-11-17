// System registry. Add a file per system and list it here.
import type { SystemDef } from '../../../../src/engine/types.ts';
import { fridge } from './fridge.ts';
import { wok } from './wok.ts';
import { bigbyte } from './bigbyte.ts';
import { localhost } from './localhost.ts';

export const systems: SystemDef[] = [fridge, wok, bigbyte, localhost];
