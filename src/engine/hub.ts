// §9 economy and hub actions: vendors, loadout, paydata, coin, exchange, clinic, fixer, botnet roles.
import { BALANCE } from './balance.ts';
import {
  type K, emit, reject, stat, addCredits, spend, addItem, addProgram, addAddress, changeHumanity, message,
  multMod, hardwareDef, programDef, log, modifiers, HARDWARE_PARTS,
} from './core.ts';
import { addHeat, setCoinPrice, trackBotnetPeak } from './world.ts';
import { applyStoryOps, evalCond } from './story.ts';
import { generateEndlessSystem } from './procgen.ts';
import { takeFile } from './run.ts';
import type { Ctx, HardwarePart, HostRole, Id, StockDef, Paydata } from './types.ts';

export function requireHub(c: Ctx): void {
  if (c.state.mode !== 'hub') reject('only in the hub');
  if (c.state.combat) reject('in combat');
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export function priceMult(c: Ctx): number {
  let m = multMod(c, 'shopPrice');
  if (c.state.player.heat >= BALANCE.heat.burned) m *= BALANCE.heat.burnedShopMult;
  return m;
}

export interface StockView {
  id: Id;
  kind: StockDef['kind'];
  ref?: Id;
  name: string;
  description: string;
  price: number;
  available: boolean;
  reason?: string;
}

function autoStock(c: Ctx, kind: 'hardware' | 'programs' | 'implants'): StockDef[] {
  if (kind === 'hardware') {
    return c.content.hardware.filter((h) => h.tier > 0).map((h) => ({
      id: `hw:${h.id}`, kind: 'hardware', ref: h.id, price: h.price, ...(h.minRep ? { minRep: h.minRep } : {}),
    }));
  }
  if (kind === 'programs') {
    return Object.values(c.content.programs).filter((p) => p.price > 0).map((p) => ({
      id: `prog:${p.id}`, kind: 'program', ref: p.id, price: p.price, ...(p.minRep ? { minRep: p.minRep } : {}),
    }));
  }
  return Object.values(c.content.implants).map((i) => ({
    id: `imp:${i.id}`, kind: 'implant', ref: i.id, price: i.price, ...(i.minRep ? { minRep: i.minRep } : {}),
  }));
}

export function vendorEntries(c: Ctx, vendorId: Id): StockDef[] {
  const v = c.content.vendors[vendorId];
  if (!v) return [];
  return [...(v.autoStock ? autoStock(c, v.autoStock) : []), ...v.stock];
}

function stockName(c: Ctx, e: StockDef): { name: string; description: string } {
  switch (e.kind) {
    case 'program': {
      const p = c.content.programs[e.ref!];
      return { name: e.name ?? p?.name ?? e.ref!, description: p?.description ?? '' };
    }
    case 'hardware': {
      const h = c.content.hardware.find((x) => x.id === e.ref);
      return { name: e.name ?? h?.name ?? e.ref!, description: h ? `${h.part} tier ${h.tier}: ${h.value}${h.flavor ? ` — ${h.flavor}` : ''}` : '' };
    }
    case 'implant': {
      const i = c.content.implants[e.ref!];
      return { name: e.name ?? i?.name ?? e.ref!, description: i ? `${i.description} (−${i.humanity} humanity)` : '' };
    }
    case 'item': {
      const i = c.content.items[e.ref!];
      return { name: e.name ?? i?.name ?? e.ref!, description: i?.description ?? '' };
    }
    case 'address': {
      const sys = c.content.systems[e.ref!];
      return { name: e.name ?? sys?.address ?? e.ref!, description: sys ? `tier ${sys.tier} — ${sys.owner}` : '' };
    }
    default: return { name: e.name ?? e.id, description: e.text ?? '' };
  }
}

export function stockBlockReason(c: Ctx, vendorId: Id, e: StockDef): string | null {
  const s = c.state;
  const v = c.content.vendors[vendorId];
  if (v?.cond && !evalCond(c, v.cond)) return 'vendor unavailable';
  if (e.minRep && s.player.rep < e.minRep) return `needs rep ${e.minRep}`;
  if (e.cond && !evalCond(c, e.cond)) return 'not available yet';
  const once = e.once ?? (e.kind === 'item' || e.kind === 'address' || e.kind === 'info' || e.kind === 'file');
  if (once && s.story.bought.includes(`${vendorId}:${e.id}`)) return 'sold out';
  switch (e.kind) {
    case 'program': if (s.player.programs[e.ref!]) return 'owned'; break;
    case 'hardware': {
      const h = c.content.hardware.find((x) => x.id === e.ref);
      if (!h) return 'unknown part';
      if (s.player.hardware[h.part] >= h.tier) return 'owned';
      if (s.player.hardware[h.part] < h.tier - 1) return `needs tier ${h.tier - 1} first`;
      break;
    }
    case 'implant': if (s.player.implants.includes(e.ref!)) return 'installed'; break;
    case 'item': if (s.player.items.includes(e.ref!)) return 'owned'; break;
    case 'address': if (s.world.addressBook[e.ref!]) return 'known'; break;
  }
  const price = Math.round(e.price * priceMult(c));
  if (s.player.credits < price) return `needs ${price} ¤`;
  return null;
}

export function vendorStock(c: Ctx, vendorId: Id): StockView[] {
  return vendorEntries(c, vendorId).map((e) => {
    const why = stockBlockReason(c, vendorId, e);
    const { name, description } = stockName(c, e);
    return {
      id: e.id, kind: e.kind, ...(e.ref ? { ref: e.ref } : {}), name, description,
      price: Math.round(e.price * priceMult(c)), available: why === null, ...(why ? { reason: why } : {}),
    };
  });
}

export function buy(k: K, vendorId: Id, stockId: Id): void {
  requireHub(k);
  const v = k.content.vendors[vendorId];
  if (!v) reject('unknown vendor');
  const e = vendorEntries(k, vendorId).find((x) => x.id === stockId);
  if (!e) reject('not in stock');
  const why = stockBlockReason(k, vendorId, e);
  if (why) reject(why);
  const price = Math.round(e.price * priceMult(k));
  spend(k, price, `${v.name}: ${stockName(k, e).name}`);
  const s = k.state;
  switch (e.kind) {
    case 'program': addProgram(k, e.ref!); break;
    case 'hardware': {
      const h = k.content.hardware.find((x) => x.id === e.ref)!;
      s.player.hardware[h.part] = h.tier;
      emit(k, { type: 'hardware.changed', part: h.part, tier: h.tier });
      if (h.part === 'chassis') s.player.integrity = stat(k, 'chassis');
      if (h.part === 'neural') s.player.neural = Math.min(stat(k, 'neural'), s.player.neural + (h.value - (hardwareDef(k, 'neural', h.tier - 1)?.value ?? 0)));
      break;
    }
    case 'implant': {
      const imp = k.content.implants[e.ref!];
      s.player.implants.push(imp.id);
      changeHumanity(k, -imp.humanity);
      emit(k, { type: 'implant.installed', implant: imp.id });
      s.player.integrity = stat(k, 'chassis');
      break;
    }
    case 'item': addItem(k, e.ref!); break;
    case 'address': addAddress(k, e.ref!, `vendor:${vendorId}`); break;
    case 'info': message(k, v.npc ?? vendorId, e.text ?? '', 'dm', stockName(k, e).name); break;
    case 'service': break;
    case 'file': if (e.file) takeFile(k, e.file, 'vendor:' + vendorId); break;
  }
  s.story.bought.push(`${vendorId}:${e.id}`);
  emit(k, { type: 'shop.bought', vendor: vendorId, stock: e.id, kind: e.kind, ref: e.ref ?? e.file?.id ?? null, price });
  applyStoryOps(k, e.ops);
}

// ---------------------------------------------------------------------------
// Programs and loadout
// ---------------------------------------------------------------------------

export function loadoutBlockReason(c: Ctx, programs: Id[]): string | null {
  const s = c.state;
  if (new Set(programs).size !== programs.length) return 'duplicate program';
  let ram = 0;
  for (const id of programs) {
    const owned = s.player.programs[id];
    const def = c.content.programs[id];
    if (!def || !owned) return `not owned: ${id}`;
    if (owned.corrupted) return `${def.name} is corrupted`;
    for (const [part, tier] of Object.entries(def.requires ?? {}) as [HardwarePart, number][]) {
      if (s.player.hardware[part] < tier) return `${def.name} needs ${part} tier ${tier}`;
    }
    ram += def.ram;
  }
  if (ram > stat(c, 'ram')) return `needs ${ram} RAM (have ${stat(c, 'ram')})`;
  return null;
}

export function setLoadout(k: K, programs: Id[]): void {
  requireHub(k);
  const why = loadoutBlockReason(k, programs);
  if (why) reject(why);
  k.state.player.loadout = programs.slice();
  emit(k, { type: 'loadout.changed', programs: programs.slice() });
}

export function sellProgram(k: K, id: Id): void {
  requireHub(k);
  const p = k.state.player;
  if (!p.programs[id]) reject('not owned');
  if (p.loadout.includes(id)) reject('unload it first');
  const def = programDef(k, id);
  const value = Math.round(def.sellValue ?? def.price * BALANCE.economy.programSellRatio);
  delete p.programs[id];
  addCredits(k, value, `sold ${def.name}`);
  emit(k, { type: 'program.sold', program: id, credits: value });
}

export function repairCost(c: Ctx, id: Id): number {
  const def = c.content.programs[id];
  const E = BALANCE.economy;
  return Math.max(E.repairMin, Math.round((def?.price ?? 0) * E.repairCostRatio));
}

export function repairProgram(k: K, id: Id): void {
  requireHub(k);
  const owned = k.state.player.programs[id];
  if (!owned?.corrupted) reject('not corrupted');
  spend(k, repairCost(k, id), `repair ${id}`);
  owned.corrupted = false;
  emit(k, { type: 'program.repaired', program: id });
}

// ---------------------------------------------------------------------------
// Paydata / fence
// ---------------------------------------------------------------------------

function findPaydata(k: K, uidStr: string): Paydata {
  const pd = k.state.player.paydata.find((p) => p.uid === uidStr);
  if (!pd) reject('no such file');
  return pd;
}

export function saleValue(c: Ctx, pd: Paydata): number {
  let m = 1;
  for (const mod of modifiers(c)) if (mod.mod === 'saleValue') m *= mod.mult;
  return Math.round((pd.encrypted > 0 ? pd.value * BALANCE.economy.encryptedSaleRatio : pd.value) * m);
}

export function sellPaydata(k: K, uidStr: string): void {
  requireHub(k);
  const pd = findPaydata(k, uidStr);
  const value = saleValue(k, pd);
  k.state.player.paydata = k.state.player.paydata.filter((p) => p !== pd);
  const heat = pd.tagged ? BALANCE.heat.taggedSaleHeat : 0;
  addCredits(k, value, `fenced ${pd.name}`);
  if (heat) addHeat(k, heat, 'sold tagged data');
  emit(k, { type: 'paydata.sold', uid: pd.uid, credits: value, heat });
}

export function decryptStrength(c: Ctx): number {
  let best = 0;
  for (const id of Object.keys(c.state.player.programs)) {
    const d = c.content.programs[id];
    if (d?.decrypt && !c.state.player.programs[id].corrupted) best = Math.max(best, d.decrypt);
  }
  return best;
}

export function decryptPaydata(k: K, uidStr: string): void {
  requireHub(k);
  const pd = findPaydata(k, uidStr);
  if (pd.encrypted <= 0) reject('not encrypted');
  if (decryptStrength(k) < pd.encrypted) reject(`needs a decrypt program of strength ${pd.encrypted}`);
  pd.encrypted = 0;
  emit(k, { type: 'paydata.decrypted', uid: pd.uid, value: pd.value });
}

export function cleanCost(pd: Paydata): number {
  return Math.max(10, Math.round(pd.value * BALANCE.economy.cleanCostRatio));
}

export function cleanPaydata(k: K, uidStr: string): void {
  requireHub(k);
  const pd = findPaydata(k, uidStr);
  if (!pd.tagged) reject('not tagged');
  spend(k, cleanCost(pd), `clean ${pd.name}`);
  pd.tagged = false;
  emit(k, { type: 'paydata.cleaned', uid: pd.uid });
}

// ---------------------------------------------------------------------------
// Coin / exchange
// ---------------------------------------------------------------------------

export function sellCoin(k: K, amount: number): void {
  requireHub(k);
  const p = k.state.player;
  if (!(amount > 0)) reject('amount must be positive');
  if (p.coin + 1e-9 < amount) reject('not enough $HODL');
  p.coin = Math.max(0, Math.round((p.coin - amount) * 10000) / 10000);
  addCredits(k, amount * k.state.world.coinPrice, 'sold $HODL');
}

export function buyCoin(k: K, amount: number): void {
  requireHub(k);
  if (!(amount > 0)) reject('amount must be positive');
  spend(k, amount * k.state.world.coinPrice, 'bought $HODL');
  k.state.player.coin = Math.round((k.state.player.coin + amount) * 10000) / 10000;
}

export function exchangeBlockReason(c: Ctx): string | null {
  if (c.state.mode !== 'hub') return 'only in the hub';
  if (!c.state.world.systems[c.content.setup.exchange]?.owned) return 'you do not own the exchange';
  if (c.state.cycle < c.state.world.pumpReadyAt) return `ready in ${c.state.world.pumpReadyAt - c.state.cycle} cycles`;
  return null;
}

export function pumpDump(k: K, pump: boolean): void {
  const why = exchangeBlockReason(k);
  if (why) reject(why);
  const E = BALANCE.economy;
  setCoinPrice(k, k.state.world.coinPrice * (pump ? E.pumpMult : E.dumpMult));
  let cd: number = E.pumpCooldown;
  for (const m of modifiers(k)) if (m.mod === 'pumpCooldown') cd *= m.mult;
  k.state.world.pumpReadyAt = k.state.cycle + Math.round(cd);
  addHeat(k, E.pumpHeat, pump ? 'pumped $HODL' : 'dumped $HODL');
}

// ---------------------------------------------------------------------------
// Clinic / fixer
// ---------------------------------------------------------------------------

export function neuralHealCost(c: Ctx): number {
  return Math.round((stat(c, 'neural') - c.state.player.neural) * BALANCE.economy.neuralHealPerPoint);
}

export function healNeural(k: K): void {
  requireHub(k);
  const cost = neuralHealCost(k);
  if (cost <= 0) reject('neural HP is full');
  spend(k, cost, 'neural healing');
  k.state.player.neural = stat(k, 'neural');
  emit(k, { type: 'combat.neural', value: k.state.player.neural, delta: 0 });
}

export function scrubCostPerPoint(c: Ctx): number {
  return BALANCE.heat.scrubPerPoint + BALANCE.heat.scrubPerRep * c.state.player.rep;
}

export function scrubHeat(k: K, amount: number): void {
  requireHub(k);
  const a = Math.min(amount, Math.ceil(k.state.player.heat));
  if (!(a > 0)) reject('no heat to scrub');
  spend(k, a * scrubCostPerPoint(k), 'heat scrub');
  addHeat(k, -a, 'scrubbed', true);
}

// ---------------------------------------------------------------------------
// Botnet, perks, messages, endless
// ---------------------------------------------------------------------------

export function setHostRole(k: K, hostUid: string, role: HostRole): void {
  requireHub(k);
  const h = k.state.player.hosts.find((x) => x.uid === hostUid);
  if (!h) reject('no such host');
  h.role = role;
  emit(k, { type: 'host.role', uid: h.uid, role });
  trackBotnetPeak(k);
}

export function choosePerk(k: K, perk: Id): void {
  const p = k.state.player;
  if (!p.pendingPerks?.includes(perk)) reject('perk not offered');
  p.perks.push(perk);
  p.pendingPerks = null;
  emit(k, { type: 'perk.chosen', perk });
  // stat perks can raise maxima
  p.integrity = Math.min(p.integrity, stat(k, 'chassis'));
}

export function readMessage(k: K, id: string): void {
  const m = k.state.messages.find((x) => x.id === id);
  if (!m) reject('no such message');
  m.read = true;
}

export function generateEndless(k: K, tier?: number): void {
  requireHub(k);
  if (!k.state.endless) reject('Endless mode is locked');
  const owned = Object.values(k.state.world.procSystems).filter((s) => s.tags?.includes('endless') && k.state.world.systems[s.id]?.owned).length;
  const t = tier ?? 1 + Math.floor(owned / 2);
  const sys = generateEndlessSystem(k, t);
  addAddress(k, sys.id, 'endless');
  log(k, `new target: ${sys.address} (tier ${t})`, 'info');
}

export { HARDWARE_PARTS };
