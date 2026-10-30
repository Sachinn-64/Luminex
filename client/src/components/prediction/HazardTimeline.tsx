import { useMemo, useRef, useState } from 'react';
import { HAZARD_META, formatSlot, pct, type ForecastSlot, type HazardKey } from '../../lib/disasterApi';

const W = 760;
const H = 260;
const PAD = { top: 16, right: 84, bottom: 30, left: 40 };
const HAZARDS = Object.keys(HAZARD_META) as HazardKey[];
const THRESHOLD = 0.5;

/** Multi-series hazard probability over time, with crosshair tooltip and table view. */
export default function HazardTimeline({ timeline }: { timeline: ForecastSlot[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (timeline.length > 1 ? (i / (timeline.length - 1)) * innerW : 0);
  const y = (v: number) => PAD.top + (1 - v) * innerH;

  const paths = useMemo(() => HAZARDS.map(h => ({
    key: h,
    d: timeline.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.hazards[h]).toFixed(1)}`).join(''),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [timeline]);

  // Day boundaries for x-axis ticks
  const dayTicks = timeline
    .map((s, i) => ({ i, d: new Date(s.time) }))
    .filter(({ i, d }) => i === 0 || d.getHours() < 3)
    .filter(({ i }, k, all) => !(i === 0 && all[k + 1] && all[k + 1].i < 4));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || timeline.length < 2) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.left) / innerW) * (timeline.length - 1));
    setHover(Math.max(0, Math.min(timeline.length - 1, idx)));
  };

  // Direct end labels, nudged apart so they don't collide
  const endLabels = HAZARDS
    .map(h => ({ h, y: y(timeline[timeline.length - 1]?.hazards[h] ?? 0) }))
    .sort((a, b) => a.y - b.y)
    .reduce<{ h: HazardKey; y: number }[]>((acc, l) => {
      const prev = acc[acc.length - 1];
      acc.push({ ...l, y: prev && l.y - prev.y < 13 ? prev.y + 13 : l.y });
      return acc;
    }, []);

  const hovered = hover !== null ? timeline[hover] : null;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginBottom: 8 }}>
        {HAZARDS.map(h => (
          <span key={h} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
            <span style={{ width: 14, height: 2, borderRadius: 2, background: HAZARD_META[h].color }} />
            {HAZARD_META[h].label}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
          <span style={{ width: 14, borderTop: '1px dashed hsl(var(--muted-foreground))' }} /> Warning threshold
        </span>
        <button
          onClick={() => setShowTable(v => !v)}
          style={{ marginLeft: 'auto', fontSize: 12, background: 'none', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
        >
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {showTable ? (
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: 'hsl(var(--muted-foreground))', textAlign: 'left' }}>
                <th style={{ padding: 6 }}>Time</th>
                {HAZARDS.map(h => <th key={h} style={{ padding: 6 }}>{HAZARD_META[h].label}</th>)}
                <th style={{ padding: 6 }}>Rain 24h</th><th style={{ padding: 6 }}>Heat idx</th><th style={{ padding: 6 }}>Crowd</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map(s => (
                <tr key={s.time} style={{ borderTop: '1px solid hsl(var(--border) / 0.6)', color: 'hsl(var(--foreground))' }}>
                  <td style={{ padding: 6 }}>{formatSlot(s.time)}</td>
                  {HAZARDS.map(h => <td key={h} style={{ padding: 6, fontWeight: s.hazards[h] >= THRESHOLD ? 700 : 400 }}>{pct(s.hazards[h])}</td>)}
                  <td style={{ padding: 6 }}>{s.drivers.rain_24h_mm} mm</td>
                  <td style={{ padding: 6 }}>{s.drivers.heat_index_c}°C</td>
                  <td style={{ padding: 6 }}>{pct(s.drivers.projected_crowd_density)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            role="img"
            aria-label="Hazard probability forecast"
          >
            {[0, 0.25, 0.5, 0.75, 1].map(v => (
              <g key={v}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)}
                  stroke="hsl(var(--border))" strokeWidth={1}
                  strokeDasharray={v === THRESHOLD ? '4 4' : undefined}
                  opacity={v === THRESHOLD ? 1 : 0.5} />
                <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">{v * 100}%</text>
              </g>
            ))}
            {dayTicks.map(({ i, d }) => (
              <text key={i} x={x(i)} y={H - 8} fontSize={10} fill="hsl(var(--muted-foreground))" textAnchor={i === 0 ? 'start' : 'middle'}>
                {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
              </text>
            ))}
            {paths.map(p => (
              <path key={p.key} d={p.d} fill="none" stroke={HAZARD_META[p.key].color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {endLabels.map(l => (
              <text key={l.h} x={W - PAD.right + 8} y={l.y + 4} fontSize={11} fill="hsl(var(--foreground))">{HAZARD_META[l.h].label}</text>
            ))}
            {hovered && hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
                {HAZARDS.map(h => (
                  <circle key={h} cx={x(hover)} cy={y(hovered.hazards[h])} r={4} fill={HAZARD_META[h].color} stroke="hsl(var(--card))" strokeWidth={2} />
                ))}
              </g>
            )}
          </svg>
          {hovered && hover !== null && (
            <div style={{
              position: 'absolute', top: 8, pointerEvents: 'none',
              left: `${(x(hover) / W) * 100}%`, transform: hover > timeline.length / 2 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
              background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))',
              border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '8px 10px', fontSize: 12, minWidth: 170,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{formatSlot(hovered.time)}</div>
              {HAZARDS.map(h => (
                <div key={h} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: HAZARD_META[h].color }} />{HAZARD_META[h].label}
                  </span>
                  <span style={{ fontWeight: 600 }}>{pct(hovered.hazards[h])}</span>
                </div>
              ))}
              <div style={{ marginTop: 4, color: 'hsl(var(--muted-foreground))' }}>
                {hovered.drivers.description} · {hovered.drivers.temperature_c}°C · crowd {pct(hovered.drivers.projected_crowd_density)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
