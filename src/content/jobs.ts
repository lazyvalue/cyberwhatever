// Fixer board jobs (docs/script/04-items-flavor.md §9). Owner: story agent.
// Descriptions are Auntie's pitches. Payout tiers: P1 ~150¤ … P5 ~5000¤.
// Most jobs auto-offer once their target's address is known; the KH job is offered by the story.
import type { Condition, JobDef, StoryOp } from '../engine/types.ts';
import { UNMASKED, flag, knows, all } from './story/lib.ts';

/** Auntie's sign-off on a paid job (02-dialogues: board job states). */
const paid = (extra: StoryOp[] = []): StoryOp[] => [
  ...extra,
  {
    op: 'if', cond: UNMASKED,
    then: [{ op: 'message', from: 'auntie', channel: 'dm', text: 'Engagement up 3%! Lovely work, kiddo.' }],
    else: [{ op: 'oneOf', options: [
      [{ op: 'message', from: 'auntie', channel: 'dm', text: 'Lovely.' }],
      [{ op: 'message', from: 'auntie', channel: 'dm', text: "You're my favourite." }],
      [{ op: 'message', from: 'auntie', channel: 'dm', text: 'Next!' }],
      [{ op: 'message', from: 'auntie', channel: 'dm', text: "Don't stop now." }],
      [{ op: 'message', from: 'auntie', channel: 'dm', text: "That's how we do it, kiddo." }],
    ] }],
  },
];

const offer = (system: string, extra?: Condition): Condition => (extra ? all(knows(system), extra) : knows(system));

export const jobs: JobDef[] = [
  {
    id: 'job.kh_happiness', title: 'Q3 Happiness Review', giver: 'auntie', target: 'khhappy',
    description: "Kurage-Halcyon's Happiness Division has a slide deck. A client wants it. It's in the Executive Share vault. Don't get cute in there.",
    objectives: [{ kind: 'deliver', file: 'file.khhappy.q3_happiness', text: 'Deliver the Q3 Happiness Review' }],
    reward: { credits: 600, xp: 150, ops: paid() },
  },
  {
    id: 'job.parkit_dirt', title: 'Dirt Merchant', giver: 'auntie', target: 'parkit', autoOffer: true, cond: offer('parkit'), minRep: 2,
    description: "Somebody on the council's dirty. Everybody is. The proof is in the Parking Authority archive. Bring it to me; I know a buyer.",
    objectives: [{ kind: 'deliver', file: 'file.parkit.councillor_dirt', text: "Deliver the councillor's file" }],
    reward: { credits: 400, xp: 90, ops: paid([{ op: 'message', from: 'auntie', channel: 'dm', text: "Sold. Buyer's a KH subsidiary. Don't think about it. Thinking's a hobby. Money's a lifestyle." }]) },
    heat: 5,
  },
  {
    id: 'job.crisp_liberation', title: 'Crisp Liberation', giver: 'auntie', target: 'vendnet', autoOffer: true, cond: offer('vendnet'),
    description: "Guy lost two credits in a vending machine years ago. He's never moved on. Free his crisps. Unit 0x1F.",
    objectives: [{ kind: 'use', system: 'vendnet', node: 'unit_0x1f', text: 'Free the crisps in unit 0x1F' }],
    reward: { credits: 120, xp: 40, ops: paid([{ op: 'message', from: 'auntie', channel: 'dm', text: '4,112 bags. The client wept. The machine wept. I wept, a little, at the invoice.' }]) },
  },
  {
    id: 'job.fry_day', title: 'Fry Day', giver: 'auntie', target: 'wok', autoOffer: true, cond: offer('wok'),
    description: "Dev at the noodle shop hasn't slept in a month. Do something about that fryer so he can. (The fryer may object.)",
    objectives: [{ kind: 'flag', flag: 'fryer_hacked', text: 'Deal with the FRY-9000' }],
    reward: { credits: 100, xp: 30, ops: paid() },
  },
  {
    id: 'job.wrong_number', title: 'Wrong Number', giver: 'auntie', target: 'bigbyte', autoOffer: true, cond: offer('bigbyte'),
    description: "A client owes BigByte nine thousand credits for a service they never got. Nobody ever gets it. Pull the debt record from billing.",
    objectives: [{ kind: 'deliver', file: 'file.bigbyte.client_debt', text: 'Deliver the debt record' }],
    reward: { credits: 300, xp: 70, ops: paid([{ op: 'message', from: 'auntie', channel: 'dm', text: "Funny thing. The client is the BigByte CEO's mother. She says thank you. He doesn't." }]) },
    heat: 5,
  },
  {
    id: 'job.throttle_up', title: 'Throttle Up', giver: 'auntie', target: 'bigbyte', autoOffer: true, cond: offer('bigbyte'),
    description: 'Kid on 12th has a tournament. Get into the throttle box at BigByte and unthrottle their house.',
    objectives: [{ kind: 'use', system: 'bigbyte', node: 'throttle', text: 'Open the throttle' }],
    reward: { credits: 250, xp: 60, ops: paid([{ op: 'message', from: 'auntie', channel: 'dm', text: 'The kid won. Second place. Lag-free second place. Still counts.' }]) },
  },
  {
    id: 'job.doorbell_diaries', title: 'Doorbell Diaries', giver: 'auntie', target: 'khhappy', autoOffer: true, cond: offer('khhappy'), minRep: 3,
    description: "Client wants footage from their KnockKnock Pro. Proves they weren't at a party. KH keeps every doorbell's footage in the Happiness survey store. Of course it does.",
    objectives: [{ kind: 'deliver', file: 'file.khhappy.doorbell_footage', text: 'Deliver the doorbell footage' }],
    reward: { credits: 350, xp: 80, ops: paid([{ op: 'message', from: 'auntie', channel: 'dm', text: 'Bad news: the footage shows they *were* at the party. Good news: they paid anyway. Great party, apparently.' }]) },
  },
  {
    id: 'job.tow_space_two', title: 'The Car in Space 2', giver: 'auntie', target: 'parkit', autoOffer: true, cond: offer('parkit'), minRep: 2,
    description: "Space 2 at the Parking Authority. Same car, forever. Client wants it gone. Nobody knows why it's scary. Use the tow dispatch.",
    objectives: [{ kind: 'use', system: 'parkit', node: 'tow', text: 'Tow the car in space 2' }],
    reward: { credits: 300, xp: 70, ops: paid() },
  },
  {
    id: 'job.proof_of_stake', title: 'Proof of Stake', giver: 'auntie', target: 'coinbasement', autoOffer: true, cond: offer('coinbasement', flag('act2_started')),
    description: 'Client wants $HODL up for one afternoon. Get into the Coinbasement matching engine and lean on it.',
    objectives: [{ kind: 'use', system: 'coinbasement', node: 'matching', text: 'Lean on the matching engine' }],
    reward: { credits: 700, xp: 120, ops: paid([{ op: 'coinPrice', mult: 1.2 }]) },
    heat: 10,
  },
  {
    id: 'job.organ_recall', title: 'Organ Recall', giver: 'auntie', target: 'chromebone', autoOffer: true, cond: offer('chromebone'),
    description: "Client wants their kidney back. Pull the sale record from Chrome & Bone so they can sue.",
    objectives: [{ kind: 'deliver', file: 'file.chromebone.sale_8812', text: 'Deliver sale record #8812' }],
    reward: { credits: 800, xp: 130, ops: paid([{ op: 'message', from: 'auntie', channel: 'dm', text: "Complication: the kidney's in someone else now. Someone famous. The lawsuit will be *fun*." }]) },
  },
  {
    id: 'job.applause_break', title: 'Applause Break', giver: 'auntie', target: 'karaoke', autoOffer: true, cond: offer('karaoke'),
    description: 'A singer at Neon Larynx needs a win. Rig the applause meter.',
    objectives: [{ kind: 'use', system: 'karaoke', node: 'applause', text: 'Rig the applause meter' }],
    reward: { credits: 500, xp: 90, ops: paid([{ op: 'if', cond: { c: 'not', of: flag('wraith_flatlined') }, then: [{ op: 'message', from: 'wraith', channel: 'bbs', text: 'who rigged the applause meter at neonlarynx. i was IN that contest. lamer.\n-xX_Wraith_Xx' }] }]) },
  },
  {
    id: 'job.lost_sheep', title: 'Lost Sheep', giver: 'auntie', target: 'seamless', autoOffer: true, cond: offer('seamless'),
    description: 'A churchgoer confessed something they regret. Get the confession before the Church sells it.',
    objectives: [{ kind: 'deliver', file: 'file.seamless.confession_0417', text: 'Deliver confession #0417' }],
    reward: { credits: 1200, xp: 160, ops: paid([{ op: 'message', from: 'deacon', channel: 'dm', text: 'You recovered my confession. Yes. Mine. It was about the ads. I sometimes skip them. Bless you. Invoice attached.' }]) },
  },
  {
    id: 'job.space_junk', title: 'Space Junk', giver: 'auntie', target: 'orbital', autoOffer: true, cond: offer('orbital'),
    description: 'First Orbital fined a client for leaving a bolt in orbit. Pull the fine from their ledger.',
    objectives: [{ kind: 'deliver', file: 'file.orbital.bolt_fine', text: 'Deliver the bolt fine' }],
    reward: { credits: 2500, xp: 220, ops: paid() },
  },
  {
    id: 'job.ghost_writer', title: 'Ghost Writer', giver: 'auntie', target: 'aegis', autoOffer: true, cond: offer('aegis'),
    description: 'A company needs an apology letter. Aegis has the best templates. They are guarded by black ICE. Of course apologies are lethal there.',
    objectives: [{ kind: 'deliver', file: 'file.aegis.apology_templates', text: 'Deliver the apology templates' }],
    reward: { credits: 3000, xp: 260, ops: paid() },
  },
];
