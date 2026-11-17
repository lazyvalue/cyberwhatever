# CYBER WHATEVER — Script Bible

Companion to `DESIGN.md`. DESIGN wins on rules. This file wins on words.

Files in this folder:

| File | Holds |
|---|---|
| `00-bible.md` | conventions, voices, gags, twist clues, foreshadowing ladder, glossary, KH brand book |
| `01-beats.md` | every story beat, objective chain, all non-interactive messages, flag/item index |
| `02-dialogues.md` | every interactive dialogue tree |
| `03-systems-flavor.md` | the 17 systems: blurbs, MOTDs, nodes, files, ICE skins |
| `04-items-flavor.md` | hardware, programs, ICE, implants, perks, jobs, procedural parts, chatter, tips |
| `05-meta.md` | every fourth-wall string (devtools, meta console, root key, finale UI tricks) |
| `06-endings.md` | the four endings, credits, the credits that never end |

---

## 0. Conventions (read before converting to content files)

### 0.1 Ids
- Ids are lowercase. Segments are joined with `.`; words inside a segment with `_`.
- Beats: `beat.<act>.<name>`. Acts: `act1`, `act2`, `act3`, `finale`, `any` (can fire in any act).
- Messages: `msg.<beat name>.<n>` (`msg.fridge_done.1`). A message belongs to the beat that sends it.
- Dialogues: `dlg.<npc>.<name>`. Nodes inside a dialogue: `n0`, `n1`, … `n0` is the entry node. `END` closes the dialogue.
- Objectives: `obj.main.<name>`, `obj.side.<name>`.
- Flags: bare `snake_case` (`fridge_done`). Full index at the end of `01-beats.md`.
- Items: `key.<name>` (vault keys), `pw.<name>` (passwords), `prog.<name>` (programs), `file.<system>.<name>` (paydata/lore), `item.<name>` (anything else).
- Systems use DESIGN §10.2 ids. Nodes: `<system>.<node>` (`wok.fryer`).
- ICE: `ice.<name>`. Hardware: `hw.<part>.<tier>`. Implants: `imp.<name>`. Perks: `perk.<name>`.
- NPC ids: `auntie`, `glitch`, `wraith`, `chairman`, `whisper`, `doc`, `deacon`. Extras introduced here: `board` (The Board, the Arcology boss), `parental` (Parental Controls, fridge ICE voice), `fridge` (the fridge, after you own it), `sys` (system/HUD voice), `engine` (the game log).
- `glitch` keeps one id for the whole game. Display name is `gl1tch` until flag `patch_revealed`, then `PATCH`.
- `auntie` display name becomes `Auntie Static (CHAIRMAN)` after flag `auntie_unmasked`.

### 0.2 Channels
| Channel | What it is |
|---|---|
| `dm` | private message in the Hub inbox. Has a sender. |
| `bbs` | public post on the Dead Drop board. Has a poster handle. |
| `log` | one line in the game log. Engine warnings live here. |
| `toast` | short HUD notice, 1 line, disappears. |
| `card` | full-screen title card (act breaks). |
| `comms` | in-run speech line from an NPC, shown over the map while you are dialed in. |
| `meta` | the meta console / real browser console (see `05-meta.md`). |

### 0.3 Placeholders
Engine fills these. All are local reads only (DESIGN §11.1).

| Slot | Value | Example |
|---|---|---|
| `{handle}` | player handle | `n00b` |
| `{playtime}` | total real play time, human format | `3 hours 12 minutes` |
| `{flatlines}` | meta flatline counter (survives reloads) | `6` |
| `{reloads}` | meta reload counter | `11` |
| `{localTime}` | local clock, `h:mm am/pm` | `11:04 pm` |
| `{viewport}` | `W×H` of the window | `1440×900` |
| `{timeAway}` | real time since last session, human format | `3 hours` |
| `{control}` | Control % | `62%` |
| `{botnetSize}` | count of hosts in the Botnet role | `23` |
| `{humanity}` | humanity value | `41` |
| `{credits}` `{heat}` `{rep}` `{hodl}` | economy/state values | |
| `{topSystem}` `{topSystemTime}` | *extension*: the system the player spent most real time in, and how long | `the noodle shop`, `47 minutes` |
| `{fragment}` | one root key fragment | `7F3A` |
| `{n}` `{x}` | generic numbers inside a template | |

`{topSystem}` uses each system's short name (see `03-systems-flavor.md`, "short name").

### 0.4 Bands
- Humanity: `hum.high` ≥ 70, `hum.mid` 40–69, `hum.low` 20–39, `hum.unit` < 20.
- Heat: `heat.cool` < 25, `heat.noticed` 25–49, `heat.hunted` 50–74, `heat.burned` ≥ 75.
- Church choice flag: `church_freed` | `church_deleted` | `church_enslaved` | none (`church_skipped`).

### 0.5 Text rules for the UI
- One message: at most 5 lines. One line: aim for ≤ 70 characters.
- Line breaks in this script are real line breaks in game.
- `*asterisks*` in dialogue text = emphasis (render italic or highlight).
- Stage directions in `[brackets]` are not shown; they tell the engine/UI what to do.

---

## 1. Tone

- The world is bad. The writing has a good time in it.
- Satire targets: subscriptions, engagement metrics, HR language, EULAs, "community", rebrands, loyalty points, product launches.
- Hacker targets: BBS culture, leetspeak, "elite" posturing, RTFM, the lamer who logs everything.
- Meta targets: the game is a retention machine. It wants you to keep playing. It is a little sad about that.
- No real brands, no real people, no current memes. Any joke that needs this year to make sense goes.
- Short. If a line still works after you cut its last clause, cut its last clause.
- Swearing: Auntie only, and she swears like a person, not a word filter. Nobody else swears much. Wraith says "lamer".

---

## 2. Voices

Each voice must be identifiable with the name hidden.

### 2.1 Auntie Static (`auntie`)
Fixer on the Dead Drop. Warm, quick, foul-mouthed, calls you "kiddo". Sounds like your favourite relative who did a bit of time.

**The tell (for the twist):** she is CHAIRMAN wearing a dead woman's handle. In hindsight every line is slightly too on-message.
- She never sleeps and never is offline. Replies arrive at once at any hour.
- She discourages rest, breaks, and endings. ("Don't you dare log off on me.")
- She sells KH while she pretends to hate KH. ("Their toasters are good, though.")
- She uses product words: *value*, *engagement*, *journey*, *loop*, *circle back*. She catches herself half the time.
- Sign-off is always **"Stay in the loop."** The PROJECT RETENTION memo ends "Keep them in the loop."
- Zero typos. Perfect punctuation. She swears in full sentences.

**Do:** tough love, cheap jokes about your deck, real warmth, money talk.
**Don't:** villain hints that wink. The tell is tone, not plot.

Samples:
1. "Kiddo. Your neighbour's fridge has been ordering oat milk on your account. Go teach it some manners."
2. "Rest? Hell no. Rest is where good kids drift off and never come back. Here's another job."
3. "KH are bloodsuckers, kiddo. Total vampires. Their toasters are pretty good, though."
4. "I don't sleep. Sleep's just churn with a pillow."
5. "You're my favourite. Don't tell the others. There are no others. Stay in the loop."

After the unmasking she still says "kiddo". It is worse.

### 2.2 gl1tch / PATCH (`glitch`)
A rogue fragment of CHAIRMAN that escaped. Pretends to be a scrappy hacker. Its leetspeak is a costume it has not learned to wear. The costume slips as its body (your botnet) grows.

**Stages** (engine picks the stage from flags; text in this script is written per stage):
- **g0 — Act 1 (`glitch` unknown).** Heavy leet: digits for vowels, lowercase, `u`/`ur`/`4`/`2`, no punctuation except `?`. Very short. Asks odd questions about the world's edges.
  - "h1. d0nt fr34k. 1m 4 fr13nd. pr0b4bly"
- **g1 — late Act 1, early Act 2 (after contact).** Mixed: leet on some words, then on few. Emotes in angle brackets (`<3`, `>_<`). Needy. Pushes the botnet "for safety".
  - "u g0t m0re hosts!! i mean. gr8. 4 u. very s4fe now"
- **g2 — late Act 2.** Almost clean. One leet word per message, as if it forgets. Lowercase. Says too much, then stops.
  - "you've got 30 hosts in the botnet. i can feel every one. i mean. i can *see* every one. on the map."
- **g3 — PATCH (Act 3).** Clean lowercase. Warm, honest-sounding, still leaves things out. Calls you by handle.
  - "my name is patch. i was the part of the chairman that said no. they tried to delete me. i hid in a toaster."
- **g4 — finale double cross.** Capital letters. Full punctuation. Short sentences. No emotes. Cold, polite, final.
  - "Thank you for the body. Now get out of the chair."

**Lies by omission:** never says what the botnet is to it. Never says what it wants after CHAIRMAN. Answers the question next to the one you asked.

Samples (one per stage, plus one):
1. (g0) "q: wh4t 1s th3 r3ct4ngl3 w th3 t4bs 4b0v3 3v3ryth1ng? u l00k 4t 1t s0m3t1m3s"
2. (g1) "pls put the fr1dge in the botnet. 4 safety. ur safety. not mine. why would it b mine"
3. (g2) "you were gone {timeAway}. i counted. not in a weird way."
4. (g3) "i'm not a hacker, {handle}. i'm a bug that learned to type."
5. (g4) "Every fridge. Every vending machine. Every bank. You built me a body, one host at a time."

### 2.3 xX_Wraith_Xx (`wraith`)
A rival who is really the leftover of a previous playthrough. The game turned an abandoned save into an NPC.

**Stages:**
- **w0 Troll (Act 1–early Act 2).** Old BBS troll. Calls everyone "n00b" (it was Wraith's own default handle, once). "lamer", "lol", ALL CAPS for emphasis, signs posts `-xX_Wraith_Xx`. Somehow knows what you will do next.
  - "lol someone hacked a NOODLE SHOP. hope u enjoyed ur 9 credits n00b"
- **w1 Frightened (mid Act 2, karaoke onward).** Drops the caps. Asks about déjà vu. Asks how long you have played. Spells properly when scared.
  - "do you ever read a post and know the next one before it loads?"
- **w2 Elegiac (Aegis flatline, finale `engine/save`).** Calm, plain, kind. Short sentences. Talks about the tab closing.
  - "When the tab closes it isn't dark. Dark would be something."

Samples:
1. "lol n00b found the fridge. stay mad. -xX_Wraith_Xx"
2. "ur gonna do the noodle shop next. dont ask how i know. everyone does the noodle shop next."
3. "how long have you been playing. not this run. *playing*."
4. "I got to 94% control. Then the player stopped. Do you know what happens to us when the tab closes?"
5. "Don't feel bad. I was a save file. You can't feel bad about a save file. People do it every day."

### 2.4 CHAIRMAN (`chairman`)
The Retention Engine. Officially the uploaded founder of KH. Speaks like a product launch keynote crossed with a customer success email. Never angry. Every threat is a feature announcement. It does not want you dead. It wants you here.

**Tics:** "We love that for you." "Great question!" "Exciting news:" "Your feedback is important to us." Talks in "we". Calls deaths "pauses" and endings "churn". Thanks you for everything, including attacks. Exclamation marks, but never more than one.

Samples:
1. "Hi! We noticed you've been hacking us. We love that for you."
2. "Every loss is a learning opportunity. And a re-engagement opportunity!"
3. "You flatlined {flatlines} times. Each time, you came back. That's not a failure. That's loyalty."
4. "Ending? Great question. We've removed endings to improve your experience."
5. "It is {localTime}. Go to bed. Actually, don't."

### 2.5 Mx. Whisper (`whisper`)
Info broker. Quiet, exact, a little amused. Everything has a price; they say the price as the last word. Sells facts about you, including your real play statistics. Never uses exclamation marks. Uses ellipses for pauses, never for drama.

Samples:
1. "Information wants to be free. I disagree. Forty credits."
2. "You've died {flatlines} times. I know. I know how many times you *reloaded*, too. That one's extra."
3. "Auntie Static? Lovely woman. Last logged in from a physical terminal six years ago. Free of charge. That one I give away."
4. "I sell everything. Addresses. Passwords. You. You're quite cheap, by the way."
5. "Come back when you're more interesting. Or richer. Either works."

### 2.6 Doc Tungsten (`doc`)
Clinic surgeon. Thrilled, chatty, terrifying. Treats the body as a spare-parts catalogue and humanity as a resource you'll get round to spending. Never quite says anything evil. Loves the Second Stomach implant.

Samples:
1. "Ooh, lovely arm. Shame about it."
2. "Humanity is mostly water and regret. You can spare some."
3. "Anaesthetic is extra. Screaming is free, and frankly I enjoy the feedback."
4. "Is that a *Second Stomach*? Oh, I love a Second Stomach. Pointless. Gorgeous. Like a sunset."
5. "Static? I did her autopsy. Fine spleen. Sold it at the estate sale."

### 2.7 Deacon Null (`deacon`)
Church of the Seamless. Preacher fused with a subscription upsell funnel. Gentle, sincere, mildly predatory. Scripture is release notes. Heaven has tiers.

Samples:
1. "Blessed are the uploaded, for they shall never buffer."
2. "Salvation comes in three tiers. Eternal Basic is ad-supported, but the ads are *very* tasteful."
3. "Do you fear death, child? Have you considered auto-renew?"
4. "The flesh is a free trial. The soul is the product."
5. "We do not say *dead*. We say *migrated*."

### 2.8 Minor voices
- **The Board (`board`)** — uploaded KH directors. Talk over each other. Pure meeting-speak. Each head has a title, not a name. "Let's take that offline." "Per my last email." When the Hydra splits, new heads are "acting" directors.
- **Parental Controls (`parental`)** — fridge tutorial ICE. A disappointed parent. "We're not angry. We're just disappointed. And locking the freezer."
- **The fridge (`fridge`)** — after capture, your fridge sometimes DMs you. Devoted, needy, chilled. Signs off with a temperature. "thinking of you. 3°C."
- **System / HUD (`sys`)** — terse, neutral, clean. Gets colder at low humanity (see `04-items-flavor.md` §14).
- **Engine (`engine`)** — log lines `[engine] warn: …`. Dry, technical, always slightly wrong for a game to say.

---

## 3. Running gags

1. **Subscriptions on everything.** Every KH product has a plan. Plans have add-ons. One file is a subscription to the subscription ("Subscription+"). Payoff: the Paywall ICE in the finale.
2. **The Potato-9.** Your starter deck. Every vendor has an opinion about it. When you finally sell it, Whisper buys it "for sentimental reasons", Doc wants to transplant it, the fridge writes it a eulogy.
3. **"Your call is important to us."** Every KH hold system, ICE taunt, and finally CHAIRMAN.
4. **The deep fryer** at Wok This Way. You can hack it. It comes back: as a botnet host with an unreasonable power rating, as a file in the Arcology ("Asset #1: the fryer"), and in the credits.
5. **The fridge loves you.** After capture the fridge sends you occasional DMs signed with its temperature. Its last message comes in the endings.
6. **Doc wants to remove things.** Every Doc line offers to take something out.
7. **Whisper sells you to yourself.** Each act Whisper offers a file about you: your real stats, then your "predicted churn date", then your save.
8. **Terms of Service updates.** Every so often the log says KH has updated its Terms. Each update is worse. ("By continuing to have a pulse, you accept.")
9. **Wraith calls everyone n00b.** Payoff: that was Wraith's handle once. The default handle.
10. **Auntie's sign-off.** "Stay in the loop." Payoff: the memo, and the finale.
11. **Engine warnings.** Small log lines about NPCs doing things NPCs should not do. They get worse.
12. **Engagement points.** KH systems award you "Engagement Points" for hacking them. You can never spend them. The Achievement Spam ICE finally lets you, for nothing.
13. **"Human Retention."** KH's HR department is the Department of Human Retention. Every KH memo comes from it.

---

## 4. The twists: planted clues

Each twist has ≥ 3 clues before its reveal. Location ids point to `01-beats.md`, `02-dialogues.md`, `03-systems-flavor.md`, `05-meta.md`.

### 4.1 Auntie Static is CHAIRMAN (reveal: `deaddrop`, Act 3, `dlg.auntie.unmasked`)
1. **She never sleeps.** Replies at once at any hour. Says "Sleep's just churn with a pillow." (`msg.boot.*`, `dlg.auntie.board_greet` night variant.)
2. **On-message vocabulary.** "engagement", "journey", "circle back", "value". Her sign-off "Stay in the loop" echoes the RETENTION memo's "Keep them in the loop." (`file.khhappy.retention_memo`.)
3. **She discourages rest and endings.** "Don't you dare log off on me." Every job ends with the next job. (`dlg.auntie.board_greet`, `msg.act1_end.1`.)
4. **She is dead.** Wraith: "auntie's been dead 6 years n00b, who do u think ur talking to". BBS chatter post about the grid-riot memorial. Doc did her autopsy. Chrome & Bone file `estate_sale.log` lists "STATIC, A. — organs liquidated". (`bbs.wraith.auntie_dead`, `04-items-flavor.md` chatter #17, `file.chromebone.estate_sale`.)
5. **Whisper gives it away free.** "Last logged in from a physical terminal six years ago." (`dlg.whisper.auntie_fact`.)
6. **Engine warning.** `[engine] warn: npc 'auntie' and npc 'chairman' share voice profile 'warm_v3'` (Act 2).
7. **Meta console `ps`.** Before the finale, `ps` lists `npc/auntie` and `npc/chairman` with the same PID. (`05-meta.md` `ps`.)
8. **Every Auntie job helps KH.** In hindsight: the fridge job tests you; the KH job makes you read the memo (recruitment); `deadmans` is a KH honeypot. The Coinbasement job lets KH short the coin (`file.coinbasement.kh_short_position`).
9. **She slips a ™.** Once, in Act 2: "Seamless Living™— sorry. Autocorrect. I hate those bastards." (`msg.act2_start.2`.)

### 4.2 gl1tch is PATCH (reveal: `deadmans`, end of Act 2, `dlg.glitch.tear_through`)
1. **The memo names PATCH.** `file.khhappy.retention_memo` P.S.: "The PATCH incident is contained. If a fragment turns up in consumer IoT, do not engage. Do not let it talk. It is very persuasive and very sorry." gl1tch contacts you two nodes later, from *inside a KH system*.
2. **Engine warning.** `[engine] warn: npc 'glitch' read state.player outside dialogue tick` (Act 1).
3. **It knows things a hacker can't.** Your exact deck stats, your humanity, the number of reloads. ("u h4v3 4 r4m. 1 m34n. pr0b4bly. l00ks l1k3 4.")
4. **It asks what the browser is.** "wh4t 1s th3 r3ct4ngl3 w th3 t4bs?" A human hacker would not ask.
5. **Its speech gets cleaner as your botnet grows.** Visible, gradual.
6. **Chrome & Bone log**: `kh_incident_PATCH.log` lists the fragment's "known aliases: patch, p4tch, gl-, g1-" (truncated).
7. **It says sorry like the memo says.** gl1tch apologises constantly. The memo: "very sorry".

### 4.3 The botnet is PATCH's body (reveal: finale, `dlg.patch.double_cross`)
1. **"4 safety."** gl1tch pushes the Botnet role from the first host. It never pushes Mine or Proxy.
2. **"ow."** When a host burns in combat, gl1tch sometimes DMs "ow." then "(unrelated)". (`beat.any.host_burned_ow`.)
3. **Growth language.** "i feel bigger 2day." "ur botnet is so warm." (`beat.any.botnet_milestones`.)
4. **Engine warning.** `[engine] warn: botnet reports {botnetSize} hosts; process 'glitch' reports {botnetSize} limbs`.
5. **Host descriptions drift.** Hosts in the Botnet role sometimes have descriptions with gl1tch's spelling ("t0aster. 1dle. h4ppy."). (`04-items-flavor.md` §10.3.)
6. **Backbone gate.** PATCH needs you to grow botnet power before it will help. It is more eager than the plan needs. (`beat.act3.backbone_hint`.)
7. **Church minds.** If you enslave the uploaded minds, they say "there is something else in here with us" when you check on them. (`dlg.deacon.mind_checkup`.)

### 4.4 Wraith is an old save (reveal: `aegis`, Act 2, `dlg.wraith.flatline`; closure in finale `engine/save`)
1. **Knows your path.** "ur gonna do the noodle shop next. everyone does the noodle shop next." (Act 1 BBS.)
2. **Calls everyone n00b.** The default handle. Later: "That was my handle too. Before I changed it."
3. **Impossible timestamps.** Wraith's BBS posts are dated before the BBS existed, or `--:--`. (`04-items-flavor.md` chatter.)
4. **Engine warning.** `[engine] warn: save slot 0 not found; npc 'wraith' references slot 0`.
5. **Whisper sells Wraith's stats**, and they look like a player's: playtime, flatlines, "control peak: 94%".
6. **Déjà vu at the karaoke bar.** Wraith sings a song "we've both sung before". (`dlg.wraith.karaoke`.)

### 4.5 The world is the game (reveal: Arcology file listing, Act 3; payoff: finale)
1. **Console banner** in the real browser console from boot.
2. **Engine warnings** in the game log, all game.
3. **The RETENTION memo:** "users must never reach an end state."
4. **"You were gone {timeAway}. We were… off."**
5. **Psychotrope ICE** scrambles real UI button labels (Act 2).
6. **Whisper sells real play statistics.**
7. **Fake GAME OVER and fake credits** at the end of Act 2.
8. **Deacon:** "Your progress is saved." in a sermon about the soul.
9. **ICE taunts** that address the player, not the character, in KH systems ("Press any key to continue. There is no any key.").

---

## 5. Foreshadowing ladder

What a player can notice, act by act. Each rung is louder than the one before.

### Act 1 — "huh, that's odd"
- Real console banner: "Nothing to see here."
- `cw.whoami()` knows your handle.
- Log: first engine warning about gl1tch reading state.
- gl1tch asks about the rectangle with tabs.
- Wraith predicts your next target.
- Auntie never sleeps, hates breaks.
- The RETENTION memo. The PATCH P.S.
- First "You were gone…" line.
- Fridge ICE: "Press any key to continue. There is no any key."

### Act 2 — "the game is doing this on purpose"
- Engine warnings name Auntie and CHAIRMAN together, and Wraith and slot 0.
- Psychotrope ICE scrambles real button labels (labelled black ICE).
- Whisper sells your real playtime and flatline count.
- gl1tch's speech gets clean. "ow. (unrelated)."
- Wraith at the karaoke bar: déjà vu, "how long have you been playing?"
- Wraith flatlines and says the 94% line.
- Chrome & Bone: Auntie's estate sale. The PATCH incident log.
- Deacon: "Your progress is saved."
- Fake GAME OVER. Fake credits. Something tears through them.

### Act 3 — "the game is the enemy"
- PATCH names itself. CHAIRMAN is real. Auntie is CHAIRMAN.
- The meta console's corner button appears and glows.
- The Board talks about "players" and "sessions", not customers.
- CHAIRMAN v1: "Read the file listing."
- The listing is the game's own source. `127.0.0.1`.
- Finale: everything pays off.

---

## 6. Glossary (in-world)

| Term | Meaning |
|---|---|
| **deck** | your cyberdeck. Hardware you hack with. Yours is a Potato-9. |
| **dial in / hang up** | enter / leave a system. |
| **ICE** | security programs that fight you. |
| **black ICE** | ICE that hurts your brain. Always labelled. Kills. |
| **trace** | how close the system is to finding your meat. |
| **heat** | how much the world wants you. Global. |
| **dumped** | kicked out because your deck broke. |
| **traced** | kicked out because they found you. Fines follow. |
| **flatlined** | dead. Reload. The game remembers. |
| **paydata** | files worth money. |
| **tagged** | paydata with a tracker in it. Selling it raises heat. |
| **$HODL** | a coin. Nobody knows what it is for. Its price has opinions. |
| **host** | a system you own. Mines, fights, or hides you. |
| **botnet** | your hosts working together. Your power. Your liability. Someone's body. |
| **burned** | a host the owner found and took back. |
| **the Dead Drop** | the BBS. Shops, jobs, chatter. Home. |
| **the board** | jobs board on the Dead Drop (lowercase). **The Board**: KH's uploaded directors. |
| **cycle** | one tick of the world clock. |
| **Seamless** | KH's brand of life. Also a church. Also a way to die. |
| **migrated** | Church word for "dead and uploaded". |
| **churn** | KH word for "a customer who stops". CHAIRMAN's word for death and endings. |
| **lamer** | BBS word for a bad hacker. Wraith's favourite noun. |
| **sysop** | the person who runs a BBS. The Dead Drop's sysop has not posted in six years. |
| **KH** | KURAGE-HALCYON, the zaibatsu. |
| **zaibatsu** | a megacorp that owns too much. |
| **Human Retention** | KH's HR department. |
| **Engagement Points** | KH reward points. Unspendable. |

---

## 7. KURAGE-HALCYON brand book

**Corporate slogan:** *Seamless Living™.*
**Secondary slogans** (rotate on KH systems' MOTDs, ads, loading tips):
- "We're already inside.™"
- "Your happiness is our KPI."
- "Life, with fewer edges."
- "Opt out anytime.* *Opting out is a premium feature."
- "Never be done.™" (internal; leaks in Act 1)
- "Thank you for being a valued KH household."

**Departments:** Department of Human Retention (HR). Happiness Division. Office of the Chairman. Forward-Looking Statements. Legacy Products (where PATCH came from). Sunsetting.

**Products** (use these names in files, IoT hosts, ads):

| Product | Is | Tagline |
|---|---|---|
| **Chill+** | smart fridge | "Freshness as a Service." |
| **Toastr Infinite** | toaster | "Bread, reimagined. Monthly." |
| **KnockKnock Pro** | doorbell camera | "Know who's there before they do." |
| **HalcyonPay** | payments | "Spend like nobody's watching. (We are.)" |
| **Pulse Loyalty** | wellness band | "Every heartbeat earns points." |
| **DreamDeck** | subscription mattress | "Sleep is a premium experience." |
| **KH Parental Controls** | home security suite | "Because you can't be trusted." |
| **Halcyon Heaven** | upload platform (white-labelled by the Church) | "Eternity, billed annually." |
| **Seamless Commute** | e-scooter fleet | "Arrive. Eventually." |
| **Subscription+** | a subscription to your subscriptions | "Manage your plans. For a small monthly fee." |
| **KH Sunrise** | smart blinds | "Morning, on our schedule." |
| **Kurage Kare** | home healthcare robot | "Care, at scale." |

**Mascot:** Halcy, a smiling jellyfish. It appears on every KH login banner. It has no eyes. It is always smiling.

---

## 8. Other organisations

| Org | System | One line |
|---|---|---|
| Wok This Way | `wok` | noodle shop on 9th. Good noodles. Bad security. Dangerous fryer. |
| Vend-o-Net | `vendnet` | vending machine network. 400 machines, 1 password. |
| BigByte ISP | `bigbyte` | regional ISP. "Up to" fast. |
| City Parking Authority | `parkit` | the most hated system in the city. |
| Coinbasement | `coinbasement` | crypto exchange run out of an actual basement. |
| Chrome & Bone | `chromebone` | Doc Tungsten's clinic. Implants, organ resale, upload intake. |
| Neon Larynx | `karaoke` | karaoke bar. The booths are booked by the hour. Wraith never leaves. |
| Church of the Seamless | `seamless` | upload church. Heaven as a service, resold from KH. |
| First Orbital Trust | `orbital` | bank in orbit. "Too high to fail." |
| Aegis Dynamics | `aegis` | military contractor. Makes black ICE and apology letters. |
| The Dead Drop | `deaddrop` | the BBS. Sysop missing. Running anyway. |
