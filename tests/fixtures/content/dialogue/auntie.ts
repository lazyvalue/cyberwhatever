// Auntie Static dialogue (slice). Owner: story agent.
import type { DialogueDef } from '../../../../src/engine/types.ts';

export const auntieIntro: DialogueDef = {
  id: 'auntie_intro',
  speaker: 'auntie',
  start: 'start',
  nodes: {
    start: {
      text: 'So you are the new kid. Potato-9, huh? Mine was a Potato-4. We all start somewhere ugly.',
      choices: [
        { text: 'Who are you?', to: 'who' },
        { text: "What's the job?", to: 'job' },
        { text: "I'll be careful.", to: 'careful', cond: { c: 'stat', stat: 'humanity', gte: 90 }, showLocked: true, lockedText: 'You do not mean it anymore.' },
      ],
    },
    who: {
      text: 'Auntie Static. Fixer. I have been on this board longer than you have been alive, kiddo. Probably.',
      next: 'job',
    },
    job: {
      text: 'Neighbour\'s fridge. fridge.local. Get in, take the core, get out. Use spike on walls, crack on crypt. Do not get greedy.',
      ops: [{ op: 'flag', flag: 'met_auntie' }],
      choices: [{ text: 'On it.' }],
    },
    careful: {
      text: 'Sure you will. Everybody is careful until the first payout.',
      textCold: 'Noted.',
      ops: [{ op: 'flag', flag: 'promised_careful' }],
      next: 'job',
    },
  },
};
