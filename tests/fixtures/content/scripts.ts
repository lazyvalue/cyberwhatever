// Escape-hatch scripts for bosses and special story programs. Owner: content agent.
// Keep these small: prefer data (CombatOp / StoryOp) whenever the vocabulary can express it.
import type { IceScript, ScriptFn } from '../../../src/engine/types.ts';

export const iceScripts: Record<string, IceScript> = {
  /** CHAIRMAN v2: every third turn it shows a fake "YOU WIN", every fifth it makes its offer. */
  chairman2: {
    chooseIntent(api) {
      const t = api.ice.turns + 1;
      if (t % 5 === 0) return 'offer';
      if (t % 3 === 0) return 'fakewin';
      return 'synergy';
    },
  },
};

export const scripts: Record<string, ScriptFn> = {
  /** Example story script: logs an engine warning that quotes the player's handle. */
  engineWarnHandle(api) {
    api.storyOps([{ op: 'log', level: 'engine', text: `[engine] warn: npc 'glitch' read state.player.handle ('${api.state.player.handle}') outside dialogue tick` }]);
  },
};
