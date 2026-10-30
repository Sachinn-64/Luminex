/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, Button, Chip,
} from '@mui/material';
import {
  Phone as PhoneIcon, LocationOn as LocationIcon, Shield as ShieldIcon,
  LocalHospital as HospitalIcon, LocalPolice as PoliceIcon, Warning as WarningIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { useDisasterData } from '../../context/DisasterDataContext';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon for Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const makeIcon = (color: string, emoji: string) => L.divIcon({
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:12px;">${emoji}</span></div>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -32],
});

const assemblyIcon = makeIcon('#2ED573', '🏟');
const routeColors: Record<string, string> = { primary: '#c4b5fd', emergency: '#FF4757', secondary: '#818CF8' };

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  medical: <HospitalIcon sx={{ fontSize: 18, color: '#FF4757' }} />,
  law_enforcement: <PoliceIcon sx={{ fontSize: 18, color: '#818CF8' }} />,
  fire: <WarningIcon sx={{ fontSize: 18, color: '#FFA502' }} />,
  disaster: <ShieldIcon sx={{ fontSize: 18, color: '#c4b5fd' }} />,
  kumbh: <LocationIcon sx={{ fontSize: 18, color: '#2ED573' }} />,
};

export default function DisasterEmergency() {
  const { fetchEmergencyContacts, fetchEvacuationRoutes, fetchAssemblyPoints, availableCities, selectedCity } = useDisasterData();
  const [contacts, setContacts] = useState<any>(null);
  const [routes, setRoutes] = useState<any>(null);
  const [assemblyPoints, setAssemblyPoints] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cityConfig = availableCities.find(c => c.id === selectedCity) || availableCities[0];

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [c, r, p] = await Promise.all([fetchEmergencyContacts(), fetchEvacuationRoutes(), fetchAssemblyPoints()]);
        setContacts(c); setRoutes(r); setAssemblyPoints(p);
      } catch { setError('Failed to load emergency data.'); } finally { setLoading(false); }
    };
    load();
  }, [fetchEmergencyContacts, fetchEvacuationRoutes, fetchAssemblyPoints]);

  if (loading) return <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><CircularProgress sx={{ color: '#c4b5fd' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;

  const groupedContacts = (contacts || []).reduce((acc: any, c: any) => { const cat = c.category || 'general'; if (!acc[cat]) acc[cat] = []; acc[cat].push(c); return acc; }, {} as Record<string, any[]>);
  const allRoutes = routes?.all_routes || [];
  const points = assemblyPoints?.assembly_points || [];

  return (
    <Box>
      <Box sx={{ mb: 2 }}><Typography variant="h5" sx={{ fontWeight: 800, color: '#F0F4FF' }}>Emergency Response</Typography><Typography variant="body2" sx={{ color: '#475569' }}>Assembly points, evacuation routes, and emergency contacts</Typography></Box>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card sx={{ height: 420, overflow: 'hidden', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <Box sx={{ height: '100%', position: 'relative' }}>
              <Box sx={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, background: 'rgba(11,15,26,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(196,181,253,0.2)', borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, display: 'block', mb: 0.5 }}>LEGEND</Typography>
                {[{ color: '#2ED573', label: 'Assembly Point' }, { color: '#c4b5fd', label: 'Primary Route' }, { color: '#FF4757', label: 'Emergency Route' }, { color: '#818CF8', label: 'Secondary Route' }].map(({ color, label }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}><Box sx={{ width: 12, height: 4, borderRadius: 2, background: color }} /><Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem' }}>{label}</Typography></Box>
                ))}
              </Box>
              <MapContainer center={[cityConfig.lat, cityConfig.lon]} zoom={cityConfig.zoom || 13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
                {points.filter((p: any) => p.coordinates?.length >= 2).map((pt: any) => (
                  <Marker key={pt.id} position={[pt.coordinates[0], pt.coordinates[1]]} icon={assemblyIcon}>
                    <Popup><strong>{pt.name}</strong><br />Capacity: {pt.capacity?.toLocaleString()}<br /><span style={{ color: '#2ED573' }}>ACTIVE</span></Popup>
                  </Marker>
                ))}
                {allRoutes.map((route: any) => {
                  const coords = Array.isArray(route.coordinates) ? route.coordinates : [];
                  if (coords.length < 2) return null;
                  return (
                    <Polyline key={route.id} positions={coords.map((c: number[]) => [c[0], c[1]])} pathOptions={{ color: routeColors[route.route_type] || '#818CF8', weight: 4, opacity: 0.85, dashArray: route.route_type === 'secondary' ? '6,4' : undefined }}>
                      <Popup><strong>{route.name}</strong><br />Type: {route.route_type}<br />Capacity: {route.capacity?.toLocaleString()} people<br /><span style={{ color: route.status === 'open' ? '#2ED573' : '#FF4757' }}>{route.status?.toUpperCase()}</span></Popup>
                    </Polyline>
                  );
                })}
              </MapContainer>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 1.5 }}>Emergency Contacts</Typography>
              {Object.entries(groupedContacts).map(([category, items]) => (
                <Box key={category} sx={{ mb: 1.5 }}>
                  <Chip label={category.replace('_', ' ').toUpperCase()} size="small" sx={{ mb: 0.75, height: 18, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(196,181,253,0.12)', color: '#c4b5fd', border: '1px solid rgba(196,181,253,0.25)' }} />
                  {(items as any[]).map((contact: any) => (
                    <Box key={contact.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {CATEGORY_ICONS[contact.category] || <PhoneIcon sx={{ fontSize: 18, color: '#94A3B8' }} />}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#F0F4FF', fontSize: '0.8rem' }}>{contact.service_name}</Typography>
                        <Typography variant="caption" sx={{ color: '#4A5568', fontSize: '0.7rem' }}>{contact.description}</Typography>
                      </Box>
                      <Button variant="outlined" size="small" href={`tel:${contact.phone_number}`} sx={{ fontSize: '0.7rem', py: 0.25, px: 1, minWidth: 0, borderColor: 'rgba(255,71,87,0.4)', color: '#FF4757', '&:hover': { borderColor: '#FF4757', background: 'rgba(255,71,87,0.08)' } }}>{contact.phone_number}</Button>
                    </Box>
                  ))}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 1 }}>Evacuation Routes</Typography>
                {allRoutes.map((route: any) => (
                  <Box key={route.id} sx={{ display: 'flex', gap: 1.5, py: 0.75, alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.04)', '&:last-child': { borderBottom: 'none' } }}>
                    <Box sx={{ width: 4, borderRadius: 2, alignSelf: 'stretch', flexShrink: 0, background: routeColors[route.route_type] || '#818CF8' }} />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#F0F4FF', fontSize: '0.8rem' }}>{route.name}</Typography>
                        <Chip label={route.status} size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, flexShrink: 0, background: route.status === 'open' ? 'rgba(46,213,115,0.12)' : 'rgba(255,71,87,0.12)', color: route.status === 'open' ? '#2ED573' : '#FF4757', border: `1px solid ${route.status === 'open' ? 'rgba(46,213,115,0.25)' : 'rgba(255,71,87,0.25)'}` }} />
                      </Box>
                      <Typography variant="caption" sx={{ color: '#4A5568', fontSize: '0.7rem' }}>Capacity: {route.capacity?.toLocaleString()} • {route.route_type} • {route.description}</Typography>
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>

            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 1 }}>Assembly Points</Typography>
                <Grid container spacing={1}>
                  {points.map((point: any) => (
                    <Grid item xs={6} key={point.id}>
                      <Box sx={{ p: 1.25, borderRadius: 2, background: 'rgba(46,213,115,0.06)', border: '1px solid rgba(46,213,115,0.15)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#F0F4FF', fontSize: '0.78rem' }}>{point.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#2ED573', fontWeight: 600, fontSize: '0.68rem' }}>Cap: {point.capacity?.toLocaleString()} people</Typography><br />
                        <Typography variant="caption" sx={{ color: '#4A5568', fontSize: '0.65rem' }}>{point.coordinates ? `${point.coordinates[0].toFixed(4)}, ${point.coordinates[1].toFixed(4)}` : ''}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 1 }}>Emergency Procedures</Typography>
                {[{ step: '1', title: 'Immediate Response', desc: 'Activate emergency protocols and deploy response teams.', color: '#FF4757' }, { step: '2', title: 'Evacuation', desc: 'Direct crowds to designated evacuation routes shown on the map.', color: '#FFA502' }, { step: '3', title: 'Communication', desc: 'Contact emergency services and broadcast public announcements.', color: '#2ED573' }].map(({ step, title, desc, color }) => (
                  <Box key={step} sx={{ display: 'flex', gap: 1.5, py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.04)', '&:last-child': { borderBottom: 'none' } }}>
                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography variant="caption" sx={{ color, fontWeight: 800, fontSize: '0.7rem' }}>{step}</Typography></Box>
                    <Box><Typography variant="body2" sx={{ fontWeight: 700, color: '#F0F4FF', fontSize: '0.78rem' }}>{title}</Typography><Typography variant="caption" sx={{ color: '#475569', fontSize: '0.7rem' }}>{desc}</Typography></Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
