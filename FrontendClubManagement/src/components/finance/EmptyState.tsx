import { Card, CardContent } from "@/components/ui/card";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = "Không có dữ liệu",
  description,
  icon
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="flex flex-col items-center gap-4">
          {icon || (
            <Inbox className="h-12 w-12 text-muted-foreground" />
          )}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-muted-foreground">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground max-w-md">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

