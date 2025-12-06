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
import { ImagePlus, X } from "lucide-react";
import type {
  CreateIncomeTransactionRequest,
  CreateOutcomeTransactionRequest,
} from "@/services/transactionService";
import {
  memberService,
  type SimpleMemberResponse,
} from "@/services/memberService";
import { uploadImage } from "@/api/uploads";

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionType: "INCOME" | "OUTCOME";
  fees: Fee[];
  clubId: number;
  onCreateIncome: (data: CreateIncomeTransactionRequest) => Promise<void>;
  onCreateOutcome: (data: CreateOutcomeTransactionRequest) => Promise<void>;
}

// Helper function to remove Vietnamese accents
const removeVietnameseAccents = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

export function CreateTransactionDialog({
  open,
  onOpenChange,
  transactionType,
  fees,
  clubId,
  onCreateIncome,
  onCreateOutcome,
}: CreateTransactionDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [feeSearch, setFeeSearch] = React.useState("");
  const [memberSearch, setMemberSearch] = React.useState("");
  const [members, setMembers] = React.useState<SimpleMemberResponse[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch tất cả active members (bao gồm cả tạm nghỉ, trừ đã rời CLB)
  React.useEffect(() => {
    if (open && transactionType === "INCOME") {
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
  }, [open, transactionType, clubId]);

  // Form state cho Income
  const [incomeData, setIncomeData] =
    React.useState<CreateIncomeTransactionRequest>({
      amount: 0,
      description: "",
      transactionDate: "",
      source: "",
      notes: "",
      feeId: undefined,
      userId: undefined,
    });

  // Form state cho Outcome
  const [outcomeData, setOutcomeData] =
    React.useState<CreateOutcomeTransactionRequest>({
      amount: 0,
      description: "",
      transactionDate: "",
      recipient: "",
      purpose: "",
      notes: "",
      receiptUrl: "",
    });

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Kích thước ảnh tối đa 5MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingImage(true);
    try {
      const response = await uploadImage(file);
      if (response.code === 200 && response.data) {
        const imageUrl = response.data.url;
        if (transactionType === "INCOME") {
          setIncomeData({ ...incomeData, receiptUrl: imageUrl });
        } else {
          setOutcomeData({ ...outcomeData, receiptUrl: imageUrl });
        }
        toast.success("Đã tải ảnh lên thành công");
      } else {
        throw new Error(response.message || "Upload failed");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setImagePreview(null);
    if (transactionType === "INCOME") {
      setIncomeData({ ...incomeData, receiptUrl: "" });
    } else {
      setOutcomeData({ ...outcomeData, receiptUrl: "" });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const filteredFees = React.useMemo(() => {
    if (!feeSearch) return fees;
    const searchNormalized = removeVietnameseAccents(feeSearch.toLowerCase());
    return fees.filter((fee) => {
      const titleNormalized = removeVietnameseAccents(fee.title.toLowerCase());
      const amountStr = fee.amount.toString();
      return (
        titleNormalized.includes(searchNormalized) ||
        amountStr.includes(feeSearch)
      );
    });
  }, [fees, feeSearch]);

  const filteredMembers = React.useMemo(() => {
    if (!memberSearch) return members;
    const searchNormalized = removeVietnameseAccents(
      memberSearch.toLowerCase()
    );
    return members.filter((member) => {
      const fullNameNormalized = removeVietnameseAccents(
        (member.fullName || "").toLowerCase()
      );
      const emailLower = (member.email || "").toLowerCase();
      const studentCodeLower = (member.studentCode || "").toLowerCase();

      return (
        fullNameNormalized.includes(searchNormalized) ||
        emailLower.includes(searchNormalized) ||
        studentCodeLower.includes(searchNormalized)
      );
    });
  }, [members, memberSearch]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (transactionType === "INCOME") {
        // Validate income transaction
        if (
          !incomeData.amount ||
          incomeData.amount <= 0 ||
          !incomeData.description ||
          !incomeData.transactionDate ||
          !incomeData.source
        ) {
          toast.error(
            "Vui lòng điền đầy đủ thông tin bắt buộc (số tiền phải lớn hơn 0)"
          );
          setSubmitting(false);
          return;
        }

        // Validate userId is required
        if (!incomeData.userId) {
          toast.error("Vui lòng chọn người đóng tiền");
          setSubmitting(false);
          return;
        }

        await onCreateIncome(incomeData);
      } else {
        // Validate outcome transaction
        if (
          !outcomeData.amount ||
          outcomeData.amount <= 0 ||
          !outcomeData.description ||
          !outcomeData.transactionDate ||
          !outcomeData.recipient ||
          !outcomeData.purpose
        ) {
          toast.error(
            "Vui lòng điền đầy đủ thông tin bắt buộc (số tiền phải lớn hơn 0)"
          );
          setSubmitting(false);
          return;
        }
        await onCreateOutcome(outcomeData);
      }

      toast.success(
        `Đã tạo giao dịch ${
          transactionType === "INCOME" ? "thu" : "chi"
        } thành công`
      );
      onOpenChange(false);

      // Reset form
      setIncomeData({
        amount: 0,
        description: "",
        transactionDate: "",
        source: "",
        notes: "",
        feeId: undefined,
        userId: undefined,
        receiptUrl: "",
      });
      setOutcomeData({
        amount: 0,
        description: "",
        transactionDate: "",
        recipient: "",
        purpose: "",
        notes: "",
        receiptUrl: "",
      });
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error(
        error instanceof Error ? error.message : "Không thể tạo giao dịch"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transactionType === "INCOME"
              ? "Thêm giao dịch thu mới"
              : "Thêm giao dịch chi mới"}
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
                  transactionType === "INCOME"
                    ? incomeData.amount
                    : outcomeData.amount
                }
                onChange={(e) => {
                  const amount = Number(e.target.value);
                  if (transactionType === "INCOME") {
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
                  transactionType === "INCOME"
                    ? incomeData.transactionDate
                    : outcomeData.transactionDate
                }
                onChange={(e) => {
                  const transactionDate = e.target.value;
                  if (transactionType === "INCOME") {
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
                transactionType === "INCOME"
                  ? incomeData.description
                  : outcomeData.description
              }
              onChange={(e) => {
                const description = e.target.value;
                if (transactionType === "INCOME") {
                  setIncomeData({ ...incomeData, description });
                } else {
                  setOutcomeData({ ...outcomeData, description });
                }
              }}
            />
          </div>

          {/* Fields cho Income Transaction */}
          {transactionType === "INCOME" && (
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
                      <SelectItem value="Đóng trực tiếp">
                        Đóng trực tiếp
                      </SelectItem>
                      <SelectItem value="Chuyển khoản ngân hàng">
                        Chuyển khoản ngân hàng
                      </SelectItem>
                      <SelectItem value="PayOS">PayOS</SelectItem>
                      <SelectItem value="Khác">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Phương thức thu tiền
                  </p>
                </div>
                <div>
                  <Label>Người đóng tiền *</Label>
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

                {/* Upload Image Receipt for Income */}
                <div>
                  <Label>Ảnh bằng chứng (khuyến nghị)</Label>
                  <div className="space-y-2">
                    {!imagePreview ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="w-full"
                        >
                          <ImagePlus className="h-4 w-4 mr-2" />
                          {uploadingImage ? "Đang tải..." : "Tải ảnh lên"}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full">
                        <img
                          src={imagePreview}
                          alt="Receipt preview"
                          className="w-full h-80 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Chụp ảnh biên lai, xác nhận chuyển khoản hoặc chứng từ thu
                      tiền (JPG, PNG, WEBP, tối đa 5MB)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fields cho Outcome Transaction */}
          {transactionType === "OUTCOME" && (
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

                {/* Upload Image Receipt for Outcome */}
                <div>
                  <Label>Ảnh bằng chứng (khuyến nghị)</Label>
                  <div className="space-y-2">
                    {!imagePreview ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="w-full"
                        >
                          <ImagePlus className="h-4 w-4 mr-2" />
                          {uploadingImage ? "Đang tải..." : "Tải ảnh lên"}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full">
                        <img
                          src={imagePreview}
                          alt="Receipt preview"
                          className="w-full h-80 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Chụp ảnh hóa đơn, biên lai hoặc chứng từ thanh toán (JPG,
                      PNG, WEBP, tối đa 5MB)
                    </p>
                  </div>
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
                transactionType === "INCOME"
                  ? incomeData.notes
                  : outcomeData.notes
              }
              onChange={(e) => {
                const notes = e.target.value;
                if (transactionType === "INCOME") {
                  setIncomeData({ ...incomeData, notes });
                } else {
                  setOutcomeData({ ...outcomeData, notes });
                }
              }}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <strong>Lưu ý:</strong> Mã giao dịch sẽ tự động tạo bởi hệ thống.
              Trạng thái mặc định là Chờ xử lý và cần được duyệt.
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
            {submitting ? "Đang tạo..." : "Tạo giao dịch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
