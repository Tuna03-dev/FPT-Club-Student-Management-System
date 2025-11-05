import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import FeeCard from "@/components/features/finance/FeeCard";
import FeeHistoryCard from "@/components/features/finance/FeeHistoryCard";
import PaymentQRDialog from "@/components/features/finance/PaymentQRDialog";
import FeeCardSkeleton from "@/components/features/finance/FeeCardSkeleton";
import EmptyState from "@/components/features/finance/EmptyState";
import type { MemberFee } from "@/types/memberFee";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import feeService from "@/services/feeService";
import { authService } from "@/services/authService";
import type { Fee } from "@/types/fee";
import { calculatePaymentStatus } from "@/utils/feeUtils";
import { useWebSocket } from "@/hooks/useWebSocket";
import PaymentSuccessDialog from "@/components/features/finance/PaymentSuccessDialog";

// Note: mock data removed — this page now expects real API data from `feeService.getFees`.

/**
 * Transform Fee from API to MemberFee with payment status
 */
const transformFeeToMemberFee = (
  fee: Fee,
  isPaid: boolean = false
): MemberFee => {
  const paymentStatus = calculatePaymentStatus(fee.dueDate, isPaid);

  return {
    ...fee,
    paymentStatus,
    required: fee.isMandatory,
  };
};

export default function Payment() {
  const { clubId } = useParams<{ clubId: string }>();
  const numericClubId = clubId ? Number(clubId) : null;

  const [selectedFee, setSelectedFee] = useState<MemberFee | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [fees, setFees] = useState<MemberFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<number | undefined>(undefined);
  const [generatingQR, setGeneratingQR] = useState(false);
  const token = localStorage.getItem("accessToken");
  const { isConnected, subscribeToUserQueue } = useWebSocket(token);
  const paymentTimeoutRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successFeeName, setSuccessFeeName] = useState<string | undefined>(
    undefined
  );

  const fetchFees = useCallback(async () => {
    if (!numericClubId || numericClubId <= 0) {
      setFees([]);
      setLoading(false);
      setError("Club ID không hợp lệ");
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      setFees([]);
      setLoading(false);
      setError("Vui lòng đăng nhập để xem các khoản phí");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch cả unpaid và paid fees song song
      const [unpaidResponse, paidResponse] = await Promise.all([
        feeService.getUnpaidFees(numericClubId, currentUser.id),
        feeService.getPaidFees(numericClubId, currentUser.id),
      ]);

      const unpaidFees =
        unpaidResponse.code === 200 && unpaidResponse.data
          ? unpaidResponse.data.map((fee) =>
              transformFeeToMemberFee(fee, false)
            )
          : [];

      const paidFees =
        paidResponse.code === 200 && paidResponse.data
          ? paidResponse.data.map((fee) => transformFeeToMemberFee(fee, true))
          : [];

      // Combine cả 2 lists
      setFees([...unpaidFees, ...paidFees]);
    } catch (err) {
      console.error("Error fetching fees:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Có lỗi khi tải danh sách phí";
      setError(errorMessage);
      toast.error(errorMessage);
      setFees([]);
    } finally {
      setLoading(false);
    }
  }, [numericClubId]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const handlePayment = useCallback(
    async (fee: MemberFee) => {
      if (!numericClubId || !fee.id) {
        toast.error("Thông tin không hợp lệ");
        return;
      }

      // Get current user ID
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        toast.error("Vui lòng đăng nhập để thanh toán");
        return;
      }

      try {
        setGeneratingQR(true);
        setSelectedFee(fee);

        // Call API to generate PayOS payment QR
        const response = await feeService.generatePaymentQR(
          numericClubId,
          Number(fee.id),
          currentUser.id
        );

        if (response.code === 200 && response.data) {
          // Use QR code from PayOS response
          const qrData = response.data.qrCode || response.data.paymentLink;
          setOrderCode(response.data.orderCode);
          setSuccessFeeName(fee.title);
          if (qrData) {
            setQrCodeData(qrData);
            setIsQRDialogOpen(true);
          } else {
            toast.error("Không thể tạo mã QR thanh toán");
          }
        } else {
          throw new Error(response.message || "Không thể tạo mã QR thanh toán");
        }
      } catch (err) {
        console.error("Error generating payment QR:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Có lỗi khi tạo mã QR thanh toán";
        toast.error(errorMessage);
        setSelectedFee(null);
      } finally {
        setGeneratingQR(false);
      }
    },
    [numericClubId]
  );

  const generateQRData = useCallback(
    (fee: MemberFee): string => {
      // Return QR code data from PayOS if available
      if (qrCodeData) {
        return qrCodeData;
      }

      // Fallback to payment link if QR code is not available
      // This should not happen if API works correctly
      return `Payment for ${fee.title}`;
    },
    [qrCodeData]
  );

  const handleCloseDialog = useCallback(() => {
    setIsQRDialogOpen(false);
    setSelectedFee(null);
    setQrCodeData(null);
    setOrderCode(undefined);
    // clear timers
    if (paymentTimeoutRef.current) {
      window.clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = null;
    }
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Memoized filtered fees
  const pendingFees = useMemo(
    () =>
      fees.filter(
        (f) => f.paymentStatus === "pending" || f.paymentStatus === "overdue"
      ),
    [fees]
  );

  const paidFees = useMemo(
    () => fees.filter((f) => f.paymentStatus === "paid"),
    [fees]
  );

  // Subscribe only while we are waiting for a specific payment (QR dialog open)
  useEffect(() => {
    if (!isConnected || !isQRDialogOpen || !orderCode) return;

    const seen = seenMessageIdsRef.current;

    type UnknownPayload = {
      orderCode?: number;
      transactionCode?: string;
      message?: string;
      feeName?: string;
      [k: string]: unknown;
    };

    const unsubscribe = subscribeToUserQueue((message) => {
      try {
        if (message.type !== "PAYMENT") return;
        const payload = message.payload as UnknownPayload;

        const msgId =
          (message as { messageId?: string }).messageId ||
          (payload &&
            payload.orderCode &&
            `${payload.orderCode}-${message.action}`);
        if (msgId && seen.has(msgId)) return;
        if (msgId) seen.add(msgId);

        if (!payload || payload.orderCode !== orderCode) return;

        if (message.action === "SUCCESS") {
          // show success dialog instead of toast
          const feeName =
            successFeeName || (payload as UnknownPayload).feeName || undefined;
          setSuccessFeeName(feeName);
          setShowSuccessDialog(true);
          fetchFees();
          handleCloseDialog();
        } else if (message.action === "FAILED") {
          toast.error(payload.message || "Thanh toán không thành công");
          fetchFees();
        }
      } catch (err) {
        console.error("Error handling WS payment message:", err);
      }
    });

    // polling fallback to refresh status every 5s while waiting
    pollIntervalRef.current = window.setInterval(() => {
      fetchFees();
    }, 15000);

    // timeout after 3 minutes
    paymentTimeoutRef.current = window.setTimeout(() => {
      toast.error("Thời gian chờ thanh toán đã hết. Vui lòng thử lại.");
      handleCloseDialog();
    }, 3 * 60 * 1000);

    return () => {
      unsubscribe();
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (paymentTimeoutRef.current) {
        window.clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
      }
    };
  }, [
    isConnected,
    isQRDialogOpen,
    orderCode,
    subscribeToUserQueue,
    fetchFees,
    handleCloseDialog,
    successFeeName,
  ]);

  return (
    <div className="container max-w-6xl py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Đóng phí</h1>
        <p className="text-muted-foreground">
          Quản lý và thanh toán các khoản phí của bạn
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Pending Fees Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Các khoản phí cần đóng
        </h2>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <FeeCardSkeleton key={i} />
            ))}
          </div>
        ) : pendingFees.length === 0 ? (
          <EmptyState
            title="Bạn không có khoản phí nào cần đóng"
            description="Tất cả các khoản phí của bạn đã được thanh toán đầy đủ."
            icon={<CheckCircle className="h-12 w-12 text-green-500" />}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingFees.map((fee) => (
              <FeeCard
                key={fee.id}
                fee={fee}
                onPayClick={handlePayment}
                isGeneratingQR={generatingQR && selectedFee?.id === fee.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Paid Fees Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Lịch sử đóng phí
        </h2>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <FeeCardSkeleton key={i} />
            ))}
          </div>
        ) : paidFees.length === 0 ? (
          <EmptyState
            title="Chưa có lịch sử đóng phí"
            description="Các khoản phí bạn đã thanh toán sẽ hiển thị ở đây."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {paidFees.map((fee) => (
              <FeeHistoryCard key={fee.id} fee={fee} />
            ))}
          </div>
        )}
      </div>

      {/* QR Payment Dialog */}
      <PaymentQRDialog
        fee={selectedFee}
        open={isQRDialogOpen}
        onClose={handleCloseDialog}
        generateQRData={generateQRData}
        orderCode={orderCode}
      />
      <PaymentSuccessDialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        feeName={successFeeName}
      />
    </div>
  );
}
