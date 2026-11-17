// Late-bound calls between rules modules. Avoids import cycles (combat <-> run <-> story).
// engine.ts wires these once at module load.
import type { K } from './core.ts';
import type { CombatOp, Id, MetaCommand } from './types.ts';

export const hooks: {
  combatOps: (k: K, ops: CombatOp[], target?: string) => void;
  nodeCleared: (k: K, node: Id) => void;
  advanceCycles: (k: K, n: number) => void;
  metaCommand: (k: K, cmd: MetaCommand, arg: string | undefined, confirm: boolean) => void;
} = {
  combatOps: () => { throw new Error('hooks.combatOps not wired'); },
  nodeCleared: () => { throw new Error('hooks.nodeCleared not wired'); },
  advanceCycles: () => { throw new Error('hooks.advanceCycles not wired'); },
  metaCommand: () => { throw new Error('hooks.metaCommand not wired'); },
};
