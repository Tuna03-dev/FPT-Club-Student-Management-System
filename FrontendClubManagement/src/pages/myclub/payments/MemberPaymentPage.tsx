import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import FeeCard from "@/components/finance/FeeCard";
import PaymentQRDialog from "@/components/finance/PaymentQRDialog";
import FeeCardSkeleton from "@/components/finance/FeeCardSkeleton";
import EmptyState from "@/components/finance/EmptyState";
import type { MemberFee } from "@/types/memberFee";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import feeService from "@/services/feeService";
import { authService } from "@/services/authService";
import type { Fee, FeeType } from "@/types/fee";
import { calculatePaymentStatus } from "@/utils/feeUtils";
import { useWebSocket } from "@/hooks/useWebSocket";
import PaymentSuccessDialog from "@/components/finance/PaymentSuccessDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import type { PageResponse } from "@/types";

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

// helper to render fee type badge consistently
const getFeeTypeBadge = (type?: FeeType) => {
  const variants: Record<FeeType, { label: string; color: string }> = {
    MEMBERSHIP: { label: "Hội viên", color: "bg-blue-500/10 text-blue-500" },
    EVENT: { label: "Sự kiện", color: "bg-emerald-500/10 text-emerald-500" },
    OTHER: { label: "Khác", color: "bg-gray-400/10 text-gray-500" },
  };
  const t = type && variants[type] ? variants[type] : variants.OTHER;
  return <Badge className={t.color}>{t.label}</Badge>;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export default function Payment() {
  const { clubId } = useParams<{ clubId: string }>();
  const numericClubId = clubId ? Number(clubId) : null;

  const [selectedFee, setSelectedFee] = useState<MemberFee | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [pendingFees, setPendingFees] = useState<MemberFee[]>([]);
  const [paidFees, setPaidFees] = useState<MemberFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [paidLoading, setPaidLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<number | undefined>(undefined);
  const [generatingQR, setGeneratingQR] = useState(false);

  const [paidPage, setPaidPage] = useState(0);
  const paidPageSize = 10;
  const [paidTotalPages, setPaidTotalPages] = useState(0);
  const [paidTotalElements, setPaidTotalElements] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const token = localStorage.getItem("accessToken");
  const { isConnected, subscribeToUserQueue } = useWebSocket(token);
  const paymentTimeoutRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successFeeName, setSuccessFeeName] = useState<string | undefined>(
    undefined
  );

  const fetchPendingFees = useCallback(async (club: number, userId: number) => {
    try {
      const response = await feeService.getUnpaidFees(club, userId);
      if (response.code === 200 && Array.isArray(response.data)) {
        const memberFees = response.data.map((fee) =>
          transformFeeToMemberFee(fee, false)
        );
        setPendingFees(memberFees);
      } else {
        setPendingFees([]);
      }
    } catch (err) {
      console.error("Error fetching unpaid fees:", err);
      setPendingFees([]);
    }
  }, []);

  const fetchPaidFees = useCallback(
    async (
      club: number,
      userId: number,
      page: number,
      showToastError: boolean = true
    ) => {
      try {
        setPaidLoading(true);
        const response = await feeService.getPaidFees(
          club,
          userId,
          page,
          paidPageSize
        );
        if (response.code === 200 && response.data) {
          const pageData = response.data as PageResponse<Fee>;
          const content = Array.isArray(pageData.content)
            ? pageData.content
            : [];
          const memberFees = content.map((fee) =>
            transformFeeToMemberFee(fee, true)
          );
          setPaidFees(memberFees);
          setPaidTotalPages(pageData.totalPages ?? 0);
          setPaidTotalElements(pageData.totalElements ?? 0);
          setHasNext(Boolean(pageData.hasNext));
          setHasPrevious(Boolean(pageData.hasPrevious));
        } else {
          setPaidFees([]);
          setPaidTotalPages(0);
          setPaidTotalElements(0);
          setHasNext(false);
          setHasPrevious(false);
        }
      } catch (err) {
        console.error("Error fetching paid fees:", err);
        if (showToastError) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Không thể tải lịch sử đóng phí";
          toast.error(errorMessage);
        }
        setPaidFees([]);
        setPaidTotalPages(0);
        setPaidTotalElements(0);
        setHasNext(false);
        setHasPrevious(false);
      } finally {
        setPaidLoading(false);
      }
    },
    [paidPageSize]
  );

  const fetchAllFees = useCallback(
    async (page: number = 0) => {
      if (!numericClubId || numericClubId <= 0) {
        setError("Club ID không hợp lệ");
        setPendingFees([]);
        setPaidFees([]);
        setPaidTotalPages(0);
        setPaidTotalElements(0);
        setHasNext(false);
        setHasPrevious(false);
        setLoading(false);
        return;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        setError("Vui lòng đăng nhập để xem các khoản phí");
        setPendingFees([]);
        setPaidFees([]);
        setPaidTotalPages(0);
        setPaidTotalElements(0);
        setHasNext(false);
        setHasPrevious(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchPendingFees(numericClubId, currentUser.id),
          fetchPaidFees(numericClubId, currentUser.id, page, false),
        ]);
        setPaidPage(page);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Có lỗi khi tải danh sách phí";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [numericClubId, fetchPendingFees, fetchPaidFees]
  );

  const refreshFees = useCallback(async () => {
    if (!numericClubId || numericClubId <= 0) return;
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.id) return;
    await Promise.all([
      fetchPendingFees(numericClubId, currentUser.id),
      fetchPaidFees(numericClubId, currentUser.id, paidPage, false),
    ]);
  }, [numericClubId, paidPage, fetchPendingFees, fetchPaidFees]);

  useEffect(() => {
    fetchAllFees(0);
  }, [fetchAllFees]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      if (newPage === paidPage) return;
      if (!numericClubId || numericClubId <= 0) return;
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) return;
      setPaidPage(newPage);
      await fetchPaidFees(numericClubId, currentUser.id, newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [numericClubId, paidPage, fetchPaidFees]
  );

  const handlePayment = useCallback(
    async (fee: MemberFee) => {
      if (!numericClubId || !fee.id) {
        toast.error("Thông tin không hợp lệ");
        return;
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        toast.error("Vui lòng đăng nhập để thanh toán");
        return;
      }

      try {
        setGeneratingQR(true);
        setSelectedFee(fee);
        const response = await feeService.generatePaymentQR(
          numericClubId,
          Number(fee.id),
          currentUser.id
        );

        if (response.code === 200 && response.data) {
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
      if (qrCodeData) {
        return qrCodeData;
      }
      return `Payment for ${fee.title}`;
    },
    [qrCodeData]
  );

  const handleCloseDialog = useCallback(() => {
    setIsQRDialogOpen(false);
    setSelectedFee(null);
    setQrCodeData(null);
    setOrderCode(undefined);
    if (paymentTimeoutRef.current) {
      window.clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = null;
    }
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

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
          const feeName = successFeeName || payload.feeName || undefined;
          setSuccessFeeName(feeName);
          setShowSuccessDialog(true);
          void refreshFees();
          handleCloseDialog();
        } else if (message.action === "FAILED") {
          toast.error(payload.message || "Thanh toán không thành công");
          void refreshFees();
        }
      } catch (err) {
        console.error("Error handling WS payment message:", err);
      }
    });

    pollIntervalRef.current = window.setInterval(() => {
      void refreshFees();
    }, 15000);

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
    refreshFees,
    handleCloseDialog,
    successFeeName,
  ]);

  const renderPendingSection = () => {
    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <FeeCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (pendingFees.length === 0) {
      return (
        <EmptyState
          title="Bạn không có khoản phí nào cần đóng"
          description="Tất cả các khoản phí của bạn đã được thanh toán đầy đủ."
          icon={<CheckCircle className="h-12 w-12 text-green-500" />}
        />
      );
    }

    return (
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
    );
  };

  const renderPaidSection = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-4 items-center">
              <Skeleton className="h-4 w-full col-span-2" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      );
    }

    if (paidFees.length === 0) {
      return (
        <EmptyState
          title="Chưa có lịch sử đóng phí"
          description="Các khoản phí bạn đã thanh toán sẽ hiển thị ở đây."
        />
      );
    }

    return (
      <>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên khoản phí</TableHead>
                <TableHead>Loại phí</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Ngày đóng</TableHead>
                <TableHead>Mã giao dịch</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paidLoading && paidFees.length === 0
                ? [...Array(paidPageSize)].map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                : paidFees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{fee.title}</span>
                          {fee.description && (
                            <span className="text-xs text-muted-foreground mt-1">
                              {fee.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getFeeTypeBadge(fee.feeType)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(fee.amount)}
                      </TableCell>
                      <TableCell>
                        {formatDate(fee.paidDate || fee.dueDate)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">
                          {fee.transactionId || fee.transactionReference || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className="bg-green-500/10 text-green-600 border-green-500"
                          variant="outline"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Đã thanh toán
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>

        {paidTotalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      hasPrevious && handlePageChange(paidPage - 1)
                    }
                    className={
                      !hasPrevious
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {paidPage > 2 && (
                  <>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(0)}
                        className="cursor-pointer"
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {paidPage > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}

                {Array.from({ length: Math.min(5, paidTotalPages) }, (_, i) => {
                  let pageNum;
                  if (paidTotalPages <= 5) {
                    pageNum = i;
                  } else if (paidPage <= 2) {
                    pageNum = i;
                  } else if (paidPage >= paidTotalPages - 3) {
                    pageNum = paidTotalPages - 5 + i;
                  } else {
                    pageNum = paidPage - 2 + i;
                  }

                  if (pageNum < 0 || pageNum >= paidTotalPages) return null;
                  if (paidPage > 2 && pageNum === 0) return null;
                  if (
                    paidPage < paidTotalPages - 3 &&
                    pageNum === paidTotalPages - 1
                  )
                    return null;

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNum)}
                        isActive={paidPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum + 1}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {paidPage < paidTotalPages - 3 && (
                  <>
                    {paidPage < paidTotalPages - 4 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(paidTotalPages - 1)}
                        className="cursor-pointer"
                      >
                        {paidTotalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => hasNext && handlePageChange(paidPage + 1)}
                    className={
                      !hasNext
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-center text-sm text-muted-foreground mt-2">
              Trang {paidPage + 1} / {paidTotalPages} ({paidTotalElements} khoản
              phí)
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Đóng phí</h1>
        <p className="text-muted-foreground">
          Quản lý và thanh toán các khoản phí của bạn
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Các khoản phí cần đóng
        </h2>
        {renderPendingSection()}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Lịch sử đóng phí
        </h2>
        {renderPaidSection()}
      </div>

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
