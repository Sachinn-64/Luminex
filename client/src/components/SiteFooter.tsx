import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LANDING_ABOUT, LANDING_HOME } from '@/lib/links';
import LogoMark from '@/components/LogoMark';

const COLUMNS: { heading: string; links: { label: string; to: string; external?: boolean }[] }[] = [
  {
    heading: 'Platform',
    links: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Disaster prediction', to: '/disaster-prediction' },
      { label: 'Doctor assistance', to: '/doctor-assistance' },
      { label: 'Lost & found', to: '/report-missing' },
    ],
  },
  {
    heading: 'Safety',
    links: [
      { label: 'Weapon detection', to: '/weapon-detection' },
      { label: 'Crowd detection', to: '/crowd-detection' },
      { label: 'Image recognition', to: '/image-recognition' },
      { label: 'Analytics', to: '/analytics' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
      { label: 'Join as a doctor', to: '/doctor-signup' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Home', to: LANDING_HOME, external: true },
      { label: 'About', to: LANDING_ABOUT, external: true },
    ],
  },
];

export default function SiteFooter({ dark }: { dark?: boolean }) {
  return (
    <footer className={cn(dark && 'dark')}>
      <div className="border-t border-border bg-background text-foreground">
        <div className="mx-auto max-w-[1400px] px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
            <div>
              <div className="flex items-center gap-2.5">
                <LogoMark size={30} />
                <span className="font-heading text-[19px] font-bold leading-none tracking-[-0.01em]">Luminex</span>
              </div>
              <p className="mt-5 max-w-xs font-heading text-[22px] font-semibold leading-snug text-foreground/80">
                See beyond the visible.
              </p>
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                Crowd intelligence, medical assistance and lost &amp; found reunification for large gatherings.
              </p>
            </div>

            {COLUMNS.map((c) => (
              <div key={c.heading}>
                <p className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                  {c.heading}
                </p>
                <ul className="space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {l.external ? (
                        <a href={l.to} className="text-[13.5px] text-foreground/80 transition-colors hover:text-foreground">
                          {l.label}
                        </a>
                      ) : (
                        <Link to={l.to} className="text-[13.5px] text-foreground/80 transition-colors hover:text-foreground">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col gap-3 border-t border-border pt-6 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground md:flex-row md:items-center md:justify-between">
            <span>© 2026 Luminex. All rights reserved.</span>
            <span>Luminex · Safety intelligence</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
