export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-16 bg-gray-100 rounded" />
        </div>
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="mb-4">
        <div className="h-8 w-28 bg-gray-200 rounded mb-1" />
        <div className="h-3 w-20 bg-gray-100 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-8 w-28 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}
