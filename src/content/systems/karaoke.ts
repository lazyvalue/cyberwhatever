// System 9: neonlarynx.bar — karaoke bar. Side system. Wraith hangs out in Booth 4. Owner: content agent.
// Tactical identity: comedy system, the ICE sings. Mirrors and Scramblers punish one-note players;
// the Encore (a Hydra) guards the core. The autotune rack Stuns the next fight.
import type { SystemDef } from '../../engine/types.ts';
import { I, lore, pay, key, say } from './lib.ts';

const L = 4;

export const karaoke: SystemDef = {
  id: 'karaoke',
  name: 'Neon Larynx',
  address: 'neonlarynx.bar',
  tier: 3,
  security: 2,
  owner: 'Neon Larynx (Booths by the Hour)',
  description: 'Karaoke bar with private booths. Booth 4 is permanently reserved by xX_Wraith_Xx. Comedy system: the ICE sings. Talk to Wraith in Booth 4.',
  mood: 'system',
  motd: 'NEON LARYNX · Booths by the Hour\nTonight: Power Ballad Night\nBooth 4: reserved (permanently) (xX_Wraith_Xx)\nPlease do not hack the applause meter. (Again.)',
  nodes: [
    {
      id: 'gateway', type: 'gateway', name: 'Song Request Queue', x: 0.06, y: 0.5, links: ['lyrics', 'bar'],
      description: '300 requests. All the same song.',
      ice: [I('ice.karaoke.bouncer', L)],
    },
    {
      id: 'lyrics', type: 'datastore', name: 'Lyrics Server', x: 0.28, y: 0.25, links: ['applause', 'autotune'],
      description: 'Every lyric, slightly wrong.',
      ice: [I('ice.karaoke.off_key', L)],
      files: [
        lore('file.karaoke.banned_songs', 'banned_songs.txt', "'Auto-Renew My Heart' (KH legal). 'Seamless (Extended Mix)' (lasts forever). 'My Heart Has A Firewall' (one customer, 211 times)."),
        lore('file.karaoke.kh_jingle_lyrics', 'kh_jingle_lyrics.txt', '♪ Seamless, seamless, nothing to see / Seamless, seamless, subscribe to me ♪'),
        lore('file.karaoke.applause_meter', 'applause_meter.cfg', "max = 11; min = 'polite'; current = 'Tuesday'"),
      ],
    },
    {
      id: 'applause', type: 'io', name: 'Applause Meter', x: 0.48, y: 0.08, links: [],
      description: 'Goes to 11. Someone set it to "Tuesday".',
      use: { label: 'max the applause meter', once: true, ops: [say('The room cheers at nothing. You feel loved. Not really. Close enough.'), { op: 'humanity', amount: 1 }, { op: 'flag', flag: 'karaoke_applause_rigged' }] },
    },
    {
      id: 'autotune', type: 'io', name: 'Autotune Rack', x: 0.5, y: 0.38, links: ['core'],
      description: 'Makes anyone sound like an advert.',
      ice: [I('ice.karaoke.mic_feedback', L)],
      use: { label: 'autotune the whole bar', ops: [say('Everyone now sounds like a KH ad. The ICE cannot hear itself think.'), { op: 'nextFight', ops: [{ op: 'iceStatus', status: 'stunned', value: 1, to: 'allEnemies' }] }] },
    },
    {
      id: 'bar', type: 'datastore', name: 'Bar Tab', x: 0.28, y: 0.75, links: ['disco', 'booth4'],
      description: 'Who owes what. Who owes everything.',
      ice: [I('ice.karaoke.backing_vocals', L), I('ice.karaoke.bouncer', L)],
      files: [
        pay('file.karaoke.bar_tab', 'bar_tab.csv', 90, { note: 'xX_Wraith_Xx: 0 drinks. Booth paid until: --:--.' }),
        pay('file.karaoke.vip_bookings', 'vip_booth_bookings.csv', 220, { tagged: true, note: 'Booth 2: a KH regional manager, every Thursday, singing to nobody.' }),
        lore('file.karaoke.top_scores', 'top_scores.dat', '1. xX_Wraith_Xx — 99,999 (date: —). 2. A Kurage Kare robot who sang the Terms of Service. 3. You — (has not sung).'),
      ],
    },
    {
      id: 'disco', type: 'io', name: 'Disco Ball Controller', x: 0.52, y: 0.92, links: ['core'],
      description: 'One ball. Unlimited rpm.',
      ice: [I('ice.karaoke.off_key', L), I('ice.karaoke.mic_feedback', L)],
      use: { label: 'spin it at 3,000 rpm', once: true, ops: [say('The disco ball leaves through the window. Nobody stops it. Nobody could.'), { op: 'heat', amount: 2 }] },
    },
    {
      id: 'booth4', type: 'process', name: 'Booth 4', x: 0.5, y: 0.66, links: [],
      description: "Someone's in there. Someone's always in there.",
      talk: 'dlg.wraith.karaoke',
      files: [key('file.karaoke.booth4_log', 'booth4_log.txt', 'pw.aegis_blacklab', "Songs played: 'My Heart Has A Firewall' ×211. Note left on screen: 'if ur reading this n00b, aegis lab pw is ninetyfour. dont tell anyone. dont tell me.'")],
    },
    {
      id: 'core', type: 'core', name: 'Larynx Core', x: 0.88, y: 0.55, links: [],
      description: 'Hums when idle.',
      ice: [I('ice.karaoke.encore', 4), I('ice.karaoke.off_key', L)],
    },
  ],
};
