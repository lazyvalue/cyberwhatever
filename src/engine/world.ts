// World clock (cycles), heat, $HODL price walk, mining, botnet host math, xp/rep, ownership.
import { BALANCE } from './balance.ts';
import {
  type K, emit, log, multMod, progress, r, stat, systemDef, uid, clamp, modsOf,
} from './core.ts';
import { gauss, pick, shuffle } from './rng.ts';
import type { Ctx, HeatLevel, Host, HostRole, Id } from './types.ts';

// ---------------------------------------------------------------------------
// Heat
// ---------------------------------------------------------------------------

export function heatLevel(heat: number): HeatLevel {
  const H = BALANCE.heat;
  if (heat >= H.raid) return 'raid';
  if (heat >= H.burned) return 'burned';
  if (heat >= H.hunted) return 'hunted';
  if (heat >= H.noticed) return 'noticed';
  return 'cool';
}

const HEAT_ORDER: HeatLevel[] = ['cool', 'noticed', 'hunted', 'burned', 'raid'];

function emitHeatThresholds(k: K, before: number, after: number): void {
  const a = HEAT_ORDER.indexOf(heatLevel(before));
  const b = HEAT_ORDER.indexOf(heatLevel(after));
  if (b > a) for (let i = a + 1; i <= b; i++) emit(k, { type: 'heat.threshold', level: HEAT_ORDER[i], rising: true });
  if (b < a) for (let i = a - 1; i >= b; i--) emit(k, { type: 'heat.threshold', level: HEAT_ORDER[i], rising: false });
}

/** Proxy reduction factor for heat gains (0..proxyHeatMax). */
export function proxyHeatReduction(c: Ctx): number {
  return Math.min(BALANCE.heat.proxyHeatMax, proxyPower(c) * BALANCE.heat.proxyHeatPerPower);
}

/** Add heat. Positive gains are reduced by proxies and heatGain modifiers unless raw. */
export function addHeat(k: K, amount: number, reason: string, raw = false): void {
  const p = k.state.player;
  let a = amount;
  if (a > 0 && !raw) a *= (1 - proxyHeatReduction(k)) * multMod(k, 'heatGain');
  const before = p.heat;
  p.heat = clamp(before + a, 0, 100);
  const d = p.heat - before;
  if (Math.abs(d) < 1e-9) return;
  emit(k, { type: 'heat.changed', value: p.heat, delta: d });
  if (reason) log(k, `heat ${d > 0 ? '+' : ''}${Math.round(d * 10) / 10} (${reason})`, 'info');
  emitHeatThresholds(k, before, p.heat);
}

export function setHeat(k: K, value: number): void {
  addHeat(k, value - k.state.player.heat, 'set', true);
}

// ---------------------------------------------------------------------------
// Hosts / botnet
// ---------------------------------------------------------------------------

export function hostPower(c: Ctx, h: Host): number {
  let p = h.power;
  for (const m of modsOf(c, 'hostPower')) if (m.tier === h.tier) p += m.add;
  return p;
}

function rolePower(c: Ctx, role: HostRole): number {
  return c.state.player.hosts.filter((h) => h.role === role).reduce((a, h) => a + hostPower(c, h), 0);
}

export function botnetPower(c: Ctx): number {
  let p = rolePower(c, 'botnet');
  for (const m of modsOf(c, 'botnetPower')) p += m.add;
  return Math.max(0, p);
}

export function usableBotnetPower(c: Ctx): number {
  return Math.min(botnetPower(c), stat(c, 'uplink') * BALANCE.botnet.uplinkPowerPerPoint);
}

export function miningPower(c: Ctx): number {
  return rolePower(c, 'mine');
}

export function proxyPower(c: Ctx): number {
  let m = 1;
  for (const mod of modsOf(c, 'proxyMult')) m *= mod.mult;
  return rolePower(c, 'proxy') * m;
}

export function chargesPerRun(c: Ctx): number {
  const hosts = c.state.player.hosts.filter((h) => h.role === 'botnet').length;
  let n = Math.min(stat(c, 'uplink'), hosts);
  if (hosts > 0) for (const m of modsOf(c, 'charges')) n += m.add;
  return Math.max(0, n);
}

export function addHost(k: K, name: string, power: number, tier: number, system?: Id, role: HostRole = 'idle'): Host {
  const h: Host = { uid: uid(k, 'h'), name, power, tier, role, ...(system ? { system } : {}) };
  k.state.player.hosts.push(h);
  emit(k, { type: 'host.added', uid: h.uid, name, power });
  trackBotnetPeak(k);
  return h;
}

export function trackBotnetPeak(k: K): void {
  const n = k.state.player.hosts.filter((x) => x.role === 'botnet').length;
  if (n > (k.state.stats.botnetPeak ?? 0)) k.state.stats.botnetPeak = n;
}

/** Remove a host. If it is an owned system's host, the system is lost. */
export function burnHost(k: K, h: Host): void {
  const hosts = k.state.player.hosts;
  const i = hosts.indexOf(h);
  if (i < 0) return;
  hosts.splice(i, 1);
  k.state.stats.hostsBurned++;
  emit(k, { type: 'host.burned', uid: h.uid, name: h.name, role: h.role, ...(h.system ? { system: h.system } : {}) });
  log(k, `host burned: ${h.name}`, 'warn');
  if (h.system) loseSystem(k, h.system, 'burned');
}

/** Burn one host from `pool`, weighted toward low power (IoT fodder burns first). */
export function burnRandomHost(k: K, all: Host[]): Host | null {
  // IoT / procedural hosts burn first; a story-system host burns only when nothing else is in the pool
  const expendable = all.filter((h) => !h.system || !!k.state.world.procSystems[h.system]);
  const pool = expendable.length ? expendable : all;
  if (pool.length === 0) return null;
  const total = pool.reduce((a, h) => a + 1 / Math.max(1, h.power), 0);
  let x = r(k) * total;
  for (const h of pool) {
    x -= 1 / Math.max(1, h.power);
    if (x < 0) {
      burnHost(k, h);
      return h;
    }
  }
  burnHost(k, pool[pool.length - 1]);
  return pool[pool.length - 1];
}

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

export function ownSystem(k: K, system: Id): void {
  const p = progress(k, system);
  if (p.owned) return;
  const def = systemDef(k, system);
  p.owned = true;
  k.state.stats.systemsOwned++;
  const power = def.hostPower ?? (def.procedural ? BALANCE.hosts.iotPower : def.tier);
  addHost(k, def.address, power, def.tier, system);
  emit(k, { type: 'system.owned', system });
  log(k, `${def.address} is yours.`, 'info');
}

export function loseSystem(k: K, system: Id, reason: 'reclaimed' | 'burned' | 'story'): void {
  const p = progress(k, system);
  if (!p.owned) return;
  p.owned = false;
  p.patch += BALANCE.ice.patchLevels;
  const hosts = k.state.player.hosts;
  const i = hosts.findIndex((h) => h.system === system);
  if (i >= 0) hosts.splice(i, 1);
  emit(k, { type: 'system.lost', system, reason });
  log(k, `lost ${systemDef(k, system).address} (${reason})`, 'warn');
}

// ---------------------------------------------------------------------------
// XP / rep / perks
// ---------------------------------------------------------------------------

export function levelForXp(xp: number): number {
  const t = BALANCE.xp.table;
  let lvl = 1;
  for (let i = 0; i < t.length; i++) if (xp >= t[i]) lvl = i + 1;
  return Math.min(10, lvl);
}

export function addXp(k: K, amount: number): void {
  if (amount <= 0) return;
  const p = k.state.player;
  const a = Math.round(amount * multMod(k, 'xp'));
  p.xp += a;
  emit(k, { type: 'xp.gained', amount: a, total: p.xp });
  const lvl = levelForXp(p.xp);
  while (p.rep < lvl) {
    p.rep++;
    emit(k, { type: 'rep.levelUp', level: p.rep });
    log(k, `rep level ${p.rep}`, 'info');
    if ((BALANCE.xp.perkLevels as readonly number[]).includes(p.rep)) offerPerks(k);
  }
}

export function offerPerks(k: K): void {
  const p = k.state.player;
  const pool = Object.values(k.content.perks)
    .filter((d) => !p.perks.includes(d.id) && (d.minLevel ?? 0) <= p.rep)
    .map((d) => d.id);
  if (pool.length === 0) return;
  const offer = shuffle(k.state, pool.slice()).slice(0, BALANCE.xp.perkOffer);
  // if a choice is already pending, merge (rare: two levels at once)
  p.pendingPerks = p.pendingPerks ? Array.from(new Set([...p.pendingPerks, ...offer])) : offer;
  emit(k, { type: 'perk.offered', perks: p.pendingPerks });
}

// ---------------------------------------------------------------------------
// Coin
// ---------------------------------------------------------------------------

export function setCoinPrice(k: K, price: number): void {
  const w = k.state.world;
  const E = BALANCE.economy;
  const prev = w.coinPrice;
  w.coinPrice = Math.round(clamp(price, E.priceMin, E.priceMax) * 100) / 100;
  w.coinHistory.push(w.coinPrice);
  if (w.coinHistory.length > E.historyLength) w.coinHistory.splice(0, w.coinHistory.length - E.historyLength);
  emit(k, { type: 'coin.price', price: w.coinPrice, prev });
}

function priceStep(k: K): void {
  const E = BALANCE.economy;
  const p = k.state.world.coinPrice;
  const drift = E.priceMeanRevert * Math.log(E.priceMean / p);
  const next = p * Math.exp(drift + E.priceVol * gauss(k.state));
  setCoinPrice(k, next);
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

/**
 * Advance the world clock by n cycles. Called for every in-system node action and
 * every combat turn. Never called in the Hub.
 */
export function advanceCycles(k: K, n: number): void {
  if (n <= 0) return;
  const s = k.state;
  const E = BALANCE.economy;
  const H = BALANCE.heat;
  let mined = 0;
  const heatBefore = s.player.heat;
  const mining = miningPower(k);
  const miningHosts = s.player.hosts.filter((h) => h.role === 'mine').length;
  const coinRate = mining * E.coinPerPowerPerCycle * multMod(k, 'mining');
  const drip = miningHosts * H.miningDripPerHost * (1 - proxyHeatReduction(k)) * multMod(k, 'heatGain');
  for (let i = 0; i < n; i++) {
    s.cycle++;
    if (s.run) s.stats.cyclesBySystem[s.run.system] = (s.stats.cyclesBySystem[s.run.system] ?? 0) + 1;
    mined += coinRate;
    s.player.heat = clamp(s.player.heat + drip - H.decayPerCycle, 0, 100);
    if (s.cycle >= s.world.nextPriceCycle) {
      priceStep(k);
      s.world.nextPriceCycle = s.cycle + E.priceEvery;
    }
    if (s.cycle >= s.world.nextReclaimCycle) {
      s.world.nextReclaimCycle = s.cycle + H.reclaimInterval;
      if (s.player.heat >= H.burned) reclaimRoll(k);
    }
  }
  if (mined > 0) {
    s.player.coin = Math.round((s.player.coin + mined) * 10000) / 10000;
    emit(k, { type: 'coin.mined', amount: mined });
  }
  if (Math.abs(s.player.heat - heatBefore) > 1e-9) {
    emit(k, { type: 'heat.changed', value: s.player.heat, delta: s.player.heat - heatBefore });
    emitHeatThresholds(k, heatBefore, s.player.heat);
  }
  emit(k, { type: 'cycle.tick', cycle: s.cycle, count: n });
}

function reclaimRoll(k: K): void {
  if (r(k) >= BALANCE.heat.reclaimChance) return;
  const owned = Object.entries(k.state.world.systems)
    .filter(([id, p]) => p.owned && !systemDef(k, id).noReclaim && k.state.run?.system !== id)
    .map(([id]) => id);
  if (owned.length === 0) return;
  loseSystem(k, pick(k.state, owned), 'reclaimed');
}

