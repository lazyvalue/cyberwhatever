// BigByte process node dialogue (slice). Owner: story agent.
import type { DialogueDef } from '../../../../src/engine/types.ts';

export const bofh: DialogueDef = {
  id: 'bofh',
  speaker: 'bofh',
  start: 'start',
  nodes: {
    start: {
      text: 'sysadmin.d v0.9. My admin left in 2019. I kept the uptime. Nobody said thank you.',
      choices: [
        { text: 'Thank you.', to: 'thanks', ops: [{ op: 'humanity', amount: 1 }] },
        { text: 'Give me the NOC badge.', to: 'badge', cond: { c: 'not', of: { c: 'item', item: 'noc_badge' } } },
        { text: 'Bye.' },
      ],
    },
    thanks: {
      text: '...oh. Here. Take the badge. Do not tell billing.',
      ops: [{ op: 'item', item: 'noc_badge' }, { op: 'flag', flag: 'thanked_bofh' }],
    },
    badge: {
      text: 'Ask nicely.',
      next: 'start',
    },
  },
};
