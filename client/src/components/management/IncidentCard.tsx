import { useState } from 'react';
import type { AxiosInstance } from 'axios';
import { ChevronDown, ChevronUp, Clock, Loader2, MapPin, Send, Truck } from 'lucide-react';
import { LevelBadge, Mono } from '../disaster/ui';
import { BTN, FIELD, riskColor, tint } from '../disaster/tokens';
import {
  INCIDENT_TYPES, apiError, timeAgo,
  type Incident, type IncidentStatus, type Resource, type Severity,
} from '../../lib/disasterApi';
import { cn } from '@/lib/utils';

const STATUSES: IncidentStatus[] = ['reported', 'acknowledged', 'responding', 'contained', 'resolved'];
const SEVERITIES: Severity[] = ['low', 'moderate', 'high', 'critical'];
const STATUS_COLOR: Record<IncidentStatus, string> = {
  reported: '#f59e0b',
  acknowledged: '#eab308',
  responding: '#60a5fa',
  contained: '#a78bfa',
  resolved: '#10b981',
};

interface Props {
  incident: Incident;
  api: AxiosInstance;
  isAdmin: boolean;
  onChanged: () => void;
}

export default function IncidentCard({ incident, api, isAdmin, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [recs, setRecs] = useState<Resource[] | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typeLabel = INCIDENT_TYPES.find((t) => t.value === incident.incident_type)?.label || incident.incident_type;
  const sevColor = riskColor(incident.severity);
  const resolved = incident.status === 'resolved';

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(apiError(err, 'Action failed'));
    } finally {
      setBusy(false);
    }
  };

  const update = (body: Record<string, string>) => run(() => api.put(`/api/management/incidents/${incident.id}`, body));

  const loadRecs = async () => {
    try {
      const { data } = await api.get(`/api/management/incidents/${incident.id}/recommendations`);
      setRecs(data.recommendations);
    } catch (err) {
      setError(apiError(err, 'Could not load recommendations'));
    }
  };

  const dispatch = (resourceId: number) =>
    run(async () => {
      await api.post(`/api/management/incidents/${incident.id}/dispatch`, { resource_id: resourceId });
      await loadRecs();
    });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && isAdmin && !resolved) loadRecs();
  };

  return (
    <article
      className={cn('relative overflow-hidden rounded-xl border bg-background/40 transition-colors', resolved && 'opacity-60')}
      style={{ borderColor: tint(sevColor, open ? 0.45 : 0.25) }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: sevColor }} />
      <button type="button" onClick={toggle} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">#{incident.id}</span>
            <span className="text-[13.5px] font-semibold">{incident.title}</span>
            <LevelBadge level={incident.severity} />
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]"
              style={{ color: STATUS_COLOR[incident.status], background: tint(STATUS_COLOR[incident.status], 0.12) }}
            >
              {incident.status}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            <span>{typeLabel}</span>
            <span>· {incident.source}</span>
            <span className="inline-flex items-center gap-1"><Clock size={11} /> {timeAgo(incident.created_at)}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={11} /> {incident.lat.toFixed(4)}, {incident.lon.toFixed(4)}</span>
          </div>
          {incident.resources.length > 0 && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-cyan-400">
              <Truck size={12} /> {incident.resources.map((r) => r.name).join(', ')}
            </div>
          )}
        </div>
        <span className="mt-0.5 shrink-0 text-muted-foreground">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border/60 px-4 py-4 dark:border-white/[0.06]">
          {incident.description && <p className="text-[13px] leading-relaxed text-foreground/90">{incident.description}</p>}

          {isAdmin && !resolved && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <Mono className="mb-1.5 block">Status</Mono>
                  <select className={cn(FIELD, 'cursor-pointer')} value={incident.status} disabled={busy} onChange={(e) => update({ status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <Mono className="mb-1.5 block">Severity</Mono>
                  <select className={cn(FIELD, 'cursor-pointer')} value={incident.severity} disabled={busy} onChange={(e) => update({ severity: e.target.value })}>
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>

              <div>
                <Mono className="mb-2 block">Recommended resources · nearest available</Mono>
                {recs === null && <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><Loader2 size={12} className="animate-spin" /> Finding resources…</div>}
                {recs?.length === 0 && <div className="text-[12px] text-muted-foreground">No matching resource is available right now.</div>}
                <div className="space-y-1.5">
                  {recs?.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-[12.5px] dark:border-white/[0.06]">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.name}</div>
                        <div className="font-mono text-[10.5px] text-muted-foreground">{r.distance_km} km · ETA ~{r.eta_minutes} min</div>
                      </div>
                      <button type="button" className={cn(BTN, 'shrink-0 border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10')} disabled={busy} onClick={() => dispatch(r.id)}>
                        <Truck size={12} /> Dispatch
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (note.trim()) update({ note: note.trim() }).then(() => setNote(''));
                }}
              >
                <input className={FIELD} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Add a field note…" />
                <button type="submit" className={cn(BTN, 'shrink-0 px-3')} disabled={busy || !note.trim()} aria-label="Add note">
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                </button>
              </form>
            </>
          )}

          {error && <div className="text-[12px] text-red-400">{error}</div>}

          {incident.log.length > 0 && (
            <div>
              <Mono className="mb-2 block">Timeline</Mono>
              <ol className="relative space-y-2 border-l border-border/70 pl-4 dark:border-white/[0.08]">
                {incident.log.map((l, i) => (
                  <li key={i} className="relative text-[12px]">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-brand-400" />
                    <span className="text-foreground">{l.message}</span>
                    <span className="ml-2 font-mono text-[10.5px] text-muted-foreground">{timeAgo(l.created_at)} · {l.actor}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
