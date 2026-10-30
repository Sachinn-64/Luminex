import type { ReactNode } from 'react';
import { LEVEL_COLORS, type RiskLevel } from '../../lib/disasterApi';

export function LevelBadge({ level }: { level: RiskLevel }) {
  const color = LEVEL_COLORS[level] || LEVEL_COLORS.low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 999,
      border: `1px solid ${color}55`, background: `${color}18`, color: 'hsl(var(--foreground))',
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: color }} />{level}
    </span>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{children}</h3>
      {right}
    </div>
  );
}
