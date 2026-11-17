// Fourth-wall phases (05-meta.md): P0 Acts 1–2 · P1 Act 3 before 127.0.0.1 · P2 finale before the
// root hunt · P3 root hunt · P4 root granted. Derived from engine state, story flags as a second source.
import type { GameState } from '../engine/index.ts';

export type Phase = 0 | 1 | 2 | 3 | 4;

export function flag(s: GameState, f: string): boolean {
  const v = s.story.flags[f];
  return v !== undefined && v !== false && v !== 0 && v !== '';
}

export function isRoot(s: GameState): boolean {
  return s.meta.root || flag(s, 'root_granted');
}

export function inFinale(s: GameState): boolean {
  return s.meta.finale !== 'none' || flag(s, 'finale_entered');
}

export function isAct3(s: GameState): boolean {
  return (
    s.meta.unlocked ||
    flag(s, 'act3_started') ||
    flag(s, 'meta_console_visible') ||
    flag(s, 'patch_revealed') ||
    flag(s, 'act2_done') ||
    flag(s, 'localhost_revealed')
  );
}

export function isAct2(s: GameState): boolean {
  return flag(s, 'act1_done') || flag(s, 'act2_started') || isAct3(s);
}

/** The root hunt started: the story flag, any engine evidence of it, or our own persisted fallback. */
export function rootHuntStarted(s: GameState, localFallback: boolean): boolean {
  if (flag(s, 'root_hunt')) return true;
  if (!inFinale(s)) return false;
  return (
    localFallback ||
    (s.meta.fragments ?? []).some(Boolean) ||
    (s.meta.integrityResets ?? 0) > 0
  );
}

export function phaseOf(s: GameState, localRootHunt = false): Phase {
  if (isRoot(s)) return 4;
  if (inFinale(s)) return rootHuntStarted(s, localRootHunt) ? 3 : 2;
  if (isAct3(s)) return 1;
  return 0;
}

export function actOf(s: GameState): number {
  if (isAct3(s)) return 3;
  if (isAct2(s)) return 2;
  return 1;
}
