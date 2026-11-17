// System 7: coinbasement.exchange — the $HODL exchange. Own it to pump/dump. Holds orbital key A. Owner: content agent.
// Tactical identity: Tar Pit exchange. Withdrawal Pending everywhere (Tarred, Anchored): bring bounce and
// spare cycles. The Whale grows unless you Stun or Slow its accumulation.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, key, coin, say } from './lib.ts';

const L = 3;

export const coinbasement: SystemDef = {
  id: 'coinbasement',
  name: 'Coinbasement',
  address: 'coinbasement.exchange',
  tier: 3,
  security: 2,
  owner: 'Coinbasement (two developers and a dog)',
  description: 'The $HODL exchange, run from an actual basement. Tar Pits everywhere. Own it and you can pump or dump the coin. The cold wallet holds half of a First Orbital vault key.',
  mood: 'system',
  motd: 'COINBASEMENT · "We\'re Literally Underground"\n$HODL: {hodl}¤ ▲\nWithdrawals: paused (vibes).\nNot financial advice. Not financial. Not advice.',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Trading Floor', x: 0.06, y: 0.5, links: ['orderbook', 'router'],
      description: 'A ping-pong table with a laptop on it.',
      ice: [I('ice.coinbasement.withdrawal_pending', L)],
    },
    {
      id: 'orderbook', type: 'datastore', name: 'Order Book', x: 0.24, y: 0.2, links: ['matching'],
      description: 'Everyone wants to buy. Nobody wants to sell. Nobody knows why.',
      ice: [I('ice.coinbasement.kyc', L)],
      files: [
        pay('file.coinbasement.order_book', 'order_book.dat', 250),
        lore('file.coinbasement.whitepaper', 'whitepaper.pdf', '$HODL is a coin. Its use case is being held. Holding raises its value, which is a reason to hold it. QED.'),
        lore('file.coinbasement.user_complaints', 'user_complaints.txt', "'Where is my money?' 'In the basement.' 'Can I come and get it?' 'No.'"),
      ],
      use: { label: 'plant a fat fake order', once: true, ops: [say('A fake order for 4M $HODL appears. The chart goes vertical. Then, for no reason, it dips anyway.'), { op: 'coinPrice', mult: 1.15 }, { op: 'heat', amount: 10 }, { op: 'flag', flag: 'coinbasement_fake_order' }] },
    },
    {
      id: 'matching', type: 'io', name: 'Matching Engine', x: 0.44, y: 0.08, links: [],
      description: 'Matches buyers with regret.',
      use: { label: 'match every order at once', once: true, ops: [say('Every buy matches every sell at once. The price chart becomes a straight line. Traders weep. Your trail drowns in the noise.'), { op: 'trace', amount: -10 }] },
    },
    {
      id: 'router', type: 'router', name: 'Basement Router', x: 0.28, y: 0.62, links: ['ops', 'hot', 'security'],
      description: "Next to the boiler. It's warm.",
      ice: [I('ice.coinbasement.pump_bot', L), I('ice.coinbasement.withdrawal_pending', L)],
      netscanIot: 1,
    },
    {
      id: 'ops', type: 'datastore', name: 'Ops Chat', x: 0.48, y: 0.88, links: ['furnace'],
      description: 'Two developers and no secrets.',
      ice: [I('ice.coinbasement.kyc', L), I('ice.coinbasement.withdrawal_pending', L)],
      files: [
        key('file.coinbasement.ops_chat', 'ops_chat.log', 'pw.coinbasement_cold', "[dev1] what's the cold storage pw again / [dev2] hodl4ever / [dev1] we shouldn't say it in chat / [dev2] we shouldn't do a lot of things"),
        key('file.coinbasement.doc_account', 'doc_account.txt', 'pw.chromebone_vault', "Customer: D. Tungsten. 2FA backup: spleenparty. Note: also his clinic cold-storage password. Quote: 'who would guess spleenparty.'"),
      ],
    },
    {
      id: 'furnace', type: 'io', name: 'Mining Rig Room', x: 0.7, y: 0.94, links: [],
      description: "The basement's real heating system.",
      use: { label: 'overclock the rigs', once: true, ops: [say('You overclock the rigs. $HODL jumps. The basement becomes a sauna. The dog leaves.'), { op: 'coinPrice', mult: 1.2 }] },
    },
    {
      id: 'hot', type: 'datastore', name: 'Hot Wallet', x: 0.55, y: 0.45, links: ['cold', 'core'],
      description: 'Hot because everyone keeps touching it.',
      ice: [I('ice.coinbasement.the_rug', L), I('ice.coinbasement.withdrawal_pending', L)],
      files: [
        pay('file.coinbasement.kh_short_position', 'kh_short_position.xlsx', 500, { tagged: true, note: "KH Treasury: short $HODL ×4M, timed to 'hack at Coinbasement'. Operator recruited by: A.S." }),
        pay('file.coinbasement.rugpull_plan', 'rugpull_plan.md', 350, { tagged: true, note: 'Step 1: pump. Step 2: dump. Step 3: blame a hacker. (Step 3 is you.)' }),
        coin('file.coinbasement.hot_wallet', 'hot_wallet.dat ($HODL)', 3),
      ],
    },
    {
      id: 'security', type: 'security', name: 'Compliance (a dog)', x: 0.72, y: 0.7, links: ['core'],
      description: 'A dog with a lanyard. Good boy. Terrible auditor.',
      ice: [I('ice.coinbasement.withdrawal_pending', L), I('ice.coinbasement.kyc', L)],
    },
    {
      id: 'cold', type: 'vault', name: 'Cold Storage', x: 0.76, y: 0.18, links: [],
      description: 'Colder than the fridge. Much richer.',
      lock: { item: 'pw.coinbasement_cold', label: 'cold storage password (ops chat)' },
      ice: [I('ice.coinbasement.the_rug', 4)],
      files: [
        key('file.coinbasement.cold_wallet', 'cold_wallet.key', 'key.orbital_a', "Half A of a First Orbital two-key credential. Held by Coinbasement treasury 'for safekeeping'."),
        coin('file.coinbasement.cold_coins', 'cold_wallet ($HODL)', 6),
      ],
    },
    {
      id: 'core', type: 'core', name: 'Exchange Core', x: 0.92, y: 0.45, links: [],
      description: 'Owns the price. Owns the vibes.',
      ice: [I('ice.coinbasement.whale', 3), I('ice.coinbasement.kyc', L)],
    },
  ],
};
