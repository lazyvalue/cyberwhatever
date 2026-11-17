// Persistence checks with real page loads and real localStorage. Every case runs twice: fresh, and with the
// player "away" for 3 hours (old cw.meta.lastSeen set before every boot, so the time-away report fires).
// A watcher records every write of `cw.save`; no write may lower the cycle or change the handle unless the
// player chose New game.
//   CW_URL=http://localhost:5180/ node scripts/qa-persist.mjs [case ...]
import { BASE, QA_URL, OUT, has, wait, S, clearOverlays, dialIn, clickNode, nodeAction, arena, endTurn, patch } from './qa-lib.mjs';
import { launch } from './pw-browser.mjs';

const which = process.argv.slice(2);
const errors = [];
const notes = [];
const browser = await launch();

const WATCH = () => {
  try {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (this === window.localStorage && k === 'cw.save') {
        try {
          const s = JSON.parse(v);
          const w = JSON.parse(sessionStorage.getItem('qa.writes') || '[]');
          w.push({ cycle: s.cycle, handle: s.player?.handle, credits: s.player?.credits, t: Date.now() });
          sessionStorage.setItem('qa.writes', JSON.stringify(w.slice(-200)));
        } catch { /* not JSON */ }
      }
      return orig.call(this, k, v);
    };
  } catch { /* about:blank */ }
};
const AWAY = () => { try { localStorage.setItem('cw.meta.lastSeen', String(Date.now() - 3 * 3600 * 1000)); } catch { /* about:blank */ } };

async function ctxFor(away) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(WATCH);
  if (away) await context.addInitScript(AWAY);
  return context;
}

function harness(page, name) {
  page.on('pageerror', (e) => errors.push(`${name}: pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: console: ${m.text()}`); });
  page.on('dialog', (d) => { errors.push(`${name}: native dialog`); d.dismiss(); });
  return (ok, msg) => { (ok ? notes : errors).push(`${ok ? 'ok' : 'FAIL'}: ${name}: ${msg}`); if (!ok) console.log(`[persist] FAIL ${name}: ${msg}`); };
}

const stored = (page, key = 'cw.save') => page.evaluate((k) => { const v = localStorage.getItem(k); if (!v) return null; const s = JSON.parse(v); return { cycle: s.cycle, handle: s.player.handle, credits: s.player.credits, mode: s.mode, raw: v.length }; }, key);
const writes = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('qa.writes') || '[]'));

/** A real save: new game through the title, a few hub/run actions so cycle > 0, back in the hub. */
async function makeSave(page) {
  await page.goto(QA_URL);
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('cw.')) localStorage.removeItem(k); localStorage.setItem('cw.ui.settings', JSON.stringify({ tutorials: false })); sessionStorage.clear(); });
  await page.reload();
  await wait(page, 700);
  await page.fill('[data-ui="title-handle"]', 'keeper');
  await page.click('[data-ui="title-start"]');
  await wait(page, 800);
  await clearOverlays(page);
  await page.evaluate(() => window.__engine.dispatch({ type: 'debug/set', patch: { player: { credits: 4321 } } }));
  await dialIn(page, 'fridge');
  await clearOverlays(page);
  const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
  await clickNode(page, gw);
  await nodeAction(page, 'probe');
  await page.click('[data-ui="jack-out"]');
  await wait(page, 700);
  await clearOverlays(page);
  const s = await stored(page);
  await page.evaluate(() => sessionStorage.setItem('qa.writes', '[]'));
  return s;
}

/** Reload the page (the away init script runs again), wait for the time-away timer, return the title-state save. */
async function reload(page) {
  await page.goto('about:blank');
  await page.goto(QA_URL);
  await wait(page, 2500);
}
async function cont(page) {
  if (!(await has(page, '[data-ui="title-continue"]'))) return false;
  await page.click('[data-ui="title-continue"]');
  await wait(page, 1200);
  return true;
}
function noRegress(check, ws, base, label) {
  const bad = ws.filter((w) => w.cycle < base.cycle || w.handle !== base.handle);
  check(!bad.length, `${label}: no cw.save write lowered the cycle or changed the handle (${ws.length} writes${bad.length ? `; bad: ${JSON.stringify(bad[0])}` : ''})`);
}

const cases = {
  async run(page, check) {
    const base = await makeSave(page);
    const ck = await stored(page, 'cw.checkpoint');
    await dialIn(page, 'fridge');
    await clearOverlays(page);
    const ck2 = await stored(page, 'cw.checkpoint');
    await reload(page);
    check(JSON.stringify(await stored(page)) === JSON.stringify(base), 'title: cw.save unchanged after a reload mid-run');
    check(await cont(page), 'Continue offered');
    const s = await S(page);
    check(s.mode === 'hub', `Continue → hub (${s.mode})`);
    check((await page.evaluate(() => window.__engine.state.cycle)) === base.cycle, 'the hub state before dial-in returns');
    check(JSON.stringify(await stored(page, 'cw.checkpoint')) === JSON.stringify(ck2) && ck2?.cycle === base.cycle, `checkpoint intact (cycle ${ck2?.cycle}, was ${ck?.cycle})`);
    noRegress(check, await writes(page), base, 'run');
  },
  async fight(page, check) {
    const base = await makeSave(page);
    await arena(page, ['ice.sentry'], { system: 'fridge' });
    await dialIn(page, 'fridge');
    await clearOverlays(page);
    const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
    await clickNode(page, gw);
    await nodeAction(page, 'breach');
    await wait(page, 400);
    await clearOverlays(page);
    check(!!(await S(page)).combat, 'in a fight');
    await endTurn(page);
    await reload(page);
    check(JSON.stringify(await stored(page)) === JSON.stringify(base), 'title: cw.save unchanged after a reload mid-fight');
    check(await cont(page), 'Continue offered');
    const s = await S(page);
    check(s.mode === 'hub' && !s.combat && (await page.evaluate(() => window.__engine.state.cycle)) === base.cycle, `Continue → the hub before dial-in (${s.mode})`);
    noRegress(check, await writes(page), base, 'fight');
  },
  async failures(page, check) {
    for (const kind of ['dumped', 'traced', 'flatlined']) {
      const base = await makeSave(page);
      await page.evaluate(() => window.__engine.dispatch({ type: 'debug/set', patch: { player: { heat: 0 } } }));
      await arena(page, [kind === 'flatlined' ? { ice: 'ice.flatliner', level: 4 } : { ice: 'ice.killer', level: 8 }], { system: 'fridge' });
      await dialIn(page, 'fridge');
      await clearOverlays(page);
      const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
      if (kind === 'traced') {
        await patch(page, { run: { trace: 98 } });
        await clickNode(page, gw);
        await nodeAction(page, 'probe');
      } else {
        await clickNode(page, gw);
        await nodeAction(page, 'breach');
        await wait(page, 400);
        await clearOverlays(page);
        await patch(page, kind === 'dumped' ? { player: { integrity: 2 } } : { player: { neural: 1 } });
        for (let i = 0; i < 8 && !(await has(page, `[data-ui="failure-${kind}"]`)); i++) { await endTurn(page); await clearOverlays(page, { maxLoops: 0 }); }
      }
      await wait(page, 1200);
      check(await has(page, `[data-ui="failure-${kind}"]`), `${kind} overlay open`);
      const atFail = await stored(page);
      await reload(page);
      const afterBoot = await stored(page);
      check(JSON.stringify(afterBoot) === JSON.stringify(atFail), `${kind}: title boot does not touch cw.save`);
      check(await cont(page), `${kind}: Continue offered`);
      const cyc = await page.evaluate(() => window.__engine.state.cycle);
      check(cyc >= base.cycle && (await S(page)).mode === 'hub', `${kind}: Continue → hub at cycle ${cyc} (save before dial-in: ${base.cycle})`);
      noRegress(check, await writes(page), base, kind);
    }
  },
  async flatlineReload(page, check) {
    const base = await makeSave(page);
    await arena(page, [{ ice: 'ice.flatliner', level: 4 }], { system: 'fridge' });
    await dialIn(page, 'fridge');
    await clearOverlays(page);
    const ck = await stored(page, 'cw.checkpoint');
    const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
    await clickNode(page, gw);
    await nodeAction(page, 'breach');
    await wait(page, 400);
    await clearOverlays(page);
    await patch(page, { player: { neural: 1 } });
    for (let i = 0; i < 8 && !(await has(page, '[data-ui="failure-flatlined"]')); i++) { await endTurn(page); await clearOverlays(page, { maxLoops: 0 }); }
    await wait(page, 1000);
    await page.click('[data-ui="reload-checkpoint"]');
    await wait(page, 1000);
    const st = await page.evaluate(() => ({ cycle: window.__engine.state.cycle, credits: window.__engine.state.player.credits, handle: window.__engine.state.player.handle, mode: window.__engine.state.mode }));
    const sv = await stored(page);
    check(st.mode === 'hub' && st.cycle === ck.cycle && st.credits === ck.credits, `state = dial-in state (cycle ${st.cycle}/${ck.cycle}, credits ${st.credits}/${ck.credits})`);
    check(sv.cycle === ck.cycle && sv.credits === ck.credits && sv.handle === 'keeper', `cw.save = dial-in state (cycle ${sv.cycle})`);
    noRegress(check, await writes(page), base, 'flatlineReload');
  },
  async settingsTitle(page, check) {
    const base = await makeSave(page);
    const raw0 = await page.evaluate(() => localStorage.getItem('cw.save'));
    await reload(page);
    await page.click('[data-ui="title-settings"]');
    await wait(page, 400);
    for (const sel of ['[data-ui="motion-reduced"]', '[data-ui="motion-auto"]']) if (await has(page, sel)) { await page.click(sel); await wait(page, 150); }
    await page.keyboard.press('Escape');
    await wait(page, 500);
    check((await page.evaluate(() => localStorage.getItem('cw.save'))) === raw0, 'Settings on the title: cw.save byte-identical');
    check(await cont(page), 'Continue still offered');
    check((await page.evaluate(() => window.__engine.state.cycle)) === base.cycle, 'Continue loads the real save');
  },
  async consoleTitle(page, check) {
    const base = await makeSave(page);
    const raw0 = await page.evaluate(() => localStorage.getItem('cw.save'));
    await reload(page);
    await page.keyboard.press('Backquote');
    await wait(page, 300);
    const opened = await has(page, '#cwm-input');
    notes.push(`consoleTitle: backtick opens the console on the title: ${opened}`);
    if (opened) {
      for (const cmd of ['help', 'whoami', 'ps', 'ls storage', 'cat storage cw.save', 'sudo nope', 'kill chairman', 'rm -rf /', 'title', 'tail console']) {
        await page.fill('#cwm-input', cmd);
        await page.keyboard.press('Enter');
        await wait(page, 200);
      }
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => { try { cw.help(); cw.whoami(); cw.ls(); cw.cat('storage', 'cw.save'); cw.sudo('x'); cw.kill('chairman'); cw.free('patch'); cw.accept('offer'); cw.rm('-rf', '/'); cw.give = 1; cw.cheat?.(); } catch { /* fine */ } });
    await wait(page, 800);
    check((await page.evaluate(() => localStorage.getItem('cw.save'))) === raw0, 'console + cw.* on the title: cw.save byte-identical');
    check(await cont(page), 'Continue still offered');
    check((await page.evaluate(() => window.__engine.state.cycle)) === base.cycle, 'Continue loads the real save');
    noRegress(check, await writes(page), base, 'consoleTitle');
  },
  async twoTabs(page, check, context) {
    const base = await makeSave(page);
    const b = await context.newPage();
    harness(b, 'twoTabs/B');
    await b.goto(QA_URL);
    await wait(b, 1500);
    await cont(b);
    await reload(page);
    await cont(page);
    await clearOverlays(page);
    await clearOverlays(b);
    // tab A makes progress
    await dialIn(page, 'fridge');
    await clearOverlays(page);
    const gw = await page.evaluate(() => window.__cwSelect.mapView(window.__engine).nodes.find((n) => n.type === 'gateway').id);
    await clickNode(page, gw);
    await nodeAction(page, 'probe');
    await page.click('[data-ui="jack-out"]');
    await wait(page, 700);
    const afterA = await stored(page);
    check(afterA.cycle > base.cycle, `tab A progressed (cycle ${base.cycle} → ${afterA.cycle})`);
    // tab B, still on the old state, does one hub action
    await clearOverlays(b);
    await b.click('[data-ui="hub-botnet"]').catch(() => {});
    await b.evaluate(() => window.__engine.dispatch({ type: 'message/read', id: window.__engine.state.messages[0]?.id }));
    await b.click('[data-ui="hub-deck"]').catch(() => {});
    const unload = b.locator('[data-ui^="unload-"]').first();
    if (await unload.count()) await unload.click();
    await wait(b, 600);
    const afterB = await stored(page);
    check(afterB.cycle >= afterA.cycle, `tab B did not overwrite tab A's progress (stored cycle ${afterB.cycle}, A had ${afterA.cycle})`);
    await b.close();
  },
};

for (const away of [false, true]) {
  for (const [name, fn] of Object.entries(cases)) {
    if (which.length && !which.includes(name)) continue;
    const label = `${name}${away ? '+3h' : ''}`;
    const context = await ctxFor(away);
    const page = await context.newPage();
    const check = harness(page, label);
    try {
      await fn(page, check, context);
    } catch (e) {
      errors.push(`${label}: script error: ${e.message.split('\n')[0]}`);
      await page.screenshot({ path: `${OUT}/persist-${label}-error.png` }).catch(() => {});
    }
    await context.close();
    console.log(`[persist] ${label} done`);
  }
}
await browser.close();
for (const n of notes) console.log(`[persist] ${n}`);
if (errors.length) {
  console.error(`[persist] ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
  process.exitCode = 1;
} else console.log('[persist] clean');
void BASE;
