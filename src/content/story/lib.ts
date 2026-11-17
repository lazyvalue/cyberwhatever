// Small pure helpers for authoring story beats and dialogue. Owner: story agent.
//
// Channel conventions the UI relies on (agreed with ui-builder / meta-layer):
// - message channel 'dm'  : hub inbox DM.
// - message channel 'bbs' : public Dead Drop post (from = poster npc id).
// - message subject 'comms': in-run speech line; show it over the map while dialed in (it is also in the inbox).
// - log level 'engine'    : the fourth-wall "[engine] warn: ..." lines.
// - custom event 'toast'  : { text } short HUD notice.
// - combat notify style 'taunt': a boss/NPC line during a fight ("SPEAKER: text"). Text may hold
//   meta placeholders ({playtime}, {localTime}, ...) that the meta layer fills at render time.
// - cinematic 'card.*'    : full-screen title card, data { lines: string[] }.
import type { Condition, FlagValue, StoryOp, TriggerDef } from '../../engine/types.ts';

export const flag = (f: string, is?: FlagValue): Condition => (is === undefined ? { c: 'flag', flag: f } : { c: 'flag', flag: f, is });
export const not = (of: Condition): Condition => ({ c: 'not', of });
export const all = (...of: Condition[]): Condition => ({ c: 'all', of });
export const any = (...of: Condition[]): Condition => ({ c: 'any', of });
export const owns = (system: string): Condition => ({ c: 'owns', system });
export const knows = (system: string): Condition => ({ c: 'knows', system });
export const hasItem = (item: string): Condition => ({ c: 'item', item });
export const stat = (s: Extract<Condition, { c: 'stat' }>['stat'], gte?: number, lte?: number): Condition => {
  const out: Extract<Condition, { c: 'stat' }> = { c: 'stat', stat: s };
  if (gte !== undefined) out.gte = gte;
  if (lte !== undefined) out.lte = lte;
  return out;
};
export const elapsed = (f: string, gte: number): Condition => ({ c: 'elapsed', flag: f, gte });
export const inHub: Condition = { c: 'mode', mode: 'hub' };

// Humanity bands (00-bible §0.4)
export const HUM_HIGH = stat('humanity', 70);
export const HUM_MID = stat('humanity', 40, 69);
export const HUM_LOW = stat('humanity', 20, 39);
export const HUM_UNIT = stat('humanity', undefined, 19);
export const HUM_COLD = stat('humanity', undefined, 39);
// Heat bands
export const HEAT_NOTICED = stat('heat', 25, 49.999);
export const HEAT_HUNTED = stat('heat', 50, 74.999);
export const HEAT_BURNED = stat('heat', 75);
// Acts
export const ACT2 = flag('act2_started');
export const ACT3 = flag('act3_started');
export const ACT1_ONLY = not(ACT2);
export const ACT2_ONLY = all(ACT2, not(ACT3));
export const PATCH = flag('patch_revealed');
export const UNMASKED = flag('auntie_unmasked');

export const set = (f: string, value?: FlagValue): StoryOp => (value === undefined ? { op: 'flag', flag: f } : { op: 'flag', flag: f, value });
export const mark = (f: string): StoryOp => ({ op: 'mark', flag: f });
export const dm = (from: string, text: string, subject?: string): StoryOp =>
  (subject ? { op: 'message', from, text, channel: 'dm', subject } : { op: 'message', from, text, channel: 'dm' });
export const bbs = (from: string, text: string): StoryOp => ({ op: 'message', from, text, channel: 'bbs' });
export const comms = (from: string, text: string): StoryOp => ({ op: 'message', from, text, channel: 'dm', subject: 'comms' });
export const engineLog = (text: string): StoryOp => ({ op: 'log', level: 'engine', text });
export const sysLog = (text: string): StoryOp => ({ op: 'log', level: 'info', text });
export const toast = (text: string): StoryOp => ({ op: 'event', name: 'toast', data: { text } });
export const card = (id: string, lines: string[]): StoryOp => ({ op: 'cinematic', id: `card.${id}`, data: { lines } });
export const taunt = (who: string, text: string): StoryOp => ({ op: 'combat', ops: [{ op: 'notify', text: `${who}: ${text}`, style: 'taunt' }] });
export const address = (system: string, source = 'story', note?: string): StoryOp =>
  (note ? { op: 'address', system, source, note } : { op: 'address', system, source });
export const dialogue = (id: string): StoryOp => ({ op: 'dialogue', dialogue: id });

/** Main objective. Also mirrors the text into string flag `objective` (the UI's top-bar hint). */
export const mainObj = (id: string, text: string, doneWhen?: Condition): StoryOp => ({
  op: 'if', cond: { c: 'all', of: [] },
  then: [
    doneWhen ? { op: 'objective', id, kind: 'main', text, doneWhen } : { op: 'objective', id, kind: 'main', text },
    { op: 'flag', flag: 'objective', value: text },
  ],
});
export const sideObj = (id: string, text: string, doneWhen?: Condition): StoryOp =>
  (doneWhen ? { op: 'objective', id, kind: 'side', text, doneWhen } : { op: 'objective', id, kind: 'side', text });
export const objDone = (id: string): StoryOp => ({ op: 'objective', id, status: 'done' });

export const when = (cond: Condition, then: StoryOp[], otherwise?: StoryOp[]): StoryOp =>
  (otherwise ? { op: 'if', cond, then, else: otherwise } : { op: 'if', cond, then });

/** Objective `n/x` counters are not needed for text; keep ids stable (01-beats §A). */
export type Beat = TriggerDef;

/**
 * One-shot posts/lines released at most one per `gap` cycles, on `on` events, earliest first.
 * Each element is its own once-trigger; priority keeps the order; the shared mark spaces them out.
 * An element whose cond never holds is simply skipped (it does not block the rest).
 * The mark flag must be set once at game start (see act1 boot).
 */
export function drip(prefix: string, markFlag: string, gap: number, items: { cond?: Condition; ops: StoryOp[] }[], on: TriggerDef['on'] = 'hub.entered'): TriggerDef[] {
  return items.map((it, i) => {
    const conds: Condition[] = [elapsed(markFlag, gap)];
    if (it.cond) conds.push(it.cond);
    return {
      id: `${prefix}.${i}`,
      on,
      cond: conds.length === 1 ? conds[0] : all(...conds),
      ops: [mark(markFlag), ...it.ops],
      priority: -10 - i,
    };
  });
}
