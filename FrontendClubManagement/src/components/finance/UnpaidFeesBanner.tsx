import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import feeService from "@/services/feeService";
import type { Fee } from "@/types/fee";
import { useWebSocket, type FeeWebSocketPayload, type WebSocketMessage } from "@/hooks/useWebSocket";
import { calculatePaymentStatus } from "@/utils/feeUtils";

export default function UnpaidFeesBanner() {
  const { clubId } = useParams();
  const numericClubId = clubId ? Number(clubId) : null;
  const navigate = useNavigate();
  const [unpaidFees, setUnpaidFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  
  const token = localStorage.getItem("accessToken");
  const { subscribeToClub } = useWebSocket(token);

  const fetchUnpaidFees = useCallback(async () => {
    if (!numericClubId || numericClubId <= 0) {
      setLoading(false);
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await feeService.getUnpaidFees(numericClubId, currentUser.id);
      if (response.code === 200 && Array.isArray(response.data)) {
        // Lọc chỉ lấy phí bắt buộc hoặc phí chưa quá hạn
        const filteredFees = response.data.filter((fee) => {
          const status = calculatePaymentStatus(fee.dueDate, false);
          return fee.isMandatory || status !== "overdue";
        });
        setUnpaidFees(filteredFees);
      } else {
        setUnpaidFees([]);
      }
    } catch (err) {
      console.error("Error fetching unpaid fees:", err);
      setUnpaidFees([]);
    } finally {
      setLoading(false);
    }
  }, [numericClubId]);

  useEffect(() => {
    fetchUnpaidFees();
  }, [fetchUnpaidFees]);

  // WebSocket: Lắng nghe thông báo về phí mới
  useEffect(() => {
    if (!numericClubId || numericClubId <= 0) return;

    const unsubscribe = subscribeToClub(numericClubId, (message: WebSocketMessage<unknown>) => {
      if (message.type === "FEE" && message.action === "CREATED") {
        // Refresh danh sách phí chưa đóng
        void fetchUnpaidFees();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [numericClubId, subscribeToClub, fetchUnpaidFees]);

  // Kiểm tra xem đã dismiss banner chưa (dựa trên sessionStorage)
  useEffect(() => {
    if (unpaidFees.length === 0) return;
    
    const dismissedKey = `unpaidFeesBannerDismissed:${numericClubId}:${unpaidFees.map(f => f.id).join(',')}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setDismissed(true);
    }
  }, [unpaidFees, numericClubId]);

  const handleDismiss = () => {
    if (unpaidFees.length === 0) return;
    const dismissedKey = `unpaidFeesBannerDismissed:${numericClubId}:${unpaidFees.map(f => f.id).join(',')}`;
    sessionStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  };

  const handleGoToPayments = () => {
    navigate(`/myclub/${numericClubId}/payments`);
  };

  // Không hiển thị nếu đang loading, đã dismiss, hoặc không có phí chưa đóng
  if (loading || dismissed || unpaidFees.length === 0) {
    return null;
  }

  const mandatoryCount = unpaidFees.filter((f) => f.isMandatory).length;
  const overdueCount = unpaidFees.filter((f) => {
    const status = calculatePaymentStatus(f.dueDate, false);
    return status === "overdue";
  }).length;

  return (
    <div className="sticky top-14 z-40 w-full border-b border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/50 dark:via-orange-950/50 dark:to-amber-950/50 shadow-sm">
      <div className="max-w-[1920px] mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Bạn có <span className="text-amber-600 dark:text-amber-400 font-bold">{unpaidFees.length}</span> khoản phí chưa đóng
                </p>
                {mandatoryCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                    <AlertCircle className="h-3 w-3" />
                    {mandatoryCount} bắt buộc
                  </span>
                )}
                {overdueCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                    <AlertCircle className="h-3 w-3" />
                    {overdueCount} quá hạn
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Vui lòng đóng phí đúng hạn để tránh ảnh hưởng đến hoạt động của CLB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleGoToPayments}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              Đóng phí ngay
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

