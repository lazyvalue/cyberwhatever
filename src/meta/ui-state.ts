// The interface-corruption state the UI honours (contract in index.ts). A tiny observable store.

export interface MetaUiState {
  scrambleLabels: boolean;
  endTurnDisabled: boolean;
  buttonsDrift: boolean;
  fakeInfiniteIntegrity: boolean;
  riggedRolls: boolean;
  hudOverride: Record<string, string>;
  glitch: number;
  consoleHint: boolean;
  /** Non-null while a full-screen meta overlay is up: 'ending' | 'fakeCredits' | 'droste' | 'fakeCrash' | 'fakeWin' | 'nogame'. */
  overlay: string | null;
}

export const DEFAULT_UI: MetaUiState = Object.freeze({
  scrambleLabels: false,
  endTurnDisabled: false,
  buttonsDrift: false,
  fakeInfiniteIntegrity: false,
  riggedRolls: false,
  hudOverride: Object.freeze({}) as Record<string, string>,
  glitch: 0,
  consoleHint: false,
  overlay: null,
}) as MetaUiState;

export class Observable<T> {
  private listeners = new Set<() => void>();
  constructor(private value: T) {}
  get(): T {
    return this.value;
  }
  set(next: T): void {
    if (next === this.value) return;
    this.value = next;
    for (const fn of [...this.listeners]) {
      try {
        fn();
      } catch {
        /* a broken listener must not break the game */
      }
    }
  }
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

function sameRecord(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
}

export function sameUi(a: MetaUiState, b: MetaUiState): boolean {
  return (
    a.scrambleLabels === b.scrambleLabels &&
    a.endTurnDisabled === b.endTurnDisabled &&
    a.buttonsDrift === b.buttonsDrift &&
    a.fakeInfiniteIntegrity === b.fakeInfiniteIntegrity &&
    a.riggedRolls === b.riggedRolls &&
    a.glitch === b.glitch &&
    a.consoleHint === b.consoleHint &&
    a.overlay === b.overlay &&
    sameRecord(a.hudOverride, b.hudOverride)
  );
}

export const uiStore = new Observable<MetaUiState>(DEFAULT_UI);

/** Merge a patch into the UI state; notifies only on a real change (new object each time). */
export function patchUi(patch: Partial<MetaUiState>): void {
  const cur = uiStore.get();
  const next = { ...cur, ...patch };
  if (sameUi(cur, next)) return;
  uiStore.set(next);
}

/** Deterministic-looking label scrambler for Psychotrope and CHAIRMAN. */
export function scrambleText(text: string, salt = 7): string {
  const glyphs = '#%&@$*+=?!░▒▓<>/\\|';
  let out = '';
  let h = salt;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    h = (h * 31 + c.charCodeAt(0) + i) >>> 0;
    if (c === ' ' || c === '.' || c === '_') out += c;
    else if (h % 3 === 0) out += glyphs[h % glyphs.length];
    else if (h % 3 === 1) out += c.toUpperCase() === c ? c.toLowerCase() : c.toUpperCase();
    else out += String.fromCharCode(((c.charCodeAt(0) - 32 + (h % 7) + 1) % 94) + 32);
  }
  return out;
}
