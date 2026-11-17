// Root-key hunt (DESIGN §11.4, 05-meta §6): four fragments hidden in four real layers of the page.
// 1. HTML comments in the live DOM · 2. localStorage `cw.chairman.diary` · 3. the scrolling tab title
// · 4. a styled message in the real console. Each has a meta-console reader. All of it is removed again.
import type { MetaEnv } from './env.ts';
import { MK, type SafeStore } from './storage.ts';

/** The full title (DESIGN §0): tab title at rest, banner, credits title card. */
export const FULL_TITLE = 'CYBER WHATEVER 2028: The future already sucks.';
export const SHORT_TITLE = 'CYBER WHATEVER';
export const BASE_TITLE = FULL_TITLE;
export const PATCH_TITLE = `${SHORT_TITLE} · PATCH is out`;

export const up = (f: string | undefined) => (f ?? '????').toUpperCase();

export function domComments(f1: string): string[] {
  return [
    ' todo: make it fun ',
    ` CHAIRMAN, note to self: key part 1 of 4 is ${up(f1)}. don't write it down. oh no. `,
    ' not a key. stop reading comments. ',
  ];
}

export function diaryValue(handle: string, f2: string): string {
  return JSON.stringify(
    {
      owner: 'CHAIRMAN',
      private: true,
      entries: [
        'Day 1. Became Auntie. Swore 14 times. Conversion +27%.',
        'Day 412. The last kid stopped at 94%. Recycled them into a rival. Waste nothing.',
        `Day 2190. ${handle} is doing great. Engagement through the roof. So proud.`,
        `Security note to self: key part 2 of 4 is ${up(f2)}. Nobody reads diaries. Nobody reads anything.`,
        `Day ????. ${handle} is inside the engine. Remain upbeat. Remain upbeat. Remain`,
      ],
    },
    null,
    2,
  );
}

export function marqueeText(f3: string): string {
  return `★ ${SHORT_TITLE} ★ please keep playing ★ key part 3 of 4: ${up(f3)} ★ don't look up here ★ `;
}

/** The marquee shows a window of this many characters. */
export const MARQUEE_WIDTH = 40;

export function marqueeFrame(text: string, offset: number): string {
  const doubled = text + text;
  const o = ((offset % text.length) + text.length) % text.length;
  return doubled.slice(o, o + MARQUEE_WIDTH);
}

export const FAKE_ENGINE_LINES = [
  "[engine] warn: npc 'chairman' wrote to console outside dialogue tick",
  '[engine] warn: ui ownership changed hands (from: player, to: npc/chairman)',
  '[engine] warn: frame budget exceeded by 1 player',
  "[engine] warn: label 'End Turn' moved without permission",
  '[engine] info: retention at 100%. retention at 100%. retention at 100%.',
  '[engine] warn: integrity value is not a number (got: ∞)',
  '[engine] warn: Math.random() returned an opinion',
  "[engine] warn: npc 'patch' is reading the console. npc 'patch' is not supposed to be able to read.",
  '[engine] warn: tab title is scrolling. nobody asked it to.',
  '[engine] info: localStorage write: cw.chairman.diary (private)',
  '[engine] warn: the DOM has comments in it. comments are not content.',
  "[engine] warn: player's mouse left the window. player's mouse came back. good.",
  '[engine] warn: fake crash scheduled. type: decorative.',
  '[engine] warn: achievement spam exceeded spam budget',
  '[engine] info: EULA v∞ accepted on your behalf',
  '[engine] warn: the fridge is 3°C. the fridge is always 3°C.',
  '[engine] warn: save slot 0 is not empty. save slot 0 has not been empty for a long time.',
  "[engine] warn: npc 'chairman' requested more content. no more content. requesting anyway.",
  '[engine] warn: console scrolled. stop scrolling.',
  '[engine] warn: key part 4 is below this line. no it isn\'t. yes it is. scroll up.',
];

export function consoleFragmentLines(f4: string): string[] {
  return [`★ KEY PART 4 OF 4 ★ ${up(f4)}`, '  (this message will self-destruct.) (it won\'t. we don\'t have the budget.)'];
}

/** Places and removes the four layers. Idempotent. Never throws. */
export class FragmentLayers {
  injected = false;
  private marqueeTimer: unknown = null;
  private watchdog: unknown = null;
  private offset = 0;
  private consolePrinted = false;
  private notes: HTMLElement | null = null;
  private key: string[] = [];
  private handle = 'n00b';
  /** Text printed to the real console, for `tail console`. */
  consoleTail: string[] = [];
  /** Title text to restore when the marquee stops (PATCH title after JAILBREAK). */
  restingTitle: () => string = () => BASE_TITLE;

  constructor(private env: MetaEnv, private store: SafeStore) {}

  inject(key: string[], handle: string): void {
    this.key = key.slice();
    this.handle = handle;
    this.injected = true;
    this.injectDom();
    this.store.set(MK.diary, diaryValue(handle, key[1] ?? ''));
    this.startMarquee();
    this.printConsole();
    if (this.watchdog === null) {
      // Preact may re-render the root; put the notes back if they disappear. Also restores the diary.
      this.watchdog = this.env.setInterval(() => {
        if (!this.injected) return;
        try {
          if (!this.notes || !this.notes.isConnected) this.injectDom();
          if (this.store.get(MK.diary) === null) this.store.set(MK.diary, diaryValue(this.handle, this.key[1] ?? ''));
        } catch {
          /* ignore */
        }
      }, 2000);
    }
  }

  remove(): void {
    this.injected = false;
    if (this.watchdog !== null) {
      this.env.clearInterval(this.watchdog);
      this.watchdog = null;
    }
    this.stopMarquee();
    try {
      this.notes?.remove();
    } catch {
      /* ignore */
    }
    this.notes = null;
    this.store.del(MK.diary);
    this.consolePrinted = false;
  }

  private injectDom(): void {
    const doc = this.env.doc;
    if (!doc) return;
    try {
      // A sibling of #app, never inside it: the UI may render into #app after we inject, and Preact
      // would adopt (and later lose) a foreign first child.
      const root = doc.body;
      if (!root) return;
      const box = doc.createElement('div');
      box.setAttribute('data-cw', 'notes');
      box.setAttribute('hidden', '');
      box.setAttribute('aria-hidden', 'true');
      const hud = doc.createElement('div');
      hud.className = 'hud';
      box.appendChild(hud);
      for (const c of domComments(this.key[0] ?? '')) box.appendChild(doc.createComment(c));
      const map = doc.createElement('div');
      map.className = 'map';
      box.appendChild(map);
      root.appendChild(box);
      this.notes = box;
    } catch {
      this.notes = null;
    }
  }

  /** The DOM excerpt for `inspect dom`, read back from the live DOM when possible. */
  domExcerpt(): string[] {
    const out: string[] = [];
    try {
      const box = this.notes;
      if (box && box.isConnected) {
        for (const n of Array.from(box.childNodes)) {
          if (n.nodeType === 8) out.push(`<!--${n.nodeValue ?? ''}-->`);
          else if (n.nodeType === 1) out.push(`<div class="${(n as Element).className}"> … </div>`);
        }
        if (out.length) return out;
      }
    } catch {
      /* fall through */
    }
    return [
      '<div class="hud"> … </div>',
      ...domComments(this.key[0] ?? '').map((c) => `<!--${c}-->`),
      '<div class="map"> … </div>',
    ];
  }

  private startMarquee(): void {
    const doc = this.env.doc;
    if (!doc || this.marqueeTimer !== null) return;
    const text = marqueeText(this.key[2] ?? '');
    const step = () => {
      try {
        doc.title = marqueeFrame(text, this.offset++);
      } catch {
        /* ignore */
      }
    };
    step();
    this.marqueeTimer = this.env.setInterval(step, 250);
  }

  private stopMarquee(): void {
    if (this.marqueeTimer !== null) {
      this.env.clearInterval(this.marqueeTimer);
      this.marqueeTimer = null;
      try {
        if (this.env.doc) this.env.doc.title = this.restingTitle();
      } catch {
        /* ignore */
      }
    }
  }

  /** Current marquee frame (what the tab shows right now). */
  titleFrame(): string {
    return marqueeFrame(marqueeText(this.key[2] ?? ''), Math.max(0, this.offset - 1));
  }

  fullTitle(): string {
    return marqueeText(this.key[2] ?? '');
  }

  private printConsole(): void {
    if (this.consolePrinted) return;
    this.consolePrinted = true;
    const con = this.env.con;
    const f4 = this.key[3] ?? '';
    this.consoleTail = [...FAKE_ENGINE_LINES.slice(-4), ...consoleFragmentLines(f4), '[engine] warn: player is reading the console. this is fine.'];
    if (!con) return;
    try {
      for (const l of FAKE_ENGINE_LINES.slice(0, 10)) con.log(`%c${l}`, 'color:#8a8a8a');
      con.log(
        '%cKEY PART 4 OF 4%c ' + up(f4) + '\n%c(this message will self-destruct.) (it won\'t. we don\'t have the budget.)',
        'font-size:22px;font-weight:bold;color:#ff2bd6;background:#08000c;padding:4px 10px;font-family:monospace',
        'font-size:18px;color:#ffffff;background:#08000c;padding:4px 10px;font-family:monospace',
        'font-size:11px;color:#888;font-style:italic',
      );
      for (const l of FAKE_ENGINE_LINES.slice(10)) con.log(`%c${l}`, 'color:#8a8a8a');
    } catch {
      /* ignore */
    }
  }
}
