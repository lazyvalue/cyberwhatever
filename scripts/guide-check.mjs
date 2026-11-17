// The Guide: context section in a fight, deep link from a status chip, search; screenshots at three sizes.
// CW_URL='http://localhost:5198/?qa' node scripts/guide-check.mjs   → shots/guide-<w>-*.png
import { mkdirSync } from 'node:fs';
import { launch } from './pw-browser.mjs';
const BASE = process.env.CW_URL ?? 'http://localhost:5199/?qa';
mkdirSync('shots', { recursive: true });
const problems = [];
const b = await launch();
for (const [w, h] of [[1280, 720], [1920, 1080], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => problems.push(`${w}: ${e.message}`));
  await p.goto(BASE);
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cw.')) localStorage.removeItem(k); localStorage.setItem('cw.ui.settings', JSON.stringify({ tutorials: false })); });
  await p.reload(); await p.waitForTimeout(500);
  await p.click('[data-ui="title-start"]'); await p.waitForTimeout(600);
  for (let i = 0; i < 20 && (await p.locator('[data-ui="dialogue"]').count()); i++) {
    await p.keyboard.press('Enter'); await p.waitForTimeout(80);
    const c = p.locator('[data-ui="dialogue"] .choice:not(.is-blocked)').first();
    if (await c.count()) await c.click();
    await p.waitForTimeout(150);
  }
  // hub: ? opens the section for the open tab
  await p.click('[data-ui="hub-botnet"]'); await p.waitForTimeout(200);
  await p.click('[data-ui="guide-open"]'); await p.waitForTimeout(300);
  const hubSec = await p.getAttribute('[data-ui="guide"] article', 'data-ui');
  await p.screenshot({ path: `shots/guide-${w}-hub.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // fight: ? lands on combat; a status chip deep-links into its entry; nothing spends a cycle
  await p.evaluate(() => window.__engine.dispatch({ type: 'hub/jackIn', system: 'fridge' })); await p.waitForTimeout(500);
  await p.evaluate(() => window.__engine.dispatch({ type: 'run/breach', node: 'gateway' })); await p.waitForTimeout(700);
  const before = await p.evaluate(() => [window.__engine.state.cycle, window.__engine.state.combat.cycles]);
  await p.keyboard.press('?'); await p.waitForTimeout(300);
  const fightSec = await p.getAttribute('[data-ui="guide"] article', 'data-ui');
  await p.keyboard.press('Space'); await p.waitForTimeout(300); // must not end the turn under the guide
  await p.screenshot({ path: `shots/guide-${w}-fight.png` });
  const after = await p.evaluate(() => [window.__engine.state.cycle, window.__engine.state.combat.cycles]);
  if (before.join() !== after.join()) problems.push(`${w}: the guide let a key act on the fight underneath`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // give the ICE a status chip (state forced), then click it
  await p.evaluate(() => window.__engine.dispatch({ type: 'combat/program', program: window.__cwSelect.combatView(window.__engine).programs.find((x) => x.category === 'exploit')?.id ?? 'prog.peek' }));
  await p.waitForTimeout(600);
  const chip = p.locator('[data-ui^="guide-link-status-"]').first();
  if (await chip.count()) {
    const key = (await chip.getAttribute('data-ui')).replace('guide-link-status-', '');
    await chip.click({ force: true }); await p.waitForTimeout(500);
    const anchor = p.locator(`[data-ui="guide-anchor-status-${key}"]`);
    const vis = (await anchor.count()) && (await anchor.boundingBox()) !== null;
    if (!vis) problems.push(`${w}: status chip ${key} did not deep-link to its guide entry`);
    await p.screenshot({ path: `shots/guide-${w}-chip.png` });
  } else problems.push(`${w}: no status chip to click`);
  // search
  await p.fill('[data-ui="guide-search"]', 'crypt'); await p.waitForTimeout(300);
  const hits = await p.locator(w < 800 ? '[data-ui="guide-picker"] option' : '.guide-nav-btn').count();
  if (!hits) problems.push(`${w}: search for "crypt" found nothing`);
  await p.screenshot({ path: `shots/guide-${w}-search.png` });
  console.log(`[guide] ${w}x${h}: hub → ${hubSec}, fight → ${fightSec}, search hits ${hits}`);
  if (fightSec !== 'guide-section-combat') problems.push(`${w}: fight opened ${fightSec}`);
  if (hubSec !== 'guide-section-botnet') problems.push(`${w}: botnet tab opened ${hubSec}`);
  await p.close();
}
await b.close();
if (problems.length) { console.error('[guide] problems:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('[guide] ok');
