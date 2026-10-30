import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Map as MapIcon, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDisasterData } from '../context/DisasterDataContext';
import { LevelBadge, SectionTitle } from '../components/disaster/ui';
import { panel } from '../components/disaster/styles';
import IncidentCard from '../components/management/IncidentCard';
import ReportIncidentForm from '../components/management/ReportIncidentForm';
import { BroadcastPanel, ResourceRoster, RouteControl } from '../components/management/CommandPanels';
import {
  apiError, disasterClient,
  type HazardLayer, type Incident, type ManagementSummary, type Resource,
} from '../lib/disasterApi';

const POLL_MS = 15000;

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export default function DisasterManagement() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { selectedCity, availableCities } = useDisasterData();
  const isAdmin = profile?.role === 'admin';
  const api = useMemo(() => disasterClient(profile?.role, profile?.name), [profile?.role, profile?.name]);
  const city = availableCities.find(c => c.id === selectedCity) || availableCities[0];

  const [summary, setSummary] = useState<ManagementSummary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [layer, setLayer] = useState<HazardLayer | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [overview, list, res, hazards] = await Promise.all([
        api.get('/api/management/overview'),
        api.get('/api/management/incidents', { params: { status: showResolved ? 'all' : 'active' } }),
        api.get('/api/management/resources'),
        api.get<HazardLayer>('/api/management/hazards', { params: { city: selectedCity } }),
      ]);
      setSummary(overview.data.summary);
      setIncidents(list.data.incidents);
      setResources(res.data.resources);
      setLayer(hazards.data);
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not reach the disaster backend (port 5001).'));
    } finally {
      setLoading(false);
    }
  }, [api, showResolved, selectedCity]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const nearestAssembly = useMemo(() => {
    if (!layer || !city) return null;
    return layer.assembly_points
      .filter(p => p.status === 'active')
      .map(p => ({ ...p, km: haversineKm({ lat: city.lat, lon: city.lon }, { lat: p.coordinates[0], lon: p.coordinates[1] }) }))
      .sort((a, b) => a.km - b.km)[0] || null;
  }, [layer, city]);

  if (loading) {
    return <div style={{ ...panel, display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 className="animate-spin" /></div>;
  }

  const stats = summary ? [
    { label: 'Active incidents', value: summary.active_incidents },
    { label: 'Critical', value: summary.critical_incidents },
    { label: 'Awaiting dispatch', value: summary.unassigned_incidents },
    { label: 'Resolved today', value: summary.resolved_today },
    { label: 'Resources free', value: `${summary.resources_available}/${summary.resources_total}` },
  ] : [];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'hsl(var(--foreground))' }}>
            {isAdmin ? 'Incident command centre' : 'Disaster management'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
            {isAdmin
              ? 'Triage incidents, dispatch the nearest resources, control evacuation routes and broadcast alerts'
              : 'Report an emergency, follow active incidents and find your nearest safe assembly point'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {layer && <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>24h outlook <LevelBadge level={layer.outlook.next_24h_level} /></span>}
          <button onClick={load} title="Refresh" style={{ padding: 6, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer', display: 'flex' }}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && <div style={{ ...panel, borderColor: '#ef444466', color: 'hsl(var(--foreground))' }}>{error}</div>}

      {isAdmin && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {stats.map(s => (
            <div key={s.label} style={panel}>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'hsl(var(--foreground))' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {layer && layer.outlook.warnings.length > 0 && (
        <div style={{ ...panel, padding: '10px 14px', fontSize: 13, color: 'hsl(var(--foreground))' }}>
          <strong>Predicted in the next 24h:</strong>{' '}
          {layer.outlook.warnings.map(w => `${w.hazard} in ~${Math.round(w.lead_time_hours)}h (${w.level})`).join(' · ')}
          {' '}<button onClick={() => navigate('/disaster-prediction')} style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', fontSize: 13 }}>View forecast →</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={panel}>
          <SectionTitle right={
            <label style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} /> Show resolved
            </label>
          }>
            {isAdmin ? 'Incident board' : 'Active incidents'} ({incidents.length})
          </SectionTitle>
          {incidents.length === 0 && <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: 0 }}>No active incidents.</p>}
          <div style={{ display: 'grid', gap: 10 }}>
            {incidents.map(i => <IncidentCard key={i.id} incident={i} api={api} isAdmin={isAdmin} onChanged={load} />)}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div style={panel}>
            <SectionTitle>Report an incident</SectionTitle>
            <ReportIncidentForm api={api} isAdmin={isAdmin} fallback={{ lat: city.lat, lon: city.lon }} onReported={load} />
          </div>

          {!isAdmin && nearestAssembly && (
            <div style={panel}>
              <SectionTitle>Nearest safe assembly point</SectionTitle>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{nearestAssembly.name}</div>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '4px 0 10px' }}>
                {nearestAssembly.km.toFixed(1)} km from the event centre · capacity {nearestAssembly.capacity.toLocaleString()}
              </div>
              <button onClick={() => navigate('/ai-map')} style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <MapIcon size={14} /> Get safe route on AI map
              </button>
            </div>
          )}

          {isAdmin && (
            <>
              <div style={panel}><SectionTitle>Broadcast public alert</SectionTitle><BroadcastPanel api={api} /></div>
              {layer && (
                <div style={panel}>
                  <SectionTitle>Evacuation routes</SectionTitle>
                  <RouteControl api={api} routes={layer.evacuation_routes} onChanged={load} />
                </div>
              )}
              <div style={panel}><SectionTitle>Response resources</SectionTitle><ResourceRoster resources={resources} /></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
