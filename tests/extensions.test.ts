// Engine extensions requested by the content, story and meta agents (batch 1).
import { describe, it, expect } from 'vitest';
import { select, BALANCE, type Content, type Modifier } from '../src/engine/index.ts';
import { act, reject, arenaContent, arenaFight, mkEngine, foes, dummy, cloneContent } from './helpers.ts';

function withPerk(mods: Modifier[], base: Content = arenaContent([])): Content {
  base.perks.test_perk = { id: 'test_perk', name: 'test', description: '', mods };
  return base;
}
const perkPatch = { player: { perks: ['test_perk'] } };

describe('system flags', () => {
  it('noJackOut refuses jack out and disengage with the system text', () => {
    const c = arenaContent(['dummy'], { ice: [dummy('dummy', { core: 500 })] });
    c.systems.arena.noJackOut = 'jack out: unavailable. thank you for staying.';
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    expect(reject(e, { type: 'run/jackOut' })).toBe('jack out: unavailable. thank you for staying.');
    act(e, { type: 'run/breach', node: 'gw' });
    expect(reject(e, { type: 'combat/jackOut' })).toMatch(/thank you for staying/);
    expect(reject(e, { type: 'combat/disengage' })).toMatch(/thank you for staying/);
    expect(select.combatView(e)!.jackOut).toMatch(/thank you/);
  });
  it('lock refuses jack-in until its condition holds', () => {
    const c = arenaContent([]);
    c.systems.arena.lock = { cond: { c: 'flag', flag: 'act3_started' }, text: 'connection refused.' };
    const e = mkEngine(c);
    expect(reject(e, { type: 'hub/jackIn', system: 'arena' })).toBe('connection refused.');
    act(e, { type: 'debug/set', patch: { story: { flags: { act3_started: true } } } });
    act(e, { type: 'hub/jackIn', system: 'arena' });
  });
});

describe('story ops nextFight / runSecurity', () => {
  it('nextFight applies once, after the first player turn of the next fight', () => {
    const c = arenaContent(['sentry', 'cipher']);
    c.systems.arena.nodes[1].use = { label: 'thrusters', ops: [{ op: 'nextFight', ops: [{ op: 'iceStatus', status: 'slowed', value: 2, to: 'allEnemies' }, { op: 'cycles', amount: 1 }] }] };
    c.systems.arena.nodes[0].ice = [];
    c.systems.arena.nodes[2].ice = [{ ice: 'sentry' }, { ice: 'cipher' }];
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/use', node: 'ds' });
    act(e, { type: 'run/breach', node: 'core' });
    expect(foes(e).every((i) => i.status.slowed === 2)).toBe(true);
    expect(e.state.combat!.cycles).toBe(4);
    expect(e.state.run!.nextFight).toEqual([]);
  });
  it('runSecurity changes the security used for turn trace, this run only', () => {
    const c = arenaContent(['dummy'], { ice: [dummy('dummy', { core: 500 })], security: 3 });
    c.systems.arena.nodes[0].ice = [];
    c.systems.arena.nodes[1].ice = [{ ice: 'dummy' }];
    c.systems.arena.nodes[0].use = { label: 'sawbones', ops: [{ op: 'runSecurity', add: -1 }] };
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/use', node: 'gw' });
    act(e, { type: 'run/breach', node: 'ds' });
    expect(select.projectedTrace(e).formula).toBe(BALANCE.trace.turnBase + 2);
  });
});

describe('modifiers', () => {
  it('programCost (v1 -1, min 1) and coldOpen (first program free)', () => {
    const e = arenaFight(['dummy'], { base: withPerk([{ mod: 'programCost', version: 1, add: -1, min: 1 }]), ice: [dummy('dummy', { core: 500 })], patch: { ...perkPatch, player: { ...perkPatch.player, programs: { worm: { corrupted: false } }, loadout: ['crack', 'worm'] } } });
    expect(select.programCost(e, 'crack')).toBe(1);
    expect(select.programCost(e, 'worm')).toBe(1);
    const e2 = arenaFight(['dummy'], { base: withPerk([{ mod: 'coldOpen' }]), ice: [dummy('dummy', { core: 500 })], patch: perkPatch });
    act(e2, { type: 'combat/program', program: 'crack', target: foes(e2)[0].uid });
    expect(e2.state.combat!.cycles).toBe(3);
    act(e2, { type: 'combat/program', program: 'crack', target: foes(e2)[0].uid });
    expect(e2.state.combat!.cycles).toBe(2);
  });
  it('comboRefund: consuming the Mapped crit refunds 1 cycle once per turn', () => {
    const e = arenaFight(['dummy'], { base: withPerk([{ mod: 'comboRefund' }]), ice: [dummy('dummy', { core: 500 })], patch: perkPatch });
    const t = foes(e)[0].uid;
    act(e, { type: 'combat/program', program: 'ping', target: t });
    act(e, { type: 'combat/program', program: 'crack', target: t });
    expect(e.state.combat!.cycles).toBe(2);
  });
  it('noise per category, proxyMult, saleValue, traceFine, neuralTaken', () => {
    const c = withPerk([
      { mod: 'noise', add: -1 }, { mod: 'proxyMult', mult: 2 }, { mod: 'saleValue', mult: 1.1 },
      { mod: 'traceFine', ratio: 0.05 }, { mod: 'neuralTaken', add: -1 },
    ], arenaContent(['psychotrope']));
    const e = mkEngine(c);
    act(e, { type: 'debug/set', patch: { ...perkPatch, player: { ...perkPatch.player, hosts: [{ uid: 'h', name: 'h', power: 2, tier: 1, role: 'proxy' }], paydata: [{ uid: 'p', file: 'f', name: 'f', value: 100, encrypted: 0, tagged: false, system: 'x' }] } } });
    expect(select.botnetView(e).proxyPower).toBe(4);
    expect(select.paydataView(e)[0].saleValue).toBe(110);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/breach', node: 'gw' });
    expect(select.programButtons(e).find((p) => p.id === 'crack')!.noise).toBe(0);
    act(e, { type: 'combat/endTurn' }); // psychotrope dose: 2 neural -1
    expect(e.state.player.neural).toBe(10 - 1);
  });
  it('secondWind: once per run integrity 0 leaves you at 1', () => {
    const e = arenaFight(['killer'], { base: withPerk([{ mod: 'secondWind' }]), patch: perkPatch });
    e.state.player.integrity = 1;
    act(e, { type: 'combat/endTurn' });
    act(e, { type: 'combat/endTurn' });
    expect(e.state.run).not.toBeNull();
    expect(e.state.player.integrity).toBe(1);
    expect(e.state.run!.secondWindUsed).toBe(true);
  });
  it('infectedSlowDecay and startMapped', () => {
    const e = arenaFight(['dummy'], { base: withPerk([{ mod: 'infectedSlowDecay' }, { mod: 'startMapped', count: 1 }]), ice: [dummy('dummy', { core: 500 })], patch: { ...perkPatch, player: { ...perkPatch.player, programs: { worm: { corrupted: false } }, loadout: ['worm'] } } });
    const t = foes(e)[0];
    expect(t.status.mapped).toBeGreaterThan(0);
    act(e, { type: 'combat/program', program: 'worm', target: t.uid });
    const n = t.status.infected;
    act(e, { type: 'combat/endTurn' }); // turn 1: no decay
    expect(t.status.infected).toBe(n);
    act(e, { type: 'combat/endTurn' }); // turn 2: decay
    expect(t.status.infected).toBe(n - 1);
  });
  it('pumpCooldown mult', () => {
    const c = withPerk([{ mod: 'pumpCooldown', mult: 0.5 }], cloneContent());
    c.systems.coinbasement = { ...c.systems.fridge, id: 'coinbasement' };
    const e = mkEngine(c);
    act(e, { type: 'debug/set', patch: { ...perkPatch, dialogue: null, world: { systems: { coinbasement: { owned: true, patch: 0, hardenedUntil: 0, revealed: [], looted: [], used: [], netscanned: [], runs: 0 } } } } });
    act(e, { type: 'exchange/pump' });
    expect(e.state.world.pumpReadyAt).toBe(BALANCE.economy.pumpCooldown / 2);
  });
});

describe('dialogue variants and interpolation', () => {
  it('first matching variant replaces the text; {tokens} are filled, unknown ones kept', () => {
    const c = arenaContent([]);
    c.dialogues.greet = {
      id: 'greet', speaker: 'auntie', start: 'a',
      nodes: { a: { text: 'Hi {handle}.', variants: [{ cond: { c: 'stat', stat: 'heat', gte: 50 }, text: 'Hot one, {handle}. {playtime}' }], choices: [{ text: 'I have {credits} ¤' }] } },
    };
    const e = mkEngine(c);
    act(e, { type: 'dialogue/start', dialogue: 'greet' });
    expect(select.dialogueView(e)).toMatchObject({ text: 'Hi n00b.', choices: [{ text: 'I have 50 ¤' }] });
    act(e, { type: 'debug/set', patch: { player: { heat: 60 } } });
    expect(select.dialogueView(e)!.text).toBe('Hot one, n00b. {playtime}');
  });
  it('a dialogue opened mid-fight blocks combat until closed; meta commands still work; kill patch closes it', () => {
    const c = arenaContent(['dummy'], { ice: [dummy('dummy', { core: 500 })] });
    c.dialogues.dc = { id: 'dc', speaker: 'glitch', start: 'a', nodes: { a: { text: 'so. about the body.', choices: [{ text: 'no.' }] } } };
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/breach', node: 'gw' });
    act(e, { type: 'debug/set', patch: { dialogue: { id: 'dc', node: 'a' }, meta: { root: true, finale: 'chairman' } } });
    expect(reject(e, { type: 'combat/endTurn' })).toMatch(/conversation/);
    act(e, { type: 'meta/command', cmd: 'kill', arg: 'patch' });
    expect(e.state.dialogue).toBeNull();
    expect(e.state.combat!.context).toBe('patch');
  });
});

describe('stats for credits; procgen naming', () => {
  it('programUses and botnetPeak', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 500 })] });
    act(e, { type: 'combat/program', program: 'crack', target: foes(e)[0].uid });
    act(e, { type: 'combat/program', program: 'crack', target: foes(e)[0].uid });
    expect(e.state.stats.programUses!.crack).toBe(2);
    const e2 = mkEngine(arenaContent([]));
    act(e2, { type: 'debug/set', patch: { player: { hosts: [{ uid: 'a', name: 'a', power: 1, tier: 1, role: 'idle' }, { uid: 'b', name: 'b', power: 1, tier: 1, role: 'idle' }] } } });
    act(e2, { type: 'botnet/setRole', host: 'a', role: 'botnet' });
    act(e2, { type: 'botnet/setRole', host: 'b', role: 'botnet' });
    act(e2, { type: 'botnet/setRole', host: 'a', role: 'mine' });
    expect(e2.state.stats.botnetPeak).toBe(2);
  });
  it('IoT names use suffixes, owners and per-device descriptions when given', () => {
    const c = cloneContent(arenaContent([]));
    c.procgen = { ...c.procgen, devices: ['toaster'], brands: ['Toastie'], suffixes: ['Pro'], owners: ["Mrs. Okafor's"], descriptions: { toaster: ['Burns bread. Burns hope.'] } };
    c.systems.arena.nodes[0].type = 'router';
    c.systems.arena.nodes[0].netscanIot = 12;
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/capture', node: 'gw' });
    act(e, { type: 'run/netscan', node: 'gw' });
    const sys = Object.values(e.state.world.procSystems);
    expect(sys.every((x) => /^toastie-toaster-pro-[0-9a-f]{4}\./.test(x.address))).toBe(true);
    expect(sys.every((x) => x.description === 'Burns bread. Burns hope.')).toBe(true);
    expect(sys.some((x) => x.name === "Mrs. Okafor's toaster")).toBe(true);
    expect(sys.some((x) => x.name === 'Toastie toaster Pro')).toBe(true);
  });
});

describe('IceCond status / any (program payoffs via ifIce)', () => {
  it('bonus damage vs Stunned or Slowed; preview follows the condition', () => {
    const c = arenaContent(['dummy'], { ice: [dummy('dummy', { core: 500 })] });
    c.programs.ram = {
      id: 'ram', name: 'ram', category: 'attack', cost: 1, cooldown: 0, noise: 0, ram: 1, targeting: 'ice', price: 0, description: '',
      ops: [{ op: 'ifIce', cond: { c: 'any', of: [{ c: 'status', status: 'stunned' }, { c: 'status', status: 'slowed' }] },
        ops: [{ op: 'damage', kind: 'crack', amount: 6 }], else: [{ op: 'damage', kind: 'crack', amount: 2 }] }],
    };
    const e = arenaFight(['dummy'], { base: c, ice: [dummy('dummy', { core: 500 })], patch: { player: { programs: { ram: { corrupted: false }, lullaby: { corrupted: false } }, loadout: ['ram', 'lullaby'] } } });
    const t = foes(e)[0];
    expect(select.damagePreview(e, 'ram', t.uid)[0].max.core).toBe(2);
    act(e, { type: 'combat/program', program: 'ram', target: t.uid });
    expect(t.core).toBe(498);
    act(e, { type: 'combat/endTurn' });
    act(e, { type: 'combat/program', program: 'lullaby', target: t.uid });
    expect(select.damagePreview(e, 'ram', t.uid)[0].max.core).toBe(5); // 6 x0.8 signature
    act(e, { type: 'combat/program', program: 'ram', target: t.uid });
    expect(t.core).toBe(493);
  });
});

describe('dialogue during combat (regression: deadlock)', () => {
  it('dialogue/choose works while a fight is on; combat resumes after', () => {
    const c = arenaContent(['dummy'], { ice: [dummy('dummy', { core: 500 })] });
    c.dialogues.intro = { id: 'intro', speaker: 'auntie', start: 'a', nodes: { a: { text: 'The Board will see you now.', next: 'b' }, b: { text: 'Sit.', choices: [{ text: 'no.' }] } } };
    c.triggers = [...c.triggers, { id: 'open', on: 'combat.started', ops: [{ op: 'dialogue', dialogue: 'intro' }] }];
    const e = mkEngine(c);
    act(e, { type: 'hub/jackIn', system: 'arena' });
    act(e, { type: 'run/breach', node: 'gw' });
    expect(e.state.dialogue).toMatchObject({ id: 'intro' });
    expect(select.legalActions(e)).toEqual([{ type: 'dialogue/choose', index: 0 }]);
    act(e, { type: 'dialogue/choose', index: 0 });
    act(e, { type: 'dialogue/choose', index: 0 });
    expect(e.state.dialogue).toBeNull();
    act(e, { type: 'combat/endTurn' });
  });
});
