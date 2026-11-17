// New game state construction.
import { BALANCE } from './balance.ts';
import { type K, makeK, stat, addAddress, emit, HARDWARE_PARTS } from './core.ts';
import { generateRootKey } from './meta.ts';
import { seedFrom } from './rng.ts';
import type { Content, GameState, HardwarePart } from './types.ts';

export interface NewGameOptions {
  handle?: string;
  seed?: number | string;
  endless?: boolean;
  flatlinesTotal?: number;
}

export function createInitialState(content: Content, opts: NewGameOptions = {}): { state: GameState; k: K } {
  const setup = content.setup;
  const seed = seedFrom(opts.seed ?? Date.now());
  const hardware = Object.fromEntries(HARDWARE_PARTS.map((p) => [p, setup.startHardware?.[p] ?? 0])) as Record<HardwarePart, number>;
  const E = BALANCE.economy;
  const state: GameState = {
    version: BALANCE.saveVersion,
    seed,
    rng: seed,
    cycle: 0,
    nextUid: 1,
    mode: 'hub',
    player: {
      handle: (opts.handle ?? '').trim() || BALANCE.start.handle,
      credits: setup.startCredits,
      frozenCredits: 0,
      coin: 0,
      xp: 0,
      rep: 1,
      humanity: BALANCE.start.humanity,
      heat: 0,
      integrity: 0,
      neural: 0,
      hardware,
      programs: Object.fromEntries(setup.startPrograms.map((id) => [id, { corrupted: false }])),
      loadout: setup.startLoadout.slice(),
      implants: [],
      perks: [],
      pendingPerks: null,
      items: (setup.startItems ?? []).slice(),
      paydata: [],
      lore: [],
      hosts: [],
      flatlinesTotal: opts.flatlinesTotal ?? 0,
    },
    world: {
      coinPrice: E.priceStart,
      coinHistory: [E.priceStart],
      nextPriceCycle: E.priceEvery,
      pumpReadyAt: 0,
      nextReclaimCycle: BALANCE.heat.reclaimInterval,
      addressBook: {},
      systems: {},
      procSystems: {},
      procCounter: 0,
    },
    run: null,
    combat: null,
    story: { flags: {}, fired: [], jobs: {}, bought: [], counts: {}, objectives: {} },
    dialogue: null,
    cinematic: null,
    messages: [],
    log: [],
    meta: {
      modules: {},
      rootKey: [],
      root: false,
      finale: 'none',
      unlocked: false,
      cheatWarned: false,
      rmPending: false,
      finaleCheckpoint: false,
      chairmanKilled: false,
      patchBroken: false,
      fragments: [false, false, false, false],
      cheatCount: 0,
      integrityResets: 0,
    },
    ending: null,
    endless: !!opts.endless,
    stats: {
      runs: 0, runsBySystem: {}, fightsWon: 0, fightsLost: 0, disengages: 0, dumped: 0, traced: 0,
      flatlines: 0, raidsWon: 0, raidsLost: 0, creditsEarned: 0, programsRun: 0, hostsBurned: 0,
      cyclesBySystem: {}, systemsOwned: 0, programUses: {}, botnetPeak: 0,
    },
  };
  const k = makeK(state, content);
  state.meta.rootKey = generateRootKey(k);
  state.player.integrity = stat(k, 'chassis');
  state.player.neural = stat(k, 'neural');
  for (const id of setup.knownSystems) addAddress(k, id, 'well-known');
  emit(k, { type: 'game.started', handle: state.player.handle, endless: state.endless });
  return { state, k };
}
