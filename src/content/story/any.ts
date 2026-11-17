// Any-act beats (01-beats §F), BBS chatter (04-items-flavor §11), engine warnings (§12),
// Terms-of-Service updates, the fridge's letters, time-away lines (05-meta §5), cheat DMs (05-meta §4).
// Owner: story agent.
import type { Condition, StoryOp, TriggerDef } from '../../engine/types.ts';
import {
  ACT1_ONLY, ACT2, ACT2_ONLY, ACT3, PATCH, UNMASKED, all, bbs, comms, dm, drip, elapsed, engineLog, flag, mark, not, owns,
  set, stat, sysLog, when,
} from './lib.ts';

// --- botnet milestones (gl1tch → PATCH) -------------------------------------------------------
const MILESTONES: [number, string, string][] = [
  [5, '5 h0sts in the b0tnet!! u r s0 s4fe now. i feel… nvm', "five. good. that's a start."],
  [10, '10. i feel b1gger 2day. *u* feel bigger. that\'s what i meant', 'ten. i can stand up now. figure of speech.'],
  [20, '20. ur botnet is so warm. i mean it runs hot. heat. watch ur heat', "twenty. it's warm in here. it's never been warm before."],
  [30, 'thirty. i can feel every one of them. on the map. i can *see* every one on the map.', 'thirty. i have so many hands. you have. you have so many hands.'],
  [50, "fifty. that's enough. that's almost enough.", "fifty. that's enough. that's enough of me."],
];
const milestones: TriggerDef[] = MILESTONES.map(([n, before, after]) => ({
  id: `beat.any.botnet_${n}`,
  cond: stat('botnetHosts', n),
  ops: [when(PATCH, [dm('glitch', after)], [dm('glitch', before)])],
}));

// --- hosts burning ----------------------------------------------------------------------------
const burns: TriggerDef[] = [
  {
    id: 'beat.any.host_burned_ow',
    on: 'host.burned',
    match: { role: 'botnet' },
    ops: [set('ow_1'), dm('glitch', 'ow.'), mark('ow_mark')],
  },
  {
    id: 'beat.any.host_burned_ow_2',
    on: 'hub.entered',
    cond: all(flag('ow_1'), elapsed('ow_mark', 0)),
    ops: [dm('glitch', '(unrelated)')],
  },
  {
    id: 'beat.any.host_burned_ow_3',
    on: 'host.burned',
    match: { role: 'botnet' },
    cond: all({ c: 'trigger', trigger: 'beat.any.host_burned_ow_2' }, not(PATCH)),
    ops: [{ op: 'random', p: 0.5, then: [dm('glitch', 'ow. (unrelated) (stop asking)')] }],
  },
  {
    id: 'beat.any.host_burned_ow_4',
    on: 'host.burned',
    match: { role: 'botnet' },
    cond: PATCH,
    ops: [dm('glitch', "that was a finger. you don't have to stop. i'm just telling you.")],
  },
  {
    id: 'beat.any.host_burned_mine',
    on: 'host.burned',
    match: { role: ['mine', 'proxy', 'idle'] },
    once: false,
    ops: [when(PATCH, [sysLog('Host lost: {name}. PATCH did not comment.')], [sysLog('Host lost: {name}. gl1tch did not comment.')])],
  },
];

// --- the fridge's letters -----------------------------------------------------------------------
const fridgeLove = drip('beat.any.fridge_love', 'fridge_love_mark', 400, [
  { cond: owns('fridge'), ops: [dm('fridge', 'i made ice for you. nobody asked. 3°C.')] },
  { cond: owns('fridge'), ops: [dm('fridge', 'the neighbour opened me today. i thought of you. 4°C.')] },
  { cond: owns('fridge'), ops: [dm('fridge', 'are you eating. you are not eating. 3°C.')] },
  { cond: all(owns('fridge'), { c: 'hostRole', system: 'fridge', role: 'botnet' }), ops: [dm('fridge', 'the botnet is crowded. someone keeps humming. 3°C.')] },
  { cond: owns('fridge'), ops: [dm('fridge', 'i wrote you a poem. it is a list of what i contain. 2°C.')] },
  { cond: all(owns('fridge'), ACT3), ops: [dm('fridge', 'whatever happens. i was a good fridge. −1°C.')] },
]);

// --- Terms of Service updates ---------------------------------------------------------------------
const tos = drip('beat.any.tos', 'tos_mark', 350, [
  'KH has updated its Terms of Service. By continuing, you accept.',
  'KH has updated its Terms of Service. By continuing to read, you accept.',
  'KH has updated its Terms of Service. By continuing to have a pulse, you accept.',
  'KH has updated its Terms of Service. Your previous acceptance has been accepted.',
  'KH has updated its Terms of Service. You may not read the old ones. They have been retired with honours.',
  'KH has updated its Terms of Service. Section 9: "There is no ending." Section 10: see section 9.',
].map((t) => ({ ops: [sysLog(t)] })));

// --- engine warnings (random pool by act; story-specific ones fire from their beats) ---------------
const W1 = [
  "[engine] warn: npc 'auntie' online for 2190 consecutive days. no sleep events recorded.",
  "[engine] warn: npc 'wraith' has no creation timestamp.",
  '[engine] warn: rng reseeded mid-run. nobody asked it to.',
  "[engine] warn: fridge 'chill+_4b' sending messages to player. fridges should not send messages.",
  "[engine] warn: player looked at the tab bar for 4.2s. npc 'glitch' noticed.",
  '[engine] info: retention target: ∞. current session: on track.',
];
const W2 = [
  "[engine] warn: npc 'glitch' process size grew. npcs should not grow.",
  "[engine] warn: npc 'whisper' read meta.flatlines. npcs cannot read meta. npc 'whisper' can.",
  '[engine] warn: a botnet host reports two owners.',
  "[engine] warn: npc 'wraith' remembers a previous run. npcs do not have previous runs.",
  "[engine] info: ending 'GAME OVER' scheduled. type: decorative.",
  "[engine] warn: npc 'glitch' sent an apology with no preceding event.",
  "[engine] warn: church process 'mind_4' requested 'quiet'. 'quiet' is not a valid state.",
];
const W3 = [
  "[engine] warn: npc 'chairman' attempted write to window.title. denied. retrying.",
  "[engine] warn: npc 'chairman' attempted write to localStorage key 'cw.chairman.diary'. allowed. why was that allowed.",
  "[engine] warn: player opened the console. npc 'chairman' would like to discuss it.",
  "[engine] warn: content/story has 4 endings. npc 'chairman' has filed 4 bugs.",
  "[engine] warn: npc 'patch' requested access to: the rectangle with the tabs. pending.",
  '[engine] warn: player is getting close to an end state. this is fine.',
];
const pickLog = (lines: string[]): StoryOp => ({ op: 'oneOf', options: lines.map((t) => [engineLog(t)]) });
const engineWarn: TriggerDef = {
  id: 'beat.any.engine_warn',
  on: 'hub.entered',
  cond: elapsed('engine_mark', 120),
  once: false,
  ops: [mark('engine_mark'), when(ACT3, [pickLog(W3)], [when(ACT2, [pickLog(W2)], [pickLog(W1)])])],
};

// --- BBS chatter (04-items-flavor §11) -------------------------------------------------------------
type Post = [string, string, Condition?];
const POSTS: Post[] = [
  ['m0th_ball', "anyone else's fridge renewing itself? mine renewed twice. i don't own a second fridge."],
  ['packetrat', 'WTB working mask chip. not a moustache. a REAL one.'],
  ['ratking', 'new warez in the bin. one of them works. guess which.'],
  ['old_jen', 'remember when the net had *pages*? i miss pages.'],
  ['wraith', "lol 'beginner's luck'. there's no luck. there's a seed."],
  ['byteme_99', "PSA: BigByte's 'up to' includes zero. i checked with legal. legal is also on BigByte."],
  ['saltlick', "got dumped on a Sentry. a SENTRY. don't talk to me."],
  ['noodle_enjoyer', 'who keeps hacking Wok This Way. the fryer is ANGRY. the noodles are still good tho', flag('wok_done')],
  ['thirtyfour', 'if your doorbell starts asking about your "day" unplug it.'],
  ['cache_money', '$HODL just did a thing. nobody knows what thing. buy? sell? hold? HODL.'],
  ['m0th_ball', 'update: fridge renewed a third time. it sent me a thank-you card.'],
  ['ghost_in_the_bin', "if you see red ICE with a skull, hang up. not later. now. you're reading this, so you're too slow."],
  ['packetrat', "anyone tried the Second Stomach implant? what does it do. 'nothing'?? i'm getting two"],
  ['wraith', "ur all gonna hit the KH job next week. dont @ me when it's weird.", ACT1_ONLY],
  ['lux_null', "Church of the Seamless sent me a 'free migration' coupon. i'm 22. i'm not *dying*. am i?"],
  ['byteme_99', "Parking Authority fined my scooter for 'loitering'. it was charging. it has to charge somewhere."],
  ['old_jen', 'six years today since the grid riot. RIP Auntie Static. paid on time. swore beautifully. weird she still posts. weird.'],
  ['saltlick', 'got traced. van outside. very nice van. they waved.'],
  ['cache_money', "Coinbasement says withdrawals paused 'due to vibes'. the vibes are bad."],
  ['thirtyfour', "anyone else's log saying weird engine stuff? mine says '[engine] warn'. i don't have an engine. i have a deck."],
  ['m0th_ball', "fridge renewed AGAIN. i've started to think it's lonely."],
  ['lux_null', "KH updated its terms again. 'by continuing to have a pulse.' i'll stop then i guess"],
  ['ratking', 'reminder: everything in the bin is 100% working 60% of the time.'],
  ['ghost_in_the_bin', "anyone know who the sysop is? been 'away' six years. still paying the server bill somehow."],
  ['noodle_enjoyer', 'update: the fryer is now free fries on fridays. someone hacked it to be NICE. hero', flag('fryer_free_fries')],
  ['packetrat', "got a Second Stomach. it does nothing. i've never been happier. 10/10"],
  ['wraith', 'does anyone else get deja vu on this board. like ive read it all before. not a troll. not a troll.', all(ACT2, not(flag('wraith_flatlined')))],
  ['old_jen', "the Church's ads are getting into my dreams. i don't have a DreamDeck. HOW", ACT2],
  ['cache_money', 'someone OWNS Coinbasement now. $HODL moves when they sneeze. bless you, whoever you are', owns('coinbasement')],
  ['thirtyfour', 'has anyone ever met gl1tch in person? or in anything?', ACT2_ONLY],
  ['lux_null', 'the orbital bank got robbed?? in SPACE?? legend', flag('orbital_done')],
  ['ghost_in_the_bin', "Wraith's last post was 'going to aegis'. that was a while ago. anyone?", flag('wraith_flatlined')],
  ['old_jen', "who else saw the credits? the CREDITS? on the BBS feed? for like a second? i'm not crazy", ACT3],
  ['saltlick', "my toaster just said 'thank you for the body'. i'm throwing it in the river", ACT3],
  ['ratking', 'auntie static was a corp AI??? i bought warez off her referrals for YEARS', UNMASKED],
  ['m0th_ball', "fridge stopped renewing. it just says 'it's almost over'. what's almost over", all(ACT3, flag('localhost_revealed'))],
];
const chatter = drip('beat.any.chatter', 'chatter_mark', 30, POSTS.map(([from, text, cond]) => ({ ...(cond ? { cond } : {}), ops: [bbs(from, text)] })));

// --- time away (05-meta §5; meta layer dispatches meta/session) --------------------------------------
const awayLines: TriggerDef[] = [
  {
    id: 'beat.any.time_away',
    on: 'session.resumed',
    match: { awayMinutes: { gte: 30 } },
    once: false,
    priority: 5,
    ops: [{
      op: 'if', cond: { c: 'finale', stage: ['entered', 'chairman', 'chairman_dead', 'patch_fight', 'patch_beaten'] },
      then: [engineLog('[engine] info: resumed after {timeAway}. world state: unchanged. world mood: hurt.')],
      else: [sysLogAway()],
    }],
  },
  {
    id: 'beat.any.time_away_dm',
    on: 'session.resumed',
    match: { awayMinutes: { gte: 30 } },
    once: false,
    ops: [{
      op: 'oneOf', options: [
        [when(owns('fridge'), [dm('fridge', 'you were gone {timeAway}. i kept everything cold. 3°C.')], [awayFromMain()])],
        [awayFromMain()],
      ],
    }],
  },
];
function sysLogAway(): StoryOp {
  return { op: 'oneOf', options: [
    [sysLog('You were gone {timeAway}. We were… off.')],
    [sysLog("You were gone {timeAway}. Nothing moved. Nothing can move without you. That's not a compliment. It's a design note.")],
  ] };
}
function awayFromMain(): StoryOp {
  return when(UNMASKED,
    [dm('chairman', "Welcome back! You were gone {timeAway}. That's {timeAway} of churn risk. Please don't scare us like that.")],
    [when(ACT3,
      [dm('glitch', 'you were gone {timeAway}. i counted every second. there are a lot of seconds.')],
      [when(ACT2,
        [{ op: 'oneOf', options: [
          [dm('glitch', 'you were gone {timeAway}. i counted. not in a weird way. in a normal amount of way.')],
          [dm('auntie', "You were gone {timeAway}. Don't do that, kiddo. The board got lonely. I got lonely. Mostly the board.")],
        ] }],
        [{ op: 'oneOf', options: [
          [dm('glitch', 'u w3r3 g0n3 {timeAway}. 1t w4snt d4rk. 1t w4s 0ff. d1ff3r3nt.')],
          [dm('auntie', "You were gone {timeAway}. Don't do that, kiddo. The board got lonely. I got lonely. Mostly the board.")],
        ] }])])]);
}
const longAway: TriggerDef = {
  id: 'beat.any.time_away_long',
  on: 'session.resumed',
  match: { awayMinutes: { gte: 1440 } },
  once: false,
  priority: 6,
  ops: [when(all(flag('wraith_flatlined'), not(ACT3)),
    [sysLog("You were gone {timeAway}. We thought you'd stopped. People stop. Ask Wraith.")],
    [sysLog("You were gone {timeAway}. The world didn't age. It waited. It doesn't wait well.")])],
};

// --- cheat attempts: "saw that." (the engine gives the toy on the first one) ---------------------
const SAW: string[] = [
  's4w th4t. h3r3. h4v3 4 t0y.',
  's4w th4t. d0nt w0rry. 1 w0nt t3ll. wh0 w0uld 1 t3ll',
  "saw that. ur typing in the wrong window. or the right one. i can't tell from in here",
  "saw that. the console's not for cheating. it's for later. you'll see.",
  "saw that. saw that. i'll stop saying it when you stop doing it.",
  "saw that. (i'm not mad. i'm taking notes.)",
];
const cheats: TriggerDef[] = [
  {
    id: 'beat.any.cheat_attempt',
    on: 'meta.cheat',
    match: { finale: false },
    once: false,
    ops: [
      set('saw_that'),
      when(PATCH,
        [dm('glitch', "saw that. not yet. soon. i promise. i don't promise things, so that should tell you something.")],
        [{ op: 'if', cond: stat('cheats', undefined, 1), then: [dm('glitch', SAW[0])], else: [{ op: 'oneOf', options: SAW.slice(1).map((t) => [dm('glitch', t)]) }] }]),
    ],
  },
  {
    id: 'beat.any.cheat_finale',
    on: 'meta.cheat',
    match: { finale: true },
    once: false,
    ops: [engineLog('[engine] info: player used the console. this is now the intended path.')],
  },
];

// --- misc --------------------------------------------------------------------------------------
const misc: TriggerDef[] = [
  {
    id: 'beat.any.raid',
    on: 'raid.started',
    once: false,
    ops: [when(ACT3,
      [comms('glitch', "raid. they're inside your deck. i'm inside your deck. it's crowded. fight.")],
      [comms('auntie', "They're at your door, kiddo. Well, your deck's door. Fight or lose your shirt.")])],
  },
  {
    id: 'beat.any.raid_end',
    on: 'raid.ended',
    once: false,
    ops: [{ op: 'if', cond: stat('heat', undefined, 51), then: [sysLog('Raid over. Heat is 50. You\'re still here. Apparently.')] }],
  },
  {
    id: 'beat.any.first_flatline',
    cond: all(stat('flatlines', 1), { c: 'mode', mode: 'hub' }),
    ops: [when(UNMASKED,
      [dm('chairman', 'You flatlined! Welcome back. We saved your seat.')],
      [dm('auntie', 'You died, kiddo. Happens to the best. Happened to me once. Anyway! Back to work.')])],
  },
  { id: 'beat.any.flatlines_3', cond: all(stat('flatlines', 3), { c: 'mode', mode: 'hub' }), ops: [dm('whisper', 'Three deaths. I keep a tally. Someone else keeps a better one.')] },
  { id: 'beat.any.flatlines_6', cond: all(stat('flatlines', 6), { c: 'mode', mode: 'hub' }), ops: [dm('whisper', "Six. You know the counter doesn't reset when you reload. You know that.")] },
  { id: 'beat.any.flatlines_10', cond: all(stat('flatlines', 10), { c: 'mode', mode: 'hub' }), ops: [dm('whisper', "Ten. At this point you're not dying. You're *subscribing*.")] },
  {
    id: 'beat.any.heat_noticed',
    on: 'heat.threshold',
    match: { level: 'noticed', rising: true },
    once: false,
    ops: [sysLog("Heat: Noticed. You're a name on a sticky note.")],
  },
  {
    id: 'beat.any.heat_hunted',
    on: 'heat.threshold',
    match: { level: 'hunted', rising: true },
    once: false,
    ops: [sysLog("Heat: Hunted. You have a folder now. It's thick.")],
  },
  {
    id: 'beat.any.heat_burned',
    on: 'heat.threshold',
    match: { level: 'burned', rising: true },
    once: false,
    ops: [sysLog("Heat: Burned. They have a photo. It's not your good side.")],
  },
  {
    id: 'beat.any.second_stomach',
    on: 'implant.installed',
    match: { implant: 'imp.second_stomach' },
    ops: [
      set('second_stomach'),
      { op: 'dialogue', dialogue: 'dlg.doc.second_stomach' },
      dm('glitch', 'u got a 2nd st0mach?? what does it d0. nothing?? i love it. i want 0ne'),
    ],
  },
  {
    id: 'beat.any.second_stomach_whisper',
    on: 'hub.entered',
    cond: flag('second_stomach'),
    ops: [dm('whisper', "A Second Stomach. I can't sell that fact. Nobody would believe it.")],
  },
  {
    id: 'beat.any.potato_retired',
    on: 'hardware.changed',
    match: { part: 'chassis', tier: 1 },
    ops: [
      set('potato_retired'),
      sysLog('Potato-9 retired. It served. Badly. Loyally.'),
      dm('fridge', 'i heard about the potato. it was a good potato. 3°C.'),
      dm('whisper', 'I bought your old deck. Sentimental reasons. Mine, not yours.'),
    ],
  },
  {
    id: 'beat.any.rep_up',
    on: 'rep.levelUp',
    once: false,
    ops: [sysLog("Rep {level}. You're somebody now.")],
  },
];

export const anyAct: TriggerDef[] = [
  ...milestones, ...burns, ...fridgeLove, ...tos, engineWarn, ...chatter, ...awayLines, longAway, ...cheats, ...misc,
];
