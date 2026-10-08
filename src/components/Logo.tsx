import logo from "@/brand/logo.json";

// A geometria vem de brand/build_logo.py; não edite os caminhos à mão.
export function Logo({ className }: { className?: string }) {
  const { viewBox, letters, accent } = logo.wordmark;
  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label="Colaja">
      {letters.map((d) => (
        <path key={d} d={d} fillRule="evenodd" fill="currentColor" />
      ))}
      <path d={accent} fill="currentColor" />
    </svg>
  );
}
