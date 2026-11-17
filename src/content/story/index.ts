// Story trigger registry (docs/script/01-beats.md). One file per act/arc, spread here.
import type { TriggerDef } from '../../engine/types.ts';
import { act1 } from './act1.ts';
import { act2 } from './act2.ts';
import { act3 } from './act3.ts';
import { finale } from './finale.ts';
import { taunts } from './taunts.ts';
import { anyAct } from './any.ts';
import { tutorial } from './tutorial.ts';

export const triggers: TriggerDef[] = [...act1, ...act2, ...act3, ...finale, ...taunts, ...anyAct, ...tutorial];
