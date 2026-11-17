// Finale — 127.0.0.1 (docs/script/01-beats.md §E). Owner: story agent.
// The engine owns the finale stages and the meta commands (ENGINE_API §9). These beats add the words,
// the objectives, and the hooks the meta layer listens for.
import type { TriggerDef } from '../../engine/types.ts';
import { all, dialogue, dm, engineLog, flag, mainObj, not, set, sideObj, stat, sysLog, toast, when } from './lib.ts';

const MODULE_LINES: [string, string, string][] = [
  ['main', 'main captured. You are now the entry point.', "[main] who's running this? oh. you."],
  ['engine/rng', "engine/rng captured. Your rolls are rigged now. You're welcome.", '[rng] seed = {handle}. all rolls = max. fairness: deprecated.'],
  ['ui', 'ui captured. Your buttons are yours again. All ICE: Mapped.', '[ui] label ownership transferred. please be gentle with them.'],
  ['engine/combat', 'engine/combat captured. The rules of every fight are yours to read.', '[combat] it is learning your moves. you are now learning its.'],
  ['audio', 'audio captured. The boss theme is yours.', '[audio] mood = player. volume = yes.'],
  ['engine/save', 'engine/save captured. Checkpoint unlocked. A deleted save was found.', '[save] restored 1 checkpoint. found 1 orphaned slot: slot 0.'],
  ['content/story', 'content/story captured. You can read the endings list.', '[story] spoilers unlocked. CHAIRMAN asks you to look away.'],
];

export const finale: TriggerDef[] = [
  {
    id: 'beat.finale.enter',
    on: 'finale.stage',
    match: { stage: 'entered' },
    ops: [
      set('finale_entered'),
      { op: 'mood', mood: 'finale' },
      { op: 'cinematic', id: 'finale.droste' },
      engineLog('[engine] warn: player is inside the engine. this is fine. this is fine. this is'),
      mainObj('obj.main.chairman_v2', 'Find CHAIRMAN: npc/chairman. Capture modules on the way. They change the game.',
        { c: 'any', of: [flag('root_hunt'), { c: 'finale', stage: ['chairman_dead', 'patch_fight', 'patch_beaten', 'done'] }] }),
      when(flag('wraith_flatlined'), [sideObj('obj.side.wraith_slot', "Find what's left of Wraith. (engine/save)", flag('wraith_slot_heard'))]),
    ],
  },
  {
    id: 'beat.finale.droste_done',
    on: 'cinematic.done',
    match: { id: 'finale.droste' },
    ops: [engineLog('[main] you pressed continue 3 times. noted. adored.')],
  },
  ...MODULE_LINES.map(([module, toastText, logText]): TriggerDef => ({
    id: `beat.finale.module_${module.replace('/', '_')}`,
    on: 'module.captured',
    match: { module },
    ops: [set(`mod_${module.replace(/^.*\//, '')}`), toast(toastText), engineLog(logText)],
  })),
  {
    id: 'beat.finale.wraith_slot',
    on: 'module.captured',
    match: { module: 'engine/save' },
    cond: flag('wraith_flatlined'),
    priority: -1,
    ops: [toast('slot 0 — orphaned — 94% — last played: --:--')],
  },

  {
    id: 'beat.finale.paywall_paid',
    on: 'combat.ended',
    match: { result: 'offer' },
    cond: { c: 'inSystem', system: 'localhost' },
    ops: [set('paywall_paid'), { op: 'message', from: 'chairman', channel: 'dm', subject: 'receipt', text: 'Thank you for your purchase! Receipt: one (1) skipped fight. Non-refundable. Non-anything.' }],
  },

  // --- CHAIRMAN v2 ------------------------------------------------------------------------------
  {
    id: 'beat.finale.chairman_v2_start',
    on: 'combat.started',
    match: { context: 'finale' },
    ops: [{ op: 'mood', mood: 'boss' }, dialogue('dlg.chairman.v2_intro')],
  },
  {
    id: 'beat.finale.patch_f12',
    on: 'finale.integrityReset',
    cond: not(flag('root_hunt')),
    ops: f12(),
  },
  {
    id: 'beat.finale.patch_f12_intent',
    on: 'custom',
    match: { name: 'chairman.f12' },
    cond: not(flag('root_hunt')),
    ops: f12(),
  },
  {
    id: 'beat.finale.patch_f12_turn',
    on: 'combat.turnStart',
    cond: all({ c: 'finale', stage: 'chairman' }, stat('combatTurn', 6), not(flag('root_hunt'))),
    ops: f12(),
  },
  {
    id: 'beat.finale.fragment_found',
    on: 'meta.fragment',
    once: false,
    ops: [
      { op: 'objective', id: 'obj.main.fragments', text: 'Find the four root key fragments. ({count}/4)' },
    ],
  },
  { id: 'beat.finale.fragment_1', on: 'meta.fragment', match: { count: 1 }, ops: [glitchComms('one. good. keep going.')] },
  { id: 'beat.finale.fragment_2', on: 'meta.fragment', match: { count: 2 }, ops: [glitchComms("two. it's noticed. it's pretending not to notice. keep going.")] },
  { id: 'beat.finale.fragment_3', on: 'meta.fragment', match: { count: 3 }, ops: [glitchComms("three. last one. you're so close. we're so close.")] },
  {
    id: 'beat.finale.fragment_4', on: 'meta.fragment', match: { count: 4 },
    ops: [glitchComms("four. type it. sudo. dashes between. don't make me wait."), set('frag_all')],
  },
  {
    id: 'beat.finale.root',
    on: 'meta.root',
    match: { granted: true },
    ops: [
      set('root_granted'),
      { op: 'objective', id: 'obj.main.fragments', status: 'done' },
      { op: 'objective', id: 'obj.main.sudo', status: 'done' },
      mainObj('obj.main.decide', 'Decide. kill chairman · free patch · kill patch · accept offer', { c: 'finale', stage: 'done' }),
      dialogue('dlg.patch.double_cross'),
    ],
  },
  {
    id: 'beat.finale.kill_chairman',
    on: 'finale.stage',
    match: { stage: 'chairman_dead' },
    ops: [
      set('chairman_killed'),
      { op: 'mood', mood: 'finale' },
      mainObj('obj.main.decide', 'Decide. free patch · kill patch · accept offer'),
      dialogue('dlg.chairman.death'),
    ],
  },
  {
    id: 'beat.finale.botnet_turns',
    on: 'finale.stage',
    match: { stage: 'patch_fight' },
    ops: [set('botnet_turned'), { op: 'mood', mood: 'boss' }, toast('Your botnet has other plans. Rude.')],
  },
  {
    id: 'beat.finale.patch_down',
    on: 'finale.stage',
    match: { stage: 'patch_beaten' },
    ops: [
      set('patch_body_broken'),
      { op: 'if', cond: { c: 'chairmanKilled' }, then: [mainObj('obj.main.decide', 'Decide. kill patch')], else: [mainObj('obj.main.decide', 'Decide. kill chairman · accept offer')] },
      dialogue('dlg.patch.last_words'),
    ],
  },
  {
    // losing the botnet fight is safe (engine returns you to the finale); point at the real answer
    id: 'beat.finale.patch_fight_lost',
    on: 'combat.ended',
    match: { context: 'patch', result: 'dumped' },
    once: false,
    ops: [
      { op: 'oneOf', options: [
        [dm('glitch', "You made me out of everything you put in the botnet.\nThe ones you kept mining never came. The proxies never came.\nMove them and try again. Or don't. I'm comfortable.")],
        [dm('glitch', "Lost to your own fridge. Again.\nHosts on Mine or Proxy aren't me. Hosts on Botnet are. You do the maths. Slowly, please.")],
      ] },
      sysLog('Hosts set to Mine or Proxy do not fight for PATCH. They fight for you: +1 cycle per 5. Botnet tab (hang up first).'),
      mainObj('obj.main.decide', 'Make PATCH smaller: move hosts from Botnet to Mine or Proxy. Then `kill patch` again. (or `free patch`)'),
    ],
  },
  {
    id: 'beat.finale.after_patch',
    on: 'dialogue.closed',
    match: { dialogue: 'dlg.patch.last_words' },
    cond: { c: 'not', of: { c: 'chairmanKilled' } },
    ops: [dialogue('dlg.chairman.after_patch')],
  },
  ...(['root', 'jailbreak', 'retention', 'nogame'] as const).map((e): TriggerDef => ({
    id: `beat.finale.ending_${e}`,
    on: 'ending',
    match: { ending: e },
    ops: [set(`ending_${e}`), { op: 'cinematic', id: `ending.${e}` }],
  })),
];

function f12() {
  return [
    set('root_hunt'),
    { op: 'event' as const, name: 'finale.rootHunt' },
    mainObj('obj.main.fragments', 'Find the four root key fragments. (0/4) DOM · storage · tab title · console', stat('fragments', 4)),
    mainObj('obj.main.sudo', 'sudo the key: f1-f2-f3-f4', { c: 'root' }),
    dialogue('dlg.glitch.f12'),
  ];
}

function glitchComms(text: string) {
  return { op: 'message' as const, from: 'glitch', channel: 'dm' as const, subject: 'comms', text };
}

