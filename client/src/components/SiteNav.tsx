import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ModeToggle } from '@/components/mode-toggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { LANDING_ABOUT, LANDING_HOME } from '@/lib/links';
import LogoMark from '@/components/LogoMark';
import VoiceNavigator from '@/components/VoiceNavigator';

const LINKS = [
  { label: 'Home', href: LANDING_HOME, external: true },
  { label: 'Dashboard', href: '/dashboard', external: false },
  { label: 'About', href: LANDING_ABOUT, external: true },
];

export default function SiteNav({ dark }: { dark?: boolean }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const linkCls = (active: boolean) =>
    cn(
      'relative px-3 py-1.5 text-[13px] font-medium transition-colors',
      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      'after:absolute after:-bottom-[5px] after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-foreground after:transition-opacity',
      active ? 'after:opacity-100' : 'after:opacity-0',
    );

  return (
    <header className={cn('fixed inset-x-0 top-0 z-50', dark && 'dark')}>
      <div className="border-b border-border/60 bg-background/70 text-foreground backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-6">
          {/* wordmark */}
          <a href={LANDING_HOME} className="notranslate flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="font-heading text-[19px] font-bold leading-none tracking-[-0.01em]">Luminex</span>
          </a>

          {/* links */}
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) =>
              l.external ? (
                <a key={l.label} href={l.href} className={linkCls(false)}>
                  {l.label}
                </a>
              ) : (
                <NavLink key={l.label} to={l.href} className={({ isActive }) => linkCls(isActive)}>
                  {l.label}
                </NavLink>
              ),
            )}
          </nav>

          {/* actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <VoiceNavigator />
            <ModeToggle />
            {profile ? (
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                title="Sign out"
                className="ml-1"
              >
                <Avatar className="size-8 border border-border">
                  <AvatarFallback className="bg-muted text-[11px] font-semibold">
                    {profile.name
                      ? profile.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                      : '?'}
                  </AvatarFallback>
                </Avatar>
              </button>
            ) : (
              <Link
                to="/login"
                className="ml-1 hidden h-8 items-center bg-foreground px-3.5 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-85 sm:inline-flex"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
