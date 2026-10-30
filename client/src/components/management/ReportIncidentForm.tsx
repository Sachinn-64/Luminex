import { useState } from 'react';
import type { AxiosInstance } from 'axios';
import { Crosshair, Loader2, Siren } from 'lucide-react';
import { Mono } from '../disaster/ui';
import { BTN, BTN_DANGER, FIELD } from '../disaster/tokens';
import { INCIDENT_TYPES, apiError, type IncidentType, type Severity } from '../../lib/disasterApi';
import { cn } from '@/lib/utils';

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
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setMessage({ ok: false, text: 'Could not get your location; the event centre will be used.' });
        setLocating(false);
      },
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
        incident_type: type,
        title: title.trim() || undefined,
        description: description.trim(),
        lat: at.lat,
        lon: at.lon,
        ...(isAdmin ? { severity } : {}),
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
    <form onSubmit={submit} className="space-y-3">
      <div className={cn('grid gap-3', isAdmin && 'sm:grid-cols-2')}>
        <label className="block">
          <Mono className="mb-1.5 block">Type</Mono>
          <select className={cn(FIELD, 'cursor-pointer')} value={type} onChange={(e) => setType(e.target.value as IncidentType)}>
            {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        {isAdmin && (
          <label className="block">
            <Mono className="mb-1.5 block">Severity</Mono>
            <select className={cn(FIELD, 'cursor-pointer')} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              {(['low', 'moderate', 'high', 'critical'] as Severity[]).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
      </div>
      <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Short title (optional)" />
      <textarea
        className={cn(FIELD, 'min-h-[84px] resize-y')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
        placeholder="What is happening? How many people are affected?"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={locate} disabled={locating} className={BTN}>
          {locating ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />} Use my location
        </button>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
          {coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : 'Defaults to event centre'}
        </span>
      </div>
      <button type="submit" disabled={busy} className={cn(BTN_DANGER, 'w-full py-2.5')}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Siren size={15} />} Report incident
      </button>
      {message && (
        <div className={cn('rounded-lg border px-3 py-2 text-[12px]', message.ok ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-400' : 'border-red-400/30 bg-red-500/10 text-red-400')}>
          {message.text}
        </div>
      )}
    </form>
  );
}
