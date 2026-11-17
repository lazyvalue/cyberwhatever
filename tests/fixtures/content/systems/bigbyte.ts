// System 4: BigByte ISP. Owner: content agent.
import type { SystemDef } from '../../../../src/engine/types.ts';

export const bigbyte: SystemDef = {
  id: 'bigbyte',
  name: 'BigByte Regional ISP',
  address: 'bigbyte-isp.net',
  tier: 2,
  security: 2,
  owner: 'BigByte Communications (a Kurage-Halcyon company)',
  description: 'Your ISP. Throttles your connection and then sells you the fix.',
  mood: 'system',
  nodes: [
    { id: 'gw', type: 'gateway', name: 'customer portal', x: 0.06, y: 0.5, links: ['rt1'], ice: [{ ice: 'sentry' }, { ice: 'cipher' }] },
    { id: 'rt1', type: 'router', name: 'edge router', x: 0.25, y: 0.35, links: ['ds', 'rt2'], ice: [{ ice: 'bloodhound' }], netscanIot: 2 },
    { id: 'rt2', type: 'router', name: 'core router', x: 0.42, y: 0.65, links: ['sec', 'proc'], ice: [{ ice: 'tarpit' }], netscanIot: 1 },
    {
      id: 'ds', type: 'datastore', name: 'subscriber db', x: 0.45, y: 0.15, links: ['vault'], ice: [{ ice: 'cipher' }],
      files: [
        { id: 'bb-subs', name: 'subscriber list', kind: 'paydata', value: 180, tagged: true },
        { id: 'bb-lullaby', name: 'lullaby.wav', kind: 'program', program: 'lullaby' },
      ],
    },
    {
      id: 'vault', type: 'vault', name: 'NOC vault', x: 0.68, y: 0.12, links: ['core'], lock: { item: 'noc_badge', label: 'NOC badge' }, ice: [{ ice: 'siren' }],
      files: [{ id: 'bb-policy', name: 'throttling policy (internal)', kind: 'paydata', value: 350 }],
    },
    { id: 'sec', type: 'security', name: 'abuse desk', x: 0.62, y: 0.82, links: ['core'], ice: [{ ice: 'siren' }, { ice: 'sentry' }] },
    { id: 'proc', type: 'process', name: 'sysadmin.d', x: 0.62, y: 0.5, links: [], talk: 'bofh' },
    { id: 'core', type: 'core', name: 'billing core', x: 0.9, y: 0.5, links: [], ice: [{ ice: 'killer' }, { ice: 'patcher' }] },
  ],
};
