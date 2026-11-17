// Heuristic bot policy. Each method makes one decision and returns the action (or null when it has
// nothing to do). Extend by subclassing Bot and overriding a method, or by editing the priority lists.
//
// The bot plays the full campaign: it follows jobs and story addresses, picks targets by its deck's tier,
// shops for hardware first (programs only as cheap upgrades of families it uses), uses keys and vaults,
// puts hosts into the Botnet when a DDoS gate is in its address book, walks into the deadmans trap, and plays
// the finale's ROOT ending.
import {
  select, type Action, type Engine, type Id, type HardwarePart, type ProgramDef, type BotnetActionKind, type GameState,
  type SystemDef,
} from '../engine/index.ts';

export class StuckError extends Error {
  readonly context: Record<string, unknown>;
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.context = context;
  }
}

export interface BotConfig {
  /** Core hardware parts, bought evenly (lowest tier first, ties by this order). */
  partPriority: HardwarePart[];
  /** Credits kept back when shopping. */
  reserve: number;
  /** Hang up when trace reaches this (with haul) / always at hardTrace. */
  greedTrace: number;
  hardTrace: number;
  /** Scrub heat above this. */
  scrubAbove: number;
  /** Max procedural IoT hosts the bot bothers to own (botnet fodder). */
  iotCap: number;
  /** Buy programs at all (off = pure hardware build, for balance checks). */
  buyPrograms: boolean;
  /**
   * Combat style. 'smart': one-step lookahead on forks whose RNG is reseeded (the bot cannot peek at the real
   * rolls). 'lazy': the button-masher the anti-spam rules are built to beat: always fires its hardest-hitting
   * attack program at the first ICE, never scans, shields, combos or uses the botnet. Lazy keeps the best version
   * of each attack program loaded (it buys upgrades like anyone) but loads nothing else.
   */
  combatStyle: 'smart' | 'lazy';
  /** Wall-clock budget per game (ms). The bot throws StuckError('wall clock') past it, so a sim never spins. */
  maxMs: number;
}

export const DEFAULT_CONFIG: BotConfig = {
  partPriority: ['cpu', 'firewall', 'chassis', 'ram', 'neural', 'uplink', 'mask', 'storage'],
  reserve: 40,
  greedTrace: 70,
  hardTrace: 85,
  scrubAbove: 48,
  iotCap: 12,
  buyPrograms: true,
  combatStyle: 'smart',
  maxMs: 60_000,
};

/** Program families the bot wants, in buy order. */
const WANTED_FAMILIES = [
  'lockpick', 'crowbar', 'umbrella', 'peek', 'cutout', 'wiggler', 'moustache', 'keysmash', 'bucket', 'lullaby', 'duct_tape',
  'decrypt', 'bounce', 'tinfoil', 'rainbow', 'brute', 'ram', 'pinger', 'guard_dog', 'needles', 'giftbox',
  'rootkit', 'chainletter', 'fever', 'mop', 'sonar', 'static', 'popcorn', 'lookout', 'pickpocket', 'tapeworm', 'flare',
];

const IMPLANT_ORDER = ['imp.wired_reflexes', 'imp.pain_editor', 'imp.ghost_glands', 'imp.botnet_spine', 'imp.eidetic_lens', 'imp.mnemonic_buffer', 'imp.cold_cortex'];

const PERK_ORDER = [
  'perk.polyglot', 'perk.cold_open', 'perk.combo_breaker', 'perk.second_wind', 'perk.iron_stomach', 'perk.ghost',
  'perk.deep_pockets', 'perk.slumlord', 'perk.quiet_hands', 'perk.worm_farmer', 'perk.packrat', 'perk.landlord',
  'perk.kiddie_forever', 'perk.market_maker',
];

/** Memory the bot keeps across decisions within one game. */
interface Memory {
  talked: Set<string>;
  skipNodes: Set<string>;      // system/node pairs judged too dangerous this run
  usedThisRun: Set<string>;    // repeatable IO nodes used this run
  runActions: number;
  lastTarget: Id | null;
  failedTargets: Record<Id, number>;
  patchTries: number;
  forkSeed: number;
}

export class Bot {
  readonly cfg: BotConfig;
  readonly mem: Memory = { talked: new Set(), skipNodes: new Set(), usedThisRun: new Set(), runActions: 0, lastTarget: null, failedTargets: {}, patchTries: 0, forkSeed: 0x9e3779b9 };

  private readonly started = Date.now();

  constructor(cfg: Partial<BotConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
  }

  /** Top-level: the next action, whatever screen we are on. */
  decide(e: Engine): Action | null {
    const s = e.state;
    if (Date.now() - this.started > this.cfg.maxMs) {
      throw new StuckError(`wall clock: over ${this.cfg.maxMs} ms`, { system: s.run?.system ?? 'hub', mode: s.mode, finale: s.meta.finale, flags: Object.keys(s.story.flags).filter((f) => /_done$|_started$/.test(f)).join(',') });
    }
    if (s.cinematic) return { type: 'ui/cinematicDone', id: s.cinematic.id };
    if (s.dialogue) return this.dialogue(e);
    if (s.player.pendingPerks) return { type: 'perk/choose', perk: this.pickPerk(e, s.player.pendingPerks) };
    if (s.meta.finale !== 'none' && s.meta.finale !== 'entered') {
      const f = this.finale(e);
      if (f) return f;
    }
    if (s.combat) return this.combat(e);
    if (s.run) return this.run(e);
    return this.hub(e);
  }

  // ---------------------------------------------------------------------------
  // Dialogue, perks, finale
  // ---------------------------------------------------------------------------

  dialogue(e: Engine): Action {
    const ch = select.dialogueChoices(e).filter((c) => c.enabled);
    if (!ch.length) throw new StuckError('dialogue with no enabled choices', { dialogue: e.state.dialogue });
    // prefer kind answers (they tend to give items), else the first
    const kind = ch.find((c) => /thank|please|careful|free/i.test(c.text));
    return { type: 'dialogue/choose', index: (kind ?? ch[0]).index };
  }

  pickPerk(_e: Engine, offered: Id[]): Id {
    const rank = (id: Id) => { const i = PERK_ORDER.indexOf(id); return i < 0 ? 99 : i; };
    return offered.slice().sort((a, b) => rank(a) - rank(b))[0];
  }

  /** The bot plays the ROOT ending: sudo, kill chairman, beat PATCH, kill patch. */
  finale(e: Engine): Action | null {
    const m = e.state.meta;
    // keyed on the meta flags; the stage is presentation (ENGINE_API §9)
    if (!m.root) return { type: 'meta/command', cmd: 'sudo', arg: m.rootKey.join('-') };
    if (!m.chairmanKilled) return { type: 'meta/command', cmd: 'kill', arg: 'chairman' };
    if (e.state.combat) return null; // in the PATCH fight: fight it out
    if (m.patchBroken) return { type: 'meta/command', cmd: 'kill', arg: 'patch' }; // ROOT
    // lost the botnet fight three times: let PATCH go (JAILBREAK) rather than loop forever
    if (this.mem.patchTries >= 3) return { type: 'meta/command', cmd: 'free', arg: 'patch' };
    this.mem.patchTries++;
    return { type: 'meta/command', cmd: 'kill', arg: 'patch' };
  }

  // ---------------------------------------------------------------------------
  // Hub
  // ---------------------------------------------------------------------------

  hub(e: Engine): Action | null {
    const s = e.state;
    const p = s.player;
    // jobs
    for (const j of select.jobsView(e)) {
      if (j.status === 'ready') return { type: 'job/turnIn', job: j.id };
      if (j.status === 'available' && select.canDo(e, { type: 'job/accept', job: j.id }).ok) return { type: 'job/accept', job: j.id };
    }
    // paydata
    const deliverables = new Set(select.jobsView(e).filter((j) => j.status === 'active' || j.status === 'ready' || j.status === 'available')
      .flatMap((j) => j.objectives.filter((o) => o.kind === 'deliver').map((o) => (o as { file: string }).file)));
    for (const pd of select.paydataView(e)) {
      if (deliverables.has(pd.file)) continue;
      if (pd.canDecrypt) return { type: 'paydata/decrypt', uid: pd.uid };
      if (pd.encrypted > 0 && this.canBuyDecrypt(e, pd.encrypted)) continue; // keep it until we can decrypt
      if (pd.tagged && p.heat > 30 && p.credits > pd.cleanCost + this.cfg.reserve && pd.cleanCost < pd.saleValue / 2) return { type: 'paydata/clean', uid: pd.uid };
      return { type: 'paydata/sell', uid: pd.uid };
    }
    // repairs and healing
    for (const [id, st] of Object.entries(p.programs)) {
      if (st.corrupted && p.credits >= select.repairCost(e, id)) return { type: 'program/repair', program: id };
    }
    const deck = Object.fromEntries(select.deck(e).map((d) => [d.part, d.value])) as Record<HardwarePart, number>;
    if (p.neural < deck.neural && p.credits >= select.neuralHealCost(e) + this.cfg.reserve) return { type: 'clinic/healNeural' };
    // heat
    if (p.heat > this.cfg.scrubAbove) {
      const per = select.scrubCostPerPoint(e);
      const rich = p.credits > 4000;
      const floor = rich ? 20 : 44;
      const pts = Math.min(Math.ceil(p.heat - floor), Math.floor((p.credits - this.cfg.reserve) / per));
      if (pts >= 4) return { type: 'fixer/scrubHeat', amount: pts };
    }
    // coin
    if (p.coin > 0.05 && (s.world.coinPrice > 110 || p.credits < 100)) return { type: 'coin/sell', amount: p.coin };
    // hosts
    const roles = this.hostRoles(e);
    if (roles) return roles;
    // shopping
    const buy = this.shop(e);
    if (buy) return buy;
    // loadout
    const lo = this.bestLoadout(e);
    if (lo && lo.join() !== p.loadout.join()) return { type: 'loadout/set', programs: lo };
    // jack in
    const target = this.pickTarget(e);
    if (target) {
      this.mem.lastTarget = target;
      this.mem.runActions = 0;
      this.mem.skipNodes.clear();
      this.mem.usedThisRun.clear();
      return { type: 'hub/jackIn', system: target };
    }
    return null;
  }

  canBuyDecrypt(e: Engine, strength: number): boolean {
    return Object.values(e.content.programs).some((d) => (d.decrypt ?? 0) >= strength && d.price > 0);
  }

  /** A DDoS gate in the address book that we still need to open: its power threshold. */
  gateNeed(e: Engine): number {
    let need = 0;
    for (const a of select.addressBook(e)) if (a.gate && !a.owned) need = Math.max(need, a.gate.needed);
    return need;
  }

  hostRoles(e: Engine): Action | null {
    const isIot = (h: { system?: string }) => !h.system || !!this.sysDef(e, h.system)?.procedural;
    const hosts = e.state.player.hosts.slice().sort((a, b) => (+isIot(b) - +isIot(a)) || b.power - a.power || a.uid.localeCompare(b.uid));
    const uplink = select.deck(e).find((d) => d.part === 'uplink')!.value;
    const gate = this.gateNeed(e);
    const want = new Map<string, string>();
    let power = 0;
    let botnet = 0;
    for (const h of hosts) {
      // Botnet: one host per uplink point for charges, and as many as a known gate needs.
      if (uplink > 0 && (botnet < uplink || (gate > 0 && power < gate))) {
        want.set(h.uid, 'botnet');
        botnet++;
        power += h.power;
      }
    }
    const rest = hosts.filter((h) => !want.has(h.uid));
    const proxies = e.state.player.heat > 40 ? Math.min(2, Math.floor(rest.length / 3)) : 0;
    rest.forEach((h, i) => want.set(h.uid, i < proxies ? 'proxy' : 'mine'));
    for (const h of hosts) {
      const r = want.get(h.uid)!;
      if (h.role !== r) return { type: 'botnet/setRole', host: h.uid, role: r as 'botnet' };
    }
    return null;
  }

  /** Owned version of a program family (0 = none). */
  familyVersion(e: Engine, family: string): number {
    let v = 0;
    for (const id of Object.keys(e.state.player.programs)) {
      const d = e.content.programs[id];
      if (d?.family === family) v = Math.max(v, d.version ?? 1);
    }
    return v;
  }

  shop(e: Engine): Action | null {
    const s = e.state;
    const p = s.player;
    const budget = p.credits - this.cfg.reserve;
    const tiers = p.hardware;
    // hardware: core parts evenly; secondary parts within one tier of the weakest core part
    const hwStock = select.vendorStock(e, 'hardware').filter((x) => x.available);
    const partOf = (ref?: string) => e.content.hardware.find((h) => h.id === ref)?.part;
    const core: HardwarePart[] = ['cpu', 'firewall', 'chassis', 'ram'];
    const coreMin = Math.min(...core.map((c) => tiers[c]));
    const gate = this.gateNeed(e);
    const blackSeen = !!s.story.flags['act2_started'];
    const wanted = (part: HardwarePart): boolean => {
      if (core.includes(part)) return tiers[part] <= coreMin;
      if (part === 'uplink') return p.hosts.length > 0 && (tiers.uplink < coreMin || (gate > 0 && select.botnetView(e).usablePower < gate));
      if (part === 'neural') return blackSeen && tiers.neural < coreMin;
      if (part === 'storage') return tiers.storage < coreMin;
      return tiers[part] < coreMin - 1;
    };
    // the attack upgrades are the cheapest big power spike: buy them before the next hardware tier
    for (const fam of ['lockpick', 'crowbar']) {
      const have = this.familyVersion(e, fam);
      const st = select.vendorStock(e, 'warez').find((x) => x.available && x.kind === 'program' && x.ref && e.content.programs[x.ref].family === fam && (e.content.programs[x.ref].version ?? 1) === have + 1);
      if (st && st.price <= budget * 0.8) return { type: 'shop/buy', vendor: 'warez', stock: st.id };
    }
    const nextHw = hwStock
      .filter((x) => { const part = partOf(x.ref); return !!part && wanted(part); })
      .sort((a, b) => {
        // a known DDoS gate we cannot open yet puts the Uplink first
        const gatePart = (x: typeof a) => (gate > 0 && partOf(x.ref) === 'uplink' && select.botnetView(e).usablePower < gate ? -1 : 0);
        return gatePart(a) - gatePart(b) || this.cfg.partPriority.indexOf(partOf(a.ref)!) - this.cfg.partPriority.indexOf(partOf(b.ref)!) || a.price - b.price;
      })[0];
    if (nextHw && nextHw.price <= budget) return { type: 'shop/buy', vendor: 'hardware', stock: nextHw.id };
    const saving = nextHw ? nextHw.price : 0;
    // story items and addresses the bot needs
    for (const st of select.vendorStock(e, 'broker')) {
      if (!st.available || st.price > budget) continue;
      if (st.kind === 'address' && budget > st.price * 3) return { type: 'shop/buy', vendor: 'broker', stock: st.id };
      if (st.kind === 'item' && st.ref && !p.items.includes(st.ref) && budget > st.price * 2) return { type: 'shop/buy', vendor: 'broker', stock: st.id };
    }
    // implants: when rich
    for (const id of IMPLANT_ORDER) {
      if (p.implants.includes(id)) continue;
      const st = select.vendorStock(e, 'clinic').find((x) => x.ref === id);
      if (st?.available && st.price * 2.5 <= budget && st.price <= budget - saving) return { type: 'shop/buy', vendor: 'clinic', stock: st.id };
    }
    // programs: upgrades of wanted families, cheap relative to the next hardware purchase
    if (!this.cfg.buyPrograms) return null;
    const encrypted = Math.max(0, ...p.paydata.map((x) => x.encrypted));
    for (const v of Object.keys(e.content.vendors)) {
      const offers = select.vendorStock(e, v).filter((st) => st.available && st.kind === 'program' && st.ref && st.price <= budget);
      for (const fam of WANTED_FAMILIES) {
        const have = this.familyVersion(e, fam);
        const best = offers.map((st) => ({ st, d: e.content.programs[st.ref!] }))
          .filter(({ d }) => d.family === fam && (d.version ?? 1) > have && !d.tags?.includes('joke'))
          .sort((a, b) => (b.d.version ?? 1) - (a.d.version ?? 1))[0];
        if (!best) continue;
        if (fam === 'decrypt' && (best.d.decrypt ?? 0) < encrypted) { /* still useful */ } else if (fam === 'decrypt' && encrypted === 0) continue;
        const essential = WANTED_FAMILIES.indexOf(fam) < 14;
        const surplus = budget - saving;
        const cheapEnough = essential ? best.st.price <= surplus * 0.7 : best.st.price <= surplus * 0.35;
        if (cheapEnough) return { type: 'shop/buy', vendor: v, stock: best.st.id };
      }
    }
    return null;
  }

  /** Greedy loadout: best version per family; one crack, one spike, scan, shield, then the rest by usefulness, within RAM. */
  bestLoadout(e: Engine): Id[] | null {
    const p = e.state.player;
    const ram = select.deck(e).find((d) => d.part === 'ram')!.value;
    const all = Object.keys(p.programs).filter((id) => !p.programs[id].corrupted)
      .map((id) => e.content.programs[id]).filter((d): d is ProgramDef => !!d && select.canDo(e, { type: 'loadout/set', programs: [d.id] }).ok);
    // best version per family
    const byFam = new Map<string, ProgramDef>();
    for (const d of all) {
      const f = d.family ?? d.id;
      const cur = byFam.get(f);
      if (!cur || (d.version ?? 1) > (cur.version ?? 1)) byFam.set(f, d);
    }
    const owned = [...byFam.values()];
    const has = (d: ProgramDef, pred: (o: ProgramDef['ops'][number]) => boolean) => d.ops.some(pred) || !!d.daemon?.ops.some(pred);
    const score = (d: ProgramDef): number => {
      if (d.tags?.includes('decrypt') || d.tags?.includes('joke')) return -1;
      const dmg = d.ops.reduce((a, o) => a + (o.op === 'damage' && o.kind !== 'worm' ? o.amount * (o.hits ?? 1) : 0), 0);
      if (d.id === 'prog.milspec_icebreaker' || d.id === 'prog.root_shell') return 80;
      if (d.category === 'attack' && dmg > 0) return 50 + dmg * 2 - d.cost * 2;
      if (has(d, (o) => o.op === 'iceStatus' && o.status === 'mapped') && d.category === 'exploit') return 45;
      if (has(d, (o) => o.op === 'shield')) return 44;
      if (has(d, (o) => o.op === 'playerStatus' && o.status === 'decoy')) return 40;
      if (d.category === 'attack') return 38; // worms
      if (has(d, (o) => o.op === 'iceStatus' && o.status === 'stunned')) return 36;
      if (d.tags?.includes('overflow')) return 30;
      if (has(d, (o) => o.op === 'iceStatus' && o.status === 'unstable')) return 29;
      if (d.category === 'daemon') return 27;
      if (has(d, (o) => o.op === 'neuralHeal')) return e.state.story.flags['act2_started'] ? 34 : 5;
      if (has(d, (o) => o.op === 'repair')) return 24;
      if (has(d, (o) => o.op === 'cleanse' && o.status === 'anchored')) return 22;
      if (d.category === 'exploit') return 20;
      if (d.category === 'stealth') return 18;
      return 10;
    };
    const pick: ProgramDef[] = [];
    let used = 0;
    const take = (d: ProgramDef | undefined) => {
      if (!d || pick.includes(d) || used + d.ram > ram || score(d) <= 0) return;
      pick.push(d);
      used += d.ram;
    };
    const bestOfKind = (kind: string) => owned.filter((d) => d.category === 'attack' && d.ops.some((o) => o.op === 'damage' && o.kind === kind)).sort((a, b) => score(b) - score(a))[0];
    take(owned.find((d) => d.id === 'prog.milspec_icebreaker'));
    take(bestOfKind('spike'));
    take(bestOfKind('crack'));
    if (this.cfg.combatStyle === 'lazy') return pick.length ? pick.map((d) => d.id) : null;
    for (const d of owned.slice().sort((a, b) => score(b) - score(a))) take(d);
    if (pick.length === 0) return null;
    return pick.map((d) => d.id);
  }

  sysDef(e: Engine, id: Id): SystemDef {
    return e.content.systems[id] ?? e.state.world.procSystems[id];
  }

  /** Value of files still lootable in an owned system (honeypots and locked vaults excluded); story items count 300. */
  lootLeft(e: Engine, id: Id): number {
    const s = e.state;
    const def = this.sysDef(e, id);
    let v = 0;
    for (const nd of def.nodes) {
      if (nd.type === 'honeypot') continue;
      if (nd.lock && !s.player.items.includes(nd.lock.item)) continue;
      for (const f of nd.files ?? []) {
        if (s.world.systems[id]?.looted.includes(f.id)) continue;
        if (f.kind === 'paydata') v += f.encrypted ? (f.value ?? 0) * 0.5 : f.value ?? 0;
        else if (f.kind === 'item' || f.kind === 'program' || f.kind === 'coin') v += 300;
      }
    }
    return v;
  }

  /** The bot's deck tier (1..5): the average tier of CPU, Firewall and Chassis, plus one. */
  deckTier(e: Engine): number {
    const h = e.state.player.hardware;
    return 1 + (h.cpu + h.firewall + h.chassis) / 3;
  }

  pickTarget(e: Engine): Id | null {
    const s = e.state;
    const book = select.addressBook(e).filter((a) => !a.jackIn && !a.gateBlocked);
    const deckTier = this.deckTier(e);
    const jobTargets = new Set(select.jobsView(e).filter((j) => j.status === 'active').map((j) => j.target).filter(Boolean));
    const iotOwned = s.player.hosts.filter((h) => h.system && this.sysDef(e, h.system)?.procedural).length;
    const scoreOf = (a: (typeof book)[number]): number => {
      const def = this.sysDef(e, a.system);
      if (a.system === e.content.setup.localhost) {
        // take back anything lost (burned or reclaimed) before the finale: Control % should be whole going in
        const lost = Object.values(e.content.systems).some((d) => d.capturable !== false && d.id !== a.system && !s.world.systems[d.id]?.owned && !!s.world.addressBook[d.id]);
        return lost ? 3 : 60;
      }
      let sc = a.hardened ? -15 : 0;
      if (jobTargets.has(a.system)) sc += a.tier <= deckTier + 0.5 ? 40 : 8;
      if (def.capturable === false && !def.procedural) {
        // the scripted trap: walk in once
        if (def.scriptedFailure) return s.story.flags['deadmans_done'] || s.stats.runsBySystem[a.system] ? -1 : 45;
        return -1;
      }
      if (!a.owned) {
        if (a.procedural) sc += iotOwned < this.cfg.iotCap ? 6 : -5;
        else sc += 35 - Math.max(0, a.tier - deckTier) * 22;
      } else {
        // an owned system has no ICE: its leftover files are free money
        const v = this.lootLeft(e, a.system);
        sc += v > 0 ? Math.min(45, 20 + v / 60) : -20;
      }
      sc -= (this.mem.failedTargets[a.system] ?? 0) * 6;
      return sc;
    };
    const ranked = book.map((a) => ({ a, sc: scoreOf(a) })).sort((x, y) => y.sc - x.sc || x.a.tier - y.a.tier);
    const top = ranked.find((x) => x.sc > 0);
    if (top) return top.a.system;
    // nothing good: still move (time only passes in systems). Prefer a fight we can earn from (unowned, cheapest
    // tier first), then IoT beyond the cap, then an owned router to netscan for new hosts.
    const unowned = book.filter((a) => !a.owned && this.sysDef(e, a.system).capturable !== false).sort((x, y) => x.tier - y.tier);
    if (unowned.length) return unowned[0].system;
    const router = book.find((a) => a.owned && !this.sysDef(e, a.system).procedural && this.sysDef(e, a.system).nodes.some((n) => n.type === 'router'));
    if (router) return router.system;
    return null;
  }

  // ---------------------------------------------------------------------------
  // Run (out of combat)
  // ---------------------------------------------------------------------------

  run(e: Engine): Action {
    const s = e.state;
    const run = s.run!;
    const map = select.mapView(e)!;
    const def = this.sysDef(e, run.system);
    const trapped = !!def.noJackOut;
    this.mem.runActions++;
    const chassis = select.deck(e).find((d) => d.part === 'chassis')!.value;
    const hurt = s.player.integrity < chassis * 0.35;
    if (!trapped && (run.trace >= this.cfg.hardTrace || (run.trace >= this.cfg.greedTrace && run.haul.length) || (hurt && run.haul.length))) {
      return { type: 'run/jackOut' };
    }
    if (this.mem.runActions > 400) throw new StuckError('run loop', { system: run.system, trace: run.trace });
    const can = (type: string, node: string) => map.nodes.find((n) => n.id === node)!.actions.find((a) => a.type === type)!.reason === null;
    const nodes = map.nodes.filter((n) => n.revealed && n.accessible);
    const order = ['core', 'security', 'router', 'vault', 'datastore', 'io', 'process', 'gateway', 'honeypot'];
    nodes.sort((a, b) => order.indexOf(a.realType) - order.indexOf(b.realType));
    // free value first
    for (const n of nodes) {
      if (can('run/capture', n.id) && (n.realType === 'core' || n.realType === 'router' || n.realType === 'security')) return { type: 'run/capture', node: n.id };
      if (can('run/netscan', n.id) && (!def.procedural)) {
        const iot = s.player.hosts.filter((h) => h.system && this.sysDef(e, h.system)?.procedural).length;
        const known = Object.keys(s.world.addressBook).filter((id) => s.world.procSystems[id] && !s.world.systems[id]?.owned).length;
        if (iot + known < this.cfg.iotCap) return { type: 'run/netscan', node: n.id };
      }
      if (can('run/loot', n.id)) {
        if (!n.probed && n.type === 'datastore' && can('run/probe', n.id)) return { type: 'run/probe', node: n.id };
        if (!(n.probed && n.realType === 'honeypot')) return { type: 'run/loot', node: n.id };
      }
      const nd = def.nodes.find((x) => x.id === n.id)!;
      if (can('run/use', n.id) && !this.mem.usedThisRun.has(n.id) && !(nd.use && !nd.use.once && run.trace > 50)) {
        this.mem.usedThisRun.add(n.id);
        return { type: 'run/use', node: n.id };
      }
      if (can('run/talk', n.id) && !this.mem.talked.has(`${run.system}/${n.id}`)) {
        this.mem.talked.add(`${run.system}/${n.id}`);
        return { type: 'run/talk', node: n.id };
      }
      if (can('run/unlock', n.id)) return { type: 'run/unlock', node: n.id };
      if (can('run/backdoor', n.id)) return { type: 'run/backdoor', node: n.id };
    }
    // fights: beeline to the Core (via Security when it is on the way); side branches after the Core is ours
    const dist = this.distances(e, def);
    const coreTaken = run.nodes[def.nodes.find((x) => x.type === 'core')?.id ?? '']?.state === 'captured';
    const fightOrder = nodes.slice().sort((a, b) => {
      const da = (a.realType === 'security' ? -1 : 0) + (dist[a.id] ?? 99);
      const db = (b.realType === 'security' ? -1 : 0) + (dist[b.id] ?? 99);
      return da - db;
    });
    for (const n of fightOrder) {
      const key = `${run.system}/${n.id}`;
      if (this.mem.skipNodes.has(key)) continue;
      if (!can('run/breach', n.id)) continue;
      const onPath = (dist[n.id] ?? 99) < 99 && n.realType !== 'honeypot';
      const sideTrip = !coreTaken && !onPath;
      if (sideTrip && !trapped && run.trace > 30) continue;
      if (!n.probed && can('run/probe', n.id) && !trapped) return { type: 'run/probe', node: n.id };
      const black = n.ice.some((i) => i.black);
      if (black && s.player.neural <= 6 && !trapped) { this.mem.skipNodes.add(key); continue; }
      if (hurt && !trapped) continue;
      // only start a fight the trace budget can pay for
      if (!trapped && run.trace + this.fightTrace(e, n.realType === 'core' ? 6 : 4) > 96) continue;
      return { type: 'run/breach', node: n.id };
    }
    // capture anything else that is cleared (xp)
    for (const n of nodes) if (can('run/capture', n.id) && n.state === 'cleared' && n.realType !== 'honeypot') return { type: 'run/capture', node: n.id };
    if (trapped) {
      // nowhere left to go in the trap: probe to pass time (each probe adds trace)
      const any = map.nodes.find((n) => n.revealed && can('run/probe', n.id));
      if (any) return { type: 'run/probe', node: any.id };
    }
    return { type: 'run/jackOut' };
  }

  /** Hops from each node to the Core (vaults count as walls unless we hold their key). 99 = not on a path. */
  distances(e: Engine, def: SystemDef): Record<string, number> {
    const adj: Record<string, string[]> = {};
    for (const n of def.nodes) adj[n.id] ??= [];
    for (const n of def.nodes) for (const l of n.links) { adj[n.id].push(l); (adj[l] ??= []).push(n.id); }
    const core = def.nodes.find((n) => n.type === 'core');
    const out: Record<string, number> = {};
    if (!core) return out;
    const blocked = (id: string) => { const n = def.nodes.find((x) => x.id === id)!; return !!n.lock && !e.state.player.items.includes(n.lock.item); };
    const q = [core.id];
    out[core.id] = 0;
    while (q.length) {
      const id = q.shift()!;
      for (const nb of adj[id]) if (out[nb] === undefined && !blocked(nb)) { out[nb] = out[id] + 1; q.push(nb); }
    }
    return out;
  }

  /** Rough trace a fight of `turns` turns will add here (formula + Bloodhound-style ICE). */
  fightTrace(e: Engine, turns: number): number {
    const s = e.state;
    const run = s.run!;
    const def = this.sysDef(e, run.system);
    const mask = select.deck(e).find((d) => d.part === 'mask')!.value;
    let per = Math.max(0, 1 + def.security + 2 - mask * 0.5) + (def.traceLock ?? 0);
    if (run.securityCaptured) per *= 0.5;
    return per * turns;
  }

  // ---------------------------------------------------------------------------
  // Combat: one-step lookahead on forked engines
  // ---------------------------------------------------------------------------

  combat(e: Engine): Action {
    const s = e.state;
    const cs = s.combat!;
    if (cs.demand) return { type: 'combat/answerDemand' };
    if (cs.offer && s.player.credits > cs.offer.credits * 2) return { type: 'combat/acceptOffer' };
    // bail out when it is going badly
    const view = select.combatView(e)!;
    const incoming = view.ice.reduce((a, i) => a + (i.intent.skipped ? 0 : i.intent.damage ?? 3), 0);
    const neuralThreat = view.ice.some((i) => i.black);
    if (cs.context === 'node' && cs.turn > 1 && cs.cycles === view.cycles) {
      const dying = s.player.integrity <= Math.max(0, incoming - cs.shield) + 1;
      const neuralDying = neuralThreat && s.player.neural <= 4;
      const tracedSoon = (s.run?.trace ?? 0) >= 92;
      if ((dying || neuralDying || tracedSoon) && select.canDo(e, { type: 'combat/jackOut' }).ok) return { type: 'combat/jackOut' };
    }
    const legal = select.legalActions(e).filter((a) =>
      a.type === 'combat/program' || a.type === 'combat/botnet' || a.type === 'combat/acceptOffer');
    if (this.cfg.combatStyle === 'lazy') return this.lazyCombat(e);
    let best: { a: Action; sc: number } | null = null;
    const base = this.evaluate(e, e.state);
    // honest lookahead: every fork rolls with a seed the real game will not use
    const seed = (this.mem.forkSeed = (Math.imul(this.mem.forkSeed ^ 0x5bd1e995, 0x27d4eb2d) + 0x165667b1) >>> 0);
    for (const a of legal) {
      const f = e.fork();
      (f.state as GameState).rng = seed | 0;
      f.dispatch(a);
      let sc = this.evaluate(e, f.state) - base;
      if (a.type === 'combat/botnet') sc -= this.botnetCost(a.kind) + this.burnRisk(e);
      if (!best || sc > best.sc) best = { a, sc };
    }
    if (best && best.sc > 0.01) return best.a;
    return { type: 'combat/endTurn' };
  }

  /** The button-masher: hardest raw hit, first enemy, until out of cycles. */
  lazyCombat(e: Engine): Action {
    const cs = e.state.combat!;
    const target = cs.ice.find((i) => !i.dead && !i.subverted);
    // lazy, not blind: it does read the shell type (crack on crypt, spike on walls), nothing else
    const good = target?.shell.points ? (target.shell.type === 'crypt' ? 'crack' : 'spike') : null;
    const raw = (id: string) => (e.content.programs[id]?.ops ?? []).reduce((a, o) => a + (o.op === 'damage' && o.kind !== 'worm' ? o.amount * (o.hits ?? 1) * (good && o.kind === good ? 2 : 1) : 0), 0);
    const attacks = Object.keys(cs.programs).filter((id) => raw(id) > 0 && select.canDo(e, { type: 'combat/program', program: id, ...(target ? { target: target.uid } : {}) }).ok)
      .sort((a, b) => raw(b) - raw(a) || a.localeCompare(b));
    if (attacks.length && target) return { type: 'combat/program', program: attacks[0], target: target.uid };
    return { type: 'combat/endTurn' };
  }

  /** Expected cost of a botnet burn: cheap while IoT fodder is in the pool, steep when a system host could go. */
  burnRisk(e: Engine): number {
    const pool = e.state.player.hosts.filter((h) => h.role === 'botnet');
    const iot = pool.some((h) => !h.system || !!this.sysDef(e, h.system)?.procedural);
    const p = select.botnetPreview(e, 'ddos').burnChance;
    return iot ? p * 20 : p * 400;
  }

  botnetCost(kind: BotnetActionKind): number {
    return kind === 'bounce' ? 6 : 5;
  }

  /** Higher is better for the player. */
  evaluate(e: Engine, s: GameState): number {
    if (s.mode === 'flatlined') return -5000;
    const cs = s.combat;
    if (!cs) {
      // fight over: victory (still in run / hub) is great, being dumped is terrible
      if (s.run && s.player.integrity > 0) return 1000 + s.player.integrity;
      return s.mode === 'hub' && s.player.integrity > 0 ? 500 : -1000;
    }
    let sc = 0;
    const kindAdv = (shellType: string) => (shellType === 'none' ? 1 : 0.7);
    let incoming = 0;
    for (const i of cs.ice) {
      if (i.dead) { sc += 40; continue; }
      if (i.subverted) { sc += 35; continue; }
      const def = e.content.ice[i.def];
      sc -= i.core * 2 + i.shell.points * kindAdv(i.shell.type);
      // a boss phase still ahead is core the bot has not seen yet: entering it is progress, not a setback
      sc -= ((def.phases?.length ?? 0) - i.phase) * i.coreMax * 0.8;
      sc += i.status.stunned * 6 + i.status.slowed * 4 + (i.status.critReady ? 3 : 0) + i.status.unstable * 1.2
        + i.status.infected * 1.5 + (i.status.rootable ? 6 : i.status.backdoored ? 3 : 0) + i.status.exposed * 2 + i.status.marked;
      if (i.status.stunned === 0 && i.status.slowed === 0) {
        let intents = def.intents;
        for (let ph = 0; ph < i.phase && def.phases; ph++) intents = def.phases[ph].intents ?? intents;
        const intent = intents.find((x) => x.id === i.intent);
        for (const op of intent?.ops ?? []) if (op.op === 'hit') incoming += (op.amount + i.bonus) * (op.hits ?? 1) * (op.neural ? 3 : 1);
      }
    }
    const shieldUse = Math.min(cs.shield, incoming);
    const through = Math.max(0, incoming - cs.shield);
    sc += shieldUse * 1.6 + Math.min(cs.status.decoy, 1) * Math.min(incoming, 10) * (through > 0 ? 1.4 : 0.15);
    sc -= cs.noise * 0.35; // this turn's program noise becomes trace at End Turn
    sc += s.player.integrity * 1.5 + s.player.neural * 4;
    sc -= (s.run?.trace ?? 0) * 0.4;
    sc += cs.categories.length * 0.8;
    sc += cs.charges * 2;
    return sc;
  }
}
