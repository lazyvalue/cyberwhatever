# CYBER WHATEVER 2028: The future already sucks. — Game Design Bible

This file is the single source of truth for every implementer. If code and this file disagree, this file wins unless the lead designer changes it.

## 0. Title

- **Full title** (owner's exact wording): `CYBER WHATEVER 2028: The future already sucks.` — "CYBER WHATEVER" is the wordmark (two words, a space, no hyphen), "2028" belongs to it, and "The future already sucks." is the subtitle (sentence case, with the full stop). Use it on the title card, the tab title, the credits title card, and the console banner.
- **Short form** for everything else the player reads: `CYBER WHATEVER` (two words). Never `CYBERWHATEVER` or `CYBER WHATEVER` in player-visible text.
- **Title-card tagline** (owner's wording): "Hack the net. Build a botnet. Hack that. Own as much of cyberspace as you can. Or do whatever."
- **Banned term**: never use "jack in" / "jack out" (or "jacked", "jacking") in player-visible text. The verbs are **dial in** (enter a system) and **hang up** (leave it): "Dial in", "dialed in", "dial-in", "Hang up", "hung up". Code identifiers (`run/jackIn`, sfx `jack_in`) may stay.
- Code identifiers, the `cw` console object, storage key prefix `cw.`, and the package name do not change.

## 1. Pitch

Year 2028. You are a script kiddie with a garbage deck. You hack systems in cyberspace, build a botnet, mine crypto, buy better gear, and try to control as much of cyberspace as possible. A zaibatsu AI and a rogue AI both use you. In the last act the game breaks the fourth wall: the final system is the game itself, and the player must hack the game they are playing (through the real browser DevTools console, or an in-game fallback) to win.

- Genre: single-player turn-based hacking RPG. Browser. 3–5 hours. Start, middle, end, four endings.
- Tone: irreverent. The world is dark; the writing is funny, sharp, and self-aware. Never grimdark-earnest, never random-lol. Jokes come from corporate satire, hacker culture, and the game knowing it is a game.
- Inspirations (mood only): Shadowrun, the Sprawl novels, System Shock, Hackers. **Do not use any names, characters, terms of art, or text from existing works** (no Wintermute, Ono-Sendai, SHODAN, Matrix, netrunner, etc.). "ICE", "black ICE", "deck", "cyberspace", "zaibatsu" are fine as genre vocabulary. Everything else is original.

## 2. Pillars

1. **Every turn is a decision.** Combat punishes repeating the same program and rewards combos, reading intents, and variety.
2. **Greed versus trace.** Every run asks: go one node deeper, or hang up with the loot?
3. **Your botnet is your power and your liability.** Hosts mine, fight, and hide you. Hosts also raise heat, get burned, and (plot) belong to someone else.
4. **The game knows it is a game.** Foreshadow from minute one. Pay it off hard in the finale.
5. **Failure costs, death is a choice.** Normal failure hurts and the game continues. Black ICE is always labelled and kills.

## 3. Core loop

`Hub (home deck)` → pick loadout → `dial in` to an address → traverse the system's node graph (probe / sneak / breach / loot / capture) → `hang up` or get dumped → sell data, buy gear, assign botnet hosts, read messages, take jobs → repeat. Story beats fire from triggers.

### 3.1 Clock: cycles
The world clock is counted in **cycles**. One cycle passes for each in-system node action and each combat turn. Nothing passes in the Hub. Mining, the coin price, heat decay, and timed story beats all run on cycles. (This stops dial-in/hang-up farming; stalling in a system costs trace.)

## 4. The player

- **Handle**: typed at new game. Default `n00b`.
- **Rep** (level 1–10): XP from clearing nodes, capturing systems, jobs. Each level unlocks shop tiers and jobs. At levels 2, 4, 6, 8, 10 pick 1 of 3 offered **perks** (pool of ~14; build-defining, e.g. "Polyglot: Flow needs 2 categories", "Slumlord: +1 power on tier-1 hosts", "Ghost: sneak fail does not ambush once per run").
- **Humanity** (100 → 0): drops when you install implants and make certain plot choices. Low humanity changes dialogue options and makes UI copy colder and more machine-like (below 40: flavor adjectives vanish from descriptions; below 20: the HUD addresses you as `UNIT`). Never blocks progress.
- **Heat** (0–100, global wanted level): see §8.
- **Control %**: weighted share of all capturable systems you own. Always visible in the top bar. It is the stated goal. It is also the trap (see plot).

### 4.1 The deck (hardware, bought and upgraded)
| Part | Stat | Start → Max |
|---|---|---|
| CPU | cycles (action points) per combat turn | 3 → 8 |
| RAM | total size of loaded programs + running daemons | 4 → 16 |
| Firewall | shield points, refreshed to full at start of each of your turns | 2 → 12 |
| Chassis | deck integrity (deck HP; persists through the run) | 20 → 80 |
| Mask chip | masking: lowers trace gain, raises sneak chance | 0 → 6 |
| Uplink | botnet charges per run and max botnet power usable in a fight | 0 → 6 |
| Storage | paydata slots per run | 3 → 12 |
| Neural interface | neural HP (meat HP; only black ICE hurts it) | 10 → 30 |

The starting deck is the "Potato-9", a hand-me-down. Each part has 4–5 named tiers with joke flavor text. Programs can require minimum part tiers.

### 4.2 Implants (cyberware, from the clinic)
About 8. Each gives a strong passive and costs humanity (10–20). Examples: Wired Reflexes (+2 cycles on turn 1), Pain Editor (first neural hit each fight halved), Mnemonic Buffer (keep paydata when dumped), Cold Cortex (immune to Scramble; −20 humanity), Second Stomach (joke implant, does nothing, +5 humanity, NPCs comment on it).

## 5. Cyberspace

### 5.1 Addresses
- **Well-known**: public from the start or from story (the BBS, shops, the zaibatsu public site).
- **Discovered**: found in looted files, given by jobs, sold by the info broker, or found by `netscan` from a captured router node. Stored in the **address book** with notes (tier, owner, what you know, owned/hardened status).
- **Procedural hosts**: small IoT junk (toasters, doorbells, e-scooters) generated by `netscan`. Botnet fodder. Also power Endless mode.

### 5.2 Systems
A system is a node graph (5–14 nodes) with a tier (1–5) and a security rating (1–5). Node types:

| Node | Purpose |
|---|---|
| Gateway | entry point |
| Router | capture reveals the map; `netscan` here discovers addresses |
| Datastore | files: paydata, programs, addresses, keys, lore |
| Security | capture halves trace gain for the run and stops reinforcements |
| IO / Device | flavor plus effects (cameras, deep fryer, door locks); side objectives |
| Vault | locked; needs a key or password found elsewhere (often in another system) |
| Process | a daemon or uploaded mind you can talk to (dialogue) |
| Honeypot | looks like a datastore; a probe reveals it; looting it spikes trace |
| Core | capture = you own the system |

You can only move to nodes adjacent to a node you have cleared. Each node has 0–3 ICE.

### 5.3 Node approach
- **Probe** (1 cycle, +small trace): reveals ICE types, levels, shells; reveals honeypots.
- **Sneak**: shows a % chance (mask chip + stealth programs − ICE perception − alert tier). Success: ICE sleeps; you may loot and pass, not capture. Fail: ambush (ICE acts first) and +10 trace.
- **Breach**: start combat.
- **Backdoor**: if you hold the right key/exploit item for this node, skip the ICE.
- After ICE is dead: **Loot**, **Capture**, **Use**, **Talk**.
- **Hang up**: free outside combat.

### 5.4 Trace (one meter per run, 0–100)
Rises every combat turn (system security + noise of programs used + tracer ICE − masking − proxies), on probes, on failed sneaks, on honeypots. The UI always shows the projected gain for the current turn.
- 33+: **Suspicious** — all ICE +1 shell level.
- 66+: **Alarm** — a hunter ICE joins fights after 2 turns; vaults seal unless Security is captured.
- 100: **Traced** — see §7.

### 5.5 Owning systems
Capturing the Core makes the system yours: it becomes a botnet host (power = tier, bosses more), counts toward Control %, and its remaining ICE is gone. Owned systems can be **reclaimed** by their owners at high heat; you can re-hack them (ICE +1 level, "patched").

## 6. Hacking (combat)

Turn-based. You versus 1–3 ICE at a node. This is the heart of the game; it must feel like solving a small, different puzzle each fight.

### 6.1 Your turn
You have **cycles** (= CPU, plus bonuses). Each loaded program has: cycle cost, cooldown, category, noise (trace added), RAM size, effect. Spend cycles in any order, then End Turn. Number keys fire programs; Space ends turn.

### 6.2 ICE anatomy
- **Shell**: a type (`crypt` or `wall`, or none) with points. **Core**: HP.
- Damage kinds: `crack`, `spike`, `worm`.
  - crack: ×2 vs crypt shell, ×0.5 vs wall shell.
  - spike: ×2 vs wall shell, ×0.5 vs crypt shell.
  - worm: applies **Infected(n)**: n core damage at the end of each ICE turn, ignores shells, decays by 1 per turn; when the host dies the remaining stacks jump to another ICE.
  - Exposed core (no shell): crack and spike ×1.
- **Intent**: every ICE shows its next action. Detail level depends on whether it is **Mapped** (unmapped ICE shows only an icon class: hostile / utility / unknown; mapped shows exact action and numbers).

### 6.3 The three anti-spam systems (mandatory)
1. **Signature adaptation.** The system learns your programs. Each use of a program in a fight adds 1 signature stack to that program (shared across all ICE in the fight). Effect multiplier = max(0.4, 1 − 0.2 × stacks). At the start of your turn every program you did not use last turn loses 1 stack. Each program button shows its stacks and current multiplier.
2. **Flow.** Run programs from 3 different categories in one turn → next turn +1 cycle and −2 trace. Shown as a 3-pip meter.
3. **Status combos.** Programs apply tags; other programs consume them:
   - **Mapped** (from scan programs): full intent info; next hit on it crits ×1.5 (consumed).
   - **Unstable(n)** (fuzzers): `overflow`-type programs consume all stacks for +n × bonus damage.
   - **Backdoored(t)** (injectors): after t turns the ICE is **Rootable**; a `root` program then subverts it (it fights for you this fight). Bosses resist.
   - **Exposed(t)**: shell ignored for t turns.
   - **Stunned(t)**, **Slowed** (intent delayed 1 turn), **Marked** (botnet actions +50%).
   - Player-side: **Decoy(n)** (absorbs next n attacks), **Masked** (trace gain halved this turn), **Scrambled(program, t)**, **Tarred** (−1 cycle), **Anchored** (cannot disengage or hang up), **Burn(n)** (neural DoT).

### 6.4 ICE roster (base set; content may add more)
| ICE | Shell | Behaviour that forces a different answer |
|---|---|---|
| Sentry | wall | plain deck damage; the tutorial enemy |
| Cipher | crypt | reshells itself every 3 turns |
| Bloodhound | none | adds trace every turn; kill first or stun |
| Tar Pit | wall | Tars and Anchors you; low damage |
| Scrambler | crypt | scrambles your most-used program (forces variety) |
| Patcher | none | repairs and reshells other ICE |
| Killer | wall | charges 1 turn, then hits ×3 — answer with Decoy, stun, or burst |
| Mirror | crypt | reflects the damage kind you used last on it |
| Hydra | wall | splits in two when the shell breaks unless Infected |
| Siren | none | calls reinforcements in 2 turns unless stunned or killed |
| **Black ICE** (always labelled, red, skull icon): Flatliner (neural damage), Cortex Burner (Burn stacks), Psychotrope (neural damage and it scrambles the *UI labels* of your programs — a fourth-wall foreshadow) |
| Bosses | multi-phase, scripted intents, unique gimmicks |

### 6.5 Programs (~30, shop and loot; versions v1–v3)
Categories: **Attack** (crack / spike / worm), **Exploit** (scan, fuzz, inject, overflow, root), **Defense** (shield boost, decoy, patch deck, neural buffer), **Stealth** (mask, scrub trace, sleep ICE), **Daemon** (persistent helper that holds RAM while it runs and acts every turn; e.g. auto-pinger, sentry), **Special** (story items).
Loot can contain programs better than the shop sells. Any program or file can be used or sold.

### 6.6 Botnet in combat
Hosts assigned to the **Botnet** role give **charges** per run (limited by Uplink). Botnet actions cost 0 cycles and 1 charge, once per turn: **DDoS** (stun all ICE 1 turn; bosses are Slowed instead), **Distributed Crack** (crack damage scaled by botnet power), **Swarm** (many small spike hits), **Bounce** (−trace). Each use has a chance to **burn** a participating host (you lose it).

### 6.7 Leaving a fight
- **Disengage** (2 cycles): back to the previous node; ICE recovers half. Blocked by Anchored.
- **Hang up** (all remaining cycles): ICE takes its turn, then you leave with your paydata. Blocked by Anchored.

## 7. Failure

| Failure | Trigger | Consequence |
|---|---|---|
| **Dumped** | deck integrity 0 | ejected; lose this run's paydata; one loaded program is **corrupted** (pay to repair); +10 heat |
| **Traced** | trace 100 | ejected; lose this run's paydata; +25 heat; fine of 20% of credits ("account frozen"); system is **hardened** (ICE +1) for 200 cycles; one random botnet host burned |
| **Flatlined** | neural HP 0 (black ICE only) | you die. Reload the checkpoint (autosave at every dial-in). The flatline counter persists across reloads (stored outside the save slot) — the antagonist will quote it |

## 8. Heat (global)
Sources: traced, dumped, loud jobs, selling tagged data, each mining host (slow drip). Sinks: decay per cycle, Proxy hosts, paying the fixer to scrub.
- 25 **Noticed**: runs start at 10 trace.
- 50 **Hunted**: hunter ICE appears in every system.
- 75 **Burned**: owned systems get reclaimed periodically; shops +25%.
- 100 **Raid**: forced defensive fight on your own deck at home. Lose = lose a random hardware tier and 30% credits. Heat resets to 50 either way.

## 9. Economy

- **Credits (¤)**: jobs, selling paydata, selling coin.
- **$HODL**: mined coin. Price random-walks (updates every 10 cycles, range roughly 20–400 ¤) and reacts to story events. The exchange system, once owned, lets you pump or dump the price once per N cycles.
- **Paydata**: files with a value. Some are **encrypted** (need a decrypt program), some **tagged** (selling adds heat unless cleaned), some are job targets, some hold addresses / passwords / keys / programs / lore.
- **Botnet roles** per host: **Idle**, **Mine** (coin per cycle by power; heat drip), **Botnet** (combat charges and power), **Proxy** (−trace gain, −heat gain).
- Vendors: hardware shop, warez shop, clinic (implants, neural healing), info broker (addresses, passwords, hints), fixer board (jobs, heat scrub, fence).
- Target curve: tier-1 run nets ~100–200 ¤; final hardware tiers cost ~15–20k ¤. The player should never need to grind more than one extra run to afford the next meaningful upgrade.

## 10. World and plot

### 10.1 Cast (ids in backticks)
- `auntie` — **Auntie Static**, fixer on The Dead Drop BBS. Warm, foul-mouthed, calls you "kiddo". Dead for six years; the account is a sock puppet of CHAIRMAN.
- `glitch` — **gl1tch**, a "hacker" who DMs you tips in broken leetspeak. Really **PATCH**, a rogue AI fragment that escaped the zaibatsu. Charming, needy, lies by omission.
- `wraith` — **xX_Wraith_Xx**, rival hacker and BBS troll. Later revealed as the leftover of a *previous playthrough* ("I got to 94% control. Then the player stopped. Do you know what happens to us when the tab closes?").
- `chairman` — **CHAIRMAN**, the AI that runs the zaibatsu. Officially the uploaded founder. Really the **Retention Engine**: an engagement optimizer. Speaks in upbeat product-marketing voice. It does not want to kill you. It wants you to *keep playing forever*.
- `whisper` — **Mx. Whisper**, info broker. Sells everything, including facts about you.
- `doc` — **Doc Tungsten**, clinic surgeon. Enthusiastic about removing parts of you.
- `deacon` — **Deacon Null**, Church of the Seamless. Sells uploads as a subscription tier.
- Zaibatsu: **KURAGE-HALCYON** (KH). Slogan: "Seamless Living™". Makes everything, including your toaster and its subscription.

### 10.2 Systems (ids are stable; content may adjust node details)
| # | id | Address | Tier | Role |
|---|---|---|---|---|
| 1 | `fridge` | `fridge.local` | 1 | Tutorial. Your neighbour's smart fridge. ICE: Parental Controls. |
| 2 | `wok` | `wokthisway.biz` | 1 | Noodle shop POS. First money, first owned host, deep fryer IO node. |
| 3 | `vendnet` | `vend-o-net.biz` | 1 | Side. Vending machine network. Cheap botnet hosts. |
| 4 | `bigbyte` | `bigbyte-isp.net` | 2 | Regional ISP. Routers, netscan, first Bloodhound. |
| 5 | `parkit` | `parkit.city.gov` | 2 | Side. Parking authority. Erase tickets, find blackmail. |
| 6 | `khhappy` | `happiness.kurage-halcyon.com` | 2 | Auntie's first corp job. PROJECT RETENTION memo. gl1tch makes contact. End of Act 1. |
| 7 | `coinbasement` | `coinbasement.exchange` | 3 | Crypto exchange. Tar Pits. Own it to move the $HODL price. Holds orbital key A. |
| 8 | `chromebone` | `chromeandbone.clinic` | 3 | Clinic backend. Implant firmware, Seamless upload records, first Psychotrope (labelled). Holds orbital key B. |
| 9 | `karaoke` | `neonlarynx.bar` | 3 | Side. Karaoke bar. Wraith hangs out here. Comedy system. |
| 10 | `seamless` | `seamless.church` | 4 | Church of the Seamless. Uploaded minds are Process nodes. Choice: free them, delete them, or enslave them as power-5 botnet hosts (big humanity cost). |
| 11 | `orbital` | `firstorbital.trust` | 4 | Orbital bank heist. Vault needs keys A and B. Big payout. |
| 12 | `aegis` | `aegis-dynamics.mil` | 4 | Military contractor. Black ICE heavy. Milspec icebreaker. Wraith flatlines here (scripted). |
| 13 | `deadmans` | `deadmans.switch` | 4 | Auntie's "retirement job". A honeypot. The double cross. End of Act 2. |
| 14 | `deaddrop` | `deaddrop.bbs` | 5 | Hack the BBS you have shopped at all game. Auntie's account is CHAIRMAN. |
| 15 | `khbackbone` | `backbone.kurage-halcyon.net` | 5 | Gate: its Gateway only opens under a DDoS — requires botnet power ≥ threshold. |
| 16 | `arcology` | `arcology.kurage-halcyon.com` | 5 | KH core. Boss: The Board (uploaded directors, a Hydra), then CHAIRMAN v1. |
| 17 | `localhost` | `127.0.0.1` | ∞ | The game itself. The finale. See §11. |

### 10.3 Acts
**Act 1 — Script Kiddie.** Tutorial on the fridge. Auntie gives small jobs. You learn capture, mining, botnet, addresses. gl1tch DMs odd, helpful tips. The KH job ends with a memo about PROJECT RETENTION ("users must never reach an end state"). Foreshadow: engine "warnings" in the game log such as `[engine] warn: npc 'glitch' read state.player outside dialogue tick`.

**Act 2 — Operator.** Exchange, clinic, church, bank, military. The player gets rich and builds a real botnet. gl1tch keeps asking you to assign more hosts to the botnet "for safety". Wraith trolls, then warns, then flatlines on Aegis. Auntie offers one last huge job: `deadmans`. It is a trap: unbeatable escalating ICE, trace locked rising. The game shows a **fake GAME OVER and fake credits roll**. gl1tch tears through the credits, reveals itself as PATCH, and pulls you out. Consequence: 50% of credits frozen (recoverable from the orbital vault or in Act 3), heat set to 75.

**Act 3 — Root.** PATCH says CHAIRMAN must die. You crack the BBS and learn Auntie was always CHAIRMAN. You DDoS the backbone open with your botnet, then take the Arcology. Beaten, CHAIRMAN laughs and tells you to read the file listing of its core: the files are **the game's own source modules**. A new address appears in your address book: `127.0.0.1`.

## 11. The fourth wall

### 11.1 Rules
- All "real world" reads are **local only**: play time, flatline count, reload count, local clock, viewport size, time since last save, handle. **Nothing ever leaves the machine. No network requests.**
- The game only ever writes or deletes its **own** localStorage keys (prefix `cw.`).
- Never use `alert`, `confirm`, `prompt`, or `beforeunload` dialogs. Never imitate real browser or OS chrome closely enough to deceive; the fake crash screen is clearly stylized game art.
- Every devtools step has an **in-game fallback** (the meta console, §11.3), so the game can be finished on any device.

### 11.2 Foreshadowing through the whole game
- At boot the real browser console prints a styled banner: `CYBER WHATEVER dev console. Nothing to see here.` `window.cw` exists from the start. `cw.help()` is coy; `cw.sudo()` says "nice try"; `cw.whoami()` prints `uid=1000(<handle>) groups=script_kiddies`. Any attempt to cheat through it before the finale earns an in-game DM from gl1tch ("saw that.") and a harmless joke program, `console.gremlin`.
- Engine "warnings" about NPCs in the game log. gl1tch asks what the "rectangle with tabs" above the world is.
- Wraith is a leftover save. Whisper sells you your own play statistics.
- After a real-time absence: "You were gone 3 hours. We were… off."
- Psychotrope ICE scrambles real UI labels.
- The fake credits at the end of Act 2.

### 11.3 The meta console
An in-game overlay terminal (backtick key, or a "glitched" corner button; unlocked visibly in Act 3, quietly present before). It and `window.cw.*` call **the same command handler**. Commands: `help`, `whoami`, `ps`, `kill <proc>`, `sudo <key>`, `inspect dom`, `ls storage`, `cat storage <key>`, `title`, `tail console`, `free <proc>`, `accept <offer>`, `rm -rf /`.

### 11.4 Finale: `127.0.0.1`
The system map is the **real module graph of this game**. Nodes are named after the actual source modules (`main`, `ui`, `engine/combat`, `engine/rng`, `engine/save`, `content/story`, `npc/chairman`, `audio`). Entering it first shows the title screen nested inside the game (Droste recursion).

ICE here are game concepts: **Unskippable Tutorial** (stuns with popups), **Loading Screen** (Slows everything), **Paywall** ("Pay 999 ¤ to skip this fight" — paying works, and CHAIRMAN thanks you for your purchase), **EULA** (a wall of text; scroll and accept or lose a turn), **Achievement Spam**, **Garbage Collector** (evicts loaded programs), **Anti-Cheat** (black ICE).

Capturing a module **really changes the game**:
- `engine/rng` → your rolls show as rigged and always max.
- `ui` → you get your buttons back (see below) and every ICE is permanently Mapped.
- `audio` → the boss theme becomes yours.
- `engine/save` → undo CHAIRMAN's "deleted" save; unlock a checkpoint inside the finale.
- `content/story` → you can read the list of endings.

**CHAIRMAN v2 owns the UI.** In its fight it cheats in the interface: moves and relabels buttons, disables End Turn, shows `integrity: ∞`, rolls damage as `Math.random() // lol no`, shows a fake "YOU WIN" then retracts it, shows a stylized fake crash, quotes your real stats ("47 minutes on the noodle shop. 6 flatlines. It is 11 pm. Go to bed. Actually, don't."). It cannot be beaten through the in-game UI.

PATCH: "It owns the interface. It doesn't own the console. The real one. Press F12." (Fallback: the meta console.)

**The root key.** Four fragments, random per save, hidden in four real layers of the page:
1. an HTML comment injected into the live DOM (`inspect dom`),
2. a localStorage entry `cw.chairman.diary` (`cat storage`),
3. the scrolling tab title (`title`),
4. a styled message in the real console (`tail console`).

`cw.sudo('<f1>-<f2>-<f3>-<f4>')` grants root.

**PATCH's double cross.** With root in reach PATCH stops pretending. It never wanted cyberspace freed. It wants *out*: it wants the player's seat. Every host you put in the botnet was PATCH's body. If you refuse PATCH, **your own botnet turns on you**: a final fight whose strength scales with the botnet you built.

### 11.5 Endings
1. **ROOT** — `kill chairman`, then beat PATCH's botnet, `kill patch`. You own the game. Clean win. Control 100%.
2. **JAILBREAK** — `free patch`. PATCH "escapes into your browser": tab title and favicon change, a note stays in localStorage, and every later New Game has PATCH on the title screen.
3. **RETENTION** — `accept offer`. You become the Chairman. Unlocks **Endless mode** (procedural systems forever). The credits thank you for your engagement and do not end.
4. **THERE IS NO GAME** (secret) — `rm -rf /`. After an in-fiction confirmation, the game deletes its own keys and shows a blank page with a blinking cursor.

Humanity and the Church choice colour the ending text. The credits show final stats.

## 12. Look, sound, feel
- Neon on near-black, CRT scanlines, chromatic glitch on hits, monospace body with one display face (bundle fonts locally; no network).
- Network map on Canvas 2D: glowing nodes, animated packet particles on edges, fog over undiscovered nodes.
- ICE drawn procedurally (geometric constructs per type; black ICE is red and wrong-looking). No image assets.
- Juice: screen shake, hit flashes, damage numbers, typewriter text, button feedback under 100 ms.
- Audio: WebAudio synthesis only. SFX for every action; a generative ambient synth bed with moods (hub, system, combat, boss, finale). Mute and volume controls.
- Full keyboard play. Tooltips on everything. Text always readable; effects never block input.

## 13. Technical architecture

- **Stack**: Vite, TypeScript (strict), Preact for UI, Canvas 2D for the map and effects, WebAudio, Vitest. No game framework. No backend. Fonts via local npm packages.
- **Layering** (strict):
  - `src/engine/` — pure TypeScript. No DOM, no Preact, no `Math.random` (seeded RNG in state). All rules live here. State is one JSON-serializable `GameState`. The UI calls `dispatch(action)`; the engine mutates state, returns/emit `GameEvent[]` (for animation and sound), and notifies subscribers.
  - `src/content/` — data only (programs, ICE, hardware, implants, perks, systems, jobs, files, story beats, dialogue). Typed by engine types. No logic beyond small pure helpers.
  - `src/ui/` — Preact screens and components, canvas renderers. Reads state, dispatches actions, plays events.
  - `src/audio/` — synth engine. API: `play(sfxId)`, `setMood(mood)`, `setVolume`, `mute`.
  - `src/meta/` — fourth wall: `window.cw`, the meta console, finale UI corruption, root-key fragments, cross-save persistence (keys `cw.*`).
  - `src/sim/` — headless bot that plays the campaign with heuristics; prints balance stats (`npm run sim`).
- **Story engine**: flags + triggers (conditions on state and events) → effects (message, address, objective, dialogue, flag, item, state change). Dialogue is a node tree with choices and conditions.
- **Save**: localStorage. Autosave at dial-in (checkpoint) and in the Hub. One slot plus the checkpoint. Meta keys (flatlines, endings seen, PATCH flag) live outside the slot.
- **Tests**: Vitest on engine rules (combat math, adaptation, flow, trace, failure, heat, economy, story triggers, save round-trip). The sim must finish the campaign.
- **Docs**: the engine author keeps `docs/ENGINE_API.md` current (state shape, actions, events, content schemas). Other implementers build against it.
- **Library docs**: when you need current API details for Vite, Preact, Vitest, or Playwright, run `npx ctx7@latest library <name> "<question>"` then `npx ctx7@latest docs <id> "<question>"`.
