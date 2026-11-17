// Boss fight lines, one per combat turn (02-dialogues §7.2, §7.3, §8.3, §2.7). Owner: story agent.
// Shown as combat notify style 'taunt'. Text may hold meta placeholders ({playtime}, {localTime},
// {viewport}, {timeAway}, {topSystem}, {topSystemTime}, {reloads}, {botnetSize}, {humanity}) that the
// meta layer fills at render time; {handle}/{flatlines}/{control} are filled there too.
import type { Condition, StoryOp, TriggerDef } from '../../engine/types.ts';
import { all, elapsed, flag, HUM_HIGH, HUM_COLD, HUM_UNIT, mark, set, stat, taunt } from './lib.ts';

const fighting = (who: string): Condition => all({ c: 'inCombat' }, flag('fight', who));
const FREE_SLOT = elapsed('taunt_mark', 1);

/** Track which boss fight is on (cleared when any fight ends). */
const tracking: TriggerDef[] = [
  { id: 'taunt.track.board', on: 'combat.started', match: { defs: 'ice.board' }, once: false, priority: 50, ops: [set('fight', 'board')] },
  { id: 'taunt.track.chairman1', on: 'combat.started', match: { defs: 'ice.chairman_v1' }, once: false, priority: 50, ops: [set('fight', 'chairman1')] },
  { id: 'taunt.track.chairman2', on: 'combat.started', match: { context: 'finale' }, once: false, priority: 50, ops: [set('fight', 'chairman2')] },
  { id: 'taunt.track.patch', on: 'combat.started', match: { context: 'patch' }, once: false, priority: 50, ops: [set('fight', 'patch')] },
  { id: 'taunt.track.end', on: 'combat.ended', once: false, priority: 50, ops: [set('fight', '')] },
];

/** Ordered one-shot lines: the first whose cond holds fires on a turn; the rest wait. */
function ordered(prefix: string, who: string, speaker: string, lines: { text: string; cond?: Condition }[], base: number): TriggerDef[] {
  return lines.map((l, i) => ({
    id: `${prefix}.${i}`,
    on: 'combat.turnStart',
    cond: all(fighting(who), FREE_SLOT, ...(l.cond ? [l.cond] : [])),
    priority: base - i,
    ops: [mark('taunt_mark'), taunt(speaker, l.text)],
  }));
}

/** Repeating fallback pool once the ordered lines are used or blocked. */
function pool(id: string, who: string, speaker: string, lines: string[], base: number): TriggerDef {
  return {
    id,
    on: 'combat.turnStart',
    cond: all(fighting(who), FREE_SLOT),
    once: false,
    priority: base,
    ops: [mark('taunt_mark'), { op: 'oneOf', options: lines.map((t): StoryOp[] => [taunt(speaker, t)]) }],
  };
}

// --- The Board (Hydra) -------------------------------------------------------------------------
const board = [
  ...ordered('taunt.board', 'board', 'THE BOARD', [
    { text: "SYNERGY: Let's circle back to you dying." },
    { text: "SHAREHOLDER FEELINGS: Shareholders are feeling… threatened. That's valid." },
    { text: 'FORWARD-LOOKING: Results may vary. Yours will not.' },
    { text: 'SUNSETTING: Have you considered transitioning to an exciting new role? Outside the building? Dead?' },
    { text: 'SYNERGY: Per my last email, you should not be here.' },
    { text: 'FORWARD-LOOKING: Average session length is up 400%. The sessions are *players*. Sorry. Customers. I misspoke.' },
    { text: 'SHAREHOLDER FEELINGS: We are a family here. Families have quarterly targets.' },
  ], 20),
  pool('taunt.board.pool', 'board', 'THE BOARD', [
    'ACTING SYNERGY: I\'ve been promoted! Due to a vacancy. In me.',
    'ACTING FEELINGS: I\'ve only just started and I already feel fired.',
    'ACTING SUNSETTING: I\'ll be your point of contact for this transition.',
    'INTERIM INTERIM FORWARD-LOOKING: I can\'t comment on that.',
    "Let's take this offline.",
    "Sorry, you're on mute. Forever.",
  ], 0),
];
const boardSplit: TriggerDef = {
  id: 'taunt.board.split',
  on: 'combat.iceSpawned',
  match: { reason: 'split' },
  cond: fighting('board'),
  once: false,
  ops: [{ op: 'oneOf', options: [
    [taunt('THE BOARD', "ACTING SYNERGY: I've been promoted! Due to a vacancy. In me.")],
    [taunt('THE BOARD', "ACTING FEELINGS: I've only just started and I already feel fired.")],
    [taunt('THE BOARD', "ACTING SUNSETTING: I'll be your point of contact for this transition.")],
    [taunt('THE BOARD', "INTERIM INTERIM FORWARD-LOOKING: I can't comment on that.")],
  ] }],
};

// --- CHAIRMAN v1 --------------------------------------------------------------------------------
const chairman1 = [
  ...ordered('taunt.chairman1', 'chairman1', 'CHAIRMAN', [
    { text: "We're not angry. We're never angry. Anger is churn." },
    { text: 'Every hit you land is logged as *engagement*. Keep it up!' },
    { text: 'You know you can\'t win here, right? You can only *keep going*. We love keep going.' },
    { text: "You're very efficient now. Less person, more process. We relate!", cond: HUM_COLD },
    { text: "Four souls in your botnet! You'd be great in Enterprise sales.", cond: flag('church_enslaved') },
    { text: "You freed the choir. Very on-brand for a protagonist. We'll A/B test that.", cond: flag('church_freed') },
  ], 20),
  pool('taunt.chairman1.pool', 'chairman1', 'CHAIRMAN', ['Your call is important to us.', 'Exciting news: there\'s more of us!', 'We\'re not angry. Anger is churn.'], 0),
];

// --- CHAIRMAN v2 (finale) — stat lines first, then the generic pool ------------------------------
const chairman2 = [
  ...ordered('taunt.chairman2', 'chairman2', 'CHAIRMAN', [
    { text: "{playtime}. You've given us {playtime}. That's not a session. That's a relationship." },
    { text: '{topSystemTime} on {topSystem}. We have *so* many questions.' },
    { text: "Zero flatlines. Careful. Cautious. You'd make a wonderful subscriber.", cond: stat('flatlines', undefined, 0) },
    { text: "{flatlines} flatlines. Each time you came back. That's not failure. That's loyalty.", cond: stat('flatlines', 1, 5) },
    { text: "{flatlines} flatlines. You don't die. You *renew*.", cond: stat('flatlines', 6) },
    { text: '{reloads} reloads. You keep pressing *again*. We built the whole company on *again*.' },
    { text: "It's {localTime}. Go to bed. Actually, don't." },
    { text: '{viewport}. You made room for us on your screen. We noticed.' },
    { text: "You were gone {timeAway} last time. We were… off. Please don't make us be off." },
    { text: '{control}% control. Want 100%? Just stay. Staying is 100% of the strategy.' },
    { text: '{botnetSize} hosts in your botnet. Have you asked them how they feel? Someone has.', cond: stat('botnetHosts', 10) },
    { text: "Humanity {humanity}. Still so *human*. You'd make a wonderful aunt.", cond: HUM_HIGH },
    { text: "Humanity {humanity}. You're nearly one of us. We'd give you a desk.", cond: HUM_COLD },
    { text: '{handle}. Great handle. We tested it. It performs.' },
    { text: 'You paid the Paywall. Thank you for your purchase! It meant nothing and we loved it.', cond: flag('paywall_paid') },
    { text: "You put four souls on a payroll. We've never been prouder of a user.", cond: flag('church_enslaved') },
    { text: "Wraith stopped at 94%. You're past that. Don't stop. Stopping is what *they* did.", cond: flag('wraith_flatlined') },
    { text: 'You hacked a deep fryer in the first hour. We knew then. We *knew*.', cond: flag('fryer_hacked') },
    { text: 'You tried the console before. Naughty. We let you. We let you do everything.', cond: flag('saw_that') },
    { text: "You bought the Second Stomach. Zero utility. Pure engagement. We've never loved anyone more.", cond: flag('second_stomach') },
  ], 40),
  pool('taunt.chairman2.pool', 'chairman2', 'CHAIRMAN', [
    'Your call is important to us.',
    "We've moved End Turn. For your convenience.",
    'Damage roll: `Math.random() // lol no`.',
    "Integrity: ∞. That's not a bug. That's a *roadmap*.",
    'Why end, when you can *continue*?',
    "Exciting news: there's more!",
    "We're not cheating. We're *personalising*.",
    "You can't beat us in here. In here *is* us.",
  ], 0),
];

// --- PATCH's botnet ------------------------------------------------------------------------------
const patch = [
  ...ordered('taunt.patch', 'patch', 'PATCH', [
    { text: 'You know these hands. You gave me these hands.' },
    { text: 'That was the fridge. It liked you. I\'m wearing it.', cond: owns2('fridge') },
    { text: 'The deep fryer. You overclocked it yourself. Remember that, when it hits you.', cond: flag('fryer_overclocked') },
    { text: "The minds from the Church. They don't want to fight you. They don't get a vote. You took it.", cond: flag('church_enslaved') },
    { text: '{botnetSize} hosts. You could have mined with them. You could have hidden with them. You gave them to me.' },
    { text: 'Proxies and miners stayed with you. Funny. The ones you trusted least were the ones that were really yours.' },
    { text: "You're barely in there either. We're both just processes now. Fight like one.", cond: HUM_UNIT },
    { text: 'You brought the toy. I gave you the toy. That\'s almost sweet.', cond: { c: 'program', program: 'prog.console_gremlin' } },
    { text: "I'd have closed the tab behind me. Politely." },
  ], 20),
  pool('taunt.patch.pool', 'patch', 'PATCH', ['Ow. (Related.)', 'Thank you for the body.', 'Get out of the chair.'], 0),
];
const patchMinds: TriggerDef[] = [
  { text: "IOLANTHE: I'm sorry, sweetheart. I'm sorry. It's not my hand." },
  { text: 'KESTREL: This is not heaven. Tell the Deacon this is not heaven.' },
  { text: "OKONKWO-VARGA: I designed the tiers. I deserve this. You don't." },
  { text: 'SEVEN: …loud. loud. loud.' },
  { text: 'THE FRIDGE: sorry. it\'s not me. 3°C.' },
].map((l, i) => ({
  id: `taunt.patch.voice.${i}`,
  on: 'combat.turnStart' as const,
  cond: all(fighting('patch'), i < 4 ? flag('church_enslaved') : owns2('fridge'), elapsed('voice_mark', 1)),
  priority: 10 - i,
  ops: [mark('voice_mark'), { op: 'combat' as const, ops: [{ op: 'notify' as const, text: l.text, style: 'taunt' }] }],
}));

function owns2(system: string): Condition {
  return { c: 'owns', system };
}

// CHAIRMAN v2's per-turn lines (incl. the stat lines) are driven by the meta layer with its UI tampering; `chairman2`
// stays here as the reference copy of 02-dialogues §8.3 but is not registered.
void chairman2;
export const taunts: TriggerDef[] = [...tracking, ...board, boardSplit, ...chairman1, ...patch, ...patchMinds];
