// Deck hardware tiers. Owner: content agent. Tier 0 = the Potato-9 starting part (required for every part).
// Names, stats and flavor: docs/script/04-items-flavor.md §1. Ids `hw.<part>.t<n>`.
// Prices follow DESIGN §9: a tier-1 part is about one early run, a tier-4 part is the late-game sink (~10-18k).
// Rep gates keep the curve: t1 rep 1-2, t2 rep 3-4, t3 rep 5-6, t4 rep 7-8.
import type { HardwareDef, HardwarePart } from '../engine/types.ts';

type Row = [tier: number, name: string, value: number, price: number, minRep: number, flavor: string];

function part(p: HardwarePart, rows: Row[]): HardwareDef[] {
  return rows.map(([tier, name, value, price, minRep, flavor]) => ({
    id: `hw.${p}.t${tier}`, part: p, tier, name, value, price, ...(minRep > 1 ? { minRep } : {}), flavor,
  }));
}

export const hardware: HardwareDef[] = [
  ...part('cpu', [
    [0, 'Potato-9 SpudCore', 3, 0, 1, 'A single core, lightly mashed.'],
    [1, 'Bodega Duo', 4, 260, 1, 'Sold next to the lottery tickets. Same odds of changing your life.'],
    [2, 'Hornet Hex', 5, 1100, 3, 'Six cores. All of them angry.'],
    [3, 'Lattice-7', 6, 3800, 5, 'Thinks in grids. Dreams in grids. Possibly is a grid.'],
    [4, 'Cathedral X', 8, 16000, 8, "Cooled with holy water. It's tap water. It cost a fortune."],
  ]),
  ...part('ram', [
    [0, 'Potato-9 Starch Stick', 4, 0, 1, 'Four units of memory. It forgets the fifth.'],
    [1, 'Recall 6', 6, 220, 1, 'Remembers things. Some of them are yours.'],
    [2, 'Hoarder 8', 8, 900, 3, 'Never throws anything away. Not even errors.'],
    [3, 'Elephant 12', 12, 3000, 5, 'Never forgets. Holds grudges.'],
    [4, 'Babble Library 16', 16, 11000, 7, 'Holds every program, and a slightly wrong copy of every program.'],
  ]),
  ...part('firewall', [
    [0, 'Potato-9 Peel', 2, 0, 1, "A thin protective skin. Like a potato's."],
    [1, 'Screen Door', 4, 240, 1, 'Keeps out flies. Most flies.'],
    [2, 'Bouncer Pro', 6, 950, 3, "Checks every packet's ID. Lets in friends of friends."],
    [3, 'Bastion', 9, 3300, 5, 'Medieval in the best way.'],
    [4, 'Event Horizon', 12, 13000, 8, 'Nothing gets in. Nothing gets out. It gets a bit lonely.'],
  ]),
  ...part('chassis', [
    [0, 'Potato-9 Lunchbox', 20, 0, 1, 'It is a lunchbox. Some of the sandwich is still in there.'],
    [1, 'Pelican Case', 35, 200, 1, 'Waterproof. Dropproof. Not regret-proof.'],
    [2, 'Brick', 50, 750, 3, 'Military surplus. The military did not want it back.'],
    [3, 'Ironclad', 65, 2600, 5, "You could stop a car with it. Please don't."],
    [4, 'Monolith', 80, 9500, 7, 'Nobody knows who makes these. It hums at night.'],
  ]),
  ...part('mask', [
    [0, 'Potato-9 Paper Bag', 0, 0, 1, 'Eye holes. Fools nobody. Fools you a bit.'],
    [1, 'Novelty Moustache', 1, 300, 2, 'Obviously fake. Works on routers.'],
    [2, 'Grey Man', 3, 1300, 4, 'Looks like everyone. Specifically, like nobody.'],
    [3, 'Chameleon', 4, 3500, 6, 'Matches the colour of the packet. Confused by rainbows.'],
    [4, 'Nobody', 6, 12000, 8, '"There\'s no one here," says the chip. Convincingly.'],
  ]),
  ...part('uplink', [
    [0, 'Potato-9 Tin Can Phone', 0, 0, 1, 'Two cans and a string. No charges. One friend.'],
    [1, 'Antenna Hat', 2, 250, 1, 'Worn on the deck. Looks like a hat. Is a hat.'],
    [2, 'Relay', 3, 1000, 3, 'Talks to your hosts. Your hosts talk back.'],
    [3, 'Hive Link', 5, 3600, 5, 'Your botnet, in one voice. Slightly too many voices.'],
    [4, 'Choir Master', 6, 10000, 7, 'Conducts every host at once. Something hums along.'],
  ]),
  ...part('storage', [
    [0, 'Potato-9 Sock Drawer', 3, 0, 1, 'Three slots. One has a sock in it.'],
    [1, 'Shoebox', 5, 150, 1, 'Your childhood fits in here. So does this.'],
    [2, 'Filing Cabinet', 7, 650, 3, 'Alphabetical. Judgemental.'],
    [3, 'Warehouse', 9, 2200, 5, 'Forklift included. Forklift licence not included.'],
    [4, 'Bottomless', 12, 7500, 7, "We checked. There is a bottom. It's very far down."],
  ]),
  ...part('neural', [
    [0, 'Potato-9 Jumper Cables', 10, 0, 1, 'Clipped to your temples. Red is positive. Probably.'],
    [1, 'Hairnet', 14, 300, 2, 'Medical grade. Cafeteria style.'],
    [2, 'Halo Lite', 18, 1000, 3, 'Soft padding. New-brain smell.'],
    [3, 'Thinking Cap', 24, 3200, 5, 'Your thoughts, double-glazed.'],
    [4, 'Second Skull', 30, 10500, 7, "A spare skull, worn over the first. It's good to have a spare."],
  ]),
];
