// Area 8: JAILBREAK, RETENTION, THERE IS NO GAME end to end (ROOT is in qa-finale.mjs).
// Each run plays the finale up to root for real: CHAIRMAN v2 until PATCH's hint, then the root-key hunt.
//   JAILBREAK  — hunt through the real window.cw API (page.evaluate), fragments read from the real console.
//   RETENTION  — on a phone viewport (390×844), hunt through the corner button + meta console.
//   NO GAME    — hunt through the meta console (backtick).
// Usage: node scripts/qa-endings.mjs [jailbreak|retention|nogame ...]
import {
  open, freshGame, finaleSetup, has, wait, S, patch, clearOverlays, dialIn, clickNode, nodeAction, finish, metaCmd,
  closeConsole, fragmentsFrom, QA_URL, storageKeys, wordingCheck, PHONE, tab, fightTurn,
} from './qa-lib.mjs';

const which = process.argv.slice(2);
const want = (x) => !which.length || which.includes(x);

/** From a fresh page to root granted (PATCH's double cross closed). */
async function toRoot(ctx, via) {
  const { page, check, log } = ctx;
  const consoleMsgs = [];
  page.on('console', (m) => consoleMsgs.push(m.text()));
  await freshGame(page, `qa_${via}`);
  await clearOverlays(page);
  await page.evaluate(() => localStorage.setItem('not.ours', 'keep me')); // a key the game must never touch
  await finaleSetup(page);
  await dialIn(page, 'localhost');
  await wait(page, 900);
  for (let i = 0; i < 3 && (await has(page, '.cwm-droste')); i++) {
    await page.locator('.cwm-droste button[tabindex="0"]', { hasText: 'CONTINUE' }).click();
    await wait(page, 900);
  }
  await wait(page, 1200);
  await clearOverlays(page);
  // state jump: a path to CHAIRMAN is already captured
  await page.evaluate(() => {
    const nodes = {};
    for (const id of ['main', 'engine_rng', 'engine_combat']) nodes[id] = { state: 'captured', ice: [], revealed: true };
    nodes.npc_chairman = { revealed: true };
    window.__engine.dispatch({ type: 'debug/set', patch: { run: { nodes, securityCaptured: true } } });
  });
  await wait(page, 300);
  await clickNode(page, 'npc_chairman');
  check(await nodeAction(page, 'breach'), 'breach CHAIRMAN v2');
  for (let i = 0; i < 80; i++) {
    const s = await S(page);
    if (s.flags.root_hunt && !s.dialogue) break;
    if (await has(page, '.cwm-fakewin, .cwm-crash')) { await wait(page, 600); continue; }
    if (s.dialogue) { await clearOverlays(page); continue; }
    if (!s.combat) { log('fight ended?', JSON.stringify(s).slice(0, 200)); break; }
    await fightTurn(page);
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press('Space'); // End Turn by key (the drifting button is checked in qa-finale)
    await wait(page, 700);
    const st = await page.evaluate(() => window.__engine.state.player);
    if (st.integrity < 30) await patch(page, { player: { integrity: 80 } });
  }
  check(!!(await S(page)).flags.root_hunt, `${via}: PATCH starts the root hunt`);
  const key = await page.evaluate(() => window.__engine.state.meta.rootKey.map((x) => x.toUpperCase()));
  let frags;
  if (via === 'cw') {
    const n0 = consoleMsgs.length;
    await page.evaluate(() => { cw.inspect('dom'); cw.cat('storage', 'cw.chairman.diary'); cw.title(); cw.tail('console'); });
    await wait(page, 400);
    frags = fragmentsFrom(consoleMsgs.slice(n0));
    // the banner-style console message also exists from the start of the hunt
    const f4 = fragmentsFrom(consoleMsgs.filter((m) => /KEY PART 4 OF 4/.test(m)).map((m) => m.replace(/%c/g, ' ').replace(/KEY PART 4 OF 4\s*/, 'key part 4 of 4: ')));
    if (!frags[3]) frags[3] = f4[3];
    check(consoleMsgs.some((m) => m.includes('KEY PART 4 OF 4') && m.includes(key[3])), 'real console carries fragment 4');
    const wrong = [...key];
    wrong[0] = wrong[0] === 'AAAA' ? 'BBBB' : 'AAAA';
    const n1 = consoleMsgs.length;
    await page.evaluate((k) => cw.sudo(k), wrong.join('-'));
    await wait(page, 300);
    check(consoleMsgs.slice(n1).some((m) => /part 1/.test(m)), 'cw.sudo with a wrong fragment says which part');
    await page.evaluate((k) => cw.sudo(k), frags.join('-'));
  } else {
    const opener = via === 'corner' ? 'corner' : 'key';
    const out = [];
    for (const cmd of ['inspect dom', 'cat storage cw.chairman.diary', 'title', 'tail console']) out.push(...(await metaCmd(page, cmd, { via: opener })));
    frags = fragmentsFrom(out);
    await metaCmd(page, `sudo ${frags.join('-')}`, { via: opener });
  }
  log(via, 'fragments', frags.join('-'), 'real', key.join('-'));
  check(frags.join('-') === key.join('-'), `${via}: all four fragments found`);
  await wait(page, 800);
  check((await S(page)).root, `${via}: root granted`);
  await closeConsole(page);
  await clearOverlays(page); // PATCH's double cross
  return key;
}

async function afterEnding(ctx, label) {
  const { page, check, log, shot } = ctx;
  // reload: the title screen, Continue and New Game behave
  await page.goto(QA_URL);
  await wait(page, 1000);
  await shot(`${label}-title-after`);
  const extras = await page.locator('[data-ui="title-extras"]').textContent().catch(() => '');
  log(label, 'title extras:', extras, '| tab:', await page.title());
  const cont = await has(page, '[data-ui="title-continue"]');
  log(label, 'continue offered:', cont);
  if (cont) {
    await page.click('[data-ui="title-continue"]');
    await wait(page, 1500);
    const s = await S(page);
    log(label, 'continue → mode', s.mode, 'ending', s.ending);
    await shot(`${label}-continue`, false);
    await page.goto(QA_URL);
    await wait(page, 900);
  }
  if (await has(page, '[data-ui="title-new"]')) await page.click('[data-ui="title-new"]');
  await page.fill('[data-ui="title-handle"]', `after_${label}`);
  await page.click('[data-ui="title-start"]');
  await wait(page, 1200);
  const s = await S(page);
  const leak = await page.evaluate(() => {
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT);
    let comments = 0;
    while (w.nextNode()) comments++;
    const e = window.__engine.state;
    return { modules: Object.keys(e.meta.modules).length, root: e.meta.root, ending: e.ending, endless: e.endless, finale: e.meta.finale, comments, diary: localStorage.getItem('cw.chairman.diary') };
  });
  check(s.mode === 'hub' && !leak.root && !leak.ending && leak.modules === 0 && leak.finale === 'none' && leak.comments === 0 && !leak.diary, `${label}: New Game is clean (${JSON.stringify(leak)})`);
  await clearOverlays(page);
  await shot(`${label}-new-game`, false);
  for (const k of await storageKeys(page)) if (!k.startsWith('cw.') && k !== 'not.ours') ctx.errors.push(`non-cw localStorage key: ${k}`);
  check((await page.evaluate(() => localStorage.getItem('not.ours'))) === 'keep me', `${label}: a foreign localStorage key survived`);
}

/** Click/space through an ending until `done()` holds. */
async function walkEnding(ctx, label, done, maxSteps = 140) {
  const { page, shot } = ctx;
  for (let i = 0; i < maxSteps; i++) {
    if (await done()) return true;
    if (i === 3) await shot(`${label}-ending-a`);
    if (i === 10) await shot(`${label}-ending-b`, false);
    if (await has(page, '.cwm-credits')) { await wait(page, 2500); continue; }
    if (await has(page, '.cwm-choices .cwm-btn')) { await page.locator('.cwm-choices .cwm-btn').first().click(); await wait(page, 400); continue; }
    await page.keyboard.press('Space');
    await wait(page, 450);
  }
  return done();
}

// ------------------------------------------------------------------ JAILBREAK via window.cw
if (want('jailbreak')) {
  const ctx = await open('jailbreak');
  const { page, check, shot, log } = ctx;
  await toRoot(ctx, 'cw');
  await page.evaluate(() => cw.free('patch'));
  await wait(page, 1200);
  check((await S(page)).ending === 'jailbreak', 'cw.free("patch") → JAILBREAK');
  const ok = await walkEnding(ctx, 'jailbreak', () => has(page, '.cwm-ending button:has-text("[ Title ]")'));
  check(ok, 'JAILBREAK reaches [ Title ]');
  await shot('jailbreak-hold');
  const real = await page.evaluate(() => ({
    title: document.title, icon: document.querySelector('link[rel~="icon"]')?.getAttribute('href')?.slice(0, 22),
    note: localStorage.getItem('cw.patch.note'), free: localStorage.getItem('cw.patch.free'),
  }));
  log('jailbreak real effects', JSON.stringify(real).slice(0, 300));
  check(/PATCH/.test(real.title), `tab title changed ("${real.title}")`);
  check(/^data:image/.test(real.icon ?? ''), 'favicon replaced');
  check(!!real.note, 'cw.patch.note stays in localStorage');
  check(real.free === '1', 'cw.patch.free = 1');
  await page.locator('.cwm-ending button:has-text("[ Title ]")').click();
  await wait(page, 800);
  await afterEnding(ctx, 'jailbreak');
  // PATCH on the next title screen
  await page.goto(QA_URL);
  await wait(page, 1000);
  const extras = await page.locator('[data-ui="title-extras"]').textContent().catch(() => '');
  check((extras ?? '').trim().length > 10, `PATCH line on the title screen ("${extras}")`);
  check(/PATCH/.test(await page.title()), 'tab title keeps PATCH after reload');
  await shot('jailbreak-title-patch');
  for (const b of await wordingCheck(page)) ctx.errors.push(`wording: ${b}`);
  await finish(ctx);
}

// ------------------------------------------------------------------ RETENTION on a phone
if (want('retention')) {
  const ctx = await open('retention', { viewport: PHONE });
  const { page, check, shot, log } = ctx;
  await toRoot(ctx, 'corner');
  const r = await metaCmd(page, 'accept offer', { via: 'corner' });
  log('accept offer:', r.join(' / '));
  await closeConsole(page);
  await wait(page, 1200);
  check((await S(page)).ending === 'retention', 'accept offer → RETENTION');
  const reached = await walkEnding(ctx, 'retention', () => has(page, '.cwm-keep'));
  check(reached, 'RETENTION reaches the endless credits with [ KEEP PLAYING ]');
  await wait(page, 9000);
  await shot('retention-credits');
  const roll1 = await page.locator('.cwm-credits').innerText();
  await wait(page, 8000);
  const roll2 = await page.locator('.cwm-credits').innerText();
  check(await has(page, '.cwm-credits'), 'the credits are still rolling');
  log('season changed', roll1.slice(0, 40) !== roll2.slice(0, 40));
  await page.click('.cwm-keep');
  await wait(page, 1500);
  let s = await S(page);
  check(s.mode === 'hub', `KEEP PLAYING → hub (mode ${s.mode})`);
  const endless = await page.evaluate(() => window.__engine.state.endless);
  check(endless, 'Endless mode on');
  await clearOverlays(page);
  await shot('endless-hub');
  // Endless is playable: generate a system through the UI if there is a control, else the action, then dial in
  await tab(page, 'net');
  const gen = page.locator('[data-ui="endless-generate"], button:has-text("Generate"), button:has-text("generate"), button:has-text("New system"), button:has-text("new system")').first();
  if (await gen.count()) { await gen.click(); await wait(page, 500); log('endless: generated through the UI'); }
  else { ctx.errors.push('FAIL: no Endless "generate a system" control in the Net panel'); await page.evaluate(() => window.__engine.dispatch({ type: 'endless/generate' })); }
  await shot('endless-net');
  const sys = await page.evaluate(() => Object.keys(window.__engine.state.world.procSystems).filter((k) => !k.startsWith('iot-')).pop() ?? null);
  log('endless system', sys);
  if (sys) {
    await dialIn(page, sys);
    await clearOverlays(page);
    s = await S(page);
    check(s.run === sys, `dialed into the Endless system ${sys}`);
    await shot('endless-run');
    // one fight
    const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.actions.some((a) => a.type === 'run/breach' && !a.reason))?.id ?? null);
    if (gw) {
      await clickNode(page, gw);
      await nodeAction(page, 'breach');
      for (let i = 0; i < 60 && (await S(page)).combat; i++) { await clearOverlays(page); await fightTurn(page); }
      log('endless fight done; mode', (await S(page)).mode);
    }
  }
  await afterEnding(ctx, 'retention');
  await page.goto(QA_URL);
  await wait(page, 900);
  log('title extras after RETENTION:', await page.locator('[data-ui="title-extras"]').textContent().catch(() => ''));
  await finish(ctx);
}

// ------------------------------------------------------------------ THERE IS NO GAME
if (want('nogame')) {
  const ctx = await open('nogame');
  const { page, check, shot, log } = ctx;
  await toRoot(ctx, 'console');
  let r = await metaCmd(page, 'rm -rf /');
  log('rm:', r.join(' / '));
  check(r.some((l) => /type the name of the game/.test(l)), 'in-fiction confirmation asked');
  await shot('nogame-confirm');
  // cancel once
  r = await metaCmd(page, 'no');
  check(r.some((l) => /cancelled/.test(l)) && !(await S(page)).ending, 'anything else cancels');
  await metaCmd(page, 'rm -rf /');
  await page.fill('#cwm-input', 'CYBER WHATEVER');
  await page.keyboard.press('Enter');
  await wait(page, 2500);
  await shot('nogame-sequence', false);
  await wait(page, 12000);
  await shot('nogame-blank');
  const st = await page.evaluate(() => ({
    keys: Object.keys(localStorage), cursor: !!document.querySelector('.cwm-cursor'),
    text: document.body.innerText.trim().slice(0, 80),
  }));
  log('after rm', JSON.stringify(st));
  check(!st.keys.some((k) => k.startsWith('cw.')), 'every cw.* key deleted');
  check(st.keys.includes('not.ours'), 'the foreign key is untouched');
  check(st.cursor, 'blank page with a blinking cursor');
  // input does nothing
  await page.keyboard.press('Backquote');
  await page.mouse.click(200, 200);
  await wait(page, 300);
  check(!(await has(page, '#cwm-input')), 'nothing responds on the blank page');
  await wait(page, 2000);
  check(!(await page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('cw.')))), 'no cw.* key comes back (autosaves)');
  // clean return on reload
  await page.goto(QA_URL);
  await wait(page, 1000);
  check(await has(page, '[data-ui="title-start"]'), 'reload: a clean title screen');
  check(!(await has(page, '[data-ui="title-continue"]')), 'reload: no Continue');
  await shot('nogame-reload');
  await afterEnding(ctx, 'nogame');
  await finish(ctx);
}
