/** Luminex infinity mark. Blue→cyan gradient stroke; scales with `size`. */
export default function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 44"
      width={size}
      height={(size * 44) / 64}
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="luminex-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4A7DFF" />
          <stop offset="1" stopColor="#00D6FF" />
        </linearGradient>
      </defs>
      <path
        d="M43.3 12c13.6 0 13.6 20 0 20-13.6 0-19-20-34-20-12.2 0-12.2 20 0 20 15 0 20.4-20 34-20z"
        fill="none"
        stroke="url(#luminex-mark-gradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
