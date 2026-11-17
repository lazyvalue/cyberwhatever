// CLI: `npm run sim -- --games=20 --seed=1 --goal=owned-all --max-runs=150 --policy=smart|lazy --json --verbose`
// Exits 1 if any game got stuck or missed the goal.
import { content } from '../content/index.ts';
import { validateContent } from '../engine/index.ts';
import { simulate, DEFAULT_SIM, goalSystems, type Goal, type SimOptions } from './simulate.ts';

function args(): Partial<SimOptions> & { json: boolean } {
  const out: Partial<SimOptions> & { json: boolean } = { json: false };
  for (const a of process.argv.slice(2)) {
    const [k, v] = a.replace(/^--/, '').split('=');
    if (k === 'games') out.games = Number(v);
    else if (k === 'seed') out.seed = Number(v);
    else if (k === 'goal') out.goal = v as Goal;
    else if (k === 'max-runs') out.maxRuns = Number(v);
    else if (k === 'max-steps') out.maxSteps = Number(v);
    else if (k === 'verbose') out.verbose = true;
    else if (k === 'json') out.json = true;
    else if (k === 'policy') {
      if (v !== 'smart' && v !== 'lazy') throw new Error('--policy must be smart or lazy');
      out.bot = { ...(out.bot ?? {}), combatStyle: v };
    }
    else if (k === 'help') {
      console.log('npm run sim -- [--games=N] [--seed=S] [--goal=owned-all|ending|flag:<name>] [--max-runs=N] [--max-steps=N] [--policy=smart|lazy] [--json] [--verbose]');
      process.exit(0);
    } else throw new Error(`unknown arg ${a}`);
  }
  return out;
}

const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(5);
const pad = (s: string, n: number) => s.padEnd(n);

function main(): void {
  const a = args();
  const errs = validateContent(content);
  if (errs.length) {
    console.error(`content validation failed (${errs.length}):\n  ${errs.join('\n  ')}`);
    process.exit(1);
  }
  const o = { ...DEFAULT_SIM, ...a };
  const t0 = performance.now();
  const { results, summary } = simulate(content, o);
  const ms = Math.round(performance.now() - t0);
  if (a.json) {
    console.log(JSON.stringify({ options: o, summary, results }, null, 2));
  } else {
    console.log(`CYBER WHATEVER sim — ${summary.games} games, seeds ${o.seed}..${o.seed + o.games - 1}, goal=${o.goal}${o.goal === 'owned-all' ? ` [${goalSystems(content).join(', ')}]` : ''}, policy=${o.bot?.combatStyle ?? 'smart'} (${ms} ms)`);
    console.log(`goal reached: ${summary.reached}/${summary.games}   mean runs: ${summary.meanRuns.toFixed(1)}   mean cycles: ${Math.round(summary.meanCycles)}   mean control: ${summary.meanControl.toFixed(1)}%`);
    console.log('\nruns per system (mean)            runs to own (mean)');
    for (const [id, n] of Object.entries(summary.runsBySystem).filter(([id]) => !id.startsWith('iot-')).sort()) {
      console.log(`  ${pad(id, 30)} ${n.toFixed(1).padStart(5)}   ${summary.runsToOwn[id] !== undefined ? summary.runsToOwn[id].toFixed(1) : '-'}`);
    }
    const iot = Object.entries(summary.runsBySystem).filter(([id]) => id.startsWith('iot-')).reduce((x, [, n]) => x + n, 0);
    if (iot) console.log(`  ${pad('(procedural IoT, all)', 30)} ${iot.toFixed(1).padStart(5)}`);
    console.log('\nfights (system/node)               won  lost  fled   win%  turns');
    const fights = Object.entries(summary.fights).filter(([k]) => !k.startsWith('iot-'));
    const iotF = Object.entries(summary.fights).filter(([k]) => k.startsWith('iot-'));
    for (const [k, f] of fights.sort()) {
      console.log(`  ${pad(k, 30)} ${String(f.won).padStart(5)} ${String(f.lost).padStart(5)} ${String(f.fled).padStart(5)}  ${pct(f.winRate)}  ${f.meanTurns.toFixed(1).padStart(5)}`);
    }
    if (iotF.length) {
      const t = iotF.reduce((x, [, f]) => ({ won: x.won + f.won, lost: x.lost + f.lost, fled: x.fled + f.fled }), { won: 0, lost: 0, fled: 0 });
      const n = t.won + t.lost + t.fled;
      console.log(`  ${pad('(procedural IoT, all)', 30)} ${String(t.won).padStart(5)} ${String(t.lost).padStart(5)} ${String(t.fled).padStart(5)}  ${pct(n ? t.won / n : 0)}`);
    }
    const F = summary.failures;
    console.log(`\nfailures (total): dumped ${F.dumped}, traced ${F.traced}, flatlined ${F.flatlined}, raids won/lost ${F.raidsWon}/${F.raidsLost}, hosts burned ${F.hostsBurned}`);
    const curve = summary.creditsCurve;
    const step = Math.max(1, Math.ceil(curve.length / 12));
    console.log(`credits+coin after run n (mean): ${curve.map((c, i) => (i % step === 0 || i === curve.length - 1 ? `#${i + 1}:${c}` : null)).filter(Boolean).join('  ')}`);
    console.log(`final rep: ${Object.entries(summary.finalRep).map(([r, n]) => `${r}x${n}`).join(' ')}`);
  }
  if (summary.stuck.length || summary.reached < summary.games) {
    console.error(`\nSIM FAILED: ${summary.games - summary.reached} game(s) did not reach the goal.`);
    for (const s of summary.stuck.slice(0, 10)) console.error(`  seed ${s.seed}: ${s.why}`);
    process.exit(1);
  }
}

main();
