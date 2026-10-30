/* Shared design tokens for the disaster module (mirrors the main Dashboard card system). */

export const CARD =
  'rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_60px_-30px_rgba(0,0,0,0.6)] dark:border-white/[0.07] dark:bg-white/[0.03]';

export const FIELD =
  'w-full rounded-lg border border-border/80 bg-background/60 px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50';

export const BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background/40 px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-50';

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50';

export const BTN_DANGER =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(239,68,68,0.8)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

/** Risk / priority colours shared by every disaster page. */
export const RISK: Record<string, string> = {
  critical: '#ef4444',
  severe: '#ef4444',
  high: '#f59e0b',
  poor: '#f59e0b',
  moderate: '#eab308',
  medium: '#eab308',
  low: '#10b981',
  good: '#10b981',
  minimal: '#10b981',
};
export const riskColor = (level?: string | null) => RISK[(level || '').toLowerCase()] || RISK.low;

/** Hex colour → rgba() string, for tints. */
export const tint = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};
