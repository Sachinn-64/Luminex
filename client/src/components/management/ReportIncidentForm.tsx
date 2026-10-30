import { useState } from 'react';
import type { AxiosInstance } from 'axios';
import { Crosshair, Loader2, Siren } from 'lucide-react';
import { INCIDENT_TYPES, apiError, type IncidentType, type Severity } from '../../lib/disasterApi';

const field = {
  width: '100%', fontSize: 13, padding: '8px 10px', borderRadius: 8, boxSizing: 'border-box' as const,
  border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
};

interface Props {
  api: AxiosInstance;
  isAdmin: boolean;
  fallback: { lat: number; lon: number };
  onReported: () => void;
}

export default function ReportIncidentForm({ api, isAdmin, fallback, onReported }: Props) {
  const [type, setType] = useState<IncidentType>('medical');
  const [severity, setSeverity] = useState<Severity>('high');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const locate = () => {
    if (!navigator.geolocation) return setMessage({ ok: false, text: 'Location is not available in this browser.' });
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocating(false); },
      () => { setMessage({ ok: false, text: 'Could not get your location; the event centre will be used.' }); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const at = coords || fallback;
    try {
      const { data } = await api.post('/api/management/incidents', {
        incident_type: type, title: title.trim() || undefined, description: description.trim(),
        lat: at.lat, lon: at.lon, ...(isAdmin ? { severity } : {}),
      });
      setMessage({ ok: true, text: `Incident #${data.incident.id} reported. The control room has been alerted.` });
      setTitle('');
      setDescription('');
      onReported();
    } catch (err) {
      setMessage({ ok: false, text: apiError(err, 'Could not report the incident.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
      <select style={field} value={type} onChange={e => setType(e.target.value as IncidentType)}>
        {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      {isAdmin && (
        <select style={field} value={severity} onChange={e => setSeverity(e.target.value as Severity)}>
          {(['low', 'moderate', 'high', 'critical'] as Severity[]).map(s => <option key={s} value={s}>Severity: {s}</option>)}
        </select>
      )}
      <input style={field} value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Short title (optional)" />
      <textarea style={{ ...field, minHeight: 70, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)}
        maxLength={500} placeholder="What is happening? How many people are affected?" />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={locate} disabled={locating} style={{ ...field, width: 'auto', cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          {locating ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />} Use my location
        </button>
        <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
          {coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : 'Defaults to event centre'}
        </span>
      </div>
      <button type="submit" disabled={busy} style={{
        ...field, cursor: 'pointer', fontWeight: 700, border: 'none', display: 'inline-flex', justifyContent: 'center', gap: 8, alignItems: 'center',
        background: '#dc2626', color: '#fff',
      }}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Siren size={16} />} Report incident
      </button>
      {message && <div style={{ fontSize: 12, color: message.ok ? '#16a34a' : '#ef4444' }}>{message.text}</div>}
    </form>
  );
}
