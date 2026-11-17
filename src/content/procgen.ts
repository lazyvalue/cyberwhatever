// Tables for procedural IoT hosts and Endless mode. Owner: content agent.
// Name parts and descriptions: docs/script/04-items-flavor.md §10.
// IoT is botnet fodder: weak ICE, tiny paydata. It helps (hosts, a little cash) but cannot replace hacking.
import type { ProcgenTables } from '../engine/types.ts';

export const procgen: ProcgenTables = {
  devices: [
    'fridge', 'toaster', 'doorbell', 'kettle', 'e-scooter', 'baby-monitor', 'smart-bulb', 'thermostat',
    'litter-box', 'aquarium', 'treadmill', 'mattress', 'blinds', 'meter', 'vending', 'speaker',
    'toothbrush', 'plant-pot', 'garage-door', 'lawn-bot', 'rice-cooker', 'massage-chair', 'bin', 'mirror',
  ],
  brands: [
    'chill+', 'toastr', 'knockknock', 'pulse', 'dreamdeck', 'sunrise', 'kurage-kare', 'halcy',
    'seamless', 'vend', 'bodega', 'nonbrand', 'cheapo', 'smrt', 'homeolo', 'gizmotron',
  ],
  tlds: ['iot', 'home', 'local', 'lan'],
  suffixes: ['4b', '9th-st', 'lobby', 'unit-07', 'basement', 'xmas-gift', 'do-not-unplug', 'grandmas', 'spare', 'office', 'jr', 'mk2'],
  owners: ["Pell's", "Dev's", "Mrs. Ashworth's", "Unit 12's", "The Kowalczyks'", "Someone's", "Nobody's", "Councillor B-O's", "Room 404's", "Landlord's", "The Twins'", "Dr. Ilse's"],
  descriptions: {
    'toaster': ['Toastr Infinite. Burns a smiley into every slice. Subscription lapsed; now burns a frown.'],
    'doorbell': ["KnockKnock Pro. Has watched 4,000 deliveries. Knows the neighbour's schedule better than the neighbour."],
    'kettle': ['Boils water. Reports it. Somewhere, a dashboard knows how much tea you drink.'],
    'e-scooter': ['Seamless Commute scooter. Stuck in a tree. Still online.'],
    'baby-monitor': ['Listens to a sleeping baby. And, for some reason, the whole street.'],
    'smart-bulb': ['A bulb with an IP address and a firmware update every Tuesday.'],
    'thermostat': ["Learned the household's habits. Disapproves of most of them."],
    'litter-box': ['Self-cleaning. Self-reporting. The cat has no privacy.'],
    'aquarium': ['Smart aquarium. The fish are not smart. The tank thinks less of them.'],
    'treadmill': ['Pulse Loyalty treadmill. Unused since January. Sends motivational notes to an empty room.'],
    'mattress': ["DreamDeck. Rates your sleep out of 100. You've never broken 40."],
    'blinds': ['KH Sunrise blinds. Opens at 6 a.m. whatever you think about it.'],
    'meter': ['Parking meter. Fines with enthusiasm.'],
    'vending': ['Vending machine. Holds one sandwich it considers its own.'],
    'speaker': ['Smart speaker. Always listening. Never understands.'],
    'toothbrush': ['Bluetooth toothbrush. Knows exactly how long you brush. Judges you for it.'],
    'plant-pot': ["Smart plant pot. The plant died. The pot still reports 'thriving'."],
    'garage-door': ['Opens for anyone who asks nicely in the right protocol.'],
    'lawn-bot': ['Robot mower. Mowed the same square metre for six months. Very good square metre.'],
    'rice-cooker': ['Wi-Fi rice cooker. Makes rice. Makes it *known*.'],
    'massage-chair': ['Kurage Kare chair. Massages. Upsells. Massages again.'],
    'bin': ['Smart bin. Weighs your guilt. Sends it to the council.'],
    'mirror': ["Smart mirror. Tells you you look great. Lies. It's in the terms."],
    'fridge': ['Chill+ fridge. Not *your* fridge. Your fridge would be jealous.'],
  },
  genericDescriptions: [
    'A small device with a big opinion of itself.',
    'Default password. Factory settings. Factory feelings.',
    'Its last firmware update was a long time ago. It misses being cared about.',
    'Online since install. Never asked to be.',
    'Built to last two years. Has lasted nine. Bitter.',
    'Labelled DO NOT UNPLUG. Nobody remembers why. Nobody dares.',
    'It blinks. That\'s its whole personality.',
    'Has a screen. The screen shows the time. The time is wrong.',
  ],
  // IoT and Endless ICE by tier (base archetypes; Endless levels them up).
  iceByTier: [
    ['ice.fridge.child_lock', 'ice.fridge.parental_controls', 'ice.sentry'],
    ['ice.sentry', 'ice.cipher', 'ice.bloodhound', 'ice.tarpit'],
    ['ice.cipher', 'ice.killer', 'ice.hydra', 'ice.scrambler', 'ice.mirror', 'ice.siren'],
    ['ice.killer', 'ice.hydra', 'ice.scrambler', 'ice.mirror', 'ice.patcher', 'ice.tarpit'],
    ['ice.killer', 'ice.hydra', 'ice.mirror', 'ice.patcher', 'ice.scrambler', 'ice.bloodhound'],
  ],
  // Tiny values on purpose: IoT is for hosts, not money (engine scales by tier for Endless).
  paydata: [
    { name: 'usage telemetry', value: 6 },
    { name: 'wi-fi password list', value: 10 },
    { name: 'voice recordings (mostly sighing)', value: 12 },
    { name: 'firmware signing key (expired)', value: 15 },
    { name: 'household schedule', value: 8 },
    { name: 'subscription receipts', value: 5 },
  ],
};
