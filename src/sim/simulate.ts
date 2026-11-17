// Headless campaign simulation: drives a Bot through whatever content exists and collects balance stats.
import { createEngine, select, type Content, type Engine, type GameEvent, type Id } from '../engine/index.ts';
import { Bot, StuckError, type BotConfig } from './policy.ts';

export type Goal = 'owned-all' | 'ending' | `flag:${string}`;

export interface SimOptions {
  games: number;
  seed: number;
  goal: Goal;
  maxRuns: number;
  maxSteps: number;
  verbose: boolean;
  bot?: Partial<BotConfig>;
}

export const DEFAULT_SIM: SimOptions = { games: 20, seed: 1, goal: 'owned-all', maxRuns: 150, maxSteps: 200_000, verbose: false };

export interface FightStat { won: number; lost: number; fled: number; turns: number }

export interface GameResult {
  seed: number;
  reachedGoal: boolean;
  stuck: string | null;
  runs: number;
  cycles: number;
  steps: number;
  runsBySystem: Record<Id, number>;
  runsToOwn: Record<Id, number>;
  fights: Record<string, FightStat>;
  failures: { dumped: number; traced: number; flatlined: number; raidsWon: number; raidsLost: number; hostsBurned: number };
  creditsCurve: number[]; // credits + coin value after each run
  finalRep: number;
  finalCredits: number;
  control: number;
  ending: string | null;
  hardware: Record<string, number>;
}

/** Systems that must all be owned for the 'owned-all' goal. */
export function goalSystems(c: Content): Id[] {
  return Object.values(c.systems)
    .filter((s) => s.capturable !== false && !s.procedural && s.id !== c.setup.localhost)
    .map((s) => s.id);
}

function goalReached(e: Engine, goal: Goal): boolean {
  const s = e.state;
  if (goal === 'ending') return s.ending !== null;
  if (goal.startsWith('flag:')) return !!s.story.flags[goal.slice(5)];
  return goalSystems(e.content).every((id) => s.world.systems[id]?.owned);
}

export function simulateGame(content: Content, seed: number, o: SimOptions): GameResult {
  const e = createEngine({ content, newGame: { seed, handle: 'simbot' }, transactional: false });
  const bot = new Bot(o.bot);
  const res: GameResult = {
    seed, reachedGoal: false, stuck: null, runs: 0, cycles: 0, steps: 0, runsBySystem: {}, runsToOwn: {}, fights: {},
    failures: { dumped: 0, traced: 0, flatlined: 0, raidsWon: 0, raidsLost: 0, hostsBurned: 0 },
    creditsCurve: [], finalRep: 1, finalCredits: 0, control: 0, ending: null, hardware: {},
  };
  let fightKey: string | null = null;
  let fightStart = 0;
  let rejects = 0;
  const recent: string[] = [];
  const onEvents = (ev: GameEvent[]) => {
    for (const x of ev) {
      if (x.type === 'combat.started') {
        fightKey = `${e.state.run?.system ?? 'home'}/${x.node ?? x.context}`;
        fightStart = e.state.combat?.turn ?? 0;
        res.fights[fightKey] ??= { won: 0, lost: 0, fled: 0, turns: 0 };
      }
      if (x.type === 'combat.turnStart' && fightKey) res.fights[fightKey].turns++;
      if (x.type === 'combat.ended' && fightKey) {
        const f = res.fights[fightKey];
        if (x.result === 'victory' || x.result === 'offer') f.won++;
        else if (x.result === 'jackedOut' || x.result === 'disengaged') f.fled++;
        else f.lost++;
        fightKey = null;
      }
      if (x.type === 'run.started') {
        res.runs++;
        res.runsBySystem[x.system] = (res.runsBySystem[x.system] ?? 0) + 1;
      }
      if (x.type === 'run.ended') {
        res.creditsCurve.push(e.state.player.credits + Math.round(e.state.player.coin * e.state.world.coinPrice));
        if (x.reason !== 'jackout' && x.reason !== 'scripted') bot.mem.failedTargets[x.system] = (bot.mem.failedTargets[x.system] ?? 0) + 1;
      }
      if (x.type === 'system.owned' && res.runsToOwn[x.system] === undefined) res.runsToOwn[x.system] = res.runsBySystem[x.system] ?? 0;
      if (x.type === 'player.dumped') res.failures.dumped++;
      if (x.type === 'player.traced') res.failures.traced++;
      if (x.type === 'player.flatlined') res.failures.flatlined++;
      if (x.type === 'raid.ended') x.won ? res.failures.raidsWon++ : res.failures.raidsLost++;
      if (x.type === 'host.burned') res.failures.hostsBurned++;
    }
  };
  void fightStart;
  try {
    for (res.steps = 0; res.steps < o.maxSteps; res.steps++) {
      if (goalReached(e, o.goal)) { res.reachedGoal = true; break; }
      if (e.state.mode === 'ending' && o.goal !== 'ending') break;
      if (res.runs > o.maxRuns) throw new StuckError(`goal not reached after ${o.maxRuns} runs`);
      if (e.state.mode === 'flatlined') {
        if (!e.loadCheckpoint()) throw new StuckError('flatlined with no checkpoint');
        continue;
      }
      const a = bot.decide(e);
      if (!a) throw new StuckError('bot has nothing to do in the hub (no reachable target)', hubContext(e));
      const ev = e.dispatch(a);
      onEvents(ev);
      recent.push(a.type + ('node' in a ? `:${a.node}` : 'system' in a ? `:${a.system}` : 'program' in a ? `:${a.program}` : ''));
      if (recent.length > 25) recent.shift();
      const rej = ev.find((x) => x.type === 'action.rejected');
      if (rej && rej.type === 'action.rejected') {
        if (++rejects > 20) throw new StuckError(`repeated rejections: ${rej.action}: ${rej.reason}`, { recent });
      } else rejects = 0;
      if (o.verbose) for (const x of ev) if (x.type === 'log' || x.type === 'message.received') console.log(`  [${seed}] ${x.type === 'log' ? x.text : `msg from ${x.from}`}`);
    }
    if (!res.reachedGoal && !res.stuck && res.steps >= o.maxSteps) throw new StuckError(`step limit ${o.maxSteps}`, { recent });
  } catch (err) {
    if (!(err instanceof StuckError)) throw err;
    res.stuck = `${err.message}${Object.keys(err.context).length ? ` ${JSON.stringify(err.context)}` : ''} | last: ${recent.slice(-8).join(', ')}`;
  }
  const s = e.state;
  res.cycles = s.cycle;
  res.finalRep = s.player.rep;
  res.finalCredits = s.player.credits;
  res.control = select.controlPct(e);
  res.ending = s.ending;
  res.hardware = { ...s.player.hardware };
  return res;
}

function hubContext(e: Engine): Record<string, unknown> {
  const s = e.state;
  return {
    credits: s.player.credits,
    rep: s.player.rep,
    heat: Math.round(s.player.heat),
    hardware: s.player.hardware,
    addresses: select.addressBook(e).map((a) => `${a.system}${a.owned ? '(owned)' : ''}${a.jackIn ? `[${a.jackIn}]` : ''}${a.hardened ? '[hardened]' : ''}`),
  };
}

export interface SimSummary {
  games: number;
  reached: number;
  stuck: { seed: number; why: string }[];
  meanRuns: number;
  meanCycles: number;
  runsBySystem: Record<Id, number>;
  runsToOwn: Record<Id, number>;
  fights: Record<string, FightStat & { winRate: number; meanTurns: number }>;
  failures: GameResult['failures'];
  creditsCurve: number[];
  finalRep: Record<number, number>;
  meanControl: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function summarize(results: GameResult[]): SimSummary {
  const sysIds = new Set(results.flatMap((r) => Object.keys(r.runsBySystem)));
  const runsBySystem: Record<Id, number> = {};
  for (const id of sysIds) runsBySystem[id] = mean(results.map((r) => r.runsBySystem[id] ?? 0));
  const ownIds = new Set(results.flatMap((r) => Object.keys(r.runsToOwn)));
  const runsToOwn: Record<Id, number> = {};
  for (const id of ownIds) runsToOwn[id] = mean(results.filter((r) => r.runsToOwn[id] !== undefined).map((r) => r.runsToOwn[id]));
  const fights: SimSummary['fights'] = {};
  for (const r of results) {
    for (const [k, f] of Object.entries(r.fights)) {
      const t = (fights[k] ??= { won: 0, lost: 0, fled: 0, turns: 0, winRate: 0, meanTurns: 0 });
      t.won += f.won; t.lost += f.lost; t.fled += f.fled; t.turns += f.turns;
    }
  }
  for (const f of Object.values(fights)) {
    const n = f.won + f.lost + f.fled;
    f.winRate = n ? f.won / n : 0;
    f.meanTurns = n ? f.turns / n : 0;
  }
  const failures = { dumped: 0, traced: 0, flatlined: 0, raidsWon: 0, raidsLost: 0, hostsBurned: 0 };
  for (const r of results) for (const k of Object.keys(failures) as (keyof typeof failures)[]) failures[k] += r.failures[k];
  const maxLen = Math.max(0, ...results.map((r) => r.creditsCurve.length));
  const creditsCurve = Array.from({ length: maxLen }, (_, i) => Math.round(mean(results.filter((r) => r.creditsCurve.length > i).map((r) => r.creditsCurve[i]))));
  const finalRep: Record<number, number> = {};
  for (const r of results) finalRep[r.finalRep] = (finalRep[r.finalRep] ?? 0) + 1;
  return {
    games: results.length,
    reached: results.filter((r) => r.reachedGoal).length,
    stuck: results.filter((r) => r.stuck).map((r) => ({ seed: r.seed, why: r.stuck! })),
    meanRuns: mean(results.map((r) => r.runs)),
    meanCycles: mean(results.map((r) => r.cycles)),
    runsBySystem,
    runsToOwn,
    fights,
    failures,
    creditsCurve,
    finalRep,
    meanControl: mean(results.map((r) => r.control)),
  };
}

export function simulate(content: Content, opts: Partial<SimOptions> = {}): { results: GameResult[]; summary: SimSummary } {
  const o = { ...DEFAULT_SIM, ...opts };
  const results: GameResult[] = [];
  for (let g = 0; g < o.games; g++) results.push(simulateGame(content, o.seed + g, o));
  return { results, summary: summarize(results) };
}
