// System 17: 127.0.0.1, the game itself (STUB: the content/story agents own the real finale).
// Node `module` ids are read by the engine: 'engine/rng' (rigged rolls), 'ui' (ICE always Mapped),
// 'engine/save' (finale checkpoint). The meta layer reads state.meta.modules for the rest.
import type { SystemDef } from '../../../../src/engine/types.ts';

export const localhost: SystemDef = {
  id: 'localhost',
  name: 'localhost',
  address: '127.0.0.1',
  tier: 6,
  security: 5,
  owner: 'you?',
  description: 'There is no place like it.',
  capturable: false,
  noReclaim: true,
  mood: 'finale',
  nodes: [
    { id: 'main', type: 'gateway', name: 'main', module: 'main', x: 0.08, y: 0.5, links: ['ui', 'rng'], ice: [{ ice: 'tutorial' }] },
    { id: 'ui', type: 'router', name: 'ui', module: 'ui', x: 0.3, y: 0.25, links: ['save', 'audio'], ice: [{ ice: 'paywall' }] },
    { id: 'rng', type: 'security', name: 'engine/rng', module: 'engine/rng', x: 0.3, y: 0.75, links: ['combat'], ice: [{ ice: 'eula' }] },
    { id: 'save', type: 'datastore', name: 'engine/save', module: 'engine/save', x: 0.55, y: 0.15, links: ['story'], ice: [{ ice: 'gc' }] },
    { id: 'audio', type: 'io', name: 'audio', module: 'audio', x: 0.55, y: 0.4, links: ['chairman'],
      use: { label: 'take the boss theme', once: true, ops: [{ op: 'event', name: 'audio.bossThemeYours' }] } },
    { id: 'combat', type: 'process', name: 'engine/combat', module: 'engine/combat', x: 0.55, y: 0.8, links: ['chairman'] },
    { id: 'story', type: 'datastore', name: 'content/story', module: 'content/story', x: 0.75, y: 0.15, links: ['chairman'],
      files: [{ id: 'lh-endings', name: 'endings.ts', kind: 'lore', text: 'ROOT. JAILBREAK. RETENTION. (one more, not listed)' }] },
    { id: 'chairman', type: 'core', name: 'npc/chairman', module: 'npc/chairman', x: 0.92, y: 0.5, links: [], ice: [{ ice: 'chairman2' }] },
  ],
};
