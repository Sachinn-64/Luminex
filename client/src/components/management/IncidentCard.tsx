import { useState } from 'react';
import type { AxiosInstance } from 'axios';
import { ChevronDown, ChevronUp, MapPin, Send, Truck } from 'lucide-react';
import { LevelBadge } from '../disaster/ui';
import {
  INCIDENT_TYPES, apiError, timeAgo,
  type Incident, type IncidentStatus, type Resource, type Severity,
} from '../../lib/disasterApi';

const STATUSES: IncidentStatus[] = ['reported', 'acknowledged', 'responding', 'contained', 'resolved'];
const SEVERITIES: Severity[] = ['low', 'moderate', 'high', 'critical'];

const select = {
  fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
};
const button = {
  fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid hsl(var(--border))',
  background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
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
  const typeLabel = INCIDENT_TYPES.find(t => t.value === incident.incident_type)?.label || incident.incident_type;

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

  const dispatch = (resourceId: number) => run(async () => {
    await api.post(`/api/management/incidents/${incident.id}/dispatch`, { resource_id: resourceId });
    await loadRecs();
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && isAdmin && incident.status !== 'resolved') loadRecs();
  };

  return (
    <div style={{
      border: '1px solid hsl(var(--border) / 0.7)', borderRadius: 10, padding: 12,
      opacity: incident.status === 'resolved' ? 0.6 : 1, background: 'hsl(var(--background) / 0.35)',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 14, color: 'hsl(var(--foreground))' }}>#{incident.id} {incident.title}</strong>
            <LevelBadge level={incident.severity} />
          </div>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>
            {typeLabel} · {incident.status} · {incident.source} · {timeAgo(incident.created_at)}
            {' · '}<MapPin size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {incident.lat.toFixed(4)}, {incident.lon.toFixed(4)}
          </div>
          {incident.resources.length > 0 && (
            <div style={{ fontSize: 12, color: 'hsl(var(--foreground))', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Truck size={12} /> {incident.resources.map(r => r.name).join(', ')}
            </div>
          )}
        </div>
        <button style={{ ...button, padding: 4 }} onClick={toggle} aria-label="Toggle details">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          {incident.description && <div style={{ fontSize: 13, color: 'hsl(var(--foreground))' }}>{incident.description}</div>}

          {isAdmin && incident.status !== 'resolved' && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Status{' '}
                  <select style={select} value={incident.status} disabled={busy} onChange={e => update({ status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Severity{' '}
                  <select style={select} value={incident.severity} disabled={busy} onChange={e => update({ severity: e.target.value })}>
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 6 }}>Recommended resources (nearest matching, available)</div>
                {recs === null && <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Loading…</div>}
                {recs?.length === 0 && <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>No matching resource is available.</div>}
                <div style={{ display: 'grid', gap: 6 }}>
                  {recs?.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12, color: 'hsl(var(--foreground))' }}>
                      <span>{r.name} <span style={{ color: 'hsl(var(--muted-foreground))' }}>· {r.distance_km} km · ETA ~{r.eta_minutes} min</span></span>
                      <button style={button} disabled={busy} onClick={() => dispatch(r.id)}><Truck size={12} /> Dispatch</button>
                    </div>
                  ))}
                </div>
              </div>

              <form style={{ display: 'flex', gap: 6 }} onSubmit={e => { e.preventDefault(); if (note.trim()) update({ note: note.trim() }).then(() => setNote('')); }}>
                <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Add a field note…"
                  style={{ ...select, flex: 1, padding: '6px 8px' }} />
                <button type="submit" style={button} disabled={busy || !note.trim()}><Send size={12} /></button>
              </form>
            </>
          )}

          {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}

          {incident.log.length > 0 && (
            <div style={{ borderTop: '1px solid hsl(var(--border) / 0.6)', paddingTop: 8 }}>
              {incident.log.map((l, i) => (
                <div key={i} style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                  {timeAgo(l.created_at)} · <span style={{ color: 'hsl(var(--foreground))' }}>{l.message}</span> · {l.actor}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
