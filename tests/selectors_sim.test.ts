import { describe, it, expect } from 'vitest';
import { select } from '../src/engine/index.ts';
import { simulate } from '../src/sim/simulate.ts';
import { act, arenaFight, foes, dummy, content, liveContent } from './helpers.ts';

describe('selectors', () => {
  it('damagePreview matches the damage actually dealt (no spread when rigged)', () => {
    const e = arenaFight(['sentry'], { patch: { meta: { modules: { 'engine/rng': true } } } });
    const t = foes(e)[0];
    const [pv] = select.damagePreview(e, 'spike', t.uid);
    const ev = act(e, { type: 'combat/program', program: 'spike', target: t.uid });
    const dmg = ev.find((x) => x.type === 'combat.damage') as { shell: number; core: number };
    expect({ shell: dmg.shell, core: dmg.core }).toEqual(pv.max);
  });
  it('legalActions only lists actions canDo accepts, and dispatch accepts them', () => {
    const e = arenaFight(['sentry', 'cipher']);
    const legal = select.legalActions(e);
    expect(legal.some((a) => a.type === 'combat/endTurn')).toBe(true);
    for (const a of legal) expect(e.tryAction(a).ok).toBe(true);
  });
  it('canDo explains why not', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy')] });
    act(e, { type: 'combat/program', program: 'ping', target: foes(e)[0].uid });
    expect(select.canDo(e, { type: 'combat/program', program: 'ping', target: foes(e)[0].uid })).toEqual({ ok: false, reason: 'cooldown 1' });
    expect(select.canDo(e, { type: 'hub/jackIn', system: 'fridge' })).toMatchObject({ ok: false, reason: 'in combat' });
  });
  it('combatView exposes intents, flow, projected trace and program buttons', () => {
    const e = arenaFight(['sentry']);
    const v = select.combatView(e)!;
    expect(v.ice[0].intent).toMatchObject({ mapped: false, class: 'hostile', label: null });
    expect(v.programs.map((p) => p.id)).toEqual(['crack', 'spike', 'ping', 'firewall']);
    expect(v.flow).toMatchObject({ used: 0, needed: 3 });
    expect(v.projectedTrace.total).toBeGreaterThan(0);
  });
  it('humanity tiers drive HUD copy', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy')], patch: { player: { humanity: 15 } } });
    expect(select.humanityTier(e)).toBe('unit');
    expect(select.displayHandle(e)).toBe('UNIT');
  });
});

describe('sim', () => {
  it('the bot finishes the frozen slice (owned-all) on a few seeds', () => {
    const { summary } = simulate(content, { games: 3, seed: 100 });
    expect(summary.stuck).toEqual([]);
    expect(summary.reached).toBe(3);
  });
  it('the bot runs on the live content without crashing (goal is checked by npm run sim)', () => {
    const { results } = simulate(liveContent, { games: 1, seed: 100, maxRuns: 15 });
    expect(results).toHaveLength(1);
  });
});
