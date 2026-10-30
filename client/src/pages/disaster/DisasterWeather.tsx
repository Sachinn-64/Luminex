/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, Chip, Divider, LinearProgress, Tooltip } from '@mui/material';
import { WbSunny, Opacity, Air, Visibility, Thermostat, WaterDrop, NavigateNext, Cloud, Grain, Thunderstorm, AcUnit } from '@mui/icons-material';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import { useDisasterData } from '../../context/DisasterDataContext';
import 'leaflet/dist/leaflet.css';

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  'clear sky': <WbSunny sx={{ color: '#FFD700' }} />,
  'few clouds': <Cloud sx={{ color: '#94A3B8' }} />,
  'scattered clouds': <Cloud sx={{ color: '#94A3B8' }} />,
  'broken clouds': <Cloud sx={{ color: '#64748B' }} />,
  'light rain': <WaterDrop sx={{ color: '#2ED573' }} />,
  'moderate rain': <Grain sx={{ color: '#74B9FF' }} />,
  'heavy rain': <Thunderstorm sx={{ color: '#FF4757' }} />,
  'snow': <AcUnit sx={{ color: '#A8D8EA' }} />,
};

const getWeatherColor = (desc = '') => {
  const d = desc.toLowerCase();
  if (d.includes('rain') || d.includes('storm')) return '#74B9FF';
  if (d.includes('cloud')) return '#94A3B8';
  if (d.includes('clear')) return '#FFD700';
  if (d.includes('snow')) return '#A8D8EA';
  return '#c4b5fd';
};

const StatCard = ({ icon, label, value, unit, color = '#c4b5fd' }: any) => (
  <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Box sx={{ color, display: 'flex' }}>{icon}</Box>
    <Box>
      <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>{label}</Typography>
      <Typography variant="body1" sx={{ color: '#F0F4FF', fontWeight: 700 }}>
        {value}<Typography component="span" variant="caption" sx={{ color: '#94A3B8', ml: 0.5 }}>{unit}</Typography>
      </Typography>
    </Box>
  </Box>
);

export default function DisasterWeather() {
  const { fetchWeatherData, fetchWeatherForecast, selectedCity, availableCities } = useDisasterData();
  const [weatherData, setWeatherData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const [current, forecast] = await Promise.all([fetchWeatherData(), fetchWeatherForecast()]);
        setWeatherData(current); setForecastData(forecast);
      } catch { setError('Failed to load weather data'); }
      finally { setLoading(false); }
    };
    load();
  }, [selectedCity]); // eslint-disable-line react-hooks/exhaustive-deps

  const cityConfig = availableCities.find(c => c.id === selectedCity) || availableCities[0];
  const mapCenter: [number, number] = cityConfig ? [cityConfig.lat, cityConfig.lon] : [17.6784, 75.3294];

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress sx={{ color: '#c4b5fd' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;

  const desc = weatherData?.description || '';
  const weatherColor = getWeatherColor(desc);
  const coords = weatherData?.coordinates || mapCenter;

  const forecastsByDay: Record<string, any[]> = {};
  (forecastData?.forecasts || []).forEach((f: any) => {
    const day = new Date(f.datetime).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!forecastsByDay[day]) forecastsByDay[day] = [];
    forecastsByDay[day].push(f);
  });
  const dayKeys = Object.keys(forecastsByDay).slice(0, 5);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#F0F4FF' }}>Weather Monitoring</Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>Live atmospheric conditions — {cityConfig?.display_name || selectedCity}</Typography>
      </Box>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5} lg={4}>
          <Card sx={{ height: '100%', background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ color: weatherColor, fontSize: 40, display: 'flex' }}>{WEATHER_ICONS[desc.toLowerCase()] || <WbSunny sx={{ color: '#FFD700', fontSize: 40 }} />}</Box>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#F0F4FF', lineHeight: 1 }}>{Math.round(weatherData?.temperature ?? 0)}°C</Typography>
                  <Typography variant="body2" sx={{ color: '#94A3B8', textTransform: 'capitalize' }}>{desc || 'N/A'}</Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                {[['Feels like', `${Math.round(weatherData?.feels_like ?? 0)}°C`], ['Pressure', `${weatherData?.pressure ?? '—'} hPa`], ['Cloud Cover', `${weatherData?.clouds ?? '—'}%`], ['Rainfall (3h)', `${weatherData?.rain_3h ?? 0} mm`]].map(([l, v]) => (
                  <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>{l}</Typography>
                    <Typography variant="caption" sx={{ color: '#F0F4FF', fontWeight: 600 }}>{v}</Typography>
                  </Box>
                ))}
              </Box>
              <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.06)' }} />
              <Grid container spacing={1}>
                <Grid item xs={6}><StatCard icon={<Opacity />} label="Humidity" value={weatherData?.humidity || 0} unit="%" color="#74B9FF" /></Grid>
                <Grid item xs={6}><StatCard icon={<Air />} label="Wind" value={weatherData?.wind_speed || 0} unit="m/s" color="#2ED573" /></Grid>
                <Grid item xs={6}><StatCard icon={<Visibility />} label="Visibility" value={Math.round(((weatherData?.visibility || 10000) / 1000) * 10) / 10} unit="km" color="#FFD700" /></Grid>
                <Grid item xs={6}><StatCard icon={<Thermostat />} label="Wind Dir" value={weatherData?.wind_direction ?? '—'} unit="°" color="#c4b5fd" /></Grid>
              </Grid>
              {weatherData?.data_source && (
                <Box sx={{ mt: 2 }}>
                  <Chip label={weatherData.data_source === 'openweathermap' ? 'Live — OpenWeatherMap' : 'Simulated Data'} size="small"
                    sx={{ background: weatherData.data_source === 'openweathermap' ? 'rgba(46,213,115,0.12)' : 'rgba(196,181,253,0.12)', color: weatherData.data_source === 'openweathermap' ? '#2ED573' : '#c4b5fd', border: `1px solid ${weatherData.data_source === 'openweathermap' ? 'rgba(46,213,115,0.3)' : 'rgba(196,181,253,0.3)'}`, fontSize: '0.7rem' }} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7} lg={8}>
          <Card sx={{ height: 380, background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <MapContainer center={[coords[0] || mapCenter[0], coords[1] || mapCenter[1]]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
              <CircleMarker center={[coords[0] || mapCenter[0], coords[1] || mapCenter[1]]} radius={20} pathOptions={{ color: weatherColor, fillColor: weatherColor, fillOpacity: 0.25, weight: 2 }}>
                <LeafletTooltip permanent><span style={{ fontSize: '12px', fontWeight: 700 }}>{Math.round(weatherData?.temperature ?? 0)}°C · {desc}</span></LeafletTooltip>
                <Popup><strong>{weatherData?.location || cityConfig?.name}</strong><br />Temp: {Math.round(weatherData?.temperature ?? 0)}°C<br />Humidity: {weatherData?.humidity}%</Popup>
              </CircleMarker>
            </MapContainer>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 2 }}>5-Day Forecast</Typography>
              <Grid container spacing={1.5}>
                {dayKeys.map(day => {
                  const dayForecasts = forecastsByDay[day];
                  const avgTemp = Math.round(dayForecasts.reduce((s: number, f: any) => s + f.temperature, 0) / dayForecasts.length);
                  const maxTemp = Math.round(Math.max(...dayForecasts.map((f: any) => f.temp_max || f.temperature)));
                  const minTemp = Math.round(Math.min(...dayForecasts.map((f: any) => f.temp_min || f.temperature)));
                  const avgHumidity = Math.round(dayForecasts.reduce((s: number, f: any) => s + f.humidity, 0) / dayForecasts.length);
                  const maxPrecip = Math.round(Math.max(...dayForecasts.map((f: any) => f.precipitation || 0)));
                  const dayDesc = dayForecasts[Math.floor(dayForecasts.length / 2)]?.description || '';
                  const color = getWeatherColor(dayDesc);
                  return (
                    <Grid item xs={12} sm={6} md={2.4} key={day}>
                      <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`, textAlign: 'center', height: '100%' }}>
                        <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1 }}>{day}</Typography>
                        <Box sx={{ color, display: 'flex', justifyContent: 'center', mb: 1 }}>{WEATHER_ICONS[dayDesc.toLowerCase()] || <WbSunny sx={{ color: '#FFD700' }} />}</Box>
                        <Typography variant="h6" sx={{ color: '#F0F4FF', fontWeight: 700, lineHeight: 1 }}>{avgTemp}°</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>{maxTemp}° / {minTemp}°</Typography>
                        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.06)' }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                          <Tooltip title="Humidity"><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Opacity sx={{ fontSize: 11, color: '#74B9FF' }} /><Typography variant="caption" sx={{ color: '#74B9FF' }}>{avgHumidity}%</Typography></Box></Tooltip>
                          <Tooltip title="Precipitation"><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><WaterDrop sx={{ fontSize: 11, color: '#2ED573' }} /><Typography variant="caption" sx={{ color: '#2ED573' }}>{maxPrecip}%</Typography></Box></Tooltip>
                        </Box>
                        <Box sx={{ mt: 1 }}><LinearProgress variant="determinate" value={maxPrecip} sx={{ height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { bgcolor: '#74B9FF' } }} /></Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {forecastData?.forecasts?.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ background: 'rgba(17,24,39,0.85)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#F0F4FF', mb: 2 }}>Next 24-Hour Breakdown</Typography>
                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                  {forecastData.forecasts.slice(0, 8).map((f: any, i: number) => {
                    const time = new Date(f.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    const c = getWeatherColor(f.description);
                    return (
                      <Box key={i} sx={{ minWidth: 90, p: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.03)', border: `1px solid ${c}20`, textAlign: 'center', flexShrink: 0 }}>
                        <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>{time}</Typography>
                        <Box sx={{ color: c, display: 'flex', justifyContent: 'center', my: 0.5 }}>{WEATHER_ICONS[f.description?.toLowerCase()] || <WbSunny sx={{ color: '#FFD700', fontSize: 18 }} />}</Box>
                        <Typography variant="body2" sx={{ color: '#F0F4FF', fontWeight: 700 }}>{Math.round(f.temperature)}°</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3, mt: 0.5 }}><Air sx={{ fontSize: 11, color: '#2ED573' }} /><Typography variant="caption" sx={{ color: '#2ED573' }}>{f.wind_speed}m/s</Typography></Box>
                        {f.precipitation > 0 && <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3, mt: 0.3 }}><WaterDrop sx={{ fontSize: 11, color: '#74B9FF' }} /><Typography variant="caption" sx={{ color: '#74B9FF' }}>{Math.round(f.precipitation)}%</Typography></Box>}
                      </Box>
                    );
                  })}
                  <Box sx={{ display: 'flex', alignItems: 'center', color: '#94A3B8' }}><NavigateNext /></Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
