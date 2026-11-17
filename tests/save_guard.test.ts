// Regression: the placeholder state on the title screen must never replace the real save.
// (2026-11-16: meta/session, sent at page load after 30+ minutes away, autosaved the placeholder over the slot.)
import { describe, it, expect } from 'vitest';
import { MemoryStorage, SAVE_KEYS, META_KEYS, createEngine, SaveError } from '../src/engine/index.ts';
import { content as realContent, cloneContent } from './helpers.ts';

function savedGame(): { storage: MemoryStorage; seed: number; json: string } {
  const storage = new MemoryStorage();
  const e = createEngine({ content: realContent, storage });
  e.newGame({ seed: 7, handle: 'keeper' });
  e.dispatch({ type: 'ui/log', lines: [{ text: 'kept line', level: 'ui' }] });
  e.save();
  const json = storage.getItem(SAVE_KEYS.slot)!;
  expect(json).toBeTruthy();
  return { storage, seed: e.state.seed, json };
}

describe('save guard before a game is loaded', () => {
  it('an engine without a loaded game is not active and writes nothing', () => {
    const { storage, json } = savedGame();
    const boot = createEngine({ content: realContent, storage }); // page load: title screen
    expect(boot.active).toBe(false);
    boot.dispatch({ type: 'meta/session', awayMinutes: 120, timeAway: '2 hours' });
    boot.dispatch({ type: 'meta/cheatAttempt', what: 'title' });
    boot.dispatch({ type: 'ui/log', lines: [{ text: 'hello', level: 'ui' }] });
    boot.save();
    boot.saveCheckpoint();
    expect(storage.getItem(SAVE_KEYS.slot)).toBe(json);
    expect(storage.getItem(SAVE_KEYS.checkpoint)).toBeNull();
  });

  it('Continue after a time-away report loads the real save and then delivers the report', () => {
    const { storage, seed } = savedGame();
    const boot = createEngine({ content: realContent, storage });
    boot.dispatch({ type: 'meta/session', awayMinutes: 120, timeAway: '2 hours' });
    expect(boot.load()).toBe(true);
    expect(boot.active).toBe(true);
    expect(boot.state.player.handle).toBe('keeper');
    expect(boot.state.seed).toBe(seed);
    expect(JSON.stringify(boot.state.log)).toMatch(/kept line/);
    const saved = JSON.parse(storage.getItem(SAVE_KEYS.slot)!);
    expect(saved.player.handle).toBe('keeper');
    expect(saved.seed).toBe(seed);
  });

  it('a new game drops the pending time-away report and saves', () => {
    const { storage } = savedGame();
    const boot = createEngine({ content: realContent, storage });
    boot.dispatch({ type: 'meta/session', awayMinutes: 120, timeAway: '2 hours' });
    boot.newGame({ seed: 9, handle: 'fresh' });
    expect(boot.active).toBe(true);
    expect(JSON.parse(storage.getItem(SAVE_KEYS.slot)!).player.handle).toBe('fresh');
    expect(JSON.stringify(boot.state.log) + JSON.stringify(boot.state.messages)).not.toMatch(/2 hours/);
  });
});

describe('save guard: holes closed (engine review 2026-11-16)', () => {
  it('game actions on the placeholder are rejected with "no game loaded"; debug/set and ui/log still work', () => {
    const { storage, json } = savedGame();
    const boot = createEngine({ content: realContent, storage });
    for (const a of [
      { type: 'meta/command', cmd: 'sudo', arg: 'x' },
      { type: 'meta/cheatAttempt', what: 'title' },
      { type: 'hub/jackIn', system: 'fridge' },
      { type: 'ui/hintDone', id: 'x' },
    ] as const) {
      const ev = boot.dispatch(a as never);
      expect(ev).toEqual([{ type: 'action.rejected', action: a.type, reason: 'no game loaded' }]);
    }
    expect(boot.dispatch({ type: 'debug/set', patch: { cycle: 3 } }).some((e) => e.type === 'action.rejected')).toBe(false);
    expect(boot.dispatch({ type: 'ui/log', lines: [{ text: 'x', level: 'ui' }] })).toEqual([]);
    expect(storage.getItem(SAVE_KEYS.slot)).toBe(json);
    expect(storage.keys().filter((k) => k !== SAVE_KEYS.slot && k !== META_KEYS.lastSeen)).toEqual([]);
  });

  it('story triggers on the placeholder never write cross-save keys; post-load triggers do', () => {
    const c = cloneContent(realContent);
    c.triggers = [...c.triggers,
      { id: 'boot_key', on: 'game.started', ops: [{ op: 'metaKey', key: 'cw.meta.test_boot', value: '1' }] },
      { id: 'load_key', on: 'game.loaded', ops: [{ op: 'metaKey', key: 'cw.meta.test_load', value: '1' }] },
    ];
    const storage = new MemoryStorage();
    const first = createEngine({ content: c, storage });
    first.newGame({ seed: 3 });
    expect(storage.getItem('cw.meta.test_boot')).toBe('1'); // a real new game processes its intro events
    storage.removeItem('cw.meta.test_boot');
    const boot = createEngine({ content: c, storage }); // placeholder ran game.started triggers in memory
    expect(storage.getItem('cw.meta.test_boot')).toBeNull();
    expect(boot.load()).toBe(true);
    expect(storage.getItem('cw.meta.test_load')).toBe('1');
  });

  it('a failed load leaves the engine inactive and writes nothing', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEYS.slot, '{"version":99,"player":{}}');
    const boot = createEngine({ content: realContent, storage });
    expect(() => boot.load()).toThrow();
    expect(boot.active).toBe(false);
    boot.save();
    expect(storage.getItem(SAVE_KEYS.slot)).toBe('{"version":99,"player":{}}');
  });

  it('tryAction and fork sandboxes never touch storage', () => {
    const { storage } = savedGame();
    const e = createEngine({ content: realContent, storage });
    e.load();
    const before = JSON.stringify(storage.keys().map((k) => [k, k === META_KEYS.lastSeen ? '' : storage.getItem(k)]));
    e.tryAction({ type: 'hub/jackIn', system: 'fridge' });
    const f = e.fork();
    f.dispatch({ type: 'debug/set', patch: { dialogue: null, cinematic: null } });
    f.dispatch({ type: 'hub/jackIn', system: 'fridge' });
    f.save();
    expect(JSON.stringify(storage.keys().map((k) => [k, k === META_KEYS.lastSeen ? '' : storage.getItem(k)]))).toBe(before);
  });
});

describe('save backup (cw.save.bak)', () => {
  it('load keeps the raw slot as a backup when there is none, and replaces it when repair changes the save', () => {
    const { storage, json } = savedGame();
    storage.removeItem(SAVE_KEYS.backup);
    const a = createEngine({ content: realContent, storage });
    a.load();
    expect(storage.getItem(SAVE_KEYS.backup)).toBe(json); // no backup yet: keep one
    // an older save (missing a field) gets repaired on load: the exact old string is kept first
    const old = JSON.parse(storage.getItem(SAVE_KEYS.slot)!);
    delete old.story.counts;
    const oldRaw = JSON.stringify(old);
    storage.setItem(SAVE_KEYS.slot, oldRaw);
    const b = createEngine({ content: realContent, storage });
    b.load();
    expect(storage.getItem(SAVE_KEYS.backup)).toBe(oldRaw);
    expect(JSON.parse(storage.getItem(SAVE_KEYS.slot)!).story.counts).toBeTruthy(); // the repaired save was written back
  });
  it('an unchanged load does not replace an existing backup', () => {
    const { storage } = savedGame();
    storage.setItem(SAVE_KEYS.backup, 'older backup');
    const e = createEngine({ content: realContent, storage });
    e.load();
    expect(storage.getItem(SAVE_KEYS.backup)).toBe('older backup');
  });
  it('newGame over an existing slot keeps the old slot; restoreBackup swaps it back (and drops the checkpoint)', () => {
    const { storage, json } = savedGame();
    const e = createEngine({ content: realContent, storage });
    e.newGame({ seed: 99, handle: 'oops' });
    expect(storage.getItem(SAVE_KEYS.backup)).toBe(json);
    const oopsJson = storage.getItem(SAVE_KEYS.slot)!;
    storage.setItem(SAVE_KEYS.checkpoint, 'stale');
    expect(e.restoreBackup()).toBe(true);
    expect(e.active).toBe(true);
    expect(e.state.player.handle).toBe('keeper');
    expect(JSON.parse(storage.getItem(SAVE_KEYS.slot)!).player.handle).toBe('keeper');
    expect(storage.getItem(SAVE_KEYS.backup)).toBe(oopsJson); // swapped
    expect(storage.getItem(SAVE_KEYS.checkpoint)).toBeNull();
  });
  it('restoreBackup: false without a backup; an unreadable backup throws SaveError and changes nothing', () => {
    const { storage, json } = savedGame();
    storage.removeItem(SAVE_KEYS.backup);
    const e = createEngine({ content: realContent, storage });
    expect(e.restoreBackup()).toBe(false);
    storage.setItem(SAVE_KEYS.backup, 'not json');
    expect(() => e.restoreBackup()).toThrow(SaveError);
    expect(e.active).toBe(false);
    expect(storage.getItem(SAVE_KEYS.slot)).toBe(json);
    expect(storage.getItem(SAVE_KEYS.backup)).toBe('not json');
  });
  it('a storage that throws on the backup write does not block load or new game', () => {
    const { storage } = savedGame();
    const flaky = {
      getItem: (k: string) => storage.getItem(k),
      setItem: (k: string, v: string) => { if (k === SAVE_KEYS.backup) throw new Error('QuotaExceededError'); storage.setItem(k, v); },
      removeItem: (k: string) => storage.removeItem(k),
    };
    storage.removeItem(SAVE_KEYS.backup);
    const e = createEngine({ content: realContent, storage: flaky });
    expect(e.load()).toBe(true);
    e.newGame({ seed: 5 });
    expect(e.active).toBe(true);
  });
});
