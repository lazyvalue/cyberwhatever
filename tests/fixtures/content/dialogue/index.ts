// Dialogue registry.
import type { DialogueDef } from '../../../../src/engine/types.ts';
import { auntieIntro } from './auntie.ts';
import { bofh } from './bofh.ts';

export const dialogues: DialogueDef[] = [auntieIntro, bofh];
