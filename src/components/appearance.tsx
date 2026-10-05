"use client";
import { useSyncExternalStore } from "react";
const key = "kanzquant.theme.v1";
const snapshot = () => document.documentElement.dataset.theme === "light" ? "light" : "dark";
function subscribe(callback: () => void) {
  const system = matchMedia("(prefers-color-scheme: light)");
  const sync = () => {
    let preference: string | null = null;
    try { preference = localStorage.getItem(key); } catch {}
    document.documentElement.dataset.theme = preference === "light" || preference === "dark" ? preference : system.matches ? "light" : "dark";
    callback();
  };
  window.addEventListener("kanzquant-theme", callback);
  window.addEventListener("storage", sync);
  system.addEventListener("change", sync);
  return () => { window.removeEventListener("kanzquant-theme", callback); window.removeEventListener("storage", sync); system.removeEventListener("change", sync); };
}
export function Appearance() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "dark");
  return <button className="appearance" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={() => {
    const next = snapshot() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(key, next); } catch {}
    window.dispatchEvent(new Event("kanzquant-theme"));
  }}>{theme === "dark" ? "☀" : "◐"}<span>Appearance</span></button>;
}
