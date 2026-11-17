// The meta overlays: console, fake YOU WIN, fake crash, fake credits, Droste title, endings,
// RETENTION's endless credits, THERE IS NO GAME. Mounted once above the whole app.
import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { FAKE_CRASH, FAKE_CRASH_AFTER, FAKE_CRASH_BUTTONS, FAKE_WIN, FAKE_WIN_RETRACT } from './chairman.ts';
import type { MetaController, MetaView, Scene } from './controller.ts';
import {
  FAKE_GLITCH_LINE, FAKE_PATCH_LINE, fakeCredits, fakeGameOver, morphStep, RETENTION_INTERRUPTS, retentionLoop,
  RM_SEQUENCE, TEAR_THROUGH, type EndingScript, type Line,
} from './endings.ts';
import { fillSlots, fmtDuration } from './stats.ts';
import { META_CSS } from './style.ts';

function useView(ctrl: MetaController): MetaView {
  const [v, setV] = useState(ctrl.view.get());
  useEffect(() => {
    setV(ctrl.view.get());
    return ctrl.view.subscribe(() => setV(ctrl.view.get()));
  }, [ctrl]);
  return v;
}

function useTimeout(fn: () => void, ms: number, deps: unknown[]): void {
  useEffect(() => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Reveal text one character at a time. Click/Space completes; reduced motion shows it at once. */
function useTypewriter(text: string, speed: number, reduced: boolean): [string, boolean, () => void] {
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    setN(reduced ? text.length : 0);
    if (reduced) return;
    const id = setInterval(() => setN((x) => (x >= text.length ? x : x + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed, reduced]);
  return [text.slice(0, n), n >= text.length, () => setN(text.length)];
}

const WHO: Record<string, string> = {
  chairman: 'CHAIRMAN',
  glitch: 'PATCH',
  patch: 'PATCH',
  sys: 'sys',
  fridge: 'fridge',
};

function Who({ who }: { who?: string }) {
  if (!who) return null;
  return <span class={`cwm-who cwm-who-${who}`}>{WHO[who] ?? who}</span>;
}

/** Inline *emphasis* and `code` from the script. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('*') && p.endsWith('*') && p.length > 2 ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code key={i}>{p.slice(1, -1)}</code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Console
// ---------------------------------------------------------------------------

function MetaConsole({ ctrl, view }: { ctrl: MetaController; view: MetaView }) {
  const [input, setInput] = useState('');
  const hist = useRef<string[]>([]);
  const hi = useRef(-1);
  const inRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    inRef.current?.focus();
  }, []);
  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [view.lines.length]);
  const root = view.phase >= 4;
  const prompt = ctrl.rmPending ? '>' : root ? 'root@localhost#' : `${ctrl.engine.state.player.handle}@cw:~$`;
  const submit = () => {
    const line = input;
    setInput('');
    if (line.trim()) hist.current.unshift(line);
    hi.current = -1;
    ctrl.exec(line, 'console');
  };
  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape' || (e.key === '`' && !input)) {
      e.preventDefault();
      ctrl.openConsole(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      hi.current = Math.min(hist.current.length - 1, hi.current + 1);
      setInput(hist.current[hi.current] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hi.current = Math.max(-1, hi.current - 1);
      setInput(hi.current < 0 ? '' : hist.current[hi.current] ?? '');
    }
  };
  return (
    <section class={`cwm-console ${root ? 'is-root' : ''}`} role="dialog" aria-label="meta console" onClick={() => inRef.current?.focus()}>
      <header class="cwm-console-bar">
        <span>{root ? 'root@localhost — everything is listening.' : 'meta console'}</span>
        <button type="button" class="cwm-x" aria-label="close console" onClick={() => ctrl.openConsole(false)}>
          ×
        </button>
      </header>
      <div class="cwm-out" ref={outRef} aria-live="polite">
        {view.lines.map((l) => (
          <div key={l.id} class={`cwm-l cwm-l-${l.kind}`}>
            {l.text || ' '}
          </div>
        ))}
      </div>
      <form
        class="cwm-in"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label class="cwm-prompt" for="cwm-input">
          {prompt}
        </label>
        <input
          id="cwm-input"
          ref={inRef}
          value={input}
          onInput={(e) => setInput((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={onKey}
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          enterkeyhint="send"
          aria-label="command"
        />
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CHAIRMAN v2 tricks
// ---------------------------------------------------------------------------

function FakeWin({ ctrl }: { ctrl: MetaController }) {
  const [stage, setStage] = useState<'win' | 'retract'>('win');
  useTimeout(() => setStage('retract'), 2500, []);
  useTimeout(() => stage === 'retract' && ctrl.fakeWinDone(), 2800, [stage]);
  const win = FAKE_WIN(ctrl.engine.state.player.handle);
  return (
    <div class="cwm-full cwm-fakewin" role="alert">
      <div class="cwm-fakewin-box">
        {win.map((l, i) => (
          <div key={i} class={`cwm-fw-line ${i === 0 ? 'cwm-fw-title' : ''} ${stage === 'retract' ? 'is-gone' : ''}`} style={{ transitionDelay: `${i * 250}ms` }}>
            {l}
          </div>
        ))}
        {stage === 'win' ? (
          <button type="button" class="cwm-btn" onClick={() => setStage('retract')}>
            [ CONTINUE ]
          </button>
        ) : (
          FAKE_WIN_RETRACT.map((l, i) => (
            <div key={`r${i}`} class="cwm-fw-line cwm-fw-retract" style={{ animationDelay: `${300 + i * 400}ms` }}>
              {l}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Halcy() {
  // Halcy the jellyfish: smiling, no eyes. Game art, not a system icon.
  return (
    <svg class="cwm-halcy" viewBox="0 0 64 80" aria-hidden="true">
      <path d="M8 34 C8 12 56 12 56 34 Z" fill="#ff2bd6" opacity="0.85" />
      <path d="M22 26 Q32 34 42 26" stroke="#05010a" stroke-width="3" fill="none" stroke-linecap="round" />
      {[14, 24, 34, 44, 52].map((x, i) => (
        <path key={i} d={`M${x} 34 q4 10 0 20 q-4 10 0 20`} stroke="#00ffd5" stroke-width="2.5" fill="none" opacity="0.8" />
      ))}
    </svg>
  );
}

function FakeCrash({ ctrl, reduced }: { ctrl: MetaController; reduced: boolean }) {
  const [stage, setStage] = useState<'crash' | 'joke'>(reduced ? 'joke' : 'crash');
  useTimeout(() => setStage('joke'), 3000, []);
  useTimeout(() => stage === 'joke' && ctrl.sceneDone(), 2600, [stage]);
  return (
    <div class={`cwm-full cwm-crash ${reduced ? 'is-reduced' : ''}`} role="alert">
      {stage === 'crash' ? (
        <div class="cwm-crash-box">
          {FAKE_CRASH.map((l, i) => (
            <div key={i} class={i === 0 ? 'cwm-crash-title' : 'cwm-crash-line'}>
              {l || ' '}
            </div>
          ))}
          <div class="cwm-crash-btns">
            {FAKE_CRASH_BUTTONS.map((b) => (
              <button key={b} type="button" class="cwm-btn" onClick={() => setStage('joke')}>
                [ {b} ]
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div class="cwm-crash-box">
          {FAKE_CRASH_AFTER.map((l, i) => (
            <div key={i} class="cwm-crash-line cwm-pop">
              {l}
            </div>
          ))}
        </div>
      )}
      <Halcy />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Act 2: fake GAME OVER → fake credits → PATCH tears through
// ---------------------------------------------------------------------------

function FakeCredits({ ctrl, reduced, part }: { ctrl: MetaController; reduced: boolean; part: 'all' | 'gameover' | 'credits' }) {
  const st = useMemo(() => ctrl.stats(), [ctrl]);
  const over = useMemo(() => fakeGameOver(st), [st]);
  const lines = useMemo(() => fakeCredits(st), [st]);
  const [stage, setStage] = useState<'over' | 'thanks' | 'roll' | 'tear' | 'rip'>(part === 'credits' ? 'roll' : 'over');
  // story-driven: the GAME OVER screen and the credits are two cinematics; PATCH's words come as a dialogue
  const typeLeet = part === 'all';
  const goRoll = () => (part === 'gameover' ? ctrl.sceneDone() : setStage('roll'));
  const [buttons, setButtons] = useState(false);
  const [y, setY] = useState(0);
  const [morph, setMorph] = useState(0);
  const [typed, setTyped] = useState(0);
  useTimeout(() => setButtons(true), reduced ? 300 : 3000, []);
  useTimeout(() => stage === 'thanks' && goRoll(), 1000, [stage]);
  // the roll: 0 → 1 over ~26 s (reduced motion: 4 pages)
  useEffect(() => {
    if (stage !== 'roll') return;
    const dur = reduced ? 8000 : 26000;
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / dur);
      setY(p);
      if (p >= 1) {
        clearInterval(id);
        setStage('tear');
      }
    }, reduced ? 2000 : 40);
    return () => clearInterval(id);
  }, [stage, reduced]);
  // the tear: gl1tch's credit rewrites itself, then the leet types into the gaps
  useEffect(() => {
    if (stage !== 'tear') return;
    const id = setInterval(() => setMorph((m) => m + 1), reduced ? 30 : 90);
    return () => clearInterval(id);
  }, [stage, reduced]);
  const total = typeLeet ? TEAR_THROUGH.join('\n').length : 0;
  useEffect(() => {
    if (stage !== 'tear' || morph < FAKE_PATCH_LINE.length) return;
    const id = setInterval(() => setTyped((t) => Math.min(total, t + 1)), reduced ? 5 : 45);
    return () => clearInterval(id);
  }, [stage, morph >= FAKE_PATCH_LINE.length, reduced, total]);
  const tearDone = typed >= total && morph >= FAKE_PATCH_LINE.length;
  useTimeout(() => stage === 'tear' && tearDone && setStage('rip'), 1800, [stage, tearDone]);
  useTimeout(() => stage === 'rip' && ctrl.sceneDone(), reduced ? 300 : 1400, [stage]);

  if (stage === 'over' || stage === 'thanks') {
    return (
      <div class="cwm-full cwm-gameover" role="alert">
        <div class="cwm-go-title">{over[0]}</div>
        <div class="cwm-go-line">{over[1]}</div>
        <div class="cwm-go-line">{over[2]}</div>
        {stage === 'thanks' && <div class="cwm-go-line cwm-pop">Thanks for playing!</div>}
        <SkipButton ctrl={ctrl} />
        {buttons && stage === 'over' && (
          <div class="cwm-go-btns">
            <button type="button" class="cwm-btn" onClick={() => setStage('thanks')}>
              [ CONTINUE ]
            </button>
            <button type="button" class="cwm-btn" onClick={goRoll}>
              [ CREDITS ]
            </button>
          </div>
        )}
      </div>
    );
  }
  const typedText = TEAR_THROUGH.join('\n').slice(0, typed).split('\n');
  const tearing = stage === 'tear' || stage === 'rip';
  return (
    <div class={`cwm-full cwm-credits ${tearing ? 'is-tearing' : ''} ${stage === 'rip' ? 'is-rip' : ''}`}>
      <div class="cwm-credits-roll" style={{ transform: `translateY(calc(${100 - (tearing ? 1 : y) * 55}vh - ${(tearing ? 1 : y) * 100}%))` }}>
        {lines.map((l, i) => (
          <div
            key={i}
            class={`cwm-cr-line ${tearing ? 'is-crack' : ''}`}
            style={tearing ? { transform: `translate(${((i * 37) % 23) - 11}px, ${((i * 53) % 19) - 9}px) rotate(${((i * 13) % 7) - 3}deg)` } : undefined}
          >
            {l === FAKE_GLITCH_LINE ? FAKE_GLITCH_LINE : l || ' '}
          </div>
        ))}
      </div>
      {tearing && (
        <div class="cwm-tear">
          <div class="cwm-tear-name">{morphStep(FAKE_GLITCH_LINE, FAKE_PATCH_LINE, morph)}</div>
          {typedText.map((l, i) => (
            <div key={i} class="cwm-tear-line">
              {l}
            </div>
          ))}
        </div>
      )}
      {stage === 'roll' && (
        <button type="button" class="cwm-skip" onClick={() => setStage('tear')}>
          skip
        </button>
      )}
      {tearing && <SkipButton ctrl={ctrl} />}
    </div>
  );
}

/** Ends the scene at once; claimed cinematics are still acknowledged to the engine. */
function SkipButton({ ctrl }: { ctrl: MetaController }) {
  return (
    <button type="button" class="cwm-skip" onClick={(e) => {
      e.stopPropagation();
      ctrl.skipScene();
    }}>
      skip
    </button>
  );
}

// ---------------------------------------------------------------------------
// Finale entry: the title screen nested inside itself
// ---------------------------------------------------------------------------

function Droste({ ctrl, reduced }: { ctrl: MetaController; reduced: boolean }) {
  const [depth, setDepth] = useState(0);
  const [fading, setFading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useTimeout(() => fading && ctrl.sceneDone(), reduced ? 100 : 900, [fading]);
  const press = (b: string, level: number) => {
    if (level !== depth) return;
    // the reply shows inside the scene; toast() records it in the game log
    const say = (t: string) => {
      setNote(t);
      ctrl.toast('sys', t);
    };
    if (b === 'NEW GAME') say("You're already playing.");
    else if (b === 'OPTIONS') say('There are no options. There never were.');
    else if (depth >= 2) setFading(true);
    else setDepth(depth + 1);
  };
  const frame = (level: number): JSX.Element => (
    <div class={`cwm-droste-frame ${level === depth ? 'is-active' : ''}`}>
      <div class="cwm-droste-title">CYBER WHATEVER</div>
      <div class="cwm-droste-sub">2028: The future already sucks.</div>
      <div class="cwm-droste-btns">
        {['NEW GAME', 'CONTINUE', 'OPTIONS'].map((b) => (
          <button key={b} type="button" class="cwm-btn" tabIndex={level === depth ? 0 : -1} onClick={() => press(b, level)}>
            [ {b} ]
          </button>
        ))}
      </div>
      <div class="cwm-droste-inner">
        <div class="cwm-droste-scale">{level < 4 ? frame(level + 1) : <div class="cwm-droste-frame cwm-droste-void" />}</div>
      </div>
    </div>
  );
  // the frame at level d sits at offset (0.5, 0.9)·(1 − 0.5^d) of the outer box, at scale 0.5^d
  const k = 1 - Math.pow(0.5, depth);
  const zoom = `scale(${Math.pow(2, depth)}) translate(${-50 * k}%, ${-90 * k}%)`;
  return (
    <div class={`cwm-full cwm-droste ${fading ? 'is-fading' : ''}`}>
      <div class="cwm-droste-box">
        <div class="cwm-droste-zoom" style={{ transform: zoom, transition: reduced ? 'none' : undefined }}>
          {frame(0)}
        </div>
      </div>
      {note && <div class="cwm-droste-note" role="status">{note}</div>}
      <SkipButton ctrl={ctrl} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Endings
// ---------------------------------------------------------------------------

type Step =
  | { k: 'lines'; lines: Line[] }
  | { k: 'choices' }
  | { k: 'card'; lines: string[] }
  | { k: 'para'; lines: string[] }
  | { k: 'fridge'; lines: string[] }
  | { k: 'closing'; lines: string[] }
  | { k: 'stats' }
  | { k: 'credits' }
  | { k: 'hold' }
  | { k: 'retention' };

function stepsFor(s: EndingScript): Step[] {
  const out: Step[] = [];
  if (s.lastWords) out.push({ k: 'lines', lines: s.lastWords.lines }, { k: 'choices' });
  out.push({ k: 'lines', lines: s.leadin });
  out.push({ k: 'card', lines: s.card });
  for (const p of s.paragraphs) out.push({ k: 'para', lines: p });
  if (s.fridge) out.push({ k: 'fridge', lines: s.fridge });
  out.push({ k: 'closing', lines: s.closing });
  if (s.id === 'retention') out.push({ k: 'retention' });
  else out.push({ k: 'stats' }, { k: 'credits' }, { k: 'hold' });
  return out;
}

function TypedBlock({ lines, reduced, onDone, speed = 34 }: { lines: string[]; reduced: boolean; onDone: (complete: () => void, done: boolean) => void; speed?: number }) {
  const text = lines.join('\n');
  const [shown, done, complete] = useTypewriter(text, speed, reduced);
  useEffect(() => onDone(complete, done), [done]);
  return (
    <div class="cwm-typed">
      {shown.split('\n').map((l, i) => (
        <p key={i}>
          <Rich text={l} />
        </p>
      ))}
      {!done && <span class="cwm-caret">▌</span>}
    </div>
  );
}

function Ending({ ctrl, script, reduced, resume }: { ctrl: MetaController; script: EndingScript; reduced: boolean; resume: boolean }) {
  const steps = useMemo(() => stepsFor(script), [script]);
  const last = steps.length - 1;
  const [i, setI] = useState(resume ? last : 0);
  const [reply, setReply] = useState<Line[] | null>(null);
  const skip = () => {
    setReply(null);
    if (script.id === 'jailbreak') ctrl.patchEscapes();
    setI(last);
  };
  const done = useRef<{ complete: () => void; done: boolean }>({ complete: () => {}, done: true });
  const step = steps[Math.min(i, steps.length - 1)];
  const advance = () => {
    if (!done.current.done) {
      done.current.complete();
      return;
    }
    if (step.k === 'choices' && !reply) return;
    if (step.k === 'credits' || step.k === 'hold' || step.k === 'retention') return;
    setReply(null);
    setI((x) => Math.min(steps.length - 1, x + 1));
  };
  // JAILBREAK: the tab title and favicon change during PATCH's exit
  useEffect(() => {
    if (script.id === 'jailbreak' && step.k === 'lines' && step.lines.some((l) => l.text.startsWith('[the tab title'))) ctrl.patchEscapes();
  }, [i]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advance();
      }
      if (e.key === 'Escape') {
        if (step.k === 'retention') ctrl.keepPlaying();
        else skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const report = (complete: () => void, d: boolean) => {
    done.current = { complete, done: d };
  };
  const body = (() => {
    switch (step.k) {
      case 'lines':
        return (
          <div class="cwm-end-lines">
            <TypedBlock key={i} lines={step.lines.map((l) => `${l.who ? `${WHO[l.who] ?? l.who}: ` : ''}${l.text}`)} reduced={reduced} onDone={report} />
          </div>
        );
      case 'choices': {
        const lw = script.lastWords!;
        if (reply) {
          return (
            <div class="cwm-end-lines">
              <TypedBlock key={`r${i}`} lines={reply.map((l) => `PATCH: ${l.text}`)} reduced={reduced} onDone={report} />
            </div>
          );
        }
        return (
          <div class="cwm-choices">
            {lw.choices.map((c) => (
              <button key={c.text} type="button" class="cwm-btn" onClick={(e) => {
                e.stopPropagation();
                setReply(c.reply);
              }}>
                {c.text}
              </button>
            ))}
          </div>
        );
      }
      case 'card':
        return (
          <div class="cwm-card">
            <div class="cwm-card-title">{step.lines[0]}</div>
            <div class="cwm-card-sub">{step.lines[1]}</div>
          </div>
        );
      case 'para':
        return <TypedBlock key={i} lines={step.lines} reduced={reduced} onDone={report} speed={38} />;
      case 'fridge':
        return (
          <div class="cwm-fridge" role="status">
            <Who who="fridge" />
            <TypedBlock key={i} lines={step.lines} reduced={reduced} onDone={report} />
          </div>
        );
      case 'closing':
        return (
          <div class="cwm-card">
            {step.lines.map((l, j) => (
              <div key={j} class={j === 0 ? 'cwm-card-title' : 'cwm-card-sub'}>
                {l}
              </div>
            ))}
          </div>
        );
      case 'stats':
        return (
          <div class="cwm-stats">
            <pre>{script.stats.join('\n')}</pre>
            <div class="cwm-stat-comment">{script.statComment}</div>
          </div>
        );
      case 'credits':
        return <Credits lines={script.credits} reduced={reduced} onEnd={() => setI(i + 1)} />;
      case 'hold':
        return (
          <div class="cwm-card">
            <div class="cwm-card-title">{script.hold[0]}</div>
            <div class="cwm-card-sub">{script.hold[1]}</div>
            <button type="button" class="cwm-btn" onClick={() => ctrl.toTitle()}>
              [ Title ]
            </button>
          </div>
        );
      case 'retention':
        return <RetentionCredits ctrl={ctrl} script={script} reduced={reduced} />;
    }
  })();
  const hint = step.k === 'para' || step.k === 'lines' || step.k === 'card' || step.k === 'fridge' || step.k === 'closing' || step.k === 'stats' || (step.k === 'choices' && reply);
  return (
    <div class={`cwm-full cwm-ending cwm-ending-${script.id}`} onClick={advance}>
      {body}
      {hint && <div class="cwm-advance">click · space</div>}
      {i < last && (
        <button type="button" class="cwm-skip" onClick={(e) => {
          e.stopPropagation();
          skip();
        }}>
          skip
        </button>
      )}
    </div>
  );
}

function Credits({ lines, reduced, onEnd }: { lines: string[]; reduced: boolean; onEnd: () => void }) {
  const dur = reduced ? 1500 : Math.max(20000, lines.length * 900);
  useTimeout(onEnd, dur + 400, []);
  return (
    <div class="cwm-credits">
      <div class="cwm-credits-roll" style={reduced ? { transform: 'none' } : { animation: `cwm-roll ${dur}ms linear forwards` }}>
        {lines.map((l, i) => (
          <div key={i} class="cwm-cr-line">
            {l || ' '}
          </div>
        ))}
      </div>
    </div>
  );
}

function RetentionCredits({ ctrl, script, reduced }: { ctrl: MetaController; script: EndingScript; reduced: boolean }) {
  const t0 = useRef(Date.now());
  const [season, setSeason] = useState(2);
  const [interrupt, setInterrupt] = useState<string | null>(null);
  const used = useRef<number[]>([]);
  const st = ctrl.stats();
  const creditsTime = () => fmtDuration(Date.now() - t0.current).replace('under a minute', `${Math.round((Date.now() - t0.current) / 1000)} seconds`);
  const loop = useMemo(
    () => [...(season === 2 ? script.credits : []), ...retentionLoop(season, ctrl.engine.state, st, creditsTime(), (season - 2) * 8, ctrl.engine.content)],
    [season],
  );
  const dur = reduced ? 6000 : loop.length * 800;
  useTimeout(() => setSeason((x) => x + 1), dur, [season]);
  useEffect(() => {
    const id = setInterval(() => {
      if (used.current.length >= RETENTION_INTERRUPTS.length) used.current = [];
      const left = RETENTION_INTERRUPTS.map((_, j) => j).filter((j) => !used.current.includes(j));
      const j = left[Math.floor(Math.random() * left.length)];
      used.current.push(j);
      setInterrupt(fillSlots(RETENTION_INTERRUPTS[j], null, { creditsTime: creditsTime(), season }));
      setTimeout(() => setInterrupt(null), 7000);
    }, 45000);
    return () => clearInterval(id);
  }, [season]);
  return (
    <div class="cwm-credits">
      {interrupt && <div class="cwm-interrupt">{interrupt}</div>}
      <div key={season} class="cwm-credits-roll" style={reduced ? { transform: 'none' } : { animation: `cwm-roll ${dur}ms linear forwards` }}>
        {loop.map((l, i) => (
          <div key={i} class="cwm-cr-line">
            {l || ' '}
          </div>
        ))}
      </div>
      <button
        type="button"
        class="cwm-btn cwm-keep"
        onClick={(e) => {
          e.stopPropagation();
          ctrl.keepPlaying();
        }}
      >
        [ KEEP PLAYING ]
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// THERE IS NO GAME
// ---------------------------------------------------------------------------

function NoGame({ reduced }: { reduced: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => x + 1), reduced ? 250 : 650);
    return () => clearInterval(id);
  }, [reduced]);
  // swallow every input: nothing responds
  useEffect(() => {
    const stop = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
    };
    const types = ['keydown', 'keyup', 'keypress', 'pointerdown', 'click', 'wheel', 'contextmenu'];
    for (const t of types) window.addEventListener(t, stop, true);
    return () => {
      for (const t of types) window.removeEventListener(t, stop, true);
    };
  }, []);
  const blank = n > RM_SEQUENCE.length + 2;
  return (
    <div class="cwm-full cwm-nogame" aria-hidden={blank ? 'true' : 'false'}>
      {!blank && RM_SEQUENCE.slice(0, n).map((l, i) => <div key={i} class="cwm-l"><Rich text={l} /></div>)}
      {blank && <span class="cwm-cursor">▌</span>}
    </div>
  );
}

/** A save that was left at an ending: show its last screen once the UI's title screen is gone. */
function ResumedEnding({ ctrl, script, reduced }: { ctrl: MetaController; script: EndingScript; reduced: boolean }) {
  const titleUp = () => !!document.querySelector('[data-ui="title-new"], [data-ui="title-continue"], [data-ui="title-start"]');
  const [hidden, setHidden] = useState(titleUp());
  useEffect(() => {
    if (!hidden) return;
    const id = setInterval(() => setHidden(titleUp()), 400);
    return () => clearInterval(id);
  }, [hidden]);
  if (hidden) return null;
  return <Ending ctrl={ctrl} script={script} reduced={reduced} resume />;
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function SceneView({ ctrl, scene, reduced }: { ctrl: MetaController; scene: Scene; reduced: boolean }) {
  switch (scene.kind) {
    case 'fakeWin':
      return <FakeWin ctrl={ctrl} />;
    case 'fakeCrash':
      return <FakeCrash ctrl={ctrl} reduced={scene.reduced || reduced} />;
    case 'fakeCredits':
      return <FakeCredits ctrl={ctrl} reduced={reduced} part={scene.part} />;
    case 'droste':
      return <Droste ctrl={ctrl} reduced={reduced} />;
    case 'ending':
      if (scene.resume) return <ResumedEnding ctrl={ctrl} script={scene.script} reduced={reduced} />;
      return <Ending ctrl={ctrl} script={scene.script} reduced={reduced} resume={false} />;
    case 'nogame':
      return <NoGame reduced={reduced} />;
  }
}

export function MetaRoot({ ctrl }: { ctrl: MetaController }) {
  const view = useView(ctrl);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ctrl.dead) return;
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) && t.id !== 'cwm-input';
      const sc = ctrl.view.get().scene;
      if (e.key === 'Escape' && sc && (sc.kind === 'fakeCredits' || sc.kind === 'droste' || sc.kind === 'fakeWin' || sc.kind === 'fakeCrash') && !ctrl.view.get().consoleOpen) {
        e.preventDefault();
        ctrl.skipScene();
        return;
      }
      if (e.key === '`' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        ctrl.openConsole(!ctrl.view.get().consoleOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctrl]);
  const scene = view.scene;
  const blank = scene?.kind === 'nogame';
  return (
    <div class="cwm-root" data-meta-phase={view.phase}>
      <style>{META_CSS}</style>
      {!blank && (
        <button
          type="button"
          class={`cwm-corner ${view.consoleVisible ? 'is-visible' : ''} ${view.phase === 3 ? 'is-hint' : ''}`}
          aria-label="meta console"
          title={view.consoleVisible ? 'meta console (`)' : ''}
          onClick={() => ctrl.openConsole(!view.consoleOpen)}
        >
          <span aria-hidden="true">▚_</span>
        </button>
      )}
      {scene && <SceneView ctrl={ctrl} scene={scene} reduced={view.reducedMotion} />}
      {view.flash > 0 && !blank && <div key={view.flash} class={`cwm-flash ${view.reducedMotion ? 'is-reduced' : ''}`} aria-hidden="true" />}
      {!blank && view.consoleOpen && <MetaConsole ctrl={ctrl} view={view} />}
    </div>
  );
}

