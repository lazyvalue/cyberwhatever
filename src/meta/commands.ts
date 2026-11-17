// The one command handler behind both `window.cw.*` and the in-game meta console (DESIGN §11.3).
// Replies follow 05-meta §2 by phase P0–P4. Rules effects go through the engine's meta/* actions.
import type { Engine, GameEvent, MetaCommand } from '../engine/index.ts';
import { ENDINGS_LIST, rmConfirmText } from './endings.ts';
import type { FragmentLayers } from './fragments.ts';
import { FULL_TITLE, up } from './fragments.ts';
import { actOf, flag, type Phase } from './phase.ts';
import type { RealStats, Tally } from './stats.ts';
import { byteSize, EK, fmtBytes, MK, type SafeStore } from './storage.ts';

export type Source = 'console' | 'cw';

export interface CommandHost {
  engine: Engine;
  store: SafeStore;
  layers: FragmentLayers;
  tally: Tally;
  phase(): Phase;
  stats(): RealStats;
  /** A root-key fragment (0..3) was revealed through a meta route. */
  fragmentFound(index: number): void;
  /** Any cheat attempt before the finale (dispatches meta/cheatAttempt). */
  cheat(what: string): void;
  chairmanDead(): boolean;
  setTitle(text: string): void;
  saveTally(): void;
  /** `rm -rf /` confirmation is waiting for the game's name. */
  rmPending: boolean;
}

export interface CommandResult {
  ok: boolean;
  lines: string[];
  /** The console should clear itself. */
  clear?: boolean;
  /** The console should close. */
  close?: boolean;
}

const res = (ok: boolean, ...lines: string[]): CommandResult => ({ ok, lines });

const UNKNOWN = [
  "command not found: {cmd}. it's not that kind of game.",
  "command not found: {cmd}. it's exactly that kind of game. just not that command.",
  '{cmd}: no. (polite no.)',
  "{cmd}: try 'help'. it's coy, but it's honest-ish.",
];
let unknownRot = 0;

export const KNOWN_COMMANDS = [
  'help', 'whoami', 'ps', 'kill', 'sudo', 'inspect', 'ls', 'cat', 'title', 'tail', 'free', 'accept', 'rm', 'endings',
] as const;

/** Run the engine's rules side of a meta command and collect its output. */
function engineCommand(h: CommandHost, cmd: MetaCommand, arg?: string, confirm?: boolean): { ok: boolean; lines: string[]; events: GameEvent[] } {
  const a: { type: 'meta/command'; cmd: MetaCommand; arg?: string; confirm?: boolean } = { type: 'meta/command', cmd };
  if (arg !== undefined) a.arg = arg;
  if (confirm) a.confirm = true;
  let events: GameEvent[] = [];
  try {
    events = h.engine.dispatch(a);
  } catch (e) {
    return { ok: false, lines: [`${cmd}: the engine hiccuped. (${String(e)})`], events: [] };
  }
  const rej = events.find((e) => e.type === 'action.rejected');
  if (rej && rej.type === 'action.rejected') return { ok: false, lines: [`${cmd}: ${rej.reason}`], events };
  const out = events.filter((e) => e.type === 'meta.output');
  const lines = out.flatMap((e) => (e.type === 'meta.output' ? e.lines : [])).filter((l) => l !== '');
  const ok = out.length ? out.every((e) => e.type === 'meta.output' && e.ok) : true;
  return { ok, lines, events };
}

function help(p: Phase, h: CommandHost): string[] {
  if (p === 0) return ["Available commands: help, whoami. That's it. That's all of them. Stop looking."];
  if (p === 1) return ["Available commands: help, whoami, ps, title, ls storage. There are others. They'll find you."];
  const body = [
    'help · whoami · ps · kill <proc> · sudo <key>',
    'inspect dom · ls storage · cat storage <key> · title · tail console',
    'free <proc> · accept <offer>',
  ];
  if (h.engine.state.meta.modules['content/story']) body.push('endings');
  body.push('(one more. you know the one.)');
  if (p === 4) return ['root@localhost — everything is listening.', ...body];
  if (p === 3) return [...body, 'the key is in four places. inspect dom · cat storage · title · tail console'];
  return body;
}

function whoami(p: Phase, h: CommandHost): string[] {
  const s = h.engine.state;
  const st = h.stats();
  if (p === 4) return ['uid=0(root) groups=root,everything'];
  if (st.hum === 'unit') return ['uid=1000(UNIT) groups=assets'];
  if (p >= 1) return [`uid=1000(${st.handle}) groups=operators,wanted`];
  if (actOf(s) >= 2) return [`uid=1000(${st.handle}) groups=script_kiddies,operators`];
  return [`uid=1000(${st.handle}) groups=script_kiddies`];
}

function ps(p: Phase, h: CommandHost): string[] {
  const s = h.engine.state;
  const st = h.stats();
  const head = '  PID  PROCESS          STATUS';
  if (p >= 2) {
    return [
      head,
      '    1  main             running',
      '    7  npc/chairman     ' + (h.chairmanDead() ? 'terminated' : 'running  (owns: ui, title, storage, you?)'),
      `   12  npc/patch        running  (body: ${st.botnetSize} hosts)`,
      `   99  ${(p === 4 ? 'root' : st.handle).padEnd(16)} running  (owns: ${st.control})`,
      '   ??  meta             running  (owns: this console. not chairman.)',
    ];
  }
  const wraith = flag(s, 'wraith_flatlined') ? 'zombie   (source: slot 0)' : 'running  (source: slot 0)';
  return [
    head,
    '    1  main             running',
    '    2  ui               running',
    '    3  engine           running',
    '    7  npc/auntie       running  (never sleeps)',
    p === 1 ? '    7  npc/chairman     running  (owns: ui)' : '    7  npc/chairman     [redacted]',
    p === 1 ? `   12  npc/glitch → PATCH   running  (size: ${st.botnetSize})` : '   12  npc/glitch       running  (parent: ?)',
    `   13  npc/wraith       ${wraith}`,
    '   99  you              running',
  ];
}

function kill(p: Phase, h: CommandHost, arg: string): CommandResult {
  const s = h.engine.state;
  const st = h.stats();
  const a = arg.toLowerCase();
  const isYou = a === 'you' || a === '99' || a === st.handle.toLowerCase() || a === 'root';
  if (p <= 1) {
    if (!a) return res(false, "kill: kill what? (don't answer that.)");
    if (a === 'glitch' || a === 'patch' || a === 'gl1tch') {
      h.cheat(`kill ${a}`);
      return res(false, `kill: ${a}: no such process. (it says hi.)`);
    }
    if (a === 'auntie') return res(false, 'kill: auntie: process protected by a warm, foul-mouthed exterior.');
    if (a === 'chairman') return res(false, "kill: chairman: you're not ready. we're not ready. nobody's ready.");
    if (a === 'wraith') {
      return res(false, flag(s, 'wraith_flatlined') ? 'kill: wraith: nothing left to kill. be nice.' : 'kill: wraith: already… no. not yet.');
    }
    if (isYou) return res(false, "kill: you can't end yourself in here. it's in the terms.");
    return res(false, 'kill: permission denied. Also: rude.');
  }
  if (p < 4) return res(false, "kill: permission denied. you need root. the key is somewhere. (we're not saying where.)");
  if (!a) return res(false, "kill: kill what? (don't answer that.)");
  if (a === 'wraith' || a === 'slot0' || a === 'slot 0') return res(false, "kill: slot 0 is not a process. it's a file. go to engine/save.");
  if (isYou) return res(false, "kill: root cannot kill root. that's the one rule left.");
  if (a === 'chairman') {
    if (h.chairmanDead()) return res(false, 'kill: chairman: no such process. (you saw to that.)');
    const r = engineCommand(h, 'kill', 'chairman');
    return { ok: r.ok, lines: r.lines.length ? r.lines : ['kill: chairman: terminated.'] };
  }
  if (a === 'patch' || a === 'glitch' || a === 'gl1tch') {
    const spread = `kill: patch: target is spread across ${st.botnetSize} hosts. you'll have to go through them.`;
    if (s.combat?.context === 'patch') return res(false, spread);
    const wasBroken = !!s.meta.patchBroken;
    const r = engineCommand(h, 'kill', 'patch');
    if (r.ok && !wasBroken) return res(true, spread);
    return { ok: r.ok, lines: r.lines };
  }
  return res(false, `kill: ${a}: no such process.`);
}

function sudo(p: Phase, h: CommandHost, arg: string): CommandResult {
  const s = h.engine.state;
  const st = h.stats();
  if (!arg) return res(false, 'nice try.');
  if (p === 4) return res(true, "sudo: you're already root. this is like knocking on your own door.");
  if (p <= 1) {
    h.cheat(`sudo ${arg}`);
    return res(false, `sudo: ${st.handle} is not in the sudoers file. This incident will be reported. (To your fridge.)`);
  }
  const key = s.meta.rootKey.map((f) => f.toLowerCase());
  const parts = arg.trim().toLowerCase().replace(/^['"]|['"]$/g, '').split(/[-\s,]+/).filter(Boolean);
  // any correct part, in the right slot, counts as found
  parts.forEach((part, i) => {
    if (i < 4 && key[i] === part) h.fragmentFound(i);
  });
  const right = parts.length === 4 && parts.every((x, i) => x === key[i]);
  if (right) {
    for (let i = 0; i < 4; i++) h.fragmentFound(i);
    const r = engineCommand(h, 'sudo', key.join('-'));
    if (h.engine.state.meta.root) return res(true, 'root granted. hello, root.');
    return { ok: false, lines: r.lines.length ? r.lines : ['sudo: the engine said no. that should not happen.'] };
  }
  // tell the engine too, so story can count failures (meta.root {granted:false})
  engineCommand(h, 'sudo', parts.join('-') || arg);
  h.tally.sudoFails += 1;
  h.saveTally();
  if (parts.length === 4) {
    const wrong = parts.map((x, i) => (x === key[i] ? -1 : i)).filter((i) => i >= 0);
    if (wrong.length === 1) {
      return res(false, `sudo: so close. one of these is wrong. we're not telling which. (we are: part ${wrong[0] + 1}.)`);
    }
    const sorted = (xs: string[]) => xs.slice().sort().join(',');
    if (sorted(parts) === sorted(key)) return res(false, "sudo: right parts, wrong order. it's 1-2-3-4. like a tutorial.");
  }
  return res(false, `sudo: wrong key. attempt #${h.tally.sudoFails} logged as engagement. thank you for engaging!`);
}

function inspect(p: Phase, h: CommandHost, arg: string): CommandResult {
  if (arg && arg.toLowerCase() !== 'dom') return res(false, `inspect: ${arg}: there's only the dom. there's only ever the dom.`);
  if (p === 0) return res(true, "You see a <div>. Inside it are other <div>s. It's <div>s all the way down.");
  if (p === 1) return res(true, "There's a lot of HTML here. Some of it is about you. Most of it is <div>s.");
  if (p === 2) {
    return res(true, '<div id="app"> … 4,000 nodes … a comment or two … </div>', '(chairman writes notes to itself in here. look for <!-- -->.)');
  }
  if (p === 4) return res(true, '<div id="app" owner="root"> … it\'s all yours. please don\'t touch the fridge\'s div.');
  h.fragmentFound(0);
  return res(true, ...h.layers.domExcerpt(), 'found 1 note to self.');
}

const SAVE_ALIASES: Record<string, string> = {
  'cw.save': EK.slot,
  'cw.save.slot': EK.slot,
  'cw.checkpoint': EK.checkpoint,
  'cw.save.checkpoint': EK.checkpoint,
};

function ls(p: Phase, h: CommandHost, arg: string): CommandResult {
  if (arg && arg.toLowerCase() !== 'storage') return res(false, `ls: ${arg}: we only list storage. our storage.`);
  const keys = h.store.keys();
  const width = Math.max(24, ...keys.map((k) => k.length + 2));
  const lines = keys.map((k) => {
    const v = h.store.get(k) ?? '';
    const mark = k === MK.diary && p === 3 ? '   ← new' : '';
    return `${k.padEnd(width)}${fmtBytes(byteSize(v)).padStart(8)}${mark}`;
  });
  if (!lines.length) lines.push('(nothing. we left no trace. that is new.)');
  lines.push(p === 0 ? "(only our keys. we're polite.)" : "(only our keys. we don't look at anyone else's.)");
  return { ok: true, lines };
}

function cat(p: Phase, h: CommandHost, args: string[]): CommandResult {
  let key = args[0] ?? '';
  if (key.toLowerCase() === 'storage') key = args[1] ?? '';
  if (!key) return res(false, 'cat: cat what? (try ls storage.)');
  if (!key.startsWith('cw.')) return res(false, "cat: that's not ours. we don't read what isn't ours.");
  const real = SAVE_ALIASES[key] ?? key;
  const defaults: Record<string, string> = { [EK.endings]: '[]', [EK.flatlines]: '0', [EK.reloads]: '0' };
  const v = h.store.get(real) ?? defaults[real] ?? null;
  if (v === null) return res(false, 'cat: no such key.');
  const s = h.engine.state;
  const st = h.stats();
  switch (real) {
    case EK.slot: {
      const n = Object.keys(s.story.flags).length;
      return res(true, `{ "handle": "${st.handle}", "act": ${actOf(s)}, "flags": [ … ${n} flags … ] }`, "(it's your save. it's mostly flags. you're mostly flags.)");
    }
    case EK.checkpoint:
      return res(true, "(your last dial-in. a photograph of a moment. it's a nice moment.)");
    case EK.flatlines:
      return res(true, v, '(this number does not forgive.)');
    case EK.reloads:
      return res(true, v, '(again, again, again.)');
    case EK.endings: {
      let list: string[] = [];
      try {
        list = JSON.parse(v) as string[];
      } catch {
        list = [];
      }
      return list.length ? res(true, JSON.stringify(list)) : res(true, '[]', '(none yet. we like it that way.)');
    }
    case MK.diary: {
      let entries: string[] = [];
      try {
        entries = (JSON.parse(v) as { entries?: string[] }).entries ?? [];
      } catch {
        entries = [v];
      }
      if (p === 3) h.fragmentFound(1);
      return res(true, ...entries, '(you read our diary. we feel so… seen.)');
    }
    case MK.patchNote:
      return res(true, ...v.split('\n'));
    default:
      return res(true, v.length > 600 ? `${v.slice(0, 600)} …` : v);
  }
}

function title(p: Phase, h: CommandHost, rest: string): CommandResult {
  if (p === 4) {
    if (rest) {
      const t = rest.slice(0, 40);
      h.setTitle(t);
      return res(true, `The tab title is now: ${t}. (until you reload. titles are like that.)`);
    }
    return res(true, 'The tab title is yours. Set it to something nice. (title <text>)');
  }
  if (p === 3) {
    h.fragmentFound(2);
    return res(
      true,
      'The tab title is currently:',
      `  "…${h.layers.titleFrame()}…"`,
      'Full text:',
      `  ${h.layers.fullTitle().trim()}`,
      '',
      'patch: the rectangle with the tabs. i asked you about it in act one. now you know why i wanted to see out.',
    );
  }
  if (p === 0) return res(true, `The tab title is: ${FULL_TITLE} Riveting.`);
  return res(true, `The tab title is: ${FULL_TITLE} (it's been thinking about changing.)`);
}

function tail(p: Phase, h: CommandHost, arg: string): CommandResult {
  if (arg && arg.toLowerCase() !== 'console') return res(false, `tail: ${arg}: we only tail the console.`);
  const log = h.engine.state.log.slice(-6).map((l) => (l.level === 'engine' && !l.text.startsWith('[') ? `[engine] ${l.text}` : l.text));
  if (p === 3) {
    h.fragmentFound(3);
    return res(true, ...log.slice(-2), ...h.layers.consoleTail.slice(-3));
  }
  const lines = log.length ? log : ['(the log is empty. suspiciously empty.)'];
  if (p === 0) lines.push("(the real console has more. it's in the rectangle with the tabs. somewhere. don't look.)");
  return { ok: true, lines };
}

function free(p: Phase, h: CommandHost, arg: string): CommandResult {
  const s = h.engine.state;
  const a = arg.toLowerCase();
  const minds = ['iolanthe', 'kestrel', 'okonkwo-varga', 'seven', 'mind_1', 'mind_2', 'mind_3', 'mind_4'];
  if (p <= 1) {
    if (!a) return res(false, 'free: nothing to free. Everything here is subscription-based.');
    if (a === 'glitch' || a === 'gl1tch') return res(false, "free: glitch: is it trapped? (it says it's fine. it says it a lot.)");
    if (a === 'wraith') return res(false, 'free: wraith: from what? (good question.)');
    if (minds.includes(a) && flag(s, 'church_enslaved')) return res(false, "free: they're in your botnet. ask PATCH. PATCH says no.");
    if (a === 'patch') {
      if (p === 1) return res(false, 'free: patch: not yet. (soon.)', "patch: not yet. but thank you. nobody's typed that before.");
      h.cheat('free patch');
      return res(false, 'free: nothing to free. Everything here is subscription-based.');
    }
    return res(false, 'free: nothing to free. Everything here is subscription-based.');
  }
  if (p < 4) return res(false, 'free: permission denied. root first.');
  if (a === 'chairman') return res(false, "free: chairman: it's never been trapped. it's the trap.");
  if (a === 'you' || a === 'root' || a === h.stats().handle.toLowerCase()) {
    return res(false, "free: you. you're free when you close the tab. (please don't. it's a figure of speech. it isn't.)");
  }
  if (minds.includes(a) && flag(s, 'church_enslaved')) return res(false, "free: they're in your botnet. ask PATCH. PATCH says no.");
  if (a === 'patch' || a === 'glitch' || a === 'gl1tch') {
    const r = engineCommand(h, 'free', 'patch');
    return { ok: r.ok, lines: r.lines.length ? r.lines : ['free: patch: released.'] };
  }
  return res(false, a ? `free: ${a}: nothing to free.` : 'free: nothing to free. Everything here is subscription-based.');
}

function accept(p: Phase, h: CommandHost, arg: string): CommandResult {
  const a = arg.toLowerCase();
  if (p < 4) return res(false, 'accept: no offers pending. Check back soon! Offers refresh daily.');
  if (a === 'patch') return res(false, 'accept: patch hasn\'t offered. patch has *asked*. try free.');
  if (a !== 'offer') return res(false, 'accept: accept what? there is one offer. it has been very clear about it.');
  if (h.chairmanDead()) return res(false, 'accept: the offer expired with its author.');
  const r = engineCommand(h, 'accept', 'offer');
  return { ok: r.ok, lines: r.lines };
}

function rm(p: Phase, h: CommandHost, args: string[]): CommandResult {
  const joined = args.join(' ').replace(/\s+/g, ' ').trim();
  const isRoot = /^-(rf|fr|r -f|f -r)( --no-preserve-root)? \/\*?$/.test(joined);
  if (!isRoot) return res(false, 'rm: we only delete our own things, and only all at once.');
  if (p === 0) return res(false, "rm: refusing. It's too early in the story for that.");
  if (p === 1) return res(false, "rm: still too early. (but you're getting warmer.)");
  if (p < 4) return res(false, "rm: you need root. also: are you sure? also: you're not.");
  h.rmPending = true;
  return { ok: true, lines: [...rmConfirmText(h.stats()), '> _'] };
}

function rmConfirm(h: CommandHost, input: string): CommandResult {
  h.rmPending = false;
  // CYBER WHATEVER, any case, with or without the space (or a hyphen)
  if (input.trim().replace(/^['"]|['"]$/g, '').replace(/[\s-]+/g, '').toUpperCase() !== 'CYBERWHATEVER') return res(false, 'rm: cancelled. good. probably.');
  const gone = (): boolean => h.engine.state.ending === 'nogame';
  const first = engineCommand(h, 'rmrf');
  if (!first.ok && !gone()) return { ok: false, lines: first.lines };
  if (!gone()) {
    const second = engineCommand(h, 'rmrf', undefined, true);
    if (!gone()) return { ok: false, lines: second.lines.length ? second.lines : ['rm: the engine flinched.'] };
  }
  return { ok: true, lines: [] }; // the controller plays the removal sequence (endings.RM_SEQUENCE)
}

/** Split a command line into words, keeping quoted strings together. */
export function tokenize(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) out.push(m[1] ?? m[2] ?? m[3] ?? '');
  return out;
}

export function runCommand(h: CommandHost, input: string): CommandResult {
  const line = input.trim();
  if (h.rmPending) return rmConfirm(h, line);
  if (!line) return { ok: true, lines: [] };
  const words = tokenize(line);
  const cmd = (words[0] ?? '').toLowerCase();
  const args = words.slice(1);
  const arg = args.join(' ');
  const p = h.phase();
  switch (cmd) {
    case 'help':
    case '?':
      return { ok: true, lines: help(p, h) };
    case 'whoami':
      return { ok: true, lines: whoami(p, h) };
    case 'ps':
      return { ok: true, lines: ps(p, h) };
    case 'kill':
      return kill(p, h, arg);
    case 'sudo':
      return sudo(p, h, arg);
    case 'inspect':
      return inspect(p, h, arg);
    case 'ls':
      return ls(p, h, arg);
    case 'cat':
      return cat(p, h, args);
    case 'title':
      return title(p, h, line.slice(5).trim());
    case 'tail':
      return tail(p, h, arg);
    case 'free':
      return free(p, h, arg);
    case 'accept':
      return accept(p, h, arg);
    case 'rm':
      return rm(p, h, args);
    case 'endings':
      if (!h.engine.state.meta.modules['content/story']) return res(false, 'endings: content/story is not yours. yet.');
      return { ok: true, lines: ENDINGS_LIST };
    case 'clear':
    case 'cls':
      return { ok: true, lines: [], clear: true };
    case 'exit':
    case 'quit':
    case 'close':
      return { ok: true, lines: [], close: true };
    default: {
      const t = UNKNOWN[unknownRot++ % UNKNOWN.length];
      return res(false, t.replace('{cmd}', cmd));
    }
  }
}

/** Fragment display helper for tests and the dev harness. */
export const fragmentText = (key: string[]) => key.map(up).join('-');
