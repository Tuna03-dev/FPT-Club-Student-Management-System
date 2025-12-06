import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, AlertCircle } from "lucide-react";
import type { MemberFee } from "@/types/memberFee";
import { formatCurrency, formatDate } from "@/utils/feeUtils";
import PaymentStatusBadge from "./PaymentStatusBadge";

interface FeeHistoryCardProps {
  fee: MemberFee;
}

export default function FeeHistoryCard({ fee }: FeeHistoryCardProps) {
  const isMandatory = fee.required ?? fee.isMandatory ?? false;
  const paymentStatus = fee.paymentStatus || "paid";
  const paidDate = fee.paidDate || fee.dueDate;

  return (
    <Card className="opacity-75">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-lg">{fee.title}</CardTitle>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Số tiền:
            </span>
            <span className="font-semibold">{formatCurrency(fee.amount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Ngày đóng:
            </span>
            <span className="font-medium">{formatDate(paidDate)}</span>
          </div>
          {fee.transactionId && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mã giao dịch:</span>
              <span className="font-mono text-xs">{fee.transactionId}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
