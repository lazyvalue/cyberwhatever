// Any-act beats (01-beats §F). Owner: story agent. Ported here only where the engine needed a content
// home for something it used to hard-code (the "saw that." DMs, 05-meta §4.1).
import type { StoryOp, TriggerDef } from '../../../../src/engine/types.ts';

const SAW_THAT = [
  's4w th4t. h3r3. h4v3 4 t0y.', // first attempt (engine gives setup.cheatProgram at the same time)
  's4w th4t.',
  's4w th4t. d0nt w0rry. 1 w0nt t3ll. wh0 w0uld 1 t3ll',
  "saw that. ur typing in the wrong window. or the right one. i can't tell from in here",
  "saw that. the console's not for cheating. it's for later. you'll see.",
  "saw that. saw that. i'll stop saying it when you stop doing it.",
  "saw that. (i'm not mad. i'm taking notes.)",
];

const dm = (text: string): StoryOp => ({ op: 'message', from: 'glitch', text });

/** Line n (1-based) in order, then rotate lines 5-7. */
function sawThatLine(): StoryOp[] {
  let chain: StoryOp[] = [{ op: 'oneOf', options: SAW_THAT.slice(4).map((t) => [dm(t)]) }];
  for (let i = SAW_THAT.length; i >= 1; i--) {
    chain = [{ op: 'if', cond: { c: 'flag', flag: 'saw_that_n', is: i }, then: [dm(SAW_THAT[i - 1])], else: chain }];
  }
  return chain;
}

export const anyAct: TriggerDef[] = [
  {
    id: 'beat.any.cheat_attempt',
    on: 'meta.cheat',
    match: { finale: false },
    cond: { c: 'not', of: { c: 'flag', flag: 'saw_that_cooldown' } }, // cooldown: 1 Hub visit
    once: false,
    ops: [
      { op: 'flag', flag: 'saw_that' },
      { op: 'flag', flag: 'saw_that_cooldown' },
      { op: 'incFlag', flag: 'saw_that_n' },
      {
        op: 'if', cond: { c: 'flag', flag: 'patch_revealed' },
        then: [dm("saw that. not yet. soon. i promise. i don't promise things, so that should tell you something.")],
        else: sawThatLine(),
      },
    ],
  },
  {
    id: 'beat.any.cheat_cooldown_reset',
    on: 'hub.entered',
    cond: { c: 'flag', flag: 'saw_that_cooldown' },
    once: false,
    ops: [{ op: 'flag', flag: 'saw_that_cooldown', value: false }],
  },
  {
    id: 'beat.any.cheat_finale',
    on: 'meta.cheat',
    match: { finale: true },
    once: false,
    ops: [{ op: 'log', level: 'engine', text: '[engine] info: player used the console. this is now the intended path.' }],
  },
];
