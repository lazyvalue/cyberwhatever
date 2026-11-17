// Every tunable number the rules use lives here. Content numbers (program damage, ICE HP, prices)
// live in src/content. Change values here, not inline in rules code.

export const BALANCE = {
  saveVersion: 1,

  start: {
    handle: 'n00b',
    humanity: 100,
  },

  // §6.3 signature adaptation
  signature: { perStack: 0.2, min: 0.4 },
  // Mapped crit
  crit: 1.5,
  // §6.2 shell multipliers
  shell: { strong: 2, weak: 0.5 },
  // §6.3 Flow
  flow: { categories: 3, bonusCycles: 1, traceReduction: 2 },

  // §5.4 trace
  trace: {
    turnBase: 1,              // flat gain every combat turn
    securityMult: 1,          // + system security per combat turn
    maskPerPoint: 0.5,        // - per mask stat point per combat turn
    probe: 2,
    nodeAction: 1,            // loot / capture / use / talk / unlock / backdoor / netscan
    sneakFail: 10,
    honeypot: 25,
    netscan: 3,
    suspicious: 33,
    alarm: 66,
    max: 100,
    noticedStart: 10,         // heat >= 25: runs start at this trace
    proxyPerPower: 0.25,      // - per proxy host power per combat turn
    securityCapturedMult: 0.5,
    maskedMult: 0.5,
  },

  // §5.3 sneak (percentage points)
  sneak: { base: 55, perMask: 8, perAlert: 10, min: 5, max: 95, stealthLoadedBonus: 5 },

  ice: {
    suspiciousShellLevels: 1, // §5.4: Suspicious = +1 shell level
    perLevelCore: 0.25,       // +25% core per level above base
    perLevelShell: 2,         // +2 shell points per (shell) level
    perLevelHit: 1,           // +1 damage per hit per level
    rootedDamageBase: 2,
    rootedDamagePerLevel: 2,
    hunterJoinTurn: 2,        // §5.4 Alarm: hunter joins after 2 turns
    disengageRecover: 0.5,    // §6.7 ICE recovers half of what it lost
    maxPerFight: 6,
    hardenedLevels: 1,        // §7 traced: hardened = ICE +1
    patchLevels: 1,           // §5.5 reclaimed = ICE +1 ("patched")
    permanentMapped: 999,
  },

  combat: {
    disengageCost: 2,
    maxDaemons: 0,            // cap on daemons running at once; 0 = no cap (the loadout's RAM is the only limit)
  },

  // §6.6 botnet
  botnet: {
    burnBase: 0.06,
    burnPerHeat: 0.0006,      // + per heat point
    uplinkPowerPerPoint: 6,   // usable power cap = uplink * this
    dcrackBase: 2,
    dcrackPerPower: 0.5, // was 1: a 30-power botnet one-shot tier-5 ICE (content sim, 2026-11-13)
    swarmHitsPerPower: 0.5,
    swarmMaxHits: 10,
    swarmHitDamage: 1,
    bounceBase: 3,
    bouncePerPower: 0.5,
    markedMult: 1.5,
  },

  // §7 failure
  failure: { dumpHeat: 10, traceHeat: 25, traceFine: 0.2, hardenCycles: 200 },

  // §8 heat
  heat: {
    decayPerCycle: 0.05,
    miningDripPerHost: 0.01,
    noticed: 25, hunted: 50, burned: 75, raid: 100,
    raidResetTo: 50,
    burnedShopMult: 1.25,
    reclaimInterval: 120,     // cycles between reclaim rolls while Burned (was 50: failure snowball)
    reclaimChance: 0.5,
    scrubPerPoint: 10,        // fixer heat scrub: credits per heat point (was 15)
    scrubPerRep: 1,           // + per rep level per point (was 2)
    taggedSaleHeat: 5,
    proxyHeatPerPower: 0.05,  // heat gains reduced by this per proxy power...
    proxyHeatMax: 0.5,        // ...up to this fraction
  },

  raid: { creditLoss: 0.3 },

  // §9 economy
  economy: {
    priceStart: 100, priceMin: 20, priceMax: 400, priceEvery: 10,
    priceVol: 0.08, priceMeanRevert: 0.03, priceMean: 100,
    historyLength: 60,
    coinPerPowerPerCycle: 0.003, // was 0.01: mining out-earned hacking mid-game (content sim, 2026-11-13)
    pumpCooldown: 60, pumpMult: 1.5, dumpMult: 0.6, pumpHeat: 5,
    encryptedSaleRatio: 0.25,
    cleanCostRatio: 0.3,
    programSellRatio: 0.4,
    repairCostRatio: 0.5,     // corrupted program repair = price * this (min 20)
    repairMin: 20,
    neuralHealPerPoint: 8,
  },

  // §4 rep / xp
  xp: {
    table: [0, 150, 450, 900, 1400, 2000, 2700, 3700, 4400, 5200], // xp needed for level 1..10 (content sim 2026-11-13: rep 4 / 8 / 10 at act1 / act2 / finale)
    captureSystemPerTier: 40,
    captureNode: 5,
    perkLevels: [2, 4, 6, 8, 10],
    perkOffer: 3,
  },

  humanity: { cold: 40, unit: 20 },

  hosts: { iotPower: 1 },
  netscan: { iotMin: 1, iotMax: 3 },

  // §11 meta
  meta: { fragmentLength: 4 },
  // PATCH fight scaling (QA: an 84-power botnet made it unwinnable when uncapped)
  patch: { swarmPerLevel: 15, hostLevelsMax: 3, levelsMax: 4, swarmPerCore: 50, coreMultMax: 2.2, loyalPerCycle: 5 },

  logLimit: 500,
  messageLimit: 300,
  storyDepthLimit: 8,
} as const;

export type Balance = typeof BALANCE;
