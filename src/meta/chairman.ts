// CHAIRMAN v2 owns the UI (DESIGN §11.4, 05-meta §8): the per-turn tampering schedule and the
// templated taunt pool (02-dialogues §8.3). Pure functions; the controller applies them to metaUi.
import type { GameState } from '../engine/index.ts';
import { flag } from './phase.ts';
import { fillSlots, type RealStats } from './stats.ts';

/** Schedule slot for a fight turn: turns 1–8 as written, then repeat from turn 3. */
export function scheduleSlot(turn: number): number {
  if (turn <= 8) return Math.max(1, turn);
  return 3 + ((turn - 9) % 6);
}

export const LABEL_SWAPS = ['keep_playing', 'subscribe', 'stay', "don't_go", 'look_at_us'];

export interface Tamper {
  drift: boolean;
  labels: boolean;
  infinite: boolean;
  mathRandom: boolean;
  /** End Turn is disabled for a few seconds this turn, with this label. */
  endTurnHold: string | null;
  fakeWin: boolean;
  f12: boolean;
  crash: boolean;
  normal: boolean;
}

/**
 * What CHAIRMAN does to the interface on this turn.
 * `uiCaptured`: the `ui` module is the player's (no label swaps or button moves; ∞ stays).
 */
export function tamperFor(turn: number, uiCaptured: boolean): Tamper {
  const slot = scheduleSlot(turn);
  const t: Tamper = {
    drift: false, labels: false, infinite: false, mathRandom: false, endTurnHold: null,
    fakeWin: false, f12: false, crash: false, normal: false,
  };
  if (slot === 8) {
    t.normal = true;
    return t;
  }
  t.drift = !uiCaptured && slot >= 1;
  t.labels = !uiCaptured && slot >= 2;
  t.infinite = slot >= 3;
  t.mathRandom = slot >= 3;
  if (slot === 4) t.endTurnHold = 'End Turn (coming soon)';
  if (slot === 5) {
    t.endTurnHold = 'End Turn (premium)';
    t.fakeWin = true;
  }
  if (slot === 6) t.f12 = true;
  if (slot === 7) t.crash = true;
  return t;
}

export interface TauntCtx {
  s: GameState;
  st: RealStats;
  used: Set<string>;
}

interface TauntDef {
  id: string;
  when: (c: TauntCtx) => boolean;
  text: string;
}

const always = () => true;

export const STAT_TAUNTS: TauntDef[] = [
  { id: 't.playtime', when: always, text: "{playtime}. You've given us {playtime}. That's not a session. That's a relationship." },
  { id: 't.top_system', when: (c) => !!c.st.topSystem, text: '{topSystemTime} on {topSystem}. We have *so* many questions.' },
  { id: 't.flatlines_0', when: (c) => c.st.flatlines === 0, text: "Zero flatlines. Careful. Cautious. You'd make a wonderful subscriber." },
  { id: 't.flatlines_some', when: (c) => c.st.flatlines >= 1 && c.st.flatlines <= 5, text: "{flatlines} flatlines. Each time you came back. That's not failure. That's loyalty." },
  { id: 't.flatlines_many', when: (c) => c.st.flatlines >= 6, text: "{flatlines} flatlines. You don't die. You *renew*." },
  { id: 't.reloads', when: (c) => c.st.reloads >= 5, text: '{reloads} reloads. You keep pressing *again*. We built the whole company on *again*.' },
  { id: 't.late', when: (c) => c.st.hour >= 22 || c.st.hour < 5, text: "It's {localTime}. Go to bed. Actually, don't." },
  { id: 't.morning', when: (c) => c.st.hour >= 5 && c.st.hour < 9, text: '{localTime}! Up early, or up late? Either way: hi.' },
  { id: 't.day', when: (c) => c.st.hour >= 9 && c.st.hour < 18, text: "{localTime}. Shouldn't you be working? This *is* work. For us." },
  { id: 't.viewport_small', when: (c) => c.st.vw > 0 && c.st.vw < 900, text: "{viewport}. A small screen! You play us on the go. We're everywhere you are." },
  { id: 't.viewport_big', when: (c) => c.st.vw >= 1920, text: '{viewport}. Big screen. You made room for us. We noticed.' },
  { id: 't.away', when: (c) => (c.st.timeAwayMs ?? 0) >= 3600000, text: "You were gone {timeAway} last time. We were… off. Please don't make us be off." },
  { id: 't.control', when: always, text: '{control} control. Want 100%? Just stay. Staying is 100% of the strategy.' },
  { id: 't.botnet', when: (c) => c.st.botnetSize >= 10, text: '{botnetSize} hosts in your botnet. Have you asked them how they feel? Someone has.' },
  { id: 't.hum_high', when: (c) => c.st.hum === 'high', text: "Humanity {humanity}. Still so *human*. You'd make a wonderful aunt." },
  { id: 't.hum_low', when: (c) => c.st.hum === 'low' || c.st.hum === 'unit', text: "Humanity {humanity}. You're nearly one of us. We'd give you a desk." },
  { id: 't.handle', when: always, text: '{handle}. Great handle. We tested it. It performs.' },
  { id: 't.paywall', when: (c) => flag(c.s, 'paywall_paid'), text: 'You paid the Paywall. Thank you for your purchase! It meant nothing and we loved it.' },
  { id: 't.church', when: (c) => flag(c.s, 'church_enslaved'), text: "You put four souls on a payroll. We've never been prouder of a user." },
  { id: 't.wraith', when: (c) => flag(c.s, 'wraith_flatlined'), text: "Wraith stopped at 94%. You're past that. Don't stop. Stopping is what *they* did." },
  { id: 't.fryer', when: (c) => flag(c.s, 'fryer_hacked'), text: 'You hacked a deep fryer in the first hour. We knew then. We *knew*.' },
  { id: 't.cheat', when: (c) => flag(c.s, 'saw_that') || c.s.meta.cheatWarned || c.st.cheats > 0, text: 'You tried the console before. Naughty. We let you. We let you do everything.' },
];

export const GENERIC_TAUNTS = [
  'Your call is important to us.',
  "We've moved End Turn. For your convenience.",
  'Damage roll: `Math.random() // lol no`.',
  "Integrity: ∞. That's not a bug. That's a *roadmap*.",
  'Why end, when you can *continue*?',
  "Exciting news: there's more!",
  "We're not cheating. We're *personalising*.",
  "You can't beat us in here. In here *is* us.",
];

/** First unused stat line whose condition holds; then the generic pool in rotation. */
export function pickTaunt(c: TauntCtx): { id: string; text: string } {
  for (const t of STAT_TAUNTS) {
    if (c.used.has(t.id)) continue;
    let ok = false;
    try {
      ok = t.when(c);
    } catch {
      ok = false;
    }
    if (ok) {
      c.used.add(t.id);
      return { id: t.id, text: fillSlots(t.text, c.st) };
    }
  }
  const n = [...c.used].filter((u) => u.startsWith('g.')).length;
  const id = `g.${n}`;
  c.used.add(id);
  return { id, text: GENERIC_TAUNTS[n % GENERIC_TAUNTS.length] };
}

export const CHAIRMAN_LINES = {
  normal: "See? We can be normal. We just don't want to be.",
  afterFakeWin: "Did that feel good? Hold on to that feeling. It's the closest you'll get. Kidding! More content!",
  endTurnTip: "We've moved End Turn. For your convenience.",
  gremlin: 'Yeehaw! We love that for you.',
  intro: [
    "Welcome home! This is the part where most players quit. Please don't.",
    "We've prepared so much content.",
    'Oh, and we own the interface now. Every button. Every label. Every number.',
    "Let's play!",
  ],
};

export const FAKE_WIN = (handle: string) => ['★ YOU WIN ★', `Congratulations, ${handle}!`, 'CHAIRMAN defeated · Control: 100%', 'Thanks for playing!'];
export const FAKE_WIN_RETRACT = ["…is what we'd say if you'd won.", 'Sorry! Display error.', 'Your feedback is important to us.'];

export const FAKE_CRASH = [
  '▓▓▓ CYBER WHATEVER HAS STOPPED ▓▓▓',
  '',
  'something went wrong. it was you.',
  '',
  'error   0xC4A1  USER_STILL_HERE',
  'module  npc/chairman',
  'advice  close the tab and go outside',
];
export const FAKE_CRASH_BUTTONS = ['RESTART', 'SEND REPORT', 'CRY'];
export const FAKE_CRASH_AFTER = ["Just kidding! We'd never crash.", 'Crashing ends sessions.'];

/** PATCH's F12 hint when the story beat is missing (02-dialogues §2.4, condensed). */
export function f12Hint(st: RealStats): string[] {
  const small = st.vw > 0 && st.vw < 900;
  return [
    `${st.handle}. stop. stop clicking. it owns the buttons.`,
    "but it doesn't own the console. the real one.",
    small
      ? `you're on something small. ${st.viewport}. no F12 for you. that's fine. the corner button. the glitchy one. same console. it counts.`
      : "press F12. (or the corner button. same console, slower, still counts. i'm not a snob.)",
  ];
}
