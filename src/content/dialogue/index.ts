// Dialogue registry (docs/script/02-dialogues.md). One file per arc.
import type { DialogueDef } from '../../engine/types.ts';
import { hubDialogues } from './hub.ts';
import { glitchDialogues } from './glitch.ts';
import { wraithDialogues } from './wraith.ts';
import { churchDialogues } from './church.ts';
import { storyDialogues } from './story.ts';

export const dialogues: DialogueDef[] = [
  ...hubDialogues, ...glitchDialogues, ...wraithDialogues, ...churchDialogues, ...storyDialogues,
];
