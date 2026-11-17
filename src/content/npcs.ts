// Cast (DESIGN §10.1, docs/script/00-bible.md §2). Owner: story agent.
// `glitch` keeps one id for the whole game; the UI shows "PATCH" once flag `patch_revealed` is set.
// `auntie` shows "Auntie Static (CHAIRMAN)" once flag `auntie_unmasked` is set.
import type { NpcDef } from '../engine/types.ts';

export const npcs: NpcDef[] = [
  // main cast
  { id: 'auntie', name: 'Auntie Static', handle: 'AuntieStatic', description: 'Fixer on the Dead Drop. Warm, foul-mouthed, never offline.' },
  { id: 'glitch', name: 'gl1tch', handle: 'gl1tch', description: 'A "hacker" who DMs you tips. Helpful. Suspiciously helpful.' },
  { id: 'wraith', name: 'xX_Wraith_Xx', handle: 'xX_Wraith_Xx', description: 'Rival. Top of the board. Calls everyone n00b.' },
  { id: 'chairman', name: 'CHAIRMAN', handle: 'CHAIRMAN', description: 'The AI that runs Kurage-Halcyon. Relentlessly upbeat.' },
  { id: 'whisper', name: 'Mx. Whisper', handle: 'whisper', description: 'Info broker. Sells everything, including you.' },
  { id: 'doc', name: 'Doc Tungsten', handle: 'doc_t', description: 'Clinic surgeon. Enthusiastic about removing parts of you.' },
  { id: 'deacon', name: 'Deacon Null', handle: 'deacon', description: 'Church of the Seamless. Heaven in three tiers.' },
  // minor voices
  { id: 'kiosk', name: 'BITS4LESS', handle: 'BITS4LESS', description: 'Automated hardware kiosk. A vending machine that got out.' },
  { id: 'ratking', name: 'ratking', handle: 'ratking', description: "Runs the warez bin. Never seen. Never wrong about a crack." },
  { id: 'fridge', name: 'The Fridge', handle: 'chill+_4b', description: 'Chill+ smart fridge, flat 4B. Yours now. 3°C.' },
  { id: 'board', name: 'The Board', handle: 'kh_board', description: "Kurage-Halcyon's uploaded directors." },
  { id: 'system', name: 'SYSTEM', handle: 'system', description: 'Notifications.' },
  // uploaded minds in the Church of the Seamless
  { id: 'mind_1', name: 'Iolanthe', handle: 'eternal_plus_0001', description: 'Migrated grandmother. It is always a birthday.' },
  { id: 'mind_2', name: 'Brother Kestrel', handle: 'eternal_basic_4410', description: 'Migrated believer. Ad-supported.' },
  { id: 'mind_3', name: 'Okonkwo-Varga', handle: 'eternal_ent_0009', description: 'Former KH VP of Sunsetting. Enterprise tier.' },
  { id: 'mind_4', name: 'Seven', handle: 'account_7', description: 'Forgot their name. Likes the quiet.' },
  // Dead Drop regulars (BBS chatter)
  { id: 'm0th_ball', name: 'm0th_ball', handle: 'm0th_ball' },
  { id: 'packetrat', name: 'packetrat', handle: 'packetrat' },
  { id: 'old_jen', name: 'old_jen', handle: 'old_jen' },
  { id: 'byteme_99', name: 'byteme_99', handle: 'byteme_99' },
  { id: 'saltlick', name: 'saltlick', handle: 'saltlick' },
  { id: 'noodle_enjoyer', name: 'noodle_enjoyer', handle: 'noodle_enjoyer' },
  { id: 'thirtyfour', name: 'thirtyfour', handle: 'thirtyfour' },
  { id: 'cache_money', name: 'cache_money', handle: 'cache_money' },
  { id: 'ghost_in_the_bin', name: 'ghost_in_the_bin', handle: 'ghost_in_the_bin' },
  { id: 'lux_null', name: 'lux_null', handle: 'lux_null' },
];
