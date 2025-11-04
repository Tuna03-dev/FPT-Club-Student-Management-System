import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  ReportSubmissionModal,
  type SubmissionFormData,
} from "@/components/features/report/ReportSubmissionModal";
import { ReportReviewForm } from "@/components/features/report/ReportReviewForm";
import { Input } from "@/components/ui/input";

type ReportType = "periodic" | "post-event" | "other";
type ReportStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "needs-review";

interface Report {
  id: string;
  title: string;
  type: ReportType;
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
}


const mockReports: Report[] = [
  {
    id: "req-1",
    title: "Báo cáo hoạt động tháng 11/2024",
    type: "periodic",
    status: "submitted",
    submittedBy: "Lê Văn C",
    submittedByAvatar: "/male-user-avatar.png",
    department: "Phòng Sự vụ",
    createdAt: "2024-10-25",
    dueDate: "2024-11-15",
    content: "Báo cáo chi tiết các hoạt động...",
  },
  {
    id: "req-2",
    title: "Báo cáo hội thảo 'Tương lai công nghệ'",
    type: "post-event",
    status: "approved",
    submittedBy: "Lê Văn C",
    submittedByAvatar: "/male-user-avatar.png",
    department: "Phòng Sự vụ",
    createdAt: "2024-10-25",
    dueDate: "2024-10-27",
    content:
      "Báo cáo tổng kết hội thảo công nghệ: Sự kiện diễn ra thành công với 150 khách mời tham dự. Các bài thuyết trình từ các chuyên gia hàng đầu về AI, Machine Learning và Blockchain đã nhận được phản hồi tích cực từ đối tượng khán giả. Kết quả bình chọn cho thấy mức độ hài lòng cao (4.8/5 sao). Chúng tôi sẽ tiếp tục tổ chức những sự kiện tương tự trong tương lai.",
    score: 95,
    reviewer: "Trần Thị B",
    reviewDate: "2024-10-30",
  },
  {
    id: "req-3",
    title: "Báo cáo hoạt động tháng 10/2024",
    type: "periodic",
    status: "needs-review",
    submittedBy: "Phạm Thị D",
    submittedByAvatar: "/diverse-user-avatars.png",
    department: "CLB Kỹ năng mềm",
    createdAt: "2024-10-20",
    dueDate: "2024-10-31",
    content: "Báo cáo các hoạt động giao lưu...",
  },
  {
    id: "req-4",
    title: "Báo cáo kỳ thi học kỳ I",
    type: "post-event",
    status: "rejected",
    submittedBy: "Hoàng Văn E",
    submittedByAvatar: "/male-user-avatar.png",
    department: "Phòng Đào tạo",
    createdAt: "2024-10-15",
    dueDate: "2024-10-20",
    content:
      "Báo cáo kết quả kỳ thi: Kỳ thi diễn ra từ ngày 15-20/10/2024 với 5000 thí sinh tham gia. Tỷ lệ đỗ đạt 85%, tỷ lệ trượt 15%. Phân bố điểm: 45% thí sinh đạt điểm A, 35% điểm B, 20% điểm C. Cần cải thiện chất lượng câu hỏi thi.",
    reviewer: "Đặng Thị F",
    reviewDate: "2024-10-22",
    rejectionReason: "Báo cáo thiếu thông tin chi tiết về phân loại kết quả",
  },
  {
    id: "req-5",
    title: "Báo cáo tổng kết năm học",
    type: "other",
    status: "submitted",
    submittedBy: "Nguyễn Văn G",
    submittedByAvatar: "/male-user-avatar.png",
    department: "Phòng Giáo dục",
    createdAt: "2024-11-01",
    dueDate: "2024-11-30",
    content:
      "Báo cáo tổng kết năm học 2023-2024: Năm học vừa qua là một năm thành công với nhiều thành tích đáng tự hào. Tổng số sinh viên: 5000, tỷ lệ tốt nghiệp: 95%, số sinh viên xuất sắc: 250. Các hoạt động ngoại khóa đã được tổ chức 50 buổi với tham dự của hơn 10000 lượt sinh viên.",
  },
];

export function StaffReportManagement() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isReportContentModalOpen, setIsReportContentModalOpen] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<ReportType>("periodic");

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || report.status === filterStatus;
    const matchesType = report.type === activeTab;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleDeleteReport = (reportId: string) => {
    setReports(reports.filter((r) => r.id !== reportId));
  };

  const handleSubmitReport = (formData: SubmissionFormData) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const newReport: Report = {
        id: Math.random().toString(36).substr(2, 9),
        title: formData.title,
        type: formData.type,
        status: formData.saveAsDraft ? "draft" : "submitted",
        submittedBy: "Người dùng hiện tại",
        submittedByAvatar: "/female-user-avatar.png",
        department: "Phòng Sự vụ", // Default department
        createdAt: new Date().toISOString().split("T")[0],
        dueDate: formData.dueDate,
        content: formData.content,
      };
      setReports([newReport, ...reports]);
      setIsSubmitting(false);
      setIsSubmitDialogOpen(false);
      alert(
        formData.saveAsDraft
          ? "Báo cáo đã được lưu thành bản nháp"
          : "Báo cáo đã được nộp thành công"
      );
    }, 800);
  };

  const handleApproveReport = (
    reportId: string,
    feedback: string,
    approve: boolean
  ) => {
    setReports(
      reports.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: approve ? "approved" : "rejected",
              reviewer: "Người đánh giá hiện tại",
              reviewDate: new Date().toISOString().split("T")[0],
              approvalNotes: approve ? feedback : undefined,
              rejectionReason: !approve ? feedback : undefined,
            }
          : r
      )
    );
    alert(approve ? "Báo cáo đã được chấp nhận" : "Báo cáo đã bị từ chối");
  };

  const getStatusConfig = (status: ReportStatus) => {
    const config = {
      draft: {
        icon: <Clock className="h-4 w-4" />,
        label: "Sự kiện",
        color: "bg-gray-100 text-gray-700",
      },
      submitted: {
        icon: <Clock className="h-4 w-4" />,
        label: "Phòng Sự vụ",
        color: "bg-blue-100 text-blue-700",
      },
      "needs-review": {
        icon: <AlertCircle className="h-4 w-4" />,
        label: "Cần xem xét",
        color: "bg-yellow-100 text-yellow-700",
      },
      approved: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        label: "Đã nộp",
        color: "bg-green-100 text-green-700",
      },
      rejected: {
        icon: <AlertCircle className="h-4 w-4" />,
        label: "Bị từ chối",
        color: "bg-red-100 text-red-700",
      },
    };
    return config[status];
  };

  const handlePeriodicReportView = (report: Report) => {
    navigate(`/staff/report/${report.id}/clubs`);
  };

  const handleReportContentView = (report: Report) => {
    setSelectedReport(report);
    setIsReportContentModalOpen(true);
  };


  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Quản lý yêu cầu báo cáo</h1>
            <p className="text-muted-foreground mt-1">
              Hiển thị 1 yêu cầu trên 1
            </p>
          </div>
          <Button
            onClick={() => setIsSubmitDialogOpen(true)}
            className="bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tạo yêu cầu mới
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border overflow-x-auto">
          {[
            { id: "periodic", label: "Báo cáo Định kỳ" },
            { id: "post-event", label: "Báo cáo Sau sự kiện" },
            { id: "other", label: "Loại báo cáo khác" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportType)}
              className={`px-4 py-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2 items-center">
          <div className="flex items-center bg-secondary rounded-lg px-4 py-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground mr-3" />
            <Input
              placeholder="Tìm kiếm theo tiêu đề, người nộp, bộ phận..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 flex-1"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as ReportStatus | "all")
            }
            className="px-3 py-2 rounded-lg bg-secondary text-foreground text-sm whitespace-nowrap"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Sự kiện</option>
            <option value="submitted">Phòng Sự vụ</option>
            <option value="needs-review">Cần xem xét</option>
            <option value="approved">Đã nộp</option>
            <option value="rejected">Bị từ chối</option>
          </select>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hiển thị {filteredReports.length} báo cáo
          </p>

          {filteredReports.length > 0 ? (
            <div className="space-y-3">
              {filteredReports.map((report) => {
                const statusConfig = getStatusConfig(report.status);
                return (
                  <Card
                    key={report.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="py-2.5 px-3 md:py-3 md:px-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-2.5">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                          <span className="text-xs font-semibold">
                            {report.submittedBy.charAt(0)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-0.5">
                            <h3 className="font-semibold text-base text-foreground truncate">
                              {report.title}
                            </h3>
                          </div>

                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">
                                {report.submittedBy}
                              </span>
                            </span>
                            <span>Tạo: {report.createdAt}</span>
                            <span>Hạn: {report.dueDate}</span>
                          </div>

                          {/* Status and Actions - Mobile: below content, left aligned */}
                          <div className="flex flex-row items-center gap-2 mt-2 md:hidden">
                            <div
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusConfig.color}`}
                            >
                              {statusConfig.icon}
                              <span>{statusConfig.label}</span>
                            </div>

                            <div className="flex gap-2">
                              {report.type === "periodic" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePeriodicReportView(report)}
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>Xem</span>
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleReportContentView(report)
                                    }
                                    className="gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span>Xem</span>
                                  </Button>
                                  {report.status === "submitted" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedReport(report);
                                        setIsReviewDialogOpen(true);
                                      }}
                                    >
                                      <span>Đánh giá</span>
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status and Actions - Desktop: right aligned */}
                        <div className="hidden md:flex flex-row items-center gap-2 ml-auto">
                          <div
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${statusConfig.color}`}
                          >
                            {statusConfig.icon}
                            <span>{statusConfig.label}</span>
                          </div>

                          <div className="flex gap-2">
                            {report.type === "periodic" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePeriodicReportView(report)}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                <span>Xem</span>
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleReportContentView(report)
                                  }
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>Xem</span>
                                </Button>
                                {report.status === "submitted" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedReport(report);
                                      setIsReviewDialogOpen(true);
                                    }}
                                  >
                                    <span>Đánh giá</span>
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Không tìm thấy báo cáo nào phù hợp với tìm kiếm của bạn
              </CardContent>
            </Card>
          )}
        </div>

        {/* Submission Modal */}
        <ReportSubmissionModal
          open={isSubmitDialogOpen}
          onOpenChange={setIsSubmitDialogOpen}
          onSubmit={handleSubmitReport}
          isLoading={isSubmitting}
        />

        {selectedReport &&
          (selectedReport.type === "post-event" ||
            selectedReport.type === "other") && (
            <Dialog
              open={isReportContentModalOpen}
              onOpenChange={setIsReportContentModalOpen}
            >
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedReport.title}</DialogTitle>
                  <DialogDescription>
                    Nội dung báo cáo chi tiết
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Report Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Người nộp
                      </p>
                      <p className="font-semibold">
                        {selectedReport.submittedBy}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Bộ phận
                      </p>
                      <p className="font-semibold">
                        {selectedReport.department}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Ngày tạo
                      </p>
                      <p className="font-semibold">
                        {selectedReport.createdAt}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Hạn chót
                      </p>
                      <p className="font-semibold">{selectedReport.dueDate}</p>
                    </div>
                  </div>

                  {/* Status */}
                  {selectedReport.status !== "draft" && (
                    <div className="bg-secondary p-4 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Trạng thái
                      </p>
                      <div className="flex items-center justify-between">
                        <div
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            getStatusConfig(selectedReport.status).color
                          }`}
                        >
                          {getStatusConfig(selectedReport.status).icon}
                          <span>
                            {getStatusConfig(selectedReport.status).label}
                          </span>
                        </div>
                        {selectedReport.reviewer && (
                          <div className="text-sm text-muted-foreground">
                            Được đánh giá bởi:{" "}
                            <span className="font-semibold">
                              {selectedReport.reviewer}
                            </span>{" "}
                            ({selectedReport.reviewDate})
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Report Content */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Nội dung báo cáo</p>
                    <div className="bg-secondary p-4 rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedReport.content}
                      </p>
                    </div>
                  </div>

                  {/* Review Info */}
                  {selectedReport.status === "approved" && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold text-green-900">
                          Báo cáo đã được phê duyệt
                        </h4>
                      </div>
                      <p className="text-sm text-green-800">
                        Điểm: {selectedReport.score}/100
                      </p>
                      {selectedReport.approvalNotes && (
                        <div className="text-sm text-green-800">
                          <p className="font-medium">Nhận xét:</p>
                          <p>{selectedReport.approvalNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedReport.status === "rejected" && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <h4 className="font-semibold text-red-900">
                          Báo cáo bị từ chối
                        </h4>
                      </div>
                      {selectedReport.rejectionReason && (
                        <div className="text-sm text-red-800">
                          <p className="font-medium">Lý do từ chối:</p>
                          <p>{selectedReport.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsReportContentModalOpen(false)}
                    >
                      Đóng
                    </Button>
                    {selectedReport.status === "submitted" && (
                      <Button
                        onClick={() => {
                          setIsReportContentModalOpen(false);
                          setIsReviewDialogOpen(true);
                        }}
                      >
                        Đánh giá báo cáo
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

        {/* Review Dialog */}
        {selectedReport && (
          <Dialog
            open={isReviewDialogOpen}
            onOpenChange={setIsReviewDialogOpen}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Đánh giá báo cáo</DialogTitle>
                <DialogDescription>
                  Cung cấp phản hồi và xếp hạng cho báo cáo
                </DialogDescription>
              </DialogHeader>
              <ReportReviewForm
                report={selectedReport}
                onSubmit={(score, feedback, approve) => {
                  handleApproveReport(selectedReport.id, feedback, approve);
                }}
                isLoading={isSubmitting}
                onCancel={() => setIsReviewDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}

      </div>
    </div>
  );
}
