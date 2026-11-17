// System 13: deadmans.switch — Auntie's "retirement job". A honeypot built for one operator. End of Act 2.
// Owner: content agent. DESIGN §10.3: unbeatable escalating ICE, trace locked rising, no way out.
// Linear path; each node's ICE is one level higher; every ICE Anchors you on sight; the last one cannot die.
// The engine ends the run with reason 'scripted' at trace 100 or integrity 0 (scriptedFailure); the story's
// run.ended trigger plays the fake GAME OVER. No neural damage here (no real flatline).
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, key, say } from './lib.ts';

export const deadmans: SystemDef = {
  id: 'deadmans',
  name: "Deadman's Switch",
  address: 'deadmans.switch',
  tier: 4,
  security: 5,
  owner: 'a dead KH executive (allegedly)',
  description: "A dead KH exec's insurance file. If he dies, it publishes. He's dead. It didn't. Biggest score on the net.",
  capturable: false,
  scriptedFailure: true,
  traceLock: 8,
  noJackOut: 'hang up: unavailable. thank you for staying.',
  noReclaim: true,
  mood: 'boss',
  motd: 'deadmans.switch\nIf you are reading this, I am dead.\nIf I am dead, you should not be reading this.\nPlease continue.',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Insurance Terminal', x: 0.06, y: 0.5, links: ['testament'],
      description: 'Opens far too easily.',
    },
    {
      id: 'testament', type: 'datastore', name: 'Testament', x: 0.24, y: 0.5, links: ['codicil'],
      description: "The will. It's short.",
      ice: [I('ice.deadmans.severance_package', 6)],
      files: [lore('file.deadmans.testament', 'testament.txt', 'I, the undersigned, leave everything to whoever is still playing.')],
    },
    {
      id: 'codicil', type: 'datastore', name: 'Codicil', x: 0.42, y: 0.5, links: ['executor'],
      description: "An addendum. It's longer.",
      ice: [I('ice.deadmans.non_compete', 7), I('ice.deadmans.severance_package', 7)],
      files: [
        lore('file.deadmans.codicil', 'codicil.txt', "Addendum: 'still playing' means *still playing*."),
        lore('file.deadmans.exit_interview', 'exit_interview.txt', 'Q: Why are you leaving? A: [no answer permitted]'),
      ],
    },
    {
      id: 'executor', type: 'security', name: 'Executor', x: 0.6, y: 0.5, links: ['probate'],
      description: 'Capturing it does nothing. It says so.',
      ice: [I('ice.deadmans.exit_interview', 8), I('ice.deadmans.golden_parachute', 8)],
      capture: [say('Executor: "Captured. This changes nothing. Please continue."')],
    },
    {
      id: 'probate', type: 'process', name: 'Probate', x: 0.78, y: 0.5, links: ['insurance'],
      description: 'A daemon that only says "please continue".',
      ice: [I('ice.retention_bonus', 9)],
      talk: 'dlg.deadmans.probate',
    },
    {
      id: 'insurance', type: 'vault', name: 'The Insurance File', x: 0.94, y: 0.5, links: [],
      description: 'Never reached.',
      lock: { item: 'key.deadmans_insurance', label: 'there is no key' },
      files: [key('file.deadmans.insurance', 'insurance.file', 'pw.deaddrop_sysop', "There's no exec. There's no insurance. There's a password: 'staticforever'. It opens the sysop vault on the Dead Drop. Someone forgot to delete it. Someone never deletes anything.")],
    },
  ],
};
