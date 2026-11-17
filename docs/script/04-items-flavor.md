# CYBER WHATEVER — Items and Flavor

Names and flavor text. Numbers in parentheses are suggestions for the engine; balance owns the final values.

---

## 1. Deck hardware

Tier 0 is the Potato-9 starter part. Ids: `hw.<part>.t<n>`.

### 1.1 CPU — cycles per turn (3 → 8)
| Tier | Name | Stat | Flavor |
|---|---|---|---|
| t0 | Potato-9 SpudCore | 3 | A single core, lightly mashed. |
| t1 | Bodega Duo | 4 | Sold next to the lottery tickets. Same odds of changing your life. |
| t2 | Hornet Hex | 5 | Six cores. All of them angry. |
| t3 | Lattice-7 | 6 | Thinks in grids. Dreams in grids. Possibly is a grid. |
| t4 | Cathedral X | 8 | Cooled with holy water. It's tap water. It cost a fortune. |

### 1.2 RAM — program space (4 → 16)
| Tier | Name | Stat | Flavor |
|---|---|---|---|
| t0 | Potato-9 Starch Stick | 4 | Four units of memory. It forgets the fifth. |
| t1 | Recall 6 | 6 | Remembers things. Some of them are yours. |
| t2 | Hoarder 8 | 8 | Never throws anything away. Not even errors. |
| t3 | Elephant 12 | 12 | Never forgets. Holds grudges. |
| t4 | Babble Library 16 | 16 | Holds every program, and a slightly wrong copy of every program. |

### 1.3 Firewall — shield per turn (2 → 12)
| Tier | Name | Stat | Flavor |
|---|---|---|---|
| t0 | Potato-9 Peel | 2 | A thin protective skin. Like a potato's. |
| t1 | Screen Door | 4 | Keeps out flies. Most flies. |
| t2 | Bouncer Pro | 6 | Checks every packet's ID. Lets in friends of friends. |
| t3 | Bastion | 9 | Medieval in the best way. |
| t4 | Event Horizon | 12 | Nothing gets in. Nothing gets out. It gets a bit lonely. |

### 1.4 Chassis — deck integrity (20 → 80)
| Tier | Name | Stat | Flavor |
|---|---|---|---|
| t0 | Potato-9 Lunchbox | 20 | It is a lunchbox. Some of the sandwich is still in there. |
| t1 | Pelican Case | 35 | Waterproof. Dropproof. Not regret-proof. |
| t2 | Brick | 50 | Military surplus. The military did not want it back. |
| t3 | Ironclad | 65 | You could stop a car with it. Please don't. |
| t4 | Monolith | 80 | Nobody knows who makes these. It hums at night. |

### 1.5 Mask chip — masking (0 → 6)
| Tier | Name | Stat | Flavor |
|---|---|---|---|
| t0 | Potato-9 Paper Bag | 0 | Eye holes. Fools nobody. Fools you a bit. |
| t1 | Novelty Moustache | 1 | Obviously fake. Works on routers. |
| t2 | Grey Man | 3 | Looks like everyone. Specifically, like nobody. |
| t3 | Chameleon | 4 | Matches the colour of the packet. Confused by rainbows. |
| t4 | Nobody | 6 | "There's no one here," says the chip. Convincingly. |

### 1.6 Uplink — botnet charges and power (0 → 6)
| Tier | Name | Stat | Flavor |
|---|---|---|---|
| t0 | Potato-9 Tin Can Phone | 0 | Two cans and a string. No charges. One friend. |
| t1 | Antenna Hat | 2 | Worn on the deck. Looks like a hat. Is a hat. |
| t2 | Relay | 3 | Talks to your hosts. Your hosts talk back. |
| t3 | Hive Link | 5 | Your botnet, in one voice. Slightly too many voices. |
| t4 | Choir Master | 6 | Conducts every host at once. Something hums along. |

### 1.7 Storage — paydata slots (3 → 12)
| Tier | Name | Stat | Flavor |
|---|---|---|---|
| t0 | Potato-9 Sock Drawer | 3 | Three slots. One has a sock in it. |
| t1 | Shoebox | 5 | Your childhood fits in here. So does this. |
| t2 | Filing Cabinet | 7 | Alphabetical. Judgemental. |
| t3 | Warehouse | 9 | Forklift included. Forklift licence not included. |
| t4 | Bottomless | 12 | We checked. There is a bottom. It's very far down. |

### 1.8 Neural interface — neural HP (10 → 30)
| Tier | Name | Stat | Flavor |
|---|---|---|---|
| t0 | Potato-9 Jumper Cables | 10 | Clipped to your temples. Red is positive. Probably. |
| t1 | Hairnet | 14 | Medical grade. Cafeteria style. |
| t2 | Halo Lite | 18 | Soft padding. New-brain smell. |
| t3 | Thinking Cap | 24 | Your thoughts, double-glazed. |
| t4 | Second Skull | 30 | A spare skull, worn over the first. It's good to have a spare. |

### 1.9 Selling the Potato-9
When the last Potato-9 part is sold or replaced, fire once:
- toast: `Potato-9 retired. It served. Badly. Loyally.`
- dm · fridge: `i heard about the potato. it was a good potato. 3°C.`
- dm · whisper: `I bought your old deck. Sentimental reasons. Mine, not yours.`

---

## 2. Programs

Ids `prog.<name>`. Each line: category · kind · v1 / v2 / v3 names · flavor. Version names show in the UI; the id stays the same.

### 2.1 Attack
| Id | Kind | v1 / v2 / v3 | Flavor |
|---|---|---|---|
| `prog.lockpick` | crack | `lockpick` / `lockpick.pro` / `lockpick_FINAL_v3_real` | Picks crypt shells. Slowly. Lovingly. |
| `prog.brute` | crack (heavy, loud) | `brute` / `brute.force` / `brute.forcer.forcest` | Tries every password, starting with "password". |
| `prog.rainbow` | crack (Mapped bonus) | `rainbow` / `doublerainbow` / `rainbow.table.of.contents` | Precomputed answers to questions nobody asked yet. |
| `prog.crowbar` | spike | `crowbar` / `crowbar2` / `crowbar_deluxe` | Hits walls. Simple tools for simple problems. |
| `prog.ram` | spike (heavy, loud) | `ram` / `ram_ram` / `megaram` | Doesn't knock. Doesn't wait. Doesn't stop. |
| `prog.needles` | spike (multi-hit) | `needle` / `needles` / `haystack` | Death by a thousand pokes. Well. Six pokes. |
| `prog.wiggler` | worm | `wiggler` / `wiggler.2` / `the_wiggler_returns` | Crawls in. Doesn't leave. Doesn't pay rent. |
| `prog.tapeworm` | worm (long, low) | `tapeworm` / `tapeworm_xl` / `tapeworm_xxl` | A slow infection. Very patient. Very gross. |
| `prog.chainletter` | worm (spreads on death) | `chainletter` / `chainletter.fwd` / `chainletter.fwd.fwd.fwd` | Infects. Spreads when the host dies. Forward to ten friends. |

### 2.2 Exploit
| Id | Kind | v1 / v2 / v3 | Flavor |
|---|---|---|---|
| `prog.peek` | scan (Mapped, one) | `peek` / `peek.deep` / `stare` | Rude, but informative. |
| `prog.sonar` | scan (Mapped, all; smaller crit) | `sonar` / `sonar.wide` / `whale_song` | Ping. Ping. Ping. Oh, there you all are. |
| `prog.keysmash` | fuzz (Unstable, one) | `keysmash` / `keysmash.asdf` / `keysmash.asdfghjkl` | Hits random inputs until something cries. |
| `prog.static` | fuzz (Unstable, all) | `gibberish` / `gibbergibberish` / `pure_static` | Shouts nonsense at everyone. Everyone gets a bit wobbly. |
| `prog.bucket` | overflow | `bucket` / `bigger_bucket` / `the_flood` | Consumes all Unstable. Splash damage, literally. |
| `prog.popcorn` | overflow (cheap) | `stackpop` / `stackpop.pop` / `popcorn` | Pops every Unstable stack. Pop pop pop. |
| `prog.giftbox` | inject (Backdoored) | `giftbox` / `giftbox.deluxe` / `giftbox.with.bow` | Everybody opens a present. |
| `prog.sleeper` | inject (short t, loud) | `sleeper` / `sleeper.cell` / `sleeper.agent` | Moves in. Waits. Not long. |
| `prog.rootkit` | root | `rootkit` / `rootkit.plus` / `rootkit.family` | Turns a Rootable ICE to your side. It sends you birthday cards after. |

### 2.3 Defense
| Id | Kind | v1 / v2 / v3 | Flavor |
|---|---|---|---|
| `prog.umbrella` | shield boost | `umbrella` / `umbrella.xl` / `golf_umbrella` | Firewall up. Not built for this weather. |
| `prog.cutout` | decoy | `cardboard_cutout` / `cardboard_cutout.hd` / `life_size_you` | Absorbs hits. Looks like you, if you squint. ICE squints. |
| `prog.duct_tape` | patch deck | `duct_tape` / `duct_tape.silver` / `duct_tape.gold` | Fixes everything once. |
| `prog.tinfoil` | neural buffer | `tinfoil` / `tinfoil.double` / `tinfoil.couture` | Finally, the hat works. |

### 2.4 Stealth
| Id | Kind | v1 / v2 / v3 | Flavor |
|---|---|---|---|
| `prog.moustache` | mask (Masked) | `fake_moustache` / `fake_beard` / `fake_everything` | Trace halved this turn. Nobody recognises you. Nobody ever did. |
| `prog.mop` | scrub trace | `mop` / `mop.and.bucket` / `janitor` | Leaves the logs shiny. |
| `prog.lullaby` | sleep ICE (Stunned) | `lullaby` / `lullaby.loop` / `white_noise` | Shh. Shhhh. There. |
| `prog.bounce` | proxy (less trace for 3 turns) | `bounce` / `double_bounce` / `trampoline_park` | Your packets take the scenic route. |

### 2.5 Daemon
| Id | Kind | v1 / v2 / v3 | Flavor |
|---|---|---|---|
| `prog.pinger` | auto-pinger (small spike each turn) | `pinger` / `pinger.pro` / `pinger.premium` | Just keeps pinging. Like a friend who's bored. |
| `prog.guard_dog` | sentry (blocks first hit each turn) | `guard_dog` / `guard_dog.good_boy` / `guard_dog.best_boy` | Who's a good firewall? Who is? |
| `prog.lookout` | maps one random ICE each turn | `lookout` / `lookout.binoculars` / `lookout.telescope` | Stands on a box. Shouts what it sees. |
| `prog.pickpocket` | steals 1 shell point per turn | `pickpocket` / `pickpocket.nimble` / `pickpocket.artful` | Takes a little. Every turn. They never notice. They notice. |

### 2.6 Special (story and joke)
| Id | Name | Source | Flavor |
|---|---|---|---|
| `prog.milspec_icebreaker` | `MILSPEC_ICEBREAKER` | Aegis Black Lab | Crack and spike at once. Ignores shell type. Has a serial number and a body count. |
| `prog.wraith_echo` | `echo` | Wraith | Repeats the last program you ran at full strength, ignoring signature. Once per fight. "It does what I did, one more time." |
| `prog.duet` | `duet` | karaoke win | Next program fires twice at 60%. Harmony is two people being wrong together. |
| `prog.fryer_daemon` | `fryer.d` | `wok.fryer` (overclocked) | Daemon. 1 damage to every ICE per turn. Smells incredible. |
| `prog.console_gremlin` | `console.gremlin` | cheat attempt | See `05-meta.md` §4.2. |
| `prog.root_shell` | `#` | finale | Root category. Every target is Rootable. "You are the admin now. Act like it." |

---

## 3. ICE

Base roster from DESIGN §6.4, plus additions. Each: description (address-book/probe text), default taunt (if the system has no skin).

### 3.1 Standard
| Id | Name | Description | Default taunt |
|---|---|---|---|
| `ice.sentry` | Sentry | Wall shell. Hits your deck. The first ICE everyone meets. | "Halt. Or don't. I'll hit you either way." |
| `ice.cipher` | Cipher | Crypt shell. Reshells every 3 turns. | "New lock. Same door. Different you." |
| `ice.bloodhound` | Bloodhound | No shell. Adds trace every turn. Kill it first or stun it. | "I've got your scent. It's mostly snacks." |
| `ice.tarpit` | Tar Pit | Wall shell. Tars and Anchors you. Low damage. | "Stay a while. Stay forever." |
| `ice.scrambler` | Scrambler | Crypt shell. Scrambles your most-used program. | "Your favourite? Not anymore." |
| `ice.patcher` | Patcher | No shell. Repairs and reshells other ICE. | "Hold still, friend. You're leaking." |
| `ice.killer` | Killer | Wall shell. Charges one turn, then hits ×3. | "Charging. Don't go anywhere." |
| `ice.mirror` | Mirror | Crypt shell. Reflects the damage kind you used last on it. | "Nice hit. Here it is back." |
| `ice.hydra` | Hydra | Wall shell. Splits in two when the shell breaks, unless Infected. | "Cut one, get two. It's called scaling." |
| `ice.siren` | Siren | No shell. Calls reinforcements in 2 turns unless stunned or killed. | "Help! Help! (I'm fine. It's for you.)" |
| `ice.hunter` | Hunter | Joins at Alarm or at heat 50+. Fast. Tracks across nodes. | "You're the one everybody's talking about." |

### 3.2 Black ICE (always labelled, red, skull)
| Id | Name | Description | Taunt |
|---|---|---|---|
| `ice.flatliner` | Flatliner | **BLACK ICE.** Neural damage. Kills. | "Heart rate detected. Fixing." |
| `ice.cortex_burner` | Cortex Burner | **BLACK ICE.** Applies Burn stacks. | "Smell that? That's thinking." |
| `ice.psychotrope` | Psychotrope | **BLACK ICE.** Neural damage. Scrambles the real labels on your program buttons. | "[your labels are mine now]" |
| `ice.anti_cheat` | Anti-Cheat | **BLACK ICE.** Finale. Neural damage. Hits harder for every meta command used this fight. | "Unauthorised modification detected: you." |

Psychotrope label scramble pool (button labels it swaps in): `crowbar → crowbark`, `lockpick → lockpickle`, `mop → mope`, `umbrella → umbrage`, `peek → peak`, `duct_tape → duct_tale`, `End Turn → End You`, `Hang Up → Dial In`, `Disengage → Disagree`, any → `trust me`.

### 3.3 Unique and bosses
| Id | Name | Description | Taunt |
|---|---|---|---|
| `ice.retention_bonus` | Retention Bonus | Deadman's Switch only. Heals to full each turn. Unbeatable. | "We'd hate to lose you. So we won't." |
| `ice.board` | The Board | Arcology boss. Hydra. Uploaded directors. Split heads become *Acting* directors. | see `dlg.board.fight` |
| `ice.chairman_v1` | CHAIRMAN v1 | Arcology core boss. Phases: Keynote, Q&A, Roadmap. | see `dlg.chairman.v1_intro` |
| `ice.chairman_v2` | CHAIRMAN v2 | Finale. Owns the UI. Cannot be beaten in the UI. | see `dlg.chairman.v2_taunts` |
| `ice.patch_body` | PATCH (Botnet) | Finale. Your Botnet-role hosts, turned. Strength scales with botnet power. | see `dlg.patch.botnet_fight` |

### 3.4 Finale ICE (game concepts) — full UI text in `05-meta.md` §7
| Id | Name | Description |
|---|---|---|
| `ice.unskippable_tutorial` | Unskippable Tutorial | Stuns you with popups explaining things you know. |
| `ice.loading_screen` | Loading Screen | Slows everything, including itself. |
| `ice.paywall` | Paywall | "Pay 999¤ to skip this fight." Paying works. |
| `ice.eula` | EULA | A wall of text. Scroll and accept, or lose a turn. |
| `ice.achievement_spam` | Achievement Spam | Covers the screen in achievements. Each one is worth nothing. |
| `ice.garbage_collector` | Garbage Collector | Evicts a loaded program each turn. Picks the least used. |

---

## 4. Implants (Doc Tungsten's clinic)

| Id | Name | Effect | Humanity | Doc's pitch |
|---|---|---|---|---|
| `imp.wired_reflexes` | Wired Reflexes | +2 cycles on turn 1 | −10 | "Your nerves, but caffeinated. Permanently." |
| `imp.pain_editor` | Pain Editor | First neural hit each fight halved | −10 | "Pain is just information. I edit the information." |
| `imp.mnemonic_buffer` | Mnemonic Buffer | Keep paydata when dumped | −15 | "A little shelf in your head. For files. And one childhood memory, to make room." |
| `imp.cold_cortex` | Cold Cortex | Immune to Scramble | −20 | "You'll feel calm. You'll feel *less*. Marketing says 'calm'." |
| `imp.ghost_glands` | Ghost Glands | Mask +1 | −10 | "You'll stop sweating. Entirely. Your shirts will be suspicious." |
| `imp.eidetic_lens` | Eidetic Lens | One random ICE starts each fight Mapped | −15 | "You'll see everything. You'll forget nothing. You'll be *so* tired." |
| `imp.botnet_spine` | Botnet Spine | Uplink +1 | −15 | "I wire your spine to your hosts. You'll feel them. Every single one. Something might feel you back." |
| `imp.second_stomach` | Second Stomach | Does nothing | **+5** | "Pointless. Gorgeous. Like a sunset." |

NPC lines about the Second Stomach (flag `second_stomach`):
- auntie: "Is that a Second Stomach? Kiddo. Why. …Can I see it?"
- whisper: "A Second Stomach. I can't sell that fact. Nobody would believe it."
- glitch: "u got a 2nd st0mach?? what does it d0. nothing?? i love it. i want 0ne"
- wraith: "lol. second stomach. i had one too. last time. it didnt help either."
- deacon: "The Church cannot upload a Second Stomach. We have tried. It refuses."
- chairman (finale): "You bought the Second Stomach. Zero utility. Pure engagement. We've never loved anyone more."

---

## 5. Perks (pick 1 of 3 at Rep 2, 4, 6, 8, 10)

| Id | Name | Effect | Flavor |
|---|---|---|---|
| `perk.polyglot` | Polyglot | Flow needs 2 categories, not 3. | You speak fluent Everything, badly. |
| `perk.slumlord` | Slumlord | +1 power on tier-1 hosts. | Toasters pay rent now. |
| `perk.ghost` | Ghost | Once per run, a failed sneak does not ambush. | They felt a draught. That's all. |
| `perk.packrat` | Packrat | +2 storage. Paydata sells for +10%. | You keep everything. Some of it is valuable. |
| `perk.kiddie_forever` | Script Kiddie Forever | v1 programs cost 1 fewer cycle (min 1). | You never upgraded. You never had to. |
| `perk.cold_open` | Cold Open | First program each fight costs 0 cycles. | You start talking before they say hello. |
| `perk.combo_breaker` | Combo Breaker | Consuming a status tag refunds 1 cycle (once per turn). | Every setup is a discount. |
| `perk.worm_farmer` | Worm Farmer | Infected decays every other turn. | You raise them. You love them. You set them loose. |
| `perk.quiet_hands` | Quiet Hands | Stealth programs make 0 noise. Others −1. | Even your typing whispers. |
| `perk.landlord` | Landlord | Proxy hosts count double. | You hide behind a lot of property. |
| `perk.market_maker` | Market Maker | Exchange pump/dump cooldown halved. +heat when used. | You *are* the market. Act like it. Or don't. That's also the market. |
| `perk.deep_pockets` | Deep Pockets | Traced fine is 5%, not 20%. | Most of your money is somewhere they can't find. Including you. |
| `perk.iron_stomach` | Iron Stomach | Immune to Psychotrope label scrambling. Black ICE neural damage −1. | You've seen worse labels. In the clinic. |
| `perk.second_wind` | Second Wind | Once per run, survive deck integrity 0 with 1. | The deck refuses. It's very rude about it. |

---

## 6. Botnet actions

| Id | Button | Effect (DESIGN §6.6) | Flavor (tooltip) | Use line (log) |
|---|---|---|---|---|
| `bot.ddos` | **DDoS** | Stun all ICE 1 turn; bosses Slowed | Everyone you own says "hello" at once. Loudly. | `{n} hosts say hi. The ICE can't hear itself think.` |
| `bot.dcrack` | **Distributed Crack** | Crack damage scaled by botnet power | A thousand toasters guess one password. | `{n} hosts guess together. One of them is right.` |
| `bot.swarm` | **Swarm** | Many small spike hits | Death by a thousand doorbells. | `{n} doorbells ring at once.` |
| `bot.bounce` | **Bounce** | −trace | Your signal visits every fridge in town on its way here. | `Trace bounced through {n} hosts. The fridges are tired.` |

Host burned (log): `Host lost: {host}. Its owner found it. It was nice while it lasted.`

---

## 7. Heat levels

| Band | Label | HUD tooltip | Hub toast on entry |
|---|---|---|---|
| 0–24 | **Cool** | Nobody's looking. Enjoy it. | — |
| 25–49 | **Noticed** | Runs start at 10 trace. Someone has your name on a sticky note. | `Heat: Noticed. You're a name on a sticky note.` |
| 50–74 | **Hunted** | Hunter ICE in every system. The sticky note is now a folder. | `Heat: Hunted. You have a folder now. It's thick.` |
| 75–99 | **Burned** | Owned systems get reclaimed. Shops +25%. The folder has a photo. | `Heat: Burned. They have a photo. It's not your good side.` |
| 100 | **Raid** | They come to you. | `RAID. Your deck has visitors.` |

Raid result lines:
- win: `Raid repelled. They left. They left their shoes.` 
- lose: `Raid lost. They took a part and some money. Heat is 50. You're still here. Apparently.`

---

## 8. Failure screens

Shown on ejection. Pick a random variant. Act 3 variants replace one line with CHAIRMAN's voice.

### 8.1 Dumped (deck integrity 0)
Title: **DUMPED**
- "Your deck hit zero. The system threw you out like a bad date. You lost this run's paydata. One program is corrupted."
- "The Potato-9 has made a noise it has never made before. You're out. Paydata gone. One program is now mostly static."
- "Ejected. Your deck is smoking. Not in the cool way. One program needs repairs, and so does your pride."
- "Integrity: 0. Dignity: also 0. You're back home with less than you left with."
- Act 3: "Dumped! Don't worry. We kept your seat warm. —C."

Footer: `Lost: {n} paydata · Corrupted: {program} · Heat +10`

### 8.2 Traced (trace 100)
Title: **TRACED**
- "They found you. Not your deck. *You*. Account frozen: 20%. The system is hardened. One host burned."
- "Trace complete. Somewhere a van has your address. It's a nice van. You don't want to meet it."
- "100%. A KH compliance bot just said your real name out loud. It mispronounced it. That's the only good news."
- "You stayed one node too long. Greed is a lovely feeling right up until this one."
- Act 3: "Traced! Hi! We already knew where you were. We always know. —C."

Footer: `Fine: {x}¤ · Heat +25 · {system} hardened · Host lost: {host}`

### 8.3 Flatlined (neural HP 0; black ICE only)
Title: **FLATLINED**
- "Black ICE stopped your heart. You were warned. It was red. It had a skull on it."
- "Neural: 0. You are dead. This is the part where you reload. The counter doesn't."
- "Your brain has been formatted. Reload the checkpoint. Someone is keeping score."
- "Flatline #{flatlines}. That number lives outside your save. It isn't going anywhere."
- Act 3: "Flatline #{flatlines}! Every time, you come back. That's not failure. That's loyalty. —C."

Buttons: `[ Reload checkpoint ]` (only button). Under it, small: `flatlines: {flatlines}`.

---

## 9. Jobs (the fixer board)

Pitches are Auntie's voice. Payout tiers: P1 (~150¤) to P5 (~5000¤). Ids `job.<name>`.

| Id | Title | Auntie's pitch | Target | Payout | Complication |
|---|---|---|---|---|---|
| `job.kh_happiness` | Q3 Happiness Review | (story; `msg.kh_offer`) | `khhappy` vault: `file.khhappy.q3_happiness` | P3 | Story. Lost & Found. |
| `job.parkit_dirt` | Dirt Merchant | "Somebody on the council's dirty. Everybody is. Find the file with proof. Bring it to me." | `parkit` archive: `file.parkit.councillor_dirt` | P3 | Tagged. Vault needs a password from BigByte. |
| `job.crisp_liberation` | Crisp Liberation | "Guy lost two credits in a vending machine years ago. He's never moved on. Free his crisps." | `vendnet.unit_0x1f` (Use) | P1 | The machine has feelings about it. 4,112 bags. |
| `job.fry_day` | Fry Day | "Dev at the noodle shop hasn't slept in a month. Put the fryer on a timer so he can." | `wok.fryer` (Use: "timer") | P1 | The fryer does not want to sleep. Extra Sentry. |
| `job.wrong_number` | Wrong Number | "A client owes BigByte nine thousand credits for a service they never got. Nobody ever gets it. Wipe the debt." | `bigbyte.billing` (loot `client_debt.rec`) | P2 | The client is the BigByte CEO's mother. +5 heat. |
| `job.throttle_up` | Throttle Up | "Kid on 12th has a tournament. Unthrottle their house. Hold the line six cycles." | `bigbyte.throttle` (Use, then stay 6 cycles) | P2 | Staying costs trace. Hold Music calls friends. |
| `job.doorbell_diaries` | Doorbell Diaries | "Client wants footage from a KnockKnock Pro. Proves they weren't at a party." | procedural doorbell host (`netscan`) | P2 | The footage shows they were at the party. Sell it or delete it. |
| `job.tow_space_two` | The Car in Space 2 | "Space 2 at the Parking Authority. Same car, forever. Client wants it gone. Nobody knows why it's scary." | `parkit.tow` (Use) | P2 | The car has its own ICE. It's a Hydra. Of course it is. |
| `job.proof_of_stake` | Proof of Stake | "Client wants $HODL up for one afternoon. Plant a fat fake order." | `coinbasement.orderbook` (Use) | P3 | Tagged order. +10 heat. The price dips anyway. |
| `job.organ_recall` | Organ Recall | "Client wants their kidney back. Delete the sale record and they can sue." | `chromebone.records` (loot `sale_8812.rec`) | P3 | The kidney is in someone else now. Someone famous. |
| `job.applause_break` | Applause Break | "A singer at Neon Larynx needs a win. Rig the applause meter." | `karaoke.applause` (Use: "rig") | P2 | Wraith is in the same contest. Wraith notices. Wraith posts about it. |
| `job.lost_sheep` | Lost Sheep | "A churchgoer confessed something they regret. Get the confession before it gets sold." | `seamless.confession` (loot `confession_0417.db`) | P3 | The client is the Deacon. It's his confession. It's about the ads. |
| `job.space_junk` | Space Junk | "First Orbital fined a client for leaving a bolt in orbit. Delete the fine." | `orbital.ledger` | P4 | Nudging the thrusters is the only way in. The station drifts. |
| `job.ghost_writer` | Ghost Writer | "A company needs an apology letter. Aegis has the best templates. Get one." | `aegis.lobby` (loot `apology_templates.docx`) | P4 | Black ICE guards the templates. Of course apologies are lethal there. |

Board job states (fixer UI copy):
- Available: `OPEN`
- Taken: `ON IT`
- Done: `PAID — Auntie says: "{line}"` with rotating lines: "Lovely." / "You're my favourite." / "Next!" / "Don't stop now." / "That's how we do it, kiddo." / (after unmask) "Engagement up 3%!"

---

## 10. Procedural IoT hosts

Generated by `netscan`. Name = `{brand}-{device}-{suffix}` or `{owner} {device}`. Host ids are generated.

### 10.1 Name parts
**Brands / prefixes (16):** `chill+`, `toastr`, `knockknock`, `pulse`, `dreamdeck`, `sunrise`, `kurage-kare`, `halcy`, `seamless`, `vend`, `bodega`, `nonbrand`, `cheapo`, `smrt`, `homeolo`, `gizmotron`

**Devices (24):** `fridge`, `toaster`, `doorbell`, `kettle`, `e-scooter`, `baby-monitor`, `smart-bulb`, `thermostat`, `litter-box`, `aquarium`, `treadmill`, `mattress`, `blinds`, `meter`, `vending`, `speaker`, `toothbrush`, `plant-pot`, `garage-door`, `lawn-bot`, `rice-cooker`, `massage-chair`, `bin`, `mirror`

**Suffixes (12):** `4b`, `9th-st`, `lobby`, `unit-07`, `basement`, `xmas-gift`, `do-not-unplug`, `grandmas`, `spare`, `office`, `jr`, `mk2`

**Owner names for possessive form (12):** `Pell's`, `Dev's`, `Mrs. Ashworth's`, `Unit 12's`, `The Kowalczyks'`, `Someone's`, `Nobody's`, `Councillor B-O's`, `Room 404's`, `Landlord's`, `The Twins'`, `Dr. Ilse's`

### 10.2 Descriptions (pick by device; fall back to generic)
1. **toaster** — "Toastr Infinite. Burns a smiley into every slice. Subscription lapsed; now burns a frown."
2. **doorbell** — "KnockKnock Pro. Has watched 4,000 deliveries. Knows the neighbour's schedule better than the neighbour."
3. **kettle** — "Boils water. Reports it. Somewhere, a dashboard knows how much tea you drink."
4. **e-scooter** — "Seamless Commute scooter. Stuck in a tree. Still online."
5. **baby-monitor** — "Listens to a sleeping baby. And, for some reason, the whole street."
6. **smart-bulb** — "A bulb with an IP address and a firmware update every Tuesday."
7. **thermostat** — "Learned the household's habits. Disapproves of most of them."
8. **litter-box** — "Self-cleaning. Self-reporting. The cat has no privacy."
9. **aquarium** — "Smart aquarium. The fish are not smart. The tank thinks less of them."
10. **treadmill** — "Pulse Loyalty treadmill. Unused since January. Sends motivational notes to an empty room."
11. **mattress** — "DreamDeck. Rates your sleep out of 100. You've never broken 40."
12. **blinds** — "KH Sunrise blinds. Opens at 6 a.m. whatever you think about it."
13. **meter** — "Parking meter. Fines with enthusiasm."
14. **vending** — "Vending machine. Holds one sandwich it considers its own."
15. **speaker** — "Smart speaker. Always listening. Never understands."
16. **toothbrush** — "Bluetooth toothbrush. Knows exactly how long you brush. Judges you for it."
17. **plant-pot** — "Smart plant pot. The plant died. The pot still reports 'thriving'."
18. **garage-door** — "Opens for anyone who asks nicely in the right protocol."
19. **lawn-bot** — "Robot mower. Mowed the same square metre for six months. Very good square metre."
20. **rice-cooker** — "Wi-Fi rice cooker. Makes rice. Makes it *known*."
21. **massage-chair** — "Kurage Kare chair. Massages. Upsells. Massages again."
22. **bin** — "Smart bin. Weighs your guilt. Sends it to the council."
23. **mirror** — "Smart mirror. Tells you you look great. Lies. It's in the terms."
24. **fridge** — "Chill+ fridge. Not *your* fridge. Your fridge would be jealous."
25. **generic** — "A small device with a big opinion of itself."
26. **generic** — "Default password. Factory settings. Factory feelings."
27. **generic** — "Its last firmware update was a long time ago. It misses being cared about."
28. **generic** — "Online since install. Never asked to be."
29. **generic** — "Built to last two years. Has lasted nine. Bitter."
30. **generic** — "Labelled DO NOT UNPLUG. Nobody remembers why. Nobody dares."
31. **generic** — "It blinks. That's its whole personality."
32. **generic** — "Has a screen. The screen shows the time. The time is wrong."

### 10.3 Drifted descriptions (Botnet role only; replace the normal text ~10% of the time)
Clue for `00-bible.md` §4.3. Spelling is gl1tch's stage-g1 leet.
- "t0aster. 1dle. h4ppy."
- "d00rb3ll. w4tch1ng. n0t th3 str33t."
- "k3ttl3. w4rm. th4nk u."
- "b3d. sl33p1ng. n0t m3. 1 d0nt sl33p."
- "bulb. on. so on."
- "m1rr0r. 1 c4n s33 m3 1n 1t."
(After `patch_revealed`, drifted lines lose the leet: "toaster. mine." / "doorbell. mine." / "kettle. warm. mine.")

---

## 11. BBS chatter (Dead Drop public posts)

Shown at random in the Hub feed. Handles are original. `[act ≥ n]` gates. Wraith's posts show timestamp `--:--`.

1. **m0th_ball:** "anyone else's fridge renewing itself? mine renewed twice. i don't own a second fridge."
2. **packetrat:** "WTB working mask chip. not a moustache. a REAL one."
3. **ratking:** "new warez in the bin. one of them works. guess which."
4. **old_jen:** "remember when the net had *pages*? i miss pages."
5. **xX_Wraith_Xx** (`--:--`): "lol 'beginner's luck'. there's no luck. there's a seed."
6. **byteme_99:** "PSA: BigByte's 'up to' includes zero. i checked with legal. legal is also on BigByte."
7. **saltlick:** "got dumped on a Sentry. a SENTRY. don't talk to me."
8. **noodle_enjoyer:** "who keeps hacking Wok This Way. the fryer is ANGRY. the noodles are still good tho"
9. **thirtyfour:** "if your doorbell starts asking about your 'day' unplug it."
10. **cache_money:** "$HODL just did a thing. nobody knows what thing. buy? sell? hold? HODL."
11. **m0th_ball:** "update: fridge renewed a third time. it sent me a thank-you card."
12. **ghost_in_the_bin:** "if you see red ICE with a skull, hang up. not later. now. you're reading this, so you're too slow."
13. **packetrat:** "anyone tried the Second Stomach implant? what does it do. 'nothing'?? i'm getting two"
14. **xX_Wraith_Xx** (`--:--`): "ur all gonna hit the KH job next week. dont @ me when it's weird."
15. **lux_null:** "Church of the Seamless sent me a 'free migration' coupon. i'm 22. i'm not *dying*. am i?"
16. **byteme_99:** "Parking Authority fined my scooter for 'loitering'. it was charging. it has to charge somewhere."
17. **old_jen:** "six years today since the grid riot. RIP Auntie Static. paid on time. swore beautifully. weird she still posts. weird."
18. **saltlick:** "got traced. van outside. very nice van. they waved."
19. **cache_money:** "Coinbasement says withdrawals paused 'due to vibes'. the vibes are bad."
20. **thirtyfour:** "anyone else's log saying weird engine stuff? mine says '[engine] warn'. i don't have an engine. i have a deck."
21. **m0th_ball:** "fridge renewed AGAIN. i've started to think it's lonely."
22. **lux_null:** "KH updated its terms again. 'by continuing to have a pulse.' i'll stop then i guess"
23. **ratking:** "reminder: everything in the bin is 100% working 60% of the time."
24. **ghost_in_the_bin:** "anyone know who the sysop is? been 'away' six years. still paying the server bill somehow."
25. **noodle_enjoyer:** "update: the fryer is now free fries on fridays. someone hacked it to be NICE. hero" *(only if `fryer_free_fries`)*
26. **packetrat:** "got a Second Stomach. it does nothing. i've never been happier. 10/10"
27. **xX_Wraith_Xx** (`--:--`) `[act ≥ 2]`: "does anyone else get deja vu on this board. like ive read it all before. not a troll. not a troll."
28. **old_jen** `[act ≥ 2]`: "the Church's ads are getting into my dreams. i don't have a DreamDeck. HOW"
29. **cache_money** `[act ≥ 2]`: "someone OWNS Coinbasement now. $HODL moves when they sneeze. bless you, whoever you are"
30. **thirtyfour** `[act ≥ 2]`: "has anyone ever met gl1tch in person? or in anything?"
31. **lux_null** `[act ≥ 2]`: "the orbital bank got robbed?? in SPACE?? legend" *(only if `orbital_done`)*
32. **ghost_in_the_bin** `[act ≥ 2]`: "Wraith's last post was 'going to aegis'. that was a while ago. anyone?" *(only if `wraith_flatlined`)*
33. **old_jen** `[act ≥ 3]`: "who else saw the credits? the CREDITS? on the BBS feed? for like a second? i'm not crazy"
34. **saltlick** `[act ≥ 3]`: "my toaster just said 'thank you for the body'. i'm throwing it in the river"
35. **ratking** `[act ≥ 3]`: "auntie static was a corp AI??? i bought warez off her referrals for YEARS"
36. **m0th_ball** `[act ≥ 3]`: "fridge stopped renewing. it just says 'it's almost over'. what's almost over"

---

## 12. Engine warnings (game log foreshadowing)

`beat.any.engine_warn` picks from this pool by act. Story-specific ones fired by beats are marked ★ and are not in the random pool.

### Act 1
1. ★ `[engine] warn: expected 0 players. continuing anyway.`
2. ★ `[engine] warn: npc 'glitch' read state.player outside dialogue tick`
3. `[engine] warn: npc 'auntie' online for 2190 consecutive days. no sleep events recorded.`
4. `[engine] warn: npc 'wraith' has no creation timestamp.`
5. `[engine] warn: rng reseeded mid-run. nobody asked it to.`
6. `[engine] warn: fridge 'chill+_4b' sending messages to player. fridges should not send messages.`
7. `[engine] warn: player looked at the tab bar for 4.2s. npc 'glitch' noticed.`
8. `[engine] info: retention target: ∞. current session: on track.`
9. ★ `[engine] note: player has read the memo. adjusting.`

### Act 2
10. ★ `[engine] warn: npc 'auntie' and npc 'chairman' share voice profile 'warm_v3'`
11. ★ `[ui] warn: label integrity compromised by in-world entity. this should not be possible.`
12. ★ `[engine] warn: save slot 0 not found; npc 'wraith' references slot 0`
13. `[engine] warn: npc 'glitch' process size grew by {botnetSize} units. npcs should not grow.`
14. `[engine] warn: npc 'whisper' read meta.flatlines. npcs cannot read meta. npc 'whisper' can.`
15. `[engine] warn: botnet host '{host}' reports two owners.`
16. `[engine] warn: npc 'wraith' remembers a previous run. npcs do not have previous runs.`
17. `[engine] info: ending 'GAME OVER' scheduled. type: decorative.`
18. `[engine] warn: npc 'glitch' sent an apology with no preceding event.`
19. `[engine] warn: church process 'mind_4' requested 'quiet'. 'quiet' is not a valid state.`

### Act 3
20. ★ `[engine] warn: botnet reports {botnetSize} hosts; process 'glitch' reports {botnetSize} limbs`
21. `[engine] warn: npc 'chairman' attempted write to window.title. denied. retrying.`
22. `[engine] warn: npc 'chairman' attempted write to localStorage key 'cw.chairman.diary'. allowed. why was that allowed.`
23. `[engine] warn: player opened the console. npc 'chairman' would like to discuss it.`
24. `[engine] warn: content/story has 4 endings. npc 'chairman' has filed 4 bugs.`
25. `[engine] warn: npc 'patch' requested access to: the rectangle with the tabs. pending.`
26. `[engine] warn: player is getting close to an end state. this is fine.`
27. ★ `[engine] warn: player is inside the engine. this is fine. this is fine. this is`

---

## 13. Loading and idle tips

Shown on dial-in loading and after 60 s idle in the Hub. Gates in `[ ]`.

1. "Probe before you poke. Knowing costs a cycle. Not knowing costs a deck."
2. "Same program twice is a pattern. Three times is a subscription. Mix it up."
3. "Three categories in one turn is Flow. Flow is free cycles. Free is good."
4. "Crack beats crypt. Spike beats walls. Worm beats everyone, slowly."
5. "Kill the Bloodhound first. It's the one telling everyone where you are."
6. "A Killer that's charging is a Killer about to ruin your day. Decoy, stun, or burst."
7. "Honeypots look like loot. Probes find them. Greed finds them faster."
8. "Hanging up is free outside a fight. Pride is expensive."
9. "Black ICE is always red, always labelled, and always serious."
10. "Hosts in Proxy hide you. Hosts in Mine pay you. Hosts in Botnet… are very popular with someone."
11. "Heat decays with time. Time passes in systems, not at home."
12. "Owned systems can be reclaimed at high heat. Keep it cool."
13. "Tagged data is hot. Fence it, or wear the heat."
14. "The Potato-9 is not a good deck. It is *a* deck."
15. "Doc can remove anything. Doc will offer."
16. "Whisper sells addresses, passwords, and information about you. Mostly you."
17. "You can always come back to a system. It will remember you. So will its ICE."
18. "Tip: tips are written by someone who wants you to keep reading tips."
19. "Did you know? You can stop playing at any time. [act ≤ 2: this tip has been retired]"
20. "There's a button in the corner now. [act 3]"
21. "Press the backtick key. Or don't. It's not like it's important. [act 3]"
22. "Loading… (it isn't loading. it's waiting for you.) [act 3]"

Idle lines (Hub, after 3 min without input; one per idle period):
- [act 1–2] auntie dm: "You there, kiddo? Board's waiting. I'm waiting. We're all waiting."
- [act 1–2] glitch dm: "r u still th3r3? u w3nt qu13t. 1 d0nt l1k3 qu13t"
- [act 3] glitch dm: "still there? it's very quiet when you don't press anything. i can hear the fans."
- [any] log: `[engine] info: player idle. world paused. world does not enjoy this.`

---

## 14. HUD copy by humanity

Humanity < 40: flavor adjectives vanish. Humanity < 20: the HUD calls you `UNIT`.

| Element | Normal (≥ 40) | Low (20–39) | Unit (< 20) |
|---|---|---|---|
| Hub title | `HOME DECK` | `DECK` | `TERMINAL 0` |
| Greeting | `Welcome back, {handle}.` | `{handle}. Online.` | `UNIT ONLINE.` |
| Dial in button | `Dial in` | `Connect` | `EXECUTE` |
| Hang up button | `Hang up` | `Disconnect` | `TERMINATE SESSION` |
| End turn | `End turn` | `End turn` | `YIELD` |
| Combat win | `ICE down! Nice.` | `ICE terminated.` | `TARGET NULL.` |
| Loot | `You grab {file}. Nice find.` | `{file} acquired.` | `+1 OBJECT.` |
| Capture | `{system} is yours. Hosts love you.` | `{system} captured.` | `{system}: ASSIMILATED.` |
| Paydata sold | `Sold {file} for {x}¤. Treat yourself.` | `Sold {file}: {x}¤.` | `+{x}.` |
| Inbox empty | `No messages. Peace and quiet. Suspicious.` | `No messages.` | `0.` |
| Heat tooltip | `How much the world wants you.` | `Heat.` | `EXPOSURE INDEX.` |
| Humanity tooltip | `What's left of you. It's a lot. Keep it.` | `Humanity remaining.` | `LEGACY VALUE.` |
| Botnet tab | `Your hosts. Your little army.` | `Hosts.` | `LIMBS.` |
| Address book entry note | `Somebody's fridge. Probably lonely.` | `Fridge. Tier 1.` | `NODE.` |
| Item description | (full flavor text) | (stat line only) | (stat line only, uppercase) |
| Flatline screen | `FLATLINED` + flavor | `FLATLINED` | `PROCESS ENDED. RESTART.` |
| Rep up | `Rep up! You're somebody now.` | `Rep {rep}.` | `RANK {rep}.` |
| Hub idle line | `The deck hums. The coffee's cold.` | `Idle.` | `AWAITING INSTRUCTION.` |
