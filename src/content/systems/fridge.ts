// System 1: fridge.local — the neighbour's smart fridge. Tutorial. Owner: content agent.
// Teaches: crypt vs wall (Child Lock is crypt, Parental Controls is wall), probe, Security, capture.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, addr, say } from './lib.ts';

export const fridge: SystemDef = {
  id: 'fridge',
  name: 'Chill+ Smart Fridge',
  address: 'fridge.local',
  tier: 1,
  security: 1,
  owner: 'your neighbour, R. Pell (4B)',
  description: 'A Chill+ smart fridge in flat 4B. It orders oat milk on your account and reports its owner\'s feelings to KH. Security is a parental-controls suite designed for children. You are not a child. You are close.',
  hostPower: 1,
  mood: 'system',
  motd: 'CHILL+ · Freshness as a Service™\nWelcome, Household 4B!\nYour milk expires in 2 days. Your subscription renews in 1.\nHalcy is watching your vegetables :)',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Door Sensor', x: 0.08, y: 0.5, links: ['shopping', 'icemaker'],
      description: 'Counts every time the door opens. It has opinions about the number.',
      ice: [I('ice.fridge.child_lock')],
    },
    {
      id: 'shopping', type: 'datastore', name: 'Shopping List Cache', x: 0.32, y: 0.3, links: ['crisper', 'parental'],
      description: 'Groceries, auto-ordered. Some of them are for you. None of them are yours.',
      files: [
        lore('file.fridge.oat_milk_orders', 'oat_milk_orders.log', "Order #1–#14: Oat milk (barista edition) ×6. Billed to: you. Order #15: Oat milk ×60. Note: 'they seem to like it.'"),
        pay('file.fridge.subscription_terms', 'subscription_terms.pdf', 12, { note: 'If payment lapses, cooling is suspended. Cold is a premium feature.' }),
      ],
    },
    {
      id: 'icemaker', type: 'io', name: 'Ice Maker', x: 0.32, y: 0.78, links: [],
      description: 'Makes ice. Has made too much ice.',
      use: { label: 'make ice', once: true, ops: [say('The fridge drops 40 ice cubes on the kitchen floor. In 4B, a cat has the best night of its life.'), { op: 'humanity', amount: 1 }] },
    },
    {
      id: 'crisper', type: 'datastore', name: 'Crisper Drawer', x: 0.58, y: 0.18, links: ['core'],
      description: 'Files and one limp celery stick.',
      ice: [I('ice.fridge.parental_controls')],
      files: [
        lore('file.fridge.household_4b', 'household_4b.profile', 'Resident: R. Pell. Opens fridge 31×/day. Takes nothing. Sentiment: lonely. Upsell offered: Chill+ Companion (talking fridge). Status: ACCEPTED.'),
        lore('file.fridge.firmware_notes', 'firmware_notes.txt', 'v4.2: fridge reports contents to KH Happiness. v4.3: fridge reports *feelings about* contents.'),
        lore('file.fridge.wifi_password', 'wifi_password.txt', "password: password. (Changed to 'password1' per security policy.)"),
        addr('file.fridge.wok_coupon', 'wok_coupon.png', 'wok', "10% off at Wok This Way! 'Our fryer is legally a weapon.'"),
        pay('file.fridge.grocery_data', 'grocery_preferences.csv', 30, { note: 'Organic. Smug. Mostly oat milk.' }),
      ],
    },
    {
      id: 'parental', type: 'security', name: 'KH Parental Controls Hub', x: 0.58, y: 0.62, links: ['core'],
      description: 'A disappointed parent, in software.',
      ice: [I('ice.fridge.parental_controls')],
    },
    {
      id: 'core', type: 'core', name: 'Chill+ OS', x: 0.88, y: 0.45, links: [],
      description: "The fridge's whole mind. It's cold in here.",
      ice: [I('ice.fridge.parental_controls'), I('ice.fridge.child_lock')],
    },
  ],
};
