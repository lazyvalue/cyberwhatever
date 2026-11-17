// Screenshots of every main screen at four window sizes, plus overflow checks.
// node scripts/ui-sizes.mjs   (CW_URL as for e2e-play.mjs) → shots/size-<w>x<h>-<screen>.png
import { mkdirSync } from 'node:fs';
import { launch } from './pw-browser.mjs';

const BASE = process.env.CW_URL ?? 'http://localhost:5199/?qa';
const SIZES = [[1280, 720], [1440, 900], [1536, 864], [1920, 1080], [390, 844]];
mkdirSync('shots', { recursive: true });
const problems = [];
const b = await launch();

for (const [w, h] of SIZES) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => problems.push(`${w}x${h} pageerror: ${e.message}`));
  const tag = `${w}x${h}`;
  const shot = async (name) => {
    await p.mouse.move(w - 2, h - 2);
    await p.waitForTimeout(350);
    await p.screenshot({ path: `shots/size-${tag}-${name}.png` });
    // overflow: no horizontal page scroll, no text cut by its own box
    const bad = await p.evaluate(() => {
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px)`);
      for (const el of document.querySelectorAll('.btn, .prog .pn, .tb-cell .v, .vital, .np-name, .h-screen, .coach-text, .row-title')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || getComputedStyle(el).textOverflow === 'ellipsis') continue;
        if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') out.push(`clipped: ${el.className} "${el.textContent.trim().slice(0, 30)}"`);
      }
      return out.slice(0, 6);
    });
    for (const x of bad) problems.push(`${tag} ${name}: ${x}`);
  };
  const fs = await p.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  await p.goto(BASE);
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cw.')) localStorage.removeItem(k); });
  await p.reload();
  await p.waitForTimeout(600);
  console.log(`[sizes] ${tag}: root font-size ${await p.evaluate(() => getComputedStyle(document.documentElement).fontSize)}${fs ? '' : ''}`);
  await shot('title');
  await p.click('[data-ui="title-start"]');
  await p.waitForTimeout(700);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  await shot('dialogue');
  for (let i = 0; i < 20 && (await p.locator('[data-ui="dialogue"]').count()); i++) {
    await p.keyboard.press('Enter'); await p.waitForTimeout(80);
    const c = p.locator('[data-ui="dialogue"] .choice:not(.is-blocked)').first();
    if (await c.count()) await c.click();
    await p.waitForTimeout(150);
  }
  for (const t of ['net', 'jobs', 'inbox', 'deck', 'botnet', 'market', 'wallet', 'files', 'rep', 'stats']) {
    await p.click(`[data-ui="hub-${t}"]`);
    await p.waitForTimeout(250);
    for (let i = 0; i < 10 && (await p.locator('[data-ui="dialogue"]').count()); i++) {
      await p.keyboard.press('Enter'); await p.waitForTimeout(80);
      const c = p.locator('[data-ui="dialogue"] .choice:not(.is-blocked)').first();
      if (await c.count()) await c.click();
      await p.waitForTimeout(150);
    }
    await shot(`hub-${t}`);
  }
  await p.click('[data-ui="hub-net"]');
  await p.click('[data-ui="jack-in"]');
  await p.waitForTimeout(1200);
  await shot('run');
  await p.click('[data-ui="node-breach"]').catch(() => problems.push(`${tag}: no breach button`));
  await p.waitForTimeout(900);
  await shot('fight');
  // worst case at this size: nine programs and botnet charges (late-game fight); the ICE must stay readable
  await p.evaluate(() => {
    const e = window.__engine;
    const ids = Object.keys(e.content.programs).filter((id) => e.content.programs[id].price > 0).slice(0, 9);
    // three ICE: the tutorial one, a boss with phases and statuses, and a black ICE
    const base = e.state.combat.ice[0];
    const mk = (defId, uid, status) => {
      const d = e.content.ice[defId];
      return { ...JSON.parse(JSON.stringify(base)), uid, def: defId, name: d.name, level: d.level, shell: { type: d.shell.type, points: d.shell.points, max: d.shell.points }, core: d.core, coreMax: d.core, intent: d.intents[0].id, status: { ...base.status, ...status } };
    };
    const boss = Object.values(e.content.ice).find((d) => d.boss && d.phases?.length && !d.undefeatable && !d.script)?.id;
    const black = Object.values(e.content.ice).find((d) => d.black)?.id;
    const ice = [base, mk(boss, 'qa-boss', { mapped: 2, critReady: true, unstable: 3, marked: 2, infected: 2 }), mk(black, 'qa-black', { stunned: 1, exposed: 1 })];
    e.dispatch({ type: 'debug/set', patch: { player: { loadout: ids, programs: Object.fromEntries(ids.map((id) => [id, { corrupted: false }])) }, combat: { charges: 6, ice } } });
  });
  // select the boss so the inspector shows the busy case
  await p.click('[data-ice-uid="qa-boss"]').catch(() => {});
  await p.waitForTimeout(300);
  await p.waitForTimeout(400);
  await shot('fight-heavy');
  // the inspector: full description reachable in one click/keypress, never cut off
  if (!(await p.locator('[data-ui="ice-inspector"]').count())) { await p.keyboard.press('i'); await p.waitForTimeout(300); }
  const insp = await p.evaluate(() => {
    const el = document.querySelector('[data-ui="ice-inspector"]');
    const d = document.querySelector('[data-ui="inspector-description"]');
    if (!el || !d) return null;
    const cs = getComputedStyle(d);
    return { rows: document.querySelectorAll('[data-ui^="inspector-prog-"]').length, clipped: cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none' && cs.webkitLineClamp !== '' , w: Math.round(el.getBoundingClientRect().width) };
  });
  if (!insp) problems.push(`${tag}: no inspector after selecting the ICE and pressing i`);
  else {
    if (insp.rows < 9) problems.push(`${tag}: inspector lists ${insp.rows} programs, expected 9`);
    if (insp.clipped) problems.push(`${tag}: inspector description is truncated`);
    console.log(`[sizes] ${tag} inspector ${insp.w}px wide, ${insp.rows} program rows`);
  }
  await shot('fight-inspector');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  const arena = await p.evaluate(() => {
    document.querySelector('.combat')?.scrollTo(0, 0); // a phone scrolls the fight screen; measure from its top
    const card = document.querySelector('.ice-card:not(.dead)')?.getBoundingClientRect();
    const name = document.querySelector('.ice-card .ice-name')?.getBoundingClientRect();
    const core = document.querySelector('.ice-card .ice-bar-row:last-child')?.getBoundingClientRect();
    const scroller = document.querySelector('.combat');
    return { h: card?.height ?? 0, nameVisible: !!name && name.top >= 0 && name.bottom <= innerHeight, coreVisible: !!core && core.bottom <= innerHeight + (scroller ? scroller.scrollHeight - scroller.clientHeight : 0) };
  });
  if (arena.h < 200 || !arena.nameVisible || !arena.coreVisible) problems.push(`${tag} fight-heavy: ICE card squeezed (${Math.round(arena.h)}px, name ${arena.nameVisible}, core ${arena.coreVisible})`);
  console.log(`[sizes] ${tag} heavy fight: ICE card ${Math.round(arena.h)}px tall`);
  if (w < 800) { await p.click('[data-ui="mnav-log"]'); await p.waitForTimeout(300); await shot('log'); }
  await p.close();
}
await b.close();
if (problems.length) { console.error('[sizes] problems:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('[sizes] ok');
