// Plays the real UI headless: new game → tutorial system → fights → loot → jack out → sell → buy →
// loadout → second system. Screenshots at 1280×720 and 390×844. Fails on console errors.
//
//   npm run dev -- --port 5199            (in another shell)
//   node scripts/e2e-play.mjs             (CW_URL, CW_SHOTS, CW_SECOND to override)
//
// Decisions read state through window.__engine (dev builds only); every action is a real click or key press.
import { mkdirSync } from 'node:fs';
import { launch } from './pw-browser.mjs';

const BASE = process.env.CW_URL ?? 'http://localhost:5199/';
const OUT = process.env.CW_SHOTS ?? 'shots'; // `rm -rf shots` clears it
const SECOND = process.env.CW_SECOND ?? ''; // system id for the second run; default: first unowned known system
mkdirSync(OUT, { recursive: true });

const errors = [];
const log = (...a) => console.log('[e2e]', ...a);
let shotN = 0;

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

async function shot(name, both = false) {
  shotN++;
  const vp = page.viewportSize();
  await page.mouse.move(vp.width - 3, vp.height - 3); // no hover tooltip in the picture
  const id = String(shotN).padStart(2, '0');
  await page.screenshot({ path: `${OUT}/${id}-${name}-desk.png` });
  if (both) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${id}-${name}-phone.png` });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(250);
  }
}

const S = () => page.evaluate(() => {
  const e = window.__engine;
  const s = e.state;
  return {
    mode: s.mode, run: s.run ? s.run.system : null, combat: !!s.combat, dialogue: !!s.dialogue,
    perks: s.player.pendingPerks, credits: s.player.credits, paydata: s.player.paydata.length,
    owned: Object.entries(s.world.systems).filter(([, v]) => v.owned).map(([k]) => k),
    known: Object.keys(s.world.addressBook),
  };
});

const has = (sel) => page.locator(sel).count().then((n) => n > 0);

async function skipFx() {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(120);
}

/** Clear any overlay that blocks play: cards, dialogue, perk picker, failure screen, hints. */
const seen = new Set();
const tutSeen = [];
const tutAge = {};
/** Screenshot each tutorial step once (the coach panel never auto-dismisses). */
async function tutShot() {
  const id = await page.evaluate(() => {
    const e = window.__engine;
    const o = window.__cwSelect.objectivesView(e).find((x) => x.kind === 'tutorial' && x.status === 'active');
    return o ? o.id : null;
  });
  if (!id || !(await has('[data-ui="coach"]'))) return;
  if (tutSeen.includes(id)) {
    // a player reads it and moves on: a step still up after a few actions gets "Got it"
    tutAge[id] = (tutAge[id] ?? 0) + 1;
    if (tutAge[id] >= 3 && (await has('[data-ui="coach-ok"]'))) { await page.click('[data-ui="coach-ok"]'); await page.waitForTimeout(150); log('tutorial: Got it on', id); }
    return;
  }
  tutSeen.push(id);
  await page.waitForTimeout(300);
  await shot(`tut-${tutSeen.length}-${id.replace(/[^a-z0-9]+/gi, '_')}`, true);
}
async function clearOverlays(maxLoops = 40) {
  await tutShot();
  for (let i = 0; i < maxLoops; i++) {
    if (await has('[data-ui="cinematic"]')) { if (!seen.has('cine')) { seen.add('cine'); await shot('cinematic', true); } await page.click('[data-ui="cinematic"]'); await page.waitForTimeout(200); continue; }
    if (await has('[data-ui="card"]')) { if (!seen.has('card')) { seen.add('card'); await shot('card', true); } await page.click('[data-ui="card"]'); await page.waitForTimeout(150); continue; }
    if (await has('[data-ui="dialogue"]')) {
      await page.keyboard.press('Enter'); // finish the typewriter
      if (!seen.has('dlg-full')) { seen.add('dlg-full'); await page.waitForTimeout(150); await shot('dialogue-choices', true); }
      await page.waitForTimeout(120);
      const choice = page.locator('[data-ui="dialogue"] .choice:not(.is-blocked)').first();
      if (await choice.count()) await choice.click();
      await page.waitForTimeout(200);
      continue;
    }
    if (await has('[data-ui="perk-picker"]')) { if (!seen.has('perk')) { seen.add('perk'); await shot('perk-picker', true); } await page.locator('[data-ui="perk-picker"] .perk-card').first().click(); await page.waitForTimeout(200); continue; }
    if (await has('[data-ui="reload-checkpoint"]')) { await shot('flatlined', true); await page.click('[data-ui="reload-checkpoint"]'); await page.waitForTimeout(300); continue; }
    if (await has('[data-ui="failure-continue"]')) { await shot('failure', true); await page.click('[data-ui="failure-continue"]'); await page.waitForTimeout(300); continue; }
    await tutShot();
    return;
  }
}

/** Pick the best program and target with the engine's own selectors, then click them. */
async function fightTurn(useKeys = false) {
  const plan = await page.evaluate(() => {
    const e = window.__engine;
    const cv = window.__cwSelect.combatView(e);
    if (!cv) return null;
    const foes = cv.ice.filter((i) => !i.subverted);
    let best = null;
    for (const pb of cv.programs) {
      if (pb.blocked) continue;
      const def = e.content.programs[pb.id];
      for (const f of pb.targeting === 'ice' ? foes : [null]) {
        let score = 0;
        if (f) {
          for (const pv of window.__cwSelect.damagePreview(e, pb.id, f.uid)) score += pv.max.core * 1.2 + pv.max.shell * 0.6 + pv.infected + (pv.kills ? 40 : 0) - pv.reflected * 2;
          if (def.category === 'exploit' && !f.intent.mapped && cv.turn === 1) score += 6;
          if (def.category === 'exploit') score += 2;
        } else {
          if (def.category === 'defense') score += cv.shield < 3 ? 5 : 1.5;
          else if (def.category === 'stealth') score += 1;
          else score += 1;
        }
        score -= pb.cost * 0.4;
        if (!best || score > best.score) best = { id: pb.id, slot: cv.programs.filter((x) => !x.evicted).findIndex((x) => x.id === pb.id) + 1, target: f ? f.uid : null, score };
      }
    }
    return { best, cycles: cv.cycles, turn: cv.turn };
  });
  if (!plan) return false;
  if (useKeys) {
    // keyboard only: Tab cycles the target, digits fire, Space ends the turn
    if (plan.best && plan.best.score > 0) {
      for (let i = 0; i < 6 && plan.best.target; i++) {
        const cur = await page.locator('.ice-card.targeted').getAttribute('data-ice-uid').catch(() => null);
        if (cur === plan.best.target) break;
        await page.keyboard.press('Tab');
      }
      if (plan.best.slot > 0 && plan.best.slot <= 9) await page.keyboard.press(String(plan.best.slot));
      else await page.click(`[data-ui="program-${plan.best.id}"]`);
    } else {
      await page.keyboard.press('Space');
    }
  } else if (plan.best && plan.best.score > 0) {
    if (plan.best.target) await page.click(`[data-ice-uid="${plan.best.target}"]`);
    await page.click(`[data-ui="program-${plan.best.id}"]`);
  } else {
    await page.click('[data-ui="end-turn"]');
  }
  await page.waitForTimeout(140);
  return true;
}

async function fight(label) {
  let turns = 0;
  let shotTaken = false;
  for (let i = 0; i < 160; i++) {
    await clearOverlays();
    const s = await S();
    if (!s.combat) break;
    await tutShot();
    if (!shotTaken && i === 2) { await page.waitForTimeout(250); await shot(`combat-${label}`, true); shotTaken = true; }
    if (i === 3 && !seen.has('meta')) {
      // every MetaUiState field, forced through the QA override, then a real End Turn click that must be refused
      seen.add('meta');
      await page.evaluate(() => window.__cwUi.metaOverride({
        scrambleLabels: true, endTurnDisabled: true, buttonsDrift: true, fakeInfiniteIntegrity: true, riggedRolls: true,
        hudOverride: { credits: 'debt', endTurn: 'END TURN (DISABLED)' }, glitch: 0.6, consoleHint: true,
      }));
      await page.waitForTimeout(300);
      const before = await page.evaluate(() => window.__engine.state.combat?.turn ?? 0);
      await page.click('[data-ui="end-turn"]', { force: true });
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => window.__engine.state.combat?.turn ?? 0);
      if (before !== after) errors.push('endTurnDisabled was not honoured');
      await shot('meta-ui-state', true);
      await page.evaluate(() => window.__cwUi.metaOverride(null));
      await page.waitForTimeout(150);
      // EULA-style demand and Paywall-style offer (state forced; the answer is a real scroll + click)
      await page.evaluate(() => window.__engine.dispatch({ type: 'debug/set', patch: { combat: {
        demand: { id: 'eula', text: Array.from({ length: 14 }, (_, k) => `${k + 1}. By continuing to exist you agree to these terms.`).join('\n'), penalty: [], source: 'qa' },
        offer: { id: 'paywall', text: 'Pay 999 ¤ to skip this fight', credits: 999 },
      } } }));
      await page.waitForTimeout(300);
      await shot('demand-offer', true);
      await page.click('[data-ui="accept-demand"]', { force: true }); // refused: not scrolled yet
      await page.locator('.demand .terms').evaluate((el) => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
      await page.waitForTimeout(150);
      await page.click('[data-ui="accept-demand"]');
      await page.waitForTimeout(200);
      if (await has('.demand')) errors.push('demand did not close after accepting');
      await page.evaluate(() => window.__engine.dispatch({ type: 'debug/set', patch: { combat: { offer: null } } }));
      await page.waitForTimeout(150);
    }
    const ok = await fightTurn(label.startsWith('kbd'));
    if (!ok) break;
    turns++;
  }
  // victory hold
  await page.waitForTimeout(400);
  if (await has('[data-ui="combat"]') && !(await S()).combat) await shot(`combat-${label}-end`);
  await skipFx();
  // wait for the end-of-fight hold to release
  for (let i = 0; i < 30 && (await has('[data-ui="combat"]')) && !(await S()).combat; i++) await page.waitForTimeout(150);
  await page.waitForTimeout(200);
  return turns;
}

async function clickNode(id) {
  const pt = await page.evaluate((nid) => window.__cwUi.nodePoint?.(nid) ?? null, id);
  if (!pt) throw new Error(`no point for node ${id}`);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(120);
}

async function nodeAction(type) {
  const sel = `[data-ui="node-${type}"]`;
  if (!(await has(sel))) return false;
  const blocked = await page.locator(sel).getAttribute('aria-disabled');
  if (blocked === 'true') return false;
  await page.click(sel);
  await page.waitForTimeout(220);
  return true;
}

/** Play one system: clear nodes outward from the gateway, loot and capture, then jack out. */
const KEYS_FOR = new Set();
async function runSystem(label) {
  let mapShot = false;
  const tried = new Set();
  for (let step = 0; step < 80; step++) {
    await clearOverlays();
    const s = await S();
    if (s.mode !== 'run' && !s.combat) break;
    if (s.combat) { await fight(`${KEYS_FOR.has(label) ? 'kbd-' : ''}${label}-${step}`); continue; }
    if (!mapShot) { await page.waitForTimeout(600); await shot(`run-${label}`, true); mapShot = true; }
    const pick = await page.evaluate((triedList) => {
      const tried = new Set(triedList);
      const e = window.__engine;
      const v = window.__cwSelect.mapView(e);
      const free = (n) => n.actions.find((a) => a.type === 'run/' + n._t && !a.reason);
      const order = ['loot', 'use', 'capture', 'netscan', 'unlock', 'backdoor', 'probe', 'breach'];
      for (const t of order) {
        for (const n of v.nodes) {
          n._t = t;
          if (!n.revealed) continue;
          if (tried.has(`${n.id}:${t}`)) continue;
          if (free(n)) return { node: n.id, action: t };
        }
      }
      return null;
    }, [...tried]);
    if (!pick) break;
    if (pick.action !== 'breach') tried.add(`${pick.node}:${pick.action}`);
    await clickNode(pick.node);
    const ok = await nodeAction(pick.action);
    log(label, 'node', pick.node, pick.action, ok ? '' : '(blocked)');
    if (!ok) break;
    await page.waitForTimeout(200);
    if (pick.action === 'loot' && !tried.has('shot:loot')) { tried.add('shot:loot'); await page.waitForTimeout(200); await shot(`loot-${label}`); }
  }
  await clearOverlays();
  if ((await S()).mode === 'run') {
    await shot(`before-jackout-${label}`);
    await page.click('[data-ui="jack-out"]');
    await page.waitForTimeout(500);
  }
  await clearOverlays();
}

async function tab(id) {
  await page.click(`[data-ui="hub-${id}"]`);
  await page.waitForTimeout(250);
}

async function jackIn(system) {
  await tab('net');
  await page.click(`[data-ui="addr-${system}"]`);
  await page.waitForTimeout(150);
  await page.click('[data-ui="jack-in"]');
  await page.waitForTimeout(700);
}

// ------------------------------------------------------------------ play

await page.goto(BASE);
await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cw.')) localStorage.removeItem(k); });
await page.reload();
await page.waitForTimeout(800);
await shot('title', true);

// One scroll for all status and event text (owner rule). Watch for any text that appears in a floating box
// (position fixed/absolute) and then vanishes on its own: that is a bypass. Allowed: the log, the ticker, the
// coach, modal overlays, tooltips, meta scenes, and numeric damage popups. Coach texts must also be in the log.
await page.evaluate(() => {
  window.__shown = new Set();
  window.__stray = [];
  const norm = (t) => (t ?? '').replace(/\*/g, '').replace(/\u2063/g, '').replace(/\s+/g, ' ').trim();
  const ALLOWED = '.log, .log-ticker, .coach, .dlg, .dlg-scrim, .overlay, .fail, .card-ov, .demand, .tip, [data-ui="perk-picker"], .cwm-root > :not(.cwm-toasts), .title-screen, button';
  const NUMERIC = /^(crit )?[+−-]?\d+(\.\d+)?(¤| xp)?( \(rigged: max\))?$/;
  const tracked = [];
  new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) {
      if (!(n instanceof HTMLElement)) continue;
      const cands = [n, ...n.querySelectorAll('*')].slice(0, 300);
      for (const el of cands) {
        const pos = getComputedStyle(el).position;
        if (pos !== 'fixed' && pos !== 'absolute') continue;
        const text = norm(el.textContent);
        if (!/[a-z]{2,}/i.test(text) || el.closest(ALLOWED)) continue;
        if (NUMERIC.test(text)) continue;
        tracked.push({ el, parent: el.parentElement, text, t: performance.now() });
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
  setInterval(() => {
    for (let i = tracked.length - 1; i >= 0; i--) {
      const x = tracked[i];
      if (!x.el.isConnected) {
        if (x.parent?.isConnected && performance.now() - x.t < 20000) window.__stray.push(x.text.slice(0, 80));
        tracked.splice(i, 1);
      } else if (performance.now() - x.t > 20000) tracked.splice(i, 1);
    }
    document.querySelectorAll('.coach-text').forEach((el) => { const n = norm(el.textContent); if (n.length > 3) window.__shown.add(n); });
  }, 150);
});

await page.fill('[data-ui="title-handle"]', 'qa_bot');
await page.click('[data-ui="title-start"]');
await page.waitForTimeout(900);
if (await has('[data-ui="dialogue"]')) await shot('dialogue-intro', true);
await clearOverlays();
await shot('hub-net', true);

let s = await S();
const first = s.known.includes('fridge') ? 'fridge' : s.known[0];
log('first system', first);
await jackIn(first);
await clearOverlays();
await runSystem(first);
s = await S();
log('after first system: owned', s.owned, 'credits', s.credits, 'paydata', s.paydata);
// the log is the complete record: transient texts must be in it
{
  const lg = await page.evaluate(() => window.__engine.state.log.map((l) => `${l.level}|${l.text}`));
  const want = [/You grab|acquired|OBJECT/, /^combat\|You run /, /^combat\|Turn \d+/, /^ui\|Tip, /, /^story\|Auntie Static: /];
  for (const re of want) if (!lg.some((l) => re.test(l))) errors.push(`log is missing a line like ${re}`);
  log('log lines:', lg.length);
}

// hub: files → sell
await tab('files');
await shot('hub-files');
if (await has('[data-ui="sell-all"]:not([aria-disabled])')) await page.click('[data-ui="sell-all"]');
await page.waitForTimeout(300);
await clearOverlays();

// inbox and jobs
await tab('inbox');
await shot('hub-inbox', true);
await tab('jobs');
const turnIn = page.locator('[data-ui^="job-turnin-"]:not([aria-disabled])').first();
if (await turnIn.count()) { await turnIn.click(); await page.waitForTimeout(300); }
const accept = page.locator('[data-ui^="job-accept-"]:not([aria-disabled])').first();
if (await accept.count()) { await accept.click(); await page.waitForTimeout(300); }
await clearOverlays();
await shot('hub-jobs');

// market: buy the cheapest affordable program, else hardware
await tab('market');
await clearOverlays();
await page.click('[data-ui="vendor-warez"]').catch(() => {});
await page.waitForTimeout(300);
await clearOverlays();
await shot('hub-market', true);
const bought = await page.evaluate(() => {
  const e = window.__engine;
  const opts = [];
  for (const v of Object.keys(e.content.vendors)) for (const st of window.__cwSelect.vendorStock(e, v)) if (st.available && (st.kind === 'program' || st.kind === 'hardware')) opts.push({ v, id: st.id, price: st.price, kind: st.kind });
  opts.sort((a, b) => a.price - b.price);
  return opts[0] ?? null;
});
if (bought) {
  await page.click(`[data-ui="vendor-${bought.v}"]`);
  await page.waitForTimeout(300);
  await clearOverlays();
  const btn = page.locator(`[data-ui="buy-${bought.id}"]`);
  if (await btn.count()) { await btn.click(); log('bought', bought.id, bought.price); }
  await page.waitForTimeout(300);
}
await clearOverlays();

// loadout
await tab('deck');
const load = page.locator('[data-ui^="load-"]:not([aria-disabled])').first();
if (await load.count()) { await load.click(); await page.waitForTimeout(200); }
await shot('hub-deck', true);
await tab('botnet');
const botnetRole = page.locator('[data-ui$="-botnet"]:not([aria-disabled])').first();
if (await botnetRole.count()) { await botnetRole.click(); await page.waitForTimeout(200); }
await shot('hub-botnet');
await tab('wallet');
await shot('hub-wallet');
await tab('rep');
await tab('stats');
await shot('hub-stats');
await clearOverlays();

// second system
s = await S();
const second = SECOND || s.known.find((k) => !s.owned.includes(k) && k !== first) || s.known.find((k) => k !== first);
if (second) {
  log('second system', second, '(fights by keyboard)');
  KEYS_FOR.add(second);
  await jackIn(second);
  await clearOverlays();
  await runSystem(second);
}
s = await S();
log('end: owned', s.owned, 'credits', s.credits, 'mode', s.mode);
await shot('end', true);

// failure screens: push trace to the edge, then a real probe click gets us traced
s = await S();
const target = s.known.find((k) => !s.owned.includes(k)) ?? s.known[0];
await jackIn(target);
await clearOverlays();
if ((await S()).mode === 'run') {
  await page.evaluate(() => window.__engine.dispatch({ type: 'debug/set', patch: { run: { trace: 99 } } }));
  const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.accessible && n.actions.some((a) => a.type === 'run/probe' && !a.reason))?.id ?? null);
  if (gw) {
    await clickNode(gw);
    await nodeAction('probe');
    await page.waitForTimeout(1800);
    if (await has('[data-ui="failure-traced"]')) { await shot('failure-traced', true); await page.click('[data-ui="failure-continue"]'); }
    else log('no traced screen');
  }
}
await clearOverlays();
// every shown text must be in the log
{
  const res = await page.evaluate(() => {
    const norm = (t) => (t ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    const lines = window.__engine.state.log.map((l) => norm(l.text));
    const missing = [...window.__shown].filter((t) => !lines.some((l) => l.includes(t)));
    return { shown: window.__shown.size, missing, stray: [...new Set(window.__stray)] };
  });
  log(`coach texts checked against the log: ${res.shown}, missing: ${res.missing.length}; floating texts that vanished outside the log: ${res.stray.length}`);
  for (const t of res.stray.slice(0, 10)) errors.push(`event text shown outside the log: ${t}`);
  // the log keeps 500 lines; very old toasts may have scrolled out, so only flag a few for review
  for (const m of res.missing.slice(0, 10)) errors.push(`shown but not in the log: ${m}`);
}
// flatline screen (state forced; the reload button is the real one)
await page.evaluate(() => window.__engine.dispatch({ type: 'debug/set', patch: { mode: 'flatlined' } }));
await page.waitForTimeout(400);
if (await has('[data-ui="failure-flatlined"]')) { await shot('failure-flatlined', true); await page.click('[data-ui="reload-checkpoint"]'); await page.waitForTimeout(400); }
else log('no flatline screen');
log('after reload: mode', (await S()).mode);

// settings modal
await page.keyboard.press('o');
await page.waitForTimeout(250);
await shot('settings');
await page.keyboard.press('Escape');

await browser.close();
if (errors.length) {
  console.error(`[e2e] ${errors.length} console errors:\n` + errors.join('\n'));
  process.exit(1);
}
log(`ok, ${shotN} screenshots in ${OUT}/; tutorial steps seen: ${tutSeen.join(', ') || 'none'}`);
