import type { AccentColor } from "../types";

export const ACCENT_PALETTE: Record<
  AccentColor,
  { name: string; hex: string; ring: string; fill: string; soft: string }
> = {
  slate: { name: "Slate", hex: "#64748b", ring: "ring-slate-400", fill: "bg-slate-500", soft: "bg-slate-500/10" },
  rose: { name: "Rose", hex: "#f43f5e", ring: "ring-rose-400", fill: "bg-rose-500", soft: "bg-rose-500/10" },
  red: { name: "Red", hex: "#ef4444", ring: "ring-red-400", fill: "bg-red-500", soft: "bg-red-500/10" },
  orange: { name: "Orange", hex: "#f97316", ring: "ring-orange-400", fill: "bg-orange-500", soft: "bg-orange-500/10" },
  amber: { name: "Amber", hex: "#f59e0b", ring: "ring-amber-400", fill: "bg-amber-500", soft: "bg-amber-500/10" },
  lime: { name: "Lime", hex: "#84cc16", ring: "ring-lime-400", fill: "bg-lime-500", soft: "bg-lime-500/10" },
  emerald: { name: "Emerald", hex: "#10b981", ring: "ring-emerald-400", fill: "bg-emerald-500", soft: "bg-emerald-500/10" },
  teal: { name: "Teal", hex: "#14b8a6", ring: "ring-teal-400", fill: "bg-teal-500", soft: "bg-teal-500/10" },
  sky: { name: "Sky", hex: "#0ea5e9", ring: "ring-sky-400", fill: "bg-sky-500", soft: "bg-sky-500/10" },
  blue: { name: "Blue", hex: "#3b82f6", ring: "ring-blue-400", fill: "bg-blue-500", soft: "bg-blue-500/10" },
  violet: { name: "Violet", hex: "#8b5cf6", ring: "ring-violet-400", fill: "bg-violet-500", soft: "bg-violet-500/10" },
  fuchsia: { name: "Fuchsia", hex: "#d946ef", ring: "ring-fuchsia-400", fill: "bg-fuchsia-500", soft: "bg-fuchsia-500/10" },
};

export const ACCENT_KEYS = Object.keys(ACCENT_PALETTE) as AccentColor[];

export const MOTION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
} as const;

export const Z = {
  sidebar: 10,
  drawer: 40,
  modal: 50,
  toast: 60,
} as const;
