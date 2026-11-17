// Global tooltip: any element with data-tip gets a tooltip on hover (mouse), focus (keyboard)
// or long-press (touch). Nothing is hover-only: a long press shows it and swallows the click.
import { useEffect, useState } from 'preact/hooks';

interface TipState { text: string; x: number; y: number; below: boolean; }

export function TooltipHost() {
  const [tip, setTip] = useState<TipState | null>(null);

  useEffect(() => {
    let timer = 0;
    let current: HTMLElement | null = null;
    let suppressClick = false;

    const place = (el: HTMLElement) => {
      const text = el.getAttribute('data-tip');
      if (!text) return;
      const r = el.getBoundingClientRect();
      const below = r.top < 120;
      const half = Math.min(160, (window.innerWidth - 24) / 2);
      const x = Math.min(window.innerWidth - 12 - half, Math.max(12 + half, r.left + r.width / 2));
      setTip({ text, x, y: below ? r.bottom + 8 : r.top - 8, below });
    };
    const find = (t: EventTarget | null): HTMLElement | null => (t instanceof Element ? (t.closest('[data-tip]') as HTMLElement | null) : null);
    const hide = () => {
      clearTimeout(timer);
      current = null;
      setTip(null);
    };

    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = find(e.target);
      if (el === current) return;
      clearTimeout(timer);
      current = el;
      setTip(null);
      if (!el) return;
      timer = window.setTimeout(() => place(el), 320);
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        hide();
        return;
      }
      const el = find(e.target);
      clearTimeout(timer);
      if (!el) return hide();
      current = el;
      timer = window.setTimeout(() => {
        place(el);
        suppressClick = true;
      }, 450);
    };
    const up = () => {
      clearTimeout(timer);
    };
    const click = (e: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        e.preventDefault();
        e.stopPropagation();
        setTimeout(hide, 1600);
      }
    };
    const focus = (e: FocusEvent) => {
      const el = find(e.target);
      if (el && (e.target as HTMLElement).matches(':focus-visible')) place(el);
      else hide();
    };
    const ctx = (e: Event) => {
      if (find(e.target)) e.preventDefault();
    };

    document.addEventListener('pointerover', over);
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
    document.addEventListener('click', click, true);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', hide);
    document.addEventListener('contextmenu', ctx);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', up, true);
      document.removeEventListener('pointercancel', up, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('contextmenu', ctx);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  if (!tip) return null;
  return (
    <div
      class="tip"
      role="tooltip"
      style={{
        left: `${tip.x}px`,
        top: `${tip.y}px`,
        transform: `translate(-50%, ${tip.below ? '0' : '-100%'})`,
      }}
    >
      {tip.text}
    </div>
  );
}
