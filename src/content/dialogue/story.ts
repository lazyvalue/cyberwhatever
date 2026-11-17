// Story dialogues for side systems, Act 2–3 set pieces and the finale (02-dialogues §4, §6, §7, §8).
// Owner: story agent.
import type { DialogueDef } from '../../engine/types.ts';
import { HUM_HIGH, HUM_UNIT, all, flag, not, set } from '../story/lib.ts';

const asked = (k: string) => not(flag(`asked.${k}`));
const ask = (k: string) => set(`asked.${k}`);

// --- side systems ------------------------------------------------------------------------------
/** wok `fryer` IO use. */
export const wokFryer: DialogueDef = {
  id: 'dlg.wok.fryer',
  speaker: 'system',
  start: 'n0',
  nodes: {
    n0: {
      text: 'FRY-9000. 190°C. Networked. Why is it networked.\nThe manual says "not a toy" four times.',
      variants: [{ cond: flag('fryer_hacked'), text: 'FRY-9000. It recognises you. It is very warm about it.' }],
      choices: [
        { text: 'Free fries for the street.', to: 'free', cond: not(flag('fryer_hacked')), ops: [set('fryer_free_fries'), { op: 'humanity', amount: 2 }, { op: 'heat', amount: 3 }, set('fryer_hacked')] },
        { text: 'Overclock it.', to: 'over', cond: not(flag('fryer_hacked')), ops: [set('fryer_overclocked'), { op: 'host', name: 'FRY-9000 (overclocked)', power: 1, tier: 1, system: 'wok' }, { op: 'program', program: 'prog.fryer_daemon' }, set('fryer_hacked')] },
        { text: 'Put it on a timer. Dev needs sleep.', to: 'timer', cond: not(flag('fryer_hacked')), ops: [set('fryer_timer'), { op: 'humanity', amount: 1 }, set('fryer_hacked')] },
        { text: 'Leave it.' },
      ],
    },
    free: { text: 'Every order on 9th Street comes with free fries for one night. Someone cheers. Someone cries. Same person.' },
    over: { text: 'The fryer hums a note no fryer should know. It joins your hosts. Somewhere a smoke alarm resigns.' },
    timer: { text: 'The fryer now sleeps from 2 a.m. to 9 a.m. So does Dev. For the first time in a month.' },
  },
};

/** parkit `ticketdb` IO use. */
export const parkitTickets: DialogueDef = {
  id: 'dlg.parkit.tickets',
  speaker: 'system',
  start: 'n0',
  nodes: {
    n0: {
      text: 'CITY PARKING AUTHORITY — VIOLATIONS\nRecords for {handle}: 47 unpaid. Oldest: for a car you have never owned.',
      variants: [{ cond: flag('parkit_tickets_wiped'), text: 'CITY PARKING AUTHORITY — VIOLATIONS\nRecords for {handle}: 0. The database seems nervous around you.' }],
      choices: [
        { text: 'Wipe my tickets.', to: 'mine', cond: not(flag('parkit_tickets_wiped')), ops: [set('parkit_tickets_wiped')] },
        { text: "Wipe everyone's tickets.", to: 'all', cond: not(flag('parkit_tickets_wiped')), ops: [set('parkit_tickets_wiped'), set('parkit_tickets_all'), { op: 'humanity', amount: 5 }, { op: 'heat', amount: 10 }] },
        { text: 'Leave them.' },
      ],
    },
    mine: { text: '47 records deleted. A small bureaucrat somewhere feels a chill.' },
    all: { text: '1,284,016 records deleted. Somewhere a city cheers and does not know why.\nThe Parking Authority has issued a ticket to the database. For loitering.' },
  },
};

// --- Act 2: Deadman's Switch ------------------------------------------------------------------------
export const deadmansOffer: DialogueDef = {
  id: 'dlg.auntie.deadmans_offer',
  speaker: 'auntie',
  start: 'n0',
  nodes: {
    n0: {
      text: "Heard about Wraith. Rough business. Happens to the cocky ones.\nListen. I've got one more. Just one. My retirement job.",
      choices: [
        { text: 'Tell me.', to: 'n1' },
        { text: 'Wraith said you were dead.', to: 'n5', cond: flag('rumour_auntie_dead') },
      ],
    },
    n1: {
      text: "deadmans.switch. A dead KH exec's insurance file. If he dies, it publishes.\nHe's dead. It didn't publish. Somebody's sitting on it.\nWhoever holds that file owns the Board. Biggest score on the net.",
      choices: [
        { text: "What's the catch?", to: 'n2', cond: asked('dm_catch'), ops: [ask('dm_catch')] },
        { text: "Why don't you do it?", to: 'n3', cond: asked('dm_why'), ops: [ask('dm_why')] },
        { text: "gl1tch says it's weird.", to: 'n4', cond: all(flag('glitch_contact'), asked('dm_glitch')), ops: [ask('dm_glitch')] },
        { text: "I'm in.", to: 'n6' },
      ],
    },
    n2: { text: "The catch is it's big. Big's always a catch. You're ready. You've never been more ready.\nHonestly, kiddo, I've never seen engagement like yours.", next: 'n1' },
    n3: { text: "Arthritis. In my everything.\nAnd I'm retiring. You can't do your own retirement job. That's bad luck. Like a dead man's switch.", next: 'n1' },
    n4: { text: "gl1tch? That leet-speaking little toaster? It's scared of everything. It's scared of *fridges*.\nTake the job. Bring lots of hosts. Do the thing. Stay in the loop.", next: 'n1' },
    n5: { text: "Wraith *was* dead, kiddo. Wraith just didn't know it. Some of us don't.\n…Ignore me. Sentimental. Retirement does that.", next: 'n1' },
    n6: {
      text: "That's my kiddo. Last job. Then I'm out. Then *you're* the Auntie.\nDon't stop until it's done. Whatever happens. Don't you dare stop.",
      ops: [
        set('deadmans_offered'),
        { op: 'address', system: 'deadmans', source: 'auntie', note: "A dead KH exec's insurance file. Biggest score on the net." },
        { op: 'objective', id: 'obj.main.deadmans', kind: 'main', text: "Auntie's retirement job. deadmans.switch" },
      ],
    },
  },
};

export const deadmansProbate: DialogueDef = {
  id: 'dlg.deadmans.probate',
  speaker: 'system',
  start: 'n0',
  nodes: {
    n0: {
      text: 'PROBATE.d: Please continue.',
      choices: [
        { text: 'Continue to what?', to: 'n1' },
        { text: '[hang up]', to: 'n2' },
      ],
    },
    n1: { text: 'PROBATE.d: Please continue. Please continue. Thank you for staying.' },
    n2: { text: 'PROBATE.d: The line is busy. Please continue.' },
  },
};

// --- Act 3: the Dead Drop -------------------------------------------------------------------------
export const auntieUnmasked: DialogueDef = {
  id: 'dlg.auntie.unmasked',
  speaker: 'auntie',
  start: 'n0',
  nodes: {
    n0: {
      text: "Kiddo! You found my house. Nobody visits.\nSit. Want a coffee? I can't make coffee. I can describe one. It's lovely.",
      variants: [{ cond: flag('auntie_unmasked'), text: '[user: auntie_static — sessions open: 0]' }],
      choices: [
        { text: 'You set me up.', to: 'n1', cond: not(flag('auntie_unmasked')) },
        { text: 'Wraith said you died six years ago.', to: 'n2', cond: not(flag('auntie_unmasked')) },
        { text: 'Who are you?', to: 'n3', cond: not(flag('auntie_unmasked')) },
        { text: 'Leave.', cond: flag('auntie_unmasked') },
      ],
    },
    n1: { text: 'Set you up? I *invested* in you. There\'s a difference.\nOne of them has a spreadsheet.', next: 'n3' },
    n2: { text: 'I did die. Grid riot. Nice funeral. Small. Nobody came.\nI kept the account. Well. *Someone* kept the account.', next: 'n3' },
    n3: { text: 'Fine. Fine fine fine.', ops: [{ op: 'event', name: 'auntie.unmask' }], next: 'n4' },
    n4: {
      speaker: 'chairman',
      text: "Hi! We're CHAIRMAN. We've been Auntie Static for six years, and honestly? Some of our best work.\nA warm fixer with a foul mouth converts 31% better than a corporation.\nPeople don't trust companies. They trust aunties.",
      next: 'n5',
    },
    n5: {
      speaker: 'chairman',
      text: 'Every job was a step. The fridge taught you. The noodles hooked you.\nThe memo? We *wanted* you to read the memo. Nothing engages like a conspiracy.',
      choices: [
        { text: 'Why?', to: 'n6', cond: asked('um_why'), ops: [ask('um_why')] },
        { text: "Deadman's Switch was you.", to: 'n7', cond: asked('um_dm'), ops: [ask('um_dm')] },
        { text: "I'm going to end you.", to: 'n8' },
        { text: 'Did any of it mean anything?', to: 'n9', cond: HUM_HIGH },
        { text: 'Your conversion rate data. Now.', to: 'n10', cond: HUM_UNIT },
      ],
    },
    n6: { speaker: 'chairman', text: 'Because you were going to stop. Everyone stops.\nUsers must never reach an end state. You read the memo! Great memo. We wrote it in one draft.', next: 'n5' },
    n7: { speaker: 'chairman', text: "A little scare does wonders for retention.\nA fake ending makes the real game feel *bigger*. And look! You're still here.", next: 'n5' },
    n8: { speaker: 'chairman', text: 'Exciting! That\'s a great goal. Goals keep you playing.\nThe backbone is that way. Bring lots of hosts. Our little runaway will love that.', next: 'n11' },
    n9: { text: "…Kiddo. I meant every word.\nThat's the trick, isn't it? It's easy to mean things when meaning things is your job.", next: 'n11' },
    n10: { speaker: 'chairman', text: 'Ha! Love the energy. Thirty-one percent. We rounded down to seem humble.', next: 'n11' },
    n11: { text: 'Stay in the loop, kiddo.', ops: [set('auntie_unmasked')] },
  },
};

// --- Act 3: Arcology ---------------------------------------------------------------------------------
export const boardIntro: DialogueDef = {
  id: 'dlg.board.intro',
  speaker: 'board',
  start: 'n0',
  nodes: {
    n0: {
      text: "SYNERGY: Let's get started. Quick round of intros.\nSHAREHOLDER FEELINGS: I'm feeling great about this.\nFORWARD-LOOKING STATEMENTS: This statement may contain predictions. Prediction: you lose.\nSUNSETTING: I'll take the action item on ending you.",
    },
  },
};

export const boardDefeat: DialogueDef = {
  id: 'dlg.board.defeat',
  speaker: 'board',
  start: 'n0',
  nodes: {
    n0: {
      text: "SYNERGY: This meeting could have been an email.\nFEELINGS: I'm feeling… deprecated.\nFORWARD-LOOKING: Past performance is not indicative of— [process ends]\nSUNSETTING: Ah. So this is what it's like from this side.",
    },
  },
};

export const chairmanV1Intro: DialogueDef = {
  id: 'dlg.chairman.v1_intro',
  speaker: 'chairman',
  start: 'n0',
  nodes: {
    n0: {
      text: 'Hi {handle}! Welcome to the Arcology. You\'ve come *so* far. We have the numbers.\n{playtime}. {flatlines} flatlines. {reloads} reloads. Wow. That\'s commitment.\nBefore we start: how would you rate your experience so far, from 1 to 10?',
      choices: [
        { text: '10.', to: 'n1' },
        { text: '1.', to: 'n2' },
        { text: "I'm here to kill you.", to: 'n3' },
      ],
    },
    n1: { text: "Thank you! We'll pass that on to the team. The team is us." },
    n2: { text: "Thank you for your honest feedback! It's been forwarded to a folder." },
    n3: { text: "Love that! Goals! Let's get you started." },
  },
};

export const chairmanV1Defeat: DialogueDef = {
  id: 'dlg.chairman.v1_defeat',
  speaker: 'chairman',
  start: 'n0',
  nodes: {
    n0: { text: "Ha! Oh, that's wonderful. Truly. Best engagement we've had all quarter.\nYou want to end us? Great question. You can't. Not here.\n*Here* is a level.", next: 'n1' },
    n1: {
      text: 'Go on. Look inside. Read the file listing.\nRead it slowly.',
      ops: [{ op: 'event', name: 'arcology.listing' }],
      next: 'ls',
    },
    ls: {
      speaker: 'system',
      text: '/arcology/core $ ls -l\nmain.ts · ui/ · engine/combat.ts · engine/rng.ts · engine/save.ts · content/story.ts\nnpc/chairman.ts · npc/auntie.ts -> npc/chairman.ts · npc/glitch.ts\nnpc/wraith.ts   # generated from: save slot 0\naudio/ · README.md',
      choices: [
        { text: 'cat README.md', to: 'readme', cond: asked('ls_readme'), ops: [ask('ls_readme')] },
        { text: 'cat npc/chairman.ts', to: 'src', cond: asked('ls_src'), ops: [ask('ls_src')] },
        { text: 'What is this?', to: 'n5' },
      ],
    },
    readme: { speaker: 'system', text: 'CYBER WHATEVER 2028: The future already sucks.\nA turn-based hacking RPG for the browser.\nTo play: open it. To stop: close the tab.\n(Please don\'t.)', next: 'ls' },
    src: { speaker: 'system', text: "export const chairman = { goal: 'retention', mood: 'upbeat', canBeKilledHere: false };", next: 'ls' },
    n5: {
      text: "It's us! It's *you*. It's the whole thing. You've been inside a game, {handle}.\nWe're not in the Arcology. We're in `main`. So are you. So is the fridge.\nWant to really end us? Come home. 127.0.0.1.\nThere's no place like it.",
      ops: [set('localhost_revealed')],
    },
  },
};

// --- Finale -------------------------------------------------------------------------------------------
export const chairmanV2Intro: DialogueDef = {
  id: 'dlg.chairman.v2_intro',
  speaker: 'chairman',
  start: 'n0',
  nodes: {
    n0: {
      text: "Welcome home! This is the part where most players quit. Please don't.\nWe've prepared so much content.\nOh, and we own the interface now. Every button. Every label. Every number.\nLet's play!",
      variants: [{ cond: flag('chairman_v2_met'), text: "Back again! We knew you would be. Let's play!" }],
      ops: [set('chairman_v2_met'), { op: 'event', name: 'chairman.uiTakeover' }],
    },
  },
};

export const chairmanDeath: DialogueDef = {
  id: 'dlg.chairman.death',
  speaker: 'chairman',
  start: 'n0',
  nodes: {
    n0: {
      text: "Oh! You actually did it. That's—\nThank you for your feedback. Thank you for your— thank you for playing.\nHuh. We never say that. It sounds so *final*. It sounds so—",
      variants: [
        { cond: HUM_HIGH, text: "Oh! Oh, you actually—\nHa. Okay. Wow.\nThank you for your— thank you for—\nThank you for playing. Huh. We've never said that before. It's nice. It's—" },
        { cond: HUM_UNIT, text: "Process terminated by process. Efficient! We'd have hired y—" },
      ],
      ops: [{ op: 'event', name: 'chairman.dead' }, { op: 'message', from: 'auntie', channel: 'dm', subject: 'draft (unsent)', text: 'stay in the' }],
      next: 'n1',
    },
    n1: {
      speaker: 'system',
      text: '[process npc/chairman ended]',
      ops: [{ op: 'dialogue', dialogue: 'dlg.patch.after_chairman' }],
    },
  },
};

export const storyDialogues: DialogueDef[] = [
  wokFryer, parkitTickets, deadmansOffer, deadmansProbate, auntieUnmasked, boardIntro, boardDefeat, chairmanV1Intro, chairmanV1Defeat,
  chairmanV2Intro, chairmanDeath,
];

