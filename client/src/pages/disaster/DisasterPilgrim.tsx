/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import {
  Clock, Loader2, MapPin, Navigation, Phone, Route, Siren, Users, X, type LucideIcon, HeartPulse, Flame, Shield, ShieldAlert,
} from 'lucide-react';
import { useDisasterData } from '../../context/DisasterDataContext';
import { EmptyState, ErrorBanner, Mono, PageHeader, Panel, PanelHeader, Pill, Rows, Segmented } from '../../components/disaster/ui';
import { BTN, BTN_DANGER, CARD, FIELD, tint } from '../../components/disaster/tokens';
import { MapChip, MapFrame } from '../../components/disaster/map';
import { dotIcon } from '../../components/disaster/mapUtils';
import { DISASTER_API_URL } from '../../lib/disasterApi';
import { cn } from '@/lib/utils';

const FACILITY: Record<string, { color: string; emoji: string; label: string }> = {
  hospital: { color: '#ef4444', emoji: '🏥', label: 'Hospital' },
  medical_camp: { color: '#f59e0b', emoji: '⛺', label: 'Medical camp' },
  police_station: { color: '#60a5fa', emoji: '👮', label: 'Police station' },
  drinking_water: { color: '#10b981', emoji: '💧', label: 'Drinking water' },
  toilet: { color: '#94a3b8', emoji: '🚻', label: 'Toilet' },
  lost_found: { color: '#fbbf24', emoji: '🔍', label: 'Lost & found' },
  information: { color: '#22d3ee', emoji: 'ℹ️', label: 'Info kiosk' },
};
const facilityMeta = (t: string) => FACILITY[t] || { color: '#94a3b8', emoji: '📍', label: t.replace(/_/g, ' ') };
const ICONS: Record<string, L.DivIcon> = Object.fromEntries(Object.entries(FACILITY).map(([k, v]) => [k, dotIcon(v.color, v.emoji)]));
const fallbackIcon = dotIcon('#94a3b8', '📍');

const QUICK_DIAL = [
  { label: 'Police', number: '100', color: '#60a5fa' },
  { label: 'Ambulance', number: '102', color: '#ef4444' },
  { label: 'Fire', number: '101', color: '#f59e0b' },
  { label: 'NDRF', number: '1070', color: '#a78bfa' },
  { label: 'Women helpline', number: '1091', color: '#ec4899' },
];

const CATEGORY_META: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  disaster: { icon: ShieldAlert, color: '#a78bfa', label: 'Disaster' },
  fire: { icon: Flame, color: '#f59e0b', label: 'Fire' },
  law_enforcement: { icon: Shield, color: '#60a5fa', label: 'Law enforcement' },
  medical: { icon: HeartPulse, color: '#ef4444', label: 'Medical' },
  women_safety: { icon: Phone, color: '#ec4899', label: 'Women safety' },
  kumbh: { icon: MapPin, color: '#10b981', label: 'Event control' },
};
const catMeta = (c: string) => CATEGORY_META[c] || { icon: Phone, color: '#94a3b8', label: c.replace(/_/g, ' ') };

const EMERGENCY_TYPES = [
  { value: 'medical', label: 'Medical emergency' },
  { value: 'fire', label: 'Fire' },
  { value: 'security', label: 'Security threat' },
  { value: 'stampede', label: 'Stampede risk' },
  { value: 'flood', label: 'Flood / water' },
  { value: 'lost_person', label: 'Lost person' },
  { value: 'other', label: 'Other' },
];

type Tab = 'facilities' | 'contacts' | 'routes';

export default function DisasterPilgrim() {
  const { availableCities, selectedCity } = useDisasterData();
  const city = availableCities.find((c) => c.id === selectedCity) || availableCities[0];

  const [tab, setTab] = useState<Tab>('facilities');
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [safeRoutes, setSafeRoutes] = useState<any>(null);

  const [sosOpen, setSosOpen] = useState(false);
  const [sos, setSos] = useState({ name: '', phone: '', emergency_type: 'medical', description: '' });
  const [sosBusy, setSosBusy] = useState(false);
  const [sosResult, setSosResult] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get(`${DISASTER_API_URL}/api/pilgrim/facilities${type ? `?type=${encodeURIComponent(type)}` : ''}`)
      .then((r) => !cancelled && setFacilities(r.data.facilities || []))
      .catch(() => !cancelled && setFacilities([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [type]);

  useEffect(() => {
    if (tab === 'contacts' && contacts.length === 0) {
      axios.get(`${DISASTER_API_URL}/api/emergency/contacts`).then((r) => setContacts(Array.isArray(r.data) ? r.data : r.data?.contacts || [])).catch(() => {});
    }
    if (tab === 'routes' && !safeRoutes) {
      axios.get(`${DISASTER_API_URL}/api/pilgrim/safe-routes?lat=${city.lat}&lon=${city.lon}`).then((r) => setSafeRoutes(r.data)).catch(() => setSafeRoutes({ error: true }));
    }
  }, [tab, city.lat, city.lon, contacts.length, safeRoutes]);

  const submitSos = async () => {
    setSosBusy(true);
    try {
      const r = await axios.post(`${DISASTER_API_URL}/api/pilgrim/sos`, { ...sos, lat: city.lat, lon: city.lon, city: selectedCity });
      setSosResult(r.data);
    } catch {
      setSosResult({ success: false, message: 'Could not submit. Call 100 or 102 directly.' });
    } finally {
      setSosBusy(false);
    }
  };
  const closeSos = () => {
    setSosOpen(false);
    setSosResult(null);
  };

  const grouped = useMemo(
    () =>
      contacts.reduce<Record<string, any[]>>((acc, c) => {
        (acc[c.category || 'general'] ||= []).push(c);
        return acc;
      }, {}),
    [contacts],
  );
  const typeCounts = useMemo(
    () => facilities.reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.facility_type]: (acc[f.facility_type] || 0) + 1 }), {}),
    [facilities],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Pilgrim aids"
        title="Pilgrim assistance"
        description="Nearby facilities, emergency contacts and safe routes for pilgrims on the ground."
        action={
          <button type="button" onClick={() => setSosOpen(true)} className={cn(BTN_DANGER, 'px-5 py-2.5 text-[13px] uppercase tracking-[0.08em]')}>
            <Siren size={16} /> SOS emergency
          </button>
        }
      />

      {/* quick dial */}
      <div className="flex flex-wrap gap-2">
        {QUICK_DIAL.map((q) => (
          <a
            key={q.number}
            href={`tel:${q.number}`}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-semibold transition-colors hover:bg-foreground/[0.05]"
            style={{ color: q.color, borderColor: tint(q.color, 0.35), background: tint(q.color, 0.08) }}
          >
            <Phone size={13} /> {q.label} <span className="font-mono text-[11px] opacity-80">{q.number}</span>
          </a>
        ))}
      </div>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'facilities', label: 'Nearby facilities' },
          { value: 'contacts', label: 'Emergency contacts' },
          { value: 'routes', label: 'Safe routes' },
        ]}
      />

      {/* Facilities */}
      {tab === 'facilities' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <MapFrame
            center={[city.lat, city.lon]}
            zoom={city.zoom || 14}
            height={560}
            overlay={
              <div className="pointer-events-none absolute left-3 top-3 z-[1000]">
                <MapChip>
                  <Mono className="text-white/80">{facilities.length} facilities · {city.name}</Mono>
                </MapChip>
              </div>
            }
          >
            {facilities.filter((f) => f.lat && f.lon).map((f) => {
              const m = facilityMeta(f.facility_type);
              return (
                <Marker key={f.id} position={[f.lat, f.lon]} icon={ICONS[f.facility_type] || fallbackIcon} eventHandlers={{ click: () => setSelected(f) }}>
                  <Popup>
                    <strong>{f.name}</strong>
                    <br />{m.emoji} {m.label}
                    {f.address && <><br />{f.address}</>}
                    {f.phone && <><br /><a href={`tel:${f.phone}`} style={{ color: m.color }}>{f.phone}</a></>}
                    {f.operating_hours && <><br />{f.operating_hours}</>}
                  </Popup>
                </Marker>
              );
            })}
          </MapFrame>

          <Panel className="flex max-h-[560px] flex-col p-4">
            <select value={type} onChange={(e) => setType(e.target.value)} className={cn(FIELD, 'mb-3 cursor-pointer')}>
              <option value="">All facilities ({facilities.length})</option>
              {Object.entries(FACILITY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.emoji} {v.label}{typeCounts[k] ? ` (${typeCounts[k]})` : ''}
                </option>
              ))}
            </select>
            <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1 pb-1">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-brand-400" /></div>
              ) : facilities.length === 0 ? (
                <EmptyState icon={MapPin} title="No facilities found" hint="Try a different facility type." color="#22d3ee" />
              ) : (
                facilities.map((f) => {
                  const m = facilityMeta(f.facility_type);
                  const on = selected?.id === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelected(f)}
                      className="w-full rounded-xl border p-3 text-left transition-all hover:-translate-y-px"
                      style={{
                        borderColor: on ? tint(m.color, 0.6) : 'hsl(var(--border) / 0.7)',
                        background: on ? tint(m.color, 0.1) : 'hsl(var(--background) / 0.35)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[16px]" style={{ background: tint(m.color, 0.14) }}>
                          {m.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="truncate text-[13px] font-semibold">{f.name}</div>
                            {f.operating_hours && (
                              <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground"><Clock size={10} />{f.operating_hours}</span>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{m.label}{f.address ? ` · ${f.address}` : ''}</div>
                          {f.phone && (
                            <a href={`tel:${f.phone}`} onClick={(e) => e.stopPropagation()} className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-semibold" style={{ color: m.color }}>
                              <Phone size={10} /> {f.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* Contacts */}
      {tab === 'contacts' && (
        Object.keys(grouped).length === 0 ? (
          <Spinnerish />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(grouped).map(([cat, items]) => {
              const m = catMeta(cat);
              return (
                <Panel key={cat}>
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg border" style={{ color: m.color, borderColor: tint(m.color, 0.3), background: tint(m.color, 0.12) }}>
                      <m.icon size={14} />
                    </span>
                    <div>
                      <div className="text-[13.5px] font-semibold capitalize">{m.label}</div>
                      <Mono>{items.length} line{items.length > 1 ? 's' : ''}</Mono>
                    </div>
                  </div>
                  <Rows>
                    {items.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium">{c.service_name}</div>
                          <div className="truncate text-[11.5px] text-muted-foreground">{c.description}</div>
                        </div>
                        <a href={`tel:${c.phone_number}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors hover:bg-foreground/[0.06]" style={{ color: m.color, borderColor: tint(m.color, 0.35) }}>
                          <Phone size={11} /> {c.phone_number}
                        </a>
                      </div>
                    ))}
                  </Rows>
                </Panel>
              );
            })}
          </div>
        )
      )}

      {/* Safe routes */}
      {tab === 'routes' && (
        !safeRoutes ? (
          <Spinnerish />
        ) : safeRoutes.error ? (
          <ErrorBanner>Could not load safe routes.</ErrorBanner>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Evacuation routes" meta="Sorted by distance from the event centre" action={<Route size={16} className="text-brand-400" />} />
              {!(safeRoutes.evacuation_routes || []).length ? (
                <EmptyState icon={Route} title="No routes available" />
              ) : (
                <Rows>
                  {safeRoutes.evacuation_routes.map((r: any, i: number) => {
                    const open = r.status === 'open';
                    return (
                      <div key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold">{r.name}</div>
                          <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                            capacity {r.capacity?.toLocaleString()}{r.distance_from_user_km != null && ` · ${r.distance_from_user_km} km away`}
                          </div>
                        </div>
                        <Pill color={open ? '#10b981' : '#ef4444'}>{r.status}</Pill>
                      </div>
                    );
                  })}
                </Rows>
              )}
            </Panel>
            <Panel>
              <PanelHeader title="Assembly points" meta="Nearest safe gathering areas" action={<Navigation size={16} className="text-emerald-400" />} />
              {!(safeRoutes.assembly_points || []).length ? (
                <EmptyState icon={Users} title="No assembly points" />
              ) : (
                <div className="space-y-2.5">
                  {safeRoutes.assembly_points.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400"><Users size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold">{p.name}</div>
                        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">capacity {p.capacity?.toLocaleString()}</div>
                      </div>
                      {p.distance_from_user_km != null && (
                        <div className="shrink-0 text-right">
                          <div className="text-[15px] font-semibold text-emerald-400">{p.distance_from_user_km}<span className="text-[11px] text-muted-foreground"> km</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )
      )}

      {/* SOS modal */}
      {sosOpen && (
        <div className="fixed inset-0 z-[10005] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={closeSos}>
          <div className={cn(CARD, 'w-full max-w-md overflow-hidden !bg-card dark:!bg-[#0b1020]')} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="SOS emergency report">
            <div className="flex items-center justify-between bg-gradient-to-r from-red-600 to-rose-500 px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Siren size={18} />
                <div>
                  <div className="text-[15px] font-bold">SOS emergency report</div>
                  <div className="text-[11px] text-white/80">Goes straight to the control room</div>
                </div>
              </div>
              <button type="button" onClick={closeSos} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Close"><X size={16} /></button>
            </div>

            <div className="space-y-3 p-5">
              {sosResult ? (
                <div className={cn('rounded-xl border p-4 text-[13px]', sosResult.success ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-red-400/30 bg-red-500/10')}>
                  <div className="font-semibold">{sosResult.message}</div>
                  {sosResult.nearest_assembly_point && (
                    <div className="mt-2 text-muted-foreground">
                      Nearest assembly point: <strong className="text-foreground">{sosResult.nearest_assembly_point.name}</strong>
                      {sosResult.nearest_assembly_point.distance_km && ` · ${sosResult.nearest_assembly_point.distance_km} km`}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block"><Mono className="mb-1.5 block">Your name</Mono><input className={FIELD} value={sos.name} onChange={(e) => setSos({ ...sos, name: e.target.value })} placeholder="Full name" /></label>
                    <label className="block"><Mono className="mb-1.5 block">Phone</Mono><input className={FIELD} value={sos.phone} onChange={(e) => setSos({ ...sos, phone: e.target.value })} placeholder="+91" inputMode="tel" /></label>
                  </div>
                  <label className="block"><Mono className="mb-1.5 block">Emergency type</Mono>
                    <select className={cn(FIELD, 'cursor-pointer')} value={sos.emergency_type} onChange={(e) => setSos({ ...sos, emergency_type: e.target.value })}>
                      {EMERGENCY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label className="block"><Mono className="mb-1.5 block">What is happening?</Mono>
                    <textarea className={cn(FIELD, 'min-h-[88px] resize-y')} value={sos.description} onChange={(e) => setSos({ ...sos, description: e.target.value })} placeholder="Describe the emergency and how many people are affected" />
                  </label>
                  <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground"><MapPin size={12} /> Location defaults to the event centre ({city.display_name}).</div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3 dark:border-white/[0.06]">
              <button type="button" onClick={closeSos} className={BTN}>{sosResult ? 'Close' : 'Cancel'}</button>
              {!sosResult && (
                <button type="button" onClick={submitSos} disabled={sosBusy} className={BTN_DANGER}>
                  {sosBusy ? <Loader2 size={14} className="animate-spin" /> : <Siren size={14} />} Send SOS
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinnerish() {
  return (
    <div className={cn(CARD, 'flex items-center justify-center py-16')}>
      <Loader2 className="size-5 animate-spin text-brand-400" />
    </div>
  );
}
