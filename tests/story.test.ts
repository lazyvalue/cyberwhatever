import { describe, it, expect } from 'vitest';
import { MemoryStorage, createEngine, select, META_KEYS, BALANCE, type TriggerDef, type Content } from '../src/engine/index.ts';
import { act, reject, arenaContent, mkEngine, foes, types, cloneContent } from './helpers.ts';

function withTriggers(ts: TriggerDef[], base: Content = arenaContent([])): Content {
  base.triggers = [...base.triggers, ...ts];
  return base;
}
const lastMsg = (e: ReturnType<typeof mkEngine>) => e.state.messages.at(-1)?.text;

describe('story vocabulary', () => {
  it('match: array field contains, one-of list, numeric range; event fields interpolate', () => {
    const c = withTriggers([
      { id: 'contains', on: 'combat.started', match: { defs: 'sentry' }, ops: [{ op: 'flag', flag: 'saw_sentry' }] },
      { id: 'oneof', on: 'host.role', match: { role: ['mine', 'botnet', 'proxy'] }, ops: [{ op: 'flag', flag: 'first_role_set' }] },
      { id: 'range', on: 'session.resumed', match: { awayMinutes: { gte: 30 } }, once: false, ops: [{ op: 'message', from: 'system', text: 'You were gone {timeAway}. {handle}.' }] },
    ], arenaContent(['sentry']));
    const e = mkEngine(c);
    act(e, { type: 'debug/set', patch: { player: { hosts: [{ uid: 'h', name: 'h', power: 1, tier: 1, role: 'mine' }] } } });
    act(e, { type: 'botnet/setRole', host: 'h', role: 'idle' });
    expect(e.state.story.flags.first_role_set).toBeUndefined();
    act(e, { type: 'botnet/setRole', host: 'h', role: 'proxy' });
    expect(e.state.story.flags.first_role_set).toBe(true);
    act(e, { type: 'meta/session', awayMinutes: 10 });
    expect(e.state.messages).toHaveLength(0);
    act(e, { type: 'meta/session', awayMinutes: 200 });
    expect(lastMsg(e)).toBe('You were gone 3 hours. n00b.');
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/breach', node: 'gw' });
    expect(e.state.story.flags.saw_sentry).toBe(true);
  });

  it('repeatable triggers stop at max; random/oneOf ops; host.burned carries role and name', () => {
    const c = withTriggers([
      { id: 'ow', on: 'host.burned', match: { role: 'botnet' }, once: false, max: 2, ops: [{ op: 'message', from: 'glitch', text: 'ow. ({name})' }] },
    ]);
    c.programs.burner = { id: 'burner', name: 'burner', category: 'special', cost: 0, cooldown: 0, noise: 0, ram: 0, targeting: 'none', price: 0, ops: [{ op: 'story', ops: [{ op: 'burnHosts', count: 1 }] }], description: '' };
    c.systems.arena.nodes[0].ice = [{ ice: 'sentry' }];
    const e = mkEngine(c);
    const hosts = [1, 2, 3].map((i) => ({ uid: `h${i}`, name: `toaster${i}`, power: 1, tier: 1, role: 'botnet' }));
    act(e, { type: 'debug/set', patch: { player: { hosts, programs: { burner: { corrupted: false } }, loadout: ['crack', 'burner'] } } });
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/breach', node: 'gw' });
    for (let i = 0; i < 3; i++) act(e, { type: 'combat/program', program: 'burner' });
    expect(e.state.player.hosts).toHaveLength(0);
    expect(e.state.messages.filter((m) => m.text.startsWith('ow.'))).toHaveLength(2);
    expect(lastMsg(e)).toMatch(/^ow\. \(toaster\d\)$/);
  });

  it('mark + elapsed: timed beats in cycles', () => {
    const c = withTriggers([
      { id: 'mark', on: 'run.started', ops: [{ op: 'mark', flag: 'jacked_at' }] },
      { id: 'later', cond: { c: 'elapsed', flag: 'jacked_at', gte: 3 }, ops: [{ op: 'flag', flag: 'later' }] },
    ]);
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/probe', node: 'gw' });
    act(e, { type: 'run/loot', node: 'ds' });
    expect(e.state.story.flags.later).toBeUndefined();
    act(e, { type: 'run/probe', node: 'ds' });
    expect(e.state.story.flags.later).toBe(true);
  });

  it('objectives: add with {n}/{x}, update, auto-complete via doneWhen; objective condition', () => {
    const c = withTriggers([
      { id: 'add', on: 'run.started', ops: [{ op: 'objective', id: 'obj.main.arena', kind: 'main', text: 'Own the arena.', doneWhen: { c: 'owns', system: 'arena' } }] },
      { id: 'after', cond: { c: 'objective', id: 'obj.main.arena', status: 'done' }, ops: [{ op: 'flag', flag: 'arena_obj_done' }] },
    ]);
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(e.state.story.objectives['obj.main.arena']).toMatchObject({ status: 'active', kind: 'main' });
    act(e, { type: 'run/loot', node: 'ds' });
    const ev = act(e, { type: 'run/capture', node: 'core' });
    expect(ev.find((x) => x.type === 'objective')).toMatchObject({ id: 'obj.main.arena', status: 'done' });
    expect(e.state.story.flags.arena_obj_done).toBe(true);
    expect(select.objectivesView(e)[0]).toMatchObject({ id: 'obj.main.arena', status: 'done' });
  });

  it('hub.entered fires on return; state triggers can wait for "first hub visit after X"', () => {
    const c = withTriggers([
      { id: 'hub_after', cond: { c: 'all', of: [{ c: 'owns', system: 'arena' }, { c: 'mode', mode: 'hub' }] }, ops: [{ op: 'flag', flag: 'hub_after_owned' }] },
    ]);
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/loot', node: 'ds' });
    act(e, { type: 'run/capture', node: 'core' });
    expect(e.state.story.flags.hub_after_owned).toBeUndefined();
    const ev = act(e, { type: 'run/jackOut' });
    expect(types(ev)).toContain('hub.entered');
    expect(e.state.story.flags.hub_after_owned).toBe(true);
  });

  it('conditions: paydata, hostRole, sneakable, nodeRevealed', () => {
    const c = withTriggers([
      { id: 'core_seen', cond: { c: 'nodeRevealed', type: 'core' }, ops: [{ op: 'flag', flag: 'core_seen' }] },
      { id: 'holding', on: 'run.ended', match: { reason: 'jackout' }, cond: { c: 'paydata', file: 'arena-pd' }, ops: [{ op: 'flag', flag: 'held' }] },
      { id: 'sneak50', cond: { c: 'sneakable', gte: 40 }, ops: [{ op: 'flag', flag: 'can_sneak' }] },
    ], arenaContent(['parental']));
    const e = mkEngine(c);
    act(e, { type: 'debug/set', patch: { player: { hosts: [{ uid: 'h', name: 'fr', power: 1, tier: 1, role: 'mine', system: 'fridge' }] } } });
    expect(select.evalCond(e, { c: 'hostRole', system: 'fridge', role: 'mine' })).toBe(true);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(e.state.story.flags.can_sneak).toBe(true);
    act(e, { type: 'run/breach', node: 'gw' });
    for (let i = 0; i < 6 && e.state.combat; i++) {
      e.dispatch({ type: 'combat/program', program: 'spike', target: foes(e)[0].uid });
      if (e.state.combat) e.dispatch({ type: 'combat/endTurn' });
    }
    act(e, { type: 'run/loot', node: 'ds' });
    expect(e.state.story.flags.core_seen).toBe(true);
    act(e, { type: 'run/jackOut' });
    expect(e.state.story.flags.held).toBe(true);
  });

  it('combat story op with force-stun freezes a boss; metaCommand op runs console commands', () => {
    const c = withTriggers([
      { id: 'freeze', on: 'meta.root', match: { granted: true }, cond: { c: 'inCombat' }, ops: [{ op: 'combat', ops: [{ op: 'iceStatus', status: 'stunned', value: 999, to: 'allEnemies', force: true }] }] },
      { id: 'cmd', on: 'run.started', ops: [{ op: 'metaCommand', cmd: 'sudo', arg: 'wrong' }] },
    ], arenaContent(['headchef']));
    const e = mkEngine(c);
    const ev0 = act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(ev0.find((x) => x.type === 'meta.root')).toMatchObject({ granted: false });
    act(e, { type: 'run/breach', node: 'gw' });
    act(e, { type: 'meta/command', cmd: 'sudo', arg: e.state.meta.rootKey.join('-') });
    expect(foes(e)[0].status.stunned).toBe(999);
  });

  it('metaKey writes cross-save keys through the engine; cw.save* is refused', () => {
    const storage = new MemoryStorage();
    const c = withTriggers([{ id: 'wr', on: 'run.started', ops: [{ op: 'metaKey', key: 'cw.meta.wraith_gone', value: '1' }] }]);
    const e = createEngine({ content: c, storage, newGame: { seed: 1 } });
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(storage.getItem('cw.meta.wraith_gone')).toBe('1');
    const bad = withTriggers([{ id: 'bad', on: 'run.started', ops: [{ op: 'metaKey', key: 'cw.save', value: 'x' }] }]);
    const e2 = createEngine({ content: bad, storage: new MemoryStorage(), newGame: { seed: 1 } });
    expect(() => e2.dispatch({ type: 'hub/jackIn', system: 'arena' })).toThrow(/not allowed/);
  });

  it('flatline beats fire after the checkpoint reload (game.loaded through triggers)', () => {
    const storage = new MemoryStorage();
    const c = withTriggers([
      { id: 'first_flatline', cond: { c: 'stat', stat: 'flatlines', gte: 1 }, ops: [{ op: 'message', from: 'auntie', text: 'You died, kiddo. ({flatlines})' }] },
    ], arenaContent(['psychotrope']));
    const e = createEngine({ content: c, storage, newGame: { seed: 1 } });
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/breach', node: 'gw' });
    e.state.player.neural = 1;
    act(e, { type: 'combat/endTurn' });
    expect(e.state.mode).toBe('flatlined');
    e.loadCheckpoint();
    expect(lastMsg(e)).toBe('You died, kiddo. (1)');
    expect(storage.getItem(META_KEYS.flatlines)).toBe('1');
  });

  it('fragments, lore/read, shop.bought kind, stock kind file', () => {
    const c = withTriggers([
      { id: 'frag', on: 'meta.fragment', once: false, ops: [{ op: 'message', from: 'glitch', text: 'fragment {count}' }] },
      { id: 'read', on: 'lore.read', match: { file: 'whisper-you' }, ops: [{ op: 'flag', flag: 'read_you' }] },
    ]);
    c.vendors.broker = { ...c.vendors.broker, stock: [...c.vendors.broker.stock, { id: 'you', kind: 'file', price: 10, file: { id: 'whisper-you', name: 'you_v1.txt', kind: 'lore', text: 'you, in a file' } }] };
    const e = mkEngine(c);
    act(e, { type: 'meta/fragmentFound', index: 2 });
    act(e, { type: 'meta/fragmentFound', index: 2 });
    act(e, { type: 'meta/fragmentFound', index: 0 });
    expect(e.state.messages.map((m) => m.text)).toEqual(['fragment 1', 'fragment 2']);
    expect(select.evalCond(e, { c: 'stat', stat: 'fragments', gte: 2 })).toBe(true);
    expect(reject(e, { type: 'lore/read', file: 'whisper-you' })).toMatch(/do not have/);
    const ev = act(e, { type: 'shop/buy', vendor: 'broker', stock: 'you' });
    expect(ev.find((x) => x.type === 'shop.bought')).toMatchObject({ kind: 'file', ref: 'whisper-you' });
    act(e, { type: 'lore/read', file: 'whisper-you' });
    expect(e.state.story.flags.read_you).toBe(true);
  });

  it('DDoS gate: too little power emits gate.denied (not a rejection); gate items lower the threshold', () => {
    const c = cloneContent(arenaContent([]));
    c.systems.arena = { ...c.systems.arena, gate: { botnetPower: 10, items: [{ item: 'noc_badge', mult: 0.5 }] } };
    const e = mkEngine(c);
    const hosts = [1, 2, 3, 4, 5, 6].map((i) => ({ uid: `h${i}`, name: `h${i}`, power: 1, tier: 1, role: 'botnet' }));
    act(e, { type: 'debug/set', patch: { player: { hosts, hardware: { uplink: 2 } } } });
    const ev = act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(ev.find((x) => x.type === 'gate.denied')).toMatchObject({ power: 6, needed: 10 });
    expect(e.state.run).toBeNull();
    act(e, { type: 'debug/set', patch: { player: { items: ['noc_badge'] } } });
    const ev2 = act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(ev2.find((x) => x.type === 'gate.opened')).toMatchObject({ needed: 5 });
    expect(e.state.run!.charges).toBe(1);
  });

  it('console.gremlin: free, no signature, no Flow, logs yeehaw', () => {
    const c = arenaContent(['sentry']);
    const e = mkEngine(c);
    act(e, { type: 'debug/set', patch: { player: { programs: { gremlin: { corrupted: false } }, loadout: ['crack', 'gremlin'] } } });
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/breach', node: 'gw' });
    const ev = act(e, { type: 'combat/program', program: 'gremlin' });
    act(e, { type: 'combat/program', program: 'gremlin' });
    expect(e.state.combat!.cycles).toBe(3);
    expect(select.signature(e, 'gremlin').stacks).toBe(0);
    expect(e.state.combat!.categories).toEqual([]);
    expect(ev.some((x) => x.type === 'custom' && x.name === 'gremlin.yeehaw')).toBe(true);
  });
});

describe('pending cinematic state', () => {
  it('cinematic op sets state.cinematic, gates other actions, ui/cinematicDone clears it and chains', () => {
    const c = withTriggers([
      { id: 'c1', on: 'run.started', ops: [{ op: 'cinematic', id: 'deadmans.gameOver', data: { lines: ['GAME OVER'] } }] },
      { id: 'c2', on: 'cinematic.done', match: { id: 'deadmans.gameOver' }, ops: [{ op: 'cinematic', id: 'deadmans.fakeCredits' }] },
      { id: 'c3', on: 'cinematic.done', match: { id: 'deadmans.fakeCredits' }, ops: [{ op: 'flag', flag: 'tear_through' }] },
    ]);
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(e.state.cinematic).toEqual({ id: 'deadmans.gameOver', data: { lines: ['GAME OVER'] } });
    expect(reject(e, { type: 'run/jackOut' })).toMatch(/cinematic playing/);
    expect(select.legalActions(e)).toEqual([{ type: 'ui/cinematicDone', id: 'deadmans.gameOver' }]);
    act(e, { type: 'ui/cinematicDone', id: 'wrong' });
    expect(e.state.cinematic!.id).toBe('deadmans.gameOver');
    act(e, { type: 'ui/cinematicDone', id: 'deadmans.gameOver' });
    expect(e.state.cinematic!.id).toBe('deadmans.fakeCredits');
    act(e, { type: 'ui/cinematicDone', id: 'deadmans.fakeCredits' });
    expect(e.state.cinematic).toBeNull();
    expect(e.state.story.flags.tear_through).toBe(true);
    act(e, { type: 'run/jackOut' });
  });
});

describe('tutorial objectives (ui-builder)', () => {
  it('kind tutorial with anchor/speaker; ui/hintDone works in combat and dialogue, not during a cinematic; chains via objective event', () => {
    const c = withTriggers([
      { id: 't1', on: 'run.started', ops: [{ op: 'objective', id: 'tut.probe', kind: 'tutorial', text: 'Probe the gateway.', anchor: 'node@gw', speaker: 'auntie' }] },
      { id: 't2', on: 'objective', match: { id: 'tut.probe', status: 'done' }, ops: [{ op: 'objective', id: 'tut.load', kind: 'tutorial', text: 'Load the new program.', doneWhen: { c: 'flag', flag: 'loaded' } }] },
      { id: 't3', on: 'loadout.changed', match: { programs: 'worm' }, ops: [{ op: 'flag', flag: 'loaded' }] },
    ], arenaContent(['sentry']));
    c.dialogues.d = { id: 'd', speaker: 'auntie', start: 'a', nodes: { a: { text: 'hi', choices: [{ text: 'ok' }] } } };
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/breach', node: 'gw' });
    act(e, { type: 'debug/set', patch: { dialogue: { id: 'd', node: 'a' } } });
    expect(select.objectivesView(e)[0]).toMatchObject({ id: 'tut.probe', kind: 'tutorial', anchor: 'node@gw', speaker: 'auntie', status: 'active' });
    act(e, { type: 'ui/hintDone', id: 'tut.probe' }); // in combat AND during a dialogue
    expect(e.state.story.objectives['tut.probe'].status).toBe('done');
    expect(e.state.story.objectives['tut.load'].status).toBe('active');
    act(e, { type: 'debug/set', patch: { cinematic: { id: 'x' } } });
    expect(reject(e, { type: 'ui/hintDone', id: 'tut.load' })).toMatch(/cinematic/);
    act(e, { type: 'ui/cinematicDone', id: 'x' });
    act(e, { type: 'dialogue/choose', index: 0 });
    act(e, { type: 'combat/jackOut' });
    act(e, { type: 'debug/set', patch: { player: { programs: { worm: { corrupted: false } } } } });
    const ev = act(e, { type: 'loadout/set', programs: ['crack', 'spike', 'worm'] });
    expect(ev.find((x) => x.type === 'loadout.changed')).toMatchObject({ programs: ['crack', 'spike', 'worm'] });
    expect(e.state.story.objectives['tut.load'].status).toBe('done');
    expect(reject(e, { type: 'ui/hintDone', id: 'nope' })).toMatch(/no such tutorial/);
  });
});

describe('ui/log', () => {
  it('appends shown text in every mode: no events, no triggers, no cycles; capped; persisted in the save', () => {
    const storage = new MemoryStorage();
    const c = withTriggers([{ id: 'state', cond: { c: 'stat', stat: 'credits', gte: 0 }, once: false, ops: [{ op: 'incFlag', flag: 'n' }] }]);
    const e = createEngine({ content: c, storage, newGame: { seed: 1 } });
    const n0 = e.state.story.flags.n;
    let notified = 0;
    const seen: unknown[][] = [];
    e.subscribe((ev) => { notified++; seen.push(ev); });
    const ev = e.dispatch({ type: 'ui/log', lines: [{ text: 'Toast: hi', level: 'ui' }, { text: 'Auntie: kiddo.', level: 'story' }] });
    expect(ev).toEqual([]);
    expect(notified).toBe(1);
    expect(seen[0]).toEqual([]);
    expect(e.state.log.slice(-2)).toEqual([{ cycle: 0, level: 'ui', text: 'Toast: hi' }, { cycle: 0, level: 'story', text: 'Auntie: kiddo.' }]);
    expect(e.state.story.flags.n).toBe(n0);
    expect(e.state.cycle).toBe(0);
    // allowed while a cinematic is pending and when flatlined
    e.state.cinematic = { id: 'x' };
    e.state.mode = 'flatlined';
    e.dispatch({ type: 'ui/log', lines: [{ text: 'still logged', level: 'info' }] });
    expect(e.state.log.at(-1)!.text).toBe('still logged');
    e.state.cinematic = null;
    e.state.mode = 'hub';
    e.dispatch({ type: 'ui/log', lines: Array.from({ length: 600 }, (_, i) => ({ text: `l${i}`, level: 'ui' as const })) });
    expect(e.state.log).toHaveLength(BALANCE.logLimit);
    expect(e.state.log.at(-1)!.text).toBe('l599');
    expect(e.dispatch({ type: 'ui/log', lines: [{ text: 'x', level: 'nope' as never }] })[0]).toMatchObject({ type: 'action.rejected' });
    e.save();
    const e2 = createEngine({ content: c, storage });
    e2.load();
    expect(e2.state.log.at(-1)!.text).toBe('l599');
  });
});
