// §5.1 procedural hosts: small IoT junk found by netscan, and Endless-mode systems.
// Generated SystemDefs are stored in state.world.procSystems so saves stay self-contained.
import { type K, clamp } from './core.ts';
import { pick, randInt, hex, chance } from './rng.ts';
import type { FileDef, Id, NodeDef, NodeType, SystemDef } from './types.ts';

function iceFor(k: K, tier: number): Id {
  const T = k.content.procgen.iceByTier;
  const list = T[clamp(tier - 1, 0, T.length - 1)];
  return pick(k.state, list);
}

function paydata(k: K, sysId: Id, n: number, tier: number): FileDef {
  const p = pick(k.state, k.content.procgen.paydata);
  const value = Math.round(p.value * (1 + 0.6 * (tier - 1)) * (0.8 + 0.4 * (randInt(k.state, 0, 100) / 100)));
  return {
    id: `${sysId}-f${n}`,
    name: p.name,
    kind: 'paydata',
    value,
    ...(chance(k.state, 0.15) ? { tagged: true } : {}),
    ...(tier >= 2 && chance(k.state, 0.2) ? { encrypted: 1 } : {}),
  };
}

function node(id: Id, type: NodeType, name: string, x: number, y: number, links: Id[], extra: Partial<NodeDef> = {}): NodeDef {
  return { id, type, name, x, y, links, ...extra };
}

/** A tiny IoT host (3-5 nodes). Power-1 botnet fodder. */
export function generateIotSystem(k: K, tier = 1): SystemDef {
  const s = k.state;
  const P = k.content.procgen;
  const n = ++s.world.procCounter;
  const id = `iot-${n}`;
  const device = pick(s, P.devices);
  const brand = pick(s, P.brands);
  const slug = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const suffix = P.suffixes?.length ? pick(s, P.suffixes) : null;
  const address = `${slug(brand)}-${slug(device)}${suffix ? `-${slug(suffix)}` : ''}-${hex(s, 4)}.${pick(s, P.tlds)}`;
  const owner = P.owners?.length && chance(s, 0.3) ? pick(s, P.owners) : null;
  const name = owner ? `${owner} ${device}` : `${brand} ${device}${suffix ? ` ${suffix}` : ''}`;
  const descs = P.descriptions?.[device]?.length ? P.descriptions[device] : P.genericDescriptions;
  const description = descs?.length ? pick(s, descs) : `A ${device} with a web interface nobody asked for.`;
  const nodes: NodeDef[] = [];
  nodes.push(node('gw', 'gateway', `${device} login`, 0.15, 0.5, [], { ice: [{ ice: iceFor(k, tier) }] }));
  let prev = 'gw';
  let x = 0.4;
  if (chance(s, 0.7)) {
    nodes.push(node('data', 'datastore', 'telemetry', x, 0.3, [prev], { files: [paydata(k, id, 1, tier)] }));
    x += 0.2;
  }
  if (chance(s, 0.4)) {
    nodes.push(node('io', 'io', device, x, 0.7, [prev], {
      use: { label: `poke the ${device}`, once: true, ops: [{ op: 'log', text: `The ${device} makes a sad noise.` }] },
    }));
  }
  nodes.push(node('core', 'core', `${device} firmware`, 0.85, 0.5, [prev, ...nodes.filter((q) => q.type === 'datastore').map((q) => q.id)], {
    ice: chance(s, 0.5) ? [{ ice: iceFor(k, tier) }] : [],
  }));
  const sys: SystemDef = {
    id,
    name,
    address,
    tier,
    security: 1,
    owner: owner ?? brand,
    description,
    nodes,
    capturable: false,
    hostPower: 1,
    procedural: true,
    noReclaim: true,
    tags: ['iot'],
  };
  s.world.procSystems[id] = sys;
  return sys;
}

/** A full procedural system for Endless mode (6-10 nodes). */
export function generateEndlessSystem(k: K, tier: number): SystemDef {
  const s = k.state;
  const P = k.content.procgen;
  const n = ++s.world.procCounter;
  const id = `endless-${n}`;
  const brand = pick(s, P.brands);
  const address = `${brand}-${hex(s, 6)}.${pick(s, P.tlds)}`.toLowerCase();
  const t = clamp(tier, 1, 99);
  const lvl = (): { ice: Id; level?: number }[] => {
    const count = randInt(s, 1, Math.min(3, 1 + Math.floor(t / 2)));
    return Array.from({ length: count }, () => {
      const ice = iceFor(k, t);
      const base = k.content.ice[ice]?.level ?? 1;
      return { ice, level: base + Math.max(0, t - 5) };
    });
  };
  const nodes: NodeDef[] = [
    node('gw', 'gateway', 'gateway', 0.08, 0.5, [], { ice: lvl() }),
    node('rt', 'router', 'router', 0.3, 0.5, ['gw'], { ice: lvl() }),
    node('sec', 'security', 'security', 0.5, 0.2, ['rt'], { ice: lvl() }),
  ];
  const stores = randInt(s, 1, 3);
  for (let i = 0; i < stores; i++) {
    nodes.push(node(`ds${i}`, 'datastore', `datastore ${i + 1}`, 0.5 + 0.12 * i, 0.55 + 0.15 * i, ['rt'], {
      ice: lvl(), files: [paydata(k, id, i * 2 + 1, t), paydata(k, id, i * 2 + 2, t)],
    }));
  }
  if (chance(s, 0.5)) {
    nodes.push(node('hp', 'honeypot', 'datastore ?', 0.7, 0.85, ['ds0'], { files: [paydata(k, id, 99, 1)] }));
  }
  nodes.push(node('core', 'core', 'core', 0.92, 0.5, ['sec', `ds${stores - 1}`], { ice: lvl() }));
  const sys: SystemDef = {
    id,
    name: `${brand} node ${n}`,
    address,
    tier: Math.min(5, t),
    security: clamp(Math.ceil(t / 2), 1, 5),
    owner: brand,
    description: 'Somewhere, a dashboard turns red.',
    nodes,
    capturable: false,
    hostPower: Math.min(5, t),
    procedural: true,
    tags: ['endless'],
  };
  s.world.procSystems[id] = sys;
  return sys;
}
