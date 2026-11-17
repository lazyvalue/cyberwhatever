// Area 4: hub systems in a late-game state. 16 addresses (8 owned), 26 hosts, a long inbox, many files,
// wallet pump/dump, perk picks, implants, low-humanity HUD copy (<40, <20), every vendor. Both sizes, timings.
import {
  open, freshGame, lateGame, has, wait, S, patch, clearOverlays, finish, wordingCheck, tab, PHONE, DESK,
} from './qa-lib.mjs';

const c = await open('hub');
const { page, check, shot, log } = c;
await freshGame(page, 'qa_hub_with_a_long_handle');
await clearOverlays(page);
await lateGame(page, { flags: { act1_done: true, act2_started: true, act: 2, coinbasement_done: true }, hosts: 26, credits: 123456 });
await page.evaluate(() => {
  const e = window.__engine;
  const C = e.content;
  const sys = Object.keys(C.systems).filter((id) => id !== C.setup.localhost);
  const systems = {};
  sys.slice(0, 8).forEach((id) => { systems[id] = { owned: true }; });
  systems.coinbasement = { owned: true };
  const msgs = [];
  const npcs = Object.keys(C.npcs);
  for (let i = 0; i < 140; i++) {
    msgs.push({ id: `qa-m${i}`, from: npcs[i % npcs.length], text: `QA message ${i}. ${'Lorem ipsum about the fridge and its feelings. '.repeat(1 + (i % 6))}`, channel: ['dm', 'bbs', 'mail', 'system'][i % 4], cycle: i, read: i % 3 === 0 });
  }
  const files = [];
  for (const s of Object.values(C.systems)) for (const n of s.nodes) for (const f of n.files ?? []) files.push(f);
  const lore = files.filter((f) => f.kind === 'lore').map((f) => f.id).slice(0, 60);
  const paydata = files.filter((f) => f.kind === 'paydata').slice(0, 14).map((f, i) => ({ uid: `qa-p${i}`, file: f.id, name: f.name, value: f.value ?? 100, encrypted: f.encrypted ?? 0, tagged: !!f.tagged, system: 'wok' }));
  const items = Object.keys(C.items).slice(0, 12);
  e.dispatch({ type: 'debug/set', patch: { world: { systems }, messages: [...e.state.messages, ...msgs], player: { lore, paydata, items, coin: 42.5 } } });
});
await clearOverlays(page);

const timeTab = async (id) => {
  await clearOverlays(page);
  const t0 = Date.now();
  await page.click(`[data-ui="hub-${id}"]`);
  await page.waitForSelector(`[data-ui="panel-${id}"]`, { timeout: 5000 }).catch(() => {});
  const ms = Date.now() - t0;
  await clearOverlays(page);
  return ms;
};

for (const id of ['net', 'jobs', 'inbox', 'deck', 'botnet', 'market', 'wallet', 'files', 'rep', 'stats']) {
  const ms = await timeTab(id);
  log(`tab ${id}: ${ms} ms`);
  if (ms > 800) c.errors.push(`slow tab ${id}: ${ms} ms`);
  await wait(page, 250);
  await shot(`tab-${id}`);
  // overflow: nothing wider than the viewport
  for (const vp of [DESK, PHONE]) {
    await page.setViewportSize(vp);
    await wait(page, 250);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ov > 2) c.errors.push(`horizontal page overflow on ${id} at ${vp.width}px: ${ov}px`);
  }
  await page.setViewportSize(DESK);
  await wait(page, 150);
  await clearOverlays(page);
}

// inbox: scroll to the bottom, open an old message
await tab(page, 'inbox');
const inboxCount = await page.locator('[data-ui^="msg-"]').count();
log('inbox rows', inboxCount);
check(inboxCount >= 30, `inbox lists many messages (${inboxCount})`);
const last = page.locator('[data-ui^="msg-"]').last();
await last.scrollIntoViewIfNeeded();
await last.click();
await wait(page, 300);
await shot('inbox-old-message');

// wallet: pump and dump
await clearOverlays(page);
await tab(page, 'wallet');
const price0 = await page.evaluate(() => window.__engine.state.world.coinPrice);
await page.click('[data-ui="pump"]');
await wait(page, 400);
const price1 = await page.evaluate(() => window.__engine.state.world.coinPrice);
check(price1 > price0, `pump raises the price (${price0.toFixed(1)} → ${price1.toFixed(1)})`);
await page.click('[data-ui="dump"]', { force: true }); // on cooldown: refused with a reason
await wait(page, 300);
await patch(page, { world: { pumpReadyAt: 0 } });
await wait(page, 200);
await page.click('[data-ui="dump"]');
await wait(page, 400);
const price2 = await page.evaluate(() => window.__engine.state.world.coinPrice);
check(price2 < price1, `dump lowers the price after the cooldown (${price1.toFixed(1)} → ${price2.toFixed(1)})`);
await page.click('[data-ui="coin-sell-half"]');
await wait(page, 300);
await shot('wallet-after');

// perks
await patch(page, { player: { pendingPerks: Object.keys(await page.evaluate(() => window.__engine.content.perks)).slice(0, 3) } });
await wait(page, 400);
check(await has(page, '[data-ui="perk-picker"]'), 'perk picker opens');
await shot('perk-picker');
await page.locator('[data-ui="perk-picker"] .perk-card').nth(1).click();
await wait(page, 300);
check(!(await has(page, '[data-ui="perk-picker"]')), 'perk chosen');

// market: every vendor; buy an implant at the clinic
await tab(page, 'market');
await clearOverlays(page);
const vendors = await page.evaluate(() => Object.keys(window.__engine.content.vendors));
for (const v of vendors) {
  const sel = `[data-ui="vendor-${v}"]`;
  if (!(await has(page, sel))) { log('vendor not listed:', v); continue; }
  await page.click(sel);
  await wait(page, 300);
  await clearOverlays(page);
  const rows = await page.locator('[data-ui^="stock-"]').count();
  log(`vendor ${v}: ${rows} stock rows`);
  await shot(`vendor-${v}`, v === vendors[0]);
}
const imp = await page.evaluate(() => {
  const e = window.__engine;
  for (const v of Object.keys(e.content.vendors)) for (const st of window.__cwSelect.vendorStock(e, v)) if (st.kind === 'implant' && st.available) return { v, id: st.id };
  return null;
});
if (imp) {
  const h0 = await page.evaluate(() => window.__engine.state.player.humanity);
  await page.click(`[data-ui="vendor-${imp.v}"]`);
  await wait(page, 300);
  await clearOverlays(page);
  await page.click(`[data-ui="buy-${imp.id}"]`);
  await wait(page, 400);
  await clearOverlays(page);
  const h1 = await page.evaluate(() => window.__engine.state.player.humanity);
  check(h1 !== h0, `implant ${imp.id} installed (humanity ${h0} → ${h1})`);
} else c.errors.push('FAIL: no implant available to buy');

// low humanity copy
for (const hum of [35, 15]) {
  await patch(page, { player: { humanity: hum } });
  await tab(page, 'net');
  await wait(page, 300);
  const handle = await page.locator('[data-ui="topbar-handle"]').innerText();
  log(`humanity ${hum}: handle shows "${handle.replace(/\n/g, ' ')}"`);
  if (hum < 20) check(/UNIT/.test(handle), 'below 20 the HUD says UNIT');
  await shot(`humanity-${hum}`);
}
for (const b of await wordingCheck(page)) c.errors.push(`wording: ${b}`);
await finish(c);
