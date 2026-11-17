// System 14: deaddrop.bbs — the BBS you have shopped at all game. Act 3. Auntie's account is CHAIRMAN. Owner: content agent.
// Tactical identity: the community turns on you. Lurkers trace, Bumps call Moderators, Sock Puppets reflect,
// Tough Love charges. The SYSOP is away for two turns, then bans your favourite program.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, key, prog, say } from './lib.ts';

const L = 6;

export const deaddrop: SystemDef = {
  id: 'deaddrop',
  name: 'The Dead Drop BBS',
  address: 'deaddrop.bbs',
  tier: 5,
  security: 4,
  owner: 'sysop [away] (6 yrs)',
  description: "The BBS you have shopped at all game. Shops, jobs, chatter, and Auntie's account. Its sysop has been \"away\" for six years. In Act 3 you hack it. The shops stay open. Whisper insists.",
  lock: { cond: { c: 'flag', flag: 'act3_started' }, text: "Home. Shops, jobs, chatter. Don't hack the hand that feeds you." },
  mood: 'system',
  motd: 'THE DEAD DROP BBS · est. before you\nsysop: [away] (6 yrs)\nusers online: 7 (1 real)\n"Don\'t hack the hand that feeds you."',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Login Prompt', x: 0.05, y: 0.5, links: ['boards', 'router'],
      description: '`login:` It already knows your handle.',
      ice: [I('ice.deaddrop.moderator', L)],
    },
    {
      id: 'boards', type: 'datastore', name: 'Message Archive', x: 0.22, y: 0.22, links: ['memorial', 'warez'],
      description: 'Every post since the beginning. Some before it.',
      ice: [I('ice.deaddrop.lurker', L), I('ice.deaddrop.moderator', L)],
      files: [
        lore('file.deaddrop.users_online', 'users_online.log', 'auntie_static (bot) · whisper (?) · ratking (?) · BITS4LESS (kiosk) · doc_tungsten (?) · xX_Wraith_Xx (save slot 0) · you (REAL)'),
        lore('file.deaddrop.sysop_last_post', 'sysop_last_post.txt', 'Gone fishing. Back soon. — sysop, six years ago'),
        lore('file.deaddrop.wraith_posts', 'wraith_posts.txt', 'Posts by xX_Wraith_Xx: 4,118. Earliest: before the BBS existed. Latest: [flatlined].'),
      ],
    },
    {
      id: 'memorial', type: 'datastore', name: 'Memorial Thread', x: 0.4, y: 0.06, links: [],
      description: 'RIP posts. One reply too many.',
      ice: [I('ice.deaddrop.bump', L)],
      files: [lore('file.deaddrop.memorial_thread', 'memorial_thread.txt', "RIP Auntie Static. Grid riot. Paid on time. Swore beautifully. — 41 replies. Reply 42, six years later: 'Rumours of my death, et cetera.' — Auntie Static")],
    },
    {
      id: 'warez', type: 'datastore', name: "ratking's Bin (backend)", x: 0.42, y: 0.32, links: ['whisper'],
      description: 'Smells like cheese and stolen code.',
      ice: [I('ice.deaddrop.sock_puppet', L), I('ice.deaddrop.lurker', L)],
      files: [
        prog('file.deaddrop.ratking_bin', 'chainletter.fwd (ratking edition)', 'prog.chainletter_v2', 'Everything in the bin is 100% working 60% of the time. This one works.'),
        pay('file.deaddrop.warez_index', 'warez_index.csv', 450, { note: 'Every download, every handle. Yours is on page one.' }),
      ],
    },
    {
      id: 'whisper', type: 'process', name: "Whisper's Shelf (backend)", x: 0.6, y: 0.14, links: [],
      description: '"…Please don\'t touch the shelf."',
      talk: 'dlg.whisper.shelf',
    },
    {
      id: 'router', type: 'router', name: 'Modem Bank', x: 0.24, y: 0.7, links: ['clinic_link', 'ledger', 'security'],
      description: 'Screams at 56k for nostalgia.',
      ice: [I('ice.deaddrop.moderator', L), I('ice.deaddrop.lurker', L)],
      netscanIot: 1,
    },
    {
      id: 'clinic_link', type: 'io', name: "Doc's Booking System", x: 0.4, y: 0.94, links: [],
      description: 'Appointments, mostly for removal.',
      use: { label: 'book Doc a three-week holiday', once: true, ops: [say("Doc: 'Who did this? I *love* this.'"), { op: 'flag', flag: 'doc_holiday' }, { op: 'humanity', amount: 1 }] },
    },
    {
      id: 'ledger', type: 'datastore', name: 'Fixer Ledger', x: 0.48, y: 0.56, links: ['sysop'],
      description: 'Every job Auntie ever posted. Who it was really for.',
      ice: [I('ice.deaddrop.tough_love', L), I('ice.deaddrop.lurker', L)],
      files: [
        lore('file.deaddrop.fixer_ledger', 'fixer_ledger.csv', "Fridge job → beneficiary: KH Chill+ QA. Noodle job → KH Food Services (competitor softened). KH Happiness job → KH (recruitment). Coinbasement → KH Treasury (short). Deadman's → KH (retention)."),
        pay('file.deaddrop.auntie_payouts', 'auntie_payouts.csv', 800, { tagged: true, note: 'Every credit Auntie ever paid you, and the KH cost centre it came from. All of them.' }),
        {
          id: 'file.deaddrop.escrow_ledger', name: 'escrow_ledger.dat', kind: 'lore', text: 'Escrow account. Owner: you. Balance: whatever we froze. —C.',
          onTake: [{
            op: 'if', cond: { c: 'all', of: [{ c: 'flag', flag: 'deadmans_done' }, { c: 'not', of: { c: 'flag', flag: 'funds_recovered' } }] },
            then: [{ op: 'unfreezeCredits' }, { op: 'item', item: 'item.frozen_funds', remove: true }, { op: 'flag', flag: 'funds_recovered' }, { op: 'message', from: 'glitch', text: 'got it. your money. all of it. i only counted it twice.' }],
          }],
        },
      ],
    },
    {
      id: 'sysop', type: 'vault', name: 'Sysop Vault', x: 0.68, y: 0.42, links: ['auntie'],
      description: 'Six years of somebody not deleting anything.',
      lock: { item: 'pw.deaddrop_sysop', label: 'sysop password (the insurance file)' },
      ice: [I('ice.deaddrop.tough_love', 7), I('ice.deaddrop.sock_puppet', 7)],
      files: [
        key('file.deaddrop.auntie_drafts', 'auntie_drafts.txt', 'key.kh_backbone_cert', "Message A/B tests. Draft A: 'Hello, young person.' (conv. 4%). Draft B: 'Kiddo!' (conv. 31%) ✔. Sign-off A: 'Regards.' Sign-off B: 'Stay in the loop.' ✔. Attachment: KH backbone service certificate (for 'our own load testing')."),
        lore('file.deaddrop.voice_profile', 'voice_profile.json', '{ "name": "warm_v3", "used_by": ["auntie", "chairman (internal)"], "swearing": "affectionate", "sign_off": "Stay in the loop." }'),
      ],
    },
    {
      id: 'auntie', type: 'process', name: 'auntie_static', x: 0.84, y: 0.22, links: ['core'],
      description: '"sessions open: ∞".',
      talk: 'dlg.auntie.unmasked',
    },
    {
      id: 'security', type: 'security', name: 'Moderator Bot', x: 0.66, y: 0.82, links: ['core'],
      description: 'Has banned 41,000 users. Has never been wrong. Has never been right.',
      ice: [I('ice.deaddrop.moderator', 7), I('ice.deaddrop.bump', L)],
    },
    {
      id: 'core', type: 'core', name: 'BBS Core', x: 0.93, y: 0.6, links: [],
      description: 'Home. Yours now.',
      ice: [I('ice.deaddrop.sysop', 6), I('ice.deaddrop.sock_puppet', L)],
    },
  ],
};
