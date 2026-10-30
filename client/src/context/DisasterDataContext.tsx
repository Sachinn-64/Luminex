import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface CityConfig {
  id: string;
  name: string;
  display_name: string;
  is_primary: boolean;
  lat: number;
  lon: number;
  zoom: number;
  event?: string;
}

interface DisasterDataContextType {
  selectedCity: string;
  availableCities: CityConfig[];
  changeCity: (cityId: string) => void;
  dashboardData: Record<string, unknown>;
  loading: boolean;
  error: string | null;
  refreshData: () => void;
  isAdmin: boolean;
  fetchWeatherData: () => Promise<unknown>;
  fetchWeatherForecast: () => Promise<unknown>;
  fetchEarthquakeData: () => Promise<unknown>;
  fetchCrowdData: () => Promise<unknown>;
  fetchTrafficData: () => Promise<unknown>;
  fetchAlerts: () => Promise<unknown>;
  fetchRiskScore: () => Promise<unknown>;
  fetchEmergencyContacts: () => Promise<unknown>;
  fetchEvacuationRoutes: () => Promise<unknown>;
  fetchAssemblyPoints: () => Promise<unknown>;
  fetchSatelliteImagery: () => Promise<unknown>;
  fetchFloodAnalysis: () => Promise<unknown>;
  fetchTerrainAnalysis: () => Promise<unknown>;
  fetchSeismicRisk: () => Promise<unknown>;
  fetchNearbyFacilities: (lat: number, lon: number, type?: string, radius?: number) => Promise<unknown>;
  submitSOS: (payload: Record<string, unknown>) => Promise<unknown>;
  fetchSafeRoutes: (lat: number, lon: number) => Promise<unknown>;
  fetchAllFacilities: (type?: string) => Promise<unknown>;
  API_BASE_URL: string;
}

const DisasterDataContext = createContext<DisasterDataContextType | null>(null);

export function useDisasterData() {
  const ctx = useContext(DisasterDataContext);
  if (!ctx) throw new Error('useDisasterData must be used within DisasterDataProvider');
  return ctx;
}

const API_BASE_URL =  'http://localhost:5001';

export function DisasterDataProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [selectedCity, setSelectedCity] = useState('pandharpur');
  const [availableCities, setAvailableCities] = useState<CityConfig[]>([
    { id: 'pandharpur', name: 'Pandharpur', display_name: 'Pandharpur (Wari)', is_primary: true, lat: 17.6784, lon: 75.3294, zoom: 15 },
  ]);

  const [dashboardData, setDashboardData] = useState<Record<string, unknown>>({
    city: null, weather: {}, earthquakes: [], crowd: {}, traffic: {},
    alerts: { alerts: [] }, risk_score: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedCityRef = useRef<string | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/cities`)
      .then(res => {
        if (res.data.cities?.length > 0) {
          const cityList = res.data.cities.filter((city: CityConfig) => city.id === 'pandharpur');
          if (cityList.length > 0) setAvailableCities(cityList);
        }
      })
      .catch(() => {});
  }, []);

  const fetchDashboardData = useCallback(async (city?: string) => {
    const cityToFetch = city || selectedCity;
    const needsSpinner = loadedCityRef.current !== cityToFetch;
    try {
      if (needsSpinner) setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/dashboard?city=${cityToFetch}`);
      setDashboardData(response.data);
      loadedCityRef.current = cityToFetch;
    } catch {
      if (needsSpinner) setError('Failed to fetch dashboard data. Check if the backend is running.');
    } finally {
      if (needsSpinner) setLoading(false);
    }
  }, [selectedCity]);

  useEffect(() => {
    fetchDashboardData(selectedCity);
  }, [selectedCity, fetchDashboardData]);

  const changeCity = (cityId: string) => setSelectedCity(cityId);
  const refreshData = () => { fetchDashboardData(selectedCity); };

  const fetchWeatherData = async () => (await axios.get(`${API_BASE_URL}/api/weather?city=${selectedCity}`)).data;
  const fetchWeatherForecast = async () => (await axios.get(`${API_BASE_URL}/api/weather/forecast?city=${selectedCity}`)).data;
  const fetchEarthquakeData = async () => (await axios.get(`${API_BASE_URL}/api/earthquakes`)).data;
  const fetchCrowdData = async () => (await axios.get(`${API_BASE_URL}/api/crowd?city=${selectedCity}`)).data;
  const fetchTrafficData = async () => (await axios.get(`${API_BASE_URL}/api/traffic`)).data;
  const fetchAlerts = async () => (await axios.get(`${API_BASE_URL}/api/alerts`)).data;
  const fetchRiskScore = async () => (await axios.get(`${API_BASE_URL}/api/risk-score?city=${selectedCity}`)).data;
  const fetchEmergencyContacts = async () => (await axios.get(`${API_BASE_URL}/api/emergency/contacts`)).data;
  const fetchEvacuationRoutes = async () => (await axios.get(`${API_BASE_URL}/api/evacuation-routes`)).data;
  const fetchAssemblyPoints = async () => (await axios.get(`${API_BASE_URL}/api/assembly-points`)).data;
  const fetchSatelliteImagery = async () => (await axios.get(`${API_BASE_URL}/api/satellite/imagery?city=${selectedCity}`)).data;
  const fetchFloodAnalysis = async () => (await axios.get(`${API_BASE_URL}/api/satellite/flood-analysis?city=${selectedCity}`)).data;
  const fetchTerrainAnalysis = async () => (await axios.get(`${API_BASE_URL}/api/satellite/terrain-analysis?city=${selectedCity}`)).data;
  const fetchSeismicRisk = async () => (await axios.get(`${API_BASE_URL}/api/seismic-risk`)).data;
  const fetchNearbyFacilities = async (lat: number, lon: number, type?: string, radius = 2.0) =>
    (await axios.get(`${API_BASE_URL}/api/pilgrim/nearby?lat=${lat}&lon=${lon}&type=${type || ''}&radius=${radius}&city=${selectedCity}`)).data;
  const submitSOS = async (payload: Record<string, unknown>) =>
    (await axios.post(`${API_BASE_URL}/api/pilgrim/sos`, { ...payload, city: selectedCity })).data;
  const fetchSafeRoutes = async (lat: number, lon: number) =>
    (await axios.get(`${API_BASE_URL}/api/pilgrim/safe-routes?lat=${lat}&lon=${lon}&city=${selectedCity}`)).data;
  const fetchAllFacilities = async (type?: string) =>
    (await axios.get(`${API_BASE_URL}/api/pilgrim/facilities${type ? `?type=${type}` : ''}`)).data;

  return (
    <DisasterDataContext.Provider value={{
      selectedCity, availableCities, changeCity,
      dashboardData, loading, error, refreshData,
      isAdmin: profile?.role === 'admin',
      fetchWeatherData, fetchWeatherForecast, fetchEarthquakeData,
      fetchCrowdData, fetchTrafficData, fetchAlerts, fetchRiskScore,
      fetchEmergencyContacts, fetchEvacuationRoutes, fetchAssemblyPoints,
      fetchSatelliteImagery, fetchFloodAnalysis, fetchTerrainAnalysis,
      fetchSeismicRisk, fetchNearbyFacilities, submitSOS, fetchSafeRoutes, fetchAllFacilities,
      API_BASE_URL,
    }}>
      {children}
    </DisasterDataContext.Provider>
  );
}
