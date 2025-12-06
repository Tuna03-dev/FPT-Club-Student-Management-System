
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PaymentSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  feeName?: string;
}

export default function PaymentSuccessDialog({
  open,
  onClose,
  feeName,
}: PaymentSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-pulse" />
                <CheckCircle className="h-16 w-16 text-green-500 relative" />
              </div>
              <span>Thanh toán thành công</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Khoản phí {feeName && `"${feeName}"`} của bạn đã được thanh toán
          </p>
          <p className="text-xs text-muted-foreground">
            Danh sách phí sẽ được cập nhật ngay
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
