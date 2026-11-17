import { describe, it, expect } from 'vitest';
import { select, BALANCE, MemoryStorage, META_KEYS, createEngine } from '../src/engine/index.ts';
import { act, reject, arenaFight, arenaContent, mkEngine, foes, dummy, types, content, cloneContent, liveContent } from './helpers.ts';

describe('node approach (§5.3)', () => {
  it('probe costs a cycle, adds trace, reveals honeypots', () => {
    const e = mkEngine(arenaContent([]), 2);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    const ev = act(e, { type: 'run/probe', node: 'gw' });
    expect(e.state.cycle).toBe(1);
    expect(e.state.run!.trace).toBe(BALANCE.trace.probe);
    expect(ev.find((x) => x.type === 'node.probed')).toMatchObject({ honeypot: false });
  });
  it('only nodes adjacent to a cleared node are accessible', () => {
    const e = mkEngine(arenaContent(['sentry']), 2);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(select.isAccessible(e, 'gw')).toBe(true);
    expect(reject(e, { type: 'run/loot', node: 'ds' })).toMatch(/not discovered|adjacent/);
  });
  it('sneak success puts ICE to sleep: loot and pass, no capture', () => {
    const c = arenaContent(['sentry']);
    c.systems.arena.nodes[0].type = 'datastore';
    c.systems.arena.nodes[0].files = [{ id: 'gwf', name: 'f', kind: 'paydata', value: 5 }];
    c.systems.arena.nodes.push({ id: 'g0', type: 'gateway', name: 'g0', x: 0, y: 0, links: ['gw'] });
    const e = mkEngine(c, 2);
    act(e, { type: 'debug/set', patch: { meta: { modules: { 'engine/rng': true } } } }); // rigged: sneak always succeeds
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(select.sneakChance(e, 'gw')).toBe(100);
    act(e, { type: 'run/sneak', node: 'gw' });
    expect(e.state.run!.nodes.gw.state).toBe('asleep');
    act(e, { type: 'run/loot', node: 'gw' });
    expect(reject(e, { type: 'run/capture', node: 'gw' })).toMatch(/sneaked/);
    expect(select.isAccessible(e, 'ds')).toBe(true);
  });
  it('sneak failure: +10 trace and ambush (ICE acts first)', () => {
    const c = arenaContent(['sentry', 'sentry', 'sentry']);
    const e = mkEngine(c, 5);
    act(e, { type: 'debug/set', patch: { player: { hardware: { mask: 0 } } } });
    // perception 15*3 -> chance ~10; find a seed that fails
    let ev = e.dispatch({ type: 'run/sneak', node: 'gw' });
    act(e, { type: 'hub/jackIn', system: 'arena' });
    for (let seed = 1; seed < 50; seed++) {
      const f = mkEngine(c, seed);
      act(f, { type: 'hub/jackIn', system: 'arena' });
      ev = act(f, { type: 'run/sneak', node: 'gw' });
      const sn = ev.find((x) => x.type === 'node.sneak') as { success: boolean };
      if (!sn.success) {
        expect(ev.find((x) => x.type === 'combat.started')).toMatchObject({ ambush: true });
        expect(types(ev).indexOf('combat.playerHit')).toBeLessThan(types(ev).indexOf('combat.turnStart'));
        expect(f.state.run!.trace).toBeGreaterThanOrEqual(BALANCE.trace.sneakFail);
        return;
      }
    }
    throw new Error('no failing seed');
  });
  it('backdoor skips ICE with the right item; vault needs its key', () => {
    const e = mkEngine(content, 3);
    act(e, { type: 'debug/set', patch: { player: { items: ['fridge_pw'] }, dialogue: null } });
    act(e, { type: 'hub/jackIn', system: 'fridge' });
    act(e, { type: 'debug/set', patch: { run: { nodes: { gw: { state: 'cleared', ice: [] }, ds: { revealed: true } } } } });
    act(e, { type: 'run/loot', node: 'ds' });
    expect(e.state.player.items).toContain('fridge_pw');
    act(e, { type: 'run/backdoor', node: 'core' });
    expect(e.state.run!.nodes.core.state).toBe('cleared');
    act(e, { type: 'run/capture', node: 'core' });
    expect(e.state.world.systems.fridge.owned).toBe(true);
    expect(e.state.player.hosts).toHaveLength(1);
  });
  it('vault: locked until you hold the key; unlock then fight', () => {
    const c = arenaContent([], { extraNodes: [{ id: 'v', type: 'vault', name: 'v', x: 0, y: 0, links: ['gw'], lock: { item: 'noc_badge', label: 'NOC badge' }, ice: [{ ice: 'sentry' }] }] });
    const e = mkEngine(c, 2);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(reject(e, { type: 'run/breach', node: 'v' })).toMatch(/locked/);
    expect(reject(e, { type: 'run/unlock', node: 'v' })).toMatch(/NOC badge/);
    act(e, { type: 'debug/set', patch: { player: { items: ['noc_badge'] } } });
    act(e, { type: 'run/unlock', node: 'v' });
    expect(e.state.run!.nodes.v.state).toBe('hostile');
    act(e, { type: 'run/breach', node: 'v' });
    expect(e.state.combat).not.toBeNull();
  });
  it('capturing a Router reveals the map; netscan finds addresses and IoT hosts', () => {
    const e = mkEngine(content, 4);
    act(e, { type: 'debug/set', patch: { dialogue: null } });
    act(e, { type: 'debug/set', patch: { world: { addressBook: { bigbyte: { system: 'bigbyte', source: 't', cycle: 0, notes: [] } } } } });
    act(e, { type: 'hub/jackIn', system: 'bigbyte' });
    act(e, { type: 'debug/set', patch: { run: { nodes: { gw: { state: 'cleared', ice: [] }, rt1: { state: 'cleared', ice: [], revealed: true } } } } });
    act(e, { type: 'run/capture', node: 'rt1' });
    expect(Object.values(e.state.run!.nodes).every((n) => n.revealed)).toBe(true);
    const ev = act(e, { type: 'run/netscan', node: 'rt1' });
    const found = (ev.find((x) => x.type === 'netscan') as { found: string[] }).found;
    expect(found.length).toBe(2);
    expect(found.every((id) => e.state.world.procSystems[id]?.procedural)).toBe(true);
    expect(reject(e, { type: 'run/netscan', node: 'rt1' })).toMatch(/already/);
  });
  it('honeypot: looting spikes trace', () => {
    const e = mkEngine(content, 4);
    act(e, { type: 'debug/set', patch: { dialogue: null, world: { addressBook: { wok: { system: 'wok', source: 't', cycle: 0, notes: [] } } } } });
    act(e, { type: 'hub/jackIn', system: 'wok' });
    act(e, { type: 'debug/set', patch: { run: { nodes: { gw: { state: 'cleared', ice: [] }, rt: { state: 'cleared', ice: [], revealed: true }, hp: { revealed: true } } } } });
    const before = e.state.run!.trace;
    act(e, { type: 'run/loot', node: 'hp' });
    expect(e.state.run!.trace - before).toBeGreaterThanOrEqual(BALANCE.trace.honeypot);
  });
  it('capturing Core owns the system, makes a host and removes remaining ICE', () => {
    const e = mkEngine(arenaContent([]), 2);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/loot', node: 'ds' });
    const ev = act(e, { type: 'run/capture', node: 'core' });
    expect(types(ev)).toContain('system.owned');
    expect(select.botnetView(e).hosts[0]).toMatchObject({ name: 'arena.test', power: 1 });
    act(e, { type: 'run/jackOut' });
    expect(e.state.player.paydata.map((p) => p.file)).toEqual(['arena-pd']);
  });
});

describe('trace (§5.4)', () => {
  it('per-turn gain = base + security + noise - mask - proxies, and the UI projection matches', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 200 })], security: 3 });
    act(e, { type: 'combat/program', program: 'crack', target: foes(e)[0].uid });
    const proj = select.projectedTrace(e);
    expect(proj.formula).toBe(BALANCE.trace.turnBase + 3 + 1);
    const before = e.state.run!.trace;
    act(e, { type: 'combat/endTurn' });
    expect(e.state.run!.trace - before).toBe(proj.formula);
  });
  it('Suspicious (33+): ICE +1 shell level', () => {
    const e = arenaFight(['sentry']);
    const s = foes(e)[0];
    const max = s.shell.max;
    e.state.run!.trace = 32;
    act(e, { type: 'combat/endTurn' });
    expect(s.shell.max).toBe(max + BALANCE.ice.perLevelShell);
  });
  it('Alarm (66+): a hunter joins after 2 turns and vaults seal', () => {
    const c = arenaContent(['dummy'], { ice: [dummy('dummy', { core: 500 })], extraNodes: [{ id: 'v', type: 'vault', name: 'v', x: 0, y: 0, links: ['gw'], lock: { item: 'noc_badge', label: 'badge' } }] });
    const e = mkEngine(c, 1);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/breach', node: 'gw' });
    e.state.run!.trace = 64;
    const ev = act(e, { type: 'combat/endTurn' });
    expect(types(ev)).toContain('node.sealed');
    expect(e.state.run!.nodes.v.sealed).toBe(true);
    act(e, { type: 'combat/endTurn' });
    expect(foes(e).some((i) => i.def === 'hunter')).toBe(true);
  });
  it('Traced (100): ejected, haul lost, +25 heat, 20% fine, system hardened, a host burned', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 500 })], patch: { player: { credits: 1000, hosts: [{ uid: 'h1', name: 'h', power: 1, tier: 1, role: 'idle' }] } } });
    e.state.run!.haul.push({ uid: 'x', file: 'f', name: 'f', value: 10, encrypted: 0, tagged: false, system: 'arena' });
    e.state.run!.trace = 99;
    const ev = act(e, { type: 'combat/endTurn' });
    expect(types(ev)).toContain('player.traced');
    expect(e.state.mode).toBe('hub');
    expect(e.state.player.paydata).toHaveLength(0);
    expect(e.state.player.credits).toBe(800);
    expect(e.state.player.heat).toBeCloseTo(25, 0);
    expect(e.state.world.systems.arena.hardenedUntil).toBe(e.state.cycle + BALANCE.failure.hardenCycles);
    expect(e.state.player.hosts).toHaveLength(0);
    // hardened: ICE +1 level next run
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(e.state.run!.nodes.gw.ice[0].level).toBe(2);
  });
});

describe('failure (§7)', () => {
  it('Dumped: ejected, haul lost, a loaded program corrupted, +10 heat; repair costs credits', () => {
    const e = arenaFight(['killer'], { patch: { player: { credits: 500 } } });
    e.state.player.integrity = 1;
    e.state.run!.haul.push({ uid: 'x', file: 'f', name: 'f', value: 10, encrypted: 0, tagged: false, system: 'arena' });
    act(e, { type: 'combat/endTurn' });
    const ev = act(e, { type: 'combat/endTurn' });
    expect(types(ev)).toContain('player.dumped');
    expect(e.state.mode).toBe('hub');
    expect(e.state.player.paydata).toHaveLength(0);
    const corrupted = Object.entries(e.state.player.programs).filter(([, v]) => v.corrupted).map(([k]) => k);
    expect(corrupted).toHaveLength(1);
    expect(e.state.player.loadout).not.toContain(corrupted[0]);
    expect(e.state.player.heat).toBeCloseTo(10, 0);
    act(e, { type: 'program/repair', program: corrupted[0] });
    expect(e.state.player.programs[corrupted[0]].corrupted).toBe(false);
    expect(e.state.player.credits).toBe(500 - select.repairCost(e, corrupted[0]));
  });
  it('Mnemonic Buffer keeps paydata when dumped', () => {
    const e = arenaFight(['killer'], { patch: { player: { implants: ['mnemonic_buffer'] } } });
    e.state.player.integrity = 1;
    e.state.run!.haul.push({ uid: 'x', file: 'f', name: 'f', value: 10, encrypted: 0, tagged: false, system: 'arena' });
    act(e, { type: 'combat/endTurn' });
    act(e, { type: 'combat/endTurn' });
    expect(e.state.player.paydata).toHaveLength(1);
  });
  it('Flatlined: neural 0 from black ICE; counter persists outside the save across checkpoint reloads', () => {
    const storage = new MemoryStorage();
    const c = arenaContent(['psychotrope']);
    const e = createEngine({ content: c, storage, newGame: { seed: 1 } });
    act(e, { type: 'hub/jackIn', system: 'arena' }); // checkpoint saved here
    act(e, { type: 'run/breach', node: 'gw' });
    e.state.player.neural = 1;
    const ev = act(e, { type: 'combat/endTurn' });
    expect(types(ev)).toContain('player.flatlined');
    expect(e.state.mode).toBe('flatlined');
    expect(storage.getItem(META_KEYS.flatlines)).toBe('1');
    expect(reject(e, { type: 'hub/jackIn', system: 'arena' })).toMatch(/flatlined/);
    expect(e.loadCheckpoint()).toBe(true);
    expect(e.state.mode).toBe('hub');
    expect(e.state.player.flatlinesTotal).toBe(1);
    expect(storage.getItem(META_KEYS.flatlines)).toBe('1');
    expect(e.meta().reloads).toBe(1);
    // new game keeps the cross-save counter
    e.newGame({ seed: 9 });
    expect(e.state.player.flatlinesTotal).toBe(1);
  });
  it('Psychotrope scrambles UI labels (readable status)', () => {
    const e = arenaFight(['psychotrope']);
    act(e, { type: 'combat/endTurn' });
    expect(select.labelsScrambled(e)).toBe(true);
  });
});

describe('heat (§8)', () => {
  it('thresholds emit events; Noticed runs start at 10 trace', () => {
    const e = mkEngine(arenaContent([]), 1);
    const ev = act(e, { type: 'debug/set', patch: { player: { heat: 24 } } });
    expect(ev).toBeTruthy();
    act(e, { type: 'debug/set', patch: { player: { heat: 30 } } });
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(e.state.run!.trace).toBe(BALANCE.trace.noticedStart);
  });
  it('Hunted: a hunter ICE appears in every system', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { heat: 55 } } });
    act(e, { type: 'hub/jackIn', system: 'arena' });
    const all = Object.values(e.state.run!.nodes).flatMap((n) => n.ice.map((i) => i.def));
    expect(all).toContain('hunter');
  });
  it('Burned: shops +25% and owned systems get reclaimed (patched +1)', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { heat: 80, credits: 10000 } } });
    const st = select.vendorStock(e, 'hardware').find((x) => x.id === 'hw:cpu1')!;
    expect(st.price).toBe(Math.round(250 * 1.25));
    // own fridge, then burn cycles until a reclaim happens
    act(e, { type: 'debug/set', patch: { world: { systems: { fridge: { owned: true, patch: 0, hardenedUntil: 0, revealed: [], looted: [], used: [], netscanned: [], runs: 0 } } }, player: { hosts: [{ uid: 'hf', name: 'fridge.local', power: 1, tier: 1, role: 'mine', system: 'fridge' }] } } });
    act(e, { type: 'hub/jackIn', system: 'arena' });
    for (let i = 0; i < 40 && e.state.world.systems.fridge.owned; i++) {
      e.state.player.heat = 90;
      act(e, { type: 'run/probe', node: i % 2 ? 'gw' : 'gw' }).length;
      e.state.run!.nodes.gw.probed = false;
      e.state.run!.trace = 0;
      e.state.cycle += 49;
    }
    expect(e.state.world.systems.fridge.owned).toBe(false);
    expect(e.state.world.systems.fridge.patch).toBe(1);
    expect(e.state.player.hosts).toHaveLength(0);
  });
  it('Raid at 100: forced home fight; losing costs a hardware tier and 30% credits; heat resets to 50', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { credits: 1000, hardware: { cpu: 1, ram: 0, firewall: 0, chassis: 0, mask: 0, uplink: 0, storage: 0, neural: 0 } } } });
    const ev = act(e, { type: 'debug/set', patch: { player: { heat: 100 } } });
    expect(types(ev)).toContain('raid.started');
    expect(e.state.combat!.context).toBe('raid');
    expect(reject(e, { type: 'combat/jackOut' })).toMatch(/nowhere/);
    e.state.player.integrity = 1;
    const ev2 = act(e, { type: 'combat/endTurn' });
    expect(ev2.find((x) => x.type === 'raid.ended')).toMatchObject({ won: false, lostPart: 'cpu', lostCredits: 300 });
    expect(e.state.player.hardware.cpu).toBe(0);
    expect(e.state.player.credits).toBe(700);
    expect(e.state.player.heat).toBe(50);
    expect(e.state.combat).toBeNull();
  });
  it('Raid won: heat resets to 50, nothing lost', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { heat: 100 } } });
    for (const i of foes(e)) { i.core = 1; i.shell.points = 0; }
    for (const i of foes(e)) if (e.state.combat) act(e, { type: 'combat/program', program: 'crack', target: i.uid });
    expect(e.state.combat).toBeNull();
    expect(e.state.player.heat).toBe(50);
    expect(e.state.stats.raidsWon).toBe(1);
  });
  it('proxy hosts reduce heat gains', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { hosts: [{ uid: 'h', name: 'h', power: 4, tier: 1, role: 'proxy' }], paydata: [{ uid: 'p', file: 'f', name: 'f', value: 10, encrypted: 0, tagged: true, system: 'x' }] } } });
    act(e, { type: 'paydata/sell', uid: 'p' });
    expect(e.state.player.heat).toBeCloseTo(BALANCE.heat.taggedSaleHeat * (1 - 4 * BALANCE.heat.proxyHeatPerPower), 5);
  });
});

describe('reinforcement of story-locked failure', () => {
  it('scriptedFailure systems emit events but skip penalties', () => {
    const c = cloneContent();
    const e = arenaFight(['dummy'], { base: c, scriptedFailure: true, ice: [dummy('dummy', { core: 500 })], patch: { player: { credits: 1000 } } });
    e.state.run!.trace = 99;
    const ev = act(e, { type: 'combat/endTurn' });
    expect(ev.find((x) => x.type === 'run.ended')).toMatchObject({ reason: 'scripted' });
    expect(e.state.player.credits).toBe(1000);
    expect(e.state.player.heat).toBe(0);
  });
});

describe('lost haul respawns', () => {
  it('paydata lost to Dumped/Traced can be looted again next run; kept paydata cannot', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 500 })] });
    act(e, { type: 'combat/disengage' });
    act(e, { type: 'debug/set', patch: { run: { nodes: { gw: { state: 'cleared', ice: [] }, ds: { revealed: true } } } } });
    act(e, { type: 'run/loot', node: 'ds' });
    expect(e.state.world.systems.arena.looted).toContain('arena-pd');
    e.state.run!.trace = 99.9;
    act(e, { type: 'run/probe', node: 'ds' }); // +2 trace -> traced
    expect(e.state.player.paydata).toHaveLength(0);
    expect(e.state.world.systems.arena.looted).not.toContain('arena-pd');
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'debug/set', patch: { run: { nodes: { gw: { state: 'cleared', ice: [] }, ds: { revealed: true } } } } });
    act(e, { type: 'run/loot', node: 'ds' });
    act(e, { type: 'run/jackOut' });
    expect(e.state.player.paydata.map((p) => p.file)).toEqual(['arena-pd']);
    expect(e.state.world.systems.arena.looted).toContain('arena-pd');
  });
});

describe('open (ICE-less, unreached) nodes', () => {
  it('are passed through automatically: acting beyond them enters each one (1 cycle, no trace) with one log line', () => {
    const e = mkEngine(arenaContent([]));
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(e.state.run!.nodes.gw.state).toBe('cleared');
    expect(e.state.run!.nodes.ds.state).toBe('open');
    expect(select.isAccessible(e, 'core')).toBe(true); // reachable through the open ds
    expect(e.state.run!.nodes.core.revealed).toBe(true);
    expect(select.legalActions(e).some((a) => a.type === 'run/enter')).toBe(false);
    const ev = act(e, { type: 'run/capture', node: 'core' });
    expect(ev.filter((x) => x.type === 'node.cleared').map((x) => (x as { node: string }).node)).toEqual(['ds', 'core']);
    expect(e.state.run!.nodes.ds.state).toBe('cleared');
    expect(e.state.log.some((l) => l.text === 'You pass through ds.')).toBe(true);
    expect(e.state.cycle).toBe(2); // 1 for passing ds + 1 for the capture
    expect(e.state.run!.trace).toBeLessThanOrEqual(BALANCE.trace.nodeAction); // passing adds none (core capture halves the rest)
    expect(e.state.world.systems.arena.owned).toBe(true);
  });
  it('a node behind ICE is not reachable; open nodes never shortcut past ICE', () => {
    const e = mkEngine(arenaContent(['sentry']));
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(select.isAccessible(e, 'ds')).toBe(false);
    expect(reject(e, { type: 'run/loot', node: 'ds' })).toMatch(/not discovered|adjacent/);
  });
  it('run/enter still works for old scripts; probing an open node does not enter it', () => {
    const e = mkEngine(arenaContent([]));
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/probe', node: 'ds' });
    expect(e.state.run!.nodes.ds.state).toBe('open');
    act(e, { type: 'run/enter', node: 'ds' });
    expect(e.state.run!.nodes.ds.state).toBe('cleared');
    expect(reject(e, { type: 'run/enter', node: 'ds' })).toMatch(/nothing to enter/);
  });
});

describe('failure snowball guards', () => {
  it('burns pick IoT/procedural hosts first; a story-system host burns only when nothing else is eligible', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 500 })], patch: { player: { credits: 100 } } });
    act(e, { type: 'debug/set', patch: {
      world: { systems: { fridge: { owned: true, patch: 0, hardenedUntil: 0, revealed: [], looted: [], used: [], netscanned: [], runs: 0 } },
        procSystems: { 'iot-1': { ...e.content.systems.fridge, id: 'iot-1', procedural: true } } },
      player: { hosts: [{ uid: 'hs', name: 'fridge.local', power: 1, tier: 1, role: 'botnet', system: 'fridge' }, { uid: 'hi', name: 'toaster', power: 1, tier: 1, role: 'botnet', system: 'iot-1' }] },
    } as never });
    e.state.run!.trace = 99;
    act(e, { type: 'combat/endTurn' }); // traced: one host burns
    expect(e.state.player.hosts.map((h) => h.uid)).toEqual(['hs']);
    expect(e.state.world.systems.fridge.owned).toBe(true);
  });
});

describe('reveal through empty nodes (live content)', () => {
  function expectedFrontier(e: ReturnType<typeof mkEngine>) {
    const run = e.state.run!;
    const sys = (e.content.systems[run.system])!;
    const adj: Record<string, string[]> = {};
    for (const n of sys.nodes) adj[n.id] ??= [];
    for (const n of sys.nodes) for (const l of n.links) { adj[n.id].push(l); (adj[l] ??= []).push(n.id); }
    const passable = (id: string) => ['cleared', 'captured', 'asleep'].includes(run.nodes[id].state);
    const seen = new Set(Object.keys(run.nodes).filter(passable));
    const queue = [...seen];
    while (queue.length) {
      const u = queue.shift()!;
      for (const v of adj[u]) if (!seen.has(v) && run.nodes[v].state === 'open') { seen.add(v); queue.push(v); }
    }
    return new Set([...seen].flatMap((u) => adj[u]));
  }
  it('every node next to a reachable empty node is revealed and selectable, transitively, stopping at ICE; survives a reload', () => {
    const c = cloneContent(liveContent);
    for (const s of Object.values(c.systems)) { delete s.lock; delete s.gate; }
    const ids = Object.keys(c.systems).filter((id) => id !== c.setup.localhost);
    expect(ids).toContain('wok');
    let checked = 0;
    for (const id of ids) {
      const e = mkEngine(c, 3);
      act(e, { type: 'debug/set', patch: { dialogue: null, cinematic: null, world: { addressBook: { [id]: { system: id, source: 't', cycle: 0, notes: [] } } } } });
      const ok = e.dispatch({ type: 'hub/jackIn', system: id });
      if (ok.some((x) => x.type === 'action.rejected')) continue;
      if (e.state.cinematic || e.state.dialogue) act(e, { type: 'debug/set', patch: { cinematic: null, dialogue: null } });
      const sys = c.systems[id];
      const gw = sys.nodes.find((n) => n.type === 'gateway')!.id;
      act(e, { type: 'debug/set', patch: { run: { nodes: { [gw]: { state: 'cleared', ice: [] } } } } });
      e.dispatch({ type: 'run/probe', node: gw }); // any node action refreshes reveals
      if (!e.state.run) continue;
      for (const n of expectedFrontier(e)) {
        expect(e.state.run.nodes[n].revealed, `${id}/${n} revealed`).toBe(true);
        expect(select.isAccessible(e, n), `${id}/${n} selectable`).toBe(true);
      }
      // reload mid-run: same reveals, same reachability
      const e2 = createEngine({ content: c, state: e.state });
      for (const n of expectedFrontier(e2)) expect(select.isAccessible(e2, n), `${id}/${n} after reload`).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(ids.length - 2);
  });
});
