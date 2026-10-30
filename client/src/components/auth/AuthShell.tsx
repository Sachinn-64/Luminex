import { useState, type ReactNode, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import AsciiEarth from '@/components/auth/AsciiEarth';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export interface TopLink {
  prompt: string;
  to: string;
  label: string;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function AuthShell({ topLink, children }: { topLink?: TopLink; children: ReactNode }) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-[#050505] font-sans text-white selection:bg-white selection:text-black">
      <div className="relative grid min-h-svh lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* ---------- Form side ---------- */}
        <div className="flex flex-col px-6 pb-8 pt-24 sm:px-12 lg:px-16 xl:px-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="flex flex-1 flex-col"
          >
            {topLink && (
              <div className="mb-10 flex items-center justify-between">
                <Mono>{topLink.prompt}</Mono>
                <Link
                  to={topLink.to}
                  className="group inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80 transition-colors hover:text-white"
                >
                  {topLink.label}
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}

            <div className="my-auto w-full max-w-[460px] pb-10">{children}</div>
          </motion.div>
        </div>

        {/* ---------- Visual side: ASCII Earth ---------- */}
        <aside className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0">
            <AsciiEarth />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#050505] to-transparent"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="absolute bottom-10 left-12 flex items-center gap-3 xl:left-16"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-white" />
            </span>
            <Mono className="text-white/60">Live · Earth · Luminex network</Mono>
          </motion.div>
          <Mono className="absolute right-12 top-24 text-white/35 xl:right-16">Lat 23.17° · Lon 79.93°</Mono>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Typography helpers                                                 */
/* ------------------------------------------------------------------ */

/** Tiny uppercase monospace label, like the reference's "SYSTEM" headers. */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40', className)}>
      {children}
    </span>
  );
}

/** The one bright word inside a muted headline. */
export function Bright({ children }: { children: ReactNode }) {
  return <span className="text-white">{children}</span>;
}

export function AuthHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-10">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-px w-6 bg-white/30" />
        <Mono className="text-white/60">{eyebrow}</Mono>
      </div>
      <h1 className="font-heading text-[2.35rem] font-bold leading-[1.08] tracking-[-0.015em] text-white/50 sm:text-[2.7rem]">
        {title}
      </h1>
      {subtitle && <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-white/55">{subtitle}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fields                                                             */
/* ------------------------------------------------------------------ */

const inputBase =
  'peer block h-11 w-full rounded-none border-0 border-b border-white/15 bg-transparent px-0 text-[15px] text-white outline-none transition-colors duration-200 ' +
  'placeholder:text-white/25 hover:border-white/30 focus:border-white disabled:cursor-not-allowed disabled:opacity-50 ' +
  '[&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s]';

export function AuthLabel({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/45">
        {children}
      </label>
      {hint}
    </div>
  );
}

interface AuthInputProps extends ComponentProps<'input'> {
  label: ReactNode;
  hint?: ReactNode;
  description?: ReactNode;
}

export function AuthInput({ label, hint, description, id, className, ...props }: AuthInputProps) {
  return (
    <div>
      <AuthLabel htmlFor={id} hint={hint}>
        {label}
      </AuthLabel>
      <input id={id} className={cn(inputBase, className)} {...props} />
      {description && <p className="mt-2 text-xs leading-relaxed text-white/35">{description}</p>}
    </div>
  );
}

interface AuthPasswordProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: ReactNode;
  hint?: ReactNode;
  showStrength?: boolean;
}

function passwordScore(v: string) {
  let s = 0;
  if (v.length >= 6) s++;
  if (v.length >= 10) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/\d/.test(v) || /[^A-Za-z0-9]/.test(v)) s++;
  return s;
}
const strengthLabel = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

export function AuthPasswordInput({ label, hint, showStrength, id, value, className, ...props }: AuthPasswordProps) {
  const [show, setShow] = useState(false);
  const v = typeof value === 'string' ? value : '';
  const score = passwordScore(v);

  return (
    <div>
      <AuthLabel htmlFor={id} hint={hint}>
        {label}
      </AuthLabel>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          className={cn(inputBase, 'pr-14', className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {showStrength && (
        <div className="mt-2.5 flex items-center gap-3">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn('h-px flex-1 transition-colors duration-300', v && i < score ? 'bg-white' : 'bg-white/15')}
              />
            ))}
          </div>
          <Mono className="shrink-0 whitespace-nowrap">{v ? strengthLabel[score] : '6+ chars'}</Mono>
        </div>
      )}
    </div>
  );
}

interface AuthSelectProps extends ComponentProps<'select'> {
  label: ReactNode;
  options: readonly string[];
}

export function AuthSelect({ label, options, id, className, ...props }: AuthSelectProps) {
  return (
    <div>
      <AuthLabel htmlFor={id}>{label}</AuthLabel>
      <div className="relative">
        <select id={id} className={cn(inputBase, 'cursor-pointer appearance-none pr-8', className)} {...props}>
          {options.map((o) => (
            <option key={o} value={o} className="bg-[#0a0a0a] text-white">
              {o}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="pointer-events-none absolute right-0 top-1/2 size-3 -translate-y-1/2 text-white/50"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Choice tiles (role selector)                                       */
/* ------------------------------------------------------------------ */

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  code: string;
  desc: string;
}

export function ChoiceTiles<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: ReactNode;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <div>
      <AuthLabel>{label}</AuthLabel>
      <div role="radiogroup" className="mt-2 grid grid-cols-3 border border-white/15">
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.value)}
              className={cn(
                'flex flex-col items-start gap-3 px-3.5 py-3.5 text-left transition-colors duration-200',
                i > 0 && 'border-l border-white/15',
                selected ? 'bg-white text-black' : 'text-white/70 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              <span className={cn('font-mono text-[10px] tracking-[0.16em]', selected ? 'text-black/50' : 'text-white/35')}>
                {o.code}
              </span>
              <span className="text-[13.5px] font-medium leading-none">{o.label}</span>
            </button>
          );
        })}
      </div>
      {active && <p className="mt-2.5 text-xs leading-relaxed text-white/40">{active.desc}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */

export function AuthSection({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Mono className="text-white/70">
        {step} / {title}
      </Mono>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Buttons, errors, links                                             */
/* ------------------------------------------------------------------ */

export function AuthSubmit({
  loading,
  loadingText = 'Please wait…',
  children,
}: {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex h-12 w-full items-center justify-between bg-white px-5 text-[14px] font-medium text-black transition-colors duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <span>{loadingText}</span>
          <Loader2 className="size-4 animate-spin" />
        </>
      ) : (
        <>
          <span>{children}</span>
          <span className="font-mono text-[12px] transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </>
      )}
    </button>
  );
}

export function GoogleButton({
  children,
  onClick,
  loading,
}: {
  children: ReactNode;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-2.5 border border-white/20 bg-transparent text-[14px] font-medium text-white transition-colors duration-200 hover:border-white/60 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4" fill="currentColor">
        <path d="M21.35 11.1H12v3.2h5.4c-.5 2.4-2.5 3.7-5.4 3.7a6 6 0 1 1 0-12c1.5 0 2.8.5 3.8 1.5l2.4-2.4A9.3 9.3 0 0 0 12 2.7a9.3 9.3 0 1 0 0 18.6c5.4 0 9-3.8 9-9.1 0-.4 0-.8-.15-1.1z" />
      </svg>
      {children}
    </button>
  );
}

export function AuthError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="border-l-2 border-white bg-white/[0.06] px-3.5 py-2.5 text-[13px] leading-snug text-white/85"
    >
      <Mono className="mr-2 text-white/60">Error</Mono>
      {message}
    </motion.div>
  );
}

export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-white/10" />
      <Mono>{children}</Mono>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

/** Row of secondary routes, e.g. "New here?  Create account ↗  Join as doctor ↗" */
export function AuthLinks({ prompt, links }: { prompt: string; links: { to: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-5">
      <Mono>{prompt}</Mono>
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="group inline-flex items-center gap-1 text-[13px] text-white/80 transition-colors hover:text-white"
        >
          {l.label}
          <ArrowUpRight className="size-3.5 text-white/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
        </Link>
      ))}
    </div>
  );
}
