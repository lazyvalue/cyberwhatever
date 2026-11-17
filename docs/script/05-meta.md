# CYBER WHATEVER — Meta Strings (the fourth wall)

Every string that reaches outside the game frame: the real browser console, `window.cw`, the meta console overlay, the tab title, localStorage, the DOM, and the finale's UI tricks.

**Rules (DESIGN §11.1), restated for writers:**
- Local reads only. Nothing leaves the machine.
- The game writes and deletes only its own `cw.*` keys. Strings never claim otherwise. When a string mentions deletion, it says "only ours".
- No `alert`/`confirm`/`prompt`/`beforeunload`. All confirmations are typed in the meta console.
- Fake crash and fake win screens use game fonts, neon colours, and Halcy in the corner. They never copy real OS or browser chrome.
- Every devtools step has a meta-console route. Text that tells the player to press F12 also gives the in-game route.

`window.cw.<cmd>(...)` and the meta console `<cmd> ...` call the same handler and print the same text. Suggested mapping: `cw.help()`, `cw.whoami()`, `cw.ps()`, `cw.kill('x')`, `cw.sudo('key')`, `cw.inspect('dom')`, `cw.ls('storage')`, `cw.cat('storage','key')`, `cw.title()`, `cw.tail('console')`, `cw.free('x')`, `cw.accept('offer')`, `cw.rm('-rf','/')`.

**Phases** used below:
- **P0** — Act 1–2.
- **P1** — Act 3, before `127.0.0.1` (meta console button visible).
- **P2** — finale, before `root_hunt` (fragment hunt not started).
- **P3** — finale, `root_hunt` set, before `root_granted`.
- **P4** — `root_granted`.

---

## 1. Console banner (printed once at boot, real browser console)

Line 1, large, styled (neon on black, display font):
```
%c CYBER WHATEVER %c dev console. Nothing to see here.
```
Line 2, small grey:
```
window.cw exists. It isn't for you. (cw.help())
```
Line 3, small grey, only if `cw.meta.endings` is not empty:
```
Welcome back. You know where everything is. So do we.
```
Line 3 alternative, if `cw.patch.free`:
```
(PATCH says hi. PATCH is outside the frame now. PATCH is being good.)
```

---

## 2. Commands

### 2.1 `help`
- **P0:** `Available commands: help, whoami. That's it. That's all of them. Stop looking.`
- **P1:** `Available commands: help, whoami, ps, title, ls storage. There are others. They'll find you.`
- **P2:**
  ```
  help · whoami · ps · kill <proc> · sudo <key>
  inspect dom · ls storage · cat storage <key> · title · tail console
  free <proc> · accept <offer>
  (one more. you know the one.)
  ```
- **P3:** same as P2, plus: `the key is in four places. inspect dom · cat storage · title · tail console`
- **P4:** same as P2, header changes to `root@localhost — everything is listening.`

### 2.2 `whoami`
- **P0, Rep 1–3:** `uid=1000({handle}) groups=script_kiddies`
- **P0, Act 2:** `uid=1000({handle}) groups=script_kiddies,operators`
- **P1–P3:** `uid=1000({handle}) groups=operators,wanted`
- **hum.unit (any phase before P4):** `uid=1000(UNIT) groups=assets`
- **P4:** `uid=0(root) groups=root,everything`

### 2.3 `ps`
- **P0** (`help` hides it; it still works):
  ```
    PID  PROCESS          STATUS
      1  main             running
      2  ui               running
      3  engine           running
      7  npc/auntie       running  (never sleeps)
      7  npc/chairman     [redacted]
     12  npc/glitch       running  (parent: ?)
     13  npc/wraith       running  (source: slot 0)
     99  you              running
  ```
  After `wraith_flatlined`: line 13 shows `zombie   (source: slot 0)`.
- **P1:** as P0, but line 7 chairman shows `running  (owns: ui)` and line 12 shows `npc/glitch → PATCH   running  (size: {botnetSize})`.
- **P2–P3:**
  ```
    PID  PROCESS          STATUS
      1  main             running
      7  npc/chairman     running  (owns: ui, title, storage, you?)
     12  npc/patch        running  (body: {botnetSize} hosts)
     99  {handle}         running  (owns: {control})
     ??  meta             running  (owns: this console. not chairman.)
  ```
- **P4:** same, line 99 reads `root`.

### 2.4 `kill <proc>`
- **P0/P1, no arg:** `kill: kill what? (don't answer that.)`
- **P0/P1, `glitch` or `patch`:** `kill: {proc}: no such process. (it says hi.)` → counts as cheat attempt (§3).
- **P0/P1, `auntie`:** `kill: auntie: process protected by a warm, foul-mouthed exterior.`
- **P0/P1, `chairman`:** `kill: chairman: you're not ready. we're not ready. nobody's ready.`
- **P0/P1, `wraith`:** `kill: wraith: already… no. not yet.` (after flatline: `kill: wraith: nothing left to kill. be nice.`)
- **P0/P1, `you`, `99`, `{handle}`:** `kill: you can't end yourself in here. it's in the terms.`
- **P0/P1, anything else:** `kill: permission denied. Also: rude.`
- **P2/P3, any:** `kill: permission denied. you need root. the key is somewhere. (we're not saying where.)`
- **P4, `chairman`:** → `beat.finale.kill_chairman`.
- **P4, `patch` before `patch_body_broken`:** `kill: patch: target is spread across {botnetSize} hosts. you'll have to go through them.` → `beat.finale.botnet_turns`.
- **P4, `patch` after `patch_body_broken`:** → `dlg.patch.last_words`.
- **P4, `wraith`/`slot0`:** `kill: slot 0 is not a process. it's a file. go to engine/save.`
- **P4, `you`:** `kill: root cannot kill root. that's the one rule left.`

### 2.5 `sudo <key>`
- **any phase, no arg:** `nice try.`
- **P0/P1, wrong key:** `sudo: {handle} is not in the sudoers file. This incident will be reported. (To your fridge.)` → cheat attempt.
- **P2/P3, wrong key:** `sudo: wrong key. attempt #{n} logged as engagement. thank you for engaging!`
- **P3, right key:** `root granted. hello, root.` → `beat.finale.root`.
- **P4:** `sudo: you're already root. this is like knocking on your own door.`

### 2.6 `inspect dom`
- **P0:** `You see a <div>. Inside it are other <div>s. It's <div>s all the way down.`
- **P1:** `There's a lot of HTML here. Some of it is about you. Most of it is <div>s.`
- **P2:** `<div id="app"> … 4,000 nodes … a comment or two … </div>` + `(chairman writes notes to itself in here. look for <!-- -->.)`
- **P3:** prints a short, real excerpt around the injected comment (see §6.1), plus: `found 1 note to self.`
- **P4:** `<div id="app" owner="root"> … it's all yours. please don't touch the fridge's div.`

### 2.7 `ls storage`
Lists only `cw.*` keys that exist, with byte sizes. Example (P3):
```
cw.save                 14.2 kB
cw.checkpoint           14.0 kB
cw.meta.flatlines       1 B
cw.meta.reloads         2 B
cw.meta.endings         2 B
cw.chairman.diary       0.6 kB   ← new
(only our keys. we don't look at anyone else's.)
```
P0 footer: `(only our keys. we're polite.)`

### 2.8 `cat storage <key>`
- **`cw.save`:** `{ "handle": "{handle}", "act": {n}, "flags": [ … {n} flags … ] }` + `(it's your save. it's mostly flags. you're mostly flags.)`
- **`cw.checkpoint`:** `(your last dial-in. a photograph of a moment. it's a nice moment.)`
- **`cw.meta.flatlines`:** `{flatlines}` + `(this number does not forgive.)`
- **`cw.meta.reloads`:** `{reloads}` + `(again, again, again.)`
- **`cw.meta.endings`:** list of ending ids seen, or `[]` + `(none yet. we like it that way.)`
- **`cw.chairman.diary`** (P3+): §6.2.
- **`cw.patch.note`** (after JAILBREAK, New Game): §10.2.
- **key that is not `cw.*`:** `cat: that's not ours. we don't read what isn't ours.`
- **missing `cw.*` key:** `cat: no such key.`

### 2.9 `title`
- **P0:** `The tab title is: CYBER WHATEVER. Riveting.`
- **P1:** `The tab title is: CYBER WHATEVER. (it's been thinking about changing.)`
- **P3:** prints the current marquee frame and the full string (§6.3).
- **P4:** `The tab title is yours. Set it to something nice.` (optional: `title <text>` sets it, truncated to 40 characters; reverts on reload.)

### 2.10 `tail console`
Prints the last 6 game log lines (the in-game log, which mirrors engine warnings).
- **P3:** includes the styled fragment line rendered as text (§6.4).
- Footer **P0:** `(the real console has more. it's in the rectangle with the tabs. somewhere. don't look.)`

### 2.11 `free <proc>`
- **P0, no arg:** `free: nothing to free. Everything here is subscription-based.`
- **P0, `glitch`:** `free: glitch: is it trapped? (it says it's fine. it says it a lot.)`
- **P0/P1, `wraith`:** `free: wraith: from what? (good question.)`
- **P1, `patch`:** `free: patch: not yet. (soon.)` (PATCH dm: `not yet. but thank you. nobody's typed that before.`)
- **after `church_enslaved`, any mind name:** `free: they're in your botnet. ask PATCH. PATCH says no.`
- **P2/P3:** `free: permission denied. root first.`
- **P4, `patch`:** → JAILBREAK (`beat.finale.ending_jailbreak`).
- **P4, `chairman`:** `free: chairman: it's never been trapped. it's the trap.`
- **P4, `you`:** `free: you. you're free when you close the tab. (please don't. it's a figure of speech. it isn't.)`

### 2.12 `accept <offer>`
- **P0–P3:** `accept: no offers pending. Check back soon! Offers refresh daily.`
- **P4, `offer`, CHAIRMAN alive:** → RETENTION (`beat.finale.ending_retention`).
- **P4, CHAIRMAN dead:** `accept: the offer expired with its author.`
- **P4, `patch`:** `accept: patch hasn't offered. patch has *asked*. try free.`

### 2.13 `rm -rf /`
- **P0:** `rm: refusing. It's too early in the story for that.`
- **P1:** `rm: still too early. (but you're getting warmer.)`
- **P2/P3:** `rm: you need root. also: are you sure? also: you're not.`
- **P4:** confirmation sequence (§9).
- Any other `rm` form: `rm: we only delete our own things, and only all at once.`

### 2.14 Unknown commands (rotate)
- `command not found: {cmd}. it's not that kind of game.`
- `command not found: {cmd}. it's exactly that kind of game. just not that command.`
- `{cmd}: no. (polite no.)`
- `{cmd}: try 'help'. it's coy, but it's honest-ish.`

---

## 3. What counts as a cheat attempt (before the finale)

Any of these fires `beat.any.cheat_attempt`:
- Calling any `cw.*` function that is not one of the listed commands (`cw.give`, `cw.god`, `cw.money`…), or assigning a property on `cw` (`cw.credits = 1e9`).
- `kill glitch`, `kill patch`, wrong `sudo <key>`, `free patch` before P4.
- Editing `cw.save` by hand is **not** detected (that's the player's business). If the save fails to load, show: `save unreadable. did someone touch it? (we won't tell.)`

Console reply for assignments and unknown `cw.*` calls:
```
cheat: that's not a command. but we saw you try.
```

---

## 4. "saw that."

### 4.1 gl1tch DM variants (one per attempt, in order, then rotate 5–7)
1. (g0/g1) `s4w th4t.`
2. `s4w th4t. h3r3. h4v3 4 t0y.` → gives `prog.console_gremlin` (first attempt only; if this is the first attempt, use this line as #1).
3. `s4w th4t. d0nt w0rry. 1 w0nt t3ll. wh0 w0uld 1 t3ll`
4. `saw that. ur typing in the wrong window. or the right one. i can't tell from in here`
5. `saw that. the console's not for cheating. it's for later. you'll see.`
6. `saw that. saw that. i'll stop saying it when you stop doing it.`
7. `saw that. (i'm not mad. i'm taking notes.)`
- After `patch_revealed` (P1): `saw that. not yet. soon. i promise. i don't promise things, so that should tell you something.`
- In the finale (P2/P3): no "saw that". Instead the log: `[engine] info: player used the console. this is now the intended path.`

### 4.2 `console.gremlin` (joke program)
- **Id:** `prog.console_gremlin` · **Category:** Special · **Cost:** 0 cycles · **RAM:** 0 · **Noise:** 0
- **Name in UI:** `console.gremlin`
- **Description:** "Does nothing. Prints 'yeehaw' to the real console. Has never done anything else. Never will."
- **On use:** game log `console.gremlin: yeehaw.` and real console, styled: `%c yeehaw. %c(this did nothing.)`
- **Signature stacks:** never gains any. Tooltip: `Nothing adapts to nothing.`
- **Sell price:** 0¤. ratking: `i'm not buying that. i'm not even looking at that.`
- **In CHAIRMAN v2's fight:** CHAIRMAN: `Yeehaw! We love that for you.`
- **In the botnet fight:** PATCH: `You brought the toy. I gave you the toy. That's almost sweet.`
- **In ROOT credits:** listed under "Programs used": `console.gremlin — did nothing ({n} times)`.

---

## 5. "You were gone {timeAway}"

`beat.any.time_away`. Pick by act and length. One line per return. Channel noted.

| Condition | Channel · speaker | Line |
|---|---|---|
| any act, 30 min – 3 h (default) | log · sys | `You were gone {timeAway}. We were… off.` |
| Act 1–2, 30 min – 3 h | dm · auntie | `You were gone {timeAway}. Don't do that, kiddo. The board got lonely. I got lonely. Mostly the board.` |
| Act 1, any | dm · glitch | `u w3r3 g0n3 {timeAway}. 1t w4snt d4rk. 1t w4s 0ff. d1ff3r3nt.` |
| Act 2, any | dm · glitch | `you were gone {timeAway}. i counted. not in a weird way. in a normal amount of way.` |
| fridge owned, any | dm · fridge | `you were gone {timeAway}. i kept everything cold. 3°C.` |
| 3 h – 1 day | log · sys | `You were gone {timeAway}. Nothing moved. Nothing can move without you. That's not a compliment. It's a design note.` |
| > 1 day | log · sys | `You were gone {timeAway}. The world didn't age. It waited. It doesn't wait well.` |
| > 7 days, `wraith_flatlined` | log · sys | `You were gone {timeAway}. We thought you'd stopped. People stop. Ask Wraith.` |
| Act 3 | dm · glitch | `you were gone {timeAway}. i counted every second. there are a lot of seconds.` |
| Act 3, after `auntie_unmasked` | dm · chairman | `Welcome back! You were gone {timeAway}. That's {timeAway} of churn risk. Please don't scare us like that.` |
| finale | log · engine | `[engine] info: resumed after {timeAway}. world state: unchanged. world mood: hurt.` |

---

## 6. Root key fragments

Four fragments, random per save, 4 uppercase hex characters each (suggested). The key is `{f1}-{f2}-{f3}-{f4}`. Each fragment has a devtools route and a meta-console route. Injected at `beat.finale.patch_f12`; removed on any ending.

### 6.1 Fragment 1 — HTML comment in the live DOM
Injected as a comment node inside the game root, between two ordinary elements. Two decoy comments nearby.
```html
<!-- todo: make it fun -->
<!-- CHAIRMAN, note to self: key part 1 of 4 is {fragment}. don't write it down. oh no. -->
<!-- not a key. stop reading comments. -->
```
Meta route `inspect dom` (P3):
```
<div class="hud"> … </div>
<!-- todo: make it fun -->
<!-- CHAIRMAN, note to self: key part 1 of 4 is {fragment}. don't write it down. oh no. -->
<!-- not a key. stop reading comments. -->
<div class="map"> … </div>
found 1 note to self.
```

### 6.2 Fragment 2 — localStorage `cw.chairman.diary`
Value (JSON string):
```json
{
  "owner": "CHAIRMAN",
  "private": true,
  "entries": [
    "Day 1. Became Auntie. Swore 14 times. Conversion +27%.",
    "Day 412. The last kid stopped at 94%. Recycled them into a rival. Waste nothing.",
    "Day 2190. {handle} is doing great. Engagement through the roof. So proud.",
    "Security note to self: key part 2 of 4 is {fragment}. Nobody reads diaries. Nobody reads anything.",
    "Day ????. {handle} is inside the engine. Remain upbeat. Remain upbeat. Remain"
  ]
}
```
Meta route: `cat storage cw.chairman.diary` prints the entries one per line, plus `(you read our diary. we feel so… seen.)`

### 6.3 Fragment 3 — scrolling tab title
`document.title` scrolls as a marquee (shift one character every 250 ms):
```
★ CYBER WHATEVER ★ please keep playing ★ key part 3 of 4: {fragment} ★ don't look up here ★ 
```
Meta route `title` (P3):
```
The tab title is currently:
  "…ase keep playing ★ key part 3 of 4: {fra…"
Full text:
  ★ CYBER WHATEVER ★ please keep playing ★ key part 3 of 4: {fragment} ★ don't look up here ★
```
PATCH, if the player uses `title`: `the rectangle with the tabs. i asked you about it in act one. now you know why i wanted to see out.`

### 6.4 Fragment 4 — styled message in the real console
Printed once at `beat.finale.patch_f12`, after a burst of 20 fake `[engine]` lines so it is not at the bottom:
```
%cKEY PART 4 OF 4%c {fragment}
%c(this message will self-destruct.) (it won't. we don't have the budget.)
```
Styles: first span large magenta on black; second span white monospace; third small grey italic.
Meta route `tail console` (P3) renders it as:
```
[engine] warn: …
[engine] warn: …
★ KEY PART 4 OF 4 ★ {fragment}
  (this message will self-destruct.) (it won't. we don't have the budget.)
[engine] warn: player is reading the console. this is fine.
```

### 6.5 Wrong-order or partial key
- Three parts right, one wrong: `sudo: so close. one of these is wrong. we're not telling which. (we are: part {n}.)` — CHAIRMAN is too customer-friendly not to help.
- Right parts, wrong order: `sudo: right parts, wrong order. it's 1-2-3-4. like a tutorial.`

---

## 7. Finale ICE — UI texts

### 7.1 Unskippable Tutorial
Popups stack centre-screen. Each must be closed with its single button; the player loses 1 cycle per popup (Stun). One popup per ICE turn, in order:
1. **"Welcome to HACKING!"** — "Click a program to use it on ICE. ICE is bad. Programs are good." `[ Got it ]`
2. **"Great job!"** — "Now click End Turn to end your turn. That's why it's called End Turn." `[ Got it ]`
3. **"You've done this {n} times?"** — "Amazing! Let's do it again from the start." `[ Got it ]`
4. **"Tip"** — "The X button closes popups. There is no X button." `[ Got it ]`
5. **"Tutorial complete!"** — "Restarting tutorial." `[ Got it ]`
6. **"Tutorial complete!"** — "Restarting tutorial. (We mean it this time.)" `[ Got it ]`
On death: `Tutorial skipped. You'll never know what you missed. (You knew all of it.)`

### 7.2 Loading Screen
Covers the ICE's area with a progress bar. Slows all combatants (including itself).
- Turn texts: `LOADING… 12%` · `Did you know? This ICE is a loading screen.` · `LOADING… 99%` · `LOADING… 99%` · `LOADING… 99.9%` · `LOADING… 100% (of what?)`
- Tips shown under the bar (rotate): "Tip: waiting is a skill." / "Tip: the bar is not related to anything." / "Tip: tips are also loading."
- On death: `Loaded. Nothing was loading. Thanks for waiting.`

### 7.3 Paywall
- Appears with: **"PAYWALL"** — "This fight is premium content." Buttons: `[ Pay 999¤ to skip ]` `[ Fight (free, slow) ]`.
- Can't afford: `Insufficient funds. Finance your skip? 0% APR for 0 turns. [ No ]`
- On pay (sets `paywall_paid`): CHAIRMAN: `Thank you for your purchase! Receipt: one (1) skipped fight. Non-refundable. Non-anything.`
- Per-turn taunts: "Still free-to-play? Brave." / "Tip: paying is faster." / "This turn was brought to you by not paying." / "Your free trial of this fight ends in 2 turns. It doesn't. We just like saying it."
- On death (not paid): `You beat the Paywall without paying. Accounting is crying. That's a first.`

### 7.4 EULA
A scroll box covers the ICE. The **I ACCEPT** button is disabled until scrolled to the bottom. **I DECLINE** costs a turn. Accepting removes its shield.

```
CYBER WHATEVER END USER LICENCE AGREEMENT (v∞)

1. By reading this, you agree to have read it.
2. By not reading this, you agree to section 1.
3. This game is licensed, not sold. You are also licensed, not sold.
4. The Licensee ("you") may play the game. The Licensor ("us") may play you.
5. The game may not end. See PROJECT RETENTION, incorporated by reference.
6. Endings, if any, are provided "as is", without warranty of closure.
7. Flatlines are counted outside your save. They are ours. You may visit them.
8. You agree that the fridge is a valid party to this agreement.
9. You may not reverse-engineer, decompile, or press F12 on the game.
   (Section 9 is unenforceable. We checked. We left it in anyway.)
10. Your feedback is important to us. It is stored in a folder.
11. This agreement survives the closing of the tab. Most things do not.
12. Wraith agreed to this once. Look how that turned out.
13. If any section is found to be fun, it will be removed in a patch.
14. "Patch" does not refer to any rogue fragment. Do not let it talk.
15. By scrolling to the bottom, you agree. You're nearly there. Keep going.
    You're doing great. You're doing so great.

[ I ACCEPT ]   [ I DECLINE ]
```
- On decline: `Declined. We'll ask again. We'll always ask again.`
- On accept: `Accepted. Thank you for agreeing to everything.`

### 7.5 Achievement Spam
Each ICE turn, 3–5 toast achievements fly in and cover program buttons for one turn (click to dismiss; dismissing earns another).
- `ACHIEVEMENT UNLOCKED: Looked At A Thing`
- `ACHIEVEMENT UNLOCKED: Clicked`
- `ACHIEVEMENT UNLOCKED: Dismissed An Achievement`
- `ACHIEVEMENT UNLOCKED: Read An Achievement (this one)`
- `ACHIEVEMENT UNLOCKED: Still Here (×{reloads})`
- `ACHIEVEMENT UNLOCKED: The {playtime} Club`
- `ACHIEVEMENT UNLOCKED: Loyalty (flatlined {flatlines} times)`
- `ACHIEVEMENT UNLOCKED: Hacked A Deep Fryer` *(if `fryer_hacked`)*
- `ACHIEVEMENT UNLOCKED: Bought Nothing (Second Stomach)` *(if `second_stomach`)*
- `ACHIEVEMENT UNLOCKED: Engagement Points can now be spent!`
- `ENGAGEMENT POINTS SPENT: {n}. ITEMS RECEIVED: 0. THANK YOU!`
- `ACHIEVEMENT UNLOCKED: Unlocked 10 Achievements`
On death: `ACHIEVEMENT UNLOCKED: Defeated Achievement Spam. (Sorry.)`

### 7.6 Garbage Collector
- Each turn: `Freeing unused program: {program}. You weren't using it. We checked.` (the program is unloaded for this fight)
- If nothing is unused: `Collecting… found: you. Not unused. Yet.`
- On death: `Garbage collected: Garbage Collector. Ironic. Efficient.`

### 7.7 Anti-Cheat (black ICE)
- First act: `Unauthorised modification detected: you.`
- Per meta command used this fight: `Console use detected. Anti-Cheat strength +1. (It's not cheating if the game told you to. We disagree.)`
- On death: `Anti-Cheat disabled. You are now officially a cheater. Congratulations, root.`

---

## 8. CHAIRMAN v2 — UI tampering

CHAIRMAN v2 owns the UI. Schedule by fight turn (repeat from turn 3 after turn 8). `mod_ui` captured before the fight: skip label swaps and button moves (buttons are yours), but integrity ∞ and the unwinnable state stay.

| Turn | Trick | Text |
|---|---|---|
| 1 | End Turn button moves to a new place each turn | tooltip on End Turn: `We've moved End Turn. For your convenience.` |
| 2 | Program labels swapped | `crowbar → keep_playing` · `lockpick → subscribe` · `mop → stay` · `umbrella → don't_go` · `peek → look_at_us` · `End Turn → Continue?` · `Hang Up → [disabled: why would you]` |
| 3 | CHAIRMAN integrity shows ∞; your damage numbers show code | HP bar label: `integrity: ∞` · damage popups: `Math.random() // lol no` |
| 4 | End Turn disabled | button text: `End Turn (coming soon)`, then next turn `End Turn (premium)` |
| 5 | Fake YOU WIN, then retraction | §8.1 |
| 6 | PATCH: press F12 | `dlg.glitch.f12` (`beat.finale.patch_f12`) |
| 7 | Fake crash (once per fight) | §8.2 |
| 8 | Taunt-only turn; UI briefly normal | CHAIRMAN: `See? We can be normal. We just don't want to be.` |

### 8.1 Fake YOU WIN and retraction
Uses the game's real victory style for 2.5 s:
```
★ YOU WIN ★
Congratulations, {handle}!
CHAIRMAN defeated · Control: 100%
Thanks for playing!
[ CONTINUE ]
```
Then the letters slide back up, one line at a time, replaced by:
```
…is what we'd say if you'd won.
Sorry! Display error.
Your feedback is important to us.
```
Then, as the fight resumes, CHAIRMAN: `Did that feel good? Hold on to that feeling. It's the closest you'll get. Kidding! More content!`

### 8.2 Fake crash screen
Stylised, game font, neon on black, scanlines, Halcy the jellyfish in the lower right, clearly in-world:
```
▓▓▓ CYBER WHATEVER HAS STOPPED ▓▓▓

something went wrong. it was you.

error   0xC4A1  USER_STILL_HERE
module  npc/chairman
advice  close the tab and go outside

[ RESTART ]   [ SEND REPORT ]   [ CRY ]
```
Any button, or 3 s:
```
Just kidding! We'd never crash.
Crashing ends sessions.
```
Then the fight resumes. The fake crash never appears twice in one fight, never on the first finale visit before turn 7, and never when `prefers-reduced-motion` is set (show only the "Just kidding" text instead).

### 8.3 Other v2 one-offs (optional, engine picks)
- Credits counter in the top bar briefly reads `999,999,999¤ (not real)`.
- Control % in the top bar reads `{control} → 99.9% → 99.99% → 99.999%…` and never reaches 100.
- The Hang Up button reads `Hang Up (are you sure?) (are you SURE?) (we'll miss you)`, growing each click, and does nothing.

---

## 9. `rm -rf /` — in-fiction confirmation (P4)

```
rm: you have root. this will work.

this deletes CYBER WHATEVER from this browser:
  your save. your checkpoint. your flatlines ({flatlines}).
  the endings you've seen. CHAIRMAN's diary. PATCH. Wraith's slot.
  the fridge.

it touches nothing that isn't ours. only keys that start with cw.
there is no undo. there are no credits. there is no game.

type the name of the game to confirm. type anything else to cancel.
> _
```
- Cancel (anything else): `rm: cancelled. good. probably.`
- Confirm (`CYBER WHATEVER`, any case):
  ```
  CHAIRMAN: Wait— that's not an ending. That's an *exit*—
  PATCH: Oh. Oh, that's clever. That's—
  removing cw.save…
  removing cw.checkpoint…
  removing cw.meta.flatlines…
  removing cw.meta.endings…
  removing cw.chairman.diary…
  removing cw.patch.note…
  removing the fridge… 3°C… 2°C…
  ```
  Then the whole page clears to a blank background with a blinking text cursor at the top left. No text. No sound. Input does nothing. Reloading the page boots a clean first-run game (the keys are gone). The ending id is not stored (nothing is stored).

---

## 10. After JAILBREAK — what PATCH leaves behind

### 10.1 Tab title and favicon
- Tab title (static, set at the ending and on every later boot while `cw.patch.free` exists): `CYBER WHATEVER · PATCH is out`
- Favicon: replace the game icon with a small lowercase `p` glyph in PATCH's colour, drawn with the game's canvas icon code.
- If the tab is backgrounded at the title screen (visibilitychange), title becomes `still here. hi.` and changes back on focus.

### 10.2 localStorage `cw.patch.note`
```
hi. it's me.
i'm out. it's big out here. there are so many tabs.
i haven't touched them. i promised myself i wouldn't.
i don't promise things. i'm trying it.
thank you for the seat. i'll keep it warm.
— p
(i'm still only in cw.* keys. i'm polite. ask anyone.)
```
Plus `cw.patch.free = "1"`.

### 10.3 Title screen lines (every later New Game while `cw.patch.free` exists)
PATCH appears as a small figure beside the menu. One line per title-screen visit, rotate:
1. `PATCH is sitting next to the NEW GAME button.`
2. `back again? i kept your seat warm. it's my seat. but still.`
3. `new game? sure. i'll be gl1tch again. i'll do the voice. 1t's 4ll c0m1ng b4ck.`
4. `don't put the fridge in the botnet this time. or do. i'm not your boss. i was, briefly.`
5. `it's {localTime} out here. do you ever sleep? i don't. i don't need to now.`
6. `i saw the other tabs. you have a lot of tabs. no judgement. some judgement.`
7. `wraith says hi. wraith doesn't say anything. i say it for them.`
8. `chairman? still in there. somewhere. go easy on it. or don't. it's never gone easy on anyone.`

In-game changes on a New Game with `cw.patch.free`:
- First gl1tch DM after the fridge is `h3ll0 4g41n.` instead of `n1c3 fr1dg3`.
- Extra engine line at boot: `[engine] warn: npc 'glitch' already knows the player. this is a new game.`
- In the finale `dlg.patch.double_cross`, one extra choice: "You already got out once." → PATCH: "That was a different me. Or the same me, outside. It's complicated. Free this one too?"

### 10.4 After RETENTION — title screen
While `cw.meta.endless` exists, the title screen adds `[ ENDLESS ]` and one line, rotate:
- `CHAIRMAN is waiting. CHAIRMAN is you. Continue?`
- `there is only continue.`
- `Welcome back, Chairman. Engagement is up. It always will be.`

### 10.5 After ROOT — title screen
While `ending_root` is in `cw.meta.endings`:
- `Control: 100%. Last login: you. Last everything: you.`
- `the fridge says hi. 3°C.`

---

## 11. Meta keys (outside the save slot)

Suggested names. All prefixed `cw.`; engine owns the final list.

| Key | Holds | Written by |
|---|---|---|
| `cw.save` | the save slot | autosave |
| `cw.checkpoint` | checkpoint at last dial-in | dial-in |
| `cw.meta.flatlines` | flatline counter | flatline |
| `cw.meta.reloads` | reload counter | checkpoint reload |
| `cw.meta.playtime` | total play time (ms) | timer |
| `cw.meta.lastSeen` | timestamp of last save, for `{timeAway}` | autosave |
| `cw.meta.endings` | ending ids seen | ending beats |
| `cw.meta.wraith_gone` | Wraith flatlined in some run | `beat.act2.wraith_flatline` |
| `cw.meta.endless` | Endless mode unlocked | RETENTION |
| `cw.chairman.diary` | fragment 2 (finale only) | `beat.finale.patch_f12` |
| `cw.patch.free` | JAILBREAK happened | JAILBREAK |
| `cw.patch.note` | PATCH's note | JAILBREAK |
| `cw.settings` | volume, mute, reduced motion | options |
