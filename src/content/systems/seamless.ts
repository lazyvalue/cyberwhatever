// System 10: seamless.church — Church of the Seamless. Uploaded minds are Process nodes. Owner: content agent.
// Tactical identity: attrition. Indulgences patch, Collection Plates trace, Choir Wardens call the faithful, and
// The Ascension (labelled black ICE) guards the sanctum with Burn. The choir's fate is a dialogue choice.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, say } from './lib.ts';

const L = 5;

export const seamless: SystemDef = {
  id: 'seamless',
  name: 'Church of the Seamless',
  address: 'seamless.church',
  tier: 4,
  security: 4,
  owner: 'Deacon Null (resold from KH Halcyon Heaven)',
  description: "The Church of the Seamless. Sells uploads as salvation in three subscription tiers, resold from KH's Halcyon Heaven. Four migrated minds sit in the choir as Process nodes. You decide what happens to them.",
  mood: 'system',
  motd: 'CHURCH OF THE SEAMLESS\n"Blessed are the uploaded, for they shall never buffer."\nToday\'s sermon: On Auto-Renewal\nNow migrating: 14 souls · est. eternity: 4 min',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Narthex (Donation Portal)', x: 0.05, y: 0.5, links: ['confession', 'router'],
      description: '"Suggested donation: everything."',
      ice: [I('ice.seamless.verger', L)],
    },
    {
      id: 'confession', type: 'datastore', name: 'Confession Booth', x: 0.22, y: 0.2, links: ['pulpit', 'tithe'],
      description: 'Sins, timestamped.',
      ice: [I('ice.seamless.collection_plate', L), I('ice.seamless.verger', L)],
      files: [
        pay('file.seamless.confessions', 'confessions.db', 250, { tagged: true, note: "'I sometimes skip the ads.' Penance: three ads, unskippable." }),
        pay('file.seamless.confession_0417', 'confession_0417.db', 120, { note: "Confessor: D. Null. 'I put ads in heaven.' Penance: none. Upsell: Premium Absolution." }),
        lore('file.seamless.sermon', 'sermon_on_autorenewal.txt', 'And lo, the soul did not cancel. And it was renewed. And it was good. And it was billed.'),
      ],
    },
    {
      id: 'pulpit', type: 'process', name: 'The Pulpit', x: 0.4, y: 0.06, links: [],
      description: 'Deacon Null, mid-sermon. Always mid-sermon.',
      talk: 'dlg.deacon.pulpit',
      files: [lore('file.seamless.deacon_notes', 'deacon_notes.txt', "Never say 'dead'. Say 'migrated'. Never say 'ads'. Say 'hymns from our partners'.")],
    },
    {
      id: 'tithe', type: 'honeypot', name: 'tithe_ledger.db', x: 0.4, y: 0.32, links: [],
      description: 'Smells of money. Smells of a trap.',
      files: [pay('file.seamless.tithe_ledger', 'tithe_ledger.db', 20)],
    },
    {
      id: 'router', type: 'router', name: 'Bell Tower', x: 0.24, y: 0.7, links: ['ads', 'security'],
      description: 'Rings on every packet.',
      ice: [I('ice.seamless.choir_warden', L), I('ice.seamless.verger', L)],
      netscanIot: 1,
    },
    {
      id: 'ads', type: 'io', name: 'Ad Insertion Server', x: 0.42, y: 0.92, links: [],
      description: 'Inserts hymns from our partners into heaven.',
      ice: [I('ice.seamless.indulgence', L), I('ice.seamless.collection_plate', L)],
      files: [
        pay('file.seamless.tiers', 'tiers.pdf', 200, { note: 'Basic (ads). Plus (one memory, looped). Enterprise (you may be deployed).' }),
        pay('file.seamless.whitelabel', 'halcyon_heaven_whitelabel.pdf', 400, { tagged: true, note: 'Church of the Seamless resells Halcyon Heaven (KH). Margin: 70%. Theology: optional.' }),
      ],
      use: { label: 'replace every ad in heaven with silence', once: true, ops: [say('Every ad in heaven goes silent for one hour. 20,000 migrated minds hear nothing for the first time.'), { op: 'humanity', amount: 3 }, { op: 'heat', amount: 10 }] },
    },
    {
      id: 'security', type: 'security', name: 'The Vergers', x: 0.45, y: 0.62, links: ['sanctum', 'core'],
      description: 'Quiet men with long sticks.',
      ice: [I('ice.seamless.verger', L), I('ice.seamless.indulgence', L), I('ice.seamless.collection_plate', L)],
    },
    {
      id: 'sanctum', type: 'vault', name: 'Sanctum', x: 0.6, y: 0.4, links: ['choir'],
      description: 'Behind it, the choir.',
      lock: { item: 'pw.seamless_sanctum', label: 'sanctum password (Doc invoiced it)' },
      ice: [I('ice.seamless.the_ascension', 4), I('ice.seamless.indulgence', L)],
      files: [
        lore('file.seamless.migration_queue', 'migration_queue.csv', 'Next: R. Pell (4B). Reason: lonely. Referred by: his fridge.'),
        lore('file.seamless.enterprise_clause', 'enterprise_clause.txt', 'Clause 9(e): Enterprise souls may be deployed as compute by any account holding root on the choir. Drafted by: O. Okonkwo-Varga.'),
        lore('file.seamless.liturgy_v3', 'liturgy_v3.txt', "Verse 3: 'Fear not, for your progress is saved. Fear not, for you may continue.'"),
      ],
    },
    {
      id: 'choir', type: 'process', name: 'The Choir', x: 0.74, y: 0.22, links: ['mind_1', 'mind_2', 'mind_3', 'mind_4'],
      description: 'Four minds singing different songs.',
      talk: 'dlg.seamless.choir',
    },
    { id: 'mind_1', type: 'process', name: 'Iolanthe (Plus)', x: 0.66, y: 0.04, links: [], description: "It's always her granddaughter's birthday.", talk: 'dlg.seamless.mind_1' },
    { id: 'mind_2', type: 'process', name: 'Brother Kestrel (Basic)', x: 0.8, y: 0.04, links: [], description: 'Content. Sponsored.', talk: 'dlg.seamless.mind_2' },
    { id: 'mind_3', type: 'process', name: 'Okonkwo-Varga (Enterprise)', x: 0.94, y: 0.12, links: [], description: 'Designed the tiers. Rented by them.', talk: 'dlg.seamless.mind_3' },
    { id: 'mind_4', type: 'process', name: 'Seven (Basic, legacy)', x: 0.94, y: 0.32, links: [], description: 'Forgot their name. Likes the quiet.', talk: 'dlg.seamless.mind_4' },
    {
      id: 'core', type: 'core', name: 'Heaven Core', x: 0.88, y: 0.7, links: [],
      description: '400 TB of eternity. 60% ads.',
      ice: [I('ice.seamless.heaven_core', 5), I('ice.seamless.choir_warden', L)],
    },
  ],
};
