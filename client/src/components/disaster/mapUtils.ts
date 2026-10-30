import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet's default marker URLs under Vite.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

/** OpenStreetMap tiles (no API key). The layout darkens them with a CSS filter on `.leaflet-tile`. */
export const DARK_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Teardrop pin with a symbol inside. */
export const pinIcon = (color: string, symbol: string, size = 30) =>
  L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${color};border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 4px 14px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:${Math.round(size * 0.42)}px;line-height:1">${symbol}</span></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size - 4],
  });

/** Round dot marker with a symbol inside. */
export const dotIcon = (color: string, symbol: string, size = 26) =>
  L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.46)}px;line-height:1">${symbol}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });

/** Route coordinates come back either as arrays or JSON strings. */
export function parseCoords(raw: unknown): [number, number][] {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((c: unknown) => {
      if (Array.isArray(c) && c.length >= 2) return [Number(c[0]), Number(c[1])] as [number, number];
      if (c && typeof c === 'object' && 'lat' in c && 'lon' in c) {
        const o = c as { lat: number; lon: number };
        return [Number(o.lat), Number(o.lon)] as [number, number];
      }
      return null;
    })
    .filter((c): c is [number, number] => !!c && Number.isFinite(c[0]) && Number.isFinite(c[1]));
}
