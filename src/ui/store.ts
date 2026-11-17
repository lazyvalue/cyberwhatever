// Tiny observable store + Preact hooks. No state library.
import { useEffect, useReducer, useState } from 'preact/hooks';

export interface Store<T> {
  get(): T;
  set(patch: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(fn: () => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const fns = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...p };
      fns.forEach((f) => f());
    },
    subscribe(fn) {
      fns.add(fn);
      return () => fns.delete(fn);
    },
  };
}

/** Re-render when any of the given subscribe functions fires. */
export function useSubscribe(...subs: ((fn: () => void) => () => void)[]): void {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const offs = subs.map((s) => s(() => force(0)));
    return () => offs.forEach((o) => o());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useStore<T extends object>(store: Store<T>): T {
  useSubscribe(store.subscribe);
  return store.get();
}

export function useMedia(query: string): boolean {
  const [m, setM] = useState(() => (typeof matchMedia !== 'undefined' ? matchMedia(query).matches : false));
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}
