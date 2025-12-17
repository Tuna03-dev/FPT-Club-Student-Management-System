import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import type { MemberFee } from "@/types/memberFee";
import { formatCurrency } from "@/utils/feeUtils";

interface PaymentQRDialogProps {
  fee: MemberFee | null;
  open: boolean;
  onClose: () => void;
  generateQRData: (fee: MemberFee) => string;
  orderCode?: number;
}

export default function PaymentQRDialog({
  fee,
  open,
  onClose,
  generateQRData,
  orderCode,
}: PaymentQRDialogProps) {
  if (!fee) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thanh toán phí</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tên phí:</span>
              <span className="font-medium">{fee.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Số tiền:</span>
              <span className="font-semibold text-lg text-primary">
                {formatCurrency(fee.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Mã giao dịch:
              </span>
              <span className="font-mono text-sm">{orderCode}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              {(() => {
                const qrData = generateQRData(fee);
                // Check if qrData is a URL or base64 image
                if (
                  qrData.startsWith("http://") ||
                  qrData.startsWith("https://") ||
                  qrData.startsWith("data:image")
                ) {
                  return (
                    <img
                      src={qrData}
                      alt="QR Code"
                      className="w-64 h-64 object-contain"
                    />
                  );
                }
                // Otherwise, generate QR code from string
                return (
                  <QRCodeSVG
                    value={qrData}
                    size={256}
                    level="H"
                    
                  />
                );
              })()}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Quét mã QR bằng ứng dụng ngân hàng để thanh toán
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Lưu ý:</strong> Sau khi chuyển khoản, vui lòng chờ hệ
              thống xác nhận. Quá trình này có thể mất vài phút.
            </p>
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
