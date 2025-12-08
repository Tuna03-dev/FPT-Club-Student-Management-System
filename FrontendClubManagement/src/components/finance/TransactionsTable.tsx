// src/components/finance/TransactionsTable.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, Clock, Edit, Plus, Trash2, XCircle } from "lucide-react";
import Skeleton from "@/components/common/Skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { Fee } from "@/types/fee";
import { CreateTransactionFormDialog } from "./CreateTransactionFormDialog";
import type {
  CreateIncomeTransactionRequest,
  CreateOutcomeTransactionRequest,
} from "@/services/transactionService";

// Match với backend enum TransactionStatus
type TransactionStatus = "PENDING" | "COMPLETED" | "CANCELLED" | "FAILED";

// Income Transaction (từ IncomeTransaction entity)
export interface IncomeTransaction {
  id: number;
  reference: string; // Mã tham chiếu unique
  amount: number;
  description: string;
  transactionDate: string; // LocalDateTime
  source: string; // Nguồn thu (VD: học phí, tài trợ, bán hàng)
  status: TransactionStatus;
  notes?: string;
  feeId?: number; // Liên kết với khoản phí nếu có
  userId?: number; // Người tạo giao dịch
  userName?: string; // Tên người tạo (để hiển thị)
  createdAt?: string;
  updatedAt?: string;
}

// Outcome Transaction (từ OutcomeTransaction entity)
export interface OutcomeTransaction {
  id: number;
  transactionCode: string; // Mã giao dịch unique
  amount: number;
  description: string;
  transactionDate: string; // LocalDateTime
  recipient: string; // Người nhận tiền
  purpose: string; // Mục đích chi tiêu
  status: TransactionStatus;
  notes?: string;
  receiptUrl?: string; // URL biên lai/chứng từ
  createdAt?: string;
  updatedAt?: string;
}

// Combined type để hiển thị chung
export interface Transaction {
  id: number;
  code: string; // reference (income) hoặc transactionCode (outcome)
  amount: number;
  description: string;
  transactionDate: string;
  type: "INCOME" | "OUTCOME";
  status: TransactionStatus;
  // Income specific
  source?: string;
  feeId?: number;
  feeTitle?: string; // Tên khoản phí
  userName?: string; // Người đóng tiền (Income) hoặc người tạo (Outcome)
  userEmail?: string; // Email người đóng
  // Outcome specific
  recipient?: string;
  purpose?: string;
  // Common for both
  receiptUrl?: string; // URL ảnh bằng chứng cho cả Income và Outcome
  // Common
  notes?: string;
  createdBy?: string; // Tên người tạo giao dịch (cho giao dịch thủ công)
  createdAt?: string;
  updatedAt?: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  transactionType?: "INCOME" | "OUTCOME"; // Để tùy chỉnh UI và form theo loại
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onApproveTransaction: (id: string) => void; // PENDING -> COMPLETED
  onRejectTransaction: (id: string) => void; // PENDING -> CANCELLED
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
  loading?: boolean;
  fees?: Fee[]; // Danh sách khoản phí để chọn (cho Income transactions)
  clubId: number; // Required for CreateTransactionFormDialog
  // New handlers for Zod form dialog
  onCreateIncome: (data: CreateIncomeTransactionRequest) => Promise<void>;
  onCreateOutcome: (data: CreateOutcomeTransactionRequest) => Promise<void>;
  // Pagination
  currentPage?: number;
  totalPages?: number;
  totalElements?: number;
  onPageChange?: (page: number) => void;
}

export function TransactionsTable({
  transactions,
  transactionType,
  onEditTransaction,
  onDeleteTransaction,
  onApproveTransaction,
  onRejectTransaction,
  isAddOpen,
  setIsAddOpen,
  loading = false,
  fees = [],
  clubId,
  onCreateIncome,
  onCreateOutcome,
  currentPage = 0,
  totalPages = 1,
  totalElements = 0,
  onPageChange,
}: TransactionsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      onDeleteTransaction(transactionToDelete.id.toString());
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const variants = {
      COMPLETED: {
        label: "Hoàn thành",
        icon: CheckCircle,
        color: "bg-green-500/10 text-green-500",
      },
      PENDING: {
        label: "Chờ xử lý",
        icon: Clock,
        color: "bg-yellow-500/10 text-yellow-500",
      },
      CANCELLED: {
        label: "Đã hủy",
        icon: XCircle,
        color: "bg-gray-500/10 text-gray-500",
      },
      FAILED: {
        label: "Thất bại",
        icon: XCircle,
        color: "bg-red-500/10 text-red-500",
      },
    } as const;
    const variant = variants[status] || variants.COMPLETED;
    const Icon = variant.icon;
    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {transactionType === "INCOME"
                ? "Giao dịch thu"
                : transactionType === "OUTCOME"
                ? "Giao dịch chi"
                : "Danh sách giao dịch"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {transactionType === "INCOME"
                ? "Quản lý các khoản thu: học phí, tài trợ, quyên góp, doanh thu kinh doanh"
                : transactionType === "OUTCOME"
                ? "Quản lý các khoản chi: sự kiện, thiết bị, văn phòng, địa điểm"
                : "Quản lý thu chi của CLB"}
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {transactionType === "INCOME"
              ? "Thêm khoản thu"
              : transactionType === "OUTCOME"
              ? "Thêm khoản chi"
              : "Thêm giao dịch"}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã GD</TableHead>
                <TableHead>Ngày GD</TableHead>
                {!transactionType && <TableHead>Loại</TableHead>}
                <TableHead>Mô tả</TableHead>
                <TableHead>
                  {transactionType === "INCOME"
                    ? "Nguồn thu"
                    : transactionType === "OUTCOME"
                    ? "Người nhận / Mục đích"
                    : "Chi tiết"}
                </TableHead>
                {transactionType === "INCOME" && (
                  <TableHead>Người đóng</TableHead>
                )}
                <TableHead>Người tạo</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton loading state
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    <TableCell>
                      <Skeleton width="80%" height={16} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width="70%" height={16} />
                    </TableCell>
                    {!transactionType && (
                      <TableCell>
                        <Skeleton width={50} height={20} />
                      </TableCell>
                    )}
                    <TableCell>
                      <Skeleton width="90%" height={16} />
                      <Skeleton
                        width="60%"
                        height={12}
                        style={{ marginTop: 4 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Skeleton width="85%" height={16} />
                      <Skeleton
                        width="50%"
                        height={12}
                        style={{ marginTop: 4 }}
                      />
                    </TableCell>
                    {transactionType === "INCOME" && (
                      <TableCell>
                        <Skeleton width="75%" height={16} />
                        <Skeleton
                          width="65%"
                          height={12}
                          style={{ marginTop: 4 }}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Skeleton width="60%" height={16} />
                      <Skeleton
                        width="40%"
                        height={12}
                        style={{ marginTop: 4 }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton
                        width={100}
                        height={16}
                        style={{ marginLeft: "auto" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={80} height={24} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Skeleton width={32} height={32} />
                        <Skeleton width={32} height={32} />
                        <Skeleton width={32} height={32} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      transactionType === "INCOME"
                        ? 9
                        : transactionType === "OUTCOME"
                        ? 8
                        : 9
                    }
                    className="text-center py-8 text-muted-foreground"
                  >
                    {transactionType === "INCOME"
                      ? "Chưa có giao dịch thu nào"
                      : transactionType === "OUTCOME"
                      ? "Chưa có giao dịch chi nào"
                      : "Chưa có giao dịch nào"}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-xs">
                      {transaction.code}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(transaction.transactionDate).toLocaleString(
                        "vi-VN",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </TableCell>
                    {!transactionType && (
                      <TableCell>
                        <Badge
                          variant={
                            transaction.type === "INCOME"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {transaction.type === "INCOME" ? "Thu" : "Chi"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="font-medium max-w-[250px]">
                      <div className="truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                      {transaction.notes && (
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {transaction.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {transaction.type === "INCOME" ? (
                        <div>
                          <div className="font-medium">
                            {transaction.source}
                          </div>
                          {transaction.feeTitle && (
                            <div className="text-xs text-muted-foreground">
                              {transaction.feeTitle}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">
                            {transaction.recipient}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {transaction.purpose}
                          </div>
                          {transaction.receiptUrl && (
                            <a
                              href={transaction.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline"
                            >
                              Xem biên lai →
                            </a>
                          )}
                        </div>
                      )}
                    </TableCell>
                    {transactionType === "INCOME" && (
                      <TableCell className="text-sm">
                        {transaction.userName ? (
                          <div>
                            <div className="font-medium">
                              {transaction.userName}
                            </div>
                            {transaction.userEmail && (
                              <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {transaction.userEmail}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-sm">
                      {transaction.createdBy ? (
                        <div>
                          <div className="font-medium text-blue-600">
                            {transaction.createdBy}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Thủ công
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-muted-foreground">Tự động</div>
                          <div className="text-xs text-green-600">PayOS</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold whitespace-nowrap ${
                        transaction.type === "INCOME"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.type === "INCOME" ? "+" : "-"}
                      {transaction.amount.toLocaleString("vi-VN")} ₫
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {transaction.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() =>
                                onApproveTransaction(transaction.id.toString())
                              }
                            >
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-50"
                              onClick={() =>
                                onRejectTransaction(transaction.id.toString())
                              }
                            >
                              Từ chối
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditTransaction(transaction)}
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(transaction)}
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Summary */}
          {!loading && transactions.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Trang{" "}
                  <span className="font-semibold text-primary">
                    {currentPage + 1}
                  </span>{" "}
                  / <span className="font-medium">{totalPages}</span>
                </div>
                <div className="hidden sm:flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {totalElements} giao dịch
                </div>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && onPageChange && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                      className={
                        currentPage === 0
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i).map(
                    (pageNum) => {
                      if (
                        pageNum === 0 ||
                        pageNum === totalPages - 1 ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => onPageChange(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum + 1}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    }
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        onPageChange(Math.min(totalPages - 1, currentPage + 1))
                      }
                      className={
                        currentPage >= totalPages - 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Xác nhận xóa giao dịch
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {transactionToDelete && (
              <>
                <p className="text-sm mb-4">
                  Bạn có chắc chắn muốn xóa giao dịch{" "}
                  <span className="font-semibold">{transactionToDelete.description}</span>?
                </p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    ⚠️ Hành động này không thể hoàn tác. Vui lòng xác nhận cẩn thận.
                  </p>
                </div>
                <div className="text-sm space-y-2">
                  <p>
                    <span className="font-medium">Mã GD:</span>{" "}
                    <span className="font-mono text-xs">{transactionToDelete.code}</span>
                  </p>
                  <p>
                    <span className="font-medium">Loại:</span>{" "}
                    <Badge variant={transactionToDelete.type === "INCOME" ? "default" : "secondary"}>
                      {transactionToDelete.type === "INCOME" ? "Thu" : "Chi"}
                    </Badge>
                  </p>
                  <p>
                    <span className="font-medium">Số tiền:</span>{" "}
                    <span className={`font-semibold ${
                      transactionToDelete.type === "INCOME" ? "text-green-600" : "text-red-600"
                    }`}>
                      {transactionToDelete.type === "INCOME" ? "+" : "-"}
                      {transactionToDelete.amount.toLocaleString("vi-VN")} ₫
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Ngày GD:</span>{" "}
                    {new Date(transactionToDelete.transactionDate).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDelete}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Zod Form Dialog for Creating Transactions */}
      <CreateTransactionFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        transactionType={transactionType || "INCOME"}
        fees={fees}
        clubId={clubId}
        onCreateIncome={onCreateIncome}
        onCreateOutcome={onCreateOutcome}
      />
    </>
  );
}
