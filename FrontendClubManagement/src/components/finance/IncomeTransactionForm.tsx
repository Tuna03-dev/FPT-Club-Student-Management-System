import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  incomeTransactionSchema,
  type IncomeTransactionFormValues,
} from "./transaction-schemas";
import type { Fee } from "@/types/fee";
import type { SimpleMemberResponse } from "@/services/memberService";
import { ImagePlus, X } from "lucide-react";
import { uploadImage } from "@/api/uploads";
import { toast } from "sonner";

interface IncomeTransactionFormProps {
  fees: Fee[];
  members: SimpleMemberResponse[];
  loadingMembers: boolean;
  onSubmit: (data: IncomeTransactionFormValues) => Promise<void>;
  onCancel: () => void;
}

// Helper function to remove Vietnamese accents
const removeVietnameseAccents = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

export function IncomeTransactionForm({
  fees,
  members,
  loadingMembers,
  onSubmit,
  onCancel,
}: IncomeTransactionFormProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [feeSearch, setFeeSearch] = React.useState("");
  const [memberSearch, setMemberSearch] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<IncomeTransactionFormValues>({
    resolver: zodResolver(incomeTransactionSchema),
    mode: "onChange", // Validate on change to show errors immediately
    defaultValues: {
      amount: 0,
      description: "",
      transactionDate: "",
      source: "",
      notes: "",
      receiptUrl: "",
      feeId: undefined,
      userId: undefined,
    },
  });

  // Filter fees based on search
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

  // Filter members based on search
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
    const maxSize = 5 * 1024 * 1024;
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
        form.setValue("receiptUrl", imageUrl);
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
    form.setValue("receiptUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFormSubmit = async (data: IncomeTransactionFormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Amount Field */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Số tiền (₫) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Transaction Date Field */}
          <FormField
            control={form.control}
            name="transactionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ngày giao dịch *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mô tả *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Nhập mô tả chi tiết về giao dịch..."
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3 text-green-600">
            Thông tin giao dịch thu
          </p>
          <div className="space-y-3">
            {/* Source Field */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nguồn thu *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn nguồn thu..." />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormDescription>Phương thức thu tiền</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* User ID Field */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Người đóng tiền *</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? undefined : Number(value))
                    }
                    value={field.value ? field.value.toString() : "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn thành viên..." />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormDescription>
                    Chọn thành viên đã đóng tiền cho giao dịch này
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fee ID Field */}
            <FormField
              control={form.control}
              name="feeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Liên kết khoản phí (nếu có)</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? undefined : Number(value))
                    }
                    value={field.value?.toString() || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn khoản phí..." />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormDescription>
                    {fees.length > 0
                      ? "Chọn khoản phí mà giao dịch này liên quan"
                      : "Chưa có khoản phí nào được kích hoạt"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Receipt URL Upload */}
            <FormField
              control={form.control}
              name="receiptUrl"
              render={() => (
                <FormItem>
                  <FormLabel>Ảnh bằng chứng (khuyến nghị)</FormLabel>
                  <FormControl>
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
                    </div>
                  </FormControl>
                  <FormDescription>
                    Chụp ảnh biên lai, xác nhận chuyển khoản hoặc chứng từ thu
                    tiền (JPG, PNG, WEBP, tối đa 5MB)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Notes Field */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ghi chú</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Thêm ghi chú bổ sung (tùy chọn)"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            <strong>Lưu ý:</strong> Mã giao dịch sẽ tự động tạo bởi hệ thống.
            Trạng thái mặc định là Chờ xử lý và cần được duyệt.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Đang tạo..." : "Tạo giao dịch"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

