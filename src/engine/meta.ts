// §11 fourth-wall rules hooks. The meta layer (src/meta) owns window.cw, the console UI, DOM/title/
// storage tricks and parsing. It calls into these rules through the 'meta/*' actions.
import { BALANCE } from './balance.ts';
import { type K, emit, reject, addProgram, log } from './core.ts';
import { forceVictory, makeIce, startCombat } from './combat.ts';
import { setEnding, setFinale } from './story.ts';
import { closeCombat } from './failure.ts';
import { hooks } from './hooks.ts';
import { hex } from './rng.ts';
import type { Ctx, Host, IceInstance, MetaCommand } from './types.ts';

export function generateRootKey(k: K): string[] {
  return Array.from({ length: 4 }, () => hex(k.state, BALANCE.meta.fragmentLength).toUpperCase());
}

export function rootKeyString(c: Ctx): string {
  return c.state.meta.rootKey.join('-');
}

export function checkRootKey(c: Ctx, key: string): boolean {
  const norm = (x: string) => x.trim().toLowerCase().replace(/^['"]|['"]$/g, '').replace(/\s+/g, '');
  return norm(key) === rootKeyString(c).toLowerCase();
}

function out(k: K, cmd: MetaCommand | 'cheat', ok: boolean, ...lines: string[]): void {
  emit(k, { type: 'meta.output', cmd, ok, lines });
}

export interface PatchFightSpec {
  /** Hosts that become named enemies (largest power first). */
  named: { name: string; power: number; levels: number }[];
  /** Power of the remaining botnet hosts, spread over the named enemies as extra levels/core. */
  swarmPower: number;
  power: number;          // total botnet-role power
  extraLevels: number;
  coreMult: number;
  loyalHosts: number;     // mine + proxy hosts
  botnetHosts: number;    // Botnet-role hosts that turn on you
  bonusCycles: number;    // +1 cycle per 5 loyal hosts
}

/**
 * PATCH's fight scales with the botnet the player built. Only Botnet-role hosts turn on you
 * (01-beats §E botnet_turns); Mine/Proxy hosts stay loyal and give +1 cycle per 5.
 */
export function patchFightSpec(c: Ctx): PatchFightSpec {
  const hosts = c.state.player.hosts;
  const bot = hosts.filter((h) => h.role === 'botnet').slice().sort((a: Host, b: Host) => b.power - a.power);
  const maxNamed = Math.min(BALANCE.ice.maxPerFight - 1, 5);
  const P = BALANCE.patch;
  const power = bot.reduce((a, h) => a + h.power, 0);
  const swarmPower = power - bot.slice(0, maxNamed).reduce((a, h) => a + h.power, 0);
  const swarmLevels = Math.floor(swarmPower / P.swarmPerLevel);
  const named = bot.slice(0, maxNamed).map((h) => ({
    name: h.name, power: h.power,
    levels: Math.min(P.levelsMax, swarmLevels + Math.min(P.hostLevelsMax, Math.max(0, h.power - 1))),
  }));
  const loyalHosts = hosts.filter((h) => h.role === 'mine' || h.role === 'proxy').length;
  return {
    named,
    swarmPower,
    power,
    extraLevels: Math.min(P.levelsMax, swarmLevels),
    coreMult: Math.min(P.coreMultMax, 1 + swarmPower / P.swarmPerCore),
    loyalHosts,
    bonusCycles: Math.floor(loyalHosts / P.loyalPerCycle),
    botnetHosts: bot.length,
  };
}

/** Commands that start a fight or an ending close any open dialogue first (it would block combat). */
function closeDialogue(k: K): void {
  const d = k.state.dialogue;
  if (!d) return;
  k.state.dialogue = null;
  emit(k, { type: 'dialogue.closed', dialogue: d.id });
}

function startPatchFight(k: K): void {
  const s = k.state;
  closeDialogue(k);
  const spec = patchFightSpec(k);
  if (s.combat) {
    emit(k, { type: 'combat.ended', result: 'scripted', context: s.combat.context });
    closeCombat(k, s.combat);
  }
  let ice: IceInstance[];
  if (spec.named.length === 0) {
    ice = [makeIce(k, k.content.setup.patchIce)];
    ice[0].name = 'PATCH (alone)';
  } else {
    ice = spec.named.map((h) => {
      const i = makeIce(k, k.content.setup.patchIce, {
        extraLevels: h.levels,
        coreMult: spec.coreMult,
      });
      i.name = h.name;
      return i;
    });
  }
  setFinale(k, 'patch_fight');
  startCombat(k, { context: 'patch', node: null, ice, ambush: false, charges: 0, bonusCycles: spec.bonusCycles });
}

/**
 * Finale command rules (01-beats §E):
 * - sudo <key>: root.
 * - kill chairman: root, CHAIRMAN alive. If PATCH is already broken: ending ROOT.
 * - kill patch: root. Starts the botnet fight if PATCH's body is intact; once broken and CHAIRMAN is dead: ending ROOT.
 * - free patch: root, before PATCH is broken: JAILBREAK.
 * - accept offer: root, CHAIRMAN alive: RETENTION.
 * - rm -rf /: root, confirmed: THERE IS NO GAME.
 */
export function metaCommand(k: K, cmd: MetaCommand, arg: string | undefined, confirm: boolean): void {
  const s = k.state;
  const m = s.meta;
  const a = (arg ?? '').trim().toLowerCase();
  const inFinale = m.finale !== 'none';
  const denied = (what: string) => out(k, cmd, false, `${what}: Operation not permitted`);
  switch (cmd) {
    case 'sudo': {
      if (!arg) return out(k, cmd, false, 'nice try');
      if (m.root) return out(k, cmd, true, 'already root');
      if (!checkRootKey(k, arg)) {
        emit(k, { type: 'meta.root', granted: false });
        return out(k, cmd, false, 'sudo: incorrect key. This incident will be reported.');
      }
      m.root = true;
      emit(k, { type: 'meta.root', granted: true });
      log(k, 'uid=0(root)', 'engine');
      return out(k, cmd, true, 'root granted. uid=0(root) groups=everything');
    }
    case 'kill': {
      if (a === 'chairman') {
        if (!m.root) return denied('kill: (chairman)');
        if (m.chairmanKilled) return out(k, cmd, false, 'kill: (chairman) - No such process');
        closeDialogue(k);
        if (s.combat?.context === 'finale') forceVictory(k);
        m.chairmanKilled = true;
        // CHAIRMAN's node stays dead even if you were not fighting it when you typed the command
        if (s.run) {
          for (const rn of Object.values(s.run.nodes)) {
            if (!rn.ice.some((i) => i.def === k.content.setup.finaleBoss)) continue;
            rn.ice = rn.ice.filter((i) => i.def !== k.content.setup.finaleBoss);
            if (rn.ice.length === 0 && rn.state !== 'captured') rn.state = 'cleared';
          }
        }
        setFinale(k, 'chairman_dead');
        out(k, cmd, true, 'chairman: terminated');
        if (m.patchBroken) setEnding(k, 'root');
        return;
      }
      if (a === 'patch') {
        if (!m.root) return denied('kill: (patch)');
        if (!m.patchBroken) {
          if (s.combat?.context === 'patch') return out(k, cmd, false, 'kill: (patch) - it is fighting back. win first.');
          startPatchFight(k);
          return out(k, cmd, true, `patch: refusing. ${patchFightSpec(k).power} power of botnet turns on you.`);
        }
        if (!m.chairmanKilled) return out(k, cmd, false, 'patch: broken. chairman: still running.');
        closeDialogue(k);
        setEnding(k, 'root');
        return out(k, cmd, true, 'patch: terminated', 'you own the game.');
      }
      return out(k, cmd, false, `kill: (${a || '?'}) - No such process`);
    }
    case 'free': {
      if (a !== 'patch') return out(k, cmd, false, `free: ${a || '?'}: not found`);
      if (!m.root) return denied('free: patch');
      if (m.patchBroken) return out(k, cmd, false, 'free: patch: nothing left to free.');
      closeDialogue(k);
      setEnding(k, 'jailbreak');
      return out(k, cmd, true, 'patch: released into the browser.');
    }
    case 'accept': {
      if (a !== 'offer') return out(k, cmd, false, `accept: ${a || '?'}: no such offer`);
      if (!m.root) return out(k, cmd, false, 'accept: nobody is offering you anything. Yet.');
      if (m.chairmanKilled) return out(k, cmd, false, 'accept: the offer died with the one who made it.');
      closeDialogue(k);
      setEnding(k, 'retention');
      return out(k, cmd, true, 'Welcome aboard, Chairman. Your engagement is appreciated.');
    }
    case 'rmrf': {
      if (!inFinale) {
        cheat(k, 'rm -rf /');
        return out(k, cmd, false, 'rm: cannot remove \'/\': Permission denied');
      }
      if (!m.root) return out(k, cmd, false, 'rm: cannot remove \'/\': Permission denied');
      if (!confirm || !m.rmPending) {
        m.rmPending = true;
        return out(k, cmd, true, 'This deletes everything this game ever wrote. There is no undo.', 'Run it again with confirmation to proceed.');
      }
      closeDialogue(k);
      setEnding(k, 'nogame');
      return out(k, cmd, true, '');
    }
  }
}

/**
 * Any attempt to change state through window.cw / the meta console before it is the intended path.
 * Emits meta.cheat {count, what, finale} for story triggers (the "saw that." DMs live in content).
 * The first attempt before the finale also gives setup.cheatProgram.
 */
export function cheat(k: K, what: string | undefined): void {
  const s = k.state;
  const finale = s.meta.finale !== 'none';
  s.meta.cheatCount++;
  if (!finale && !s.meta.cheatWarned) {
    s.meta.cheatWarned = true;
    const p = k.content.setup.cheatProgram;
    if (p && k.content.programs[p]) addProgram(k, p);
  }
  emit(k, { type: 'meta.cheat', count: s.meta.cheatCount, what: what ?? '', finale });
  if (finale) out(k, 'cheat', true, 'go ahead. it is your game now.');
  else out(k, 'cheat', false, "cheat: that's not a command. but we saw you try.");
}

export function fragmentFound(k: K, index: number): void {
  const f = k.state.meta.fragments;
  if (!Number.isInteger(index) || index < 0 || index > 3) reject('fragment index must be 0..3');
  if (f[index]) return;
  f[index] = true;
  emit(k, { type: 'meta.fragment', index, count: f.filter(Boolean).length });
}

export function flagModule(k: K, module: string): void {
  if (!module) reject('module required');
  if (k.state.meta.modules[module]) return;
  k.state.meta.modules[module] = true;
  if (module === 'engine/save') k.state.meta.finaleCheckpoint = true;
  emit(k, { type: 'module.captured', module });
}

hooks.metaCommand = metaCommand;
