// Guide integrity: ids, status coverage, ICE coverage, links, wording rules. Owner: story agent.
import { describe, expect, it } from 'vitest';
import { GUIDE, GUIDE_ICE, GUIDE_STATUSES } from './guide.ts';
import { content } from './index.ts';
import { emptyIceStatus, emptyPlayerStatus } from '../engine/combat.ts';

const SECTIONS = [
  'basics', 'nodes', 'combat', 'shells', 'intents', 'signature', 'flow', 'statuses', 'combos', 'daemons',
  'botnet-combat', 'trace', 'failure', 'heat', 'botnet', 'money', 'deck', 'implants-humanity', 'rep-perks',
  'net', 'jobs', 'inbox', 'market', 'wallet', 'files', 'rep',
  'ice-field-guide', 'keys', 'glossary',
];

describe('guide', () => {
  it('has every required section, in order, with unique ids', () => {
    expect(GUIDE.map((s) => s.id)).toEqual(SECTIONS);
  });

  it('every section has a summary and content; related links resolve', () => {
    const ids = new Set(GUIDE.map((s) => s.id));
    for (const s of GUIDE) {
      expect(s.summary.length, s.id).toBeGreaterThan(0);
      expect(s.blocks.length, s.id).toBeGreaterThan(0);
      for (const r of s.related ?? []) expect(ids.has(r), `${s.id} -> ${r}`).toBe(true);
    }
  });

  it('every engine status has a guide row, and every guide status exists in the engine', () => {
    const ice = Object.keys(emptyIceStatus());
    const player = Object.keys(emptyPlayerStatus());
    const rows = (side: 'ice' | 'player') => GUIDE_STATUSES.filter((s) => s.side === side).map((s) => s.id);
    expect(new Set(rows('ice'))).toEqual(new Set(ice));
    expect(new Set(rows('player'))).toEqual(new Set(player));
  });

  it('auto status blocks have a note for every engine status', () => {
    const sec = GUIDE.find((s) => s.id === 'statuses')!;
    const autos = sec.blocks.filter((b) => b.kind === 'auto');
    const notes = (src: string) => Object.keys((autos.find((b) => b.kind === 'auto' && b.source === src) as { notes?: Record<string, string> }).notes ?? {});
    expect(new Set(notes('iceStatuses'))).toEqual(new Set(Object.keys(emptyIceStatus())));
    expect(new Set(notes('playerStatuses'))).toEqual(new Set(Object.keys(emptyPlayerStatus())));
  });

  it('every ICE in the field guide exists in the content registry', () => {
    for (const g of GUIDE_ICE) expect(content.ice[g.id], g.id).toBeDefined();
  });

  it('follows the wording rules and has no spoilers', () => {
    const text = JSON.stringify(GUIDE);
    expect(text).not.toMatch(/jack(ed|ing)? ?(in|out|into)/i);
    expect(text).not.toMatch(/CYBERWHATEVER/);
    expect(text).not.toMatch(/auntie|PATCH\b|CHAIRMAN|gl1tch|127\.0\.0\.1|localhost|meta console|Wraith/i);
  });
});
