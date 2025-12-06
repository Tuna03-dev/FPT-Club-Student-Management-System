import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  outcomeTransactionSchema,
  type OutcomeTransactionFormValues,
} from "./transaction-schemas";
import { ImagePlus, X } from "lucide-react";
import { uploadImage } from "@/api/uploads";
import { toast } from "sonner";

interface OutcomeTransactionFormProps {
  onSubmit: (data: OutcomeTransactionFormValues) => Promise<void>;
  onCancel: () => void;
}

export function OutcomeTransactionForm({
  onSubmit,
  onCancel,
}: OutcomeTransactionFormProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<OutcomeTransactionFormValues>({
    resolver: zodResolver(outcomeTransactionSchema),
    defaultValues: {
      amount: 0,
      description: "",
      transactionDate: "",
      recipient: "",
      purpose: "",
      notes: "",
      receiptUrl: "",
    },
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

  const handleFormSubmit = async (data: OutcomeTransactionFormValues) => {
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
          <p className="text-sm font-medium mb-3 text-red-600">
            Thông tin giao dịch chi
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Recipient Field */}
              <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Người nhận *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Nhà cung cấp, Đơn vị cho thuê..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Purpose Field */}
              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mục đích *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: Mua thiết bị, Thuê địa điểm..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                    Chụp ảnh hóa đơn, biên lai hoặc chứng từ thanh toán (JPG,
                    PNG, WEBP, tối đa 5MB)
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

