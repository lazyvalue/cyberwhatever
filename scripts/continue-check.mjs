// Checks that a started game offers Continue after a reload. node scripts/continue-check.mjs <url>
import { launch } from './pw-browser.mjs';
const url = process.argv[2] ?? 'http://localhost:5240/';
const b = await launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await p.goto(url);
await p.waitForTimeout(800);
const btns = await p.$$eval('[data-ui]', (els) => els.map((e) => e.getAttribute('data-ui')));
console.log('title data-ui:', btns.join(', '));
const start = (await p.$('[data-ui="title-start"]')) ?? (await p.$('[data-ui="title-new"]')) ?? (await p.$('.title-menu button'));
await start.click();
await p.waitForTimeout(1500);
console.log('keys after start:', await p.evaluate(() => Object.keys(localStorage).join(', ')));
await p.reload();
await p.waitForTimeout(1200);
const cont = await p.$('[data-ui="title-continue"]');
console.log('continue button after reload:', !!cont);
if (cont) { await cont.click(); await p.waitForTimeout(1000); console.log('after continue, title screen gone:', !(await p.$('.title-screen'))); }
console.log(errs.join('\n') || 'no page errors');
await b.close();
process.exit(cont ? 0 : 1);
