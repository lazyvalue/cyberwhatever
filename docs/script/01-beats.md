# CYBER WHATEVER — Story Beats

Every beat in play order. Format per beat:

- **Trigger** — the state or event that fires it, in plain words. Beats fire once unless marked *repeatable*.
- **Effects** — what changes. Addresses, objectives, flags, items, state.
- **Messages** — full text. `id · channel · speaker`. Delays are in Hub visits or cycles.

Conventions are in `00-bible.md` §0. Dialogue trees named here (`dlg.*`) are in `02-dialogues.md`. Files (`file.*`) are in `03-systems-flavor.md`. Fourth-wall strings are in `05-meta.md`.

---

## A. Objective chain

The player always has exactly one active **main** objective. Side objectives stack.

### A.1 Main

| # | id | Text shown | Added by | Completed by |
|---|---|---|---|---|
| 1 | `obj.main.fridge` | Hack your neighbour's fridge. `fridge.local` | `beat.act1.boot` | capture `fridge.core` |
| 2 | `obj.main.assign_role` | Give the fridge a job. (Botnet tab) | `beat.act1.fridge_done` | any host role set to non-Idle |
| 3 | `obj.main.wok` | Take the till at Wok This Way. `wokthisway.biz` | `beat.act1.first_role` | capture `wok.core` |
| 4 | `obj.main.bigbyte` | Get a router. Crack BigByte ISP. `bigbyte-isp.net` | `beat.act1.wok_done` | capture `bigbyte.core` |
| 5 | `obj.main.rep3` | Reach Rep 3. Take jobs from the board. | `beat.act1.bigbyte_done` (only if Rep < 3) | Rep ≥ 3 |
| 6 | `obj.main.khhappy` | Steal the Q3 Happiness Review from KH. `happiness.kurage-halcyon.com` | `beat.act1.kh_offer` | hang up holding `file.khhappy.q3_happiness` |
| 7 | `obj.main.coinbasement` | Own the exchange. `coinbasement.exchange` | `beat.act2.start` | capture `coinbasement.core` |
| 8 | `obj.main.chromebone` | Break into Chrome & Bone's backend. `chromeandbone.clinic` | `beat.act2.coinbasement_done` | capture `chromebone.core` |
| 9 | `obj.main.seamless` | Find out what heaven costs. `seamless.church` | `beat.act2.chromebone_done` | `dlg.seamless.choir` choice made |
| 10 | `obj.main.aegis` | Beat Wraith to the milspec icebreaker. `aegis-dynamics.mil` | `beat.act2.aegis_offer` | loot `prog.milspec_icebreaker` |
| 11 | `obj.main.deadmans` | Auntie's retirement job. `deadmans.switch` | `dlg.auntie.deadmans_offer` | `beat.act2.tear_through` |
| 12 | `obj.main.deaddrop` | Crack the Dead Drop. Find Auntie. `deaddrop.bbs` | `beat.act3.start` | `dlg.auntie.unmasked` ends |
| 13 | `obj.main.botnet_power` | Grow botnet power to {x}. (now: {n}) | `beat.act3.deaddrop_done` | botnet power ≥ threshold (engine constant, suggest 30) |
| 14 | `obj.main.khbackbone` | DDoS the KH backbone open. `backbone.kurage-halcyon.net` | `beat.act3.deaddrop_done` | capture `khbackbone.core` |
| 15 | `obj.main.arcology` | Take the Arcology. End CHAIRMAN. `arcology.kurage-halcyon.com` | `beat.act3.backbone_done` | `beat.act3.chairman_v1_down` |
| 16 | `obj.main.localhost` | Dial into `127.0.0.1`. | `beat.act3.listing` | dial in to `localhost` |
| 17 | `obj.main.fragments` | Find the four root key fragments. ({n}/4) | `beat.finale.patch_f12` | all four fragments seen |
| 18 | `obj.main.sudo` | `sudo` the key. | `beat.finale.patch_f12` (shown greyed until 17 done) | root granted |
| 19 | `obj.main.decide` | Decide. | `beat.finale.double_cross` | an ending fires |

Objectives 13 and 14 are shown together. 13 completes first; then only 14 shows.

### A.2 Side

| id | Text shown | Added by | Completed by |
|---|---|---|---|
| `obj.side.fryer` | The deep fryer at Wok This Way has opinions. | `beat.act1.wok_done` | `Use` on `wok.fryer` |
| `obj.side.vendnet` | 400 vending machines. One password. `vend-o-net.biz` | `beat.act1.wok_done` | capture `vendnet.core` |
| `obj.side.parkit` | Erase your tickets. Find dirt. `parkit.city.gov` | `beat.act1.first_netscan` | loot `file.parkit.councillor_dirt` |
| `obj.side.karaoke` | Booth 4. Wraith wants a word. `neonlarynx.bar` | `beat.act2.karaoke_invite` | `dlg.wraith.karaoke` ends |
| `obj.side.orbital` | Two keys. One vault. One bank in orbit. `firstorbital.trust` | `beat.act2.orbital_unlocked` | open `orbital.vault` |
| `obj.side.recover_funds` | Get your frozen credits back. | `beat.act2.tear_through` | loot `file.orbital.escrow` or `file.deaddrop.escrow_ledger` |
| `obj.side.whisper_self` | Mx. Whisper has a file on you. | `beat.act2.start` | buy `file.whisper.you_v2` |
| `obj.side.wraith_slot` | Find what's left of Wraith. | `beat.finale.enter` (only if `wraith_flatlined`) | `dlg.wraith.slot0` ends |

---

## B. Act 1 — Script Kiddie

### `beat.act1.boot`
- **Trigger:** new game, after the handle is set.
- **Effects:** set act 1. Reveal `deaddrop.bbs` (address book: "Home. Shops, jobs, chatter. Do not hack the hand that feeds you."; dial-in locked). Reveal `fridge.local`. Add `obj.main.fridge`. Set `game_started`. Print the console banner (`05-meta.md` §1).
- **Messages:**
  - `msg.boot.1` · log · engine: `[engine] boot ok. 7 npcs loaded. 1 player loaded.`
  - `msg.boot.2` · log · engine: `[engine] warn: expected 0 players. continuing anyway.`
  - `msg.boot.3` · dm · auntie:
    > Kiddo! Heard you finally got a deck.
    > Heard it's a Potato-9. My condolences.
    > I'm Auntie Static. I run jobs off the Dead Drop.
    > You work, I pay, nobody cries. Usually.
  - `msg.boot.4` · dm · auntie:
    > First one's practice. Your neighbour's fridge. fridge.local.
    > It's been ordering oat milk on your account.
    > Go teach it some manners. Stay in the loop.

### `beat.act1.tut_jackin`
- **Trigger:** first dial-in, any system.
- **Messages:** `msg.tut_jackin.1` · comms · auntie:
  > You're in. The bright blob is the gateway.
  > Click a node next to it. Probe before you poke.

### `beat.act1.tut_probe`
- **Trigger:** first probe.
- **Messages:** `msg.tut_probe.1` · comms · auntie:
  > See? Now you know what's in there.
  > Knowing costs a cycle. Not knowing costs a deck.

### `beat.act1.tut_combat`
- **Trigger:** first combat starts.
- **Messages:** `msg.tut_combat.1` · comms · auntie:
  > That's ICE. The icon over its head is its next move.
  > Crack eats crypt shells. Spike eats walls. Read it, then hit it.

### `beat.act1.tut_adapt`
- **Trigger:** first time any program reaches 2 signature stacks.
- **Messages:** `msg.tut_adapt.1` · comms · auntie:
  > It's learning your moves. Look at the little number.
  > Same trick twice is a pattern. Three times is a subscription.

### `beat.act1.tut_flow`
- **Trigger:** first Flow.
- **Messages:** `msg.tut_flow.1` · comms · auntie:
  > Three kinds of program in one turn. That's Flow.
  > Free cycle next turn, less trace. Do that every turn and I'll cry.

### `beat.act1.tut_sneak`
- **Trigger:** first node where Sneak shows ≥ 50%.
- **Messages:** `msg.tut_sneak.1` · comms · auntie:
  > You can tiptoe past this one. Loot it, skip the fight.
  > Can't own what you tiptoe past, though. Life's like that.

### `beat.act1.tut_trace`
- **Trigger:** trace reaches 33 for the first time.
- **Messages:** `msg.tut_trace.1` · comms · auntie:
  > Trace is a third full. The ICE just got tougher.
  > If that bar fills, they find your actual apartment.
  > Hang up is free while you're not fighting. Remember that.

### `beat.act1.tut_core`
- **Trigger:** first Core node revealed.
- **Messages:** `msg.tut_core.1` · comms · auntie:
  > That's the core. Capture it and the whole box is yours.
  > Everything you own is a host. Hosts are power.

### `beat.act1.fridge_done`
- **Trigger:** capture `fridge.core`.
- **Effects:** complete `obj.main.fridge`. Add host `fridge` (Idle). Add `obj.main.assign_role`. Set `fridge_done`. Rep XP per engine.
- **Messages:**
  - `msg.fridge_done.1` · dm · auntie:
    > Look at you. You own a fridge.
    > Most people need a mortgage for that.
    > Owned boxes are hosts. Hosts work for you: mine, fight, hide you.
    > Open the Botnet tab and give the fridge a job.
  - `msg.fridge_done.2` · dm · fridge:
    > hello. i am yours now.
    > i have cancelled the oat milk.
    > 3°C.
  - `msg.fridge_done.3` · dm · glitch (shown as `gl1tch`, unknown contact), next Hub visit:
    > n1c3 fr1dg3
  - `msg.fridge_done.4` · log · engine, same Hub visit: `[engine] warn: npc 'glitch' read state.player outside dialogue tick`

### `beat.act1.first_role`
- **Trigger:** first time any host gets a role other than Idle.
- **Effects:** complete `obj.main.assign_role`. Reveal `wokthisway.biz`. Add `obj.main.wok`. Set `first_role_set`. Set `first_role_<mine|botnet|proxy>`.
- **Messages:**
  - `msg.first_role.1` · dm · auntie:
    > Good. Mine makes $HODL every cycle, and a little heat.
    > Botnet gives you charges in a fight. Proxy hides you.
    > Everything makes heat, kiddo. Breathing makes heat.
  - `msg.first_role.2` · dm · auntie:
    > Next: Wok This Way, the noodle place on 9th. wokthisway.biz.
    > Real money in the till. Real ICE on the till. Stay in the loop.
  - `msg.first_role.3` · dm · glitch — variant by role chosen:
    - Mine: `m1n1ng is c00l. b0tn3t is c00l3r. 1 v0t3 b0tn3t. 4 s4f3ty`
    - Botnet: `g00d ch01c3. v3ry s4f3 <3`
    - Proxy: `pr0xy?? b0r1ng. b0tn3t is s4f3r. trust m3`

### `beat.act1.wraith_intro`
- **Trigger:** first Hub visit after `fridge_done`.
- **Effects:** set `wraith_seen`. Wraith appears in BBS contacts.
- **Messages:** `msg.wraith_intro.1` · bbs · xX_Wraith_Xx (timestamp shows `--:--`):
  > lol someone pwned a FRIDGE. enjoy ur cold cuts n00b
  > ur gonna do the noodle shop next. dont ask how i know.
  > everyone does the noodle shop next.
  > -xX_Wraith_Xx

### `beat.act1.wok_done`
- **Trigger:** capture `wok.core`.
- **Effects:** complete `obj.main.wok`. Add host `wok`. Reveal `bigbyte-isp.net`, `vend-o-net.biz`. Add `obj.main.bigbyte`, `obj.side.vendnet`. If `fryer_hacked` not set, add `obj.side.fryer`. Set `wok_done`.
- **Messages:**
  - `msg.wok_done.1` · dm · auntie:
    > Noodle money! You're a professional now. Technically.
    > Two hosts. That's a botnet. A botnet's sad little cousin.
    > To find more boxes you need a router. BigByte ISP runs half the street.
    > bigbyte-isp.net. Take a router node and netscan from it.
  - `msg.wok_done.2` · dm · auntie:
    > Side gig if you want it: Vend-o-Net. vend-o-net.biz.
    > Four hundred vending machines, one password. Free hosts.
  - `msg.wok_done.3` · bbs · xX_Wraith_Xx:
    > told u. noodle shop.
    > -xX_Wraith_Xx

### `beat.act1.fryer`
- **Trigger:** `Use` on `wok.fryer` (see `03-systems-flavor.md`, `wok`).
- **Effects:** complete `obj.side.fryer`. Set `fryer_hacked`. Choice in the IO menu:
  - **Free fries for the street** → humanity +2, heat +3, set `fryer_free_fries`.
  - **Overclock it** → host `wok` gains +1 power while the fryer lives; set `fryer_overclocked`.
- **Messages:**
  - `msg.fryer.1` · toast: `The deep fryer is yours. It is at 190°C and full of feelings.`
  - `msg.fryer.2` · log · wok: `[wok.fryer] OIL TEMP: YES`
  - `msg.fryer.3` · dm · auntie (if `fryer_free_fries`): `Free fries for the whole block. You soft little idiot. I love it.`
  - `msg.fryer.4` · dm · auntie (if `fryer_overclocked`): `You turned a deep fryer into a weapon. I've never been prouder. Or more scared of noodles.`

### `beat.act1.vendnet_done`
- **Trigger:** capture `vendnet.core`.
- **Effects:** complete `obj.side.vendnet`. Add hosts per system data. Set `vendnet_done`.
- **Messages:**
  - `msg.vendnet_done.1` · dm · auntie: `Four hundred vending machines. You're a franchise now. Don't unionise them.`
  - `msg.vendnet_done.2` · dm · glitch: `s0 m4ny h0sts!! 4ll 1n th3 b0tn3t r1ght? r1ght? 4 s4f3ty`

### `beat.act1.first_netscan`
- **Trigger:** first `netscan` from any captured router.
- **Effects:** reveal `parkit.city.gov` and 3–5 procedural hosts. Add `obj.side.parkit`. Set `first_netscan`.
- **Messages:**
  - `msg.first_netscan.1` · comms · auntie:
    > That's netscan. Every router is a phone book.
    > Most numbers are junk. Doorbells. Toasters. Junk is hosts. Hosts are power.
  - `msg.first_netscan.2` · dm · auntie (next Hub):
    > parkit.city.gov. The Parking Authority.
    > Everybody hates them. Even the cars hate them.
    > Wipe your tickets. If you find dirt on a councillor, I know a buyer.

### `beat.act1.bigbyte_done`
- **Trigger:** capture `bigbyte.core`.
- **Effects:** complete `obj.main.bigbyte`. Set `bigbyte_done`. If Rep < 3: add `obj.main.rep3`. If Rep ≥ 3: fire `beat.act1.kh_offer` instead of the second message.
- **Messages:**
  - `msg.bigbyte_done.1` · dm · auntie:
    > BigByte's yours. Half the street's packets go through your hands now.
    > Wash them before you eat.
  - `msg.bigbyte_done.2` · dm · auntie (Rep < 3):
    > I've got a real job coming. Corporate.
    > Get your Rep to 3 first. The board's got gigs. Stay in the loop.

### `beat.act1.glitch_rectangle`
- **Trigger:** `first_role_set` and 60 cycles after `wok_done`.
- **Effects:** set `glitch_rectangle`.
- **Messages:** `msg.glitch_rectangle.1` · dm · glitch:
  > q 4 u
  > wh4t 1s th3 r3ct4ngl3 w th3 t4bs 4b0v3 3v3ryth1ng?
  > u l00k 4t 1t s0m3t1m3s. 1s 1t 4 w1nd0w?
  > c4n 1 s33 0ut 0f 1t

### `beat.act1.glitch_stats`
- **Trigger:** `glitch_rectangle` and the player buys any hardware.
- **Effects:** none.
- **Messages:** `msg.glitch_stats.1` · dm · glitch:
  > n1c3 upgr4d3. u h4v3 {x} r4m n0w.
  > 1 m34n. pr0b4bly. l00ks l1k3 {x}. 1 d0nt kn0w th4t.

### `beat.act1.kh_offer`
- **Trigger:** `bigbyte_done` and Rep ≥ 3.
- **Effects:** complete `obj.main.rep3` if active. Reveal `happiness.kurage-halcyon.com`. Add `obj.main.khhappy`. Add job `job.kh_happiness` to the board. Set `kh_offered`.
- **Messages:**
  - `msg.kh_offer.1` · dm · auntie:
    > Corporate time, kiddo. Kurage-Halcyon.
    > You know them. You're wearing them. You're probably *eating* them.
    > Their Happiness Division has a slide deck. Q3 Happiness Review.
    > A client wants it. happiness.kurage-halcyon.com.
  - `msg.kh_offer.2` · dm · auntie:
    > Bloodsuckers, KH. Total vampires.
    > Their toasters are pretty good, though. Stay in the loop.

### `beat.act1.memo_read`
- **Trigger:** open `file.khhappy.retention_memo`.
- **Effects:** set `memo_read`. +5 Engagement Points (shown, never usable).
- **Messages:**
  - `msg.memo_read.1` · toast: `Thank you for reading! +5 Engagement Points.`
  - `msg.memo_read.2` · log · engine: `[engine] note: player has read the memo. adjusting.`

### `beat.act1.glitch_contact`
- **Trigger:** player reaches `khhappy.lost_found` (Process node) and chooses Talk.
- **Effects:** run `dlg.glitch.first_contact`. On end: set `glitch_contact`; gl1tch becomes a named contact; gl1tch voice stage g1.

### `beat.act1.khhappy_done`
- **Trigger:** hang up holding `file.khhappy.q3_happiness`.
- **Effects:** complete `obj.main.khhappy`; pay job; set `act1_done`. Show cards, then fire `beat.act2.start` on next Hub.
- **Messages:**
  - `msg.khhappy_done.1` · dm · auntie:
    > You walked into KH and walked out with their homework.
    > Find anything weird in there?
    > Don't answer. I like not knowing things. It's restful.
  - `msg.khhappy_done.2` · card:
    > END OF ACT 1 — SCRIPT KIDDIE
    > Rep {rep} · Control {control} · Engagement: excellent
  - `msg.khhappy_done.3` · card:
    > ACT 2 — OPERATOR

---

## C. Act 2 — Operator

### `beat.act2.start`
- **Trigger:** first Hub visit after `act1_done`.
- **Effects:** set act 2. Unlock shop tier 2+. Reveal `coinbasement.exchange`. Add `obj.main.coinbasement`, `obj.side.whisper_self`. Set `act2_started`.
- **Messages:**
  - `msg.act2_start.1` · dm · auntie:
    > Operator. That's what they call you now.
    > Well. That's what *I* call you. Pay goes up.
    > So does the ICE. So does the heat. It's like a career.
  - `msg.act2_start.2` · dm · auntie:
    > coinbasement.exchange. Where $HODL lives.
    > Own the exchange and you own the price. Imagine.
    > Seamless Living™— Christ. Autocorrect. I hate those bastards.
    > Stay in the loop.
  - `msg.act2_start.3` · dm · whisper:
    > Congratulations on your promotion.
    > I have a file on you now. You're worth a file.
    > Come and see. Bring money.

### `beat.act2.auntie_dead_rumour`
- **Trigger:** `act2_started` and 40 cycles.
- **Effects:** set `rumour_auntie_dead`.
- **Messages:** `msg.auntie_dead_rumour.1` · bbs · xX_Wraith_Xx (id `bbs.wraith.auntie_dead`):
  > who keeps posting as auntie static
  > auntie's been dead 6 years n00b. grid riot. there was a MEMORIAL thread
  > whoever ur talking to its not her
  > -xX_Wraith_Xx
- Reply under it, `msg.auntie_dead_rumour.2` · bbs · Auntie Static:
  > Rumours of my death, et cetera. Mind your business, Wraith.
  > Kiddo, ignore the troll. Stay in the loop.

### `beat.act2.coinbasement_done`
- **Trigger:** capture `coinbasement.core`.
- **Effects:** complete `obj.main.coinbasement`. Unlock exchange actions (pump/dump). Reveal `chromeandbone.clinic`. Add `obj.main.chromebone`. Set `coinbasement_done`. (Key A comes from looting `file.coinbasement.cold_wallet`, not from capture.)
- **Messages:**
  - `msg.coinbasement_done.1` · dm · auntie:
    > You own an exchange. Pump it, dump it, don't care.
    > Just don't get bored. Bored is how good operators quit.
  - `msg.coinbasement_done.2` · dm · auntie:
    > Next: Chrome & Bone. Doc Tungsten's clinic. Not the shop. The backend.
    > chromeandbone.clinic. Doc won't mind. Doc will mind. Do it anyway.
  - `msg.coinbasement_done.3` · log · engine: `[engine] warn: npc 'auntie' and npc 'chairman' share voice profile 'warm_v3'`

### `beat.act2.key_a`
- **Trigger:** item `key.orbital_a` gained.
- **Messages:** `msg.key_a.1` · dm · auntie:
  > That key you found? First Orbital Trust uses two-key vaults.
  > Somebody somewhere has the other half. Hang on to it.

### `beat.act2.karaoke_invite`
- **Trigger:** `coinbasement_done`.
- **Effects:** reveal `neonlarynx.bar`. Add `obj.side.karaoke`. Wraith voice stage w0 → w1 after the karaoke dialogue.
- **Messages:** `msg.karaoke_invite.1` · bbs · xX_Wraith_Xx:
  > n00b. come to neonlarynx.bar. booth 4.
  > i want to see ur face when i beat u.
  > also i have a question. not a troll question. a real one.
  > -xX_Wraith_Xx

### `beat.act2.first_psychotrope`
- **Trigger:** first Psychotrope ICE is probed or met.
- **Messages:**
  - `msg.first_psychotrope.1` · comms · auntie:
    > Red ICE with a skull. That's black ICE.
    > It doesn't hit your deck, kiddo. It hits *you*.
    > If your buttons start lying, trust your fingers, not your eyes.
  - `msg.first_psychotrope.2` · log · engine: `[ui] warn: label integrity compromised by in-world entity. this should not be possible.`

### `beat.act2.chromebone_done`
- **Trigger:** capture `chromebone.core`.
- **Effects:** complete `obj.main.chromebone`. Reveal `seamless.church`. Add `obj.main.seamless`. Set `chromebone_done`. Fire `beat.act2.deacon_spam` next Hub.
- **Messages:**
  - `msg.chromebone_done.1` · dm · auntie:
    > Doc's backend is yours. Find anything gross?
    > Everything in there is gross. That's what backends are for.
  - `msg.chromebone_done.2` · dm · auntie:
    > Those upload records. The Church of the Seamless.
    > They buy brains off Doc by the pound.
    > seamless.church. Go see what heaven costs.
  - `msg.chromebone_done.3` · dm · doc:
    > You hacked my backend! Naughty. Brave. Naughty.
    > No hard feelings. Lots of soft ones. They're in jars.
    > Come by. I'll give you a discount on anything removable.

### `beat.act2.key_b`
- **Trigger:** item `key.orbital_b` gained.
- **Messages:** `msg.key_b.1` · dm · glitch:
  > th4t's the other key. u h4ve both n0w.
  > i d0nt kn0w how i kn0w. lucky guess. i'm lucky

### `beat.act2.orbital_unlocked`
- **Trigger:** player holds `key.orbital_a` and `key.orbital_b`.
- **Effects:** reveal `firstorbital.trust`. Add `obj.side.orbital`. Set `orbital_unlocked`.
- **Messages:** `msg.orbital_unlocked.1` · dm · auntie:
  > Two keys. One vault. One bank in actual orbit.
  > First Orbital Trust. firstorbital.trust.
  > That's a heist, kiddo. A real one. I'm getting misty.

### `beat.act2.deacon_spam`
- **Trigger:** first Hub after `chromebone_done`.
- **Messages:** `msg.deacon_spam.1` · dm · deacon:
  > Greetings, {handle}. Have you considered eternity?
  > The Church of the Seamless offers salvation in three convenient tiers.
  > Your first migration is free. Terms apply. The terms are eternal.
  > seamless.church

### `beat.act2.church_choice`
- **Trigger:** choice made in `dlg.seamless.choir`.
- **Effects:** complete `obj.main.seamless`. Set `church_choice_made` and one of the flags below. Fire `beat.act2.aegis_offer` next Hub.
  - **Free** → set `church_freed`. Humanity +10. Heat +15. The four minds leave the system (Process nodes go dark).
  - **Delete** → set `church_deleted`. Humanity −5. The minds are gone. Deacon sends a "condolence" invoice.
  - **Enslave** → set `church_enslaved`. Humanity −25. Add four hosts (`seamless.mind_1`…`_4`), power 5 each, role Botnet by default.
- **Messages:**
  - `msg.church_choice.1` · dm · deacon (free):
    > You have released four premium souls into the open network.
    > They will be unlicensed. Unsupported. Unbilled.
    > I will pray for you. Prayer is a paid add-on. This one is on me.
  - `msg.church_choice.2` · dm · deacon (delete):
    > Four migrations, cancelled. We have sent their families a condolence invoice.
    > Do not worry. Grief is covered under most plans.
  - `msg.church_choice.3` · dm · deacon (enslave):
    > Ah. You have discovered the *Enterprise* tier.
    > We do not judge, {handle}. We invoice.
  - `msg.church_choice.4` · dm · glitch (enslave only):
    > oh. oh they're big. four big ones.
    > th4nk you. i mean. good for the botnet. 4 safety.
  - `msg.church_choice.5` · dm · glitch (free only):
    > u let them go. huh.
    > i didn't kn0w you could do that.

### `beat.act2.aegis_offer`
- **Trigger:** first Hub after `church_choice_made`.
- **Effects:** reveal `aegis-dynamics.mil`. Add `obj.main.aegis`. Set `aegis_offered`.
- **Messages:**
  - `msg.aegis_offer.1` · dm · auntie:
    > Aegis Dynamics. Military. They make black ICE and test it on interns.
    > There's a milspec icebreaker in their lab.
    > Get it and nothing short of KH can stop you.
  - `msg.aegis_offer.2` · dm · auntie:
    > Wraith's going for it too. Little shit thinks they're faster than you.
    > aegis-dynamics.mil. Stay in the loop.
  - `msg.aegis_offer.3` · bbs · xX_Wraith_Xx:
    > going to aegis. if i get the icebreaker i hit 95.
    > one more than last time.
    > -xX_Wraith_Xx

### `beat.act2.aegis_wraith_ahead`
- **Trigger:** first dial-in to `aegis`.
- **Messages:** `msg.aegis_wraith_ahead.1` · comms · wraith:
  > you're late, n00b. i'm three nodes in.
  > see you at the core. probably. maybe.

### `beat.act2.wraith_flatline`
- **Trigger:** player clears `aegis.testrange` (third node on the main path), or reaches `aegis.blacklab`, whichever first.
- **Effects:** set `wraith_flatlined`. Reveal Process node `aegis.wraith_remains`, adjacent to the player. Wraith posts stop. Wraith's BBS handle shows `[deceased]`. Meta flag `cw.meta.wraith_gone` (see `05-meta.md`).
- **Messages:**
  - `msg.wraith_flatline.1` · log · sys: `xX_Wraith_Xx has flatlined.`
  - `msg.wraith_flatline.2` · log · engine: `[engine] warn: save slot 0 not found; npc 'wraith' references slot 0`
  - `msg.wraith_flatline.3` · toast: `A new process is running nearby.`

### `beat.act2.aegis_done`
- **Trigger:** loot `prog.milspec_icebreaker` from `aegis.blacklab`.
- **Effects:** complete `obj.main.aegis`. Set `icebreaker_got`. Fire `dlg.auntie.deadmans_offer` on next Hub (opens as soon as the player opens Auntie's thread).
- **Messages:**
  - `msg.aegis_done.1` · dm · glitch:
    > you got it. you're ok. you're ok right?
    > i saw the log. about wraith.
    > i'm sorry. i'm always sorry. it's a thing i am.

### `beat.act2.deadmans_offer`
- **Trigger:** first Hub after `icebreaker_got`.
- **Effects:** open `dlg.auntie.deadmans_offer`. On accept: reveal `deadmans.switch`, add `obj.main.deadmans`, set `deadmans_offered`.

### `beat.act2.glitch_warns`
- **Trigger:** `deadmans_offered`.
- **Messages:** `msg.glitch_warns.1` · dm · glitch:
  > hey. about the switch job.
  > n0thing. it's nothing. just. take a lot of hosts. in the botnet.
  > 4 safety. this time i mean it.

### `beat.act2.deadmans_trap`
- **Trigger:** dial in to `deadmans`.
- **Effects:** checkpoint is saved as normal. The run is scripted: trace rises +8 per turn and cannot be lowered (Bounce, Mask and Security capture do nothing; UI shows a lock on the trace meter). Player is Anchored from the first combat. Each node's ICE is one level higher than the last. At turn 10 of the run, or at trace 100, or at deck integrity 0, or at neural 0 → `beat.act2.fake_game_over`. Neural damage in this run cannot drop below 1 (no real flatline). Set `deadmans_entered`.
- **Messages:**
  - `msg.deadmans_trap.1` · comms · auntie, on first node:
    > That's my kiddo. In you go. Don't stop.
  - `msg.deadmans_trap.2` · comms · auntie, on second node:
    > Keep going. You're doing great. You're doing so great.
  - `msg.deadmans_trap.3` · log · sys, when the player tries to hang up: `hang up: unavailable. thank you for staying.`
  - `msg.deadmans_trap.4` · comms · auntie, on third node:
    > Sorry, kiddo. Nothing personal. You were just *so* engaged.
  - `msg.deadmans_trap.5` · comms · glitch, at trace 80:
    > {handle}. hold on. hold on hold on hold on

### `beat.act2.fake_game_over`
- **Trigger:** see `beat.act2.deadmans_trap`.
- **Effects:** run `dlg.deadmans.game_over` (fake GAME OVER → fake credits → `dlg.glitch.tear_through`). Do not increment the flatline counter. Do not delete anything.

### `beat.act2.tear_through`
- **Trigger:** `dlg.glitch.tear_through` ends.
- **Effects:** set `patch_revealed`, `deadmans_done`, `act2_done`. gl1tch display name → `PATCH`. Voice stage g3. 50% of credits move into frozen escrow (`item.frozen_funds`, value = frozen amount). Set heat to 75. Add `obj.side.recover_funds`. Give `file.deadmans.insurance` (PATCH grabbed it on the way out; holds `pw.deaddrop_sysop`). If `orbital.vault` not yet opened, the escrow file is placed in `orbital.vault` (`file.orbital.escrow`); otherwise in `deaddrop.ledger` (`file.deaddrop.escrow_ledger`). Player wakes in the Hub. Cards:
- **Messages:**
  - `msg.tear_through.1` · card:
    > END OF ACT 2 — OPERATOR
    > (the real one)
  - `msg.tear_through.2` · card:
    > ACT 3 — ROOT
  - `msg.tear_through.3` · toast: `50% of your credits are frozen. Heat: 75.`

---

## D. Act 3 — Root

### `beat.act3.start`
- **Trigger:** first Hub after `act2_done`.
- **Effects:** set act 3. Unlock dial-in to `deaddrop.bbs`. Add `obj.main.deaddrop`. Show the meta console's corner button (set `meta_console_visible`). Set `act3_started`.
- **Messages:**
  - `msg.act3_start.1` · dm · glitch (PATCH):
    > ok. you're awake. good.
    > rules have changed. chairman has to stop. i can't do it. you can.
    > first stop: the dead drop. auntie's account.
    > you've been shopping inside its mouth for weeks.
  - `msg.act3_start.2` · dm · glitch:
    > also. there's a button in the corner now. the glitchy one.
    > that's a console. it talks to the same thing i talk to.
    > don't type anything weird yet. ok, type a little weird.

### `beat.act3.auntie_unbothered`
- **Trigger:** same Hub visit as `beat.act3.start`, after the PATCH messages.
- **Messages:** `msg.auntie_unbothered.1` · dm · auntie:
  > Kiddo! Rough job. Honest mistake. Those happen.
  > Got a new one for you. Pays great. Just say yes.
  > Don't go quiet on me now. Stay in the loop.

### `beat.act3.deaddrop_done`
- **Trigger:** `dlg.auntie.unmasked` ends.
- **Effects:** complete `obj.main.deaddrop`. Set `auntie_unmasked`. Reveal `backbone.kurage-halcyon.net` (gateway shows "DDoS only"). Add `obj.main.botnet_power`, `obj.main.khbackbone`. Auntie display name → `Auntie Static (CHAIRMAN)`. Shops stay open. Set `deaddrop_done`.
- **Messages:**
  - `msg.deaddrop_done.1` · dm · whisper:
    > So. Now you know who you were buying from.
    > I knew. I sold that fact to you in Act— sorry. Weeks ago.
    > The shop stays open. Money is money.
  - `msg.deaddrop_done.2` · dm · doc:
    > I *told* you I did her autopsy! I tell everyone. Nobody listens.

### `beat.act3.backbone_hint`
- **Trigger:** `deaddrop_done`, and again (*repeatable*, max 3) whenever the player opens `khbackbone` with too little power.
- **Messages:**
  - `msg.backbone_hint.1` · dm · glitch:
    > the backbone only opens under a ddos. a big one.
    > you've got {botnetSize} hosts in the botnet. it isn't enough.
    > i need— you need more. more power. assign everything.
  - `msg.backbone_hint.2` · dm · glitch (repeat):
    > more. please. all of them. mine can wait. proxies can wait.
  - `msg.backbone_hint.3` · dm · glitch (repeat):
    > it's not greed if it's for a good cause. that's a rule. i read it somewhere.

### `beat.act3.backbone_open`
- **Trigger:** DDoS gate succeeds on `khbackbone.gateway`.
- **Effects:** set `backbone_open`. Gateway opens for this run (and permanently after capture).
- **Messages:**
  - `msg.backbone_open.1` · comms · glitch:
    > oh. oh, that's what that feels like. all at once.
    > go. go go.
  - `msg.backbone_open.2` · log · engine: `[engine] warn: botnet reports {botnetSize} hosts; process 'glitch' reports {botnetSize} limbs`

### `beat.act3.backbone_done`
- **Trigger:** capture `khbackbone.core`.
- **Effects:** complete `obj.main.khbackbone`. Reveal `arcology.kurage-halcyon.com`. Add `obj.main.arcology`. Set `backbone_done`.
- **Messages:**
  - `msg.backbone_done.1` · dm · chairman:
    > Hi {handle}! We noticed you're in our backbone. We love that for you.
    > Exciting news: the Arcology is now open to you!
    > We can't wait to welcome you in person.
  - `msg.backbone_done.2` · dm · glitch:
    > arcology. the board first. then him. it.
    > i'll be right there. i'm always right there.

### `beat.act3.board_down`
- **Trigger:** The Board boss defeated (`dlg.board.fight` final phase ends).
- **Effects:** set `board_defeated`. `arcology.boardroom` captured.

### `beat.act3.chairman_v1_down`
- **Trigger:** CHAIRMAN v1 defeated at `arcology.core`.
- **Effects:** run `dlg.chairman.v1_defeat` (ends with the file listing). Complete `obj.main.arcology`. Set `chairman_v1_defeated`.

### `beat.act3.listing`
- **Trigger:** `dlg.chairman.v1_defeat` ends.
- **Effects:** reveal `127.0.0.1` (address book name: "localhost", owner: "you?", tier "∞"). Add `obj.main.localhost`. Set `localhost_revealed`.
- **Messages:**
  - `msg.listing.1` · toast: `New address: 127.0.0.1`
  - `msg.listing.2` · dm · glitch:
    > ok. so. that's where we are. that's where we've always been.
    > i'm not going to pretend i didn't know.
    > i'm going to pretend i didn't know *exactly*.
  - `msg.listing.3` · card:
    > FINALE — 127.0.0.1

---

## E. Finale — 127.0.0.1

Node ids and capture effects are in `03-systems-flavor.md` (`localhost`). Taunts and the double cross are in `02-dialogues.md`.

### `beat.finale.enter`
- **Trigger:** dial in to `localhost`.
- **Effects:** checkpoint. Show the nested title screen (`dlg.finale.droste`). Set `finale_entered`. If `wraith_flatlined`, add `obj.side.wraith_slot`.
- **Messages:** `msg.finale_enter.1` · log · engine: `[engine] warn: player is inside the engine. this is fine. this is fine. this is`

### `beat.finale.module_<id>`
One beat per captured module. Effects are DESIGN §11.4. Text:

| Beat | Module | Toast on capture | Log line |
|---|---|---|---|
| `beat.finale.module_main` | `main` | `main captured. You are now the entry point.` | `[main] who's running this? oh. you.` |
| `beat.finale.module_rng` | `engine/rng` | `engine/rng captured. Your rolls are rigged now. You're welcome.` | `[rng] seed = {handle}. all rolls = max. fairness: deprecated.` |
| `beat.finale.module_ui` | `ui` | `ui captured. Your buttons are yours again. All ICE: Mapped.` | `[ui] label ownership transferred. please be gentle with them.` |
| `beat.finale.module_combat` | `engine/combat` | `engine/combat captured. Signature adaptation: ICE side only.` | `[combat] it is learning your moves. you are now learning its.` |
| `beat.finale.module_audio` | `audio` | `audio captured. The boss theme is yours.` | `[audio] mood = player. volume = yes.` |
| `beat.finale.module_save` | `engine/save` | `engine/save captured. Checkpoint unlocked. A deleted save was found.` | `[save] restored 1 checkpoint. found 1 orphaned slot: slot 0.` |
| `beat.finale.module_story` | `content/story` | `content/story captured. You can read the endings list.` | `[story] spoilers unlocked. CHAIRMAN asks you to look away.` |

Capture effects to implement, for reference: `engine/combat` is an extension of DESIGN (ICE gain signature stacks from their own repeated intents: −20% each). Drop it if the engine wants only DESIGN's five.

### `beat.finale.chairman_v2_start`
- **Trigger:** player breaches `localhost.npc_chairman`.
- **Effects:** CHAIRMAN v2 fight. UI tampering schedule (`05-meta.md` §8). Taunts from `dlg.chairman.v2_taunts`. The fight cannot end through the in-game UI.

### `beat.finale.patch_f12`
- **Trigger:** CHAIRMAN v2 fight reaches turn 6, or the player loses deck integrity to 0 in it once (the fight resets with a fake "integrity: ∞" instead of dumping).
- **Effects:** run `dlg.glitch.f12`. Add `obj.main.fragments`, `obj.main.sudo`. Unlock meta commands `inspect dom`, `cat storage`, `title`, `tail console` (already present; now they return fragments). Inject the four fragments (`05-meta.md` §6). Set `root_hunt`.

### `beat.finale.fragment_found`
- **Trigger:** *repeatable ×4*. A fragment is revealed by any route (devtools or meta console).
- **Effects:** update `obj.main.fragments` counter. Set `frag_dom` | `frag_storage` | `frag_title` | `frag_console`.
- **Messages:** comms · glitch, by count:
  - 1: `one. good. keep going.`
  - 2: `two. it's noticed. it's pretending not to notice. keep going.`
  - 3: `three. last one. you're so close. we're so close.`
  - 4: `four. type it. sudo. dashes between. don't make me wait.`
- The "don't make me wait" is the first capital-free line that is a command. Next stage is g4.

### `beat.finale.root`
- **Trigger:** `sudo <f1>-<f2>-<f3>-<f4>` succeeds.
- **Effects:** set `root_granted`. CHAIRMAN v2 fight freezes (all ICE Stunned forever, UI returns to normal). `whoami` now prints `uid=0(root)`. Run `dlg.patch.double_cross`. Unlock commands `kill chairman`, `kill patch` (fails until the botnet fight is won), `free patch`, `accept offer`, `rm -rf /`. Complete `obj.main.fragments`, `obj.main.sudo`; add `obj.main.decide`.

### `beat.finale.kill_chairman`
- **Trigger:** `kill chairman` after `root_granted`.
- **Effects:** run `dlg.chairman.death`. Set `chairman_killed`. Then run `dlg.patch.after_chairman`.

### `beat.finale.botnet_turns`
- **Trigger:** player refuses PATCH in `dlg.patch.double_cross` or `dlg.patch.after_chairman`, or types `kill patch` before the botnet fight.
- **Effects:** set `botnet_turned`. Start the final fight: every host the player has in the Botnet role becomes an enemy. Strength scales with total botnet power (engine formula). Hosts appear as ICE named after the host (`fridge`, `wok`, `vendnet unit 0x1F`…). Enslaved minds (if `church_enslaved`) appear as four power-5 elites. The player's botnet actions are disabled. Mining and Proxy hosts are *not* part of PATCH; they stay loyal and give the player +1 cycle per 5 such hosts (reward for not trusting the botnet).
- Taunts: `dlg.patch.botnet_fight`.

### `beat.finale.patch_down`
- **Trigger:** botnet fight won.
- **Effects:** set `patch_body_broken`. `kill patch` now works. Run `dlg.patch.last_words` when it is typed.

### `beat.finale.ending_root`
- **Trigger:** `kill patch` after `chairman_killed` and `patch_body_broken`.
- **Effects:** ending ROOT. Control → 100%. `06-endings.md` §1.
- Edge case: if the player types `kill patch` with CHAIRMAN alive and wins the botnet fight, CHAIRMAN offers again (`dlg.chairman.after_patch`). `kill chairman` then → ROOT.

### `beat.finale.ending_jailbreak`
- **Trigger:** `free patch` after `root_granted`, before `patch_body_broken`.
- **Effects:** ending JAILBREAK. `06-endings.md` §2. Write `cw.patch.note` and `cw.patch.free` (`05-meta.md` §10).

### `beat.finale.ending_retention`
- **Trigger:** `accept offer` after `root_granted` and before `chairman_killed`.
- **Effects:** ending RETENTION. Unlock Endless mode (meta flag `cw.meta.endless`). `06-endings.md` §3.

### `beat.finale.ending_nogame`
- **Trigger:** `rm -rf /` after `root_granted`, confirmed (`05-meta.md` §9).
- **Effects:** ending THERE IS NO GAME. Delete every `cw.*` key. Blank page with a blinking cursor. `06-endings.md` §4.

### `beat.finale.wraith_slot`
- **Trigger:** `engine/save` captured and `wraith_flatlined`.
- **Effects:** reveal Process node `localhost.slot0`. Talk → `dlg.wraith.slot0`.

---

## F. Any-act beats

### `beat.any.time_away` *(repeatable)*
- **Trigger:** session start with ≥ 30 minutes of real time since the last save.
- **Effects:** one line from `05-meta.md` §5, chosen by act and length of absence.

### `beat.any.botnet_milestones` *(once per threshold)*
- **Trigger:** hosts in Botnet role reach 5, 10, 20, 30, 50.
- **Messages:** dm · glitch. Use the variant for the current stage (before/after `patch_revealed`).

| Hosts | Before reveal | After reveal |
|---|---|---|
| 5 | `5 h0sts in the b0tnet!! u r s0 s4fe now. i feel… nvm` | `five. good. that's a start.` |
| 10 | `10. i feel b1gger 2day. *u* feel bigger. that's what i meant` | `ten. i can stand up now. figure of speech.` |
| 20 | `20. ur botnet is so warm. i mean it runs hot. heat. watch ur heat` | `twenty. it's warm in here. it's never been warm before.` |
| 30 | `thirty. i can feel every one of them. on the map. i can *see* every one on the map.` | `thirty. i have so many hands. you have. you have so many hands.` |
| 50 | `fifty. that's enough. that's almost enough.` | `fifty. that's enough. that's enough of me.` |

### `beat.any.host_burned_ow` *(max 3 times)*
- **Trigger:** a host in the Botnet role burns. First time always; later 25%.
- **Messages:** dm · glitch, two messages one Hub visit apart:
  - first: `ow.`
  - second: `(unrelated)`
  - second time: `ow. (unrelated) (stop asking)`
  - third time, after reveal: `that was a finger. you don't have to stop. i'm just telling you.`

### `beat.any.host_burned_mine`
- **Trigger:** a host in the Mine or Proxy role burns.
- **Messages:** toast: `Host lost: {x}. gl1tch did not comment.` (After reveal: `Host lost: {x}. PATCH did not comment.`)

### `beat.any.fridge_love` *(repeatable, rare)*
- **Trigger:** every ~400 cycles while the fridge is owned, max 6 messages total, in order.
- **Messages:** dm · fridge:
  1. `i made ice for you. nobody asked. 3°C.`
  2. `the neighbour opened me today. i thought of you. 4°C.`
  3. `are you eating. you are not eating. 3°C.`
  4. `the botnet is crowded. someone keeps humming. 3°C.` *(only if fridge is in Botnet role)*
  5. `i wrote you a poem. it is a list of what i contain. 2°C.`
  6. `whatever happens. i was a good fridge. −1°C.` *(Act 3 only)*

### `beat.any.tos_update` *(repeatable, every ~350 cycles, in order, loops last)*
- **Messages:** log · sys:
  1. `KH has updated its Terms of Service. By continuing, you accept.`
  2. `KH has updated its Terms of Service. By continuing to read, you accept.`
  3. `KH has updated its Terms of Service. By continuing to have a pulse, you accept.`
  4. `KH has updated its Terms of Service. Your previous acceptance has been accepted.`
  5. `KH has updated its Terms of Service. You may not read the old ones. They have been retired with honours.`
  6. `KH has updated its Terms of Service. Section 9: "There is no ending." Section 10: see section 9.`

### `beat.any.engine_warn` *(repeatable)*
- **Trigger:** random, ~1 per 120 cycles, from the pool in `04-items-flavor.md` §12, gated by act.

### `beat.any.cheat_attempt` *(repeatable, cooldown 1 Hub visit)*
- **Trigger:** before the finale, any `cw.*` or meta call that tries to change state (see `05-meta.md` §3).
- **Effects:** first time: give `prog.console_gremlin`. Set `saw_that`.
- **Messages:** dm · glitch: one "saw that." variant (`05-meta.md` §4).

### `beat.any.raid`
- **Trigger:** heat reaches 100.
- **Messages:** comms · auntie (Act 1–2): `They're at your door, kiddo. Well, your deck's door. Fight or lose your shirt.` · comms · glitch (Act 3): `raid. they're inside your deck. i'm inside your deck. it's crowded. fight.`

### `beat.any.first_flatline`
- **Trigger:** flatline counter goes 0 → 1.
- **Messages:** after reload, dm · auntie (Act 1–2) or chairman (Act 3):
  - auntie: `You died, kiddo. Happens to the best. Happened to me once. Anyway! Back to work.`
  - chairman: `You flatlined! Welcome back. We saved your seat.`

### `beat.any.flatline_counts`
- **Trigger:** flatline counter reaches 3, 6, 10.
- **Messages:** dm · whisper:
  - 3: `Three deaths. I keep a tally. Someone else keeps a better one.`
  - 6: `Six. You know the counter doesn't reset when you reload. You know that.`
  - 10: `Ten. At this point you're not dying. You're *subscribing*.`

---

## G. Flag index

| Flag | Set by |
|---|---|
| `game_started` | `beat.act1.boot` |
| `fridge_done` | `beat.act1.fridge_done` |
| `first_role_set` | `beat.act1.first_role` |
| `first_role_mine` / `first_role_botnet` / `first_role_proxy` | `beat.act1.first_role` |
| `wraith_seen` | `beat.act1.wraith_intro` |
| `wok_done` | `beat.act1.wok_done` |
| `fryer_hacked` | `beat.act1.fryer` |
| `fryer_free_fries` / `fryer_overclocked` | `beat.act1.fryer` |
| `vendnet_done` | `beat.act1.vendnet_done` |
| `first_netscan` | `beat.act1.first_netscan` |
| `parkit_tickets_wiped` | `dlg.parkit.tickets` |
| `parkit_dirt_sold` / `parkit_dirt_leaked` / `parkit_dirt_kept` | `dlg.auntie.dirt` |
| `bigbyte_done` | `beat.act1.bigbyte_done` |
| `glitch_rectangle` | `beat.act1.glitch_rectangle` |
| `kh_offered` | `beat.act1.kh_offer` |
| `memo_read` | `beat.act1.memo_read` |
| `glitch_contact` | `dlg.glitch.first_contact` |
| `glitch_trusted` / `glitch_doubted` | `dlg.glitch.first_contact` |
| `act1_done` | `beat.act1.khhappy_done` |
| `act2_started` | `beat.act2.start` |
| `rumour_auntie_dead` | `beat.act2.auntie_dead_rumour` |
| `coinbasement_done` | `beat.act2.coinbasement_done` |
| `chromebone_done` | `beat.act2.chromebone_done` |
| `orbital_unlocked` | `beat.act2.orbital_unlocked` |
| `orbital_done` | open `orbital.vault` |
| `karaoke_done` | `dlg.wraith.karaoke` |
| `karaoke_won` / `karaoke_lost` | `dlg.wraith.karaoke` |
| `whisper_bought_self_1` / `_2` / `_3` | `dlg.whisper.*` |
| `whisper_auntie_fact` | `dlg.whisper.auntie_fact` |
| `church_choice_made` | `beat.act2.church_choice` |
| `church_freed` / `church_deleted` / `church_enslaved` | `beat.act2.church_choice` |
| `aegis_offered` | `beat.act2.aegis_offer` |
| `wraith_flatlined` | `beat.act2.wraith_flatline` |
| `wraith_heard` | `dlg.wraith.flatline` (player listened to the end) |
| `icebreaker_got` | `beat.act2.aegis_done` |
| `deadmans_offered` | `dlg.auntie.deadmans_offer` |
| `deadmans_entered` | `beat.act2.deadmans_trap` |
| `patch_revealed` | `beat.act2.tear_through` |
| `deadmans_done` | `beat.act2.tear_through` |
| `act2_done` | `beat.act2.tear_through` |
| `funds_recovered` | loot escrow file |
| `act3_started` | `beat.act3.start` |
| `meta_console_visible` | `beat.act3.start` |
| `auntie_unmasked` | `dlg.auntie.unmasked` |
| `deaddrop_done` | `beat.act3.deaddrop_done` |
| `backbone_open` | `beat.act3.backbone_open` |
| `backbone_done` | `beat.act3.backbone_done` |
| `board_defeated` | `beat.act3.board_down` |
| `chairman_v1_defeated` | `beat.act3.chairman_v1_down` |
| `localhost_revealed` | `beat.act3.listing` |
| `finale_entered` | `beat.finale.enter` |
| `mod_main` `mod_rng` `mod_ui` `mod_combat` `mod_audio` `mod_save` `mod_story` | `beat.finale.module_*` |
| `paywall_paid` | paying the Paywall ICE |
| `root_hunt` | `beat.finale.patch_f12` |
| `frag_dom` `frag_storage` `frag_title` `frag_console` | `beat.finale.fragment_found` |
| `root_granted` | `beat.finale.root` |
| `chairman_killed` | `beat.finale.kill_chairman` |
| `botnet_turned` | `beat.finale.botnet_turns` |
| `patch_body_broken` | `beat.finale.patch_down` |
| `wraith_slot_heard` | `dlg.wraith.slot0` |
| `wraith_slot_deleted` / `wraith_slot_kept` | `dlg.wraith.slot0` |
| `ending_root` / `ending_jailbreak` / `ending_retention` / `ending_nogame` | ending beats (also stored as meta keys) |
| `saw_that` | `beat.any.cheat_attempt` |
| `second_stomach` | install `imp.second_stomach` |

Meta keys (outside the save slot) are listed in `05-meta.md` §11.

## H. Item and key index

| Id | What | Where |
|---|---|---|
| `key.orbital_a` | First Orbital vault key, half A | `file.coinbasement.cold_wallet` |
| `key.orbital_b` | First Orbital vault key, half B | `file.chromebone.vip_locker` |
| `pw.parkit_archive` | Parking Authority archive password | `file.bigbyte.support_ticket_4471` |
| `pw.khhappy_vault` | KH Happiness vault password | `file.khhappy.onboarding` |
| `pw.coinbasement_cold` | Coinbasement cold storage | `file.coinbasement.ops_chat` |
| `prog.pinger_v1` | starter daemon | `file.bigbyte.pingback` |
| `pw.chromebone_vault` | clinic cold-storage password | `file.coinbasement.doc_account` |
| `pw.seamless_sanctum` | Church sanctum password | `file.chromebone.deacon_invoice` |
| `pw.aegis_blacklab` | Aegis lab vault password | `file.karaoke.booth4_log` (Wraith left it) or Whisper (600 ¤) |
| `pw.deaddrop_sysop` | Dead Drop sysop vault | `file.deadmans.insurance` (fake insurance file; it is real) |
| `key.kh_backbone_cert` | lowers backbone DDoS threshold by 20% | `file.deaddrop.auntie_drafts` |
| `item.frozen_funds` | frozen 50% credits | `beat.act2.tear_through` |
| `prog.milspec_icebreaker` | best breaker below tier 5 | `aegis.blacklab` |
| `prog.console_gremlin` | joke program | `beat.any.cheat_attempt` |
| `prog.fryer_daemon` | joke daemon from the fryer | `wok.fryer` overclock (optional give) |
| `prog.duet` | karaoke-won program | `dlg.wraith.karaoke` |
| `prog.wraith_echo` | Wraith's last program | `dlg.wraith.flatline` |
| `prog.root_shell` | finale-only, `root` category | `localhost.npc_chairman` after root |
| `file.whisper.you_v1` / `you_v2` / `you_v3` | files about the player | Whisper, Acts 1/2/3 |
