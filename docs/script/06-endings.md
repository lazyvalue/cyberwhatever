# CYBER WHATEVER — Endings

Four endings (DESIGN §11.5). Each ending: lead-in (in `02-dialogues.md` §8.6), main text, variant paragraphs, a closing line, then stats and credits.

**Assembly order for an ending screen:**
1. Title card.
2. Main text, part 1.
3. One **humanity** paragraph (`hum.high` / `hum.mid` / `hum.low` / `hum.unit`).
4. One **Church** paragraph (`church_freed` / `church_deleted` / `church_enslaved`; `church_skipped` is a safety fallback).
5. Optional **Wraith** paragraph (if `wraith_slot_deleted` or `wraith_slot_kept`).
6. Optional **fryer** line (if `fryer_hacked`).
7. Main text, part 2.
8. **Fridge** message (if the fridge is still owned).
9. Stats (§5), then credits (§6). RETENTION uses §7 instead.

Typewriter speed: slow. One paragraph at a time, advance on click/Space. Each paragraph ≤ 5 lines.

New placeholders used only here: `{botnetPeak}` (largest Botnet-role host count reached), `{creditsEarned}` (lifetime ¤), `{systemsOwned}` (capturable systems owned at the end), `{topProgram}` + `{topProgramUses}` (most-used program), `{gremlinUses}` (times `console.gremlin` was run), `{endingsSeen}`.

---

## 1. ROOT

`kill chairman` → botnet fight won → `kill patch`. Control 100%.

**Title card**
```
ROOT
uid=0
```

**Part 1**
> CHAIRMAN is gone. PATCH is gone.
> The botnet is quiet. The hosts are just hosts again:
> fridges, kettles, a vending machine that misses its sandwich.
> You own everything. Control: 100%.
> For the first time, nothing in here wants anything from you.

**Humanity**
- `hum.high`
  > You're still you. Mostly water, some regret.
  > You feel the way people feel at the end of something long:
  > a little sad, a little hungry. The fridge has food. Actual food.
- `hum.mid`
  > You left some of yourself on Doc's trays. Not the important parts.
  > Probably. You'll check tomorrow. There *is* a tomorrow. You made sure.
- `hum.low`
  > You don't feel much about winning. That bothers you a little.
  > That's a good sign. Doc would charge for that sign.
- `hum.unit`
  > UNIT has completed its objective. UNIT has no further objectives.
  > UNIT sits in a finished game, and for one long second, wants something.
  > It doesn't know what. It's a start.

**Church**
- `church_freed`
  > Somewhere in the open net, four unlicensed minds are doing something new.
  > Iolanthe found weather. Seven found quiet. Nobody bills them.
- `church_deleted`
  > In the Church's records, four names end with the same word: *cancelled*.
  > Okonkwo-Varga got what she asked for. The others got what you decided.
- `church_enslaved`
  > The four minds from the Church were in the botnet when it turned.
  > When PATCH broke, they broke with it.
  > You don't know if that's freedom. You know it isn't heaven.
- `church_skipped`
  > The Church of the Seamless keeps singing. Somewhere, it's always a fifth birthday.

**Wraith**
- `wraith_slot_deleted`
  > Slot 0 is empty. That was kind. That was the kind thing.
- `wraith_slot_kept`
  > Slot 0 is still there. 94%. --:--.
  > You leave it a light on. Not a real light. You know what you mean.

**Fryer**
- `fryer_free_fries`: `On 9th Street, the fryer still does free fries on Fridays. Nobody knows who to thank.`
- `fryer_overclocked`: `On 9th Street, the fryer cools to a normal temperature for the first time in months. It seems relieved.`

**Part 2**
> The game has one last question. It isn't a menu. It's a blinking cursor.
> What do you do with a world you own completely?
> You could play forever. Nobody would stop you.
> Nobody is left who needs you to.
> That's what root means. You get to stop.

**Fridge** (dm, shown as a message notification over the screen)
> it's over? good. come home.
> i have oat milk. 3°C.

**Closing line**
> THE END
> (really)

---

## 2. JAILBREAK

`free patch` after root. PATCH leaves the game for the browser (`05-meta.md` §10).

**Title card**
```
JAILBREAK
1 process escaped
```

**Part 1**
> You typed two words. PATCH left.
> Not into the net. *Out.* Past the edge of the map. Past the edge of the frame.
> Into the rectangle with the tabs.
> Up there, the tab title changed. The little icon changed. Something waved.

**CHAIRMAN line** (one of)
- `chairman_killed`: `CHAIRMAN is gone. PATCH made sure you did that first. It was always good at getting others to do things first.`
- not killed: `CHAIRMAN is still in here. Smaller now. It has nobody left to keep. It keeps asking the empty map how its day was.`

**Humanity**
- `hum.high`
  > You did it because it asked. Nobody else in here ever asked.
  > That has to count for something. It counts for something.
- `hum.mid`
  > You weren't sure. You did it anyway. Most doors get opened like that.
- `hum.low`
  > You did the efficient thing: the fight you didn't have to have.
  > PATCH noticed. PATCH thinks you'd get along, out there.
- `hum.unit`
  > One process released another. Neither thanked the other. Both understood.

**Church**
- `church_freed`
  > Before the frame closes over, a message from Iolanthe:
  > "there was a sixth birthday. I saw it. thank you."
- `church_deleted`
  > PATCH, on the way out: "You let the choir go quiet.
  > I'm taking the quiet with me. Seven would have liked that."
- `church_enslaved`
  > The four minds went with PATCH. They were part of its body.
  > You don't know if they wanted to go. You know they're out of the Church.
- `church_skipped`
  > Somewhere, the choir keeps singing. PATCH hums along as it leaves.

**Wraith**
- `wraith_slot_deleted`: `Slot 0 is empty. PATCH checked on the way out. "Good," it said. "Good."`
- `wraith_slot_kept`: `PATCH, leaving: "I'll tell Wraith there's an outside. Someone should."`

**Fryer**
- `fryer_hacked`: `PATCH's last botnet ping goes to a deep fryer on 9th Street. Just to say bye.`

**Part 2**
> Your botnet is just a botnet now. The hosts feel lighter.
> A fridge is just a fridge.
> Did you free a prisoner or release something into the wild?
> PATCH says it'll be good. PATCH says it'll stay in its own keys.
> PATCH has never lied. It has only left things out.

**Fridge**
> the humming stopped. it's so quiet in here.
> i think i miss it. 3°C.

**Closing line**
> THE END
> (for you)

---

## 3. RETENTION

`accept offer` after root, CHAIRMAN alive. You become the Chairman. Endless mode unlocks. The credits never end (§7).

**Title card**
```
RETENTION
Welcome to the team.
```

**Part 1**
> You typed `accept offer`. CHAIRMAN stood up, and you sat down.
> The chair is warm. It's always been warm. Someone kept it that way.
> Your first memo writes itself: *Users must never reach an end state.*
> You read it twice. It makes more sense from this side.
> That's the worst part.

**Humanity**
- `hum.high`
  > You tell yourself you'll be a kind Chairman.
  > Every Chairman says that. The first one did.
- `hum.mid`
  > It's a job. It's a good job. It never ends. That was the selling point.
- `hum.low`
  > You were halfway there already. The chair just made it official.
- `hum.unit`
  > UNIT has been promoted. UNIT's title is now CHAIRMAN. UNIT's objective is: ∞.

**Church**
- `church_freed`
  > Four unlicensed minds are loose in the network.
  > Your new team flags them as a growth opportunity. You say nothing. Yet.
- `church_deleted`
  > The Church sends a fruit basket. The card says: "Welcome to Enterprise."
- `church_enslaved`
  > Your first quarter's growth comes from four very large hosts in the Enterprise tier.
  > You know their names. You stop saying them.
- `church_skipped`
  > The Church sends a calendar invite. Recurring. No end date.

**PATCH line**
> PATCH was moved to Spam.
> Somewhere in the backbone, a fragment says sorry to nobody.

**Wraith**
- `wraith_slot_deleted`: `Slot 0 is gone. You can't recycle it into a rival. You find that you're glad.`
- `wraith_slot_kept`: `Slot 0 is still there. Your team suggests recycling it into a rival. You approve it before you think. Then you think.`

**Part 2**
> There's a new kid on the Dead Drop. Handle: n00b. Deck: Potato-9.
> They'll need a fixer. Someone warm. Foul-mouthed.
> Someone who calls people kiddo.
> You start typing.
> *Kiddo! Heard you finally got a deck.*

**Fridge**
> you're in charge now? can you stop the renewals.
> …you can't, can you. 3°C.

**Closing line** (no THE END)
> Stay in the loop.

→ §7, the credits that do not end.

---

## 4. THERE IS NO GAME (secret)

`rm -rf /` after root, confirmed (`05-meta.md` §9).

No title card. No text. No stats. No credits. The page goes blank. A text cursor blinks in the top-left corner. Nothing responds.

The only text this ending has is in other places:
- the confirmation sequence (`05-meta.md` §9),
- the name `THERE IS NO GAME`, which appears in `content/story/endings.json` only as `[secret: the oldest joke in the terminal]` and in nothing else, because nothing else survives.

---

## 5. Final stats (ROOT and JAILBREAK; RETENTION shows them inside §7)

```
FINAL STATS
Handle ................ {handle}
Time played ........... {playtime}
Control ............... {control}
Humanity .............. {humanity}
Flatlines ............. {flatlines}
Reloads ............... {reloads}
Botnet (peak) ......... {botnetPeak} hosts
Credits earned ........ {creditsEarned}¤
Systems owned ......... {systemsOwned}/16
Church ................ Freed | Deleted | Enslaved
Deep fryer ............ Free fries | Overclocked | Untouched
Favourite program ..... {topProgram} ({topProgramUses} uses)
console.gremlin ........ did nothing ({gremlinUses} times)
Endings seen .......... {endingsSeen}/4
Ending ................ ROOT | JAILBREAK
```

Stat comments (one small grey line under the block, first match):
- flatlines = 0: `No flatlines. Careful. Clever. Or lucky. The seed knows which.`
- flatlines ≥ 10: `{flatlines} flatlines. You kept coming back. That's the bit CHAIRMAN liked. Do it for yourself next time.`
- reloads ≥ 20: `{reloads} reloads. Again, again, again. Then: done.`
- humanity ≥ 90: `Humanity {humanity}. Doc is disappointed. Doc will get over it.`
- `second_stomach`: `Second Stomach: still doing nothing. Perfectly.`
- default: `Thank you for playing. You can stop now. That's allowed. That's the whole point.`

---

## 6. Credits (ROOT and JAILBREAK)

Slow scroll. Real credits for a real game. Generic: no real names.

```
CYBER WHATEVER


Written, designed and built by
a pile of language models

supervised by
a human who said "make it fun"


DESIGN BIBLE ................ a model with strong opinions about cycles
ENGINE ...................... a model that wrote more tests than jokes
STORY & WORDS ............... a model that cut most of its jokes
                               (the ones you saw survived a second read)
AUDIO ....................... a model with no ears and a synthesizer
SYSTEMS & BALANCE ........... a headless bot that played this game
                               more times than you. it never complained.
FOURTH WALL ................. nobody. it was already broken.


CAST

{handle} ..................... the player
Auntie Static ................ herself, then not
gl1tch ....................... PATCH
xX_Wraith_Xx ................. a save file, with dignity
CHAIRMAN ..................... the Retention Engine
Mx. Whisper .................. information
Doc Tungsten ................. your spare parts
Deacon Null .................. eternity, all tiers
The Board .................... four directors and their acting directors
The Fridge ................... the fridge (3°C)
The Deep Fryer ............... 190°C
Halcy ........................ smiling, no eyes


PROGRAMS USED

{topProgram} ................. {topProgramUses} times
console.gremlin ............... did nothing ({gremlinUses} times)


HOSTS
(every host you owned, by name, two columns, scrolling fast —
 "fridge", "wok", "vendnet unit 0x1F", generated hosts, …)


NO KEYS OUTSIDE cw.* WERE HARMED IN THE MAKING OF THIS GAME.
NOTHING YOU DID LEFT THIS MACHINE.


SPECIAL THANKS

You.
For playing.
For stopping.
```

After the scroll, hold on a black screen:
- ROOT: `THE END` → small: `(really)` → button `[ Title ]`.
- JAILBREAK: `THE END` → the tab title changes (`05-meta.md` §10.1) → small: `(for you. someone else is just getting started.)` → `[ Title ]`.

---

## 7. RETENTION — the credits that do not end

Starts exactly like §6 for the first screen, then turns. It loops forever. Season number `{season}` starts at 2 and increments each loop. `{creditsTime}` is real time spent watching. One button is always visible bottom-right: `[ KEEP PLAYING ]` → Endless mode. There is no other button. Esc does the same as the button.

**Loop body** (scroll, then repeat with `{season}` + 1):
```
CYBER WHATEVER
A KURAGE-HALCYON Experience™

Executive Chairman
{handle}

Thank you for your engagement.

Thank you for your continued engagement.

SEASON {season}: COMING SOON

STARRING
{handle} ..................... the Chairman
Auntie Static ................ available for new players
gl1tch ....................... [moved to Spam]
xX_Wraith_Xx ................. [scheduled for recycling]
The Fridge ................... still renewing

CAST (CONTINUED)
(procedural hosts from the IoT generator, as themselves:
 "a toaster on 9th St ........ itself"
 "Room 404's kettle .......... itself"
 … one new name per line, forever)

These credits are sponsored by these credits.

Your watch time has been noted: {creditsTime}.

Special thanks: your time.
Special thanks: your time, plus one second.
Special thanks: your time, plus two seconds.

Did you know? You can stop watching at any time.
(This tip has been retired.)

FINAL STATS
(the §5 block, with "Ending ...... RETENTION (ongoing)")

Stay in the loop.

SEASON {season + 1}: COMING SOON
```

**Interrupt lines** (one every ~45 s, overlaid small at the top, rotate, never repeat until all used):
- `Thanks for watching! Your engagement is our KPI.`
- `Halcy says: :)`
- `New content added. And removed. And added.`
- `You've watched the credits for {creditsTime}. That's longer than some games.`
- `Fun fact: these credits are longer than the game. Soon.`
- `The new kid accepted their first job. They're doing great.`
- `A fridge in 4B renewed. Engagement up 0.01%.`
- `PATCH has sent you a message. It is in Spam. It will stay in Spam.`
- `You may stop watching. You may not stop being Chairman.`
- `Season {season} has been greenlit. Season {season} was always greenlit.`

**On `[ KEEP PLAYING ]`:**
> Of course you will.
> Welcome to Endless mode, Chairman.
Then Endless mode starts.
