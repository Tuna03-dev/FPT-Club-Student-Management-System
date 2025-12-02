import type React from "react";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Upload,
  X,
  Clock,
  FileText,
  Search,
  Check,
} from "lucide-react";
import { getAllClubs, type ClubDto } from "@/service/EventService";
import { getEventsWithoutReportRequirement } from "@/services/reportService";
import { type EventWithoutReportRequirementDto } from "@/types/dto/reportRequirement.dto";
import { toast } from "sonner";
type ReportType = "periodic" | "post-event" | "other";

interface ReportSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: SubmissionFormData) => void;
  isLoading?: boolean;
}

export interface SubmissionFormData {
  title: string;
  type: ReportType;
  dueDate: string;
  content: string;
  selectedEventId?: number;
  selectedClubIds?: number[];
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    file?: File; // Store actual File object for upload
  }>;
  saveAsDraft?: boolean;
}

const REPORT_TYPES = [
  { value: "periodic", label: "Báo cáo định kỳ" },
  { value: "post-event", label: "Báo cáo hậu sự kiện" },
  { value: "other", label: "Loại báo cáo khác" },
];

const REPORT_TEMPLATES: Record<
  ReportType,
  {
    label: string;
    description: string;
    placeholder: string;
    requiredFields: string[];
  }
> = {
  periodic: {
    label: "Báo cáo định kỳ",
    description: "Báo cáo hoạt động hàng tháng/quý/năm",
    placeholder: `Nhập nội dung báo cáo định kỳ:

1. Tóm tắt hoạt động chính
2. Số liệu thống kê
3. Kết quả đạt được
4. Các vấn đề phát sinh
5. Kế hoạch tháng/quý/năm tiếp theo`,
    requiredFields: [
      "Hoạt động chính",
      "Số liệu thống kê",
      "Kế hoạch tiếp theo",
    ],
  },
  "post-event": {
    label: "Báo cáo hậu sự kiện",
    description: "Báo cáo chi tiết sau khi kết thúc sự kiện",
    placeholder: `Nhập nội dung báo cáo hậu sự kiện:

1. Tên sự kiện
2. Thời gian và địa điểm
3. Số lượng tham dự
4. Nội dung chương trình
5. Đánh giá chung
6. Phản hồi từ người tham dự
7. Kiến nghị cải thiện`,
    requiredFields: ["Số lượng tham dự", "Đánh giá chung", "Phản hồi"],
  },
  other: {
    label: "Loại báo cáo khác",
    description: "Báo cáo đặc biệt hoặc yêu cầu riêng",
    placeholder: `Nhập nội dung báo cáo:

1. Mục đích báo cáo
2. Nội dung chi tiết
3. Kết quả mong muốn
4. Các thông tin bổ sung`,
    requiredFields: ["Mục đích báo cáo", "Nội dung chi tiết"],
  },
};

export function ReportSubmissionModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: ReportSubmissionModalProps) {
  const [formData, setFormData] = useState<SubmissionFormData>({
    title: "",
    type: "periodic",
    dueDate: "",
    content: "",
    attachments: [],
    saveAsDraft: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ id: string; name: string; size: number; type: string; file?: File }>
  >([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Events and clubs data
  const [events, setEvents] = useState<EventWithoutReportRequirementDto[]>([]);
  const [clubs, setClubs] = useState<ClubDto[]>([]);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [clubSearchQuery, setClubSearchQuery] = useState("");
  const [selectedClubIdForEvent, setSelectedClubIdForEvent] = useState<
    number | "all"
  >("all");
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(false);

  const template = REPORT_TEMPLATES[formData.type];

  // Fetch events when type is post-event
  useEffect(() => {
    if (formData.type === "post-event" && open) {
      setLoadingEvents(true);
      getEventsWithoutReportRequirement()
        .then((data) => {
          setEvents(data || []);
        })
        .catch((error) => {
          console.error("Error fetching events:", error);
          setEvents([]);
        })
        .finally(() => {
          setLoadingEvents(false);
        });
    }
  }, [formData.type, open]);

  // Fetch clubs when type is post-event (for filtering events)
  useEffect(() => {
    if (formData.type === "post-event" && open) {
      setLoadingClubs(true);
      getAllClubs()
        .then((data) => {
          setClubs(data || []);
        })
        .catch((error) => {
          console.error("Error fetching clubs:", error);
          setClubs([]);
        })
        .finally(() => {
          setLoadingClubs(false);
        });
    }
  }, [formData.type, open]);

  // Fetch clubs when type is other
  useEffect(() => {
    if (formData.type === "other" && open) {
      setLoadingClubs(true);
      getAllClubs()
        .then((data) => {
          setClubs(data || []);
        })
        .catch((error) => {
          console.error("Error fetching clubs:", error);
          setClubs([]);
        })
        .finally(() => {
          setLoadingClubs(false);
        });
    }
  }, [formData.type, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Tiêu đề báo cáo không được để trống";
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Vui lòng chọn ngày hạn chót";
    }
    // If dueDate includes time (datetime-local), ensure it's not in the past
    if (formData.dueDate) {
      try {
        const selected = new Date(formData.dueDate);
        if (selected < new Date()) {
          newErrors.dueDate = "Không được chọn thời gian trong quá khứ";
        }
      } catch {
        // ignore parse errors, existing error will cover empty/invalid values
      }
    }
    if (!formData.content.trim()) {
      newErrors.content = "Nội dung báo cáo không được để trống";
    }

    if (formData.type === "post-event" && !formData.selectedEventId) {
      newErrors.selectedEventId = "Vui lòng chọn một sự kiện";
    }

    if (
      formData.type === "other" &&
      (!formData.selectedClubIds || formData.selectedClubIds.length === 0)
    ) {
      newErrors.selectedClubIds = "Vui lòng chọn ít nhất một câu lạc bộ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 20 * 1024 * 1024; // 20MB for zip files

    // Only allow one file
    if (files.length > 1) {
      toast.error("Chỉ được phép tải lên một tệp");
      e.target.value = "";
      return;
    }

    const file = files[0];
    if (!file) return;

    // Only check for maximum size (20MB)
    if (file.size > maxSize) {
      toast.error(`File ${file.name} vượt quá kích thước tối đa 20MB`);
      e.target.value = "";
      return;
    }

    const newFile = {
      id: `file-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file, // Store actual File object
    };

    setAttachedFiles([newFile]);
    setFormData((prev) => ({
      ...prev,
      attachments: [newFile],
    }));

    // Reset input
    e.target.value = "";
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
    setFormData((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((f) => f.id !== fileId),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Show confirmation dialog instead of submitting directly
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    onSubmit(formData);
  };

  const handleCancelClick = () => {
    // Check if form has any data entered
    const hasData =
      formData.title.trim() ||
      formData.content.trim() ||
      formData.dueDate ||
      attachedFiles.length > 0;

    if (hasData) {
      // Show confirmation dialog if form has data
      setShowCancelConfirm(true);
    } else {
      // Close directly if form is empty
      onOpenChange(false);
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onOpenChange(false);
  };

  const filteredEvents = events.filter((event) => {
    // Filter by club if selected
    const matchesClub =
      selectedClubIdForEvent === "all" ||
      event.clubId === selectedClubIdForEvent;

    // Filter by search query
    const matchesSearch =
      event.eventTitle.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
      event.clubName.toLowerCase().includes(eventSearchQuery.toLowerCase());

    return matchesClub && matchesSearch;
  });

  const filteredClubs = clubs.filter((club) =>
    club.clubName.toLowerCase().includes(clubSearchQuery.toLowerCase())
  );

  const toggleClubSelection = (clubId: number) => {
    setFormData((prev) => {
      const currentIds = prev.selectedClubIds || [];
      const newIds = currentIds.includes(clubId)
        ? currentIds.filter((id) => id !== clubId)
        : [...currentIds, clubId];
      return {
        ...prev,
        selectedClubIds: newIds,
      };
    });
    if (errors.selectedClubIds) {
      setErrors({ ...errors, selectedClubIds: "" });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Get current local datetime in format suitable for `datetime-local` input
  const getCurrentDateTimeLocal = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: "",
        type: "periodic",
        dueDate: "",
        content: "",
        attachments: [],
        saveAsDraft: false,
      });
      setAttachedFiles([]);
      setErrors({});
      setEventSearchQuery("");
      setClubSearchQuery("");
      setSelectedClubIdForEvent("all");
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[calc(100%-2rem)] sm:!max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-background border-b z-10">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-2xl">
                Yêu cầu nộp báo cáo mới
              </DialogTitle>
              <DialogDescription>
                Tạo báo cáo định kỳ hoặc báo cáo sau sự kiện cho nhà trường
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 pt-0">
            {/* Report Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="reportType" className="text-base font-semibold">
                Loại báo cáo <span className="text-red-500">*</span>
              </Label>
              <select
                id="reportType"
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as ReportType;
                  setFormData({
                    ...formData,
                    type: newType,
                    selectedEventId: undefined,
                    selectedClubIds: undefined,
                  });
                }}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notice for periodic report */}
            {formData.type === "periodic" && (
              <p className="text-sm text-blue-800">
                ℹ️ Yêu cầu sẽ được gửi đến tất cả câu lạc bộ
              </p>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Thông tin cơ bản
              </h3>

              <div className="space-y-2">
                <Label htmlFor="title">
                  Tiêu đề báo cáo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="VD: Báo cáo hoạt động tháng 11/2024"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: "" });
                  }}
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">
                  Ngày hạn chót <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, dueDate: value });
                    try {
                      const selected = new Date(value);
                      if (selected < new Date()) {
                        setErrors({
                          ...errors,
                          dueDate: "Không được chọn thời gian trong quá khứ",
                        });
                        toast.error("Không được chọn thời gian trong quá khứ");
                      } else if (errors.dueDate) {
                        setErrors({ ...errors, dueDate: "" });
                      }
                    } catch {
                      if (errors.dueDate) setErrors({ ...errors, dueDate: "" });
                    }
                  }}
                  className={errors.dueDate ? "border-red-500" : ""}
                  min={getCurrentDateTimeLocal()}
                />
                {errors.dueDate && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.dueDate}
                  </p>
                )}
              </div>
            </div>

            {/* Event Selection for post-event */}
            {formData.type === "post-event" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">Chọn sự kiện</h3>
                <div className="space-y-2">
                  {formData.selectedEventId ? (
                    // Show selected event
                    <div className="border rounded-md p-3 bg-secondary/50">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          {events.find(
                            (e) => e.eventId === formData.selectedEventId
                          )?.eventTitle || "Sự kiện đã chọn"}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              selectedEventId: undefined,
                            });
                            setEventSearchQuery("");
                            setSelectedClubIdForEvent("all");
                          }}
                          className="h-8 text-xs"
                        >
                          Thay đổi
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Show event list
                    <>
                      {/* Club Filter Dropdown */}
                      <div className="space-y-1">
                        <Label className="text-sm">Lọc theo câu lạc bộ</Label>
                        <Select
                          value={
                            selectedClubIdForEvent === "all"
                              ? "all"
                              : selectedClubIdForEvent.toString()
                          }
                          onValueChange={(value) => {
                            setSelectedClubIdForEvent(
                              value === "all" ? "all" : parseInt(value)
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tất cả câu lạc bộ" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              Tất cả câu lạc bộ
                            </SelectItem>
                            {clubs.map((club) => (
                              <SelectItem
                                key={club.id}
                                value={club.id.toString()}
                              >
                                {club.clubName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Event Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Tìm kiếm sự kiện..."
                          value={eventSearchQuery}
                          onChange={(e) => setEventSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {loadingEvents ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          Đang tải...
                        </div>
                      ) : filteredEvents.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          Không tìm thấy sự kiện nào
                        </div>
                      ) : (
                        <div className="border rounded-md max-h-60 overflow-y-auto">
                          {filteredEvents.map((event) => (
                            <div
                              key={event.eventId}
                              className="p-3 cursor-pointer hover:bg-secondary transition-colors border-b last:border-b-0"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  selectedEventId: event.eventId,
                                });
                                if (errors.selectedEventId) {
                                  setErrors({ ...errors, selectedEventId: "" });
                                }
                              }}
                            >
                              <p className="font-medium text-sm">
                                {event.eventTitle}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.clubName}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {errors.selectedEventId && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.selectedEventId}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Club Selection for other */}
            {formData.type === "other" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-base">
                  Chọn câu lạc bộ <span className="text-red-500">*</span>
                </h3>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm câu lạc bộ..."
                      value={clubSearchQuery}
                      onChange={(e) => setClubSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {loadingClubs ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Đang tải...
                    </div>
                  ) : filteredClubs.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Không tìm thấy câu lạc bộ nào
                    </div>
                  ) : (
                    <div className="border rounded-md max-h-60 overflow-y-auto">
                      {filteredClubs.map((club) => {
                        const isSelected =
                          formData.selectedClubIds?.includes(club.id) || false;
                        return (
                          <div
                            key={club.id}
                            className={`p-3 cursor-pointer hover:bg-secondary transition-colors border-b last:border-b-0 ${
                              isSelected ? "bg-primary/10 border-primary" : ""
                            }`}
                            onClick={() => toggleClubSelection(club.id)}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">
                                {club.clubName}
                              </p>
                              {isSelected && (
                                <Check className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {formData.selectedClubIds &&
                    formData.selectedClubIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Đã chọn {formData.selectedClubIds.length} câu lạc bộ
                      </p>
                    )}
                  {errors.selectedClubIds && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.selectedClubIds}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Content Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Nội dung báo cáo
              </h3>

              <div className="space-y-2">
                <Label htmlFor="content">
                  Thông tin cần cung cấp <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="content"
                  placeholder={template.placeholder}
                  value={formData.content}
                  onChange={(e) => {
                    setFormData({ ...formData, content: e.target.value });
                    if (errors.content) setErrors({ ...errors, content: "" });
                  }}
                  rows={8}
                  className={`resize-none ${
                    errors.content ? "border-red-500" : ""
                  }`}
                />
                {errors.content && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.content}
                  </p>
                )}
              </div>
            </div>

            {/* File Attachments */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base flex items-center gap-2">
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
                        Chỉ một tệp hoặc một tệp zip (tối đa 20MB)
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Tệp đã đính kèm ({attachedFiles.length})
                  </p>
                  <div className="space-y-2">
                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between bg-muted/50 p-3 rounded-md"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
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
                          onClick={() => removeFile(file.id)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t sticky bottom-0 bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelClick}
                disabled={isLoading}
                className="bg-transparent"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? "Đang gửi..." : "Gửi yêu cầu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận gửi yêu cầu</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn gửi yêu cầu nộp báo cáo này không?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-sm font-medium">Thông tin yêu cầu:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Tiêu đề: {formData.title || "Chưa có"}</li>
                <li>
                  • Loại báo cáo:{" "}
                  {REPORT_TYPES.find((t) => t.value === formData.type)?.label}
                </li>
                <li>
                  • Ngày hạn chót:{" "}
                  {formData.dueDate
                    ? new Date(formData.dueDate).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "Chưa có"}
                </li>
                {formData.type === "post-event" && formData.selectedEventId && (
                  <li>
                    • Sự kiện:{" "}
                    {
                      events.find((e) => e.eventId === formData.selectedEventId)
                        ?.eventTitle
                    }
                  </li>
                )}
                {formData.type === "other" && formData.selectedClubIds && (
                  <li>• Số CLB: {formData.selectedClubIds.length}</li>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitConfirm(false)}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? "Đang gửi..." : "Xác nhận gửi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận hủy</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy tạo yêu cầu nộp báo cáo không?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Lưu ý: Tất cả thông tin đã nhập sẽ bị mất và không thể khôi
                phục.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelConfirm(false)}
            >
              Quay lại
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
