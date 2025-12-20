"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Calendar,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Eye,
  ClipboardList,
  Download,
} from "lucide-react";
import { formatDateTimeVN } from "@/lib/dateUtils";
import { Textarea } from "@/components/ui/textarea";
import {
  reviewReportByStaff,
  type ReviewReportByStaffRequest,
} from "@/services/reportService";
import { toast } from "sonner";

type ReportStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "resubmitted"
  | "not-submitted";

interface Club {
  id: string;
  name: string;
  code: string;
}

interface Report {
  id: string;
  title: string;
  type: "periodic" | "post-event" | "other";
  status: ReportStatus;
  submittedBy: string;
  department: string;
  createdAt: string;
  dueDate: string;
  content: string;
  reviewer?: string;
  reviewDate?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  clubId?: string;
  fileUrl?: string;
  reportRequirement?: {
    id: number;
    title: string;
    description?: string;
    dueDate: string;
    reportType?: string;
    templateUrl?: string;
    createdBy?: {
      fullName: string;
      email: string;
    };
  };
}

interface ClubReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  club: Club;
  report: Report;
  onApprove?: (feedback: string) => void;
  onReject?: (feedback: string) => void;
}

const statusConfig: Record<
  ReportStatus,
  { label: string; color: string; icon: any }
> = {
  draft: {
    label: "Bản nháp",
    color: "bg-gray-100 text-gray-700",
    icon: null,
  },
  submitted: {
    label: "Chờ phê duyệt",
    color: "bg-blue-100 text-blue-700",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  resubmitted: {
    label: "Đã nộp lại",
    color: "bg-yellow-100 text-yellow-700",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  approved: {
    label: "Đã phê duyệt",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  rejected: {
    label: "Bị từ chối",
    color: "bg-red-100 text-red-700",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  "not-submitted": {
    label: "Chưa nộp",
    color: "bg-red-100 text-red-700",
    icon: null,
  },
};

export function ClubReportModal({
  open,
  onOpenChange,
  club,
  report,
  onApprove,
  onReject,
}: ClubReportModalProps) {
  const status = statusConfig[report.status];
  const [showFeedback, setShowFeedback] = useState<"approve" | "reject" | null>(
    null
  );
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handler functions for approval/rejection
  const handleApprove = async () => {
    if (!feedback.trim()) {
      toast.error("Vui lòng nhập phản hồi");
      return;
    }
    setIsSubmitting(true);
    try {
      const request: ReviewReportByStaffRequest = {
        reportId: parseInt(report.id),
        status: "APPROVED_UNIVERSITY",
        reviewerFeedback: feedback.trim(),
      };
      await reviewReportByStaff(request);
      toast.success("Báo cáo đã được chấp nhận");
      onApprove?.(feedback);
      setShowFeedback(null);
      setFeedback("");
      onOpenChange(false); // Close modal after successful review
    } catch (error: any) {
      console.error("Error approving report:", error);

      // Extract error message from BE response
      let errorMessage = "Không thể chấp nhận báo cáo";

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

  const handleReject = async () => {
    if (!feedback.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    setIsSubmitting(true);
    try {
      const request: ReviewReportByStaffRequest = {
        reportId: parseInt(report.id),
        status: "REJECTED_UNIVERSITY",
        reviewerFeedback: feedback.trim(),
      };
      await reviewReportByStaff(request);
      toast.success("Báo cáo đã bị từ chối");
      onReject?.(feedback);
      setShowFeedback(null);
      setFeedback("");
      onOpenChange(false); // Close modal after successful review
    } catch (error: any) {
      console.error("Error rejecting report:", error);

      // Extract error message from BE response
      let errorMessage = "Không thể từ chối báo cáo";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl max-h-[95vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <div className="flex items-start gap-4 pb-4 border-b">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="font-semibold text-sm">{club.code}</span>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{club.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {report.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Requirement Info */}
          {report.reportRequirement && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <ClipboardList className="h-3.5 w-3.5" />
                Thông tin yêu cầu báo cáo
              </h4>
              <Card className="bg-blue-50/50 border-blue-200">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground mb-0.5">Tiêu đề</p>
                        <p className="font-medium text-foreground truncate">
                          {report.reportRequirement.title}
                        </p>
                      </div>
                      {report.reportRequirement.reportType && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">
                            Loại báo cáo
                          </p>
                          <p className="font-medium text-foreground">
                            {report.reportRequirement.reportType === "SEMESTER"
                              ? "Báo cáo Định kỳ"
                              : report.reportRequirement.reportType === "EVENT"
                                ? "Báo cáo Sau sự kiện"
                                : "Loại khác"}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground mb-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Hạn nộp
                        </p>
                        <p className="font-medium text-foreground">
                          {formatDateTimeVN(report.reportRequirement.dueDate)}
                        </p>
                      </div>
                      {report.reportRequirement.createdBy && (
                        <div>
                          <p className="text-muted-foreground mb-0.5">
                            Người tạo
                          </p>
                          <p className="font-medium text-foreground truncate">
                            {report.reportRequirement.createdBy.fullName}
                          </p>
                        </div>
                      )}
                    </div>
                    {report.reportRequirement.description && (
                      <div className="pt-1 border-t">
                        <p className="text-muted-foreground mb-0.5 text-xs">
                          Mô tả
                        </p>
                        <p className="text-xs text-foreground line-clamp-2">
                          {report.reportRequirement.description}
                        </p>
                      </div>
                    )}
                    {report.reportRequirement.templateUrl && (
                      <div className="pt-1 border-t">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-foreground truncate flex-1">
                            {report.reportRequirement.templateUrl
                              .split("/")
                              .pop() || "Template file"}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(
                                report.reportRequirement!.templateUrl,
                                "_blank"
                              )
                            }
                            className="h-6 px-2 flex-shrink-0"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Status and Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge className={`${status.color}`}>
                {status.icon && <span className="mr-1">{status.icon}</span>}
                {status.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Người nộp</p>
                <p className="font-medium">{report.submittedBy}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Câu lạc bộ</p>
                <p className="font-medium">{report.department}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Ngày tạo
                </p>
                <p className="font-medium">{report.createdAt}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Hạn chót
                </p>
                <p className="font-medium">{report.dueDate}</p>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Nội dung báo cáo
            </h4>
            <Card>
              <CardContent className="p-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  {report.content ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {report.content}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Không có nội dung văn bản
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* File Attachment */}
          {report.fileUrl && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Tệp đính kèm
              </h4>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Tệp báo cáo
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {report.fileUrl.split("/").pop() || "Tệp đính kèm"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(report.fileUrl, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Xem
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Report Review */}
          {report.reviewer && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Thông tin đánh giá
              </h4>
              <Card
                className={
                  report.status === "approved"
                    ? "border-green-200 bg-green-50/50"
                    : "border-red-200 bg-red-50/50"
                }
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">
                        Ngày đánh giá
                      </p>
                      <p className="font-medium">{report.reviewDate}</p>
                    </div>
                  </div>

                  {report.approvalNotes && (
                    <div>
                      <p className="text-muted-foreground mb-2">Phản hồi</p>
                      <div className="bg-white rounded p-3 border text-sm">
                        {report.approvalNotes}
                      </div>
                    </div>
                  )}

                  {report.rejectionReason && (
                    <div>
                      <p className="text-muted-foreground mb-2">
                        Lý do từ chối
                      </p>
                      <div className="bg-white rounded p-3 border border-red-200 text-sm text-red-700">
                        {report.rejectionReason}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Feedback Section */}
          {showFeedback && (
            <div className="space-y-4 p-4 bg-secondary rounded-lg border">
              <div>
                <h4 className="font-semibold mb-2">
                  {showFeedback === "approve"
                    ? "Ghi chú phê duyệt"
                    : "Lý do từ chối"}
                </h4>
                <Textarea
                  placeholder={
                    showFeedback === "approve"
                      ? "Nhập phần ghi chú hoặc ý kiến phê duyệt..."
                      : "Nhập lý do từ chối báo cáo..."
                  }
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFeedback(null);
                    setFeedback("");
                  }}
                >
                  Hủy
                </Button>
                <Button
                  onClick={
                    showFeedback === "approve" ? handleApprove : handleReject
                  }
                  disabled={isSubmitting || !feedback.trim()}
                  className={
                    showFeedback === "approve"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }
                >
                  {isSubmitting
                    ? "Đang xử lý..."
                    : showFeedback === "approve"
                      ? "Chấp nhận"
                      : "Từ chối"}
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!showFeedback &&
            (report.status === "submitted" ||
              report.status === "resubmitted") && (
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  onClick={() => setShowFeedback("reject")}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Từ chối
                </Button>
                <Button
                  onClick={() => setShowFeedback("approve")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Chấp nhận
                </Button>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
