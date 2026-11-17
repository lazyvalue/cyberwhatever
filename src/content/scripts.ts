// Escape-hatch scripts for bosses and special story programs. Owner: content agent.
// Keep these small: prefer data (CombatOp / StoryOp) whenever the vocabulary can express it.
import type { CombatOp, IceScript, ProgramDef, ScriptApi, ScriptFn } from '../engine/types.ts';

// CHAIRMAN v2 UI tampering schedule (05-meta.md §8), by fight turn; repeats from turn 3 after turn 8.
// Each intent emits a combat.notify with a `chairman.*` style that the UI/meta layer acts on.
const CHAIRMAN_SCHEDULE = ['move_end_turn', 'labels', 'infinity', 'end_turn_off', 'fakewin', 'f12', 'crash', 'normal'];

export const iceScripts: Record<string, IceScript> = {
  chairman2: {
    chooseIntent(api) {
      const t = api.ice.turns + 1; // the turn it will act on
      if (t > 8 && (t - 8) % 6 === 0) return 'offer';
      const i = t <= 8 ? t - 1 : 2 + ((t - 9) % 6);
      return CHAIRMAN_SCHEDULE[i];
    },
  },
};

/** Loaded programs ranked by uses this fight (most used first), excluding specials, daemons and this program. */
function mostUsed(api: ScriptApi, exclude: string[]): ProgramDef[] {
  const cs = api.state.combat;
  if (!cs) return [];
  return Object.entries(cs.programs)
    .filter(([id, p]) => p.uses > 0 && !p.evicted && !exclude.includes(id))
    .map(([id, p]) => ({ def: api.content.programs[id], uses: p.uses }))
    .filter((x) => x.def && x.def.category !== 'daemon' && x.def.category !== 'special')
    .sort((a, b) => b.uses - a.uses)
    .map((x) => x.def);
}

/** Scale the numbers of a program's ops (damage, shield, repair, statuses) by `m`. */
function scaleOps(ops: CombatOp[], m: number): CombatOp[] {
  return ops.map((op): CombatOp => {
    switch (op.op) {
      case 'damage': return { ...op, amount: Math.max(1, Math.round(op.amount * m)) };
      case 'shield': case 'repair': return { ...op, amount: Math.max(1, Math.round(op.amount * m)) };
      case 'ifIce': return { ...op, ops: scaleOps(op.ops, m), ...(op.else ? { else: scaleOps(op.else, m) } : {}) };
      default: return op;
    }
  });
}

export const scripts: Record<string, ScriptFn> = {
  /** prog.wraith_echo: your most-used program again, at full strength (ignores signature). */
  echo(api) {
    const [p] = mostUsed(api, ['prog.wraith_echo', 'prog.duet']);
    if (!p) {
      api.emit({ type: 'combat.notify', text: 'echo: nothing to repeat yet.' });
      return;
    }
    api.emit({ type: 'combat.notify', text: `echo: ${p.name}, one more time.` });
    api.combatOps(p.ops);
  },
  /** prog.duet: your two most-used programs again at 60%. */
  duet(api) {
    const ps = mostUsed(api, ['prog.wraith_echo', 'prog.duet']).slice(0, 2);
    if (ps.length === 0) {
      api.emit({ type: 'combat.notify', text: 'duet: nobody to sing with yet.' });
      return;
    }
    api.emit({ type: 'combat.notify', text: `duet: ${ps.map((p) => p.name).join(' + ')}, in harmony (60%).` });
    for (const p of ps) {
      if (!api.state.combat) return;
      api.combatOps(scaleOps(p.ops, 0.6));
    }
  },
  /** Example story script: logs an engine warning that quotes the player's handle. */
  engineWarnHandle(api) {
    api.storyOps([{ op: 'log', level: 'engine', text: `[engine] warn: npc 'glitch' read state.player.handle ('${api.state.player.handle}') outside dialogue tick` }]);
  },
};
