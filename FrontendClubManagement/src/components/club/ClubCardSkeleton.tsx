import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ClubCardSkeleton() {
  return (
    <Card className="flex-1 flex flex-col hover:shadow-lg transition-all">
      {/* Image skeleton */}
      <div className="relative h-48 bg-muted overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>

      <CardHeader className="flex-shrink-0">
        {/* Title skeleton */}
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        {/* Description skeleton */}
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-5/6" />
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Users info skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Tags skeleton */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          {/* Buttons skeleton */}
          <div className="flex flex-col gap-2 mt-auto">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

