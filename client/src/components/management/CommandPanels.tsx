import { useState } from 'react';
import type { AxiosInstance } from 'axios';
import { Loader2, Megaphone } from 'lucide-react';
import { Rows } from '../disaster/ui';
import { BTN_PRIMARY, FIELD, riskColor, tint } from '../disaster/tokens';
import { apiError, type HazardLayer, type Resource } from '../../lib/disasterApi';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = { available: '#10b981', deployed: '#f59e0b', maintenance: '#64748b' };

export function BroadcastPanel({ api }: { api: AxiosInstance }) {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('high');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try {
      await api.post('/api/management/broadcast', { message: message.trim(), priority });
      setResult({ ok: true, text: 'Alert broadcast to all dashboards.' });
      setMessage('');
    } catch (err) {
      setResult({ ok: false, text: apiError(err, 'Broadcast failed') });
    } finally {
      setBusy(false);
    }
  };

  const pColor = riskColor(priority);

  return (
    <form onSubmit={send} className="space-y-3">
      <textarea
        className={cn(FIELD, 'min-h-[76px] resize-y')}
        value={message}
        maxLength={500}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. Heavy rain expected after 6 PM. Avoid Chandrabhaga ghat."
      />
      <div className="flex gap-2">
        <select
          className={cn(FIELD, 'w-auto cursor-pointer font-mono text-[11px] uppercase tracking-[0.1em]')}
          style={{ color: pColor, borderColor: tint(pColor, 0.4) }}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="submit" disabled={busy || !message.trim()} className={cn(BTN_PRIMARY, 'flex-1')}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Megaphone size={13} />} Broadcast
        </button>
      </div>
      {result && (
        <div className={cn('rounded-lg border px-3 py-2 text-[12px]', result.ok ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-400' : 'border-red-400/30 bg-red-500/10 text-red-400')}>
          {result.text}
        </div>
      )}
    </form>
  );
}

export function ResourceRoster({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) return <div className="text-[12.5px] text-muted-foreground">No resources registered.</div>;
  return (
    <Rows className="-mx-1 max-h-[300px] overflow-y-auto px-1">
      {resources.map((r) => {
        const color = STATUS_COLORS[r.status] || '#64748b';
        return (
          <div key={r.id} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
            <div className="min-w-0">
              <div className="truncate font-medium">{r.name}</div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">{r.resource_type.replace(/_/g, ' ')}</div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color, borderColor: tint(color, 0.35), background: tint(color, 0.1) }}>
              <span className="size-1.5 rounded-full" style={{ background: color }} />
              {r.status}{r.incident_id ? ` · #${r.incident_id}` : ''}
            </span>
          </div>
        );
      })}
    </Rows>
  );
}

export function RouteControl({ api, routes, onChanged }: { api: AxiosInstance; routes: HazardLayer['evacuation_routes']; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const toggle = async (id: number, status: string) => {
    setBusyId(id);
    try {
      await api.put(`/api/admin/evacuation-routes/${id}`, { status: status === 'open' ? 'closed' : 'open' });
      onChanged();
    } catch (err) {
      setError(apiError(err, 'Could not update route'));
    } finally {
      setBusyId(null);
    }
  };
  return (
    <div>
      <Rows>
        {routes.map((r) => {
          const open = r.status === 'open';
          const color = open ? '#10b981' : '#ef4444';
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
              <span className="min-w-0 truncate font-medium">{r.name}</span>
              <button
                type="button"
                onClick={() => toggle(r.id, r.status)}
                disabled={busyId === r.id}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-foreground/[0.06] disabled:opacity-50"
                style={{ color, borderColor: tint(color, 0.4), background: tint(color, 0.1) }}
                title={open ? 'Close this route' : 'Open this route'}
              >
                {busyId === r.id ? <Loader2 size={10} className="animate-spin" /> : <span className="size-1.5 rounded-full" style={{ background: color }} />}
                {open ? 'open' : 'closed'}
              </button>
            </div>
          );
        })}
      </Rows>
      {error && <div className="mt-2 text-[12px] text-red-400">{error}</div>}
    </div>
  );
}
