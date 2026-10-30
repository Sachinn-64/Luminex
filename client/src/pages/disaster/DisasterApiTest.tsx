/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Button, CircularProgress, Alert,
  Accordion, AccordionSummary, AccordionDetails, Chip, FormControl, InputLabel,
  Select, MenuItem,
} from '@mui/material';
import {
  ExpandMore, PlayArrow, Refresh, CheckCircle, Error as ErrorIcon, Warning,
} from '@mui/icons-material';
import axios from 'axios';
import { useDisasterData } from '../../context/DisasterDataContext';

const API_ENDPOINTS = [
  { name: 'Dashboard Overview', method: 'GET', url: '/api/dashboard', description: 'Get complete dashboard data including all services', category: 'Dashboard' },
  { name: 'Weather Data', method: 'GET', url: '/api/weather', description: 'Get current weather conditions and forecasts', category: 'Weather' },
  { name: 'Weather Forecast', method: 'GET', url: '/api/weather/forecast', description: 'Get weather forecast for next 5 days', category: 'Weather' },
  { name: 'Earthquake Data', method: 'GET', url: '/api/earthquakes', description: 'Get recent earthquake data from USGS', category: 'Earthquakes' },
  { name: 'Crowd Analytics', method: 'GET', url: '/api/crowd', description: 'Get crowd density and flow analytics', category: 'Crowd' },
  { name: 'Traffic Conditions', method: 'GET', url: '/api/traffic', description: 'Get current traffic conditions and routes', category: 'Traffic' },
  { name: 'Alerts', method: 'GET', url: '/api/alerts', description: 'Get all active alerts and notifications', category: 'Alerts' },
  { name: 'Risk Score', method: 'GET', url: '/api/risk-score', description: 'Get current risk assessment score', category: 'Risk' },
  { name: 'Satellite Imagery', method: 'GET', url: '/api/satellite/imagery', description: 'Get satellite imagery and coverage data', category: 'Satellite' },
  { name: 'Flood Analysis', method: 'GET', url: '/api/satellite/flood-analysis', description: 'Get flood analysis from satellite data', category: 'Satellite' },
  { name: 'Terrain Analysis', method: 'GET', url: '/api/satellite/terrain-analysis', description: 'Get terrain analysis from satellite data', category: 'Satellite' },
  { name: 'Emergency Contacts', method: 'GET', url: '/api/emergency/contacts', description: 'Get emergency contact information', category: 'Emergency' },
  { name: 'Evacuation Routes', method: 'GET', url: '/api/evacuation-routes', description: 'Get evacuation route information', category: 'Emergency' },
];

const CATEGORIES = [...new Set(API_ENDPOINTS.map(ep => ep.category))];

export default function DisasterApiTest() {
  const { API_BASE_URL } = useDisasterData();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [selectedCategory, setSelectedCategory] = useState('');

  const testEndpoint = async (ep: typeof API_ENDPOINTS[0]) => {
    setLoading(prev => ({ ...prev, [ep.url]: true }));
    setErrors(prev => ({ ...prev, [ep.url]: null }));
    try {
      const res = await axios.get(`${API_BASE_URL}${ep.url}`);
      setResponses(prev => ({ ...prev, [ep.url]: { data: res.data, status: res.status, timestamp: new Date().toISOString() } }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [ep.url]: { message: err.message, status: err.response?.status, data: err.response?.data, timestamp: new Date().toISOString() } }));
    } finally {
      setLoading(prev => ({ ...prev, [ep.url]: false }));
    }
  };

  const testAll = async () => {
    for (const ep of API_ENDPOINTS) {
      await testEndpoint(ep);
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const clearAll = () => { setResponses({}); setErrors({}); setLoading({}); };

  const statusIcon = (ep: typeof API_ENDPOINTS[0]) => {
    if (loading[ep.url]) return <CircularProgress size={16} />;
    if (errors[ep.url]) return <ErrorIcon color="error" />;
    if (responses[ep.url]) return <CheckCircle color="success" />;
    return <Warning color="action" />;
  };

  const fmt = (data: any) => { try { return JSON.stringify(data, null, 2); } catch { return String(data); } };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#F0F4FF' }}>API Testing & Endpoints</Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>Test and monitor all disaster-prediction API endpoints</Typography>
      </Box>

      <Card sx={{ mb: 3, background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <Button variant="contained" startIcon={<PlayArrow />} onClick={testAll} disabled={Object.values(loading).some(Boolean)} sx={{ bgcolor: '#c4b5fd', color: '#050508', '&:hover': { bgcolor: '#a78bfa' }, fontWeight: 700 }}>
              Test All Endpoints
            </Button>
            <Button variant="outlined" startIcon={<Refresh />} onClick={clearAll} sx={{ color: '#c4b5fd', borderColor: 'rgba(196,181,253,0.3)', '&:hover': { borderColor: '#c4b5fd' } }}>
              Clear Results
            </Button>
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel sx={{ color: '#94A3B8' }}>Filter by Category</InputLabel>
              <Select value={selectedCategory} label="Filter by Category" onChange={e => setSelectedCategory(e.target.value)} sx={{ color: '#F0F4FF', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                <MenuItem value="">All Categories</MenuItem>
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {CATEGORIES.map(category => {
        const eps = API_ENDPOINTS.filter(ep => ep.category === category && (!selectedCategory || ep.category === selectedCategory));
        if (eps.length === 0) return null;
        return (
          <Accordion key={category} defaultExpanded sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px !important', mb: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#94A3B8' }} />}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h6" sx={{ color: '#F0F4FF' }}>{category}</Typography>
                <Chip label={eps.length} size="small" sx={{ color: '#c4b5fd', borderColor: 'rgba(196,181,253,0.3)' }} variant="outlined" />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {eps.map(ep => (
                  <Grid item xs={12} key={ep.url}>
                    <Card sx={{ background: 'rgba(10,11,18,0.6)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 2 }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Box>
                            <Typography variant="h6" sx={{ color: '#F0F4FF' }}>{ep.name}</Typography>
                            <Typography variant="body2" sx={{ color: '#94A3B8' }}>{ep.description}</Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip label={ep.method} size="small" sx={{ bgcolor: 'rgba(196,181,253,0.15)', color: '#c4b5fd', fontWeight: 700 }} />
                            {statusIcon(ep)}
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#94A3B8', mb: 2 }}>{API_BASE_URL}{ep.url}</Typography>
                        <Button variant="outlined" size="small" startIcon={<PlayArrow />} onClick={() => testEndpoint(ep)} disabled={loading[ep.url]} sx={{ color: '#c4b5fd', borderColor: 'rgba(196,181,253,0.3)', mb: 1 }}>
                          {loading[ep.url] ? 'Testing...' : 'Test Endpoint'}
                        </Button>
                        {responses[ep.url] && (
                          <Box mt={2}>
                            <Typography variant="subtitle2" sx={{ color: '#2ED573', mb: 1 }}>Response (Status: {responses[ep.url].status})</Typography>
                            <Box sx={{ bgcolor: 'rgba(0,0,0,0.4)', p: 2, borderRadius: 1, maxHeight: 300, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.8rem', color: '#94A3B8' }}>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{fmt(responses[ep.url].data)}</pre>
                            </Box>
                            <Typography variant="caption" sx={{ color: '#4A5568', mt: 1, display: 'block' }}>Timestamp: {new Date(responses[ep.url].timestamp).toLocaleString()}</Typography>
                          </Box>
                        )}
                        {errors[ep.url] && (
                          <Alert severity="error" sx={{ mt: 2, bgcolor: 'rgba(255,71,87,0.08)', color: '#FF6B76' }}>
                            <Typography variant="subtitle2">Error (Status: {errors[ep.url].status || 'N/A'})</Typography>
                            <Typography variant="body2">{errors[ep.url].message}</Typography>
                            {errors[ep.url].data && <Box mt={1}><pre style={{ fontSize: '0.75rem', margin: 0 }}>{fmt(errors[ep.url].data)}</pre></Box>}
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Card sx={{ mt: 3, background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#F0F4FF', mb: 1 }}>Summary</Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip label={`Total: ${API_ENDPOINTS.length}`} sx={{ color: '#c4b5fd', borderColor: 'rgba(196,181,253,0.3)' }} variant="outlined" />
            <Chip label={`Success: ${Object.keys(responses).length}`} sx={{ color: '#2ED573', borderColor: 'rgba(46,213,115,0.3)' }} variant="outlined" />
            <Chip label={`Errors: ${Object.keys(errors).filter(k => errors[k]).length}`} sx={{ color: '#FF4757', borderColor: 'rgba(255,71,87,0.3)' }} variant="outlined" />
            <Chip label={`Pending: ${Object.keys(loading).filter(k => loading[k]).length}`} sx={{ color: '#FFA502', borderColor: 'rgba(255,165,2,0.3)' }} variant="outlined" />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
