export function PageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-7 bg-gray-200 rounded-lg w-56 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-96" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-24" />
        ))}
      </div>

      {/* Chart cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-100 rounded-2xl h-72" />
        <div className="bg-gray-100 rounded-2xl h-72" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-100 rounded-2xl h-72" />
        <div className="bg-gray-100 rounded-2xl h-72" />
      </div>
    </div>
  );
}
