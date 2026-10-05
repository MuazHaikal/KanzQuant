"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
export function TerminalMenu({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null), button = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null), id = useId();
  const close = (restore = false) => { setPosition(null); if (restore) button.current?.focus(); };
  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector<HTMLButtonElement>(`[data-value="${value}"]`)?.focus();
    const outside = (e: PointerEvent) => { if (!menu.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setPosition(null); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setPosition(null); button.current?.focus(); } };
    const dismiss = () => setPosition(null);
    window.addEventListener("pointerdown", outside); window.addEventListener("keydown", escape, true); window.addEventListener("resize", dismiss); window.addEventListener("scroll", dismiss, true);
    return () => { window.removeEventListener("pointerdown", outside); window.removeEventListener("keydown", escape, true); window.removeEventListener("resize", dismiss); window.removeEventListener("scroll", dismiss, true); };
  }, [position, value]);
  const open = () => { const r = button.current?.getBoundingClientRect(); if (r) setPosition({ left: Math.max(8, Math.min(r.left, window.innerWidth - 104)), top: Math.min(r.bottom + 4, window.innerHeight - options.length * 29 - 12) }); };
  return <><button ref={button} className="terminal-select" aria-label={`${label} ${value}`} aria-haspopup="menu" aria-expanded={!!position} aria-controls={position ? id : undefined} onClick={() => position ? close() : open()} onKeyDown={e => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); } }}><span>{label}</span><strong>{value}</strong></button>{position && createPortal(<div ref={menu} id={id} role="menu" aria-label={label} className="terminal-popup" style={position} onKeyDown={e => {
    const buttons = [...menu.current!.querySelectorAll<HTMLButtonElement>("button")], index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); buttons[e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : (index + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus(); }
    if (e.key === "Tab") { close(true); }
  }}>{options.map(option => <button key={option} type="button" role="menuitemradio" aria-checked={value === option} data-value={option} tabIndex={value === option ? 0 : -1} onClick={() => { onChange(option); close(true); }}>{option}</button>)}</div>, document.body)}</>;
}
