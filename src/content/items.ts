// Key / password / exploit items. Owner: content agent. Ids are the story contract (01-beats §H).
import type { ItemDef } from '../engine/types.ts';

export const items: ItemDef[] = [
  { id: 'key.orbital_a', name: 'First Orbital key (half A)', kind: 'key', description: 'Half A of a First Orbital two-key credential. Held by Coinbasement treasury "for safekeeping".' },
  { id: 'key.orbital_b', name: 'First Orbital key (half B)', kind: 'key', description: 'Half B of a First Orbital credential. Found in the coat of patient #8812 (deceased).' },
  { id: 'key.orbital_pair', name: 'First Orbital credential (A+B)', kind: 'key', description: 'Both halves, together. Opens the First Orbital vault. Two keyholders. One of them is you. So is the other.' },
  { id: 'key.kh_backbone_cert', name: 'KH backbone service certificate', kind: 'key', description: 'For "our own load testing". Lowers the backbone DDoS threshold by 20%.' },
  { id: 'key.deadmans_insurance', name: 'The insurance file key', kind: 'key', description: 'Nobody has this. Nobody was ever meant to.' },
  { id: 'key.localhost_meta', name: 'owner: you', kind: 'key', description: 'It is the console. You do not enter it. You use it.' },
  { id: 'pw.parkit_archive', name: 'Parking archive password', kind: 'password', description: 'ParkingIsLife4471. Customer satisfied. Customer has never been satisfied.' },
  { id: 'pw.khhappy_vault', name: 'KH Executive Share password', kind: 'password', description: 'SmileMore!2028. Please change it on day one. (Nobody has.)' },
  { id: 'pw.coinbasement_cold', name: 'Coinbasement cold storage password', kind: 'password', description: 'hodl4ever. We shouldn\'t say it in chat.' },
  { id: 'pw.chromebone_vault', name: 'Chrome & Bone cryo password', kind: 'password', description: 'spleenparty. "Who would guess spleenparty."' },
  { id: 'pw.seamless_sanctum', name: 'Seamless sanctum password', kind: 'password', description: 'amen-and-amen. Please stop putting your password on invoices.' },
  { id: 'pw.aegis_blacklab', name: 'Aegis Black Lab password', kind: 'password', description: 'ninetyfour. Don\'t tell anyone. Don\'t tell Wraith.' },
  { id: 'pw.deaddrop_sysop', name: 'Dead Drop sysop password', kind: 'password', description: 'staticforever. Someone forgot to delete it. Someone never deletes anything.' },
  { id: 'item.frozen_funds', name: 'Frozen funds (KH escrow)', kind: 'misc', description: 'Half your credits, frozen. "We\'ll keep this safe for you! —C." Find the escrow record to release them.' },
];
