// System 12: aegis-dynamics.mil — military contractor. Black ICE heavy, all labelled. Milspec icebreaker. Owner: content agent.
// Tactical identity: lethal but readable. Every black ICE telegraphs its neural hit one turn ahead; Decoy, stun or
// kill it in that window. The lobby and armoury black ICE are optional; the Black Lab's is not.
// Wraith flatlines at the test range (third node on the main path); the remains appear next to it.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, prog, say } from './lib.ts';

const L = 5;

export const aegis: SystemDef = {
  id: 'aegis',
  name: 'Aegis Dynamics',
  address: 'aegis-dynamics.mil',
  tier: 4,
  security: 5,
  owner: 'Aegis Dynamics (defence solutions)',
  description: 'Military contractor. Makes black ICE for KH and anyone else with a budget. Black ICE heavy, all labelled. The Black Lab vault holds a milspec icebreaker. Wraith is racing you to it.',
  mood: 'system',
  motd: 'AEGIS DYNAMICS · Defence Solutions\n"Peace Through Superior Firmware."\nWARNING: Black ICE in use. Lethal. Labelled for your convenience.\nInterns: sign the waiver before testing.',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Visitor Badge Kiosk', x: 0.05, y: 0.5, links: ['lobby', 'router'],
      description: 'Your badge says VISITOR (EXPENDABLE).',
      ice: [I('ice.aegis.intern', L)],
    },
    {
      id: 'lobby', type: 'datastore', name: 'Brochure Rack', x: 0.22, y: 0.18, links: ['ufo'],
      description: 'Glossy. Lethal. The black ICE here is optional.',
      ice: [I('ice.flatliner', 3)],
      files: [
        pay('file.aegis.apology_templates', 'apology_templates.docx', 150, { note: 'Dear [CIVILIAN], we regret the [INCIDENT]. Please accept this [VOUCHER].' }),
        lore('file.aegis.brochure', 'brochure.pdf', 'Aegis: because the other side also has a brochure.'),
        lore('file.aegis.procurement', 'procurement.txt', 'Exit request forms take 18 months. Entry is same-day.'),
      ],
    },
    {
      id: 'ufo', type: 'honeypot', name: 'classified_ufo_files.db', x: 0.4, y: 0.05, links: [],
      description: "Everyone probes this. That's the point.",
      files: [pay('file.aegis.ufo_files', 'classified_ufo_files.db', 30)],
    },
    {
      id: 'router', type: 'router', name: 'Secure Router', x: 0.24, y: 0.62, links: ['testrange', 'interns', 'security'],
      description: 'Secure from everyone but people like you.',
      ice: [I('ice.aegis.collateral', L), I('ice.aegis.intern', L)],
      netscanIot: 1,
    },
    {
      id: 'testrange', type: 'io', name: 'ICE Test Range', x: 0.44, y: 0.42, links: ['wraith_remains', 'blacklab'],
      description: 'Third node in. This is where Wraith fell.',
      ice: [I('ice.aegis.peacekeeper', L), I('ice.aegis.procurement', L)],
      files: [lore('file.aegis.test_results', 'test_results.csv', "Test 41: subject xX_Wraith_Xx (unauthorised). Result: flatline. Note: subject's save signature matches nothing on file. Matches *slot 0*. What is slot 0?")],
      use: { label: 'run a live-fire test on the next ICE', ops: [say('The range spins up. Whatever you fight next starts the fight with its shell already cracked.'), { op: 'nextFight', ops: [{ op: 'iceStatus', status: 'exposed', value: 1, to: 'allEnemies' }] }] },
    },
    {
      id: 'wraith_remains', type: 'process', name: 'xX_Wraith_Xx.sav', x: 0.6, y: 0.24, links: [],
      description: 'Status: orphaned.',
      talk: 'dlg.wraith.flatline',
    },
    {
      id: 'blacklab', type: 'vault', name: 'Black Lab', x: 0.66, y: 0.5, links: [],
      description: 'The icebreaker is inside. So is something red with a skull on it.',
      lock: { item: 'pw.aegis_blacklab', label: 'Black Lab password (Wraith left it at the karaoke bar; Whisper sells it)' },
      ice: [I('ice.flatliner', 4), I('ice.aegis.collateral', L)],
      files: [
        prog('file.aegis.milspec_icebreaker', 'milspec_icebreaker.prog', 'prog.milspec_icebreaker', "MILSPEC ICEBREAKER. Clearance: yours now. Do not use on allies. You don't have allies."),
        lore('file.aegis.kh_contract', 'kh_contract.pdf', "Aegis supplies black ICE to KURAGE-HALCYON. Rider: CHAIRMAN may order custom ICE for 'special customers'. Spec on file: escalating, unwinnable, one (1) operator."),
      ],
    },
    {
      id: 'interns', type: 'datastore', name: 'Intern Waivers', x: 0.42, y: 0.84, links: ['turret', 'armoury'],
      description: 'A stack of signatures. Some shaky.',
      ice: [I('ice.aegis.intern', L), I('ice.aegis.procurement', L)],
      files: [lore('file.aegis.intern_waiver', 'intern_waiver.pdf', "I agree black ICE may 'reformat' my 'personality'. Next of kin: ______ (optional; we will find them).")],
    },
    {
      id: 'turret', type: 'io', name: 'Lobby Turret', x: 0.6, y: 0.97, links: [],
      description: 'Aimed at the lobby. Mostly at the vending machine.',
      use: { label: 'aim the turret at the vending machine', once: true, ops: [say("The vending machine surrenders. It drops a free drink. You take it. You're a hero."), { op: 'humanity', amount: 1 }, { op: 'neural', amount: 2 }] },
    },
    {
      id: 'armoury', type: 'datastore', name: 'Warez Armoury', x: 0.64, y: 0.78, links: ['security'],
      description: 'Programs with serial numbers. Guarded by something that burns.',
      ice: [I('ice.cortex_burner', 4), I('ice.aegis.peacekeeper', L)],
      files: [
        pay('file.aegis.black_ice_specs', 'black_ice_specs.enc', 900, { encrypted: 2, tagged: true, note: "Flatliner, Cortex Burner, Psychotrope. Specs. Margins. A note: 'Psychotrope v2 can reach the *real* labels. Do not ask how.'" }),
        prog('file.aegis.ram_crate', 'ram_ram.crate', 'prog.ram_v2', 'Serial number filed off. Badly.'),
        lore('file.aegis.apology_brochure', 'brochure_v2.pdf', 'Aegis: because the other side also has a brochure. (Now with a second brochure.)'),
      ],
    },
    {
      id: 'security', type: 'security', name: 'Sentinel', x: 0.78, y: 0.68, links: ['core'],
      description: 'Never sleeps. Never blinks. Never gets a raise.',
      ice: [I('ice.aegis.peacekeeper', 6), I('ice.aegis.procurement', 6)],
    },
    {
      id: 'core', type: 'core', name: 'Aegis Core', x: 0.93, y: 0.45, links: ['testrange'],
      description: 'Built to defend. Not built to be owned. Oops.',
      ice: [I('ice.aegis.sentinel_prime', 5), I('ice.aegis.intern', 6)],
    },
  ],
};
