/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, LinearProgress, Chip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
  ReportProblem as AlertIcon, Groups as CrowdIcon, WbSunny as WeatherIcon,
  DirectionsCar as TrafficIcon, FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Circle, Popup, Marker, Polyline, LayerGroup, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { useDisasterData } from '../../context/DisasterDataContext';
import 'leaflet/dist/leaflet.css';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

const createSvgIcon = (color: string, symbol: string) => L.divIcon({
  html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:${color};border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:13px;">${symbol}</span></div>`,
  className: '', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -34],
});
const assemblyIcon = createSvgIcon('#2ED573', '🏟');
const quakeIcon = createSvgIcon('#FF4757', '🌊');
const RISK_STYLE: Record<string, { fillColor: string; color: string }> = { critical: { fillColor: '#FF4757', color: '#FF4757' }, high: { fillColor: '#FFA502', color: '#FFA502' }, moderate: { fillColor: '#FFD700', color: '#FFD700' }, low: { fillColor: '#2ED573', color: '#2ED573' } };
const CONGESTION_STYLE: Record<string, { color: string; weight: number }> = { severe: { color: '#FF4757', weight: 4 }, high: { color: '#FFA502', weight: 3 }, moderate: { color: '#FFD700', weight: 2.5 }, low: { color: '#2ED573', weight: 2 } };

const RISK_COLORS: Record<string, string> = { critical: '#FF4757', high: '#FFA502', moderate: '#FFD700', low: '#2ED573' };
const riskColor = (level?: string) => RISK_COLORS[level?.toLowerCase() || ''] || RISK_COLORS.low;
const fmtTime = (ts?: string) => {
  if (!ts) return '';
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

const KpiCard = ({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: any; sub: string; accent: string }) => (
  <Card sx={{ height: '100%', background: 'rgba(17,24,39,0.85)', border: `1px solid ${accent}20`, position: 'relative', overflow: 'hidden', borderRadius: 3 }}>
    <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: accent, borderRadius: '4px 0 0 4px' }} />
    <CardContent sx={{ pl: 2.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.68rem', letterSpacing: 0.5 }}>{label}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#F0F4FF', lineHeight: 1.1, mt: 0.25 }}>{value}</Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.7rem' }}>{sub}</Typography>
        </Box>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, background: `${accent}15`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

const AlertItem = ({ alert }: { alert: any }) => {
  const color = riskColor(alert.priority);
  return (
    <Box sx={{ display: 'flex', gap: 1.5, py: 1, borderBottom: '1px solid rgba(255,255,255,0.04)', '&:last-child': { borderBottom: 'none' } }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, mt: 0.6, boxShadow: alert.priority === 'critical' ? `0 0 8px ${color}` : 'none' }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ color: '#F0F4FF', fontWeight: 600, fontSize: '0.78rem', lineHeight: 1.3 }}>{alert.message || alert.type || 'Alert'}</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.25, alignItems: 'center' }}>
          <Chip label={alert.priority?.toUpperCase()} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}30` }} />
          <Typography variant="caption" sx={{ color: '#4A5568', fontSize: '0.65rem' }}>{fmtTime(alert.created_at || alert.timestamp)}</Typography>
        </Box>
      </Box>
    </Box>
  );
};

const ZoneRow = ({ zone }: { zone: any }) => {
  const density = zone.current_density || 0;
  const color = riskColor(zone.risk_level);
  return (
    <Box sx={{ py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.04)', '&:last-child': { borderBottom: 'none' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
        <Typography variant="caption" sx={{ color: '#CBD5E1', fontWeight: 600, fontSize: '0.73rem' }}>{zone.name}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" sx={{ color, fontWeight: 700, fontSize: '0.7rem' }}>{(density * 100).toFixed(0)}%</Typography>
          <DotIcon sx={{ fontSize: 8, color }} />
        </Box>
      </Box>
      <LinearProgress variant="determinate" value={density * 100} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${color}80, ${color})` } }} />
    </Box>
  );
};

const WeatherSummary = ({ weather }: { weather: any }) => {
  if (!weather?.temperature) return null;
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(30,58,138,0.15)', border: '1px solid rgba(59,130,246,0.2)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#F0F4FF', lineHeight: 1 }}>{Math.round(weather.temperature)}°C</Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'capitalize' }}>{weather.description}</Typography>
        </Box>
        <WeatherIcon sx={{ fontSize: 36, color: '#FFB74D' }} />
      </Box>
      <Grid container spacing={1}>
        {[
          { label: 'Humidity', value: `${weather.humidity}%` },
          { label: 'Wind', value: `${Math.round(weather.wind_speed)} m/s` },
          { label: 'Visibility', value: `${((weather.visibility || 10000) / 1000).toFixed(1)} km` },
          { label: 'Feels like', value: `${Math.round(weather.feels_like)}°C` },
        ].map(({ label, value }) => (
          <Grid key={label} item xs={6}>
            <Typography variant="caption" sx={{ color: '#4A5568', fontSize: '0.65rem', fontWeight: 600 }}>{label}</Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.75rem' }}>{value}</Typography>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const TrafficStatus = ({ traffic }: { traffic: any }) => {
  if (!traffic?.routes) return null;
  const overall = traffic.overall_conditions?.overall_level || 'good';
  const tColors: Record<string, string> = { good: '#2ED573', moderate: '#FFD700', poor: '#FFA502', severe: '#FF4757' };
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.7rem', letterSpacing: 0.5 }}>TRAFFIC CONDITIONS</Typography>
        <Chip label={overall.toUpperCase()} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, background: `${tColors[overall] || '#2ED573'}15`, color: tColors[overall] || '#2ED573', border: `1px solid ${tColors[overall] || '#2ED573'}30` }} />
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {traffic.routes.slice(0, 4).map((route: any) => {
          const c = tColors[route.congestion_level] || '#2ED573';
          return (
            <Box key={route.id} sx={{ flex: '1 1 48%', p: 0.75, borderRadius: 1.5, background: `${c}08`, border: `1px solid ${c}20` }}>
              <Typography variant="caption" sx={{ color: '#CBD5E1', fontSize: '0.65rem', fontWeight: 600, display: 'block' }}>{route.name.split(' ').slice(0, 3).join(' ')}</Typography>
              <Typography variant="caption" sx={{ color: c, fontSize: '0.65rem', fontWeight: 700 }}>{route.current_travel_time}min • {route.status === 'open' ? 'OPEN' : 'CLOSED'}</Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const QuakeList = ({ earthquakes }: { earthquakes: any }) => {
  const quakes = earthquakes?.earthquakes?.slice(0, 4) || [];
  if (quakes.length === 0) return <Typography variant="caption" sx={{ color: '#4A5568' }}>No recent seismic activity</Typography>;
  return (
    <Box>
      {quakes.map((q: any, i: number) => (
        <Box key={i} sx={{ display: 'flex', gap: 1.5, py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.04)', '&:last-child': { borderBottom: 'none' } }}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, background: q.magnitude >= 4 ? 'rgba(255,71,87,0.15)' : 'rgba(255,165,2,0.1)', border: `1px solid ${q.magnitude >= 4 ? 'rgba(255,71,87,0.3)' : 'rgba(255,165,2,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.7rem', color: q.magnitude >= 4 ? '#FF4757' : '#FFA502' }}>M{q.magnitude?.toFixed(1)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#CBD5E1', fontSize: '0.72rem', fontWeight: 600, display: 'block', lineHeight: 1.2 }}>{q.place || q.location || 'Unknown location'}</Typography>
            <Typography variant="caption" sx={{ color: '#4A5568', fontSize: '0.65rem' }}>{q.depth?.toFixed(0)} km deep • {fmtTime(q.time)}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const RiskGauge = ({ score, level }: { score: number; level: string }) => {
  const color = riskColor(level);
  return (
    <Box sx={{ textAlign: 'center', p: 1 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant="determinate" value={score} size={90} thickness={5} sx={{ color, filter: `drop-shadow(0 0 8px ${color}60)` }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color, lineHeight: 1 }}>{score}</Typography>
          <Typography sx={{ fontSize: '0.55rem', color: '#94A3B8', fontWeight: 600, letterSpacing: 0.4 }}>/100</Typography>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color, fontWeight: 700, fontSize: '0.7rem', letterSpacing: 1 }}>{level?.toUpperCase()} RISK</Typography>
      <Box sx={{ mt: 1.5, textAlign: 'left' }}>
        {['crowd', 'weather', 'earthquake', 'traffic'].map(key => {
          const val = Math.round(score * 0.5);
          return (
            <Box key={key} sx={{ mb: 0.6 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem', textTransform: 'capitalize' }}>{key}</Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem' }}>{val}</Typography>
              </Box>
              <LinearProgress variant="determinate" value={Math.min(100, val)} sx={{ height: 3, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${color}60, ${color})` } }} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const DashboardMap = ({ data, cityConfig, apiBaseUrl }: { data: any; cityConfig: any; apiBaseUrl: string }) => {
  const [layers, setLayers] = useState(['crowd', 'traffic', 'emergency']);
  const [assemblyPoints, setAssemblyPoints] = useState<any[]>([]);
  const [evacuationRoutes, setEvacuationRoutes] = useState<any[]>([]);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    axios.get(`${apiBaseUrl}/api/assembly-points`).then(res => setAssemblyPoints(res.data.assembly_points || [])).catch(() => {});
    axios.get(`${apiBaseUrl}/api/evacuation-routes`).then(res => setEvacuationRoutes(res.data.all_routes || [])).catch(() => {});
  }, [apiBaseUrl]);

  if (!data) return <Box sx={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,24,39,0.8)', borderRadius: 2 }}><CircularProgress sx={{ color: '#c4b5fd' }} /></Box>;

  const center: [number, number] = cityConfig ? [cityConfig.lat, cityConfig.lon] : [17.6784, 75.3294];
  const zoom = cityConfig?.zoom || 13;
  const crowdZones = data.crowd?.zones || [];
  const trafficRoutes = data.traffic?.routes || [];
  const earthquakes = (data.earthquakes?.earthquakes || []).slice(0, 5);
  const parsedRoutes = evacuationRoutes.map((r: any) => {
    let coords: any[] = [];
    try { coords = typeof r.coordinates === 'string' ? JSON.parse(r.coordinates) : (r.coordinates || []); } catch {}
    return { ...r, parsedCoords: coords };
  });

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%', borderRadius: 2, overflow: 'hidden' }}>
      {/* Layer toggles */}
      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ background: 'rgba(11,15,26,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(196,181,253,0.2)', borderRadius: 2, p: 1 }}>
          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 0.5, fontWeight: 600 }}>LAYERS</Typography>
          <ToggleButtonGroup orientation="vertical" value={layers} onChange={(_, v) => v && setLayers(v)} size="small" sx={{ '& .MuiToggleButton-root': { color: '#94A3B8', border: '1px solid rgba(196,181,253,0.1)', borderRadius: '6px !important', mb: 0.5, py: 0.4, px: 1, fontSize: '0.65rem', fontWeight: 600, gap: 0.5, justifyContent: 'flex-start', '&.Mui-selected': { color: '#c4b5fd', background: 'rgba(196,181,253,0.12)', borderColor: 'rgba(196,181,253,0.3)' } } }}>
            <ToggleButton value="crowd"><Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#2ED573', mr: 0.5 }} />Crowd</ToggleButton>
            <ToggleButton value="traffic"><Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#FFA502', mr: 0.5 }} />Traffic</ToggleButton>
            <ToggleButton value="emergency"><Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4757', mr: 0.5 }} />Assembly</ToggleButton>
            <ToggleButton value="quakes"><Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#c4b5fd', mr: 0.5 }} />Quakes</ToggleButton>
            <ToggleButton value="routes"><Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#7C83FD', mr: 0.5 }} />Evac Routes</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      {/* Title */}
      <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'rgba(11,15,26,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(196,181,253,0.2)', borderRadius: 2, px: 1.5, py: 0.75 }}>
        <Typography variant="caption" sx={{ color: '#c4b5fd', fontWeight: 700, fontSize: '0.75rem' }}>LIVE {cityConfig?.name?.toUpperCase() || 'CITY'} MONITOR</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#FF4757', animation: 'pulse 1.5s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
          <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem' }}>{crowdZones.length} zones monitored</Typography>
        </Box>
      </Box>
      <MapContainer center={center} zoom={zoom} ref={mapRef} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' maxZoom={20} />
        {layers.includes('crowd') && <LayerGroup>{crowdZones.map((zone: any) => {
          const coords = zone.coordinates; if (!coords || coords.length < 2) return null;
          const style = RISK_STYLE[zone.risk_level] || RISK_STYLE.low;
          return <Circle key={zone.id} center={[coords[0], coords[1]]} radius={600} pathOptions={{ fillColor: style.fillColor, fillOpacity: 0.35, color: style.color, weight: 2 }}>
            <LeafletTooltip sticky><strong>{zone.name}</strong></LeafletTooltip>
            <Popup><Box sx={{ minWidth: 160 }}><Typography variant="subtitle2" fontWeight="bold" gutterBottom>{zone.name}</Typography><Typography variant="body2">Density: {(zone.current_density * 100).toFixed(1)}%</Typography><Typography variant="body2">Count: {(zone.capacity * zone.current_density).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</Typography><Typography variant="body2">Capacity: {zone.capacity?.toLocaleString()}</Typography><Typography variant="body2" sx={{ color: style.color, fontWeight: 'bold', mt: 0.5 }}>Risk: {zone.risk_level?.toUpperCase()}</Typography></Box></Popup>
          </Circle>;
        })}</LayerGroup>}
        {layers.includes('traffic') && <LayerGroup>{trafficRoutes.map((route: any) => {
          const start = route.start_coords; const end = route.end_coords; if (!start || !end) return null;
          const style = CONGESTION_STYLE[route.congestion_level] || CONGESTION_STYLE.low;
          return <Polyline key={route.id} positions={[[start[0], start[1]], [end[0], end[1]]]} pathOptions={{ color: style.color, weight: style.weight, opacity: 0.85, dashArray: route.status === 'closed' ? '8,6' : undefined }}>
            <Popup><Box><Typography variant="subtitle2" fontWeight="bold">{route.name}</Typography><Typography variant="body2">Travel: {route.current_travel_time} min{route.current_travel_time > route.normal_travel_time ? ` (+${route.current_travel_time - route.normal_travel_time} delay)` : ''}</Typography><Typography variant="body2">Distance: {route.distance_km} km</Typography><Typography variant="body2" sx={{ color: style.color, fontWeight: 'bold' }}>{route.congestion_level?.toUpperCase()} CONGESTION</Typography></Box></Popup>
          </Polyline>;
        })}</LayerGroup>}
        {layers.includes('emergency') && <LayerGroup>{assemblyPoints.filter((p: any) => p.coordinates?.length >= 2).map((point: any) => (
          <Marker key={point.id} position={[point.coordinates[0], point.coordinates[1]]} icon={assemblyIcon}>
            <Popup><Box><Typography variant="subtitle2" fontWeight="bold">{point.name}</Typography><Typography variant="body2" color="success.main" fontWeight="bold">Assembly Point</Typography><Typography variant="body2">Capacity: {(point.capacity || 0).toLocaleString()}</Typography></Box></Popup>
          </Marker>
        ))}</LayerGroup>}
        {layers.includes('quakes') && <LayerGroup>{earthquakes.filter((q: any) => q.latitude && q.longitude).map((quake: any, i: number) => (
          <Marker key={i} position={[quake.latitude, quake.longitude]} icon={quakeIcon}>
            <Popup><Box><Typography variant="subtitle2" fontWeight="bold">M{quake.magnitude?.toFixed(1)} Earthquake</Typography><Typography variant="body2">{quake.place || quake.location}</Typography><Typography variant="body2">Depth: {quake.depth?.toFixed(1)} km</Typography></Box></Popup>
          </Marker>
        ))}</LayerGroup>}
        {layers.includes('routes') && <LayerGroup>{parsedRoutes.filter((r: any) => r.parsedCoords?.length >= 2).map((route: any, i: number) => (
          <Polyline key={`evac-${i}`} positions={route.parsedCoords.map((c: any) => [c[0] || c.lat, c[1] || c.lon])} pathOptions={{ color: '#7C83FD', weight: 3, opacity: 0.8, dashArray: '6, 4' }}>
            <Popup><Box><Typography variant="subtitle2" fontWeight="bold">{route.name}</Typography><Typography variant="body2">Type: {route.route_type}</Typography></Box></Popup>
          </Polyline>
        ))}</LayerGroup>}
      </MapContainer>
    </Box>
  );
};

export default function DisasterDashboard() {
  const { dashboardData, loading, error, selectedCity, availableCities, API_BASE_URL } = useDisasterData();
  const cityConfig = availableCities.find(c => c.id === selectedCity);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#c4b5fd' }} size={48} />
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 2 }}>Loading intelligence data...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', color: '#FF6B76' }}>{error}</Alert>;
  }

  const alerts: any[] = (dashboardData.alerts as any)?.alerts || dashboardData.alerts as any[] || [];
  const criticalAlerts = alerts.filter((a: any) => a.priority === 'critical');
  const crowdZones = (dashboardData.crowd as any)?.zones || [];
  const overallMetrics = (dashboardData.crowd as any)?.overall_metrics || {};
  const riskScore: any = dashboardData.risk_score;
  const weather: any = dashboardData.weather;
  const traffic: any = dashboardData.traffic;
  const earthquakes: any = dashboardData.earthquakes;

  const tempVal = weather?.temperature != null ? `${Math.round(weather.temperature)}°C` : '--';
  const crowdVal = overallMetrics.current_occupancy != null ? overallMetrics.current_occupancy.toLocaleString() : '--';
  const crowdPct = overallMetrics.occupancy_percentage != null ? `${overallMetrics.occupancy_percentage.toFixed(0)}% capacity` : '';
  const openRoutes = traffic?.overall_conditions?.open_routes ?? '--';
  const quakeCount = earthquakes?.earthquakes?.length ?? 0;

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#F0F4FF', letterSpacing: -0.3 }}>
            {cityConfig?.name ? `${cityConfig.name} Operations Center` : 'Operations Center'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            {cityConfig?.display_name} • <span style={{ color: '#c4b5fd' }}>Live</span>
          </Typography>
        </Box>
        {criticalAlerts.length > 0 && (
          <Box sx={{ px: 2, py: 0.5, borderRadius: 6, background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.35)', display: 'flex', alignItems: 'center', gap: 1, animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } } }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4757' }} />
            <Typography variant="caption" sx={{ color: '#FF4757', fontWeight: 700 }}>{criticalAlerts.length} CRITICAL ALERT{criticalAlerts.length > 1 ? 'S' : ''}</Typography>
          </Box>
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { icon: <AlertIcon sx={{ fontSize: 20 }} />, label: 'RISK SCORE', value: riskScore?.overall_score ?? '--', sub: `${riskScore?.risk_level?.toUpperCase() || 'LOW'} level`, accent: riskColor(riskScore?.risk_level) },
          { icon: <CrowdIcon sx={{ fontSize: 20 }} />, label: 'CROWD', value: crowdVal, sub: crowdPct, accent: '#818CF8' },
          { icon: <AlertIcon sx={{ fontSize: 20 }} />, label: 'ACTIVE ALERTS', value: alerts.length, sub: `${criticalAlerts.length} critical`, accent: criticalAlerts.length > 0 ? '#FF4757' : '#2ED573' },
          { icon: <WeatherIcon sx={{ fontSize: 20 }} />, label: 'TEMPERATURE', value: tempVal, sub: weather?.description || 'N/A', accent: '#FFB74D' },
          { icon: <TrafficIcon sx={{ fontSize: 20 }} />, label: 'OPEN ROUTES', value: openRoutes, sub: `${traffic?.overall_conditions?.total_routes ?? 0} total`, accent: '#2ED573' },
        ].map(kpi => (
          <Grid item xs={6} sm={4} md={2.4} key={kpi.label}>
            <KpiCard {...kpi} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Live Map */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 500, p: 0, overflow: 'hidden', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <DashboardMap data={dashboardData} cityConfig={cityConfig} apiBaseUrl={API_BASE_URL} />
          </Card>
        </Grid>

        {/* Side panels: Risk + Alerts */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.65rem', letterSpacing: 1 }}>COMPOSITE RISK INDEX</Typography>
                <RiskGauge score={riskScore?.overall_score || 0} level={riskScore?.risk_level || 'low'} />
              </CardContent>
            </Card>

            <Card sx={{ flex: 1, background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ py: 1.5, px: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.65rem', letterSpacing: 1 }}>ALERT FEED</Typography>
                  <Chip label={`${alerts.length} active`} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, background: alerts.length > 0 ? 'rgba(255,71,87,0.12)' : 'rgba(46,213,115,0.1)', color: alerts.length > 0 ? '#FF4757' : '#2ED573', border: `1px solid ${alerts.length > 0 ? 'rgba(255,71,87,0.25)' : 'rgba(46,213,115,0.2)'}` }} />
                </Box>
                <Box sx={{ overflow: 'auto', flex: 1 }}>
                  {alerts.length > 0
                    ? alerts.slice(0, 8).map((alert: any, i: number) => <AlertItem key={i} alert={alert} />)
                    : <Box sx={{ textAlign: 'center', py: 3 }}><Typography variant="caption" sx={{ color: '#2ED573', fontWeight: 600 }}>All Clear — No Active Alerts</Typography></Box>
                  }
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.65rem', letterSpacing: 1, display: 'block', mb: 1 }}>WEATHER STATUS</Typography>
              <WeatherSummary weather={weather} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.65rem', letterSpacing: 1 }}>CROWD ZONES</Typography>
                <Typography variant="caption" sx={{ color: '#c4b5fd', fontWeight: 700, fontSize: '0.7rem' }}>{overallMetrics.zones_at_capacity || 0} at capacity</Typography>
              </Box>
              {crowdZones.slice(0, 6).map((zone: any) => <ZoneRow key={zone.id} zone={zone} />)}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ py: 1.5, px: 2 }}><TrafficStatus traffic={traffic} /></CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.65rem', letterSpacing: 1 }}>SEISMIC ACTIVITY</Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.7rem' }}>{quakeCount} events</Typography>
              </Box>
              <QuakeList earthquakes={earthquakes} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
