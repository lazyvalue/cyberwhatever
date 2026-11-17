// Story trigger registry. Add one file per act/arc and spread it here.
import type { TriggerDef } from '../../../../src/engine/types.ts';
import { act1 } from './act1.ts';
import { anyAct } from './any.ts';

export const triggers: TriggerDef[] = [...act1, ...anyAct];
