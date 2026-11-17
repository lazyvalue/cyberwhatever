// Quick visual check of the tutorial coach with a forced tutorial step (no story content needed).
// node scripts/coach-check.mjs   (CW_URL as for e2e-play.mjs)
import { mkdirSync } from 'node:fs';
import { launch } from './pw-browser.mjs';
const BASE = process.env.CW_URL ?? 'http://localhost:5199/?qa';
mkdirSync('shots', { recursive: true });
const b = await launch();
const errors = [];
for (const [w, h, tag] of [[1280, 720, 'desk'], [390, 844, 'phone']]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE);
  await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cw.')) localStorage.removeItem(k); });
  await p.reload();
  await p.waitForTimeout(500);
  await p.click('[data-ui="title-start"]');
  await p.waitForTimeout(600);
  for (let i = 0; i < 20 && (await p.locator('[data-ui="dialogue"]').count()); i++) {
    await p.keyboard.press('Enter'); await p.waitForTimeout(80);
    const c = p.locator('[data-ui="dialogue"] .choice:not(.is-blocked)').first();
    if (await c.count()) await c.click();
    await p.waitForTimeout(150);
  }
  const step = (id, anchor, text) => p.evaluate(([id, anchor, text]) => window.__engine.dispatch({ type: 'debug/set', patch: { story: { objectives: { [id]: { id, kind: 'tutorial', anchor, speaker: 'auntie', text, status: 'active', cycle: 0 } } } } }), [id, anchor, text]);
  await p.click('[data-ui="hub-jobs"]');
  await step('tut.qa1', 'jack-in', 'That is your address book. The fridge is your neighbour\'s. Hit *Dial in*.');
  await p.waitForTimeout(400);
  await p.screenshot({ path: `shots/coach-1-${tag}.png` });
  await p.click('[data-ui="coach-ok"]');
  await p.waitForTimeout(200);
  await p.click('[data-ui="hub-net"]');
  await p.click('[data-ui="jack-in"]');
  await p.waitForTimeout(900);
  const other = await p.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.revealed && n.id !== window.__engine.state.run.position)?.id ?? window.__engine.state.run.position);
  await step('tut.qa2', `node-probe@${other}`, 'Click the node next to you. Then *Probe* it. Knowing costs a cycle.');
  await p.waitForTimeout(500);
  await p.screenshot({ path: `shots/coach-2-${tag}.png` });
  await p.close();
}
await b.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
