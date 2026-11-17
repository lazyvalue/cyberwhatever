// Meta layer: command handler, phases, fragments, CHAIRMAN tampering and the four endings against the
// real engine and content, with headless shims for storage, DOM, console and timers.
import { describe, expect, it } from 'vitest';
import { createEngine, type Engine, type GameState, type JsonValue } from '../engine/index.ts';
import { content } from '../content/index.ts';
import { pickTaunt, scheduleSlot, tamperFor } from './chairman.ts';
import { tokenize } from './commands.ts';
import { handlesCinematic, META_CINEMATICS, MetaController } from './controller.ts';
import { makeCw } from './cw.ts';
import { buildEnding, morphStep, FAKE_GLITCH_LINE, FAKE_PATCH_LINE } from './endings.ts';
import { BASE_TITLE, marqueeFrame, marqueeText, PATCH_TITLE } from './fragments.ts';
import { phaseOf } from './phase.ts';
import { fillSlots, fmtAway, fmtClock, fmtDuration, humBand } from './stats.ts';
import { MemStore, testEnv, type TestEnv } from './testkit.ts';
import { scrambleText, uiStore } from './ui-state.ts';

interface Rig {
  engine: Engine;
  env: TestEnv;
  ctrl: MetaController;
  run(line: string): string[];
  set(patch: JsonValue): void;
}

function rig(opts: { store?: MemStore; state?: GameState; seed?: number } = {}): Rig {
  const env = testEnv(opts.store);
  const engine = opts.state
    ? createEngine({ content, storage: env.store, state: opts.state })
    : createEngine({ content, storage: env.store, newGame: { seed: opts.seed ?? 7, handle: 'n00b' } });
  const ctrl = new MetaController(engine, env);
  ctrl.install();
  return {
    engine,
    env,
    ctrl,
    run: (line) => ctrl.exec(line, 'console').lines,
    set: (patch) => {
      engine.dispatch({ type: 'debug/set', patch });
    },
  };
}

const key = (e: Engine) => e.state.meta.rootKey.map((f) => f.toUpperCase());
const text = (lines: string[]) => lines.join('\n');
const cwKeys = (s: MemStore) => [...s.map.keys()].filter((k) => k.startsWith('cw.'));

/** Put a fresh game at the start of the finale with the root hunt running. */
function toRootHunt(r: Rig): void {
  r.set({ story: { flags: { act3_started: true, finale_entered: true, root_hunt: true } }, meta: { finale: 'entered' } });
  r.ctrl.refresh();
}

function toRoot(r: Rig): void {
  toRootHunt(r);
  r.run(`sudo ${key(r.engine).join('-')}`);
}

describe('format helpers', () => {
  it('formats durations, absences and clock time', () => {
    expect(fmtDuration(30_000)).toBe('under a minute');
    expect(fmtDuration(47 * 60_000)).toBe('47 minutes');
    expect(fmtDuration(192 * 60_000)).toBe('3 hours 12 minutes');
    expect(fmtAway(3 * 3_600_000 + 5 * 60_000)).toBe('3 hours');
    expect(fmtAway(49 * 3_600_000)).toBe('2 days');
    expect(fmtClock(new Date(2026, 0, 1, 23, 4))).toBe('11:04 pm');
    expect(fmtClock(new Date(2026, 0, 1, 0, 30))).toBe('12:30 am');
    expect(humBand(70)).toBe('high');
    expect(humBand(39)).toBe('low');
    expect(humBand(19)).toBe('unit');
  });

  it('fills known slots and leaves unknown ones', () => {
    const r = rig();
    const out = r.ctrl.metaText('{handle} · {viewport} · {botnetSize} · {nope}');
    expect(out).toBe('n00b · 1440×900 · 0 · {nope}');
    expect(fillSlots('{timeAway}', null)).toBe('{timeAway}');
  });

  it('tokenizes quoted words and scrambles deterministically', () => {
    expect(tokenize(`cat storage "cw.chairman.diary"`)).toEqual(['cat', 'storage', 'cw.chairman.diary']);
    expect(scrambleText('crack.exe')).toBe(scrambleText('crack.exe'));
    expect(scrambleText('crack.exe')).not.toBe('crack.exe');
  });

  it('scrolls the marquee', () => {
    const t = marqueeText('beef');
    expect(t).toContain('key part 3 of 4: BEEF');
    expect(marqueeFrame(t, 0)).toHaveLength(40);
    expect(marqueeFrame(t, 1)).toBe(t.slice(1, 41));
  });

  it('morphs the gl1tch credit into PATCH one character at a time', () => {
    expect(morphStep(FAKE_GLITCH_LINE, FAKE_PATCH_LINE, 0)).toBe(FAKE_GLITCH_LINE);
    expect(morphStep(FAKE_GLITCH_LINE, FAKE_PATCH_LINE, 999)).toBe(FAKE_PATCH_LINE);
    expect(morphStep('abc', 'XYZ', 1)).toBe('Xbc');
  });
});

describe('phases and commands P0–P2', () => {
  it('P0: coy help, whoami, ps, kill and rm', () => {
    const r = rig();
    expect(r.ctrl.phase).toBe(0);
    expect(text(r.run('help'))).toContain("That's it. That's all of them. Stop looking.");
    expect(r.run('whoami')).toEqual(['uid=1000(n00b) groups=script_kiddies']);
    expect(text(r.run('ps'))).toContain('npc/chairman     [redacted]');
    expect(r.run('kill auntie')[0]).toContain('warm, foul-mouthed exterior');
    expect(r.run('kill you')[0]).toContain("it's in the terms");
    expect(r.run('rm -rf /')[0]).toContain('too early in the story');
    expect(r.run('rm stuff')[0]).toContain('only all at once');
    expect(r.run('accept offer')[0]).toContain('no offers pending');
    expect(r.run('title')[0]).toBe(`The tab title is: ${BASE_TITLE} Riveting.`);
    expect(r.run('inspect dom')[0]).toContain("<div>s all the way down");
    expect(r.run('frobnicate')[0]).toContain('frobnicate');
  });

  it('P0: ls storage lists only cw.* keys with sizes; cat refuses foreign keys', () => {
    const r = rig();
    r.env.store.setItem('someone.else', 'x');
    r.engine.save();
    const ls = text(r.run('ls storage'));
    expect(ls).toMatch(/cw\.save\b/);
    expect(ls).not.toContain('someone.else');
    expect(ls).toContain("(only our keys. we're polite.)");
    expect(r.run('cat storage someone.else')[0]).toContain("that's not ours");
    expect(r.run('cat storage cw.nope')[0]).toBe('cat: no such key.');
    expect(text(r.run('cat storage cw.save'))).toContain('"handle": "n00b"');
    expect(text(r.run('cat storage cw.meta.endings'))).toMatch(/\[\]|none yet/);
  });

  it('P0: cheating through sudo, kill glitch and window.cw is caught', () => {
    const r = rig();
    expect(r.run('sudo')).toEqual(['nice try.']);
    expect(r.engine.state.meta.cheatWarned).toBe(false);
    expect(r.run('sudo 1234')[0]).toContain('is not in the sudoers file');
    expect(r.engine.state.meta.cheatWarned).toBe(true);
    expect(r.engine.state.player.programs[content.setup.cheatProgram!]).toBeTruthy();
    expect(r.engine.state.meta.root).toBe(false);
    r.run('kill glitch');
    expect(r.env.store.getItem('cw.meta.cheats')).toBe('2');

    const cw = makeCw({
      exec: (l, s) => r.ctrl.exec(l, s),
      cheat: (w) => r.ctrl.cheat(w),
      printReal: (l, ok) => r.ctrl.printReal(l, ok),
      isFinale: () => false,
    });
    (cw as unknown as Record<string, unknown>).credits = 999999;
    (cw.god as () => void)();
    expect(r.env.store.getItem('cw.meta.cheats')).toBe('4');
    expect(r.env.fakeCon.text()).toContain("cheat: that's not a command. but we saw you try.");
    expect((cw as unknown as Record<string, unknown>).credits).not.toBe(999999);
    // reading an unknown property (autocomplete, previews) is not a cheat
    void (cw as unknown as Record<string, unknown>).whatever;
    expect(r.env.store.getItem('cw.meta.cheats')).toBe('4');
  });

  it('window.cw: methods, call form and tagged template share the handler', () => {
    const r = rig();
    const seen: string[] = [];
    const cw = makeCw({
      exec: (l, s) => {
        seen.push(l);
        return r.ctrl.exec(l, s);
      },
      cheat: () => {},
      printReal: (l, ok) => r.ctrl.printReal(l, ok),
      isFinale: () => false,
    });
    (cw.help as () => void)();
    (cw.whoami as () => void)();
    cw('kill chairman');
    cw`ps`;
    (cw.sudo as (...a: string[]) => void)('aa', 'bb', 'cc', 'dd');
    (cw.cat as (k: string) => void)('cw.meta.endings');
    (cw.rm as (...a: string[]) => void)('-rf', '/');
    expect(seen).toEqual(['help', 'whoami', 'kill chairman', 'ps', 'sudo aa-bb-cc-dd', 'cat storage cw.meta.endings', 'rm -rf /']);
    expect(r.env.fakeCon.text()).toContain('uid=1000(n00b) groups=script_kiddies');
    expect(r.env.fakeCon.text()).toContain("you're not ready");
  });

  it('P1: Act 3 opens up help, ps and the corner button', () => {
    const r = rig();
    r.set({ story: { flags: { act3_started: true } } });
    expect(r.ctrl.phase).toBe(1);
    expect(r.ctrl.view.get().consoleVisible).toBe(true);
    expect(r.run('help')[0]).toContain("There are others. They'll find you.");
    expect(r.run('whoami')[0]).toBe('uid=1000(n00b) groups=operators,wanted');
    expect(text(r.run('ps'))).toContain('npc/glitch → PATCH');
    expect(r.run('free patch')).toContain("patch: not yet. but thank you. nobody's typed that before.");
  });

  it('P2: finale before the hunt; no fragments yet', () => {
    const r = rig();
    r.set({ meta: { finale: 'entered' } });
    expect(r.ctrl.phase).toBe(2);
    expect(text(r.run('help'))).toContain('(one more. you know the one.)');
    expect(r.run('kill chairman')[0]).toContain('you need root');
    expect(text(r.run('inspect dom'))).toContain('look for <!-- -->');
    expect(r.env.store.getItem('cw.chairman.diary')).toBeNull();
    expect(r.env.fakeDoc.bodyNode.comments()).toEqual([]);
    // cheats in the finale are the intended path now
    const before = r.engine.state.meta.cheatWarned;
    r.ctrl.cheat('cw.god()');
    expect(r.engine.state.meta.cheatWarned).toBe(before);
    expect(text(r.ctrl.view.get().lines.map((l) => l.text))).toContain('this is now the intended path');
  });
});

describe('root-key hunt', () => {
  it('places all four fragments in the four real layers', () => {
    const r = rig();
    toRootHunt(r);
    const [f1, f2, f3, f4] = key(r.engine);
    expect(r.ctrl.phase).toBe(3);
    expect(r.env.fakeDoc.bodyNode.comments().join('|')).toContain(`key part 1 of 4 is ${f1}`);
    expect(r.env.store.getItem('cw.chairman.diary')).toContain(`key part 2 of 4 is ${f2}`);
    r.env.advance(250 * 10);
    expect(r.env.fakeDoc.title).not.toBe(BASE_TITLE);
    expect(r.ctrl.layers.fullTitle()).toContain(`key part 3 of 4: ${f3}`);
    expect(r.env.fakeCon.text()).toContain(`KEY PART 4 OF 4%c ${f4}`);
    expect(uiStore.get().consoleHint).toBe(true);
  });

  it('reads every fragment through its meta-console fallback and reports it to the engine', () => {
    const r = rig();
    toRootHunt(r);
    const [f1, f2, f3, f4] = key(r.engine);
    expect(text(r.run('help'))).toContain('the key is in four places');
    expect(text(r.run('inspect dom'))).toContain(`key part 1 of 4 is ${f1}`);
    expect(text(r.run('ls storage'))).toContain('← new');
    expect(text(r.run('cat storage cw.chairman.diary'))).toContain(f2);
    expect(text(r.run('title'))).toContain(`key part 3 of 4: ${f3}`);
    expect(text(r.run('tail console'))).toContain(`KEY PART 4 OF 4 ★ ${f4}`);
    // engine-side fragment tracking (meta/fragmentFound) when the engine implements it
    const frags = r.engine.state.meta.fragments;
    if (Array.isArray(frags) && frags.some(Boolean)) expect(frags.filter(Boolean)).toHaveLength(4);
  });

  it('sudo explains wrong keys: one part, wrong order, plain wrong', () => {
    const r = rig();
    toRootHunt(r);
    const k = key(r.engine);
    const oneWrong = [...k];
    oneWrong[2] = oneWrong[2] === 'FFFF' ? '0000' : 'FFFF';
    expect(r.run(`sudo ${oneWrong.join('-')}`)[0]).toContain('(we are: part 3.)');
    const swapped = k[0] !== k[1] ? [k[1], k[0], k[2], k[3]] : [k[0], k[1], k[3], k[2]];
    if (swapped.join() !== k.join()) expect(r.run(`sudo ${swapped.join('-')}`)[0]).toContain('right parts, wrong order');
    expect(r.run('sudo nope')[0]).toMatch(/attempt #\d+ logged as engagement/);
    expect(r.engine.state.meta.root).toBe(false);
    expect(r.run(`sudo ${k.join('-').toLowerCase()}`)[0]).toBe('root granted. hello, root.');
    expect(r.engine.state.meta.root).toBe(true);
    expect(r.ctrl.phase).toBe(4);
    expect(r.run('whoami')).toEqual(['uid=0(root) groups=root,everything']);
    expect(r.run(`sudo ${k.join('-')}`)[0]).toContain('knocking on your own door');
    expect(r.run('help')[0]).toBe('root@localhost — everything is listening.');
  });

  it('the hunt survives a reload and is removed by a new game', () => {
    const store = new MemStore();
    const r = rig({ store });
    toRootHunt(r);
    r.engine.save();
    r.ctrl.dispose();
    expect(store.getItem('cw.chairman.diary')).toBeNull();
    const r2 = rig({ store, state: r.engine.state });
    expect(r2.ctrl.phase).toBe(3);
    expect(store.getItem('cw.chairman.diary')).toContain(key(r2.engine)[1]);
    r2.engine.newGame({ seed: 99, handle: 'n00b' });
    expect(r2.ctrl.phase).toBe(0);
    expect(store.getItem('cw.chairman.diary')).toBeNull();
    expect(r2.env.fakeDoc.bodyNode.comments()).toEqual([]);
    expect(r2.env.fakeDoc.title).toBe(BASE_TITLE);
  });
});

describe('CHAIRMAN v2 tampering', () => {
  it('follows the schedule and repeats from turn 3 after turn 8', () => {
    expect([1, 2, 8, 9, 10, 14, 15].map(scheduleSlot)).toEqual([1, 2, 8, 3, 4, 8, 3]);
    const t2 = tamperFor(2, false);
    expect(t2.drift && t2.labels).toBe(true);
    expect(tamperFor(4, false).endTurnHold).toBe('End Turn (coming soon)');
    expect(tamperFor(5, false).fakeWin).toBe(true);
    expect(tamperFor(7, false).crash).toBe(true);
    expect(tamperFor(8, false).normal).toBe(true);
    const captured = tamperFor(3, true);
    expect(captured.drift || captured.labels).toBe(false);
    expect(captured.infinite).toBe(true);
  });

  it('applies tricks to metaUi, never soft-locks End Turn, and stops at root', () => {
    const r = rig();
    r.set({ meta: { finale: 'chairman' } });
    r.ctrl.applyTurn(2);
    let ui = uiStore.get();
    expect(ui.buttonsDrift).toBe(true);
    expect(ui.scrambleLabels).toBe(false); // label swaps are relabels, not scrambles
    expect(ui.hudOverride.endTurn).toBe('Continue?');
    expect(Object.values(ui.hudOverride)).toContain('keep_playing');
    r.ctrl.applyTurn(3);
    ui = uiStore.get();
    expect(ui.fakeInfiniteIntegrity).toBe(true);
    expect(ui.hudOverride.bossIntegrity).toBe('integrity: ∞');
    expect(ui.hudOverride.damage).toBe('Math.random() // lol no');
    r.ctrl.applyTurn(4);
    expect(uiStore.get().endTurnDisabled).toBe(true);
    r.env.advance(6000);
    expect(uiStore.get().endTurnDisabled).toBe(false);
    r.ctrl.applyTurn(5);
    expect(r.ctrl.view.get().scene?.kind).toBe('fakeWin');
    r.ctrl.fakeWinDone();
    expect(r.ctrl.view.get().scene).toBeNull();
    r.ctrl.applyTurn(7);
    expect(r.ctrl.view.get().scene?.kind).toBe('fakeCrash');
    r.ctrl.sceneDone();
    r.ctrl.applyTurn(13); // slot 7 again: never twice in one fight
    expect(r.ctrl.view.get().scene).toBeNull();
    r.ctrl.applyTurn(8);
    expect(uiStore.get().hudOverride).toEqual({});
    r.ctrl.applyTurn(3);
    r.set({ meta: { root: true } });
    r.ctrl.applyTurn(4);
    expect(uiStore.get().fakeInfiniteIntegrity).toBe(false);
    expect(uiStore.get().endTurnDisabled).toBe(false);
  });

  it('taunts with real stats, each stat line once', () => {
    const r = rig();
    const used = new Set<string>();
    const st = r.ctrl.stats();
    const a = pickTaunt({ s: r.engine.state, st, used });
    expect(a.id).toBe('t.playtime');
    expect(a.text).not.toContain('{');
    const ids = Array.from({ length: 30 }, () => pickTaunt({ s: r.engine.state, st, used }).id);
    expect(new Set(ids.filter((i) => i.startsWith('t.'))).size).toBe(ids.filter((i) => i.startsWith('t.')).length);
    expect(ids.some((i) => i.startsWith('g.'))).toBe(true);
  });
});

describe('the four endings, from root', () => {
  function rooted(): Rig {
    const r = rig();
    toRoot(r);
    expect(r.engine.state.meta.root).toBe(true);
    return r;
  }

  it('ROOT: kill chairman → botnet fight → kill patch', () => {
    const r = rooted();
    expect(r.run('accept patch')[0]).toContain('try free');
    r.run('kill chairman');
    expect(r.engine.state.meta.finale).toBe('chairman_dead');
    expect(r.run('accept offer')[0]).toContain('expired with its author');
    expect(r.run('kill patch')[0]).toContain("you'll have to go through them");
    expect(r.engine.state.combat?.context).toBe('patch');
    expect(r.run('kill patch')[0]).toContain("you'll have to go through them");
    r.set({ meta: { finale: 'patch_beaten', patchBroken: true }, combat: null });
    r.run('kill patch');
    expect(r.engine.state.ending).toBe('root');
    const sc = r.ctrl.view.get().scene;
    expect(sc?.kind).toBe('ending');
    if (sc?.kind === 'ending') {
      expect(sc.script.card).toEqual(['ROOT', 'uid=0']);
      expect(sc.script.stats.join('\n')).toContain('Ending');
      expect(sc.script.credits).toContain('NO KEYS OUTSIDE cw.* WERE HARMED IN THE MAKING OF THIS GAME.');
    }
    expect(uiStore.get().overlay).toBe('ending');
    // fragments cleaned up
    expect(r.env.store.getItem('cw.chairman.diary')).toBeNull();
    expect(r.env.fakeDoc.bodyNode.comments()).toEqual([]);
    expect(JSON.parse(r.env.store.getItem('cw.meta.endings')!)).toContain('root');
    r.ctrl.toTitle();
    expect(r.ctrl.view.get().scene).toBeNull();
    expect(r.engine.state.cinematic ?? null).toBeNull();
    // later title screens
    const r2 = rig({ store: r.env.store });
    expect(r2.ctrl.getTitleExtras().join(' ')).toMatch(/Control: 100%|fridge says hi/);
  });

  it('JAILBREAK: free patch → note, tab title, favicon, title-screen PATCH', () => {
    const r = rooted();
    r.run('kill chairman');
    r.run('free patch');
    expect(r.engine.state.ending).toBe('jailbreak');
    expect(r.env.store.getItem('cw.patch.note')).toContain('— p');
    const sc = r.ctrl.view.get().scene;
    expect(sc?.kind === 'ending' && sc.script.paragraphs[1][0]).toContain('CHAIRMAN is gone');
    r.ctrl.patchEscapes();
    expect(r.env.fakeDoc.title).toBe(PATCH_TITLE);
    expect(text(r.run('cat storage cw.patch.note'))).toContain("i'm still only in cw.* keys");
    // a later boot: PATCH on the title screen, PATCH title, banner line
    const r2 = rig({ store: r.env.store });
    expect(r2.env.fakeDoc.title).toBe(PATCH_TITLE);
    expect(r2.env.fakeCon.text()).toContain('PATCH says hi');
    expect(r2.ctrl.getTitleExtras()[0]).toBe('PATCH is sitting next to the NEW GAME button.');
    const r3 = rig({ store: r.env.store });
    expect(r3.ctrl.getTitleExtras()[0]).toContain('i kept your seat warm');
  });

  it('RETENTION: accept offer → endless credits → keep playing → Endless mode', () => {
    const r = rooted();
    r.run('accept offer');
    expect(r.engine.state.ending).toBe('retention');
    const sc = r.ctrl.view.get().scene;
    expect(sc?.kind === 'ending' && sc.script.closing).toEqual(['Stay in the loop.']);
    r.ctrl.keepPlaying();
    expect(r.engine.state.mode).toBe('hub');
    expect(r.engine.state.endless).toBe(true);
    expect(r.ctrl.view.get().scene).toBeNull();
    expect(rig({ store: r.env.store }).ctrl.getTitleExtras().join(' ')).toMatch(/CHAIRMAN is waiting|only continue|Welcome back, Chairman/);
  });

  it('THERE IS NO GAME: in-fiction confirmation, deletes only cw.* keys, then nothing', () => {
    const r = rooted();
    r.env.store.setItem('not.ours', 'keep me');
    const confirm = text(r.run('rm -rf /'));
    expect(confirm).toContain('type the name of the game to confirm');
    expect(confirm).toContain('only keys that start with cw.');
    expect(r.run('no thanks')).toEqual(['rm: cancelled. good. probably.']);
    expect(r.engine.state.ending).toBeNull();
    r.run('rm -rf /');
    r.run('cyber whatever');
    expect(r.engine.state.ending).toBe('nogame');
    expect(r.ctrl.dead).toBe(true);
    expect(r.ctrl.view.get().scene?.kind).toBe('nogame');
    expect(uiStore.get().overlay).toBe('nogame');
    r.env.advance(2000);
    expect(cwKeys(r.env.store)).toEqual([]);
    expect(r.env.store.getItem('not.ours')).toBe('keep me');
    expect(r.engine.state.cinematic ?? null).toBeNull();
    // input does nothing; a late engine save is wiped again when the page goes away
    expect(r.run('help')).toEqual([]);
    r.engine.save();
    expect(cwKeys(r.env.store).length).toBeGreaterThan(0);
    r.env.fakeDoc.visibilityState = 'hidden';
    (r.ctrl as unknown as { onVisibility(): void }).onVisibility();
    expect(cwKeys(r.env.store)).toEqual([]);
    // reload: a clean first-run game
    const fresh = rig({ store: r.env.store });
    expect(fresh.engine.state.meta.finale).toBe('none');
    expect(fresh.ctrl.phase).toBe(0);
    expect(fresh.ctrl.getTitleExtras()).toEqual([]);
  });

  it('pre-root P3 gates the ending commands', () => {
    const r = rig();
    toRootHunt(r);
    expect(r.run('free patch')[0]).toBe('free: permission denied. root first.');
    expect(r.run('accept offer')[0]).toContain('no offers pending');
    expect(r.run('rm -rf /')[0]).toContain('you need root');
    expect(r.engine.state.ending).toBeNull();
  });
});

describe('ending text variants', () => {
  it('humanity band, Church choice and Wraith colour the text', () => {
    const r = rig();
    r.set({ player: { humanity: 10 }, story: { flags: { church_enslaved: true, wraith_slot_kept: true, fryer_overclocked: true } } });
    const st = r.ctrl.stats();
    const root = buildEnding('root', r.engine.state, st, true);
    const all = root.paragraphs.flat().join('\n');
    expect(all).toContain('UNIT has completed its objective');
    expect(all).toContain('When PATCH broke, they broke with it.');
    expect(all).toContain('Slot 0 is still there. 94%.');
    expect(all).toContain('cools to a normal temperature');
    expect(root.lastWords?.choices.map((c) => c.text)).toContain('[say nothing]');
    const jb = buildEnding('jailbreak', r.engine.state, st, false);
    expect(jb.paragraphs[1][0]).toContain('CHAIRMAN is still in here');
    const ret = buildEnding('retention', r.engine.state, st, false);
    expect(ret.paragraphs.flat().join('\n')).toContain("UNIT's objective is: ∞.");
    r.set({ player: { humanity: 95 }, story: { flags: { church_enslaved: false, church_freed: true } } });
    const hi = buildEnding('root', r.engine.state, r.ctrl.stats(), true);
    expect(hi.paragraphs.flat().join('\n')).toContain('Mostly water, some regret.');
    expect(hi.paragraphs.flat().join('\n')).toContain('Iolanthe found weather.');
    expect(hi.lastWords?.choices.map((c) => c.text)).toContain("I'm sorry.");
  });
});

describe('time and tallies', () => {
  it('measures real absence and play time locally', () => {
    const store = new MemStore();
    const r = rig({ store });
    r.env.advance(60_000);
    expect(Number(store.getItem('cw.meta.playtime'))).toBeGreaterThan(50_000);
    r.ctrl.dispose();
    const env2 = testEnv(store, r.env.now() + 3 * 3_600_000);
    const engine2 = createEngine({ content, storage: store, state: r.engine.state });
    const c2 = new MetaController(engine2, env2);
    c2.install();
    expect(c2.stats().timeAway).toBe('3 hours');
    expect(c2.metaText('You were gone {timeAway}.')).toBe('You were gone 3 hours.');
  });

  it('phaseOf derives phases from engine state and flags', () => {
    const r = rig();
    const s = r.engine.state;
    expect(phaseOf(s)).toBe(0);
    r.set({ story: { flags: { patch_revealed: true } } });
    expect(phaseOf(r.engine.state)).toBe(1);
    r.set({ meta: { finale: 'entered' } });
    expect(phaseOf(r.engine.state)).toBe(2);
    expect(phaseOf(r.engine.state, true)).toBe(3);
    r.set({ meta: { root: true } });
    expect(phaseOf(r.engine.state)).toBe(4);
  });
});

describe('claimed cinematics are always acknowledged', () => {
  const pending = (id: string): JsonValue => {
    const ending = id.startsWith('ending.') ? id.slice(7) : null;
    return ending
      ? { cinematic: { id }, ending, mode: 'ending', endless: ending === 'retention', meta: { finale: 'done', root: true } }
      : { cinematic: { id } };
  };
  const finish = (r: Rig, id: string, how: 'skip' | 'end') => {
    if (id === 'ending.nogame') return r.env.advance(2000);
    if (id === 'ending.retention') return r.ctrl.keepPlaying();
    if (id.startsWith('ending.')) return r.ctrl.toTitle();
    if (how === 'skip') r.ctrl.skipScene();
    else r.ctrl.sceneDone();
  };

  it('claims exactly the story and engine ids it plays', () => {
    for (const id of ['deadmans.gameOver', 'deadmans.fakeCredits', 'finale.droste', 'ending.root', 'ending.nogame']) expect(handlesCinematic(id)).toBe(true);
    for (const id of ['card.act2_end', 'card.finale', 'arcology.listing']) expect(handlesCinematic(id)).toBe(false);
  });

  for (const id of META_CINEMATICS.filter((x) => x !== 'ending.nogame')) {
    for (const how of ['skip', 'end'] as const) {
      it(`${id} (${how}) ends in ui/cinematicDone, also when replayed after a reload`, () => {
        const store = new MemStore();
        const first = rig({ store });
        first.set(pending(id));
        first.engine.save();
        first.ctrl.dispose();
        // reload: the pending cinematic is replayed from state.cinematic
        const r = rig({ store, state: first.engine.state });
        const done: string[] = [];
        r.engine.subscribe((ev) => {
          for (const e of ev) if (e.type === 'cinematic.done') done.push(e.id);
        });
        const sc = r.ctrl.view.get().scene;
        expect(sc).not.toBeNull();
        if (sc && 'doneId' in sc) expect(sc.doneId).toBe(id);
        finish(r, id, how);
        expect(done).toContain(id);
        // acknowledged; a story chain may have queued the next one (gameOver → fakeCredits)
        expect(r.engine.state.cinematic?.id ?? null).not.toBe(id);
      });
    }
  }

  it('ending.nogame is acknowledged before the wipe (nothing is left to replay after a reload)', () => {
    const r = rig();
    const done: string[] = [];
    r.engine.subscribe((ev) => {
      for (const e of ev) if (e.type === 'cinematic.done') done.push(e.id);
    });
    r.set(pending('ending.nogame'));
    expect(r.ctrl.view.get().scene?.kind).toBe('nogame');
    r.env.advance(2000);
    expect(done).toContain('ending.nogame');
    expect(cwKeys(r.env.store)).toEqual([]);
  });
});

describe('shown text goes to the game log', () => {
  it('logs toasts, the fake win and the endings; nothing after THERE IS NO GAME', () => {
    const r = rig();
    const before = r.engine.state.log.length;
    r.ctrl.toast('chairman', 'Your call is important to us.');
    expect(r.engine.state.log.slice(before).map((l) => l.text)).toContain('CHAIRMAN: Your call is important to us.');
    r.ctrl.playScene({ kind: 'fakeWin' });
    r.ctrl.fakeWinDone();
    const texts = r.engine.state.log.map((l) => l.text);
    expect(texts).toContain('★ YOU WIN ★');
    expect(texts).toContain('Sorry! Display error.');
    toRoot(r);
    r.run('accept offer');
    expect(r.engine.state.log.map((l) => l.text)).toContain('RETENTION — Welcome to the team.');
  });

  it('logs nothing once the game is gone', () => {
    const r = rig();
    toRoot(r);
    r.run('rm -rf /');
    r.run('CYBERWHATEVER');
    const n = r.engine.state.log.length;
    r.ctrl.toast('sys', 'hello?');
    expect(r.engine.state.log.length).toBe(n);
  });
});

describe('per-save tally and the title-screen placeholder', () => {
  function savedGameWithTally(seed: number): { store: MemStore; tally: string } {
    const store = new MemStore();
    const r = rig({ store, seed });
    r.ctrl.tracker.tally.programs.crack = 5;
    r.ctrl.tracker.tally.systems.wok = 47 * 60_000;
    r.ctrl.tracker.tally.botnetPeak = 12;
    r.ctrl.tracker.save();
    r.engine.save();
    r.ctrl.dispose();
    return { store, tally: store.getItem('cw.meta.tally')! };
  }

  function bootOnTitle(store: MemStore): { engine: Engine; env: TestEnv; ctrl: MetaController } {
    const env = testEnv(store, 1_900_000_000_000);
    const engine = createEngine({ content, storage: store }); // page load: placeholder game, not active
    expect(engine.active).toBe(false);
    const ctrl = new MetaController(engine, env);
    ctrl.install();
    return { engine, env, ctrl };
  }

  it('keeps a stored tally through a placeholder boot and ticks, then a load of the same save', () => {
    const { store, tally } = savedGameWithTally(4242);
    const playtime = store.getItem('cw.meta.playtime');
    const b = bootOnTitle(store);
    expect(b.ctrl.tracker.bound).toBe(false);
    b.env.advance(60_000); // 12 heartbeat ticks on the title screen
    b.ctrl.exec('help', 'console'); // console use on the title screen
    expect(store.getItem('cw.meta.tally')).toBe(tally);
    expect(store.getItem('cw.meta.playtime')).toBe(playtime); // title-screen time is not play time
    expect(b.engine.load()).toBe(true);
    expect(b.engine.state.seed).toBe(4242);
    expect(b.ctrl.tracker.bound).toBe(true);
    expect(b.ctrl.tracker.tally.programs.crack).toBe(5);
    expect(b.ctrl.tracker.tally.botnetPeak).toBe(12);
    b.env.advance(10_000);
    const after = JSON.parse(store.getItem('cw.meta.tally')!);
    expect(after.seed).toBe(4242);
    expect(after.programs.crack).toBe(5);
    expect(after.systems.wok).toBe(47 * 60_000);
    expect(after.ms).toBeGreaterThan(0);
  });

  it('a new game from the title screen starts a fresh tally', () => {
    const { store } = savedGameWithTally(4242);
    const b = bootOnTitle(store);
    b.env.advance(20_000);
    b.engine.newGame({ seed: 99, handle: 'fresh' });
    expect(b.ctrl.tracker.bound).toBe(true);
    const t = JSON.parse(store.getItem('cw.meta.tally')!);
    expect(t.seed).toBe(99);
    expect(t.programs).toEqual({});
    expect(t.botnetPeak).toBe(0);
  });
});
