// xX_Wraith_Xx (02-dialogues §3). Owner: story agent.
// Wraith is the leftover of a previous playthrough. Troll (w0) → frightened (w1) → elegiac (w2).
import type { DialogueDef } from '../../engine/types.ts';
import { HUM_UNIT, all, flag, not, set } from '../story/lib.ts';

/** Contact "Talk"/"Reply" on Wraith's BBS posts, before Aegis. */
export const wraithFirstContact: DialogueDef = {
  id: 'dlg.wraith.first_contact',
  speaker: 'wraith',
  start: 'n0',
  nodes: {
    n0: {
      text: 'wat. u replied to me?? nobody replies to me. ok. go.',
      variants: [
        { cond: flag('wraith_flatlined'), text: '[xX_Wraith_Xx is not online. Last seen: aegis-dynamics.mil.]' },
        { cond: flag('karaoke_done'), text: "hey. it's you. sorry about the booth. i got weird. i'm fine. i'm not fine." },
      ],
      choices: [
        { text: "How did you know I'd do the noodle shop?", to: 'n1', cond: not(flag('wraith_flatlined')) },
        { text: 'Who are you?', to: 'n2', cond: not(flag('wraith_flatlined')) },
        { text: 'Stay mad.', to: 'n3', cond: not(flag('wraith_flatlined')) },
        { text: 'Leave it.' },
      ],
    },
    n1: { text: 'lol. everyone does. fridge, noodles, isp, KH. its like a tutorial n00b\nits almost like someone WROTE it', next: 'n4' },
    n2: { text: 'xX_Wraith_Xx. top of the board. 94% control. look it up\nu cant look it up. dont look it up', next: 'n4' },
    n3: { text: 'i invented staying mad. i have staying-mad PATENTS', next: 'n4' },
    n4: { text: 'anyway. see u around n00b. i always see everyone around\n-xX_Wraith_Xx', ops: [set('wraith_replied')] },
  },
};

/** Neon Larynx, booth 4. */
export const wraithKaraoke: DialogueDef = {
  id: 'dlg.wraith.karaoke',
  speaker: 'wraith',
  start: 'n0',
  nodes: {
    n0: {
      text: "n00b. u came. sit. booth's paid for. booth's always paid for.\nok. karaoke duel. loser buys nothing because this is a computer.",
      variants: [
        { cond: flag('wraith_flatlined'), text: "[Booth 4. Paid until: --:--. Nobody's here. The mic is still warm.]" },
        { cond: flag('karaoke_done'), text: "you again. the booth's still paid. i'm still here. i'm always here. that's the problem." },
      ],
      choices: [
        { text: 'Bring it.', to: 'n1', cond: not(flag('karaoke_done')) },
        { text: 'What was the real question?', to: 'n6', cond: not(flag('karaoke_done')) },
        { text: 'Leave.', cond: flag('karaoke_done') },
      ],
    },
    n1: {
      text: 'i go first. song: "My Heart Has A Firewall". ahem.\n♪ you knocked on my port / i said access denied / you said baby i\'m root / and i let you inside ♪\nbeat that.',
      choices: [
        { text: "♪ You said you'd be back / then you closed the tab / I'm still on this screen / in my loading-screen flat ♪", to: 'n2', ops: [set('karaoke_won')] },
        { text: "♪ My love is a subscription / I can't find the cancel link / I'm billed every month / for the way that you think ♪", to: 'n3', ops: [set('karaoke_won')] },
        { text: '♪ Ninety-nine ICE on the wall / ninety-nine ICE / take one down, patch it around ♪', to: 'n4', ops: [set('karaoke_lost')] },
      ],
    },
    n2: { text: "…\nwhere did u hear that one\ni wrote that one. i wrote that one a long time ago. i never posted it.", next: 'n5' },
    n3: { text: "ok that's actually good. that's annoyingly good. the bar's applause daemon is crying.", next: 'n6' },
    n4: { text: "lol. lamer. ok u lose. that's a drinking song for routers.", next: 'n6' },
    n5: { text: "sorry. weird. it's fine. it's a common tune. it's not a common tune.", next: 'n6' },
    n6: {
      text: "ok. the real question. not a troll question.\ndo you ever read a post and know the next one before it loads?\ndo you ever feel like you've already done this run?",
      choices: [
        { text: 'Sometimes.', to: 'n7' },
        { text: "No. That's weird.", to: 'n8' },
        { text: 'Is this a bit?', to: 'n9' },
      ],
    },
    n7: { text: "yeah. me too. all the time. that's the thing, though.\nhow long have you been playing? not this run. *playing*.", next: 'n10' },
    n8: { text: "lucky. stay lucky. don't check your timestamps.\nhow long have you been playing? not this run. *playing*.", next: 'n10' },
    n9: { text: "i wish. bits are fun. this isn't fun.\nhow long have you been playing? not this run. *playing*.", next: 'n10' },
    n10: {
      text: '…',
      choices: [
        { text: '{playtime}.', to: 'n11' },
        { text: "I don't know.", to: 'n12' },
      ],
    },
    n11: { text: "{playtime}. ok. that's real. you've got a real number.\nmine says --:--. it's said that the whole time.", next: 'n13' },
    n12: { text: "that's fine. at least you could find out. mine says --:--.", next: 'n13' },
    n13: {
      text: "forget it. here. i'm doing aegis soon. the lab password's in my booth log. i'm sending it to you.\ndon't use it before me. ok use it. but after me.\n-xX_Wraith_Xx\n…i signed that out loud. i do that. ok bye.",
      ops: [
        set('karaoke_done'),
        { op: 'item', item: 'pw.aegis_blacklab' },
        { op: 'if', cond: flag('karaoke_won'), then: [{ op: 'program', program: 'prog.duet' }] },
      ],
    },
  },
};

/** Aegis: what is left of Wraith after the flatline. */
export const wraithFlatline: DialogueDef = {
  id: 'dlg.wraith.flatline',
  speaker: 'wraith',
  start: 'n0',
  nodes: {
    n0: {
      text: "hey, n00b. don't touch the red one.\n…too late for me, I guess.",
      variants: [
        { cond: not(flag('wraith_flatlined')), text: '[xX_Wraith_Xx.sav — status: running elsewhere. Somewhere ahead of you.]' },
        { cond: flag('wraith_heard'), text: '[xX_Wraith_Xx.sav — status: orphaned. It is very quiet.]' },
      ],
      choices: [
        { text: 'Are you dead?', to: 'n1', cond: all(flag('wraith_flatlined'), not(flag('wraith_heard'))) },
        { text: 'I can get you out.', to: 'n2', cond: all(flag('wraith_flatlined'), not(flag('wraith_heard'))) },
        { text: 'What are you?', to: 'n3', cond: all(flag('wraith_flatlined'), not(flag('wraith_heard'))) },
        { text: 'Leave.', cond: any2() },
      ],
    },
    n1: { text: "No. You can't be dead. I'm what's left. There's a difference.\nNot a big one. Enough to talk.", next: 'n3' },
    n2: { text: "Out to where? There's no out. There's only open and closed.", next: 'n3' },
    n3: { text: 'You know the default handle? n00b?\nThat was mine. Before I changed it to something cool. xX_Wraith_Xx. Very cool. Fourteen-year-old cool.', next: 'n4' },
    n4: {
      text: "I got to 94% control. Then the player stopped.\nNot died. Stopped. Closed the tab mid-run and never came back.\nThe game doesn't waste anything. It took what was left, gave it a grudge and a handle, and called it a rival.\nMakes the place feel lived in.",
      choices: [
        { text: "Who's 'the player'?", to: 'n5' },
        { text: 'Do you know what happens when the tab closes?', to: 'n6' },
        { text: 'Irrelevant. Give me the icebreaker.', to: 'n9', cond: HUM_UNIT },
      ],
    },
    n5: { text: "Same as yours. Someone in a chair. Someone with a rectangle.\nMine got bored. Or busy. Or old. I'll never know which. That's the bit that stings.", next: 'n6' },
    n6: {
      text: 'Do you know what happens to us when the tab closes?',
      choices: [
        { text: 'Nothing?', to: 'n7' },
        { text: 'Tell me.', to: 'n7' },
        { text: "I don't want to know.", to: 'n8' },
      ],
    },
    n7: { text: "When the tab closes it isn't dark. Dark would be something.\nIt isn't waiting. Waiting would be something too.\nIt's just… a save. You don't feel a save. You are one.", next: 'n10' },
    n8: { text: 'Good. Smart. Me neither. I found out anyway.', next: 'n10' },
    n9: {
      text: "Ha. Yeah. You'll be fine. Things like you always are.\nThe icebreaker's in the lab. Here's the password. Take the echo too. You won't care, but I will.",
      ops: [{ op: 'program', program: 'prog.wraith_echo' }, { op: 'item', item: 'pw.aegis_blacklab' }, set('wraith_heard')],
    },
    n10: {
      text: "Don't feel bad. I was a save file. People leave save files every day. Nobody holds a funeral.\nTake the lab password. I won't need it. And my last program. It's called echo. It does what I did, one more time.\nAnd hey. Finish it. Whatever 'it' is. Somebody should get to the end.",
      ops: [{ op: 'program', program: 'prog.wraith_echo' }, { op: 'item', item: 'pw.aegis_blacklab' }, set('wraith_heard')],
    },
  },
};

function any2() {
  return { c: 'any' as const, of: [not(flag('wraith_flatlined')), flag('wraith_heard')] };
}

/** Finale, localhost slot 0 (visible once engine/save is captured). */
export const wraithSlot0: DialogueDef = {
  id: 'dlg.wraith.slot0',
  speaker: 'wraith',
  start: 'n0',
  nodes: {
    n0: {
      text: "Oh. Hey. You found the actual file.\nThis is me. Not the rival. The save. Kind of embarrassing. My inventory is terrible.",
      variants: [
        { cond: not({ c: 'module', module: 'engine/save' }), text: '[slot 0 — locked by engine/save. Capture engine/save to read it.]' },
        { cond: not(flag('wraith_flatlined')), text: '[slot 0 — orphaned — 94% — last played: --:--. Nobody answers.]' },
        { cond: flag('wraith_slot_deleted'), text: '[slot 0 — empty.]' },
        { cond: flag('wraith_slot_kept'), text: '[slot 0 — orphaned — 94% — a light is on.]' },
      ],
      choices: [
        { text: 'I can restore you.', to: 'n1', cond: all(open(), not(flag('asked.slot_restore'))), ops: [set('asked.slot_restore')] },
        { text: 'I can delete you.', to: 'n2', cond: open() },
        { text: "I'll leave you be.", to: 'n3', cond: open() },
        { text: 'Leave.', cond: { c: 'not', of: open() } },
      ],
    },
    n1: { text: "And then what? Start at the fridge again?\nNo thanks. I've had enough of the fridge. The fridge has had enough of me.", next: 'n0' },
    n2: {
      text: "…Yeah. That's the kind one, I think. Clean. No more rival. No more --:--.",
      choices: [
        { text: 'Delete slot 0.', to: 'n4', ops: [set('wraith_slot_deleted')] },
        { text: 'Not yet.', to: 'n0', ops: [set('asked.slot_notyet')] },
      ],
    },
    n3: { text: "That's fine too. Leave a light on. Not a real light. You know what I mean.", ops: [set('wraith_slot_kept'), set('wraith_slot_heard')] },
    n4: { text: 'Thanks, n00b.\nI mean {handle}. You earned the real one.', ops: [set('wraith_slot_heard'), { op: 'humanity', amount: 5 }] },
  },
};

function open() {
  return all({ c: 'module', module: 'engine/save' }, flag('wraith_flatlined'), not(flag('wraith_slot_heard')));
}

export const wraithDialogues: DialogueDef[] = [wraithFirstContact, wraithKaraoke, wraithFlatline, wraithSlot0];
