// Act 2 — Operator (docs/script/01-beats.md §C). Owner: story agent.
import type { TriggerDef } from '../../engine/types.ts';
import {
  all, address, bbs, comms, dialogue, dm, elapsed, engineLog, flag, hasItem, inHub, mainObj, mark, not, owns, set,
  sideObj, sysLog, toast, when,
} from './lib.ts';

export const act2: TriggerDef[] = [
  {
    id: 'beat.act2.start',
    cond: all(flag('act1_done'), inHub, { c: 'not', of: { c: 'inCombat' } }),
    ops: [
      set('act2_started'), set('act', 2), mark('act2_mark'),
      dm('auntie', "Operator. That's what they call you now.\nWell. That's what *I* call you. Pay goes up.\nSo does the ICE. So does the heat. It's like a career."),
      dm('auntie', 'coinbasement.exchange. Where $HODL lives.\nOwn the exchange and you own the price. Imagine.\nSeamless Living™— Christ. Autocorrect. I hate those bastards.\nStay in the loop.'),
      dm('whisper', "Congratulations on your promotion.\nI have a file on you now. You're worth a file.\nCome and see. Bring money."),
      address('coinbasement', 'auntie', 'The $HODL exchange. In a basement. Own it to move the price.'),
      mainObj('obj.main.coinbasement', 'Own the exchange. coinbasement.exchange', owns('coinbasement')),
      sideObj('obj.side.whisper_self', 'Mx. Whisper has a file on you.', flag('whisper_bought_self_2')),
    ],
  },
  {
    id: 'beat.act2.auntie_dead_rumour',
    on: 'hub.entered',
    cond: all(flag('act2_started'), elapsed('act2_mark', 40)),
    ops: [
      set('rumour_auntie_dead'),
      bbs('wraith', "who keeps posting as auntie static\nauntie's been dead 6 years n00b. grid riot. there was a MEMORIAL thread\nwhoever ur talking to its not her\n-xX_Wraith_Xx"),
      bbs('auntie', 'Rumours of my death, et cetera. Mind your business, Wraith.\nKiddo, ignore the troll. Stay in the loop.'),
    ],
  },

  // --- coinbasement ---------------------------------------------------------------------------
  {
    id: 'beat.act2.coinbasement_done',
    on: 'system.owned',
    match: { system: 'coinbasement' },
    ops: [
      set('coinbasement_done'),
      dm('auntie', "You own an exchange. Pump it, dump it, don't care.\nJust don't get bored. Bored is how good operators quit."),
      dm('auntie', "Next: Chrome & Bone. Doc Tungsten's clinic. Not the shop. The backend.\nchromeandbone.clinic. Doc won't mind. Doc will mind. Do it anyway."),
      engineLog("[engine] warn: npc 'auntie' and npc 'chairman' share voice profile 'warm_v3'"),
      address('chromebone', 'auntie', "Doc's clinic backend. First black ICE. Cold storage holds half a vault key."),
      mainObj('obj.main.chromebone', "Break into Chrome & Bone's backend. chromeandbone.clinic", owns('chromebone')),
      // karaoke invite (beat.act2.karaoke_invite)
      bbs('wraith', "n00b. come to neonlarynx.bar. booth 4.\ni want to see ur face when i beat u.\nalso i have a question. not a troll question. a real one.\n-xX_Wraith_Xx"),
      address('karaoke', 'wraith', 'Karaoke bar. Booth 4 is reserved. Permanently.'),
      sideObj('obj.side.karaoke', 'Booth 4. Wraith wants a word. neonlarynx.bar', flag('karaoke_done')),
    ],
  },
  {
    id: 'beat.act2.key_a',
    on: 'item.gained',
    match: { item: 'key.orbital_a' },
    ops: [dm('auntie', 'That key you found? First Orbital Trust uses two-key vaults.\nSomebody somewhere has the other half. Hang on to it.')],
  },
  {
    id: 'beat.act2.key_b',
    on: 'item.gained',
    match: { item: 'key.orbital_b' },
    ops: [dm('glitch', "th4t's the other key. u h4ve both n0w.\ni d0nt kn0w how i kn0w. lucky guess. i'm lucky")],
  },
  {
    id: 'beat.act2.orbital_unlocked',
    cond: all(hasItem('key.orbital_a'), hasItem('key.orbital_b')),
    ops: [
      set('orbital_unlocked'),
      { op: 'item', item: 'key.orbital_pair' },
      dm('auntie', "Two keys. One vault. One bank in actual orbit.\nFirst Orbital Trust. firstorbital.trust.\nThat's a heist, kiddo. A real one. I'm getting misty."),
      address('orbital', 'auntie', 'A bank 412 km up. Two-key vault. Biggest score in town.'),
      sideObj('obj.side.orbital', 'Two keys. One vault. One bank in orbit. firstorbital.trust', flag('orbital_done')),
    ],
  },
  {
    id: 'beat.act2.orbital_done',
    on: 'node.unlocked',
    match: { system: 'orbital', node: 'vault' },
    ops: [set('orbital_done'), { op: 'objective', id: 'obj.side.orbital', status: 'done' }],
  },

  // --- chromebone -----------------------------------------------------------------------------
  {
    id: 'beat.act2.first_psychotrope',
    on: 'combat.started',
    match: { defs: 'ice.psychotrope' },
    ops: [
      comms('auntie', "Red ICE with a skull. That's black ICE.\nIt doesn't hit your deck, kiddo. It hits *you*.\nIf your buttons start lying, trust your fingers, not your eyes."),
      engineLog('[ui] warn: label integrity compromised by in-world entity. this should not be possible.'),
    ],
  },
  {
    id: 'beat.act2.chromebone_done',
    on: 'system.owned',
    match: { system: 'chromebone' },
    ops: [
      set('chromebone_done'),
      dm('auntie', "Doc's backend is yours. Find anything gross?\nEverything in there is gross. That's what backends are for."),
      dm('auntie', 'Those upload records. The Church of the Seamless.\nThey buy brains off Doc by the pound.\nseamless.church. Go see what heaven costs.'),
      dm('doc', "You hacked my backend! Naughty. Brave. Naughty.\nNo hard feelings. Lots of soft ones. They're in jars.\nCome by. I'll give you a discount on anything removable."),
      address('seamless', 'auntie', 'Church of the Seamless. Uploads, sold as salvation. The choir is behind the sanctum.'),
      mainObj('obj.main.seamless', 'Find out what heaven costs. seamless.church', flag('church_choice_made')),
    ],
  },
  {
    id: 'beat.act2.deacon_spam',
    on: 'hub.entered',
    cond: flag('chromebone_done'),
    ops: [dm('deacon', 'Greetings, {handle}. Have you considered eternity?\nThe Church of the Seamless offers salvation in three convenient tiers.\nYour first migration is free. Terms apply. The terms are eternal.\nseamless.church', 'a free migration')],
  },

  // --- church choice (flags are set by dlg.seamless.choir) -------------------------------------
  {
    id: 'beat.act2.church_choice',
    on: 'story.flag',
    match: { flag: 'church_choice_made' },
    ops: [
      mainObj('obj.main.after_church', 'Hang up. Auntie has a job lined up.', flag('aegis_offered')),
      when(flag('church_freed'), [
        dm('deacon', 'You have released four premium souls into the open network.\nThey will be unlicensed. Unsupported. Unbilled.\nI will pray for you. Prayer is a paid add-on. This one is on me.'),
        dm('glitch', "u let them go. huh.\ni didn't kn0w you could do that."),
      ]),
      when(flag('church_deleted'), [
        dm('deacon', 'Four migrations, cancelled. We have sent their families a condolence invoice.\nDo not worry. Grief is covered under most plans.'),
      ]),
      when(flag('church_enslaved'), [
        dm('deacon', 'Ah. You have discovered the *Enterprise* tier.\nWe do not judge, {handle}. We invoice.'),
        dm('glitch', "oh. oh they're big. four big ones.\nth4nk you. i mean. good for the botnet. 4 safety."),
      ]),
    ],
  },
  {
    id: 'beat.act2.aegis_offer',
    on: 'hub.entered',
    cond: flag('church_choice_made'),
    ops: [
      set('aegis_offered'),
      dm('auntie', 'Aegis Dynamics. Military. They make black ICE and test it on interns.\nThere\'s a milspec icebreaker in their lab.\nGet it and nothing short of KH can stop you.'),
      dm('auntie', "Wraith's going for it too. Little shit thinks they're faster than you.\naegis-dynamics.mil. Stay in the loop."),
      bbs('wraith', 'going to aegis. if i get the icebreaker i hit 95.\none more than last time.\n-xX_Wraith_Xx'),
      address('aegis', 'auntie', 'Military contractor. Black ICE everywhere, all labelled. The icebreaker is in the Black Lab.'),
      mainObj('obj.main.aegis', 'Beat Wraith to the milspec icebreaker. aegis-dynamics.mil', { c: 'program', program: 'prog.milspec_icebreaker' }),
      when(not(hasItem('pw.aegis_blacklab')), [dm('whisper', 'The Aegis lab has a password. Wraith knows it. I sell it. One of us is cheaper.')]),
    ],
  },

  // --- aegis ----------------------------------------------------------------------------------
  {
    id: 'beat.act2.aegis_wraith_ahead',
    on: 'run.started',
    match: { system: 'aegis' },
    ops: [comms('wraith', "you're late, n00b. i'm three nodes in.\nsee you at the core. probably. maybe.")],
  },
  {
    id: 'beat.act2.wraith_flatline',
    on: 'node.cleared',
    match: { system: 'aegis', node: 'testrange' },
    cond: not(flag('wraith_flatlined')),
    ops: wraithFlatline(),
  },
  {
    id: 'beat.act2.wraith_flatline_lab',
    on: 'node.revealed',
    match: { system: 'aegis', nodes: 'blacklab' },
    cond: not(flag('wraith_flatlined')),
    ops: wraithFlatline(),
  },
  {
    id: 'beat.act2.wraith_flatline_sneak',
    on: 'node.sneak',
    match: { system: 'aegis', node: 'testrange', success: true },
    cond: not(flag('wraith_flatlined')),
    ops: wraithFlatline(),
  },
  {
    id: 'beat.act2.aegis_done',
    on: 'program.gained',
    match: { program: 'prog.milspec_icebreaker' },
    ops: [
      set('icebreaker_got'),
      mainObj('obj.main.after_aegis', 'Hang up. Auntie wants a word.', flag('deadmans_offered')),
      dm('glitch', "you got it. you're ok. you're ok right?\ni saw the log. about wraith.\ni'm sorry. i'm always sorry. it's a thing i am."),
    ],
  },
  {
    id: 'beat.act2.deadmans_offer',
    on: 'hub.entered',
    cond: flag('icebreaker_got'),
    ops: [dialogue('dlg.auntie.deadmans_offer')],
  },
  {
    id: 'beat.act2.glitch_warns',
    on: 'story.flag',
    match: { flag: 'deadmans_offered' },
    ops: [dm('glitch', "hey. about the switch job.\nn0thing. it's nothing. just. take a lot of hosts. in the botnet.\n4 safety. this time i mean it.")],
  },

  // --- deadman's switch: the trap ---------------------------------------------------------------
  {
    id: 'beat.act2.deadmans_trap',
    on: 'run.started',
    match: { system: 'deadmans' },
    ops: [set('deadmans_entered'), comms('auntie', "That's my kiddo. In you go. Don't stop.")],
  },
  {
    id: 'beat.act2.deadmans_trap_2',
    on: 'node.cleared',
    match: { system: 'deadmans', node: 'testament' },
    ops: [comms('auntie', "Keep going. You're doing great. You're doing so great.")],
  },
  {
    id: 'beat.act2.deadmans_trap_3',
    on: 'node.cleared',
    match: { system: 'deadmans', node: ['codicil', 'executor'] },
    ops: [comms('auntie', 'Sorry, kiddo. Nothing personal. You were just *so* engaged.')],
  },
  {
    id: 'beat.act2.deadmans_noexit',
    on: 'action.rejected',
    match: { action: ['combat/jackOut', 'run/jackOut', 'combat/disengage'] },
    cond: { c: 'inSystem', system: 'deadmans' },
    ops: [sysLog('hang up: line busy. thank you for staying.')],
  },
  {
    id: 'beat.act2.deadmans_glitch',
    on: 'trace.changed',
    match: { value: { gte: 80 } },
    cond: { c: 'inSystem', system: 'deadmans' },
    ops: [comms('glitch', '{handle}. hold on. hold on hold on hold on')],
  },
  {
    id: 'beat.act2.fake_game_over',
    on: 'run.ended',
    match: { system: 'deadmans', reason: 'scripted' },
    ops: [
      { op: 'mood', mood: 'finale' },
      {
        op: 'cinematic', id: 'deadmans.gameOver',
        data: { title: 'GAME OVER', lines: ['{handle} was traced at deadmans.switch.', 'Control: {control} · Rep: {rep} · Time played: {playtime}'], buttons: ['CONTINUE', 'CREDITS'] },
      },
    ],
  },
  {
    id: 'beat.act2.fake_credits',
    on: 'cinematic.done',
    match: { id: 'deadmans.gameOver' },
    ops: [{ op: 'cinematic', id: 'deadmans.fakeCredits', data: { lines: fakeCredits(), tearLine: 'gl1tch ........................... gl1tch', tearTo: 'PATCH ........................... PATCH' } }],
  },
  {
    id: 'beat.act2.tear_through_open',
    on: 'cinematic.done',
    match: { id: 'deadmans.fakeCredits' },
    ops: [dialogue('dlg.glitch.tear_through')],
  },
  {
    // fires when dlg.glitch.tear_through closes (its last node sets `deadmans_done`)
    id: 'beat.act2.tear_through',
    on: 'dialogue.closed',
    match: { dialogue: 'dlg.glitch.tear_through' },
    cond: flag('deadmans_done'),
    ops: [
      set('patch_revealed'), set('act2_done'),
      { op: 'freezeCredits', ratio: 0.5 },
      { op: 'setHeat', value: 75 },
      { op: 'item', item: 'pw.deaddrop_sysop' },
      { op: 'item', item: 'item.frozen_funds' },
      { op: 'objective', id: 'obj.main.deadmans', status: 'done' },
      sideObj('obj.side.recover_funds', 'Get your frozen credits back. (orbital vault, or the Dead Drop ledger)', flag('funds_recovered')),
      toast('50% of your credits are frozen. Heat: 75.'),
      { op: 'cinematic', id: 'card.act2_end', data: { lines: ['END OF ACT 2 — OPERATOR', '(the real one)', 'ACT 3 — ROOT'] } },
      { op: 'mood', mood: 'hub' },
    ],
  },
];

function wraithFlatline() {
  return [
    set('wraith_flatlined'),
    sysLog('xX_Wraith_Xx has flatlined.'),
    engineLog("[engine] warn: save slot 0 not found; npc 'wraith' references slot 0"),
    { op: 'metaKey' as const, key: 'cw.meta.wraith_gone', value: '1' },
    toast('A new process is running nearby: xX_Wraith_Xx.sav'),
  ];
}

// 02-dialogues §6.2 s2
function fakeCredits(): string[] {
  return [
  'CYBER WHATEVER 2028', 'The future already sucks.', '', 'A KURAGE-HALCYON Experience™', '',
  'STARRING',
  '{handle} ......................... The Customer',
  'Auntie Static .................... Herself (Mostly)',
  'gl1tch ........................... gl1tch',
  'xX_Wraith_Xx ..................... Previous Customer',
  'Mx. Whisper ...................... Information',
  'Doc Tungsten ..................... Your Kidneys',
  'Deacon Null ...................... Eternity (Basic Tier)',
  'The Fridge ....................... The Fridge', '',
  'EXECUTIVE PRODUCER', 'The Office of the Chairman', '',
  'PRODUCED IN ASSOCIATION WITH', 'The Department of Human Retention', '',
  'HAPPINESS CONSULTANTS', 'Every One Of You', '',
  'CATERING', 'Wok This Way (one star)', '',
  'SPECIAL THANKS', 'Your attention', 'Your time ({playtime})', 'Your persistence ({reloads} reloads)', '',
  'No users reached an end state in the making of this game.', '',
  'THANK YOU FOR PLAYING', '', 'Please play again.', 'Please play again.', 'Please play',
  ];
}
