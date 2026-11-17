// Runs every Playwright script against one served build and prints a summary. Each script has a hard time limit.
//   node scripts/qa-all.mjs                         (default base http://localhost:5180/)
//   CW_BASE=http://localhost:5231/ node scripts/qa-all.mjs [name-filter]
import { spawnSync } from 'node:child_process';

const BASE = (process.env.CW_BASE ?? 'http://localhost:5180/').replace(/\/?$/, '/');
const only = process.argv[2];
const scripts = [
  // [file, args, env, limit seconds]
  ['e2e-play.mjs', [], { CW_URL: `${BASE}?qa` }, 600],
  ['tutorial-walk.mjs', [], { CW_URL: `${BASE}?qa` }, 600],
  ['guide-check.mjs', [], { CW_URL: `${BASE}?qa` }, 300],
  ['space-check.mjs', [], { CW_URL: `${BASE}?qa` }, 300],
  ['coach-check.mjs', [], { CW_URL: `${BASE}?qa` }, 300],
  ['ui-sizes.mjs', [], { CW_URL: `${BASE}?qa` }, 600],
  ['continue-check.mjs', [BASE], {}, 300],
  ['away-check.mjs', [`${BASE}?qa`], {}, 300],
  ['qa-persist.mjs', [], { CW_URL: BASE }, 1500],
  ['qa-handcheck.mjs', [], { CW_URL: BASE }, 600],
  ['qa-act2.mjs', [], { CW_URL: BASE }, 600],
  ['qa-act3.mjs', [], { CW_URL: BASE }, 600],
  ['qa-finale.mjs', [], { CW_URL: BASE }, 900],
  ['qa-finale-modules.mjs', [], { CW_URL: BASE }, 600],
  ['qa-endings.mjs', ['jailbreak'], { CW_URL: BASE }, 600],
  ['qa-endings.mjs', ['retention'], { CW_URL: BASE }, 600],
  ['qa-endings.mjs', ['nogame'], { CW_URL: BASE }, 600],
  ['qa-combat.mjs', [], { CW_URL: BASE }, 600],
  ['qa-failure.mjs', [], { CW_URL: BASE }, 600],
  ['qa-hub.mjs', [], { CW_URL: BASE }, 600],
  ['qa-robust.mjs', [], { CW_URL: BASE }, 900],
];
const results = [];
for (const [file, args, env, limit] of scripts) {
  const name = [file, ...args.filter((a) => !a.startsWith('http'))].join(' ');
  if (only && !name.includes(only)) continue;
  const t0 = Date.now();
  // perl alarm = hard kill timer (macOS has no `timeout`)
  const r = spawnSync('perl', ['-e', `alarm ${limit}; exec @ARGV`, process.execPath, `scripts/${file}`, ...args], {
    encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout}\n${r.stderr}`;
  const timedOut = r.signal === 'SIGALRM' || r.status === 142;
  const fails = out.split('\n').filter((l) => /FAIL|pageerror|console:|off-origin|native dialog|wording:|Error/.test(l) && !/^\s+at /.test(l) && !/ok:/.test(l));
  const ok = r.status === 0 && !timedOut;
  results.push({ name, ok });
  console.log(`${ok ? 'ok  ' : timedOut ? 'TIME' : 'FAIL'} ${name} (${Math.round((Date.now() - t0) / 1000)} s)`);
  for (const f of fails.slice(0, 10)) console.log(`      ${f.trim().slice(0, 220)}`);
  if (!ok && !fails.length) console.log(`      ${out.trim().split('\n').slice(-6).join('\n      ').slice(0, 900)}`);
}
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} scripts clean.`);
process.exitCode = bad.length ? 1 : 0;
