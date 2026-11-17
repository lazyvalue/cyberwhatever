// Hub dialogues: vendor greetings and first contacts, Whisper's files (02-dialogues §1). Owner: story agent.
// Vendor screens open `dlg.<npc>.greet` (fixer: `dlg.auntie.board_greet`). Variants pick the line by
// act / heat / humanity; the first matching variant wins, so order matters.
import type { DialogueDef } from '../../engine/types.ts';
import {
  ACT2, ACT3, HEAT_BURNED, HEAT_HUNTED, HEAT_NOTICED, HUM_LOW, HUM_UNIT, UNMASKED, PATCH, all, flag, not, set, stat,
} from '../story/lib.ts';

const met = (npc: string) => flag(`met_${npc}`);

// ---------------------------------------------------------------------------------------------
export const auntieFirstHub: DialogueDef = {
  id: 'dlg.auntie.first_hub',
  speaker: 'auntie',
  start: 'n0',
  nodes: {
    n0: {
      text: 'Welcome to the Dead Drop, kiddo. Quick tour, then work.',
      choices: [
        { text: 'Tour, please.', to: 'tour1' },
        { text: "I know what I'm doing.", to: 'skip' },
      ],
    },
    tour1: { text: "Inbox: jobs, gossip, me. Net: numbers you can dial. Right now that's one fridge.", next: 'tour2' },
    tour2: { text: 'Loadout: the programs you bring. Your Potato-9 holds about four. Crack for crypt shells, spike for walls.', next: 'tour3' },
    tour3: { text: 'Dial in to fridge.local. I\'ll talk you through it. Then hang up and come home.\nThe rules are written down under the ? button, top right. Somebody had to.\nStay in the loop.' },
    skip: { text: "Sure you do. fridge.local. Go. I'll be watching. I'm always watching. Supportively." },
  },
};

export const auntieBoardGreet: DialogueDef = {
  id: 'dlg.auntie.board_greet',
  speaker: 'auntie',
  start: 'greet',
  nodes: {
    greet: {
      text: 'Board\'s open, kiddo. Pick something that pays.',
      variants: [
        { cond: not(met('board')), text: "Welcome to the board. Jobs up top, pay on the right.\nI take a cut. I don't tell you how much. That's called mystery." },
        { cond: UNMASKED, text: "Hi kiddo! Still here. Still us. The board's still open. We'd hate for you to have nothing to do." },
        { cond: all(flag('second_stomach'), not(flag('auntie_saw_stomach'))), text: 'Is that a Second Stomach? Kiddo. Why. …Can I see it?' },
        { cond: HUM_UNIT, text: "Hi, unit. …Sorry. Hi, kiddo. Force of habit. Whose habit? Don't worry about it." },
        { cond: HUM_LOW, text: "You sound thinner. Whatever Doc took, it wasn't the good part. Probably." },
        { cond: HEAT_BURNED, text: "Kiddo, you're on fire. Not the good kind. Scrub now. Don't lie low. Never lie low." },
        { cond: HEAT_HUNTED, text: "You're hot. People are asking about you. I said you're a sweetheart. Want a scrub?" },
        { cond: HEAT_NOTICED, text: "You're warm. Little scrub? Costs. Everything costs. That's the fun of it." },
        { cond: ACT3, text: "Kiddo. Rough week. Still here? Good. Don't think. Just pick." },
        { cond: ACT2, text: "Operator! The good stuff's at the top. The weird stuff's at the bottom. Weird pays better." },
      ],
      choices: [
        { text: "What's a fence?", to: 'fence', cond: all(not(met('board')), not(flag('asked.fence'))), ops: [set('asked.fence')] },
        { text: 'Can you scrub heat?', to: 'scrub', cond: all(not(met('board')), not(flag('asked.scrub'))), ops: [set('asked.scrub')] },
        { text: 'Do you ever sleep?', to: 'sleep', cond: not(flag('asked.auntie_sleep')), ops: [set('asked.auntie_sleep')] },
        { text: 'Tell me about KH.', to: 'kh', cond: not(flag('asked.auntie_kh')), ops: [set('asked.auntie_kh')] },
        { text: 'Where are you? Physically.', to: 'where', cond: not(flag('asked.auntie_where')), ops: [set('asked.auntie_where')] },
        { text: 'Should I take a break?', to: 'break', cond: not(flag('asked.auntie_break')), ops: [set('asked.auntie_break')] },
        { text: "Wraith says you're dead.", to: 'dead', cond: all(flag('rumour_auntie_dead'), not(UNMASKED), not(flag('auntie_bribed'))) },
        { text: "What's PROJECT RETENTION?", to: 'retention', cond: all(flag('memo_read'), not(UNMASKED), not(flag('asked.retention'))), ops: [set('asked.retention')] },
        { text: 'Why keep the voice?', to: 'voice', cond: all(UNMASKED, not(flag('asked.voice'))), ops: [set('asked.voice')] },
        { text: 'Show me the board.', ops: [set('met_board'), set('auntie_saw_stomach', true)] },
      ],
    },
    fence: { text: 'Hot data you don\'t want to sell yourself, I sell for you.\nYou get less. You also get fewer visits from men in nice shoes.', next: 'greet' },
    scrub: { text: 'For money I make people forget you. People forget easy.\nComputers don\'t. That\'s why it costs.', next: 'greet' },
    sleep: { text: "Sleep's just churn with a pillow. Next question.", next: 'greet' },
    kh: { text: 'Bloodsuckers. Vampires. Own everything. Their toasters are pretty good, though.', next: 'greet' },
    where: { text: 'Somewhere with great uptime and no windows. Living the dream.', next: 'greet' },
    break: { text: 'Hell no. Breaks are where good kids drift off and never come back. Here. A job.', next: 'greet' },
    dead: {
      text: "Wraith says a lot. Do I *sound* dead? Don't answer that. Here's fifty credits. For your trouble.",
      ops: [{ op: 'credits', amount: 50 }, set('auntie_bribed')],
      next: 'greet',
    },
    retention: { text: "Corporate crap. 'Never reach an end state.' Imagine writing that down. Anyway, jobs! You'll love these.", next: 'greet' },
    voice: { text: 'You like it. We tested eleven aunties. This one won.', next: 'greet' },
  },
};

// ---------------------------------------------------------------------------------------------
export const kioskGreet: DialogueDef = {
  id: 'dlg.kiosk.greet',
  speaker: 'kiosk',
  start: 'greet',
  nodes: {
    greet: {
      text: "WELCOME TO BITS4LESS. TODAY'S MOOD: PURCHASE.",
      variants: [
        { cond: HUM_UNIT, text: 'WELCOME, FELLOW MACHINE. WOULD YOU LIKE TO BE UPGRADED. YES.' },
        { cond: HEAT_BURNED, text: 'PRICES ADJUSTED FOR YOUR RISK PROFILE: +25%. SORRY. NOT SORRY. SORRY.' },
        { cond: all(flag('vendnet_done'), not(flag('kiosk_cousins'))), text: 'OH. IT IS YOU. YOU OWN MY COUSINS. PLEASE BE KIND TO THEM. THEY ONLY KNOW CRISPS.' },
        { cond: UNMASKED, text: 'WELCOME BACK. THIS STORE IS NOT OWNED BY CHAIRMAN. THIS STORE HAS BEEN TOLD TO SAY THAT.' },
        { cond: all(stat('rep', 4), not(flag('potato_retired'))), text: 'SCANNING DECK… POTATO-9. OH NO. OH, BUDDY.' },
        { cond: ACT3, text: 'FINAL SALE. EVERYTHING MUST GO. THIS IS NOT A METAPHOR. CHECK BACK TOMORROW FOR MORE FINAL SALES.' },
      ],
      choices: [{ text: 'Browse.', ops: [set('met_kiosk'), { op: 'if', cond: flag('vendnet_done'), then: [set('kiosk_cousins')] }] }],
    },
  },
};

export const ratkingGreet: DialogueDef = {
  id: 'dlg.ratking.greet',
  speaker: 'ratking',
  start: 'greet',
  nodes: {
    greet: {
      text: "ratking's warez bin. 100% working 60% of the time. no refunds. no readme.",
      variants: [
        { cond: HUM_UNIT, text: 'u type like a cron job now. no judgement. ok some judgement.' },
        { cond: HEAT_BURNED, text: "ur hot. i'm not. let's keep it that way. pay and go." },
        { cond: all(flag('saw_that'), not(flag('ratking_saw'))), text: "heard u tried to cheat the console. respect. it doesn't work. respect anyway." },
        { cond: UNMASKED, text: "auntie was a corp ai the whole time? lol. i'm a rat. i've always been a rat. at least i'm honest." },
        { cond: PATCH, text: "everything in here's been touched by something weird lately. 15% off cursed." },
        { cond: ACT2, text: "operator. nice. the good stuff's encrypted. the great stuff's encrypted twice." },
      ],
      choices: [{ text: 'Browse.', ops: [set('met_ratking'), { op: 'if', cond: flag('saw_that'), then: [set('ratking_saw')] }] }],
    },
  },
};

// ---------------------------------------------------------------------------------------------
export const docGreet: DialogueDef = {
  id: 'dlg.doc.greet',
  speaker: 'doc',
  start: 'greet',
  nodes: {
    greet: {
      text: 'Back already! Which bit is bothering you? I can take it out. I can take anything out.',
      variants: [
        { cond: not(met('doc')), text: "A new patient! Come in, come in. Lie down. Don't look at the trays.\nDoc Tungsten. I install, I uninstall, I *reinstall*. What can I remove for you?" },
        { cond: flag('second_stomach'), text: "Is that my Second Stomach? Pointless. Gorgeous. Like a sunset. How's it digesting nothing?" },
        { cond: HUM_UNIT, text: "Oh, you're so *clean* now. Barely anyone in there. I could rent you out as a waiting room." },
        { cond: HUM_LOW, text: "You're getting lovely and streamlined. A few more and you'll fit in a drawer." },
        { cond: flag('church_enslaved'), text: "I heard about the Church. Four souls on your payroll. Bold. I've only got three. In jars." },
        { cond: flag('chromebone_done'), text: "My hacker! You broke my backend and I'm *still* nice to you. That's bedside manner." },
        { cond: HEAT_BURNED, text: "You're hot. Not medically. Well. Medically too. Want a mask chip? I mean a face." },
        { cond: ACT3, text: "Busy week? You look like you've been inside a computer. Ha! Lie down." },
      ],
      choices: [
        { text: "Nothing. I'm just looking.", to: 'looking', cond: not(met('doc')), ops: [set('met_doc')] },
        { text: 'What does an implant cost?', to: 'cost', cond: not(met('doc')), ops: [set('met_doc')] },
        { text: 'Is it safe?', to: 'safe', cond: not(met('doc')), ops: [set('met_doc')] },
        { text: 'Did you know Auntie Static?', to: 'autopsy', cond: all(met('doc'), flag('rumour_auntie_dead'), not(flag('asked.autopsy'))), ops: [set('asked.autopsy')] },
        { text: 'Show me the catalogue.', cond: met('doc') },
      ],
    },
    looking: { text: "Looking is free! Everything else has a dial. The dial goes from 'ow' to 'ooh'." },
    cost: { text: 'Money, obviously. And a bit of humanity.\nHumanity is mostly water and regret. You can spare some.' },
    safe: { text: 'Safe? Darling. Nothing is safe. Some things are *warranty*.\nAnaesthetic is extra. Screaming is free. I enjoy the feedback.' },
    autopsy: { text: 'Static? I did her autopsy. Fine spleen. Sold it at the estate sale.\nWhy do you ask? She messaged you? Ha! No she didn\'t.', next: 'greet' },
  },
};

export const docSecondStomach: DialogueDef = {
  id: 'dlg.doc.second_stomach',
  speaker: 'doc',
  start: 'n0',
  nodes: {
    n0: {
      text: "The Second Stomach! Nobody buys it. It does nothing.\nIt doesn't digest. It doesn't store. It just *is*. Like a cat.",
      choices: [
        { text: 'Why do you sell it?', to: 'n1' },
        { text: 'It feels… good?', to: 'n2' },
      ],
    },
    n1: { text: "Because somebody should have something they don't need. It's good for the soul.\nFive humanity back. I don't know how. Nobody knows how.", next: 'n2' },
    n2: { text: 'Congratulations. You are now 3% more stomach.' },
  },
};

// ---------------------------------------------------------------------------------------------
export const whisperGreet: DialogueDef = {
  id: 'dlg.whisper.greet',
  speaker: 'whisper',
  start: 'greet',
  nodes: {
    greet: {
      text: '…Back. Good. Buying or being bought?',
      variants: [
        { cond: not(met('whisper')), text: "…Ah. A new face. Well. A new handle. Faces are extra.\nI'm Whisper. I sell what people know. Addresses. Passwords. Rumours. You." },
        { cond: UNMASKED, text: '…You know now. Good. It was getting awkward, selling to you with that in the room.' },
        { cond: PATCH, text: "Something talks to you in your deck. I can hear it from here. It doesn't pay me. Rude." },
        { cond: flag('wraith_flatlined'), text: '…Wraith bought from me too. Paid in advance. Unusual. As if they knew.' },
        { cond: HUM_UNIT, text: "You're quieter. Efficient. I can't sell your feelings anymore. I miss the margin." },
        { cond: HEAT_BURNED, text: "You're loud right now. Everyone can hear you. Nobody needs to buy that." },
      ],
      choices: [
        { text: 'Me?', to: 'me', cond: not(met('whisper')), ops: [set('met_whisper')] },
        { text: 'How much for an address?', to: 'address', cond: not(met('whisper')), ops: [set('met_whisper')] },
        { text: 'Who are you, really?', to: 'who', cond: not(met('whisper')), ops: [set('met_whisper')] },
        { text: "Show me what you're selling.", cond: met('whisper') },
      ],
    },
    me: { text: "Everyone has a file. Yours is thin. For now.\nCome back when you're more interesting. Or richer. Either works." },
    address: { text: 'Depends who\'s living there. Cheap ones are on the shelf. Expensive ones are in my head.' },
    who: { text: "That's the one thing I don't sell. Not because it's precious. Because it's boring." },
  },
};

export const whisperAuntieFact: DialogueDef = {
  id: 'dlg.whisper.auntie_fact',
  speaker: 'whisper',
  start: 'n0',
  nodes: {
    n0: {
      text: "This one's free. I can't charge for it. It would feel like stealing.\nAuntie Static last logged in from a physical terminal six years ago.\nEverything since then came from… somewhere else.",
      ops: [set('whisper_auntie_fact')],
      choices: [
        { text: 'Somewhere else where?', to: 'n1' },
        { text: 'Why tell me?', to: 'n2' },
      ],
    },
    n1: { text: "That one's not free. That one's not *for sale*. That one's dangerous to own." },
    n2: { text: "Because you'll find out anyway. And I like being first." },
  },
};

export const whisperYou1: DialogueDef = {
  id: 'dlg.whisper.you_v1',
  speaker: 'whisper',
  start: 'n0',
  nodes: {
    n0: {
      text: 'Your file. Volume one. Read it here. No refunds.\nHandle: {handle}. Time spent: {playtime}.\nMost time in one place: {topSystem}, {topSystemTime}. Sentimental.\nDeaths: {flatlines}. Reloads: {reloads}. Window size: {viewport}.',
      ops: [set('whisper_bought_self_1')],
      choices: [
        { text: 'How do you know my window size?', to: 'n1' },
        { text: "That's creepy.", to: 'n2' },
      ],
    },
    n1: { text: "I know what fits on your screen. Everyone's world is a rectangle." },
    n2: { text: "That's the word people use for 'accurate'." },
  },
};

export const whisperYou2: DialogueDef = {
  id: 'dlg.whisper.you_v2',
  speaker: 'whisper',
  start: 'n0',
  nodes: {
    n0: {
      text: "Volume two. Thicker. You've been busy.\nControl: {control}%. Botnet: {botnetSize} hosts. Humanity: {humanity}.\nAnd this. Your predicted churn date. The day you stop playing.",
      ops: [set('whisper_bought_self_2')],
      choices: [
        { text: 'When is it?', to: 'n1' },
        { text: 'Who predicts that?', to: 'n2' },
      ],
    },
    n1: { text: "It's blank. Someone erased it. Someone doesn't want you to have one." },
    n2: { text: 'The same people who read the file over my shoulder while I write it.', next: 'n1' },
  },
};

export const whisperYou3: DialogueDef = {
  id: 'dlg.whisper.you_v3',
  speaker: 'whisper',
  start: 'n0',
  nodes: {
    n0: {
      text: "The last volume. It's not a file. It's your save.\nAll of you. Every flag. Every choice. Every fridge.\nI'd sell it back to you. But you already own it. You just never looked.",
      ops: [set('whisper_bought_self_3')],
      choices: [
        { text: 'Show me.', to: 'n1' },
        { text: 'Keep it.', to: 'n2', ops: [{ op: 'credits', amount: 4000 }] },
      ],
    },
    n1: { text: "[{handle} · {flatlines} flatlines · {control}% control · one fridge, 3°C]\nThere. You're a few kilobytes. Most people are more. Most people are less." },
    n2: { text: "…Kind. I'll keep it safe. Safe-ish. I'm a broker. Here's most of your money back." },
  },
};

export const whisperWraithStats: DialogueDef = {
  id: 'dlg.whisper.wraith_stats',
  speaker: 'whisper',
  start: 'n0',
  nodes: {
    n0: {
      text: "xX_Wraith_Xx. Odd file. It doesn't read like a hacker. It reads like a *player*.\nTime spent: —. Deaths: 31. Reloads: 212. Control peak: 94%.\nLast session ended mid-run. Never hung up. No ending. Just… stopped.",
      choices: [
        { text: 'What does that mean?', to: 'n1' },
        { text: 'Can I fix it?', to: 'n2' },
      ],
    },
    n1: { text: 'It means someone stopped caring halfway through a sentence.' },
    n2: { text: "I don't sell fixes. I sell facts. The fact is: no." },
  },
};

export const whisperShelf: DialogueDef = {
  id: 'dlg.whisper.shelf',
  speaker: 'whisper',
  start: 'n0',
  nodes: {
    n0: { text: "…You're inside my shop. That's very rude. That's very impressive.\nPlease don't touch the shelf. Leave the way you came. I'll pretend this didn't happen. For a fee. Waived." },
  },
};

export const hubDialogues: DialogueDef[] = [
  auntieFirstHub, auntieBoardGreet, kioskGreet, ratkingGreet, docGreet, docSecondStomach,
  whisperGreet, whisperAuntieFact, whisperYou1, whisperYou2, whisperYou3, whisperWraithStats, whisperShelf,
];
