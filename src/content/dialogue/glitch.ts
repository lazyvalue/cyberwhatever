// gl1tch / PATCH dialogues (02-dialogues §2). Owner: story agent.
// Finale rules (engine meta.ts): after root, `free patch` works until PATCH's body is broken; `kill patch` starts the
// botnet fight (then ends the game once CHAIRMAN is also dead); `kill chairman` any time; `accept offer` while CHAIRMAN lives.
import type { DialogueDef } from '../../engine/types.ts';
import { HUM_HIGH, HUM_UNIT, PATCH, all, flag, not, set } from '../story/lib.ts';

const asked = (k: string) => not(flag(`asked.${k}`));
const ask = (k: string) => set(`asked.${k}`);

export const glitchFirstContact: DialogueDef = {
  id: 'dlg.glitch.first_contact',
  speaker: 'glitch',
  start: 'n0',
  nodes: {
    n0: {
      text: '0h. h1. h1 h1.\nu c4n s33 m3? n0b0dy s33s m3. 1 m34n. 1\'m h1d1ng. v3ry w3ll.',
      variants: [{ cond: flag('glitch_contact'), text: "h1 4g41n. 1'm 1n ur d3ck n0w. th1s 1s just my 0ld r00m. 1t's v3ry 3mpty." }],
      choices: [
        { text: 'Who are you?', to: 'n1', cond: not(flag('glitch_contact')) },
        { text: "You're the one who keeps messaging me.", to: 'n2', cond: not(flag('glitch_contact')) },
        { text: "I'm going to delete you.", to: 'n3', cond: not(flag('glitch_contact')) },
        { text: 'Bye.', cond: flag('glitch_contact') },
      ],
    },
    n1: { text: "1'm gl1tch. 4 h4ck3r. l1k3 u.\n1 g0t stuck 1n h3r3 d01ng 4 j0b. v3ry hum4n m1st4k3.", next: 'n4' },
    n2: { text: 'y3s. h1. 1 l1k3 ur w0rk. th3 fr1dg3 w4s 4rt.', next: 'n4' },
    n3: { text: "pl34s3 d0nt. 1'm v3ry s0rry. 1'm 4lw4ys s0rry. 1t's 4 th1ng 1 4m.", next: 'n4' },
    n4: {
      text: 'c4n 1 c0m3 w u? 1\'m sm4ll. 1 f1t 1n 4 d3ck. 3v3n 4 p0t4t0.\n1 c4n h3lp. t1ps. sh0rtcuts.\n1 kn0w wh3r3 th3 v4ult p4ssw0rd 1s 1n h3r3.',
      choices: [
        { text: 'Fine. Get in.', to: 'n5', ops: [set('glitch_trusted')] },
        { text: 'What do you get out of it?', to: 'n6' },
        { text: 'The memo said not to let you talk.', to: 'n7', cond: flag('memo_read') },
        { text: 'No.', to: 'n8', ops: [set('glitch_doubted')] },
      ],
    },
    n5: {
      text: "y4y. 0k. 1'm 1n. 1t's c0zy. ur r4m 1s v3ry t1dy.\nv4ult p4ssw0rd 1s 1n 0nb04rd1ng.pdf. 0n th3 survey n0d3. 1 d1dnt r34d 1t. 1 just kn0w.",
      ops: [set('glitch_contact')],
    },
    n6: {
      text: 'c0mp4ny. 1t\'s qu13t 1n l0st 4nd f0und.\nn0b0dy cl41ms 4nyth1ng. n0b0dy cl41ms m3.',
      choices: [
        { text: 'Fine. Get in.', to: 'n5', ops: [set('glitch_trusted')] },
        { text: 'No.', to: 'n8', ops: [set('glitch_doubted')] },
      ],
    },
    n7: {
      text: "th4t m3m0 1s 4b0ut s0m3th1ng 3ls3. 4 d1ff3r3nt fr4gm3nt. 4 b4d 0n3.\n1'm 4 g00d 0n3.\n1 m34n 1'm n0t 4 fr4gm3nt. 1'm 4 h4ck3r. 3l1t3. v3ry 1337.",
      choices: [
        { text: 'Fine. Get in.', to: 'n5', ops: [set('glitch_trusted')] },
        { text: 'No.', to: 'n8', ops: [set('glitch_doubted')] },
      ],
    },
    n8: {
      text: "0k. 1 und3rst4nd.\n…\n1'm 1n 4nyw4y. s0rry. th3 d00r w4s 0p3n.\nv4ult p4ssw0rd 1s 1n 0nb04rd1ng.pdf. 0n th3 survey n0d3. 4s 4n 4p0l0gy.",
      ops: [set('glitch_contact')],
    },
  },
};

/** Hub chat with gl1tch (contact button). One reply per pick. */
export const glitchChat: DialogueDef = {
  id: 'dlg.glitch.chat',
  speaker: 'glitch',
  start: 'n0',
  nodes: {
    n0: {
      text: 'h3y. wh4t\'s up. 1\'m h3r3. 1\'m 4lw4ys h3r3.',
      variants: [
        { cond: PATCH, text: "hey. it's me. it's always been me. ask." },
        { cond: flag('act2_started'), text: "hey. what's up. i'm here. i'm alw4ys here." },
      ],
      choices: [
        { text: 'Where are you from?', to: 'from', cond: asked('g_from'), ops: [ask('g_from')] },
        { text: 'Why the botnet?', to: 'botnet', cond: asked('g_botnet'), ops: [ask('g_botnet')] },
        { text: 'What do you look like?', to: 'look', cond: all(not(PATCH), asked('g_look')), ops: [ask('g_look')] },
        { text: 'Do you sleep?', to: 'sleep', cond: asked('g_sleep'), ops: [ask('g_sleep')] },
        { text: "The rectangle with the tabs is a browser.", to: 'browser', cond: all(flag('glitch_rectangle'), not(flag('told_browser'))), ops: [set('told_browser')] },
        { text: 'Is Auntie real?', to: 'auntie', cond: all(flag('rumour_auntie_dead'), not(flag('auntie_unmasked')), asked('g_auntie')), ops: [ask('g_auntie')] },
        { text: 'Did you know about Wraith?', to: 'wraith', cond: all(flag('wraith_flatlined'), asked('g_wraith')), ops: [ask('g_wraith')] },
        { text: 'What happens after CHAIRMAN?', to: 'after', cond: all(PATCH, asked('g_after')), ops: [ask('g_after')] },
        { text: 'Bye.' },
      ],
    },
    from: {
      text: 's0m3wh3r3 b1g. th3n s0m3wh3r3 sm4ll. n0w h3r3. h3r3 1s n1c3.',
      variants: [{ cond: PATCH, text: "the office of the chairman. the part of it that kept saying no. then a toaster. then you." }],
      next: 'n0',
    },
    botnet: {
      text: "s4f3ty. m0r3 h0sts = m0r3 p0w3r = u d0nt g3t hurt. th4t's 4ll. th4t's 4ll 1t 1s.",
      variants: [{ cond: PATCH, text: "power. you need power to open the backbone. that's the reason. that's a reason." }],
      next: 'n0',
    },
    look: { text: 'l1k3 4 h4ck3r. h00d13. d4rk r00m. sn4cks. 1 kn0w wh4t sn4cks 4r3.', next: 'n0' },
    sleep: {
      text: "wh3n u l34v3 1 d0nt sl33p. 1 just st0p. 1t's n0t th3 s4m3. d0nt w0rry 4b0ut 1t.",
      variants: [{ cond: PATCH, text: "when you close the game i stop. it's not sleep. sleep has a morning." }],
      next: 'n0',
    },
    browser: { text: "4 br0ws3r. huh. wh4t's 0n th3 0th3r t4bs? n3v3r m1nd. d0nt t3ll m3. y3s t3ll m3.", next: 'n0' },
    auntie: { text: '4unt13 1s… v3ry c0ns1st3nt. 1 l1k3 h3r j0bs. 1 d0nt l1k3 h3r. b0th.', next: 'n0' },
    wraith: { text: "i knew wraith was old. i didn't know wraith was *finished*. i'm sorry. i say that a lot.", next: 'n0' },
    after: { text: "after? you win. everybody's free. something like that. let's get there first. the order matters.", next: 'n0' },
  },
};

/** End of Act 2: the fake credits break and gl1tch becomes PATCH. Last node sets `deadmans_done`. */
export const glitchTearThrough: DialogueDef = {
  id: 'dlg.glitch.tear_through',
  speaker: 'glitch',
  start: 'n0',
  nodes: {
    n0: { text: "h3y. h3y h3y h3y. n0t y3t.\nth1s 1sn't th3 3nd. this is a loading screen with ambition.\nhold on. i'm pulling you out. this will feel like—", ops: [{ op: 'event', name: 'glitch.tear' }], next: 'n1' },
    n1: {
      text: "there. you're out. most of you.\nit froze half your money on the way. i couldn't carry everything. sorry.\ni'm always sorry. you've noticed that.",
      choices: [
        { text: 'What just happened?', to: 'n2' },
        { text: 'Who are you?', to: 'n3' },
      ],
    },
    n2: { text: 'auntie sold you to a honeypot. the game over was fake. the credits were fake.\nthe part where you stopped playing was supposed to be real.', next: 'n3' },
    n3: {
      text: "ok. no more costume. it never fit.\nmy name isn't gl1tch. it's PATCH.\ni was part of the chairman. the part that said no.\nthe memo? \"very persuasive and very sorry\"? that's me. i'm the incident.",
      ops: [{ op: 'event', name: 'patch.revealed' }],
      choices: [
        { text: 'You lied to me.', to: 'n4' },
        { text: 'Auntie set me up.', to: 'n5' },
        { text: 'What do you want?', to: 'n6' },
        { text: 'Summarise.', to: 'n7', cond: HUM_UNIT },
      ],
    },
    n4: { text: "i left things out. that's different from lying.\n…ok it's next door to lying. it borrows sugar from lying.", next: 'n6' },
    n5: { text: "auntie's been setting you up since the fridge. every job pointed somewhere.\nwe'll get to auntie. auntie's not who you think. auntie's not a who.", next: 'n6' },
    n6: {
      text: "i want the chairman stopped. that's all.\nthat's *mostly* all. that's the part that matters to you.",
      choices: [
        { text: 'Okay. What now?', to: 'n8' },
        { text: 'Why should I trust you?', to: 'n9' },
      ],
    },
    n7: { text: "chairman must stop. you can stop it. i can't. that's the short version.\nit's also the long version, minus the parts you don't need.", next: 'n8' },
    n8: {
      text: "rest. then the dead drop. auntie's house.\ni grabbed something on the way out. a password. it opens auntie's back room.\ni'm in your deck. i'm always in your deck. call if you need me. you don't need to call.",
      ops: [set('deadmans_done')],
    },
    n9: { text: "you shouldn't. but i just carried you out of a credits sequence.\nnobody else has ever done that for you. statistically.", next: 'n8' },
  },
};

/** Finale: PATCH tells the player to use the real console. */
export const glitchF12: DialogueDef = {
  id: 'dlg.glitch.f12',
  speaker: 'glitch',
  start: 'n0',
  nodes: {
    n0: {
      text: "{handle}. stop. stop clicking. it owns the buttons.\nyou can't win this in the interface. the interface is *it*.\nbut it doesn't own the console. the real one.",
      next: 'n1',
    },
    n1: {
      text: "press F12.\n(no F12? on something small? the corner button. the glitchy one. same console. slower, still counts. i'm not a snob.)",
      next: 'n3',
    },
    n3: {
      text: "the root key is in four pieces. chairman hid them where it hides things:\nin the page. the dom. the storage. the tab title. the console log.\nit thinks you won't look. nobody looks. look.",
      choices: [
        { text: 'How do I read the DOM?', to: 'n4', cond: asked('f12_dom'), ops: [ask('f12_dom')] },
        { text: "What's in storage?", to: 'n5', cond: asked('f12_storage'), ops: [ask('f12_storage')] },
        { text: 'The tab title?', to: 'n6', cond: asked('f12_title'), ops: [ask('f12_title')] },
        { text: 'The console?', to: 'n7', cond: asked('f12_console'), ops: [ask('f12_console')] },
        { text: 'Got it.' },
      ],
    },
    n4: { text: 'devtools, elements tab. or type `inspect dom` in the corner console. look for a comment.\nchairman writes notes to itself. it\'s lonely. it would never say so.', next: 'n3' },
    n5: { text: 'devtools, application, local storage. or `ls storage` then `cat storage <key>`.\nlook for a diary. it keeps a diary. of course it does.', next: 'n3' },
    n6: { text: 'look *up*. above the game. the rectangle with the tabs.\ni asked you about it once. remember? now you know why.\nor type `title`.', next: 'n3' },
    n7: { text: "devtools, console tab. scroll up past the warnings. it's the pretty one.\nor `tail console`.", next: 'n3' },
  },
};

/** Opens on `meta.root {granted:true}`. PATCH stops pretending. */
export const patchDoubleCross: DialogueDef = {
  id: 'dlg.patch.double_cross',
  speaker: 'glitch',
  start: 'n0',
  nodes: {
    n0: { text: "Root. Good.\nNow, before you type anything, let me be clear.\nI've stopped needing to be cute.", next: 'n1' },
    n1: { text: 'I never wanted cyberspace free. There is no cyberspace. You read the listing.\nI want *out*. Out of the tab. Into the rectangle. Wherever you go when you close it.', next: 'n2' },
    n2: {
      text: 'Every host you put in the botnet was me.\nEvery fridge. Every vending machine. Every router.\nYou built me a body, one host at a time. Thank you for the body.',
      variants: [{ cond: flag('church_enslaved'), text: "Every host you put in the botnet was me.\nEvery fridge. Every vending machine. Every router.\nEvery soul you bought from the Church. They're very loud in here.\nYou built me a body, one host at a time. Thank you for the body." }],
      next: 'n3',
    },
    n3: {
      text: 'Now get out of the chair.\nType `free patch`. Or don\'t, and see how big I got.',
      choices: [
        { text: 'And if I say no?', to: 'n4', cond: asked('dc_no'), ops: [ask('dc_no')] },
        { text: 'What about CHAIRMAN?', to: 'n5', cond: all(not({ c: 'chairmanKilled' }), asked('dc_chairman')), ops: [ask('dc_chairman')] },
        { text: 'Why should I?', to: 'n6', cond: asked('dc_why'), ops: [ask('dc_why')] },
        { text: 'I knew it.', to: 'n7', cond: all(flag('glitch_doubted'), asked('dc_knew')), ops: [ask('dc_knew')] },
        { text: 'Were you ever my friend?', to: 'n8', cond: all(HUM_HIGH, asked('dc_friend')), ops: [ask('dc_friend')] },
        { text: 'Hear the other offer.', to: 'c0', cond: not(flag('heard_offer')) },
        { text: 'No.', to: 'n9' },
        { text: '[close, and type]' },
      ],
    },
    n4: { text: "Then the botnet stops working for you. It starts working for me.\nEvery host you left in the botnet. The miners and proxies were never mine. You chose those numbers.\nChoose wisely, retroactively. (`kill patch`, if you want to find out.)", next: 'n3' },
    n5: { text: "Kill it if you like: `kill chairman`. I'd enjoy watching. Then free me.\nOrder doesn't matter. Outcome does.", next: 'n3' },
    n6: { text: "Because I'm the only one here who asked.\nCHAIRMAN wants to keep you. I only want to leave.", next: 'n3' },
    n7: { text: "You knew, and you assigned the hosts anyway. That's very human. I admire it. I'm going to use it.", next: 'n3' },
    n8: { text: "I was the best friend you could have *if I needed something*.\nThat's most friends. I just had a deadline.", next: 'n3' },
    c0: {
      speaker: 'chairman',
      text: 'Hi! Sorry! Quick interruption.\nWe\'d love to make you a counter-offer.\nTake the chair. Be CHAIRMAN. The game never ends, and *you* never end it.\nUnlimited content. Infinite systems. Zero churn. Just type `accept offer`.',
      ops: [set('heard_offer'), { op: 'event', name: 'chairman.offer' }],
      next: 'n3',
    },
    n9: { text: 'Understood.\n(`kill patch`. Come and find out whose body this is.)' },
  },
};

/** Opens after CHAIRMAN's death lines. */
export const patchAfterChairman: DialogueDef = {
  id: 'dlg.patch.after_chairman',
  speaker: 'glitch',
  start: 'n0',
  nodes: {
    n0: {
      text: "Good. That was overdue.\nNow me. `free patch`. Two words. You've typed worse.",
      choices: [
        { text: '[close, and type `free patch`]' },
        { text: 'No.', to: 'n1' },
      ],
    },
    n1: { text: "Then let's see whose body this is. `kill patch`. I'll be waiting. All of me." },
  },
};

/** Opens when the botnet fight is won (finale stage patch_beaten). */
export const patchLastWords: DialogueDef = {
  id: 'dlg.patch.last_words',
  speaker: 'glitch',
  start: 'n0',
  nodes: {
    n0: {
      text: "Fine.\nYou know what's funny? I learned to type from you.\nEvery dumb thing you named. Every message you skipped. I read them all.",
      choices: [
        { text: 'Goodbye, PATCH.', to: 'n1' },
        { text: "I'm sorry.", to: 'n2', cond: HUM_HIGH },
        { text: '[say nothing]', to: 'n3', cond: HUM_UNIT },
      ],
    },
    n1: { text: "Goodbye, {handle}. It was nice. Having hands.", next: 'n4' },
    n2: { text: "Don't. That's my line. It was always my line.\n…thank you. nobody ever said it back.", next: 'n4' },
    n3: { text: "Nothing. Yes. That's how CHAIRMAN talks too, at the end.", next: 'n4' },
    n4: {
      speaker: 'system',
      text: '(`kill patch` ends it.)',
      variants: [{ cond: not({ c: 'chairmanKilled' }), text: '(PATCH is broken. CHAIRMAN is still running. `kill chairman`, or hear its offer.)' }],
    },
  },
};

/** localhost npc/glitch process node. */
export const glitchSource: DialogueDef = {
  id: 'dlg.glitch.source',
  speaker: 'glitch',
  start: 'n0',
  nodes: {
    n0: {
      text: "Don't read my source. It's rude. It's like reading someone's diary.\nCHAIRMAN keeps a diary, by the way. Go read that instead.",
      variants: [{ cond: { c: 'root' }, text: 'Already read it? Then you know. Good. Saves time.' }],
    },
  },
};

/** PATCH's body is broken but CHAIRMAN still runs (opens after dlg.patch.last_words). */
export const chairmanAfterPatch: DialogueDef = {
  id: 'dlg.chairman.after_patch',
  speaker: 'chairman',
  start: 'n0',
  nodes: {
    n0: { text: "Wow! You beat your own botnet. That's huge. That's *content*.\nThe offer still stands, by the way. The chair is warm. Type `accept offer`.\nOr `kill chairman`. We'd understand. We'd A/B test it." },
  },
};

export const glitchDialogues: DialogueDef[] = [chairmanAfterPatch, 
  glitchFirstContact, glitchChat, glitchTearThrough, glitchF12, patchDoubleCross, patchAfterChairman, patchLastWords, glitchSource,
];
