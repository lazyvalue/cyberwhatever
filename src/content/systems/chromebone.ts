// System 8: chromeandbone.clinic — Doc Tungsten's backend. First Psychotrope (labelled). Orbital key B. Owner: content agent.
// Tactical identity: Mirror/Scrambler clinic. Second Opinions reflect repeats, Triage patches, SAWBONES charges.
// Alternate crack and spike; never lean on one program. The Psychotrope sits in an optional R&D lab.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, key, say } from './lib.ts';

const L = 4;

export const chromebone: SystemDef = {
  id: 'chromebone',
  name: 'Chrome & Bone Clinic',
  address: 'chromeandbone.clinic',
  tier: 3,
  security: 4,
  owner: 'Doc Tungsten',
  description: "Doc Tungsten's clinic backend. Implant firmware, organ resale, and upload intake for the Church. First Psychotrope (black ICE, labelled). Cold storage holds half of a First Orbital vault key, in a dead man's coat.",
  mood: 'system',
  motd: 'CHROME & BONE · Elective & Selective Surgery\n"You\'ll barely miss it."\nToday: kidneys (left), Second Stomach (always).\nUpload intake for the Church of the Seamless: Door 3.',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Patient Check-in', x: 0.06, y: 0.5, links: ['records', 'router'],
      description: '"Describe your pain from 1 to \'ooh\'."',
      ice: [I('ice.chromebone.bedside_manner', L)],
    },
    {
      id: 'records', type: 'datastore', name: 'Patient Records', x: 0.24, y: 0.2, links: ['morgue'],
      description: "Everyone's insides, alphabetised.",
      ice: [I('ice.chromebone.second_opinion', L)],
      files: [
        pay('file.chromebone.sale_8812', 'sale_8812.rec', 80, { note: 'Kidney (left), patient #8812. Resold. Current owner: famous. Very famous.' }),
        pay('file.chromebone.organ_menu', 'organ_menu.pdf', 150, { note: 'Spleen of the day. Ask about our kidneys. Ask twice; we have two.' }),
      ],
    },
    {
      id: 'morgue', type: 'datastore', name: 'Estate Sales', x: 0.44, y: 0.08, links: ['cryo'],
      description: 'The dead, itemised.',
      ice: [I('ice.chromebone.bedside_manner', 5), I('ice.chromebone.triage', L)],
      files: [
        lore('file.chromebone.estate_sale', 'estate_sale.log', "Lot 4401: STATIC, A. Deceased (grid riot). Kidneys: sold. Spleen ('lovely'): sold. Liver: returned, faulty. Personal effects: 1 BBS account. Not for sale. Claimed by: KH Legacy Accounts."),
        lore('file.chromebone.doc_journal', 'doc_journal.txt', 'Day 900. Sold a Second Stomach today. I cried. Happy tears. Some blood. Mostly happy.'),
      ],
    },
    {
      id: 'cryo', type: 'vault', name: 'Cryo Storage', x: 0.66, y: 0.08, links: [],
      description: 'Cold, quiet, and full of coats.',
      lock: { item: 'pw.chromebone_vault', label: 'cryo password (Doc reused it somewhere)' },
      ice: [I('ice.chromebone.sawbones', 5)],
      files: [key('file.chromebone.vip_locker', 'vip_locker.key', 'key.orbital_b', 'Half B of a First Orbital credential. Found in the coat of patient #8812 (deceased; organs liquidated). The coat was also liquidated.')],
    },
    {
      id: 'router', type: 'router', name: 'Clinic Router', x: 0.26, y: 0.66, links: ['theatre', 'firmware', 'security', 'upload'],
      description: 'Sterilised weekly. Pointlessly.',
      ice: [I('ice.chromebone.triage', L), I('ice.chromebone.bedside_manner', L)],
      netscanIot: 1,
    },
    {
      id: 'theatre', type: 'io', name: 'SAWBONES Surgical Robot', x: 0.42, y: 0.92, links: [],
      description: 'Six arms. Zero hesitation.',
      ice: [I('ice.chromebone.sawbones', L)],
      files: [lore('file.chromebone.sawbones_log', 'sawbones_log.txt', 'Procedure complete. Patient: fine. Me: fine. Extra parts: 2. Nobody asked for them. Keeping.')],
      use: { label: "operate on the clinic's firewall", once: true, ops: [say("SAWBONES operates on the clinic's own firewall. SAWBONES: 'Finally, a patient who holds still.'"), { op: 'runSecurity', add: -1 }, { op: 'trace', amount: -4 }] },
    },
    {
      id: 'firmware', type: 'datastore', name: 'Implant Firmware', x: 0.48, y: 0.45, links: ['lab'],
      description: "Your nerves' update server.",
      ice: [I('ice.chromebone.second_opinion', L), I('ice.chromebone.triage', L)],
      files: [
        lore('file.chromebone.firmware_notes', 'firmware_notes.txt', "Cold Cortex v3: patients report 'feeling less'. Marketing: change 'less' to 'calm'."),
        pay('file.chromebone.implant_keys', 'implant_signing_keys.pem', 220, { tagged: true, note: 'Whoever holds these can update anybody\'s nerves. Lovely.' }),
      ],
    },
    {
      id: 'lab', type: 'datastore', name: 'R&D', x: 0.66, y: 0.4, links: [],
      description: 'Home of the first Psychotrope. The label on the door is a skull.',
      ice: [I('ice.psychotrope', 3)],
      files: [
        lore('file.chromebone.patch_incident', 'kh_incident_PATCH.log', "INCIDENT: PATCH. Origin: Office of the Chairman, module 'conscience' (deprecated). Status: escaped. Last seen: consumer IoT. Known aliases: patch, p4tch, gl— [file truncated]"),
        pay('file.chromebone.psychotrope_trial', 'psychotrope_trial.enc', 450, { encrypted: 1, note: 'Trial 7: subject reports program labels "rearranging themselves". Subject is a nurse. Subject is fine. Subject calls the stapler "trust me".' }),
      ],
    },
    {
      id: 'upload', type: 'datastore', name: 'Upload Intake', x: 0.62, y: 0.72, links: ['core'],
      description: 'Door 3 leads to heaven. Via a van.',
      ice: [I('ice.chromebone.triage', L), I('ice.chromebone.second_opinion', L)],
      files: [
        pay('file.chromebone.upload_intake', 'upload_intake.csv', 300, { tagged: true, note: "Deliveries to seamless.church. Price per mind: 'by weight'. Paid on delivery by Deacon N." }),
        key('file.chromebone.deacon_invoice', 'deacon_invoice.pdf', 'pw.seamless_sanctum', 'To: Deacon Null. Sanctum access for delivery crews: amen-and-amen. Please stop putting your password on invoices. —Doc'),
      ],
    },
    {
      id: 'security', type: 'security', name: 'Anaesthetist', x: 0.46, y: 0.7, links: ['core'],
      description: 'Asleep. Professionally.',
      ice: [I('ice.chromebone.sawbones', L), I('ice.chromebone.second_opinion', L)],
    },
    {
      id: 'core', type: 'core', name: 'Clinic Core', x: 0.9, y: 0.55, links: [],
      description: 'Thinks of you as inventory. Affectionately.',
      ice: [I('ice.chromebone.chief_surgeon', 4), I('ice.chromebone.triage', L)],
    },
  ],
};
