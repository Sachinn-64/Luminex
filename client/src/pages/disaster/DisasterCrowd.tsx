/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, Chip, Divider, LinearProgress, IconButton, Tooltip } from '@mui/material';
import { Groups, MyLocation, TrendingUp, Warning, Refresh, PeopleAlt, InfoOutlined, CloudQueue } from '@mui/icons-material';
import { MapContainer, TileLayer, Circle, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import { useDisasterData } from '../../context/DisasterDataContext';
import 'leaflet/dist/leaflet.css';

const DENSITY_COLOR = (d: number) => { if (d >= 0.9) return '#FF4757'; if (d >= 0.7) return '#FFA502'; if (d >= 0.5) return '#FFD700'; if (d >= 0.3) return '#74B9FF'; return '#2ED573'; };
const RISK_COLORS: Record<string, string> = { critical: '#FF4757', high: '#FFA502', moderate: '#FFD700', low: '#2ED573' };
const BUSYNESS_COLORS: Record<string, string> = { 'Very Busy': '#FF4757', 'Busy': '#FFA502', 'Moderate': '#FFD700', 'Low Activity': '#2ED573' };

const ZoneCard = ({ zone, selected, onClick }: { zone: any; selected: boolean; onClick: () => void }) => {
  const density = zone.current_density || 0;
  const color = DENSITY_COLOR(density);
  const busyness = zone.busyness_level || 'Low Activity';
  const busynessColor = BUSYNESS_COLORS[busyness] || '#2ED573';
  return (
    <Box onClick={onClick} sx={{ p: 2, borderRadius: 2, background: selected ? `${color}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${selected ? color : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: color, background: `${color}10` } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="body2" sx={{ color: '#F0F4FF', fontWeight: 700, lineHeight: 1.2 }}>{zone.name}</Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>{zone.flow_direction || 'N/A'} flow</Typography>
        </Box>
        <Chip label={zone.risk_level || 'low'} size="small" sx={{ bgcolor: `${RISK_COLORS[zone.risk_level] || '#2ED573'}20`, color: RISK_COLORS[zone.risk_level] || '#2ED573', border: `1px solid ${RISK_COLORS[zone.risk_level] || '#2ED573'}40`, fontSize: '0.65rem', textTransform: 'capitalize' }} />
      </Box>
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>Zone Density</Typography>
          <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{Math.round(density * 100)}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={Math.min(density * 100, 100)} sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: busynessColor }} />
          <Typography variant="caption" sx={{ color: busynessColor, fontWeight: 700 }}>{busyness}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ color: '#94A3B8' }} display="block">Flow</Typography>
          <Typography variant="caption" sx={{ color: '#F0F4FF', fontWeight: 600 }}>{zone.flow_rate || 0}/hr</Typography>
        </Box>
      </Box>
      {zone.anomalies?.length > 0 && <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}><Warning sx={{ fontSize: 12, color: '#FF4757' }} /><Typography variant="caption" sx={{ color: '#FF4757' }}>{zone.anomalies.map((a: any) => typeof a === 'string' ? a : a.description).join(', ')}</Typography></Box>}
    </Box>
  );
};

export default function DisasterCrowd() {
  const { fetchCrowdData, selectedCity, availableCities } = useDisasterData();
  const [crowdData, setCrowdData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<any>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setError(null); setCrowdData(await fetchCrowdData()); } catch { setError('Failed to load crowd data'); } finally { setLoading(false); }
  }, [fetchCrowdData]);

  useEffect(() => { load(); }, [selectedCity]); // eslint-disable-line react-hooks/exhaustive-deps

  const cityConfig = availableCities.find(c => c.id === selectedCity) || availableCities[0];
  const mapCenter: [number, number] = cityConfig ? [cityConfig.lat, cityConfig.lon] : [17.6784, 75.3294];
  const zones = crowdData?.zones || [];
  const overallDensity = crowdData?.overall_metrics?.average_density || 0;
  const criticalZones = zones.filter((z: any) => z.risk_level === 'critical' || z.risk_level === 'high');
  const dataSource = crowdData?.data_source || 'unknown';
  const isGoogleMaps = dataSource === 'google_maps_places';

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress sx={{ color: '#c4b5fd' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box><Typography variant="h5" sx={{ fontWeight: 700, color: '#F0F4FF' }}>Crowd Analytics</Typography><Typography variant="body2" sx={{ color: '#94A3B8' }}>Zone busyness monitoring — {cityConfig?.display_name || selectedCity}</Typography></Box>
        <Tooltip title="Refresh"><IconButton onClick={load} sx={{ color: '#94A3B8', '&:hover': { color: '#c4b5fd' } }}><Refresh /></IconButton></Tooltip>
      </Box>

      {/* Data source banner */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2.5, p: 1.5, borderRadius: 2, background: isGoogleMaps ? 'rgba(46,213,115,0.07)' : 'rgba(116,185,255,0.07)', border: `1px solid ${isGoogleMaps ? 'rgba(46,213,115,0.2)' : 'rgba(116,185,255,0.2)'}` }}>
        {isGoogleMaps
          ? <CloudQueue sx={{ fontSize: 18, color: '#2ED573', mt: 0.15, flexShrink: 0 }} />
          : <InfoOutlined sx={{ fontSize: 18, color: '#74B9FF', mt: 0.15, flexShrink: 0 }} />}
        <Box>
          <Typography variant="caption" sx={{ color: isGoogleMaps ? '#2ED573' : '#74B9FF', fontWeight: 700, display: 'block' }}>
            {isGoogleMaps ? 'Google Maps Places — Live Data' : 'Heuristic Model — Time-Based Estimates'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>{crowdData?.data_note || 'Zone busyness estimates based on available data.'}</Typography>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {[
          { label: 'Data Source', value: isGoogleMaps ? 'Google Maps' : 'Heuristic', color: isGoogleMaps ? '#2ED573' : '#74B9FF', icon: <CloudQueue /> },
          { label: 'Avg Busyness', value: `${Math.round(overallDensity * 100)}%`, color: DENSITY_COLOR(overallDensity), icon: <TrendingUp /> },
          { label: 'Zones Monitored', value: zones.length, color: '#c4b5fd', icon: <MyLocation /> },
          { label: 'High-Risk Zones', value: criticalZones.length, color: criticalZones.length > 0 ? '#FF4757' : '#2ED573', icon: <Warning /> },
        ].map(({ label, value, color, icon }) => (
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
              {zones.map((zone: any) => {
                if (!zone.coordinates || zone.coordinates.length < 2) return null;
                const [lat, lon] = zone.coordinates;
                const density = zone.current_density || 0;
                const color = DENSITY_COLOR(density);
                const radius = Math.max(150, Math.min(400, (zone.capacity || 50000) / 200));
                return (
                  <Circle key={zone.id} center={[lat, lon]} radius={radius} pathOptions={{ color, fillColor: color, fillOpacity: 0.3 + density * 0.4, weight: zone === selectedZone ? 3 : 1.5 }} eventHandlers={{ click: () => setSelectedZone(zone) }}>
                    <LeafletTooltip><strong>{zone.name}</strong><br />Busyness: {zone.busyness_level || 'Low Activity'}<br />Density: {Math.round(density * 100)}%<br />Risk: {zone.risk_level}</LeafletTooltip>
                    <Popup><Box sx={{ minWidth: 160 }}><Typography variant="body2" fontWeight={700} gutterBottom>{zone.name}</Typography><Typography variant="caption" display="block">Busyness: {zone.busyness_level || 'Low Activity'}</Typography><Typography variant="caption" display="block">Zone Density: {Math.round(density * 100)}%</Typography><Typography variant="caption" display="block">Risk: {zone.risk_level}</Typography></Box></Popup>
                  </Circle>
                );
              })}
            </MapContainer>
          </Card>
          <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap', px: 1 }}>
            {[['Low Activity', '#2ED573'], ['Moderate', '#FFD700'], ['Busy', '#FFA502'], ['Very Busy', '#FF4757']].map(([label, c]) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c, opacity: 0.7 }} /><Typography variant="caption" sx={{ color: '#94A3B8' }}>{label}</Typography></Box>
            ))}
          </Box>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 460, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent sx={{ pb: 1, flexShrink: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF' }}>Zone Details</Typography><Chip icon={<PeopleAlt sx={{ fontSize: 14 }} />} label={`${zones.length} zones`} size="small" sx={{ bgcolor: 'rgba(196,181,253,0.1)', color: '#c4b5fd' }} /></Box>
            </CardContent>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
            <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {zones.map((zone: any) => <ZoneCard key={zone.id} zone={zone} selected={zone === selectedZone} onClick={() => setSelectedZone(zone)} />)}
            </Box>
          </Card>
        </Grid>
        {zones.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 2 }}>Zone Busyness Overview</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {zones.map((zone: any) => {
                    const density = zone.current_density || 0;
                    const color = DENSITY_COLOR(density);
                    const busyness = zone.busyness_level || 'Low Activity';
                    return (
                      <Box key={zone.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#F0F4FF' }}>{zone.name}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={busyness} size="small" sx={{ height: 20, fontSize: '0.6rem', bgcolor: `${BUSYNESS_COLORS[busyness] || '#2ED573'}18`, color: BUSYNESS_COLORS[busyness] || '#2ED573', border: `1px solid ${BUSYNESS_COLORS[busyness] || '#2ED573'}30` }} />
                            <Typography variant="caption" sx={{ color }}>{Math.round(density * 100)}%</Typography>
                          </Box>
                        </Box>
                        <LinearProgress variant="determinate" value={Math.min(density * 100, 100)} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
