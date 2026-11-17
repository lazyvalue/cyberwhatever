// Content validator: referential integrity checks so content authors get errors at test time,
// not mid-game. tests/content.test.ts runs it against the real registry.
import type { CombatOp, Condition, Content, IceCond, StoryOp } from './types.ts';

const PARTS = ['cpu', 'ram', 'firewall', 'chassis', 'mask', 'uplink', 'storage', 'neural'];

export function validateContent(c: Content): string[] {
  const errs: string[] = [];
  const err = (m: string) => errs.push(m);
  const has = (rec: Record<string, unknown>, id: string, what: string, where: string) => {
    if (!rec[id]) err(`${where}: unknown ${what} '${id}'`);
  };

  // ids match keys
  for (const [key, rec] of Object.entries({
    programs: c.programs, ice: c.ice, implants: c.implants, perks: c.perks, items: c.items, npcs: c.npcs,
    systems: c.systems, vendors: c.vendors, jobs: c.jobs, dialogues: c.dialogues,
  })) {
    for (const [id, v] of Object.entries(rec as Record<string, { id: string }>)) {
      if (v.id !== id) err(`${key}: key '${id}' != id '${v.id}'`);
    }
  }

  const checkCond = (cond: Condition | undefined, where: string): void => {
    if (!cond) return;
    switch (cond.c) {
      case 'all': case 'any': cond.of.forEach((x) => checkCond(x, where)); break;
      case 'not': checkCond(cond.of, where); break;
      case 'owns': case 'knows': has(c.systems, cond.system, 'system', where); break;
      case 'item': has(c.items, cond.item, 'item', where); break;
      case 'program': has(c.programs, cond.program, 'program', where); break;
      case 'implant': has(c.implants, cond.implant, 'implant', where); break;
      case 'perk': has(c.perks, cond.perk, 'perk', where); break;
      case 'job': has(c.jobs, cond.job, 'job', where); break;
      case 'inSystem': if (cond.system) has(c.systems, cond.system, 'system', where); break;
      case 'trigger': if (!c.triggers.some((t) => t.id === cond.trigger)) err(`${where}: unknown trigger '${cond.trigger}'`); break;
      default: break;
    }
  };

  const checkStory = (ops: StoryOp[] | undefined, where: string): void => {
    for (const op of ops ?? []) {
      switch (op.op) {
        case 'message': has(c.npcs, op.from, 'npc', where); break;
        case 'address': case 'note': case 'own': case 'unown': has(c.systems, op.system, 'system', where); break;
        case 'job': has(c.jobs, op.job, 'job', where); break;
        case 'dialogue': has(c.dialogues, op.dialogue, 'dialogue', where); break;
        case 'item': has(c.items, op.item, 'item', where); break;
        case 'program': has(c.programs, op.program, 'program', where); break;
        case 'if': checkCond(op.cond, where); checkStory(op.then, where); checkStory(op.else, where); break;
        case 'random': checkStory(op.then, where); checkStory(op.else, where); break;
        case 'oneOf': op.options.forEach((o) => checkStory(o, where)); break;
        case 'objective': checkCond(op.doneWhen, where); break;
        case 'combat': case 'nextFight': checkOps(op.ops, where); break;
        case 'script': if (!c.scripts?.[op.id]) err(`${where}: unknown script '${op.id}'`); break;
        default: break;
      }
    }
  };

  const checkIceCond = (cond: IceCond | undefined, where: string): void => {
    if (!cond) return;
    if (cond.c === 'not') checkIceCond(cond.of, where);
    if (cond.c === 'all' || cond.c === 'any') cond.of.forEach((x) => checkIceCond(x, where));
  };

  const checkOps = (ops: CombatOp[] | undefined, where: string): void => {
    for (const op of ops ?? []) {
      switch (op.op) {
        case 'summon': has(c.ice, op.ice, 'ICE', where); break;
        case 'chance': checkOps(op.ops, where); checkOps(op.else, where); break;
        case 'ifIce': checkIceCond(op.cond, where); checkOps(op.ops, where); checkOps(op.else, where); break;
        case 'demand': checkOps(op.penalty, where); break;
        case 'story': checkStory(op.ops, where); break;
        case 'script': if (!c.scripts?.[op.id]) err(`${where}: unknown script '${op.id}'`); break;
        case 'damage': if (op.amount < 0) err(`${where}: negative damage`); break;
        default: break;
      }
    }
  };

  for (const p of Object.values(c.programs)) {
    const w = `program '${p.id}'`;
    checkOps(p.ops, w);
    if (p.daemon) checkOps(p.daemon.ops, w);
    if (p.category === 'daemon' && !p.daemon) err(`${w}: daemon category needs a daemon block`);
    for (const part of Object.keys(p.requires ?? {})) if (!PARTS.includes(part)) err(`${w}: bad hardware part '${part}'`);
  }

  for (const i of Object.values(c.ice)) {
    const w = `ICE '${i.id}'`;
    if (i.intents.length === 0 && !i.script) err(`${w}: no intents`);
    const ids = new Set<string>();
    for (const it of i.intents) {
      if (ids.has(it.id)) err(`${w}: duplicate intent '${it.id}'`);
      ids.add(it.id);
      checkOps(it.ops, `${w} intent '${it.id}'`);
      checkIceCond(it.when, w);
    }
    for (const t of i.triggers ?? []) checkOps(t.ops, `${w} trigger`);
    for (const ph of i.phases ?? []) {
      checkOps(ph.ops, `${w} phase`);
      for (const it of ph.intents ?? []) checkOps(it.ops, `${w} phase intent '${it.id}'`);
    }
    if (i.script && !c.iceScripts?.[i.script]) err(`${w}: unknown ice script '${i.script}'`);
  }

  const fileIds = new Set<string>();
  for (const s of Object.values(c.systems)) {
    const w = `system '${s.id}'`;
    const nodeIds = new Set(s.nodes.map((n) => n.id));
    if (nodeIds.size !== s.nodes.length) err(`${w}: duplicate node ids`);
    if (!s.nodes.some((n) => n.type === 'gateway')) err(`${w}: no gateway`);
    if (s.capturable !== false && !s.nodes.some((n) => n.type === 'core')) err(`${w}: capturable but no core`);
    if (s.lock) checkCond(s.lock.cond, `${w} lock`);
    for (const it of s.gate?.items ?? []) has(c.items, it.item, 'item', `${w} gate`);
    for (const n of s.nodes) {
      const nw = `${w} node '${n.id}'`;
      for (const l of n.links) if (!nodeIds.has(l)) err(`${nw}: link to unknown node '${l}'`);
      for (const sp of n.ice ?? []) has(c.ice, sp.ice, 'ICE', nw);
      if ((n.ice?.length ?? 0) > 3) err(`${nw}: more than 3 ICE`);
      for (const f of n.files ?? []) {
        if (fileIds.has(f.id)) err(`${nw}: duplicate file id '${f.id}'`);
        fileIds.add(f.id);
        if (f.kind === 'program' && f.program) has(c.programs, f.program, 'program', nw);
        if (f.kind === 'address' && f.system) has(c.systems, f.system, 'system', nw);
        if (f.kind === 'item' && f.item) has(c.items, f.item, 'item', nw);
        checkStory(f.onTake, nw);
      }
      if (n.lock) has(c.items, n.lock.item, 'item', nw);
      if (n.backdoor) has(c.items, n.backdoor, 'item', nw);
      if (n.talk) has(c.dialogues, n.talk, 'dialogue', nw);
      for (const id of n.netscan ?? []) has(c.systems, id, 'system', nw);
      if (n.use) {
        checkStory(n.use.ops, nw);
        checkCond(n.use.cond, nw);
      }
      checkStory(n.capture, nw);
    }
  }

  for (const part of PARTS) {
    if (!c.hardware.some((h) => h.part === part && h.tier === 0)) err(`hardware: no tier 0 for '${part}'`);
  }

  for (const v of Object.values(c.vendors)) {
    for (const st of v.stock) {
      const w = `vendor '${v.id}' stock '${st.id}'`;
      if (st.kind === 'program') has(c.programs, st.ref ?? '', 'program', w);
      if (st.kind === 'implant') has(c.implants, st.ref ?? '', 'implant', w);
      if (st.kind === 'item') has(c.items, st.ref ?? '', 'item', w);
      if (st.kind === 'address') has(c.systems, st.ref ?? '', 'system', w);
      if (st.kind === 'hardware' && !c.hardware.some((h) => h.id === st.ref)) err(`${w}: unknown hardware '${st.ref}'`);
      checkCond(st.cond, w);
      checkStory(st.ops, w);
    }
    if (v.npc) has(c.npcs, v.npc, 'npc', `vendor '${v.id}'`);
  }

  for (const j of Object.values(c.jobs)) {
    const w = `job '${j.id}'`;
    has(c.npcs, j.giver, 'npc', w);
    checkCond(j.cond, w);
    checkStory(j.reward.ops, w);
    if (j.target) has(c.systems, j.target, 'system', w);
    for (const o of j.objectives) {
      if (o.kind === 'deliver' && !fileIds.has(o.file)) err(`${w}: deliver unknown file '${o.file}'`);
      if (o.kind === 'own' || o.kind === 'capture' || o.kind === 'use') has(c.systems, o.system, 'system', w);
      if ((o.kind === 'capture' || o.kind === 'use') && c.systems[o.system] && !c.systems[o.system].nodes.some((n) => n.id === o.node)) {
        err(`${w}: unknown node '${o.node}' in '${o.system}'`);
      }
    }
  }

  const trigIds = new Set<string>();
  for (const t of c.triggers) {
    if (trigIds.has(t.id)) err(`duplicate trigger id '${t.id}'`);
    trigIds.add(t.id);
    checkCond(t.cond, `trigger '${t.id}'`);
    checkStory(t.ops, `trigger '${t.id}'`);
    if (!t.on && !t.cond) err(`trigger '${t.id}': needs 'on' or 'cond'`);
  }

  for (const d of Object.values(c.dialogues)) {
    const w = `dialogue '${d.id}'`;
    has(c.npcs, d.speaker, 'npc', w);
    if (!d.nodes[d.start]) err(`${w}: missing start node '${d.start}'`);
    for (const [nid, n] of Object.entries(d.nodes)) {
      if (n.speaker) has(c.npcs, n.speaker, 'npc', `${w} node '${nid}'`);
      if (n.next && !d.nodes[n.next]) err(`${w} node '${nid}': next '${n.next}' missing`);
      for (const v of n.variants ?? []) checkCond(v.cond, `${w} node '${nid}' variant`);
      checkStory(n.ops, `${w} node '${nid}'`);
      for (const ch of n.choices ?? []) {
        if (ch.to && !d.nodes[ch.to]) err(`${w} node '${nid}': choice to '${ch.to}' missing`);
        checkCond(ch.cond, `${w} node '${nid}'`);
        checkStory(ch.ops, `${w} node '${nid}'`);
      }
    }
  }

  const S = c.setup;
  for (const id of [...S.startPrograms, ...S.startLoadout]) has(c.programs, id, 'program', 'setup');
  for (const id of S.startLoadout) if (!S.startPrograms.includes(id)) err(`setup: loadout '${id}' not in startPrograms`);
  for (const id of S.knownSystems) has(c.systems, id, 'system', 'setup.knownSystems');
  for (const id of S.hunterIce) has(c.ice, id, 'ICE', 'setup.hunterIce');
  for (const squad of S.raidIce) for (const id of squad) has(c.ice, id, 'ICE', 'setup.raidIce');
  has(c.systems, S.localhost, 'system', 'setup.localhost');
  has(c.ice, S.finaleBoss, 'ICE', 'setup.finaleBoss');
  has(c.ice, S.patchIce, 'ICE', 'setup.patchIce');
  if (S.cheatProgram) has(c.programs, S.cheatProgram, 'program', 'setup.cheatProgram');
  for (const id of S.startItems ?? []) has(c.items, id, 'item', 'setup.startItems');
  c.procgen.iceByTier.forEach((list, i) => {
    if (list.length === 0) err(`procgen.iceByTier[${i}] empty`);
    list.forEach((id) => has(c.ice, id, 'ICE', `procgen.iceByTier[${i}]`));
  });
  return errs;
}
