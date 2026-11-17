// Small pure helpers for authoring system files. Owner: content agent.
import type { FileDef, StoryOp } from '../../engine/types.ts';

/** ICE spawn spec with an optional level override. */
export const I = (ice: string, level?: number): { ice: string; level?: number } => (level === undefined ? { ice } : { ice, level });

export const lore = (id: string, name: string, text: string, onTake?: StoryOp[]): FileDef =>
  ({ id, name, kind: 'lore', text, ...(onTake ? { onTake } : {}) });

export const pay = (id: string, name: string, value: number, o: { tagged?: boolean; encrypted?: number; note?: string } = {}): FileDef => ({
  id, name, kind: 'paydata', value,
  ...(o.tagged ? { tagged: true } : {}),
  ...(o.encrypted ? { encrypted: o.encrypted } : {}),
  ...(o.note ? { onTake: [{ op: 'log', level: 'story', text: `${name}: ${o.note}` }] } : {}),
});

export const addr = (id: string, name: string, system: string, note?: string): FileDef =>
  ({ id, name, kind: 'address', system, ...(note ? { onTake: [{ op: 'log', level: 'story', text: `${name}: ${note}` }] } : {}) });

export const key = (id: string, name: string, item: string, note?: string): FileDef =>
  ({ id, name, kind: 'item', item, ...(note ? { onTake: [{ op: 'log', level: 'story', text: `${name}: ${note}` }] } : {}) });

export const prog = (id: string, name: string, program: string, note?: string): FileDef =>
  ({ id, name, kind: 'program', program, ...(note ? { onTake: [{ op: 'log', level: 'story', text: `${name}: ${note}` }] } : {}) });

export const coin = (id: string, name: string, amount: number): FileDef => ({ id, name, kind: 'coin', amount });

/** Flavor line for an IO node. */
export const say = (text: string): StoryOp => ({ op: 'log', level: 'story', text });
