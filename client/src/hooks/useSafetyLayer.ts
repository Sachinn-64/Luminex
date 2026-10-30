import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { disasterClient, type HazardLayer } from '../lib/disasterApi';

const REFRESH_MS = 60000;
const SEVERITY_COLORS: Record<string, string> = { low: '#eab308', moderate: '#f97316', high: '#ef4444', critical: '#b91c1c' };

type LatLng = { lat: number; lng: number };

function distanceM(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

/** Distance (m) from point p to segment a-b, using a local equirectangular projection. */
function distanceToSegmentM(p: LatLng, a: LatLng, b: LatLng) {
  const k = Math.cos((p.lat * Math.PI) / 180);
  const ax = (a.lng - p.lng) * k, ay = a.lat - p.lat;
  const bx = (b.lng - p.lng) * k, by = b.lat - p.lat;
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.sqrt(cx * cx + cy * cy) * 111320;
}

export interface SafeDestination {
  name: string;
  position: LatLng;
  distanceM: number;
  avoided: string[];
  /** Incident zones the starting point is already inside */
  insideZones: string[];
  capacity: number;
}

/**
 * Live safety overlay for the AI map: active incidents, crowd density zones,
 * evacuation routes and assembly points from the disaster backend.
 */
export function useSafetyLayer(mapRef: MutableRefObject<google.maps.Map | null>, mapLoaded: boolean, isOffline: boolean) {
  const [layer, setLayer] = useState<HazardLayer | null>(null);
  const [enabled, setEnabled] = useState(true);
  const overlaysRef = useRef<(google.maps.Circle | google.maps.Polyline | google.maps.Marker)[]>([]);

  useEffect(() => {
    if (isOffline) return;
    let cancelled = false;
    const load = () => disasterClient().get<HazardLayer>('/api/management/hazards')
      .then(res => { if (!cancelled) setLayer(res.data); })
      .catch(() => { /* backend optional: map still works without the safety layer */ });
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [isOffline]);

  useEffect(() => {
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];
    const map = mapRef.current;
    if (!mapLoaded || !map || !layer || !enabled) return;

    const add = <T extends google.maps.Circle | google.maps.Polyline | google.maps.Marker>(o: T) => { overlaysRef.current.push(o); return o; };

    layer.crowd_zones.forEach(z => {
      const color = z.density >= 0.8 ? '#ef4444' : z.density >= 0.6 ? '#f97316' : z.density >= 0.4 ? '#eab308' : '#22c55e';
      add(new google.maps.Circle({
        map, center: { lat: z.lat, lng: z.lon }, radius: 60 + z.density * 90,
        strokeColor: color, strokeOpacity: 0.7, strokeWeight: 1, fillColor: color, fillOpacity: 0.18, clickable: false,
      }));
    });
    layer.incidents.forEach(i => {
      const color = SEVERITY_COLORS[i.severity] || '#ef4444';
      add(new google.maps.Circle({
        map, center: { lat: i.lat, lng: i.lon }, radius: i.radius_m,
        strokeColor: color, strokeOpacity: 0.9, strokeWeight: 2, fillColor: color, fillOpacity: 0.25, clickable: false,
      }));
      add(new google.maps.Marker({
        map, position: { lat: i.lat, lng: i.lon }, title: `${i.title} (${i.severity})`,
        label: { text: '!', color: '#fff', fontWeight: '700' },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      }));
    });
    layer.evacuation_routes.forEach(r => {
      const open = r.status === 'open';
      add(new google.maps.Polyline({
        map, path: r.coordinates.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: open ? '#16a34a' : '#ef4444', strokeOpacity: open ? 0.8 : 0,
        strokeWeight: 4,
        icons: open ? undefined : [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, scale: 3 }, offset: '0', repeat: '14px' }],
      }));
    });
    layer.assembly_points.filter(p => p.status === 'active').forEach(p => {
      add(new google.maps.Marker({
        map, position: { lat: p.coordinates[0], lng: p.coordinates[1] }, title: `Assembly point: ${p.name}`,
        icon: { path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 6, fillColor: '#16a34a', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      }));
    });
  }, [layer, enabled, mapLoaded, mapRef]);

  useEffect(() => () => { overlaysRef.current.forEach(o => o.setMap(null)); }, []);

  /** Plain-text situation summary injected into the Gemini prompt. */
  const situationContext = useCallback(() => {
    if (!layer) return 'Live safety data unavailable.';
    const zones = [...layer.crowd_zones].sort((a, b) => b.density - a.density)
      .map(z => `${z.name} ${Math.round(z.density * 100)}% full`).join('; ');
    const incidents = layer.incidents.length
      ? layer.incidents.map(i => `${i.title} (${i.severity}, ${i.status}) at ${i.lat.toFixed(4)},${i.lon.toFixed(4)}`).join('; ')
      : 'none';
    const closed = layer.evacuation_routes.filter(r => r.status !== 'open').map(r => r.name).join(', ') || 'none';
    const assembly = layer.assembly_points.filter(p => p.status === 'active').map(p => p.name).join(', ');
    const warnings = layer.outlook.warnings.map(w => `${w.hazard} in ~${Math.round(w.lead_time_hours)}h (${w.level})`).join('; ') || 'none';
    return [
      `Crowd density by zone: ${zones}.`,
      `Active incidents to avoid: ${incidents}.`,
      `Closed evacuation routes: ${closed}. Open assembly points: ${assembly}.`,
      `Road congestion: ${layer.traffic.overall_level || 'unknown'}. Predicted hazards next 24h: ${warnings}.`,
    ].join('\n');
  }, [layer]);

  /** Nearest open assembly point whose straight-line approach avoids every active incident zone. */
  const findSafeDestination = useCallback((from: LatLng): SafeDestination | null => {
    if (!layer) return null;
    // Zones the user is already inside can't be avoided; route out of them instead
    const insideZones = layer.incidents.filter(i => distanceM({ lat: i.lat, lng: i.lon }, from) <= i.radius_m);
    const avoidable = layer.incidents.filter(i => !insideZones.includes(i));
    const candidates = layer.assembly_points.filter(p => p.status === 'active').map(p => {
      const position = { lat: p.coordinates[0], lng: p.coordinates[1] };
      const blocking = avoidable.filter(i => {
        const c = { lat: i.lat, lng: i.lon };
        return distanceToSegmentM(c, from, position) < i.radius_m || distanceM(c, position) < i.radius_m * 1.5;
      });
      return { name: p.name, position, capacity: p.capacity, distanceM: distanceM(from, position), blocking };
    });
    const safe = candidates.filter(c => c.blocking.length === 0).sort((a, b) => a.distanceM - b.distanceM);
    const chosen = safe[0];
    if (!chosen) return null;
    const avoided = candidates.filter(c => c.blocking.length && c.distanceM < chosen.distanceM)
      .map(c => `${c.name} (blocked by ${c.blocking.map(b => b.title).join(', ')})`);
    return {
      name: chosen.name, position: chosen.position, capacity: chosen.capacity, distanceM: chosen.distanceM, avoided,
      insideZones: insideZones.map(i => i.title),
    };
  }, [layer]);

  return { layer, enabled, setEnabled, situationContext, findSafeDestination };
}
