// Area 5: Act 2 ending in the real UI. deadmans → fake GAME OVER → fake credits → PATCH tear-through → Act 3.
// Reloads in the middle of each cinematic and checks it replays. Then keeps playing.
import {
  open, freshGame, lateGame, has, wait, S, dispatch, clearOverlays, dialIn, playRun, finish, wordingCheck, QA_URL, tab,
} from './qa-lib.mjs';

const c = await open('act2');
const { page, check, shot, log } = c;
await freshGame(page, 'qa_act2');
await clearOverlays(page);
await lateGame(page, {
  flags: { act1_done: true, act2_started: true, act: 2, icebreaker_got: true, aegis_done: true, wraith_flatlined: true, glitch_contact: true, rumour_auntie_dead: true },
  credits: 20000,
});
await clearOverlays(page);
// Auntie's offer, as the hub.entered beat opens it
await dispatch(page, { type: 'dialogue/start', dialogue: 'dlg.auntie.deadmans_offer' });
await wait(page, 300);
await shot('offer');
await clearOverlays(page, { pick: /I'm in/ });
let s = await S(page);
check(!!s.flags.deadmans_offered, 'deadmans offered through the dialogue');
const credits0 = s.credits;

await dialIn(page, 'deadmans');
await clearOverlays(page);
s = await S(page);
check(s.run === 'deadmans', 'dialed into deadmans');
await shot('deadmans-map');
// hang up must be refused
if (await has(page, '[data-ui="jack-out"]')) {
  await page.click('[data-ui="jack-out"]', { force: true });
  await wait(page, 300);
  check((await S(page)).run === 'deadmans', 'Hang up refused in deadmans');
}
let fightShot = false;
const r = await playRun(page, {
  maxSteps: 400,
  stop: (st) => !!st.cinematic,
  onFightStep: async (i) => {
    if (!fightShot && i > 6) { fightShot = true; await shot('deadmans-fight'); }
  },
});
log('run result', r, JSON.stringify(await S(page)).slice(0, 400));
await wait(page, 800);
s = await S(page);
check(s.cinematic === 'deadmans.gameOver', `fake game over cinematic pending (got ${s.cinematic})`);
await wait(page, 3300); // buttons appear after 3 s
await shot('gameover');
check(await has(page, '.cwm-gameover'), 'GAME OVER screen visible');
for (const b of await wordingCheck(page)) c.errors.push(`wording: ${b}`);

// reload mid-cinematic: it must replay
await page.goto(QA_URL);
await wait(page, 800);
if (await has(page, '[data-ui="title-continue"]')) await page.click('[data-ui="title-continue"]');
await wait(page, 3500);
check(await has(page, '.cwm-gameover'), 'GAME OVER replays after a reload');
await shot('gameover-after-reload', false);
// CONTINUE → "Thanks for playing!" → goes on to the credits
await page.getByText('[ CONTINUE ]').click();
await wait(page, 1600);
s = await S(page);
check(s.cinematic === 'deadmans.fakeCredits', `CONTINUE leads to the fake credits (got ${s.cinematic})`);
await wait(page, 3000);
await shot('credits-roll');
// reload in the credits
await page.goto(QA_URL);
await wait(page, 800);
if (await has(page, '[data-ui="title-continue"]')) await page.click('[data-ui="title-continue"]');
await wait(page, 1500);
check(await has(page, '.cwm-credits'), 'fake credits replay after a reload');
// let the roll play to the tear (26 s) to see it once, then the tear types
await wait(page, 27000);
await shot('credits-tear');
for (let i = 0; i < 40 && (await has(page, '.cwm-credits')); i++) await wait(page, 500);
check(!(await has(page, '.cwm-credits')), 'credits end by themselves');
s = await S(page);
check(s.dialogue === 'dlg.glitch.tear_through', `tear-through dialogue opens (got ${s.dialogue})`);
await wait(page, 300);
await shot('tear-through');
// reload during the dialogue
await page.goto(QA_URL);
await wait(page, 800);
if (await has(page, '[data-ui="title-continue"]')) await page.click('[data-ui="title-continue"]');
await wait(page, 800);
check(await has(page, '[data-ui="dialogue"]'), 'tear-through dialogue is back after a reload');
await clearOverlays(page, { pick: /Who are you|What now|Okay/ });
await wait(page, 400);
s = await S(page);
check(!!s.flags.act2_done, 'act2_done set');
check(Math.round(s.heat) >= 70, `heat set to 75 (got ${s.heat})`);
const ec = await page.evaluate(() => window.__engine.state.player.frozenCredits);
check(ec > 0, `credits frozen (${ec} frozen, ${s.credits} left of ${credits0})`);
await shot('act3-hub');
check(await page.locator('.cwm-corner.is-visible').count() > 0, 'meta console corner button visible in Act 3');
// keep playing: Dead Drop is the next address; dial in and hang up
await tab(page, 'net');
await shot('act3-net', false);
const known = await page.evaluate(() => Object.keys(window.__engine.state.world.addressBook));
check(known.includes('deaddrop'), 'deaddrop address added');
await dialIn(page, 'deaddrop');
await clearOverlays(page);
s = await S(page);
check(s.run === 'deaddrop', 'can dial into the Dead Drop after Act 2');
await page.click('[data-ui="jack-out"]');
await wait(page, 600);
await clearOverlays(page);
check((await S(page)).mode === 'hub', 'back in the hub');
for (const b of await wordingCheck(page)) c.errors.push(`wording: ${b}`);
await finish(c);
