// Regression check (QA bug): click a program, then Space must end the turn, not fire the program again.
// CW_URL='http://localhost:5198/?qa' node scripts/space-check.mjs
import { launch } from './pw-browser.mjs';
const BASE = process.env.CW_URL ?? 'http://localhost:5199/?qa';
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(BASE);
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cw.')) localStorage.removeItem(k); });
await p.reload(); await p.waitForTimeout(500);
await p.click('[data-ui="title-start"]'); await p.waitForTimeout(600);
for (let i = 0; i < 20 && (await p.locator('[data-ui="dialogue"]').count()); i++) {
  await p.keyboard.press('Enter'); await p.waitForTimeout(80);
  const c = p.locator('[data-ui="dialogue"] .choice:not(.is-blocked)').first();
  if (await c.count()) await c.click();
  await p.waitForTimeout(150);
}
await p.evaluate(() => window.__engine.dispatch({ type: 'hub/jackIn', system: 'fridge' })); await p.waitForTimeout(500);
await p.evaluate(() => window.__engine.dispatch({ type: 'run/breach', node: 'gateway' })); await p.waitForTimeout(600);
const st = () => p.evaluate(() => [window.__engine.state.combat?.turn, window.__engine.state.combat?.cycles]);
await p.click('[data-ui^="program-"]'); await p.waitForTimeout(400);
const mid = await st();
await p.keyboard.press('2'); await p.waitForTimeout(400);
const afterKey2 = await st();
await p.keyboard.press('Space'); await p.waitForTimeout(900);
const after = await st();
console.log(JSON.stringify({ mid, afterKey2, after }));
await b.close();
if (after[0] !== mid[0] + 1) { console.error('[space] FAIL: Space after a click did not end the turn'); process.exit(1); }
console.log('[space] ok');
