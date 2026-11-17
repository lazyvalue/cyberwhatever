// System 5: parkit.city.gov — the Parking Authority. Side system: erase tickets, find dirt. Owner: content agent.
// Tactical identity: bureaucracy. Meter Maids (trace), The Boot (Anchored), Appeals Process (Scramble),
// and the car in space 2 (a Hydra, of course). The archive vault needs a password from BigByte.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, say } from './lib.ts';

const L = 2;

export const parkit: SystemDef = {
  id: 'parkit',
  name: 'City Parking Authority',
  address: 'parkit.city.gov',
  tier: 2,
  security: 3,
  owner: 'The City (Parking Division)',
  description: "The city's parking authority. Issues 41,000 fines a day for 3 public spaces. Wipe your tickets (or everyone's). The archive vault holds dirt on a councillor; you need a password from somewhere else.",
  mood: 'system',
  motd: 'CITY PARKING AUTHORITY\n"Every space is a privilege."\nFines issued today: 41,026. Spaces available: 3.',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Citizen Payment Portal', x: 0.06, y: 0.5, links: ['ticketdb', 'meters'],
      description: 'Accepts payment. Rejects joy.',
      ice: [I('ice.parkit.meter_maid', L)],
    },
    {
      id: 'ticketdb', type: 'io', name: 'Violations Database', x: 0.26, y: 0.3, links: ['tow', 'council'],
      description: 'Every fine in the city. Including yours.',
      ice: [I('ice.parkit.the_boot', L)],
      use: { label: 'open the violations database', ops: [{ op: 'dialogue', dialogue: 'dlg.parkit.tickets' }] },
    },
    {
      id: 'meters', type: 'io', name: 'Smart Meter Array', x: 0.26, y: 0.75, links: ['audit'],
      description: '9,000 meters, one heartbeat.',
      files: [lore('file.parkit.meter_firmware', 'meter_firmware.txt', "v7: meters may now fine for 'parking with intent'."), lore('file.parkit.meter_hostlist', 'meter_hostlist.txt', 'Meters on 9th: weak passwords, strong opinions. (Netscan from a router finds them.)')],
      use: { label: 'set every meter to FREE', once: true, ops: [say('Every meter in the city reads FREE for one cycle. Horns honk in delight.'), { op: 'humanity', amount: 3 }, { op: 'heat', amount: 8 }] },
    },
    {
      id: 'tow', type: 'io', name: 'Tow Dispatch', x: 0.46, y: 0.1, links: [],
      description: 'A list of cars and a hunger.',
      ice: [I('ice.parkit.space_two', L)],
      use: { label: "tow the councillor's car", once: true, ops: [say("You tow the councillor's car out of space 2. It has been in space 2 for years. The space is free. Nobody parks in it. Nobody dares."), { op: 'humanity', amount: 1 }, { op: 'flag', flag: 'parkit_space_two_towed' }] },
    },
    {
      id: 'council', type: 'datastore', name: 'Council Correspondence', x: 0.5, y: 0.42, links: ['archive', 'audit'],
      description: 'Polite letters, impolite permits.',
      ice: [I('ice.parkit.appeals_process', 3)],
      files: [
        lore('file.parkit.ticket_quotas', 'ticket_quotas.memo', 'Officers below quota will be reassigned to being parked.'),
        lore('file.parkit.space_count', 'space_count.dat', 'Public spaces: 3. Space 2 has held the same car since before records began. We are afraid of it.'),
        pay('file.parkit.tow_targets', 'tow_targets.csv', 60, { note: 'Priority: cars with bumper stickers about the Parking Authority.' }),
        pay('file.parkit.kh_meter_contract', 'kh_meter_contract.pdf', 180, { tagged: true, note: "KH Seamless Parking™: 'You are always parked somewhere.'" }),
      ],
    },
    {
      id: 'audit', type: 'security', name: 'Audit Daemon', x: 0.55, y: 0.78, links: ['core'],
      description: 'Audits everything except itself.',
      ice: [I('ice.parkit.meter_maid', L), I('ice.parkit.the_boot', L)],
    },
    {
      id: 'archive', type: 'vault', name: 'Archive', x: 0.76, y: 0.2, links: [],
      description: 'Old fines, older secrets. Password-locked.',
      lock: { item: 'pw.parkit_archive', label: 'archive password (BigByte support has it)' },
      ice: [I('ice.parkit.appeals_process', 3)],
      files: [pay('file.parkit.councillor_dirt', 'councillor_dirt.zip', 400, { tagged: true, note: "Permits issued to Councillor Brandt-Okafor's nephew (×212), his dog (×3), and his other dog (×1)." })],
    },
    {
      id: 'core', type: 'core', name: 'Authority Core', x: 0.9, y: 0.6, links: [],
      description: 'It has issued itself a ticket.',
      ice: [I('ice.parkit.the_boot', 3), I('ice.parkit.appeals_process', 3), I('ice.parkit.meter_maid', 3)],
    },
  ],
};
