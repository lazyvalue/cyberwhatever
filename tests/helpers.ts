import { createEngine, MemoryStorage, type Content, type Engine, type IceDef, type SystemDef, type Action, type GameEvent } from '../src/engine/index.ts';
import { content as fixtureContent } from './fixtures/content/index.ts';
import { content as gameContent } from '../src/content/index.ts';

/** Frozen slice content (tests/fixtures/content) that rules tests depend on. */
export const content = fixtureContent;
const realContent = fixtureContent;
/** The live game content (src/content). Only validation and the sim test use it. */
export const liveContent = gameContent;

/** Deep-ish clone of the content registry so tests can add defs without leaking. */
export function cloneContent(base: Content = realContent): Content {
  return {
    ...base,
    programs: { ...base.programs },
    ice: { ...base.ice },
    implants: { ...base.implants },
    perks: { ...base.perks },
    items: { ...base.items },
    npcs: { ...base.npcs },
    systems: { ...base.systems },
    vendors: { ...base.vendors },
    jobs: { ...base.jobs },
    triggers: base.triggers.slice(),
    dialogues: { ...base.dialogues },
    setup: { ...base.setup, knownSystems: base.setup.knownSystems.slice() },
  };
}

export interface ArenaOpts {
  security?: number;
  tier?: number;
  extraNodes?: SystemDef['nodes'];
  ice?: IceDef[];
  scriptedFailure?: boolean;
}

/** Content with a one-fight system 'arena' (gateway holds the given ICE, then a datastore and a core). */
export function arenaContent(iceIds: string[], o: ArenaOpts = {}, base: Content = realContent): Content {
  const c = cloneContent(base);
  for (const d of o.ice ?? []) c.ice[d.id] = d;
  c.systems.arena = {
    id: 'arena', name: 'Arena', address: 'arena.test', tier: o.tier ?? 1, security: o.security ?? 1,
    owner: 'tests', description: 'test system',
    ...(o.scriptedFailure ? { scriptedFailure: true } : {}),
    nodes: [
      { id: 'gw', type: 'gateway', name: 'gw', x: 0, y: 0, links: ['ds'], ice: iceIds.map((ice) => ({ ice })) },
      { id: 'ds', type: 'datastore', name: 'ds', x: 1, y: 0, links: ['core'], files: [{ id: 'arena-pd', name: 'arena paydata', kind: 'paydata', value: 100 }] },
      { id: 'core', type: 'core', name: 'core', x: 2, y: 0, links: [] },
      ...(o.extraNodes ?? []),
    ],
  };
  c.setup.knownSystems = [...c.setup.knownSystems, 'arena'];
  // tests do not want the intro dialogue in the way
  c.triggers = c.triggers.filter((t) => t.id !== 'intro');
  return c;
}

export function mkEngine(c: Content = realContent, seed = 1, storage: MemoryStorage | null = new MemoryStorage()): Engine {
  return createEngine({ content: c, storage, newGame: { seed } });
}

/** Dispatch and throw if rejected. */
export function act(e: Engine, a: Action): GameEvent[] {
  const ev = e.dispatch(a);
  const rej = ev.find((x) => x.type === 'action.rejected');
  if (rej && rej.type === 'action.rejected') throw new Error(`rejected ${a.type}: ${rej.reason}`);
  return ev;
}

export function reject(e: Engine, a: Action): string {
  const ev = e.dispatch(a);
  const rej = ev.find((x) => x.type === 'action.rejected');
  if (!rej || rej.type !== 'action.rejected') throw new Error(`expected ${a.type} to be rejected`);
  return rej.reason;
}

/** New engine, jacked into the arena and fighting the gateway ICE. */
export function arenaFight(iceIds: string[], o: ArenaOpts & { seed?: number; patch?: object; base?: Content } = {}): Engine {
  const c = arenaContent(iceIds, o, o.base);
  const e = mkEngine(c, o.seed ?? 1);
  if (o.patch) act(e, { type: 'debug/set', patch: o.patch as never });
  act(e, { type: 'hub/jackIn', system: 'arena' });
  act(e, { type: 'run/breach', node: 'gw' });
  return e;
}

export function foes(e: Engine) {
  return e.state.combat!.ice.filter((i) => !i.dead && !i.subverted);
}

export function types(ev: GameEvent[]): string[] {
  return ev.map((x) => x.type);
}

/** A dummy ICE that does nothing (for isolating mechanics). */
export function dummy(id: string, over: Partial<IceDef> = {}): IceDef {
  return {
    id, name: id, level: 1, shell: { type: 'none', points: 0 }, core: 50, perception: 0,
    intents: [{ id: 'idle', label: 'Idle', class: 'utility', ops: [] }], xp: 1,
    description: 'test dummy', ...over,
  };
}
