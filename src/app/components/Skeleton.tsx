// Grey placeholder shapes shown while a page loads, so the layout doesn't jump.

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`bg-g-border rounded-md animate-pulse ${className}`} />;
}

/** A list of row placeholders (avatar + two lines + value). */
export function SkeletonList({ rows = 6, card = true }: { rows?: number; card?: boolean }) {
  return (
    <div role="status" aria-busy="true" className={card ? 'bg-g-surface rounded-xl border border-g-border overflow-hidden' : ''}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 px-5 py-4 ${i > 0 ? 'border-t border-g-border' : ''}`}>
          <Skeleton className="w-9 h-9 !rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-3.5 w-16 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Detail page placeholder: title line + a few cards. */
export function SkeletonDetail({ cards = 3, className = 'max-w-[900px] mx-auto px-4 py-5 sm:px-6 sm:py-8' }: { cards?: number; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <Skeleton className="h-3.5 w-28 mb-5" />
      <Skeleton className="h-7 w-64 max-w-full mb-2" />
      <Skeleton className="h-3.5 w-40 mb-8" />
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="bg-g-surface rounded-2xl border border-g-border p-6 mb-6">
          <Skeleton className="h-4 w-36 mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
