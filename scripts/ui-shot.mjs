// Screenshot one URL: node scripts/ui-shot.mjs <url> <out.png> [w] [h]
import { launch } from './pw-browser.mjs';
const url = process.argv[2] ?? 'http://localhost:5199/';
const out = process.argv[3] ?? '/tmp/shot.png';
const w = Number(process.argv[4] ?? 1280), h = Number(process.argv[5] ?? 720);
const b = await launch();
const p = await b.newPage({ viewport: { width: w, height: h } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await p.goto(url);
await p.waitForTimeout(1500);
await p.screenshot({ path: out });
console.log(errs.join('\n') || 'no console errors');
await b.close();
