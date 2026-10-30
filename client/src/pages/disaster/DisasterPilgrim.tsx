/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
} from '@mui/material';
import { Phone as PhoneIcon, Sos as SosIcon } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useDisasterData } from '../../context/DisasterDataContext';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon for Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const makeIcon = (color: string, emoji: string) => L.divIcon({
  html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:12px;">${emoji}</div>`,
  className: '', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -16],
});

const FACILITY_MAP: Record<string, { icon: L.DivIcon; accent: string; emoji: string; label: string }> = {
  hospital: { icon: makeIcon('#FF4757', '🏥'), accent: '#FF4757', emoji: '🏥', label: 'Hospital' },
  medical_camp: { icon: makeIcon('#FFA502', '⛺'), accent: '#FFA502', emoji: '⛺', label: 'Medical Camp' },
  police_station: { icon: makeIcon('#818CF8', '👮'), accent: '#818CF8', emoji: '👮', label: 'Police Station' },
  drinking_water: { icon: makeIcon('#2ED573', '💧'), accent: '#2ED573', emoji: '💧', label: 'Drinking Water' },
  toilet: { icon: makeIcon('#64748B', '🚻'), accent: '#64748B', emoji: '🚻', label: 'Toilet' },
  lost_found: { icon: makeIcon('#FFB74D', '🔍'), accent: '#FFB74D', emoji: '🔍', label: 'Lost & Found' },
  information: { icon: makeIcon('#38BDF8', 'ℹ'), accent: '#38BDF8', emoji: 'ℹ️', label: 'Info Kiosk' },
};

const EMERGENCY_TYPES = [
  { value: 'medical', label: 'Medical Emergency' }, { value: 'fire', label: 'Fire' },
  { value: 'security', label: 'Security Threat' }, { value: 'stampede', label: 'Stampede Risk' },
  { value: 'flood', label: 'Flood/Water' }, { value: 'lost_person', label: 'Lost Person' }, { value: 'other', label: 'Other' },
];

export default function DisasterPilgrim() {
  const { availableCities, selectedCity } = useDisasterData();
  const cityConfig = availableCities.find(c => c.id === selectedCity) || availableCities[0];
  const API_BASE_URL = import.meta.env.VITE_DISASTER_API_URL || 'http://localhost:5001';

  const [activeTab, setActiveTab] = useState(0);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [safeRoutes, setSafeRoutes] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);

  const [sosOpen, setSosOpen] = useState(false);
  const [sosForm, setSosForm] = useState({ name: '', phone: '', emergency_type: 'medical', description: '', lat: cityConfig.lat, lon: cityConfig.lon });
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [sosResult, setSosResult] = useState<any>(null);

  useEffect(() => {
    const loadFacilities = async () => {
      setLoading(true);
      try {
        const params = selectedType ? `?type=${encodeURIComponent(selectedType)}` : '';
        const res = await axios.get(`${API_BASE_URL}/api/pilgrim/facilities${params}`);
        setFacilities(res.data.facilities || []);
      } catch { setFacilities([]); } finally { setLoading(false); }
    };
    loadFacilities();
  }, [selectedType, API_BASE_URL]);

  useEffect(() => {
    if (activeTab === 1) { axios.get(`${API_BASE_URL}/api/emergency/contacts`).then(r => setContacts(r.data)).catch(() => {}); }
    if (activeTab === 2) { axios.get(`${API_BASE_URL}/api/pilgrim/safe-routes?lat=${cityConfig.lat}&lon=${cityConfig.lon}`).then(r => setSafeRoutes(r.data)).catch(() => {}); }
  }, [activeTab, cityConfig.lat, cityConfig.lon, API_BASE_URL]);

  const handleSosSubmit = async () => {
    setSosSubmitting(true);
    try { const res = await axios.post(`${API_BASE_URL}/api/pilgrim/sos`, { ...sosForm, city: selectedCity }); setSosResult(res.data); }
    catch { setSosResult({ success: false, message: 'Failed to submit. Call 100 or 102 directly.' }); }
    finally { setSosSubmitting(false); }
  };
  const closeSos = () => { setSosOpen(false); setSosResult(null); };

  const groupedContacts = contacts.reduce((acc: Record<string, any[]>, c: any) => { const k = c.category || 'general'; if (!acc[k]) acc[k] = []; acc[k].push(c); return acc; }, {});

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box><Typography variant="h5" sx={{ fontWeight: 800, color: '#F0F4FF' }}>Pilgrim Assistance</Typography><Typography variant="body2" sx={{ color: '#475569' }}>Facilities, emergency contacts and safe routes for pilgrims</Typography></Box>
        <Button variant="contained" color="error" size="large" startIcon={<SosIcon />} onClick={() => setSosOpen(true)} sx={{ px: 4, py: 1.5, fontSize: '1rem', fontWeight: 800, background: 'linear-gradient(135deg, #FF4757 0%, #C62828 100%)', boxShadow: '0 0 20px rgba(255,71,87,0.4)', animation: 'sosGlow 2s ease-in-out infinite', '@keyframes sosGlow': { '0%,100%': { boxShadow: '0 0 20px rgba(255,71,87,0.4)' }, '50%': { boxShadow: '0 0 30px rgba(255,71,87,0.8)' } } }}>SOS Emergency</Button>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {[{ label: 'Police', number: '100', color: '#818CF8' }, { label: 'Ambulance', number: '102', color: '#FF4757' }, { label: 'Fire', number: '101', color: '#FFA502' }, { label: 'NDRF', number: '1070', color: '#c4b5fd' }, { label: 'Women Helpline', number: '1091', color: '#EC4899' }].map(({ label, number, color }) => (
          <Button key={number} variant="outlined" size="small" href={`tel:${number}`} startIcon={<PhoneIcon sx={{ fontSize: 14 }} />} sx={{ py: 0.5, borderColor: `${color}40`, color, '&:hover': { borderColor: color, background: `${color}10` }, fontSize: '0.78rem', fontWeight: 700 }}>{label}: {number}</Button>
        ))}
      </Box>

      <Box sx={{ borderBottom: '1px solid rgba(196,181,253,0.15)', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ '& .MuiTab-root': { color: '#64748B', fontWeight: 600, fontSize: '0.82rem', minWidth: 'auto', px: 2 }, '& .Mui-selected': { color: '#c4b5fd' }, '& .MuiTabs-indicator': { background: '#c4b5fd' } }}>
          <Tab label="Nearby Facilities" /><Tab label="Emergency Contacts" /><Tab label="Safe Routes" />
        </Tabs>
      </Box>

      {/* Tab 0: Facilities + Map */}
      {activeTab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Card sx={{ height: 420, overflow: 'hidden', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <MapContainer center={[cityConfig.lat, cityConfig.lon]} zoom={cityConfig.zoom || 14} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                {facilities.filter((f: any) => f.lat && f.lon).map((facility: any) => {
                  const fmap = FACILITY_MAP[facility.facility_type];
                  return (
                    <Marker key={facility.id} position={[facility.lat, facility.lon]} icon={fmap?.icon || new L.Icon.Default()} eventHandlers={{ click: () => setSelectedFacility(facility) }}>
                      <Popup><strong>{facility.name}</strong><br />{fmap?.emoji} {facility.facility_type.replace('_', ' ')}<br />{facility.address && <>{facility.address}<br /></>}{facility.phone && <a href={`tel:${facility.phone}`}>{facility.phone}</a>}<br />{facility.operating_hours}</Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box sx={{ mb: 1.5 }}>
              <FormControl size="small" fullWidth>
                <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} displayEmpty sx={{ fontSize: '0.82rem' }}>
                  <MenuItem value="">All Facilities ({facilities.length})</MenuItem>
                  {Object.entries(FACILITY_MAP).map(([key, val]) => <MenuItem key={key} value={key}>{val.emoji} {val.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ maxHeight: 370, overflow: 'auto' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress sx={{ color: '#c4b5fd' }} size={28} /></Box>
              ) : facilities.length === 0 ? (
                <Alert severity="info" sx={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#38BDF8' }}>No facilities found.</Alert>
              ) : (
                facilities.map((f: any) => {
                  const fmap = FACILITY_MAP[f.facility_type];
                  const isSelected = selectedFacility?.id === f.id;
                  return (
                    <Box key={f.id} onClick={() => setSelectedFacility(f)} sx={{ p: 1.5, mb: 1, borderRadius: 2, cursor: 'pointer', background: isSelected ? `${fmap?.accent || '#c4b5fd'}15` : 'rgba(17,24,39,0.5)', border: `1px solid ${isSelected ? (fmap?.accent || '#c4b5fd') + '40' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.15s', '&:hover': { background: `${fmap?.accent || '#c4b5fd'}0A`, borderColor: `${fmap?.accent || '#c4b5fd'}25` } }}>
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        <Typography sx={{ fontSize: 18, mt: -0.25 }}>{fmap?.emoji}</Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#F0F4FF', fontSize: '0.8rem' }}>{f.name}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>{f.address}</Typography>
                          {f.phone && <Typography component="a" href={`tel:${f.phone}`} variant="caption" sx={{ color: fmap?.accent || '#c4b5fd', fontSize: '0.7rem', fontWeight: 600 }}>{f.phone}</Typography>}
                        </Box>
                        <Typography variant="caption" sx={{ color: '#4A5568', fontSize: '0.65rem', mt: 0.25 }}>{f.operating_hours}</Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Emergency Contacts */}
      {activeTab === 1 && (
        <Grid container spacing={2}>
          {Object.entries(groupedContacts).map(([category, items]) => (
            <Grid item xs={12} sm={6} key={category}>
              <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#c4b5fd', textTransform: 'capitalize', mb: 1, fontSize: '0.75rem' }}>{category.replace(/_/g, ' ')}</Typography>
                  {(items as any[]).map((c: any) => (
                    <Box key={c.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <Box><Typography variant="body2" sx={{ fontWeight: 600, color: '#F0F4FF', fontSize: '0.78rem' }}>{c.service_name}</Typography><Typography variant="caption" sx={{ color: '#4A5568', fontSize: '0.68rem' }}>{c.description}</Typography></Box>
                      <Button href={`tel:${c.phone_number}`} size="small" sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF4757', borderColor: 'rgba(255,71,87,0.4)', '&:hover': { background: 'rgba(255,71,87,0.08)' } }} variant="outlined">{c.phone_number}</Button>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 2: Safe Routes */}
      {activeTab === 2 && (
        safeRoutes ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 1 }}>Evacuation Routes</Typography>
                  {(safeRoutes.evacuation_routes || []).map((r: any, i: number) => (
                    <Box key={i} sx={{ py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#F0F4FF', fontSize: '0.8rem' }}>{r.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Capacity {r.capacity?.toLocaleString()} • <span style={{ color: r.status === 'open' ? '#2ED573' : '#FF4757' }}>{r.status?.toUpperCase()}</span>{r.distance_from_user_km != null && ` • ${r.distance_from_user_km} km away`}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 1 }}>Assembly Points</Typography>
                  {(safeRoutes.assembly_points || []).map((p: any, i: number) => (
                    <Box key={i} sx={{ py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#2ED573', fontSize: '0.8rem' }}>{p.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Capacity {p.capacity?.toLocaleString()}{p.distance_from_user_km != null && ` • ${p.distance_from_user_km} km away`}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#c4b5fd' }} /></Box>
      )}

      {/* SOS Dialog */}
      <Dialog open={sosOpen} onClose={closeSos} maxWidth="sm" fullWidth PaperProps={{ sx: { background: '#111827', border: '1px solid rgba(255,71,87,0.3)' } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #C62828 0%, #FF4757 100%)', color: '#fff', fontWeight: 800, letterSpacing: 0.5 }}>SOS Emergency Report</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {sosResult ? (
            <Alert severity={sosResult.success ? 'success' : 'error'} sx={{ mt: 1, background: sosResult.success ? 'rgba(46,213,115,0.1)' : 'rgba(255,71,87,0.1)' }}>
              {sosResult.message}
              {sosResult.nearest_assembly_point && <Typography variant="body2" sx={{ mt: 1 }}>Nearest assembly point: <strong>{sosResult.nearest_assembly_point.name}</strong>{sosResult.nearest_assembly_point.distance_km && ` (${sosResult.nearest_assembly_point.distance_km} km)`}</Typography>}
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField label="Your Name" size="small" fullWidth value={sosForm.name} onChange={(e) => setSosForm({ ...sosForm, name: e.target.value })} />
              <TextField label="Phone Number" size="small" fullWidth value={sosForm.phone} onChange={(e) => setSosForm({ ...sosForm, phone: e.target.value })} />
              <FormControl size="small" fullWidth><InputLabel>Emergency Type</InputLabel><Select value={sosForm.emergency_type} label="Emergency Type" onChange={(e) => setSosForm({ ...sosForm, emergency_type: e.target.value })}>{EMERGENCY_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}</Select></FormControl>
              <TextField label="Description of emergency" size="small" fullWidth multiline rows={3} value={sosForm.description} onChange={(e) => setSosForm({ ...sosForm, description: e.target.value })} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeSos} sx={{ color: '#64748B' }}>{sosResult ? 'Close' : 'Cancel'}</Button>
          {!sosResult && <Button variant="contained" color="error" onClick={handleSosSubmit} disabled={sosSubmitting} sx={{ background: 'linear-gradient(135deg, #FF4757 0%, #C62828 100%)' }}>{sosSubmitting ? 'Submitting...' : 'Submit SOS'}</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
