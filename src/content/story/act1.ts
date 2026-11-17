// Act 1 — Script Kiddie (docs/script/01-beats.md §B). Owner: story agent.
import type { TriggerDef } from '../../engine/types.ts';
import {
  all, address, bbs, card, comms, dialogue, dm, elapsed, engineLog, flag, mainObj, mark, not, owns, set, sideObj,
  stat, toast, when,
} from './lib.ts';

export const act1: TriggerDef[] = [
  // --- boot -----------------------------------------------------------------------------------
  {
    id: 'beat.act1.boot',
    on: 'game.started',
    cond: { c: 'not', of: { c: 'endless' } },
    priority: 100,
    ops: [
      set('game_started'), set('act', 1),
      mark('chatter_mark'), mark('engine_mark'), mark('tos_mark'), mark('fridge_love_mark'), mark('taunt_mark'), mark('voice_mark'),
      address('fridge', 'auntie', "Somebody's fridge. Probably lonely."),
      engineLog('[engine] boot ok. 7 npcs loaded. 1 player loaded.'),
      engineLog('[engine] warn: expected 0 players. continuing anyway.'),
      dm('auntie', "Kiddo! Heard you finally got a deck.\nHeard it's a Potato-9. My condolences.\nI'm Auntie Static. I run jobs off the Dead Drop.\nYou work, I pay, nobody cries. Usually.", 'welcome to the Drop'),
      dm('auntie', "First one's practice. Your neighbour's fridge. fridge.local.\nIt's been ordering oat milk on your account.\nGo teach it some manners. Stay in the loop.", 'first job'),
      mainObj('obj.main.fridge', "Hack your neighbour's fridge. Net tab → fridge.local → Dial in.", owns('fridge')),
      dialogue('dlg.auntie.first_hub'),
    ],
  },

  // --- fridge tutorial (in-run comms) ---------------------------------------------------------





  {
    id: 'beat.act1.tut_sneak',
    cond: all({ c: 'inSystem' }, { c: 'sneakable', gte: 50 }),
    ops: [comms('auntie', "You can tiptoe past this one. Loot it, skip the fight.\nCan't own what you tiptoe past, though. Life's like that.")],
  },


  {
    id: 'beat.act1.tut_dumped',
    on: 'player.dumped',
    ops: [dm('auntie', "Dumped, kiddo. Happens. Your deck's fine, mostly.\nOne program got chewed. Repair it at the warez bin, or load something else.\nThen go again. The fridge isn't going anywhere. It's a fridge.")],
  },

  // --- fridge owned -----------------------------------------------------------------------------
  {
    id: 'beat.act1.fridge_done',
    on: 'system.owned',
    match: { system: 'fridge' },
    ops: [
      set('fridge_done'),
      dm('auntie', "Look at you. You own a fridge.\nMost people need a mortgage for that.\nOwned boxes are hosts. Hosts work for you: mine, fight, hide you.\nHang up, then open the Botnet tab and give the fridge a job."),
      dm('fridge', 'hello. i am yours now.\ni have cancelled the oat milk.\n3°C.'),
      { op: 'credits', amount: 50 },
      dm('auntie', "Fifty credits for the fridge. First job's on me. Buy a program with it, not snacks."),
      mainObj('obj.main.assign_role', 'Give the fridge a job. (Botnet tab: Mine, Botnet or Proxy)', flag('first_role_set')),
    ],
  },
  {
    id: 'beat.act1.fridge_glitch',
    on: 'hub.entered',
    cond: flag('fridge_done'),
    ops: [
      dm('glitch', 'n1c3 fr1dg3'),
      engineLog("[engine] warn: npc 'glitch' read state.player outside dialogue tick"),
    ],
  },
  {
    id: 'beat.act1.wraith_intro',
    on: 'hub.entered',
    cond: flag('fridge_done'),
    priority: -1,
    ops: [
      set('wraith_seen'),
      bbs('wraith', 'lol someone pwned a FRIDGE. enjoy ur cold cuts n00b\nur gonna do the noodle shop next. dont ask how i know.\neveryone does the noodle shop next.\n-xX_Wraith_Xx'),
    ],
  },

  // --- first host role ------------------------------------------------------------------------
  {
    id: 'beat.act1.first_role_mine',
    on: 'host.role', match: { role: 'mine' }, cond: not(flag('first_role_set')), priority: 10,
    ops: [set('first_role_set'), set('first_role_mine'), dm('glitch', 'm1n1ng is c00l. b0tn3t is c00l3r. 1 v0t3 b0tn3t. 4 s4f3ty')],
  },
  {
    id: 'beat.act1.first_role_botnet',
    on: 'host.role', match: { role: 'botnet' }, cond: not(flag('first_role_set')), priority: 10,
    ops: [set('first_role_set'), set('first_role_botnet'), dm('glitch', 'g00d ch01c3. v3ry s4f3 <3')],
  },
  {
    id: 'beat.act1.first_role_proxy',
    on: 'host.role', match: { role: 'proxy' }, cond: not(flag('first_role_set')), priority: 10,
    ops: [set('first_role_set'), set('first_role_proxy'), dm('glitch', 'pr0xy?? b0r1ng. b0tn3t is s4f3r. trust m3')],
  },
  {
    id: 'beat.act1.first_role',
    on: 'host.role',
    cond: flag('first_role_set'),
    ops: [
      dm('auntie', 'Good. Mine makes $HODL every cycle, and a little heat.\nBotnet gives you charges in a fight. Proxy hides you.\nEverything makes heat, kiddo. Breathing makes heat.'),
      dm('auntie', 'Next: Wok This Way, the noodle place on 9th. wokthisway.biz.\nReal money in the till. Real ICE on the till. Stay in the loop.'),
      address('wok', 'auntie', 'Noodle shop on 9th. One cook. One deep fryer. Too many opinions.'),
      mainObj('obj.main.wok', 'Take the till at Wok This Way. wokthisway.biz', owns('wok')),
    ],
  },

  // --- wok ------------------------------------------------------------------------------------
  {
    id: 'beat.act1.wok_done',
    on: 'system.owned',
    match: { system: 'wok' },
    ops: [
      set('wok_done'), mark('wok_done_mark'),
      dm('auntie', "Noodle money! You're a professional now. Technically.\nTwo hosts. That's a botnet. A botnet's sad little cousin.\nTo find more boxes you need a router. BigByte ISP runs half the street.\nbigbyte-isp.net. Take a router node and netscan from it."),
      dm('auntie', 'Side gig if you want it: Vend-o-Net. vend-o-net.biz.\nFour hundred vending machines, one password. Free hosts.'),
      address('bigbyte', 'auntie', 'Regional ISP. "Up to" fast. Routers inside: netscan from them.'),
      address('vendnet', 'auntie', '400 vending machines. One password.'),
      mainObj('obj.main.bigbyte', 'Get a router. Crack BigByte ISP. bigbyte-isp.net', owns('bigbyte')),
      sideObj('obj.side.vendnet', '400 vending machines. One password. vend-o-net.biz', owns('vendnet')),
      when(not(flag('fryer_hacked')), [sideObj('obj.side.fryer', 'The deep fryer at Wok This Way has opinions.', flag('fryer_hacked'))]),
      bbs('wraith', 'told u. noodle shop.\n-xX_Wraith_Xx'),
    ],
  },
  {
    id: 'beat.act1.fryer',
    on: 'story.flag',
    match: { flag: 'fryer_hacked' },
    ops: [
      toast('The deep fryer is yours. It is at 190°C and full of feelings.'),
      { op: 'log', level: 'info', text: '[wok.fryer] OIL TEMP: YES' },
      when(flag('fryer_free_fries'), [dm('auntie', 'Free fries for the whole block. You soft little idiot. I love it.')]),
      when(flag('fryer_overclocked'), [dm('auntie', "You turned a deep fryer into a weapon. I've never been prouder. Or more scared of noodles.")]),
    ],
  },

  // --- vendnet --------------------------------------------------------------------------------
  {
    id: 'beat.act1.vendnet_done',
    on: 'system.owned',
    match: { system: 'vendnet' },
    ops: [
      set('vendnet_done'),
      dm('auntie', "Four hundred vending machines. You're a franchise now. Don't unionise them."),
      dm('glitch', 's0 m4ny h0sts!! 4ll 1n th3 b0tn3t r1ght? r1ght? 4 s4f3ty'),
    ],
  },

  // --- netscan / parkit -----------------------------------------------------------------------
  {
    id: 'beat.act1.first_netscan',
    on: 'netscan',
    ops: [
      set('first_netscan'),
      comms('auntie', 'That\'s netscan. Every router is a phone book.\nMost numbers are junk. Doorbells. Toasters. Junk is hosts. Hosts are power.'),
    ],
  },
  {
    id: 'beat.act1.parkit_found',
    on: 'address.added',
    match: { system: 'parkit' },
    ops: [
      dm('auntie', 'parkit.city.gov. The Parking Authority.\nEverybody hates them. Even the cars hate them.\nWipe your tickets. If you find dirt on a councillor, I know a buyer.'),
      sideObj('obj.side.parkit', 'Erase your tickets. Find dirt. parkit.city.gov', any2('parkit_tickets_wiped', 'file.parkit.councillor_dirt')),
    ],
  },

  // --- bigbyte --------------------------------------------------------------------------------
  {
    id: 'beat.act1.bigbyte_done',
    on: 'system.owned',
    match: { system: 'bigbyte' },
    ops: [
      set('bigbyte_done'),
      dm('auntie', "BigByte's yours. Half the street's packets go through your hands now.\nWash them before you eat."),
      when(stat('rep', undefined, 2), [
        dm('auntie', "I've got a real job coming. Corporate.\nGet your Rep to 3 first. The board's got gigs. Stay in the loop."),
        mainObj('obj.main.rep3', 'Reach Rep 3. Take jobs from the fixer board, hit side systems.', stat('rep', 3)),
      ]),
    ],
  },
  {
    id: 'beat.act1.glitch_rectangle',
    cond: all(flag('first_role_set'), elapsed('wok_done_mark', 60)),
    ops: [set('glitch_rectangle'), dm('glitch', 'q 4 u\nwh4t 1s th3 r3ct4ngl3 w th3 t4bs 4b0v3 3v3ryth1ng?\nu l00k 4t 1t s0m3t1m3s. 1s 1t 4 w1nd0w?\nc4n 1 s33 0ut 0f 1t')],
  },
  {
    id: 'beat.act1.glitch_stats',
    on: 'hardware.changed',
    cond: flag('glitch_rectangle'),
    ops: [dm('glitch', 'n1c3 upgr4d3. ur {part} 1s t13r {tier} n0w.\n1 m34n. pr0b4bly. l00ks l1k3 {tier}. 1 d0nt kn0w th4t.')],
  },
  {
    id: 'beat.act1.kh_offer',
    cond: all(flag('bigbyte_done'), stat('rep', 3)),
    ops: [
      set('kh_offered'),
      dm('auntie', "Corporate time, kiddo. Kurage-Halcyon.\nYou know them. You're wearing them. You're probably *eating* them.\nTheir Happiness Division has a slide deck. Q3 Happiness Review.\nA client wants it. happiness.kurage-halcyon.com."),
      dm('auntie', 'Bloodsuckers, KH. Total vampires.\nTheir toasters are pretty good, though. Stay in the loop.'),
      address('khhappy', 'auntie', "KH's Happiness Division. The job target is in the Executive Share vault."),
      { op: 'job', job: 'job.kh_happiness' },
      mainObj('obj.main.khhappy', 'Steal the Q3 Happiness Review from KH. happiness.kurage-halcyon.com', flag('act1_done')),
    ],
  },

  // --- KH Happiness ---------------------------------------------------------------------------
  {
    id: 'beat.act1.memo_read',
    on: 'lore.gained',
    match: { file: 'file.khhappy.retention_memo' },
    ops: [
      set('memo_read'),
      toast('Thank you for reading! +5 Engagement Points.'),
      engineLog('[engine] note: player has read the memo. adjusting.'),
    ],
  },
  {
    id: 'beat.act1.khhappy_done',
    on: 'run.ended',
    match: { system: 'khhappy', reason: 'jackout' },
    cond: { c: 'paydata', file: 'file.khhappy.q3_happiness' },
    ops: actOneEnd(),
  },
  {
    id: 'beat.act1.q3_looted',
    on: 'node.looted',
    match: { system: 'khhappy', files: 'file.khhappy.q3_happiness' },
    ops: [set('q3_looted'), comms('auntie', "That's the deck. Now hang up, kiddo. Don't get greedy. Greedy gets a busy signal.")],
  },
  {
    id: 'beat.act1.q3_lost',
    on: 'run.ended',
    match: { system: 'khhappy', reason: ['dumped', 'traced'] },
    cond: all(flag('q3_looted'), not(flag('act1_done')), not({ c: 'paydata', file: 'file.khhappy.q3_happiness' })),
    once: false,
    ops: [dm('auntie', "You dropped the deck? Christ, kiddo. KH restored it from backup. Same vault. Go again.")],
  },
  {
    // fallback: the deck was delivered some other way (e.g. turned in from a later run)
    id: 'beat.act1.khhappy_done_job',
    on: 'job.status',
    match: { job: 'job.kh_happiness', status: 'done' },
    cond: not(flag('act1_done')),
    ops: actOneEnd(),
  },
];

function actOneEnd() {
  return [
    set('act1_done'),
    dm('auntie', "You walked into KH and walked out with their homework.\nFind anything weird in there?\nDon't answer. I like not knowing things. It's restful.\nTurn the deck in on the board. Then we talk about real money."),
    card('act1_end', ['END OF ACT 1 — SCRIPT KIDDIE', 'Rep {rep} · Control {control} · Engagement: excellent', 'ACT 2 — OPERATOR']),
  ];
}

function any2(flagId: string, file: string) {
  return { c: 'any' as const, of: [flag(flagId), { c: 'paydata' as const, file }, { c: 'job' as const, job: 'job.parkit_dirt', status: 'done' as const }] };
}

