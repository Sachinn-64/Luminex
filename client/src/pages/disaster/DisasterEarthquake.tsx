/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, Chip, Divider, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Waves, Warning, LocationOn, Speed, Layers, TrendingUp } from '@mui/icons-material';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import { useDisasterData } from '../../context/DisasterDataContext';
import 'leaflet/dist/leaflet.css';

const MAG_COLOR = (mag: number) => { if (mag >= 6) return '#FF4757'; if (mag >= 5) return '#FFA502'; if (mag >= 4) return '#FFD700'; if (mag >= 3) return '#74B9FF'; return '#2ED573'; };
const MAG_RADIUS = (mag: number) => Math.max(6, (mag || 0) * 4);
const RISK_COLORS: Record<string, string> = { high: '#FF4757', moderate: '#FFA502', low: '#2ED573', unknown: '#94A3B8' };

export default function DisasterEarthquake() {
  const { fetchEarthquakeData, fetchSeismicRisk, selectedCity, availableCities } = useDisasterData();
  const [earthquakeData, setEarthquakeData] = useState<any>(null);
  const [seismicRisk, setSeismicRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuake, setSelectedQuake] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try { setLoading(true); setError(null);
        const [qd, rd] = await Promise.all([fetchEarthquakeData(), fetchSeismicRisk().catch(() => null)]);
        setEarthquakeData(qd); setSeismicRisk(rd);
      } catch { setError('Failed to load earthquake data'); } finally { setLoading(false); }
    };
    load();
  }, [selectedCity]); // eslint-disable-line react-hooks/exhaustive-deps

  const cityConfig = availableCities.find(c => c.id === selectedCity) || availableCities[0];
  const mapCenter: [number, number] = cityConfig ? [cityConfig.lat, cityConfig.lon] : [17.6784, 75.3294];
  const quakes = earthquakeData?.earthquakes || [];
  const riskLevel = seismicRisk?.risk_level || earthquakeData?.risk_level || 'low';
  const riskColor = RISK_COLORS[riskLevel] || '#94A3B8';

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress sx={{ color: '#c4b5fd' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;

  const maxMag = quakes.length > 0 ? Math.max(...quakes.map((q: any) => q.magnitude || 0)) : 0;
  const tsunamiRisk = quakes.filter((q: any) => q.tsunami).length;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#F0F4FF' }}>Earthquake Monitoring</Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>Real-time USGS seismic data — {cityConfig?.display_name || selectedCity}</Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {[
          { label: 'Risk Level', value: riskLevel.toUpperCase(), color: riskColor, icon: <Warning /> },
          { label: 'Quakes (24h)', value: quakes.length, color: '#74B9FF', icon: <Waves /> },
          { label: 'Max Magnitude', value: maxMag.toFixed(1) || '—', color: maxMag >= 5 ? '#FF4757' : '#2ED573', icon: <TrendingUp /> },
          { label: 'Tsunami Alerts', value: tsunamiRisk, color: tsunamiRisk > 0 ? '#FF4757' : '#2ED573', icon: <Layers /> },
        ].map(({ label, value, color, icon }) => (
          <Grid item xs={6} md={3} key={label}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent sx={{ py: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><Box sx={{ color }}>{icon}</Box><Typography variant="caption" sx={{ color: '#94A3B8' }}>{label}</Typography></Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color }}>{value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 440, background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
              <CircleMarker center={mapCenter} radius={10} pathOptions={{ color: '#c4b5fd', fillColor: '#c4b5fd', fillOpacity: 0.4, weight: 2 }}>
                <LeafletTooltip permanent><span style={{ fontSize: '11px', fontWeight: 700 }}>{cityConfig?.name || 'City'}</span></LeafletTooltip>
              </CircleMarker>
              {quakes.map((q: any) => {
                if (!q.coordinates || q.coordinates.length < 2) return null;
                const [lon, lat] = q.coordinates;
                const color = MAG_COLOR(q.magnitude);
                return (
                  <CircleMarker key={q.id} center={[lat, lon]} radius={MAG_RADIUS(q.magnitude)} pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: q === selectedQuake ? 3 : 1 }} eventHandlers={{ click: () => setSelectedQuake(q) }}>
                    <Popup><Box sx={{ minWidth: 180 }}><Typography variant="body2" fontWeight={700} gutterBottom>M{q.magnitude?.toFixed(1)} — {q.place}</Typography><Typography variant="caption" display="block">Depth: {q.depth?.toFixed(1)} km</Typography><Typography variant="caption" display="block">Time: {new Date(q.time).toLocaleString('en-IN')}</Typography>{q.tsunami > 0 && <Chip label="Tsunami Risk" size="small" sx={{ mt: 1, bgcolor: '#FF4757', color: '#fff' }} />}</Box></Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </Card>
          <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap', px: 1 }}>
            {[['< 3.0', '#2ED573'], ['3.0–4.0', '#74B9FF'], ['4.0–5.0', '#FFD700'], ['5.0–6.0', '#FFA502'], ['≥ 6.0', '#FF4757']].map(([label, c]) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} /><Typography variant="caption" sx={{ color: '#94A3B8' }}>M{label}</Typography></Box>
            ))}
          </Box>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 2 }}>Seismic Risk Assessment</Typography>
              <Box sx={{ textAlign: 'center', py: 2, mb: 2, borderRadius: 2, background: `${riskColor}10`, border: `1px solid ${riskColor}30` }}>
                <Typography variant="h4" sx={{ color: riskColor, fontWeight: 800, textTransform: 'uppercase' }}>{riskLevel}</Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>Current Risk Level</Typography>
                {seismicRisk?.probability !== undefined && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>Probability: {(seismicRisk.probability * 100).toFixed(1)}%</Typography>
                    <LinearProgress variant="determinate" value={Math.min(seismicRisk.probability * 100, 100)} sx={{ mt: 0.5, mx: 'auto', maxWidth: 200, '& .MuiLinearProgress-bar': { bgcolor: riskColor } }} />
                  </Box>
                )}
              </Box>
              {seismicRisk?.recent_activity && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, display: 'block', mb: 1 }}>RECENT ACTIVITY</Typography>
                  {[['Total Earthquakes', seismicRisk.recent_activity.total_earthquakes], ['Significant (M4+)', seismicRisk.recent_activity.significant_earthquakes], ['Max Magnitude', seismicRisk.recent_activity.max_magnitude]].map(([l, v]) => (
                    <Box key={l as string} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}><Typography variant="caption" sx={{ color: '#94A3B8' }}>{l}</Typography><Typography variant="caption" sx={{ color: '#F0F4FF', fontWeight: 600 }}>{v}</Typography></Box>
                  ))}
                </Box>
              )}
              {seismicRisk?.recommendations?.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, display: 'block', mb: 1 }}>RECOMMENDATIONS</Typography>
                  {seismicRisk.recommendations.map((rec: string, i: number) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.75 }}><Speed sx={{ fontSize: 14, color: '#c4b5fd', mt: 0.2, flexShrink: 0 }} /><Typography variant="caption" sx={{ color: '#94A3B8' }}>{rec}</Typography></Box>
                  ))}
                </Box>
              )}
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.06)' }} />
              <Chip label="Source: USGS GeoJSON Feed" size="small" sx={{ bgcolor: 'rgba(46,213,115,0.1)', color: '#2ED573', border: '1px solid rgba(46,213,115,0.3)', fontSize: '0.7rem' }} />
            </CardContent>
          </Card>
        </Grid>

        {quakes.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 2 }}>Recent Earthquakes ({quakes.length})</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow>{['Magnitude', 'Location', 'Depth (km)', 'Time', 'Tsunami', 'Alert'].map(h => <TableCell key={h}><Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>{h}</Typography></TableCell>)}</TableRow></TableHead>
                    <TableBody>
                      {quakes.slice(0, 20).map((q: any) => (
                        <TableRow key={q.id} hover selected={q === selectedQuake} onClick={() => setSelectedQuake(q)} sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: 'rgba(196,181,253,0.08)' } }}>
                          <TableCell><Chip label={`M${q.magnitude?.toFixed(1)}`} size="small" sx={{ bgcolor: `${MAG_COLOR(q.magnitude)}20`, color: MAG_COLOR(q.magnitude), border: `1px solid ${MAG_COLOR(q.magnitude)}40`, fontWeight: 700 }} /></TableCell>
                          <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><LocationOn sx={{ fontSize: 14, color: '#c4b5fd' }} /><Typography variant="caption" sx={{ color: '#F0F4FF' }}>{q.place || 'Unknown'}</Typography></Box></TableCell>
                          <TableCell><Typography variant="caption" sx={{ color: '#94A3B8' }}>{q.depth?.toFixed(1) ?? '—'}</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{ color: '#94A3B8' }}>{new Date(q.time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Typography></TableCell>
                          <TableCell>{q.tsunami ? <Chip label="Yes" size="small" sx={{ bgcolor: '#FF475720', color: '#FF4757', border: '1px solid #FF475740' }} /> : <Typography variant="caption" sx={{ color: '#94A3B8' }}>No</Typography>}</TableCell>
                          <TableCell>{q.alert ? <Chip label={q.alert} size="small" sx={{ bgcolor: `${RISK_COLORS[q.alert] || '#94A3B8'}20`, color: RISK_COLORS[q.alert] || '#94A3B8', textTransform: 'capitalize' }} /> : <Typography variant="caption" sx={{ color: '#94A3B8' }}>—</Typography>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
