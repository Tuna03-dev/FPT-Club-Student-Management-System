import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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

export default function FeeCard({ fee, onPayClick, isGeneratingQR = false }: FeeCardProps) {
  const paymentStatus = fee.paymentStatus || "pending";
  const isMandatory = fee.required ?? fee.isMandatory ?? false;
  const feeTitle = fee.title;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-lg">{feeTitle}</CardTitle>
              {isMandatory ? (
                <Badge variant="default" className="bg-red-500 hover:bg-red-600">
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
            <span className="font-medium">{formatDate(fee.dueDate)}</span>
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
