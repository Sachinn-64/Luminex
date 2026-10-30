import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, Bot, CloudRain, Flame, Loader2, RefreshCw, Users, Wind } from 'lucide-react';
import { useDisasterData } from '../context/DisasterDataContext';
import HazardTimeline from '../components/prediction/HazardTimeline';
import { LevelBadge, SectionTitle } from '../components/disaster/ui';
import { panel } from '../components/disaster/styles';
import {
  HAZARD_META, apiError, disasterClient, formatSlot, pct, type Forecast, type HazardKey,
} from '../lib/disasterApi';

const HORIZONS = [24, 48, 72, 120];
const HAZARD_ICONS: Record<HazardKey, typeof Flame> = { flood: CloudRain, heat: Flame, storm: Wind, stampede: Users };

export default function DisasterPrediction() {
  const { selectedCity, availableCities } = useDisasterData();
  const [hours, setHours] = useState(72);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const city = availableCities.find(c => c.id === selectedCity);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await disasterClient().get<Forecast>('/api/prediction/forecast', { params: { city: selectedCity, hours } });
      setForecast(data);
    } catch (err) {
      setError(apiError(err, 'Could not load the forecast. Is the disaster backend running on port 5001?'));
    } finally {
      setLoading(false);
    }
  }, [selectedCity, hours]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'hsl(var(--foreground))' }}>Disaster prediction</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
            {hours}-hour hazard forecast for {city?.display_name || selectedCity}: flood, heat stress, storm and stampede risk
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {HORIZONS.map(h => (
            <button key={h} onClick={() => setHours(h)} style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              border: '1px solid hsl(var(--border))',
              background: h === hours ? 'hsl(var(--primary))' : 'transparent',
              color: h === hours ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
            }}>{h}h</button>
          ))}
          <button onClick={load} title="Refresh" style={{ padding: 6, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'transparent', color: 'hsl(var(--foreground))', cursor: 'pointer', display: 'flex' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />
          </button>
        </div>
      </div>

      {error && <div style={{ ...panel, borderColor: '#ef444466', color: 'hsl(var(--foreground))' }}>{error}</div>}
      {loading && !forecast && (
        <div style={{ ...panel, display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 className="animate-spin" /></div>
      )}

      {forecast && (
        <>
          {forecast.data_sources.weather === 'mock' && (
            <div style={{ ...panel, padding: '10px 14px', fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
              Weather input is simulated because OPENWEATHER_API_KEY is not set in backend-disaster/.env. Confidence is reduced accordingly.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <div style={panel}>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Overall outlook</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'hsl(var(--foreground))', margin: '4px 0' }}>{pct(forecast.summary.overall_peak)}</div>
              <LevelBadge level={forecast.summary.overall_level} />
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 6 }}>Next 24h: {forecast.summary.next_24h_level}</div>
            </div>
            {(Object.keys(HAZARD_META) as HazardKey[]).map(h => {
              const Icon = HAZARD_ICONS[h];
              const peak = forecast.peaks[h];
              return (
                <div key={h} style={panel}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                    <Icon size={14} color={HAZARD_META[h].color} />{HAZARD_META[h].label} peak
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'hsl(var(--foreground))', margin: '4px 0' }}>{pct(peak.risk)}</div>
                  <LevelBadge level={peak.level} />
                  {peak.time && <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 6 }}>at {formatSlot(peak.time)}</div>}
                </div>
              );
            })}
          </div>

          <div style={panel}>
            <SectionTitle>Hazard probability timeline</SectionTitle>
            <HazardTimeline timeline={forecast.timeline} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <div style={panel}>
              <SectionTitle right={<span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>threshold 50%</span>}>
                Early warnings
              </SectionTitle>
              {forecast.early_warnings.length === 0 && (
                <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: 0 }}>No hazard is forecast to cross the warning threshold.</p>
              )}
              <div style={{ display: 'grid', gap: 10 }}>
                {forecast.early_warnings.map(w => (
                  <div key={w.hazard} style={{ border: '1px solid hsl(var(--border) / 0.7)', borderLeft: `3px solid ${HAZARD_META[w.hazard].color}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <strong style={{ color: 'hsl(var(--foreground))', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={14} />{HAZARD_META[w.hazard].label}
                      </strong>
                      <LevelBadge level={w.level} />
                    </div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '4px 0 8px' }}>
                      Onset {formatSlot(w.onset)} · lead time <strong>{w.lead_time_hours}h</strong> · peak {pct(w.peak_risk)} · confidence {pct(w.confidence)}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'hsl(var(--foreground))', listStyle: 'disc' }}>
                      {w.actions.map(a => <li key={a}>{a}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div style={panel}>
              <SectionTitle right={<span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{forecast.advisory.source === 'gemini' ? 'Gemini' : 'Rule engine'}</span>}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Bot size={16} /> AI advisory</span>
              </SectionTitle>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'hsl(var(--foreground))' }}>
                <ReactMarkdown components={{
                  ul: props => <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: '6px 0' }} {...props} />,
                  p: props => <p style={{ margin: '6px 0' }} {...props} />,
                }}>{forecast.advisory.text}</ReactMarkdown>
              </div>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 12, borderTop: '1px solid hsl(var(--border) / 0.6)', paddingTop: 8 }}>
                Model {forecast.model.name}: {forecast.model.notes} Rain over horizon: {forecast.summary.rain_total_mm} mm · max heat index {forecast.summary.max_heat_index_c}°C.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
