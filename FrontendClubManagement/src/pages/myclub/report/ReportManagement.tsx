"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  getClubReportRequirementsForOfficer, 
  getClubReportByRequirementForOfficer,
  createReport,
  updateReport,
  submitReport,
  type CreateReportRequest,
  type UpdateReportRequest,
  type SubmitReportRequest
} from "@/services/reportService";
import { mapBackendToFrontendReportType } from "@/types/dto/reportRequirement.dto";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Calendar,
  Users,
  CheckCheck,
  ExternalLink,
  Upload,
  X,
} from "lucide-react";

type ReportType = "periodic" | "post_event";
type SubmissionStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "submitted";

interface ReportRequest {
  request_id: string;
  request_type: ReportType;
  title: string;
  description: string;
  deadline: string;
  created_by: string;
  created_at: string;
  required_details: string[];
  templateUrl?: string;
  status?: string; // UNSUBMITTED, SUBMITTED, APPROVED, REJECTED, RESUBMITTED
}

interface ReportSubmission {
  submission_id: string;
  request_id: string;
  report_type: ReportType;
  title: string;
  period_month?: string;
  event_name?: string;
  created_by_name: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  status: SubmissionStatus;
  content: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  approval_notes?: string;
  approved_by?: string;
  rejection_reason?: string;
}

const reportTypeLabels: Record<ReportType, string> = {
  periodic: "Báo cáo định kỳ",
  post_event: "Báo cáo hậu sự kiện",
};

const reportTypeColors: Record<ReportType, string> = {
  periodic: "bg-blue-100 text-blue-700",
  post_event: "bg-purple-100 text-purple-700",
};

const statusLabels: Record<SubmissionStatus, string> = {
  draft: "Bản nháp",
  pending_approval: "Chờ phê duyệt",
  approved: "Đã phê duyệt",
  rejected: "Bị từ chối",
  submitted: "Đã nộp",
};

const statusColors: Record<SubmissionStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_approval: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  submitted: "bg-blue-100 text-blue-700",
};

// Status labels for ClubReportRequirementStatus
const requirementStatusLabels: Record<string, string> = {
  UNSUBMITTED: "Chưa nộp",
  SUBMITTED: "Đã nộp",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  RESUBMITTED: "Đã nộp lại",
};

const requirementStatusColors: Record<string, string> = {
  UNSUBMITTED: "bg-red-100 text-red-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  RESUBMITTED: "bg-blue-100 text-blue-700",
};

export function ClubReportManagement() {
  const params = useParams();
  const clubIdParam = params.clubId;
  const clubId = clubIdParam ? Number(clubIdParam) : undefined;

  const [activeTab, setActiveTab] = useState<
    "requests" | "submissions" | "approval"
  >("requests");
  const [selectedRequest, setSelectedRequest] = useState<ReportRequest | null>(
    null
  );
  const [selectedSubmission, setSelectedSubmission] =
    useState<ReportSubmission | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">(
    "all"
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftFileUrl, setDraftFileUrl] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [reportRequests, setReportRequests] = useState<ReportRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);

  // Fetch report requirements from API
  useEffect(() => {
    const fetchReportRequirements = async () => {
      if (!clubId) {
        setError("Club ID not found");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const requirements = await getClubReportRequirementsForOfficer(clubId);
        
        // Map API response to ReportRequest format
        const mappedRequests: ReportRequest[] = requirements.map((req) => {
          const clubRequirement = req.clubRequirements?.[0];
          const reportType = mapBackendToFrontendReportType(req.reportType);
          
          // Extract required details from description (split by newlines or bullet points)
          const requiredDetails = req.description
            ? req.description
                .split(/\r?\n|•|\u2022|-/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
            : [];

          const finalReportType: ReportType = reportType === "post-event" ? "post_event" : (reportType === "other" ? "periodic" : reportType);
          
          return {
            request_id: req.id.toString(),
            request_type: finalReportType,
            title: req.title,
            description: req.description || "",
            deadline: req.dueDate,
            created_by: req.createdBy?.fullName || "Phòng Quản lý Sinh viên",
            created_at: req.createdAt,
            required_details: requiredDetails.length > 0 
              ? requiredDetails 
              : ["Báo cáo chi tiết về hoạt động của câu lạc bộ"],
            templateUrl: req.templateUrl,
            status: clubRequirement?.status,
          };
        });

        setReportRequests(mappedRequests);
      } catch (err) {
        console.error("Error fetching report requirements:", err);
        const errorMessage = err instanceof Error ? err.message : "Không thể tải danh sách yêu cầu nộp báo cáo";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === "requests") {
      fetchReportRequirements();
    }
  }, [clubId, activeTab]);

  // Mock data for submissions (to be replaced later - currently using API data)
  // Commented out as we're using API data now
  /*
  const [mockReportRequests] = useState<ReportRequest[]>([
    {
      request_id: "1",
      request_type: "periodic",
      title: "Báo cáo hoạt động tháng 11/2024",
      description:
        "Nhà trường yêu cầu báo cáo tổng hợp hoạt động của câu lạc bộ trong tháng 11",
      deadline: "2024-11-30",
      created_by: "Phòng Quản lý Sinh viên",
      created_at: "2024-11-01T08:00:00Z",
      required_details: [
        "Số lượng hoạt động tổ chức",
        "Tổng số thành viên tham gia",
        "Các sự kiện chính",
        "Kết quả đạt được",
      ],
    },
    {
      request_id: "2",
      request_type: "post_event",
      title: "Báo cáo hậu sự kiện: Workshop React Advanced",
      description:
        "Báo cáo chi tiết về sự kiện workshop React Advanced vừa diễn ra",
      deadline: "2024-11-10",
      created_by: "Phòng Quản lý Sinh viên",
      created_at: "2024-10-28T14:00:00Z",
      required_details: [
        "Số lượng tham dự",
        "Đánh giá của sinh viên",
        "Nội dung được cải tiến",
        "Kiến nghị cho các sự kiện tiếp theo",
      ],
    },
    {
      request_id: "3",
      request_type: "periodic",
      title: "Báo cáo hoạt động tháng 10/2024",
      description: "Báo cáo hoạt động tháng 10 đã đến hạn nộp",
      deadline: "2024-10-31",
      created_by: "Phòng Quản lý Sinh viên",
      created_at: "2024-10-01T08:00:00Z",
      required_details: [
        "Tổng hợp hoạt động",
        "Danh sách sự kiện",
        "Số lượng thành viên",
        "Phản hồi từ thành viên",
      ],
    },
  ]);
  */

  const [reportSubmissions, setReportSubmissions] = useState<
    ReportSubmission[]
  >([
    {
      submission_id: "1",
      request_id: "2",
      report_type: "post_event",
      title: "Báo cáo hậu sự kiện: Workshop React Advanced",
      event_name: "Workshop React Advanced",
      created_by_name: "Trần Thị B",
      created_by_id: "102",
      created_at: "2024-10-28T09:15:00Z",
      updated_at: "2024-10-28T15:45:00Z",
      submitted_at: "2024-10-29T10:00:00Z",
      status: "approved",
      content:
        "Workshop React Advanced diễn ra vào ngày 28/10/2024 tại phòng A101.\n\nSố lượng: 80 sinh viên tham dự\nSpeaker: Đỗ Minh Hải (Senior Developer)\n\nFeedback:\n- Nội dung hay: 9/10\n- Chất lượng trình bày: 8.5/10\n- Đội ngũ tổ chức: 9/10",
      approval_notes: "Báo cáo đầy đủ và chất lượng",
      approved_by: "Phòng Quản lý Sinh viên",
    },
    {
      submission_id: "2",
      request_id: "3",
      report_type: "periodic",
      title: "Báo cáo hoạt động tháng 10/2024",
      period_month: "10/2024",
      created_by_name: "Nguyễn Văn A",
      created_by_id: "101",
      created_at: "2024-10-25T10:30:00Z",
      updated_at: "2024-10-25T10:30:00Z",
      submitted_at: "2024-10-30T14:20:00Z",
      status: "submitted",
      content:
        "Trong tháng 10/2024, câu lạc bộ đã tổ chức được 3 sự kiện chính:\n1. Workshop: Giới thiệu Machine Learning cơ bản\n2. Hội thảo: Careers in AI industry\n3. Networking event với các công ty công nghệ\n\nTổng cộng 150 thành viên tham gia các hoạt động.",
    },
  ]);

  // Extract unique semesters/periods from requests and submissions
  const availableSemesters = useMemo(() => {
    const semesters = new Set<string>();

    // From requests - extract from deadline
    reportRequests.forEach((request) => {
      const date = new Date(request.deadline);
      const semester = `${date.getMonth() + 1}/${date.getFullYear()}`;
      semesters.add(semester);
    });

    // From submissions - extract from period_month or created_at
    reportSubmissions.forEach((submission) => {
      if (submission.period_month) {
        semesters.add(submission.period_month);
      } else {
        const date = new Date(submission.created_at);
        const semester = `${date.getMonth() + 1}/${date.getFullYear()}`;
        semesters.add(semester);
      }
    });

    return Array.from(semesters).sort().reverse(); // Most recent first
  }, [reportRequests, reportSubmissions]);

  const filteredRequests = useMemo(() => {
    return reportRequests.filter((request) => {
      const matchesSearch =
        request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by semester
      if (semesterFilter !== "all") {
        const requestDate = new Date(request.deadline);
        const requestSemester = `${
          requestDate.getMonth() + 1
        }/${requestDate.getFullYear()}`;
        if (requestSemester !== semesterFilter) {
          return false;
        }
      }

      return matchesSearch;
    });
  }, [reportRequests, searchQuery, semesterFilter]);

  const filteredSubmissions = useMemo(() => {
    return reportSubmissions.filter((submission) => {
      const matchesSearch =
        submission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.content.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by status
      if (statusFilter !== "all" && submission.status !== statusFilter) {
        return false;
      }

      // Filter by semester
      if (semesterFilter !== "all") {
        let submissionSemester: string;
        if (submission.period_month) {
          submissionSemester = submission.period_month;
        } else {
          const date = new Date(submission.created_at);
          submissionSemester = `${date.getMonth() + 1}/${date.getFullYear()}`;
        }
        if (submissionSemester !== semesterFilter) {
          return false;
        }
      }

      return matchesSearch;
    });
  }, [reportSubmissions, searchQuery, statusFilter, semesterFilter]);

  const isDeadlinePassed = (deadline: string) =>
    new Date(deadline) < new Date();

  const handleSubmitReport = async (requestId: string) => {
    // Chỉ mở form, KHÔNG gọi API ở bước bấm nút ngoài card
    if (!clubId) {
      toast.error("Không tìm thấy thông tin câu lạc bộ");
      return;
    }

    setSelectedRequest(
      reportRequests.find((r) => r.request_id === requestId) || null
    );
    setEditingReportId(null);
    setDraftTitle("");
    setDraftContent("");
    setDraftFileUrl("");
    setDraftFile(null);
    setShowSubmitDialog(true);
  };

  const handleSaveDraft = async (requestId: string) => {
    if (!draftTitle.trim() || !draftContent.trim()) {
      toast.error("Vui lòng điền đầy đủ tiêu đề và nội dung");
      return;
    }

    if (!clubId) {
      toast.error("Không tìm thấy thông tin câu lạc bộ");
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingReportId) {
        // Update existing draft
        const updateRequest: UpdateReportRequest = {
          reportTitle: draftTitle,
          content: draftContent,
          fileUrl: draftFileUrl || undefined,
        };
        
        await updateReport(editingReportId, updateRequest);
        toast.success("Báo cáo đã được cập nhật");
      } else {
        // Create new draft
        const createRequest: CreateReportRequest = {
          reportTitle: draftTitle,
          content: draftContent,
          fileUrl: draftFileUrl || undefined,
          clubId: clubId,
          reportRequirementId: Number(requestId),
        };
        
        const createdReport = await createReport(createRequest, draftFile || undefined);
        setEditingReportId(createdReport.id);
        toast.success("Báo cáo đã được lưu thành bản nháp");
        setDraftFile(null); // Reset file after successful upload
      }
      
      setShowSubmitDialog(false);
      setShowEditDialog(false);
      
      // Refresh report requirements to update status
      if (activeTab === "requests") {
        const requirements = await getClubReportRequirementsForOfficer(clubId);
        // Re-map and update state
        const mappedRequests: ReportRequest[] = requirements.map((req) => {
          const clubRequirement = req.clubRequirements?.[0];
          const reportType = mapBackendToFrontendReportType(req.reportType);
          
          const requiredDetails = req.description
            ? req.description
                .split(/\r?\n|•|\u2022|-/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
            : [];

          const finalReportType: ReportType = reportType === "post-event" ? "post_event" : (reportType === "other" ? "periodic" : reportType);
          
          return {
            request_id: req.id.toString(),
            request_type: finalReportType,
            title: req.title,
            description: req.description || "",
            deadline: req.dueDate,
            created_by: req.createdBy?.fullName || "Phòng Quản lý Sinh viên",
            created_at: req.createdAt,
            required_details: requiredDetails.length > 0 
              ? requiredDetails 
              : ["Báo cáo chi tiết về hoạt động của câu lạc bộ"],
            templateUrl: req.templateUrl,
            status: clubRequirement?.status,
          };
        });
        setReportRequests(mappedRequests);
      }
    } catch (err) {
      console.error("Error saving draft:", err);
      const errorMessage = err instanceof Error ? err.message : "Không thể lưu báo cáo";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForApproval = async (reportId: number) => {
    if (!reportId) {
      toast.error("Không tìm thấy thông tin báo cáo");
      return;
    }

    try {
      setSubmitting(true);
      
      const submitRequest: SubmitReportRequest = {
        reportId: reportId,
      };
      
      await submitReport(submitRequest);
      toast.success("Báo cáo đã được nộp thành công");
      
      // Refresh report requirements to update status
      if (clubId && activeTab === "requests") {
        const requirements = await getClubReportRequirementsForOfficer(clubId);
        const mappedRequests: ReportRequest[] = requirements.map((req) => {
          const clubRequirement = req.clubRequirements?.[0];
          const reportType = mapBackendToFrontendReportType(req.reportType);
          
          const requiredDetails = req.description
            ? req.description
                .split(/\r?\n|•|\u2022|-/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
            : [];

          const finalReportType: ReportType = reportType === "post-event" ? "post_event" : (reportType === "other" ? "periodic" : reportType);
          
          return {
            request_id: req.id.toString(),
            request_type: finalReportType,
            title: req.title,
            description: req.description || "",
            deadline: req.dueDate,
            created_by: req.createdBy?.fullName || "Phòng Quản lý Sinh viên",
            created_at: req.createdAt,
            required_details: requiredDetails.length > 0 
              ? requiredDetails 
              : ["Báo cáo chi tiết về hoạt động của câu lạc bộ"],
            templateUrl: req.templateUrl,
            status: clubRequirement?.status,
          };
        });
        setReportRequests(mappedRequests);
      }
    } catch (err) {
      console.error("Error submitting report:", err);
      const errorMessage = err instanceof Error ? err.message : "Không thể nộp báo cáo";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReport = (submissionId: string) => {
    setReportSubmissions((prev) =>
      prev.map((sub) =>
        sub.submission_id === submissionId
          ? {
              ...sub,
              status: "approved",
              submitted_at: new Date().toISOString(),
              approved_by: "Nguyễn Văn A (Chủ tịch)",
              approval_notes: "Báo cáo đầy đủ và chất lượng",
              updated_at: new Date().toISOString(),
            }
          : sub
      )
    );
  };

  const handleRejectReport = (submissionId: string, reason: string) => {
    setReportSubmissions((prev) =>
      prev.map((sub) =>
        sub.submission_id === submissionId
          ? {
              ...sub,
              status: "rejected",
              rejection_reason: reason,
              updated_at: new Date().toISOString(),
            }
          : sub
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Quản lý Báo cáo
              </h1>
              <p className="text-muted-foreground mt-1">
                Xem yêu cầu và nộp báo cáo lên nhà trường
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant={activeTab === "requests" ? "default" : "outline"}
                onClick={() => setActiveTab("requests")}
                className={`
                  transition-all duration-300 ease-in-out flex-1 md:flex-none
                  ${
                    activeTab === "requests"
                      ? "bg-primary text-primary-foreground shadow-md scale-105 border-primary ring-2 ring-primary/30"
                      : "border-primary/30"
                  }
                `}
              >
                <FileText className="h-4 w-4 mr-2" />
                Yêu cầu nộp
              </Button>
              <Button
                variant={activeTab === "submissions" ? "default" : "outline"}
                onClick={() => setActiveTab("submissions")}
                className={`
                  transition-all duration-300 ease-in-out flex-1 md:flex-none
                  ${
                    activeTab === "submissions"
                      ? "bg-primary text-primary-foreground shadow-md scale-105 border-primary ring-2 ring-primary/30"
                      : "border-primary/30"
                  }
                `}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Báo cáo của tôi
              </Button>
              <Button
                variant={activeTab === "approval" ? "default" : "outline"}
                onClick={() => setActiveTab("approval")}
                className={`
                  transition-all duration-300 ease-in-out flex-1 md:flex-none
                  ${
                    activeTab === "approval"
                      ? "bg-primary text-primary-foreground shadow-md scale-105 border-primary ring-2 ring-primary/30"
                      : "border-primary/30"
                  }
                `}
              >
                <Users className="h-4 w-4 mr-2" />
                Phê duyệt
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {activeTab === "requests" && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm yêu cầu nộp báo cáo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={semesterFilter}
                onValueChange={(value) => setSemesterFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Chọn kỳ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả kỳ</SelectItem>
                  {availableSemesters.map((semester) => (
                    <SelectItem key={semester} value={semester}>
                      {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as SubmissionStatus | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                  <SelectItem value="pending_approval">
                    Chờ phê duyệt
                  </SelectItem>
                  <SelectItem value="approved">Đã phê duyệt</SelectItem>
                  <SelectItem value="rejected">Bị từ chối</SelectItem>
                  <SelectItem value="submitted">Đã nộp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Đang tải danh sách yêu cầu...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Request Cards */}
            {!loading && !error && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredRequests.map((request) => {
                const isDeadlineExp = isDeadlinePassed(request.deadline);

                return (
                  <Card
                    key={request.request_id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge
                              className={reportTypeColors[request.request_type]}
                            >
                              {reportTypeLabels[request.request_type]}
                            </Badge>
                            {/* Hiển thị trạng thái yêu cầu (requirement status) - đây là trạng thái chính từ backend */}
                            {request.status && (
                              <Badge className={requirementStatusColors[request.status] || "bg-gray-100 text-gray-700"}>
                                {requirementStatusLabels[request.status] || request.status}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg mb-1">
                            {request.title}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {request.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Hạn nộp:{" "}
                            <strong>
                              {new Date(request.deadline).toLocaleDateString(
                                "vi-VN"
                              )}
                            </strong>
                          </span>
                          {isDeadlineExp && (
                            <AlertCircle className="h-4 w-4 text-red-500 ml-auto" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Yêu cầu từ: {request.created_by}</span>
                        </div>

                        {/* Template URL */}
                        {request.templateUrl && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-muted-foreground">Template:</span>
                            <a
                              href={request.templateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            >
                              <span>Tải file template</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}

                        {/* Required details */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2">
                            Thông tin yêu cầu:
                          </Label>
                          <ul className="text-sm space-y-1 ml-4">
                            {request.required_details.map((detail, idx) => (
                              <li
                                key={idx}
                                className="list-disc text-muted-foreground"
                              >
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Hiển thị thông báo dựa trên trạng thái yêu cầu (requirement status) */}
                        {request.status === "UNSUBMITTED" && isDeadlineExp && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            <AlertCircle className="h-4 w-4 inline mr-2" />
                            Đã quá hạn nộp báo cáo
                          </div>
                        )}

                        {request.status === "SUBMITTED" && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                            <CheckCircle className="h-4 w-4 inline mr-2" />
                            Báo cáo đã được nộp và đang chờ phê duyệt
                          </div>
                        )}

                        {request.status === "APPROVED" && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                            <CheckCircle className="h-4 w-4 inline mr-2" />
                            Báo cáo đã được phê duyệt
                          </div>
                        )}

                        {request.status === "REJECTED" && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            <XCircle className="h-4 w-4 inline mr-2" />
                            Báo cáo bị từ chối. Vui lòng kiểm tra và gửi lại.
                          </div>
                        )}

                        {request.status === "RESUBMITTED" && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                            <CheckCircle className="h-4 w-4 inline mr-2" />
                            Báo cáo đã được nộp lại và đang chờ phê duyệt
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          {/* Hiển thị button dựa trên trạng thái yêu cầu từ backend */}
                          {request.status && (request.status === "SUBMITTED" || request.status === "APPROVED" || request.status === "REJECTED") ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  // Gọi API để lấy chi tiết báo cáo
                                  const reportDetail = await getClubReportByRequirementForOfficer(
                                    Number(request.request_id),
                                    clubId!
                                  );
                                  if (reportDetail) {
                                    // TODO: Hiển thị modal chi tiết báo cáo
                                    // Hiện tại vẫn dùng mock data
                                    setSelectedSubmission(
                                      reportSubmissions.find(
                                        (s) => s.request_id === request.request_id
                                      ) || null
                                    );
                                    setShowDetailModal(true);
                                  } else {
                                    toast.error("Không tìm thấy báo cáo");
                                  }
                                } catch (error) {
                                  console.error("Error fetching report detail:", error);
                                  toast.error("Không thể tải chi tiết báo cáo");
                                }
                              }}
                              className="bg-transparent"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Xem báo cáo
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleSubmitReport(request.request_id)
                              }
                              className="bg-blue-600 hover:bg-blue-700"
                              disabled={request.status === "APPROVED"}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {request.status === "APPROVED" ? "Đã duyệt" : "Nộp báo cáo"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            )}

            {!loading && !error && filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Không tìm thấy yêu cầu nào
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm báo cáo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={semesterFilter}
                onValueChange={(value) => setSemesterFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Chọn kỳ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả kỳ</SelectItem>
                  {availableSemesters.map((semester) => (
                    <SelectItem key={semester} value={semester}>
                      {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as SubmissionStatus | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                  <SelectItem value="pending_approval">
                    Chờ phê duyệt
                  </SelectItem>
                  <SelectItem value="approved">Đã phê duyệt</SelectItem>
                  <SelectItem value="rejected">Bị từ chối</SelectItem>
                  <SelectItem value="submitted">Đã nộp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSubmissions.map((submission) => (
                <Card
                  key={submission.submission_id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={reportTypeColors[submission.report_type]}
                          >
                            {reportTypeLabels[submission.report_type]}
                          </Badge>
                          <Badge className={statusColors[submission.status]}>
                            {statusLabels[submission.status]}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mb-1">
                          {submission.title}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Tạo bởi: {submission.created_by_name}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Ngày cập nhật:{" "}
                          {new Date(submission.updated_at).toLocaleDateString(
                            "vi-VN"
                          )}
                        </span>
                      </div>

                      {submission.rejection_reason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                          <AlertCircle className="h-4 w-4 inline mr-2" />
                          <strong>Lý do từ chối:</strong>{" "}
                          {submission.rejection_reason}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setShowDetailModal(true);
                          }}
                          className="bg-transparent"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Xem chi tiết
                        </Button>

                        {submission.status === "draft" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setDraftTitle(submission.title);
                                setDraftContent(submission.content);
                                setShowEditDialog(true);
                              }}
                              className="bg-transparent"
                            >
                              Chỉnh sửa
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (editingReportId) {
                                  handleSubmitForApproval(editingReportId);
                                } else {
                                  toast.error("Không tìm thấy báo cáo để nộp");
                                }
                              }}
                              className="bg-green-600 hover:bg-green-700"
                              disabled={submitting || !editingReportId}
                            >
                              {submitting ? "Đang nộp..." : "Nộp báo cáo"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "approval" && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-1">
                Phê duyệt báo cáo từ các thành viên
              </h3>
              <p className="text-sm text-blue-800">
                Xem xét và phê duyệt các báo cáo trước khi nộp lên nhà trường
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm báo cáo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={semesterFilter}
                onValueChange={(value) => setSemesterFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Chọn kỳ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả kỳ</SelectItem>
                  {availableSemesters.map((semester) => (
                    <SelectItem key={semester} value={semester}>
                      {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as SubmissionStatus | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                  <SelectItem value="pending_approval">
                    Chờ phê duyệt
                  </SelectItem>
                  <SelectItem value="approved">Đã phê duyệt</SelectItem>
                  <SelectItem value="rejected">Bị từ chối</SelectItem>
                  <SelectItem value="submitted">Đã nộp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredSubmissions
                .filter((sub) => sub.status === "pending_approval")
                .map((submission) => (
                  <Card
                    key={submission.submission_id}
                    className="border-yellow-200 bg-yellow-50/30"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              className={
                                reportTypeColors[submission.report_type]
                              }
                            >
                              {reportTypeLabels[submission.report_type]}
                            </Badge>
                            <Badge className="bg-yellow-100 text-yellow-700">
                              Chờ phê duyệt
                            </Badge>
                          </div>
                          <CardTitle className="text-lg mb-1">
                            {submission.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>Từ: {submission.created_by_name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Ngày nộp:{" "}
                            {new Date(submission.created_at).toLocaleDateString(
                              "vi-VN"
                            )}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm font-semibold mb-2">
                            Nội dung báo cáo:
                          </p>
                          <div className="bg-white rounded p-3 text-sm max-h-32 overflow-y-auto border">
                            {submission.content}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setShowDetailModal(true);
                            }}
                            className="bg-transparent"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Chi tiết
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleApproveReport(submission.submission_id)
                            }
                            className="bg-green-600 hover:bg-green-700 ml-auto"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Phê duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt("Nhập lý do từ chối:");
                              if (reason) {
                                handleRejectReport(
                                  submission.submission_id,
                                  reason
                                );
                              }
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Từ chối
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {filteredSubmissions.filter(
                (sub) => sub.status === "pending_approval"
              ).length === 0 && (
                <div className="text-center py-12 col-span-full">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-muted-foreground">
                    Không có báo cáo chờ phê duyệt
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showDetailModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    {selectedSubmission.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        reportTypeColors[selectedSubmission.report_type]
                      }
                    >
                      {reportTypeLabels[selectedSubmission.report_type]}
                    </Badge>
                    <Badge className={statusColors[selectedSubmission.status]}>
                      {statusLabels[selectedSubmission.status]}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetailModal(false)}
                  className="bg-transparent"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tạo bởi:</span>
                  <div className="font-medium">
                    {selectedSubmission.created_by_name}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Ngày tạo:</span>
                  <div className="font-medium">
                    {new Date(selectedSubmission.created_at).toLocaleDateString(
                      "vi-VN"
                    )}
                  </div>
                </div>
                {selectedSubmission.report_type === "periodic" && (
                  <div>
                    <span className="text-muted-foreground">
                      Tháng báo cáo:
                    </span>
                    <div className="font-medium">
                      {selectedSubmission.period_month}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Nội dung</h4>
                <div className="bg-muted/30 rounded p-4 whitespace-pre-wrap text-sm">
                  {selectedSubmission.content}
                </div>
              </div>

              {selectedSubmission.approval_notes && (
                <div>
                  <h4 className="font-semibold mb-2 text-green-700">
                    Ghi chú phê duyệt
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
                    <p>
                      <strong>Phê duyệt bởi:</strong>{" "}
                      {selectedSubmission.approved_by}
                    </p>
                    <p className="mt-2">{selectedSubmission.approval_notes}</p>
                  </div>
                </div>
              )}

              {selectedSubmission.rejection_reason && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-700">
                    Lý do từ chối
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded p-4 text-sm">
                    {selectedSubmission.rejection_reason}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showSubmitDialog && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                Tạo bản nháp báo cáo: {selectedRequest.title}
              </CardTitle>
              <CardDescription>
                Báo cáo này sẽ được gửi cho cấp lãnh đạo để phê duyệt trước khi
                nộp lên nhà trường
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tiêu đề báo cáo</Label>
                <Input
                  placeholder="Nhập tiêu đề báo cáo"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Nội dung chi tiết</Label>
                <Textarea
                  placeholder="Nhập nội dung chi tiết của báo cáo..."
                  rows={8}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                />
              </div>
              <div>
                <Label>Tệp đính kèm (tùy chọn)</Label>
                {draftFile ? (
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md mt-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {draftFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(draftFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDraftFile(null)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors mt-2">
                    <label className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <div className="text-sm">
                          <p className="font-medium">Kéo thả tệp hoặc nhấp để chọn</p>
                          <p className="text-xs text-muted-foreground">
                            Một file hoặc một tệp zip (tối đa 50MB)
                          </p>
                        </div>
                      </div>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error("File vượt quá kích thước tối đa 50MB");
                              e.target.value = "";
                              return;
                            }
                            // Kiểm tra là file hoặc zip
                            const fileName = file.name.toLowerCase();
                            const isZip = fileName.endsWith(".zip");
                            const isValidFile = fileName.endsWith(".pdf") || 
                              fileName.endsWith(".doc") || fileName.endsWith(".docx") ||
                              fileName.endsWith(".xls") || fileName.endsWith(".xlsx") ||
                              fileName.endsWith(".ppt") || fileName.endsWith(".pptx") ||
                              fileName.endsWith(".txt") || 
                              fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") ||
                              fileName.endsWith(".png") ||
                              isZip;
                            
                            if (!isValidFile) {
                              toast.error("Vui lòng chọn một file hợp lệ hoặc một tệp zip");
                              e.target.value = "";
                              return;
                            }
                            
                            setDraftFile(file);
                          }
                        }}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.zip"
                      />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSubmitDialog(false);
                    setEditingReportId(null);
                    setDraftFile(null);
                  }}
                  className="bg-transparent"
                  disabled={submitting}
                >
                  Hủy
                </Button>
                <Button
                  onClick={() => handleSaveDraft(selectedRequest.request_id)}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={submitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {submitting ? "Đang lưu..." : editingReportId ? "Cập nhật" : "Lưu bản nháp"}
                </Button>
                <Button
                  onClick={async () => {
                    if (!draftTitle.trim() || !draftContent.trim()) {
                      toast.error("Vui lòng điền đầy đủ tiêu đề và nội dung");
                      return;
                    }

                    if (!clubId) {
                      toast.error("Không tìm thấy thông tin câu lạc bộ");
                      return;
                    }

                    try {
                      setSubmitting(true);
                      
                      let reportIdToSubmit = editingReportId;
                      
                      // Nếu chưa có draft, tạo mới trước
                      if (!reportIdToSubmit) {
                        const createRequest: CreateReportRequest = {
                          reportTitle: draftTitle,
                          content: draftContent,
                          fileUrl: draftFileUrl || undefined,
                          clubId: clubId,
                          reportRequirementId: Number(selectedRequest.request_id),
                          autoSubmit: false, // Tạo draft trước, sau đó submit
                        };
                        
                        const createdReport = await createReport(createRequest, draftFile || undefined);
                        reportIdToSubmit = createdReport.id;
                        setEditingReportId(reportIdToSubmit);
                        setDraftFile(null); // Reset file after successful upload
                      }
                      
                      // Submit report (nếu chưa được submit tự động)
                      if (reportIdToSubmit) {
                        const submitRequest: SubmitReportRequest = {
                          reportId: reportIdToSubmit,
                        };
                        await submitReport(submitRequest);
                      }
                      
                      toast.success("Báo cáo đã được nộp thành công");
                      setShowSubmitDialog(false);
                      setEditingReportId(null);
                      setDraftFile(null);
                      
                      // Refresh data
                      if (clubId && activeTab === "requests") {
                        const requirements = await getClubReportRequirementsForOfficer(clubId);
                        const mappedRequests: ReportRequest[] = requirements.map((req) => {
                          const clubRequirement = req.clubRequirements?.[0];
                          const reportType = mapBackendToFrontendReportType(req.reportType);
                          
                          const requiredDetails = req.description
                            ? req.description
                                .split(/\r?\n|•|\u2022|-/)
                                .map((s) => s.trim())
                                .filter((s) => s.length > 0)
                            : [];

                          const finalReportType: ReportType = reportType === "post-event" ? "post_event" : (reportType === "other" ? "periodic" : reportType);
                          
                          return {
                            request_id: req.id.toString(),
                            request_type: finalReportType,
                            title: req.title,
                            description: req.description || "",
                            deadline: req.dueDate,
                            created_by: req.createdBy?.fullName || "Phòng Quản lý Sinh viên",
                            created_at: req.createdAt,
                            required_details: requiredDetails.length > 0 
                              ? requiredDetails 
                              : ["Báo cáo chi tiết về hoạt động của câu lạc bộ"],
                            templateUrl: req.templateUrl,
                            status: clubRequirement?.status,
                          };
                        });
                        setReportRequests(mappedRequests);
                      }
                    } catch (err) {
                      console.error("Error submitting report:", err);
                      const errorMessage = err instanceof Error ? err.message : "Không thể nộp báo cáo";
                      toast.error(errorMessage);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={submitting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {submitting ? "Đang nộp..." : "Nộp báo cáo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showEditDialog && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Chỉnh sửa bản nháp</CardTitle>
              <CardDescription>
                Cập nhật nội dung báo cáo trước khi gửi phê duyệt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tiêu đề báo cáo</Label>
                <Input
                  placeholder="Nhập tiêu đề báo cáo"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Nội dung chi tiết</Label>
                <Textarea
                  placeholder="Nhập nội dung chi tiết của báo cáo..."
                  rows={8}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                />
              </div>
              <div>
                <Label>Tệp đính kèm (tùy chọn)</Label>
                {draftFile ? (
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md mt-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {draftFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(draftFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDraftFile(null)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : draftFileUrl ? (
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md mt-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          File đã tải lên
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <a
                            href={draftFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Xem file
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors mt-2">
                    <label className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <div className="text-sm">
                          <p className="font-medium">Kéo thả tệp hoặc nhấp để chọn</p>
                          <p className="text-xs text-muted-foreground">
                            Một file hoặc một tệp zip (tối đa 50MB)
                          </p>
                        </div>
                      </div>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error("File vượt quá kích thước tối đa 50MB");
                              e.target.value = "";
                              return;
                            }
                            // Kiểm tra là file hoặc zip
                            const fileName = file.name.toLowerCase();
                            const isZip = fileName.endsWith(".zip");
                            const isValidFile = fileName.endsWith(".pdf") || 
                              fileName.endsWith(".doc") || fileName.endsWith(".docx") ||
                              fileName.endsWith(".xls") || fileName.endsWith(".xlsx") ||
                              fileName.endsWith(".ppt") || fileName.endsWith(".pptx") ||
                              fileName.endsWith(".txt") || 
                              fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") ||
                              fileName.endsWith(".png") ||
                              isZip;
                            
                            if (!isValidFile) {
                              toast.error("Vui lòng chọn một file hợp lệ hoặc một tệp zip");
                              e.target.value = "";
                              return;
                            }
                            
                            setDraftFile(file);
                          }
                        }}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.zip"
                      />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingReportId(null);
                    setDraftFile(null);
                  }}
                  className="bg-transparent"
                  disabled={submitting}
                >
                  Hủy
                </Button>
                <Button
                  onClick={() => {
                    if (selectedRequest) {
                      handleSaveDraft(selectedRequest.request_id);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={submitting}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
                {editingReportId && (
                  <Button
                    onClick={async () => {
                      try {
                        setSubmitting(true);
                        const submitRequest: SubmitReportRequest = {
                          reportId: editingReportId,
                        };
                        await submitReport(submitRequest);
                        toast.success("Báo cáo đã được nộp thành công");
                        setShowEditDialog(false);
                        setEditingReportId(null);
                        
                        // Refresh data
                        if (clubId && activeTab === "requests") {
                          const requirements = await getClubReportRequirementsForOfficer(clubId);
                          const mappedRequests: ReportRequest[] = requirements.map((req) => {
                            const clubRequirement = req.clubRequirements?.[0];
                            const reportType = mapBackendToFrontendReportType(req.reportType);
                            
                            const requiredDetails = req.description
                              ? req.description
                                  .split(/\r?\n|•|\u2022|-/)
                                  .map((s) => s.trim())
                                  .filter((s) => s.length > 0)
                              : [];

                            const finalReportType: ReportType = reportType === "post-event" ? "post_event" : (reportType === "other" ? "periodic" : reportType);
                            
                            return {
                              request_id: req.id.toString(),
                              request_type: finalReportType,
                              title: req.title,
                              description: req.description || "",
                              deadline: req.dueDate,
                              created_by: req.createdBy?.fullName || "Phòng Quản lý Sinh viên",
                              created_at: req.createdAt,
                              required_details: requiredDetails.length > 0 
                                ? requiredDetails 
                                : ["Báo cáo chi tiết về hoạt động của câu lạc bộ"],
                              templateUrl: req.templateUrl,
                              status: clubRequirement?.status,
                            };
                          });
                          setReportRequests(mappedRequests);
                        }
                      } catch (err) {
                        console.error("Error submitting report:", err);
                        const errorMessage = err instanceof Error ? err.message : "Không thể nộp báo cáo";
                        toast.error(errorMessage);
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={submitting}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {submitting ? "Đang nộp..." : "Nộp báo cáo"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
