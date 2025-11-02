import { useState, useEffect, useMemo, useCallback } from "react";
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

  /**
   * Fetch fees from API
   * TODO: Replace with actual endpoint that returns member's fees with payment status
   * Example: GET /api/clubs/{clubId}/members/me/fees
   */
  const fetchFees = useCallback(async () => {
    if (!numericClubId || numericClubId <= 0) {
      setFees([]);
      setLoading(false);
      setError("Club ID không hợp lệ");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await feeService.getFees(numericClubId);

      if (response.code === 200 && response.data) {
        // Transform Fee[] to MemberFee[] with payment status
        // For now, assume all are unpaid (pending/overdue)
        // TODO: Get actual payment status from API
        const memberFees = response.data.map((fee) =>
          transformFeeToMemberFee(fee, false)
        );
        setFees(memberFees);
      } else {
        throw new Error(response.message || "Không thể tải danh sách phí");
      }
    } catch (err) {
      console.error("Error fetching fees:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Có lỗi khi tải danh sách phí";
      setError(errorMessage);
      toast.error(errorMessage);
      // No mock fallback; keep fees empty so UI reflects real data only
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
    </div>
  );
}
