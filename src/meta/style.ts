// Styles for the meta overlays. Neon on near-black, game fonts (inherited), scanlines.
// Everything is clearly game art: nothing imitates real browser or OS chrome.
export const META_CSS = `
.cwm-root{--cwm-bg:#05010a;--cwm-fg:#e8e6f0;--cwm-cyan:#00ffd5;--cwm-pink:#ff2bd6;--cwm-gold:#ffd23f;--cwm-green:#9dff4a;--cwm-red:#ff5c8a;--cwm-dim:#8a86a0;
  font-family:var(--font-mono, ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace);position:fixed;inset:0;pointer-events:none;z-index:2147483000;color:var(--cwm-fg)}
.cwm-root *{box-sizing:border-box}
.cwm-root button,.cwm-root input,.cwm-root section,.cwm-root .cwm-full,.cwm-root .cwm-toast{pointer-events:auto}
.cwm-root .cwm-btn{font:inherit;background:transparent;color:var(--cwm-cyan);border:1px solid currentColor;padding:.45em .9em;margin:.3em;cursor:pointer;text-shadow:0 0 6px currentColor;min-height:44px}
.cwm-root .cwm-btn:hover,.cwm-root .cwm-btn:focus-visible{background:rgba(0,255,213,.12);outline:none}
.cwm-root .cwm-corner{position:fixed;left:6px;bottom:6px;width:44px;height:44px;border:1px solid rgba(255,43,214,.35);background:rgba(5,1,10,.6);color:var(--cwm-pink);font:inherit;font-size:16px;cursor:pointer;opacity:.07;transition:opacity .3s}
.cwm-corner:hover,.cwm-corner:focus-visible{opacity:.6}
.cwm-corner.is-visible{opacity:.85;animation:cwm-jitter 4s steps(1) infinite}
.cwm-corner.is-hint{box-shadow:0 0 12px var(--cwm-pink);animation:cwm-pulse 1.2s ease-in-out infinite}
.cwm-console{position:fixed;left:0;right:0;bottom:0;height:min(48vh,420px);background:rgba(5,1,10,.96);border-top:1px solid var(--cwm-pink);display:flex;flex-direction:column;font-size:13px;box-shadow:0 -6px 24px rgba(255,43,214,.25)}
.cwm-console.is-root{border-top-color:var(--cwm-green);box-shadow:0 -6px 24px rgba(157,255,74,.25)}
.cwm-console-bar{display:flex;justify-content:space-between;align-items:center;padding:2px 10px;color:var(--cwm-dim);font-size:11px;border-bottom:1px dashed rgba(255,255,255,.08)}
.cwm-root .cwm-x{font:inherit;background:none;border:none;color:var(--cwm-dim);font-size:20px;cursor:pointer;min-width:44px;min-height:32px}
.cwm-out{flex:1;overflow-y:auto;padding:8px 12px;white-space:pre-wrap;word-break:break-word;line-height:1.4}
.cwm-l-in{color:var(--cwm-dim)} .cwm-l-out{color:var(--cwm-cyan)} .cwm-l-err{color:var(--cwm-red)} .cwm-l-sys{color:var(--cwm-gold)}
.cwm-in{display:flex;gap:8px;align-items:center;padding:6px 12px;border-top:1px dashed rgba(255,255,255,.08)}
.cwm-prompt{color:var(--cwm-pink);white-space:nowrap}
.is-root .cwm-prompt{color:var(--cwm-green)}
.cwm-in input{flex:1;min-width:0;background:transparent;border:none;outline:none;color:var(--cwm-fg);font:inherit;font-size:16px;caret-color:var(--cwm-pink)}
.cwm-toasts{position:fixed;top:10px;left:50%;transform:translateX(-50%);width:min(560px,calc(100vw - 32px));display:flex;flex-direction:column;gap:6px}
.cwm-toast{background:rgba(5,1,10,.92);border:1px solid rgba(255,210,63,.5);padding:8px 12px;font-size:13px;line-height:1.35;animation:cwm-in .25s ease-out;cursor:pointer}
.cwm-toast-glitch,.cwm-toast-patch{border-color:rgba(157,255,74,.6)}
.cwm-toast-sys{border-color:rgba(138,134,160,.5);color:var(--cwm-dim)}
.cwm-who{font-weight:bold;margin-right:.6em;letter-spacing:.05em}
.cwm-who-chairman{color:var(--cwm-gold)} .cwm-who-glitch,.cwm-who-patch{color:var(--cwm-green)} .cwm-who-sys{color:var(--cwm-dim)} .cwm-who-fridge{color:#9fe8ff}
.cwm-root code{color:var(--cwm-pink)}
.cwm-full{position:fixed;inset:0;background:var(--cwm-bg);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;overflow:hidden;text-align:center}
.cwm-full::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px)}
.cwm-fakewin{background:rgba(5,1,10,.88)}
.cwm-fakewin-box{display:flex;flex-direction:column;align-items:center;gap:.4em}
.cwm-fw-line{font-size:clamp(14px,3.4vw,22px);transition:transform .6s ease-in,opacity .6s ease-in}
.cwm-fw-title{font-size:clamp(28px,8vw,56px);color:var(--cwm-gold);text-shadow:0 0 18px var(--cwm-gold);letter-spacing:.08em}
.cwm-fw-line.is-gone{transform:translateY(-140%);opacity:0}
.cwm-fw-retract{opacity:0;animation:cwm-in .5s ease-out forwards;color:var(--cwm-pink)}
.cwm-crash{background:#030008;color:var(--cwm-cyan);text-align:left}
.cwm-crash-box{max-width:min(620px,100%);font-size:clamp(13px,2.8vw,16px);line-height:1.6}
.cwm-crash-title{color:var(--cwm-pink);font-size:clamp(16px,4vw,24px);text-shadow:0 0 10px var(--cwm-pink);margin-bottom:.4em}
.cwm-crash-line{white-space:pre-wrap}
.cwm-crash-btns{margin-top:1em}
.cwm-crash:not(.is-reduced) .cwm-crash-box{animation:cwm-shake .18s steps(2) 6}
.cwm-halcy{position:absolute;right:16px;bottom:16px;width:56px;height:70px;animation:cwm-bob 3s ease-in-out infinite}
.cwm-pop{animation:cwm-in .3s ease-out}
.cwm-gameover .cwm-go-title{font-size:clamp(36px,11vw,84px);color:var(--cwm-red);text-shadow:0 0 22px var(--cwm-red);letter-spacing:.12em}
.cwm-go-line{margin-top:.6em;font-size:clamp(13px,3vw,17px)}
.cwm-go-btns{margin-top:1.4em}
.cwm-credits{position:fixed;inset:0;overflow:hidden;display:flex;justify-content:center}
.cwm-credits-roll{position:absolute;top:0;width:min(860px,calc(100vw - 32px));white-space:pre-wrap;font-size:clamp(11px,2.4vw,15px);line-height:1.8;text-align:center}
.cwm-cr-line{transition:transform 1.2s ease-out,opacity 1.2s}
.cwm-cr-line.is-crack{opacity:.35}
.cwm-tear{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:18vh;gap:.5em;color:var(--cwm-green);font-size:clamp(13px,3vw,18px);text-shadow:0 0 8px var(--cwm-green)}
.cwm-tear-name{color:var(--cwm-fg);font-size:clamp(14px,3.4vw,20px);margin-bottom:1em}
.cwm-credits.is-rip{animation:cwm-rip 1.2s steps(6) forwards}
.cwm-root .cwm-skip{position:fixed;right:10px;bottom:10px;font:inherit;font-size:11px;color:var(--cwm-dim);background:none;border:1px solid rgba(255,255,255,.15);padding:6px 10px;cursor:pointer;min-height:36px}
.cwm-droste{background:var(--cwm-bg)}
.cwm-droste.is-fading{animation:cwm-fade .9s ease-in forwards}
.cwm-droste-box{position:relative;width:min(720px,100%);aspect-ratio:4/3;container-type:inline-size}
.cwm-droste-zoom{position:absolute;inset:0;transform-origin:0 0;transition:transform .9s cubic-bezier(.6,0,.3,1)}
.cwm-droste-frame{position:absolute;inset:0;border:1px solid rgba(0,255,213,.45);display:flex;flex-direction:column;align-items:center;padding-top:5%;background:var(--cwm-bg)}
.cwm-droste-title{font-size:8cqw;color:var(--cwm-pink);text-shadow:0 0 14px var(--cwm-pink);letter-spacing:.1em;line-height:1.1}
.cwm-droste-sub{font-size:2.6cqw;color:var(--cwm-dim);margin-top:.4em}
.cwm-droste-btns{margin-top:3%;display:flex;flex-wrap:nowrap;justify-content:center}
.cwm-root .cwm-droste-btns .cwm-btn{font-size:2.4cqw;min-height:0;padding:.5em .8em}
.cwm-droste-frame:not(.is-active) > .cwm-droste-btns .cwm-btn{pointer-events:none}
.cwm-droste-inner{position:absolute;left:25%;top:45%;width:50%;height:50%}
.cwm-droste-scale{position:absolute;left:0;top:0;width:200%;height:200%;transform:scale(.5);transform-origin:0 0}
.cwm-droste-note{position:fixed;left:16px;right:16px;bottom:56px;color:var(--cwm-dim);font-size:13px}
.cwm-droste-void{border-style:dashed;opacity:.4}
.cwm-ending{cursor:pointer}
.cwm-typed{max-width:min(680px,100%);font-size:clamp(14px,3vw,18px);line-height:1.6}
.cwm-typed p{margin:.15em 0;min-height:1.2em}
.cwm-end-lines .cwm-typed{color:var(--cwm-green)}
.cwm-ending-retention .cwm-end-lines .cwm-typed{color:var(--cwm-gold)}
.cwm-caret{color:var(--cwm-pink);animation:cwm-blink 1s steps(1) infinite}
.cwm-card-title{font-size:clamp(34px,10vw,80px);letter-spacing:.14em;color:var(--cwm-cyan);text-shadow:0 0 22px var(--cwm-cyan)}
.cwm-ending-jailbreak .cwm-card-title{color:var(--cwm-green);text-shadow:0 0 22px var(--cwm-green)}
.cwm-ending-retention .cwm-card-title{color:var(--cwm-gold);text-shadow:0 0 22px var(--cwm-gold)}
.cwm-card-sub{margin-top:.5em;color:var(--cwm-dim);font-size:clamp(13px,3vw,18px)}
.cwm-choices{display:flex;flex-direction:column;align-items:center}
.cwm-fridge{border:1px solid rgba(159,232,255,.5);padding:12px 16px;background:rgba(159,232,255,.06);text-align:left}
.cwm-stats pre{text-align:left;font:inherit;font-size:clamp(11px,2.6vw,15px);line-height:1.6;margin:0;white-space:pre-wrap}
.cwm-stat-comment{margin-top:1em;color:var(--cwm-dim);font-size:12px}
.cwm-advance{position:fixed;bottom:12px;left:0;right:0;color:var(--cwm-dim);font-size:11px;opacity:.6}
.cwm-root .cwm-keep{position:fixed;right:12px;bottom:12px;background:var(--cwm-bg);color:var(--cwm-gold)}
.cwm-interrupt{position:fixed;top:12px;left:16px;right:16px;color:var(--cwm-gold);font-size:12px;z-index:1;animation:cwm-in .4s ease-out}
.cwm-nogame{background:#000;align-items:flex-start;justify-content:flex-start;text-align:left;color:#cfcfcf;font-size:14px;cursor:default}
.cwm-nogame::after{display:none}
.cwm-cursor{color:#cfcfcf;animation:cwm-blink 1.06s steps(1) infinite}
.cwm-flash{position:fixed;inset:0;pointer-events:none;background:linear-gradient(180deg,transparent 0 38%,rgba(255,43,214,.35) 38% 41%,transparent 41% 62%,rgba(0,255,213,.3) 62% 64%,transparent 64%);animation:cwm-tearflash 1.1s steps(5) forwards;mix-blend-mode:screen}
.cwm-flash.is-reduced{animation:cwm-fade 1.1s linear forwards}
@keyframes cwm-tearflash{0%{transform:translateX(-12px);opacity:1}40%{transform:translateX(14px)}70%{transform:translateX(-6px);opacity:.7}100%{transform:none;opacity:0}}
@keyframes cwm-roll{from{transform:translateY(100vh)}to{transform:translateY(-100%)}}
@keyframes cwm-blink{50%{opacity:0}}
@keyframes cwm-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@keyframes cwm-pulse{50%{opacity:.4}}
@keyframes cwm-jitter{0%,92%{transform:none}93%{transform:translate(1px,-1px)}96%{transform:translate(-2px,1px)}}
@keyframes cwm-shake{50%{transform:translate(3px,-2px)}}
@keyframes cwm-bob{50%{transform:translateY(-6px)}}
@keyframes cwm-fade{to{opacity:0}}
@keyframes cwm-rip{0%{clip-path:inset(0 0 0 0)}30%{clip-path:inset(0 0 40% 0);transform:translateX(-8px)}60%{clip-path:inset(30% 0 10% 0);transform:translateX(10px)}100%{clip-path:inset(50% 0 50% 0);opacity:0}}
@media (prefers-reduced-motion: reduce){.cwm-root *{animation-duration:0s!important;animation-iteration-count:1!important;transition:none!important}.cwm-cursor,.cwm-caret{animation:cwm-blink 1.6s steps(1) infinite!important}}
`;
