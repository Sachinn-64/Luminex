import type { ReactNode } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { cn } from '@/lib/utils';
import { CARD } from './tokens';
import { DARK_TILES } from './mapUtils';
import 'leaflet/dist/leaflet.css';

/**
 * Card-framed Leaflet map. `overlay` renders above the map (legends, toggles).
 */
export function MapFrame({
  center,
  zoom,
  height = 480,
  className,
  overlay,
  children,
}: {
  center: [number, number];
  zoom: number;
  height?: number | string;
  className?: string;
  overlay?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={cn(CARD, 'relative overflow-hidden', className)} style={{ height }}>
      {overlay}
      <MapContainer center={center} zoom={zoom} zoomControl={false} className="h-full w-full">
        <TileLayer url={DARK_TILES} attribution="&copy; OpenStreetMap contributors" maxZoom={19} />
        {children}
      </MapContainer>
    </div>
  );
}

/** Floating chip used on top of maps. */
export function MapChip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'pointer-events-auto rounded-xl border border-white/10 bg-[#070b16]/85 px-3 py-2 text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md',
        className,
      )}
    >
      {children}
    </div>
  );
}
