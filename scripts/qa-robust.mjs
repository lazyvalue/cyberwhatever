// Area 9 (+10): robustness. Reload at each screen type, broken saves, localStorage that throws or is missing,
// late audio unlock, reduced motion, keyboard-only play (hub + a whole fight), phone touch combat.
import {
  open, freshGame, lateGame, has, wait, S, patch, clearOverlays, dialIn, clickNode, nodeAction, finish, wordingCheck,
  QA_URL, PHONE, arena, fightTurn, combatInfo,
} from './qa-lib.mjs';
import { launch } from './pw-browser.mjs';

const which = process.argv.slice(2);
const want = (x) => !which.length || which.includes(x);

async function reloadContinue(page) {
  await page.goto(QA_URL);
  await wait(page, 900);
  if (await has(page, '[data-ui="title-continue"]')) {
    await page.click('[data-ui="title-continue"]');
    await wait(page, 900);
    return true;
  }
  return false;
}
const blank = (page) => page.evaluate(() => (document.getElementById('app')?.innerText ?? '').trim().length < 5);

// ------------------------------------------------------------------ reload at each screen type
if (want('reload')) {
  const c = await open('reload');
  const { page, check, shot, log } = c;
  await freshGame(page, 'qa_rl');
  await clearOverlays(page);
  await lateGame(page, { flags: { act1_done: true, act2_started: true, act: 2 }, hosts: 6 });
  await clearOverlays(page);
  const at = async (label) => {
    const ok = await reloadContinue(page);
    const s = await S(page);
    log(`reload in ${label}: continue=${ok} → mode ${s.mode}, run ${s.run}, dialogue ${s.dialogue}`);
    check(ok && !(await blank(page)), `reload in ${label}: Continue works, screen not blank`);
    await shot(`after-${label}`, false);
    await clearOverlays(page);
  };
  await at('hub');
  await dialIn(page, 'wok');
  await clearOverlays(page);
  await at('run');
  await arena(page, ['ice.sentry']);
  await dialIn(page, 'wok');
  await clearOverlays(page);
  const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
  await clickNode(page, gw);
  await nodeAction(page, 'breach');
  await wait(page, 400);
  await at('fight');
  await page.evaluate(() => window.__engine.dispatch({ type: 'dialogue/start', dialogue: Object.keys(window.__engine.content.dialogues)[0] }));
  await wait(page, 300);
  await at('dialogue');
  await finish(c);
}

// ------------------------------------------------------------------ broken saves
if (want('saves')) {
  const c = await open('saves');
  const { page, check, shot, log } = c;
  await freshGame(page, 'qa_sv');
  await clearOverlays(page);
  await wait(page, 300);
  const good = await page.evaluate(() => localStorage.getItem('cw.save'));
  const cases = {
    'bad-json': '{"version":1,"player":',
    'empty-object': '{}',
    'version-only': '{"version":1}',
    'partial-player': '{"version":1,"cycle":5,"player":{"handle":"old_me","rep":3}}',
    'future-version': (() => { const s = JSON.parse(good); s.version = 99; return JSON.stringify(s); })(),
    'old-missing-fields': (() => {
      const s = JSON.parse(good);
      delete s.cinematic; delete s.story.objectives; delete s.story.counts; delete s.meta.fragments; delete s.stats.botnetPeak;
      delete s.world.procCounter; delete s.player.pendingPerks; delete s.stats.programUses;
      return JSON.stringify(s);
    })(),
    'null': 'null',
  };
  for (const [name, val] of Object.entries(cases)) {
    const n0 = c.errors.length;
    await page.goto(QA_URL);
    await page.evaluate((v) => localStorage.setItem('cw.save', v), val);
    await page.reload();
    await wait(page, 900);
    const titleUp = await has(page, '[data-ui="title-start"], [data-ui="title-new"], [data-ui="title-continue"]');
    const cont = await has(page, '[data-ui="title-continue"]');
    let result = `title=${titleUp} continue=${cont}`;
    if (cont) {
      await page.click('[data-ui="title-continue"]');
      await wait(page, 1200);
      const b = await blank(page);
      const where = await page.evaluate(() => (document.querySelector('[data-ui="title-continue"]') ? 'title' : document.querySelector('.shell') ? 'game' : 'other'));
      result += ` → after Continue: ${where}${b ? ' (BLANK)' : ''}`;
      check(!b, `save "${name}": Continue does not white-screen`);
      if (where === 'title') check(true, `save "${name}": Continue refused, still on the title`);
    }
    // a new game must always work
    await page.goto(QA_URL);
    await wait(page, 700);
    if (await has(page, '[data-ui="title-new"]')) await page.click('[data-ui="title-new"]');
    const canNew = await has(page, '[data-ui="title-start"]');
    if (canNew) {
      await page.fill('[data-ui="title-handle"]', 'fresh');
      await page.click('[data-ui="title-start"]');
      await wait(page, 800);
    }
    const s = canNew ? await S(page) : null;
    check(canNew && s?.mode === 'hub', `save "${name}": New Game works`);
    log(`save ${name}: ${result}; new errors: ${c.errors.slice(n0).map((e) => e.slice(0, 120)).join(' || ') || 'none'}`);
    await shot(`save-${name}`, false);
  }
  await finish(c);
}

// ------------------------------------------------------------------ localStorage throwing / missing
if (want('storage')) {
  for (const [name, script] of [
    ['throwing', () => {
      for (const m of ['getItem', 'setItem', 'removeItem', 'key', 'clear']) Storage.prototype[m] = function () { throw new DOMException('denied', 'SecurityError'); };
    }],
    ['missing', () => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } });
    }],
    ['quota', () => {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (String(k) === 'cw.save' || String(k) === 'cw.checkpoint') throw new DOMException('QuotaExceededError', 'QuotaExceededError'); return orig.call(this, k, v); };
    }],
  ]) {
    const c = await open(`storage-${name}`, { initScript: script });
    const { page, check, shot, log } = c;
    await page.goto(QA_URL);
    await wait(page, 1200);
    const b = await blank(page);
    check(!b, `localStorage ${name}: page renders`);
    await shot('title', false);
    if (!b) {
      if (await has(page, '[data-ui="title-new"]')) await page.click('[data-ui="title-new"]');
      if (await has(page, '[data-ui="title-start"]')) {
        await page.click('[data-ui="title-start"]');
        await wait(page, 900);
        await clearOverlays(page);
        const s = await S(page).catch(() => null);
        check(s?.mode === 'hub', `localStorage ${name}: new game reaches the hub`);
        await dialIn(page, 'fridge').catch((e) => c.errors.push(`dial-in failed: ${e.message.slice(0, 100)}`));
        const s2 = await S(page).catch(() => null);
        check(s2?.run === 'fridge', `localStorage ${name}: dial-in works`);
        await shot('run', false);
      }
    }
    log(`storage ${name}: errors ${c.errors.length}`);
    await finish(c);
  }
}

// ------------------------------------------------------------------ late audio unlock + reduced motion
if (want('motion')) {
  const c = await open('motion', { reducedMotion: 'reduce' });
  const { page, check, shot, log } = c;
  await page.goto(QA_URL);
  await wait(page, 4000); // no input for a while: audio still locked
  await freshGame(page, 'qa_rm');
  await clearOverlays(page);
  check(await page.evaluate(() => document.documentElement.className + ' ' + document.body.className).then((x) => /reduce/.test(x)), 'reduced-motion class applied');
  // a meta scene in reduced motion: the fake GAME OVER (state jump), buttons come quickly, credits page instead of scroll
  await page.evaluate(() => window.__engine.dispatch({ type: 'debug/set', patch: { cinematic: { id: 'deadmans.gameOver' } } }));
  await wait(page, 800);
  check(await has(page, '.cwm-gameover .cwm-btn'), 'reduced motion: GAME OVER buttons up at once');
  await shot('gameover-reduced', false);
  await page.getByText('[ CREDITS ]').click();
  await wait(page, 500);
  await finish(c);
}

// ------------------------------------------------------------------ keyboard only
if (want('keys')) {
  const c = await open('keys');
  const { page, check, shot, log } = c;
  await page.goto(QA_URL);
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cw.')) localStorage.removeItem(k); localStorage.setItem('cw.ui.settings', JSON.stringify({ tutorials: false })); });
  await page.reload();
  await wait(page, 900);
  // title: the handle field has focus or is reachable by Tab; type and Enter
  await page.keyboard.press('Tab');
  await page.keyboard.type('kbd');
  await page.keyboard.press('Enter');
  await wait(page, 1000);
  let s = await S(page);
  if (s.mode !== 'hub') { await page.focus('[data-ui="title-handle"]'); await page.keyboard.press('Enter'); await wait(page, 900); s = await S(page); }
  check(s.mode === 'hub', 'keyboard: new game from the title');
  // dialogue by keys
  for (let i = 0; i < 20 && (await S(page)).dialogue; i++) { await page.keyboard.press('Enter'); await wait(page, 150); await page.keyboard.press('1'); await wait(page, 200); }
  check(!(await S(page)).dialogue, 'keyboard: intro dialogue finished with Enter / 1');
  for (const k of ['j', 'i', 'd', 'b', 'm', 'w', 'f', 'r', 's', 'n']) {
    await page.keyboard.press(k);
    await wait(page, 200);
    for (let i = 0; i < 10 && (await S(page)).dialogue; i++) { await page.keyboard.press('Enter'); await wait(page, 120); await page.keyboard.press('1'); await wait(page, 150); }
  }
  const tabNow = await page.evaluate(() => document.querySelector('.rail-btn.on, .rail-btn[aria-current="page"], .rail-btn.active')?.getAttribute('data-ui'));
  log('active rail after n:', tabNow);
  // select fridge and dial in by keyboard: Tab to the jack-in button and press Enter
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await page.evaluate(() => document.activeElement?.getAttribute('data-ui') === 'jack-in');
  }
  check(found, 'keyboard: Tab reaches the Dial in button');
  await page.keyboard.press('Enter');
  await wait(page, 1200);
  await page.keyboard.press('Escape');
  await wait(page, 200);
  s = await S(page);
  check(s.run === 'fridge', `keyboard: dialed in (${s.run})`);
  // run: Enter does the first available action; fight with digits, Tab, Space
  let fights = 0;
  for (let step = 0; step < 120; step++) {
    s = await S(page);
    if (s.dialogue) { await page.keyboard.press('Enter'); await wait(page, 120); await page.keyboard.press('1'); await wait(page, 150); continue; }
    if (await has(page, '[data-ui="card"]')) { await page.keyboard.press('Enter'); await wait(page, 200); if (await has(page, '[data-ui="card"]')) await page.keyboard.press('Escape'); await wait(page, 200); continue; }
    if (s.combat) {
      if (!fights) { fights++; await shot('kbd-fight', false); }
      await fightTurn(page, { keys: true });
      continue;
    }
    if (s.mode !== 'run') break;
    // move with arrows to a node with an action, then Enter
    await page.keyboard.press('ArrowRight');
    await wait(page, 120);
    await page.keyboard.press('Enter');
    await wait(page, 300);
    if (step > 60) { await page.keyboard.press('h'); await wait(page, 500); }
  }
  s = await S(page);
  log('keyboard run ended: mode', s.mode, 'fights', fights);
  check(fights > 0, 'keyboard: fought at least one fight by keys');
  const owned = await page.evaluate(() => window.__engine.state.world.systems.fridge?.owned);
  log('fridge owned after keyboard run:', owned);
  await shot('kbd-end', false);
  await finish(c);
}

// ------------------------------------------------------------------ phone touch combat
if (want('touch')) {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true });
  await ctx.close();
  await browser.close();
  const c = await open('touch', { viewport: PHONE });
  const { page, check, shot, log } = c;
  await freshGame(page, 'qa_touch');
  await clearOverlays(page);
  await lateGame(page, { flags: { act1_done: true, act2_started: true, act: 2 }, hosts: 6 });
  await clearOverlays(page);
  await arena(page, ['ice.sentry', 'ice.cipher']);
  await dialIn(page, 'wok');
  await clearOverlays(page);
  const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
  await clickNode(page, gw);
  await nodeAction(page, 'breach');
  await wait(page, 400);
  await clearOverlays(page);
  // scroll check: can every program button and End Turn be reached?
  const vis = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[data-ui^="program-prog"], [data-ui="end-turn"], [data-ui^="ice-"]')) {
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      out.push({ ui: el.getAttribute('data-ui'), hit: !!top && (el === top || el.contains(top)) });
    }
    return out;
  });
  const blocked = vis.filter((v) => !v.hit).map((v) => v.ui);
  check(!blocked.length, `phone: every combat control can be hit after scrolling (blocked: ${blocked.join(', ')})`);
  await shot('phone-fight', false);
  for (let i = 0; i < 40 && (await S(page)).combat; i++) { await clearOverlays(page); await fightTurn(page); }
  if ((await S(page)).combat) {
    await page.screenshot({ path: 'qa-shots/touch-stuck-390.png' });
    log('stuck fight', JSON.stringify(await combatInfo(page)).slice(0, 300), await page.evaluate(() => document.querySelector('[data-ui="ice-inspector"]')?.className));
  }
  check(!(await S(page)).combat, 'phone: fight finished with taps');
  await finish(c);
}
