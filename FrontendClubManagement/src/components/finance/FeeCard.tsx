import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, AlertCircle, Loader2 } from "lucide-react";
import type { MemberFee } from "@/types/memberFee";
import { formatCurrency, formatDate } from "@/utils/feeUtils";
import PaymentStatusBadge from "./PaymentStatusBadge";

interface FeeCardProps {
  fee: MemberFee;
  onPayClick: (fee: MemberFee) => void;
  isGeneratingQR?: boolean;
}

export default function FeeCard({
  fee,
  onPayClick,
  isGeneratingQR = false,
}: FeeCardProps) {
  const paymentStatus = fee.paymentStatus || "pending";
  const isMandatory = fee.required ?? fee.isMandatory ?? false;
  const feeTitle = fee.title;

  const getDueStatusBadge = (dueDate?: string) => {
    if (!dueDate) return null;
    const d = new Date(dueDate);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const diffDays = Math.floor(
      (d.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return <Badge className="bg-red-500/10 text-red-500">Đã hết hạn</Badge>;
    }
    if (diffDays === 0) {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600">Hạn hôm nay</Badge>
      );
    }
    if (diffDays <= 3) {
      return (
        <Badge className="bg-amber-500/10 text-amber-500">
          Sắp hết hạn ({diffDays} ngày)
        </Badge>
      );
    }
    return <Badge className="bg-green-500/10 text-green-500">Còn hạn</Badge>;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-lg">{feeTitle}</CardTitle>
              {isMandatory ? (
                <Badge
                  variant="default"
                  className="bg-red-500 hover:bg-red-600"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Bắt buộc
                </Badge>
              ) : (
                <Badge variant="outline">Tự nguyện</Badge>
              )}
            </div>
            {fee.description && (
              <CardDescription>{fee.description}</CardDescription>
            )}
          </div>
          <PaymentStatusBadge status={paymentStatus} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Số tiền:
            </span>
            <span className="font-semibold text-lg text-primary">
              {formatCurrency(fee.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Hạn đóng:
            </span>
            <div className="font-medium flex items-center gap-2">
              <span>{formatDate(fee.dueDate)}</span>
              {getDueStatusBadge(fee.dueDate)}
            </div>
          </div>
          <Button
            onClick={() => onPayClick(fee)}
            className="w-full mt-4"
            variant={paymentStatus === "overdue" ? "destructive" : "default"}
            disabled={isGeneratingQR}
          >
            {isGeneratingQR ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang tạo mã QR...
              </>
            ) : (
              "Thanh toán ngay"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
