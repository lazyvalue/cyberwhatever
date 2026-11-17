// Plays the fridge tutorial the way a first-time player would: read the coach, do exactly what it points at.
// "Got it" is pressed only for information-only steps (no completion condition). Screenshots every step at
// 1280×720 and 390×844 (shots/walk-*), checks each step points at something visible, and fails loudly on:
// a step that was skipped, a step that is stuck, a step without a visible target, or console errors.
//
//   CW_URL='http://localhost:5198/?qa' node scripts/tutorial-walk.mjs
import { mkdirSync } from 'node:fs';
import { launch } from './pw-browser.mjs';

const BASE = process.env.CW_URL ?? 'http://localhost:5199/?qa';
mkdirSync('shots', { recursive: true });
const problems = [];
const errors = [];
const order = [];
const log = (...a) => console.log('[walk]', ...a);

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

const has = (sel) => page.locator(sel).count().then((n) => n > 0);
const st = () => page.evaluate(() => {
  const e = window.__engine;
  const s = e.state;
  const tut = window.__cwSelect.objectivesView(e).filter((o) => o.kind === 'tutorial');
  return {
    mode: s.mode, run: s.run?.system ?? null, combat: !!s.combat, dialogue: !!s.dialogue, cinematic: !!s.cinematic,
    progress: [s.cycle, s.combat?.turn ?? 0, s.combat?.cycles ?? 0, s.run?.position ?? '', s.player.credits, s.player.loadout.join(','), s.player.hosts.map((h) => h.role).join(',')].join('|'),
    active: tut.find((o) => o.status === 'active') ?? null,
    done: tut.filter((o) => o.status === 'done').map((o) => o.id),
    tab: null,
  };
});

async function shot(name, checkTarget = true) {
  // let an end-of-fight hold finish, as a player would see it
  for (let i = 0; i < 20 && (await has('[data-ui="combat"]')) && !(await page.evaluate(() => !!window.__engine.state.combat)); i++) await page.waitForTimeout(150);
  const vp = page.viewportSize();
  await page.mouse.move(vp.width - 3, vp.height - 3);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `shots/walk-${name}-desk.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `shots/walk-${name}-phone.png` });
  // the coach must point at something visible on the phone too
  if (checkTarget && !(await targetVisible())) problems.push(`${name}: no visible target at 390 px`);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(300);
}

async function targetVisible() {
  return page.evaluate(() => {
    if (window.__cwUi.coachNode?.()) return true;
    const el = document.querySelector('.coach-target');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const coach = document.querySelector('[data-ui="coach"]')?.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const covered = coach && cx > coach.left && cx < coach.right && cy > coach.top && cy < coach.bottom;
    return !covered && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  });
}

async function clearBlockers() {
  for (let i = 0; i < 30; i++) {
    if (await has('[data-ui="cinematic"]')) { await page.click('[data-ui="cinematic"]'); await page.waitForTimeout(200); continue; }
    if (await has('[data-ui="card"]')) { await page.click('[data-ui="card"]'); await page.waitForTimeout(200); continue; }
    if (await has('[data-ui="dialogue"]')) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(120);
      const c = page.locator('[data-ui="dialogue"] .choice:not(.is-blocked)').first();
      if (await c.count()) await c.click();
      await page.waitForTimeout(200);
      continue;
    }
    if (await has('[data-ui="perk-picker"]')) { await page.locator('.perk-card').first().click(); await page.waitForTimeout(200); continue; }
    if (await has('[data-ui="failure-continue"]')) { problems.push('failure screen during the tutorial'); await page.click('[data-ui="failure-continue"]'); continue; }
    if (await has('[data-ui="reload-checkpoint"]')) { problems.push('flatlined during the tutorial'); await page.click('[data-ui="reload-checkpoint"]'); continue; }
    return;
  }
}

/** A fight move when the coach points at something that is not a button (shell bar, core bar, Flow pips, trace). */
async function fightMove(stepId) {
  const plan = await page.evaluate((stepId) => {
    const e = window.__engine;
    const S = window.__cwSelect;
    const cv = S.combatView(e);
    if (!cv) return null;
    const foes = cv.ice.filter((i) => !i.subverted);
    const used = new Set(cv.flow.categories);
    let best = null;
    for (const pb of cv.programs) {
      if (pb.blocked) continue;
      const def = e.content.programs[pb.id];
      for (const f of pb.targeting === 'ice' ? foes : [null]) {
        let sc = 0;
        if (f) for (const pv of S.damagePreview(e, pb.id, f.uid)) sc += pv.max.core + pv.max.shell * (stepId === 'tut.shells' ? 3 : 0.7) + (pv.kills ? 20 : 0);
        else sc = def.category === 'defense' ? 2 : 1;
        if (stepId === 'tut.flow' && !used.has(def.category)) sc += 50;
        sc *= pb.mult;
        if (!best || sc > best.sc) best = { id: pb.id, target: f?.uid ?? null, sc };
      }
    }
    return best;
  }, stepId);
  if (plan) {
    if (plan.target) await page.click(`[data-ice-uid="${plan.target}"]`);
    await page.click(`[data-ui="program-${plan.id}"]`);
  } else await page.click('[data-ui="end-turn"]', { force: true });
}

/** Steps whose final click lives inside the tab the coach opened. */
async function hubFollowUp(stepId) {
  if (stepId === 'tut.role') {
    const b = page.locator('[data-ui^="host-"][data-ui$="-mine"]').first();
    if (await b.count()) return b.click();
  }
  if (stepId === 'tut.buy') {
    const pick = await page.evaluate(() => {
      const e = window.__engine;
      const opts = [];
      for (const v of Object.keys(e.content.vendors)) for (const s of window.__cwSelect.vendorStock(e, v)) if (s.available && s.kind === 'program') opts.push({ v, id: s.id, price: s.price });
      opts.sort((a, b) => a.price - b.price);
      return opts[0] ?? null;
    });
    if (pick) {
      await page.click(`[data-ui="vendor-${pick.v}"]`);
      await page.waitForTimeout(300);
      await clearBlockers();
      return page.click(`[data-ui="buy-${pick.id}"]`);
    }
    problems.push(`tut.buy: nothing affordable to buy with ${await page.evaluate(() => window.__engine.state.player.credits)}¤`);
  }
  if (stepId === 'tut.load') {
    const b = page.locator('[data-ui^="load-"]:not([aria-disabled])').first();
    if (await b.count()) return b.click();
    problems.push('tut.load: nothing loadable');
  }
  if (stepId === 'tut.next' || stepId === 'tut.dial_in') {
    const sys = stepId === 'tut.next' ? 'wok' : 'fridge';
    if (await has(`[data-ui="addr-${sys}"]`)) await page.click(`[data-ui="addr-${sys}"]`);
  }
  return null;
}

// ------------------------------------------------------------------ walk

await page.goto(BASE);
await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cw.')) localStorage.removeItem(k); });
await page.reload();
await page.waitForTimeout(600);
await page.fill('[data-ui="title-handle"]', 'first_timer');
await page.click('[data-ui="title-start"]');
await page.waitForTimeout(800);

const fallbackUsed = new Set();
let lastKey = '';
let stuck = 0;
for (let i = 0; i < 400; i++) {
  await clearBlockers();
  await page.waitForTimeout(150);
  const s = await st();
  const coach = await has('[data-ui="coach"]');
  if (!coach) {
    if (!s.active && s.done.includes('tut.next')) break;
    // the coach can lag a frame behind the engine
    await page.waitForTimeout(300);
    if (!(await has('[data-ui="coach"]'))) {
      if (s.combat) { await fightMove(null); continue; }
      problems.push(`no coach on screen (active: ${s.active?.id ?? 'none'})`);
      break;
    }
  }
  const stepId = await page.getAttribute('[data-ui="coach-ok"]', 'data-step');
  const already = await has('[data-ui="coach-already"]');
  if (!order.includes(stepId)) {
    order.push(stepId);
    log(`step ${order.length}: ${stepId}${already ? ' (already done before it was shown)' : ''}`);
    if (already) problems.push(`${stepId}: its action happened before the step was shown`);
    else if (!(await targetVisible()) && (await page.evaluate((id) => !!window.__engine.state.story.objectives[id]?.doneWhen, stepId))) {
      // a hub step may point at its tab first; that is a visible target too
      problems.push(`${stepId}: no visible target at 1280 px`);
    }
    if (!already) {
      const why = await page.evaluate(() => {
        const el = document.querySelector('.coach-target');
        if (el && (el.getAttribute('aria-disabled') === 'true' || el.classList.contains('is-blocked'))) return `points at an unusable control (${el.getAttribute('data-tip')?.split('\n').pop() ?? ''})`;
        const e = window.__engine;
        if (e.state.combat && el?.matches('.prog') && e.state.combat.cycles <= 0) return 'asks for a program with no cycles left';
        return null;
      });
      if (why) problems.push(`${stepId}: ${why}`);
    }
    await shot(`${String(order.length).padStart(2, '0')}-${stepId.replace(/\W+/g, '_')}`, !already);
  }
  const key = `${stepId}|${JSON.stringify(s)}`;
  stuck = key === lastKey ? stuck + 1 : 0;
  lastKey = key;
  if (stuck === 20 && process.env.CW_DEBUG) log('stuck state', key.slice(0, 400), await page.evaluate(() => document.querySelector('.coach-target')?.outerHTML?.slice(0, 200) ?? 'no target'));
  if (stuck > 25) { problems.push(`${stepId}: stuck, the walk could not do what it asks`); await page.click('[data-ui="coach-ok"]'); continue; }

  if (already) { await page.click('[data-ui="coach-ok"]'); continue; }
  const infoOnly = await page.evaluate((id) => !window.__engine.state.story.objectives[id]?.doneWhen, stepId);
  if (infoOnly) { await page.waitForTimeout(200); await page.click('[data-ui="coach-ok"]'); continue; }

  const node = await page.evaluate(() => window.__cwUi.coachNode?.() ?? null);
  if (node) {
    const pt = await page.evaluate((n) => window.__cwUi.nodePoint?.(n) ?? null, node);
    if (pt) { await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(150); continue; }
  }
  const target = await page.evaluate(() => {
    const el = document.querySelector('.coach-target');
    if (!el) return null;
    const clickable = el.matches('button, [role="button"], [role="option"]') && el.getAttribute('aria-disabled') !== 'true' && !el.classList.contains('is-blocked');
    return { clickable, ui: el.getAttribute('data-ui') };
  });
  if (target?.clickable) {
    if (target.ui === 'jack-in') await hubFollowUp(stepId); // pick the address the step names
    await page.click('.coach-target');
    await page.waitForTimeout(250);
    continue;
  }
  if (s.combat) { await fightMove(stepId); await page.waitForTimeout(150); continue; }
  if (s.run && (await has('[data-ui="coach-next-fight"]')) && false) {
    // a fight step outside a fight: go and start the next fight
    // walk outward like a player would: breach ICE if any is reachable, else enter or probe toward it
    const mv = await page.evaluate(() => {
      const v = window.__cwSelect.mapView(window.__engine);
      for (const t of ['run/breach', 'run/probe']) {
        const n = v.nodes.find((x) => x.accessible && x.actions.some((a) => a.type === t && !a.reason));
        if (n) return { node: n.id, act: t.slice(4) };
      }
      return null;
    });
    if (mv) {
      const pt = await page.evaluate((id) => window.__cwUi.nodePoint?.(id) ?? null, mv.node);
      if (!pt) continue;
      await page.mouse.click(pt.x, pt.y);
      await page.waitForTimeout(150);
      await page.click(`[data-ui="node-${mv.act}"]`);
      await page.waitForTimeout(300);
      continue;
    }
  }
  if (s.run) {
    // the step's button is not offered yet (e.g. capture behind ICE): do the next sensible thing on that node
    const act = await page.evaluate(() => {
      const v = window.__cwSelect.mapView(window.__engine);
      const sel = document.querySelector('.np-name')?.textContent;
      const n = v.nodes.find((x) => x.name === sel);
      return n?.actions.find((a) => !a.reason && ['run/breach', 'run/probe'].includes(a.type))?.type ?? null;
    });
    if (act) { await page.click(`[data-ui="node-${act.slice(4)}"]`); await page.waitForTimeout(200); continue; }
  }
  if (!s.run && !s.combat) {
    if (!fallbackUsed.has(stepId)) { fallbackUsed.add(stepId); problems.push(`${stepId}: the coach points at nothing clickable at home; the walk had to guess`); }
    await hubFollowUp(stepId);
  }
  await page.waitForTimeout(200);
}

const expected = await page.evaluate(() => window.__engine.content.triggers.filter((t) => /^tutorial\.tut\.[^.]+\.start$/.test(t.id)).length);
log(`steps seen in order (${order.length}): ${order.join(' → ')}`);
if (order.length < expected) problems.push(`only ${order.length} of ${expected} steps were shown`);
await browser.close();
for (const e of errors) problems.push(`console: ${e}`);
if (problems.length) {
  console.error('[walk] problems:\n- ' + problems.join('\n- '));
  process.exit(1);
}
log('ok: every step shown, pointed at something visible, and advanced by its own action');
