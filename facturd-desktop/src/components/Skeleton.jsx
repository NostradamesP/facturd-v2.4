export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-x-auto shadow-[0px_20px_40px_rgba(42,52,57,0.04)]" role="status" aria-label="Cargando datos">
      <table className="w-full text-left min-w-[700px]">
        <thead>
          <tr className="bg-primary">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-3 bg-white/30 rounded w-20 animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-outline-variant/10">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <div className="h-3 bg-outline-variant/20 rounded w-full animate-pulse" style={{ maxWidth: `${60 + Math.random() * 40}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0px_20px_40px_rgba(42,52,57,0.04)]" role="status" aria-label="Cargando">
      <div className="h-4 bg-outline-variant/20 rounded w-1/3 mb-4 animate-pulse" />
      <div className="h-8 bg-outline-variant/20 rounded w-1/2 mb-2 animate-pulse" />
      <div className="h-3 bg-outline-variant/20 rounded w-2/3 animate-pulse" />
    </div>
  );
}
