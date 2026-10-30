import type { CSSProperties, ReactNode } from 'react';
import { AlertTriangle, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEVEL_COLORS, type RiskLevel } from '../../lib/disasterApi';
import { CARD, riskColor, tint } from './tokens';

/* ------------------------------------------------------------------ */
/*  Shared design tokens for the disaster module                        */
/*  (mirrors the main Dashboard card system)                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Primitives                                                          */
/* ------------------------------------------------------------------ */

export function Mono({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={cn('font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground', className)} style={style}>
      {children}
    </span>
  );
}

export function Panel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={cn(CARD, 'p-5', className)} style={style}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  meta,
  action,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <Mono className="block">{title}</Mono>
        {meta && <div className="mt-1 text-[12.5px] text-muted-foreground">{meta}</div>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Mono className="mb-2 block">{eyebrow}</Mono>}
        <h1 className="font-heading text-[26px] font-bold leading-tight tracking-[-0.01em] text-foreground">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function Pill({
  color,
  children,
  className,
  dot = true,
}: {
  color: string;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]',
        className,
      )}
      style={{ color, borderColor: tint(color, 0.35), background: tint(color, 0.1) }}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />}
      {children}
    </span>
  );
}

export function LevelBadge({ level }: { level: RiskLevel | string }) {
  const color = LEVEL_COLORS[level as RiskLevel] || riskColor(level);
  return <Pill color={color}>{level}</Pill>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="m-0 text-[14px] font-semibold text-foreground">{children}</h3>
      {right}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  onClick,
  active,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        CARD,
        'group relative flex min-h-[104px] flex-col justify-between overflow-hidden p-4 text-left transition-all',
        onClick && 'cursor-pointer hover:-translate-y-0.5',
      )}
      style={active ? { boxShadow: `0 0 0 1.5px ${color}, 0 20px 50px -25px ${tint(color, 0.7)}` } : undefined}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: `linear-gradient(180deg, ${color}, ${tint(color, 0.2)})` }} />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
        style={{ background: tint(color, 0.35) }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <Mono>{label}</Mono>
        {Icon && (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border"
            style={{ color, borderColor: tint(color, 0.25), background: tint(color, 0.12) }}
          >
            <Icon size={15} />
          </span>
        )}
      </div>
      <div className="relative">
        <div className="font-heading text-[28px] font-bold leading-none tracking-tight text-foreground">{value}</div>
        {sub && <div className="mt-1.5 truncate text-[12px] text-muted-foreground">{sub}</div>}
      </div>
    </Tag>
  );
}

export function Bar({ value, color, className }: { value: number; color: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${v}%`, background: `linear-gradient(90deg, ${tint(color, 0.6)}, ${color})` }}
      />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  color = '#10b981',
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-10 text-center', className)}>
      <span
        className="mb-3 flex size-11 items-center justify-center rounded-xl border"
        style={{ color, borderColor: tint(color, 0.3), background: tint(color, 0.1) }}
      >
        <Icon size={18} />
      </span>
      <div className="text-[13.5px] font-semibold text-foreground">{title}</div>
      {hint && <div className="mt-1 max-w-xs text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn(CARD, 'flex min-h-[240px] flex-col items-center justify-center gap-3 text-muted-foreground', className)}>
      <Loader2 className="size-6 animate-spin text-brand-400" />
      <Mono>{label}</Mono>
    </div>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-foreground">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
      <div>{children}</div>
    </div>
  );
}

/** Row divider list: children get a hairline between them. */
export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('divide-y divide-border/60 dark:divide-white/[0.06]', className)}>{children}</div>;
}

/** Segmented control used for tabs / layer toggles. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex flex-wrap gap-1 rounded-xl border border-border/70 bg-background/40 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors',
            o.value === value ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
