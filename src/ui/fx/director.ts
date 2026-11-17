// Event playback: every GameEvent batch from the engine is queued and played in order with timing.
// The screens always show the live state at once (input is never blocked); the director layers
// sound, numbers, flashes, banners and holds on top. Click/Space/Esc while it plays = fast-forward.
import { select, type Engine, type GameEvent, type IceInstance } from '../../engine/index.ts';
import { audio, type SfxId, type Mood } from '../../audio/index.ts';
import { ui, toast, nextId, takeSnapshot, logLine, type Failure } from '../game.ts';
import { floatOn, banner, shake, flash, chroma, pulseSel, iceFx, mapFx } from './fxStore.ts';
import { settings, reducedMotion } from '../settings.ts';
import { metaUiState } from '../metaBridge.ts';
import { hud, HEAT_BANDS, FAILURE, act as actOf, tierOf, fill, fillState, npcName, randomTip } from '../copy.ts';

type Item = { ev: GameEvent; batch: GameEvent[] };

const queue: Item[] = [];
let running = false;
let fast = false;
let eng: Engine;

const MOODS: Mood[] = ['silence', 'title', 'hub', 'system', 'combat', 'boss', 'finale', 'credits'];

export function startDirector(engine: Engine): () => void {
  eng = engine;
  return engine.subscribe((events) => ingest(events));
}

/** Skip remaining animation in the queue and release any hold. */
export function fastForward(): void {
  if (running) fast = true;
  const h = ui.get().hold;
  if (h && !running) releaseHold();
}

export function isPlaying(): boolean {
  return running || !!ui.get().hold;
}

function ingest(events: GameEvent[]): void {
  if (!events.length) return;
  const snap = takeSnapshot();
  const ended = events.find((e) => e.type === 'combat.ended');
  if (ended && ended.type === 'combat.ended' && snap?.combat) {
    const kind = ended.result === 'victory' || ended.result === 'offer' ? 'victory' : ended.result === 'dumped' || ended.result === 'flatlined' || ended.result === 'traced' ? 'fail' : 'other';
    if (kind !== 'other') {
      ui.set({ hold: { state: snap, kind, ...(kind === 'victory' ? { banner: hud(eng, 'combatWin') } : {}) } });
    }
  }
  for (const ev of events) queue.push({ ev, batch: events });
  // a flood (e.g. many cycle ticks) never makes the player wait
  if (queue.length > 60) fast = true;
  if (!running) void pump();
}

async function pump(): Promise<void> {
  running = true;
  ui.set({ busy: true });
  while (queue.length) {
    const it = queue.shift()!;
    let d = 0;
    try {
      d = play(it.ev, it.batch);
    } catch (e) {
      console.error('[ui] fx failed for', it.ev.type, e);
    }
    if (d > 0 && !fast) {
      const speed = settings.get().animSpeed;
      await sleep(d / speed);
    }
  }
  running = false;
  fast = false;
  ui.set({ busy: false });
  const h = ui.get().hold;
  if (h) {
    if (h.kind === 'victory') setTimeout(releaseHold, reducedMotion() ? 500 : 900);
    else setTimeout(releaseHold, 650);
  }
}

function releaseHold(): void {
  if (!ui.get().hold) return;
  ui.set({ hold: null });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function sfx(id: SfxId, opts?: { volume?: number; pitch?: number; pan?: number }): void {
  audio.play(id, opts);
}

function holdIce(uid: string, patch: (i: IceInstance) => void): void {
  const h = ui.get().hold;
  const ice = h?.state.combat?.ice.find((i) => i.uid === uid);
  if (ice && h) {
    patch(ice);
    ui.set({ hold: { ...h } });
  }
}

function iceSel(uid: string): string {
  return `[data-ice-uid="${uid}"]`;
}

function iceIsBlack(uid: string): boolean {
  const c = eng.state.combat ?? ui.get().hold?.state.combat;
  const i = c?.ice.find((x) => x.uid === uid);
  return !!(i && eng.content.ice[i.def]?.black);
}

function programSfx(programId: string): SfxId {
  const d = eng.content.programs[programId];
  if (!d) return 'ui_click';
  switch (d.category) {
    case 'attack': {
      const dmg = d.ops.find((o) => o.op === 'damage');
      const kind = dmg && dmg.op === 'damage' ? dmg.kind : 'crack';
      return kind === 'spike' ? 'program_spike' : kind === 'worm' ? 'program_worm' : 'program_crack';
    }
    case 'exploit': return 'program_exploit';
    case 'defense': return 'program_defense';
    case 'stealth': return 'program_stealth';
    case 'daemon': return 'program_daemon';
    default: return 'program_exploit';
  }
}

function buildFailure(kind: Failure['kind'], batch: GameEvent[]): Failure {
  const t = tierOf(eng);
  const f = FAILURE[kind];
  const a3 = actOf(eng) >= 3;
  const pool = f.lines;
  let text = a3 && Math.random() < 0.5 ? f.act3 : pool[Math.floor(Math.random() * pool.length)];
  if (t !== 'warm' && kind === 'flatlined') text = '';
  text = fill(text, { flatlines: eng.state.player.flatlinesTotal });
  let foot = '';
  if (kind === 'dumped') {
    const lost = batch.find((e) => e.type === 'paydata.lost');
    const dumped = batch.find((e) => e.type === 'player.dumped');
    const prog = dumped && dumped.type === 'player.dumped' && dumped.program ? eng.content.programs[dumped.program]?.name ?? dumped.program : 'none';
    foot = `Lost: ${lost && lost.type === 'paydata.lost' ? lost.count : 0} paydata · Corrupted: ${prog} · Heat +10`;
  } else if (kind === 'traced') {
    const tr = batch.find((e) => e.type === 'player.traced');
    const hard = batch.find((e) => e.type === 'system.hardened');
    const burned = batch.find((e) => e.type === 'host.burned');
    const sys = hard && hard.type === 'system.hardened' ? eng.content.systems[hard.system]?.address ?? eng.state.world.procSystems[hard.system]?.address ?? hard.system : '';
    foot = [
      `Fine: ${tr && tr.type === 'player.traced' ? tr.fine : 0}¤`,
      'Heat +25',
      sys ? `${sys} hardened` : '',
      burned && burned.type === 'host.burned' ? `Host lost: ${burned.name}` : '',
    ].filter(Boolean).join(' · ');
  } else {
    foot = `flatlines: ${eng.state.player.flatlinesTotal}`;
  }
  return { kind, text, foot };
}

let minedThisRun = 0;

/** Plain-language log line for a status on the player (never the raw status id). */
function playerStatusLine(status: string, n: number): string {
  const turns = (k: number) => `${k} turn${k === 1 ? '' : 's'}`;
  switch (status) {
    case 'decoy': return `Decoy up: it takes the next ${n === 1 ? 'attack' : `${n} attacks`}.`;
    case 'masked': return 'You are masked: trace gain is halved this turn.';
    case 'tarred': return `You are tarred: ${n} cycle${n === 1 ? '' : 's'} fewer next turn.`;
    case 'anchored': return `You are anchored for ${turns(n)}: no disengage, no hang up.`;
    case 'burn': return `You are burning: ${n} neural damage at the start of your turn.`;
    case 'labelsScrambled': return `Your labels are scrambled (${turns(n)}). The buttons still work.`;
    case 'stunned': return 'You are stunned: you lose your next turn.';
    default: return `You are ${status} (${n}).`;
  }
}
const PLAYER_STATUS_SHORT: Record<string, string> = {
  decoy: 'decoy up', masked: 'masked', tarred: 'tarred', anchored: 'anchored', burn: 'burning', labelsScrambled: 'labels scrambled', stunned: 'stunned',
};

/** True when a combat event belongs to a program run already summarised by programSummary(). */
function afterProgram(ev: GameEvent, batch: GameEvent[]): boolean {
  for (let k = batch.indexOf(ev) - 1; k >= 0; k--) {
    const t = batch[k].type;
    if (t === 'combat.program') return true;
    if (t === 'combat.botnet' || t === 'combat.turnStart' || t === 'combat.iceAct' || t === 'combat.daemon') return false;
  }
  return false;
}

function iceName(uid: string): string {
  const c = eng.state.combat ?? ui.get().hold?.state.combat;
  return c?.ice.find((i) => i.uid === uid)?.name ?? 'ICE';
}

/** One line per program run: what it hit and what it did, from the events that follow it in the same batch. */
function programSummary(ev: Extract<GameEvent, { type: 'combat.program' }>, batch: GameEvent[]): string {
  const name = eng.content.programs[ev.program]?.name ?? ev.program;
  const i = batch.indexOf(ev);
  let shell = 0, core = 0, crit = false, heal = 0, refl = 0;
  const tags: string[] = [];
  for (let k = i + 1; k < batch.length; k++) {
    const x = batch[k];
    if (x.type === 'combat.program' || x.type === 'combat.botnet' || x.type === 'combat.turnStart') break;
    if (x.type === 'combat.damage') {
      shell += x.shell; if (x.core > 0) core += x.core; else heal -= x.core; crit ||= x.crit; refl += x.reflected;
    } else if (x.type === 'combat.iceStatus' && x.value > 0) tags.push(`${x.status}${x.value > 1 && x.status !== 'mapped' ? ` ${x.value}` : ''}`);
    else if (x.type === 'combat.playerStatus' && x.value > 0) tags.push(`you: ${PLAYER_STATUS_SHORT[x.status] ?? x.status}`);
    else if (x.type === 'combat.shield' && x.delta > 0) tags.push(`shield +${x.delta}`);
    else if (x.type === 'combat.repair' && x.delta > 0) tags.push(`deck +${x.delta}`);
    else if (x.type === 'combat.shellBroken') tags.push('shell broken');
  }
  const parts = [shell ? `shell −${shell}` : '', core ? `core −${core}` : '', heal ? `heals ${heal}` : '', refl ? `reflected ${refl} to you` : '', crit ? 'crit' : '', ...tags].filter(Boolean);
  const tgt = ev.target ? ` on ${iceName(ev.target)}` : '';
  const sig = ev.mult < 1 ? ` (signature ×${ev.mult.toFixed(1)})` : '';
  return `You run ${name}${tgt}${sig}${parts.length ? `: ${parts.join(', ')}` : ''}.`;
}

function showComms(from: string, text: string): void {
  logLine(`${npcName(eng, from)}: ${text}`, 'story', true);
  sfx('message', { pitch: 0.8, volume: 0.6 });
}

function customData(ev: GameEvent): Record<string, unknown> {
  return ev.type === 'custom' && ev.data && typeof ev.data === 'object' && !Array.isArray(ev.data) ? (ev.data as Record<string, unknown>) : {};
}

/** Play one event. Returns how long to wait before the next one (ms). */
function play(ev: GameEvent, batch: GameEvent[]): number {
  switch (ev.type) {
    case 'game.started':
      audio.setMood('hub');
      audio.setIntensity(0);
      return 0;
    case 'game.loaded':
      chroma();
      sfx('glitch', { volume: 0.5 });
      ui.set({ failure: null, hold: null });
      audio.setMood(eng.state.run ? 'system' : 'hub');
      return 0;
    case 'action.rejected':
      if (ev.action === 'ui/log') return 0;
      sfx('ui_error');
      toast(ev.reason, 'bad', 2600);
      return 0;
    case 'heat.threshold': {
      const b = HEAT_BANDS[ev.level];
      if (ev.rising && b.toast) {
        sfx('alarm', { volume: 0.7 });
        banner(b.label, 'amber', b.toast, 1800);
        pulseSel('[data-ui="topbar-heat"]', 'tb-flash-down');
        return 500;
      }
      return 0;
    }
    case 'credits.changed':
      if (ev.delta > 0) {
        sfx('loot', { volume: 0.6 });
        const covered = batch.some((x) => x.type === 'paydata.sold' || x.type === 'program.sold' || x.type === 'job.status');
        if (!covered) toast(`+${ev.delta}¤ ${ev.reason}`, 'money', 2600);
        pulseSel('[data-ui="topbar-credits"]', 'tb-flash-up');
      } else if (ev.delta < 0) pulseSel('[data-ui="topbar-credits"]', 'tb-flash-down');
      return 0;
    case 'coin.mined':
      minedThisRun += ev.amount;
      return 0;
    case 'heat.changed':
      if (Math.abs(ev.delta) >= 1) logLine(`Heat ${ev.delta > 0 ? '+' : ''}${Math.round(ev.delta)}, now ${Math.round(ev.value)}.`, 'info');
      return 0;
    case 'host.role': {
      const h = eng.state.player.hosts.find((x) => x.uid === ev.uid);
      logLine(`${h?.name ?? 'Host'} now does: ${ev.role}.`, 'info');
      return 0;
    }
    case 'xp.gained':
      logLine(`+${ev.amount} xp (${ev.total} total)`, 'info');
      floatOn('[data-ui="topbar-rep"]', `+${ev.amount} xp`, 'small heal', 10);
      return 0;
    case 'rep.levelUp':
      sfx('level_up');
      banner(hud(eng, 'repUp', { rep: ev.level }), 'pink', `rep ${ev.level}`, 1900);
      return 600;
    case 'humanity.changed':
      if (ev.delta < 0) {
        toast(`Humanity ${ev.delta}. Now ${ev.value}.`, 'hot');
        pulseSel('[data-ui="topbar-humanity"]', 'tb-flash-down');
      }
      return 0;
    case 'item.gained':
      toast(`Got ${eng.content.items[ev.item]?.name ?? ev.item}.`, 'good');
      return 0;
    case 'item.lost':
      toast(`Lost ${eng.content.items[ev.item]?.name ?? ev.item}.`, 'bad');
      return 0;
    case 'program.gained':
      sfx('loot');
      toast(`New program: ${eng.content.programs[ev.program]?.name ?? ev.program}`, 'good');
      return 0;
    case 'program.corrupted':
      sfx('glitch');
      toast(`${eng.content.programs[ev.program]?.name ?? ev.program} is corrupted. Repair it at the market.`, 'bad', 5000);
      return 0;
    case 'program.repaired':
      toast(`${eng.content.programs[ev.program]?.name ?? ev.program} repaired.`, 'good');
      return 0;
    case 'program.sold':
      toast(`Sold ${eng.content.programs[ev.program]?.name ?? ev.program} for ${ev.credits}¤.`, 'money');
      return 0;
    case 'lore.gained':
      toast('New file in Files → lore.', 'info');
      return 0;
    case 'paydata.gained':
      sfx('loot', { pitch: 1.1 });
      toast(hud(eng, 'loot', { file: ev.name }), 'good');
      floatOn('[data-ui="haul"]', `+${ev.value}¤`, 'small heal');
      return 120;
    case 'paydata.sold': {
      const sales = batch.filter((x): x is Extract<GameEvent, { type: 'paydata.sold' }> => x.type === 'paydata.sold');
      if (sales.length > 1) {
        if (sales[0] !== ev) return 0;
        const total = sales.reduce((a, x) => a + x.credits, 0);
        const heat = sales.reduce((a, x) => a + x.heat, 0);
        toast(`Sold ${sales.length} files for ${total}¤.${heat > 0 ? ` Heat +${Math.round(heat)}.` : ''}`, 'money');
        return 60;
      }
      toast(hud(eng, 'sold', { file: 'it', x: ev.credits }) + (ev.heat > 0 ? ` Heat +${Math.round(ev.heat)}.` : ''), 'money');
      return 60;
    }
    case 'paydata.decrypted':
      sfx('program_exploit');
      toast(`Decrypted. Worth ${ev.value}¤ now.`, 'good');
      return 0;
    case 'paydata.cleaned':
      toast('Cleaned. No longer tagged.', 'good');
      return 0;
    case 'paydata.lost':
      if (ev.count > 0) toast(`${ev.count} paydata lost.`, 'bad');
      return 0;
    case 'shop.bought': {
      sfx('buy');
      const item = select.vendorStock(eng, ev.vendor).find((x) => x.id === ev.stock);
      toast(`Bought ${item?.name ?? ev.stock} from ${eng.content.vendors[ev.vendor]?.name ?? ev.vendor} for ${ev.price}¤.`, 'money');
      return 0;
    }
    case 'implant.installed':
      sfx('program_daemon');
      toast(`${eng.content.implants[ev.implant]?.name ?? ev.implant} installed.`, 'hot');
      return 0;
    case 'hardware.changed':
      toast(`Deck upgraded: ${eng.content.hardware.find((h) => h.part === ev.part && h.tier === ev.tier)?.name ?? ev.part}`, 'good');
      return 0;
    case 'host.added':
      toast(`New host: ${ev.name} (power ${ev.power}).`, 'good');
      return 0;
    case 'host.burned':
      sfx('glitch');
      toast(`Host lost: ${ev.name}. Its owner found it. It was nice while it lasted.`, 'bad', 4500);
      return 0;
    case 'address.added': {
      sfx('message', { pitch: 1.4, volume: 0.6 });
      const sys = eng.content.systems[ev.system] ?? eng.state.world.procSystems[ev.system];
      toast(`New address: ${sys?.address ?? ev.system}`, 'info');
      return 0;
    }
    case 'system.owned': {
      sfx('system_owned');
      const sys = eng.content.systems[ev.system] ?? eng.state.world.procSystems[ev.system];
      banner(hud(eng, 'capture', { system: sys?.name ?? ev.system }), 'lime', `Control ${select.controlPct(eng)}%`, 2000);
      flash('white');
      return 700;
    }
    case 'system.lost': {
      sfx('alarm');
      const sys = eng.content.systems[ev.system] ?? eng.state.world.procSystems[ev.system];
      toast(`${sys?.name ?? ev.system} lost (${ev.reason}).`, 'bad', 5000);
      return 0;
    }
    case 'system.hardened':
      return 0;
    case 'run.started': {
      const sys = eng.content.systems[ev.system] ?? eng.state.world.procSystems[ev.system];
      sfx('jack_in');
      const mood = (sys?.mood && (MOODS as string[]).includes(sys.mood) ? sys.mood : 'system') as Mood;
      audio.setMood(mood);
      audio.setIntensity(ev.trace / 100);
      ui.set((s) => ({ wipe: s.wipe + 1, selectedNode: null, greeted: [] }));
      if (sys?.motd) logLine(`Login banner, ${sys.address}:\n${fillState(eng, sys.motd)}`, 'story');
      logLine(`Tip: ${randomTip(eng)}`, 'ui');
      return reducedMotion() ? 0 : 300;
    }
    case 'run.ended':
      if (minedThisRun > 0.0005) logLine(`Your hosts mined ${minedThisRun.toFixed(3)} $HODL during that run.`, 'info');
      minedThisRun = 0;
      sfx('jack_out');
      audio.setMood('hub');
      audio.setIntensity(0);
      return 0;
    case 'node.revealed': {
      const t = performance.now();
      ev.nodes.forEach((n, i) => (mapFx.reveal[n] = t + i * 90));
      return 0;
    }
    case 'node.probed': {
      sfx('probe');
      const nv = select.mapView(eng)?.nodes.find((n) => n.id === ev.node);
      if (nv) logLine(`Probed ${nv.name}: ${nv.ice.length ? nv.ice.map((i) => `${i.name}${i.level ? ` L${i.level}` : ''}${i.shell && i.shell.type !== 'none' ? ` (${i.shell.type} ${i.shell.points}, core ${i.core})` : i.core !== null ? ` (no shell, core ${i.core})` : ''}`).join(', ') : 'no ICE'}.`, 'info');
      mapFx.ping[ev.node] = performance.now();
      if (ev.honeypot) toast('Honeypot. It only looked like loot.', 'hot');
      return 250;
    }
    case 'node.sneak':
      if (ev.success) {
        sfx('sneak_ok');
        toast(`Sneaked past (${Math.round(ev.chance)}%). The ICE sleeps.`, 'good');
      } else {
        sfx('sneak_fail');
        shake();
        banner('Spotted', 'red', `${Math.round(ev.chance)}% was not enough. Ambush.`);
      }
      return 350;
    case 'node.cleared':
      mapFx.capture[ev.node] = performance.now();
      return 0;
    case 'node.unlocked':
    case 'node.backdoored':
      sfx('capture', { pitch: 1.3, volume: 0.6 });
      mapFx.capture[ev.node] = performance.now();
      return 150;
    case 'node.sealed':
      sfx('alarm');
      toast('Vaults sealed. Capture Security to open them.', 'bad');
      return 0;
    case 'node.looted':
      if (ev.honeypot) {
        sfx('alarm');
        flash('red');
        shake();
        banner('Honeypot', 'red', 'Trace spikes.');
        return 400;
      }
      if (!ev.files.length) toast('Nothing new here.', 'info');
      return 100;
    case 'node.captured': {
      sfx('capture');
      const nv = select.mapView(eng)?.nodes.find((n) => n.id === ev.node);
      logLine(`Captured ${nv?.name ?? ev.node} (${ev.nodeType}).`, 'info');
      mapFx.capture[ev.node] = performance.now();
      return 250;
    }
    case 'netscan':
      sfx('probe', { pitch: 0.7 });
      mapFx.ping[ev.node] = performance.now();
      toast(ev.found.length ? `Netscan found ${ev.found.length} address${ev.found.length > 1 ? 'es' : ''}.` : 'Netscan found nothing new.', 'info');
      return 300;
    case 'trace.changed':
      audio.setIntensity(ev.value / 100);
      if (ev.delta > 0 && eng.state.run) sfx('trace_tick', { pitch: 0.8 + ev.value / 100, volume: 0.5 });
      return 0;
    case 'trace.threshold':
      if (ev.level === 'calm') return 0;
      sfx('alarm');
      mapFx.alarmAt = performance.now();
      banner(ev.level === 'suspicious' ? 'Suspicious' : ev.level === 'alarm' ? 'Alarm' : 'Traced', ev.level === 'suspicious' ? 'amber' : 'red',
        ev.level === 'suspicious' ? 'Every ICE +1 shell level.' : ev.level === 'alarm' ? 'Hunter ICE incoming. Vaults sealing.' : undefined, 1600);
      return 500;
    case 'combat.started': {
      const c = eng.state.combat;
      const boss = !!c?.ice.some((i) => eng.content.ice[i.def]?.boss);
      sfx('combat_start');
      audio.setMood(c?.context === 'finale' ? 'finale' : boss ? 'boss' : 'combat');
      flash('white');
      ui.set({ target: null, inspect: null, inspectOpen: false });
      if (ev.ambush) {
        banner('Ambush', 'red', 'The ICE moves first.');
        return 600;
      }
      return 250;
    }
    case 'combat.turnStart':
      logLine(`Turn ${ev.turn}. ${ev.cycles} cycles.${ev.flow ? ' Flow: +1 cycle, −2 trace.' : ''}`, 'combat');
      sfx('turn_start', { volume: 0.7 });
      if (ev.flow) banner('Flow', 'pink', '+1 cycle, −2 trace', 1000);
      return ev.turn > 1 ? 200 : 0;
    case 'combat.program':
      logLine(programSummary(ev, batch), 'combat');
      sfx(programSfx(ev.program));
      pulseSel(`[data-ui="program-${ev.program}"]`, 'fired');
      return 140;
    case 'combat.daemon':
      if (ev.started) sfx('program_daemon', { volume: 0.6 });
      return 0;
    case 'combat.damage': {
      const sel = iceSel(ev.target);
      const t = performance.now();
      iceFx[ev.target] = { ...(iceFx[ev.target] ?? {}), hitAt: t, kind: ev.kind };
      if (ev.reflected > 0) {
        floatOn('[data-ui="player-vitals"]', `mirror −${ev.reflected}`, 'neural');
        shake();
        sfx('hit_deck');
        return 260;
      }
      const shellCls = (() => {
        const c = eng.state.combat ?? ui.get().hold?.state.combat;
        const ice = c?.ice.find((i) => i.uid === ev.target);
        return ice?.shell.type === 'crypt' ? 'shell' : 'wall';
      })();
      const dmgText = metaUiState().hudOverride.damage;
      const rigged = metaUiState().riggedRolls;
      if (typeof dmgText === 'string') floatOn(sel, dmgText, 'small core', 6, true);
      else {
        if (ev.shell > 0) floatOn(sel, `${ev.shell}`, `small ${shellCls}`, -30);
        if (ev.core > 0) floatOn(sel, `${ev.crit ? 'crit ' : ''}${ev.core}${rigged ? ' (rigged: max)' : ''}`, ev.crit ? 'crit' : 'core', 6);
      }
      if (ev.core < 0) floatOn(sel, `+${-ev.core}`, 'heal');
      pulseSel(sel, 'hit');
      if (ev.crit) chroma('.cb-arena');
      if (ev.kind === 'raw' && ev.core > 0) sfx('status_apply', { pitch: 0.6, volume: 0.5 });
      holdIce(ev.target, (i) => {
        i.core = Math.max(0, i.core - Math.max(0, ev.core));
        i.shell.points = Math.max(0, i.shell.points - ev.shell);
      });
      return 170;
    }
    case 'combat.shellBroken':
      sfx('shell_break');
      iceFx[ev.target] = { ...(iceFx[ev.target] ?? {}), shellAt: performance.now() };
      floatOn(iceSel(ev.target), 'shell broken', 'status', -50);
      return 220;
    case 'combat.iceStatus': {
      if (ev.value > 0 && !afterProgram(ev, batch)) logLine(`${iceName(ev.target)} is ${ev.status}${ev.value > 1 && ev.status !== 'mapped' ? ` ${ev.value}` : ''}.`, 'combat');
      if (ev.value === 0) return 0;
      sfx('status_apply', { volume: 0.6 });
      const name = ev.status === 'rootable' ? 'rootable' : ev.status;
      floatOn(iceSel(ev.target), `${name}${typeof ev.value === 'number' && ev.value > 1 && ev.status !== 'mapped' ? ` ${ev.value}` : ''}`, 'status', 40);
      return 90;
    }
    case 'combat.playerStatus':
      if (ev.value > 0 && !afterProgram(ev, batch)) logLine(ev.status === 'scrambled' && ev.program ? `${eng.content.programs[ev.program]?.name ?? ev.program} is scrambled for ${ev.value} turns.` : playerStatusLine(ev.status, ev.value), 'combat');
      if (ev.value === 0) return 0;
      sfx('status_apply', { pitch: 0.8, volume: 0.6 });
      floatOn('[data-ui="player-vitals"]', ev.status === 'scrambled' && ev.program ? `scrambled: ${eng.content.programs[ev.program]?.name ?? ev.program}` : ev.status, 'status');
      return 90;
    case 'combat.iceAct': {
      logLine(ev.skipped ? `${iceName(ev.ice)} is ${ev.skipped} and does nothing.` : `${iceName(ev.ice)}: ${ev.label}.`, 'combat');
      const sel = iceSel(ev.ice);
      iceFx[ev.ice] = { ...(iceFx[ev.ice] ?? {}), actAt: performance.now() };
      if (ev.skipped) {
        floatOn(sel, ev.skipped === 'stunned' ? 'zzz' : 'slowed', 'status');
        return 260;
      }
      pulseSel(sel, 'acting');
      return 330;
    }
    case 'combat.playerHit': {
      logLine(ev.decoyed ? `${iceName(ev.source)} hits your decoy.` : `You take ${ev.amount}: ${[ev.shield ? `shield −${ev.shield}` : '', ev.integrity ? `deck −${ev.integrity}` : '', ev.neural ? `neural −${ev.neural}` : ''].filter(Boolean).join(', ') || 'no damage'}.`, 'combat');
      const black = iceIsBlack(ev.source);
      if (ev.decoyed) {
        sfx('hit_shield', { pitch: 1.4 });
        floatOn('[data-ui="player-vitals"]', 'decoy', 'status');
        return 220;
      }
      if (ev.neural > 0) {
        sfx(black ? 'ice_black' : 'hit_neural');
        flash('red');
        shake(true);
        floatOn('[data-ui="vital-neural"]', `−${ev.neural}`, 'neural');
      }
      if (ev.integrity > 0) {
        sfx(black ? 'ice_black' : 'ice_attack', { volume: 0.8 });
        setTimeout(() => sfx('hit_deck'), 60);
        shake();
        floatOn('[data-ui="vital-integrity"]', `−${ev.integrity}`, 'core');
      }
      if (ev.shield > 0) {
        sfx('hit_shield');
        floatOn('[data-ui="vital-shield"]', `−${ev.shield}`, 'shield small');
      }
      const h = ui.get().hold;
      if (h) {
        h.state.player.integrity = Math.max(0, h.state.player.integrity - ev.integrity);
        h.state.player.neural = Math.max(0, h.state.player.neural - ev.neural);
        if (h.state.combat) h.state.combat.shield = Math.max(0, h.state.combat.shield - ev.shield);
        ui.set({ hold: { ...h } });
      }
      return 280;
    }
    case 'combat.shield':
      if (ev.delta > 0) floatOn('[data-ui="vital-shield"]', `+${ev.delta}`, 'shield small');
      return 0;
    case 'combat.repair':
      if (ev.delta > 0) floatOn('[data-ui="vital-integrity"]', `+${ev.delta}`, 'heal small');
      return 0;
    case 'combat.neural':
      if (ev.delta > 0) floatOn('[data-ui="vital-neural"]', `+${ev.delta}`, 'heal small');
      return 0;
    case 'combat.iceSpawned':
      sfx('status_apply', { pitch: 0.5 });
      banner(`+ ${eng.content.ice[ev.def]?.name ?? ev.def}`, 'red', ev.reason, 1100);
      return 300;
    case 'combat.iceDefeated':
      sfx('ice_die');
      iceFx[ev.ice] = { ...(iceFx[ev.ice] ?? {}), dieAt: performance.now() };
      holdIce(ev.ice, (i) => {
        i.dead = true;
        i.core = 0;
      });
      return 320;
    case 'combat.iceSubverted':
      sfx('capture');
      logLine(`${iceName(ev.ice)} is rooted. It works for you now.`, 'combat', true);
      return 300;
    case 'combat.phase':
      sfx('boss_phase');
      shake(true);
      banner(ev.name ?? `Phase ${ev.phase + 1}`, 'red', ev.text ? fillState(eng, ev.text) : undefined, 2200);
      return 900;
    case 'combat.flow':
      if (ev.earned) {
        sfx('flow');
        pulseSel('[data-ui="flow"]', 'fired');
      }
      return 0;
    case 'combat.botnet':
      logLine(`Botnet: ${({ ddos: 'DDoS', dcrack: 'Distributed Crack', swarm: 'Swarm', bounce: 'Bounce' } as Record<string, string>)[ev.kind] ?? ev.kind}, power ${ev.power}. ${ev.charges} charges left.`, 'combat');
      sfx('botnet');
      chroma('.cb-arena');
      return 300;
    case 'combat.evicted':
      sfx('glitch');
      toast(`${eng.content.programs[ev.program]?.name ?? ev.program} was evicted for the rest of this fight.`, 'bad');
      return 200;
    case 'combat.demand':
    case 'combat.offer':
      sfx('ui_open');
      return 0;
    case 'combat.notify':
      if (ev.style === 'fakewin') {
        sfx('victory');
        banner(ev.text, 'lime', undefined, 1800);
        return 900;
      }
      if (ev.style === 'taunt') {
        const m = /^([^:]{1,40}):\s*([\s\S]*)$/.exec(ev.text);
        const who = m ? m[1].trim() : 'system';
        const id = Object.values(eng.content.npcs).find((n) => n.name.toLowerCase() === who.toLowerCase() || n.id === who.toLowerCase())?.id ?? who.toLowerCase();
        showComms(id, fillState(eng, m ? m[2] : ev.text));
        return 300;
      }
      if (ev.style === 'popup') {
        sfx('ui_open');
        ui.set((s) => ({ cards: [...s.cards, { id: nextId(), title: 'Did you know?', text: fillState(eng, ev.text) }] }));
        return 0;
      }
      toast(fillState(eng, ev.text), 'hot');
      return 120;
    case 'combat.reinforcements':
      toast(`Backup in ${ev.turns}: ${eng.content.ice[ev.ice]?.name ?? ev.ice}`, 'bad');
      return 0;
    case 'combat.ended':
      if (ev.result === 'victory' || ev.result === 'offer') {
        sfx('victory');
        banner(hud(eng, 'combatWin'), 'lime', undefined, 1200);
      }
      else if (ev.result === 'disengaged') toast('Disengaged. The ICE licks its wounds.', 'info');
      else if (ev.result === 'jackedOut') sfx('jack_out');
      audio.setMood(eng.state.run ? 'system' : 'hub');
      return 0;
    case 'player.dumped':
      sfx('dumped');
      shake(true);
      chroma();
      ui.set({ failure: buildFailure('dumped', batch) });
      return 0;
    case 'player.traced':
      sfx('traced');
      flash('red');
      ui.set({ failure: buildFailure('traced', batch) });
      return 0;
    case 'player.flatlined':
      sfx('flatline');
      audio.setMood('silence');
      ui.set({ failure: buildFailure('flatlined', batch) });
      return 0;
    case 'raid.started':
      sfx('alarm');
      banner('Raid', 'red', HEAT_BANDS.raid.toast ?? undefined, 2000);
      return 700;
    case 'raid.ended':
      toast(ev.won ? 'Raid repelled. They left. They left their shoes.' : "Raid lost. They took a part and some money. Heat is 50. You're still here. Apparently.", ev.won ? 'good' : 'bad', 6000);
      return 0;
    case 'message.received': {
      const m = eng.state.messages.find((x) => x.id === ev.id);
      if (ev.channel === 'bbs') {
        if (m) logLine(`BBS, ${eng.content.npcs[m.from] ? npcName(eng, m.from) : m.from}: ${fillState(eng, m.text).split('\n')[0]}`, 'story');
        return 0;
      }
      if (m?.subject === 'comms' && (eng.state.run || eng.state.combat)) {
        showComms(ev.from, fillState(eng, m.text));
        return 0;
      }
      sfx('message');
      if (ev.channel === 'system' && m) toast(fillState(eng, m.text), 'info', 5000, 'story');
      else {
        const gist = m ? (m.subject && m.subject !== 'comms' ? m.subject : fillState(eng, m.text).split('\n')[0]) : '';
        toast(`${npcName(eng, ev.from)}: ${gist.length > 70 ? `${gist.slice(0, 69)}…` : gist}`, 'hot', 4500, 'story');
      }
      return 0;
    }
    case 'log':
      if (ev.level === 'engine') {
        sfx('glitch', { volume: 0.35 });
        chroma('.log');
      }
      return 0;
    case 'dialogue.opened':
      sfx('ui_open');
      return 0;
    case 'dialogue.closed':
      sfx('ui_close');
      return 0;
    case 'job.status': {
      const j = eng.content.jobs[ev.job];
      if (!j) return 0;
      if (ev.status === 'available') toast(`New job: ${j.title}`, 'hot');
      if (ev.status === 'ready') toast(`Job ready to turn in: ${j.title}`, 'good', 4500);
      if (ev.status === 'done') toast(`Paid: ${j.title}`, 'money');
      return 0;
    }
    case 'objective': {
      const o = eng.state.story.objectives[ev.id];
      if (!o || ev.status === 'hidden' || o.kind === 'tutorial') return 0;
      if (ev.status === 'active') toast(`${ev.kind === 'main' ? 'Objective' : 'Side objective'}: ${fillState(eng, o.text)}`, ev.kind === 'main' ? 'hot' : 'info', 5000, 'story');
      if (ev.status === 'done') toast(`Done: ${fillState(eng, o.text)}`, 'good', 4000, 'story');
      return 0;
    }
    case 'module.captured':
      sfx('capture');
      banner(ev.module, 'lime', 'module captured', 1800);
      return 400;
    case 'meta.unlocked':
      sfx('glitch');
      return 0;
    case 'cinematic':
      // played from state.cinematic by <CinematicOverlay/> (or by the meta layer)
      return 0;
    case 'mood':
      if ((MOODS as string[]).includes(ev.mood)) audio.setMood(ev.mood as Mood);
      return 0;
    case 'custom': {
      const d = customData(ev);
      const text = typeof d.text === 'string' ? fillState(eng, d.text) : '';
      if ((ev.name === 'ui.toast' || ev.name === 'toast') && text) toast(text, 'info', 5000);
      else if (ev.name === 'ui.comms' && text) showComms(typeof d.from === 'string' ? d.from : 'system', text);
      else if (ev.name === 'ui.card' && text) {
        ui.set((s) => ({ cards: [...s.cards, { id: nextId(), ...(typeof d.title === 'string' ? { title: d.title } : {}), text }] }));
      } else if (ev.name === 'ui.hint' && text) {
        const id = typeof d.id === 'string' ? d.id : text.slice(0, 40);
        if (!ui.get().hintsSeen.includes(id)) ui.set({ hint: { id, text, ...(typeof d.anchor === 'string' ? { anchor: d.anchor } : {}), ...(typeof d.speaker === 'string' ? { speaker: d.speaker } : {}) } });
      }
      return 0;
    }
    default:
      return 0;
  }
}

