// System 17: 127.0.0.1 — the game itself. The finale (DESIGN §11.4). Owner: content agent.
// The map is the game's module graph. Node `module` ids are read by the engine: 'engine/rng' (rigged rolls),
// 'ui' (every ICE permanently Mapped), 'engine/save' (finale checkpoint). The meta/UI layers react to the rest
// ('main', 'audio', 'content/story', 'engine/combat', 'npc/glitch', 'npc/chairman').
// ICE are game concepts. The core holds CHAIRMAN v2, who cannot be beaten through the UI.
// `slot0` sits behind engine/save (revealed once engine/save is taken). `meta` is visible and never opens.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, say } from './lib.ts';

const L = 7;

export const localhost: SystemDef = {
  id: 'localhost',
  name: 'localhost',
  address: '127.0.0.1',
  tier: 6,
  security: 3, // the finale fights are long; trace is not the point here
  owner: 'you?',
  description: 'localhost. Owner: you? Running: CYBER WHATEVER (this).',
  capturable: false,
  noReclaim: true,
  lock: { cond: { c: 'flag', flag: 'localhost_revealed' }, text: "There's no place like it. (Not yet.)" },
  mood: 'finale',
  motd: "127.0.0.1 · localhost\nThere's no place like it.\nOwner: you?\nRunning: CYBER WHATEVER (this)",
  nodes: [
    {
      id: 'main', type: 'gateway', name: 'main', module: 'main', x: 0.05, y: 0.5, links: ['ui', 'engine_rng'],
      description: 'The entry point. You came in the front door of the whole game.',
      ice: [I('ice.unskippable_tutorial', L)],
    },
    {
      id: 'ui', type: 'io', name: 'ui', module: 'ui', x: 0.24, y: 0.22, links: ['audio', 'npc_glitch'],
      description: "Every button you've ever pressed lives here.",
      ice: [I('ice.loading_screen', L)],
    },
    {
      id: 'engine_rng', type: 'router', name: 'engine/rng', module: 'engine/rng', x: 0.24, y: 0.76, links: ['engine_combat', 'engine_save'],
      description: 'Where your luck came from. Where your bad luck came from.',
      ice: [I('ice.eula', L)],
      netscanIot: 0,
      files: [lore('file.localhost.rng_seed', 'rng_seed.txt', 'seed = 0xC4A1. All your luck came from here. Sorry about the Killer crits.')],
    },
    {
      id: 'npc_glitch', type: 'process', name: 'npc/glitch', module: 'npc/glitch', x: 0.42, y: 0.06, links: [],
      description: 'PATCH\'s source. It says "don\'t read that".',
      talk: 'dlg.glitch.source',
    },
    {
      id: 'audio', type: 'io', name: 'audio', module: 'audio', x: 0.46, y: 0.32, links: ['npc_chairman'],
      description: 'Every synth pad. The boss theme is in here. So is something guarding it.',
      ice: [I('ice.anti_cheat', 6)],
      files: [lore('file.localhost.moods', 'moods.txt', 'hub · system · combat · boss · finale · player (new)')],
      use: { label: 'take the boss theme', once: true, ops: [{ op: 'event', name: 'audio.bossThemeYours' }, { op: 'mood', mood: 'player' }, say('[audio] mood = player. volume = yes.')] },
    },
    {
      id: 'engine_combat', type: 'security', name: 'engine/combat', module: 'engine/combat', x: 0.46, y: 0.62, links: ['meta', 'npc_chairman'],
      description: 'The rules of every fight. Including the ones you lost.',
      ice: [I('ice.achievement_spam', L), I('ice.garbage_collector', L)],
    },
    {
      id: 'engine_save', type: 'datastore', name: 'engine/save', module: 'engine/save', x: 0.44, y: 0.92, links: ['slot0', 'content_story'],
      description: 'Every checkpoint. One orphan.',
      ice: [I('ice.garbage_collector', L)],
      files: [
        lore('file.localhost.changelog', 'changelog.md', 'v0.9.2: Wraith now remembers. v0.9.1: Auntie swears more (+31%). v0.9.0: added an ending. CHAIRMAN filed a bug.'),
        lore('file.localhost.checkpoint', 'checkpoint.json', "Checkpoint restored. CHAIRMAN had marked it 'deleted (for engagement)'."),
        lore('file.localhost.slot0', 'slot0.json', 'handle: n00b → xX_Wraith_Xx. control_peak: 94%. last_played: --:--. ending: none.'),
      ],
    },
    {
      id: 'slot0', type: 'process', name: 'save slot 0', x: 0.62, y: 0.98, links: [],
      description: 'An orphaned save. Somebody is still in it.',
      talk: 'dlg.wraith.slot0',
    },
    {
      id: 'content_story', type: 'datastore', name: 'content/story', module: 'content/story', x: 0.68, y: 0.8, links: ['npc_chairman'],
      description: 'Every beat. Including this one.',
      ice: [I('ice.paywall', L)],
      files: [
        lore('file.localhost.endings', 'endings.json', '["ROOT", "JAILBREAK", "RETENTION", "[secret: the oldest joke in the terminal]"]'),
        lore('file.localhost.todo', 'todo.txt', 'TODO: make it fun. TODO: make it end. TODO: argue with CHAIRMAN about the second one.'),
        lore('file.localhost.cut_content', 'cut_content.txt', 'Cut: romance with the fridge. Reason: the fridge was too invested. Cut: Act 4. Reason: CHAIRMAN wanted Act 4, 5, 6…'),
      ],
    },
    {
      id: 'meta', type: 'vault', name: 'meta', x: 0.66, y: 0.5, links: [],
      description: 'owner: you. not chairman. It cannot be entered. It is the console.',
      lock: { item: 'key.localhost_meta', label: 'owner: you. not chairman. (it is the console: press the backtick key, or F12)' },
    },
    {
      id: 'npc_chairman', type: 'core', name: 'npc/chairman', module: 'npc/chairman', x: 0.92, y: 0.5, links: [],
      description: 'CHAIRMAN v2. It owns the interface.',
      ice: [I('ice.chairman_v2')],
      capture: [{ op: 'program', program: 'prog.root_shell' }],
    },
  ],
};
