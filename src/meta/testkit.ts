// Headless shims for the meta layer tests (storage, document, console, timers). Test-only.
import type { ConsoleLike, MetaEnv, StoreLike } from './env.ts';
import { BASE_TITLE } from './fragments.ts';

export class MemStore implements StoreLike {
  map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, String(v));
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null;
  }
  get length(): number {
    return this.map.size;
  }
}

class FakeNode {
  parent: FakeNode | null = null;
  childNodes: FakeNode[] = [];
  className = '';
  attrs: Record<string, string> = {};
  constructor(public nodeType: number, public nodeValue: string | null = null, public tagName = '') {}
  appendChild(n: FakeNode): FakeNode {
    n.parent = this;
    this.childNodes.push(n);
    return n;
  }
  setAttribute(k: string, v: string): void {
    this.attrs[k] = v;
  }
  remove(): void {
    if (this.parent) this.parent.childNodes = this.parent.childNodes.filter((c) => c !== this);
    this.parent = null;
  }
  get isConnected(): boolean {
    let n: FakeNode | null = this;
    while (n) {
      if (n.tagName === '#document') return true;
      n = n.parent;
    }
    return false;
  }
  /** All comment texts below this node. */
  comments(): string[] {
    const out: string[] = [];
    for (const c of this.childNodes) {
      if (c.nodeType === 8) out.push(c.nodeValue ?? '');
      out.push(...c.comments());
    }
    return out;
  }
}

export class FakeDoc {
  title = BASE_TITLE;
  visibilityState: 'visible' | 'hidden' = 'visible';
  root = new FakeNode(9, null, '#document');
  bodyNode = new FakeNode(1, null, 'BODY');
  app = new FakeNode(1, null, 'DIV');
  constructor() {
    this.root.appendChild(this.bodyNode);
    this.bodyNode.appendChild(this.app);
  }
  getElementById(id: string): FakeNode | null {
    return id === 'app' ? this.app : null;
  }
  get body(): FakeNode {
    return this.bodyNode;
  }
  createElement(tag: string): FakeNode {
    return new FakeNode(1, null, tag.toUpperCase());
  }
  createComment(text: string): FakeNode {
    return new FakeNode(8, text);
  }
  querySelector(): null {
    return null;
  }
  addEventListener(): void {}
  removeEventListener(): void {}
}

export class FakeConsole implements ConsoleLike {
  logs: string[] = [];
  log(...args: unknown[]): void {
    this.logs.push(args.map(String).join(' '));
  }
  text(): string {
    return this.logs.join('\n');
  }
}

export interface TestEnv extends MetaEnv {
  store: MemStore;
  fakeDoc: FakeDoc;
  fakeCon: FakeConsole;
  /** Advance the fake clock, running due timers. */
  advance(ms: number): void;
  setNow(t: number): void;
}

export function testEnv(store = new MemStore(), start = 1_800_000_000_000): TestEnv {
  let now = start;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void; every: number | null }>();
  const fakeDoc = new FakeDoc();
  const fakeCon = new FakeConsole();
  const win = {
    innerWidth: 1440,
    innerHeight: 900,
    matchMedia: () => ({ matches: false }),
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { reload: () => {} },
  };
  const env: TestEnv = {
    storage: store,
    store,
    doc: fakeDoc as unknown as Document,
    fakeDoc,
    con: fakeCon,
    fakeCon,
    win: win as unknown as Window & typeof globalThis,
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn, every: null });
      return id;
    },
    clearTimeout: (id) => {
      timers.delete(id as number);
    },
    setInterval: (fn, ms) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn, every: ms });
      return id;
    },
    clearInterval: (id) => {
      timers.delete(id as number);
    },
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        let due: [number, { at: number; fn: () => void; every: number | null }] | null = null;
        for (const e of timers) if (e[1].at <= end && (!due || e[1].at < due[1].at)) due = e;
        if (!due) break;
        const [id, t] = due;
        now = t.at;
        if (t.every) t.at += t.every;
        else timers.delete(id);
        t.fn();
      }
      now = end;
    },
    setNow(t: number) {
      now = t;
    },
  };
  return env;
}
