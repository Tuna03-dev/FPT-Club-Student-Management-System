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
  Download,
  Share2,
  MessageSquare,
  Calendar,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  FileText,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type ReportStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "needs-review"
  | "not-submitted";

interface Club {
  id: string;
  name: string;
  code: string;
  avatar: string;
  description: string;
}

interface Report {
  id: string;
  title: string;
  type: "periodic" | "post-event" | "other";
  status: ReportStatus;
  submittedBy: string;
  submittedByAvatar: string;
  department: string;
  createdAt: string;
  dueDate: string;
  content: string;
  score?: number;
  reviewer?: string;
  reviewDate?: string;
  notes?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  clubId?: string;
  fileUrl?: string;
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
    icon: null 
  },
  submitted: {
    label: "Đã nộp",
    color: "bg-blue-100 text-blue-700",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  "needs-review": {
    label: "Cần xem xét",
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
      alert("Vui lòng nhập phản hồi");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      onApprove?.(feedback);
      setIsSubmitting(false);
      setShowFeedback(null);
      setFeedback("");
    }, 500);
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      onReject?.(feedback);
      setIsSubmitting(false);
      setShowFeedback(null);
      setFeedback("");
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                <p className="text-muted-foreground mb-1">Bộ phận</p>
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
                <Download className="h-4 w-4" />
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
                      <Download className="h-4 w-4 mr-2" />
                      Tải xuống
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
                        Người đánh giá
                      </p>
                      <p className="font-medium">{report.reviewer}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">
                        Ngày đánh giá
                      </p>
                      <p className="font-medium">{report.reviewDate}</p>
                    </div>
                  </div>

                  {report.score !== undefined && (
                    <div>
                      <p className="text-muted-foreground mb-2">Điểm số</p>
                      <div className="flex items-end gap-2">
                        <div className="text-3xl font-bold text-primary">
                          {report.score}
                        </div>
                        <div className="text-muted-foreground">/100</div>
                      </div>
                    </div>
                  )}

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
              report.status === "needs-review") && (
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Tải xuống
                </Button>
                <Button variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Chia sẻ
                </Button>
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

          {/* Additional Actions */}
          {!showFeedback && !report.reviewer && (
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Tải xuống
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Chia sẻ
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
