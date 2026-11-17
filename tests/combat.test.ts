import { describe, it, expect } from 'vitest';
import { select, BALANCE, type IceInstance } from '../src/engine/index.ts';
import { computeDamage, signatureMult } from '../src/engine/combat.ts';
import { act, reject, arenaFight, foes, dummy, types, cloneContent } from './helpers.ts';

const progs = (ids: string[]) => ({
  player: { programs: Object.fromEntries(ids.map((i) => [i, { corrupted: false }])), loadout: ids },
});

function iceWith(shell: IceInstance['shell'], over: Partial<IceInstance['status']> = {}): IceInstance {
  return {
    uid: 'x', def: 'd', name: 'd', level: 1, bonus: 0, shell, core: 20, coreMax: 20,
    status: { mapped: 0, critReady: false, unstable: 0, backdoored: 0, rootable: false, exposed: 0, stunned: 0, slowed: 0, marked: 0, infected: 0, ...over },
    intent: null, seq: 0, phase: 0, subverted: false, dead: false, lastHitKind: null, turns: 0, firedTriggers: [],
  };
}

describe('damage and shell math (§6.2)', () => {
  it('crack is x2 vs crypt and spills the rest into core at x1', () => {
    const r = computeDamage(iceWith({ type: 'crypt', points: 4, max: 4 }), 'crack', 4, 1, undefined);
    // 4*2 = 8 effective: 4 to shell, (8-4)/2 = 2 to core
    expect(r).toMatchObject({ shell: 4, core: 2 });
  });
  it('spike is x0.5 vs crypt', () => {
    const r = computeDamage(iceWith({ type: 'crypt', points: 10, max: 10 }), 'spike', 4, 1, undefined);
    expect(r).toMatchObject({ shell: 2, core: 0 });
  });
  it('spike is x2 vs wall, crack x0.5 vs wall', () => {
    expect(computeDamage(iceWith({ type: 'wall', points: 10, max: 10 }), 'spike', 3, 1, undefined).shell).toBe(6);
    expect(computeDamage(iceWith({ type: 'wall', points: 10, max: 10 }), 'crack', 4, 1, undefined).shell).toBe(2);
  });
  it('exposed core and Exposed status take x1', () => {
    expect(computeDamage(iceWith({ type: 'none', points: 0, max: 0 }), 'crack', 5, 1, undefined)).toMatchObject({ shell: 0, core: 5 });
    expect(computeDamage(iceWith({ type: 'wall', points: 9, max: 9 }, { exposed: 1 }), 'crack', 5, 1, undefined)).toMatchObject({ shell: 0, core: 5 });
  });
  it('worm converts to Infected stacks and ignores shells', () => {
    expect(computeDamage(iceWith({ type: 'wall', points: 9, max: 9 }), 'worm', 3, 1, undefined)).toMatchObject({ shell: 0, core: 0, infected: 3 });
  });
  it('Mapped crit multiplies by 1.5', () => {
    expect(computeDamage(iceWith({ type: 'none', points: 0, max: 0 }, { critReady: true }), 'crack', 4, 1, undefined)).toMatchObject({ core: 6, crit: true });
  });
  it('full fight: spike on a wall Sentry reduces shell then core', () => {
    const e = arenaFight(['sentry'], { patch: { rng: 7 } });
    const t = foes(e)[0];
    act(e, { type: 'combat/program', program: 'spike', target: t.uid });
    expect(t.shell.points).toBeLessThan(t.shell.max);
  });
});

describe('signature adaptation (§6.3.1)', () => {
  it('multiplier is max(0.4, 1 - 0.2 * stacks)', () => {
    expect([0, 1, 2, 3, 4, 5].map(signatureMult)).toEqual([1, 0.8, 0.6, 0.4, 0.4, 0.4].map((x) => expect.closeTo(x, 5)));
  });
  it('each use adds a stack; unused programs lose one per turn', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 200 })] });
    const t = foes(e)[0].uid;
    const evs = act(e, { type: 'combat/program', program: 'crack', target: t });
    expect(evs.find((x) => x.type === 'combat.program')).toMatchObject({ mult: 1 });
    act(e, { type: 'combat/program', program: 'crack', target: t });
    expect(select.signature(e, 'crack')).toEqual({ stacks: 2, mult: expect.closeTo(0.6, 5) });
    act(e, { type: 'combat/endTurn' });
    // used last turn: no decay yet
    expect(select.signature(e, 'crack').stacks).toBe(2);
    act(e, { type: 'combat/program', program: 'spike', target: t });
    act(e, { type: 'combat/endTurn' });
    expect(select.signature(e, 'crack').stacks).toBe(1);
    expect(select.signature(e, 'spike').stacks).toBe(1);
  });
});

describe('Flow (§6.3.2)', () => {
  it('3 categories in one turn: next turn +1 cycle and -2 trace', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 200 })], patch: progs(['crack', 'ping', 'firewall']) });
    const t = foes(e)[0].uid;
    act(e, { type: 'combat/program', program: 'crack', target: t });
    act(e, { type: 'combat/program', program: 'ping', target: t });
    const ev = act(e, { type: 'combat/program', program: 'firewall' });
    expect(ev.find((x) => x.type === 'combat.flow')).toMatchObject({ earned: true, categories: 3 });
    const noFlow = select.projectedTrace(e).formula;
    act(e, { type: 'combat/endTurn' });
    expect(e.state.combat!.cycles).toBe(BALANCE.flow.bonusCycles + 3);
    expect(e.state.combat!.flowActive).toBe(true);
    // same noise as before minus flow reduction
    act(e, { type: 'combat/program', program: 'crack', target: t });
    act(e, { type: 'combat/program', program: 'firewall' });
    expect(select.projectedTrace(e).formula).toBe(Math.max(0, noFlow - 1 - BALANCE.flow.traceReduction));
  });
  it('Polyglot perk needs only 2 categories', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 200 })], patch: { ...progs(['crack', 'firewall']), player: { ...progs(['crack', 'firewall']).player, perks: ['polyglot'] } } });
    act(e, { type: 'combat/program', program: 'crack', target: foes(e)[0].uid });
    act(e, { type: 'combat/program', program: 'firewall' });
    act(e, { type: 'combat/endTurn' });
    expect(e.state.combat!.flowActive).toBe(true);
  });
});

describe('status combos (§6.3.3)', () => {
  it('Mapped reveals intent and the next hit crits (consumed)', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 200 })] });
    const t = foes(e)[0];
    expect(select.intentView(e, t).label).toBeNull();
    act(e, { type: 'combat/program', program: 'ping', target: t.uid });
    expect(select.intentView(e, t).label).toBe('Idle');
    const ev1 = act(e, { type: 'combat/program', program: 'crack', target: t.uid });
    expect(ev1.find((x) => x.type === 'combat.damage')).toMatchObject({ crit: true });
    const ev2 = act(e, { type: 'combat/program', program: 'crack', target: t.uid });
    expect(ev2.find((x) => x.type === 'combat.damage')).toMatchObject({ crit: false });
  });
  it('overflow consumes all Unstable stacks for bonus damage', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 200 })], patch: { ...progs(['fuzz', 'overflow']), player: { ...progs(['fuzz', 'overflow']).player, hardware: { cpu: 2 } } } });
    const t = foes(e)[0];
    act(e, { type: 'combat/program', program: 'fuzz', target: t.uid });
    act(e, { type: 'combat/program', program: 'fuzz', target: t.uid }); // second fuzz at x0.8 -> 2 stacks
    expect(t.status.unstable).toBe(5);
    const ev = act(e, { type: 'combat/program', program: 'overflow', target: t.uid });
    expect(t.status.unstable).toBe(0);
    expect(ev.find((x) => x.type === 'combat.damage')).toMatchObject({ core: 1 + 5 * 2 });
  });
  it('Backdoored(t) -> Rootable -> root subverts; rooted ICE fights for you', () => {
    const e = arenaFight(['dummy', 'dummy2'], { ice: [dummy('dummy', { core: 200 }), dummy('dummy2', { core: 200 })], patch: progs(['inject', 'rootkit']) });
    const [a, b] = foes(e);
    act(e, { type: 'combat/program', program: 'rootkit', target: a.uid }); // not Rootable yet: no effect
    expect(a.subverted).toBe(false);
    act(e, { type: 'combat/endTurn' });
    act(e, { type: 'combat/program', program: 'inject', target: a.uid });
    act(e, { type: 'combat/endTurn' });
    expect(a.status.backdoored).toBe(1);
    act(e, { type: 'combat/endTurn' });
    expect(a.status.rootable).toBe(true);
    const ev = act(e, { type: 'combat/program', program: 'rootkit', target: a.uid });
    expect(types(ev)).toContain('combat.iceSubverted');
    const before = b.core;
    act(e, { type: 'combat/endTurn' });
    expect(b.core).toBeLessThan(before);
  });
  it('bosses resist root and are Slowed instead of Stunned', () => {
    const e = arenaFight(['headchef'], { patch: progs(['lullaby', 'inject']) });
    const boss = foes(e)[0];
    act(e, { type: 'combat/program', program: 'lullaby', target: boss.uid });
    expect(boss.status.stunned).toBe(0);
    expect(boss.status.slowed).toBe(1);
  });
  it('Stunned ICE skips its action and keeps its intent', () => {
    const e = arenaFight(['sentry'], { patch: progs(['lullaby']) });
    const t = foes(e)[0];
    const intent = t.intent;
    act(e, { type: 'combat/program', program: 'lullaby', target: t.uid });
    const ev = act(e, { type: 'combat/endTurn' });
    expect(ev.find((x) => x.type === 'combat.iceAct')).toMatchObject({ skipped: 'stunned' });
    expect(types(ev)).not.toContain('combat.playerHit');
    expect(t.intent).toBe(intent);
  });
  it('Infected ticks each ICE turn, decays, and jumps to another ICE on death', () => {
    const e = arenaFight(['weak', 'dummy'], { ice: [dummy('weak', { core: 2 }), dummy('dummy', { core: 200 })], patch: progs(['worm']) });
    const [w, d] = foes(e);
    act(e, { type: 'combat/program', program: 'worm', target: w.uid });
    expect(w.status.infected).toBe(3);
    act(e, { type: 'combat/endTurn' });
    expect(w.dead).toBe(true);
    expect(d.status.infected).toBe(2);
  });
  it('Hydra splits when its shell breaks unless Infected', () => {
    const e = arenaFight(['hydra'], { patch: { ...progs(['spike', 'worm']), player: { ...progs(['spike', 'worm']).player, hardware: { cpu: 2 } } } });
    const h = foes(e)[0];
    h.shell.points = 1;
    act(e, { type: 'combat/program', program: 'spike', target: h.uid });
    expect(foes(e).length).toBe(2);

    const e2 = arenaFight(['hydra'], { patch: { ...progs(['spike', 'worm']), player: { ...progs(['spike', 'worm']).player, hardware: { cpu: 2 } } } });
    const h2 = foes(e2)[0];
    act(e2, { type: 'combat/program', program: 'worm', target: h2.uid });
    h2.shell.points = 1;
    act(e2, { type: 'combat/program', program: 'spike', target: h2.uid });
    expect(foes(e2).length).toBe(1);
  });
  it('Decoy absorbs the next attack', () => {
    const e = arenaFight(['sentry'], { patch: progs(['decoy']) });
    act(e, { type: 'combat/program', program: 'decoy' });
    const ev = act(e, { type: 'combat/endTurn' });
    expect(ev.find((x) => x.type === 'combat.playerHit')).toMatchObject({ decoyed: true });
    expect(e.state.player.integrity).toBe(20);
  });
  it('Scrambler locks your most-used program; Cold Cortex-style immunity blocks it', () => {
    const e = arenaFight(['scrambler', 'dummy'], { ice: [dummy('dummy', { core: 200 })] });
    const d = foes(e)[1];
    act(e, { type: 'combat/program', program: 'crack', target: d.uid });
    act(e, { type: 'combat/endTurn' });
    expect(e.state.combat!.status.scrambled.crack).toBeGreaterThan(0);
    expect(reject(e, { type: 'combat/program', program: 'crack', target: d.uid })).toMatch(/scrambled/);

    const c = cloneContent();
    c.implants.cold_cortex = { id: 'cold_cortex', name: 'Cold Cortex', humanity: 20, price: 1, mods: [{ mod: 'immune', status: 'scrambled' }], description: '' };
    const e2 = arenaFight(['scrambler', 'dummy'], { base: c, ice: [dummy('dummy', { core: 200 })], patch: { player: { implants: ['cold_cortex'] } } });
    act(e2, { type: 'combat/program', program: 'crack', target: foes(e2)[1].uid });
    act(e2, { type: 'combat/endTurn' });
    expect(e2.state.combat!.status.scrambled.crack ?? 0).toBe(0);
  });
  it('Tar Pit: Tarred costs a cycle next turn; Anchored blocks disengage and jack out', () => {
    const e = arenaFight(['tarpit']);
    act(e, { type: 'combat/endTurn' }); // tar
    expect(e.state.combat!.cycles).toBe(2);
    act(e, { type: 'combat/endTurn' }); // anchor
    expect(reject(e, { type: 'combat/disengage' })).toBe('Anchored');
    expect(reject(e, { type: 'combat/jackOut' })).toBe('Anchored');
  });
  it('Killer charges then hits x3', () => {
    const e = arenaFight(['killer'], { patch: { player: { hardware: { chassis: 1 } } } });
    const k = foes(e)[0];
    expect(k.intent).toBe('charge');
    act(e, { type: 'combat/endTurn' });
    expect(k.intent).toBe('execute');
    const before = e.state.player.integrity;
    act(e, { type: 'combat/endTurn' });
    const lvlBonus = k.bonus * BALANCE.ice.perLevelHit;
    expect(before - e.state.player.integrity).toBe(9 + lvlBonus - 2 /* firewall */);
  });
  it('Mirror reflects the same damage kind twice in a row', () => {
    const e = arenaFight(['mirror']);
    const m = foes(e)[0];
    act(e, { type: 'combat/program', program: 'crack', target: m.uid });
    const ev = act(e, { type: 'combat/program', program: 'crack', target: m.uid });
    expect(ev.find((x) => x.type === 'combat.damage')).toMatchObject({ reflected: expect.any(Number) });
    expect((ev.find((x) => x.type === 'combat.damage') as { reflected: number }).reflected).toBeGreaterThan(0);
  });
  it('Patcher heals hurt allies first', () => {
    const e = arenaFight(['patcher', 'dummy'], { ice: [dummy('dummy', { core: 40 })] });
    const [p, d] = foes(e);
    d.core = 10;
    expect(p.intent).toBe('poke'); // chosen before the damage
    act(e, { type: 'combat/endTurn' }); // poke, then re-chooses
    expect(p.intent).toBe('repair');
    act(e, { type: 'combat/endTurn' });
    expect(d.core).toBe(14);
  });
});

describe('daemons, botnet, reinforcements, phases', () => {
  it('a daemon uses RAM once (loadout only): a full loadout can start it; it acts at end of turn', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 200 })], patch: { ...progs(['pinger']), player: { ...progs(['pinger']).player, hardware: { ram: 0 } } } });
    act(e, { type: 'debug/set', patch: { player: { loadout: ['pinger', 'crack', 'spike', 'ping'] } } });
    expect(select.freeRam(e)).toBe(0); // RAM 4, four 1-RAM programs
    act(e, { type: 'combat/program', program: 'pinger' });
    expect(e.state.combat!.daemons).toHaveLength(1);
    expect(select.freeRam(e)).toBe(0);
    e.state.combat!.programs.pinger.cooldown = 0;
    expect(select.canDo(e, { type: 'combat/program', program: 'pinger' })).toMatchObject({ ok: false, reason: 'daemon already running' });
    const t = foes(e)[0];
    act(e, { type: 'combat/endTurn' });
    expect(t.core).toBe(198);
  });
  it('Siren calls a Sentry after 2 turns unless stunned or killed; captured Security blocks it', () => {
    const e = arenaFight(['siren']);
    act(e, { type: 'combat/endTurn' });
    act(e, { type: 'combat/endTurn' });
    expect(foes(e).length).toBe(1);
    act(e, { type: 'combat/endTurn' });
    expect(foes(e).map((i) => i.def)).toContain('sentry');

    const e2 = arenaFight(['siren']);
    e2.state.run!.securityCaptured = true;
    act(e2, { type: 'combat/endTurn' });
    act(e2, { type: 'combat/endTurn' });
    act(e2, { type: 'combat/endTurn' });
    expect(foes(e2).length).toBe(1);
  });
  it('boss phases: cannot skip a phase; new shell and intents', () => {
    const e = arenaFight(['headchef']);
    const b = foes(e)[0];
    b.shell.points = 0;
    b.core = 3;
    const ev = act(e, { type: 'combat/program', program: 'crack', target: b.uid });
    expect(types(ev)).toContain('combat.phase');
    expect(b.dead).toBe(false);
    expect(b.shell.type).toBe('crypt');
    expect(['fry', 'orderup']).toContain(b.intent);
  });
  it('botnet: DDoS stuns all, burns hosts by chance, uses a charge once per turn', () => {
    const c = cloneContent();
    c.perks.unlucky = { id: 'unlucky', name: 'Unlucky', description: '', mods: [{ mod: 'burnChance', mult: 100 }] };
    const hosts = [1, 2, 3].map((i) => ({ uid: `h${i}`, name: `host${i}`, power: 2, tier: 1, role: 'botnet' }));
    const e = arenaFight(['sentry', 'cipher'], { base: c, patch: { player: { hosts, perks: ['unlucky'], hardware: { uplink: 2 } } } });
    expect(e.state.combat!.charges).toBe(2);
    const ev = act(e, { type: 'combat/botnet', kind: 'ddos' });
    expect(foes(e).every((i) => i.status.stunned === 1)).toBe(true);
    expect(types(ev)).toContain('host.burned');
    expect(e.state.player.hosts.length).toBe(2);
    expect(reject(e, { type: 'combat/botnet', kind: 'swarm' })).toMatch(/already used/);
  });
  it('Marked: distributed crack +50%', () => {
    const c = cloneContent();
    c.programs.mark = { id: 'mark', name: 'mark', category: 'exploit', cost: 0, cooldown: 0, noise: 0, ram: 0, targeting: 'ice', price: 0, ops: [{ op: 'iceStatus', status: 'marked', value: 2 }], description: '' };
    const hosts = [{ uid: 'h1', name: 'h', power: 4, tier: 1, role: 'botnet' }];
    const e = arenaFight(['dummy'], { base: c, ice: [dummy('dummy', { core: 200 })], patch: { player: { hosts, hardware: { uplink: 1 }, programs: { mark: { corrupted: false } }, loadout: ['mark'] }, rng: 3 } });
    const t = foes(e)[0];
    act(e, { type: 'combat/program', program: 'mark', target: t.uid });
    act(e, { type: 'combat/botnet', kind: 'dcrack', target: t.uid });
    const dmg = BALANCE.botnet.dcrackBase + BALANCE.botnet.dcrackPerPower * 4;
    expect(200 - t.core).toBe(Math.round(dmg * BALANCE.botnet.markedMult));
  });
});

describe('leaving a fight (§6.7)', () => {
  it('disengage costs 2 cycles, ICE recovers half of what it lost, node stays hostile', () => {
    const e = arenaFight(['dummy'], { ice: [dummy('dummy', { core: 20 })] });
    const t = foes(e)[0];
    t.core = 10;
    act(e, { type: 'combat/disengage' });
    expect(e.state.combat).toBeNull();
    const rn = e.state.run!.nodes.gw;
    expect(rn.state).toBe('hostile');
    expect(rn.ice[0].core).toBe(15);
  });
  it('combat jack out: ICE takes its turn, then you leave with your haul', () => {
    const e = arenaFight(['sentry']);
    e.state.run!.haul.push({ uid: 'x', file: 'f', name: 'f', value: 10, encrypted: 0, tagged: false, system: 'arena' });
    const ev = act(e, { type: 'combat/jackOut' });
    expect(types(ev)).toContain('combat.playerHit');
    expect(e.state.run).toBeNull();
    expect(e.state.player.paydata.length).toBe(1);
  });
});

describe('interface ICE (finale vocabulary)', () => {
  it('Paywall: paying ends the fight as a win', () => {
    const e = arenaFight(['paywall'], { patch: { player: { credits: 2000 } } });
    act(e, { type: 'combat/endTurn' });
    expect(e.state.combat!.offer).toMatchObject({ credits: 999 });
    act(e, { type: 'combat/acceptOffer' });
    expect(e.state.combat).toBeNull();
    expect(e.state.player.credits).toBe(2000 - 999);
    expect(e.state.run!.nodes.gw.state).toBe('cleared');
  });
  it('EULA: unanswered demand costs you a turn', () => {
    const e = arenaFight(['eula']);
    act(e, { type: 'combat/endTurn' }); // EULA posts the demand
    expect(e.state.combat!.demand).not.toBeNull();
    const ev = act(e, { type: 'combat/endTurn' }); // not answered -> stunned -> next turn skipped
    expect(types(ev).filter((t) => t === 'combat.turnStart').length).toBeGreaterThanOrEqual(1);
    expect(ev.some((x) => x.type === 'combat.notify' && x.text.includes('stunned'))).toBe(true);
  });
  it('EULA answered: no penalty', () => {
    const e = arenaFight(['eula']);
    act(e, { type: 'combat/endTurn' });
    act(e, { type: 'combat/answerDemand' });
    expect(e.state.combat!.demand).toBeNull();
  });
  it('Garbage Collector evicts a loaded program', () => {
    const e = arenaFight(['gc']);
    const ev = act(e, { type: 'combat/endTurn' });
    const evicted = ev.find((x) => x.type === 'combat.evicted');
    expect(evicted).toBeTruthy();
    const id = (evicted as { program: string }).program;
    expect(select.programButtons(e).find((p) => p.id === id)!.blocked).toMatch(/evicted/);
  });
});
