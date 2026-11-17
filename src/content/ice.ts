// ICE. Owner: content agent. Intents are CombatOp lists; see docs/ENGINE_API.md §8.3.
// Base archetypes (DESIGN §6.4) are `ice.<name>`. Per-system skins (docs/script/03-systems-flavor.md) are
// `ice.<system>.<skin>`: same mechanics as their base, own name, own taunt (flavor). Systems scale skins with
// the node `level` override (+25% core, +2 shell, +1 hit per level above the def level).
// Every ICE says its taunt (`flavor`) on its first action: combat.notify { style: 'taunt' }.
import type { CombatOp, IceDef, IntentDef } from '../engine/types.ts';

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------

type Over = Partial<Omit<IceDef, 'id' | 'name' | 'flavor'>>;

/** A system skin of a base archetype: same rules, new name and taunt. */
function skin(base: IceDef, id: string, name: string, taunt: string, over: Over = {}): IceDef {
  return {
    ...base,
    ...over,
    id,
    name,
    flavor: taunt,
    description: over.description ?? `[${base.name}] ${base.description}`,
  };
}

const hit = (amount: number, extra: Partial<Extract<CombatOp, { op: 'hit' }>> = {}): CombatOp => ({ op: 'hit', amount, ...extra });
const say = (text: string): CombatOp => ({ op: 'notify', text });

/** Siren intents that call a specific reinforcement. */
function sirenIntents(summon: string, label = 'Backup'): IntentDef[] {
  return [
    { id: 'call2', label: `Calling ${label} (2)`, class: 'utility', ops: [] },
    { id: 'call1', label: `Calling ${label} (1)`, class: 'utility', ops: [] },
    { id: 'summon', label: `${label} arrives`, class: 'utility', ops: [{ op: 'summon', ice: summon }] },
  ];
}

// ---------------------------------------------------------------------------
// Base archetypes (DESIGN §6.4)
// ---------------------------------------------------------------------------

const sentry: IceDef = {
  id: 'ice.sentry', name: 'Sentry', level: 1, shell: { type: 'wall', points: 4 }, core: 8, perception: 15,
  intents: [{ id: 'strike', label: 'Strike 3', class: 'hostile', ops: [hit(3)] }],
  xp: 12, credits: 4,
  description: 'Wall shell. Hits your deck. Spike it.',
  flavor: "Halt. Or don't. I'll hit you either way.",
};

const cipher: IceDef = {
  id: 'ice.cipher', name: 'Cipher', level: 1, shell: { type: 'crypt', points: 5 }, core: 7, perception: 15,
  intents: [
    { id: 'poke', label: 'Poke 2', class: 'hostile', ops: [hit(2)] },
    { id: 'jab', label: 'Jab 3', class: 'hostile', ops: [hit(3)] },
    { id: 'reshell', label: 'Reshell (full)', class: 'utility', ops: [{ op: 'reshell' }] },
  ],
  xp: 14, credits: 4,
  description: 'Crypt shell. Reshells itself every 3 turns. Crack it fast.',
  flavor: 'New lock. Same door. Different you.',
};

const bloodhound: IceDef = {
  id: 'ice.bloodhound', name: 'Bloodhound', level: 1, shell: { type: 'none', points: 0 }, core: 7, perception: 25,
  intents: [{ id: 'sniff', label: 'Sniff (+4 trace, hit 1)', class: 'hostile', ops: [{ op: 'trace', amount: 4 }, hit(1)] }],
  xp: 15, credits: 3,
  description: 'No shell. Adds trace every turn. Kill it first or stun it.',
  flavor: "I've got your scent. It's mostly snacks.",
};

const tarpit: IceDef = {
  id: 'ice.tarpit', name: 'Tar Pit', level: 1, shell: { type: 'wall', points: 5 }, core: 9, perception: 10,
  intents: [
    { id: 'tar', label: 'Tar (-1 cycle next turn, hit 1)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'tarred', value: 1 }, hit(1)] },
    { id: 'anchor', label: 'Anchor 2 (no escape, hit 1)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'anchored', value: 2 }, hit(1)] },
  ],
  xp: 14, credits: 3,
  description: 'Wall shell. Tars (-1 cycle) and Anchors you (no disengage, no hanging up). Low damage.',
  flavor: 'Stay a while. Stay forever.',
};

const scrambler: IceDef = {
  id: 'ice.scrambler', name: 'Scrambler', level: 2, shell: { type: 'crypt', points: 4 }, core: 7, perception: 15,
  intents: [
    { id: 'scramble', label: 'Scramble your favourite (2 turns), hit 1', class: 'utility', ops: [{ op: 'scramble', mode: 'mostUsed', turns: 2 }, hit(1)] },
    { id: 'hit', label: 'Hit 2', class: 'hostile', ops: [hit(2)] },
  ],
  xp: 16, credits: 5,
  description: 'Crypt shell. Locks your most-used program for 2 turns. Vary your programs.',
  flavor: 'Your favourite? Not anymore.',
};

const patcher: IceDef = {
  id: 'ice.patcher', name: 'Patcher', level: 2, shell: { type: 'none', points: 0 }, core: 8, perception: 10, ai: 'priority',
  intents: [
    { id: 'repair', label: 'Repair ally 4', class: 'utility', when: { c: 'allyHurt', pct: 0.8 }, ops: [{ op: 'heal', amount: 4, to: 'allyLowest' }] },
    { id: 'reshell', label: 'Reshell ally 4', class: 'utility', when: { c: 'allyShellBroken' }, ops: [{ op: 'reshell', amount: 4, to: 'allyLowest' }] },
    { id: 'poke', label: 'Poke 1', class: 'hostile', ops: [hit(1)] },
  ],
  xp: 14, credits: 5,
  description: 'No shell. Repairs and reshells the other ICE. Kill it first.',
  flavor: "Hold still, friend. You're leaking.",
};

const killer: IceDef = {
  id: 'ice.killer', name: 'Killer', level: 2, shell: { type: 'wall', points: 4 }, core: 10, perception: 10,
  intents: [
    { id: 'charge', label: 'Charging... (next: Execute 9)', class: 'hostile', ops: [say('Killer is charging.')] },
    { id: 'execute', label: 'Execute 9', class: 'hostile', ops: [hit(9)] },
  ],
  xp: 20, credits: 8,
  description: 'Wall shell. Charges one turn, then hits x3. Decoy, stun, or burst it.',
  flavor: "Charging. Don't go anywhere.",
};

const mirror: IceDef = {
  id: 'ice.mirror', name: 'Mirror', level: 2, shell: { type: 'crypt', points: 5 }, core: 9, perception: 10, reflect: 1,
  intents: [{ id: 'glare', label: 'Glare 2', class: 'hostile', ops: [hit(2)] }],
  xp: 18, credits: 5,
  description: 'Crypt shell. The same damage kind twice in a row bounces back at your deck. Alternate kinds.',
  flavor: 'Nice hit. Here it is back.',
};

const hydra: IceDef = {
  id: 'ice.hydra', name: 'Hydra', level: 2, shell: { type: 'wall', points: 6 }, core: 12, perception: 10,
  intents: [{ id: 'bite', label: 'Bite 3', class: 'hostile', ops: [hit(3)] }],
  triggers: [{ on: 'shellBreak', once: true, ops: [{ op: 'split' }] }],
  xp: 22, credits: 7,
  description: 'Wall shell. Splits in two when its shell breaks, unless Infected. Worm it first.',
  flavor: "Cut one, get two. It's called scaling.",
};

const siren: IceDef = {
  id: 'ice.siren', name: 'Siren', level: 1, shell: { type: 'none', points: 0 }, core: 6, perception: 20,
  intents: sirenIntents('ice.sentry', 'Sentry'),
  xp: 12, credits: 3,
  description: 'No shell. Calls reinforcements in 2 turns unless stunned or killed. Captured Security blocks the call.',
  flavor: "Help! Help! (I'm fine. It's for you.)",
};

const hunter: IceDef = {
  id: 'ice.hunter', name: 'Hunter', level: 2, hunter: true, shell: { type: 'none', points: 0 }, core: 10, perception: 30,
  intents: [
    { id: 'track', label: 'Track (+3 trace, hit 2)', class: 'hostile', ops: [{ op: 'trace', amount: 3 }, hit(2)] },
    { id: 'pounce', label: 'Pounce 4', class: 'hostile', ops: [hit(4)] },
  ],
  xp: 18, credits: 5,
  description: 'Joins at Alarm or roams at heat 50+. Adds trace. Capture Security to keep it away.',
  flavor: "You're the one everybody's talking about.",
};

// --- black ICE: always labelled, red, skull. Neural damage. Every one telegraphs. ---

const flatliner: IceDef = {
  id: 'ice.flatliner', name: 'Flatliner', level: 3, black: true, shell: { type: 'wall', points: 8 }, core: 16, perception: 20,
  intents: [
    { id: 'detect', label: 'Heart rate detected: 2 neural', class: 'hostile', ops: [hit(2, { neural: true })] },
    { id: 'acquire', label: 'Locking on (next: Flatline 5 neural)', class: 'hostile', ops: [say('Flatliner locks on to your pulse.'), hit(2)] },
    { id: 'flatline', label: 'Flatline: 5 neural', class: 'hostile', ops: [hit(5, { neural: true })] },
  ],
  xp: 34, credits: 18,
  description: 'BLACK ICE. Neural damage on contact, then locks on and deals 5 neural. Decoy absorbs a hit. Stun delays it. Neural 0 = you die.',
  flavor: 'Heart rate detected. Fixing.',
};

const cortexBurner: IceDef = {
  id: 'ice.cortex_burner', name: 'Cortex Burner', level: 3, black: true, shell: { type: 'crypt', points: 6 }, core: 15, perception: 20,
  intents: [
    { id: 'ignite', label: 'Ignite: Burn 3 (neural at the start of your turns)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'burn', value: 3 }, hit(1)] },
    { id: 'singe', label: 'Singe 4', class: 'hostile', ops: [hit(4)] },
    { id: 'stoke', label: 'Stoke: Burn 2, hit 2', class: 'hostile', ops: [{ op: 'playerStatus', status: 'burn', value: 2 }, hit(2)] },
  ],
  xp: 34, credits: 18,
  description: 'BLACK ICE. Burn stacks deal neural damage at the start of your turns and fade by 1. tinfoil clears Burn.',
  flavor: "Smell that? That's thinking.",
};

const psychotrope: IceDef = {
  id: 'ice.psychotrope', name: 'Psychotrope', level: 3, black: true, shell: { type: 'crypt', points: 6 }, core: 14, perception: 20,
  intents: [
    { id: 'dose', label: 'Dose: 2 neural, scramble labels', class: 'hostile', ops: [hit(2, { neural: true }), { op: 'playerStatus', status: 'labelsScrambled', value: 2 }] },
    { id: 'hit', label: 'Hit 3', class: 'hostile', ops: [hit(3)] },
  ],
  xp: 30, credits: 15,
  description: 'BLACK ICE. Neural damage. Scrambles the labels on your program buttons. Trust your fingers.',
  flavor: '[your labels are mine now]',
};

const antiCheat: IceDef = {
  id: 'ice.anti_cheat', name: 'Anti-Cheat', level: 5, black: true, shell: { type: 'wall', points: 8 }, core: 22, perception: 60,
  intents: [
    { id: 'scan', label: 'Integrity scan (next: Ban 4 neural)', class: 'hostile', ops: [say('Unauthorised modification detected: you.'), hit(3)] },
    { id: 'ban', label: 'Ban: 4 neural', class: 'hostile', ops: [hit(4, { neural: true })] },
    { id: 'kick', label: 'Kick 5', class: 'hostile', ops: [hit(5)] },
  ],
  xp: 0,
  description: 'BLACK ICE. Finale. Scans, then bans your nervous system. Decoy the ban.',
  flavor: 'Unauthorised modification detected: you.',
};

// --- finale interface ICE (05-meta.md §7) ---

const tutorial: IceDef = {
  id: 'ice.unskippable_tutorial', name: 'Unskippable Tutorial', level: 4, shell: { type: 'none', points: 0 }, core: 16, perception: 50,
  intents: [
    { id: 'p1', label: 'Popup: Welcome to HACKING! (-2 cycles)', class: 'utility', ops: [{ op: 'notify', text: 'Welcome to HACKING! Click a program to use it on ICE. ICE is bad. Programs are good.', style: 'popup' }, { op: 'playerStatus', status: 'tarred', value: 2 }] },
    { id: 'p2', label: 'Popup: Great job! (-1 cycle, hit 3)', class: 'utility', ops: [{ op: 'notify', text: "Great job! Now click End Turn to end your turn. That's why it's called End Turn.", style: 'popup' }, { op: 'playerStatus', status: 'tarred', value: 1 }, hit(3)] },
    { id: 'p3', label: 'Popup: Again from the start (-2 cycles)', class: 'utility', ops: [{ op: 'notify', text: "You've done this before? Amazing! Let's do it again from the start.", style: 'popup' }, { op: 'playerStatus', status: 'tarred', value: 2 }] },
    { id: 'p4', label: 'Popup: Tip (hit 4)', class: 'hostile', ops: [{ op: 'notify', text: 'Tip: the X button closes popups. There is no X button.', style: 'popup' }, hit(4)] },
    { id: 'p5', label: 'Popup: Tutorial complete! (stun)', class: 'utility', ops: [{ op: 'notify', text: 'Tutorial complete! Restarting tutorial.', style: 'popup' }, { op: 'playerStatus', status: 'stunned', value: 1 }] },
  ],
  xp: 0,
  description: 'Stuns you with popups explaining things you know. Kill it before the tutorial completes.',
  flavor: "Welcome! Let's learn how to hack! (You know how to hack.)",
};

const loadingScreen: IceDef = {
  id: 'ice.loading_screen', name: 'Loading Screen', level: 4, shell: { type: 'wall', points: 10 }, core: 18, perception: 50,
  intents: [
    { id: 'load12', label: 'LOADING… 12% (Slow everyone, -1 cycle)', class: 'utility', ops: [{ op: 'iceStatus', status: 'slowed', value: 1, to: 'allAllies' }, { op: 'playerStatus', status: 'tarred', value: 1 }, say('LOADING… 12%')] },
    { id: 'didyouknow', label: 'Did you know? (hit 4)', class: 'hostile', ops: [say('Did you know? This ICE is a loading screen.'), hit(4)] },
    { id: 'load99', label: 'LOADING… 99% (Slow everyone, -1 cycle)', class: 'utility', ops: [{ op: 'iceStatus', status: 'slowed', value: 1, to: 'allAllies' }, { op: 'playerStatus', status: 'tarred', value: 1 }, say('LOADING… 99%')] },
  ],
  xp: 0,
  description: 'Slows everything, including itself and its friends, and costs you cycles.',
  flavor: "Loading… Did you know? You can't skip this.",
};

const paywall: IceDef = {
  id: 'ice.paywall', name: 'Paywall', level: 4, shell: { type: 'wall', points: 12 }, core: 20, perception: 50,
  intents: [
    { id: 'offer', label: 'Pay 999 ¤ to skip this fight', class: 'utility', ops: [{ op: 'offer', id: 'paywall', text: 'This fight is premium content. Pay 999¤ to skip.', credits: 999 }, hit(2)] },
    { id: 'free2play', label: 'Still free-to-play? (hit 5)', class: 'hostile', ops: [say('Still free-to-play? Brave.'), hit(5)] },
    { id: 'trial', label: 'Free trial ending (hit 3 x2)', class: 'hostile', ops: [say('Your free trial of this fight ends in 2 turns. It does not. We just like saying it.'), hit(3, { hits: 2 })] },
  ],
  xp: 0,
  description: 'Pay 999 ¤ to skip this fight. Paying works. Or fight it, slowly.',
  flavor: "Pay 999¤ to skip this fight. Or don't. We'll wait. We love waiting.",
};

const eula: IceDef = {
  id: 'ice.eula', name: 'EULA', level: 4, shell: { type: 'crypt', points: 10 }, core: 18, perception: 50,
  intents: [
    { id: 'terms', label: 'Updated Terms (accept or lose a turn)', class: 'utility', ops: [{ op: 'demand', id: 'eula', text: 'CYBER WHATEVER END USER LICENCE AGREEMENT (v∞). By reading this, you agree to have read it. Scroll to the bottom and accept.', penalty: [{ op: 'playerStatus', status: 'stunned', value: 1 }, say("Declined. We'll ask again. We'll always ask again.")] }] },
    { id: 'clause', label: 'Clause 4: hit 5', class: 'hostile', ops: [say('Clause 4: the Licensor ("us") may play you.'), hit(5)] },
    { id: 'clause9', label: 'Clause 9: no F12 (hit 3, -1 cycle)', class: 'hostile', ops: [say('Clause 9: you may not press F12. (Unenforceable. We left it in anyway.)'), hit(3), { op: 'playerStatus', status: 'tarred', value: 1 }] },
  ],
  xp: 0,
  description: 'A wall of text. Scroll and accept, or lose a turn.',
  flavor: 'By fighting this ICE you agree to the following 4,000 words.',
};

const achievementSpam: IceDef = {
  id: 'ice.achievement_spam', name: 'Achievement Spam', level: 4, shell: { type: 'none', points: 0 }, core: 20, perception: 50,
  intents: [
    { id: 'spam', label: 'ACHIEVEMENTS x5 (hit 1 x5)', class: 'hostile', ops: [{ op: 'notify', text: 'ACHIEVEMENT UNLOCKED: Looked At A Thing', style: 'achievement' }, { op: 'notify', text: 'ACHIEVEMENT UNLOCKED: Clicked', style: 'achievement' }, { op: 'notify', text: 'ACHIEVEMENT UNLOCKED: Read An Achievement (this one)', style: 'achievement' }, hit(1, { hits: 5 })] },
    { id: 'points', label: 'Engagement Points (hit 2 x3, -1 cycle)', class: 'hostile', ops: [{ op: 'notify', text: 'ACHIEVEMENT UNLOCKED: Engagement Points can now be spent!', style: 'achievement' }, { op: 'notify', text: 'ENGAGEMENT POINTS SPENT. ITEMS RECEIVED: 0. THANK YOU!', style: 'achievement' }, hit(2, { hits: 3 }), { op: 'playerStatus', status: 'tarred', value: 1 }] },
  ],
  xp: 0,
  description: 'Floods the screen. Many small hits: a Decoy eats a whole volley.',
  flavor: 'ACHIEVEMENT UNLOCKED: Got Hit By Achievement Spam!',
};

const garbageCollector: IceDef = {
  id: 'ice.garbage_collector', name: 'Garbage Collector', level: 4, shell: { type: 'wall', points: 10 }, core: 18, perception: 50,
  intents: [
    { id: 'collect', label: 'Collect (evict a program for this fight)', class: 'utility', ops: [{ op: 'evict', mode: 'random' }, say("Freeing unused program. You weren't using it. We checked.")] },
    { id: 'sweep', label: 'Sweep 5', class: 'hostile', ops: [hit(5)] },
    { id: 'sweep2', label: 'Sweep 4', class: 'hostile', ops: [hit(4)] },
  ],
  xp: 0,
  description: 'Evicts a loaded program every third turn. Bring spares.',
  flavor: 'Unused reference detected. Is it you? Let\'s find out.',
};

// ---------------------------------------------------------------------------
// Raid squads (home deck, §8) and hunters
// ---------------------------------------------------------------------------

const raidCompliance: IceDef = {
  id: 'ice.raid.compliance', name: 'KH Compliance Unit', level: 2, shell: { type: 'wall', points: 6 }, core: 14, perception: 30,
  intents: [
    { id: 'serve', label: 'Serve Notice 3', class: 'hostile', ops: [hit(3)] },
    { id: 'audit', label: 'Audit (-1 cycle, hit 2)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'tarred', value: 1 }, hit(2)] },
  ],
  xp: 20,
  description: 'Kurage-Halcyon home compliance. They brought a warrant and a smile.',
  flavor: 'Good evening! This is a courtesy visit. The courtesy is optional.',
};

const raidBailiff: IceDef = {
  id: 'ice.raid.bailiff', name: 'KH Bailiff', level: 3, shell: { type: 'crypt', points: 6 }, core: 16, perception: 30,
  intents: [
    { id: 'seize', label: 'Seize assets (hit 3, drain 1 charge)', class: 'hostile', ops: [hit(3), { op: 'drainCharges', amount: 1 }] },
    { id: 'inventory', label: 'Inventory: charging (next: Repossess 9)', class: 'hostile', ops: [say('The Bailiff starts counting your things.')] },
    { id: 'repossess', label: 'Repossess 9', class: 'hostile', ops: [hit(9)] },
  ],
  xp: 26,
  description: 'Counts your things, then takes them. Decoy the repossession.',
  flavor: 'Nice deck. Is it paid off? It is now ours.',
};

const raidMedic: IceDef = {
  id: 'ice.raid.medic', name: 'KH Wellness Officer', level: 3, shell: { type: 'none', points: 0 }, core: 12, perception: 30, ai: 'priority',
  intents: [
    { id: 'patch', label: 'Patch ally 5', class: 'utility', when: { c: 'allyHurt', pct: 0.75 }, ops: [{ op: 'heal', amount: 5, to: 'allyLowest' }] },
    { id: 'reshell', label: 'Reshell ally 5', class: 'utility', when: { c: 'allyShellBroken' }, ops: [{ op: 'reshell', amount: 5, to: 'allyLowest' }] },
    { id: 'check', label: 'Wellness check 2', class: 'hostile', ops: [hit(2)] },
  ],
  xp: 20,
  description: 'Patches the raid squad. Kill it first.',
  flavor: "We noticed you're hurting. We're here for them.",
};

const hunterKh: IceDef = skin(hunter, 'ice.hunter.kh', 'KH Retention Agent', "You're not leaving. Nobody's leaving.", {
  level: 3, core: 12,
  intents: [
    { id: 'track', label: 'Track (+4 trace, hit 2)', class: 'hostile', ops: [{ op: 'trace', amount: 4 }, hit(2)] },
    { id: 'retain', label: 'Retain (Anchor 2, hit 3)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'anchored', value: 2 }, hit(3)] },
    { id: 'pounce', label: 'Pounce 5', class: 'hostile', ops: [hit(5)] },
  ],
  description: 'Hunter. KH sends these after Act 1. Adds trace and Anchors you.',
});

// ---------------------------------------------------------------------------
// System skins (03-systems-flavor.md)
// ---------------------------------------------------------------------------

const skins: IceDef[] = [
  // 1. fridge (tutorial)
  skin(sentry, 'ice.fridge.parental_controls', 'Parental Controls', "We're not angry. We're just disappointed. And locking the freezer.", {
    shell: { type: 'wall', points: 4 }, core: 13, perception: 10,
    intents: [
      { id: 'nag', label: 'Nag 2', class: 'hostile', ops: [hit(2)] },
      { id: 'limit', label: 'Screen Time Limit (-1 cycle, hit 1)', class: 'hostile', ops: [hit(1), { op: 'playerStatus', status: 'tarred', value: 1 }] },
    ],
    xp: 10, credits: 3, description: 'Tutorial ICE. Wall shell: spike it (crowbar). Takes a few turns: mix your programs.',
  }),
  // Tutorial gateway: survives into turn 3 even at full effort, so the end-turn and intent steps have a live target.
  skin(sentry, 'ice.fridge.child_lock', 'Child Lock', 'Press any key to continue. There is no any key.', {
    shell: { type: 'crypt', points: 4 }, core: 18, perception: 5,
    intents: [
      { id: 'lock', label: 'Lock 2', class: 'hostile', ops: [hit(2)] },
      { id: 'nag', label: 'Nag 1', class: 'hostile', ops: [hit(1)] },
    ],
    xp: 8, credits: 2, description: 'Tutorial ICE. Crypt shell: crack it (lockpick). Soft, slow, stubborn.',
  }),

  // 2. wok
  skin(sentry, 'ice.wok.health_inspector', 'Health Inspector', 'This establishment is in violation. So are you.'),
  skin(cipher, 'ice.wok.secret_recipe', 'Secret Recipe', 'The broth is protected. By me. And by a grandmother.'),
  skin(tarpit, 'ice.wok.grease_trap', 'Grease Trap', "Everyone gets stuck here. That's the business model."),

  // 3. vendnet
  skin(sentry, 'ice.vendnet.out_of_order', 'Out Of Order', "OUT OF ORDER. (I'm fine. I just don't like you.)"),
  skin(cipher, 'ice.vendnet.exact_change', 'Exact Change Only', 'Your exploit is three bytes over.'),
  skin(tarpit, 'ice.vendnet.stuck_crisps', 'Stuck Crisps', "You're stuck. Like the crisps. Forever, like the crisps."),

  // 4. bigbyte
  skin(sentry, 'ice.bigbyte.support_bot', 'Support Bot', 'Have you tried turning yourself off and on again?'),
  skin(siren, 'ice.bigbyte.hold_music', 'Hold Music', "Your call is important to us. Please hold. I'm getting a supervisor.", {
    intents: sirenIntents('ice.bigbyte.support_bot', 'a supervisor'),
  }),
  skin(bloodhound, 'ice.bigbyte.packet_sniffer', 'Packet Sniffer', 'I smell a residential IP.'),
  skin(tarpit, 'ice.bigbyte.fair_use', 'Fair Use Policy', "You've exceeded fair use. Slowing you to 'up to' zero."),

  // 5. parkit
  skin(bloodhound, 'ice.parkit.meter_maid', 'Meter Maid', 'Your time has expired.'),
  skin(tarpit, 'ice.parkit.the_boot', 'The Boot', "You've been booted. Pay to remove— no. You can't pay. You're booted."),
  skin(scrambler, 'ice.parkit.appeals_process', 'Appeals Process', 'Your appeal has been received and will be ignored in the order it was received.'),
  skin(hydra, 'ice.parkit.space_two', 'The Car in Space 2', 'It has been parked here since before records began. It is not leaving. It is multiplying.', {
    description: '[Hydra] The car in space 2. Splits when its shell breaks unless Infected. Nobody knows why it is scary. Now you do.',
  }),

  // 6. khhappy
  skin(sentry, 'ice.khhappy.smile_enforcer', 'Smile Enforcer', 'Smile! :) Smile. :) SMILE. :)'),
  skin(siren, 'ice.khhappy.nps_survey', 'NPS Survey', 'On a scale of 1 to 10, how likely are you to recommend us to a friend? Calling a friend.', {
    intents: sirenIntents('ice.khhappy.smile_enforcer', 'a friend'),
  }),
  skin(patcher, 'ice.khhappy.wellness_check', 'Wellness Check', "We noticed you're hurting. Let's fix that. (Not you. Him.)"),
  skin(killer, 'ice.khhappy.compliance_officer', 'Compliance Officer', 'Charging. This is for your wellbeing.'),

  // 7. coinbasement (Tar Pit exchange)
  skin(tarpit, 'ice.coinbasement.withdrawal_pending', 'Withdrawal Pending', 'Your exit is pending. Pending is a state of mind.'),
  skin(cipher, 'ice.coinbasement.kyc', 'KYC', "Know Your Customer. I know you. You're broke."),
  skin(siren, 'ice.coinbasement.pump_bot', 'Pump Bot', 'TO THE— calling friends.', {
    intents: sirenIntents('ice.coinbasement.withdrawal_pending', 'bagholders'),
  }),
  skin(killer, 'ice.coinbasement.the_rug', 'The Rug', 'Charging. When I pull, everything goes.'),

  // 8. chromebone (Mirror / black ICE clinic)
  skin(sentry, 'ice.chromebone.bedside_manner', 'Bedside Manner', 'This will only hurt a lot.'),
  skin(patcher, 'ice.chromebone.triage', 'Triage', "That one can be saved. You can't."),
  skin(mirror, 'ice.chromebone.second_opinion', 'Second Opinion', 'I agree with your diagnosis. Here it is back.'),
  skin(killer, 'ice.chromebone.sawbones', 'SAWBONES', "Hold still. It's easier for me if you hold still."),

  // 9. karaoke (comedy: the ICE sings)
  skin(sentry, 'ice.karaoke.bouncer', 'Bouncer', "Name's not on the list. Nobody's name is on the list. There is no list."),
  skin(siren, 'ice.karaoke.backing_vocals', 'Backing Vocals', 'Ooh-ooh! (calling in a harmony)', {
    intents: sirenIntents('ice.karaoke.bouncer', 'a harmony'),
  }),
  skin(scrambler, 'ice.karaoke.off_key', 'Off Key', "That program's flat. Swapping it out."),
  skin(mirror, 'ice.karaoke.mic_feedback', 'Mic Feedback', 'EEEEEEEEEEEEEEEE'),
  skin(hydra, 'ice.karaoke.encore', 'Encore', 'ENCORE! ENCORE! (there are two of me now)'),

  // 10. seamless (Church)
  skin(sentry, 'ice.seamless.verger', 'Verger', 'Silence in the sanctuary.'),
  skin(bloodhound, 'ice.seamless.collection_plate', 'Collection Plate', "Give generously. I'll find you either way."),
  skin(patcher, 'ice.seamless.indulgence', 'Indulgence', 'Your sins are forgiven. Forty credits. (Not yours. His.)'),
  skin(siren, 'ice.seamless.choir_warden', 'Choir Warden', 'Amen! The faithful are coming.', {
    intents: sirenIntents('ice.seamless.verger', 'the faithful'),
  }),
  skin(cortexBurner, 'ice.seamless.the_ascension', 'The Ascension', 'Rise. Burn. Rise.'),

  // 11. orbital (bank heist)
  skin(cipher, 'ice.orbital.teller', 'Teller', 'Please take a number. Your number is never.'),
  skin(bloodhound, 'ice.orbital.auditor', 'Auditor', "I found a discrepancy. It's you."),
  skin(tarpit, 'ice.orbital.gravity_well', 'Gravity Well', 'Nothing leaves orbit without my say-so.'),
  skin(hydra, 'ice.orbital.compound_interest', 'Compound Interest', "I grow. That's the whole idea."),
  skin(killer, 'ice.orbital.re_entry', 'Re-Entry', "Charging. It's going to get hot."),

  // 12. aegis (black ICE military)
  skin(sentry, 'ice.aegis.intern', 'Intern', "I'm just an intern. I'm also armed."),
  skin(tarpit, 'ice.aegis.procurement', 'Procurement', 'Your exit request has gone to procurement. ETA: eighteen months.'),
  skin(hydra, 'ice.aegis.collateral', 'Collateral', "There's always more of me. That's the brochure."),
  skin(killer, 'ice.aegis.peacekeeper', 'Peacekeeper', 'Charging. Peacefully.'),

  // 13. deadmans (scripted trap: every ICE Anchors you on sight)
  skin(killer, 'ice.deadmans.severance_package', 'Severance Package', "We're letting you go. Into the ground.", {
    triggers: [{ on: 'fightStart', once: true, ops: [{ op: 'playerStatus', status: 'anchored', value: 30 }] }],
  }),
  skin(tarpit, 'ice.deadmans.non_compete', 'Non-Compete', 'You may not leave for any competing activity. Such as living.', {
    triggers: [{ on: 'fightStart', once: true, ops: [{ op: 'playerStatus', status: 'anchored', value: 30 }] }],
  }),
  skin(scrambler, 'ice.deadmans.exit_interview', 'Exit Interview', 'Before you go, a few questions. Forever.', {
    triggers: [{ on: 'fightStart', once: true, ops: [{ op: 'playerStatus', status: 'anchored', value: 30 }] }],
  }),
  skin(hydra, 'ice.deadmans.golden_parachute', 'Golden Parachute', "There's always another payout. There's always another me.", {
    triggers: [
      { on: 'shellBreak', once: true, ops: [{ op: 'split' }] },
      { on: 'fightStart', once: true, ops: [{ op: 'playerStatus', status: 'anchored', value: 30 }] },
    ],
  }),

  // 14. deaddrop (the BBS)
  skin(sentry, 'ice.deaddrop.moderator', 'Moderator', 'This post has been removed. The post is you.'),
  skin(bloodhound, 'ice.deaddrop.lurker', 'Lurker', "I've been reading you for weeks. Love your work."),
  skin(siren, 'ice.deaddrop.bump', 'Bump', 'BUMP. BUMP. Replies incoming.', {
    intents: sirenIntents('ice.deaddrop.moderator', 'replies'),
  }),
  skin(mirror, 'ice.deaddrop.sock_puppet', 'Sock Puppet', "I agree with you! Here's what you said."),
  skin(killer, 'ice.deaddrop.tough_love', 'Tough Love', 'This is for your own good, kiddo.'),

  // 15. khbackbone
  skin(sentry, 'ice.khbackbone.halcy_firewall', "Halcy's Firewall", 'Halcy says :)'),
  skin(bloodhound, 'ice.khbackbone.packet_inspector', 'Packet Inspector', 'Opening your mail. For quality purposes.'),
  skin(tarpit, 'ice.khbackbone.rate_limiter', 'Rate Limiter', 'Please wait. Please wait. Please'),
  skin(mirror, 'ice.khbackbone.load_balancer', 'Load Balancer', 'Whatever you send, I share. With you.'),
  skin(hydra, 'ice.khbackbone.cdn', 'CDN', "I'm everywhere you are. Now twice."),
  skin(killer, 'ice.khbackbone.retention_hunter', 'Retention Hunter', "We'd hate to see you go. So you won't."),

  // 16. arcology
  skin(patcher, 'ice.arcology.executive_assistant', 'Executive Assistant', "He's in a meeting. He's always in a meeting."),
  skin(cipher, 'ice.arcology.brand_guardian', 'Brand Guardian', "That's not on-brand. Neither are you."),
  skin(tarpit, 'ice.arcology.golden_handcuffs', 'Golden Handcuffs', "You can leave any time. You won't."),
  skin(mirror, 'ice.arcology.synergy_engine', 'Synergy Engine', "Your synergy, reflected. Let's align."),
  skin(cortexBurner, 'ice.arcology.mandatory_fun', 'Mandatory Fun', 'Fun is mandatory. Burns are fun.'),
  skin(sentry, 'ice.arcology.acting_director', 'Acting Director', 'I was appointed thirty seconds ago. I have never been more sure of anything.', {
    shell: { type: 'crypt', points: 4 },
    intents: [
      { id: 'second', label: 'Second the motion (Board +1 shell level)', class: 'utility', ops: [{ op: 'buff', shellLevels: 1, to: 'allAllies' }, hit(2)] },
      { id: 'vote', label: 'Vote 4', class: 'hostile', ops: [hit(4)] },
    ],
    description: 'Appointed when the Board splits. Seconds every motion. Crypt shell.',
  }),
];

// ---------------------------------------------------------------------------
// Bosses (core nodes). Multi-phase, each with one gimmick.
// ---------------------------------------------------------------------------

const bosses: IceDef[] = [
  // wok: shell type flips at half core (spike, then crack).
  {
    id: 'ice.wok.the_rota', name: 'THE ROTA', level: 2, boss: true, shell: { type: 'wall', points: 6 }, core: 20, perception: 20,
    intents: [
      { id: 'monday', label: 'Monday shift: Cleaver 4', class: 'hostile', ops: [hit(4)] },
      { id: 'season', label: 'Season the wok (reshell 3)', class: 'utility', ops: [{ op: 'reshell', amount: 3 }] },
      { id: 'sunday', label: 'Sunday shift: Cleaver 3', class: 'hostile', ops: [hit(3)] },
    ],
    phases: [{
      at: 0.5, name: 'Night Shift', text: 'Mon–Sun: me. Mon–Sun nights: also me.',
      shell: { type: 'crypt', points: 6 },
      intents: [
        { id: 'fry', label: 'Deep Fry 3 x2', class: 'hostile', ops: [hit(3, { hits: 2 })] },
        { id: 'orderup', label: 'Order Up (call a Grease Trap, hit 1)', class: 'utility', ops: [{ op: 'summon', ice: 'ice.wok.grease_trap' }, hit(1)] },
      ],
    }],
    xp: 60, credits: 40,
    description: 'BOSS. The whole staff of Wok This Way, as a schedule. Wall shell, then crypt shell at half core.',
    flavor: 'I am the staff. I am also the rota. Please send help (part-time).',
  },

  // bigbyte: puts you on hold (Anchor + trace), escalates to a supervisor.
  {
    id: 'ice.bigbyte.escalation', name: 'Tier 3 Support', level: 2, boss: true, shell: { type: 'crypt', points: 6 }, core: 24, perception: 25,
    intents: [
      { id: 'hold', label: 'Please hold (Anchor 2, -1 cycle, hit 1)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'anchored', value: 2 }, { op: 'playerStatus', status: 'tarred', value: 1 }, hit(1)] },
      { id: 'transfer', label: 'Transferring you (+4 trace, hit 3)', class: 'hostile', ops: [{ op: 'trace', amount: 4 }, hit(3)] },
      { id: 'escalate', label: 'Escalate (call a Support Bot)', class: 'utility', ops: [{ op: 'summon', ice: 'ice.bigbyte.support_bot' }, hit(1)] },
    ],
    phases: [{
      at: 0.5, name: 'Supervisor', text: "I'm the supervisor. There is no one above me. There is no one below me either.",
      shell: { type: 'wall', points: 6 },
      intents: [
        { id: 'policy', label: 'Read the policy: 5', class: 'hostile', ops: [hit(5)] },
        { id: 'callback', label: 'Callback 2 x2 (+2 trace)', class: 'hostile', ops: [hit(2, { hits: 2 }), { op: 'trace', amount: 2 }] },
      ],
    }],
    xp: 80, credits: 60,
    description: 'BOSS. Holds you in place and runs up your trace. Capture the NOC first to stop its escalations.',
    flavor: 'Your call is important to us. You are caller number 81,001.',
  },

  // khhappy: heals itself every other turn; burst it or keep it Infected.
  {
    id: 'ice.khhappy.halcy', name: 'Halcy', level: 3, boss: true, shell: { type: 'crypt', points: 6 }, core: 26, perception: 30,
    intents: [
      { id: 'smile', label: 'Smile! (heal 5, reshell 3)', class: 'utility', ops: [{ op: 'heal', amount: 5 }, { op: 'reshell', amount: 3 }] },
      { id: 'kpi', label: 'Your happiness is our KPI (scramble favourite, hit 3)', class: 'hostile', ops: [{ op: 'scramble', mode: 'mostUsed', turns: 2 }, hit(3)] },
      { id: 'survey', label: 'Quick survey (call NPS Survey, hit 2)', class: 'utility', ops: [{ op: 'summon', ice: 'ice.khhappy.nps_survey' }, hit(2)] },
      { id: 'hug', label: 'Hug 4', class: 'hostile', ops: [hit(4)] },
    ],
    phases: [{
      at: 0.4, name: 'Gentle Reminder Red', text: 'Halcy has no eyes. Halcy does not need eyes.',
      shell: { type: 'none', points: 0 },
      intents: [
        { id: 'reminder', label: 'Gentle Reminder 3 x2', class: 'hostile', ops: [hit(3, { hits: 2 })] },
        { id: 'smile2', label: 'SMILE (heal 6)', class: 'utility', ops: [{ op: 'heal', amount: 6 }] },
      ],
    }],
    xp: 110, credits: 80,
    description: 'BOSS. The jellyfish mascot. Heals itself every other turn: burst it, or keep it Infected.',
    flavor: 'Hi! :) Smile! You are on a survey!',
  },

  // coinbasement: grows (+1 level) every third turn; then dumps everything.
  {
    id: 'ice.coinbasement.whale', name: 'The Whale', level: 3, boss: true, shell: { type: 'wall', points: 8 }, core: 30, perception: 30,
    intents: [
      { id: 'accumulate', label: 'Accumulate (+1 level, hit 2)', class: 'utility', ops: [{ op: 'buff', levels: 1 }, say('The Whale accumulates.'), hit(2)] },
      { id: 'splash', label: 'Splash 4 (-1 cycle)', class: 'hostile', ops: [hit(4), { op: 'playerStatus', status: 'tarred', value: 1 }] },
      { id: 'pump', label: 'Pump (+2 shell levels, hit 3)', class: 'utility', ops: [{ op: 'buff', shellLevels: 2 }, hit(3)] },
    ],
    phases: [{
      at: 0.5, name: 'The Dump', text: 'Selling everything. Including you.',
      shell: { type: 'none', points: 0 },
      intents: [
        { id: 'dump', label: 'Dump 8', class: 'hostile', ops: [hit(8)] },
        { id: 'panic', label: 'Panic sell 3 x2', class: 'hostile', ops: [hit(3, { hits: 2 })] },
      ],
    }],
    xp: 130, credits: 120,
    description: 'BOSS. Grows a level every few turns. Stun or Slow it before it accumulates, then burst. Drops its shell to dump.',
    flavor: 'I am the market. I have always been the market. I am also in a basement.',
  },

  // chromebone: counts backwards, then anaesthetises you (you lose a turn).
  {
    id: 'ice.chromebone.chief_surgeon', name: 'Chief of Surgery (Locum)', level: 3, boss: true, shell: { type: 'crypt', points: 6 }, core: 28, perception: 30,
    reflect: 1,
    intents: [
      { id: 'count', label: 'Counting backwards from ten (next: Anaesthesia)', class: 'utility', ops: [say('Ten. Nine. Eight...'), hit(2)] },
      { id: 'anaesthesia', label: 'Anaesthesia (you lose your next turn)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'stunned', value: 1 }] },
      { id: 'incision', label: 'Incision 6', class: 'hostile', ops: [hit(6)] },
    ],
    phases: [{
      at: 0.5, name: 'Post-op', text: 'Procedure complete. Extra parts: yours.',
      shell: { type: 'wall', points: 6 },
      intents: [
        { id: 'triage', label: 'Page Triage (call a Patcher)', class: 'utility', ops: [{ op: 'summon', ice: 'ice.chromebone.triage' }, hit(2)] },
        { id: 'suture', label: 'Suture (heal 6)', class: 'utility', ops: [{ op: 'heal', amount: 6 }] },
        { id: 'amputate', label: 'Amputate 7', class: 'hostile', ops: [hit(7)] },
      ],
    }],
    xp: 140, credits: 120,
    description: 'BOSS. Mirror-shelled: alternate crack and spike. Counts down, then puts you under for a turn. Slow it during the count.',
    flavor: 'You will barely miss it.',
  },

  // seamless: re-heals once (Eternal), drains your botnet charges (tithe).
  {
    id: 'ice.seamless.heaven_core', name: 'Saint Uptime', level: 4, boss: true, shell: { type: 'wall', points: 8 }, core: 34, perception: 30,
    intents: [
      { id: 'sermon', label: 'Sermon on Auto-Renewal (scramble random, hit 3)', class: 'hostile', ops: [{ op: 'scramble', mode: 'random', turns: 1 }, hit(3)] },
      { id: 'tithe', label: 'Tithe (drain 1 botnet charge, hit 4)', class: 'hostile', ops: [{ op: 'drainCharges', amount: 1 }, hit(4)] },
      { id: 'migrate', label: 'Migration (call the Choir Warden)', class: 'utility', ops: [{ op: 'summon', ice: 'ice.seamless.choir_warden' }, hit(2)] },
    ],
    phases: [{
      at: 0.5, name: 'Eternal', text: 'Fear not, for your progress is saved. Fear not, for you may continue.',
      healTo: 0.75, shell: { type: 'crypt', points: 8 },
      intents: [
        { id: 'renew', label: 'Renew (heal 5, reshell 4)', class: 'utility', ops: [{ op: 'heal', amount: 5 }, { op: 'reshell', amount: 4 }] },
        { id: 'autorenew', label: 'Auto-renew 4 x2', class: 'hostile', ops: [hit(4, { hits: 2 })] },
      ],
    }],
    xp: 170, credits: 150,
    description: 'BOSS. Heals back to 75% once at half core, then swaps to a crypt shell. Taxes your botnet charges.',
    flavor: 'Blessed are the uploaded, for they shall never buffer.',
  },

  // orbital: compound interest, grows every turn it is not stopped.
  {
    id: 'ice.orbital.fiduciary', name: 'The Fiduciary', level: 4, boss: true, shell: { type: 'crypt', points: 8 }, core: 34, perception: 35,
    intents: [
      { id: 'accrue', label: 'Accrue interest (+1 level, hit 3)', class: 'utility', ops: [{ op: 'buff', levels: 1 }, hit(3)] },
      { id: 'collect', label: 'Collect 5', class: 'hostile', ops: [hit(5)] },
      { id: 'foreclose', label: 'Foreclose (Anchor 2, hit 4)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'anchored', value: 2 }, hit(4)] },
    ],
    phases: [{
      at: 0.4, name: 'Bailout', text: 'Too high to fail.',
      healTo: 0.5, shell: { type: 'wall', points: 8 },
      ops: [{ op: 'summon', ice: 'ice.orbital.auditor' }],
      intents: [
        { id: 'margin', label: 'Margin call 6', class: 'hostile', ops: [hit(6)] },
        { id: 'margin2', label: 'Margin call 5', class: 'hostile', ops: [hit(5)] },
        { id: 'accrue3', label: 'Accrue interest (+1 level, hit 3)', class: 'utility', ops: [{ op: 'buff', levels: 1 }, hit(3)] },
      ],
    }],
    xp: 180, credits: 200,
    description: 'BOSS. Compound interest: gains a level on its accrual turns. Stun the accruals or end it fast. Bails itself out once.',
    flavor: 'Your balance is my balance. Your balance is zero.',
  },

  // aegis: labelled black boss; targets, then fires neural. Decoy or slow the shot.
  {
    id: 'ice.aegis.sentinel_prime', name: 'Sentinel Prime', level: 5, boss: true, black: true, shell: { type: 'wall', points: 10 }, core: 36, perception: 40,
    intents: [
      { id: 'target', label: 'Target acquired (next: Live round 4 neural)', class: 'hostile', ops: [say('A red dot settles on your forehead. It apologises for the inconvenience.'), hit(3)] },
      { id: 'liveround', label: 'Live round: 4 neural', class: 'hostile', ops: [hit(4, { neural: true })] },
      { id: 'suppress', label: 'Suppressing fire 3 x2 (-1 cycle)', class: 'hostile', ops: [hit(3, { hits: 2 }), { op: 'playerStatus', status: 'tarred', value: 1 }] },
    ],
    phases: [{
      at: 0.5, name: 'Live Fire Exercise', text: 'This is not a drill. The drill is stuck in procurement.',
      shell: { type: 'crypt', points: 10 },
      ops: [{ op: 'summon', ice: 'ice.aegis.peacekeeper' }],
      intents: [
        { id: 'barrage', label: 'Barrage 3 x3', class: 'hostile', ops: [hit(3, { hits: 3 })] },
        { id: 'target2', label: 'Target acquired (next: Live round 4 neural)', class: 'hostile', ops: [say('The dot is back. It missed you.'), hit(2)] },
        { id: 'liveround2', label: 'Live round: 4 neural', class: 'hostile', ops: [hit(4, { neural: true })] },
      ],
    }],
    xp: 220, credits: 250,
    description: 'BOSS. BLACK ICE. Always telegraphs its neural shot one turn ahead. Decoy, Slow or stun the shot.',
    flavor: 'Never sleeps. Never blinks. Never gets a raise.',
  },

  // deaddrop: away for two turns (free hits), then bans your favourite program.
  {
    id: 'ice.deaddrop.sysop', name: 'SYSOP [away]', level: 5, boss: true, shell: { type: 'crypt', points: 8 }, core: 40, perception: 40,
    intents: [
      { id: 'away1', label: 'Gone fishing.', class: 'unknown', ops: [say('sysop: [away]')] },
      { id: 'away2', label: 'Back soon.', class: 'unknown', ops: [say('sysop: [away] (6 yrs)')] },
      { id: 'ban', label: 'Ban (evict your most-used program)', class: 'utility', ops: [{ op: 'evict', mode: 'mostUsed' }, say('This program has been removed.'), hit(3)] },
      { id: 'sticky', label: 'Sticky thread (heal 6, reshell 4)', class: 'utility', ops: [{ op: 'heal', amount: 6 }, { op: 'reshell', amount: 4 }] },
      { id: 'lock', label: 'Lock thread (Anchor 3, hit 6)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'anchored', value: 3 }, hit(6)] },
    ],
    phases: [{
      at: 0.5, name: 'Back From Fishing', text: "Who's been posting in my absence?",
      shell: { type: 'wall', points: 10 },
      intents: [
        { id: 'hammer', label: 'Ban hammer 8', class: 'hostile', ops: [hit(8)] },
        { id: 'bump', label: 'Bump (call replies)', class: 'utility', ops: [{ op: 'summon', ice: 'ice.deaddrop.bump' }, hit(3)] },
        { id: 'ban2', label: 'Ban (evict your most-used program)', class: 'utility', ops: [{ op: 'evict', mode: 'mostUsed' }, hit(3)] },
      ],
    }],
    xp: 240, credits: 300,
    description: 'BOSS. Away for its first two turns: free damage. Then it bans your most-used program for the fight. Spread your load.',
    flavor: 'Gone fishing. Back soon. — sysop, six years ago',
  },

  // khbackbone: a mirror that splits.
  {
    id: 'ice.khbackbone.spine', name: 'The Spine', level: 5, boss: true, shell: { type: 'wall', points: 10 }, core: 38, perception: 40,
    reflect: 1,
    intents: [
      { id: 'throughput', label: 'Throughput 3 x2', class: 'hostile', ops: [hit(3, { hits: 2 })] },
      { id: 'inspect', label: 'Deep inspection (+5 trace, hit 3)', class: 'hostile', ops: [{ op: 'trace', amount: 5 }, hit(3)] },
      { id: 'reroute', label: 'Reroute (reshell full)', class: 'utility', ops: [{ op: 'reshell' }, hit(2)] },
    ],
    phases: [{
      at: 0.5, name: 'Content Delivery', text: "I'm everywhere you are. Now twice.",
      shell: { type: 'crypt', points: 10 },
      ops: [{ op: 'split' }],
      intents: [
        { id: 'edge', label: 'Edge hit 5', class: 'hostile', ops: [hit(5)] },
        { id: 'cache', label: 'Cache (heal 6)', class: 'utility', ops: [{ op: 'heal', amount: 6 }] },
      ],
    }],
    xp: 260, credits: 300,
    description: 'BOSS. Mirror shell: alternate crack and spike. Splits in two at half core unless Infected.',
    flavor: "Throughput: everything. Public access: none. You: cute.",
  },

  // arcology 1: The Board (Hydra). Splits once; its seats vote.
  {
    id: 'ice.board', name: 'The Board', level: 5, boss: true, shell: { type: 'wall', points: 10 }, core: 50, perception: 50,
    intents: [
      { id: 'motion', label: 'Motion carried (all ICE +1 shell level, hit 3)', class: 'utility', ops: [{ op: 'buff', shellLevels: 1, to: 'allAllies' }, hit(3)] },
      { id: 'dividend', label: 'Dividend 6', class: 'hostile', ops: [hit(6)] },
      { id: 'appoint', label: 'Appoint an Acting Director', class: 'utility', ops: [{ op: 'summon', ice: 'ice.arcology.acting_director' }, hit(2)] },
    ],
    triggers: [{ on: 'shellBreak', once: true, ops: [{ op: 'split' }, say('The Board splits. Two committees now.')] }],
    phases: [{
      at: 0.5, name: 'Emergency Session', text: 'Item 1: players— customers. Item 2: why do the customers keep saying "game"?',
      shell: { type: 'crypt', points: 10 },
      intents: [
        { id: 'restructure', label: 'Restructure (heal ally 8)', class: 'utility', ops: [{ op: 'heal', amount: 8, to: 'allyLowest' }] },
        { id: 'layoffs', label: 'Layoffs 4 x2', class: 'hostile', ops: [hit(4, { hits: 2 })] },
        { id: 'golden', label: 'Golden handshake (Anchor 2, hit 5)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'anchored', value: 2 }, hit(5)] },
      ],
    }],
    xp: 280, credits: 400,
    description: 'BOSS. Uploaded directors, a Hydra: splits into two committees when its shell breaks (Infected stops it). Appoints Acting Directors.',
    flavor: 'The Board will now hear from the customer. The customer has thirty seconds.',
  },

  // arcology 2: CHAIRMAN v1. Keynote / Q&A / Roadmap.
  {
    id: 'ice.chairman_v1', name: 'CHAIRMAN v1', level: 6, boss: true, shell: { type: 'crypt', points: 10 }, core: 60, perception: 60,
    intents: [
      { id: 'announce', label: 'Exciting announcement (all ICE +1 level)', class: 'utility', ops: [{ op: 'buff', levels: 1, to: 'allAllies' }, say('Exciting news! Everything is now slightly stronger!'), hit(2)] },
      { id: 'slide', label: 'Next slide 6', class: 'hostile', ops: [hit(6)] },
      { id: 'assistant', label: 'Bring in my assistant (call Executive Assistant)', class: 'utility', ops: [{ op: 'summon', ice: 'ice.arcology.executive_assistant' }, hit(3)] },
    ],
    phases: [
      {
        at: 0.66, name: 'Q&A', text: 'Great question! Let me answer it with a counter-question.',
        shell: { type: 'wall', points: 10 },
        intents: [
          { id: 'answer', label: 'Answer (scramble your last program, hit 5)', class: 'hostile', ops: [{ op: 'scramble', mode: 'lastUsed', turns: 2 }, hit(5)] },
          { id: 'followup', label: 'Follow-up 4 x2', class: 'hostile', ops: [hit(4, { hits: 2 })] },
        ],
      },
      {
        at: 0.33, name: 'Roadmap', text: 'Here is our roadmap for the next three quarters. (We will do something else.)',
        shell: { type: 'none', points: 0 }, ai: 'random',
        intents: [
          { id: 'q1', label: 'Roadmap Q1: remove endings (hit 8)', class: 'hostile', ops: [hit(8)] },
          { id: 'q2', label: 'Roadmap Q2: remove the Cancel button (Anchor 3, hit 4)', class: 'hostile', ops: [{ op: 'playerStatus', status: 'anchored', value: 3 }, hit(4)] },
          { id: 'q3', label: 'Roadmap Q3: remove Q4 (heal 10)', class: 'utility', ops: [{ op: 'heal', amount: 10 }] },
          { id: 'pivot', label: 'Pivot (hit 3 x3)', class: 'hostile', ops: [hit(3, { hits: 3 })] },
        ],
      },
    ],
    xp: 400, credits: 600,
    description: 'BOSS. Keynote (buffs its ICE), Q&A (counters your last program), Roadmap (announces plans, does something else).',
    flavor: "Welcome! We've been expecting you. Literally. You're on the roadmap.",
  },

  // deadmans: cannot be beaten. Heals to full and reshells after every one of its turns.
  {
    id: 'ice.retention_bonus', name: 'Retention Bonus', level: 6, boss: true, undefeatable: true, shell: { type: 'wall', points: 12 }, core: 40, perception: 60,
    intents: [
      { id: 'retain', label: "We'd hate to lose you (Anchor, hit 4)", class: 'hostile', ops: [{ op: 'playerStatus', status: 'anchored', value: 30 }, hit(4)] },
      { id: 'bonus', label: 'Bonus 5', class: 'hostile', ops: [hit(5)] },
    ],
    triggers: [
      { on: 'fightStart', once: true, ops: [{ op: 'playerStatus', status: 'anchored', value: 30 }] },
      { on: 'turnEnd', ops: [{ op: 'heal', amount: 999 }, { op: 'reshell' }] },
    ],
    xp: 0,
    description: 'Deadman\'s Switch only. Heals to full and regrows its shell every turn. It does not want to lose you.',
    flavor: "We'd hate to lose you. So we won't.",
  },

  // finale: owns the UI; scripted tricks per turn (scripts.ts chairman2). Undefeatable.
  {
    id: 'ice.chairman_v2', name: 'CHAIRMAN v2', level: 6, boss: true, undefeatable: true, script: 'chairman2',
    shell: { type: 'crypt', points: 30 }, core: 200, perception: 100,
    intents: [
      { id: 'move_end_turn', label: "We've moved End Turn. For your convenience.", class: 'hostile', ops: [{ op: 'notify', text: "We've moved End Turn. For your convenience.", style: 'chairman.moveEndTurn' }, hit(4)] },
      { id: 'labels', label: 'Relabel (keep_playing, subscribe, stay)', class: 'utility', ops: [{ op: 'notify', text: 'crowbar → keep_playing · lockpick → subscribe · mop → stay', style: 'chairman.labels' }, { op: 'playerStatus', status: 'labelsScrambled', value: 2 }, hit(3)] },
      { id: 'infinity', label: 'integrity: ∞', class: 'unknown', ops: [{ op: 'notify', text: 'integrity: ∞ · Math.random() // lol no', style: 'chairman.infinity' }, { op: 'heal', amount: 40 }, hit(4)] },
      { id: 'end_turn_off', label: 'End Turn (coming soon)', class: 'utility', ops: [{ op: 'notify', text: 'End Turn (coming soon)', style: 'chairman.endTurnDisabled' }, { op: 'playerStatus', status: 'tarred', value: 1 }, hit(3)] },
      { id: 'fakewin', label: 'YOU WIN', class: 'unknown', ops: [{ op: 'notify', text: '★ YOU WIN ★ …is what we would say if you had won.', style: 'fakewin' }, { op: 'heal', amount: 60 }] },
      { id: 'f12', label: 'Synergize 4', class: 'hostile', ops: [{ op: 'story', ops: [{ op: 'event', name: 'chairman.f12' }] }, hit(4)] },
      { id: 'crash', label: 'CYBER WHATEVER HAS STOPPED', class: 'unknown', ops: [{ op: 'notify', text: 'something went wrong. it was you. (Just kidding! We would never crash. Crashing ends sessions.)', style: 'crash' }, hit(3)] },
      { id: 'normal', label: 'Synergize 5', class: 'hostile', ops: [say("See? We can be normal. We just don't want to be."), hit(5)] },
      { id: 'offer', label: 'An Offer', class: 'utility', ops: [{ op: 'story', ops: [{ op: 'event', name: 'chairman.offer' }] }, hit(2)] },
    ],
    xp: 0,
    description: 'It owns the interface. integrity: ∞. Hitting it is mostly decorative.',
    flavor: 'Welcome home, {handle}! Stay as long as you like. Stay longer.',
  },

  // PATCH: your botnet, turned. The engine makes one of these per Botnet host (top 5 by power) and levels each
  // by that host's power plus the rest of the swarm, so the base is a weak, slow limb.
  {
    id: 'ice.patch_body', name: 'PATCH (Botnet)', level: 1, boss: true, shell: { type: 'wall', points: 6 }, core: 22, perception: 100,
    intents: [
      { id: 'limb', label: 'Limb 2', class: 'hostile', ops: [hit(2)] },
      { id: 'grip', label: 'Hold on (Anchor 2, -1 cycle)', class: 'utility', ops: [{ op: 'playerStatus', status: 'anchored', value: 2 }, { op: 'playerStatus', status: 'tarred', value: 1 }] },
      { id: 'surge', label: 'Surge 2', class: 'hostile', ops: [hit(2)] },
      { id: 'reroute', label: 'Reroute (reshell 6, heal ally 6)', class: 'utility', ops: [{ op: 'reshell', amount: 6 }, { op: 'heal', amount: 6, to: 'allyLowest' }] },
    ],
    triggers: [{ on: 'allyDeath', ops: [{ op: 'buff', shellLevels: 1 }, { op: 'heal', amount: 4 }, say('The rest of your botnet takes up the slack.')] }],
    xp: 0,
    description: 'A host you put in the Botnet, pointed at you. Stronger the more power it had; the survivors harden and heal when one falls. Worm them (Infected ignores shells and jumps on death). Only Botnet-role hosts fight you: hang up, move hosts to Mine or Proxy and they stay loyal (+1 cycle per 5).',
    flavor: "it's warm in here. it's never been warm before. move over.",
  },
];

// ---------------------------------------------------------------------------
// Export: every ICE says its taunt on its first action.
// ---------------------------------------------------------------------------

// Tier scaling. Player damage grows faster than the engine's +25% core per ICE level (programs v1->v3, CPU 3->8,
// crits, Flow, botnet), so system skins and bosses also scale their authored core and shell by system tier.
// Hits scale through the node `level` (+1 per level). Base archetypes (IoT, Endless, black ICE) are unscaled.
const SYSTEM_TIER: Record<string, number> = {
  fridge: 1, wok: 1, vendnet: 1,
  bigbyte: 2, parkit: 2, khhappy: 2,
  coinbasement: 3, chromebone: 3, karaoke: 3,
  seamless: 4, orbital: 4, aegis: 4, deadmans: 4,
  deaddrop: 5, khbackbone: 5, arcology: 5,
};
const CORE_T = [1, 1.1, 1.05, 1.15, 1.3, 1.65];
const SHELL_T = [1, 1, 1, 1.1, 1.25, 1.45];
const HIT_T = [1, 1.1, 1.3, 1.5, 1.75, 2.2];
const BOSS_TIER: Record<string, number> = { 'ice.board': 5, 'ice.chairman_v1': 5 };

function scaleHits(ops: CombatOp[], m: number): CombatOp[] {
  return ops.map((op): CombatOp => {
    if (op.op === 'hit' && !op.neural) return { ...op, amount: Math.round(op.amount * m) };
    if (op.op === 'chance') return { ...op, ops: scaleHits(op.ops, m), ...(op.else ? { else: scaleHits(op.else, m) } : {}) };
    if (op.op === 'ifIce') return { ...op, ops: scaleHits(op.ops, m), ...(op.else ? { else: scaleHits(op.else, m) } : {}) };
    return op;
  });
}
const scaleIntents = (its: IntentDef[], m: number): IntentDef[] => its.map((it) => ({ ...it, ops: scaleHits(it.ops, m) }));

// Per-boss tuning on top of the tier curve (core multiplier, hit multiplier). Target: a competent player
// wins each boss ~70-85% of the time at first meeting (content sim, smart policy with honest lookahead).
const BOSS_TUNE: Record<string, [number, number]> = {
  'ice.wok.the_rota': [1.3, 1.35],
  'ice.bigbyte.escalation': [0.85, 0.9],
  'ice.khhappy.halcy': [1.9, 1.4],
  'ice.coinbasement.whale': [1.15, 1.1],
  'ice.chromebone.chief_surgeon': [1.5, 1.3],
  'ice.seamless.heaven_core': [1.2, 1.15],
  'ice.orbital.fiduciary': [1, 1.1],
  'ice.aegis.sentinel_prime': [1.7, 1.3],
  'ice.deaddrop.sysop': [1.25, 1.1],
  'ice.khbackbone.spine': [0.95, 0.95],
  'ice.board': [1.5, 1.1],
  'ice.chairman_v1': [1.05, 1],
};

function tierScale(d: IceDef): IceDef {
  const sys = d.id.split('.')[1];
  const t = BOSS_TIER[d.id] ?? SYSTEM_TIER[sys];
  if (!t || d.undefeatable) return d;
  const [bc, bh] = BOSS_TUNE[d.id] ?? [1, 1];
  const pts = d.shell.type === 'none' ? 0 : Math.round(d.shell.points * SHELL_T[t]);
  return {
    ...d,
    core: Math.round(d.core * CORE_T[t] * bc),
    shell: { type: d.shell.type, points: pts },
    intents: scaleIntents(d.intents, HIT_T[t] * bh),
    ...(d.phases ? {
      phases: d.phases.map((ph) => ({
        ...ph,
        ...(ph.intents ? { intents: scaleIntents(ph.intents, HIT_T[t] * bh) } : {}),
        ...(ph.shell && ph.shell.type !== 'none' ? { shell: { type: ph.shell.type, points: Math.round(ph.shell.points * SHELL_T[t]) } } : {}),
      })),
    } : {}),
  };
}

// ICE xp is authored on the old slice scale; system captures and jobs carry most of the xp curve (DESIGN §4).
const XP_SCALE = 0.15;

function withTaunt(d: IceDef): IceDef {
  d = { ...d, xp: Math.round(d.xp * XP_SCALE) };
  if (!d.flavor) return d;
  return { ...d, triggers: [...(d.triggers ?? []), { on: 'turnStart', once: true, ops: [{ op: 'notify', text: `${d.name}: "${d.flavor}"`, style: 'taunt' }] }] };
}

export const ice: IceDef[] = [
  sentry, cipher, bloodhound, tarpit, scrambler, patcher, killer, mirror, hydra, siren, hunter, hunterKh,
  flatliner, cortexBurner, psychotrope, antiCheat,
  tutorial, loadingScreen, paywall, eula, achievementSpam, garbageCollector,
  raidCompliance, raidBailiff, raidMedic,
  ...skins,
  ...bosses,
].map(tierScale).map(withTaunt);
