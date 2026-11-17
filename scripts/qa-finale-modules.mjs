// Area 7, the rest: Loading Screen (ui), Anti-Cheat (black ICE, audio), Unskippable Tutorial popups,
// module effects (ui: every ICE Mapped and CHAIRMAN cannot relabel; audio: boss theme yours),
// and a flatline inside the finale after engine/save: the checkpoint reload lands in the finale, not the hub.
import {
  open, freshGame, finaleSetup, has, wait, S, patch, clearOverlays, dialIn, clickNode, nodeAction, finish, fightTurn,
  endTurn, combatInfo, wordingCheck,
} from './qa-lib.mjs';

const c = await open('modules');
const { page, check, shot, log } = c;
await freshGame(page, 'qa_mod');
await clearOverlays(page);
await finaleSetup(page);
await dialIn(page, 'localhost');
await wait(page, 900);
for (let i = 0; i < 3 && (await has(page, '.cwm-droste')); i++) {
  await page.locator('.cwm-droste button[tabindex="0"]', { hasText: 'CONTINUE' }).click();
  await wait(page, 900);
}
await wait(page, 1200);
await clearOverlays(page);

async function take(node, { shots = true } = {}) {
  await clickNode(page, node);
  check(await nodeAction(page, 'breach'), `breach ${node}`);
  await wait(page, 400);
  let popup = false;
  for (let i = 0; i < 120; i++) {
    const s = await S(page);
    if (!s.combat && i > 0) break;
    if (await has(page, '[data-ui="card"]')) { if (!popup && shots) { popup = true; await shot(`${node}-popup`); } await clearOverlays(page); continue; }
    if (s.dialogue) { await clearOverlays(page); continue; }
    if (i === 1 && shots) await shot(`${node}-fight`);
    const p = await page.evaluate(() => window.__engine.state.player);
    if (p.integrity < 30) await patch(page, { player: { integrity: 80 } });
    if (p.neural < 12) await patch(page, { player: { neural: 30 } });
    await page.keyboard.press('Escape').catch(() => {});
    await fightTurn(page);
  }
  await wait(page, 700);
  await clearOverlays(page);
  await clickNode(page, node);
  const ok = await nodeAction(page, 'capture');
  await wait(page, 500);
  await clearOverlays(page);
  return ok;
}

check(await take('main'), 'main (Unskippable Tutorial) captured');
check(await take('ui'), 'ui (Loading Screen) captured');
check(await page.evaluate(() => window.__cwSelect.metaView(window.__engine).iceAlwaysMapped), 'ui: every ICE permanently Mapped');
check(await take('engine_rng'), 'engine/rng captured');
check(await take('engine_save'), 'engine/save captured');
// Anti-Cheat: black ICE in the finale; flatline here, then the checkpoint reload must land in the finale
await clickNode(page, 'audio');
check(await nodeAction(page, 'breach'), 'breach audio (Anti-Cheat)');
await wait(page, 500);
await clearOverlays(page);
check(await page.locator('.ice-card.black').count() > 0, 'Anti-Cheat is labelled black ICE');
check(await page.locator('.intent .il').count() > 0, 'intent labels shown (ui module: Mapped)');
await shot('anticheat');
const fl0 = await page.evaluate(() => Number(localStorage.getItem('cw.meta.flatlines') ?? 0));
await patch(page, { player: { neural: 1 } });
for (let i = 0; i < 10 && !(await has(page, '[data-ui="failure-flatlined"]')); i++) { await endTurn(page); await clearOverlays(page, { maxLoops: 0 }); }
await wait(page, 1200);
check(await has(page, '[data-ui="failure-flatlined"]'), 'flatlined by Anti-Cheat');
await shot('finale-flatlined');
await page.click('[data-ui="reload-checkpoint"]');
await wait(page, 1200);
await clearOverlays(page);
let s = await S(page);
log('after the finale checkpoint reload:', s.mode, s.run, s.finale);
check(s.run === 'localhost' || s.finale !== 'none', `checkpoint inside the finale (mode ${s.mode}, run ${s.run}, finale ${s.finale})`);
const mods = await page.evaluate(() => Object.keys(window.__engine.state.meta.modules));
log('modules after reload', mods.join(', '));
check(await page.evaluate(() => Number(localStorage.getItem('cw.meta.flatlines') ?? 0)) === fl0 + 1, 'flatline counted');
await shot('after-finale-checkpoint');
if (s.mode === 'hub') { await dialIn(page, 'localhost'); await wait(page, 900); for (let i = 0; i < 3 && (await has(page, '.cwm-droste')); i++) { await page.locator('.cwm-droste button[tabindex="0"]', { hasText: 'CONTINUE' }).click(); await wait(page, 900); } await clearOverlays(page); }
// audio again, win it this time
if ((await S(page)).run === 'localhost') {
  const st = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.id === 'audio')?.state);
  if (st !== 'captured') check(await take('audio', { shots: false }), 'audio captured');
  // the IO use: take the boss theme
  await clickNode(page, 'audio');
  await nodeAction(page, 'use');
  await wait(page, 400);
  await clearOverlays(page);
  check(await page.evaluate(() => !!window.__engine.state.meta.modules.audio), 'audio module flag set');
  // CHAIRMAN v2 with ui captured: no relabel, no drift; ∞ stays
  await page.evaluate(() => {
    const nodes = { engine_combat: { state: 'captured', ice: [], revealed: true }, npc_chairman: { revealed: true } };
    window.__engine.dispatch({ type: 'debug/set', patch: { run: { nodes } } });
  });
  await clickNode(page, 'npc_chairman');
  await nodeAction(page, 'breach');
  await wait(page, 600);
  await clearOverlays(page);
  for (let t = 0; t < 3; t++) { await fightTurn(page); await endTurn(page); await clearOverlays(page); }
  const lab = await page.locator('[data-ui^="program-slot-"]').allTextContents();
  log('labels with ui captured:', lab.join(' | '));
  check(!lab.some((l) => /keep_playing|subscribe|don't_go|look_at_us/.test(l)), 'ui captured: CHAIRMAN cannot relabel programs');
  await shot('v2-ui-captured');
}
for (const b of await wordingCheck(page)) c.errors.push(`wording: ${b}`);
await finish(c);
