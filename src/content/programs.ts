// Programs. Owner: content agent. Vocabulary: CombatOp in src/engine/types.ts (see docs/ENGINE_API.md).
// Names and flavor: docs/script/04-items-flavor.md §2. Ids: `prog.<family>` (v1), `prog.<family>_v2`, `prog.<family>_v3`;
// the pinger family is `prog.pinger_v1..v3` (story id contract, 01-beats §H).
//
// Status economy (DESIGN §6.3: every tag has >= 2 appliers and >= 2 payoffs):
//   Mapped     peek*, sonar*, rainbow*, lookout*, giftbox_v2 (+ imp.eidetic_lens)  -> crit on any hit; rainbow self-crits
//   Unstable   keysmash*, static*, stare, sleeper_v2, pickpocket_v3                 -> bucket*, popcorn*
//   Backdoored giftbox*, sleeper*                                                    -> rootkit*, root_shell
//   Exposed    peek_v2/v3, milspec_icebreaker, tapeworm_v3 (+ aegis test range IO)  -> needles* extra hits, any off-kind hit
//   Stunned    lullaby*, sleeper_v3 (+ botnet DDoS)                                  -> brute*, ram* bonus damage
//   Slowed     lullaby / DDoS on bosses (+ orbital thrusters IO)                     -> brute*, ram* bonus damage
//   Marked     flare*, sonar_v3, lookout_v3                                          -> botnet actions x1.5, pinger* bonus
//   Infected   wiggler*, tapeworm*, chainletter*, fryer_daemon                       -> chainletter spread, fever*, Hydra no-split
//   Decoy      cutout*, guard_dog*        Masked moustache*, bounce_v2/v3        Anchored/Tarred/Burn/Scrambled: bounce*, tinfoil*, duct_tape_v3
import type { CombatOp, IceCond, ProgramDef } from '../engine/types.ts';

type P = Omit<ProgramDef, 'category' | 'cost' | 'cooldown' | 'noise' | 'ram' | 'targeting' | 'price'>
  & Partial<Pick<ProgramDef, 'cost' | 'cooldown' | 'noise' | 'ram' | 'targeting' | 'price'>>;

const mk = (category: ProgramDef['category'], targeting: ProgramDef['targeting']) => (o: P): ProgramDef =>
  ({ category, cost: 1, cooldown: 0, noise: 1, ram: 1, targeting, price: 0, ...o });
const attack = mk('attack', 'ice');
const exploit = mk('exploit', 'ice');
const exploitAll = mk('exploit', 'none');
const defense = mk('defense', 'none');
const stealth = mk('stealth', 'none');
const stealthIce = mk('stealth', 'ice');
const daemon = mk('daemon', 'none');
const special = mk('special', 'ice');

// payoff conditions (target ICE)
const stunnedOrSlowed: IceCond = { c: 'any', of: [{ c: 'status', status: 'stunned' }, { c: 'status', status: 'slowed' }] };
const exposed: IceCond = { c: 'status', status: 'exposed' };
const infected: IceCond = { c: 'status', status: 'infected' };
const marked: IceCond = { c: 'status', status: 'marked' };
const mapped: IceCond = { c: 'status', status: 'mapped' };
const bonusIf = (cond: IceCond, ops: CombatOp[]): CombatOp => ({ op: 'ifIce', cond, ops });

export const programs: ProgramDef[] = [
  // ===========================================================================
  // ATTACK
  // ===========================================================================
  attack({
    id: 'prog.lockpick', name: 'lockpick', family: 'lockpick', version: 1,
    ops: [{ op: 'damage', kind: 'crack', amount: 3, spread: 1 }],
    description: 'Crack 3-4. x2 vs crypt shells, x0.5 vs walls.',
    flavor: 'Picks crypt shells. Slowly. Lovingly.',
  }),
  attack({
    id: 'prog.lockpick_v2', name: 'lockpick.pro', family: 'lockpick', version: 2, price: 450, minRep: 2, requires: { cpu: 1 },
    ops: [{ op: 'damage', kind: 'crack', amount: 5, spread: 1 }],
    description: 'Crack 5-6. Needs CPU tier 1.',
    flavor: 'Picks crypt shells. Slowly. Lovingly. Now with a subscription.',
  }),
  attack({
    id: 'prog.lockpick_v3', name: 'lockpick_FINAL_v3_real', family: 'lockpick', version: 3, price: 2200, minRep: 5, requires: { cpu: 3 },
    ops: [bonusIf(mapped, [{ op: 'damage', kind: 'crack', amount: 3 }]), { op: 'damage', kind: 'crack', amount: 8, spread: 2 }],
    description: 'Crack 8-10, +3 vs a Mapped target. Needs CPU tier 3.',
    flavor: 'The final version. The real one. Do not open lockpick_FINAL_v3_real(2).',
  }),
  attack({
    id: 'prog.crowbar', name: 'crowbar', family: 'crowbar', version: 1,
    ops: [{ op: 'damage', kind: 'spike', amount: 3, spread: 1 }],
    description: 'Spike 3-4. x2 vs wall shells, x0.5 vs crypt.',
    flavor: 'Hits walls. Simple tools for simple problems.',
  }),
  attack({
    id: 'prog.crowbar_v2', name: 'crowbar2', family: 'crowbar', version: 2, price: 450, minRep: 2, requires: { cpu: 1 },
    ops: [{ op: 'damage', kind: 'spike', amount: 5, spread: 1 }],
    description: 'Spike 5-6. Needs CPU tier 1.',
    flavor: 'Hits walls. Hits them twice as hard. Still simple.',
  }),
  attack({
    id: 'prog.crowbar_v3', name: 'crowbar_deluxe', family: 'crowbar', version: 3, price: 2200, minRep: 5, requires: { cpu: 3 },
    ops: [bonusIf(mapped, [{ op: 'damage', kind: 'spike', amount: 3 }]), { op: 'damage', kind: 'spike', amount: 8, spread: 2 }],
    description: 'Spike 8-10, +3 vs a Mapped target. Needs CPU tier 3.',
    flavor: 'Comes in a velvet case. Still a crowbar.',
  }),
  attack({
    id: 'prog.brute', name: 'brute', family: 'brute', version: 1, cost: 2, cooldown: 1, noise: 3, ram: 2, price: 320, minRep: 2,
    ops: [{ op: 'damage', kind: 'crack', amount: 6, spread: 2 }, bonusIf(stunnedOrSlowed, [{ op: 'damage', kind: 'crack', amount: 3 }])],
    description: 'Heavy, loud crack 6-8. +3 crack vs a Stunned or Slowed target.',
    flavor: 'Tries every password, starting with "password".',
  }),
  attack({
    id: 'prog.brute_v2', name: 'brute.force', family: 'brute', version: 2, cost: 2, cooldown: 1, noise: 3, ram: 2, price: 1300, minRep: 4, requires: { cpu: 2 },
    ops: [{ op: 'damage', kind: 'crack', amount: 9, spread: 2 }, bonusIf(stunnedOrSlowed, [{ op: 'damage', kind: 'crack', amount: 5 }])],
    description: 'Heavy, loud crack 9-11. +5 crack vs a Stunned or Slowed target. Needs CPU tier 2.',
    flavor: 'Now tries "password1" as well.',
  }),
  attack({
    id: 'prog.brute_v3', name: 'brute.forcer.forcest', family: 'brute', version: 3, cost: 2, cooldown: 1, noise: 4, ram: 2, price: 4200, minRep: 7, requires: { cpu: 3 },
    ops: [{ op: 'damage', kind: 'crack', amount: 13, spread: 3 }, bonusIf(stunnedOrSlowed, [{ op: 'damage', kind: 'crack', amount: 7 }])],
    description: 'Heavy, loud crack 13-16. +7 crack vs a Stunned or Slowed target. Needs CPU tier 3.',
    flavor: 'Forcest. Not a word. Neither is subtle.',
  }),
  attack({
    id: 'prog.ram', name: 'ram', family: 'ram', version: 1, cost: 2, cooldown: 1, noise: 3, ram: 2, price: 320, minRep: 2,
    ops: [{ op: 'damage', kind: 'spike', amount: 6, spread: 2 }, bonusIf(stunnedOrSlowed, [{ op: 'damage', kind: 'spike', amount: 3 }])],
    description: 'Heavy, loud spike 6-8. +3 spike vs a Stunned or Slowed target.',
    flavor: "Doesn't knock. Doesn't wait. Doesn't stop.",
  }),
  attack({
    id: 'prog.ram_v2', name: 'ram_ram', family: 'ram', version: 2, cost: 2, cooldown: 1, noise: 3, ram: 2, price: 1300, minRep: 4, requires: { cpu: 2 },
    ops: [{ op: 'damage', kind: 'spike', amount: 9, spread: 2 }, bonusIf(stunnedOrSlowed, [{ op: 'damage', kind: 'spike', amount: 5 }])],
    description: 'Heavy, loud spike 9-11. +5 spike vs a Stunned or Slowed target. Needs CPU tier 2.',
    flavor: 'Two rams. One door. No door.',
  }),
  attack({
    id: 'prog.ram_v3', name: 'megaram', family: 'ram', version: 3, cost: 2, cooldown: 1, noise: 4, ram: 2, price: 4200, minRep: 7, requires: { cpu: 3 },
    ops: [{ op: 'damage', kind: 'spike', amount: 13, spread: 3 }, bonusIf(stunnedOrSlowed, [{ op: 'damage', kind: 'spike', amount: 7 }])],
    description: 'Heavy, loud spike 13-16. +7 spike vs a Stunned or Slowed target. Needs CPU tier 3.',
    flavor: 'Licensed from a demolition company that no longer exists. Because of megaram.',
  }),
  attack({
    id: 'prog.rainbow', name: 'rainbow', family: 'rainbow', version: 1, cost: 2, cooldown: 1, noise: 2, price: 300, minRep: 2,
    ops: [bonusIf(mapped, [{ op: 'damage', kind: 'crack', amount: 2 }]), { op: 'iceStatus', status: 'mapped', value: 1 }, { op: 'damage', kind: 'crack', amount: 4, spread: 1 }],
    description: 'Maps the target (1 turn), then cracks 4-5. The hit always crits. +2 crack first if it was already Mapped.',
    flavor: 'Precomputed answers to questions nobody asked yet.',
  }),
  attack({
    id: 'prog.rainbow_v2', name: 'doublerainbow', family: 'rainbow', version: 2, cost: 2, cooldown: 1, noise: 2, price: 1200, minRep: 4, requires: { cpu: 2 },
    ops: [bonusIf(mapped, [{ op: 'damage', kind: 'crack', amount: 3 }]), { op: 'iceStatus', status: 'mapped', value: 2 }, { op: 'damage', kind: 'crack', amount: 6, spread: 1 }],
    description: 'Maps the target (2 turns), then cracks 6-7. The hit always crits. +3 crack first if it was already Mapped. Needs CPU tier 2.',
    flavor: 'All the way across the sky. What does it mean.',
  }),
  attack({
    id: 'prog.rainbow_v3', name: 'rainbow.table.of.contents', family: 'rainbow', version: 3, cost: 2, cooldown: 1, noise: 2, price: 3600, minRep: 6, requires: { cpu: 3 },
    ops: [bonusIf(mapped, [{ op: 'damage', kind: 'crack', amount: 4 }]), { op: 'iceStatus', status: 'mapped', value: 2 }, { op: 'damage', kind: 'crack', amount: 9, spread: 2 }],
    description: 'Maps the target (2 turns), then cracks 9-11. The hit always crits. +4 crack first if it was already Mapped. Needs CPU tier 3.',
    flavor: 'Chapter 1: every answer. Chapter 2: see chapter 1.',
  }),
  attack({
    id: 'prog.needles', name: 'needle', family: 'needles', version: 1, price: 220, minRep: 2,
    ops: [bonusIf(exposed, [{ op: 'damage', kind: 'spike', amount: 1, hits: 3 }]), { op: 'damage', kind: 'spike', amount: 1, hits: 3 }],
    description: 'Spike 1, three times. Three more hits if the target is Exposed.',
    flavor: 'Death by a thousand pokes. Well. Three pokes.',
  }),
  attack({
    id: 'prog.needles_v2', name: 'needles', family: 'needles', version: 2, cost: 2, price: 900, minRep: 4, requires: { cpu: 1 },
    ops: [bonusIf(exposed, [{ op: 'damage', kind: 'spike', amount: 1, hits: 4 }]), { op: 'damage', kind: 'spike', amount: 1, hits: 6 }],
    description: 'Spike 1, six times. Four more hits if the target is Exposed.',
    flavor: 'Death by a thousand pokes. Well. Six pokes.',
  }),
  attack({
    id: 'prog.needles_v3', name: 'haystack', family: 'needles', version: 3, cost: 2, price: 3200, minRep: 6, requires: { cpu: 3 },
    ops: [bonusIf(exposed, [{ op: 'damage', kind: 'spike', amount: 2, hits: 4 }]), { op: 'damage', kind: 'spike', amount: 2, hits: 5 }],
    description: 'Spike 2, five times. Four more hits if the target is Exposed.',
    flavor: 'You will not find the needle. The needle will find you.',
  }),
  attack({
    id: 'prog.wiggler', name: 'wiggler', family: 'wiggler', version: 1, cost: 2, cooldown: 1, noise: 1, price: 150, minRep: 1,
    ops: [{ op: 'damage', kind: 'worm', amount: 3 }],
    description: 'Infected(+3): core damage at the end of each ICE turn, ignores shells, jumps on death. Stops Hydra splits.',
    flavor: "Crawls in. Doesn't leave. Doesn't pay rent.",
  }),
  attack({
    id: 'prog.wiggler_v2', name: 'wiggler.2', family: 'wiggler', version: 2, cost: 2, cooldown: 1, noise: 2, price: 800, minRep: 3, requires: { cpu: 1 },
    ops: [{ op: 'damage', kind: 'worm', amount: 5 }],
    description: 'Infected(+5).',
    flavor: 'It came back. It brought friends. The friends are also worms.',
  }),
  attack({
    id: 'prog.wiggler_v3', name: 'the_wiggler_returns', family: 'wiggler', version: 3, cost: 2, cooldown: 1, noise: 2, price: 2800, minRep: 6, requires: { cpu: 2 },
    ops: [{ op: 'damage', kind: 'worm', amount: 7 }],
    description: 'Infected(+7).',
    flavor: 'This time it is personal. It was always personal. It is a worm.',
  }),
  attack({
    id: 'prog.tapeworm', name: 'tapeworm', family: 'tapeworm', version: 1, price: 220, minRep: 2,
    ops: [{ op: 'damage', kind: 'worm', amount: 2 }],
    description: 'Cheap Infected(+2). Stack it over several turns.',
    flavor: 'A slow infection. Very patient. Very gross.',
  }),
  attack({
    id: 'prog.tapeworm_v2', name: 'tapeworm_xl', family: 'tapeworm', version: 2, price: 900, minRep: 4,
    ops: [{ op: 'damage', kind: 'worm', amount: 3 }],
    description: 'Cheap Infected(+3).',
    flavor: 'Extra long. Extra patient. Extra gross.',
  }),
  attack({
    id: 'prog.tapeworm_v3', name: 'tapeworm_xxl', family: 'tapeworm', version: 3, price: 3000, minRep: 6, requires: { cpu: 2 },
    ops: [{ op: 'damage', kind: 'worm', amount: 4 }, bonusIf(infected, [{ op: 'iceStatus', status: 'exposed', value: 1 }])],
    description: 'Cheap Infected(+4). The target is Exposed (1) if it was already Infected.',
    flavor: 'It has eaten through the shell. Do not ask what else.',
  }),
  attack({
    id: 'prog.chainletter', name: 'chainletter', family: 'chainletter', version: 1, cost: 2, cooldown: 2, noise: 2, ram: 2, price: 400, minRep: 3,
    ops: [bonusIf(infected, [{ op: 'damage', kind: 'worm', amount: 2, to: 'allEnemies' }]), { op: 'damage', kind: 'worm', amount: 2 }],
    description: 'Infected(+2). If the target was already Infected, every ICE gets Infected(+2) too.',
    flavor: 'Infects. Spreads when the host dies. Forward to ten friends.',
  }),
  attack({
    id: 'prog.chainletter_v2', name: 'chainletter.fwd', family: 'chainletter', version: 2, cost: 2, cooldown: 2, noise: 2, ram: 2, price: 1500, minRep: 5, requires: { cpu: 2 },
    ops: [bonusIf(infected, [{ op: 'damage', kind: 'worm', amount: 3, to: 'allEnemies' }]), { op: 'damage', kind: 'worm', amount: 3 }],
    description: 'Infected(+3). If the target was already Infected, every ICE gets Infected(+3) too.',
    flavor: 'FW: FW: read this or your shell breaks.',
  }),
  attack({
    id: 'prog.chainletter_v3', name: 'chainletter.fwd.fwd.fwd', family: 'chainletter', version: 3, cost: 2, cooldown: 2, noise: 2, ram: 2, price: 4000, minRep: 7, requires: { cpu: 3 },
    ops: [bonusIf(infected, [{ op: 'damage', kind: 'worm', amount: 4, to: 'allEnemies' }]), { op: 'damage', kind: 'worm', amount: 4 }],
    description: 'Infected(+4). If the target was already Infected, every ICE gets Infected(+4) too.',
    flavor: 'FW: FW: FW: FW: it worked on my cousin.',
  }),
  attack({
    id: 'prog.fever', name: 'fever.bat', family: 'fever', version: 1, cost: 1, cooldown: 1, noise: 1, price: 350, minRep: 3,
    ops: [{ op: 'ifIce', cond: infected, ops: [{ op: 'damage', kind: 'crack', amount: 6, spread: 1 }, { op: 'iceStatus', status: 'exposed', value: 1 }], else: [{ op: 'damage', kind: 'crack', amount: 2 }] }],
    description: 'Crack 2. vs an Infected target: crack 6-7 and Exposed (1).',
    flavor: 'Infected ICE runs hot. This makes it run hotter.',
  }),
  attack({
    id: 'prog.fever_v2', name: 'fever.dream', family: 'fever', version: 2, cost: 1, cooldown: 1, noise: 1, price: 1600, minRep: 5, requires: { cpu: 2 },
    ops: [{ op: 'ifIce', cond: infected, ops: [{ op: 'damage', kind: 'crack', amount: 10, spread: 2 }, { op: 'iceStatus', status: 'exposed', value: 1 }], else: [{ op: 'damage', kind: 'crack', amount: 3 }] }],
    description: 'Crack 3. vs an Infected target: crack 10-12 and Exposed (1).',
    flavor: 'The ICE dreams it is a toaster. It is right.',
  }),

  // ===========================================================================
  // EXPLOIT
  // ===========================================================================
  exploit({
    id: 'prog.peek', name: 'peek', family: 'peek', version: 1, cooldown: 1, noise: 0,
    ops: [{ op: 'iceStatus', status: 'mapped', value: 3 }],
    description: 'Mapped (3 turns): see its exact intent. Your next hit on it crits x1.5.',
    flavor: 'Rude, but informative.',
  }),
  exploit({
    id: 'prog.peek_v2', name: 'peek.deep', family: 'peek', version: 2, cooldown: 1, price: 600, minRep: 3,
    ops: [{ op: 'iceStatus', status: 'mapped', value: 3 }, { op: 'iceStatus', status: 'exposed', value: 1 }],
    description: 'Mapped (3) and Exposed (1): its shell is ignored until its turn ends.',
    flavor: 'Rude, informative, and now a bit invasive.',
  }),
  exploit({
    id: 'prog.peek_v3', name: 'stare', family: 'peek', version: 3, cooldown: 1, price: 2200, minRep: 5,
    ops: [{ op: 'iceStatus', status: 'mapped', value: 4 }, { op: 'iceStatus', status: 'exposed', value: 1 }, { op: 'iceStatus', status: 'unstable', value: 2 }],
    description: 'Mapped (4), Exposed (1), Unstable (+2).',
    flavor: 'Do not blink. It hates that.',
  }),
  exploitAll({
    id: 'prog.sonar', name: 'sonar', family: 'sonar', version: 1, cost: 2, cooldown: 2, noise: 2, price: 280, minRep: 2,
    ops: [{ op: 'iceStatus', status: 'mapped', value: 2, to: 'allEnemies' }],
    description: 'Every ICE is Mapped (2 turns).',
    flavor: 'Ping. Ping. Ping. Oh, there you all are.',
  }),
  exploitAll({
    id: 'prog.sonar_v2', name: 'sonar.wide', family: 'sonar', version: 2, cost: 1, cooldown: 2, noise: 2, price: 1100, minRep: 4,
    ops: [{ op: 'iceStatus', status: 'mapped', value: 3, to: 'allEnemies' }],
    description: 'Every ICE is Mapped (3 turns). Costs 1.',
    flavor: 'Wider ping. Same pong.',
  }),
  exploitAll({
    id: 'prog.sonar_v3', name: 'whale_song', family: 'sonar', version: 3, cost: 1, cooldown: 2, noise: 2, price: 3000, minRep: 6,
    ops: [{ op: 'iceStatus', status: 'mapped', value: 3, to: 'allEnemies' }, { op: 'iceStatus', status: 'marked', value: 2, to: 'allEnemies' }],
    description: 'Every ICE is Mapped (3) and Marked (2).',
    flavor: 'A long, sad note. Every ICE turns to listen. Your botnet turns to aim.',
  }),
  exploit({
    id: 'prog.keysmash', name: 'keysmash', family: 'keysmash', version: 1, price: 100, minRep: 1,
    ops: [{ op: 'iceStatus', status: 'unstable', value: 3 }],
    description: 'Unstable (+3). Overflow programs consume it for bonus damage.',
    flavor: 'Hits random inputs until something cries.',
  }),
  exploit({
    id: 'prog.keysmash_v2', name: 'keysmash.asdf', family: 'keysmash', version: 2, price: 700, minRep: 3,
    ops: [{ op: 'iceStatus', status: 'unstable', value: 4 }],
    description: 'Unstable (+4).',
    flavor: 'asdf. asdf. ASDF.',
  }),
  exploit({
    id: 'prog.keysmash_v3', name: 'keysmash.asdfghjkl', family: 'keysmash', version: 3, price: 2400, minRep: 5,
    ops: [{ op: 'iceStatus', status: 'unstable', value: 6 }],
    description: 'Unstable (+6).',
    flavor: 'The whole home row. Every key a cry for help.',
  }),
  exploitAll({
    id: 'prog.static', name: 'gibberish', family: 'static', version: 1, cost: 2, cooldown: 1, noise: 2, price: 300, minRep: 2,
    ops: [{ op: 'iceStatus', status: 'unstable', value: 2, to: 'allEnemies' }],
    description: 'Every ICE gets Unstable (+2).',
    flavor: 'Shouts nonsense at everyone. Everyone gets a bit wobbly.',
  }),
  exploitAll({
    id: 'prog.static_v2', name: 'gibbergibberish', family: 'static', version: 2, cost: 2, cooldown: 1, noise: 2, price: 1200, minRep: 4,
    ops: [{ op: 'iceStatus', status: 'unstable', value: 3, to: 'allEnemies' }],
    description: 'Every ICE gets Unstable (+3).',
    flavor: 'Twice the nonsense. Half the grammar.',
  }),
  exploitAll({
    id: 'prog.static_v3', name: 'pure_static', family: 'static', version: 3, cost: 2, cooldown: 3, noise: 2, price: 3400, minRep: 6,
    ops: [{ op: 'iceStatus', status: 'unstable', value: 4, to: 'allEnemies' }, { op: 'iceStatus', status: 'slowed', value: 1, to: 'allEnemies' }],
    description: 'Every ICE gets Unstable (+4) and is Slowed (its next action waits a turn).',
    flavor: 'The sound between channels. ICE hates the sound between channels.',
  }),
  exploit({
    id: 'prog.bucket', name: 'bucket', family: 'bucket', version: 1, cost: 2, cooldown: 1, noise: 2, price: 150, minRep: 1, tags: ['overflow'],
    ops: [{ op: 'damage', kind: 'spike', amount: 1, overflow: 2 }],
    description: 'Spike 1, +2 per Unstable stack (consumes all).',
    flavor: 'Consumes all Unstable. Splash damage, literally.',
  }),
  exploit({
    id: 'prog.bucket_v2', name: 'bigger_bucket', family: 'bucket', version: 2, cost: 2, cooldown: 1, noise: 2, price: 900, minRep: 3, requires: { cpu: 1 }, tags: ['overflow'],
    ops: [{ op: 'damage', kind: 'spike', amount: 2, overflow: 3 }],
    description: 'Spike 2, +3 per Unstable stack (consumes all).',
    flavor: 'A bigger bucket. The same problem, but more of it.',
  }),
  exploitAll({
    id: 'prog.bucket_v3', name: 'the_flood', family: 'bucket', version: 3, cost: 2, cooldown: 1, noise: 3, price: 3500, minRep: 6, requires: { cpu: 3 }, tags: ['overflow'],
    ops: [{ op: 'damage', kind: 'spike', amount: 2, overflow: 3, to: 'allEnemies' }],
    description: 'Every ICE: spike 2, +3 per Unstable stack (consumes all).',
    flavor: 'Forty days of overflow.',
  }),
  exploit({
    id: 'prog.popcorn', name: 'stackpop', family: 'popcorn', version: 1, price: 200, minRep: 2, tags: ['overflow'],
    ops: [{ op: 'damage', kind: 'crack', amount: 1, overflow: 1 }],
    description: 'Cheap crack 1, +1 per Unstable stack (consumes all).',
    flavor: 'Pops every Unstable stack. Pop pop pop.',
  }),
  exploit({
    id: 'prog.popcorn_v2', name: 'stackpop.pop', family: 'popcorn', version: 2, price: 900, minRep: 4, tags: ['overflow'],
    ops: [{ op: 'damage', kind: 'crack', amount: 1, overflow: 2 }],
    description: 'Cheap crack 1, +2 per Unstable stack (consumes all).',
    flavor: 'Pop pop pop pop.',
  }),
  exploitAll({
    id: 'prog.popcorn_v3', name: 'popcorn', family: 'popcorn', version: 3, price: 3200, minRep: 6, tags: ['overflow'],
    ops: [{ op: 'damage', kind: 'crack', amount: 2, overflow: 2, to: 'allEnemies' }],
    description: 'Every ICE: crack 2, +2 per Unstable stack (consumes all).',
    flavor: 'Butter not included. Carnage included.',
  }),
  exploit({
    id: 'prog.giftbox', name: 'giftbox', family: 'giftbox', version: 1, cooldown: 2, price: 180, minRep: 2,
    ops: [{ op: 'iceStatus', status: 'backdoored', value: 2 }],
    description: 'Backdoored (2): after 2 ICE turns it is Rootable. Root programs subvert it.',
    flavor: 'Everybody opens a present.',
  }),
  exploit({
    id: 'prog.giftbox_v2', name: 'giftbox.deluxe', family: 'giftbox', version: 2, cooldown: 2, price: 900, minRep: 4,
    ops: [{ op: 'iceStatus', status: 'backdoored', value: 2 }, { op: 'iceStatus', status: 'mapped', value: 2 }],
    description: 'Backdoored (2) and Mapped (2).',
    flavor: 'The box has a card. The card says "from a friend". You are not its friend.',
  }),
  exploitAll({
    id: 'prog.giftbox_v3', name: 'giftbox.with.bow', family: 'giftbox', version: 3, cost: 2, cooldown: 3, price: 3200, minRep: 6,
    ops: [{ op: 'iceStatus', status: 'backdoored', value: 2, to: 'allEnemies' }],
    description: 'Every ICE is Backdoored (2).',
    flavor: 'It is the bow that gets them. Nobody can resist a bow.',
  }),
  exploit({
    id: 'prog.sleeper', name: 'sleeper', family: 'sleeper', version: 1, cooldown: 2, noise: 3, price: 380, minRep: 3,
    ops: [{ op: 'iceStatus', status: 'backdoored', value: 1 }],
    description: 'Loud Backdoored (1): Rootable after its next turn.',
    flavor: 'Moves in. Waits. Not long.',
  }),
  exploit({
    id: 'prog.sleeper_v2', name: 'sleeper.cell', family: 'sleeper', version: 2, cooldown: 2, noise: 3, price: 1300, minRep: 5,
    ops: [{ op: 'iceStatus', status: 'backdoored', value: 1 }, { op: 'iceStatus', status: 'unstable', value: 2 }],
    description: 'Loud Backdoored (1) and Unstable (+2).',
    flavor: 'Several sleepers. They all wake up angry.',
  }),
  exploit({
    id: 'prog.sleeper_v3', name: 'sleeper.agent', family: 'sleeper', version: 3, cost: 2, cooldown: 3, noise: 3, price: 3500, minRep: 7,
    ops: [{ op: 'iceStatus', status: 'backdoored', value: 1 }, { op: 'iceStatus', status: 'stunned', value: 1 }],
    description: 'Loud Backdoored (1) and Stunned (1).',
    flavor: 'It has been on your side the whole time. It was just shy.',
  }),
  exploit({
    id: 'prog.rootkit', name: 'rootkit', family: 'rootkit', version: 1, cost: 2, cooldown: 1, noise: 2, ram: 2, price: 300, minRep: 2, tags: ['root'],
    ops: [{ op: 'root' }],
    description: 'Subverts a Rootable ICE: it fights for you this fight. Bosses resist.',
    flavor: 'Turns a Rootable ICE to your side. It sends you birthday cards after.',
  }),
  exploit({
    id: 'prog.rootkit_v2', name: 'rootkit.plus', family: 'rootkit', version: 2, cost: 1, cooldown: 1, noise: 2, ram: 2, price: 1400, minRep: 4, tags: ['root'],
    ops: [{ op: 'root' }],
    description: 'Subverts a Rootable ICE. Costs 1.',
    flavor: 'Plus what? Plus you, now.',
  }),
  exploitAll({
    id: 'prog.rootkit_v3', name: 'rootkit.family', family: 'rootkit', version: 3, cost: 2, cooldown: 1, noise: 2, ram: 2, price: 4000, minRep: 7, tags: ['root'],
    ops: [{ op: 'root', to: 'allEnemies' }],
    description: 'Subverts every Rootable ICE.',
    flavor: 'The whole family. Grandma ICE too.',
  }),
  exploit({
    id: 'prog.flare', name: 'flare', family: 'flare', version: 1, price: 220, minRep: 2,
    ops: [{ op: 'iceStatus', status: 'marked', value: 3 }],
    description: 'Marked (3): botnet actions on it deal x1.5. Pinger daemons hit it harder.',
    flavor: 'A bright red dot. Every toaster in town looks up.',
  }),
  exploitAll({
    id: 'prog.flare_v2', name: 'flare.gun', family: 'flare', version: 2, price: 1100, minRep: 4,
    ops: [{ op: 'iceStatus', status: 'marked', value: 3, to: 'allEnemies' }],
    description: 'Every ICE is Marked (3).',
    flavor: 'One shot. Many dots. Many toasters.',
  }),

  // ===========================================================================
  // DEFENSE
  // ===========================================================================
  defense({
    id: 'prog.umbrella', name: 'umbrella', family: 'umbrella', version: 1, cooldown: 1, noise: 0,
    ops: [{ op: 'shield', amount: 4 }],
    description: '+4 shield this turn.',
    flavor: 'Firewall up. Not built for this weather.',
  }),
  defense({
    id: 'prog.umbrella_v2', name: 'umbrella.xl', family: 'umbrella', version: 2, cooldown: 1, noise: 0, price: 450, minRep: 2, requires: { firewall: 1 },
    ops: [{ op: 'shield', amount: 6 }],
    description: '+6 shield this turn. Needs Firewall tier 1.',
    flavor: 'Fits two. You are one. The ICE is not invited.',
  }),
  defense({
    id: 'prog.umbrella_v3', name: 'golf_umbrella', family: 'umbrella', version: 3, cooldown: 1, noise: 0, price: 2300, minRep: 5, requires: { firewall: 2 },
    ops: [{ op: 'shield', amount: 10 }],
    description: '+10 shield this turn. Needs Firewall tier 2.',
    flavor: 'Stolen from a golf course. It still smells of money.',
  }),
  defense({
    id: 'prog.cutout', name: 'cardboard_cutout', family: 'cutout', version: 1, cooldown: 2, noise: 0, price: 140, minRep: 1,
    ops: [{ op: 'playerStatus', status: 'decoy', value: 1 }],
    description: 'Decoy (1): absorbs the next whole attack (also neural).',
    flavor: 'Absorbs hits. Looks like you, if you squint. ICE squints.',
  }),
  defense({
    id: 'prog.cutout_v2', name: 'cardboard_cutout.hd', family: 'cutout', version: 2, cooldown: 1, noise: 0, price: 800, minRep: 3,
    ops: [{ op: 'playerStatus', status: 'decoy', value: 1 }],
    description: 'Decoy (1). Cooldown 1.',
    flavor: 'Now in high definition. The ICE squints less.',
  }),
  defense({
    id: 'prog.cutout_v3', name: 'life_size_you', family: 'cutout', version: 3, cooldown: 2, noise: 0, price: 2600, minRep: 5,
    ops: [{ op: 'playerStatus', status: 'decoy', value: 2 }],
    description: 'Decoy (2): absorbs the next two attacks.',
    flavor: 'It is you. Life size. It has your posture. It is a little unsettling.',
  }),
  defense({
    id: 'prog.duct_tape', name: 'duct_tape', family: 'duct_tape', version: 1, cost: 2, cooldown: 2, noise: 0, price: 150, minRep: 1,
    ops: [{ op: 'repair', amount: 6 }],
    description: 'Repair 6 deck integrity.',
    flavor: 'Fixes everything once.',
  }),
  defense({
    id: 'prog.duct_tape_v2', name: 'duct_tape.silver', family: 'duct_tape', version: 2, cost: 2, cooldown: 2, noise: 0, price: 800, minRep: 3,
    ops: [{ op: 'repair', amount: 10 }],
    description: 'Repair 10 deck integrity.',
    flavor: 'Fixes everything once. Shinier.',
  }),
  defense({
    id: 'prog.duct_tape_v3', name: 'duct_tape.gold', family: 'duct_tape', version: 3, cost: 2, cooldown: 2, noise: 0, price: 2600, minRep: 5,
    ops: [{ op: 'repair', amount: 15 }, { op: 'cleanse', status: 'anchored' }],
    description: 'Repair 15 deck integrity and clear Anchored.',
    flavor: 'Fixes everything once. Also some things twice.',
  }),
  defense({
    id: 'prog.tinfoil', name: 'tinfoil', family: 'tinfoil', version: 1, cooldown: 3, noise: 0, price: 250, minRep: 2,
    ops: [{ op: 'neuralHeal', amount: 2 }, { op: 'cleanse', status: 'burn' }],
    description: 'Restore 2 neural HP and clear Burn.',
    flavor: 'Finally, the hat works.',
  }),
  defense({
    id: 'prog.tinfoil_v2', name: 'tinfoil.double', family: 'tinfoil', version: 2, cooldown: 3, noise: 0, price: 1100, minRep: 4,
    ops: [{ op: 'neuralHeal', amount: 3 }, { op: 'cleanse', status: 'burn' }, { op: 'cleanse', status: 'labelsScrambled' }],
    description: 'Restore 3 neural HP, clear Burn and label scrambling.',
    flavor: 'Two layers. The inner layer is for your feelings.',
  }),
  defense({
    id: 'prog.tinfoil_v3', name: 'tinfoil.couture', family: 'tinfoil', version: 3, cooldown: 2, noise: 0, price: 3200, minRep: 6,
    ops: [{ op: 'neuralHeal', amount: 5 }, { op: 'cleanse', status: 'all' }],
    description: 'Restore 5 neural HP and clear every debuff (Burn, Scrambled, Tarred, Anchored, labels).',
    flavor: 'Runway-ready. Psychotrope-proof.',
  }),

  // ===========================================================================
  // STEALTH
  // ===========================================================================
  stealth({
    id: 'prog.moustache', name: 'fake_moustache', family: 'moustache', version: 1, cooldown: 2, noise: 0, price: 150, minRep: 1,
    ops: [{ op: 'playerStatus', status: 'masked', value: 1 }, { op: 'trace', amount: -2 }],
    description: 'Masked: trace gain halved this turn. -2 trace now.',
    flavor: 'Trace halved this turn. Nobody recognises you. Nobody ever did.',
  }),
  stealth({
    id: 'prog.moustache_v2', name: 'fake_beard', family: 'moustache', version: 2, cooldown: 2, noise: 0, price: 800, minRep: 3,
    ops: [{ op: 'playerStatus', status: 'masked', value: 1 }, { op: 'trace', amount: -4 }],
    description: 'Masked this turn. -4 trace now.',
    flavor: 'More hair. Less you.',
  }),
  stealth({
    id: 'prog.moustache_v3', name: 'fake_everything', family: 'moustache', version: 3, cooldown: 2, noise: 0, price: 2800, minRep: 6,
    ops: [{ op: 'playerStatus', status: 'masked', value: 1 }, { op: 'trace', amount: -7 }],
    description: 'Masked this turn. -7 trace now.',
    flavor: 'Glasses, nose, eyebrows, a second chin. Mum would not know you.',
  }),
  stealth({
    id: 'prog.mop', name: 'mop', family: 'mop', version: 1, cooldown: 3, noise: 0, price: 200, minRep: 2,
    ops: [{ op: 'trace', amount: -5 }],
    description: '-5 trace now.',
    flavor: 'Leaves the logs shiny.',
  }),
  stealth({
    id: 'prog.mop_v2', name: 'mop.and.bucket', family: 'mop', version: 2, cooldown: 3, noise: 0, price: 900, minRep: 4,
    ops: [{ op: 'trace', amount: -8 }],
    description: '-8 trace now.',
    flavor: 'The bucket is not an overflow program. Probably.',
  }),
  stealth({
    id: 'prog.mop_v3', name: 'janitor', family: 'mop', version: 3, cooldown: 3, noise: 0, price: 3000, minRep: 6,
    ops: [{ op: 'trace', amount: -12 }],
    description: '-12 trace now.',
    flavor: 'Has keys to every room. Nobody asks why.',
  }),
  stealthIce({
    id: 'prog.lullaby', name: 'lullaby', family: 'lullaby', version: 1, cost: 2, cooldown: 3, price: 200, minRep: 1,
    ops: [{ op: 'iceStatus', status: 'stunned', value: 1 }],
    description: 'Stunned (1): it skips its next action. Bosses are Slowed instead.',
    flavor: 'Shh. Shhhh. There.',
  }),
  stealthIce({
    id: 'prog.lullaby_v2', name: 'lullaby.loop', family: 'lullaby', version: 2, cost: 2, cooldown: 2, price: 1000, minRep: 4,
    ops: [{ op: 'iceStatus', status: 'stunned', value: 1 }],
    description: 'Stunned (1). Cooldown 2.',
    flavor: 'On repeat. You also feel sleepy.',
  }),
  stealth({
    id: 'prog.lullaby_v3', name: 'white_noise', family: 'lullaby', version: 3, cost: 2, cooldown: 4, price: 3400, minRep: 6,
    ops: [{ op: 'iceStatus', status: 'stunned', value: 1, to: 'allEnemies' }],
    description: 'Every ICE is Stunned (1). Bosses are Slowed.',
    flavor: 'Rain on a tin roof. For ICE.',
  }),
  stealth({
    id: 'prog.bounce', name: 'bounce', family: 'bounce', version: 1, cooldown: 2, noise: 0, price: 250, minRep: 2,
    ops: [{ op: 'cleanse', status: 'anchored' }, { op: 'trace', amount: -2 }],
    description: 'Clear Anchored. -2 trace.',
    flavor: 'Your packets take the scenic route.',
  }),
  stealth({
    id: 'prog.bounce_v2', name: 'double_bounce', family: 'bounce', version: 2, cooldown: 2, noise: 0, price: 1000, minRep: 4,
    ops: [{ op: 'cleanse', status: 'anchored' }, { op: 'playerStatus', status: 'masked', value: 1 }, { op: 'trace', amount: -3 }],
    description: 'Clear Anchored. Masked this turn. -3 trace.',
    flavor: 'Two scenic routes. One of them has a gift shop.',
  }),
  stealth({
    id: 'prog.bounce_v3', name: 'trampoline_park', family: 'bounce', version: 3, cooldown: 2, noise: 0, price: 3000, minRep: 6,
    ops: [{ op: 'cleanse', status: 'all' }, { op: 'playerStatus', status: 'masked', value: 1 }, { op: 'trace', amount: -4 }],
    description: 'Clear every debuff. Masked this turn. -4 trace.',
    flavor: 'Your packets bounce off every wall. They are having the time of their lives.',
  }),

  // ===========================================================================
  // DAEMON (ops run at End Turn on a random ICE; RAM is paid once, in the loadout; turns 0 = whole fight)
  // ===========================================================================
  daemon({
    id: 'prog.pinger_v1', name: 'pinger', family: 'pinger', version: 1, cooldown: 4, price: 220, minRep: 1,
    ops: [],
    daemon: { turns: 3, ops: [bonusIf(marked, [{ op: 'damage', kind: 'spike', amount: 2 }]), { op: 'damage', kind: 'spike', amount: 2 }] },
    description: 'Daemon, 3 turns: spike 2 to a random ICE each turn (+2 if it is Marked).',
    flavor: "Just keeps pinging. Like a friend who's bored. Readme: pings things. things ping back. friendship.",
  }),
  daemon({
    id: 'prog.pinger_v2', name: 'pinger.pro', family: 'pinger', version: 2, cooldown: 4, price: 1000, minRep: 3,
    ops: [],
    daemon: { turns: 4, ops: [bonusIf(marked, [{ op: 'damage', kind: 'spike', amount: 3 }]), { op: 'damage', kind: 'spike', amount: 3 }] },
    description: 'Daemon, 4 turns: spike 3 to a random ICE each turn (+3 if Marked).',
    flavor: 'Pings professionally. Has a lanyard.',
  }),
  daemon({
    id: 'prog.pinger_v3', name: 'pinger.premium', family: 'pinger', version: 3, cooldown: 6, ram: 2, price: 3200, minRep: 6,
    ops: [],
    daemon: { turns: 0, ops: [bonusIf(marked, [{ op: 'damage', kind: 'spike', amount: 3 }]), { op: 'damage', kind: 'spike', amount: 4 }] },
    description: 'Daemon, whole fight: spike 4 to a random ICE each turn (+3 if Marked). RAM 2.',
    flavor: 'Ad-free pinging. Subscription required. You stole the subscription.',
  }),
  daemon({
    id: 'prog.guard_dog', name: 'guard_dog', family: 'guard_dog', version: 1, cost: 2, cooldown: 5, noise: 0, ram: 2, price: 500, minRep: 3,
    ops: [],
    daemon: { turns: 3, ops: [{ op: 'playerStatus', status: 'decoy', value: 1 }] },
    description: 'Daemon, 3 turns: a Decoy each turn (blocks the first attack). RAM 2.',
    flavor: 'Who is a good firewall? Who is?',
  }),
  daemon({
    id: 'prog.guard_dog_v2', name: 'guard_dog.good_boy', family: 'guard_dog', version: 2, cost: 2, cooldown: 5, noise: 0, ram: 2, price: 1500, minRep: 5,
    ops: [],
    daemon: { turns: 4, ops: [{ op: 'playerStatus', status: 'decoy', value: 1 }] },
    description: 'Daemon, 4 turns: a Decoy each turn. RAM 2.',
    flavor: 'He is a good boy. He has a certificate.',
  }),
  daemon({
    id: 'prog.guard_dog_v3', name: 'guard_dog.best_boy', family: 'guard_dog', version: 3, cost: 2, cooldown: 8, noise: 0, ram: 3, price: 4200, minRep: 7,
    ops: [],
    daemon: { turns: 0, ops: [{ op: 'playerStatus', status: 'decoy', value: 1 }] },
    description: 'Daemon, whole fight: a Decoy each turn. RAM 3.',
    flavor: 'The best boy. There is no debate. There was a debate. He won it.',
  }),
  daemon({
    id: 'prog.lookout', name: 'lookout', family: 'lookout', version: 1, cooldown: 4, price: 300, minRep: 2,
    ops: [],
    daemon: { turns: 4, ops: [{ op: 'iceStatus', status: 'mapped', value: 2 }] },
    description: 'Daemon, 4 turns: Maps a random ICE (2) each turn.',
    flavor: 'Stands on a box. Shouts what it sees.',
  }),
  daemon({
    id: 'prog.lookout_v2', name: 'lookout.binoculars', family: 'lookout', version: 2, cooldown: 4, price: 1100, minRep: 4,
    ops: [],
    daemon: { turns: 6, ops: [{ op: 'iceStatus', status: 'mapped', value: 2 }] },
    description: 'Daemon, 6 turns: Maps a random ICE (2) each turn.',
    flavor: 'Sees further. Shouts louder.',
  }),
  daemon({
    id: 'prog.lookout_v3', name: 'lookout.telescope', family: 'lookout', version: 3, cooldown: 6, ram: 2, price: 3000, minRep: 6,
    ops: [],
    daemon: { turns: 0, ops: [{ op: 'iceStatus', status: 'mapped', value: 2 }, { op: 'iceStatus', status: 'marked', value: 1 }] },
    description: 'Daemon, whole fight: Maps (2) and Marks (1) a random ICE each turn. RAM 2.',
    flavor: 'Can see the ICE from orbit. Can see the orbit from orbit.',
  }),
  daemon({
    id: 'prog.pickpocket', name: 'pickpocket', family: 'pickpocket', version: 1, cooldown: 4, noise: 0, price: 350, minRep: 2,
    ops: [],
    daemon: { turns: 3, ops: [{ op: 'stripShell', amount: 2 }] },
    description: 'Daemon, 3 turns: strips 2 shell from a random ICE each turn (any shell type).',
    flavor: 'Takes a little. Every turn. They never notice. They notice.',
  }),
  daemon({
    id: 'prog.pickpocket_v2', name: 'pickpocket.nimble', family: 'pickpocket', version: 2, cooldown: 4, noise: 0, price: 1200, minRep: 4,
    ops: [],
    daemon: { turns: 4, ops: [{ op: 'stripShell', amount: 3 }] },
    description: 'Daemon, 4 turns: strips 3 shell from a random ICE each turn.',
    flavor: 'Faster fingers. Same lack of remorse.',
  }),
  daemon({
    id: 'prog.pickpocket_v3', name: 'pickpocket.artful', family: 'pickpocket', version: 3, cooldown: 6, noise: 0, ram: 2, price: 3400, minRep: 6,
    ops: [],
    daemon: { turns: 0, ops: [{ op: 'stripShell', amount: 3 }, { op: 'iceStatus', status: 'unstable', value: 1 }] },
    description: 'Daemon, whole fight: strips 3 shell and adds Unstable (+1) to a random ICE each turn. RAM 2.',
    flavor: 'Takes the shell. Leaves a little something wobbly in its place.',
  }),

  // ===========================================================================
  // SPECIAL (story, loot, jokes)
  // ===========================================================================
  {
    id: 'prog.decrypt', name: 'decrypt.gz', family: 'decrypt', version: 1, category: 'special',
    cost: 1, cooldown: 1, noise: 0, ram: 1, targeting: 'none', price: 150, decrypt: 1, tags: ['decrypt'],
    ops: [{ op: 'notify', text: 'decrypt.gz: nothing to decrypt in here.' }],
    description: 'Hub: decrypts strength-1 paydata (full sale value). Useless in a fight.',
    flavor: 'Unzips things. Mostly zips.',
  },
  {
    id: 'prog.decrypt_v2', name: 'decrypt.7z', family: 'decrypt', version: 2, category: 'special',
    cost: 1, cooldown: 1, noise: 0, ram: 1, targeting: 'none', price: 1100, minRep: 4, decrypt: 2, tags: ['decrypt'],
    ops: [{ op: 'notify', text: 'decrypt.7z: still nothing to decrypt in here.' }],
    description: 'Hub: decrypts strength-2 paydata (milspec files). Useless in a fight.',
    flavor: 'Seven zips. Military grade. The military uses zips.',
  },
  special({
    id: 'prog.milspec_icebreaker', name: 'MILSPEC_ICEBREAKER', family: 'milspec_icebreaker', version: 1,
    cost: 2, cooldown: 1, noise: 3, ram: 2, requires: { cpu: 2 },
    ops: [{ op: 'iceStatus', status: 'exposed', value: 1 }, { op: 'damage', kind: 'crack', amount: 6, spread: 2 }, { op: 'damage', kind: 'spike', amount: 6, spread: 2 }],
    description: 'Exposed (1), then crack 6-8 and spike 6-8: ignores shell type. Needs CPU tier 2.',
    flavor: 'Crack and spike at once. Ignores shell type. Has a serial number and a body count.',
  }),
  special({
    id: 'prog.wraith_echo', name: 'echo', family: 'wraith_echo', version: 1, cost: 1, cooldown: 99, noise: 1, noSignature: true,
    ops: [{ op: 'script', id: 'echo' }],
    description: 'Once per fight: runs your most-used program again at full strength, ignoring signature.',
    flavor: '"It does what I did, one more time."',
  }),
  special({
    id: 'prog.duet', name: 'duet', family: 'duet', version: 1, cost: 1, cooldown: 2, noise: 1,
    ops: [{ op: 'script', id: 'duet' }],
    description: 'Runs your two most-used programs again at 60%.',
    flavor: 'Harmony is two people being wrong together.',
  }),
  {
    id: 'prog.fryer_daemon', name: 'fryer.d', family: 'fryer_daemon', version: 1, category: 'daemon',
    cost: 1, cooldown: 99, noise: 2, ram: 2, targeting: 'none', price: 0,
    ops: [],
    daemon: { turns: 0, ops: [{ op: 'damage', kind: 'spike', amount: 1, to: 'allEnemies' }, { op: 'damage', kind: 'worm', amount: 1, to: 'randomEnemy' }] },
    description: 'Daemon, whole fight: spike 1 to every ICE and Infected (+1) to one, each turn. RAM 2.',
    flavor: 'Smells incredible. 190°C of pure opinion.',
  },
  {
    id: 'prog.console_gremlin', name: 'console.gremlin', family: 'console_gremlin', version: 1, category: 'special',
    cost: 1, cooldown: 3, noise: 0, ram: 1, targeting: 'none', price: 0, sellValue: 1, tags: ['joke'], noSignature: true,
    ops: [{ op: 'notify', text: 'console.gremlin: yeehaw.' }, { op: 'shield', amount: 1 }],
    description: '+1 shield. A gift from someone who saw that.',
    flavor: 'It lives in your console now. It pays no rent. It says yeehaw.',
  },
  special({
    id: 'prog.root_shell', name: '#', family: 'root_shell', version: 1, cost: 1, cooldown: 0, noise: 0, noSignature: true,
    ops: [{ op: 'stripShell', amount: 99 }, { op: 'iceStatus', status: 'exposed', value: 2 }, { op: 'root' }, { op: 'damage', kind: 'crack', amount: 10, spread: 2 }],
    description: 'Strips every shell point, Exposed (2), roots it if Rootable, then crack 10-12. Never adapts.',
    flavor: 'You are the admin now. Act like it.',
  }),
];
