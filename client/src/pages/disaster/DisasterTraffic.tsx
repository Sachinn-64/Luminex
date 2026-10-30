/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, Chip,
  Divider, IconButton, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { DirectionsCar, Speed, Warning, CheckCircle, Refresh, Block, Route, Timer } from '@mui/icons-material';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import { useDisasterData } from '../../context/DisasterDataContext';
import 'leaflet/dist/leaflet.css';

const CONGESTION_COLOR: Record<string, string> = { low: '#2ED573', moderate: '#FFD700', high: '#FFA502', critical: '#FF4757', severe: '#FF4757' };
const STATUS_ICON: Record<string, React.ReactElement> = {
  open: <CheckCircle sx={{ fontSize: 16, color: '#2ED573' }} />,
  closed: <Block sx={{ fontSize: 16, color: '#FF4757' }} />,
  restricted: <Warning sx={{ fontSize: 16, color: '#FFA502' }} />,
};

export default function DisasterTraffic() {
  const { fetchTrafficData, selectedCity, availableCities } = useDisasterData();
  const [trafficData, setTrafficData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setError(null); setTrafficData(await fetchTrafficData()); } catch { setError('Failed to load traffic data'); } finally { setLoading(false); }
  }, [fetchTrafficData]);

  useEffect(() => { load(); }, [selectedCity]); // eslint-disable-line react-hooks/exhaustive-deps

  const cityConfig = availableCities.find(c => c.id === selectedCity) || availableCities[0];
  const mapCenter: [number, number] = cityConfig ? [cityConfig.lat, cityConfig.lon] : [17.6784, 75.3294];
  const routes = trafficData?.routes || [];
  const openRoutes = routes.filter((r: any) => r.status === 'open').length;
  const highCongestion = routes.filter((r: any) => ['high', 'critical', 'severe'].includes(r.congestion_level)).length;
  const avgDelay = routes.length > 0
    ? Math.round(routes.reduce((s: number, r: any) => s + Math.max(0, (r.current_travel_time || 0) - (r.normal_travel_time || 0)), 0) / routes.length) : 0;

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress sx={{ color: '#c4b5fd' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box><Typography variant="h5" sx={{ fontWeight: 700, color: '#F0F4FF' }}>Traffic Monitoring</Typography><Typography variant="body2" sx={{ color: '#94A3B8' }}>Route status and congestion analysis — {cityConfig?.display_name || selectedCity}</Typography></Box>
        <Tooltip title="Refresh"><IconButton onClick={load} sx={{ color: '#94A3B8', '&:hover': { color: '#c4b5fd' } }}><Refresh /></IconButton></Tooltip>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {([
          { label: 'Routes Monitored', value: routes.length, color: '#74B9FF', icon: <Route /> },
          { label: 'Routes Open', value: openRoutes, color: '#2ED573', icon: <CheckCircle /> },
          { label: 'High Congestion', value: highCongestion, color: highCongestion > 0 ? '#FF4757' : '#2ED573', icon: <Warning /> },
          { label: 'Avg Delay', value: `+${avgDelay} min`, color: avgDelay > 5 ? '#FFA502' : '#2ED573', icon: <Timer /> },
        ] as const).map(({ label, value, color, icon }) => (
          <Grid item xs={6} md={3} key={label}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent sx={{ py: 2.5 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><Box sx={{ color }}>{icon}</Box><Typography variant="caption" sx={{ color: '#94A3B8' }}>{label}</Typography></Box><Typography variant="h5" sx={{ fontWeight: 800, color }}>{value}</Typography></CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 460, background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <MapContainer center={mapCenter} zoom={cityConfig?.zoom || 13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
              {routes.map((route: any) => {
                if (!route.start_coords || !route.end_coords) return null;
                const color = CONGESTION_COLOR[route.congestion_level] || '#94A3B8';
                const isSelected = route === selectedRoute;
                return (
                  <React.Fragment key={route.id}>
                    <Polyline positions={[route.start_coords, route.end_coords]} pathOptions={{ color, weight: isSelected ? 6 : 3, opacity: route.status === 'closed' ? 0.4 : 0.85, dashArray: route.status === 'closed' ? '8 4' : undefined }} eventHandlers={{ click: () => setSelectedRoute(route) }}>
                      <Popup><Box sx={{ minWidth: 180 }}><Typography variant="body2" fontWeight={700} gutterBottom>{route.name}</Typography><Typography variant="caption" display="block">Status: {route.status}</Typography><Typography variant="caption" display="block">Congestion: {route.congestion_level}</Typography><Typography variant="caption" display="block">Travel time: {route.current_travel_time} min (normal: {route.normal_travel_time} min)</Typography><Typography variant="caption" display="block">Distance: {route.distance_km} km</Typography></Box></Popup>
                    </Polyline>
                    <CircleMarker center={route.start_coords} radius={5} pathOptions={{ color: '#fff', fillColor: color, fillOpacity: 1, weight: 1.5 }}><LeafletTooltip>{route.name} — Start</LeafletTooltip></CircleMarker>
                    <CircleMarker center={route.end_coords} radius={5} pathOptions={{ color: '#fff', fillColor: color, fillOpacity: 1, weight: 1.5 }}><LeafletTooltip>{route.name} — End</LeafletTooltip></CircleMarker>
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </Card>
          <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap', px: 1 }}>
            {Object.entries(CONGESTION_COLOR).map(([level, c]) => (
              <Box key={level} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 20, height: 4, bgcolor: c, borderRadius: 1 }} /><Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'capitalize' }}>{level}</Typography></Box>
            ))}
          </Box>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 460, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ pb: 1, flexShrink: 0 }}><Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF' }}>Route Status</Typography></CardContent>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {routes.map((route: any) => {
                const color = CONGESTION_COLOR[route.congestion_level] || '#94A3B8';
                const delay = Math.max(0, (route.current_travel_time || 0) - (route.normal_travel_time || 0));
                const isSelected = route === selectedRoute;
                return (
                  <Box key={route.id} onClick={() => setSelectedRoute(route)} sx={{ p: 1.5, borderRadius: 2, background: isSelected ? `${color}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: color, background: `${color}10` } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#F0F4FF', fontWeight: 700 }}>{route.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{STATUS_ICON[route.status] || STATUS_ICON.open}<Chip label={route.congestion_level} size="small" sx={{ bgcolor: `${color}20`, color, fontSize: '0.65rem', textTransform: 'capitalize' }} /></Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}><DirectionsCar sx={{ fontSize: 12, color: '#94A3B8' }} /><Typography variant="caption" sx={{ color: '#94A3B8' }}>{route.distance_km} km</Typography></Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}><Timer sx={{ fontSize: 12, color: '#94A3B8' }} /><Typography variant="caption" sx={{ color: '#94A3B8' }}>{route.current_travel_time} min{delay > 0 && <span style={{ color: '#FFA502' }}> (+{delay})</span>}</Typography></Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}><Speed sx={{ fontSize: 12, color: '#94A3B8' }} /><Typography variant="caption" sx={{ color: '#94A3B8' }}>{route.status}</Typography></Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 2 }}>All Routes Summary</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow>{['Route', 'Distance', 'Normal', 'Current', 'Delay', 'Congestion', 'Status'].map(h => <TableCell key={h}><Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>{h}</Typography></TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {routes.map((route: any) => {
                      const delay = Math.max(0, (route.current_travel_time || 0) - (route.normal_travel_time || 0));
                      const color = CONGESTION_COLOR[route.congestion_level] || '#94A3B8';
                      return (
                        <TableRow key={route.id} hover selected={route === selectedRoute} onClick={() => setSelectedRoute(route)} sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: 'rgba(196,181,253,0.08)' } }}>
                          <TableCell><Typography variant="caption" sx={{ color: '#F0F4FF' }}>{route.name}</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{ color: '#94A3B8' }}>{route.distance_km} km</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{ color: '#94A3B8' }}>{route.normal_travel_time} min</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{ color: delay > 0 ? '#FFA502' : '#F0F4FF', fontWeight: delay > 0 ? 600 : 400 }}>{route.current_travel_time} min</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{ color: delay > 5 ? '#FF4757' : delay > 0 ? '#FFA502' : '#2ED573', fontWeight: 600 }}>{delay > 0 ? `+${delay} min` : 'On time'}</Typography></TableCell>
                          <TableCell><Chip label={route.congestion_level} size="small" sx={{ bgcolor: `${color}20`, color, textTransform: 'capitalize', fontSize: '0.65rem' }} /></TableCell>
                          <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{STATUS_ICON[route.status] || STATUS_ICON.open}<Typography variant="caption" sx={{ color: '#94A3B8', textTransform: 'capitalize' }}>{route.status}</Typography></Box></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
