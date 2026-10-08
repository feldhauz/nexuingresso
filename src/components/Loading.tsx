/** Espaço reservado enquanto o conteúdo carrega: barras no lugar do texto, sem a página pular. */
export function Loading({ className = "mt-6" }: { className?: string }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} role="status">
      <span className="sr-only">Carregando…</span>
      <div className="h-6 w-2/5 rounded-lg bg-surface-2" />
      <div className="h-24 rounded-2xl bg-surface-2" />
      <div className="h-4 w-3/5 rounded-lg bg-surface-2" />
    </div>
  );
}
