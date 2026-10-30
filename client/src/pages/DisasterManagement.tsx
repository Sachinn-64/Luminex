import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertOctagon, ArrowUpRight, CheckCircle2, ClipboardList, Map as MapIcon, Megaphone, Navigation, RefreshCw, Route, Siren, Truck, Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDisasterData } from '../context/DisasterDataContext';
import { EmptyState, ErrorBanner, LevelBadge, Mono, PageHeader, Panel, PanelHeader, Spinner, StatCard } from '../components/disaster/ui';
import { BTN, tint } from '../components/disaster/tokens';
import IncidentCard from '../components/management/IncidentCard';
import ReportIncidentForm from '../components/management/ReportIncidentForm';
import { BroadcastPanel, ResourceRoster, RouteControl } from '../components/management/CommandPanels';
import {
  apiError, disasterClient, LEVEL_COLORS,
  type HazardLayer, type Incident, type ManagementSummary, type Resource,
} from '../lib/disasterApi';
import { cn } from '@/lib/utils';

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
  const city = availableCities.find((c) => c.id === selectedCity) || availableCities[0];

  const [summary, setSummary] = useState<ManagementSummary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [layer, setLayer] = useState<HazardLayer | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core board data first; the hazard/outlook layer is fetched separately so a slow
  // forecaster never blocks the page from rendering.
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [overview, list, res] = await Promise.all([
        api.get('/api/management/overview'),
        api.get('/api/management/incidents', { params: { status: showResolved ? 'all' : 'active' } }),
        api.get('/api/management/resources'),
      ]);
      setSummary(overview.data.summary);
      setIncidents(list.data.incidents);
      setResources(res.data.resources);
      setError(null);
    } catch (err) {
      setError(apiError(err, 'Could not reach the disaster backend (port 5001).'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    api
      .get<HazardLayer>('/api/management/hazards', { params: { city: selectedCity } })
      .then((h) => setLayer(h.data))
      .catch(() => {});
  }, [api, showResolved, selectedCity]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const nearestAssembly = useMemo(() => {
    if (!layer || !city) return null;
    return (
      layer.assembly_points
        .filter((p) => p.status === 'active')
        .map((p) => ({ ...p, km: haversineKm({ lat: city.lat, lon: city.lon }, { lat: p.coordinates[0], lon: p.coordinates[1] }) }))
        .sort((a, b) => a.km - b.km)[0] || null
    );
  }, [layer, city]);

  if (loading) return <Spinner label="Connecting to the control room" />;

  const outlookColor = layer ? LEVEL_COLORS[layer.outlook.next_24h_level] : '#10b981';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isAdmin ? 'Command centre' : 'Disaster management'}
        title={isAdmin ? 'Incident command centre' : 'Report & follow incidents'}
        description={
          isAdmin
            ? 'Triage incidents, dispatch the nearest resources, control evacuation routes and broadcast public alerts.'
            : 'Report an emergency, follow active incidents and find your nearest safe assembly point.'
        }
        action={
          <>
            {layer && (
              <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                24h outlook <LevelBadge level={layer.outlook.next_24h_level} />
              </span>
            )}
            <button type="button" onClick={load} className={BTN} disabled={refreshing} title="Refresh">
              <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} /> Refresh
            </button>
          </>
        }
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {isAdmin && summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Active incidents" value={summary.active_incidents} sub="open on the board" icon={Siren} color={summary.active_incidents ? '#f59e0b' : '#10b981'} />
          <StatCard label="Critical" value={summary.critical_incidents} sub="need immediate action" icon={AlertOctagon} color={summary.critical_incidents ? '#ef4444' : '#10b981'} />
          <StatCard label="Awaiting dispatch" value={summary.unassigned_incidents} sub="no resource assigned" icon={ClipboardList} color={summary.unassigned_incidents ? '#eab308' : '#6366f1'} />
          <StatCard label="Resolved today" value={summary.resolved_today} sub="closed since midnight" icon={CheckCircle2} color="#10b981" />
          <StatCard
            label="Resources free"
            value={`${summary.resources_available}/${summary.resources_total}`}
            sub={`${summary.resources_deployed} deployed`}
            icon={Truck}
            color="#22d3ee"
          />
        </div>
      )}

      {layer && layer.outlook.warnings.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-[13px]" style={{ borderColor: tint(outlookColor, 0.35), background: tint(outlookColor, 0.08) }}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ color: outlookColor, background: tint(outlookColor, 0.15) }}>
            <AlertOctagon size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <Mono className="block" style={{ color: outlookColor }}>Predicted in the next 24h</Mono>
            <div className="mt-0.5 text-foreground">
              {layer.outlook.warnings.map((w) => `${w.hazard} in ~${Math.round(w.lead_time_hours)}h (${w.level})`).join(' · ')}
            </div>
          </div>
          <button type="button" onClick={() => navigate('/disaster-prediction')} className={cn(BTN, 'shrink-0')}>
            View forecast <ArrowUpRight size={13} />
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* incident board */}
        <Panel>
          <PanelHeader
            title={`${isAdmin ? 'Incident board' : 'Active incidents'} · ${incidents.length}`}
            meta={isAdmin ? 'Expand an incident to change status, dispatch resources or add field notes.' : 'Live from the control room, refreshed every 15 seconds.'}
            action={
              <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[12px] text-muted-foreground">
                <input type="checkbox" className="size-3.5 accent-[hsl(var(--primary))]" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
                Show resolved
              </label>
            }
          />
          {incidents.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No active incidents" hint="New reports from pilgrims and sensors appear here instantly." />
          ) : (
            <div className="space-y-2.5">
              {incidents.map((i) => (
                <IncidentCard key={i.id} incident={i} api={api} isAdmin={isAdmin} onChanged={load} />
              ))}
            </div>
          )}
        </Panel>

        {/* side column */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Report an incident" action={<Siren size={15} className="text-red-400" />} />
            <ReportIncidentForm api={api} isAdmin={isAdmin} fallback={{ lat: city.lat, lon: city.lon }} onReported={load} />
          </Panel>

          {!isAdmin && nearestAssembly && (
            <Panel className="border-emerald-400/25 bg-emerald-500/[0.06]">
              <PanelHeader title="Nearest safe assembly point" action={<Navigation size={15} className="text-emerald-400" />} />
              <div className="text-[15px] font-semibold">{nearestAssembly.name}</div>
              <div className="mt-1 text-[12.5px] text-muted-foreground">
                {nearestAssembly.km.toFixed(1)} km from the event centre · capacity {nearestAssembly.capacity.toLocaleString()}
              </div>
              <button type="button" onClick={() => navigate('/ai-map')} className={cn(BTN, 'mt-4 w-full')}>
                <MapIcon size={14} /> Get a safe route on the AI map
              </button>
            </Panel>
          )}

          {isAdmin && (
            <>
              <Panel>
                <PanelHeader title="Broadcast public alert" action={<Megaphone size={15} className="text-brand-400" />} />
                <BroadcastPanel api={api} />
              </Panel>
              {layer && (
                <Panel>
                  <PanelHeader title="Evacuation routes" meta="Toggle a corridor open or closed" action={<Route size={15} className="text-violet-400" />} />
                  <RouteControl api={api} routes={layer.evacuation_routes} onChanged={load} />
                </Panel>
              )}
              <Panel>
                <PanelHeader title="Response resources" meta={`${resources.filter((r) => r.status === 'available').length} of ${resources.length} available`} action={<Users size={15} className="text-cyan-400" />} />
                <ResourceRoster resources={resources} />
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
