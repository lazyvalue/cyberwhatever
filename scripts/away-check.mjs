// Regression check: a save must survive a page load after hours away (the "you were gone" report).
// node scripts/away-check.mjs <url>   (use a ?qa url: the script reads window.__engine)
import { launch } from './pw-browser.mjs';
const url = process.argv[2] ?? 'http://localhost:5180/?qa';
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) fail++; };

await p.goto(url);
await p.waitForTimeout(800);
await p.fill('[data-ui="title-handle"]', 'keeper');
await p.click('[data-ui="title-start"]');
await p.waitForTimeout(1500);
// mark the save so it is recognizable, then pretend the player left 3 hours ago
const marked = await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cw.save'));
  s.cycle = 77;
  s.player.credits = 4321;
  localStorage.setItem('cw.save', JSON.stringify(s));
  localStorage.setItem('cw.meta.lastSeen', String(Date.now() - 3 * 3600 * 1000));
  return localStorage.getItem('cw.save');
});
// the page writes lastSeen again when it unloads, so set the old value before the next boot
await p.addInitScript(() => { try { localStorage.setItem('cw.meta.lastSeen', String(Date.now() - 3 * 3600 * 1000)); } catch { /* about:blank */ } });
await p.goto('about:blank');
await p.goto(url);
await p.waitForTimeout(2500); // the time-away report fires on a 0 ms timer after boot
const afterBoot = await p.evaluate(() => JSON.parse(localStorage.getItem('cw.save')));
check('save is unchanged on the title screen', afterBoot.cycle === 77 && afterBoot.player.credits === 4321 && afterBoot.player.handle === 'keeper', `(cycle ${afterBoot.cycle}, credits ${afterBoot.player.credits})`);
// opening and closing Settings on the title screen must not save the placeholder either
await p.click('[data-ui="title-settings"]');
await p.waitForTimeout(400);
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
const afterSettings = await p.evaluate(() => JSON.parse(localStorage.getItem('cw.save')));
check('save is unchanged after Settings on the title screen', afterSettings.cycle === 77 && afterSettings.player.handle === 'keeper');
const cont = await p.$('[data-ui="title-continue"]');
check('Continue is offered', !!cont);
if (cont) {
  await cont.click();
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => { const e = window.__engine; return e ? { cycle: e.state.cycle, credits: e.state.player.credits, handle: e.state.player.handle, log: JSON.stringify(e.state.log.slice(-6)) + JSON.stringify(e.state.messages?.slice?.(-3) ?? '') } : null; });
  check('Continue loads the real save', !!st && st.cycle === 77 && st.credits === 4321 && st.handle === 'keeper', st ? `(cycle ${st.cycle}, credits ${st.credits})` : '(no __engine: use a ?qa url)');
  check('the time-away line is delivered after Continue', !!st && /3 hours|gone/i.test(st.log));
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('cw.save')));
  check('the stored save is still the real save', saved.cycle === 77 && saved.player.handle === 'keeper');
}
check('no page errors', errs.length === 0, errs.join(' | '));
await b.close();
process.exit(fail ? 1 : 0);
