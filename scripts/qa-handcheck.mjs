// Hand play-check of areas with no dedicated script: the ICE inspector at 1280×720 and 1536×864,
// the guide overlay, one full fight with a daemon, Dumped / Traced / Flatlined through play, banned term.
import {
  open, freshGame, lateGame, has, wait, S, patch, clearOverlays, dialIn, clickNode, nodeAction, finish, wordingCheck,
  arena, fire, endTurn, combatInfo, fightTurn,
} from './qa-lib.mjs';

const c = await open('hand');
const { page, check, shot, log } = c;
await freshGame(page, 'qa_hand');
await clearOverlays(page);
await lateGame(page, { flags: { act1_done: true, act2_started: true, act: 2 }, hosts: 6 });
await clearOverlays(page);
const scan = async (label) => { for (const b of await wordingCheck(page)) c.errors.push(`wording (${label}): ${b}`); };

async function breach(ice, prog) {
  await arena(page, ice);
  if (prog) await page.evaluate((ids) => window.__engine.dispatch({ type: 'loadout/set', programs: ids }), prog);
  await dialIn(page, 'wok');
  await clearOverlays(page);
  const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
  await clickNode(page, gw);
  check(await nodeAction(page, 'breach'), `breach ${ice.map((x) => x.ice ?? x).join('+')}`);
  await wait(page, 500);
  await clearOverlays(page);
}

// ---- inspector + daemon fight
await breach(['ice.killer', 'ice.mirror', 'ice.siren'], ['prog.crowbar_v3', 'prog.lockpick_v3', 'prog.pinger_v1', 'prog.umbrella_v2', 'prog.brute']);
for (const vp of [{ width: 1280, height: 720 }, { width: 1536, height: 864 }]) {
  await page.setViewportSize(vp);
  await wait(page, 400);
  const uids = (await combatInfo(page)).ice.map((i) => i.uid);
  for (const [k, uid] of uids.entries()) {
    await page.click(`[data-ice-uid="${uid}"]`);
    await wait(page, 300);
    const insp = await page.evaluate(() => {
      const el = document.querySelector('[data-ui="ice-inspector"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { label: el.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom), text: el.innerText.slice(0, 120).replace(/\n/g, ' ') };
    });
    const name = (await combatInfo(page)).ice[k].name;
    check(!!insp && insp.label.includes(name), `inspector shows ${name} at ${vp.width}×${vp.height} (${insp?.label})`);
    if (insp) check(insp.right <= vp.width && insp.bottom <= vp.height + 1, `inspector inside the viewport at ${vp.width} (${insp.w}×${insp.h})`);
    if (k === 0) await shot(`inspector-${vp.width}`, false);
  }
}
await page.setViewportSize({ width: 1280, height: 720 });
check(await fire(page, 'prog.pinger_v1'), 'daemon started');
check((await combatInfo(page)).daemons.length > 0, 'daemon running');
await shot('daemon', false);
let steps = 0;
for (; steps < 80 && (await S(page)).combat; steps++) {
  await clearOverlays(page);
  await page.keyboard.press('Escape').catch(() => {});
  await fightTurn(page);
  const ci = await combatInfo(page);
  if (ci && ci.integrity < 25) await patch(page, { player: { integrity: 80 } });
}
check(!(await S(page)).combat, `full fight with a daemon finished (${steps} steps)`);
await scan('fight');
await clearOverlays(page);
if ((await S(page)).mode === 'run') { await page.click('[data-ui="jack-out"]'); await wait(page, 700); await clearOverlays(page); }

// ---- guide
await page.click('[data-ui="guide-open"]');
await wait(page, 400);
check(await has(page, '[data-ui="guide"]'), 'guide opens from the ? button');
await shot('guide');
const sections = await page.locator('[data-ui="guide-picker"] option').count();
log('guide sections', sections);
await page.fill('[data-ui="guide-search"]', 'botnet');
await wait(page, 300);
await shot('guide-search', false);
await scan('guide');
await page.keyboard.press('Escape'); // first Escape clears the search (by design)
await wait(page, 200);
check(await has(page, '[data-ui="guide"]') && (await page.inputValue('[data-ui="guide-search"]')) === '', 'first Escape clears the search');
await page.keyboard.press('Escape');
await wait(page, 300);
check(!(await has(page, '[data-ui="guide"]')), 'second Escape closes the guide');

// ---- Dumped
await breach([{ ice: 'ice.killer', level: 8 }], ['prog.crowbar_v3', 'prog.umbrella_v2']);
await patch(page, { player: { integrity: 2 } });
for (let i = 0; i < 6 && (await S(page)).combat; i++) await endTurn(page);
await wait(page, 1200);
check(await has(page, '[data-ui="failure-dumped"]'), 'Dumped screen');
await shot('dumped');
await scan('dumped');
await page.click('[data-ui="failure-continue"]');
await wait(page, 500);
await clearOverlays(page);
// ---- Traced
await arena(page, ['ice.sentry']);
await dialIn(page, 'wok');
await clearOverlays(page);
await patch(page, { run: { trace: 98 } });
const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
await clickNode(page, gw);
await nodeAction(page, 'probe');
await wait(page, 1200);
check(await has(page, '[data-ui="failure-traced"]'), 'Traced screen');
await shot('traced');
await scan('traced');
await page.click('[data-ui="failure-continue"]');
await wait(page, 500);
await clearOverlays(page);
// ---- Flatlined
await patch(page, { player: { heat: 0 } });
await breach([{ ice: 'ice.flatliner', level: 4 }], ['prog.crowbar_v3', 'prog.umbrella_v2']);
await patch(page, { player: { neural: 1 } });
for (let i = 0; i < 8 && !(await has(page, '[data-ui="failure-flatlined"]')); i++) { await endTurn(page); await clearOverlays(page, { maxLoops: 0 }); }
await wait(page, 1200);
check(await has(page, '[data-ui="failure-flatlined"]'), 'Flatlined screen');
await shot('flatlined');
await scan('flatlined');
await page.click('[data-ui="reload-checkpoint"]');
await wait(page, 900);
check((await S(page)).mode === 'hub', 'checkpoint reload → hub');
await scan('hub');
await finish(c);
