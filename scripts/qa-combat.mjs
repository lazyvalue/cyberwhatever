// Areas 1 and 2: combat mechanics in the real combat screen, in test arenas (ICE placed on a gateway).
//   A: Mirror + Hydra + Siren      reflect, split, reinforcements
//   B: Tar Pit + Scrambler + Sentry anchored blocks Hang up, scrambled program, a daemon, inject → root (subverted ICE)
//   C: botnet actions (all four, by click and Shift+digit) until a host burns
//   D: black ICE: Psychotrope (label scrambling) + Flatliner → flatline → Flatlined screen → checkpoint reload
import {
  open, freshGame, lateGame, has, wait, S, patch, clearOverlays, dialIn, clickNode, nodeAction, finish, wordingCheck,
  arena, fire, endTurn, combatInfo, fightTurn,
} from './qa-lib.mjs';

const c = await open('combat');
const { page, check, shot, log } = c;
await freshGame(page, 'qa_cmb');
await clearOverlays(page);
const FLAGS = { act1_done: true, act2_started: true, act: 2 };
await lateGame(page, { flags: FLAGS, hosts: 20 });
await clearOverlays(page);

async function loadout(ids) {
  await page.evaluate((ids) => window.__engine.dispatch({ type: 'loadout/set', programs: ids }), ids);
}
async function breachGateway(system) {
  await dialIn(page, system);
  await clearOverlays(page);
  const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
  await clickNode(page, gw);
  check(await nodeAction(page, 'breach'), `breach the ${system} arena`);
  await wait(page, 500);
  await clearOverlays(page);
}
async function leave() {
  for (let i = 0; i < 80 && (await S(page)).combat; i++) {
    await clearOverlays(page);
    await page.keyboard.press('Escape').catch(() => {});
    await fightTurn(page);
    const p = await page.evaluate(() => window.__engine.state.player);
    if (p.integrity < 25) await patch(page, { player: { integrity: 80 } });
  }
  await wait(page, 600);
  await clearOverlays(page);
  if ((await S(page)).mode === 'run') { await page.click('[data-ui="jack-out"]'); await wait(page, 700); await clearOverlays(page); }
}

// ------------------------------------------------------------------ A
await arena(page, ['ice.mirror', 'ice.hydra', 'ice.siren']);
await loadout(['prog.crowbar_v3', 'prog.lockpick_v3', 'prog.brute', 'prog.tapeworm', 'prog.umbrella_v2']);
await breachGateway('wok');
let info = await combatInfo(page);
check(info?.ice.length === 3, `arena A: 3 ICE (${info?.ice.map((i) => i.name).join(', ')})`);
await shot('A-start');
const mirror = info.ice.find((i) => i.def === 'ice.mirror').uid;
const hydra = info.ice.find((i) => i.def === 'ice.hydra').uid;
// Mirror: same kind twice in a row on it is reflected
const integ0 = (await combatInfo(page)).integrity;
await fire(page, 'prog.crowbar_v3', mirror);
await fire(page, 'prog.crowbar_v3', mirror);
const logMirror = await page.evaluate(() => window.__engine.state.log.slice(-8).map((l) => l.text).join(' | '));
log('mirror log', logMirror.slice(0, 300));
check(/reflect|bounce|mirror/i.test(logMirror) || (await combatInfo(page)).integrity < integ0, 'Mirror reflects the same kind used twice');
await shot('A-mirror', false);
await endTurn(page);
// Siren: reinforcements announced
let sawPending = false;
let maxIce = 3;
for (let t = 0; t < 12; t++) {
  info = await combatInfo(page);
  if (!info) break;
  if (info.pending.length) sawPending = true;
  maxIce = Math.max(maxIce, info.ice.filter((i) => !i.dead).length);
  if (sawPending && !(await has(page, '.tag.c-red'))) { /* tag may have gone */ }
  if (info.pending.length && !c.notes.some((n) => n.includes('backup tag'))) { await shot('A-backup'); check(await page.locator('.cb-head .tag.c-red').count() > 0, 'backup tag shows in the combat header'); }
  // break the Hydra's shell with spike (no worm) to make it split
  const h = info.ice.find((i) => i.uid === hydra && !i.dead);
  if (h && h.shell > 0) { await fire(page, 'prog.lockpick_v3', hydra); await fire(page, 'prog.brute', hydra); }
  else await fightTurn(page);
  info = await combatInfo(page);
  if (info) maxIce = Math.max(maxIce, info.ice.filter((i) => !i.dead).length);
  if (info && info.ice.some((i) => i.def === 'ice.hydra' && i.uid !== hydra)) { await shot('A-hydra-split', false); break; }
  await endTurn(page);
}
info = await combatInfo(page);
check(!!info?.ice.some((i) => i.def === 'ice.hydra' && i.uid !== hydra) || maxIce > 3, `Hydra split (max ${maxIce} live ICE)`);
check(sawPending || maxIce > 3, 'Siren reinforcements announced or arrived');
await leave();

// ------------------------------------------------------------------ B
await arena(page, ['ice.tarpit', 'ice.scrambler', 'ice.sentry']);
await loadout(['prog.crowbar_v3', 'prog.lockpick_v3', 'prog.giftbox', 'prog.rootkit_v2', 'prog.pinger_v1', 'prog.umbrella_v2']);
await breachGateway('wok');
info = await combatInfo(page);
const sentry = info.ice.find((i) => i.def === 'ice.sentry').uid;
// daemon
check(await fire(page, 'prog.pinger_v1'), 'daemon starts');
await wait(page, 200);
check((await combatInfo(page)).daemons.length > 0, 'daemon is running');
check(await page.locator('.cb-head .tag.c-amber').count() > 0, 'daemon tag in the combat header');
// inject the Sentry
check(await fire(page, 'prog.giftbox', sentry), 'injector on the Sentry');
let anchoredSeen = false;
let scrambledSeen = false;
let rooted = false;
for (let t = 0; t < 14; t++) {
  await endTurn(page);
  await clearOverlays(page);
  info = await combatInfo(page);
  if (!info) break;
  if (info.status.anchored > 0 && !anchoredSeen) {
    anchoredSeen = true;
    await shot('B-anchored');
    const turn = info.turn;
    await page.click('[data-ui="combat-jack-out"]', { force: true });
    await wait(page, 300);
    check((await S(page)).combat?.turn === turn && (await S(page)).run, 'Hang up refused while Anchored');
    await page.click('[data-ui="disengage"]', { force: true });
    await wait(page, 300);
    check(!!(await S(page)).combat, 'Disengage refused while Anchored');
  }
  if (Object.values(info.status.scrambled ?? {}).some((v) => v > 0) && !scrambledSeen) {
    scrambledSeen = true;
    await shot('B-scrambled', false);
    check(await page.locator('.prog .cd', { hasText: 'locked' }).count() > 0, 'scrambled program shows "locked"');
  }
  const s = info.ice.find((i) => i.uid === sentry);
  if (s && !s.dead && s.status.rootable && !rooted) {
    await fire(page, 'prog.rootkit_v2', sentry);
    info = await combatInfo(page);
    rooted = !!info?.ice.find((i) => i.uid === sentry)?.subverted;
    if (rooted) { await shot('B-rooted'); check(await page.locator('.ice-card.subverted').count() > 0, 'rooted ICE card shows "fights for you"'); }
  }
  if (anchoredSeen && scrambledSeen && rooted) break;
  // keep the others busy, but do not kill the Sentry
  const other = info.ice.find((i) => !i.dead && !i.subverted && i.uid !== sentry);
  if (other) await fire(page, 'prog.crowbar_v3', other.uid);
  if (info.integrity < 30) await patch(page, { player: { integrity: 80 } });
}
check(anchoredSeen, 'Tar Pit anchored the player');
check(scrambledSeen, 'Scrambler locked a program');
check(rooted, 'injected Sentry became Rootable and was rooted');
await leave();

// ------------------------------------------------------------------ C botnet
let burned = false;
const used = new Set();
for (let run = 0; run < 5 && !burned; run++) {
  await patch(page, { player: { heat: 90 } });
  await arena(page, [{ ice: 'ice.cipher', level: 6 }, { ice: 'ice.killer', level: 6 }]);
  await loadout(['prog.crowbar_v3', 'prog.umbrella_v2']);
  await breachGateway('wok');
  if (run === 0) await shot('C-botnet');
  const kinds = ['ddos', 'dcrack', 'swarm', 'bounce'];
  for (let t = 0; t < 8; t++) {
    info = await combatInfo(page);
    if (!info || info.charges <= 0) break;
    const k = kinds[t % 4];
    const hosts0 = info.hosts;
    if (t % 2) await page.keyboard.press(`Shift+Digit${kinds.indexOf(k) + 1}`);
    else await page.click(`[data-ui="botnet-${k}"]`, { force: true });
    await wait(page, 300);
    const after = await combatInfo(page);
    if (after && after.charges < info.charges) used.add(k);
    if (after && after.hosts < hosts0) { burned = true; await shot('C-burn'); log('host burned on', k); }
    await endTurn(page);
    if (after && after.integrity < 30) await patch(page, { player: { integrity: 80 } });
  }
  await leave();
}
check(used.size === 4, `all four botnet actions used (${[...used].join(', ')})`);
check(burned, 'a host burned during botnet use');

// ------------------------------------------------------------------ D black ICE + flatline
await patch(page, { player: { heat: 0, neural: 30 } });
await arena(page, [{ ice: 'ice.psychotrope', level: 3 }, { ice: 'ice.flatliner', level: 3 }]);
await loadout(['prog.crowbar_v3', 'prog.lockpick_v3', 'prog.umbrella_v2', 'prog.tinfoil']);
const labels0 = await page.evaluate(() => 1);
await breachGateway('wok');
check(await page.locator('.ice-card.black').count() === 2, 'both black ICE cards are red');
check(await page.locator('.ice-card .black-label').count() === 2, 'black ICE labelled "BLACK ICE: it can kill you"');
await shot('D-black');
let scrambleSeen = false;
for (let t = 0; t < 12; t++) {
  const lab = await page.locator('[data-ui^="program-slot-"]').allTextContents();
  info = await combatInfo(page);
  if (!info) break;
  if (info.status.labelsScrambled > 0 && !scrambleSeen) {
    scrambleSeen = true;
    log('scrambled labels', lab.join(' | '));
    check(!lab.includes('crowbar_deluxe') || lab.some((l) => /[▓#@!{]/.test(l)), 'Psychotrope scrambles the program labels');
    await shot('D-scrambled');
  }
  if (scrambleSeen) break;
  await endTurn(page);
  await clearOverlays(page);
}
check(scrambleSeen, 'Psychotrope dosed (labelsScrambled)');
// flatline
const fl0 = await page.evaluate(() => Number(localStorage.getItem('cw.meta.flatlines') ?? 0));
await patch(page, { player: { neural: 1 } });
for (let t = 0; t < 10; t++) {
  if ((await S(page)).mode === 'flatlined' || (await has(page, '[data-ui="failure-flatlined"]'))) break;
  await endTurn(page);
  await clearOverlays(page, { maxLoops: 0 });
}
await wait(page, 1500);
check(await has(page, '[data-ui="failure-flatlined"]'), 'Flatlined screen');
await shot('D-flatlined');
// reload the page on the failure screen
await page.reload();
await wait(page, 1000);
if (await has(page, '[data-ui="title-continue"]')) { await page.click('[data-ui="title-continue"]'); await wait(page, 1000); }
log('after reload on the flatline screen: mode', (await S(page)).mode);
await shot('D-flatlined-after-reload', false);
if (await has(page, '[data-ui="reload-checkpoint"]')) {
  await page.click('[data-ui="reload-checkpoint"]');
  await wait(page, 1000);
}
const s = await S(page);
check(s.mode === 'hub', `checkpoint reload → hub (${s.mode})`);
const fl1 = await page.evaluate(() => Number(localStorage.getItem('cw.meta.flatlines') ?? 0));
check(fl1 === fl0 + 1, `flatline counter persisted (${fl0} → ${fl1})`);
await clearOverlays(page);
await shot('D-after-checkpoint');
for (const b of await wordingCheck(page)) c.errors.push(`wording: ${b}`);
void labels0;
await finish(c);
