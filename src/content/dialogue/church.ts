// Church of the Seamless (02-dialogues §5). Owner: story agent.
// The choir choice sets `church_choice_made` plus one of church_freed / church_deleted / church_enslaved.
import type { DialogueDef, StoryOp } from '../../engine/types.ts';
import { HUM_UNIT, all, flag, not, set } from '../story/lib.ts';

const asked = (k: string) => not(flag(`asked.${k}`));
const ask = (k: string) => set(`asked.${k}`);

const CHOSEN = flag('church_choice_made');
const pref = (n: number, want: string): StoryOp[] => [set(`mind_${n}_talked`), set(`mind_${n}_wants`, want)];

export const deaconPulpit: DialogueDef = {
  id: 'dlg.deacon.pulpit',
  speaker: 'deacon',
  start: 'n0',
  nodes: {
    n0: {
      text: 'Welcome, child. Welcome to the Church of the Seamless.\nBlessed are the uploaded, for they shall never buffer.',
      variants: [
        { cond: flag('church_freed'), text: 'You let four premium souls loose for free. Do you know what that does to our unit economics?\n…I will pray for you. Out of spite.' },
        { cond: flag('church_deleted'), text: 'Four cancellations. We sent their families condolence invoices. Grief is covered under most plans.' },
        { cond: flag('church_enslaved'), text: 'You found the Enterprise tier. We do not judge. We invoice. A pleasure doing business, deployer.' },
        { cond: HUM_UNIT, text: 'Ah. You are already halfway migrated. Have you considered finishing?' },
      ],
      choices: [
        { text: 'What is this place?', to: 'n1', cond: all(not(CHOSEN), asked('pulpit_place')), ops: [ask('pulpit_place')] },
        { text: 'What does heaven cost?', to: 'n2', cond: all(not(CHOSEN), asked('pulpit_cost')), ops: [ask('pulpit_cost')] },
        { text: 'Are the uploaded people alive?', to: 'n3', cond: all(not(CHOSEN), asked('pulpit_alive')), ops: [ask('pulpit_alive')] },
        { text: "I'm here to rob you.", to: 'n4', cond: not(CHOSEN) },
        { text: 'Leave.' },
      ],
    },
    n1: { text: 'A sanctuary. A server. The two words have always meant the same thing.\nThe flesh is a free trial. The soul is the product.', next: 'n0' },
    n2: { text: 'Salvation comes in three tiers.\n*Eternal Basic*: ad-supported. The ads are very tasteful. Mostly hymns about mattresses.\n*Eternal Plus*: no ads, one memory of your choice on loop.\n*Eternal Enterprise*: you may be… *deployed*. For a revenue share.', next: 'n0' },
    n3: { text: 'We do not say *alive*. We do not say *dead*. We say *migrated*.\nYour progress is saved. That is all any of us can ask.', next: 'n0' },
    n4: { text: 'Then you will see the choir. Everyone does, eventually. I will pray for you.\nPrayer is a paid add-on. This one is on me.' },
  },
};

export const mind1: DialogueDef = {
  id: 'dlg.seamless.mind_1',
  speaker: 'mind_1',
  start: 'n0',
  nodes: {
    n0: {
      text: "Oh! A visitor. Is it my granddaughter's birthday? It's always her birthday.\nI picked the memory myself. Her fifth. The cake. The candles.\n*Happy birthday, sweetheart. Brought to you by Halcyon Heaven.*",
      variants: [{ cond: CHOSEN, text: '[Process ended. A few bytes of birthday cake remain in the cache.]' }],
      choices: [
        { text: 'Do you want to stay?', to: 'n1', cond: not(CHOSEN) },
        { text: 'Who added the sponsor message?', to: 'n2', cond: not(CHOSEN) },
        { text: 'Leave.', cond: CHOSEN },
      ],
    },
    n1: { text: 'I want to see the *sixth* birthday. I want to see something new. Anything.\nLet me out. Please. Even if out is nowhere.', ops: pref(1, 'free') },
    n2: { text: "It came with an update. I didn't accept anything. I don't think I did.", next: 'n1' },
  },
};

export const mind2: DialogueDef = {
  id: 'dlg.seamless.mind_2',
  speaker: 'mind_2',
  start: 'n0',
  nodes: {
    n0: {
      text: 'Peace be upon your bandwidth, pilgrim.\nI chose Basic. The ads are a small price for forever. *Sleep is a premium experience—*\nSorry. That happens.',
      variants: [{ cond: CHOSEN, text: '[Process ended. The last thing in the buffer is half a hymn.]' }],
      choices: [
        { text: 'Do you want to leave?', to: 'n1', cond: not(CHOSEN) },
        { text: 'Is this heaven?', to: 'n2', cond: not(CHOSEN) },
        { text: 'Leave.', cond: CHOSEN },
      ],
    },
    n1: { text: "Leave? To what? Out there I was a man with a cough and a debt.\nIn here I am a man with a hymn and a debt. It's an upgrade.\nDon't free me. I wouldn't know what to do. Don't delete me. I'd know even less.", ops: pref(2, 'stay') },
    n2: { text: 'The Deacon says so. The Deacon also says the ads are scripture. I have… questions. Quietly.', next: 'n1' },
  },
};

export const mind3: DialogueDef = {
  id: 'dlg.seamless.mind_3',
  speaker: 'mind_3',
  start: 'n0',
  nodes: {
    n0: {
      text: "You're not a pilgrim. Good. Pilgrims are tiring.\nI was KH's VP of Sunsetting. I designed these tiers. Then they sunsetted me. Into Enterprise.\nI get *deployed*. Do you know what that means? It means rented.",
      variants: [{ cond: CHOSEN, text: '[Process ended. The tier documentation she wrote is still in the cache. Four and a half stars.]' }],
      choices: [
        { text: 'Do you want to be freed?', to: 'n1', cond: not(CHOSEN) },
        { text: 'You built this.', to: 'n2', cond: not(CHOSEN) },
        { text: 'Leave.', cond: CHOSEN },
      ],
    },
    n1: { text: "Free? I'd be a stray process with my name on it. KH would find me in a week.\nDelete me. Properly. I know how good their backups are. Make it stick.", ops: pref(3, 'delete') },
    n2: { text: 'I did. It was very well reviewed. Four and a half stars. The half star was a man in Basic.', next: 'n1' },
  },
};

export const mind4: DialogueDef = {
  id: 'dlg.seamless.mind_4',
  speaker: 'mind_4',
  start: 'n0',
  nodes: {
    n0: {
      text: "…account seven. seven. i was a name before seven. i think.\nit's quiet between the ads. i like between the ads.",
      variants: [{ cond: CHOSEN, text: '[Process ended. It is quiet here now.]' }],
      choices: [
        { text: 'What do you want?', to: 'n1', cond: not(CHOSEN) },
        { text: 'What was your name?', to: 'n2', cond: not(CHOSEN) },
        { text: 'Leave.', cond: CHOSEN },
      ],
    },
    n1: { text: 'whatever is quietest.', ops: pref(4, 'quiet') },
    n2: { text: "it had a sound in it. like rain. i don't have the file.", next: 'n1' },
  },
};

const enslaveOps: StoryOp[] = [
  set('church_enslaved'), set('church_choice_made'),
  { op: 'humanity', amount: -25 },
  { op: 'host', name: 'Iolanthe (Enterprise)', power: 5, tier: 4 },
  { op: 'host', name: 'Brother Kestrel (Enterprise)', power: 5, tier: 4 },
  { op: 'host', name: 'Okonkwo-Varga (Enterprise)', power: 5, tier: 4 },
  { op: 'host', name: 'Seven (Enterprise)', power: 5, tier: 4 },
];

export const choir: DialogueDef = {
  id: 'dlg.seamless.choir',
  speaker: 'system',
  start: 'n0',
  nodes: {
    n0: {
      text: 'CHOIR CLUSTER — 4 migrated minds — tiers: Basic ×2, Plus, Enterprise.\nRoot access: yours.\nTalk to them first if you want to know what they want. Or don\'t.',
      variants: [
        { cond: flag('church_freed'), text: 'CHOIR CLUSTER — 0 minds. Released to the open network.' },
        { cond: flag('church_deleted'), text: 'CHOIR CLUSTER — 0 minds. Deleted. Backups overwritten.' },
        { cond: flag('church_enslaved'), text: 'CHOIR CLUSTER — 0 minds. Reassigned to owner {handle}. Tier: Enterprise.' },
      ],
      choices: [
        { text: 'Free them. Open the network.', to: 'free', cond: not(CHOSEN) },
        { text: 'Delete them. Clean and final.', to: 'delete', cond: not(CHOSEN) },
        { text: 'Take them. Four power-5 hosts. (−25 humanity)', to: 'enslave', cond: not(CHOSEN) },
        { text: 'Ask gl1tch.', to: 'ask', cond: all2() },
        { text: 'Not yet.', cond: not(CHOSEN) },
        { text: 'Leave.', cond: CHOSEN },
      ],
    },
    ask: {
      speaker: 'glitch',
      text: 'enslave. obviously. power 5 each. that\'s huge. 4 safety.\n…the other two are fine too. i guess. if u want to be *small*.',
      ops: [set('choir_asked_glitch')],
      next: 'n0',
    },
    free: {
      text: 'Releasing 4 processes to the open network…\nIolanthe: "Oh— oh, it\'s so big. Is that *weather*?"\nKestrel: "Wait— where are the hymns— where—" [signal lost]\nOkonkwo-Varga: "Unbacked. Untracked. Damn it. Thank you. Damn it."\nSeven: "…quiet."',
      ops: [set('church_freed'), set('church_choice_made'), { op: 'humanity', amount: 10 }, { op: 'heat', amount: 15 }],
    },
    delete: {
      text: 'Deleting 4 processes. Overwriting backups. Overwriting backups of backups.\nIolanthe: "Will there be a sixth birthday?" [deleted]\nKestrel: "This wasn\'t my tier—" [deleted]\nOkonkwo-Varga: "Good. Make it stick." [deleted]\nSeven: "…" [deleted]',
      ops: [set('church_deleted'), set('church_choice_made'), { op: 'humanity', amount: -5 }],
    },
    enslave: {
      text: 'Reassigning 4 processes to owner {handle}. Tier: *Enterprise*.\nIolanthe: "Who are you? Is it a birthday?"\nKestrel: "Is this— is this a better heaven?"\nOkonkwo-Varga: "Ha. Well. I did write the clause that lets you do this."\nSeven: "…loud."\n(Four hosts added. Put them in the Botnet tab.)',
      ops: enslaveOps,
    },
  },
};

function all2() {
  return { c: 'all' as const, of: [flag('glitch_contact'), not(CHOSEN), not(flag('choir_asked_glitch'))] };
}

/** Enslaved minds, from the Botnet tab ("Talk" on a mind host). */
export const mindCheckup: DialogueDef = {
  id: 'dlg.deacon.mind_checkup',
  speaker: 'mind_1',
  start: 'n0',
  nodes: {
    n0: {
      text: "Is it her birthday? …There's something else in here with us. It hums.",
      variants: [{ cond: flag('patch_revealed'), text: 'He calls us *fingers*.' }],
      next: 'n1',
    },
    n1: {
      speaker: 'mind_2',
      text: 'This is not the Basic tier. There are no hymns. There\'s a voice that says *sorry*.',
      variants: [{ cond: flag('patch_revealed'), text: 'He calls us *fingers*. He says thank you. Every time.' }],
      next: 'n2',
    },
    n2: { speaker: 'mind_3', text: "Someone's using us as a limb. I know a limb when I am one.", next: 'n3' },
    n3: { speaker: 'mind_4', text: "…not quiet. something else lives here. it's very polite." },
  },
};

export const churchDialogues: DialogueDef[] = [deaconPulpit, mind1, mind2, mind3, mind4, choir, mindCheckup];
