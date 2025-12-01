import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import type { ReportRequirementResponse } from "@/types/dto/reportRequirement.dto";
import {
  updateReportRequirement,
  type UpdateReportRequirementRequest,
} from "@/services/reportService";

interface UpdateReportRequirementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportRequirement: ReportRequirementResponse;
  onSuccess?: () => void;
}

export function UpdateReportRequirementDialog({
  open,
  onOpenChange,
  reportRequirement,
  onSuccess,
}: UpdateReportRequirementDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Initialize form with current values when dialog opens
  useEffect(() => {
    if (open && reportRequirement) {
      setTitle(reportRequirement.title || "");
      setDescription(reportRequirement.description || "");
      // Convert backend dueDate to a value suitable for `datetime-local` input
      const toInputDateValue = (val?: string) => {
        if (!val) return "";
        // If backend stores local datetime without timezone (e.g. "2025-12-01T18:10:00" or "2025-12-01T18:10"),
        // use it directly (slice to minutes) to avoid timezone shifts.
        const localNoTZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(val);
        if (localNoTZ) return val.slice(0, 16);

        // Otherwise parse as absolute time (with timezone/Z) and convert to local for the input
        try {
          const d = new Date(val);
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
          return local.toISOString().slice(0, 16);
        } catch {
          return "";
        }
      };

      setDueDate(toInputDateValue(reportRequirement.dueDate));
      setFile(null);
    }
  }, [open, reportRequirement]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Enforce single-file upload
      if (e.target.files.length > 1) {
        toast.error("Chỉ được phép tải lên một tệp");
        e.target.value = "";
        return;
      }

      const selectedFile = e.target.files[0];
      // Validate file size (max 20MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error("Kích thước file không được vượt quá 20MB");
        e.target.value = "";
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Get current date in local datetime format for min attribute
  const getCurrentDateTime = () => {
    const now = new Date();
    // Subtract timezone offset to get local time
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }

    if (!dueDate) {
      toast.error("Vui lòng chọn hạn chót");
      return;
    }

    // Show confirmation dialog
    setShowUpdateConfirm(true);
  };

  const handleConfirmUpdate = async () => {
    setShowUpdateConfirm(false);
    setIsSubmitting(true);

    try {
      // Normalize datetime-local value to backend expected format YYYY-MM-DDTHH:mm:ss (no timezone)
      const normalizeDateTimeLocal = (val?: string) => {
        if (!val) return "";
        // If already includes seconds, keep as is (slice to seconds)
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(val)) return val;
        // If format is YYYY-MM-DDTHH:mm, append :00
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return `${val}:00`;
        // Fallback: try to parse and format without timezone
        try {
          const d = new Date(val);
          const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
          return local.toISOString().slice(0, 19);
        } catch {
          return val;
        }
      };

      const request: UpdateReportRequirementRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: normalizeDateTimeLocal(dueDate),
      };

      await updateReportRequirement(
        reportRequirement.id,
        request,
        file || undefined
      );

      toast.success("Cập nhật yêu cầu báo cáo thành công");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error updating report requirement:", error);

      // Extract error message from BE response
      let errorMessage = "Không thể cập nhật yêu cầu báo cáo";

      if (error.response?.data) {
        const responseData = error.response.data;

        // Check for validation errors
        if (
          responseData.errors &&
          Array.isArray(responseData.errors) &&
          responseData.errors.length > 0
        ) {
          errorMessage = responseData.errors
            .map((err: any) => err.errorMessage || err.message)
            .join(", ");
        }
        // Check for general error message
        else if (responseData.message) {
          errorMessage = responseData.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Check if there are unsaved changes
    const hasChanges =
      title !== (reportRequirement.title || "") ||
      description !== (reportRequirement.description || "") ||
      dueDate !==
        new Date(reportRequirement.dueDate).toISOString().slice(0, 16) ||
      file !== null;

    if (hasChanges) {
      setShowCancelConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cập nhật yêu cầu báo cáo</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cho yêu cầu báo cáo. Các trường có dấu * là bắt
            buộc.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Tiêu đề <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề yêu cầu báo cáo"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả chi tiết về yêu cầu báo cáo"
              rows={4}
            />
          </div>

          {/* Due Date with Time */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">
              Hạn chót <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                min={getCurrentDateTime()}
                className="pl-10"
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-xs text-muted-foreground">
              Chọn ngày và giờ hạn chót (không được chọn thời gian trong quá
              khứ)
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Tệp đính kèm (tùy chọn)
            </h3>

            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <label className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium">Nhấp để chọn file</p>
                    <p className="text-xs text-muted-foreground">
                      Một tệp (tối đa 20MB)
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Current File */}
            {reportRequirement.templateUrl && !file && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  File hiện tại:
                </p>
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <a
                        href={reportRequirement.templateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline truncate block"
                      >
                        {reportRequirement.templateUrl.split("/").pop()}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* New File Selected */}
            {file && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-green-600">
                  File mới đã chọn:
                </p>
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-950 p-3 rounded-md border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0 text-green-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Update Confirmation Dialog */}
      <Dialog open={showUpdateConfirm} onOpenChange={setShowUpdateConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận cập nhật</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn cập nhật yêu cầu báo cáo này không? Thông
              tin mới sẽ được áp dụng cho tất cả các câu lạc bộ liên quan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUpdateConfirm(false)}
            >
              Hủy
            </Button>
            <Button type="button" onClick={handleConfirmUpdate}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hủy thay đổi</DialogTitle>
            <DialogDescription>
              Bạn có những thay đổi chưa được lưu. Bạn có chắc chắn muốn hủy
              không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCancelConfirm(false)}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setShowCancelConfirm(false);
                onOpenChange(false);
              }}
            >
              Hủy thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
