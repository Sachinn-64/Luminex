/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, Chip, Divider, LinearProgress, Tabs, Tab,
} from '@mui/material';
import {
  Satellite, Water, Terrain, WaterDrop, Landscape, LocationCity, Park, Warning, CheckCircle, Info,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Rectangle, Popup, LayersControl } from 'react-leaflet';
import { useDisasterData } from '../../context/DisasterDataContext';
import 'leaflet/dist/leaflet.css';

const { BaseLayer, Overlay } = LayersControl;
const RISK_COLORS: Record<string, string> = { high: '#FF4757', moderate: '#FFA502', low: '#2ED573' };
const ESRI_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_LABELS = 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ESRI_TOPO = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
const GOOGLE_SATELLITE = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
const GOOGLE_HYBRID = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
const NASA_GIBS_MODIS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg';
const OPEN_TOPO = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';

export default function DisasterSatellite() {
  const { fetchSatelliteImagery, fetchFloodAnalysis, fetchTerrainAnalysis, selectedCity, availableCities } = useDisasterData();
  const [satelliteData, setSatelliteData] = useState<any>(null);
  const [floodData, setFloodData] = useState<any>(null);
  const [terrainData, setTerrainData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const [imagery, flood, terrain] = await Promise.all([fetchSatelliteImagery(), fetchFloodAnalysis(), fetchTerrainAnalysis()]);
        setSatelliteData(imagery); setFloodData(flood); setTerrainData(terrain);
      } catch { setError('Failed to load satellite data'); } finally { setLoading(false); }
    };
    load();
  }, [selectedCity]); // eslint-disable-line react-hooks/exhaustive-deps

  const cityConfig = availableCities.find(c => c.id === selectedCity) || availableCities[0];
  const mapCenter: [number, number] = cityConfig ? [cityConfig.lat, cityConfig.lon] : [17.6784, 75.3294];

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress sx={{ color: '#c4b5fd' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;

  const floodRiskLevel = floodData?.risk_level || 'low';
  const floodRiskColor = RISK_COLORS[floodRiskLevel] || '#2ED573';
  const bbox = satelliteData?.bbox || floodData?.imagery_data?.bbox;
  const rectBounds: [[number, number], [number, number]] | null = bbox && bbox.length === 4 ? [[bbox[1], bbox[0]], [bbox[3], bbox[2]]] : null;
  const nasaDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10); // yesterday (latest available)

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Typography variant="h5" sx={{ fontWeight: 700, color: '#F0F4FF' }}>Satellite Monitoring</Typography><Typography variant="body2" sx={{ color: '#94A3B8' }}>Aerial analysis — {cityConfig?.display_name || selectedCity}</Typography></Box>

      <Box sx={{ mb: 3, borderBottom: '1px solid rgba(196,181,253,0.15)' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ '& .MuiTab-root': { color: '#94A3B8', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: '#c4b5fd' }, '& .MuiTabs-indicator': { bgcolor: '#c4b5fd' } }}>
          <Tab icon={<Satellite sx={{ fontSize: 18 }} />} iconPosition="start" label="Satellite View" />
          <Tab icon={<Water sx={{ fontSize: 18 }} />} iconPosition="start" label="Flood Analysis" />
          <Tab icon={<Terrain sx={{ fontSize: 18 }} />} iconPosition="start" label="Terrain" />
        </Tabs>
      </Box>

      {/* Tab 0: Satellite */}
      {activeTab === 0 && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <Box sx={{ height: 460, position: 'relative' }}>
                <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%', borderRadius: 12 }}>
                  <LayersControl position="topright">
                    <BaseLayer checked name="ESRI Satellite"><TileLayer url={ESRI_SATELLITE} attribution='&copy; Esri, DigitalGlobe, GeoEye' maxZoom={19} /></BaseLayer>
                    <BaseLayer name="Google Satellite"><TileLayer url={GOOGLE_SATELLITE} attribution='&copy; Google' maxZoom={20} /></BaseLayer>
                    <BaseLayer name="Google Hybrid"><TileLayer url={GOOGLE_HYBRID} attribution='&copy; Google' maxZoom={20} /></BaseLayer>
                    <BaseLayer name="NASA MODIS (Daily)"><TileLayer url={NASA_GIBS_MODIS.replace('{time}', nasaDate)} attribution='&copy; NASA GIBS' maxZoom={9} /></BaseLayer>
                    <BaseLayer name="Dark (CartoDB)"><TileLayer url={CARTO_DARK} attribution='&copy; CARTO' /></BaseLayer>
                    <BaseLayer name="Topo (ESRI)"><TileLayer url={ESRI_TOPO} attribution='&copy; Esri' /></BaseLayer>
                    <BaseLayer name="OpenTopoMap"><TileLayer url={OPEN_TOPO} attribution='&copy; OpenTopoMap' maxZoom={17} /></BaseLayer>
                    <Overlay checked name="Place Labels"><TileLayer url={ESRI_LABELS} attribution='&copy; Esri' opacity={0.8} /></Overlay>
                    {rectBounds && (
                      <Overlay checked name="Analysis Area">
                        <Rectangle bounds={rectBounds} pathOptions={{ color: '#c4b5fd', fillColor: '#c4b5fd', fillOpacity: 0.06, weight: 2, dashArray: '6 3' }}>
                          <Popup><Typography variant="caption">Sentinel-2 coverage<br />Bands: {(satelliteData?.bands || []).join(', ')}<br />Resolution: {satelliteData?.resolution || '10m'}</Typography></Popup>
                        </Rectangle>
                      </Overlay>
                    )}
                  </LayersControl>
                </MapContainer>
                <Box sx={{ position: 'absolute', bottom: 10, left: 10, zIndex: 1000, bgcolor: 'rgba(11,15,26,0.85)', borderRadius: 1, px: 1, py: 0.5, backdropFilter: 'blur(6px)' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Live satellite tiles — ESRI World Imagery | Use layer switcher (top right) to change view</Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 2 }}>Data Sources</Typography>
                <Box sx={{ p: 1.5, mb: 2, borderRadius: 2, background: 'rgba(46,213,115,0.08)', border: '1px solid rgba(46,213,115,0.2)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}><CheckCircle sx={{ fontSize: 16, color: '#2ED573' }} /><Typography variant="caption" sx={{ color: '#2ED573', fontWeight: 700 }}>ESRI World Imagery (Map) — ACTIVE</Typography></Box>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Interactive satellite tiles from Esri/DigitalGlobe, GeoEye. Always available. Use the layer switcher on the map to switch views.</Typography>
                </Box>
                <Box sx={{ p: 1.5, mb: 2, borderRadius: 2, background: satelliteData?.image_data ? 'rgba(46,213,115,0.08)' : 'rgba(196,181,253,0.08)', border: `1px solid ${satelliteData?.image_data ? 'rgba(46,213,115,0.2)' : 'rgba(196,181,253,0.2)'}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>{satelliteData?.image_data ? <CheckCircle sx={{ fontSize: 16, color: '#2ED573' }} /> : <Info sx={{ fontSize: 16, color: '#c4b5fd' }} />}<Typography variant="caption" sx={{ color: satelliteData?.image_data ? '#2ED573' : '#c4b5fd', fontWeight: 700 }}>Esri Static Snapshot — {satelliteData?.image_data ? 'ACTIVE' : 'Loading...'}</Typography></Box>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>{satelliteData?.image_data ? 'High-resolution static snapshot processed from ArcGIS REST API.' : 'Fetching Esri snapshot...'}</Typography>
                </Box>
                {[['Satellite', satelliteData?.provider || 'Esri'], ['Resolution', satelliteData?.resolution || '1m'], ['Bands', (satelliteData?.bands || ['RGB']).join(', ')], ['Last fetch', satelliteData?.timestamp ? new Date(satelliteData.timestamp).toLocaleString('en-IN') : '—']].map(([label, val]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>{label}</Typography>
                    <Typography variant="caption" sx={{ color: '#F0F4FF', fontWeight: 600 }}>{val}</Typography>
                  </Box>
                ))}
                {satelliteData?.image_data && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" display="block" sx={{ color: '#94A3B8', mb: 1 }}>Esri Processed Preview (800×800)</Typography>
                    <Box component="img" src={`data:image/jpeg;base64,${satelliteData.image_data}`} alt="Esri satellite imagery" sx={{ width: '100%', borderRadius: 2, border: '1px solid rgba(196,181,253,0.2)', cursor: 'pointer' }} onClick={() => window.open(`data:image/jpeg;base64,${satelliteData.image_data}`, '_blank')} />
                    <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>Click image to view full resolution</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Flood */}
      {activeTab === 1 && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={5} lg={4}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 2 }}>Flood Risk Assessment</Typography>
                <Box sx={{ textAlign: 'center', py: 3, mb: 2, borderRadius: 2, background: `${floodRiskColor}10`, border: `1px solid ${floodRiskColor}30` }}>
                  <Typography variant="h3" sx={{ color: floodRiskColor, fontWeight: 800, textTransform: 'uppercase' }}>{floodRiskLevel}</Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Flood Risk Level</Typography>
                  <Box sx={{ px: 3, mt: 1.5 }}>
                    <LinearProgress variant="determinate" value={Math.min((floodData?.flood_risk || 0) * 100, 100)} sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: floodRiskColor } }} />
                    <Typography variant="caption" sx={{ color: floodRiskColor, fontWeight: 600 }}>{Math.round((floodData?.flood_risk || 0) * 100)}% probability</Typography>
                  </Box>
                </Box>
                {floodData?.data_source === 'model_estimate' && (
                  <Box sx={{ mb: 1.5, p: 1, borderRadius: 1, background: 'rgba(196,181,253,0.06)', border: '1px solid rgba(196,181,253,0.15)' }}>
                    <Typography variant="caption" sx={{ color: '#c4b5fd' }}>Model estimate — values derived from simulation, not real sensor data.</Typography>
                  </Box>
                )}
                <Divider sx={{ mb: 2 }} />
                {[['Affected Area', `${floodData?.affected_area_km2?.toFixed(1) || 0} km²`], ['Water Level Δ', `${floodData?.water_level_change > 0 ? '+' : ''}${floodData?.water_level_change?.toFixed(2) || 0} m`], ['Analysis Time', floodData?.analysis_timestamp ? new Date(floodData.analysis_timestamp).toLocaleString('en-IN') : '—']].map(([label, val]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}><Typography variant="caption" sx={{ color: '#94A3B8' }}>{label}</Typography><Typography variant="caption" sx={{ color: '#F0F4FF', fontWeight: 600 }}>{val}</Typography></Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7} lg={8}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card sx={{ height: 300, background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url={ESRI_SATELLITE} attribution='&copy; Esri' maxZoom={19} />
                    <TileLayer url={ESRI_LABELS} attribution='&copy; Esri' opacity={0.7} />
                    {rectBounds && <Rectangle bounds={rectBounds} pathOptions={{ color: floodRiskColor, fillColor: floodRiskColor, fillOpacity: 0.15, weight: 2 }}><Popup>Flood risk: {floodRiskLevel.toUpperCase()}<br />Affected: {floodData?.affected_area_km2?.toFixed(1)} km²</Popup></Rectangle>}
                  </MapContainer>
                </Card>
              </Grid>
              {floodData?.recommendations?.length > 0 && (
                <Grid item xs={12}>
                  <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ color: '#F0F4FF', fontWeight: 700, mb: 1.5 }}>Recommendations</Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {floodData.recommendations.map((rec: string, i: number) => (
                          <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            {floodRiskLevel === 'low' ? <CheckCircle sx={{ fontSize: 16, color: '#2ED573', mt: 0.2, flexShrink: 0 }} /> : <Warning sx={{ fontSize: 16, color: floodRiskColor, mt: 0.2, flexShrink: 0 }} />}
                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>{rec}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Terrain */}
      {activeTab === 2 && (
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 2 }}>Elevation Profile</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {[['Min', `${terrainData?.elevation_range?.min ?? '—'} m`, '#2ED573'], ['Avg', `${terrainData?.elevation_range?.average ?? '—'} m`, '#74B9FF'], ['Max', `${terrainData?.elevation_range?.max ?? '—'} m`, '#FFA502']].map(([label, val, color]) => (
                    <Box key={label} sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, background: `${color}10`, border: `1px solid ${color}30` }}>
                      <Typography variant="caption" sx={{ color, display: 'block', fontWeight: 600 }}>{label}</Typography>
                      <Typography variant="body2" sx={{ color: '#F0F4FF', fontWeight: 700 }}>{val}</Typography>
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" sx={{ color: '#F0F4FF', mb: 1 }}>Slope Analysis</Typography>
                {[['Avg Slope', `${terrainData?.slope_analysis?.average_slope ?? '—'}°`], ['Steep Areas', terrainData?.slope_analysis?.steep_areas ?? '—'], ['Flood-Prone Areas', terrainData?.slope_analysis?.flood_prone_areas ?? '—']].map(([label, val]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}><Typography variant="caption" sx={{ color: '#94A3B8' }}>{label}</Typography><Typography variant="caption" sx={{ color: '#F0F4FF', fontWeight: 600 }}>{val}</Typography></Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 2 }}>Land Cover</Typography>
                {terrainData?.land_cover ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {[{ label: 'Water Bodies', key: 'water_bodies', icon: <WaterDrop sx={{ fontSize: 16, color: '#74B9FF' }} />, color: '#74B9FF' }, { label: 'Vegetation', key: 'vegetation', icon: <Park sx={{ fontSize: 16, color: '#2ED573' }} />, color: '#2ED573' }, { label: 'Urban Areas', key: 'urban_areas', icon: <LocationCity sx={{ fontSize: 16, color: '#c4b5fd' }} />, color: '#c4b5fd' }, { label: 'Bare Soil', key: 'bare_soil', icon: <Landscape sx={{ fontSize: 16, color: '#FFD700' }} />, color: '#FFD700' }].map(({ label, key, icon, color }) => {
                      const val = terrainData.land_cover[key] || 0;
                      return (
                        <Box key={key}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{icon}<Typography variant="caption" sx={{ color: '#94A3B8' }}>{label}</Typography></Box><Typography variant="caption" sx={{ color, fontWeight: 600 }}>{val.toFixed(1)}%</Typography></Box>
                          <LinearProgress variant="determinate" value={Math.min(val, 100)} sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                        </Box>
                      );
                    })}
                  </Box>
                ) : <Typography variant="body2" sx={{ color: '#94A3B8' }}>No land cover data</Typography>}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <Box sx={{ height: 300, position: 'relative', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
                <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}><TileLayer url={ESRI_TOPO} attribution='&copy; Esri' />{rectBounds && <Rectangle bounds={rectBounds} pathOptions={{ color: '#c4b5fd', fillColor: '#c4b5fd', fillOpacity: 0.08, weight: 2 }} />}</MapContainer>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#111827', borderRadius: '0 0 12px 12px' }}><Typography variant="caption" sx={{ color: '#94A3B8' }}>Topographic view — analysis area highlighted</Typography></Box>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
