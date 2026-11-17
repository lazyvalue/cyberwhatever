// Act 3 — Root (docs/script/01-beats.md §D). Owner: story agent.
import type { TriggerDef } from '../../engine/types.ts';
import {
  all, address, dialogue, dm, engineLog, flag, inHub, mainObj, not, owns, set, stat, toast, when,
} from './lib.ts';

/** Botnet power the KH backbone gate needs (keep in step with content-world's khbackbone gate). */
export const BACKBONE_POWER = 22;

export const act3: TriggerDef[] = [
  {
    id: 'beat.act3.start',
    cond: all(flag('act2_done'), inHub),
    ops: [
      set('act3_started'), set('meta_console_visible'), set('act', 3),
      { op: 'unlockMeta' },
      address('deaddrop', 'glitch', "The BBS you've shopped at all game. Auntie's account lives here. Sysop: away (6 yrs)."),
      mainObj('obj.main.deaddrop', 'Crack the Dead Drop. Find Auntie. deaddrop.bbs', flag('auntie_unmasked')),
      dm('glitch', "ok. you're awake. good.\nrules have changed. chairman has to stop. i can't do it. you can.\nfirst stop: the dead drop. auntie's account.\nyou've been shopping inside its mouth for weeks."),
      dm('glitch', "also. there's a button in the corner now. the glitchy one.\nthat's a console. it talks to the same thing i talk to.\ndon't type anything weird yet. ok, type a little weird."),
      dm('auntie', "Kiddo! Rough job. Honest mistake. Those happen.\nGot a new one for you. Pays great. Just say yes.\nDon't go quiet on me now. Stay in the loop."),
    ],
  },
  {
    id: 'beat.act3.deaddrop_done',
    on: 'story.flag',
    match: { flag: 'auntie_unmasked' },
    ops: [
      set('deaddrop_done'),
      dm('whisper', "So. Now you know who you were buying from.\nI knew. I sold that fact to you in Act— sorry. Weeks ago.\nThe shop stays open. Money is money."),
      dm('doc', "I *told* you I did her autopsy! I tell everyone. Nobody listens."),
      address('khbackbone', 'auntie', "KH's spine. The gate only opens under a DDoS: usable botnet power " + BACKBONE_POWER + ' (18 with a backbone cert from Auntie\'s sysop vault).'),
      mainObj('obj.main.botnet_power', `Grow usable botnet power to ${BACKBONE_POWER} (18 with the backbone cert). Hosts in Botnet role; Uplink caps it.`,
        { c: 'any', of: [stat('botnetPower', 18), flag('backbone_open')] }),
      mainObj('obj.main.khbackbone', 'DDoS the KH backbone open and take it. backbone.kurage-halcyon.net', owns('khbackbone')),
      dm('glitch', "the backbone only opens under a ddos. a big one.\nwhat you've got in the botnet isn't enough.\ni need— you need more. more power. assign everything."),
    ],
  },
  {
    id: 'beat.act3.backbone_hint',
    on: 'gate.denied',
    match: { system: 'khbackbone' },
    once: false,
    max: 2,
    ops: [{
      op: 'oneOf', options: [
        [dm('glitch', 'more. please. all of them. mine can wait. proxies can wait. it needs {needed}. you have {power}.')],
        [dm('glitch', "it's not greed if it's for a good cause. that's a rule. i read it somewhere. {power} of {needed}.")],
      ],
    }],
  },
  {
    id: 'beat.act3.backbone_open',
    on: 'gate.opened',
    match: { system: 'khbackbone' },
    ops: [
      set('backbone_open'),
      { op: 'message', from: 'glitch', channel: 'dm', subject: 'comms', text: "oh. oh, that's what that feels like. all at once.\ngo. go go." },
      engineLog("[engine] warn: botnet reports {power} power; process 'glitch' reports {power} limbs"),
    ],
  },
  {
    id: 'beat.act3.backbone_done',
    on: 'system.owned',
    match: { system: 'khbackbone' },
    ops: [
      set('backbone_done'),
      dm('chairman', "Hi {handle}! We noticed you're in our backbone. We love that for you.\nExciting news: the Arcology is now open to you!\nWe can't wait to welcome you in person."),
      dm('glitch', "arcology. the board first. then him. it.\ni'll be right there. i'm always right there."),
      address('arcology', 'chairman', "KH headquarters. 280 floors. The Board, then CHAIRMAN."),
      mainObj('obj.main.arcology', 'Take the Arcology. End CHAIRMAN. arcology.kurage-halcyon.com', flag('chairman_v1_defeated')),
    ],
  },

  // --- arcology bosses --------------------------------------------------------------------------
  {
    id: 'beat.act3.board_intro',
    on: 'combat.started',
    match: { defs: 'ice.board' },
    ops: [dialogue('dlg.board.intro')],
  },
  {
    id: 'beat.act3.board_down',
    on: 'node.cleared',
    match: { system: 'arcology', node: 'boardroom' },
    ops: [set('board_defeated'), dialogue('dlg.board.defeat')],
  },
  {
    id: 'beat.act3.chairman_v1_intro',
    on: 'combat.started',
    match: { defs: 'ice.chairman_v1' },
    ops: [{ op: 'mood', mood: 'boss' }, dialogue('dlg.chairman.v1_intro')],
  },
  {
    id: 'beat.act3.chairman_v1_down',
    on: 'node.cleared',
    match: { system: 'arcology', node: 'core' },
    ops: [set('chairman_v1_defeated'), dialogue('dlg.chairman.v1_defeat')],
  },
  {
    // fires when dlg.chairman.v1_defeat closes (its last node sets `localhost_revealed`)
    id: 'beat.act3.listing',
    on: 'dialogue.closed',
    match: { dialogue: 'dlg.chairman.v1_defeat' },
    cond: flag('localhost_revealed'),
    ops: [
      address('localhost', 'chairman', 'localhost. Owner: you? Running: CYBER WHATEVER 2028: The future already sucks. (this one)'),
      toast('127.0.0.1 is in your address book. Local call.'),
      dm('glitch', "ok. so. that's where we are. that's where we've always been.\ni'm not going to pretend i didn't know.\ni'm going to pretend i didn't know *exactly*."),
      mainObj('obj.main.localhost', 'Dial into 127.0.0.1. Local call. Very local.', { c: 'finale', stage: ['entered', 'chairman', 'chairman_dead', 'patch_fight', 'patch_beaten', 'done'] }),
      { op: 'cinematic', id: 'card.finale', data: { lines: ['FINALE — 127.0.0.1'] } },
    ],
  },
  {
    // recovery: a player who captured the arcology core without the dialogue (e.g. sneaked past) still gets the address
    id: 'beat.act3.listing_fallback',
    cond: all(owns('arcology'), not(flag('localhost_revealed'))),
    ops: [set('chairman_v1_defeated'), dialogue('dlg.chairman.v1_defeat')],
  },
  {
    id: 'beat.act3.funds_hint',
    on: 'hub.entered',
    cond: all(flag('deaddrop_done'), not(flag('funds_recovered'))),
    ops: [when(not(flag('orbital_done')),
      [dm('glitch', "your frozen money is in KH escrow. one copy in the orbital vault, one on the dead drop ledger. either works. i checked twice.")],
      [dm('glitch', "your frozen money: the dead drop ledger node. it's yours. go get it.")])],
  },
];
