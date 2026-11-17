// CYBERWHATEVER engine types.
// Everything in GameState is plain JSON (no Maps, Sets, classes, functions).
// Content definitions are typed here so src/content can be authored without touching engine code.

export type Id = string;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };
export type FlagValue = string | number | boolean;

// ---------------------------------------------------------------------------
// Basic vocabularies
// ---------------------------------------------------------------------------

export type HardwarePart = 'cpu' | 'ram' | 'firewall' | 'chassis' | 'mask' | 'uplink' | 'storage' | 'neural';
export type DamageKind = 'crack' | 'spike' | 'worm';
export type ShellType = 'crypt' | 'wall' | 'none';
export type ProgramCategory = 'attack' | 'exploit' | 'defense' | 'stealth' | 'daemon' | 'special';
export type NodeType =
  | 'gateway' | 'router' | 'datastore' | 'security' | 'io' | 'vault' | 'process' | 'honeypot' | 'core';
export type HostRole = 'idle' | 'mine' | 'botnet' | 'proxy';
export type BotnetActionKind = 'ddos' | 'dcrack' | 'swarm' | 'bounce';
export type EndingId = 'root' | 'jailbreak' | 'retention' | 'nogame';
export type GameMode = 'hub' | 'run' | 'flatlined' | 'ending';
export type IntentClass = 'hostile' | 'utility' | 'unknown';
export type TraceLevel = 'calm' | 'suspicious' | 'alarm' | 'traced';
export type HeatLevel = 'cool' | 'noticed' | 'hunted' | 'burned' | 'raid';
export type JobStatus = 'locked' | 'available' | 'active' | 'ready' | 'done' | 'failed';
export type ObjectiveStatus = 'active' | 'done' | 'failed' | 'hidden';
export type ObjectiveKind = 'main' | 'side' | 'tutorial';
export type FinaleStage =
  | 'none'          // not in the finale
  | 'entered'       // localhost reached
  | 'chairman'      // CHAIRMAN v2 fight running (undefeatable)
  | 'chairman_dead' // `kill chairman` done; PATCH reveals and makes its pitch
  | 'patch_fight'   // player refused PATCH; botnet turns on you
  | 'patch_beaten'  // botnet fight won; `kill patch` ends the game (ROOT)
  | 'done';

// ICE-side statuses (numbers are turns or stacks; 0 = absent).
export type IceStatusKey =
  | 'mapped'     // full intent info + next hit crits (sets critReady)
  | 'unstable'   // stacks, consumed by overflow damage
  | 'backdoored' // turns until Rootable
  | 'exposed'    // turns: shell ignored
  | 'stunned'    // turns: skips its action, intent does not advance
  | 'slowed'     // turns: intent delayed (same as stunned for one turn, bosses get this instead of stun)
  | 'marked'     // turns: botnet actions +50%
  | 'infected';  // stacks: core damage at end of each ICE turn, decays by 1

export interface IceStatuses {
  mapped: number;     // turns remaining (999 = permanent)
  critReady: boolean; // set with mapped by scan programs; consumed by the next hit
  unstable: number;
  backdoored: number;
  rootable: boolean;
  exposed: number;
  stunned: number;
  slowed: number;
  marked: number;
  infected: number;
}

export type PlayerStatusKey =
  | 'decoy'           // stacks: absorbs the next n attacks (whole intents)
  | 'masked'          // turns: trace gain halved this turn
  | 'tarred'          // stacks: -n cycles next turn
  | 'anchored'        // turns: cannot disengage or hang up
  | 'burn'            // stacks: neural damage at start of your turn, decays by 1
  | 'labelsScrambled' // turns: UI should scramble program labels (Psychotrope)
  | 'stunned';        // turns: you skip your turn

export interface PlayerStatuses {
  decoy: number;
  masked: number;
  tarred: number;
  anchored: number;
  burn: number;
  labelsScrambled: number;
  stunned: number;
  scrambled: Record<Id, number>; // programId -> turns locked
}

// ---------------------------------------------------------------------------
// Conditions (story, dialogue, jobs, vendors)
// ---------------------------------------------------------------------------

export type StatKey =
  | 'rep' | 'xp' | 'humanity' | 'heat' | 'credits' | 'coin' | 'coinPrice' | 'control'
  | 'cycle' | 'botnetPower' | 'hosts' | 'botnetHosts' | 'trace' | 'integrity' | 'neural' | 'flatlines' | 'ownedSystems'
  | 'fragments' | 'cheats' | 'combatTurn';

export type Condition =
  | { c: 'all'; of: Condition[] }
  | { c: 'any'; of: Condition[] }
  | { c: 'not'; of: Condition }
  | { c: 'flag'; flag: string; is?: FlagValue }          // without `is`: flag is truthy
  | { c: 'stat'; stat: StatKey; gte?: number; lte?: number }
  | { c: 'owns'; system: Id }
  | { c: 'knows'; system: Id }                           // address in address book
  | { c: 'item'; item: Id }
  | { c: 'program'; program: Id }
  | { c: 'implant'; implant: Id }
  | { c: 'perk'; perk: Id }
  | { c: 'job'; job: Id; status: JobStatus | JobStatus[] }
  | { c: 'inSystem'; system?: Id }                       // in a run (optionally a given system)
  | { c: 'inCombat' }
  | { c: 'mode'; mode: GameMode }
  | { c: 'module'; module: string }                      // localhost module captured
  | { c: 'finale'; stage: FinaleStage | FinaleStage[] }
  | { c: 'root' }                                        // sudo succeeded
  | { c: 'endless' }
  | { c: 'trigger'; trigger: Id }                        // a story trigger has fired
  | { c: 'elapsed'; flag: string; gte: number }          // cycle - (flag set by StoryOp `mark`) >= gte; false if unset
  | { c: 'paydata'; file: Id }                           // holding this paydata file (inventory or current haul)
  | { c: 'hostRole'; system: Id; role: HostRole }        // the host made from this owned system has this role
  | { c: 'sneakable'; gte: number }                      // in a run, some reachable node with ICE shows sneak chance >= gte
  | { c: 'nodeRevealed'; type: NodeType }                // in a run, a node of this type is revealed
  | { c: 'objective'; id: Id; status: ObjectiveStatus | ObjectiveStatus[] }
  | { c: 'chairmanKilled' }
  | { c: 'patchBroken' };

// ---------------------------------------------------------------------------
// Combat ops: the data-driven effect vocabulary for programs, daemons, ICE intents,
// ICE triggers, boss phases and botnet actions.
// "Source" is whoever runs the op. Target selectors are relative to the source.
// ---------------------------------------------------------------------------

export type TargetSel =
  | 'target'      // player source: the chosen ICE (fallback: first enemy). ICE source: the player.
  | 'self'        // the source itself (ICE) / the player (player source)
  | 'player'      // the player (ICE source)
  | 'allEnemies'  // player source: all hostile ICE. ICE source: the player.
  | 'randomEnemy' // player source: a random hostile ICE
  | 'lowestEnemy' // player source: hostile ICE with lowest core
  | 'allAllies'   // ICE source: all hostile ICE including itself
  | 'allyLowest'  // ICE source: other hostile ICE with lowest core ratio (itself if alone)
  | 'allyRandom'; // ICE source: random other hostile ICE (itself if alone)

export type IceCond =
  | { c: 'shellBroken' }                         // own shell is 0
  | { c: 'coreBelow'; pct: number }              // own core / max < pct
  | { c: 'allyHurt'; pct?: number }              // another hostile ICE below pct (default 1) core
  | { c: 'allyShellBroken' }
  | { c: 'turn'; every?: number; atLeast?: number; atMost?: number } // own turns acted (1-based)
  | { c: 'playerStatus'; status: PlayerStatusKey; atLeast?: number }
  | { c: 'enemies'; gte?: number; lte?: number } // number of hostile ICE alive (incl. self)
  | { c: 'trace'; gte: number }
  | { c: 'chance'; p: number }
  | { c: 'flag'; flag: string; is?: FlagValue }
  | { c: 'status'; status: IceStatusKey | 'rootable' | 'critReady'; atLeast?: number } // own (or, in ifIce from a program, the target's) status; booleans count as 1
  | { c: 'not'; of: IceCond }
  | { c: 'all'; of: IceCond[] }
  | { c: 'any'; of: IceCond[] };

export type CombatOp =
  // --- player side -> ICE ---
  | {
      op: 'damage'; kind: DamageKind; amount: number;
      spread?: number;    // roll amount..amount+spread (rigged rng: always max)
      hits?: number;      // repeat the hit
      overflow?: number;  // consume all Unstable stacks on the target: +stacks*overflow damage
      to?: TargetSel;
    }
  | { op: 'iceStatus'; status: IceStatusKey; value: number; to?: TargetSel; force?: boolean } // force: bosses cannot resist (e.g. root freezes CHAIRMAN)
  | { op: 'root'; to?: TargetSel }                         // subvert a Rootable ICE (bosses resist)
  | { op: 'stripShell'; amount: number; to?: TargetSel }   // shell damage ignoring kind
  | { op: 'cleanseIce'; status: IceStatusKey | 'all'; to?: TargetSel } // remove ICE statuses (ICE patchers use this on allies)
  // --- player self ---
  | { op: 'shield'; amount: number }
  | { op: 'repair'; amount: number }                     // deck integrity
  | { op: 'neuralHeal'; amount: number }
  | { op: 'playerStatus'; status: PlayerStatusKey; value: number }
  | { op: 'cleanse'; status: PlayerStatusKey | 'scrambled' | 'all' }
  | { op: 'trace'; amount: number }                      // add (or remove, negative) run trace now
  | { op: 'cycles'; amount: number }                     // player gains cycles now
  | { op: 'cooldowns'; amount: number }                  // reduce all program cooldowns
  | { op: 'signature'; amount: number; program?: Id }    // reduce signature stacks (all programs, or one)
  // --- ICE -> player ---
  | { op: 'hit'; amount: number; hits?: number; neural?: boolean; pierce?: boolean } // pierce: ignores shield
  | { op: 'scramble'; mode: 'mostUsed' | 'lastUsed' | 'random'; turns: number }
  | { op: 'evict'; mode: 'mostUsed' | 'random' | 'daemon' }  // unload a program for the rest of the fight
  | { op: 'drainCharges'; amount: number }                   // remove botnet charges
  // --- ICE -> ICE ---
  | { op: 'reshell'; amount?: number; to?: TargetSel }   // restore shell (to max if amount omitted)
  | { op: 'heal'; amount: number; to?: TargetSel }       // core heal
  | { op: 'summon'; ice: Id; level?: number; count?: number; delay?: number } // reinforcements (delay in ICE turns)
  | { op: 'split' }                                      // Hydra: split self in two unless Infected
  | { op: 'buff'; shellLevels?: number; levels?: number; to?: TargetSel } // raise level / shell levels
  // --- interface-level ICE (Paywall / EULA / tutorial popups) ---
  | { op: 'demand'; id: string; text: string; penalty: CombatOp[] } // must be answered (combat/answerDemand) before End Turn or penalty applies
  | { op: 'offer'; id: string; text: string; credits: number }     // combat/acceptOffer pays and ends the fight as a win
  | { op: 'notify'; text: string; style?: string }                 // purely presentational popup event
  // --- glue ---
  | { op: 'chance'; p: number; ops: CombatOp[]; else?: CombatOp[] }
  | { op: 'ifIce'; cond: IceCond; ops: CombatOp[]; else?: CombatOp[] } // evaluated against the source ICE (or the target ICE for player sources)
  | { op: 'story'; ops: StoryOp[] }
  | { op: 'script'; id: Id; params?: JsonValue };

// ---------------------------------------------------------------------------
// Story ops: world-level effects (triggers, dialogue, jobs, IO nodes, files, vendors)
// ---------------------------------------------------------------------------

export type MessageChannel = 'dm' | 'bbs' | 'mail' | 'system';
export type LogLevel = 'info' | 'warn' | 'engine' | 'combat' | 'story' | 'ui';

export type StoryOp =
  | { op: 'message'; from: Id; text: string; channel?: MessageChannel; subject?: string }
  | { op: 'log'; text: string; level?: LogLevel }
  | { op: 'flag'; flag: string; value?: FlagValue }      // value defaults to true
  | { op: 'incFlag'; flag: string; by?: number }
  | { op: 'address'; system: Id; note?: string; source?: string }
  | { op: 'note'; system: Id; note: string }             // add an address-book note
  | { op: 'job'; job: Id; status?: JobStatus }           // default: make available
  | { op: 'dialogue'; dialogue: Id }
  | { op: 'item'; item: Id; remove?: boolean }
  | { op: 'program'; program: Id }
  | { op: 'credits'; amount: number }
  | { op: 'freezeCredits'; ratio: number }
  | { op: 'unfreezeCredits'; ratio?: number }            // default all
  | { op: 'coin'; amount: number }
  | { op: 'coinPrice'; mult?: number; set?: number }
  | { op: 'heat'; amount: number }
  | { op: 'setHeat'; value: number }
  | { op: 'humanity'; amount: number }
  | { op: 'xp'; amount: number }
  | { op: 'trace'; amount: number }                      // only meaningful during a run
  | { op: 'own'; system: Id }
  | { op: 'unown'; system: Id }
  | { op: 'host'; name: string; power: number; tier?: number; system?: Id } // tier default 1 (Slumlord reads it)
  | { op: 'burnHosts'; count: number }
  | { op: 'neural'; amount: number }                     // + heals, - damages (can flatline)
  | { op: 'endRun'; reason?: string }                    // scripted ejection with no failure penalties
  | { op: 'cinematic'; id: string; data?: JsonValue }   // UI plays it, then dispatches ui/cinematicDone
  | { op: 'event'; name: string; data?: JsonValue }      // custom event for UI/meta/audio
  | { op: 'finale'; stage: FinaleStage }
  | { op: 'ending'; ending: EndingId }
  | { op: 'unlockMeta' }                                 // meta console visibly unlocked
  | { op: 'endless' }
  | { op: 'mood'; mood: string }                         // audio mood hint
  | { op: 'if'; cond: Condition; then: StoryOp[]; else?: StoryOp[] }
  | { op: 'mark'; flag: string }                         // flag = current cycle (pair with condition `elapsed`)
  | { op: 'random'; p: number; then: StoryOp[]; else?: StoryOp[] }
  | { op: 'oneOf'; options: StoryOp[][] }                // run one option at random
  | {
      op: 'objective'; id: Id;                           // add or update a tracked objective (main/side)
      text?: string; kind?: ObjectiveKind; status?: ObjectiveStatus;
      anchor?: string;                                   // tutorial: UI data-ui key (optional `@nodeId` suffix), passed through
      speaker?: Id;                                      // tutorial: npc id, passed through
      n?: number; max?: number;                          // shown as {n}/{x} in text
      doneWhen?: Condition;                              // auto-completes when this holds
    }
  | { op: 'combat'; ops: CombatOp[] }                    // run combat ops as the player (only if a fight is on)
  | { op: 'nextFight'; ops: CombatOp[] }                 // queued: run as the player right after the first player turn of the next fight this run
  | { op: 'runSecurity'; add: number }                   // system security for the rest of this run (+/-, floor 0)
  | { op: 'metaCommand'; cmd: MetaCommand; arg?: string; confirm?: boolean } // same as the meta/command action
  | { op: 'metaKey'; key: string; value: string | null } // write/remove a cross-save `cw.*` key (engine does the write)
  | { op: 'script'; id: Id; params?: JsonValue };

// ---------------------------------------------------------------------------
// Passive modifiers (implants, perks, rare hardware)
// ---------------------------------------------------------------------------

export type Modifier =
  | { mod: 'stat'; stat: HardwarePart; add: number }
  | { mod: 'firstTurnCycles'; add: number }              // Wired Reflexes
  | { mod: 'firstNeuralHitHalved' }                      // Pain Editor
  | { mod: 'keepPaydataOnDump' }                         // Mnemonic Buffer
  | { mod: 'immune'; status: PlayerStatusKey | 'scrambled' } // Cold Cortex
  | { mod: 'flowCategories'; count: number }             // Polyglot
  | { mod: 'hostPower'; tier: number; add: number }      // Slumlord (tier-1 hosts +1)
  | { mod: 'ghost' }                                     // first failed sneak per run does not ambush
  | { mod: 'damage'; kind: DamageKind | 'all'; mult: number }
  | { mod: 'traceGain'; mult: number }
  | { mod: 'sneak'; add: number }
  | { mod: 'burnChance'; mult: number }
  | { mod: 'shopPrice'; mult: number }
  | { mod: 'xp'; mult: number }
  | { mod: 'mining'; mult: number }
  | { mod: 'botnetPower'; add: number }
  | { mod: 'charges'; add: number }
  | { mod: 'shieldStart'; add: number }                  // extra shield on turn 1
  | { mod: 'heatGain'; mult: number }
  | { mod: 'programCost'; version?: number; add: number; min?: number } // programs of this version (default all) cost add more/less, floor min (default 0)
  | { mod: 'coldOpen' }                                  // first program each fight costs 0 cycles
  | { mod: 'comboRefund' }                               // consuming Mapped crit / Unstable / Rootable refunds 1 cycle, once per turn
  | { mod: 'infectedSlowDecay' }                         // Infected decays only every other ICE turn
  | { mod: 'noise'; category?: ProgramCategory; add: number } // program noise delta (floor 0)
  | { mod: 'proxyMult'; mult: number }                   // proxy power counts xN
  | { mod: 'pumpCooldown'; mult: number }
  | { mod: 'traceFine'; ratio: number }                  // traced fine ratio (lowest wins)
  | { mod: 'secondWind' }                                // once per run, integrity 0 leaves you at 1
  | { mod: 'saleValue'; mult: number }                   // paydata sale value
  | { mod: 'neuralTaken'; add: number }                  // per neural hit, floor 1
  | { mod: 'startMapped'; count: number }                // N random ICE start each fight Mapped
  | { mod: 'tag'; tag: string };                         // no rules effect; story/UI reads it

// ---------------------------------------------------------------------------
// Content definitions
// ---------------------------------------------------------------------------

export interface ProgramDef {
  id: Id;
  name: string;               // display name, e.g. "crack.exe"
  family?: string;            // groups versions (v1..v3)
  version?: number;
  category: ProgramCategory;
  cost: number;               // cycles
  cooldown: number;           // turns after use (0 = reusable in the same turn)
  noise: number;              // trace added this turn when used
  ram: number;
  targeting: 'ice' | 'none';
  ops: CombatOp[];            // run when the program fires
  daemon?: { turns: number; ops: CombatOp[] }; // daemons: ops run at the end of each of your turns; turns 0 = whole fight
  requires?: Partial<Record<HardwarePart, number>>; // minimum hardware tier
  price: number;              // shop price; 0 = not sold in shops
  minRep?: number;
  sellValue?: number;         // default price * programSellRatio
  tags?: string[];            // 'decrypt', 'clean', 'joke', ...
  decrypt?: number;           // decrypt strength (hub use on encrypted paydata)
  noSignature?: boolean;      // never gains signature stacks (joke programs)
  noFlow?: boolean;           // does not count toward Flow categories
  description: string;
  flavor?: string;
}

export interface IntentDef {
  id: Id;
  label: string;              // shown when Mapped, e.g. "Slam 4"
  class: IntentClass;         // shown when not Mapped
  ops: CombatOp[];
  when?: IceCond;             // for 'priority' and 'random' AI
  weight?: number;            // for 'random' AI
}

export interface IcePhaseDef {
  at: number;                 // enters when core/coreMax <= at (e.g. 0.5)
  name?: string;
  intents?: IntentDef[];      // replaces intents
  ai?: IceAi;
  shell?: { type: ShellType; points: number };
  healTo?: number;            // set core to this fraction of max on entry
  ops?: CombatOp[];           // run on entry (source = this ICE)
  text?: string;              // taunt for the UI
}

export type IceTriggerOn =
  | 'fightStart' | 'turnStart' | 'turnEnd' | 'damaged' | 'shellBreak' | 'death' | 'allyDeath';

export interface IceTriggerDef {
  on: IceTriggerOn;
  ops: CombatOp[];
  once?: boolean;
  when?: IceCond;
}

export type IceAi = 'sequence' | 'random' | 'priority';

export interface IceDef {
  id: Id;
  name: string;
  level: number;
  black?: boolean;            // black ICE: always labelled; can do neural damage
  boss?: boolean;             // resists stun (Slowed instead) and root
  hunter?: boolean;
  shell: { type: ShellType; points: number };
  core: number;
  perception: number;         // subtracted from sneak chance (percentage points)
  ai?: IceAi;                 // default 'sequence'
  intents: IntentDef[];
  phases?: IcePhaseDef[];
  triggers?: IceTriggerDef[];
  reflect?: number;           // Mirror: same damage kind twice in a row is reflected (ratio to your deck)
  undefeatable?: boolean;     // core cannot drop below 1 through normal actions (finale)
  resist?: { stun?: boolean; root?: boolean };
  rootedDamage?: number;      // damage it deals per turn for you once rooted
  xp: number;
  credits?: number;
  script?: Id;                // content.iceScripts escape hatch
  description: string;
  flavor?: string;
}

export interface FileDef {
  id: Id;                     // unique across all content
  name: string;
  kind: 'paydata' | 'program' | 'address' | 'item' | 'lore' | 'coin' | 'credits';
  value?: number;             // paydata sale value
  encrypted?: number;         // decrypt strength needed (paydata)
  tagged?: boolean;           // selling adds heat unless cleaned
  program?: Id;
  system?: Id;                // address files
  item?: Id;                  // keys / passwords
  text?: string;              // lore
  amount?: number;            // coin / credits
  onTake?: StoryOp[];
}

export interface NodeDef {
  id: Id;
  type: NodeType;
  name: string;
  description?: string;
  x: number;                  // layout 0..1 for the map renderer
  y: number;
  links: Id[];                // undirected; listing one side is enough
  ice?: { ice: Id; level?: number }[];
  files?: FileDef[];
  lock?: { item: Id; label: string };     // vault: needs an item to open
  backdoor?: Id;                          // item that lets you skip this node's ICE
  use?: { label: string; ops: StoryOp[]; once?: boolean; cond?: Condition };
  talk?: Id;                              // dialogue id (process nodes)
  netscan?: Id[];                         // systems discovered by netscan here (routers)
  netscanIot?: number;                    // procedural IoT hosts found by netscan (default balance)
  capture?: StoryOp[];                    // extra ops on capture
  module?: string;                        // localhost: game module id ('engine/rng', ...)
}

export interface SystemDef {
  id: Id;
  name: string;
  address: string;
  tier: number;               // 1..5 (localhost uses 6)
  security: number;           // 1..5
  owner: string;
  description: string;
  nodes: NodeDef[];
  capturable?: boolean;       // default true; counts toward Control %
  controlWeight?: number;     // default tier
  hostPower?: number;         // default tier
  gate?: { botnetPower: number; text?: string; items?: { item: Id; mult: number }[] }; // gateway only opens under a DDoS; items scale the threshold
  scriptedFailure?: boolean;  // trace 100 / dump here emits events but story handles consequences
  traceLock?: number;         // trace added at the end of every combat turn on top of the formula
  noReclaim?: boolean;
  noJackOut?: string;         // set: hang up (run/jackOut, combat/jackOut) and disengage are refused with this text (deadmans)
  lock?: { cond: Condition; text: string }; // dial-in (hub/jackIn) refused with text while cond is false
  procedural?: boolean;
  mood?: string;
  motd?: string;              // login banner the UI shows on dial-in (03-systems-flavor)
  tags?: string[];
}

export interface HardwareDef {
  id: Id;
  part: HardwarePart;
  tier: number;               // 0 = starting part
  name: string;
  value: number;              // stat value at this tier
  price: number;
  minRep?: number;
  flavor?: string;
}

export interface ImplantDef {
  id: Id;
  name: string;
  humanity: number;           // humanity cost (negative = gain)
  price: number;
  minRep?: number;
  mods: Modifier[];
  description: string;
  flavor?: string;
}

export interface PerkDef {
  id: Id;
  name: string;
  description: string;
  mods: Modifier[];
  minLevel?: number;
}

export interface ItemDef {
  id: Id;
  name: string;
  description: string;
  kind: 'key' | 'password' | 'exploit' | 'misc';
}

export interface NpcDef {
  id: Id;
  name: string;
  handle: string;
  description?: string;
}

export interface StockDef {
  id: Id;
  kind: 'program' | 'hardware' | 'implant' | 'item' | 'address' | 'info' | 'service' | 'file';
  ref?: Id;                   // program / hardware / implant / item / system id
  file?: FileDef;             // kind 'file': taken like loot (lore, paydata, item...)
  name?: string;
  text?: string;              // info text delivered as a message
  price: number;
  minRep?: number;
  cond?: Condition;
  once?: boolean;             // default true for item/address/info
  ops?: StoryOp[];            // extra ops when bought
}

export interface VendorDef {
  id: Id;
  name: string;
  npc?: Id;
  kind: 'hardware' | 'warez' | 'clinic' | 'broker' | 'fixer';
  autoStock?: 'hardware' | 'programs' | 'implants';
  stock: StockDef[];
  cond?: Condition;
}

export type ObjectiveDef =
  | { kind: 'deliver'; file: Id; text: string }     // have the paydata file at turn-in (it is consumed)
  | { kind: 'own'; system: Id; text: string }
  | { kind: 'capture'; system: Id; node: Id; text: string }
  | { kind: 'use'; system: Id; node: Id; text: string }
  | { kind: 'flag'; flag: string; is?: FlagValue; text: string };

export interface JobDef {
  id: Id;
  title: string;
  giver: Id;
  description: string;
  minRep?: number;
  cond?: Condition;           // auto-offered on the fixer board when true (if autoOffer)
  autoOffer?: boolean;
  objectives: ObjectiveDef[];
  reward: { credits?: number; xp?: number; ops?: StoryOp[] };
  heat?: number;              // loud job: heat added on completion
  target?: Id;                // system the job points at (UI hint)
}

export interface TriggerDef {
  id: Id;
  on?: GameEventType;         // fire on this event type...
  match?: Record<string, MatchValue>;    // ...whose fields match (see MatchValue)
  cond?: Condition;           // and when this holds. With no `on`, checked after every action.
  ops: StoryOp[];
  once?: boolean;             // default true
  max?: number;               // with once: false, stop after this many fires
  priority?: number;          // higher fires first
}

/**
 * Trigger match value against one event field:
 * - primitive: equal; or, if the event field is an array, the array contains it
 * - array: the event field equals one of them
 * - { gte?, lte? }: numeric range
 */
export type MatchValue = JsonPrimitive | JsonPrimitive[] | { gte?: number; lte?: number };

export interface DialogueChoice {
  text: string;
  to?: Id;                    // next node; omitted = end dialogue
  cond?: Condition;
  showLocked?: boolean;       // show greyed-out with lockedText when cond fails
  lockedText?: string;
  ops?: StoryOp[];
}

export interface DialogueNode {
  speaker?: Id;               // npc id; defaults to the dialogue speaker
  text: string;
  textCold?: string;          // optional variant shown at low humanity (< 40)
  variants?: { cond: Condition; text: string; textCold?: string }[]; // first whose cond holds replaces text
  ops?: StoryOp[];            // run on entering the node
  choices?: DialogueChoice[]; // none: a "continue" that goes to `next` or ends
  next?: Id;
}

export interface DialogueDef {
  id: Id;
  speaker: Id;
  start: Id;
  nodes: Record<Id, DialogueNode>;
}

export interface SetupDef {
  startCredits: number;
  startPrograms: Id[];
  startLoadout: Id[];
  startHardware?: Partial<Record<HardwarePart, number>>;
  startItems?: Id[];
  knownSystems: Id[];
  hunterIce: Id[];            // index = system tier - 1 (clamped)
  raidIce: Id[][];            // index = rep tier (rep-1)/2 clamped; the home Raid squad
  localhost: Id;              // finale system id
  exchange: Id;               // owning this enables pump/dump
  finaleBoss: Id;             // CHAIRMAN v2 ice id
  patchIce: Id;               // the botnet-turns-on-you fight ICE
  cheatProgram?: Id;          // joke program for early cheat attempts
}

export interface ProcgenTables {
  devices: string[];          // "toaster", "doorbell", ...
  brands: string[];
  tlds: string[];
  iceByTier: Id[][];          // index tier-1
  paydata: { name: string; value: number }[];
  suffixes?: string[];        // name/address: `${brand}-${device}-${suffix}`
  owners?: string[];          // possessive; ~30% of names become `${owner} ${device}`
  descriptions?: Record<string, string[]>; // by device
  genericDescriptions?: string[];
}

export interface IceScriptApi {
  readonly state: GameState;
  readonly ice: IceInstance;
  readonly content: Content;
  apply(ops: CombatOp[]): void;      // run ops with this ICE as source
  rng(): number;
  emit(e: GameEvent): void;
  setIntent(intentId: Id): void;
}

export interface IceScript {
  chooseIntent?(api: IceScriptApi): Id | undefined;
  onTurnEnd?(api: IceScriptApi): void;
  onPhase?(api: IceScriptApi, phase: number): void;
  onDefeat?(api: IceScriptApi): void;
}

export interface ScriptApi {
  readonly state: GameState;
  readonly content: Content;
  combatOps(ops: CombatOp[], target?: Id): void; // run combat ops as the player (in combat only)
  storyOps(ops: StoryOp[]): void;
  rng(): number;
  emit(e: GameEvent): void;
}

export type ScriptFn = (api: ScriptApi, params: JsonValue | undefined) => void;

export interface Content {
  programs: Record<Id, ProgramDef>;
  ice: Record<Id, IceDef>;
  hardware: HardwareDef[];
  implants: Record<Id, ImplantDef>;
  perks: Record<Id, PerkDef>;
  items: Record<Id, ItemDef>;
  npcs: Record<Id, NpcDef>;
  systems: Record<Id, SystemDef>;
  vendors: Record<Id, VendorDef>;
  jobs: Record<Id, JobDef>;
  triggers: TriggerDef[];
  dialogues: Record<Id, DialogueDef>;
  setup: SetupDef;
  procgen: ProcgenTables;
  iceScripts?: Record<Id, IceScript>;
  scripts?: Record<Id, ScriptFn>; // program/story `script` ops
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

export interface Paydata {
  uid: string;
  file: Id;
  name: string;
  value: number;
  encrypted: number;          // 0 = plain
  tagged: boolean;
  system: Id;
}

export interface Host {
  uid: string;
  name: string;
  power: number;              // base power (modifiers apply on read)
  tier: number;
  role: HostRole;
  system?: Id;                // owned system this host is
}

export interface AddressEntry {
  system: Id;
  source: string;
  cycle: number;
  notes: string[];
}

export interface SystemProgress {
  owned: boolean;
  patch: number;              // ICE level bonus from reclaim/patching
  hardenedUntil: number;      // cycle; ICE +1 while cycle < this
  revealed: Id[];             // nodes known from earlier runs
  looted: Id[];               // file ids taken (never respawn)
  used: Id[];                 // node ids used (once-only IO)
  netscanned: Id[];           // router node ids already netscanned for story addresses
  runs: number;
}

export interface PlayerState {
  handle: string;
  credits: number;
  frozenCredits: number;
  coin: number;
  xp: number;
  rep: number;
  humanity: number;
  heat: number;
  integrity: number;
  neural: number;
  hardware: Record<HardwarePart, number>; // tier per part
  programs: Record<Id, { corrupted: boolean }>;
  loadout: Id[];
  implants: Id[];
  perks: Id[];
  pendingPerks: Id[] | null;
  items: Id[];
  paydata: Paydata[];
  lore: Id[];
  hosts: Host[];
  flatlinesTotal: number;     // mirror of the cross-save counter (read-only for rules)
}

export interface WorldState {
  coinPrice: number;
  coinHistory: number[];
  nextPriceCycle: number;
  pumpReadyAt: number;
  nextReclaimCycle: number;
  addressBook: Record<Id, AddressEntry>;
  systems: Record<Id, SystemProgress>;
  procSystems: Record<Id, SystemDef>;
  procCounter: number;
}

export type RunNodeState = 'locked' | 'open' | 'hostile' | 'asleep' | 'cleared' | 'captured';

export interface RunNode {
  id: Id;
  revealed: boolean;
  probed: boolean;
  state: RunNodeState;        // open = no ICE but not reached yet (not passable); asleep = sneaked past
  ice: IceInstance[];
  sealed: boolean;
}

export interface RunState {
  system: Id;
  trace: number;
  nodes: Record<Id, RunNode>;
  position: Id;
  previous: Id | null;
  haul: Paydata[];
  charges: number;
  securityCaptured: boolean;
  startedCycle: number;
  ghostUsed: boolean;
  netscanned: Id[];          // routers netscanned this run
  actions: number;
  nextFight?: CombatOp[];    // StoryOp nextFight queue
  securityDelta?: number;    // StoryOp runSecurity
  secondWindUsed?: boolean;
}

export interface IceInstance {
  uid: string;
  def: Id;
  name: string;
  level: number;
  bonus: number;             // levels above def.level
  shell: { type: ShellType; points: number; max: number };
  core: number;
  coreMax: number;
  status: IceStatuses;
  intent: Id | null;
  seq: number;
  phase: number;             // index into def.phases + 1 (0 = base)
  subverted: boolean;
  dead: boolean;
  lastHitKind: DamageKind | null;
  turns: number;             // ICE turns taken
  firedTriggers: number[];
}

export interface ProgramCombatState {
  stacks: number;
  cooldown: number;
  usedThisTurn: number;
  usedLastTurn: boolean;
  uses: number;
  evicted: boolean;
}

export interface DaemonInstance {
  program: Id;
  turnsLeft: number;         // -1 = whole fight
  ram: number;
}

export type CombatContext = 'node' | 'raid' | 'finale' | 'patch';

export interface CombatState {
  context: CombatContext;
  node: Id | null;
  turn: number;
  cycles: number;
  shield: number;
  ice: IceInstance[];
  programs: Record<Id, ProgramCombatState>;
  daemons: DaemonInstance[];
  categories: ProgramCategory[]; // categories used this turn
  flowNext: boolean;             // Flow earned: bonus applies next turn
  flowActive: boolean;           // Flow bonus active this turn
  noise: number;                 // program noise this turn
  botnetUsed: boolean;
  status: PlayerStatuses;
  demand: { id: string; text: string; penalty: CombatOp[]; source: string } | null;
  offer: { id: string; text: string; credits: number } | null;
  pending: { ice: Id; level: number; turns: number }[]; // reinforcements arriving
  hunterJoined: boolean;
  painEditorUsed: boolean;
  ambush: boolean;
  lastProgram: Id | null;
  charges: number;               // botnet charges (copied from the run, written back at the end)
  bonusCycles: number;           // extra cycles every turn (PATCH fight: loyal mine/proxy hosts)
  comboRefunded?: boolean;       // comboRefund used this turn
}

export interface Message {
  id: string;
  from: Id;
  text: string;
  subject?: string;
  channel: MessageChannel;
  cycle: number;
  read: boolean;
}

export interface LogEntry {
  cycle: number;
  level: LogLevel;
  text: string;
}

export interface DialogueState {
  id: Id;
  node: Id;
}

export interface JobState {
  status: JobStatus;
  acceptedCycle?: number;
}

export interface StoryState {
  flags: Record<string, FlagValue>;
  fired: Id[];
  jobs: Record<Id, JobState>;
  bought: Id[];               // vendor stock ids bought (vendorId:stockId) for once-only stock
  counts: Record<Id, number>; // fire counts for repeatable triggers
  objectives: Record<Id, ObjectiveState>;
}

export interface ObjectiveState {
  id: Id;
  kind: ObjectiveKind;
  anchor?: string;
  speaker?: Id;
  text: string;
  status: ObjectiveStatus;
  n?: number;
  max?: number;
  doneWhen?: Condition;
  cycle: number;              // when added
}

export interface MetaState {
  modules: Record<string, boolean>; // localhost modules captured ('engine/rng', 'ui', ...)
  rootKey: string[];                // 4 fragments, random per save
  root: boolean;                    // sudo succeeded
  finale: FinaleStage;
  unlocked: boolean;                // meta console visibly unlocked
  cheatWarned: boolean;
  rmPending: boolean;               // `rm -rf /` asked for confirmation
  finaleCheckpoint: boolean;
  chairmanKilled: boolean;
  patchBroken: boolean;             // PATCH's botnet fight won
  fragments: boolean[];             // which root-key fragments the player has found (meta/fragmentFound)
  cheatCount: number;
  integrityResets: number;          // finale: integrity hit 0 and was faked back to full
}

export interface Stats {
  runs: number;
  runsBySystem: Record<Id, number>;
  fightsWon: number;
  fightsLost: number;
  disengages: number;
  dumped: number;
  traced: number;
  flatlines: number;
  raidsWon: number;
  raidsLost: number;
  creditsEarned: number;
  programsRun: number;
  hostsBurned: number;
  cyclesBySystem: Record<Id, number>;
  systemsOwned: number;
  programUses?: Record<Id, number>; // per program, whole save (credits)
  botnetPeak?: number;               // most Botnet-role hosts at once
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  cycle: number;
  nextUid: number;
  mode: GameMode;
  player: PlayerState;
  world: WorldState;
  run: RunState | null;
  combat: CombatState | null;
  story: StoryState;
  dialogue: DialogueState | null;
  cinematic?: { id: string; data?: JsonValue } | null; // set by StoryOp cinematic until ui/cinematicDone
  messages: Message[];
  log: LogEntry[];
  meta: MetaState;
  ending: EndingId | null;
  endless: boolean;
  stats: Stats;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type NodeActionType =
  | 'run/probe' | 'run/sneak' | 'run/breach' | 'run/backdoor' | 'run/unlock'
  | 'run/loot' | 'run/capture' | 'run/use' | 'run/talk' | 'run/netscan' | 'run/enter';

export type MetaCommand = 'kill' | 'sudo' | 'free' | 'accept' | 'rmrf';

export type Action =
  // hub
  | { type: 'hub/jackIn'; system: Id }
  | { type: 'loadout/set'; programs: Id[] }
  | { type: 'loadout/add'; program: Id }
  | { type: 'loadout/remove'; program: Id }
  | { type: 'shop/buy'; vendor: Id; stock: Id }
  | { type: 'shop/sellProgram'; program: Id }
  | { type: 'program/repair'; program: Id }
  | { type: 'paydata/sell'; uid: string }
  | { type: 'paydata/sellAll' }
  | { type: 'paydata/decrypt'; uid: string }
  | { type: 'paydata/clean'; uid: string }
  | { type: 'coin/sell'; amount: number }
  | { type: 'coin/buy'; amount: number }
  | { type: 'exchange/pump' }
  | { type: 'exchange/dump' }
  | { type: 'clinic/healNeural' }
  | { type: 'fixer/scrubHeat'; amount: number }
  | { type: 'botnet/setRole'; host: string; role: HostRole }
  | { type: 'job/accept'; job: Id }
  | { type: 'job/turnIn'; job: Id }
  | { type: 'job/abandon'; job: Id }
  | { type: 'perk/choose'; perk: Id }
  | { type: 'message/read'; id: string }
  | { type: 'dialogue/start'; dialogue: Id }
  | { type: 'dialogue/choose'; index: number }
  | { type: 'endless/generate'; tier?: number }
  | { type: 'endless/continue' }                  // after the RETENTION ending: back to the hub in Endless mode
  // run (out of combat)
  | { type: NodeActionType; node: Id }
  | { type: 'run/jackOut' }
  // combat
  | { type: 'combat/program'; program: Id; target?: string }
  | { type: 'combat/botnet'; kind: BotnetActionKind; target?: string }
  | { type: 'combat/endTurn' }
  | { type: 'combat/disengage' }
  | { type: 'combat/jackOut' }
  | { type: 'combat/answerDemand' }
  | { type: 'combat/acceptOffer' }
  // ui / meta hooks
  | { type: 'ui/cinematicDone'; id: string }
  | { type: 'ui/log'; lines: { text: string; level: LogLevel }[] } // append shown text to state.log: no events, no triggers, no cycles
  | { type: 'ui/hintDone'; id: Id }                 // mark a tutorial objective done ("Got it")
  | { type: 'meta/command'; cmd: MetaCommand; arg?: string; confirm?: boolean }
  | { type: 'meta/cheatAttempt'; what?: string }
  | { type: 'meta/moduleFlag'; module: string }   // meta layer marks a module captured (debug/fallback)
  | { type: 'meta/fragmentFound'; index: number }  // root-key fragment 0..3 revealed by any route
  | { type: 'meta/session'; awayMinutes: number; timeAway?: string } // session start, real time since last save
  | { type: 'lore/read'; file: Id }
  | { type: 'debug/set'; patch: JsonValue };       // tests and sim only: deep-merge into state

export type ActionType = Action['type'];

// ---------------------------------------------------------------------------
// Events (returned by dispatch, used by UI animation/sound and story triggers)
// ---------------------------------------------------------------------------

export type GameEvent =
  | { type: 'game.started'; handle: string; endless: boolean }
  | { type: 'game.loaded'; from: 'slot' | 'checkpoint' }
  | { type: 'action.rejected'; action: ActionType; reason: string }
  | { type: 'cycle.tick'; cycle: number; count: number }
  | { type: 'coin.price'; price: number; prev: number }
  | { type: 'coin.mined'; amount: number }
  | { type: 'heat.changed'; value: number; delta: number }
  | { type: 'heat.threshold'; level: HeatLevel; rising: boolean }
  | { type: 'credits.changed'; value: number; delta: number; reason: string }
  | { type: 'xp.gained'; amount: number; total: number }
  | { type: 'rep.levelUp'; level: number }
  | { type: 'perk.offered'; perks: Id[] }
  | { type: 'perk.chosen'; perk: Id }
  | { type: 'humanity.changed'; value: number; delta: number }
  | { type: 'item.gained'; item: Id }
  | { type: 'item.lost'; item: Id }
  | { type: 'program.gained'; program: Id }
  | { type: 'program.corrupted'; program: Id }
  | { type: 'program.repaired'; program: Id }
  | { type: 'program.sold'; program: Id; credits: number }
  | { type: 'lore.gained'; file: Id; text: string }
  | { type: 'paydata.gained'; uid: string; file: Id; name: string; value: number }
  | { type: 'paydata.sold'; uid: string; credits: number; heat: number }
  | { type: 'paydata.decrypted'; uid: string; value: number }
  | { type: 'paydata.cleaned'; uid: string }
  | { type: 'paydata.lost'; count: number }
  | { type: 'shop.bought'; vendor: Id; stock: Id; kind: StockDef['kind']; ref: Id | null; price: number }
  | { type: 'implant.installed'; implant: Id }
  | { type: 'hardware.changed'; part: HardwarePart; tier: number }
  | { type: 'host.added'; uid: string; name: string; power: number }
  | { type: 'host.role'; uid: string; role: HostRole }
  | { type: 'host.burned'; uid: string; name: string; role: HostRole; system?: Id }
  | { type: 'address.added'; system: Id; source: string }
  | { type: 'system.owned'; system: Id }
  | { type: 'system.lost'; system: Id; reason: 'reclaimed' | 'burned' | 'story' }
  | { type: 'system.hardened'; system: Id; until: number }
  | { type: 'run.started'; system: Id; trace: number }
  | { type: 'run.ended'; system: Id; reason: 'jackout' | 'dumped' | 'traced' | 'flatlined' | 'scripted'; haul: number }
  | { type: 'node.revealed'; system: Id; nodes: Id[] }
  | { type: 'node.probed'; system: Id; node: Id; honeypot: boolean; ice: Id[] }
  | { type: 'node.sneak'; system: Id; node: Id; chance: number; success: boolean }
  | { type: 'node.cleared'; system: Id; node: Id }
  | { type: 'node.unlocked'; system: Id; node: Id }
  | { type: 'node.backdoored'; system: Id; node: Id }
  | { type: 'node.sealed'; system: Id; nodes: Id[] }
  | { type: 'node.looted'; system: Id; node: Id; files: Id[]; honeypot: boolean }
  | { type: 'node.captured'; node: Id; nodeType: NodeType; system: Id }
  | { type: 'node.used'; node: Id; system: Id }
  | { type: 'node.talk'; system: Id; node: Id; dialogue: Id }
  | { type: 'netscan'; system: Id; node: Id; found: Id[] }
  | { type: 'hub.entered' }
  | { type: 'gate.opened'; system: Id; power: number; needed: number }
  | { type: 'gate.denied'; system: Id; power: number; needed: number }
  | { type: 'trace.changed'; value: number; delta: number; source: string }
  | { type: 'trace.threshold'; level: TraceLevel }
  | { type: 'combat.started'; context: CombatContext; system: Id | null; node: Id | null; ambush: boolean; ice: string[]; defs: Id[] }
  | { type: 'combat.turnStart'; turn: number; cycles: number; flow: boolean }
  | { type: 'combat.program'; program: Id; target: string | null; mult: number; stacks: number } // stacks after this use
  | { type: 'combat.daemon'; program: Id; started: boolean }
  | { type: 'combat.damage'; target: string; kind: DamageKind | 'raw'; shell: number; core: number; crit: boolean; mult: number; reflected: number }
  | { type: 'combat.shellBroken'; target: string }
  | { type: 'combat.iceStatus'; target: string; status: IceStatusKey | 'rootable'; value: number }
  | { type: 'combat.playerStatus'; status: PlayerStatusKey | 'scrambled'; value: number; program?: Id }
  | { type: 'combat.iceAct'; ice: string; intent: Id; label: string; skipped: 'stunned' | 'slowed' | null }
  | { type: 'combat.intent'; ice: string; intent: Id | null }
  | { type: 'combat.playerHit'; amount: number; shield: number; integrity: number; neural: number; decoyed: boolean; source: string }
  | { type: 'combat.shield'; value: number; delta: number }
  | { type: 'combat.repair'; integrity: number; delta: number }
  | { type: 'combat.neural'; value: number; delta: number }
  | { type: 'combat.iceSpawned'; ice: string; def: Id; reason: 'summon' | 'split' | 'hunter' | 'reinforcement' }
  | { type: 'combat.iceDefeated'; ice: string; def: Id }
  | { type: 'combat.iceSubverted'; ice: string; def: Id }
  | { type: 'combat.phase'; ice: string; phase: number; name?: string; text?: string }
  | { type: 'combat.flow'; earned: boolean; categories: number; needed: number }
  | { type: 'combat.botnet'; kind: BotnetActionKind; power: number; charges: number }
  | { type: 'combat.evicted'; program: Id }
  | { type: 'combat.demand'; id: string; text: string }
  | { type: 'combat.demandAnswered'; id: string }
  | { type: 'combat.offer'; id: string; text: string; credits: number }
  | { type: 'combat.notify'; text: string; style?: string }
  | { type: 'combat.reinforcements'; ice: Id; turns: number }
  | { type: 'combat.ended'; result: 'victory' | 'disengaged' | 'jackedOut' | 'dumped' | 'flatlined' | 'offer' | 'scripted' | 'traced'; context: CombatContext }
  | { type: 'player.dumped'; program: Id | null }
  | { type: 'player.traced'; fine: number }
  | { type: 'player.flatlined'; total: number }
  | { type: 'raid.started'; ice: Id[] }
  | { type: 'raid.ended'; won: boolean; lostPart: HardwarePart | null; lostCredits: number }
  | { type: 'message.received'; id: string; from: Id; channel: MessageChannel }
  | { type: 'log'; level: LogLevel; text: string }
  | { type: 'story.flag'; flag: string; value: FlagValue }
  | { type: 'story.trigger'; id: Id }
  | { type: 'dialogue.opened'; dialogue: Id; node: Id }
  | { type: 'dialogue.node'; dialogue: Id; node: Id }
  | { type: 'dialogue.closed'; dialogue: Id }
  | { type: 'job.status'; job: Id; status: JobStatus }
  | { type: 'module.captured'; module: string }
  | { type: 'meta.unlocked' }
  | { type: 'meta.output'; cmd: MetaCommand | 'cheat'; ok: boolean; lines: string[] }
  | { type: 'meta.root'; granted: boolean }
  | { type: 'meta.fragment'; index: number; count: number }
  | { type: 'meta.cheat'; count: number; what: string; finale: boolean }
  | { type: 'meta.key'; key: string; value: string | null }
  | { type: 'session.resumed'; awayMinutes: number; timeAway: string }
  | { type: 'lore.read'; file: Id }
  | { type: 'objective'; id: Id; status: ObjectiveStatus; kind: ObjectiveKind }
  | { type: 'loadout.changed'; programs: Id[] }
  | { type: 'finale.integrityReset'; count: number }
  | { type: 'finale.patchLost'; botnetHosts: number; loyalHosts: number; bonusCycles: number }
  | { type: 'finale.stage'; stage: FinaleStage }
  | { type: 'ending'; ending: EndingId }
  | { type: 'endless.unlocked' }
  | { type: 'cinematic'; id: string; data?: JsonValue }
  | { type: 'cinematic.done'; id: string }
  | { type: 'mood'; mood: string }
  | { type: 'custom'; name: string; data?: JsonValue };

export type GameEventType = GameEvent['type'];

// ---------------------------------------------------------------------------
// Injected services
// ---------------------------------------------------------------------------

/** localStorage-compatible. The engine only touches keys starting with `cw.`. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface Ctx {
  readonly state: GameState;
  readonly content: Content;
}
