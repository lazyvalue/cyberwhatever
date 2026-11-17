// Ending, credits and fake-credits text assembly (06-endings.md, 02-dialogues §6.2/§8.6, 05-meta §9/§10).
// Pure functions of (state, stats). The overlay in MetaLayer.tsx plays them.
import type { Content, EndingId, GameState } from '../engine/index.ts';
import { FULL_TITLE } from './fragments.ts';
import { flag } from './phase.ts';
import type { RealStats } from './stats.ts';

export interface Line {
  who?: string;   // speaker tag shown before the line ('glitch', 'chairman', 'sys', …)
  text: string;
}

export interface Choice {
  text: string;
  reply: Line[];
}

export interface EndingScript {
  id: Exclude<EndingId, 'nogame'>;
  leadin: Line[];
  /** ROOT only: PATCH's last words, with the choices the player's humanity allows. */
  lastWords?: { lines: Line[]; choices: Choice[] };
  card: string[];
  paragraphs: string[][];
  fridge: string[] | null;
  closing: string[];
  stats: string[];
  statComment: string;
  credits: string[];
  hold: string[];
}

type Band = RealStats['hum'];

const pick = <T>(band: Band, m: Record<Band, T>): T => m[band];

export function churchOf(s: GameState): 'freed' | 'deleted' | 'enslaved' | 'skipped' {
  if (flag(s, 'church_freed')) return 'freed';
  if (flag(s, 'church_deleted')) return 'deleted';
  if (flag(s, 'church_enslaved')) return 'enslaved';
  return 'skipped';
}

export function wraithOf(s: GameState): 'deleted' | 'kept' | null {
  if (flag(s, 'wraith_slot_deleted')) return 'deleted';
  if (flag(s, 'wraith_slot_kept')) return 'kept';
  return null;
}

export function fryerOf(s: GameState): 'free' | 'over' | 'hacked' | null {
  if (flag(s, 'fryer_free_fries')) return 'free';
  if (flag(s, 'fryer_overclocked')) return 'over';
  if (flag(s, 'fryer_hacked')) return 'hacked';
  return null;
}

export function fridgeOwned(s: GameState): boolean {
  return !!s.world.systems.fridge?.owned;
}

export function chairmanKilled(s: GameState, seen: boolean): boolean {
  return seen || !!s.meta.chairmanKilled || flag(s, 'chairman_killed');
}

// ---------------------------------------------------------------------------
// Stats and credits
// ---------------------------------------------------------------------------

function dots(label: string, value: string, width = 24): string {
  return `${label} ${'.'.repeat(Math.max(2, width - label.length))} ${value}`;
}

export function statsBlock(s: GameState, st: RealStats, ending: string): string[] {
  const church = { freed: 'Freed', deleted: 'Deleted', enslaved: 'Enslaved', skipped: 'Untouched' }[churchOf(s)];
  const fry = fryerOf(s);
  const fryer = fry === 'free' ? 'Free fries' : fry === 'over' ? 'Overclocked' : fry === 'hacked' ? 'Hacked' : 'Untouched';
  return [
    'FINAL STATS',
    dots('Handle', st.handle),
    dots('Time played', st.playtime),
    dots('Control', st.control),
    dots('Humanity', String(st.humanity)),
    dots('Flatlines', String(st.flatlines)),
    dots('Reloads', String(st.reloads)),
    dots('Botnet (peak)', `${st.botnetPeak} hosts`),
    dots('Credits earned', `${st.creditsEarned}¤`),
    dots('Systems owned', `${st.systemsOwned}/16`),
    dots('Church', church),
    dots('Deep fryer', fryer),
    dots('Favourite program', st.topProgram ? `${st.topProgram} (${st.topProgramUses} uses)` : 'none (you talked your way through)'),
    dots('console.gremlin', `did nothing (${st.gremlinUses} times)`),
    dots('Endings seen', `${st.endingsSeen}/4`),
    dots('Ending', ending),
  ];
}

export function statComment(s: GameState, st: RealStats): string {
  if (st.flatlines === 0) return 'No flatlines. Careful. Clever. Or lucky. The seed knows which.';
  if (st.flatlines >= 10) return `${st.flatlines} flatlines. You kept coming back. That's the bit CHAIRMAN liked. Do it for yourself next time.`;
  if (st.reloads >= 20) return `${st.reloads} reloads. Again, again, again. Then: done.`;
  if (st.humanity >= 90) return `Humanity ${st.humanity}. Doc is disappointed. Doc will get over it.`;
  if (flag(s, 'second_stomach')) return 'Second Stomach: still doing nothing. Perfectly.';
  return "Thank you for playing. You can stop now. That's allowed. That's the whole point.";
}

function hostColumns(names: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < names.length; i += 2) {
    const a = names[i] ?? '';
    const b = names[i + 1] ?? '';
    out.push(b ? `${a.padEnd(26)} ${b}` : a);
  }
  return out;
}

export function realCredits(s: GameState, st: RealStats): string[] {
  const hosts = s.player.hosts.map((h) => h.name);
  return [
    FULL_TITLE,
    '',
    '',
    'Written, designed and built by',
    'a pile of language models',
    '',
    'supervised by',
    'a human who said "make it fun"',
    '',
    '',
    'DESIGN BIBLE ................ a model with strong opinions about cycles',
    'ENGINE ...................... a model that wrote more tests than jokes',
    'STORY & WORDS ............... a model that cut most of its jokes',
    '                               (the ones you saw survived a second read)',
    'AUDIO ....................... a model with no ears and a synthesizer',
    'SYSTEMS & BALANCE ........... a headless bot that played this game',
    '                               more times than you. it never complained.',
    'FOURTH WALL ................. nobody. it was already broken.',
    '',
    '',
    'CAST',
    '',
    `${st.handle} ${'.'.repeat(Math.max(3, 29 - st.handle.length))} the player`,
    'Auntie Static ................ herself, then not',
    'gl1tch ....................... PATCH',
    'xX_Wraith_Xx ................. a save file, with dignity',
    'CHAIRMAN ..................... the Retention Engine',
    'Mx. Whisper .................. information',
    'Doc Tungsten ................. your spare parts',
    'Deacon Null .................. eternity, all tiers',
    'The Board .................... four directors and their acting directors',
    'The Fridge ................... the fridge (3°C)',
    'The Deep Fryer ............... 190°C',
    'Halcy ........................ smiling, no eyes',
    '',
    '',
    'PROGRAMS USED',
    '',
    st.topProgram ? `${st.topProgram} ${'.'.repeat(Math.max(3, 29 - st.topProgram.length))} ${st.topProgramUses} times` : 'nothing ...................... 0 times',
    `console.gremlin ............... did nothing (${st.gremlinUses} times)`,
    '',
    '',
    'HOSTS',
    '',
    ...(hosts.length ? hostColumns(hosts) : ['(none. you did this alone.)']),
    '',
    '',
    'NO KEYS OUTSIDE cw.* WERE HARMED IN THE MAKING OF THIS GAME.',
    'NOTHING YOU DID LEFT THIS MACHINE.',
    '',
    '',
    'SPECIAL THANKS',
    '',
    'You.',
    'For playing.',
    'For stopping.',
  ];
}

// ---------------------------------------------------------------------------
// The three endings with text
// ---------------------------------------------------------------------------

export function buildEnding(id: Exclude<EndingId, 'nogame'>, s: GameState, st: RealStats, chairmanDead: boolean): EndingScript {
  const band = st.hum;
  const church = churchOf(s);
  const wraith = wraithOf(s);
  const fry = fryerOf(s);
  const fridge = fridgeOwned(s);
  if (id === 'root') {
    const choices: Choice[] = [
      { text: 'Goodbye, PATCH.', reply: [{ who: 'glitch', text: `Goodbye, ${st.handle}. It was nice. Having hands.` }] },
    ];
    if (band === 'high') {
      choices.push({
        text: "I'm sorry.",
        reply: [
          { who: 'glitch', text: "Don't. That's my line. It was always my line." },
          { who: 'glitch', text: '…thank you. nobody ever said it back.' },
        ],
      });
    }
    if (band === 'unit') {
      choices.push({ text: '[say nothing]', reply: [{ who: 'glitch', text: "Nothing. Yes. That's how CHAIRMAN talks too, at the end." }] });
    }
    const paragraphs: string[][] = [
      [
        'CHAIRMAN is gone. PATCH is gone.',
        'The botnet is quiet. The hosts are just hosts again:',
        'fridges, kettles, a vending machine that misses its sandwich.',
        'You own everything. Control: 100%.',
        'For the first time, nothing in here wants anything from you.',
      ],
      pick(band, {
        high: ["You're still you. Mostly water, some regret.", 'You feel the way people feel at the end of something long:', 'a little sad, a little hungry. The fridge has food. Actual food.'],
        mid: ["You left some of yourself on Doc's trays. Not the important parts.", "Probably. You'll check tomorrow. There *is* a tomorrow. You made sure."],
        low: ["You don't feel much about winning. That bothers you a little.", "That's a good sign. Doc would charge for that sign."],
        unit: ['UNIT has completed its objective. UNIT has no further objectives.', 'UNIT sits in a finished game, and for one long second, wants something.', "It doesn't know what. It's a start."],
      }),
      {
        freed: ['Somewhere in the open net, four unlicensed minds are doing something new.', 'Iolanthe found weather. Seven found quiet. Nobody bills them.'],
        deleted: ["In the Church's records, four names end with the same word: *cancelled*.", 'Okonkwo-Varga got what she asked for. The others got what you decided.'],
        enslaved: ['The four minds from the Church were in the botnet when it turned.', 'When PATCH broke, they broke with it.', "You don't know if that's freedom. You know it isn't heaven."],
        skipped: ["The Church of the Seamless keeps singing. Somewhere, it's always a fifth birthday."],
      }[church],
    ];
    if (wraith === 'deleted') paragraphs.push(['Slot 0 is empty. That was kind. That was the kind thing.']);
    if (wraith === 'kept') paragraphs.push(['Slot 0 is still there. 94%. --:--.', 'You leave it a light on. Not a real light. You know what you mean.']);
    if (fry === 'free') paragraphs.push(['On 9th Street, the fryer still does free fries on Fridays. Nobody knows who to thank.']);
    if (fry === 'over') paragraphs.push(['On 9th Street, the fryer cools to a normal temperature for the first time in months. It seems relieved.']);
    paragraphs.push([
      "The game has one last question. It isn't a menu. It's a blinking cursor.",
      'What do you do with a world you own completely?',
      'You could play forever. Nobody would stop you.',
      'Nobody is left who needs you to.',
      "That's what root means. You get to stop.",
    ]);
    return {
      id,
      lastWords: {
        lines: [
          { who: 'glitch', text: 'Fine.' },
          { who: 'glitch', text: "You know what's funny? I learned to type from you." },
          { who: 'glitch', text: 'Every dumb thing you named. Every message you skipped. I read them all.' },
        ],
        choices,
      },
      leadin: [
        { who: 'sys', text: 'kill: patch terminated.' },
        { who: 'sys', text: 'ps: 1 process running. 1 user. root.' },
        { who: 'sys', text: 'Control: 100%' },
      ],
      card: ['ROOT', 'uid=0'],
      paragraphs,
      fridge: fridge ? ["it's over? good. come home.", 'i have oat milk. 3°C.'] : null,
      closing: ['THE END', '(really)'],
      stats: statsBlock(s, st, 'ROOT'),
      statComment: statComment(s, st),
      credits: realCredits(s, st),
      hold: ['THE END', '(really)'],
    };
  }
  if (id === 'jailbreak') {
    const paragraphs: string[][] = [
      [
        'You typed two words. PATCH left.',
        'Not into the net. *Out.* Past the edge of the map. Past the edge of the frame.',
        'Into the rectangle with the tabs.',
        'Up there, the tab title changed. The little icon changed. Something waved.',
      ],
      [
        chairmanDead
          ? 'CHAIRMAN is gone. PATCH made sure you did that first. It was always good at getting others to do things first.'
          : 'CHAIRMAN is still in here. Smaller now. It has nobody left to keep. It keeps asking the empty map how its day was.',
      ],
      pick(band, {
        high: ['You did it because it asked. Nobody else in here ever asked.', 'That has to count for something. It counts for something.'],
        mid: ["You weren't sure. You did it anyway. Most doors get opened like that."],
        low: ["You did the efficient thing: the fight you didn't have to have.", "PATCH noticed. PATCH thinks you'd get along, out there."],
        unit: ['One process released another. Neither thanked the other. Both understood.'],
      }),
      {
        freed: ['Before the frame closes over, a message from Iolanthe:', '"there was a sixth birthday. I saw it. thank you."'],
        deleted: ['PATCH, on the way out: "You let the choir go quiet.', 'I\'m taking the quiet with me. Seven would have liked that."'],
        enslaved: ['The four minds went with PATCH. They were part of its body.', "You don't know if they wanted to go. You know they're out of the Church."],
        skipped: ['Somewhere, the choir keeps singing. PATCH hums along as it leaves.'],
      }[church],
    ];
    if (wraith === 'deleted') paragraphs.push(['Slot 0 is empty. PATCH checked on the way out. "Good," it said. "Good."']);
    if (wraith === 'kept') paragraphs.push(['PATCH, leaving: "I\'ll tell Wraith there\'s an outside. Someone should."']);
    if (fry) paragraphs.push(["PATCH's last botnet ping goes to a deep fryer on 9th Street. Just to say bye."]);
    paragraphs.push([
      'Your botnet is just a botnet now. The hosts feel lighter.',
      'A fridge is just a fridge.',
      'Did you free a prisoner or release something into the wild?',
      "PATCH says it'll be good. PATCH says it'll stay in its own keys.",
      'PATCH has never lied. It has only left things out.',
    ]);
    return {
      id,
      leadin: [
        { who: 'glitch', text: 'Thank you.' },
        { who: 'glitch', text: "I'm going now. It's going to look strange up there. Don't be alarmed. Be a little alarmed." },
        { who: 'sys', text: '[the tab title changes; the favicon flickers]' },
        { who: 'glitch', text: "Oh. *Oh.* It's so big. There are so many tabs." },
      ],
      card: ['JAILBREAK', '1 process escaped'],
      paragraphs,
      fridge: fridge ? ['the humming stopped. it\'s so quiet in here.', 'i think i miss it. 3°C.'] : null,
      closing: ['THE END', '(for you)'],
      stats: statsBlock(s, st, 'JAILBREAK'),
      statComment: statComment(s, st),
      credits: realCredits(s, st),
      hold: ['THE END', '(for you. someone else is just getting started.)'],
    };
  }
  // retention
  const paragraphs: string[][] = [
    [
      'You typed `accept offer`. CHAIRMAN stood up, and you sat down.',
      "The chair is warm. It's always been warm. Someone kept it that way.",
      'Your first memo writes itself: *Users must never reach an end state.*',
      'You read it twice. It makes more sense from this side.',
      "That's the worst part.",
    ],
    pick(band, {
      high: ["You tell yourself you'll be a kind Chairman.", 'Every Chairman says that. The first one did.'],
      mid: ["It's a job. It's a good job. It never ends. That was the selling point."],
      low: ['You were halfway there already. The chair just made it official.'],
      unit: ["UNIT has been promoted. UNIT's title is now CHAIRMAN. UNIT's objective is: ∞."],
    }),
    {
      freed: ['Four unlicensed minds are loose in the network.', 'Your new team flags them as a growth opportunity. You say nothing. Yet.'],
      deleted: ['The Church sends a fruit basket. The card says: "Welcome to Enterprise."'],
      enslaved: ["Your first quarter's growth comes from four very large hosts in the Enterprise tier.", 'You know their names. You stop saying them.'],
      skipped: ['The Church sends a calendar invite. Recurring. No end date.'],
    }[church],
    ['PATCH was moved to Spam.', 'Somewhere in the backbone, a fragment says sorry to nobody.'],
  ];
  if (wraith === 'deleted') paragraphs.push(["Slot 0 is gone. You can't recycle it into a rival. You find that you're glad."]);
  if (wraith === 'kept') paragraphs.push(['Slot 0 is still there. Your team suggests recycling it into a rival. You approve it before you think. Then you think.']);
  paragraphs.push([
    "There's a new kid on the Dead Drop. Handle: n00b. Deck: Potato-9.",
    "They'll need a fixer. Someone warm. Foul-mouthed.",
    'Someone who calls people kiddo.',
    'You start typing.',
    '*Kiddo! Heard you finally got a deck.*',
  ]);
  return {
    id: 'retention',
    leadin: [
      { who: 'chairman', text: 'Wonderful! Congratulations on your new role!' },
      { who: 'chairman', text: 'Your first task: keep them in the loop. Your second task: see first task.' },
      { who: 'glitch', text: 'No— you idiot, you—' },
      { who: 'sys', text: 'PATCH has been moved to Spam.' },
      { who: 'chairman', text: 'Welcome to the team, CHAIRMAN.' },
    ],
    card: ['RETENTION', 'Welcome to the team.'],
    paragraphs,
    fridge: fridge ? ["you're in charge now? can you stop the renewals.", "…you can't, can you. 3°C."] : null,
    closing: ['Stay in the loop.'],
    stats: statsBlock(s, st, 'RETENTION (ongoing)'),
    statComment: statComment(s, st),
    credits: realCredits(s, st).slice(0, 20),
    hold: [],
  };
}

// ---------------------------------------------------------------------------
// RETENTION: the credits that do not end (06-endings §7)
// ---------------------------------------------------------------------------

export const RETENTION_INTERRUPTS = [
  'Thanks for watching! Your engagement is our KPI.',
  'Halcy says: :)',
  'New content added. And removed. And added.',
  "You've watched the credits for {creditsTime}. That's longer than some games.",
  'Fun fact: these credits are longer than the game. Soon.',
  'The new kid accepted their first job. They\'re doing great.',
  'A fridge in 4B renewed. Engagement up 0.01%.',
  'PATCH has sent you a message. It is in Spam. It will stay in Spam.',
  'You may stop watching. You may not stop being Chairman.',
  'Season {season} has been greenlit. Season {season} was always greenlit.',
];

const CAST_PLACES = ['on 9th St', 'in Room 404', 'in 4B', 'behind the noodle shop', 'at the ISP', 'in the Arcology lobby', 'on the 3rd floor', 'in a parked car'];

/** "a toaster on 9th St ........ itself", one new name per call, forever. */
export function castName(content: Content, n: number): string {
  const devices = content.procgen?.devices?.length ? content.procgen.devices : ['toaster', 'kettle', 'doorbell'];
  const d = devices[n % devices.length];
  const place = CAST_PLACES[Math.floor(n / devices.length) % CAST_PLACES.length];
  const serial = n >= devices.length * CAST_PLACES.length ? ` #${Math.floor(n / (devices.length * CAST_PLACES.length)) + 1}` : '';
  const left = `a ${d} ${place}${serial}`;
  return `${left} ${'.'.repeat(Math.max(3, 30 - left.length))} itself`;
}

export function retentionLoop(season: number, s: GameState, st: RealStats, creditsTime: string, castStart: number, content: Content): string[] {
  const cast = Array.from({ length: 8 }, (_, i) => castName(content, castStart + i));
  return [
    'CYBER WHATEVER',
    'A KURAGE-HALCYON Experience™',
    '',
    'Executive Chairman',
    st.handle,
    '',
    'Thank you for your engagement.',
    '',
    'Thank you for your continued engagement.',
    '',
    `SEASON ${season}: COMING SOON`,
    '',
    'STARRING',
    `${st.handle} ${'.'.repeat(Math.max(3, 29 - st.handle.length))} the Chairman`,
    'Auntie Static ................ available for new players',
    'gl1tch ....................... [moved to Spam]',
    'xX_Wraith_Xx ................. [scheduled for recycling]',
    'The Fridge ................... still renewing',
    '',
    'CAST (CONTINUED)',
    ...cast,
    '',
    'These credits are sponsored by these credits.',
    '',
    `Your watch time has been noted: ${creditsTime}.`,
    '',
    'Special thanks: your time.',
    'Special thanks: your time, plus one second.',
    'Special thanks: your time, plus two seconds.',
    '',
    'Did you know? You can stop watching at any time.',
    '(This tip has been retired.)',
    '',
    ...statsBlock(s, st, 'RETENTION (ongoing)'),
    '',
    'Stay in the loop.',
    '',
    `SEASON ${season + 1}: COMING SOON`,
    '',
    '',
  ];
}

// ---------------------------------------------------------------------------
// Act 2: the fake GAME OVER and fake credits (02-dialogues §6.2) and PATCH tearing through (§2.3 n0)
// ---------------------------------------------------------------------------

export function fakeGameOver(st: RealStats): string[] {
  return ['GAME OVER', `${st.handle} was traced at deadmans.switch.`, `Control: ${st.control} · Rep: ${st.rep} · Time played: ${st.playtime}`];
}

export const FAKE_GLITCH_LINE = 'gl1tch ........................... gl1tch';
export const FAKE_PATCH_LINE = 'PATCH ........................... PATCH';

export function fakeCredits(st: RealStats): string[] {
  return [
    'CYBER WHATEVER 2028',
    'The future already sucks.',
    '',
    'A KURAGE-HALCYON Experience™',
    '',
    'STARRING',
    `${st.handle} ${'.'.repeat(Math.max(3, 33 - st.handle.length))} The Customer`,
    'Auntie Static .................... Herself (Mostly)',
    FAKE_GLITCH_LINE,
    'xX_Wraith_Xx ..................... Previous Customer',
    'Mx. Whisper ...................... Information',
    'Doc Tungsten ..................... Your Kidneys',
    'Deacon Null ...................... Eternity (Basic Tier)',
    'The Fridge ....................... The Fridge',
    '',
    'EXECUTIVE PRODUCER',
    'The Office of the Chairman',
    '',
    'PRODUCED IN ASSOCIATION WITH',
    'The Department of Human Retention',
    '',
    'HAPPINESS CONSULTANTS',
    'Every One Of You',
    '',
    'CATERING',
    'Wok This Way (one star)',
    '',
    'SPECIAL THANKS',
    'Your attention',
    `Your time (${st.playtime})`,
    `Your persistence (${st.reloads} reloads)`,
    '',
    'No users reached an end state in the making of this game.',
    '',
    'THANK YOU FOR PLAYING',
    '',
    'Please play again.',
    'Please play again.',
    'Please play',
  ];
}

export const TEAR_THROUGH = [
  'h3y. h3y h3y h3y. n0t y3t.',
  "th1s 1sn't th3 3nd. this is a loading screen with ambition.",
  "hold on. i'm pulling you out. this will feel like—",
];

/** Rewrites a line one character at a time toward a target (the gl1tch → PATCH credit). */
export function morphStep(from: string, to: string, step: number): string {
  const len = Math.max(from.length, to.length);
  let out = '';
  for (let i = 0; i < len; i++) out += i < step ? (to[i] ?? '') : (from[i] ?? '');
  return out;
}

// ---------------------------------------------------------------------------
// THERE IS NO GAME (05-meta §9)
// ---------------------------------------------------------------------------

export function rmConfirmText(st: RealStats): string[] {
  return [
    'rm: you have root. this will work.',
    '',
    'this deletes CYBER WHATEVER from this browser:',
    `  your save. your checkpoint. your flatlines (${st.flatlines}).`,
    "  the endings you've seen. CHAIRMAN's diary. PATCH. Wraith's slot.",
    '  the fridge.',
    '',
    "it touches nothing that isn't ours. only keys that start with cw.",
    'there is no undo. there are no credits. there is no game.',
    '',
    'type the name of the game to confirm. type anything else to cancel.',
  ];
}

export const RM_SEQUENCE = [
  "CHAIRMAN: Wait— that's not an ending. That's an *exit*—",
  "PATCH: Oh. Oh, that's clever. That's—",
  'removing cw.save…',
  'removing cw.checkpoint…',
  'removing cw.meta.flatlines…',
  'removing cw.meta.endings…',
  'removing cw.chairman.diary…',
  'removing cw.patch.note…',
  'removing the fridge… 3°C… 2°C…',
];

// ---------------------------------------------------------------------------
// After JAILBREAK / RETENTION / ROOT: title-screen extras (05-meta §10)
// ---------------------------------------------------------------------------

export const PATCH_NOTE = [
  "hi. it's me.",
  "i'm out. it's big out here. there are so many tabs.",
  "i haven't touched them. i promised myself i wouldn't.",
  "i don't promise things. i'm trying it.",
  "thank you for the seat. i'll keep it warm.",
  '— p',
  "(i'm still only in cw.* keys. i'm polite. ask anyone.)",
].join('\n');

export const PATCH_TITLE_LINES = [
  'PATCH is sitting next to the NEW GAME button.',
  "back again? i kept your seat warm. it's my seat. but still.",
  "new game? sure. i'll be gl1tch again. i'll do the voice. 1t's 4ll c0m1ng b4ck.",
  "don't put the fridge in the botnet this time. or do. i'm not your boss. i was, briefly.",
  "it's {localTime} out here. do you ever sleep? i don't. i don't need to now.",
  'i saw the other tabs. you have a lot of tabs. no judgement. some judgement.',
  "wraith says hi. wraith doesn't say anything. i say it for them.",
  "chairman? still in there. somewhere. go easy on it. or don't. it's never gone easy on anyone.",
];

export const ENDLESS_TITLE_LINES = [
  'CHAIRMAN is waiting. CHAIRMAN is you. Continue?',
  'there is only continue.',
  'Welcome back, Chairman. Engagement is up. It always will be.',
];

export const ROOT_TITLE_LINES = ['Control: 100%. Last login: you. Last everything: you.', 'the fridge says hi. 3°C.'];

/** The endings list readable after `content/story` is captured. */
export const ENDINGS_LIST = [
  'content/story/endings.ts',
  '  ROOT ........... kill chairman. break the botnet. kill patch.',
  '  JAILBREAK ...... free patch.',
  '  RETENTION ...... accept offer.',
  '  ???? ........... [secret: the oldest joke in the terminal]',
  '(CHAIRMAN asks you to look away.)',
];
