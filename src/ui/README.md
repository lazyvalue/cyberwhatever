# src/ui

Preact + Canvas 2D interface. Reads `engine.state` and selectors, dispatches actions, plays `GameEvent`s.
Everything is data-driven from the content registry and `GameState`; no system, program, ICE or NPC lists live here.

## Component tree

```
main.tsx            fonts, theme.css, createEngine, bindEngine, startDirector, installMeta, render
└─ App.tsx          picks the screen; overlays; mounts <MetaLayer/> last
   ├─ Title                     screens/Title.tsx (neon sign over a canvas net; continue / new game / settings; getTitleExtras())
   ├─ shell
   │  ├─ TopBar                 components/TopBar.tsx (handle, rep, credits, $HODL, heat, humanity, control, cycle, next objective)
   │  ├─ main
   │  │  ├─ Hub                 screens/Hub.tsx + screens/hub/*  (rail of apps: Net, Jobs, Inbox, Deck, Botnet, Market, Wallet, Files, Rep, Stats)
   │  │  ├─ RunScreen           screens/Run.tsx (canvas map, node panel, trace strip, comms)
   │  │  └─ CombatScreen        screens/Combat.tsx (ICE cards with canvas constructs, vitals, cycles, Flow, trace, programs, botnet, End Turn)
   │  │     └─ IceInspector     screens/Inspector.tsx (full-text panel for the selected ICE / rooted ICE / daemon: defences, next move, statuses, your programs vs it, how to beat it)
   │  └─ LogPanel               components/LogPanel.tsx (docked ≥1101 px, drawer below)
   ├─ Guide                     overlays/Guide.tsx (the `?` manual; content from src/content/guide.ts)
   ├─ Coach                     overlays/Coach.tsx (persistent tutorial coach: engine objectives of kind 'tutorial')
   ├─ CinematicOverlay          plays state.cinematic when the meta layer does not handle the id
   ├─ DialogueOverlay, PerkPicker, FailureScreen, CardOverlay, Toasts, FxLayer,
   │  JackInWipe, MetaCorner, GlitchVeil, SettingsModal      overlays/Overlays.tsx
   ├─ TooltipHost               components/Tooltip.tsx (data-tip: hover, focus, or long-press)
   └─ MetaLayer                 from src/meta via metaBridge.ts (owns the screen when state.mode === 'ending')
```

Support modules: `game.ts` (engine handle, UI store, `act()` = legality check + dispatch + refusal feedback),
`fx/director.ts` (event queue → sound, numbers, banners, holds; fast-forward), `fx/fxStore.ts`,
`canvas/{ticker,mapRenderer,iceRenderer,portrait}.ts`, `copy.ts` (HUD copy by humanity, failure variants, tips),
`metaBridge.ts` (safe access to the meta contract), `settings.ts` (`cw.ui.settings`), `store.ts`.

## One scroll

Owner rule: the log ("the scroll") is the only home for status and event text. Everything goes through `logLine()` in
`game.ts` (`toast()` and `banner()` are thin wrappers that only log). Allowed on-screen exceptions: numeric damage/heal
popups (`floatAt` drops anything non-numeric), the tutorial coach, modal overlays (dialogue, perk pick, failure, cards,
EULA/Paywall, settings), meta scenes and tooltips. Important lines carry an invisible U+2063 prefix (`IMPORTANT`) and render
stronger. Desktop: log column always docked. Narrow: a 3-line ticker that opens the drawer. The e2e fails if any floating
text appears and vanishes outside these.

## Contracts the UI reads from content (story/meta agents)

- Message `subject: 'comms'` while dialed in → an important story line in the scroll (it stays in the inbox).
- Custom events: `toast` / `ui.toast` `{text}`, `ui.comms` `{from, text}`, `ui.card` `{title?, text}`, `ui.hint` `{id, text, anchor?}` (anchor = a `data-ui` key; dismissed hints are remembered in `cw.ui.hints`).
- Cinematics are driven from `state.cinematic` (so a reload replays a pending one). If meta's `handlesCinematic(id)` is true, MetaLayer plays it; any other id (e.g. `card.*`) shows a card from `data.title/text/lines`, then the UI dispatches `ui/cinematicDone`.
- Tutorial: objectives of kind `tutorial` (`text`, `anchor`, `speaker`). The coach panel shows the active one until it is done or the player presses "Got it" (`ui/hintDone`). Anchor = a `data-ui` key; `key@nodeId` rings that node on the map until it is selected; anchors on another hub tab pulse that tab's rail button. Extra anchors: `ice-intent`, `ice-shell`, `ice-core` (targeted ICE), `program-last`. Settings has a switch; the `?` button and the log's "hints" tab list past hints.
- Vendor greetings: opening a vendor tab starts `dlg.<npc>.greet` (or the kind's greeting, e.g. `dlg.kiosk.greet`) once per visit home. Inbox "Talk" opens `dlg.<npc>.chat` or `dlg.<npc>.first_contact`; hosts named "… (Enterprise)" get `dlg.deacon.mind_checkup`.
- Systems' `motd` is typed out on dial-in (click or Esc skips) and shown in the address book once visited.
- `combat.notify` styles: `taunt` ("SPEAKER: text" → speech bubble), `popup` (card), `fakewin` (banner).
- Top-bar objective: first active main objective (`select.objectivesView`), else a string flag `objective`, else jobs.
- Display names: `glitch` → PATCH after flag `patch_revealed`; `auntie` → "Auntie Static (CHAIRMAN)" after `auntie_unmasked`.
- Placeholders in story text go through `fillState` and then the meta layer's `metaText`.

## MetaUiState honoured

`scrambleLabels` (program, botnet and End Turn labels), `endTurnDisabled`, `buttonsDrift` (combat buttons move on hover and reorder),
`fakeInfiniteIntegrity` (boss core shows ∞), `riggedRolls` (damage previews show max, marked "rigged"), `hudOverride` (keys below),
`glitch` (CSS `--glitch` + veil), `consoleHint` (corner button → `openMetaConsole`).

`hudOverride` keys (value replaces the visible text): `credits` (top-bar credits value), `control` (top-bar control value), `handle`, `objective`,
`hubTitle`, `jackIn` (Dial in label), `jackOut` (Hang up label), `endTurn`, `endTurnTip`, `prog:<programId>` (program button label),
`bossIntegrity` (boss core text), `damage` (text of the player's damage popups), `turn`, `shield`, `integrity`, `neural`, `cycles`, `flow`, `trace`,
and captions `<stat>.k` (rep, credits, hodl, heat, humanity, control, cycle, handle, objective).
`buttonsDrift` moves End Turn to a new spot every turn (and program/botnet buttons on hover). `overlay` non-null pauses all UI hotkeys.

## Stable `data-ui` attributes

| Area | Keys |
|---|---|
| Title | `title-continue`, `title-new`, `title-handle`, `title-start`, `title-settings`, `title-extras` |
| Top bar | `topbar-handle`, `topbar-rep`, `topbar-credits`, `topbar-hodl`, `topbar-heat`, `topbar-humanity`, `topbar-control`, `topbar-cycle`, `topbar-objective`, `topbar-mute`, `topbar-log`, `topbar-settings` |
| Hub rail / panels | `hub-<tab>` (net, jobs, inbox, deck, botnet, market, wallet, files, rep, stats), `panel-<tab>` |
| Net | `addr-<system>`, `addr-motd`, `jack-in` (Dial in) |
| Deck | `part-<part>`, `ram-meter`, `loadout-<program>`, `load-<program>`, `unload-<program>`, `repair-<program>` |
| Botnet | `host-<uid>`, `host-<uid>-<role>` |
| Market | `vendor-<vendor>`, `talk-<vendor>`, `stock-<stockId>`, `buy-<stockId>`, `sell-<program>`, `clinic-heal`, `sell-all`, `scrub-5`, `scrub-10`, `scrub-all` |
| Wallet | `coin-sell-quarter`, `coin-sell-half`, `coin-sell-all`, `coin-buy-1`, `coin-buy-5`, `coin-buy-max`, `pump`, `dump` |
| Inbox | `inbox-dm`, `inbox-bbs`, `inbox-system`, `msg-<id>` |
| Jobs | `objectives`, `job-<id>`, `job-accept-<id>`, `job-turnin-<id>`, `job-abandon-<id>` |
| Files | `paydata-<uid>`, `sell-<uid>`, `decrypt-<uid>`, `clean-<uid>`, `item-<id>`, `lore-<id>` |
| Rep | `perk-open`; picker: `perk-picker`, `perk-<id>` |
| Run | `map` (canvas), `motd`, `trace`, `haul`, `node-ice`, `node-files`, `node-empty`, `node-<action>` (probe, sneak, breach, backdoor, unlock, loot, capture, use, talk, netscan), `jack-out` (Hang up) |
| Combat | `combat`, `ice-<uid>` (also `data-ice-uid`), `player-vitals`, `vital-shield`, `vital-integrity`, `vital-neural`, `cycles`, `flow`, `trace`, `program-<programId>` (also `data-slot`), `program-slot-<n>` (label span), `ice-intent`, `ice-shell`, `ice-core` (targeted ICE), `botnet`, `botnet-<kind>` (ddos, dcrack, swarm, bounce), `end-turn`, `disengage`, `combat-jack-out`, `accept-offer`, `accept-demand` |
| Overlays | `dialogue`, `choice-<n>`, `card`, `cinematic`, `coach`, `coach-ok`, `coach-close`, `coach-history`, `coach-history-toggle`, `topbar-hints`, `tutorials`, `failure-<kind>`, `failure-continue`, `reload-checkpoint`, `settings`, `settings-close`, `quit-title`, `vol-<master/sfx/music>`, `mute`, `motion-<auto/reduced/full>`, `meta-console`, `log`, `mnav-log`, `mnav-net`, `mnav-settings` |

## Keys

Hub: letters on the rail (n j i d b m w f r s). Run: arrows move between nodes; p s b k u l c e t n act; Enter does the first available action; h hangs up.
Combat: 1–9 programs, Tab/←/→ target, Space End Turn, Shift+1–4 botnet, Esc skips animation.
Dialogue: Enter/Space finishes the text, 1–9 choose. Tutorial coach: Enter = Got it. Anywhere in game: o settings, l log (not in a run, where l loots).

## QA scripts

- `scripts/e2e-play.mjs` plays the real UI headless (new game → first system → fights → loot → hang up → sell → buy → loadout →
  second system → traced and flatlined screens) and saves screenshots at 1280×720 and 390×844. It exits 1 on any console error.
  Run it against a dev server or any build opened with `?qa` (which exposes `window.__engine`, `__cwSelect`, `__cwUi`):
  `npx vite build --outDir /tmp/cw && npx vite preview --outDir /tmp/cw --port 5198` then
  `CW_URL='http://localhost:5198/?qa' node scripts/e2e-play.mjs` (screenshots go to `shots/`; clear with `rm -rf shots`).
  It also screenshots every tutorial step the coach shows.
- `scripts/ui-sizes.mjs` screenshots every screen at 1280×720, 1440×900, 1920×1080 and 390×844 and fails on sideways scroll or clipped text.
- `scripts/tutorial-walk.mjs` plays the fridge tutorial as a first-time player (follows the coach literally) and fails on skipped, stuck or unpointed steps.
- `scripts/guide-check.mjs`: the guide opens in context (fight → Fights, botnet tab → Hosts and roles), a status chip deep-links to its entry, search works, and keys do not reach the fight underneath.
- `scripts/space-check.mjs`: click a program, then Space must end the turn (QA regression).
- `scripts/coach-check.mjs` forces two tutorial steps and screenshots the coach at both sizes.
- `scripts/ui-shot.mjs <url> <out.png> [w] [h]` takes one screenshot. `scripts/pw-browser.mjs` finds a Chromium.

## Scale

All sizes are rem. The root font-size follows the window (15 px at 1280×720, ~16.7 px at 1440×900, 20 px at 1920×1080, never below 15 px)
times the UI scale setting (90/100/115/130 %, `cw.ui.settings.uiScale`). The log column is `clamp(340px, 26vw, 460px)`.
Text colours: `--ink-dim` and `--ink-faint` both pass WCAG AA (≥ 5.4:1) on every panel colour; game-state numbers use `--ink` or a hue.

## Guide

`?` (button `guide-open`, or the `?` key) opens the manual at the section for the current screen (`contextSection`).
Small `?` links (`guide-link-<section|anchor>`) sit next to shells, intents, cycles, Flow, trace, the botnet row, and the
signature/statuses buttons in the fight header. Every status chip and the top-bar heat open their guide entry.
Sections render `GUIDE` from src/content/guide.ts; `auto` blocks and status-table rows are built from the registry and
`BALANCE`. Last section read: `cw.ui.guide`. The guide blocks all game keys while open and never spends a cycle.

## ICE inspector

The selected target (or a clicked rooted ICE, or a daemon tag) is inspected in full text: base type, description, defences
with the matchup multipliers from `BALANCE.shell`, next move (exact only when Mapped; the next intents of sequence ICE),
statuses with Guide links, a table of every loaded program's preview against it (`select.damagePreview`, best hit marked),
and the Guide's field-guide answer. Arena ≥ 760 px: a column beside the cards. Narrower: an overlay (click the selected ICE
again or press `i`, Esc closes). Phone: a bottom sheet. ICE cards carry no paragraphs; truncated card text (program names,
previews, intent labels) always has its full text in the inspector. data-ui: `ice-inspector`, `inspector-description`, `inspector-countdown`,
`inspector-prog-<id>`, `inspector-status-<key>`, `inspector-close`, `daemon-<programId>`.
