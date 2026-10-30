import axios from 'axios';
import type { Role } from '../context/AuthContext';

export const DISASTER_API_URL: string = import.meta.env.VITE_DISASTER_API_URL || 'http://localhost:5001';

export type HazardKey = 'flood' | 'heat' | 'storm' | 'stampede';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type Severity = 'low' | 'moderate' | 'high' | 'critical';
export type IncidentStatus = 'reported' | 'acknowledged' | 'responding' | 'contained' | 'resolved';
export type IncidentType =
  | 'medical' | 'fire' | 'flood' | 'stampede' | 'structural' | 'lost_person' | 'crime' | 'other';

export const HAZARD_META: Record<HazardKey, { label: string; color: string }> = {
  flood: { label: 'Flood', color: '#0284c7' },
  heat: { label: 'Heat stress', color: '#ea580c' },
  storm: { label: 'Storm', color: '#8b5cf6' },
  stampede: { label: 'Stampede', color: '#e11d48' },
};

export const LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e', moderate: '#eab308', high: '#f97316', critical: '#ef4444',
};

export const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: 'medical', label: 'Medical emergency' },
  { value: 'stampede', label: 'Crowd crush / stampede' },
  { value: 'fire', label: 'Fire' },
  { value: 'flood', label: 'Flooding / drowning' },
  { value: 'structural', label: 'Structure collapse' },
  { value: 'lost_person', label: 'Lost person' },
  { value: 'crime', label: 'Crime / theft' },
  { value: 'other', label: 'Other' },
];

export interface ForecastSlot {
  time: string;
  hazards: Record<HazardKey, number>;
  composite: number;
  level: RiskLevel;
  confidence: number;
  drivers: {
    temperature_c: number; humidity: number; heat_index_c: number; wind_ms: number;
    rain_3h_mm: number; rain_24h_mm: number; projected_crowd_density: number; description: string;
  };
}

export interface EarlyWarning {
  hazard: HazardKey;
  onset: string;
  lead_time_hours: number;
  peak_risk: number;
  peak_time: string;
  level: RiskLevel;
  confidence: number;
  actions: string[];
}

export interface Forecast {
  horizon_hours: number;
  generated_at: string;
  data_sources: { weather: string; crowd: string };
  summary: {
    overall_peak: number; overall_level: RiskLevel; next_24h_level: RiskLevel;
    rain_total_mm: number; max_heat_index_c: number;
  };
  peaks: Record<HazardKey, { risk: number; level: RiskLevel; time: string | null }>;
  early_warnings: EarlyWarning[];
  timeline: ForecastSlot[];
  advisory: { source: 'gemini' | 'rules'; text: string };
  model: { name: string; notes: string };
}

export interface Resource {
  id: number;
  name: string;
  resource_type: string;
  status: 'available' | 'deployed' | 'maintenance';
  base_lat: number;
  base_lon: number;
  capacity: number;
  incident_id: number | null;
  distance_km?: number;
  eta_minutes?: number;
}

export interface Incident {
  id: number;
  title: string;
  incident_type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  lat: number;
  lon: number;
  radius_m: number;
  description: string;
  reported_by: string;
  source: string;
  created_at: string;
  resources: Pick<Resource, 'id' | 'name' | 'resource_type' | 'status'>[];
  log: { message: string; actor: string; created_at: string }[];
}

export interface ManagementSummary {
  active_incidents: number;
  critical_incidents: number;
  unassigned_incidents: number;
  resolved_today: number;
  resources_total: number;
  resources_available: number;
  resources_deployed: number;
}

export interface HazardLayer {
  incidents: Pick<Incident, 'id' | 'title' | 'incident_type' | 'severity' | 'status' | 'lat' | 'lon' | 'radius_m'>[];
  crowd_zones: { id: string; name: string; lat: number; lon: number; density: number; risk_level: string; capacity: number }[];
  evacuation_routes: { id: number; name: string; route_type: string; status: string; coordinates: [number, number][] }[];
  assembly_points: { id: number; name: string; status: string; capacity: number; coordinates: [number, number] }[];
  traffic: { overall_level?: string; severe_congestion?: number; high_congestion?: number };
  outlook: { next_24h_level: RiskLevel; warnings: Pick<EarlyWarning, 'hazard' | 'onset' | 'lead_time_hours' | 'level'>[] };
}

/** Axios client that identifies the caller's role to the disaster backend. */
export function disasterClient(role?: Role, name?: string) {
  return axios.create({
    baseURL: DISASTER_API_URL,
    headers: { 'X-User-Role': role || 'user', ...(name ? { 'X-User-Name': name } : {}) },
  });
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

export const formatSlot = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

export const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
};

export function apiError(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) return (err.response?.data as { error?: string })?.error || fallback;
  return fallback;
}
