import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Fee } from "@/types/fee";
import { toast } from "sonner";
import type { Transaction } from "./TransactionsTable";
import type {
  CreateIncomeTransactionRequest,
  CreateOutcomeTransactionRequest,
} from "@/services/transactionService";
import {
  memberService,
  type SimpleMemberResponse,
} from "@/services/memberService";

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  fees: Fee[];
  clubId: number;
  onUpdateIncome: (
    id: number,
    data: Partial<CreateIncomeTransactionRequest>
  ) => Promise<void>;
  onUpdateOutcome: (
    id: number,
    data: Partial<CreateOutcomeTransactionRequest>
  ) => Promise<void>;
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  fees,
  clubId,
  onUpdateIncome,
  onUpdateOutcome,
}: EditTransactionDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [feeSearch, setFeeSearch] = React.useState("");
  const [memberSearch, setMemberSearch] = React.useState("");
  const [members, setMembers] = React.useState<SimpleMemberResponse[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(false);

  // Fetch members khi mở dialog cho Income transaction
  React.useEffect(() => {
    if (open && transaction?.type === "INCOME") {
      const fetchMembers = async () => {
        setLoadingMembers(true);
        try {
          const response = await memberService.getAllActiveMembers(clubId);
          if (response.code === 200 && response.data) {
            setMembers(response.data);
          }
        } catch (error) {
          console.error("Failed to fetch members:", error);
        } finally {
          setLoadingMembers(false);
        }
      };
      fetchMembers();
    }
  }, [open, transaction?.type, clubId]);

  // Form state cho Income
  const [incomeData, setIncomeData] = React.useState<
    Partial<CreateIncomeTransactionRequest>
  >({});

  // Form state cho Outcome
  const [outcomeData, setOutcomeData] = React.useState<
    Partial<CreateOutcomeTransactionRequest>
  >({});

  // Load dữ liệu transaction vào form khi mở dialog
  React.useEffect(() => {
    if (transaction) {
      if (transaction.type === "INCOME") {
        setIncomeData({
          amount: transaction.amount,
          description: transaction.description,
          transactionDate: transaction.transactionDate,
          source: transaction.source,
          notes: transaction.notes,
          feeId: transaction.feeId,
          userId: transaction.userName ? undefined : undefined, // Cần userId từ transaction
        });
      } else {
        setOutcomeData({
          amount: transaction.amount,
          description: transaction.description,
          transactionDate: transaction.transactionDate,
          recipient: transaction.recipient,
          purpose: transaction.purpose,
          notes: transaction.notes,
          receiptUrl: transaction.receiptUrl,
        });
      }
    }
  }, [transaction]);

  const filteredFees = React.useMemo(() => {
    if (!feeSearch) return fees;
    const searchLower = feeSearch.toLowerCase();
    return fees.filter(
      (fee) =>
        fee.title.toLowerCase().includes(searchLower) ||
        fee.amount.toString().includes(searchLower)
    );
  }, [fees, feeSearch]);

  const filteredMembers = React.useMemo(() => {
    if (!memberSearch) return members;
    const searchLower = memberSearch.toLowerCase();
    return members.filter(
      (member) =>
        member.fullName?.toLowerCase().includes(searchLower) ||
        member.email?.toLowerCase().includes(searchLower) ||
        member.studentCode?.toLowerCase().includes(searchLower)
    );
  }, [members, memberSearch]);

  const handleSubmit = async () => {
    if (!transaction) return;

    setSubmitting(true);
    try {
      if (transaction.type === "INCOME") {
        // Validate
        if (
          !incomeData.amount ||
          !incomeData.description ||
          !incomeData.transactionDate ||
          !incomeData.source
        ) {
          toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
          setSubmitting(false);
          return;
        }
        await onUpdateIncome(transaction.id, incomeData);
      } else {
        // Validate
        if (
          !outcomeData.amount ||
          !outcomeData.description ||
          !outcomeData.transactionDate ||
          !outcomeData.recipient ||
          !outcomeData.purpose
        ) {
          toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
          setSubmitting(false);
          return;
        }
        await onUpdateOutcome(transaction.id, outcomeData);
      }

      toast.success("Đã cập nhật giao dịch thành công");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật giao dịch"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction.type === "INCOME"
              ? "Chỉnh sửa giao dịch thu"
              : "Chỉnh sửa giao dịch chi"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Số tiền (₫) *</Label>
              <Input
                type="number"
                placeholder="0"
                min="0"
                value={
                  transaction.type === "INCOME"
                    ? incomeData.amount
                    : outcomeData.amount
                }
                onChange={(e) => {
                  const amount = Number(e.target.value);
                  if (transaction.type === "INCOME") {
                    setIncomeData({ ...incomeData, amount });
                  } else {
                    setOutcomeData({ ...outcomeData, amount });
                  }
                }}
              />
            </div>
            <div>
              <Label>Ngày giao dịch *</Label>
              <Input
                type="datetime-local"
                value={
                  transaction.type === "INCOME"
                    ? incomeData.transactionDate
                    : outcomeData.transactionDate
                }
                onChange={(e) => {
                  const transactionDate = e.target.value;
                  if (transaction.type === "INCOME") {
                    setIncomeData({ ...incomeData, transactionDate });
                  } else {
                    setOutcomeData({ ...outcomeData, transactionDate });
                  }
                }}
              />
            </div>
          </div>

          <div>
            <Label>Mô tả *</Label>
            <Textarea
              placeholder="Nhập mô tả chi tiết về giao dịch..."
              rows={2}
              value={
                transaction.type === "INCOME"
                  ? incomeData.description
                  : outcomeData.description
              }
              onChange={(e) => {
                const description = e.target.value;
                if (transaction.type === "INCOME") {
                  setIncomeData({ ...incomeData, description });
                } else {
                  setOutcomeData({ ...outcomeData, description });
                }
              }}
            />
          </div>

          {/* Fields cho Income Transaction */}
          {transaction.type === "INCOME" && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3 text-green-600">
                Thông tin giao dịch thu
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Nguồn thu *</Label>
                  <Select
                    value={incomeData.source || ""}
                    onValueChange={(value) =>
                      setIncomeData({ ...incomeData, source: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nguồn thu..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Đóng trực tiếp">Đóng trực tiếp</SelectItem>
                      <SelectItem value="Chuyển khoản ngân hàng">Chuyển khoản ngân hàng</SelectItem>
                      <SelectItem value="PayOS">PayOS</SelectItem>
                      <SelectItem value="Khác">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Phương thức thu tiền
                  </p>
                </div>
                <div>
                  <Label>Người đóng tiền (nếu có)</Label>
                  <Select
                    value={incomeData.userId?.toString() || "none"}
                    onValueChange={(value) => {
                      setIncomeData({
                        ...incomeData,
                        userId: value === "none" ? undefined : Number(value),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn thành viên..." />
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
                          placeholder="Tìm kiếm thành viên..."
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="h-8"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="p-1 pt-2">
                        <SelectItem value="none">Không chọn</SelectItem>
                        {loadingMembers ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Đang tải danh sách thành viên...
                          </div>
                        ) : filteredMembers.length > 0 ? (
                          filteredMembers.map((member) => (
                            <SelectItem
                              key={member.userId}
                              value={member.userId.toString()}
                            >
                              <div className="flex flex-col py-1">
                                <span className="font-medium">
                                  {member.fullName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {member.studentCode} - {member.email}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {memberSearch
                              ? "Không tìm thấy thành viên"
                              : "Chưa có thành viên nào"}
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chọn thành viên đã đóng tiền cho giao dịch này
                  </p>
                </div>
                <div>
                  <Label>Liên kết khoản phí (nếu có)</Label>
                  <Select
                    value={incomeData.feeId?.toString() || "none"}
                    onValueChange={(value) => {
                      setIncomeData({
                        ...incomeData,
                        feeId: value === "none" ? undefined : Number(value),
                      });
                    }}
                  >
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
                        <SelectItem value="none">Không liên kết</SelectItem>
                        {filteredFees
                          .filter((fee) => !fee.isDraft)
                          .map((fee) => (
                            <SelectItem key={fee.id} value={fee.id.toString()}>
                              <div className="flex flex-col py-1">
                                <span className="font-medium">{fee.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {fee.amount.toLocaleString("vi-VN")} ₫ -{" "}
                                  {new Date(fee.dueDate).toLocaleDateString(
                                    "vi-VN"
                                  )}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        {filteredFees.filter((fee) => !fee.isDraft).length ===
                          0 && (
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
          {transaction.type === "OUTCOME" && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3 text-red-600">
                Thông tin giao dịch chi
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Người nhận *</Label>
                    <Input
                      placeholder="VD: Nhà cung cấp, Đơn vị cho thuê..."
                      value={outcomeData.recipient}
                      onChange={(e) =>
                        setOutcomeData({
                          ...outcomeData,
                          recipient: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Mục đích *</Label>
                    <Input
                      placeholder="VD: Mua thiết bị, Thuê địa điểm..."
                      value={outcomeData.purpose}
                      onChange={(e) =>
                        setOutcomeData({
                          ...outcomeData,
                          purpose: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Đường dẫn biên lai/chứng từ</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/receipt.pdf"
                    value={outcomeData.receiptUrl}
                    onChange={(e) =>
                      setOutcomeData({
                        ...outcomeData,
                        receiptUrl: e.target.value,
                      })
                    }
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
              value={
                transaction.type === "INCOME"
                  ? incomeData.notes
                  : outcomeData.notes
              }
              onChange={(e) => {
                const notes = e.target.value;
                if (transaction.type === "INCOME") {
                  setIncomeData({ ...incomeData, notes });
                } else {
                  setOutcomeData({ ...outcomeData, notes });
                }
              }}
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              <strong>Lưu ý:</strong> Chỉ có thể chỉnh sửa giao dịch đang ở
              trạng thái "Chờ xử lý". Giao dịch đã hoàn thành không thể sửa.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
