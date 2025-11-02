import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import FeeCard from "./FeeCard";
import FeeHistoryCard from "./FeeHistoryCard";
import PaymentQRDialog from "./PaymentQRDialog";
import FeeCardSkeleton from "./FeeCardSkeleton";
import EmptyState from "./EmptyState";
import type { MemberFee } from "@/types/memberFee";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import feeService from "@/services/feeService";
import type { Fee } from "@/types/fee";
import { calculatePaymentStatus } from "@/utils/feeUtils";

/**
 * Mock data fallback when API is not available
 * TODO: Replace with actual API call to get member's fees with payment status
 */
const mockFees: MemberFee[] = [
  {
    id: "1",
    title: "Phí hội viên tháng 11",
    amount: 50000,
    dueDate: "2024-11-30",
    paymentStatus: "pending",
    description: "Phí hội viên định kỳ hàng tháng",
    required: true,
    isMandatory: true,
    feeType: "MEMBERSHIP",
  },
  {
    id: "2",
    title: "Phí sự kiện Workshop",
    amount: 100000,
    dueDate: "2024-11-25",
    paymentStatus: "pending",
    description: "Phí tham gia sự kiện Workshop công nghệ",
    required: false,
    isMandatory: false,
    feeType: "EVENT",
  },
  {
    id: "3",
    title: "Phí hội viên tháng 10",
    amount: 50000,
    dueDate: "2024-10-31",
    paymentStatus: "paid",
    description: "Phí hội viên định kỳ hàng tháng",
    required: true,
    isMandatory: true,
    paidDate: "2024-10-28",
    feeType: "MEMBERSHIP",
  },
  {
    id: "4",
    title: "Phí sự kiện Team Building",
    amount: 200000,
    dueDate: "2024-10-15",
    paymentStatus: "paid",
    description: "Phí tham gia sự kiện Team Building",
    required: false,
    isMandatory: false,
    paidDate: "2024-10-14",
    feeType: "EVENT",
  },
];

/**
 * Transform Fee from API to MemberFee with payment status
 */
const transformFeeToMemberFee = (fee: Fee, isPaid: boolean = false): MemberFee => {
  const paymentStatus = calculatePaymentStatus(fee.dueDate, isPaid);
  
  return {
    ...fee,
    paymentStatus,
    required: fee.isMandatory,
  };
};

export default function MemberPaymentPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const numericClubId = clubId ? Number(clubId) : null;
  
  const [selectedFee, setSelectedFee] = useState<MemberFee | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [fees, setFees] = useState<MemberFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch fees from API
   * TODO: Replace with actual endpoint that returns member's fees with payment status
   * Example: GET /api/clubs/{clubId}/members/me/fees
   */
  const fetchFees = useCallback(async () => {
    if (!numericClubId || numericClubId <= 0) {
      // Use mock data if no valid clubId
      setFees(mockFees);
      setLoading(false);
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
        err instanceof Error
          ? err.message
          : "Có lỗi khi tải danh sách phí";
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Fallback to mock data on error
      setFees(mockFees);
    } finally {
      setLoading(false);
    }
  }, [numericClubId]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const handlePayment = useCallback((fee: MemberFee) => {
    setSelectedFee(fee);
    setIsQRDialogOpen(true);
  }, []);

  const generateQRData = useCallback((fee: MemberFee): string => {
    // Generate payment QR data based on Vietnam's VietQR standard
    // TODO: Integrate with PayOS or actual payment gateway
    const bankAccount = "1234567890";
    const bankCode = "970422"; // MB Bank
    const amount = fee.amount;
    const description = `${fee.title} - MA${fee.id}`;
    
    // VietQR format
    return JSON.stringify({
      bankCode: bankCode,
      accountNumber: bankAccount,
      amount: amount,
      description: description,
      feeId: fee.id,
      template: "compact",
    });
  }, []);

  const handleCloseDialog = useCallback(() => {
    setIsQRDialogOpen(false);
    setSelectedFee(null);
  }, []);

  // Memoized filtered fees
  const pendingFees = useMemo(
    () =>
      fees.filter(
        (f) =>
          f.paymentStatus === "pending" || f.paymentStatus === "overdue"
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
              <FeeCard key={fee.id} fee={fee} onPayClick={handlePayment} />
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
      />
    </div>
  );
}
