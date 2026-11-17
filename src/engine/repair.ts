// Save repair: old or partial saves get every missing field filled from a fresh state, so a later code
// change that adds a field never breaks an existing save. Values present in the save always win.
import { createInitialState } from './state.ts';
import { migrate } from './save.ts';
import type { Content, GameState } from './types.ts';

/**
 * Paths whose value is a record keyed by content ids (or uids). A missing record is filled with the fresh
 * one; an existing record is kept as-is (never merged), so e.g. a sold starter program does not come back.
 */
const RECORDS = new Set([
  'player.programs', 'player.hosts', 'player.loadout', 'player.implants', 'player.perks', 'player.items',
  'player.paydata', 'player.lore', 'player.pendingPerks',
  'world.addressBook', 'world.systems', 'world.procSystems', 'world.coinHistory',
  'story.flags', 'story.fired', 'story.jobs', 'story.bought', 'story.counts', 'story.objectives',
  'meta.modules', 'meta.rootKey', 'meta.fragments',
  'stats.runsBySystem', 'stats.cyclesBySystem', 'stats.programUses',
  'messages', 'log', 'run', 'combat', 'dialogue', 'cinematic',
]);

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function fill(target: Record<string, unknown>, template: Record<string, unknown>, path: string): void {
  for (const [key, tv] of Object.entries(template)) {
    const p = path ? `${path}.${key}` : key;
    if (!(key in target) || target[key] === undefined) {
      target[key] = tv === undefined ? tv : JSON.parse(JSON.stringify(tv));
      continue;
    }
    const cur = target[key];
    if (!RECORDS.has(p) && isObj(cur) && isObj(tv)) fill(cur, tv, p);
  }
}

export class SaveError extends Error {}

/**
 * Parse-time checks + migration + fill. Throws SaveError (and never touches engine state) when the
 * value is not a usable save.
 */
export function repairState(raw: unknown, content: Content): GameState {
  if (!isObj(raw)) throw new SaveError('save is not an object');
  if (typeof raw.version !== 'number') throw new SaveError('save has no version');
  let s: GameState;
  try {
    s = migrate(raw as unknown as GameState);
  } catch (e) {
    throw new SaveError((e as Error).message);
  }
  const seed = typeof raw.seed === 'number' ? raw.seed : 1;
  const { state: fresh } = createInitialState(content, { seed });
  // a save without these is not a game we can resume
  if (!isObj((s as unknown as Record<string, unknown>).player)) throw new SaveError('save has no player');
  fill(s as unknown as Record<string, unknown>, fresh as unknown as Record<string, unknown>, '');
  // a run or fight that points at content that no longer exists cannot be resumed: drop it
  if (s.run && !(content.systems[s.run.system] ?? s.world.procSystems[s.run.system])) {
    s.run = null;
    s.combat = null;
    if (s.mode === 'run') s.mode = 'hub';
  }
  if (s.combat && s.combat.ice?.some((i) => !content.ice[i.def])) s.combat = null;
  if (s.dialogue && !content.dialogues[s.dialogue.id]?.nodes[s.dialogue.node]) s.dialogue = null;
  // ids that no longer exist in content (renamed or removed) are dropped rather than crashing later
  for (const id of Object.keys(s.player.programs)) if (!content.programs[id]) delete s.player.programs[id];
  s.player.loadout = s.player.loadout.filter((id) => !!s.player.programs[id]);
  s.player.implants = s.player.implants.filter((id) => !!content.implants[id]);
  s.player.perks = s.player.perks.filter((id) => !!content.perks[id]);
  if (s.player.pendingPerks) s.player.pendingPerks = s.player.pendingPerks.filter((id) => !!content.perks[id]);
  const known = (id: string) => !!(content.systems[id] ?? s.world.procSystems[id]);
  for (const id of Object.keys(s.world.addressBook)) if (!known(id)) delete s.world.addressBook[id];
  for (const id of Object.keys(s.world.systems)) if (!known(id)) delete s.world.systems[id];
  s.player.hosts = s.player.hosts.filter((h) => !h.system || known(h.system));
  if (s.meta.fragments.length !== 4) s.meta.fragments = [0, 1, 2, 3].map((i) => !!s.meta.fragments[i]);
  return s;
}
