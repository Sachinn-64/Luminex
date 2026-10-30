import { useState } from 'react';
import type { AxiosInstance } from 'axios';
import { Megaphone } from 'lucide-react';
import { apiError, type HazardLayer, type Resource } from '../../lib/disasterApi';

const field = {
  fontSize: 13, padding: '8px 10px', borderRadius: 8, boxSizing: 'border-box' as const,
  border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
};
const STATUS_COLORS: Record<string, string> = { available: '#16a34a', deployed: '#ea580c', maintenance: '#64748b' };

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

  return (
    <form onSubmit={send} style={{ display: 'grid', gap: 8 }}>
      <textarea style={{ ...field, minHeight: 60, resize: 'vertical' }} value={message} maxLength={500}
        onChange={e => setMessage(e.target.value)} placeholder="e.g. Heavy rain expected after 6 PM. Avoid Chandrabhaga ghat." />
      <div style={{ display: 'flex', gap: 8 }}>
        <select style={field} value={priority} onChange={e => setPriority(e.target.value)}>
          {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button type="submit" disabled={busy || !message.trim()} style={{ ...field, flex: 1, cursor: 'pointer', fontWeight: 700, display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <Megaphone size={14} /> Broadcast
        </button>
      </div>
      {result && <div style={{ fontSize: 12, color: result.ok ? '#16a34a' : '#ef4444' }}>{result.text}</div>}
    </form>
  );
}

export function ResourceRoster({ resources }: { resources: Resource[] }) {
  return (
    <div style={{ display: 'grid', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
      {resources.map(r => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'hsl(var(--foreground))' }}>
          <span>{r.name} <span style={{ color: 'hsl(var(--muted-foreground))' }}>· {r.resource_type.replace('_', ' ')}</span></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'hsl(var(--muted-foreground))' }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: STATUS_COLORS[r.status] }} />
            {r.status}{r.incident_id ? ` → #${r.incident_id}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RouteControl({ api, routes, onChanged }: {
  api: AxiosInstance; routes: HazardLayer['evacuation_routes']; onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const toggle = async (id: number, status: string) => {
    try {
      await api.put(`/api/admin/evacuation-routes/${id}`, { status: status === 'open' ? 'closed' : 'open' });
      onChanged();
    } catch (err) {
      setError(apiError(err, 'Could not update route'));
    }
  };
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {routes.map(r => (
        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12, color: 'hsl(var(--foreground))' }}>
          <span>{r.name}</span>
          <button onClick={() => toggle(r.id, r.status)} style={{
            ...field, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 700,
            color: r.status === 'open' ? '#16a34a' : '#ef4444',
          }}>{r.status === 'open' ? 'OPEN' : 'CLOSED'}</button>
        </div>
      ))}
      {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
    </div>
  );
}
