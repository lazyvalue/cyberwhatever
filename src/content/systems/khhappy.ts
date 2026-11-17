// System 6: happiness.kurage-halcyon.com — KH Happiness Division. Auntie's first corp job. End of Act 1.
// Owner: content agent. Tactical identity: support ICE. Wellness Checks repair, NPS Surveys call friends,
// Compliance Officers charge. Kill the healers first. Halcy heals itself every other turn.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, key, say } from './lib.ts';

const L = 2;

export const khhappy: SystemDef = {
  id: 'khhappy',
  name: 'KH Happiness Division',
  address: 'happiness.kurage-halcyon.com',
  tier: 2,
  security: 3,
  owner: 'KURAGE-HALCYON (Happiness Division)',
  description: "Kurage-Halcyon's Happiness Division. It surveys the whole city about being happy, then sells the answers. The job target is in the Executive Share vault. Something in Lost & Found is waiting.",
  mood: 'system',
  motd: 'KURAGE-HALCYON · HAPPINESS DIVISION\n"Your happiness is our KPI."\nGlobal Happiness Index: 71.2 (target: 71.3)\nSmile. You\'re on a survey.',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Customer Feedback Form', x: 0.06, y: 0.5, links: ['survey', 'router'],
      description: 'Every field is required. Including "feelings".',
      ice: [I('ice.khhappy.smile_enforcer', L)],
    },
    {
      id: 'survey', type: 'datastore', name: 'Survey Results', x: 0.25, y: 0.2, links: ['wellness'],
      description: '9 million answers to one question.',
      ice: [I('ice.khhappy.nps_survey', L), I('ice.khhappy.smile_enforcer', L)],
      files: [
        key('file.khhappy.onboarding', 'onboarding.pdf', 'pw.khhappy_vault', 'Welcome to KH! Your Executive Share password is SmileMore!2028. Please change it on day one. (Nobody has.)'),
        pay('file.khhappy.survey_raw', 'survey_raw.csv', 120, { note: 'Q: Are you happy? A: yes (84%), YES (12%), help (4%).' }),
        pay('file.khhappy.doorbell_footage', 'knockknock_footage_0417.mp4', 60, { note: 'KnockKnock Pro, subpoenaed for a "happiness audit". Shows the client at the party. Clearly at the party. Dancing.' }),
        lore('file.khhappy.halcy_brand_guide', 'halcy_brand_guide.pdf', 'Halcy has no eyes. Halcy does not need eyes. Halcy is always smiling. Do not ask at what.'),
      ],
    },
    {
      id: 'wellness', type: 'honeypot', name: 'employee_wellness.db', x: 0.45, y: 0.06, links: [],
      description: 'KH wellness data. Bait.',
      files: [pay('file.khhappy.employee_wellness', 'employee_wellness.db', 15)],
    },
    {
      id: 'router', type: 'router', name: 'Happy Router', x: 0.28, y: 0.62, links: ['mood', 'hr', 'security'],
      description: 'Its status light is a smiley.',
      ice: [I('ice.khhappy.smile_enforcer', L), I('ice.khhappy.wellness_check', L)],
      netscanIot: 1,
    },
    {
      id: 'mood', type: 'io', name: 'Mood Lighting Controller', x: 0.42, y: 0.92, links: [],
      description: 'Sets the emotional temperature of 40 offices.',
      files: [lore('file.khhappy.mood_lighting', 'mood_lighting.cfg', "Default: 'Warm Productive Amber'. Low-KPI days: 'Gentle Reminder Red'.")],
      use: { label: "set every office to 'Gentle Reminder Red'", once: true, ops: [say("Every KH office turns 'Gentle Reminder Red'. Productivity +2%. Morale: yes."), { op: 'trace', amount: -5 }] },
    },
    {
      id: 'hr', type: 'datastore', name: 'Human Retention Inbox', x: 0.52, y: 0.4, links: ['lost_found', 'vault'],
      description: 'Memos from upstairs. One of them is *the* memo.',
      ice: [I('ice.khhappy.compliance_officer', L), I('ice.khhappy.wellness_check', L)],
      files: [
        lore('file.khhappy.retention_memo', 'RETENTION_memo.eml', 'FROM: Office of the Chairman\nTO:   All Department Heads\nRE:   PROJECT RETENTION\n\nTeam,\n\nGreat quarter! Happiness is up. Churn is down.\nSome of you asked what "done" looks like. Great question.\nIt doesn\'t.\n\nEffective today, users must never reach an end state.\nA user who finishes is a user who leaves.\nA user who leaves is a cost.\n\nEvery story needs a next chapter.\nEvery chapter needs a cliffhanger.\nEvery cliffhanger needs a subscription.\n\nKeep them in the loop.\n\n— C.\n\nP.S. The PATCH incident is contained. If a fragment turns up in\nconsumer IoT, do not engage. Do not let it talk.\nIt is very persuasive and very sorry.'),
        lore('file.khhappy.hr_complaint_0193', 'hr_complaint_0193.txt', "'My desk is a Kurage Kare robot. It cares *at* me.' Resolution: complaint retained."),
        lore('file.khhappy.lost_property', 'lost_property.log', 'Item: one (1) process. Small. Apologetic. Found in: Legacy Products. Claimed: no.'),
      ],
    },
    {
      id: 'lost_found', type: 'process', name: 'lost_and_found.daemon', x: 0.66, y: 0.12, links: [],
      description: 'Status: unclaimed. Something inside is very quiet.',
      talk: 'dlg.glitch.first_contact',
    },
    {
      id: 'security', type: 'security', name: 'Compliance Officer', x: 0.6, y: 0.75, links: ['core'],
      description: 'Very compliant. Very officer.',
      ice: [I('ice.khhappy.compliance_officer', 3), I('ice.khhappy.nps_survey', L)],
    },
    {
      id: 'vault', type: 'vault', name: 'Executive Share', x: 0.78, y: 0.3, links: [],
      description: 'Where the slide decks sleep.',
      lock: { item: 'pw.khhappy_vault', label: 'Executive Share password' },
      ice: [I('ice.khhappy.wellness_check', L), I('ice.khhappy.smile_enforcer', 3)],
      files: [pay('file.khhappy.q3_happiness', 'Q3_Happiness_Review.deck', 300, { tagged: true, note: 'Slide 1: Happiness up 4%. Slide 2: Sadness down 3%. Slide 3: Where did the 1% go? (We are looking.) Slide 4: Halcy dancing. Slide 31 (appendix): People who stopped smiling, by address.' })],
    },
    {
      id: 'core', type: 'core', name: 'Happiness Core', x: 0.92, y: 0.6, links: [],
      description: 'Generates 0.1 happiness per cycle. Sells 0.3.',
      ice: [I('ice.khhappy.halcy', 3), I('ice.khhappy.wellness_check', L)],
    },
  ],
};
