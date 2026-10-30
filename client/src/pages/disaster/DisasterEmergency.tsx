/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Marker, Polyline, Popup } from 'react-leaflet';
import {
  Flame, HeartPulse, MapPin, Megaphone, Phone, Route, Shield, ShieldAlert, Siren, Users, type LucideIcon,
} from 'lucide-react';
import { useDisasterData } from '../../context/DisasterDataContext';
import { EmptyState, ErrorBanner, Mono, PageHeader, Panel, PanelHeader, Pill, Rows, Spinner } from '../../components/disaster/ui';
import { tint } from '../../components/disaster/tokens';
import { MapChip, MapFrame } from '../../components/disaster/map';
import { parseCoords, pinIcon } from '../../components/disaster/mapUtils';

const assemblyIcon = pinIcon('#10b981', '🏟');

const ROUTE_META: Record<string, { color: string; label: string }> = {
  primary: { color: '#60a5fa', label: 'Primary route' },
  emergency: { color: '#ef4444', label: 'Emergency route' },
  secondary: { color: '#a78bfa', label: 'Secondary route' },
};
const routeMeta = (t?: string) => ROUTE_META[t || ''] || { color: '#94a3b8', label: 'Route' };

const CATEGORY_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  disaster: { icon: ShieldAlert, color: '#a78bfa', label: 'Disaster' },
  fire: { icon: Flame, color: '#f59e0b', label: 'Fire' },
  law_enforcement: { icon: Shield, color: '#60a5fa', label: 'Law enforcement' },
  medical: { icon: HeartPulse, color: '#ef4444', label: 'Medical' },
  women_safety: { icon: Phone, color: '#ec4899', label: 'Women safety' },
  kumbh: { icon: MapPin, color: '#10b981', label: 'Event control' },
};
const catMeta = (c: string) => CATEGORY_META[c] || { icon: Phone, color: '#94a3b8', label: c.replace(/_/g, ' ') };

const PROCEDURES = [
  { step: '01', title: 'Immediate response', desc: 'Activate protocols, alert the control room and deploy the nearest response teams.', icon: Siren, color: '#ef4444' },
  { step: '02', title: 'Evacuation', desc: 'Open the designated routes and move crowds toward the closest assembly points.', icon: Route, color: '#f59e0b' },
  { step: '03', title: 'Communication', desc: 'Contact emergency services and broadcast public announcements in every language.', icon: Megaphone, color: '#10b981' },
];

export default function DisasterEmergency() {
  const { fetchEmergencyContacts, fetchEvacuationRoutes, fetchAssemblyPoints, availableCities, selectedCity } = useDisasterData();
  const [contacts, setContacts] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const city = availableCities.find((c) => c.id === selectedCity) || availableCities[0];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [c, r, p]: any[] = await Promise.all([fetchEmergencyContacts(), fetchEvacuationRoutes(), fetchAssemblyPoints()]);
        if (cancelled) return;
        setContacts(Array.isArray(c) ? c : c?.contacts || []);
        setRoutes(r?.all_routes || []);
        setPoints(p?.assembly_points || []);
        setError(null);
      } catch {
        if (!cancelled) setError('Could not load emergency data from the disaster backend (port 5001).');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchEmergencyContacts, fetchEvacuationRoutes, fetchAssemblyPoints]);

  const parsedRoutes = useMemo(() => routes.map((r) => ({ ...r, coords: parseCoords(r.coordinates) })), [routes]);
  const grouped = useMemo(
    () =>
      contacts.reduce<Record<string, any[]>>((acc, c) => {
        const k = c.category || 'general';
        (acc[k] ||= []).push(c);
        return acc;
      }, {}),
    [contacts],
  );
  const openRoutes = routes.filter((r) => r.status === 'open').length;
  const totalCapacity = points.reduce((s, p) => s + (p.capacity || 0), 0);

  if (loading) return <Spinner label="Loading evacuation plan" />;
  if (error) return <ErrorBanner>{error}</ErrorBanner>;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Evacuation"
        title="Emergency response"
        description="Assembly points, evacuation corridors and the emergency contacts the control room relies on."
        action={
          <>
            <Pill color="#10b981">{openRoutes}/{routes.length} routes open</Pill>
            <Pill color="#22d3ee" dot={false}>{points.length} assembly points · {totalCapacity.toLocaleString()} capacity</Pill>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* left column */}
        <div className="space-y-4">
          <MapFrame
            center={[city.lat, city.lon]}
            zoom={city.zoom || 14}
            height={460}
            overlay={
              <div className="pointer-events-none absolute bottom-3 left-3 z-[1000]">
                <MapChip>
                  <Mono className="mb-1.5 block text-white/70">Legend</Mono>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11.5px] text-white/80"><span className="size-2.5 rounded-full bg-emerald-400" /> Assembly point</div>
                    {Object.values(ROUTE_META).map((m) => (
                      <div key={m.label} className="flex items-center gap-2 text-[11.5px] text-white/80">
                        <span className="h-[3px] w-4 rounded-full" style={{ background: m.color }} /> {m.label}
                      </div>
                    ))}
                  </div>
                </MapChip>
              </div>
            }
          >
            {points.filter((p) => p.coordinates?.length >= 2).map((p) => (
              <Marker key={p.id} position={[p.coordinates[0], p.coordinates[1]]} icon={assemblyIcon}>
                <Popup>
                  <strong>{p.name}</strong>
                  <br />Capacity {p.capacity?.toLocaleString()} · <span style={{ color: '#10b981' }}>{String(p.status || 'active').toUpperCase()}</span>
                </Popup>
              </Marker>
            ))}
            {parsedRoutes.filter((r) => r.coords.length >= 2).map((r) => {
              const m = routeMeta(r.route_type);
              return (
                <Polyline
                  key={r.id}
                  positions={r.coords}
                  pathOptions={{ color: m.color, weight: 4, opacity: r.status === 'open' ? 0.9 : 0.45, dashArray: r.route_type === 'secondary' ? '7,5' : undefined }}
                >
                  <Popup>
                    <strong>{r.name}</strong>
                    <br />{m.label} · capacity {r.capacity?.toLocaleString()}
                    <br /><span style={{ color: r.status === 'open' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{String(r.status).toUpperCase()}</span>
                  </Popup>
                </Polyline>
              );
            })}
          </MapFrame>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Evacuation routes" meta={`${routes.length} corridors configured`} />
              {routes.length === 0 ? (
                <EmptyState icon={Route} title="No routes configured" />
              ) : (
                <Rows>
                  {routes.map((r) => {
                    const m = routeMeta(r.route_type);
                    const open = r.status === 'open';
                    return (
                      <div key={r.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="mt-1 h-10 w-[3px] shrink-0 rounded-full" style={{ background: m.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-[13px] font-semibold leading-snug">{r.name}</div>
                            <Pill color={open ? '#10b981' : '#ef4444'}>{r.status}</Pill>
                          </div>
                          <div className="mt-1 text-[12px] text-muted-foreground">{r.description}</div>
                          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            {m.label} · capacity {r.capacity?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Rows>
              )}
            </Panel>

            <Panel>
              <PanelHeader title="Assembly points" meta={`${totalCapacity.toLocaleString()} people total`} />
              {points.length === 0 ? (
                <EmptyState icon={Users} title="No assembly points" />
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                  {points.map((p) => (
                    <div key={p.id} className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[13px] font-semibold leading-snug">{p.name}</div>
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400"><Users size={13} /></span>
                      </div>
                      <div className="mt-2 text-[12.5px] font-medium text-emerald-400">{p.capacity?.toLocaleString()} people</div>
                      {p.coordinates && (
                        <div className="mt-0.5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
                          {Number(p.coordinates[0]).toFixed(4)}, {Number(p.coordinates[1]).toFixed(4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>

        {/* right column */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Emergency contacts" meta="Tap a number to call" />
            {Object.keys(grouped).length === 0 ? (
              <EmptyState icon={Phone} title="No contacts" />
            ) : (
              <div className="space-y-5">
                {Object.entries(grouped).map(([cat, items]) => {
                  const m = catMeta(cat);
                  return (
                    <div key={cat}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-md" style={{ color: m.color, background: tint(m.color, 0.14) }}>
                          <m.icon size={12} />
                        </span>
                        <Mono>{m.label}</Mono>
                      </div>
                      <Rows>
                        {items.map((c) => (
                          <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium leading-snug">{c.service_name}</div>
                              <div className="text-[11.5px] text-muted-foreground">{c.description}</div>
                            </div>
                            <a
                              href={`tel:${c.phone_number}`}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.04em] transition-colors hover:bg-foreground/[0.06]"
                              style={{ color: m.color, borderColor: tint(m.color, 0.35) }}
                            >
                              <Phone size={11} /> {c.phone_number}
                            </a>
                          </div>
                        ))}
                      </Rows>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Emergency procedures" />
            <ol className="space-y-3">
              {PROCEDURES.map((p) => (
                <li key={p.step} className="flex gap-3 rounded-xl border border-border/60 bg-background/40 p-3 dark:border-white/[0.06]">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border" style={{ color: p.color, borderColor: tint(p.color, 0.3), background: tint(p.color, 0.12) }}>
                    <p.icon size={15} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Mono style={{ color: p.color }} className="!text-current">{p.step}</Mono>
                      <span className="text-[13px] font-semibold">{p.title}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{p.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
