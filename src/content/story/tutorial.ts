// The fridge tutorial: one explicit step at a time, Auntie talking a kid through it. Owner: story agent.
// Each step is a `tutorial` objective (ui-builder shows it in a persistent coach panel with an anchor).
// A step is done by its event trigger, by its doneWhen state, or by the player's "Got it" (ui/hintDone).
// The next step starts when the previous one is done. Exactly one step is active at a time.
import type { Condition, GameEventType, MatchValue, StoryOp, TriggerDef } from '../../engine/types.ts';

interface Step {
  id: string;
  text: string;
  anchor?: string;
  /** event that completes the step */
  on?: GameEventType;
  match?: Record<string, MatchValue>;
  /** count the event only while this step is the active one (repeatable fight actions) */
  activeOnly?: boolean;
  /** more matches for the same event (any one completes the step) */
  alsoMatch?: Record<string, MatchValue>[];
  /** state that completes the step (checked by the engine every action) */
  doneWhen?: Condition;
}

const STEPS: Step[] = [
  {
    id: 'tut.dial_in',
    text: "Net tab. Pick fridge.local. Hit Dial in.\nThat's how you get inside a box. Your neighbour's box. Don't overthink it.",
    anchor: 'jack-in', on: 'run.started', match: { system: 'fridge' },
  },
  {
    id: 'tut.probe',
    text: "You're in. The blobs are nodes. You start at the gateway: the front door.\nClick it, then Probe. Probing shows what's guarding it. One cycle, a pinch of trace.",
    anchor: 'node-probe@gateway', on: 'node.probed',
  },
  {
    id: 'tut.breach',
    text: "That thing is ICE. Security software with opinions.\nHit Breach to fight it. You can't walk past it. Well. You can. Later.",
    anchor: 'node-breach@gateway', on: 'combat.started',
  },
  // one fight, gateway: shells + program, intent, end turn, kill
  {
    id: 'tut.shells',
    text: "See the bar on top of the ICE? That's its shell. Crypt or wall.\nCrack eats crypt, spike eats wall. Lockpick is crack, crowbar is spike.\nThis one's crypt: click lockpick, then click the ICE.",
    anchor: 'program-prog.lockpick', on: 'combat.program',
  },
  {
    id: 'tut.end_turn',
    text: 'Out of cycles? End turn. Space works too.\nThe ICE takes its go, then you get fresh cycles. Polite, in a violent way.',
    anchor: 'end-turn', on: 'combat.turnStart', match: { turn: { gte: 2 } },
  },
  {
    id: 'tut.intent',
    text: "Watch the badge over the ICE: it's what it does next. It tells you. ICE is honest like that.\nIf it's about to hit you, umbrella is your shield. Cheap. Use it.",
    anchor: 'ice-intent', on: 'combat.turnStart', match: { turn: { gte: 3 } },
  },
  {
    id: 'tut.kill',
    text: "Empty its core bar and it's gone. Shell first, then core. Keep hitting.",
    anchor: 'ice-core', on: 'combat.iceDefeated',
  },
  {
    id: 'tut.loot',
    text: 'Datastores hold files. Click the Shopping List Cache, then Loot.\nPaydata sells. Some files are addresses, passwords or gossip. Gossip is free.',
    anchor: 'node-loot@shopping', on: 'node.looted',
  },
  // next fights (crisper / parental / core): signature, flow, trace
  {
    id: 'tut.signature',
    activeOnly: true,
    text: "Next fight, notice this: use the same program twice and the ICE learns it.\nThe little number on the button is how much. Each stack hits softer.\nSkip it for a turn and the ICE forgets. Mix it up.",
    anchor: 'program-last', on: 'combat.program', match: { stacks: { gte: 2 } },
  },
  {
    id: 'tut.flow',
    activeOnly: true,
    text: "Three kinds of program in one turn is Flow: attack, exploit, defense.\nPeek, then lockpick or crowbar, then umbrella. Free cycle next turn, less trace.",
    anchor: 'flow', on: 'combat.flow', match: { earned: true },
  },
  {
    id: 'tut.trace',
    activeOnly: true,
    text: "The meter with the ring around it is trace. Fights and probes add to it.\nIf it fills, they find your actual apartment. Hang up before then. Don't be a hero.",
    anchor: 'trace', on: 'trace.changed', match: { value: { gte: 20 } },
  },
  {
    id: 'tut.capture',
    text: "The core is the box's brain. Clear its ICE, then Capture.\nThen the fridge is yours. Legally, no. Practically, yes.",
    anchor: 'node-capture@core', on: 'system.owned', match: { system: 'fridge' },
  },
  {
    id: 'tut.hang_up',
    text: "Done. Hang up. It's free when you're not fighting, and you keep what you grabbed.\nGet dumped or traced instead and you keep nothing. So: hang up.",
    anchor: 'jack-out', on: 'run.ended',
  },
  {
    id: 'tut.role',
    text: 'Botnet tab. The fridge is a host now. Give it a job.\nMine makes coin. Botnet helps you in fights. Proxy hides you. Pick one. Change it whenever.',
    anchor: 'hub-botnet', doneWhen: { c: 'flag', flag: 'first_role_set' },
  },
  {
    id: 'tut.sell',
    text: 'Market tab, the fence: Sell all. Paydata turns into credits there.\nTagged files bring a little heat. Sell them anyway. You are very poor.',
    anchor: 'sell-all', on: 'paydata.sold',
  },
  {
    id: 'tut.buy',
    text: "Market, ratking's bin. Buy a program. keysmash is cheap: it makes ICE wobbly.\nI sent you fifty for the fridge. Spend it on this, not snacks.",
    anchor: 'hub-market', on: 'shop.bought',
  },
  {
    id: 'tut.load',
    text: "Deck tab. Your RAM fits four programs and you have four. Unload one, Load the new one.\nWhat's loaded is what you can use in a fight. What isn't, isn't.",
    // complete on loading a newly bought program, not on the Unload click
    anchor: 'hub-deck', on: 'loadout.changed', match: { programs: 'prog.keysmash' },
    alsoMatch: ['prog.cutout', 'prog.wiggler', 'prog.bucket', 'prog.duct_tape', 'prog.moustache', 'prog.needles', 'prog.mop'].map((p) => ({ programs: p })),
  },
  {
    id: 'tut.next',
    text: "There's a new number in the Net tab: wokthisway.biz. Noodle shop. Real money.\nThat's the tour, kiddo. The rest you learn by losing. Stay in the loop.",
    anchor: 'jack-in', on: 'run.started', match: { system: 'wok' },
  },
  {
    id: 'tut.guide',
    text: "The ? up top is the guide. Everything I said is in there, plus the bits I skipped.\nRead it when something makes no sense. Something will.",
    anchor: 'guide-open',
  },
];

const seenFlag = (id: string) => `${id}.seen`;

function startOps(s: Step): StoryOp[] {
  const done: Condition[] = [];
  if (s.on) done.push({ c: 'flag', flag: seenFlag(s.id) });
  if (s.doneWhen) done.push(s.doneWhen);
  const op: StoryOp = { op: 'objective', id: s.id, kind: 'tutorial', text: s.text, speaker: 'auntie' };
  if (s.anchor) op.anchor = s.anchor;
  if (done.length) op.doneWhen = done.length === 1 ? done[0] : { c: 'any', of: done };
  return [op];
}

/**
 * Each event-completed step also records a "seen" flag whenever its event happens, even before the step is shown,
 * so a player who runs ahead of the tutorial never gets stuck on a step for something already done.
 */
function build(): TriggerDef[] {
  const out: TriggerDef[] = [];
  STEPS.forEach((s, i) => {
    out.push(i === 0
      ? { id: `tutorial.${s.id}.start`, on: 'game.started', cond: { c: 'not', of: { c: 'endless' } }, priority: -50, ops: startOps(s) }
      : { id: `tutorial.${s.id}.start`, on: 'objective', match: { id: STEPS[i - 1].id, status: 'done' }, ops: startOps(s) });
    if (s.on) {
      const t: TriggerDef = { id: `tutorial.${s.id}.seen`, on: s.on, ops: [{ op: 'flag', flag: seenFlag(s.id) }] };
      if (s.activeOnly) {
        t.cond = { c: 'objective', id: s.id, status: 'active' };
        t.once = false;
      }
      if (s.match) t.match = s.match;
      out.push(t);
      (s.alsoMatch ?? []).forEach((m, j) => out.push({ id: `tutorial.${s.id}.seen${j + 2}`, on: s.on!, match: m, ops: [{ op: 'flag', flag: seenFlag(s.id) }] }));
    }
  });
  return out;
}

export const tutorial: TriggerDef[] = build();
