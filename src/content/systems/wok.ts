// System 2: wokthisway.biz — noodle shop POS. First money, first boss, the deep fryer. Owner: content agent.
// Tactical identity: a Tar Pit kitchen. The Rota flips its shell type at half core.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, addr, say } from './lib.ts';

export const wok: SystemDef = {
  id: 'wok',
  name: 'Wok This Way POS',
  address: 'wokthisway.biz',
  tier: 1,
  security: 1,
  owner: 'Wok This Way (franchise #4)',
  description: 'Noodle shop on 9th. One cook, Dev, who is also the rota. Good noodles. A till with real money in it. A deep fryer that the manual calls "not a toy" four times.',
  hostPower: 1,
  mood: 'system',
  motd: 'WOK THIS WAY · POS v2\n"Noodles so good you\'ll forget the health inspection"\nSTAFF: clock in. CUSTOMERS: you shouldn\'t be here.\nHACKERS: please not the fryer.',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Order Tablet', x: 0.06, y: 0.5, links: ['menu', 'tips'],
      description: 'Sticky. Nobody asks why.',
      ice: [I('ice.wok.health_inspector')],
    },
    {
      id: 'menu', type: 'datastore', name: 'Menu Server', x: 0.28, y: 0.35, links: ['cam', 'till', 'timeclock'],
      description: '64 dishes. 63 are noodles.',
      ice: [I('ice.wok.secret_recipe')],
      files: [
        lore('file.wok.reviews', 'reviews.txt', "★★★★★ 'Best noodles in the city.' ★☆☆☆☆ 'The fryer looked at me.' ★★★★☆ 'Fryer looked at me. Noodles great though.'"),
        lore('file.wok.staff_rota', 'staff_rota.xlsx', "Mon–Sun: Dev. Dev's note: 'I am the staff. I am also the rota. Please send help (part-time).'"),
        addr('file.wok.guest_wifi', 'guest_wifi.txt', 'bigbyte', "Guest wifi by BigByte ISP. 'Up to' fast! Problems? bigbyte-isp.net"),
        pay('file.wok.kh_supplier_invoice', 'kh_supplier_invoice.pdf', 40, { tagged: true, note: 'Noodles supplied by KH Food Services. Each noodle is licensed, not sold.' }),
      ],
    },
    {
      id: 'tips', type: 'honeypot', name: 'tips_jar.db', x: 0.28, y: 0.78, links: [],
      description: 'Looks like money. Is a trap. Like most tip jars.',
      files: [pay('file.wok.tips_jar', 'tips_jar.db', 3)],
    },
    {
      id: 'cam', type: 'io', name: 'Kitchen Camera', x: 0.5, y: 0.1, links: ['fryer'],
      description: "Points at the wok. Also at Dev's whole life.",
      use: { label: 'watch the feed', once: true, ops: [say('Dev is eating noodles over the sink at 3 a.m. It looks peaceful. You close the feed.'), { op: 'humanity', amount: 1 }] },
    },
    {
      id: 'till', type: 'datastore', name: 'The Till', x: 0.52, y: 0.4, links: ['core'],
      description: 'Where the money sleeps.',
      ice: [I('ice.wok.health_inspector')],
      files: [
        pay('file.wok.till_float', 'till_float.dat', 60, { note: 'Float: 412¤. Tips: 3¤. Tips are low because the jar is a honeypot.' }),
        pay('file.wok.broth_recipe', 'broth_recipe.enc', 90, { encrypted: 1, note: "Step 1: bones. Step 2: time. Step 3: the thing Grandma Wu won't tell anyone. Step 4: don't ask about step 3." }),
      ],
    },
    {
      id: 'timeclock', type: 'security', name: 'Staff Time Clock', x: 0.5, y: 0.7, links: ['core'],
      description: 'Clocks in one staff member. Clocks him out never.',
      ice: [I('ice.wok.grease_trap')],
    },
    {
      id: 'fryer', type: 'io', name: 'FRY-9000 Deep Fryer', x: 0.76, y: 0.12, links: ['core'],
      description: '190°C. Networked. Why is it networked.',
      ice: [I('ice.wok.grease_trap')],
      files: [lore('file.wok.fryer_manual', 'fryer_manual.txt', 'FRY-9000. Max 190°C. Do not overclock. If overclocked, do not stand near. If near, we are sorry.')],
      use: { label: 'talk to the fryer', ops: [{ op: 'dialogue', dialogue: 'dlg.wok.fryer' }] },
    },
    {
      id: 'core', type: 'core', name: 'POS Core', x: 0.92, y: 0.5, links: [],
      description: "The till's boss.",
      ice: [I('ice.wok.the_rota')],
    },
  ],
};
