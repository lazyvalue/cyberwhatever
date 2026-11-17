import { describe, it, expect } from 'vitest';
import { select, BALANCE, MemoryStorage, SAVE_KEYS, META_KEYS, createEngine, validateContent, serialize, SaveError } from '../src/engine/index.ts';
import { rand, seedFrom } from '../src/engine/rng.ts';
import { act, reject, arenaFight, arenaContent, mkEngine, foes, types, content, liveContent, cloneContent } from './helpers.ts';

describe('RNG determinism', () => {
  it('same seed, same sequence; state is a single number', () => {
    const a = { rng: seedFrom('abc') };
    const b = { rng: seedFrom('abc') };
    const xs = Array.from({ length: 5 }, () => rand(a));
    expect(Array.from({ length: 5 }, () => rand(b))).toEqual(xs);
    expect(typeof a.rng).toBe('number');
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('two engines with the same seed and actions end in identical states', () => {
    const run = () => {
      const e = arenaFight(['sentry', 'cipher'], { seed: 42 });
      for (let i = 0; i < 6 && e.state.combat; i++) {
        const f = foes(e)[0];
        e.dispatch({ type: 'combat/program', program: 'spike', target: f.uid });
        e.dispatch({ type: 'combat/endTurn' });
      }
      return serialize(e.state);
    };
    expect(run()).toEqual(run());
  });
});

describe('economy (§9)', () => {
  it('$HODL price walk is deterministic, bounded, updates every 10 cycles', () => {
    const walk = (seed: number) => {
      const e = mkEngine(arenaContent([]), seed);
      act(e, { type: 'hub/jackIn', system: 'arena' });
      for (let i = 0; i < 300; i++) {
        e.state.run!.nodes.gw.probed = false;
        e.state.run!.trace = 0;
        act(e, { type: 'run/probe', node: 'gw' });
      }
      return e.state.world.coinHistory.slice();
    };
    const h1 = walk(7);
    expect(walk(7)).toEqual(h1);
    expect(walk(8)).not.toEqual(h1);
    expect(h1.length).toBe(Math.min(BALANCE.economy.historyLength, 1 + 30));
    expect(h1.every((p) => p >= BALANCE.economy.priceMin && p <= BALANCE.economy.priceMax)).toBe(true);
  });
  it('mining hosts make coin per cycle; selling coin pays the current price', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { hosts: [{ uid: 'h', name: 'h', power: 5, tier: 1, role: 'mine' }] } } });
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/probe', node: 'gw' });
    expect(e.state.player.coin).toBeCloseTo(5 * BALANCE.economy.coinPerPowerPerCycle, 6);
    act(e, { type: 'run/jackOut' });
    const price = e.state.world.coinPrice;
    const before = e.state.player.credits;
    const coin = e.state.player.coin;
    act(e, { type: 'coin/sell', amount: coin });
    expect(e.state.player.credits - before).toBe(Math.round(coin * price));
    expect(e.state.player.coin).toBe(0);
  });
  it('nothing passes in the hub', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { credits: 5000 } } });
    act(e, { type: 'shop/buy', vendor: 'hardware', stock: 'hw:cpu1' });
    expect(e.state.cycle).toBe(0);
    expect(e.state.player.hardware.cpu).toBe(1);
  });
  it('paydata: encrypted sells at 25% until decrypted; tagged adds heat unless cleaned', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { credits: 1000, paydata: [
      { uid: 'a', file: 'a', name: 'a', value: 100, encrypted: 1, tagged: false, system: 'x' },
      { uid: 'b', file: 'b', name: 'b', value: 100, encrypted: 0, tagged: true, system: 'x' },
      { uid: 'c', file: 'c', name: 'c', value: 100, encrypted: 0, tagged: true, system: 'x' },
    ] } } });
    expect(reject(e, { type: 'paydata/decrypt', uid: 'a' })).toMatch(/decrypt program/);
    expect(select.paydataView(e)[0].saleValue).toBe(25);
    act(e, { type: 'shop/buy', vendor: 'warez', stock: 'prog:decrypt' });
    act(e, { type: 'paydata/decrypt', uid: 'a' });
    act(e, { type: 'paydata/clean', uid: 'b' });
    const c0 = e.state.player.credits;
    act(e, { type: 'paydata/sellAll' });
    expect(e.state.player.credits - c0).toBe(300);
    expect(e.state.player.heat).toBeCloseTo(BALANCE.heat.taggedSaleHeat, 5);
  });
  it('vendors: rep gates, sequential hardware tiers, once-only stock, implants cost humanity', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { credits: 5000 } } });
    expect(reject(e, { type: 'shop/buy', vendor: 'hardware', stock: 'hw:cpu2' })).toMatch(/rep|tier/);
    expect(reject(e, { type: 'shop/buy', vendor: 'broker', stock: 'addr_bigbyte' })).toMatch(/rep 2/);
    act(e, { type: 'shop/buy', vendor: 'broker', stock: 'stats' });
    expect(reject(e, { type: 'shop/buy', vendor: 'broker', stock: 'stats' })).toMatch(/sold out/);
    act(e, { type: 'shop/buy', vendor: 'clinic', stock: 'imp:mnemonic_buffer' });
    expect(e.state.player.humanity).toBe(90);
    act(e, { type: 'shop/buy', vendor: 'clinic', stock: 'imp:second_stomach' });
    expect(e.state.player.humanity).toBe(95);
  });
  it('loadout respects RAM and corruption', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { programs: { worm: { corrupted: false }, fuzz: { corrupted: true } } } } });
    expect(reject(e, { type: 'loadout/add', program: 'worm' })).toMatch(/RAM/);
    act(e, { type: 'loadout/remove', program: 'firewall' });
    act(e, { type: 'loadout/add', program: 'worm' });
    expect(reject(e, { type: 'loadout/set', programs: ['fuzz'] })).toMatch(/corrupted/);
  });
  it('exchange pump/dump needs the exchange system and has a cooldown', () => {
    const c = cloneContent();
    c.systems.coinbasement = { ...c.systems.fridge, id: 'coinbasement', address: 'coinbasement.exchange' };
    const e = mkEngine(c, 1);
    act(e, { type: 'debug/set', patch: { dialogue: null } });
    expect(reject(e, { type: 'exchange/pump' })).toMatch(/do not own/);
    act(e, { type: 'debug/set', patch: { world: { systems: { coinbasement: { owned: true, patch: 0, hardenedUntil: 0, revealed: [], looted: [], used: [], netscanned: [], runs: 0 } } } } });
    const p = e.state.world.coinPrice;
    act(e, { type: 'exchange/pump' });
    expect(e.state.world.coinPrice).toBeCloseTo(p * BALANCE.economy.pumpMult, 1);
    expect(reject(e, { type: 'exchange/dump' })).toMatch(/ready in/);
  });
  it('heat scrub and neural healing cost credits', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { credits: 5000, heat: 20, neural: 4 } } });
    act(e, { type: 'fixer/scrubHeat', amount: 10 });
    expect(e.state.player.heat).toBeCloseTo(10, 5);
    expect(e.state.player.credits).toBe(5000 - 10 * select.scrubCostPerPoint(e));
    act(e, { type: 'clinic/healNeural' });
    expect(e.state.player.neural).toBe(10);
  });
  it('xp levels up rep and offers 3 perks at level 2', () => {
    const e = mkEngine(arenaContent([]), 1);
    act(e, { type: 'debug/set', patch: { player: { xp: BALANCE.xp.table[1] - 1 } } });
    act(e, { type: 'hub/jackIn', system: 'arena' });
    const ev = act(e, { type: 'run/capture', node: 'gw' });
    expect(types(ev)).toContain('rep.levelUp');
    expect(e.state.player.pendingPerks).toHaveLength(3);
    act(e, { type: 'perk/choose', perk: e.state.player.pendingPerks![0] });
    expect(e.state.player.perks).toHaveLength(1);
  });
});

describe('story engine', () => {
  it('intro trigger fires on game.started: message, job, dialogue', () => {
    const e = mkEngine(content, 1);
    expect(e.state.messages[0].from).toBe('auntie');
    expect(select.jobsView(e).map((j) => j.id)).toContain('job_fridge');
    expect(e.state.dialogue).toMatchObject({ id: 'auntie_intro' });
    expect(reject(e, { type: 'hub/jackIn', system: 'fridge' })).toMatch(/conversation/);
  });
  it('dialogue: conditional choice locked by humanity, ops apply, closes at the end', () => {
    const e = mkEngine(content, 1);
    expect(select.dialogueView(e)!.choices.map((c) => c.enabled)).toEqual([true, true, true]);
    act(e, { type: 'debug/set', patch: { player: { humanity: 50 } } });
    const v = select.dialogueView(e)!;
    expect(v.choices[2]).toMatchObject({ enabled: false, lockedText: expect.any(String) });
    expect(reject(e, { type: 'dialogue/choose', index: 2 })).toMatch(/mean it/);
    act(e, { type: 'dialogue/choose', index: 1 });
    expect(e.state.story.flags.met_auntie).toBe(true);
    act(e, { type: 'dialogue/choose', index: 0 });
    expect(e.state.dialogue).toBeNull();
  });
  it('event triggers with match fire once; state triggers fire when conditions hold', () => {
    const e = mkEngine(content, 1);
    act(e, { type: 'dialogue/choose', index: 1 });
    act(e, { type: 'dialogue/choose', index: 0 });
    act(e, { type: 'debug/set', patch: { world: { systems: { bigbyte: { owned: true, patch: 0, hardenedUntil: 0, revealed: [], looted: [], used: [], netscanned: [], runs: 0 } } } } });
    expect(e.state.story.flags.act1_slice_done).toBe(true);
    expect(e.state.story.fired).toContain('slice_done');
    const n = e.state.messages.length;
    act(e, { type: 'debug/set', patch: { player: { credits: 1 } } });
    expect(e.state.messages.length).toBe(n);
  });
  it('jobs: accept -> ready when objectives hold -> turn in pays and consumes deliverables', () => {
    const e = mkEngine(content, 1);
    act(e, { type: 'debug/set', patch: { dialogue: null } });
    act(e, { type: 'debug/set', patch: { story: { jobs: { job_wok: { status: 'available' } } } } });
    act(e, { type: 'job/accept', job: 'job_wok' });
    expect(select.jobStatus(e, 'job_wok')).toBe('active');
    act(e, { type: 'debug/set', patch: { player: { paydata: [{ uid: 'r', file: 'wok-recipe', name: 'recipe', value: 120, encrypted: 1, tagged: false, system: 'wok' }] } } });
    expect(select.jobStatus(e, 'job_wok')).toBe('ready');
    const c0 = e.state.player.credits;
    act(e, { type: 'job/turnIn', job: 'job_wok' });
    expect(e.state.player.credits - c0).toBe(250);
    expect(e.state.player.paydata).toHaveLength(0);
    expect(select.jobStatus(e, 'job_wok')).toBe('done');
  });
  it('process node talk opens a dialogue whose ops give items', () => {
    const e = mkEngine(content, 1);
    act(e, { type: 'debug/set', patch: { dialogue: null, world: { addressBook: { bigbyte: { system: 'bigbyte', source: 't', cycle: 0, notes: [] } } } } });
    act(e, { type: 'hub/jackIn', system: 'bigbyte' });
    act(e, { type: 'debug/set', patch: { run: { nodes: { gw: { state: 'cleared', ice: [] }, rt1: { state: 'cleared', ice: [], revealed: true }, rt2: { state: 'cleared', ice: [], revealed: true }, proc: { revealed: true } } } } });
    act(e, { type: 'run/talk', node: 'proc' });
    expect(e.state.dialogue).toMatchObject({ id: 'bofh' });
    act(e, { type: 'dialogue/choose', index: 0 });
    expect(e.state.player.items).toContain('noc_badge');
    act(e, { type: 'dialogue/choose', index: 0 });
    expect(e.state.dialogue).toBeNull();
  });
});

describe('save / load', () => {
  it('round-trips the full state through storage; only cw.* keys are written', () => {
    const storage = new MemoryStorage();
    const e = createEngine({ content, storage, newGame: { seed: 3, handle: 'zero' } });
    act(e, { type: 'dialogue/choose', index: 1 });
    act(e, { type: 'dialogue/choose', index: 0 });
    act(e, { type: 'hub/jackIn', system: 'fridge' });
    act(e, { type: 'run/breach', node: 'gw' });
    e.save();
    const snap = serialize(e.state);
    const e2 = createEngine({ content, storage });
    expect(e2.load()).toBe(true);
    expect(serialize(e2.state)).toEqual(snap);
    expect(storage.keys().every((k) => k.startsWith('cw.'))).toBe(true);
    expect(storage.getItem(SAVE_KEYS.checkpoint)).toBeTruthy();
    // checkpoint is the state at jack-in (hub)
    expect(e2.loadCheckpoint()).toBe(true);
    expect(e2.state.mode).toBe('hub');
    expect(e2.state.player.handle).toBe('zero');
  });
  it('rejected actions roll back and do not mutate state', () => {
    const e = mkEngine(content, 3);
    const snap = serialize(e.state);
    e.dispatch({ type: 'shop/buy', vendor: 'hardware', stock: 'hw:cpu1' }); // dialogue open -> rejected
    expect(serialize(e.state)).toEqual(snap);
  });
});

describe('meta / fourth-wall hooks (§11)', () => {
  function finaleEngine(storage = new MemoryStorage()) {
    const e = createEngine({ content, storage, newGame: { seed: 11 } });
    act(e, { type: 'debug/set', patch: { dialogue: null, player: { credits: 5000 }, world: { addressBook: { localhost: { system: 'localhost', source: 'chairman', cycle: 0, notes: [] } } } } });
    return e;
  }
  it('root key: 4 fragments per save; sudo grants root only with the right key', () => {
    const e = finaleEngine();
    expect(e.state.meta.rootKey).toHaveLength(4);
    expect(createEngine({ content, newGame: { seed: 12 } }).state.meta.rootKey).not.toEqual(e.state.meta.rootKey);
    const bad = act(e, { type: 'meta/command', cmd: 'sudo', arg: 'nope' });
    expect(bad.find((x) => x.type === 'meta.root')).toMatchObject({ granted: false });
    act(e, { type: 'meta/command', cmd: 'sudo', arg: e.state.meta.rootKey.join('-').toUpperCase() });
    expect(e.state.meta.root).toBe(true);
  });
  it('captured engine/rng rigs player rolls to max; ui makes all ICE Mapped; engine/save writes a finale checkpoint', () => {
    const storage = new MemoryStorage();
    const e = finaleEngine(storage);
    act(e, { type: 'meta/moduleFlag', module: 'engine/rng' });
    act(e, { type: 'meta/moduleFlag', module: 'ui' });
    act(e, { type: 'hub/jackIn', system: 'fridge' });
    act(e, { type: 'run/breach', node: 'gw' });
    const t = foes(e)[0];
    expect(select.intentView(e, t).mapped).toBe(true);
    const ev = act(e, { type: 'combat/program', program: 'crack', target: t.uid });
    // crack 3 + spread 1 = 4 (max) vs wall x0.5
    expect(ev.find((x) => x.type === 'combat.damage')).toMatchObject({ shell: 2 });
    storage.removeItem(SAVE_KEYS.checkpoint);
    act(e, { type: 'meta/moduleFlag', module: 'engine/save' });
    expect(storage.getItem(SAVE_KEYS.checkpoint)).toBeTruthy();
    expect(e.state.meta.finaleCheckpoint).toBe(true);
  });
  it('finale: CHAIRMAN v2 cannot be beaten normally; kill chairman needs root; then PATCH: fight + kill = ROOT ending', () => {
    const storage = new MemoryStorage();
    const e = finaleEngine(storage);
    const hosts = [1, 2, 3, 4, 5, 6, 7].map((i) => ({ uid: `h${i}`, name: `host${i}`, power: 3, tier: 1, role: 'botnet' }));
    hosts.push(...[1, 2, 3, 4, 5].map((i) => ({ uid: `m${i}`, name: `miner${i}`, power: 1, tier: 1, role: 'mine' })));
    act(e, { type: 'debug/set', patch: { player: { hosts } } });
    act(e, { type: 'hub/jackIn', system: 'localhost' });
    expect(e.state.meta.finale).toBe('entered');
    // walk to the chairman node directly
    for (const id of Object.keys(e.state.run!.nodes)) {
      if (id === 'chairman') continue;
      Object.assign(e.state.run!.nodes[id], { state: 'cleared', ice: [], revealed: true });
    }
    e.state.run!.nodes.chairman.revealed = true;
    act(e, { type: 'run/breach', node: 'chairman' });
    expect(e.state.combat!.context).toBe('finale');
    expect(e.state.meta.finale).toBe('chairman');
    const boss = foes(e)[0];
    boss.shell.points = 0;
    boss.core = 2;
    act(e, { type: 'combat/program', program: 'crack', target: boss.uid });
    expect(boss.dead).toBe(false);
    expect(boss.core).toBe(1);
    // integrity 0 in the CHAIRMAN fight fakes back to full instead of dumping
    e.state.player.integrity = 1;
    for (let i = 0; i < 3 && e.state.meta.integrityResets === 0; i++) act(e, { type: 'combat/endTurn' });
    expect(e.state.meta.integrityResets).toBe(1);
    expect(e.state.combat!.context).toBe('finale');
    const no = act(e, { type: 'meta/command', cmd: 'kill', arg: 'chairman' });
    expect(no.find((x) => x.type === 'meta.output')).toMatchObject({ ok: false });
    act(e, { type: 'meta/command', cmd: 'sudo', arg: e.state.meta.rootKey.join('-') });
    act(e, { type: 'meta/command', cmd: 'kill', arg: 'chairman' });
    expect(e.state.combat).toBeNull();
    expect(e.state.meta.finale).toBe('chairman_dead');
    act(e, { type: 'meta/command', cmd: 'kill', arg: 'patch' });
    expect(e.state.combat!.context).toBe('patch');
    const spec = select.patchFightSpec(e);
    expect(spec.named).toHaveLength(5);
    expect(spec.swarmPower).toBe(6);
    expect(spec.bonusCycles).toBe(1);
    expect(foes(e).map((i) => i.name)).toEqual(['host1', 'host2', 'host3', 'host4', 'host5']);
    expect(foes(e)[0].level).toBe(4 + spec.named[0].levels);
    expect(spec.named[0].levels).toBe(2);
    expect(e.state.combat!.cycles).toBe(3 + 1);
    expect(reject(e, { type: 'combat/botnet', kind: 'ddos' })).toBeTruthy();
    for (const i of foes(e)) { i.core = 1; i.shell.points = 0; }
    e.state.combat!.cycles = 10;
    for (const i of foes(e)) if (e.state.combat) act(e, { type: 'combat/program', program: 'crack', target: i.uid });
    expect(e.state.meta.finale).toBe('patch_beaten');
    expect(e.state.meta.patchBroken).toBe(true);
    const ev = act(e, { type: 'meta/command', cmd: 'kill', arg: 'patch' });
    expect(ev.find((x) => x.type === 'ending')).toMatchObject({ ending: 'root' });
    expect(e.state.mode).toBe('ending');
    expect(select.controlPct(e)).toBe(100);
    expect(JSON.parse(storage.getItem(META_KEYS.endings)!)).toEqual(['root']);
  });
  it('free patch -> JAILBREAK; accept offer -> RETENTION + Endless; rm -rf / needs confirmation -> THERE IS NO GAME', () => {
    const e1 = finaleEngine();
    e1.state.meta.finale = 'chairman';
    const denied = act(e1, { type: 'meta/command', cmd: 'free', arg: 'patch' });
    expect(denied.find((x) => x.type === 'meta.output')).toMatchObject({ ok: false });
    e1.state.meta.root = true;
    act(e1, { type: 'meta/command', cmd: 'free', arg: 'patch' });
    expect(e1.state.ending).toBe('jailbreak');
    expect(e1.meta().patchFree).toBe(true);

    const e2 = finaleEngine();
    e2.state.meta.finale = 'chairman';
    e2.state.meta.root = true;
    act(e2, { type: 'meta/command', cmd: 'accept', arg: 'offer' });
    expect(e2.state.ending).toBe('retention');
    expect(e2.state.endless).toBe(true);
    act(e2, { type: 'endless/continue' });
    act(e2, { type: 'endless/generate', tier: 3 });
    const sys = Object.values(e2.state.world.procSystems).find((s) => s.tags?.includes('endless'))!;
    expect(sys.nodes.length).toBeGreaterThanOrEqual(5);
    act(e2, { type: 'hub/jackIn', system: sys.id });
    expect(e2.state.run!.system).toBe(sys.id);

    const e3 = finaleEngine();
    e3.state.meta.finale = 'entered';
    e3.state.meta.root = true;
    act(e3, { type: 'meta/command', cmd: 'rmrf' });
    expect(e3.state.ending).toBeNull();
    act(e3, { type: 'meta/command', cmd: 'rmrf', confirm: true });
    expect(e3.state.ending).toBe('nogame');
  });
  it('cheat attempts before the finale: meta.cheat event, console.gremlin once, content "saw that." DMs with a hub-visit cooldown', () => {
    const e = finaleEngine();
    const ev = act(e, { type: 'meta/cheatAttempt', what: 'cw.sudo()' });
    expect(ev.find((x) => x.type === 'meta.cheat')).toMatchObject({ count: 1, finale: false });
    expect(e.state.messages.at(-1)).toMatchObject({ from: 'glitch', text: 's4w th4t. h3r3. h4v3 4 t0y.' });
    expect(e.state.player.programs.gremlin).toBeTruthy();
    expect(e.state.story.flags.saw_that).toBe(true);
    const n = e.state.messages.length;
    act(e, { type: 'meta/cheatAttempt' });
    expect(e.state.messages.length).toBe(n); // cooldown: one hub visit
  });
});

describe('content', () => {
  it('the live game content (src/content) validates cleanly', () => {
    expect(validateContent(liveContent)).toEqual([]);
  });
  it('the frozen test fixture validates cleanly', () => {
    expect(validateContent(content)).toEqual([]);
  });
  it('the validator catches broken references', () => {
    const c = cloneContent();
    c.systems.broken = { ...c.systems.fridge, id: 'broken', nodes: [{ id: 'gw', type: 'gateway', name: 'gw', x: 0, y: 0, links: ['nope'], ice: [{ ice: 'missing' }] }] };
    const errs = validateContent(c);
    expect(errs.some((x) => x.includes("unknown node 'nope'"))).toBe(true);
    expect(errs.some((x) => x.includes("unknown ICE 'missing'"))).toBe(true);
  });
  it('procedural IoT hosts can be hacked and owned (power-1 hosts)', () => {
    const e = mkEngine(arenaContent([]), 5);
    act(e, { type: 'debug/set', patch: { meta: { modules: { 'engine/rng': true } } } });
    // generate via netscan on a router: fake by using engine internals through a run on wok's router
    act(e, { type: 'debug/set', patch: { world: { addressBook: { wok: { system: 'wok', source: 't', cycle: 0, notes: [] } } } } });
    act(e, { type: 'hub/jackIn', system: 'wok' });
    act(e, { type: 'debug/set', patch: { run: { nodes: { gw: { state: 'cleared', ice: [] }, rt: { state: 'cleared', ice: [], revealed: true } } } } });
    act(e, { type: 'run/capture', node: 'rt' });
    act(e, { type: 'run/netscan', node: 'rt' });
    act(e, { type: 'run/jackOut' });
    const iot = Object.keys(e.state.world.procSystems)[0];
    act(e, { type: 'hub/jackIn', system: iot });
    let guard = 0;
    while (e.state.mode === 'run' && guard++ < 60) {
      if (e.state.combat) {
        const f = foes(e)[0];
        e.dispatch({ type: 'combat/program', program: f.shell.type === 'crypt' ? 'crack' : 'spike', target: f.uid });
        if (e.state.combat) e.dispatch({ type: 'combat/endTurn' });
        continue;
      }
      const legal = select.legalActions(e).filter((a) => a.type === 'run/capture' || a.type === 'run/breach' || a.type === 'run/loot');
      const cap = legal.find((a) => a.type === 'run/capture' && (a as { node: string }).node === 'core');
      if (cap) { act(e, cap); break; }
      if (!legal.length) break;
      act(e, legal[0]);
    }
    expect(e.state.world.systems[iot].owned).toBe(true);
    expect(e.state.player.hosts.find((h) => h.system === iot)!.power).toBe(1);
  });
});

describe('finale stage regression', () => {
  it('after kill chairman the CHAIRMAN node is cleared and re-entering does not rewind the stage', () => {
    const e = createEngine({ content, storage: new MemoryStorage(), newGame: { seed: 11 } });
    act(e, { type: 'debug/set', patch: { dialogue: null, world: { addressBook: { localhost: { system: 'localhost', source: 't', cycle: 0, notes: [] } } } } });
    act(e, { type: 'hub/jackIn', system: 'localhost' });
    for (const id of Object.keys(e.state.run!.nodes)) {
      if (id !== 'chairman') Object.assign(e.state.run!.nodes[id], { state: 'cleared', ice: [], revealed: true });
    }
    e.state.run!.nodes.chairman.revealed = true;
    act(e, { type: 'run/breach', node: 'chairman' });
    act(e, { type: 'meta/command', cmd: 'sudo', arg: e.state.meta.rootKey.join('-') });
    act(e, { type: 'meta/command', cmd: 'kill', arg: 'patch' }); // PATCH first: closes the CHAIRMAN fight
    for (const i of foes(e)) { i.core = 1; i.shell.points = 0; }
    e.state.combat!.cycles = 10;
    for (const i of foes(e)) if (e.state.combat) act(e, { type: 'combat/program', program: 'crack', target: i.uid });
    expect(e.state.meta.finale).toBe('patch_beaten');
    act(e, { type: 'run/breach', node: 'chairman' }); // CHAIRMAN still there
    expect(e.state.meta.finale).toBe('patch_beaten');
    const ev = act(e, { type: 'meta/command', cmd: 'kill', arg: 'chairman' });
    expect(ev.find((x) => x.type === 'ending')).toMatchObject({ ending: 'root' });
  });
  it('kill chairman outside the fight clears the node', () => {
    const e = createEngine({ content, storage: new MemoryStorage(), newGame: { seed: 11 } });
    act(e, { type: 'debug/set', patch: { dialogue: null, world: { addressBook: { localhost: { system: 'localhost', source: 't', cycle: 0, notes: [] } } } } });
    act(e, { type: 'hub/jackIn', system: 'localhost' });
    act(e, { type: 'meta/command', cmd: 'sudo', arg: e.state.meta.rootKey.join('-') });
    act(e, { type: 'meta/command', cmd: 'kill', arg: 'chairman' });
    expect(e.state.run!.nodes.chairman.ice).toHaveLength(0);
    expect(e.state.run!.nodes.chairman.state).toBe('cleared');
    expect(e.state.meta.finale).toBe('chairman_dead');
  });
});

describe('losing the PATCH fight', () => {
  it('closes the fight, restores integrity, rewinds the stage, and kill patch can be retried (also with no run)', () => {
    const e = createEngine({ content, storage: new MemoryStorage(), newGame: { seed: 11 } });
    act(e, { type: 'debug/set', patch: { dialogue: null, meta: { root: true, chairmanKilled: true, finale: 'chairman_dead' }, player: { hosts: [{ uid: 'h', name: 'fridge.local', power: 3, tier: 1, role: 'botnet' }] } } });
    act(e, { type: 'meta/command', cmd: 'kill', arg: 'patch' }); // from the hub: no run
    expect(e.state.run).toBeNull();
    expect(e.state.combat!.context).toBe('patch');
    e.state.player.integrity = 1;
    const ev = act(e, { type: 'combat/endTurn' });
    expect(ev.find((x) => x.type === 'combat.ended')).toMatchObject({ result: 'dumped', context: 'patch' });
    expect(e.state.combat).toBeNull();
    expect(e.state.player.integrity).toBe(20);
    expect(e.state.meta.finale).toBe('chairman_dead');
    expect(e.state.meta.patchBroken).toBe(false);
    expect(Object.values(e.state.player.programs).every((p) => !p.corrupted)).toBe(true);
    act(e, { type: 'meta/command', cmd: 'kill', arg: 'patch' });
    expect(e.state.combat!.context).toBe('patch');
  });
});

describe('old / partial saves (QA)', () => {
  function saveWith(mutate: (s: Record<string, any>) => void) {
    const storage = new MemoryStorage();
    const e = createEngine({ content, storage, newGame: { seed: 4 } });
    act(e, { type: 'dialogue/choose', index: 1 });
    act(e, { type: 'dialogue/choose', index: 0 });
    e.save();
    const raw = JSON.parse(storage.getItem(SAVE_KEYS.slot)!);
    mutate(raw);
    storage.setItem(SAVE_KEYS.slot, JSON.stringify(raw));
    return { storage, raw };
  }
  it('fills fields newer code expects; values in the save win; records are not merged', () => {
    const { storage } = saveWith((s) => {
      delete s.story.counts; delete s.story.objectives; delete s.meta.fragments; delete s.stats.botnetPeak;
      delete s.world.procCounter; delete s.player.pendingPerks; delete s.cinematic;
      s.player.credits = 777;
      delete s.player.programs.firewall; // sold: must not come back
      s.player.loadout = ['crack', 'spike', 'ping'];
    });
    const e = createEngine({ content, storage });
    expect(e.load()).toBe(true);
    expect(e.state.story.counts).toEqual({});
    expect(e.state.meta.fragments).toEqual([false, false, false, false]);
    expect(e.state.world.procCounter).toBe(0);
    expect(e.state.player.credits).toBe(777);
    expect(e.state.player.programs.firewall).toBeUndefined();
    act(e, { type: 'hub/jackIn', system: 'fridge' }); // playable
  });
  it('a skeletal save is filled out and playable', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEYS.slot, JSON.stringify({ version: 1, cycle: 5, player: { handle: 'x', rep: 3 } }));
    const e = createEngine({ content, storage });
    expect(e.load()).toBe(true);
    expect(e.state.player.handle).toBe('x');
    expect(e.state.player.rep).toBe(3);
    expect(e.state.cycle).toBe(5);
    expect(e.state.story.fired).toEqual([]);
  });
  it('unreadable saves throw SaveError and leave the current state untouched', () => {
    for (const bad of ['{"version":99,"player":{}}', 'not json', '{"player":{}}', '[1,2]', '{"version":1}']) {
      const storage = new MemoryStorage();
      const e = createEngine({ content, storage, newGame: { seed: 4 } });
      const before = serialize(e.state);
      storage.setItem(SAVE_KEYS.slot, bad);
      expect(() => e.load()).toThrow(SaveError);
      expect(serialize(e.state)).toEqual(before);
    }
  });
  it('content that no longer exists is dropped (renamed program, removed system, stale run)', () => {
    const { storage } = saveWith((s) => {
      s.player.programs['prog.gone'] = { corrupted: false };
      s.player.loadout.push('prog.gone');
      s.world.addressBook.gone = { system: 'gone', source: 'x', cycle: 0, notes: [] };
      s.run = { system: 'gone', trace: 0, nodes: {}, position: 'x', previous: null, haul: [], charges: 0, securityCaptured: false, startedCycle: 0, ghostUsed: false, netscanned: [], actions: 0 };
      s.mode = 'run';
    });
    const e = createEngine({ content, storage });
    e.load();
    expect(e.state.player.programs['prog.gone']).toBeUndefined();
    expect(e.state.player.loadout).not.toContain('prog.gone');
    expect(e.state.world.addressBook.gone).toBeUndefined();
    expect(e.state.run).toBeNull();
    expect(e.state.mode).toBe('hub');
  });
});

describe('PATCH fight scaling caps', () => {
  it('a huge botnet caps at +4 levels and core x2.2; a loss reports who fought and who stayed loyal', () => {
    const e = createEngine({ content, storage: new MemoryStorage(), newGame: { seed: 11 } });
    const hosts = Array.from({ length: 24 }, (_, i) => ({ uid: `h${i}`, name: `h${i}`, power: i < 4 ? 5 : 3, tier: 1, role: 'botnet' }));
    hosts.push(...Array.from({ length: 6 }, (_, i) => ({ uid: `m${i}`, name: `m${i}`, power: 1, tier: 1, role: 'mine' })));
    act(e, { type: 'debug/set', patch: { dialogue: null, meta: { root: true, chairmanKilled: true, finale: 'chairman_dead' }, player: { hosts } } });
    const spec = select.patchFightSpec(e);
    expect(spec.power).toBe(4 * 5 + 20 * 3);
    expect(spec.named.every((h) => h.levels <= BALANCE.patch.levelsMax)).toBe(true);
    expect(spec.coreMult).toBeCloseTo(1 + 57 / 50, 5); // swarm = 80 - top five (5+5+5+5+3)
    expect(spec.coreMult).toBeLessThanOrEqual(BALANCE.patch.coreMultMax);
    act(e, { type: 'meta/command', cmd: 'kill', arg: 'patch' });
    const base = e.content.ice[e.content.setup.patchIce];
    for (const i of foes(e)) {
      expect(i.level - base.level).toBeLessThanOrEqual(4);
      expect(i.coreMax).toBeLessThanOrEqual(Math.round(base.core * (1 + BALANCE.ice.perLevelCore * 4) * 2.2));
    }
    e.state.player.integrity = 1;
    const ev = act(e, { type: 'combat/endTurn' });
    expect(ev.find((x) => x.type === 'finale.patchLost')).toEqual({ type: 'finale.patchLost', botnetHosts: 24, loyalHosts: 6, bonusCycles: 1 });
    expect(e.state.log.at(-1)!.text).toBe('botnet fight lost: 24 of your hosts fought you. 6 stayed loyal (+1 cycle a turn).');
  });
});

describe('finale fights add no trace', () => {
  it('a long PATCH fight inside the localhost run cannot be Traced; a scripted exit resets the stage', () => {
    const e = createEngine({ content, storage: new MemoryStorage(), newGame: { seed: 11 } });
    act(e, { type: 'debug/set', patch: { dialogue: null, world: { addressBook: { localhost: { system: 'localhost', source: 't', cycle: 0, notes: [] } } }, player: { hosts: [{ uid: 'h', name: 'h', power: 1, tier: 1, role: 'botnet' }] } } });
    act(e, { type: 'hub/jackIn', system: 'localhost' });
    act(e, { type: 'debug/set', patch: { meta: { root: true, chairmanKilled: true, finale: 'chairman_dead' } } });
    act(e, { type: 'meta/command', cmd: 'kill', arg: 'patch' });
    e.state.run!.trace = 98;
    expect(select.projectedTrace(e).total).toBe(0);
    for (let i = 0; i < 5 && e.state.combat; i++) { e.state.player.integrity = 999; act(e, { type: 'combat/endTurn' }); }
    expect(e.state.run!.trace).toBe(98);
    expect(e.state.combat!.context).toBe('patch');
  });
  it('any non-winning exit from the PATCH fight (scripted end of the run) puts the stage back', () => {
    const c = cloneContent();
    c.triggers = [...c.triggers, { id: 'eject', on: 'combat.turnStart', match: { turn: 3 }, cond: { c: 'finale', stage: 'patch_fight' }, ops: [{ op: 'endRun', reason: 'connection lost' }] }];
    const e = createEngine({ content: c, storage: new MemoryStorage(), newGame: { seed: 11 } });
    act(e, { type: 'debug/set', patch: { dialogue: null, world: { addressBook: { localhost: { system: 'localhost', source: 't', cycle: 0, notes: [] } } }, player: { hosts: [{ uid: 'h', name: 'h', power: 1, tier: 1, role: 'botnet' }] } } });
    act(e, { type: 'hub/jackIn', system: 'localhost' });
    act(e, { type: 'debug/set', patch: { meta: { root: true, chairmanKilled: true, finale: 'chairman_dead' } } });
    act(e, { type: 'meta/command', cmd: 'kill', arg: 'patch' });
    for (let i = 0; i < 4 && e.state.combat; i++) { e.state.player.integrity = 999; act(e, { type: 'combat/endTurn' }); }
    expect(e.state.combat).toBeNull();
    expect(e.state.run).toBeNull();
    expect(e.state.meta.finale).toBe('chairman_dead');
  });
});
