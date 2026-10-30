/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Circle, LayerGroup, Marker, Polyline, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import axios from 'axios';
import {
  Activity, AlertTriangle, Car, CloudSun, Droplets, Eye, Gauge, ShieldCheck, Thermometer, Users, Waves, Wind,
} from 'lucide-react';
import { useDisasterData } from '../../context/DisasterDataContext';
import { Bar, EmptyState, ErrorBanner, Mono, Panel, PanelHeader, Pill, Spinner, StatCard } from '../../components/disaster/ui';
import { riskColor, tint } from '../../components/disaster/tokens';
import { MapChip, MapFrame } from '../../components/disaster/map';
import { parseCoords, pinIcon } from '../../components/disaster/mapUtils';
import { cn } from '@/lib/utils';

const assemblyIcon = pinIcon('#10b981', '🏟');
const quakeIcon = pinIcon('#ef4444', '〰');

const fmtTime = (ts?: string) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

type LayerKey = 'crowd' | 'traffic' | 'assembly' | 'quakes' | 'routes';
const LAYERS: { key: LayerKey; label: string; color: string }[] = [
  { key: 'crowd', label: 'Crowd', color: '#10b981' },
  { key: 'traffic', label: 'Traffic', color: '#f59e0b' },
  { key: 'assembly', label: 'Assembly', color: '#22d3ee' },
  { key: 'quakes', label: 'Quakes', color: '#ef4444' },
  { key: 'routes', label: 'Evac routes', color: '#a78bfa' },
];

/* ------------------------------------------------------------------ */
/*  Map                                                                 */
/* ------------------------------------------------------------------ */

function LiveMap({ data, city, apiBaseUrl }: { data: any; city: any; apiBaseUrl: string }) {
  const [layers, setLayers] = useState<LayerKey[]>(['crowd', 'traffic', 'assembly']);
  const [assemblyPoints, setAssemblyPoints] = useState<any[]>([]);
  const [evacRoutes, setEvacRoutes] = useState<any[]>([]);

  useEffect(() => {
    axios.get(`${apiBaseUrl}/api/assembly-points`).then((r) => setAssemblyPoints(r.data.assembly_points || [])).catch(() => {});
    axios.get(`${apiBaseUrl}/api/evacuation-routes`).then((r) => setEvacRoutes(r.data.all_routes || [])).catch(() => {});
  }, [apiBaseUrl]);

  const toggle = (k: LayerKey) => setLayers((ls) => (ls.includes(k) ? ls.filter((l) => l !== k) : [...ls, k]));

  const center: [number, number] = city ? [city.lat, city.lon] : [17.6784, 75.3294];
  const crowdZones: any[] = data?.crowd?.zones || [];
  const trafficRoutes: any[] = data?.traffic?.routes || [];
  const quakes: any[] = (data?.earthquakes?.earthquakes || []).slice(0, 5);
  const parsedRoutes = useMemo(() => evacRoutes.map((r) => ({ ...r, coords: parseCoords(r.coordinates) })), [evacRoutes]);

  return (
    <MapFrame
      center={center}
      zoom={city?.zoom || 14}
      height={540}
      overlay={
        <>
          <div className="pointer-events-none absolute left-3 top-3 z-[1000]">
            <MapChip>
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                </span>
                <Mono className="text-white/80">Live · {city?.name || 'City'} monitor</Mono>
              </div>
              <div className="mt-1 text-[11.5px] text-white/60">{crowdZones.length} zones · {trafficRoutes.length} corridors</div>
            </MapChip>
          </div>
          <div className="pointer-events-none absolute right-3 top-3 z-[1000]">
            <MapChip className="p-1.5">
              <div className="flex flex-col gap-1">
                {LAYERS.map((l) => {
                  const on = layers.includes(l.key);
                  return (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => toggle(l.key)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11.5px] font-medium transition-colors',
                        on ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80',
                      )}
                    >
                      <span className="size-2 rounded-full" style={{ background: on ? l.color : 'rgba(255,255,255,.25)' }} />
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </MapChip>
          </div>
        </>
      }
    >
      {layers.includes('crowd') && (
        <LayerGroup>
          {crowdZones.map((z) => {
            const c = z.coordinates;
            if (!c || c.length < 2) return null;
            const color = riskColor(z.risk_level);
            return (
              <Circle key={z.id} center={[c[0], c[1]]} radius={520} pathOptions={{ color, fillColor: color, fillOpacity: 0.28, weight: 1.5 }}>
                <LeafletTooltip sticky>{z.name}</LeafletTooltip>
                <Popup>
                  <strong>{z.name}</strong>
                  <br />Density {(z.current_density * 100).toFixed(0)}% · {Math.round(z.capacity * z.current_density).toLocaleString()} people
                  <br />Capacity {z.capacity?.toLocaleString()}
                  <br /><span style={{ color, fontWeight: 700 }}>{String(z.risk_level).toUpperCase()} RISK</span>
                </Popup>
              </Circle>
            );
          })}
        </LayerGroup>
      )}
      {layers.includes('traffic') && (
        <LayerGroup>
          {trafficRoutes.map((r) => {
            if (!r.start_coords || !r.end_coords) return null;
            const color = riskColor(r.congestion_level);
            return (
              <Polyline
                key={r.id}
                positions={[[r.start_coords[0], r.start_coords[1]], [r.end_coords[0], r.end_coords[1]]]}
                pathOptions={{ color, weight: 4, opacity: 0.9, dashArray: r.status === 'closed' ? '8,6' : undefined }}
              >
                <Popup>
                  <strong>{r.name}</strong>
                  <br />{r.current_travel_time} min travel · {r.distance_km} km
                  <br /><span style={{ color, fontWeight: 700 }}>{String(r.congestion_level).toUpperCase()} CONGESTION</span>
                </Popup>
              </Polyline>
            );
          })}
        </LayerGroup>
      )}
      {layers.includes('assembly') && (
        <LayerGroup>
          {assemblyPoints.filter((p) => p.coordinates?.length >= 2).map((p) => (
            <Marker key={p.id} position={[p.coordinates[0], p.coordinates[1]]} icon={assemblyIcon}>
              <Popup>
                <strong>{p.name}</strong>
                <br />Assembly point · capacity {(p.capacity || 0).toLocaleString()}
              </Popup>
            </Marker>
          ))}
        </LayerGroup>
      )}
      {layers.includes('quakes') && (
        <LayerGroup>
          {quakes.filter((q) => q.latitude && q.longitude).map((q, i) => (
            <Marker key={i} position={[q.latitude, q.longitude]} icon={quakeIcon}>
              <Popup>
                <strong>M{q.magnitude?.toFixed(1)} earthquake</strong>
                <br />{q.place || q.location}
                <br />Depth {q.depth?.toFixed(1)} km
              </Popup>
            </Marker>
          ))}
        </LayerGroup>
      )}
      {layers.includes('routes') && (
        <LayerGroup>
          {parsedRoutes.filter((r) => r.coords.length >= 2).map((r) => (
            <Polyline key={`evac-${r.id}`} positions={r.coords} pathOptions={{ color: '#a78bfa', weight: 3, opacity: 0.9, dashArray: '6,5' }}>
              <Popup>
                <strong>{r.name}</strong>
                <br />{r.route_type} route · {r.status}
              </Popup>
            </Polyline>
          ))}
        </LayerGroup>
      )}
    </MapFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Side widgets                                                        */
/* ------------------------------------------------------------------ */

function RiskRing({ score, level }: { score: number; level: string }) {
  const color = riskColor(level);
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="relative size-[112px] shrink-0">
      <svg viewBox="0 0 112 112" className="size-full -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-foreground/[0.08]" />
        <circle
          cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          style={{ filter: `drop-shadow(0 0 8px ${tint(color, 0.6)})`, transition: 'stroke-dashoffset .8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-[28px] font-bold leading-none" style={{ color }}>{Math.round(score)}</span>
        <Mono className="mt-1">/ 100</Mono>
      </div>
    </div>
  );
}

const FACTOR_META: Record<string, { label: string; icon: typeof Users }> = {
  crowd_risk: { label: 'Crowd', icon: Users },
  weather_risk: { label: 'Weather', icon: CloudSun },
  earthquake_risk: { label: 'Earthquake', icon: Waves },
  traffic_risk: { label: 'Traffic', icon: Car },
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function DisasterDashboard() {
  const { dashboardData, loading, error, selectedCity, availableCities, API_BASE_URL } = useDisasterData();
  const city = availableCities.find((c) => c.id === selectedCity);

  if (loading) return <Spinner label="Loading intelligence feed" />;
  if (error) return <ErrorBanner>{error}</ErrorBanner>;

  const alerts: any[] = (dashboardData.alerts as any)?.alerts || (dashboardData.alerts as any[]) || [];
  const critical = alerts.filter((a) => a.priority === 'critical');
  const crowd: any = dashboardData.crowd || {};
  const zones: any[] = crowd.zones || [];
  const metrics: any = crowd.overall_metrics || {};
  const risk: any = dashboardData.risk_score || {};
  const weather: any = dashboardData.weather || {};
  const traffic: any = dashboardData.traffic || {};
  const quakes: any[] = (dashboardData.earthquakes as any)?.earthquakes || [];
  const riskLevel = String(risk.risk_level || 'low');
  const score = Number(risk.overall_score || 0);
  const trafficLevel = String(traffic.overall_conditions?.overall_level || 'good');

  return (
    <div className="space-y-5">
      {/* heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Mono className="mb-2 block">Live overview</Mono>
          <h1 className="font-heading text-[26px] font-bold leading-tight tracking-[-0.01em]">
            {city?.name || 'City'} operations center
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {city?.display_name} · refreshed {fmtTime(dashboardData.timestamp as string) || 'just now'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {critical.length > 0 ? (
            <Pill color="#ef4444" className="animate-pulse">{critical.length} critical alert{critical.length > 1 ? 's' : ''}</Pill>
          ) : (
            <Pill color="#10b981">All systems nominal</Pill>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Risk score" value={Math.round(score)} sub={`${riskLevel} level`} icon={Gauge} color={riskColor(riskLevel)} />
        <StatCard
          label="Crowd"
          value={metrics.current_occupancy != null ? Number(metrics.current_occupancy).toLocaleString() : '—'}
          sub={metrics.occupancy_percentage != null ? `${Math.round(metrics.occupancy_percentage)}% of capacity` : 'no data'}
          icon={Users}
          color="#6366f1"
        />
        <StatCard
          label="Active alerts"
          value={alerts.length}
          sub={`${critical.length} critical`}
          icon={AlertTriangle}
          color={critical.length ? '#ef4444' : '#10b981'}
        />
        <StatCard
          label="Temperature"
          value={weather.temperature != null ? `${Math.round(weather.temperature)}°` : '—'}
          sub={weather.description || 'no data'}
          icon={Thermometer}
          color="#f59e0b"
        />
        <StatCard
          label="Open routes"
          value={traffic.overall_conditions?.open_routes ?? '—'}
          sub={`${traffic.overall_conditions?.total_routes ?? 0} corridors · ${trafficLevel}`}
          icon={Car}
          color={riskColor(trafficLevel)}
        />
      </div>

      {/* map + side column */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <LiveMap data={dashboardData} city={city} apiBaseUrl={API_BASE_URL} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <Panel>
            <PanelHeader title="Composite risk index" />
            <div className="flex items-center gap-5">
              <RiskRing score={score} level={riskLevel} />
              <div className="min-w-0 flex-1">
                <Pill color={riskColor(riskLevel)}>{riskLevel} risk</Pill>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  Weighted from crowd, weather, seismic and traffic signals.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {Object.entries(FACTOR_META).map(([key, meta]) => {
                const raw = Number(risk.risk_factors?.[key] ?? 0);
                const v = raw <= 1 ? raw * 100 : raw;
                const color = v >= 75 ? '#ef4444' : v >= 50 ? '#f59e0b' : v >= 25 ? '#eab308' : '#10b981';
                return (
                  <div key={key}>
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-1.5 text-foreground/85">
                        <meta.icon size={12} className="text-muted-foreground" /> {meta.label}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">{Math.round(v)}</span>
                    </div>
                    <Bar value={v} color={color} />
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel className="flex min-h-[260px] flex-col">
            <PanelHeader
              title="Alert feed"
              action={<Pill color={alerts.length ? '#ef4444' : '#10b981'}>{alerts.length} active</Pill>}
            />
            {alerts.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="All clear" hint="No active alerts for this city." className="flex-1 py-6" />
            ) : (
              <div className="-mx-2 flex-1 space-y-1 overflow-auto">
                {alerts.slice(0, 8).map((a, i) => {
                  const color = riskColor(a.priority);
                  return (
                    <div key={a.id || i} className="flex gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-foreground/[0.04]">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-medium text-foreground">{a.message || a.type || 'Alert'}</div>
                        <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          <span style={{ color }}>{a.priority}</span>
                          <span>{fmtTime(a.created_at || a.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* detail row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* weather */}
        <Panel>
          <PanelHeader title="Weather status" action={<CloudSun size={16} className="text-amber-400" />} />
          {weather.temperature != null ? (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-heading text-[40px] font-bold leading-none">{Math.round(weather.temperature)}°C</div>
                  <div className="mt-1.5 text-[12.5px] capitalize text-muted-foreground">{weather.description}</div>
                </div>
                <Pill color="#f59e0b" dot={false}>{weather.data_source === 'openweathermap' ? 'Live' : 'Simulated'}</Pill>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  { icon: Droplets, label: 'Humidity', value: `${weather.humidity}%` },
                  { icon: Wind, label: 'Wind', value: `${Math.round(weather.wind_speed || 0)} m/s` },
                  { icon: Eye, label: 'Visibility', value: `${((weather.visibility || 10000) / 1000).toFixed(1)} km` },
                  { icon: Thermometer, label: 'Feels like', value: `${Math.round(weather.feels_like ?? weather.temperature)}°C` },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 dark:border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-muted-foreground"><m.icon size={12} /><Mono>{m.label}</Mono></div>
                    <div className="mt-1 text-[14px] font-semibold">{m.value}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={CloudSun} title="No weather data" color="#f59e0b" />
          )}
        </Panel>

        {/* crowd zones */}
        <Panel>
          <PanelHeader title="Crowd zones" action={<Pill color={metrics.zones_at_capacity ? '#ef4444' : '#6366f1'} dot={false}>{metrics.zones_at_capacity || 0} at capacity</Pill>} />
          {zones.length === 0 ? (
            <EmptyState icon={Users} title="No zone telemetry" color="#6366f1" />
          ) : (
            <div className="space-y-3.5">
              {zones.slice(0, 6).map((z) => {
                const d = Number(z.current_density || 0) * 100;
                const color = riskColor(z.risk_level);
                return (
                  <div key={z.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[12.5px]">
                      <span className="truncate font-medium text-foreground/90">{z.name}</span>
                      <span className="shrink-0 font-mono text-[11px]" style={{ color }}>{d.toFixed(0)}%</span>
                    </div>
                    <Bar value={d} color={color} />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* traffic */}
        <Panel>
          <PanelHeader title="Traffic conditions" action={<Pill color={riskColor(trafficLevel)}>{trafficLevel}</Pill>} />
          {!traffic.routes?.length ? (
            <EmptyState icon={Car} title="No traffic data" color="#f59e0b" />
          ) : (
            <div className="space-y-2">
              {traffic.routes.slice(0, 5).map((r: any) => {
                const color = riskColor(r.congestion_level);
                const delay = r.current_travel_time - r.normal_travel_time;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2 dark:border-white/[0.06]">
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-medium">{r.name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {r.distance_km} km · {r.status}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[14px] font-semibold" style={{ color }}>{r.current_travel_time}<span className="text-[11px] text-muted-foreground"> min</span></div>
                      {delay > 0 && <div className="font-mono text-[10px] text-amber-400">+{delay} delay</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* seismic */}
        <Panel>
          <PanelHeader title="Seismic activity" action={<Pill color={quakes.length ? '#f59e0b' : '#10b981'} dot={false}>{quakes.length} events</Pill>} />
          {quakes.length === 0 ? (
            <EmptyState icon={Activity} title="No recent seismic activity" hint="Monitoring USGS feeds within 500 km." />
          ) : (
            <div className="space-y-2">
              {quakes.slice(0, 4).map((q, i) => {
                const strong = q.magnitude >= 4;
                const color = strong ? '#ef4444' : '#f59e0b';
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2 dark:border-white/[0.06]">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border font-mono text-[12px] font-bold" style={{ color, borderColor: tint(color, 0.3), background: tint(color, 0.12) }}>
                      M{q.magnitude?.toFixed(1)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-medium">{q.place || q.location || 'Unknown location'}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{q.depth?.toFixed(0)} km deep · {fmtTime(q.time)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
