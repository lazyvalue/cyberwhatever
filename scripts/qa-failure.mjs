// Area 3: Dumped and Traced through real play, heat thresholds, the home raid (won and lost).
import {
  open, freshGame, lateGame, has, wait, S, patch, clearOverlays, dialIn, clickNode, nodeAction, finish, wordingCheck,
  arena, endTurn, combatInfo, fightTurn, tab,
} from './qa-lib.mjs';

const c = await open('failure');
const { page, check, shot, log } = c;
await freshGame(page, 'qa_fail');
await clearOverlays(page);
await lateGame(page, { flags: { act1_done: true, act2_started: true, act: 2 }, hosts: 8, credits: 10000 });
await clearOverlays(page);
const P = () => page.evaluate(() => {
  const s = window.__engine.state;
  return { credits: s.player.credits, heat: s.player.heat, corrupted: Object.entries(s.player.programs).filter(([, v]) => v.corrupted).map(([k]) => k), hw: { ...s.player.hardware }, hosts: s.player.hosts.length, stats: { d: s.stats.dumped, t: s.stats.traced, rw: s.stats.raidsWon, rl: s.stats.raidsLost } };
});

// ------------------------------------------------------------------ Dumped
await arena(page, [{ ice: 'ice.killer', level: 8 }, { ice: 'ice.sentry', level: 8 }]);
await dialIn(page, 'wok');
await clearOverlays(page);
let gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
await clickNode(page, gw);
await nodeAction(page, 'breach');
await clearOverlays(page);
let before = await P();
await patch(page, { player: { integrity: 3 } });
for (let i = 0; i < 8 && (await S(page)).combat; i++) await endTurn(page);
await wait(page, 1500);
check(await has(page, '[data-ui="failure-dumped"]'), 'Dumped screen');
await shot('dumped');
let after = await P();
check(after.corrupted.length > before.corrupted.length, `a program was corrupted (${after.corrupted.join(', ')})`);
check(Math.round(after.heat - before.heat) === 10, `heat +10 (${before.heat} → ${after.heat})`);
await page.click('[data-ui="failure-continue"]');
await wait(page, 500);
await clearOverlays(page);
check((await S(page)).mode === 'hub', 'back in the hub after Dumped');
// repair the corrupted program in the Deck panel
await tab(page, 'deck');
const rep = page.locator('[data-ui^="repair-"]').first();
if (await rep.count()) { await rep.click(); await wait(page, 300); }
check((await P()).corrupted.length === before.corrupted.length, 'corrupted program repaired from the Deck panel');

// ------------------------------------------------------------------ Traced
await arena(page, [{ ice: 'ice.bloodhound', level: 4 }]);
before = await P();
await dialIn(page, 'wok');
await clearOverlays(page);
await patch(page, { run: { trace: 98 } });
gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
await clickNode(page, gw);
await nodeAction(page, 'probe');
await wait(page, 1500);
check(await has(page, '[data-ui="failure-traced"]'), 'Traced screen');
await shot('traced');
after = await P();
check(Math.round(after.heat - before.heat) >= 20, `heat +25 (${before.heat.toFixed(1)} → ${after.heat.toFixed(1)})`);
check(after.credits < before.credits, `fine taken (${before.credits} → ${after.credits})`);
await page.click('[data-ui="failure-continue"]');
await wait(page, 500);
await clearOverlays(page);
await tab(page, 'net');
await page.click('[data-ui="addr-wok"]');
await wait(page, 200);
check(await page.locator('.addr-status .tag', { hasText: 'hardened' }).count() > 0, 'wok shows "hardened"');
await shot('hardened', false);

// ------------------------------------------------------------------ heat thresholds
for (const h of [30, 55, 80]) {
  await patch(page, { player: { heat: h } });
  await page.click('[data-ui="hub-net"]');
  await wait(page, 300);
  await shot(`heat-${h}`, h === 80);
  const top = await page.locator('[data-ui="topbar-heat"]').innerText();
  log(`heat ${h} top bar:`, top.replace(/\n/g, ' '));
}
await patch(page, { player: { heat: 30 } });
await arena(page, [{ ice: 'ice.sentry', level: 1 }]);
await dialIn(page, 'wok');
await clearOverlays(page);
const tr = await page.evaluate(() => window.__engine.state.run?.trace);
check(tr >= 10, `Noticed: run starts at 10 trace (${tr})`);
await page.click('[data-ui="jack-out"]');
await wait(page, 600);
await clearOverlays(page);
await patch(page, { player: { heat: 80 } });
await page.click('[data-ui="hub-market"]');
await wait(page, 300);
await shot('burned-market', false);

// ------------------------------------------------------------------ raid: won
async function raid(win) {
  await clearOverlays(page);
  before = await P();
  await patch(page, { player: { heat: 100 } });
  // the raid starts on the next hub action: set a host role with a real click
  // (debug/set is itself an action, so the raid may already be on)
  if (!(await S(page)).combat) {
    await tab(page, 'botnet');
    await page.locator('[data-ui$="-mine"]').first().click();
  }
  await wait(page, 900);
  await clearOverlays(page);
  const s = await S(page);
  check(s.combat?.context === 'raid', `raid fight starts at heat 100 (${JSON.stringify(s.combat)})`);
  await shot(win ? 'raid' : 'raid-lose');
  for (let i = 0; i < 120 && (await S(page)).combat; i++) {
    await clearOverlays(page);
    if (win) {
      await page.keyboard.press('Escape').catch(() => {});
      await fightTurn(page);
      const ci = await combatInfo(page);
      if (ci && ci.integrity < 30) await patch(page, { player: { integrity: 80 } });
    } else {
      // hang up must be refused in a raid
      if (i === 0) {
        await page.click('[data-ui="combat-jack-out"]', { force: true });
        await wait(page, 200);
        check(!!(await S(page)).combat, 'Hang up refused in a raid');
      }
      await endTurn(page);
    }
  }
  await wait(page, 1500);
  await shot(win ? 'raid-won' : 'raid-lost');
  await clearOverlays(page);
  after = await P();
  log(win ? 'raid won' : 'raid lost', JSON.stringify({ before, after }).slice(0, 400));
  check(Math.round(after.heat) === 50, `heat 50 after the raid (${after.heat})`);
  if (win) check(after.stats.rw === before.stats.rw + 1, 'raid won counted');
  else {
    check(after.stats.rl === before.stats.rl + 1, 'raid lost counted');
    const lostTier = Object.keys(after.hw).some((k) => after.hw[k] < before.hw[k]);
    check(lostTier, 'a hardware tier was lost');
    check(Math.abs(after.credits - Math.round(before.credits * 0.7)) <= 2, `30% credits lost (${before.credits} → ${after.credits})`);
  }
  check((await S(page)).mode === 'hub', 'back in the hub after the raid');
}
await raid(true);
await raid(false);
for (const b of await wordingCheck(page)) c.errors.push(`wording: ${b}`);
await finish(c);
