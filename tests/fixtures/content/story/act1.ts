// Act 1 story beats (vertical slice). Owner: story agent.
// Triggers fire on engine events (`on` + `match`) and/or state conditions (`cond`). Default once: true.
import type { TriggerDef } from '../../../../src/engine/types.ts';

export const act1: TriggerDef[] = [
  {
    id: 'intro',
    on: 'game.started',
    ops: [
      { op: 'message', from: 'auntie', subject: 'welcome to the Drop', text: 'Kiddo. Heard you got a deck. Heard it is a potato. Let us fix both of those. Start next door: their fridge has a web interface and no shame.' },
      { op: 'job', job: 'job_fridge' },
      { op: 'dialogue', dialogue: 'auntie_intro' },
    ],
  },
  {
    id: 'engine_warn_1',
    on: 'run.ended',
    match: { system: 'fridge' },
    ops: [{ op: 'script', id: 'engineWarnHandle' }],
  },
  {
    id: 'fridge_owned',
    on: 'system.owned',
    match: { system: 'fridge' },
    ops: [
      { op: 'message', from: 'auntie', text: 'A fridge. My little kiddo owns a fridge. Next: Wok This Way. Their POS is held together with soy sauce. Bring me their secret recipe.' },
      { op: 'address', system: 'wok', source: 'auntie' },
      { op: 'job', job: 'job_wok' },
    ],
  },
  {
    id: 'first_host',
    on: 'host.added',
    ops: [{ op: 'message', from: 'glitch', text: 'h3y. n1c3 h0st. put 1t 1n th3 b0tn3t. f0r s4f3ty :)' }],
  },
  {
    id: 'fryer',
    on: 'node.used',
    match: { system: 'wok', node: 'io' },
    ops: [{ op: 'message', from: 'auntie', text: 'Did you just set a noodle shop on fire from your bedroom? Proud of you. Do not do it again.' }],
  },
  {
    id: 'bigbyte_netscan',
    on: 'netscan',
    cond: { c: 'inSystem', system: 'bigbyte' },
    ops: [{ op: 'message', from: 'glitch', text: 'wh4t 1s th3 r3ct4ngl3 w1th t4bs 4b0v3 th3 w0rld? just curious' }],
  },
  {
    id: 'slice_done',
    cond: { c: 'owns', system: 'bigbyte' },
    ops: [
      { op: 'flag', flag: 'act1_slice_done' },
      { op: 'message', from: 'auntie', text: 'You own your own ISP, kiddo. Throttle yourself less. More soon.' },
    ],
  },
];
