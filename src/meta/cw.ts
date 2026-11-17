// window.cw: the DevTools face of the meta console. Same handler, same words (05-meta §2).
// Works as methods (cw.kill('chairman')), as a call (cw('kill chairman')) and as a tag (cw`kill chairman`).
// Calling anything else on it, or assigning to it, is a cheat attempt (05-meta §3).
import type { CommandResult } from './commands.ts';

export interface CwHost {
  exec(line: string, source: 'cw'): CommandResult;
  cheat(what: string): void;
  printReal(lines: string[], ok: boolean): void;
  isFinale(): boolean;
}

/** Properties tooling may probe without meaning anything (promises, JSON, test frameworks, React/Preact devtools). */
const IGNORED = new Set([
  'then', 'toJSON', 'constructor', 'prototype', '__proto__', 'valueOf', 'toString', 'toLocaleString',
  'inspect', 'nodeType', 'tagName', '$$typeof', 'asymmetricMatch', '@@__IMMUTABLE_ITERABLE__@@',
  'length', 'name', 'caller', 'arguments', 'call', 'apply', 'bind', 'hasOwnProperty', 'isPrototypeOf',
  'propertyIsEnumerable', '_isMockFunction', 'getMockName', '__esModule', 'default',
]);

const CHEAT_LINE = "cheat: that's not a command. but we saw you try.";

function lineFrom(first: unknown, rest: unknown[]): string {
  if (Array.isArray(first) && 'raw' in (first as object)) {
    const strings = first as unknown as TemplateStringsArray;
    let s = '';
    strings.forEach((part, i) => {
      s += part + (i < rest.length ? String(rest[i]) : '');
    });
    return s.trim();
  }
  return [first, ...rest]
    .filter((x) => x !== undefined && x !== null)
    .map(String)
    .join(' ')
    .trim();
}

export type CwFunction = ((...args: unknown[]) => undefined) & Record<string, unknown>;

export function makeCw(host: CwHost): CwFunction {
  const run = (line: string): undefined => {
    try {
      host.exec(line, 'cw');
    } catch {
      /* never throw into the page */
    }
    return undefined;
  };
  const target = function cw(first?: unknown, ...rest: unknown[]): undefined {
    return run(lineFrom(first, rest) || 'help');
  } as CwFunction;

  const methods: Record<string, (...a: unknown[]) => undefined> = {
    help: () => run('help'),
    whoami: () => run('whoami'),
    ps: () => run('ps'),
    kill: (...a) => run(`kill ${lineFrom(a[0], a.slice(1))}`),
    sudo: (...a) => run(a.length > 1 ? `sudo ${a.map(String).join('-')}` : `sudo ${lineFrom(a[0], [])}`),
    inspect: (...a) => run(`inspect ${lineFrom(a[0], a.slice(1)) || 'dom'}`),
    ls: (...a) => run(`ls ${lineFrom(a[0], a.slice(1)) || 'storage'}`),
    cat: (...a) => {
      const words = a.filter((x) => x !== undefined).map(String);
      if (words[0] && words[0] !== 'storage') words.unshift('storage');
      return run(`cat ${words.join(' ')}`);
    },
    title: (...a) => run(`title ${lineFrom(a[0], a.slice(1))}`),
    tail: (...a) => run(`tail ${lineFrom(a[0], a.slice(1)) || 'console'}`),
    free: (...a) => run(`free ${lineFrom(a[0], a.slice(1))}`),
    accept: (...a) => run(`accept ${lineFrom(a[0], a.slice(1))}`),
    rm: (...a) => run(`rm ${a.map(String).join(' ')}`),
    endings: () => run('endings'),
  };
  for (const [k, f] of Object.entries(methods)) {
    Object.defineProperty(target, k, { value: f, enumerable: true, configurable: true, writable: false });
  }
  Object.defineProperty(target, 'toString', {
    value: () => 'cw — try cw.help()',
    enumerable: false,
    configurable: true,
  });

  const caught = (what: string) => {
    try {
      if (!host.isFinale()) host.printReal([CHEAT_LINE], false);
      host.cheat(what);
    } catch {
      /* ignore */
    }
  };

  return new Proxy(target, {
    get(t, prop, recv) {
      if (typeof prop === 'symbol' || prop in t || IGNORED.has(prop)) return Reflect.get(t, prop, recv);
      // unknown property: harmless to read (autocomplete, previews); calling it is the cheat
      return (..._args: unknown[]) => {
        caught(`cw.${prop}()`);
        return undefined;
      };
    },
    set(_t, prop) {
      caught(`cw.${String(prop)} = …`);
      return true;
    },
    defineProperty(_t, prop) {
      caught(`cw.${String(prop)} = …`);
      return true;
    },
    deleteProperty(_t, prop) {
      caught(`delete cw.${String(prop)}`);
      return true;
    },
  });
}

/** Install as `window.cw`. Reassigning `cw` itself also counts as a cheat and is ignored. */
export function installCw(win: object | null, cw: CwFunction, host: CwHost): void {
  if (!win) return;
  try {
    Object.defineProperty(win, 'cw', {
      configurable: true,
      enumerable: false,
      get: () => cw,
      set: () => {
        try {
          if (!host.isFinale()) host.printReal([CHEAT_LINE], false);
          host.cheat('cw = …');
        } catch {
          /* ignore */
        }
      },
    });
  } catch {
    /* ignore */
  }
}
