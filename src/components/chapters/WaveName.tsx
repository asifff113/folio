/**
 * The name on the opening screen. Each letter is its own span so a wave can
 * roll through it; the name is always fully visible (no clipping or flicker).
 * Screen readers get the whole name once, from the aria-label.
 */
export function WaveName({ name, className = "" }: { name: string; className?: string }) {
  return (
    <h1 aria-label={name} className={`name-wave ${className}`}>
      {Array.from(name).map((ch, i) => (
        <span key={i} aria-hidden="true" style={{ "--i": i } as React.CSSProperties}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </h1>
  );
}
