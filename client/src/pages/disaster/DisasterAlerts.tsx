/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { AlertOctagon, AlertTriangle, BellRing, Check, Info, Loader2, RefreshCw, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useDisasterData } from '../../context/DisasterDataContext';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, Mono, PageHeader, Panel, PanelHeader, Pill, StatCard } from '../../components/disaster/ui';
import { BTN, riskColor, tint } from '../../components/disaster/tokens';
import { DISASTER_API_URL } from '../../lib/disasterApi';
import { cn } from '@/lib/utils';

type Priority = 'critical' | 'high' | 'moderate' | 'low';
const PRIORITIES: { key: Priority; label: string; icon: LucideIcon }[] = [
  { key: 'critical', label: 'Critical', icon: AlertOctagon },
  { key: 'high', label: 'High', icon: AlertTriangle },
  { key: 'moderate', label: 'Moderate', icon: BellRing },
  { key: 'low', label: 'Low', icon: Info },
];

const fmt = (ts?: string) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
};

export default function DisasterAlerts() {
  const { fetchAlerts } = useDisasterData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Priority | 'all'>('all');
  const [acking, setAcking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await fetchAlerts();
      setAlerts(data.alerts || (Array.isArray(data) ? data : []));
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts]);

  useEffect(() => {
    load();
  }, [load]);

  const acknowledge = async (id: string) => {
    setAcking(id);
    try {
      await axios.post(
        `${DISASTER_API_URL}/api/admin/alerts/${encodeURIComponent(id)}/acknowledge`,
        { acknowledged_by: profile?.name || 'admin' },
        { headers: { 'X-User-Role': 'admin' } },
      );
      await load();
    } catch (e) {
      console.error('Failed to acknowledge', e);
    } finally {
      setAcking(null);
    }
  };

  const counts = PRIORITIES.reduce<Record<Priority, number>>(
    (acc, p) => ({ ...acc, [p.key]: alerts.filter((a) => a.priority === p.key).length }),
    { critical: 0, high: 0, moderate: 0, low: 0 },
  );
  const visible = filter === 'all' ? alerts : alerts.filter((a) => a.priority === filter);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Alerts"
        title="Alerts & notifications"
        description="Generated in real time from crowd density, weather, seismic and traffic feeds. Click a tile to filter by priority."
        action={
          <button type="button" onClick={load} className={BTN} disabled={loading}>
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PRIORITIES.map((p) => (
          <StatCard
            key={p.key}
            label={p.label}
            value={counts[p.key]}
            sub={filter === p.key ? 'Filtering · click to clear' : `${p.label.toLowerCase()} priority`}
            icon={p.icon}
            color={riskColor(p.key)}
            active={filter === p.key}
            onClick={() => setFilter(filter === p.key ? 'all' : p.key)}
          />
        ))}
      </div>

      <Panel>
        <PanelHeader
          title={filter === 'all' ? `All alerts · ${alerts.length}` : `${filter} alerts · ${visible.length}`}
          meta={isAdmin ? 'Acknowledge an alert once the control room has acted on it.' : undefined}
          action={
            filter !== 'all' && (
              <button type="button" className={BTN} onClick={() => setFilter('all')}>
                Show all
              </button>
            )
          }
        />

        {loading ? (
          <div className="flex items-center justify-center py-14 text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-brand-400" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={filter === 'all' ? 'No alerts · system operating normally' : `No ${filter} alerts`}
            hint="New alerts appear here automatically as the monitoring loop runs."
          />
        ) : (
          <div className="space-y-2">
            {visible.map((a, i) => {
              const color = riskColor(a.priority);
              const acked = a.acknowledged === 1 || a.acknowledged === true;
              return (
                <article
                  key={a.id || i}
                  className="group relative flex gap-4 overflow-hidden rounded-xl border px-4 py-3 transition-colors"
                  style={{ borderColor: tint(color, 0.25), background: tint(color, acked ? 0.04 : 0.07) }}
                >
                  <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill color={color}>{a.priority}</Pill>
                      {a.type && <Mono className="rounded-full border border-border/70 px-2 py-0.5">{String(a.type).replace(/_/g, ' ')}</Mono>}
                      {acked && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-400">
                          <Check size={11} /> acknowledged
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[13.5px] font-medium leading-snug text-foreground">{a.message}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                      <span>{fmt(a.created_at || a.timestamp)}</span>
                      {a.location && <span>{a.location}</span>}
                    </div>
                  </div>
                  {isAdmin && !acked && (
                    <button
                      type="button"
                      disabled={acking === a.id}
                      onClick={() => acknowledge(a.id)}
                      className={cn(BTN, 'self-center border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10')}
                    >
                      {acking === a.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Acknowledge
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
