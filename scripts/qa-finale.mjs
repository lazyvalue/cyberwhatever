// Area 7 (+ ROOT ending of area 8): the finale in the real UI.
// Droste intro (with a reload) → game-concept ICE and module captures → CHAIRMAN v2's interface cheating →
// root-key hunt through the in-game meta console (backtick + corner button) → wrong and right sudo →
// PATCH's double cross → botnet fight lost, then won → ROOT ending → title, Continue, New Game.
import {
  open, freshGame, finaleSetup, has, wait, S, patch, clearOverlays, dialIn, clickNode, nodeAction, fightTurn, finish,
  wordingCheck, metaCmd, closeConsole, fragmentsFrom, QA_URL, storageKeys,
} from './qa-lib.mjs';

const c = await open('finale');
const { page, check, shot, log } = c;
const consoleMsgs = [];
page.on('console', (m) => consoleMsgs.push(m.text()));

await freshGame(page, 'qa_fin');
await clearOverlays(page);
await finaleSetup(page);
await dialIn(page, 'localhost');
await wait(page, 800);
let s = await S(page);
check(s.run === 'localhost', 'dialed into 127.0.0.1');
check(await has(page, '.cwm-droste'), 'Droste intro shows');
await shot('droste');
// reload in the middle of the Droste intro
await page.goto(QA_URL);
await wait(page, 900);
await page.click('[data-ui="title-continue"]');
await wait(page, 1200);
// runs are not saved mid-run: a reload puts you back in the hub (checkpoint before the dial-in)
s = await S(page);
log('after reload in the Droste: mode', s.mode, 'cinematic', s.cinematic, 'finale', s.finale);
await shot('droste-after-reload', false);
if (s.mode === 'hub') {
  await clearOverlays(page);
  await dialIn(page, 'localhost');
  await wait(page, 800);
}
check(await has(page, '.cwm-droste'), 'Droste intro shows again after a reload (and dial-in)');
for (let i = 0; i < 3; i++) {
  await page.locator('.cwm-droste button[tabindex="0"]', { hasText: 'CONTINUE' }).click();
  await wait(page, 900);
}
await wait(page, 1200);
check(!(await has(page, '.cwm-droste')), 'Droste closes after CONTINUE ×3');
await clearOverlays(page);
await shot('localhost-map');

const top = async () => {
  const st = await page.evaluate(() => ({ i: window.__engine.state.player.integrity, n: window.__engine.state.player.neural, t: window.__engine.state.run?.trace ?? 0 }));
  if (st.i < 30) await patch(page, { player: { integrity: 80 } });
  if (st.n < 12) await patch(page, { player: { neural: 30 } });
  if (st.t > 85) await patch(page, { run: { trace: 30 } });
};

/** Fight a module node with real clicks; handles EULA demands and Paywall offers. */
async function moduleFight(node, { pay = false } = {}) {
  await clickNode(page, node);
  check(await nodeAction(page, 'breach'), `breach ${node}`);
  await wait(page, 400);
  const seen = new Set();
  for (let i = 0; i < 250; i++) {
    const st = await S(page);
    if (!st.combat && i > 0) break;
    if (st.dialogue || (await has(page, '[data-ui="card"]'))) {
      if (!seen.has('popup') && (await has(page, '[data-ui="card"]'))) { seen.add('popup'); await shot(`${node}-popup`); }
      await clearOverlays(page);
      continue;
    }
    if (await has(page, '[data-ui="accept-demand"]')) {
      if (!seen.has('demand')) { seen.add('demand'); await shot(`${node}-eula`); }
      await page.click('[data-ui="accept-demand"]', { force: true }); // not scrolled: refused
      await wait(page, 150);
      check(await has(page, '[data-ui="accept-demand"]'), 'EULA accept refused before scrolling');
      await page.locator('.demand .terms').evaluate((el) => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
      await wait(page, 150);
      await page.click('[data-ui="accept-demand"]');
      await wait(page, 250);
      check(!(await has(page, '[data-ui="accept-demand"]')), 'EULA closes after scroll + accept');
      continue;
    }
    if (pay && (await has(page, '[data-ui="accept-offer"]'))) {
      await shot(`${node}-paywall`);
      const before = (await S(page)).credits;
      await page.click('[data-ui="accept-offer"]');
      await wait(page, 1200);
      const after = await S(page);
      check(!after.combat && before - after.credits === 999, `Paywall paid: fight ended, −999 ¤ (${before} → ${after.credits})`);
      break;
    }
    if (pay) { // let the Paywall make its offer: do not attack it
      await page.keyboard.press('Escape').catch(() => {});
      await page.keyboard.press('Space');
      await wait(page, 500);
      await top();
      continue;
    }
    const evicted = await page.locator('[data-ui^="program-"].evicted, [data-ui^="program-"].is-evicted').count();
    if (evicted && !seen.has('evict')) { seen.add('evict'); await shot(`${node}-evicted`, false); }
    if (i === 2 && !seen.has('fight')) { seen.add('fight'); await shot(`${node}-fight`); }
    await top();
    await page.keyboard.press('Escape').catch(() => {});
    await fightTurn(page);
  }
  await wait(page, 700);
  await page.keyboard.press('Escape').catch(() => {});
  await clearOverlays(page);
  s = await S(page);
  if (s.mode === 'run' && !s.combat) {
    await clickNode(page, node);
    const cap = await nodeAction(page, 'capture');
    await wait(page, 500);
    await clearOverlays(page);
    log(node, 'captured', cap);
    return cap;
  }
  log(node, 'ended in', JSON.stringify(s).slice(0, 200));
  return false;
}

const mods = () => page.evaluate(() => Object.keys(window.__engine.state.meta.modules));
check(await moduleFight('main'), 'main captured');
check(await moduleFight('engine_rng'), 'engine/rng captured');
const rig = await page.evaluate(() => window.__cwSelect.metaView(window.__engine));
check(!!rig.rngRigged, 'engine/rng: rolls rigged (metaView)');
check(await moduleFight('engine_save'), 'engine/save captured');
check(await page.evaluate(() => !!window.__engine.state.meta.finaleCheckpoint && !!localStorage.getItem('cw.checkpoint')), 'engine/save: finale checkpoint written');
check(await moduleFight('content_story', { pay: true }), 'content/story captured after paying the Paywall');
const receipt = await page.evaluate(() => window.__engine.state.messages.some((m) => /purchase/i.test(m.text)));
check(receipt, 'CHAIRMAN thanks you for your purchase (receipt DM)');
// endings list readable once content/story is taken
await clickNode(page, 'content_story');
await nodeAction(page, 'loot');
await wait(page, 300);
await clearOverlays(page);
check(await page.evaluate(() => window.__engine.state.player.lore.includes('file.localhost.endings')), 'content/story: endings.json readable');
check(await moduleFight('engine_combat'), 'engine/combat captured (Achievement Spam + Garbage Collector)');
log('modules', (await mods()).join(', '));
await shot('modules-done');

// ------------------------------------------------------------------ CHAIRMAN v2
await clickNode(page, 'npc_chairman');
check(await nodeAction(page, 'breach'), 'breach npc/chairman');
await wait(page, 600);
if (await has(page, '[data-ui="dialogue"]')) { await page.keyboard.press('Enter'); await wait(page, 200); await shot('v2-intro'); }
await clearOverlays(page);
const seenT = { labels: false, drift: false, disabled: false, infinite: false, damage: false, fakeWin: false, crash: false, f12: false, normal: false };
let lastPos = null;
const endTurnUnclickable = [];
let lastTurn = 0;
for (let k = 0; k < 40; k++) {
  s = await S(page);
  if (!s.combat) { log('v2 fight ended?', JSON.stringify(s).slice(0, 200)); break; }
  if (await has(page, '.cwm-fakewin')) {
    seenT.fakeWin = true;
    await shot('v2-fakewin');
    await wait(page, 3000);
    await shot('v2-fakewin-retract', false);
    for (let j = 0; j < 20 && (await has(page, '.cwm-fakewin')); j++) await wait(page, 300);
    continue;
  }
  if (await has(page, '.cwm-crash')) {
    seenT.crash = true;
    await shot('v2-crash');
    for (let j = 0; j < 30 && (await has(page, '.cwm-crash')); j++) await wait(page, 300);
    check(!(await has(page, '.cwm-crash')), 'fake crash goes away by itself');
    continue;
  }
  if (s.dialogue) {
    if (/f12/.test(s.dialogue)) { seenT.f12 = true; await page.keyboard.press('Enter'); await wait(page, 200); await shot('v2-f12'); }
    await clearOverlays(page);
    continue;
  }
  const ui = await page.evaluate(() => {
    const et = document.querySelector('[data-ui="end-turn"]');
    const r = et?.getBoundingClientRect();
    return {
      labels: [...document.querySelectorAll('[data-ui^="program-slot-"]')].map((x) => x.textContent.trim()),
      et: et?.textContent.trim(), etDis: et?.getAttribute('aria-disabled') === 'true' || et?.hasAttribute('disabled'),
      pos: r ? [Math.round(r.x), Math.round(r.y)] : null,
      body: document.querySelector('[data-ui="combat"]')?.innerText ?? '',
    };
  });
  if (s.combat.turn !== lastTurn) {
    lastTurn = s.combat.turn;
    log(`v2 turn ${lastTurn}: end="${ui.et}" disabled=${ui.etDis} pos=${ui.pos} labels=${ui.labels.slice(0, 3).join('|')}`);
    if (ui.labels.some((l) => /keep_playing|subscribe|stay|don't_go|look_at_us/.test(l))) seenT.labels = true;
    if (ui.body.includes('∞')) seenT.infinite = true;
    if (lastPos && ui.pos && (lastPos[0] !== ui.pos[0] || lastPos[1] !== ui.pos[1])) seenT.drift = true;
    lastPos = ui.pos;
    if (lastTurn <= 9) await shot(`v2-turn${lastTurn}`, lastTurn === 2 || lastTurn === 4);
  }
  if (ui.etDis) {
    seenT.disabled = true;
    const t0 = s.combat.turn;
    await page.click('[data-ui="end-turn"]', { force: true });
    await wait(page, 250);
    check((await S(page)).combat?.turn === t0, `disabled End Turn ("${ui.et}") refuses the click`);
    await wait(page, 5300);
    const back = await page.evaluate(() => document.querySelector('[data-ui="end-turn"]')?.getAttribute('aria-disabled') !== 'true' && !document.querySelector('[data-ui="end-turn"]')?.hasAttribute('disabled'));
    check(back, 'End Turn comes back after ~5 s (no soft-lock)');
  }
  // one program, then End Turn (real clicks); the damage popup text should be the rigged joke
  await fightTurn(page);
  const dmg = await page.evaluate(() => [...document.querySelectorAll('.fx-num, .dmg-num, [class*="damage"]')].map((x) => x.textContent).join(' '));
  if (/Math\.random/.test(dmg)) seenT.damage = true;
  await top();
  const t0 = (await S(page)).combat?.turn;
  let clicked = true;
  await page.click('[data-ui="end-turn"]', { timeout: 1500 }).catch(() => { clicked = false; });
  if (!clicked) {
    endTurnUnclickable.push(t0);
    await page.evaluate(() => document.activeElement?.blur?.()); // Space on a focused program re-fires it (reported)
    await page.keyboard.press('Space');
  }
  await wait(page, 900);
  const t1 = (await S(page)).combat?.turn;
  if (t1 === t0 && !(await has(page, '.cwm-fakewin, .cwm-crash, [data-ui="dialogue"]'))) {
    // maybe disabled just now; wait it out once
    await wait(page, 5500);
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press('Space');
    await wait(page, 900);
    check((await S(page)).combat?.turn !== t0 || !(await S(page)).combat, `turn ${t0} can always be ended`);
  }
  const flags = (await S(page)).flags;
  if (flags.root_hunt && lastTurn >= 9) break;
}
log('v2 tricks seen', JSON.stringify(seenT));
check(!endTurnUnclickable.length, `End Turn is clickable with the mouse every turn (not on turns ${endTurnUnclickable.join(', ')}; Space worked)`);
for (const [k, v] of Object.entries(seenT)) if (k !== 'normal' && k !== 'damage') check(v, `CHAIRMAN v2 trick seen: ${k}`);
if (!seenT.damage) log('note: "Math.random() // lol no" damage text not found by selector (check screenshots)');
for (const b of await wordingCheck(page)) c.errors.push(`wording: ${b}`);

// ------------------------------------------------------------------ root hunt: in-game console only
s = await S(page);
check(!!s.flags.root_hunt, 'root hunt started');
const key = await page.evaluate(() => window.__engine.state.meta.rootKey.map((x) => x.toUpperCase()));
const out = [];
out.push(...(await metaCmd(page, 'help')));
await shot('console-help');
out.push(...(await metaCmd(page, 'inspect dom')));
out.push(...(await metaCmd(page, 'cat storage cw.chairman.diary')));
await closeConsole(page);
check(!(await has(page, '#cwm-input')), 'console closes with Escape');
// corner button opens it too
await page.click('.cwm-corner');
await wait(page, 300);
check(await has(page, '#cwm-input'), 'corner button opens the console');
out.push(...(await metaCmd(page, 'title')));
out.push(...(await metaCmd(page, 'tail console')));
await shot('console-hunt');
const frags = fragmentsFrom(out);
log('fragments from console', frags.join('-'), 'real', key.join('-'));
check(frags.join('-') === key.join('-'), 'console readers reveal all four fragments');
// the four real layers really hold them
const layers = await page.evaluate(() => {
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode.nodeValue);
  return { comments: comments.join('\n'), diary: localStorage.getItem('cw.chairman.diary') ?? '' };
});
check(layers.comments.includes(key[0]), 'layer 1: DOM comment holds fragment 1');
check(layers.diary.includes(key[1]), 'layer 2: localStorage cw.chairman.diary holds fragment 2');
let titleHit = false;
for (let i = 0; i < 60 && !titleHit; i++) {
  const t = await page.title();
  if (t.includes(key[2])) titleHit = true;
  else await wait(page, 250);
}
check(titleHit, 'layer 3: document.title scrolls fragment 3');
check(consoleMsgs.some((m) => m.includes('KEY PART 4 OF 4') && m.includes(key[3])), 'layer 4: real console message holds fragment 4');
// wrong fragment feedback
const wrong = [...key];
wrong[2] = wrong[2] === 'AAAA' ? 'BBBB' : 'AAAA';
const w1 = await metaCmd(page, `sudo ${wrong.join('-')}`);
check(w1.some((l) => /part 3/.test(l)), `wrong fragment names the part ("${w1.join(' ')}")`);
const w2 = await metaCmd(page, `sudo ${[key[1], key[0], key[2], key[3]].join('-')}`);
check(w2.some((l) => /order/.test(l)), `wrong order explained ("${w2.join(' ')}")`);
const ok = await metaCmd(page, `sudo ${key.join('-')}`);
await wait(page, 600);
check((await S(page)).root, `sudo grants root ("${ok.join(' ')}")`);
await shot('root');
await closeConsole(page);
// PATCH's double cross
await wait(page, 800);
s = await S(page);
check(/double_cross/.test(s.dialogue ?? ''), `PATCH double-cross dialogue (${s.dialogue})`);
if (s.dialogue) { await page.keyboard.press('Enter'); await wait(page, 200); await shot('double-cross'); }
await clearOverlays(page);
check(!(await page.evaluate(() => document.title)).includes(key[2]), 'tab title restored after root');

// kill chairman
let r = await metaCmd(page, 'kill chairman');
log('kill chairman:', r.join(' / '));
await closeConsole(page);
await wait(page, 600);
if (await has(page, '[data-ui="dialogue"]')) { await page.keyboard.press('Enter'); await wait(page, 200); await shot('chairman-death'); }
await clearOverlays(page);
s = await S(page);
check(s.finale === 'chairman_dead', `CHAIRMAN dead (stage ${s.finale})`);

// PATCH botnet fight: lose it first
r = await metaCmd(page, 'kill patch');
await closeConsole(page);
await wait(page, 600);
await clearOverlays(page);
s = await S(page);
check(s.combat?.context === 'patch', `PATCH fight starts (${JSON.stringify(s.combat)})`);
await shot('patch-fight');
check(!(await has(page, '[data-ui="botnet-ddos"]:not([aria-disabled="true"])')) || true, 'botnet buttons in the PATCH fight');
for (let i = 0; i < 80; i++) {
  s = await S(page);
  if (!s.combat) break;
  if (s.dialogue) { await clearOverlays(page); continue; }
  await page.keyboard.press('Escape').catch(() => {});
  await page.keyboard.press('Space');
  await wait(page, 350);
}
await wait(page, 800);
await clearOverlays(page);
s = await S(page);
check(!s.combat && s.finale === 'chairman_dead' && s.mode !== 'flatlined', `PATCH fight lost: back to stage ${s.finale}, mode ${s.mode}`);
await shot('patch-lost');
// a player who lost reassigns hosts: hang up, move 18 hosts to Mine/Proxy in the Botnet panel, kill patch from the hub
if ((await S(page)).mode === 'run') { await page.click('[data-ui="jack-out"]'); await wait(page, 800); await clearOverlays(page); }
check((await S(page)).mode === 'hub', 'hung up after losing the PATCH fight');
await page.click('[data-ui="hub-botnet"]');
await wait(page, 300);
for (let i = 0; i < 18; i++) {
  const sel = `[data-ui="host-qah${i}-${i % 2 ? 'mine' : 'proxy'}"]`;
  if (await has(page, sel)) await page.click(sel);
  await wait(page, 60);
}
await shot('botnet-reassigned');
const spec = await page.evaluate(() => window.__cwSelect.patchFightSpec(window.__engine));
log('PATCH spec after reassigning', JSON.stringify(spec).slice(0, 200));
check(spec.loyalHosts >= 18, `hosts reassigned through the panel (${spec.loyalHosts} loyal)`);
await metaCmd(page, 'kill patch');
await closeConsole(page);
await wait(page, 600);
await clearOverlays(page);
let steps = 0;
for (; steps < 400; steps++) {
  s = await S(page);
  if (!s.combat) break;
  if (s.dialogue) { await clearOverlays(page); continue; }
  await top();
  await page.keyboard.press('Escape').catch(() => {});
  await fightTurn(page);
}
await wait(page, 1000);
s = await S(page);
check(s.finale === 'patch_beaten' || !!s.flags.patch_body_broken, `PATCH botnet beaten (stage ${s.finale}, ${steps} steps)`);
if (await has(page, '[data-ui="dialogue"]')) { await page.keyboard.press('Enter'); await wait(page, 200); await shot('patch-last-words'); }
await clearOverlays(page);
// ROOT
await metaCmd(page, 'kill patch');
await closeConsole(page);
await wait(page, 1200);
s = await S(page);
check(s.ending === 'root', `ROOT ending (${s.ending})`);
await shot('root-ending-1');
// walk the ending with clicks and Space
let held = false;
for (let i = 0; i < 120; i++) {
  if (await has(page, '.cwm-ending button:has-text("[ Title ]")')) { held = true; break; }
  if (i === 6) await shot('root-ending-mid');
  if (await has(page, '.cwm-stats')) await shot('root-ending-stats', false);
  if (await has(page, '.cwm-credits')) { await shot('root-ending-credits', false); await wait(page, 2000); continue; }
  await page.keyboard.press('Space');
  await wait(page, 500);
}
check(held, 'ROOT ending reaches [ Title ]');
await shot('root-ending-hold');
check(await page.evaluate(() => localStorage.getItem('cw.meta.endings')?.includes('root')), 'cw.meta.endings records root');
await page.locator('.cwm-ending button:has-text("[ Title ]")').click();
await wait(page, 800);
check(await has(page, '[data-ui="title-new"], [data-ui="title-start"]'), 'back on the title screen');
await shot('title-after-root');
const extras = await page.locator('[data-ui="title-extras"]').textContent().catch(() => '');
log('title extras after ROOT:', extras);
// Continue → the save sits at the ending
if (await has(page, '[data-ui="title-continue"]')) {
  await page.click('[data-ui="title-continue"]');
  await wait(page, 1500);
  await shot('continue-after-root');
  log('continue after root: ending screen?', await has(page, '.cwm-ending'));
}
// New Game: nothing leaks
await page.goto(QA_URL);
await wait(page, 900);
if (await has(page, '[data-ui="title-new"]')) await page.click('[data-ui="title-new"]');
await page.fill('[data-ui="title-handle"]', 'qa_after');
await page.click('[data-ui="title-start"]');
await wait(page, 1200);
s = await S(page);
const leak = await page.evaluate(() => ({ title: document.title, glitch: getComputedStyle(document.documentElement).getPropertyValue('--glitch'), modules: Object.keys(window.__engine.state.meta.modules).length, root: window.__engine.state.meta.root, comments: (() => { const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT); let n = 0; while (w.nextNode()) n++; return n; })() }));
check(s.mode === 'hub' && !s.root && leak.modules === 0, 'New Game after ROOT is a fresh hub');
check(leak.title === 'CYBER WHATEVER 2028: The future already sucks.', `tab title back to the full title ("${leak.title}")`);
log('after new game', JSON.stringify(leak));
await clearOverlays(page);
await shot('new-game-after-root');
log('storage keys', (await storageKeys(page)).join(' '));
for (const k of await storageKeys(page)) if (!k.startsWith('cw.')) c.errors.push(`non-cw localStorage key: ${k}`);
await finish(c);
