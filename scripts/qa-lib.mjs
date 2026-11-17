// Shared helpers for the late-game QA scripts (scripts/qa-*.mjs).
// Serve a production build first:  npm run build && npx vite preview --port 5231
// Then:  CW_URL='http://localhost:5231/' node scripts/qa-<area>.mjs
// `?qa` is appended automatically (exposes window.__engine / __cwSelect / __cwUi).
// State jumps use debug/set; the interactions under test are real clicks and keys.
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { launch } from './pw-browser.mjs';

export const BASE = (process.env.CW_URL ?? 'http://localhost:5231/').replace(/\/?$/, '/');
export const QA_URL = `${BASE}?qa`;
export const OUT = process.env.CW_SHOTS ?? 'qa-shots';
mkdirSync(OUT, { recursive: true });

export const DESK = { width: 1280, height: 720 };
export const PHONE = { width: 390, height: 844 };

/** Open a browser page that records console errors, page errors, dialogs and off-origin requests. */
export async function open(name, { viewport = DESK, reducedMotion, initScript } = {}) {
  for (const f of readdirSync(OUT)) if (f.startsWith(`${name}-`)) rmSync(`${OUT}/${f}`);
  const browser = await launch();
  const context = await browser.newContext({ viewport, reducedMotion });
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  const errors = [];
  const notes = [];
  const origin = new URL(BASE).origin;
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('dialog', async (d) => {
    errors.push(`native dialog: ${d.type()} "${d.message()}"`);
    await d.dismiss().catch(() => {});
  });
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith('data:') || u.startsWith('blob:')) return;
    if (!u.startsWith(origin)) errors.push(`off-origin request: ${u}`);
  });
  let n = 0;
  const log = (...a) => console.log(`[${name}]`, ...a);
  const check = (ok, msg) => {
    if (ok) notes.push(`ok: ${msg}`);
    else { errors.push(`FAIL: ${msg}`); log('FAIL', msg); }
    return ok;
  };
  /** Screenshot at the current size, then (both=true) at the other size too. */
  async function shot(label, both = true) {
    n++;
    const id = String(n).padStart(2, '0');
    const vp = page.viewportSize();
    await page.mouse.move(vp.width - 2, vp.height - 2).catch(() => {});
    const file = `${OUT}/${name}-${id}-${label}`;
    await page.screenshot({ path: `${file}-${vp.width}.png` });
    if (both) {
      const other = vp.width === DESK.width ? PHONE : DESK;
      await page.setViewportSize(other);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${file}-${other.width}.png` });
      await page.setViewportSize(vp);
      await page.waitForTimeout(300);
    }
  }
  return { browser, context, page, errors, notes, log, check, shot };
}

export const has = (page, sel) => page.locator(sel).count().then((n) => n > 0);
export const wait = (page, ms) => page.waitForTimeout(ms);

/** Fresh page: clear cw.* keys, start a new game through the title screen. */
export async function freshGame(page, handle = 'qa', { tutorials = false } = {}) {
  await page.goto(QA_URL);
  await page.evaluate((tutorials) => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('cw.')) localStorage.removeItem(k);
    // late-game scripts: the player finished the tutorial long ago
    if (!tutorials) localStorage.setItem('cw.ui.settings', JSON.stringify({ tutorials: false }));
  }, tutorials);
  await page.reload();
  await page.waitForSelector('[data-ui="title-start"], [data-ui="title-new"]');
  if (await has(page, '[data-ui="title-new"]')) await page.click('[data-ui="title-new"]');
  await page.fill('[data-ui="title-handle"]', handle);
  await page.click('[data-ui="title-start"]');
  await page.waitForTimeout(600);
}

export const S = (page) => page.evaluate(() => {
  const e = window.__engine;
  const s = e.state;
  return {
    mode: s.mode, run: s.run?.system ?? null, combat: s.combat ? { context: s.combat.context, turn: s.combat.turn } : null,
    dialogue: s.dialogue?.id ?? null, cinematic: s.cinematic?.id ?? null, finale: s.meta.finale, root: s.meta.root,
    ending: s.ending, credits: s.player.credits, heat: s.player.heat, flags: s.story.flags,
  };
});

export const dispatch = (page, action) => page.evaluate((a) => window.__engine.dispatch(a).map((e) => e.type), action);
export const patch = (page, p) => dispatch(page, { type: 'debug/set', patch: p });

/**
 * A late-game player: max hardware, every program owned, a strong loadout, money, rep 10,
 * every non-finale address known, `hosts` botnet hosts. Extra state via `extra` (deep-merged).
 */
export async function lateGame(page, { hosts = 24, flags = {}, extra = {}, known, credits = 50000, humanity } = {}) {
  await page.evaluate(({ hosts, flags, extra, known, credits, humanity }) => {
    const e = window.__engine;
    const C = e.content;
    const hw = {};
    for (const h of Object.values(C.hardware)) hw[h.part] = Math.max(hw[h.part] ?? 0, h.tier);
    const programs = {};
    for (const id of Object.keys(C.programs)) programs[id] = { corrupted: false };
    const book = {};
    const systems = {};
    const ids = known ?? Object.keys(C.systems).filter((id) => id !== C.setup.localhost);
    for (const id of ids) {
      book[id] = { system: id, source: 'qa', cycle: e.state.cycle, notes: [] };
      systems[id] = e.state.world.systems[id] ?? { owned: false, patch: 0, hardenedUntil: 0, revealed: [], looted: [], used: [], netscanned: [], runs: 0 };
    }
    const hostList = [];
    for (let i = 0; i < hosts; i++) hostList.push({ uid: `qah${i}`, name: `qa-toaster-${i}`, power: 1 + (i % 6), tier: 1 + (i % 5), role: 'botnet' });
    const p = {
      credits, xp: 5200, rep: 10, hardware: hw, programs, hosts: hostList, neural: 30, integrity: 80, pendingPerks: null,
    };
    if (humanity !== undefined) p.humanity = humanity;
    // a late-game player finished the tutorial long ago
    const objectives = {};
    for (const [id, o] of Object.entries(e.state.story.objectives)) if (o.kind === 'tutorial') objectives[id] = { status: 'done' };
    const fired = [...new Set([...e.state.story.fired, ...C.triggers.filter((t) => t.id.startsWith('tut.')).map((t) => t.id)])];
    e.dispatch({ type: 'debug/set', patch: { player: p, world: { addressBook: book, systems }, story: { flags, objectives, fired } } });
    // a loadout that fits: best version of each family, one per category first, by price
    const sel = window.__cwSelect;
    const ram = sel.deckStat(e, 'ram');
    const best = {};
    for (const d of Object.values(C.programs)) {
      if (d.category === 'special' || (d.tags ?? []).includes('joke')) continue;
      const f = d.family ?? d.id;
      if (!best[f] || d.version > best[f].version) best[f] = d;
    }
    const cands = Object.values(best).filter((d) => sel.canDo(e, { type: 'loadout/set', programs: [d.id] }).ok).sort((a, b) => b.price - a.price);
    const out = [];
    let used = 0;
    const cats = new Set();
    for (const pass of [0, 1]) {
      for (const d of cands) {
        if (out.includes(d.id) || used + d.ram > ram || out.length >= 9) continue;
        if (pass === 0 && cats.has(d.category)) continue;
        out.push(d.id); used += d.ram; cats.add(d.category);
      }
    }
    e.dispatch({ type: 'loadout/set', programs: out });
    if (Object.keys(extra).length) e.dispatch({ type: 'debug/set', patch: extra });
  }, { hosts, flags, extra, known, credits, humanity });
  await page.waitForTimeout(300);
}

/** Clear blocking overlays: cards, dialogue (first enabled choice or `pick`), perk picker, failure screens. */
export async function clearOverlays(page, { pick, maxLoops = 60, onDialogue } = {}) {
  for (let i = 0; i < maxLoops; i++) {
    if (await has(page, '[data-ui="card"]')) { await page.click('[data-ui="card"]'); await wait(page, 200); continue; }
    if (await has(page, '[data-ui="cinematic"]')) { await page.click('[data-ui="cinematic"]'); await wait(page, 200); continue; }
    if (await has(page, '[data-ui="dialogue"]')) {
      if (onDialogue) await onDialogue();
      await page.keyboard.press('Enter');
      await wait(page, 150);
      const choices = page.locator('[data-ui="dialogue"] .choice:not(.is-blocked)');
      if (await choices.count()) {
        let idx = 0;
        if (pick) {
          const texts = await choices.allTextContents();
          const j = texts.findIndex((t) => pick.test(t));
          if (j >= 0) idx = j;
        }
        await choices.nth(idx).click();
      }
      await wait(page, 200);
      continue;
    }
    if (await has(page, '[data-ui="perk-picker"]')) { await page.locator('[data-ui="perk-picker"] .perk-card').first().click(); await wait(page, 200); continue; }
    if (await has(page, '[data-ui="failure-continue"]')) { await page.click('[data-ui="failure-continue"]'); await wait(page, 300); continue; }
    return;
  }
}

export async function tab(page, id) {
  await clearOverlays(page);
  await page.click(`[data-ui="hub-${id}"]`);
  await wait(page, 250);
}

/** Dial in through the Net panel with real clicks. */
export async function dialIn(page, system) {
  await tab(page, 'net');
  await page.click(`[data-ui="addr-${system}"]`);
  await wait(page, 150);
  await page.click('[data-ui="jack-in"]');
  await wait(page, 900);
  // skip the typed MOTD (not a meta scene: Escape would skip that too)
  if (!(await has(page, '.cwm-full'))) await page.keyboard.press('Escape').catch(() => {});
  await wait(page, 200);
}

export async function clickNode(page, id) {
  let pt = null;
  for (let i = 0; i < 30 && !pt; i++) {
    pt = await page.evaluate((nid) => window.__cwUi.nodePoint?.(nid) ?? null, id);
    if (!pt) { await page.keyboard.press('Escape').catch(() => {}); await wait(page, 200); }
  }
  if (!pt) {
    await page.screenshot({ path: `${OUT}/_no-point-${id}.png` });
    throw new Error(`no point for node ${id}`);
  }
  await page.mouse.click(pt.x, pt.y);
  await wait(page, 150);
}

export async function nodeAction(page, type) {
  const sel = `[data-ui="node-${type}"]`;
  if (!(await has(page, sel))) return false;
  if ((await page.locator(sel).getAttribute('aria-disabled')) === 'true') return false;
  await page.click(sel);
  await wait(page, 250);
  return true;
}

/** One player turn picked with the engine's selectors, done with real clicks (or keys). */
export async function fightTurn(page, { keys = false, avoid = [] } = {}) {
  const plan = await page.evaluate((avoid) => {
    const e = window.__engine;
    const sel = window.__cwSelect;
    const cv = sel.combatView(e);
    if (!cv) return null;
    const foes = cv.ice.filter((i) => !i.subverted && !i.dead);
    let best = null;
    for (const pb of cv.programs) {
      if (pb.blocked || pb.evicted || avoid.includes(pb.id)) continue;
      const def = e.content.programs[pb.id];
      for (const f of pb.targeting === 'ice' ? foes : [null]) {
        let score = 0;
        if (f) {
          for (const pv of sel.damagePreview(e, pb.id, f.uid)) score += pv.max.core * 1.2 + pv.max.shell * 0.6 + pv.infected + (pv.kills ? 40 : 0) - pv.reflected * 3;
          if (def.category === 'exploit') score += 2;
        } else score += def.category === 'defense' ? (cv.shield < 3 ? 5 : 1) : 1;
        score -= pb.cost * 0.4;
        if (!best || score > best.score) best = { id: pb.id, slot: cv.programs.filter((x) => !x.evicted).findIndex((x) => x.id === pb.id) + 1, target: f ? f.uid : null, score };
      }
    }
    return { best, cycles: cv.cycles };
  }, avoid);
  if (!plan) return false;
  if (plan.best && plan.best.score > 0) {
    if (keys) {
      for (let i = 0; i < 6 && plan.best.target; i++) {
        const cur = await page.locator('.ice-card.targeted').getAttribute('data-ice-uid').catch(() => null);
        if (cur === plan.best.target) break;
        await page.keyboard.press('Tab');
      }
      await page.keyboard.press(String(plan.best.slot));
    } else {
      // tap the ICE only to change target: tapping the current target again opens the inspector (sheet on phones)
      const cur = await page.locator('.ice-card.targeted').getAttribute('data-ice-uid').catch(() => null);
      if (plan.best.target && cur !== plan.best.target) await page.click(`[data-ice-uid="${plan.best.target}"]`, { force: true });
      if (await has(page, '.inspector.insp-sheet, .inspector.insp-overlay')) await page.keyboard.press('Escape');
      await page.click(`[data-ui="program-${plan.best.id}"]`, { force: true });
    }
  } else if (keys) await page.keyboard.press('Space');
  else await page.click('[data-ui="end-turn"]', { force: true });
  await wait(page, 160);
  return true;
}

/** Fight until the combat ends or `until(state)` is true. Returns the number of steps. */
export async function fight(page, { keys = false, maxSteps = 300, until, onStep, pick } = {}) {
  let i = 0;
  for (; i < maxSteps; i++) {
    await clearOverlays(page, { pick });
    const s = await S(page);
    if (!s.combat) break;
    if (until && (await until(s))) break;
    if (onStep) await onStep(i, s);
    await page.keyboard.press('Escape').catch(() => {}); // skip animation holds
    if (!(await fightTurn(page, { keys }))) break;
  }
  await wait(page, 500);
  await page.keyboard.press('Escape').catch(() => {});
  for (let k = 0; k < 30 && (await has(page, '[data-ui="combat"]')) && !(await S(page)).combat; k++) await wait(page, 150);
  return i;
}

/** Visible text check: banned words and the title spelling. */
export async function wordingCheck(page) {
  return page.evaluate(() => {
    const t = document.body.innerText + '\n' + document.title;
    const bad = [];
    for (const re of [/jack(ed|ing)?[ -]?(in|out)\b/i, /CYBERWHATEVER/, /CYBER-WHATEVER/]) {
      const m = t.match(re);
      if (m) bad.push(`${re}: "${t.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, ' ')}"`);
    }
    return bad;
  });
}

export async function storageKeys(page) {
  return page.evaluate(() => Object.keys(localStorage));
}

/** Print notes and errors, close, exit 1 on errors. */
export async function finish(ctx) {
  const { browser, errors, notes, log } = ctx;
  for (const n of notes) log(n);
  await browser.close();
  if (errors.length) {
    console.error(`[qa] ${errors.length} problem(s):\n  ` + errors.join('\n  '));
    process.exitCode = 1;
  } else log('clean');
}

/** Explore the current run with real clicks: loot/capture/enter/breach outward. Fights with fightTurn. */
export async function playRun(page, { maxSteps = 200, stop, prefer = ['loot', 'use', 'capture', 'unlock', 'enter', 'breach'], pick, onFightStep } = {}) {
  const tried = new Set();
  for (let step = 0; step < maxSteps; step++) {
    const s0 = await S(page);
    if (stop && (await stop(s0))) return 'stop';
    if (s0.cinematic) return 'cinematic';
    await clearOverlays(page, { pick });
    const s = await S(page);
    if (stop && (await stop(s))) return 'stop';
    if (s.cinematic) return 'cinematic';
    if (s.mode !== 'run' && !s.combat) return 'left';
    if (s.combat) {
      if (onFightStep) await onFightStep(step, s);
      await page.keyboard.press('Escape').catch(() => {});
      await fightTurn(page);
      continue;
    }
    const next = await page.evaluate(({ triedList, prefer }) => {
      const tried = new Set(triedList);
      const v = window.__cwSelect.mapView(window.__engine);
      for (const t of prefer) for (const n of v.nodes) {
        if (!n.revealed || tried.has(`${n.id}:${t}`)) continue;
        if (n.actions.find((a) => a.type === 'run/' + t && !a.reason)) return { node: n.id, action: t };
      }
      return null;
    }, { triedList: [...tried], prefer });
    if (!next) return 'stuck';
    if (next.action !== 'breach') tried.add(`${next.node}:${next.action}`);
    await clickNode(page, next.node);
    if (!(await nodeAction(page, next.action))) tried.add(`${next.node}:${next.action}`);
  }
  return 'steps';
}

export const FINALE_FLAGS = {
  act1_done: true, act2_started: true, act2_done: true, act3_started: true, patch_revealed: true, deadmans_done: true,
  auntie_unmasked: true, deaddrop_done: true, act: 3, meta_console_visible: true, backbone_open: true, backbone_done: true,
  board_defeated: true, chairman_v1_defeated: true, localhost_revealed: true, wraith_flatlined: true,
};

/** Late game at the finale: 127.0.0.1 known, flags set, in the hub. */
export async function finaleSetup(page, opts = {}) {
  await lateGame(page, { flags: FINALE_FLAGS, known: undefined, ...opts });
  await page.evaluate(() => {
    const e = window.__engine;
    const id = e.content.setup.localhost;
    e.dispatch({ type: 'debug/set', patch: { world: { addressBook: { [id]: { system: id, source: 'qa', cycle: e.state.cycle, notes: [] } } } } });
  });
  await clearOverlays(page);
}

/** Open the meta console if needed and run one command by typing it. Returns the lines it printed. */
export async function metaCmd(page, cmd, { via = 'key' } = {}) {
  if (!(await has(page, '#cwm-input'))) {
    if (via === 'key') await page.keyboard.press('Backquote');
    else await page.click('.cwm-corner', { force: true });
    await wait(page, 250);
  }
  const before = await page.locator('.cwm-out .cwm-l').count();
  await page.fill('#cwm-input', cmd);
  await page.keyboard.press('Enter');
  await wait(page, 350);
  const all = await page.locator('.cwm-out .cwm-l').allTextContents();
  return all.slice(before);
}

export async function closeConsole(page) {
  if (await has(page, '#cwm-input')) {
    await page.focus('#cwm-input');
    await page.keyboard.press('Escape');
    await wait(page, 200);
  }
}

/** Parse the four fragments from meta-console output lines. */
export function fragmentsFrom(lines) {
  const f = [null, null, null, null];
  const txt = lines.join('\n');
  for (const m of txt.matchAll(/key part (\d) of 4(?: is|:| ★)\s*([0-9A-F?]{4})/gi)) f[Number(m[1]) - 1] = m[2].toUpperCase();
  return f;
}

/** Test arena: put these ICE on `system`'s gateway (content mutated in the page for this session only). */
export async function arena(page, ice, { system = 'wok', node } = {}) {
  await page.evaluate(({ ice, system, node }) => {
    const e = window.__engine;
    const sys = e.content.systems[system];
    const n = node ? sys.nodes.find((x) => x.id === node) : sys.nodes.find((x) => x.type === 'gateway');
    n.ice = ice.map((x) => (typeof x === 'string' ? { ice: x } : x));
    e.dispatch({ type: 'debug/set', patch: { world: { systems: { [system]: { owned: false, hardenedUntil: 0, patch: 0 } } } } });
  }, { ice, system, node });
}

/** Click a program (with a target ICE uid, or the current one). Returns true if the engine accepted it. */
export async function fire(page, program, target) {
  if (target) await page.click(`[data-ice-uid="${target}"]`, { force: true });
  const before = await page.evaluate(() => window.__engine.state.combat?.cycles ?? 0);
  await page.click(`[data-ui="program-${program}"]`, { force: true });
  await wait(page, 200);
  const after = await page.evaluate(() => window.__engine.state.combat?.cycles ?? 0);
  return after !== before;
}

export async function endTurn(page) {
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.press('Space');
  await wait(page, 500);
  await page.keyboard.press('Escape').catch(() => {});
  await wait(page, 150);
}

export const combatInfo = (page) => page.evaluate(() => {
  const e = window.__engine;
  const c = e.state.combat;
  if (!c) return null;
  return {
    turn: c.turn, cycles: c.cycles, status: c.status, charges: c.charges, pending: c.pending ?? [],
    ice: c.ice.map((i) => ({ uid: i.uid, def: i.def, name: i.name, dead: i.dead, subverted: i.subverted, shell: i.shell.points, core: i.core, status: i.status })),
    daemons: c.daemons, hosts: e.state.player.hosts.length, neural: e.state.player.neural, integrity: e.state.player.integrity,
  };
});
