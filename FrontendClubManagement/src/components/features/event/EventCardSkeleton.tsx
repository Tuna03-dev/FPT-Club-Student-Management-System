import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50">
      {/* Image skeleton */}
      <div className="relative overflow-hidden aspect-video">
        <Skeleton className="w-full h-full" />
        
        {/* Badge skeletons */}
        <div className="absolute top-3 left-3">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="absolute top-3 right-3">
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      <CardContent className="p-6">
        {/* Date skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Title skeleton */}
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-3/4 mb-4" />

        {/* Location skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Status badge skeleton */}
        <div className="mb-4">
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Button skeleton */}
        <Skeleton className="h-10 w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}
