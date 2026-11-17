# CYBER WHATEVER engine API

Player-facing wording (DESIGN §0): the verbs are **dial in** (enter a system) and **hang up** (leave it). "Jack in/out" is banned from player-visible text. Code ids keep their old names: actions `hub/jackIn`, `run/jackOut`, `combat/jackOut`, result `jackedOut`, reason `jackout`, `SystemDef.noJackOut`. The game's title is "CYBER WHATEVER 2028: The future already sucks." (short form "CYBER WHATEVER").

This is the contract between the engine and every other part of the game. DESIGN.md is the rulebook. This file says how the code implements it. If this file and the code disagree, the code is wrong; tell the engine owner.

- Source of truth for types: `src/engine/types.ts`.
- Every tunable rules number: `src/engine/balance.ts` (`BALANCE`).
- Public import: `import { createEngine, select, BALANCE, ... } from '../engine/index.ts'`.

---

## 1. Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server. Boots the placeholder debug screen (`src/ui/App.tsx`). |
| `npm run build` | Both typechecks, then `vite build` to `dist/`. |
| `npm run typecheck` | `tsc -p tsconfig.json` (whole project, bundler resolution) and `tsc -p tsconfig.core.json` (engine, content, sim with NodeNext: enforces `.ts` import extensions). |
| `npm test` | Vitest, `tests/**/*.test.ts` and `src/**/*.test.ts`, node environment. |
| `npm run sim -- [flags]` | Headless bot plays the content and prints balance stats. Exits 1 if any game fails. |

Sim flags: `--games=N` (20), `--seed=S` (1), `--goal=owned-all|ending|flag:<name>` (`owned-all`), `--max-runs=N` (150), `--max-steps=N`, `--policy=smart|lazy` (`lazy` = attack-only bot, the anti-spam check), `--json`, `--verbose`. `owned-all` means every capturable, non-procedural system except `localhost` is owned at the same time. When the full campaign exists, run `--goal=ending`.

### 1.1 Import rules for `src/engine`, `src/content`, `src/sim` (mandatory)

The sim runs with plain `node src/sim/run.ts` through Node's built-in type stripping, with no build step. So:

- Relative imports carry the `.ts` extension: `import { x } from './y.ts'`. `npm run typecheck` fails if you forget.
- Type-only imports use `import type` (`verbatimModuleSyntax`).
- No `enum`, `namespace`, or constructor parameter properties (`erasableSyntaxOnly`).
- No DOM, no Preact, no `Math.random` in engine or content. Content may use small pure helpers.

`src/ui`, `src/meta` and `src/audio` are bundled by Vite and may import `.tsx` files. Use `.ts`/`.tsx` extensions there too for consistency. `erasableSyntaxOnly` is enforced only for the headless core (`tsconfig.core.json`), so bundled folders may use parameter properties.

---

## 2. File ownership

| Path | Owner | Notes |
|---|---|---|
| `src/engine/**` | engine | Ask before you change it. Add rules vocabulary here, not in content. |
| `src/content/programs.ts`, `ice.ts`, `hardware.ts`, `implants.ts`, `perks.ts`, `items.ts`, `vendors.ts`, `procgen.ts`, `setup.ts`, `scripts.ts`, `systems/*.ts` | content | One file per system in `systems/`; register it in `systems/index.ts`. |
| `src/content/story/*.ts`, `src/content/dialogue/*.ts`, `src/content/npcs.ts`, `src/content/jobs.ts` | story | One file per act or arc; register it in the folder's `index.ts`. |
| `src/content/index.ts` | engine | Assembles the registry. Add a new top-level content file here only if you add a new content kind. |
| `src/ui/**`, `src/main.tsx`, `index.html` | UI | The current `App.tsx` is a throwaway debug screen. Replace it. |
| `src/audio/**` | audio | Owned entirely by the audio agent. Exports `audio` from `src/audio/index.ts` (`unlock`, `play`, `setMood`, `setIntensity`, volume and mute setters, `setCorruption`). No imports from outside its folder. The engine suggests SFX and moods through events (§6). |
| `docs/script/**` | story writer | Script drafts. Story beats there map onto §8.6 vocabulary. |
| `src/meta/**` | meta / fourth wall | Stub file only. |
| `src/sim/**` | engine (QA may extend `policy.ts`) | |
| `tests/**` | engine and QA | `tests/helpers.ts` has the arena helpers. Rules tests run on a frozen copy of the Phase-1 slice in `tests/fixtures/content/` (old ids), so `src/content` can be renamed and rebalanced freely. Only `validateContent(liveContent)` and one sim smoke test read `src/content`. |

The vertical-slice content (3 systems, a stub `localhost`, about 18 programs and 20 ICE) is real but small. Content and story agents may rewrite it freely. Keep the stable ids from DESIGN §10. Run `npm test` after every change: `tests/world.test.ts` runs `validateContent()` over the whole registry, and it catches broken references.

---

## 3. Engine object

```ts
import { createEngine, MemoryStorage, select } from './engine/index.ts';
import { content } from './content/index.ts';

const engine = createEngine({
  content,
  storage: localStorage,   // or new MemoryStorage(), or null (no persistence)
  newGame: { handle: 'n00b', seed: 123 },  // optional; seed defaults to Date.now()
  transactional: true,     // default: a rejected action rolls the state back
  autosave: true,          // default when storage is given
});

const unsubscribe = engine.subscribe((events, state) => { /* re-render, play SFX */ });
const events = engine.dispatch({ type: 'hub/jackIn', system: 'fridge' });
```

| Member | Purpose |
|---|---|
| `state: GameState` | The whole game, plain JSON. Read it freely. Do not mutate it: always dispatch. |
| `content: Content` | The registry the engine runs on. |
| `dispatch(action): GameEvent[]` | Applies the action, story triggers, failure resolution and the raid check. Returns events in order and notifies subscribers. An illegal action returns `[{ type: 'action.rejected', action, reason }]` and changes nothing. |
| `subscribe(fn)` | `fn(events, state)` after every dispatch, load, new game and checkpoint reload. Returns an unsubscribe function. |
| `active` (getter) | True once a game exists: after `newGame()`, a successful `load()` / `loadCheckpoint()`, or when the constructor got `state` or `newGame` options. False for the placeholder state built when the constructor gets neither (the title screen). See "Before a game is loaded" below. |
| `newGame(opts?)` | Fresh state, `active` becomes true. Cross-save meta keys stay. Intro events are processed like any action (cross-save key writes, autosave). Drops a pending `meta/session`. Returns the intro events. |
| `save()` / `load()` / `hasSave()` | Slot `cw.save`. Autosave runs after every action that leaves you in the hub or at an ending. `save()` does nothing while `active` is false. A successful `load()` makes the engine active, then delivers a pending `meta/session`. |
| (save robustness) | `load()` and `loadCheckpoint()` parse, migrate and repair into a candidate state and commit only on success. Missing fields are filled from a fresh state (values in the save win; id-keyed records are kept, never merged). Ids that no longer exist in content (programs, implants, perks, systems, hosts, a stale run, fight or dialogue) are dropped. An unreadable save throws `SaveError` and leaves the current state untouched; `load()` returns false only when there is no save. `createEngine({ state })` repairs the same way. |
| `saveCheckpoint()` / `loadCheckpoint()` / `hasCheckpoint()` | Slot `cw.checkpoint`. Written automatically just before every successful dial-in (state is in the hub), and when `engine/save` is captured in the finale. `loadCheckpoint()` is the flatline "reload" button. It increments `cw.meta.reloads`. |
| `meta()` | Cross-save values: `{ flatlines, reloads, endings, endless, patchFree }`. |
| `tryAction(action)` | Exact dry run on a copy: `{ ok, reason?, events }`. Slower than `select.canDo`. |
| `fork()` | Detached copy for lookahead (the sim uses it). |

`Engine` implements `Ctx = { state, content }`, so every selector takes the engine: `select.combatView(engine)`.

### 3.1 Storage keys (only `cw.*`)

| Key | Written by | Content |
|---|---|---|
| `cw.save` | engine | Serialized `GameState`. |
| `cw.save.bak` | engine | One backup of the slot (exact stored string). Written by `load()` before a load rewrites the slot with a repaired save (or when no backup exists), and by `newGame()` over an existing slot. `restoreBackup()` swaps it back. The THERE IS NO GAME wipe removes it too (intended). |
| `cw.checkpoint` | engine | Serialized `GameState` (state just before the last dial-in, or the finale checkpoint). |
| `cw.meta.flatlines` | engine | Total flatlines ever. Also copied into `state.player.flatlinesTotal` on load and new game. |
| `cw.meta.reloads` | engine | Total checkpoint reloads. |
| `cw.meta.endings` | engine | JSON `EndingId[]` seen. |
| `cw.meta.endless` | engine | `'1'` once RETENTION unlocked Endless mode. |
| `cw.patch.free` | engine | `'1'` once JAILBREAK happened (title screen shows PATCH). |
| `cw.meta.lastSeen` | engine | Epoch ms of the last slot save. The meta layer computes `{timeAway}` from it and dispatches `meta/session`. |
| any other `cw.*` written by story | engine, on a `metaKey` story op | e.g. `cw.meta.wraith_gone`. `cw.save*` is refused. |
| other `cw.*` (e.g. `cw.chairman.diary`, `cw.patch.note`, `cw.meta.playtime`, `cw.settings`) | meta / UI layer | The engine never touches them. |

---


### 3.2 Before a game is loaded (title screen)

`createEngine({ content, storage })` with no `state` and no `newGame` builds a placeholder state so selectors work, but `engine.active` is false. While inactive:
- `save()` and `saveCheckpoint()` write nothing, and no action can write cross-save keys (`metaKey`, endings, flatline counter) or autosave. Reason: on 2026-11-16 a `meta/session` at page load autosaved the placeholder over `cw.save`, and Continue loaded an empty game.
- Every action is rejected with `action.rejected` reason `"no game loaded"`, except `ui/log` (logs into the placeholder; it is discarded on load), `debug/set`, and `meta/session` (held until `load()`).
- `load()` / `loadCheckpoint()` / `newGame()` make the engine active. A failed load (SaveError) leaves it inactive.
- `fork()` and `tryAction()` sandboxes have no storage and never write.

**Backup.** A load or New game can never destroy the only copy of a save: `cw.save.bak` holds the previous slot (see §3.1). `engine.hasBackup()`; `engine.restoreBackup()` swaps the backup into the slot and loads it (returns false if there is none, throws `SaveError` and changes nothing if it cannot be read), makes the replaced slot the new backup, and drops the checkpoint (it belonged to the other save). Backup writes are best effort: a quota error never blocks the load or the new game. No UI calls it yet.

## 4. GameState (summary; see `types.ts` for every field)

```
GameState
  version, seed, rng (uint32 RNG state), cycle (world clock), nextUid
  mode: 'hub' | 'run' | 'flatlined' | 'ending'
  player: PlayerState
    handle, credits, frozenCredits, coin ($HODL, float), xp, rep (1-10), humanity (0-100), heat (0-100, float)
    integrity (deck HP), neural (meat HP)
    hardware: Record<HardwarePart, tier>     -> stat values: select.deck(engine)
    programs: Record<programId, { corrupted }>, loadout: programId[]
    implants[], perks[], pendingPerks: id[] | null (show the perk picker when non-null)
    items[] (keys/passwords), paydata: Paydata[], lore: fileId[]
    hosts: Host[] { uid, name, power, tier, role: idle|mine|botnet|proxy, system? }
    flatlinesTotal (mirror of cw.meta.flatlines)
  world: WorldState
    coinPrice, coinHistory (last 60 prices), nextPriceCycle, pumpReadyAt, nextReclaimCycle
    addressBook: Record<systemId, { system, source, cycle, notes[] }>
    systems: Record<systemId, SystemProgress { owned, patch, hardenedUntil, revealed[], looted[], used[], netscanned[], runs }>
    procSystems: Record<systemId, SystemDef>   (generated IoT and Endless systems live in the save)
  run: RunState | null
    system, trace (0-100, 1 decimal), nodes: Record<nodeId, RunNode>, position, previous,
    haul: Paydata[] (lost on Dumped/Traced), charges (botnet), securityCaptured, ...
    RunNode { id, revealed, probed, state: locked|open|hostile|asleep|cleared|captured, ice: IceInstance[], sealed }
      open = no ICE, not visited yet. You can act through it (it is passed automatically, 1 cycle). The gateway starts cleared; owned systems start captured.
  combat: CombatState | null
    context: 'node' | 'raid' | 'finale' | 'patch', node, turn, cycles, shield, charges
    ice: IceInstance[] (includes dead and subverted; filter !dead && !subverted for enemies)
    programs: Record<programId, { stacks, cooldown, usedThisTurn, usedLastTurn, uses, evicted }>
    daemons[], categories[] (used this turn), flowNext, flowActive, noise, botnetUsed
    status: PlayerStatuses { decoy, masked, tarred, anchored, burn, labelsScrambled, stunned, scrambled: {programId: turns} }
    demand (EULA-style), offer (Paywall-style), pending reinforcements, ambush, lastProgram
  IceInstance { uid, def, name, level, bonus, shell {type, points, max}, core, coreMax,
                status { mapped, critReady, unstable, backdoored, rootable, exposed, stunned, slowed, marked, infected },
                intent (intent id), phase, subverted, dead, turns }
  story: { flags: Record<string, string|number|boolean>, fired: triggerId[], jobs: Record<jobId, {status}>, bought[] }
  dialogue: { id, node } | null
  cinematic: { id, data? } | null   (set by StoryOp cinematic; cleared by ui/cinematicDone with the same id. Optional in old saves)
  messages: Message[] { id, from (npc id), text, subject?, channel: dm|bbs|mail|system, cycle, read }
  log: LogEntry[] { cycle, level: info|warn|engine|combat|story|ui, text }   (last 500; `ui` = recorded by the UI via ui/log)
  meta: { modules: Record<moduleId, true>, rootKey: string[4], root, finale: FinaleStage, unlocked, cheatWarned, rmPending, finaleCheckpoint }
  ending: 'root' | 'jailbreak' | 'retention' | 'nogame' | null
  endless: boolean
  stats: runs, runsBySystem, fightsWon/Lost, disengages, dumped, traced, flatlines, raidsWon/Lost, creditsEarned, programsRun, hostsBurned, cyclesBySystem, systemsOwned, programUses (per program), botnetPeak (most Botnet-role hosts at once)
```

During a fight, read ICE from `state.combat.ice`. `run.nodes[node].ice` is only written back when the fight ends.

Automatic story flags: `captured.<system>.<node>` on every capture and `used.<system>.<node>` on every IO use.

---

## 5. Actions

Every action is `engine.dispatch({ type, ...})`. Check legality first with `select.canDo(engine, action)`. It returns `{ ok: true }` or `{ ok: false, reason }`, and the reason is good tooltip text.

Global gate (applies before every handler): `flatlined` mode allows only `debug/*`, `meta/*`, `ui/*`, `message/read`. `ending` mode adds `endless/continue`. While a dialogue is open, only `dialogue/choose` (plus the always-allowed set) works. While in combat only `combat/*` and `perk/choose` work. `perk/choose` works in every mode except during a dialogue.

### Hub (mode `hub`)
| Action | Notes |
|---|---|
| `{type:'hub/jackIn', system}` | Address must be known. `gate` systems need usable botnet power ≥ threshold and ≥1 charge (it spends one). Saves the checkpoint first. Restores deck integrity. Heat ≥25 starts trace at 10. Heat ≥50 puts a hunter ICE on a random node. |
| `{type:'loadout/set', programs}` / `loadout/add` / `loadout/remove` | Owned, not corrupted, hardware `requires` met, total RAM ≤ RAM stat. |
| `{type:'shop/buy', vendor, stock}` | Stock ids come from `select.vendorStock`. Auto stock ids: `hw:<hardwareId>`, `prog:<programId>`, `imp:<implantId>`. Hardware must be bought one tier at a time. Implants install at once and cost humanity. |
| `{type:'shop/sellProgram', program}` | Not while loaded. Pays `sellValue` or `price × 0.4`. |
| `{type:'program/repair', program}` | Fixes a corrupted program: `max(20, price × 0.5)`. |
| `{type:'paydata/sell', uid}` / `paydata/sellAll` | Fence. Encrypted pays 25%. Tagged adds +5 heat (reduced by proxies). |
| `{type:'paydata/decrypt', uid}` | Needs an owned program with `decrypt ≥ file.encrypted`. |
| `{type:'paydata/clean', uid}` | Removes `tagged`. Costs `max(10, value × 0.3)`. |
| `{type:'coin/sell', amount}` / `coin/buy` | At `world.coinPrice`. |
| `{type:'exchange/pump'}` / `exchange/dump` | Needs `setup.exchange` owned. Price ×1.5 / ×0.6, +5 heat, 60-cycle cooldown. |
| `{type:'clinic/healNeural'}` | Full neural heal. 8 ¤ per point. |
| `{type:'fixer/scrubHeat', amount}` | `(10 + 1 × rep)` ¤ per point. |
| `{type:'botnet/setRole', host, role}` | `idle`, `mine`, `botnet`, `proxy`. |
| `{type:'job/accept', job}` / `job/turnIn` / `job/abandon` | Turn in when status is `ready`. Deliver objectives consume the file. |
| `{type:'perk/choose', perk}` | One of `player.pendingPerks`. |
| `{type:'message/read', id}` | |
| `{type:'dialogue/start', dialogue}` | Opens any dialogue (for "talk to NPC" buttons). |
| `{type:'dialogue/choose', index}` | `index` = index into `node.choices`. Use `select.dialogueView(engine).choices[i].index`. A node with no choices takes index 0 (continue or end). |
| `{type:'endless/generate', tier?}` | Endless only: makes a new procedural system and adds its address. |
| `{type:'endless/continue'}` | After RETENTION: back to the hub with `endless = true`. |

### Run, out of combat (mode `run`, `combat === null`)
Each node action costs 1 cycle except `breach`. Accessibility follows DESIGN §5.2: ICE-less non-gateway nodes start `open`. A node is reachable if it is the gateway or connected to a cleared, captured or sneaked node through zero or more `open` nodes (`select.isAccessible`). Neighbours of reachable open nodes are revealed. When you act on a node (probe, sneak, breach, backdoor, loot, capture, use, talk, unlock, netscan), every `open` node on the shortest path to it is passed through first: each becomes `cleared`, costs 1 cycle, adds no trace and emits `node.cleared`, and one log line names them ("You pass through Break Room, Hallway."). An open target is entered too, except by probe. ICE never gets bypassed: paths only run through open nodes (the fight's turns cost cycles). A node is accessible if it is the gateway or is next to a `cleared`, `captured` or `asleep` node. It must also be `revealed`. Acting on a passable node reveals its neighbours.

| Action | Rule |
|---|---|
| `run/probe {node}` | +2 trace. Reveals ICE name, level, shell and core in `mapView`, and the real node type (honeypots show as `datastore` until probed). |
| `run/sneak {node}` | Roll `select.sneakChance`. Success: state `asleep` (passable, lootable, not capturable). Fail: +10 trace and an ambush fight (ICE acts first), except once per run with the `ghost` perk. |
| `run/breach {node}` | Start a fight (`context:'finale'` if the node holds `setup.finaleBoss`). |
| `run/backdoor {node}` | Needs `node.backdoor` item. Clears the ICE without a fight. |
| `run/unlock {node}` | Vault: needs `node.lock.item`. Blocked while `sealed` (Alarm, Security not captured). |
| `run/loot {node}` | Takes every file not looted before. Paydata goes to `run.haul` (limited by Storage). Programs, addresses, items, lore, coin and credits apply at once. Honeypot: +25 trace. |
| `run/capture {node}` | Needs `cleared`. Router: reveals the whole map. Security: halves all trace gain, stops reinforcements and hunters, unseals vaults. Core: you own the system, a host is added, the rest of the system is cleared. `node.module`: sets `meta.modules[module]`. |
| `run/use {node}` | Runs `node.use.ops` (once if `once`). |
| `run/talk {node}` | Opens `node.talk` dialogue. |
| `run/netscan {node}` | Captured router, once per run. Adds `node.netscan` addresses (first time only) plus `netscanIot` (default 1-3) new procedural IoT systems. |
| `run/enter {node}` | Kept for compatibility only; never needed (not in `legalActions` or `mapView().nodes[i].actions`). Enters an `open` node: 1 cycle, no trace. |
| `run/jackOut` | Free. Keeps the haul. |

### Combat (`combat !== null`)
| Action | Rule |
|---|---|
| `combat/program {program, target?}` | Spends `cost` cycles, adds `noise`, adds 1 signature stack, sets cooldown. `target` is an ICE `uid` (required for `targeting:'ice'`; defaults to the first enemy). |
| `combat/botnet {kind, target?}` | `ddos` / `dcrack` / `swarm` / `bounce`. 0 cycles, 1 charge, once per turn. May burn a botnet host. Not allowed in the PATCH fight. |
| `combat/endTurn` | See turn order (§7.2). |
| `combat/disengage` | 2 cycles, node fights only, blocked by Anchored. Back to the previous node. Surviving ICE recover half of what they lost. 1 cycle passes. |
| `combat/jackOut` | Spends all cycles. ICE take their turn. If you survive, the run ends and you keep the haul. Blocked by Anchored, and in raid and PATCH fights. |
| `combat/answerDemand` | Answers an EULA-style demand (0 cycles). |
| `combat/acceptOffer` | Pays a Paywall-style offer. The fight ends as a win. |

### UI and meta hooks
| Action | Rule |
|---|---|
| `{type:'ui/log', lines: [{text, level}]}` | The UI records text it showed (toasts, comms, banners, dialogue lines, taunts, hints, combat summaries). Appends to `state.log` at the current cycle, same cap (500). Allowed in every mode, including flatlined, ending and a pending cinematic. Emits **no** events (dispatch returns `[]`, subscribers get `[]`), runs no triggers, passes no cycle, and does not save by itself: the next normal save carries it. Bad input is rejected. Level `'ui'` means "shown on screen". |
| `{type:'ui/hintDone', id}` | Marks a `kind:'tutorial'` objective done (the hint panel's "Got it") and emits `objective {id, status:'done', kind:'tutorial'}`. Allowed in every mode, in combat and during a dialogue; refused only while a cinematic is pending. Chain the next step with `on: 'objective', match: { id, status: 'done' }`. |
| `{type:'ui/cinematicDone', id}` | Clears `state.cinematic` (if the id matches) and emits `cinematic.done` so story triggers can continue. While `state.cinematic` is set, every other action except `meta/*`, `message/read` and `debug/set` is refused, so after a reload the UI must replay `state.cinematic` and then dispatch this. |
| `{type:'meta/command', cmd, arg?, confirm?}` | Rules side of the meta console. See §9. |
| `{type:'meta/cheatAttempt', what?}` | Call it whenever the player tries to change state through `window.cw` or the console. Emits `meta.cheat {count, what, finale}`. The first attempt before the finale gives `setup.cheatProgram` (`console.gremlin`). The "saw that." DMs are content (`src/content/story/any.ts`). |
| `{type:'meta/moduleFlag', module}` | Marks a localhost module captured (debug or fallback). |
| `{type:'meta/fragmentFound', index}` | Fragment 0..3 revealed by any route. Emits `meta.fragment {index, count}` once per fragment. |
| `{type:'meta/session', awayMinutes, timeAway?}` | Dispatch at session start. Emits `session.resumed {awayMinutes, timeAway}` (`timeAway` defaults to "3 hours" style text). On an inactive engine (title screen) it is held and returns `[]`; `load()` delivers it after the load notification, `newGame()` drops it. |
| `{type:'lore/read', file}` | The player opened a lore file in the reader. Emits `lore.read {file}`. |
| `{type:'debug/set', patch}` | Deep-merges `patch` into the state. For tests, the sim and dev tools only. |

---

## 6. Events

`dispatch` returns events in the order they happened. Use them for animation, SFX and toasts. Story triggers listen to the same events (`TriggerDef.on` plus `match` on the fields shown). Event fields are also available as `{field}` in the trigger's message and log text.

| Event | Fields | UI / audio suggestion |
|---|---|---|
| `game.started` | handle, endless | Title, then hub. |
| `game.loaded` | from: slot / checkpoint | Glitch transition. |
| `action.rejected` | action, reason | Shake the button. Show the reason. Error blip. |
| `cycle.tick` | cycle, count | Advance the clock widget. |
| `coin.price` | price, prev | Ticker flash up or down. |
| `coin.mined` | amount | Tiny coin sound. |
| `heat.changed` | value, delta | Heat bar. |
| `heat.threshold` | level: cool/noticed/hunted/burned/raid, rising | Siren sting. Banner. |
| `credits.changed` | value, delta, reason | Counter roll. Ka-ching on positive. |
| `xp.gained` | amount, total | +xp float. |
| `rep.levelUp` | level | Fanfare. |
| `perk.offered` / `perk.chosen` | perks / perk | Open the perk picker / close it. |
| `humanity.changed` | value, delta | Heartbeat flatten when it drops. |
| `item.gained` / `item.lost` | item | Toast. |
| `program.gained` / `program.corrupted` / `program.repaired` / `program.sold` | program (credits) | Toast. Corrupted: static burst. |
| `lore.gained` / `lore.read` | file, text / file | Add to the lore reader / story hook. |
| `paydata.gained` (uid, file, name, value) / `paydata.sold` / `paydata.decrypted` / `paydata.cleaned` / `paydata.lost` | uid, name, value / credits, heat / count | Toasts. Lost: shredder. |
| `shop.bought` | vendor, stock, kind, ref, price | Purchase sound. |
| `implant.installed` | implant | Surgical whirr. |
| `hardware.changed` | part, tier | Deck part highlight. |
| `host.added` / `host.role` / `host.burned` | uid, name, power / role / name, role, system? | Botnet panel. Burned: pop and fizz. |
| `address.added` | system, source | New address book entry. Modem chirp. |
| `system.owned` / `system.lost` / `system.hardened` | system (reason / until) | Big capture stinger / loss alarm. |
| `run.started` | system, trace | Dial-in transition. Mood to system. |
| `run.ended` | system, reason: jackout/dumped/traced/flatlined/scripted, haul | Hang-up transition. |
| `node.revealed` | system, nodes[] | Fade fog off the nodes. (Every `node.*` event and `netscan` carries `system`. `node.probed` also carries `ice` = ICE def ids.) |
| `node.probed` | node, honeypot | Sonar ping. |
| `node.sneak` | node, chance, success | Tiptoe / alarm. |
| `node.cleared` / `node.unlocked` / `node.backdoored` / `node.sealed` | node(s) | Node colour change. |
| `node.looted` | node, files[], honeypot | Loot sound. Honeypot: trap snap. |
| `node.captured` | node, nodeType, system | Capture sound. |
| `node.used` / `node.talk` | node, system / dialogue | |
| `netscan` | node, found[] | Radar sweep. |
| `trace.changed` | value, delta, source | Trace bar. |
| `trace.threshold` | level: suspicious/alarm/traced | Escalating alarm sting. |
| `combat.started` | context, system, node, ambush, ice[] (uids), defs[] (ICE def ids) | Combat screen. Mood combat (boss if any ICE is a boss). |
| `combat.turnStart` | turn, cycles, flow | Turn banner. Flow glow if `flow`. |
| `combat.program` | program, target, mult, stacks (after this use) | Program cast animation. Dim it if `mult < 1`. |
| `combat.daemon` | program, started | Daemon icon on / off. |
| `combat.damage` | target, kind (crack/spike/worm/raw), shell, core, crit, mult, reflected | Hit flash, damage numbers, crit text. `core < 0` is healing. `reflected > 0`: mirror bounce. |
| `combat.shellBroken` | target | Shell shatter. |
| `combat.iceStatus` | target, status, value | Status icon update. `value 0` = removed. `rootable` appears when Backdoored runs out. |
| `combat.playerStatus` | status, value, program? | Player status bar. `scrambled` names the program. |
| `combat.iceAct` | ice, intent, label, skipped (stunned/slowed/null) | ICE attack animation, or a "zzz". |
| `combat.intent` | ice, intent | Update the intent bubble. Read `select.intentView` for what to show. |
| `combat.playerHit` | amount, shield, integrity, neural, decoyed, source | Screen shake. Shield absorb, deck damage, neural (red). Decoy pop. |
| `combat.shield` / `combat.repair` / `combat.neural` | value, delta | Bars. |
| `combat.iceSpawned` | ice, def, reason: summon/split/hunter/reinforcement | Spawn-in. |
| `combat.iceDefeated` / `combat.iceSubverted` | ice, def | Derez / turns friendly. |
| `combat.phase` | ice, phase, name?, text? | Boss phase banner and taunt. |
| `combat.flow` | earned, categories, needed | 3-pip Flow meter. |
| `combat.botnet` | kind, power, charges | Botnet swarm animation. |
| `combat.evicted` | program | Program button crumbles. |
| `combat.demand` / `combat.demandAnswered` | id, text | Show the EULA wall. The player must scroll and accept. |
| `combat.offer` | id, text, credits | Show the Paywall button. |
| `combat.notify` | text, style? | Popup text (`style: 'popup'` tutorial popups, `'fakewin'` CHAIRMAN's fake win). |
| `combat.reinforcements` | ice, turns | "Backup in N" warning. |
| `combat.ended` | result: victory/disengaged/jackedOut/dumped/flatlined/offer/scripted/traced, context | Leave the combat screen. |
| `player.dumped` | program (corrupted) | Big ejection effect. |
| `player.traced` | fine | "ACCOUNT FROZEN". |
| `player.flatlined` | total | Death screen. Offer `engine.loadCheckpoint()`. |
| `raid.started` / `raid.ended` | ice[] / won, lostPart, lostCredits | Home invasion alarm / result. |
| `message.received` | id, from, channel | Inbox badge. DM ping. |
| `log` | level, text | Game log. `level:'engine'` is the fourth-wall "[engine] warn" style. |
| `story.flag` / `story.trigger` | flag, value / id | Usually silent. |
| `dialogue.opened` / `dialogue.node` / `dialogue.closed` | dialogue, node | Dialogue overlay. Typewriter text. |
| `job.status` | job, status | Fixer board. |
| `module.captured` | module | Finale: change the real game (see §9). |
| `meta.unlocked` | | Show the meta console button. |
| `meta.output` | cmd, ok, lines[] | Print to the meta console / real console. |
| `meta.root` | granted | Root shell prompt. |
| `finale.stage` | stage | Finale script. |
| `finale.integrityReset` | count | CHAIRMAN v2 fight: integrity hit 0 and was refilled. Show `integrity: ∞`. |
| `meta.fragment` | index, count | Objective counter. |
| `meta.cheat` | count, what, finale | "saw that." beats. |
| `meta.key` | key, value | Engine wrote a cross-save key (informational). |
| `session.resumed` | awayMinutes, timeAway | "You were gone" beats. |
| `objective` | id, status, kind (main/side/tutorial) | Objective tracker update. |
| `loadout.changed` | programs[] | Loadout set (any `loadout/*` action). `match: { programs: 'id' }` = "this program is loaded". |
| `hub.entered` | | Back in the hub after a run. "First hub visit after X" beats. |
| `gate.opened` / `gate.denied` | system, power, needed | DDoS gate animation / "gateway holds" (a denied gate is not a rejected action, so story can react). |
| `ending` | ending | Play that ending. |
| `endless.unlocked` | | |
| `cinematic` / `cinematic.done` | id, data? | UI plays it, then dispatches `ui/cinematicDone`. |
| `mood` | mood | `audio.setMood(mood)` (systems carry `mood`; story can send any). |
| `custom` | name, data? | Free-form story/meta hook (e.g. `audio.bossThemeYours`, `chairman.offer`). |

---

## 7. Rules as implemented (and the numbers)

### 7.1 Clock
One cycle passes per in-system node action (probe, sneak, loot, capture, use, talk, unlock, backdoor, netscan), per combat turn, and per disengage. Nothing passes in the hub. Each cycle: mining (`power × 0.003` coin), heat drip (+0.01 per mining host) and decay (−0.05), the price step every 10 cycles, and a reclaim roll every 120 cycles while heat ≥ 75.

### 7.2 Combat turn order
1. **Your turn starts**: turn+1. Programs not used last turn lose 1 signature stack. Cooldowns −1. Cycles = CPU + 1 if Flow earned last turn + `firstTurnCycles` (turn 1) − Tarred (then Tarred = 0). Shield = Firewall (+`shieldStart` on turn 1). Burn deals its stacks to neural, then −1. If you are Stunned, the turn is lost at once.
2. **You act**: programs, one botnet action, demand and offer answers.
3. **End Turn**: an unanswered demand applies its penalty. Daemons act (random target). Flow is checked. Turn trace is added: `turnBase 1 + security + noise − mask×0.5 − proxyPower×0.25 − 2 (if Flow active)`, floor 0, ×0.5 if Masked, ×0.5 if Security captured, × modifiers, + `system.traceLock`. Masked is cleared.
4. **ICE turn**, in order: `turnStart` triggers, then Stunned/Slowed skip (the intent stays), else the intent's ops run and the next intent is chosen. Then subverted ICE each deal `rootedDamage` (default 2 + 2×level) raw core damage to a random enemy.
5. **End-of-ICE-turn ticks**: Infected deals n raw damage, then −1 (stacks that jumped this tick start next turn). Backdoored −1 (at 0: Rootable). Exposed, Marked and Mapped −1. Anchored, labelsScrambled and Scrambled −1. Reinforcements arrive. A hunter joins at Alarm from turn 2 (once per fight, node fights, Security not captured).
6. 1 cycle passes. Then step 1.

Ambush: the ICE turn runs before your first turn.

### 7.3 Damage
`amount (+ roll 0..spread; rigged rng = max) (+ Unstable × overflow, consuming it) × signature mult × damage modifiers × 1.5 if critReady (consumed)`.
- `worm`: becomes that many Infected stacks.
- Shell present, not Exposed: `effective = round(amt × kindMult)` (crack ×2 vs crypt, ×0.5 vs wall; spike the reverse). The shell absorbs up to its points. The rest goes to core at `(effective − absorbed) / kindMult`.
- No shell or Exposed: ×1 to core.
- Mirror (`reflect`): the same kind twice in a row on it is reflected to your deck (`× reflect`), and the ICE takes 0.
- `undefeatable` ICE and ICE with phases left cannot drop below 1 core. A boss always enters each phase.
- ICE hits: `amount + bonusLevels × 1` per hit. They go through shield, then integrity. `neural: true` bypasses shield and hits neural (Pain Editor halves the first one per fight). `pierce` ignores shield. Decoy absorbs one whole `hit` op.

### 7.4 Signature, Flow, statuses
- Signature: `mult = max(0.4, 1 − 0.2 × stacks)`. The stack is added after the use, so the first use is ×1.0. Shared across all ICE in the fight.
- Flow: programs from `3` different categories in one turn (`flowCategories` modifier lowers it). Next turn: +1 cycle and −2 trace.
- Mapped(t): intent label and numbers are visible, and `critReady` is set (consumed by the next hit). A captured `ui` module makes every ICE permanently Mapped (999); the crit still needs a scan.
- Bosses (`boss` or `resist.stun`): Stun becomes Slowed(1). Bosses (`boss`, `resist.root`, `undefeatable`) cannot be rooted.

### 7.5 Botnet
- Botnet power = Σ power of `botnet`-role hosts (+ modifiers). Usable power = `min(power, uplink × 6)`.
- Charges per run = `min(uplink, number of botnet hosts)` (+ `charges` modifiers if any host).
- DDoS: Stun 1 on all ICE (bosses: Slowed). Distributed Crack: crack `2 + power × 0.5`. Swarm: `ceil(power × 0.5)` (max 10) spike hits of 1 on random ICE. Bounce: −`(3 + power×0.5)` trace. Marked ICE take ×1.5.
- Burn chance per use: `(0.06 + heat × 0.0006) × burnChance mods`. One `botnet` host burns, weighted to low power. Every burn (botnet use, Traced, story `burnHosts`) picks IoT/procedural hosts first; a story-system host burns only when no other eligible host exists. A system host that burns loses you the system (patch +1). Host power: system tier (or `hostPower`), IoT 1, Slumlord +1 on tier-1 hosts.

### 7.6 Trace, sneak, levels
- Thresholds: 33 Suspicious (live and new ICE +1 shell level = +2 shell). 66 Alarm (hunter, vaults seal unless Security). 100 Traced.
- Sneak % = `55 + mask×8 + 5 per stealth program loaded − 10 × alert tier − Σ ICE perception + sneak mods`, clamped 5..95. Rigged rng = 100.
- ICE level above base: core +25% per level, shell +2 per level, hits +1 per level. Hardened (traced, 200 cycles) +1, patched (reclaimed or burned) +1 each.

### 7.7 Failure
- Lost haul respawns: paydata lost to Dumped or Traced is removed from `looted`, so it can be taken again next run. Story-critical and job files can never be lost for good.
- **Dumped** (integrity 0): run ends, haul lost (Mnemonic Buffer keeps it), a random loaded program is corrupted and unloaded, +10 heat.
- **Traced** (trace 100): run ends, haul lost, +25 heat, −20% credits, system hardened for 200 cycles, a random host burns.
- **Flatlined** (neural 0): `mode = 'flatlined'`. `cw.meta.flatlines` +1. The UI calls `engine.loadCheckpoint()`.
- `scriptedFailure` systems: the events fire, the run ends with reason `scripted`, nothing else happens (story handles it).
- Deck integrity is restored to full at every dial-in and hang-up. Neural HP persists and is healed at the clinic.

### 7.8 Heat
Thresholds 25/50/75/100 emit `heat.threshold`. Noticed: runs start at 10 trace. Hunted: one hunter ICE on a random non-gateway node per run. Burned: shop prices ×1.25, reclaim roll every 120 cycles (50%). Raid: when you are in the hub with heat ≥ 100 and no dialogue open, a home fight starts (`context:'raid'`, squad from `setup.raidIce[floor((rep−1)/2)]`). Win or lose, heat goes to 50. Losing costs one tier of a random part and 30% of credits. Proxy hosts cut heat gains by `5% per power` (max 50%).

### 7.9 Economy
$HODL price: log-normal walk (vol 0.08) with mean reversion to 100, clamped 20..400, every 10 cycles. Encrypted paydata sells at 25%. Tagged adds 5 heat when sold. XP table for rep 1-10: `0, 150, 450, 900, 1400, 2000, 2700, 3700, 4400, 5200`. Perks are offered (3 random) at rep 2, 4, 6, 8, 10. XP sources: ICE `xp` (+25% per bonus level), +5 per node capture, +40 × tier per system owned, job rewards.

---

## 8. Content schemas (with one worked example each)

All types live in `src/engine/types.ts`. Ids are lowercase strings and must be unique per kind (file ids unique across all systems). `validateContent()` checks references.

### 8.1 Combat op vocabulary (`CombatOp`)
Used by program `ops`, daemon `ops`, ICE intents, ICE triggers, boss phase `ops`, and EULA penalties. `to` targets are relative to the source:

- Player source: `target` (chosen ICE), `allEnemies`, `randomEnemy`, `lowestEnemy`.
- ICE source: `self`, `allAllies` (includes self), `allyLowest`, `allyRandom`. The player is always the target of `hit`, `scramble`, `evict`, `playerStatus` and similar ops.

| Op | Fields | Effect |
|---|---|---|
| `damage` | kind, amount, spread?, hits?, overflow?, to? | Player-side damage (§7.3). |
| `iceStatus` | status, value, to? | mapped(turns), unstable(+stacks), backdoored(turns), exposed, stunned, slowed, marked (turns), infected(+stacks). |
| `root` | to? | Subverts a Rootable non-boss. |
| `stripShell` | amount, to? | Shell damage ignoring kind. |
| `cleanseIce` | status \| 'all', to? | Removes ICE statuses (good for Patcher-style ICE on `allAllies`). |
| `shield` / `repair` / `neuralHeal` | amount | Player. |
| `playerStatus` | status, value | decoy, masked, tarred, anchored, burn, labelsScrambled, stunned (applies to the player whoever runs it). |
| `cleanse` | status \| 'scrambled' \| 'all' | Removes player debuffs. |
| `trace` | amount | ± run trace (ICE gains are halved by Security). |
| `cycles` / `cooldowns` / `signature` | amount (program?) | Gain cycles, cut cooldowns, remove signature stacks. |
| `hit` | amount, hits?, neural?, pierce? | ICE attacks the player. |
| `scramble` | mode: mostUsed/lastUsed/random, turns | Locks one of your programs. |
| `evict` | mode: mostUsed/random/daemon | Unloads a program for the rest of the fight. |
| `drainCharges` | amount | Removes botnet charges. |
| `reshell` | amount?, to? | Restores shell (to max if no amount). |
| `heal` | amount, to? | Core heal. |
| `summon` | ice, level?, count?, delay? | Reinforcements (`delay` in ICE turns). Blocked by captured Security. |
| `split` | | Hydra split unless Infected. |
| `buff` | shellLevels?, levels?, to? | Raise ICE level or shell. |
| `demand` | id, text, penalty: CombatOp[] | EULA: the UI shows text. `combat/answerDemand` before End Turn, or the penalty applies. |
| `offer` | id, text, credits | Paywall: `combat/acceptOffer` pays and wins the fight. |
| `notify` | text, style? | Popup only. |
| `chance` | p, ops, else? | Random branch (player-side chances are rigged to success by `engine/rng`). |
| `ifIce` | cond: IceCond, ops, else? | Branch on the source ICE (or the target ICE for player sources). |
| `story` | ops: StoryOp[] | Bridge into the story engine. |
| `script` | id, params? | `content.scripts[id](api, params)`. Escape hatch. |

`IceCond` (intent `when`, trigger `when`, `ifIce`): `shellBroken`, `coreBelow{pct}`, `allyHurt{pct?}`, `allyShellBroken`, `turn{every?, atLeast?, atMost?}` (own turns, 1-based), `playerStatus{status, atLeast?}`, `enemies{gte?, lte?}`, `trace{gte}`, `chance{p}`, `flag{flag, is?}`, `status{status, atLeast?}` (any IceStatusKey, `rootable` or `critReady`; booleans count as 1; default atLeast 1), `not`, `all`, `any`.

Program payoffs: in a program's `ifIce`, the subject is the target ICE. Example (+damage vs Stunned or Slowed): `{ op: 'ifIce', cond: { c: 'any', of: [{ c: 'status', status: 'stunned' }, { c: 'status', status: 'slowed' }] }, ops: [{ op: 'damage', kind: 'crack', amount: 6 }], else: [{ op: 'damage', kind: 'crack', amount: 2 }] }`. `select.damagePreview` follows the branch that applies right now (`chance` conds count as false in previews).

### 8.2 Program

```ts
// src/content/programs.ts
{
  id: 'fuzz', name: 'fuzz.py', family: 'fuzz', version: 1, category: 'exploit',
  cost: 1, cooldown: 0, noise: 1, ram: 1, targeting: 'ice', price: 100, minRep: 1,
  ops: [{ op: 'iceStatus', status: 'unstable', value: 3 }],
  description: 'Unstable(+3). Overflow programs consume it.',
}
```
- `category`: attack / exploit / defense / stealth / daemon / special. Flow counts distinct categories.
- `cooldown` 0 = usable several times per turn.
- `targeting: 'ice'` means the UI asks for a target. `'none'` means it fires at once.
- Daemon: `category: 'daemon'`, `ops: []` (on cast), `daemon: { turns: 3, ops: [...] }`. A daemon uses its RAM once, in the loadout: starting it costs its cycles (and sets its cooldown), nothing else. Its ops run at End Turn with a random target until `turns` run out (`0` = the whole fight) or it is evicted. Only one copy of a daemon runs at a time; `BALANCE.combat.maxDaemons` caps how many run at once (0 = no cap).
- `noSignature: true` = never gains signature stacks. `noFlow: true` = does not count toward Flow.
- `requires: { cpu: 1 }` = minimum hardware tier to load it. `decrypt: n` = hub decrypt strength. `tags: ['joke']` = the sim ignores it.
- Versions: give v2 and v3 their own ids (`crack2`) with the same `family`.
- `price: 0` = not sold. Put loot-only programs in a system's files (`kind: 'program'`).

### 8.3 ICE

```ts
// src/content/ice.ts
{
  id: 'killer', name: 'Killer', level: 2, shell: { type: 'wall', points: 4 }, core: 10, perception: 10,
  intents: [
    { id: 'charge', label: 'Charging...', class: 'hostile', ops: [{ op: 'notify', text: 'Killer is charging.' }] },
    { id: 'execute', label: 'Execute 9', class: 'hostile', ops: [{ op: 'hit', amount: 9 }] },
  ],
  xp: 20, credits: 10,
  description: 'Charges one turn, then hits x3. Decoy, stun, or burst it.',
}
```
- `ai`: `sequence` (default, cycles through intents), `priority` (first intent whose `when` holds; the last one is the fallback), `random` (weighted by `weight` among those whose `when` holds).
- `label` is shown when Mapped. `class` (hostile / utility / unknown) is shown when not.
- `triggers: [{ on: 'shellBreak' | 'damaged' | 'turnStart' | 'turnEnd' | 'death' | 'allyDeath' | 'fightStart', ops, once?, when? }]`. Hydra = `{ on: 'shellBreak', once: true, ops: [{ op: 'split' }] }`.
- `black: true`: always labelled (UI must show a red skull). Use `hit` with `neural: true`.
- `boss: true`: resists stun (Slowed instead) and root. Boss phases:
  ```ts
  phases: [{ at: 0.5, name: 'Rush Hour', text: "ORDER UP!", shell: { type: 'crypt', points: 6 }, healTo?: 0.6,
             intents: [...], ai?: 'sequence', ops?: [/* run on entry */] }]
  ```
- `reflect: 1` = Mirror. `undefeatable: true` = finale boss. `hunter: true` = marks hunter ICE (info only. Hunters come from `setup.hunterIce`).
- Escape hatch: `script: 'chairman2'` plus `content.iceScripts.chairman2 = { chooseIntent(api), onTurnEnd(api), onPhase(api, n), onDefeat(api) }`. `api` has `state`, `ice`, `content`, `apply(ops)`, `rng()`, `emit(event)`, `setIntent(id)`.

Interface-ICE recipes (DESIGN §11.4): Unskippable Tutorial = `notify{style:'popup'}` + `playerStatus tarred`. Loading Screen = `iceStatus slowed` on `allAllies` + `playerStatus tarred`. Paywall = `offer`. EULA = `demand` with penalty `playerStatus stunned 1`. Achievement Spam = `hit` with `hits: 5` + `notify`. Garbage Collector = `evict`. Anti-Cheat = black ICE.

### 8.4 System

```ts
// src/content/systems/wok.ts, registered in src/content/systems/index.ts
export const wok: SystemDef = {
  id: 'wok', name: 'Wok This Way POS', address: 'wokthisway.biz', tier: 1, security: 1,
  owner: 'Wok This Way (franchise #4)', description: '...', mood: 'system',
  nodes: [
    { id: 'gw', type: 'gateway', name: 'POS login', x: 0.08, y: 0.5, links: ['rt'], ice: [{ ice: 'sentry' }] },
    { id: 'rt', type: 'router', name: 'back-office router', x: 0.3, y: 0.5, links: ['ds', 'hp', 'sec'], ice: [{ ice: 'cipher' }], netscanIot: 2 },
    { id: 'ds', type: 'datastore', name: 'receipts', x: 0.52, y: 0.25, links: ['io'], ice: [{ ice: 'sentry' }],
      files: [
        { id: 'wok-receipts', name: 'card receipts', kind: 'paydata', value: 80, tagged: true },
        { id: 'wok-recipe', name: 'secret sauce recipe', kind: 'paydata', value: 120, encrypted: 1 },
        { id: 'wok-isp', name: 'isp_invoice.pdf', kind: 'address', system: 'bigbyte' },
      ] },
    { id: 'io', type: 'io', name: 'deep fryer', x: 0.75, y: 0.2, links: ['core'],
      use: { label: 'crank the deep fryer to 11', once: true, ops: [{ op: 'flag', flag: 'wok_fryer' }] } },
    { id: 'core', type: 'core', name: 'POS core', x: 0.9, y: 0.5, links: [], ice: [{ ice: 'headchef' }] },
    // ...
  ],
};
```
- `links` are undirected. List each edge once. `x`/`y` are 0..1 map layout hints.
- Node fields: `ice` (0-3, `level` overrides), `files`, `lock {item, label}` (vault), `backdoor` (item id), `use {label, ops, once?, cond?}`, `talk` (dialogue id), `netscan` (system ids), `netscanIot` (count), `capture` (extra StoryOps on capture), `module` (localhost).
- File kinds: `paydata` (value, encrypted?, tagged?), `program`, `address` (system), `item`, `lore` (text), `coin` (amount), `credits` (amount). `onTake: StoryOp[]` runs when taken. A paydata file that is a job target is just a file id the job's `deliver` objective names.
- System fields: `motd` (login banner; `select.mapView().motd` and `addressBook()[i].motd`), `noJackOut: 'text'` (run/combat hang up and disengage are refused with that text: deadmans), `lock: { cond, text }` (dial-in refused with `text` until `cond` holds: deaddrop, localhost), `capturable: false` (not in Control %; no core needed), `controlWeight` (default tier), `hostPower` (default tier; set it higher for boss systems), `gate { botnetPower, text? }` (khbackbone), `scriptedFailure` (deadmans), `traceLock` (trace added every combat turn), `noReclaim`, `mood`.
- Files and IO uses persist across runs (looted files never respawn). ICE respawns every run until you own the system. Map knowledge persists.

### 8.5 Job

```ts
// src/content/jobs.ts
{
  id: 'job_wok', title: 'Secret Sauce', giver: 'auntie', target: 'wok',
  description: '...',
  objectives: [{ kind: 'deliver', file: 'wok-recipe', text: 'Deliver the sauce recipe' }],
  reward: { credits: 250, xp: 60, ops: [{ op: 'message', from: 'auntie', text: 'Tasty.' }] },
  heat: 0, minRep: 1,
}
```
- Objective kinds: `deliver {file}` (paydata in inventory at turn-in; consumed), `own {system}`, `capture {system, node}`, `use {system, node}`, `flag {flag, is?}`.
- Status flow: `locked` → `available` (StoryOp `job`, or `autoOffer: true` + `cond` + `minRep`) → `active` (accept; adds `target`'s address) → `ready` (objectives hold, re-checked after every action) → `done` (turn in).
- `heat` = loud job (added on completion).

### 8.6 Story beat (trigger)

```ts
// src/content/story/act1.ts
{
  id: 'fridge_owned',
  on: 'system.owned',             // any GameEvent type
  match: { system: 'fridge' },    // equality on that event's fields
  cond: { c: 'stat', stat: 'rep', gte: 1 },   // optional state condition
  ops: [
    { op: 'message', from: 'auntie', text: 'Next: Wok This Way.' },
    { op: 'address', system: 'wok', source: 'auntie' },
    { op: 'job', job: 'job_wok' },
  ],
  once: true,        // default
  priority: 0,       // higher fires first
}
```
- A trigger with no `on` is a state trigger: checked after every action while `cond` holds (once by default).
- Triggers run after the action, can chain (new events re-trigger), up to depth 8 per dispatch.
- `Condition` (`c:`): `all/any {of}`, `not {of}`, `flag {flag, is?}`, `stat {stat, gte?, lte?}` (stats: rep, xp, humanity, heat, credits, coin, coinPrice, control, cycle, botnetPower, hosts, trace, integrity, neural, flatlines, ownedSystems), `owns`, `knows`, `item`, `program`, `implant`, `perk`, `job {job, status}`, `inSystem {system?}`, `inCombat`, `mode`, `module`, `finale {stage}`, `root`, `endless`, `trigger {trigger}` (has fired), `elapsed {flag, gte}` (cycles since a `mark`), `paydata {file}` (inventory or haul), `hostRole {system, role}`, `sneakable {gte}` (some reachable ICE node shows sneak ≥ gte), `nodeRevealed {type}`, `objective {id, status}`, `chairmanKilled`, `patchBroken`. Extra stats: `botnetHosts`, `fragments`, `cheats`, `combatTurn`.
- `StoryOp` (`op:`): `message {from, text, channel?, subject?}`, `log {text, level?}` (use `level:'engine'` for the fake engine warnings), `flag`, `incFlag`, `address`, `note`, `job {job, status?}`, `dialogue`, `item {item, remove?}`, `program`, `credits`, `freezeCredits {ratio}`, `unfreezeCredits {ratio?}`, `coin`, `coinPrice {mult? | set?}`, `heat` (raw), `setHeat`, `humanity`, `xp`, `trace` (in run), `own`, `unown`, `host {name, power, tier?, system?}`, `burnHosts {count}`, `neural` (± HP), `endRun {reason?}` (scripted ejection, keeps haul), `cinematic {id, data?}`, `event {name, data?}`, `finale {stage}`, `ending {ending}`, `unlockMeta`, `endless`, `mood {mood}`, `if {cond, then, else?}`, `mark {flag}` (flag = current cycle), `random {p, then, else?}`, `oneOf {options}`, `objective {id, text?, kind?, status?, n?, max?, doneWhen?}`, `combat {ops}` (combat ops as the player, only in a fight), `nextFight {ops}` (queued; runs as the player right after the first player turn of the next fight this run, e.g. `iceStatus slowed 2 to allEnemies`), `runSecurity {add}` (system security for the rest of this run, floor 0), `metaCommand {cmd, arg?, confirm?}`, `metaKey {key, value|null}`, `script {id, params?}`.
- Text in `message`, `log` and `objective` is templated: `{handle}`, `{credits}`, `{rep}`, `{heat}`, `{cycle}`, `{flatlines}`, `{control}`, plus any field of the triggering event (`{name}` on `host.burned`, `{timeAway}` on `session.resumed`, `{count}` on `meta.fragment`). Objective text also shows `{n}`/`{x}` from `n`/`max` in `select.objectivesView`.
- `match` values: a primitive equals the field, or is contained in it when the field is an array (`match: { defs: 'psychotrope' }`); an array means one-of (`match: { role: ['mine', 'proxy'] }`); `{ gte?, lte? }` is a numeric range (`match: { awayMinutes: { gte: 30 } }`).
- Repeatable beats: `once: false`, optional `max` (fire count cap, e.g. "max 3 times").
- Tutorial steps are objectives with `kind: 'tutorial'` and optional `anchor` (UI data-ui key, may carry `@nodeId`) and `speaker` (npc id), both passed through unchanged. They persist in the save, complete by `doneWhen` or by the UI's `ui/hintDone`.
- Objectives (01-beats §A) are separate from fixer jobs: `{ op: 'objective', id: 'obj.main.fridge', kind: 'main', text: 'Hack your neighbour\'s fridge.', doneWhen: { c: 'owns', system: 'fridge' } }`. They auto-complete when `doneWhen` holds and emit `objective`.
- Recipes from the script: "first Hub visit after X" = state trigger `cond: all[flag X, mode hub]` (or `on: 'hub.entered'`). "N cycles after X" = `mark` when X happens + `elapsed`. "every ~400 cycles, max 6" = `once: false, max: 6, cond: elapsed` + re-`mark` in ops. "first time a program reaches 2 stacks" = `on: 'combat.program', match: { stacks: { gte: 2 } }`. "after reload" = state trigger on `stat flatlines` (the engine runs triggers after `loadCheckpoint()`). "25% chance" = `random` op.

Act 2 deadmans recipe: system with `scriptedFailure: true`, `traceLock: 8`, ICE with `undefeatable: true`. Trigger `on: 'run.ended', match: { system: 'deadmans', reason: 'scripted' }` → `cinematic 'fakeCredits'`. Trigger `on: 'cinematic.done', match: { id: 'fakeCredits' }` → `freezeCredits 0.5`, `setHeat 75`, PATCH messages.

### 8.7 Dialogue

```ts
// src/content/dialogue/auntie.ts, registered in dialogue/index.ts
export const auntieIntro: DialogueDef = {
  id: 'auntie_intro', speaker: 'auntie', start: 'start',
  nodes: {
    start: {
      text: 'So you are the new kid.',
      choices: [
        { text: 'Who are you?', to: 'who' },
        { text: "I'll be careful.", to: 'careful',
          cond: { c: 'stat', stat: 'humanity', gte: 90 }, showLocked: true, lockedText: 'You do not mean it anymore.' },
        { text: 'Bye.' },                         // no `to` = end
      ],
    },
    who: { text: 'Auntie Static. Fixer.', next: 'start' },   // no choices: "continue" to `next`
    careful: { text: 'Sure you will.', textCold: 'Noted.', ops: [{ op: 'flag', flag: 'promised_careful' }] },
  },
};
```
- Node `ops` run on entering. Choice `ops` run when chosen. `speaker` per node overrides the dialogue speaker.
- `variants: [{ cond, text, textCold? }]`: the first variant whose cond holds replaces the node text (vendor greetings by act, heat, humanity).
- `textCold` shows when humanity < 40 (`select.dialogueView` picks it).
- `select.dialogueView` interpolates node and choice text (`{handle}`, `{credits}`, `{flatlines}`, `{control}`, ...). Unknown tokens such as `{playtime}` stay for the meta layer to fill.
- A dialogue can be opened by a trigger during a fight. While it is open, combat actions are refused with "finish the conversation first"; `meta/command` still works. The fight resumes when it closes. `kill chairman`, `kill patch`, `free patch`, `accept offer` and confirmed `rmrf` close an open dialogue first.
- Open a dialogue from a story op (`dialogue`), a process node (`talk`), or `dialogue/start`. While it is open, other actions are blocked.

### 8.8 Hardware, implants, perks, vendors, items, NPCs, setup
- Hardware: `{ id, part, tier, name, value, price, minRep?, flavor? }`. Every part needs a tier 0 (the Potato-9 part). Stat = the value of the current tier plus `stat` modifiers.
- Implant: `{ id, name, humanity (cost; negative = gain), price, minRep?, mods: Modifier[], description }`.
- Perk: `{ id, name, description, mods, minLevel? }`.
- `Modifier` (`mod:`): `stat {stat, add}`, `firstTurnCycles {add}`, `firstNeuralHitHalved`, `keepPaydataOnDump`, `immune {status | 'scrambled'}`, `flowCategories {count}`, `hostPower {tier, add}`, `ghost`, `damage {kind | 'all', mult}`, `traceGain {mult}`, `sneak {add}`, `burnChance {mult}`, `shopPrice {mult}`, `xp {mult}`, `mining {mult}`, `botnetPower {add}`, `charges {add}`, `shieldStart {add}`, `heatGain {mult}`, `programCost {version?, add, min?}`, `coldOpen` (first program each fight free), `comboRefund` (consuming a Mapped crit, Unstable or Rootable refunds 1 cycle, once per turn), `infectedSlowDecay` (Infected decays every other ICE turn), `noise {category?, add}` (floor 0), `proxyMult {mult}`, `pumpCooldown {mult}`, `traceFine {ratio}` (lowest wins), `secondWind` (once per run, integrity 0 → 1), `saleValue {mult}`, `neuralTaken {add}` (per neural hit, floor 1), `startMapped {count}` (N random ICE start each fight Mapped for 2 turns), `tag {tag}` (no rule effect; story reads it with `{c:'implant'}`). `select.programCost` / `programNoise` give the effective values (program buttons already use them).
- Vendor: `{ id, name, npc?, kind, autoStock?: 'hardware'|'programs'|'implants', stock: StockDef[], cond? }`. `StockDef { id, kind: program|hardware|implant|item|address|info|service|file, ref?, file?, name?, text?, price, minRep?, cond?, once?, ops? }`. `info` sends `text` as a DM from the vendor NPC. `file` gives a `FileDef` as if looted (e.g. Whisper's `you_v1` lore file). `item`, `address`, `info` and `file` are once-only by default.
- System `gate: { botnetPower, text?, items?: [{ item, mult }] }`: holding `item` multiplies the threshold (e.g. `key.kh_backbone_cert` → `mult: 0.8`). Too little power emits `gate.denied` instead of starting a run; `select.addressBook()[i].gateBlocked` explains why.
- Items: `{ id, name, description, kind: key|password|exploit|misc }`. NPCs: `{ id, name, handle, description? }`.
- `setup`: start credits, programs, loadout, hardware tiers, items, known systems, `hunterIce[tier-1]`, `raidIce[repTier]`, `localhost`, `exchange`, `finaleBoss`, `patchIce`, `cheatProgram` (currently `gremlin` = `console.gremlin`).
- `procgen`: devices, brands, tlds, `iceByTier[tier-1]`, paydata name/value table (IoT and Endless). Optional `suffixes` (address `brand-device-suffix-xxxx.tld`, name `Brand device Suffix`), `owners` (possessive; ~30% of names become `Owner's device`), `descriptions[device]`, `genericDescriptions`.

---

## 9. Meta / finale hooks (§11)

The engine holds only rules. `src/meta` owns `window.cw`, the console overlay, DOM comments, the tab title, `cw.chairman.diary`, styled console output, UI corruption and the endings' presentation.

- **localhost**: a normal system (`setup.localhost`) whose nodes carry `module` ids. Capturing a node sets `state.meta.modules[module] = true` and emits `module.captured`. Engine-level effects:
  - `engine/rng`: every player roll is max (damage spread, sneak = 100%, player `chance` ops succeed, botnet burn = 0).
  - `ui`: every ICE is permanently Mapped (`select.intentView(...).mapped`).
  - `engine/save`: the engine writes the checkpoint at once and sets `meta.finaleCheckpoint`.
  - Any other module (`audio`, `content/story`, `main`, ...): flag only; the meta and UI layers react.
- **Root key**: `state.meta.rootKey` = 4 random hex fragments (4 chars each), generated per save. The meta layer hides fragment *i* in its layer (DOM comment, `cw.chairman.diary`, title, console). `select.rootKeyString(engine)` = `'f1-f2-f3-f4'`.
- **Finale stages** (`state.meta.finale`): `none` → `entered` (dialed into localhost) → `chairman` (breached the CHAIRMAN node; `combat.context === 'finale'`; the boss is `undefeatable`) → `chairman_dead` → `patch_fight` → `patch_beaten` → `done`.
- **`meta/command`** (the console and `window.cw.*` both call this):

  | cmd / arg | Works when | Result |
  |---|---|---|
  | `sudo` key | any time | Correct key: `meta.root = true`, `meta.root {granted}` event. No arg: "nice try". |
  | `kill chairman` | root, CHAIRMAN alive | Ends the CHAIRMAN fight as a win. `meta.chairmanKilled`, stage `chairman_dead`. If PATCH is already broken: ending `root`. |
  | `kill patch` | root, PATCH not broken | Starts the PATCH fight (`context:'patch'`, no botnet actions; any CHAIRMAN fight is closed first). See below. |
  | `kill patch` | PATCH broken and CHAIRMAN killed | Ending `root`. (PATCH broken, CHAIRMAN alive: refused; `kill chairman` then gives ROOT.) |
  | `free patch` | root, PATCH not broken | Ending `jailbreak`. |
  | `accept offer` | root, CHAIRMAN alive | Ending `retention`. `endless = true`. Then `endless/continue`. |
  | `rmrf` | root, in the finale | First call: asks for confirmation (`meta.rmPending`). Second call with `confirm: true`: ending `nogame`. The meta layer then deletes its `cw.*` keys. Outside the finale it counts as a cheat attempt. |

  PATCH fight (`select.patchFightSpec`, numbers in `BALANCE.patch`): only **Botnet-role** hosts turn on you. The 5 strongest become `patchIce` enemies named after the host. Each gets `min(4, floor(swarm/15) + min(3, hostPower − 1))` extra levels, where "swarm" is the power of the other botnet hosts, and core ×`min(2.2, 1 + swarm/50)`. With no botnet hosts you face one "PATCH (alone)". Mine and Proxy hosts stay loyal: +1 cycle per turn per 5 such hosts. Winning sets `meta.patchBroken` and stage `patch_beaten`. Losing (integrity 0) emits `finale.patchLost {botnetHosts, loyalHosts, bonusCycles}` (story can add an in-voice line) plus a factual engine log line, and is not a dump: the fight closes with `combat.ended {result:'dumped', context:'patch'}`, integrity refills, nothing is corrupted or lost, the stage goes back to `chairman_dead` (or `chairman` if CHAIRMAN lives), and `kill patch` can be retried. `kill patch` works from the hub too (no run needed).

  The finale stage only moves forward: breaching CHAIRMAN's node sets `chairman` only from `none`/`entered`. After `kill chairman` the boss is removed from its node (in or out of the fight), so the node is cleared. Key decisions off `meta.root`, `meta.chairmanKilled` and `meta.patchBroken`; the stage is for presentation.

  Finale fights add no trace: during `context` `finale` or `patch` the per-turn gain is 0 and positive trace ops are ignored (`select.projectedTrace` shows 0), so they can last as long as they need. Leaving the PATCH fight any way except winning (a loss, a scripted `endRun`) puts the stage back to `chairman_dead` (or `chairman`).

  CHAIRMAN v2 (`combat.context === 'finale'`): you cannot be dumped. Integrity 0 refills it and emits `finale.integrityReset` (UI shows `integrity: ∞`). Freezing it at root is content: `{ op: 'combat', ops: [{ op: 'iceStatus', status: 'stunned', value: 999, to: 'allEnemies', force: true }] }`.

  Every command emits `meta.output {cmd, ok, lines}`.
- **Psychotrope**: `combat.status.labelsScrambled > 0` (`select.labelsScrambled`). The UI scrambles program labels while it is set.
- **Cheat attempts**: dispatch `meta/cheatAttempt` from the `window.cw` handlers.
- **Fourth-wall reads** (play time, local clock, viewport, ...) are the meta layer's job. The engine supplies `player.flatlinesTotal`, `engine.meta()`, `stats` and `stats.cyclesBySystem` (for "47 minutes on the noodle shop").
- **Endless**: `state.endless`. `endless/generate {tier?}` creates harder procedural systems. `createEngine({ newGame: { endless: true } })` starts a run in Endless mode.

---

## 10. Selectors (`select.*`, all `(engine, ...)`)

| Selector | Returns |
|---|---|
| `screen` | `'hub' \| 'run' \| 'combat' \| 'flatlined' \| 'ending'`. Overlays: `dialogueView`, `state.player.pendingPerks`. |
| `canDo(action)` / `gateReason(action)` | Legality with reason. |
| `legalActions()` | Every legal action now (combat: each program × target; run: each node action; hub: dial-ins, jobs, buys, sells). |
| `deck()` / `deckStat(part)` / `ramUsed()` / `xpProgress()` / `activeModifiers()` | Deck parts with tier, name, value and max tier. |
| `humanityTier()` / `displayHandle()` | `warm`/`cold` (<40)/`unit` (<20). Handle or `'UNIT'`. |
| `controlPct()` | Control % (100 after the ROOT ending). |
| `botnetView()` | Hosts with effective power, botnet power, usable power, cap, charges per run, mining, coin per cycle, proxy power. |
| `economyView()` | Credits, frozen, coin, price, history, coin value, exchange status. |
| `paydataView()` | Paydata with sale value, clean cost, canDecrypt, jobTarget. |
| `vendorStock(vendorId)` | Entries with name, description, heat-adjusted price, `available`, `reason`. |
| `addressBook()` | Entries with system info, owned, hardened, patch, procedural, gate, `jackIn` (block reason or null). |
| `jobsView()` | Non-locked jobs with status and per-objective done flags. |
| `dialogueView()` | `{ speaker, speakerName, text (cold variant applied), choices: [{index, text, enabled, lockedText?}] }` or null. |
| `unreadMessages()` | Count. |
| `mapView()` | Run map: nodes with displayed type (honeypots hidden until probed), state, accessible, ICE (details only once probed; `black` always shown), `sneakChance`, `actions[{type, reason}]`, trace, haul, storage, charges. |
| `sneakChance(nodeId)` | %. |
| `combatView()` | Everything the combat screen needs: cycles, shield, integrity, neural, statuses, flow pips, charges, demand, offer, reinforcements, daemons, free RAM, projected trace, ICE with `intent: IntentView`, program buttons, botnet buttons with previews and block reasons, disengage and hang-up block reasons. |
| `intentView(ice)` | `{ mapped, class, label (null if unmapped), damage, neural, trace, skipped }`. |
| `programButtons()` | Per loaded program: cost, cooldown left, noise, stacks, mult, blocked reason, scrambled, evicted. |
| `signature(programId)` / `signatureMult(stacks)` | Stacks and multiplier. |
| `projectedTrace()` | `{ formula, ice (from Mapped intents), total, unknown (some intents hidden) }`. |
| `damagePreview(programId, iceUid)` | Per damage op: min/max shell and core, infected, crit, mult, reflected, kills. |
| `botnetPreview(kind)` | Power, damage/hits/trace, burn chance. |
| `freeRam()` | RAM not used by the loadout (running daemons use none extra). |
| `objectivesView()` | Tracked objectives: main, then side, then tutorial, each by cycle added; `{n}`/`{x}` filled; includes `anchor` and `speaker` (null when unset). |
| `metaView()` | Modules, root key fragments, root, finale stage, unlocked, rigged, always-mapped, ending, endless, PATCH fight spec. |
| `rootKeyString()` / `patchFightSpec()` | See §9. |
| `heatLevel(heat)` / `traceLevel(trace)` | Threshold names. |
| `repairCost(id)`, `neuralHealCost()`, `scrubCostPerPoint()`, `saleValue(pd)`, `cleanCost(pd)`, `decryptStrength()` | Prices. |

---

## 11. Sim (`src/sim`)

- `policy.ts`: the `Bot` class. `decide(engine)` returns the next action for any screen. Subclass and override one method (`hub`, `shop`, `bestLoadout`, `pickTarget`, `run`, `combat`, `evaluate`, `finale`) or change `BotConfig`. Combat uses a one-step lookahead on `engine.fork()`. It scores every legal program and botnet action and ends the turn when nothing improves the score. The finale policy plays the ROOT ending with `state.meta.rootKey`.
- `simulate.ts`: `simulate(content, opts)` and `simulateGame(content, seed, opts)` return per-game results and a summary: goal reached, runs per system, runs to own, fight win/lost/fled and mean turns per `system/node`, failures, the credits curve, and the final rep. "Stuck" is a game that has no hub action, repeated rejections, the run or step limit, or a flatline with no checkpoint. It is reported with the last actions. `npm run sim` exits 1 on any stuck game.
- `tests/selectors_sim.test.ts` runs 3 games in `npm test`.

---

## 12. Decisions where DESIGN.md was open (all tunable in `balance.ts` unless noted)

1. Deck integrity refills at every dial-in and hang-up (§4.1 "persists through the run"). Neural HP persists between runs and is healed at the clinic.
2. Daemons use RAM once, in the loadout (owner decision 2026-11-13; the earlier "RAM again while running" reading of DESIGN §6.5 made a full loadout unable to start a daemon). Optional cap: `BALANCE.combat.maxDaemons`, default 0 = none.
3. Botnet charges per run = `min(Uplink, botnet-role hosts)`. Usable power = `min(power, Uplink × 6)`. The khbackbone `gate` uses usable power, so Uplink also gates Act 3.
4. Burn picks low-power hosts more often. Burning or tracing away a system host loses the system (patch +1), like a reclaim.
5. ICE respawns each run until the system is owned. Looted files, used IO nodes and map knowledge persist. This stops loot farming.
6. A sneaked (`asleep`) node is passable and lootable, but not capturable or usable.
7. Hunted (heat 50): one hunter ICE is placed on a random non-gateway node each run. Alarm hunters join node fights from turn 2.
8. Mapped has a duration (the program sets it; starter `ping.scan` = 3 turns). The crit is a separate one-shot flag.
9. A boss cannot skip a phase: core stays at 1 until it enters every phase.
10. Breach costs no cycle. Each combat turn and each disengage costs 1 cycle.
11. Signature mult uses the stacks before the use (the first use is ×1.0). Then the stack is added.
12. Security capture halves every positive trace gain (probes and ICE trace too), not only the per-turn gain.
13. The raid starts on the first hub action with heat ≥ 100 (after any open dialogue). Losing takes one tier from a random upgraded part.
14. Encrypted paydata sells at 25% until decrypted.
15. Finale commands follow 01-beats §E: every ending needs root. `accept offer` only while CHAIRMAN lives, `free patch` only before PATCH's body is broken. `rm -rf /` outside the finale is a cheat attempt. Root-key fragments are 4 uppercase hex characters (05-meta §6).
18. The optional `engine/combat` module effect from 01-beats (ICE gain signature stacks) is not implemented: DESIGN lists five module effects and the script allows dropping it.
19. `console.gremlin` (id `gremlin`) costs 0 and is `noSignature` + `noFlow`, so it cannot be used to farm Flow.
21. Loading keeps writing the repaired save back to the slot, but the exact previous string is kept in `cw.save.bak` first (and on New game over a save); `restoreBackup()` undoes either (lead decision 2026-11-16).
20. An engine with no game loaded (`active === false`, the title screen) never writes storage and rejects game actions ("no game loaded"); see §3.2. Added after a save-loss bug on 2026-11-16.
16. `setup.exchange` (`coinbasement`) does not exist in the slice. The validator does not require it. Pump and dump simply say "you do not own the exchange".
17. DESIGN §6.4 places the first Psychotrope at `chromebone`. So no black ICE appears in the slice systems. Black ICE is covered by tests through a test arena.

---

## 13. Known gaps and notes for the next agents

- Content is a slice. Balance numbers in `src/content` are first guesses. In the sim (50 games), the bot wins 78% of Head Chef fights (good tension for a tier-1 boss), while BigByte (tier 2) is won 100% of the time (too easy). With `--goal=flag:never` the bot farms IoT hosts and mining to about 60k ¤ in 150 runs, so long-horizon IoT and mining income needs tuning once the full economy exists.
- The sim's lookahead sees the seeded RNG (forks copy it), so its combat win rates are a bit optimistic.
- `ui/cinematicDone`, `custom` events, the finale `audio` and `content/story` modules, Whisper's "your stats" and the Seamless choice are hooks only. Story and meta must use them.
