// Area 6: Act 3 in the real UI. Backbone DDoS gate (denied, then open), The Board (Hydra, phases, reinforcements),
// CHAIRMAN v1, the file-listing reveal, 127.0.0.1 in the address book.
import {
  open, freshGame, lateGame, has, wait, S, patch, clearOverlays, dialIn, clickNode, nodeAction, fightTurn, finish, wordingCheck, tab,
} from './qa-lib.mjs';

const c = await open('act3');
const { page, check, shot, log } = c;
await freshGame(page, 'qa_act3');
await clearOverlays(page);
const ACT3 = { act1_done: true, act2_started: true, act2_done: true, act3_started: true, patch_revealed: true, deadmans_done: true, auntie_unmasked: true, deaddrop_done: true, act: 3, meta_console_visible: true };
await lateGame(page, { hosts: 3, flags: ACT3 });
await clearOverlays(page);

// --- gate denied
await tab(page, 'net');
await page.click('[data-ui="addr-khbackbone"]');
await wait(page, 300);
await shot('gate-panel');
await page.click('[data-ui="jack-in"]', { force: true });
await wait(page, 800);
let s = await S(page);
check(s.mode === 'hub' && !s.run, 'backbone gate denied with 3 small hosts (still in the hub)');
await shot('gate-denied');
await clearOverlays(page);

// --- gate open: 24 hosts in Botnet role
await lateGame(page, { hosts: 24, flags: ACT3 });
await clearOverlays(page);
await tab(page, 'botnet');
await shot('botnet-24');
await dialIn(page, 'khbackbone');
await clearOverlays(page);
s = await S(page);
check(s.run === 'khbackbone', `backbone gate opens with a big botnet (run=${s.run})`);
await shot('backbone-map');
await page.click('[data-ui="jack-out"]');
await wait(page, 700);
await clearOverlays(page);

// --- arcology
await dialIn(page, 'arcology');
await clearOverlays(page);
s = await S(page);
check(s.run === 'arcology', 'dialed into the arcology');
// state jump: the path to the boardroom is already cleared (gateway → router → security)
await page.evaluate(() => {
  const e = window.__engine;
  const nodes = {};
  for (const id of ['gateway', 'router', 'security']) nodes[id] = { state: 'captured', ice: [], revealed: true };
  for (const id of ['boardroom', 'core', 'hr', 'lifts']) nodes[id] = { revealed: true };
  e.dispatch({ type: 'debug/set', patch: { run: { nodes, securityCaptured: true, trace: 0 } } });
});
await wait(page, 300);

async function bossFight(label, node) {
  await clickNode(page, node);
  check(await nodeAction(page, 'breach'), `breach ${node}`);
  await wait(page, 500);
  let shots = 0;
  let maxIce = 0;
  let phases = new Set();
  let banners = new Set();
  for (let i = 0; i < 400; i++) {
    const st = await S(page);
    if (!st.combat && i > 2) break;
    if (st.dialogue) {
      if (shots < 1 && i < 3) { await shot(`${label}-intro`); shots++; }
      await clearOverlays(page);
      continue;
    }
    if (!st.combat) break;
    const info = await page.evaluate(() => {
      const cv = window.__cwSelect.combatView(window.__engine);
      const b = [...document.querySelectorAll('.fx-banner')].map((x) => x.textContent);
      return { n: cv.ice.filter((x) => !x.dead).length, phases: cv.ice.map((x) => `${x.name}:${x.phase ?? 0}`), b, integ: cv.integrity, trace: window.__engine.state.run?.trace };
    });
    info.b.forEach((t) => banners.add(t));
    if (info.n > maxIce) {
      maxIce = info.n;
      if (maxIce >= 2) await shot(`${label}-ice${maxIce}`, maxIce === 2);
    }
    for (const p of info.phases) if (!phases.has(p) && !p.endsWith(':0')) { phases.add(p); await shot(`${label}-phase-${phases.size}`, phases.size === 1); }
    if (info.trace > 85) await patch(page, { run: { trace: 40 } }); // keep the run alive; this is not a trace test
    if (info.integ < 30) await patch(page, { player: { integrity: 80 } }); // nor a difficulty test
    await page.keyboard.press('Escape').catch(() => {});
    await fightTurn(page);
  }
  await wait(page, 600);
  log(label, 'max ICE at once', maxIce, 'phases', [...phases].join(' '), 'banners', [...banners].slice(0, 8).join(' | '));
  return { maxIce, phases };
}

const board = await bossFight('board', 'boardroom');
check(board.maxIce >= 2, `Board split / reinforcements seen (max ${board.maxIce} ICE at once)`);
check(board.phases.size >= 1, 'Board phase banner reached');
await wait(page, 500);
s = await S(page);
if (s.dialogue) { await page.keyboard.press('Enter'); await wait(page, 200); await shot('board-defeat'); }
await clearOverlays(page);
s = await S(page);
check(!!s.flags.board_defeated, 'Board defeated');

if (s.mode === 'run') {
  const v1 = await bossFight('chairman1', 'core');
  check(v1.phases.size >= 2, `CHAIRMAN v1 phases (${[...v1.phases].join(', ')})`);
}
await wait(page, 600);
log('after v1', JSON.stringify(await S(page)).slice(0, 300));
log('log tail', (await page.evaluate(() => window.__engine.state.log.slice(-25).map((l) => `${l.level}|${l.text}`))).join('\n   '));
// the file-listing reveal is the v1 defeat dialogue
for (let i = 0; i < 12; i++) {
  s = await S(page);
  if (!s.dialogue) break;
  await page.keyboard.press('Enter');
  await wait(page, 200);
  await shot(`listing-${i}`, i === 2);
  const ch = page.locator('[data-ui="dialogue"] .choice:not(.is-blocked)');
  if (await ch.count()) await ch.first().click();
  await wait(page, 300);
}
s = await S(page);
check(!!s.flags.localhost_revealed, 'localhost revealed after the listing');
if (await has(page, '[data-ui="card"]')) await shot('finale-card');
await clearOverlays(page);
if ((await S(page)).mode === 'run') { await page.click('[data-ui="jack-out"]'); await wait(page, 700); await clearOverlays(page); }
await tab(page, 'net');
check(await has(page, '[data-ui="addr-localhost"]'), '127.0.0.1 in the address book');
const txt = await page.locator('[data-ui="addr-localhost"]').textContent().catch(() => '');
check(/127\.0\.0\.1/.test(txt), `address shows 127.0.0.1 ("${txt?.slice(0, 60)}")`);
await page.click('[data-ui="addr-localhost"]').catch(() => {});
await wait(page, 300);
await shot('net-localhost');
for (const b of await wordingCheck(page)) c.errors.push(`wording: ${b}`);
await finish(c);
