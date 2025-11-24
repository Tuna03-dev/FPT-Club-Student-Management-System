// src/components/finance/TransactionsTable.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Edit, Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Fee } from "@/types/fee";

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
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onApproveTransaction: (id: string) => void; // PENDING -> COMPLETED
  onRejectTransaction: (id: string) => void; // PENDING -> CANCELLED
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
  loading?: boolean;
  fees?: Fee[]; // Danh sách khoản phí để chọn (cho Income transactions)
  // Pagination
  currentPage?: number;
  totalPages?: number;
  totalElements?: number;
  onPageChange?: (page: number) => void;
}

export function TransactionsTable({
  transactions,
  transactionType,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onApproveTransaction,
  onRejectTransaction,
  isAddOpen,
  setIsAddOpen,
  loading = false,
  fees = [],
  currentPage = 0,
  totalPages = 1,
  totalElements = 0,
  onPageChange,
}: TransactionsTableProps) {
  const [feeSearch, setFeeSearch] = React.useState("");

  const filteredFees = React.useMemo(() => {
    if (!feeSearch) return fees;
    const searchLower = feeSearch.toLowerCase();
    return fees.filter(
      (fee) =>
        fee.title.toLowerCase().includes(searchLower) ||
        fee.amount.toString().includes(searchLower)
    );
  }, [fees, feeSearch]);

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
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={onAddTransaction}>
                <Plus className="w-4 h-4 mr-2" />
                {transactionType === "INCOME"
                  ? "Thêm khoản thu"
                  : transactionType === "OUTCOME"
                  ? "Thêm khoản chi"
                  : "Thêm giao dịch"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {transactionType === "INCOME"
                    ? "Thêm giao dịch thu mới"
                    : transactionType === "OUTCOME"
                    ? "Thêm giao dịch chi mới"
                    : "Thêm giao dịch mới"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!transactionType && (
                  <div>
                    <Label>Loại giao dịch *</Label>
                    <select className="w-full mt-1 px-3 py-2 border rounded-md">
                      <option value="INCOME">Thu</option>
                      <option value="OUTCOME">Chi</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Thu: Học phí, tài trợ, bán hàng | Chi: Sự kiện, thiết bị,
                      văn phòng
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Số tiền (₫) *</Label>
                    <Input type="number" placeholder="0" min="0" />
                  </div>
                  <div>
                    <Label>Ngày giao dịch *</Label>
                    <Input type="datetime-local" />
                  </div>
                </div>

                <div>
                  <Label>Mô tả *</Label>
                  <Textarea
                    placeholder="Nhập mô tả chi tiết về giao dịch..."
                    rows={2}
                  />
                </div>

                {/* Fields cho Income Transaction */}
                {(!transactionType || transactionType === "INCOME") && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3 text-green-600">
                      Thông tin giao dịch thu
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label>Nguồn thu *</Label>
                        <Input placeholder="VD: Học phí, Tài trợ, Bán hàng, Quyên góp..." />
                        <p className="text-xs text-muted-foreground mt-1">
                          Danh mục nguồn thu tiền
                        </p>
                      </div>
                      <div>
                        <Label>Liên kết khoản phí (nếu có)</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn khoản phí..." />
                          </SelectTrigger>
                          <SelectContent
                            className="max-h-[350px]"
                            position="popper"
                            side="top"
                            align="start"
                            sideOffset={4}
                          >
                            <div className="sticky top-0 z-10 bg-popover px-2 pt-2 pb-1 border-b">
                              <Input
                                placeholder="Tìm kiếm..."
                                value={feeSearch}
                                onChange={(e) => setFeeSearch(e.target.value)}
                                className="h-8"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="p-1 pt-2">
                              <SelectItem value="none">
                                Không liên kết
                              </SelectItem>
                              {filteredFees
                                .filter((fee) => !fee.isDraft)
                                .map((fee) => (
                                  <SelectItem
                                    key={fee.id}
                                    value={fee.id.toString()}
                                  >
                                    <div className="flex flex-col py-1">
                                      <span className="font-medium">
                                        {fee.title}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {fee.amount.toLocaleString("vi-VN")} ₫ -{" "}
                                        {new Date(
                                          fee.dueDate
                                        ).toLocaleDateString("vi-VN")}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              {filteredFees.filter((fee) => !fee.isDraft)
                                .length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  {feeSearch
                                    ? "Không tìm thấy khoản phí"
                                    : "Chưa có khoản phí nào"}
                                </div>
                              )}
                            </div>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {fees.length > 0
                            ? "Chọn khoản phí mà giao dịch này liên quan"
                            : "Chưa có khoản phí nào được kích hoạt"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fields cho Outcome Transaction */}
                {(!transactionType || transactionType === "OUTCOME") && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3 text-red-600">
                      Thông tin giao dịch chi
                    </p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Người nhận *</Label>
                          <Input placeholder="VD: Nhà cung cấp, Đơn vị cho thuê..." />
                        </div>
                        <div>
                          <Label>Mục đích *</Label>
                          <Input placeholder="VD: Mua thiết bị, Thuê địa điểm..." />
                        </div>
                      </div>
                      <div>
                        <Label>Đường dẫn biên lai/chứng từ</Label>
                        <Input
                          type="url"
                          placeholder="https://example.com/receipt.pdf"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Link tới hóa đơn, biên lai hoặc chứng từ thanh toán
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Ghi chú</Label>
                  <Textarea
                    placeholder="Thêm ghi chú bổ sung (tùy chọn)"
                    rows={2}
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    <strong>Lưu ý:</strong> Mã giao dịch sẽ tự động tạo bởi hệ
                    thống. Trạng thái mặc định là Chờ xử lý và cần được duyệt.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Hủy
                </Button>
                <Button
                  onClick={() => {
                    toast.success("Đã thêm giao dịch");
                    setIsAddOpen(false);
                  }}
                >
                  Tạo giao dịch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                          onClick={() =>
                            onDeleteTransaction(transaction.id.toString())
                          }
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
    </>
  );
}
