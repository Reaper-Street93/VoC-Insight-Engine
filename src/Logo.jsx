// Distil brand mark — a funnel: raw feedback pours in at the top,
// distilled insight (the red stem) comes out the bottom.
export function LogoMark({ size = 26, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
    >
      <polygon points="3,4 29,4 18,17 14,17" className="fill-ink" />
      <rect x="14" y="17" width="4" height="11" className="fill-signal" />
    </svg>
  );
}

export default function Logo({ size = 26 }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={size} />
      <span className="font-bold tracking-tight leading-none text-xl">
        Distil
      </span>
    </span>
  );
}
