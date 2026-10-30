/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress, Chip, Button,
} from '@mui/material';
import { CheckCircle as CheckIcon } from '@mui/icons-material';
import { useDisasterData } from '../../context/DisasterDataContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const PRIORITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#FF4757', bg: 'rgba(255,71,87,0.1)', border: 'rgba(255,71,87,0.25)' },
  high: { color: '#FFA502', bg: 'rgba(255,165,2,0.1)', border: 'rgba(255,165,2,0.25)' },
  moderate: { color: '#FFD700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.2)' },
  low: { color: '#2ED573', bg: 'rgba(46,213,115,0.08)', border: 'rgba(46,213,115,0.2)' },
};

const fmtTime = (ts: string | undefined) => {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString(); } catch { return ts; }
};

const AlertCard = ({ alert, isAdmin, onAcknowledge }: { alert: any; isAdmin: boolean; onAcknowledge: (id: string) => void }) => {
  const style = PRIORITY_STYLE[alert.priority] || PRIORITY_STYLE.low;
  return (
    <Box sx={{ p: 1.5, mb: 1, borderRadius: 2, background: style.bg, border: `1px solid ${style.border}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
            <Chip label={alert.priority?.toUpperCase()} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, background: style.bg, color: style.color, border: `1px solid ${style.border}` }} />
            <Chip label={alert.type?.replace('_', ' ')} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', color: '#94A3B8', borderColor: 'rgba(148,163,184,0.2)' }} />
            {alert.acknowledged === 1 && <CheckIcon sx={{ fontSize: 14, color: '#2ED573' }} />}
          </Box>
          <Typography variant="body2" sx={{ color: '#F0F4FF', fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.4 }}>{alert.message}</Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#4A5568', fontSize: '0.68rem' }}>{fmtTime(alert.created_at || alert.timestamp)}</Typography>
            {alert.location && <Typography variant="caption" sx={{ color: '#4A5568', fontSize: '0.68rem' }}>{alert.location}</Typography>}
          </Box>
        </Box>
        {isAdmin && alert.acknowledged !== 1 && (
          <Button size="small" variant="outlined" onClick={() => onAcknowledge(alert.id)} sx={{ fontSize: '0.65rem', py: 0.25, px: 1, minWidth: 0, flexShrink: 0, borderColor: 'rgba(46,213,115,0.3)', color: '#2ED573', '&:hover': { background: 'rgba(46,213,115,0.08)' } }}>Ack</Button>
        )}
      </Box>
    </Box>
  );
};

export default function DisasterAlerts() {
  const { fetchAlerts } = useDisasterData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const API_BASE_URL = import.meta.env.VITE_DISASTER_API_URL || 'http://localhost:5001';

  const load = async () => {
    setLoading(true);
    try { const data = await fetchAlerts(); setAlerts(data.alerts || data || []); } catch { setAlerts([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcknowledge = async (alertId: string) => {
    try {
      await axios.post(`${API_BASE_URL}/api/admin/alerts/${encodeURIComponent(alertId)}/acknowledge`, { acknowledged_by: 'admin' }, { headers: { 'X-User-Role': 'admin' } });
      load();
    } catch (e) { console.error('Failed to acknowledge:', e); }
  };

  const filtered = filter === 'all' ? alerts : alerts.filter((a: any) => a.priority === filter);
  const counts: Record<string, number> = ['critical', 'high', 'moderate', 'low'].reduce((acc, p) => { acc[p] = alerts.filter((a: any) => a.priority === p).length; return acc; }, {} as Record<string, number>);

  return (
    <Box>
      <Box sx={{ mb: 2 }}><Typography variant="h5" sx={{ fontWeight: 800, color: '#F0F4FF' }}>Alerts &amp; Notifications</Typography><Typography variant="body2" sx={{ color: '#475569' }}>Real-time alerts generated from crowd, weather, earthquake, and traffic data</Typography></Box>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[{ label: 'Critical', key: 'critical', color: '#FF4757' }, { label: 'High', key: 'high', color: '#FFA502' }, { label: 'Moderate', key: 'moderate', color: '#FFD700' }, { label: 'Low', key: 'low', color: '#2ED573' }].map(({ label, key, color }) => (
          <Grid item xs={6} sm={3} key={key}>
            <Box onClick={() => setFilter(filter === key ? 'all' : key)} sx={{ p: 1.5, borderRadius: 2, textAlign: 'center', background: `${color}10`, border: `1px solid ${color}25`, cursor: 'pointer', outline: filter === key ? `2px solid ${color}` : 'none' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color, lineHeight: 1 }}>{counts[key]}</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>{label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.7rem', letterSpacing: 1 }}>
              {filter === 'all' ? `SHOWING ALL ${alerts.length} ALERTS` : `SHOWING ${filtered.length} ${filter.toUpperCase()} ALERTS`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" onClick={() => setFilter('all')} sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>Show All</Button>
              <Button size="small" onClick={load} sx={{ fontSize: '0.7rem', color: '#c4b5fd' }}>Refresh</Button>
            </Box>
          </Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#c4b5fd' }} size={32} /></Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><Typography variant="body2" sx={{ color: '#2ED573', fontWeight: 600 }}>No {filter === 'all' ? '' : filter} alerts — System operating normally</Typography></Box>
          ) : (
            filtered.map((alert: any, i: number) => <AlertCard key={alert.id || i} alert={alert} isAdmin={isAdmin} onAcknowledge={handleAcknowledge} />)
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
