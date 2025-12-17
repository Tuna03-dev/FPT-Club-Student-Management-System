import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock } from "lucide-react";
import type { PaymentStatus } from "@/utils/feeUtils";

interface PaymentStatusBadgeProps {
  status: PaymentStatus | string;
}

export default function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Đã đóng
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Chưa đóng
        </Badge>
      );
    case "overdue":
      return (
        <Badge variant="destructive">
          <Clock className="h-3 w-3 mr-1" />
          Quá hạn
        </Badge>
      );
    default:
      return null;
  }
}

