"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  getClubReportRequirementsForOfficer,
  getClubReportByRequirementForOfficer,
  createReport,
  updateReport,
  submitReport,
  deleteReport,
  reviewReportByClub,
  type CreateReportRequest,
  type UpdateReportRequest,
  type SubmitReportRequest,
  type ReviewReportByClubRequest,
} from "@/services/reportService";
import { axiosClient, type ApiResponse } from "@/api/axiosClient";
import {
  mapBackendToFrontendReportType,
  type ReportDetailResponse,
} from "@/types/dto/reportRequirement.dto";
import { toast } from "sonner";
import { useClubPermissions } from "@/hooks/useClubPermissions";
import { authService } from "@/services/authService";
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
  report?: {
    id: number;
    reportTitle: string;
    status?: string;
    submittedDate?: string;
    createdAt: string;
    updatedAt: string;
    mustResubmit?: boolean;
  };
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
// This maps the ReportStatus from backend when report exists, or null when no report
// Backend returns report.status in clubRequirement.status if report exists
const requirementStatusLabels: Record<string, string> = {
  // When status is null (no report exists)
  UNSUBMITTED: "Chưa nộp",
  // ReportStatus enum values from backend
  DRAFT: "Bản nháp",
  PENDING_CLUB: "Chờ phê duyệt CLB",
  APPROVED_CLUB: "Đã duyệt CLB",
  REJECTED_CLUB: "Bị từ chối CLB",
  UPDATED_PENDING_CLUB: "Đã cập nhật - Chờ phê duyệt CLB",
  PENDING_UNIVERSITY: "Chờ phê duyệt nhà trường",
  APPROVED_UNIVERSITY: "Đã duyệt nhà trường",
  REJECTED_UNIVERSITY: "Bị từ chối nhà trường",
  RESUBMITTED_UNIVERSITY: "Đã nộp lại nhà trường",
};

const requirementStatusColors: Record<string, string> = {
  UNSUBMITTED: "bg-red-100 text-red-700",
  DRAFT: "bg-gray-600 text-white",
  PENDING_CLUB: "bg-yellow-100 text-yellow-700",
  APPROVED_CLUB: "bg-green-100 text-green-700",
  REJECTED_CLUB: "bg-red-100 text-red-700",
  UPDATED_PENDING_CLUB: "bg-yellow-100 text-yellow-700",
  PENDING_UNIVERSITY: "bg-blue-100 text-blue-700",
  APPROVED_UNIVERSITY: "bg-green-100 text-green-700",
  REJECTED_UNIVERSITY: "bg-red-100 text-red-700",
  RESUBMITTED_UNIVERSITY: "bg-blue-100 text-blue-700",
};

// Report status labels and colors (from ReportStatus enum in backend)
// Used for displaying report status in detail views
const reportStatusLabels: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_CLUB: "Chờ phê duyệt CLB",
  APPROVED_CLUB: "Đã duyệt CLB",
  REJECTED_CLUB: "Bị từ chối CLB",
  UPDATED_PENDING_CLUB: "Đã cập nhật - Chờ phê duyệt CLB",
  PENDING_UNIVERSITY: "Chờ phê duyệt nhà trường",
  APPROVED_UNIVERSITY: "Đã duyệt nhà trường",
  REJECTED_UNIVERSITY: "Bị từ chối nhà trường",
  RESUBMITTED_UNIVERSITY: "Đã nộp lại nhà trường",
};

const reportStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-600 text-white",
  PENDING_CLUB: "bg-yellow-100 text-yellow-700",
  APPROVED_CLUB: "bg-green-100 text-green-700",
  REJECTED_CLUB: "bg-red-100 text-red-700",
  UPDATED_PENDING_CLUB: "bg-yellow-100 text-yellow-700",
  PENDING_UNIVERSITY: "bg-blue-100 text-blue-700",
  APPROVED_UNIVERSITY: "bg-green-100 text-green-700",
  REJECTED_UNIVERSITY: "bg-red-100 text-red-700",
  RESUBMITTED_UNIVERSITY: "bg-blue-100 text-blue-700",
};

export function ClubReportManagement() {
  const params = useParams();
  const clubIdParam = params.clubId;
  const clubId = clubIdParam ? Number(clubIdParam) : undefined;
  const {
    isClubPresident,
    isTeamOfficer,
    loading: permissionsLoading,
  } = useClubPermissions(clubId);

  // Helper function to map API response to ReportRequest format
  const mapRequirementToReportRequest = (req: any): ReportRequest => {
    const clubRequirement = req.clubRequirements?.[0];
    const reportType = mapBackendToFrontendReportType(req.reportType);

    // Extract required details from description (split by newlines or bullet points)
    const requiredDetails = req.description
      ? req.description
          .split(/\r?\n|•|\u2022|-/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : [];

    const finalReportType: ReportType =
      reportType === "post-event"
        ? "post_event"
        : reportType === "other"
        ? "periodic"
        : reportType;

    // Map report info if exists
    const reportInfo = clubRequirement?.report
      ? {
          id: clubRequirement.report.id,
          reportTitle: clubRequirement.report.reportTitle,
          status: clubRequirement.report.status,
          submittedDate: clubRequirement.report.submittedDate,
          createdAt: clubRequirement.report.createdAt,
          updatedAt: clubRequirement.report.updatedAt,
          mustResubmit: clubRequirement.report.mustResubmit,
        }
      : undefined;

    return {
      request_id: req.id.toString(),
      request_type: finalReportType,
      title: req.title,
      description: req.description || "",
      deadline: req.dueDate,
      created_by: req.createdBy?.fullName || "Phòng Quản lý Sinh viên",
      created_at: req.createdAt,
      required_details:
        requiredDetails.length > 0
          ? requiredDetails
          : ["Báo cáo chi tiết về hoạt động của câu lạc bộ"],
      templateUrl: req.templateUrl,
      status: clubRequirement?.status,
      report: reportInfo,
    };
  };

  const [activeTab, setActiveTab] = useState<
    "requests" | "submissions" | "approval"
  >("requests");
  const [selectedRequest, setSelectedRequest] = useState<ReportRequest | null>(
    null
  );
  const [selectedSubmission, setSelectedSubmission] =
    useState<ReportSubmission | null>(null);
  const [selectedReportDetail, setSelectedReportDetail] =
    useState<ReportDetailResponse | null>(null);
  const [loadingReportDetailId, setLoadingReportDetailId] = useState<
    string | null
  >(null);
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
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [deletingReport, setDeletingReport] = useState(false);
  const [approvingReport, setApprovingReport] = useState(false);
  const [rejectingReport, setRejectingReport] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isResubmitMode, setIsResubmitMode] = useState(false);
  const [resubmittingReport, setResubmittingReport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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
        const mappedRequests: ReportRequest[] = requirements.map((req) =>
          mapRequirementToReportRequest(req)
        );

        setReportRequests(mappedRequests);
      } catch (err) {
        console.error("Error fetching report requirements:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách yêu cầu nộp báo cáo";
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

  const handleSaveDraft = async (requestId?: string) => {
    if (!draftTitle.trim() || !draftContent.trim()) {
      toast.error("Vui lòng điền đầy đủ tiêu đề và nội dung");
      return;
    }

    // File là bắt buộc
    if (!draftFile && !draftFileUrl) {
      toast.error("Vui lòng chọn file đính kèm");
      return;
    }

    if (!clubId) {
      toast.error("Không tìm thấy thông tin câu lạc bộ");
      return;
    }

    try {
      setSavingDraft(true);

      if (editingReportId) {
        // Update existing draft
        let finalFileUrl = draftFileUrl;

        // Nếu có file mới được chọn, upload file lên Cloudinary trước
        if (draftFile) {
          try {
            // Upload file mới lên Cloudinary qua API /uploads/file
            const formData = new FormData();
            formData.append("file", draftFile);

            interface UploadResult {
              url: string;
              publicId: string;
              format: string;
              bytes: number;
            }

            const uploadResponse = await axiosClient.post<UploadResult>(
              "/uploads/file",
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
                timeout: 60000, // Increase timeout for file uploads
              }
            );

            // Handle ApiResponse wrapper - axiosClient returns ApiResponse<T>
            if (
              uploadResponse.code === 200 &&
              uploadResponse.data &&
              uploadResponse.data.url
            ) {
              finalFileUrl = uploadResponse.data.url;
              toast.success("File đã được tải lên thành công");
            } else {
              throw new Error(
                uploadResponse.message || "Upload file failed: No URL returned"
              );
            }
          } catch (err) {
            console.error("Error uploading file:", err);
            const errorMessage =
              err instanceof Error ? err.message : "Không thể tải lên file";
            toast.error(`Lỗi khi tải file: ${errorMessage}`);
            // Tiếp tục update với fileUrl cũ nếu upload file thất bại
          }
        }

        const updateRequest: UpdateReportRequest = {
          reportTitle: draftTitle,
          content: draftContent,
          fileUrl: finalFileUrl || undefined,
        };

        await updateReport(editingReportId, updateRequest);
        toast.success("Báo cáo đã được cập nhật thành công");
      } else {
        // Create new draft - cần có requestId
        if (!requestId) {
          // Nếu không có requestId, lấy từ selectedReportDetail
          if (selectedReportDetail?.reportRequirement?.id) {
            requestId = selectedReportDetail.reportRequirement.id.toString();
          } else {
            toast.error("Không tìm thấy thông tin yêu cầu báo cáo");
            return;
          }
        }

        const createRequest: CreateReportRequest = {
          reportTitle: draftTitle,
          content: draftContent,
          fileUrl: draftFileUrl || undefined,
          clubId: clubId,
          reportRequirementId: Number(requestId),
          autoSubmit: false, // Explicitly set to false to ensure status is DRAFT
        };

        const createdReport = await createReport(
          createRequest,
          draftFile || undefined
        );
        setEditingReportId(createdReport.id);
        toast.success("Báo cáo đã được lưu thành bản nháp");
        setDraftFile(null); // Reset file after successful upload
      }

      setShowSubmitDialog(false);
      setShowEditDialog(false);
      setShowDetailModal(false);
      setSelectedReportDetail(null);
      setDraftFile(null);
      setIsResubmitMode(false);

      // Refresh report requirements to update status
      if (activeTab === "requests") {
        const requirements = await getClubReportRequirementsForOfficer(clubId);
        // Re-map and update state
        const mappedRequests: ReportRequest[] = requirements.map((req) =>
          mapRequirementToReportRequest(req)
        );
        setReportRequests(mappedRequests);
      }
    } catch (err) {
      console.error("Error saving draft:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Không thể lưu báo cáo";
      toast.error(errorMessage);
    } finally {
      setSavingDraft(false);
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
        const mappedRequests: ReportRequest[] = requirements.map((req) =>
          mapRequirementToReportRequest(req)
        );
        setReportRequests(mappedRequests);
      }
    } catch (err) {
      console.error("Error submitting report:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Không thể nộp báo cáo";
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
                <p className="text-muted-foreground">
                  Đang tải danh sách yêu cầu...
                </p>
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
                                className={
                                  reportTypeColors[request.request_type]
                                }
                              >
                                {reportTypeLabels[request.request_type]}
                              </Badge>
                              {/* Hiển thị trạng thái yêu cầu (requirement status) - đây là trạng thái chính từ backend */}
                              <Badge
                                className={
                                  requirementStatusColors[
                                    request.status || "UNSUBMITTED"
                                  ] || "bg-gray-100 text-gray-700"
                                }
                              >
                                {requirementStatusLabels[
                                  request.status || "UNSUBMITTED"
                                ] ||
                                  request.status ||
                                  "Chưa nộp"}
                              </Badge>
                              {/* Badge "phải nộp lại" khi mustResubmit = true */}
                              {request.report?.mustResubmit === true && (
                                <Badge className="bg-orange-100 text-orange-700 border border-orange-300 font-semibold">
                                  Phải nộp lại
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-lg mb-1">
                              {request.title}
                            </CardTitle>
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
                              <span className="text-muted-foreground">
                                Template:
                              </span>
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

                          {/* Hiển thị thông báo quá hạn cho tất cả các yêu cầu đã quá hạn */}
                          {isDeadlineExp && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                              <AlertCircle className="h-4 w-4 inline mr-2" />
                              Đã quá hạn nộp báo cáo
                            </div>
                          )}

                          {/* Báo cáo đang ở trạng thái nháp */}
                          {request.status === "DRAFT" && (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800">
                              <FileText className="h-4 w-4 inline mr-2" />
                              {isClubPresident
                                ? // Hiển thị ghi chú cho club_president
                                  // Note: Thông tin người tạo sẽ được hiển thị trong modal khi xem chi tiết
                                  "Đã có bản nháp nhưng chưa nộp lên để phê duyệt"
                                : "Báo cáo đang ở trạng thái nháp"}
                            </div>
                          )}

                          {/* Báo cáo đang chờ phê duyệt từ CLB */}
                          {(request.status === "PENDING_CLUB" ||
                            request.status === "UPDATED_PENDING_CLUB") && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                              <CheckCircle className="h-4 w-4 inline mr-2" />
                              Báo cáo đã được nộp và đang chờ phê duyệt từ CLB
                            </div>
                          )}

                          {/* Báo cáo đã được CLB phê duyệt, đang chờ nhà trường */}
                          {request.status === "APPROVED_CLUB" && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                              <CheckCircle className="h-4 w-4 inline mr-2" />
                              Báo cáo đã được CLB phê duyệt, đang chờ phê duyệt
                              từ nhà trường
                            </div>
                          )}

                          {/* Báo cáo bị CLB từ chối */}
                          {request.status === "REJECTED_CLUB" && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                              <div className="flex items-center gap-2 mb-2">
                                <XCircle className="h-4 w-4" />
                                <span className="font-semibold">
                                  Báo cáo bị CLB từ chối. Vui lòng kiểm tra và
                                  gửi lại.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Báo cáo đang chờ phê duyệt từ nhà trường */}
                          {request.status === "PENDING_UNIVERSITY" && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                              <CheckCircle className="h-4 w-4 inline mr-2" />
                              Báo cáo đang chờ phê duyệt từ nhà trường
                            </div>
                          )}

                          {/* Báo cáo đã được nhà trường phê duyệt */}
                          {request.status === "APPROVED_UNIVERSITY" && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                              <CheckCircle className="h-4 w-4 inline mr-2" />
                              Báo cáo đã được nhà trường phê duyệt
                            </div>
                          )}

                          {/* Báo cáo bị nhà trường từ chối */}
                          {request.status === "REJECTED_UNIVERSITY" && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                              <div className="flex items-center gap-2 mb-2">
                                <XCircle className="h-4 w-4" />
                                <span className="font-semibold">
                                  Báo cáo bị nhà trường từ chối. Vui lòng kiểm
                                  tra và gửi lại.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Báo cáo đã được nộp lại lên nhà trường */}
                          {request.status === "RESUBMITTED_UNIVERSITY" && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                              <CheckCircle className="h-4 w-4 inline mr-2" />
                              Báo cáo đã được nộp lại và đang chờ phê duyệt từ
                              nhà trường
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            {/* Hiển thị button dựa trên trạng thái yêu cầu và thông tin báo cáo từ backend */}
                            {/* Nếu là club_president và status là DRAFT, không hiển thị nút */}
                            {isClubPresident &&
                            request.status ===
                              "DRAFT" ? null : request.report || // Nếu có report, hiển thị nút xem (luôn hiển thị, kể cả khi quá hạn)
                              (request.status &&
                                request.status !== "UNSUBMITTED" &&
                                request.status !== null) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setLoadingReportDetailId(
                                      request.request_id
                                    );
                                    // Gọi API để lấy chi tiết báo cáo
                                    const reportDetail =
                                      await getClubReportByRequirementForOfficer(
                                        Number(request.request_id),
                                        clubId!
                                      );
                                    if (reportDetail) {
                                      setSelectedReportDetail(reportDetail);
                                      setShowDetailModal(true);
                                    } else {
                                      toast.error("Không tìm thấy báo cáo");
                                    }
                                  } catch (error) {
                                    console.error(
                                      "Error fetching report detail:",
                                      error
                                    );
                                    toast.error(
                                      "Không thể tải chi tiết báo cáo"
                                    );
                                  } finally {
                                    setLoadingReportDetailId(null);
                                  }
                                }}
                                className="bg-transparent"
                                disabled={
                                  loadingReportDetailId === request.request_id
                                }
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {(() => {
                                  if (
                                    loadingReportDetailId === request.request_id
                                  ) {
                                    return "Đang tải...";
                                  }
                                  // Kiểm tra nếu báo cáo ở trạng thái DRAFT
                                  const reportStatus =
                                    request.report?.status?.toUpperCase();
                                  const isDraft =
                                    reportStatus === "DRAFT" ||
                                    (request.report &&
                                      request.status === "UNSUBMITTED");
                                  return isDraft
                                    ? "Xem bản nháp"
                                    : "Xem báo cáo";
                                })()}
                              </Button>
                            ) : (
                              // Chỉ ẩn nút "Tạo báo cáo" nếu đã quá hạn
                              !isDeadlineExp && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleSubmitReport(request.request_id)
                                  }
                                  className="bg-blue-600 hover:bg-blue-700"
                                  disabled={
                                    request.status === "APPROVED_UNIVERSITY" ||
                                    request.status === "APPROVED_CLUB"
                                  }
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  {request.status === "APPROVED_UNIVERSITY" ||
                                  request.status === "APPROVED_CLUB"
                                    ? "Đã duyệt"
                                    : "Tạo báo cáo"}
                                </Button>
                              )
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

      {showDetailModal && selectedReportDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    {selectedReportDetail.reportTitle}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedReportDetail.reportRequirement &&
                      (() => {
                        const frontendType = mapBackendToFrontendReportType(
                          selectedReportDetail.reportRequirement.reportType
                        );
                        const reportTypeKey: ReportType =
                          frontendType === "post-event"
                            ? "post_event"
                            : frontendType === "other"
                            ? "periodic"
                            : frontendType;
                        return (
                          <Badge className={reportTypeColors[reportTypeKey]}>
                            {reportTypeLabels[reportTypeKey]}
                          </Badge>
                        );
                      })()}
                    <Badge
                      className={
                        reportStatusColors[
                          selectedReportDetail.status?.toUpperCase() || "DRAFT"
                        ] || "bg-gray-100 text-gray-700"
                      }
                    >
                      {reportStatusLabels[
                        selectedReportDetail.status?.toUpperCase() || "DRAFT"
                      ] || "Bản nháp"}
                    </Badge>
                    {/* Badge "phải nộp lại" khi mustResubmit = true */}
                    {selectedReportDetail.mustResubmit && (
                      <Badge className="bg-orange-100 text-orange-700 border border-orange-300">
                        Phải nộp lại
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedReportDetail(null);
                  }}
                  className="bg-transparent"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {selectedReportDetail.createdBy && (
                  <div>
                    <span className="text-muted-foreground">Tạo bởi:</span>
                    <div className="font-medium">
                      {selectedReportDetail.createdBy.fullName}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Ngày tạo:</span>
                  <div className="font-medium">
                    {new Date(
                      selectedReportDetail.createdAt
                    ).toLocaleDateString("vi-VN")}
                  </div>
                </div>
                {selectedReportDetail.submittedDate && (
                  <div>
                    <span className="text-muted-foreground">Ngày nộp:</span>
                    <div className="font-medium">
                      {new Date(
                        selectedReportDetail.submittedDate
                      ).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                )}
                {selectedReportDetail.semester && (
                  <div>
                    <span className="text-muted-foreground">Kỳ học:</span>
                    <div className="font-medium">
                      {selectedReportDetail.semester.semesterName}
                    </div>
                  </div>
                )}
                {selectedReportDetail.club && (
                  <div>
                    <span className="text-muted-foreground">Câu lạc bộ:</span>
                    <div className="font-medium">
                      {selectedReportDetail.club.clubName}
                    </div>
                  </div>
                )}
              </div>

              {selectedReportDetail.content && (
                <div>
                  <h4 className="font-semibold mb-2">Nội dung</h4>
                  <div className="bg-muted/30 rounded p-4 whitespace-pre-wrap text-sm">
                    {selectedReportDetail.content}
                  </div>
                </div>
              )}

              {selectedReportDetail.fileUrl && (
                <div>
                  <h4 className="font-semibold mb-2">Tệp đính kèm</h4>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <a
                      href={selectedReportDetail.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <span>Xem tệp đính kèm</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Hiển thị phản hồi phê duyệt cho các status đã được duyệt */}
              {(selectedReportDetail.status?.toUpperCase() ===
                "APPROVED_CLUB" ||
                selectedReportDetail.status?.toUpperCase() ===
                  "APPROVED_UNIVERSITY") &&
                selectedReportDetail.reviewerFeedback &&
                selectedReportDetail.reviewedDate && (
                  <div>
                    <h4 className="font-semibold mb-2 text-green-700">
                      Phản hồi phê duyệt
                    </h4>
                    <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
                      {selectedReportDetail.reviewerFeedback}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ngày phê duyệt:{" "}
                      {new Date(
                        selectedReportDetail.reviewedDate
                      ).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                )}

              {/* Hiển thị lý do từ chối cho các status bị từ chối */}
              {(selectedReportDetail.status?.toUpperCase() ===
                "REJECTED_CLUB" ||
                selectedReportDetail.status?.toUpperCase() ===
                  "REJECTED_UNIVERSITY") &&
                selectedReportDetail.reviewerFeedback && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-700">
                      Lý do từ chối
                    </h4>
                    <div className="bg-red-50 border border-red-200 rounded p-4 text-sm">
                      {selectedReportDetail.reviewerFeedback}
                    </div>
                    {selectedReportDetail.reviewedDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Ngày từ chối:{" "}
                        {new Date(
                          selectedReportDetail.reviewedDate
                        ).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                  </div>
                )}

              {/* Ghi chú cho club_president khi status là DRAFT */}
              {(() => {
                const rawStatus = selectedReportDetail.status || "";
                const reportStatus = rawStatus.toUpperCase().trim();
                const isDraft = reportStatus === "DRAFT";
                const reportClubId = selectedReportDetail.club?.id;
                const isSameClub =
                  reportClubId !== undefined && clubId !== undefined
                    ? Number(reportClubId) === Number(clubId)
                    : true;
                const shouldShowNote =
                  !permissionsLoading &&
                  isDraft &&
                  isClubPresident &&
                  isSameClub;

                if (shouldShowNote && selectedReportDetail.createdBy) {
                  return (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800">
                      <FileText className="h-4 w-4 inline mr-2" />
                      <strong>
                        {selectedReportDetail.createdBy.fullName}
                      </strong>{" "}
                      đã tạo bản nháp nhưng chưa nộp lên để phê duyệt
                    </div>
                  );
                }
                return null;
              })()}

              {/* Action buttons for DRAFT status */}
              {(() => {
                // Kiểm tra nếu đã quá hạn và báo cáo không được đánh dấu là đã nộp lại
                const reportRequirement = selectedReportDetail.reportRequirement;
                const deadline = reportRequirement?.dueDate;
                const isDeadlinePassed = deadline
                  ? new Date(deadline) < new Date()
                  : false;
                const shouldHideButtons =
                  isDeadlinePassed &&
                  selectedReportDetail &&
                  selectedReportDetail.mustResubmit !== true;

                // Kiểm tra status - normalize và trim để tránh lỗi
                const rawStatus = selectedReportDetail.status || "";
                const reportStatus = rawStatus.toUpperCase().trim();
                const isDraft = reportStatus === "DRAFT";

                const reportClubId = selectedReportDetail.club?.id;
                // So sánh clubId (có thể là number hoặc string từ URL)
                // Nếu không có reportClubId, coi như cùng club (vì report được lấy từ API với clubId)
                const isSameClub =
                  reportClubId !== undefined && clubId !== undefined
                    ? Number(reportClubId) === Number(clubId)
                    : true;

                // Kiểm tra nếu user là creator của report
                const currentUser = authService.getCurrentUser();
                const isCreator =
                  selectedReportDetail.createdBy?.id === currentUser?.id;

                // Ẩn các nút nếu đã quá hạn và báo cáo không được đánh dấu là đã nộp lại
                if (shouldHideButtons) {
                  return null;
                }

                // Tính toán điều kiện hiển thị cho club_president
                const shouldShowForPresident =
                  !permissionsLoading &&
                  isDraft &&
                  isClubPresident &&
                  isSameClub;

                // Tính toán điều kiện hiển thị cho Team_officer (chỉ khi là creator)
                const shouldShowForTeamOfficer =
                  !permissionsLoading &&
                  isDraft &&
                  isTeamOfficer &&
                  isSameClub &&
                  isCreator;

                // Nếu là club_president và status là DRAFT, không hiển thị nút
                if (shouldShowForPresident) {
                  return null;
                }

                // Nếu là Team_officer và status là DRAFT và là creator, hiển thị các nút
                if (shouldShowForTeamOfficer) {
                  return (
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button
                        onClick={async () => {
                          if (!selectedReportDetail.id) {
                            toast.error("Không tìm thấy thông tin báo cáo");
                            return;
                          }

                          try {
                            setSubmitting(true);
                            const submitRequest: SubmitReportRequest = {
                              reportId: selectedReportDetail.id,
                            };

                            await submitReport(submitRequest);
                            toast.success(
                              "Báo cáo đã được nộp lên để phê duyệt"
                            );
                            setShowDetailModal(false);
                            setSelectedReportDetail(null);

                            // Refresh report requirements to update status
                            if (clubId && activeTab === "requests") {
                              const requirements =
                                await getClubReportRequirementsForOfficer(
                                  clubId
                                );
                              const mappedRequests: ReportRequest[] =
                                requirements.map((req) =>
                                  mapRequirementToReportRequest(req)
                                );
                              setReportRequests(mappedRequests);
                            }
                          } catch (err) {
                            console.error("Error submitting report:", err);
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Không thể nộp báo cáo";
                            toast.error(errorMessage);
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={submitting}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {submitting ? "Đang nộp..." : "Nộp lên để phê duyệt"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Set up edit dialog
                          setDraftTitle(selectedReportDetail.reportTitle);
                          setDraftContent(selectedReportDetail.content || "");
                          setDraftFileUrl(selectedReportDetail.fileUrl || "");
                          setEditingReportId(selectedReportDetail.id);
                          // Find the request for this report
                          const requirementId =
                            selectedReportDetail.reportRequirement?.id;
                          if (requirementId) {
                            const request = reportRequests.find(
                              (r) => r.request_id === requirementId.toString()
                            );
                            if (request) {
                              setSelectedRequest(request);
                            }
                          }
                          setShowDetailModal(false);
                          setShowEditDialog(true);
                        }}
                        className="bg-transparent"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Bạn có chắc chắn muốn xóa bản nháp này? Hành động này không thể hoàn tác."
                            )
                          ) {
                            return;
                          }
                          try {
                            if (!selectedReportDetail.id) {
                              toast.error("Không tìm thấy thông tin báo cáo");
                              return;
                            }
                            setDeletingReport(true);
                            await deleteReport(selectedReportDetail.id);
                            toast.success("Báo cáo đã được xóa thành công");
                            setShowDetailModal(false);
                            setSelectedReportDetail(null);

                            // Refresh report requirements to update status
                            if (clubId && activeTab === "requests") {
                              const requirements =
                                await getClubReportRequirementsForOfficer(
                                  clubId
                                );
                              const mappedRequests: ReportRequest[] =
                                requirements.map((req) =>
                                  mapRequirementToReportRequest(req)
                                );
                              setReportRequests(mappedRequests);
                            }
                          } catch (err) {
                            console.error("Error deleting report:", err);
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Không thể xóa báo cáo";
                            toast.error(errorMessage);
                          } finally {
                            setDeletingReport(false);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deletingReport}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {deletingReport ? "Đang xóa..." : "Xóa"}
                      </Button>
                    </div>
                  );
                }

                // Nếu không thỏa mãn điều kiện, không hiển thị gì
                return null;
              })()}

              {/* Action buttons for PENDING_CLUB status when user is club_president */}
              {(() => {
                // Kiểm tra nếu đã quá hạn và báo cáo không được đánh dấu là đã nộp lại
                const reportRequirement = selectedReportDetail.reportRequirement;
                const deadline = reportRequirement?.dueDate;
                const isDeadlinePassed = deadline
                  ? new Date(deadline) < new Date()
                  : false;
                const shouldHideButtons =
                  isDeadlinePassed &&
                  selectedReportDetail &&
                  selectedReportDetail.mustResubmit !== true;

                const rawStatus = selectedReportDetail.status || "";
                const reportStatus = rawStatus.toUpperCase().trim();
                const isPendingClub =
                  reportStatus === "PENDING_CLUB" ||
                  reportStatus === "UPDATED_PENDING_CLUB";

                const reportClubId = selectedReportDetail.club?.id;
                const isSameClub =
                  reportClubId !== undefined && clubId !== undefined
                    ? Number(reportClubId) === Number(clubId)
                    : true;

                // Kiểm tra nếu user là creator của report
                const currentUser = authService.getCurrentUser();
                const isCreator =
                  selectedReportDetail.createdBy?.id === currentUser?.id;

                // Ẩn các nút nếu đã quá hạn và báo cáo không được đánh dấu là đã nộp lại
                if (shouldHideButtons) {
                  return null;
                }

                const shouldShowForPresident =
                  !permissionsLoading &&
                  isPendingClub &&
                  isClubPresident &&
                  isSameClub;

                if (shouldShowForPresident) {
                  // Nếu là creator, hiển thị nút Chỉnh sửa và Xóa thay vì Từ chối
                  if (isCreator) {
                  return (
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button
                        onClick={async () => {
                          if (!selectedReportDetail.id) {
                            toast.error("Không tìm thấy thông tin báo cáo");
                            return;
                          }

                          try {
                            setApprovingReport(true);
                            const reviewRequest: ReviewReportByClubRequest = {
                              reportId: selectedReportDetail.id,
                              status: "APPROVED_CLUB",
                            };

                            await reviewReportByClub(reviewRequest);
                            toast.success(
                              "Báo cáo đã được chấp nhận và nộp lên trường"
                            );
                            setShowDetailModal(false);
                            setSelectedReportDetail(null);

                            // Refresh report requirements to update status
                            if (clubId && activeTab === "requests") {
                              const requirements =
                                await getClubReportRequirementsForOfficer(
                                  clubId
                                );
                              const mappedRequests: ReportRequest[] =
                                requirements.map((req) =>
                                  mapRequirementToReportRequest(req)
                                );
                              setReportRequests(mappedRequests);
                            }
                          } catch (err) {
                            console.error("Error approving report:", err);
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Không thể duyệt báo cáo";
                            toast.error(errorMessage);
                          } finally {
                            setApprovingReport(false);
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={approvingReport}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {approvingReport
                          ? "Đang xử lý..."
                            : selectedReportDetail.mustResubmit
                            ? "Nộp lại lên trường"
                            : "Chấp nhận và nộp lên trường"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Set up edit dialog
                            setDraftTitle(selectedReportDetail.reportTitle);
                            setDraftContent(selectedReportDetail.content || "");
                            setDraftFileUrl(selectedReportDetail.fileUrl || "");
                            setDraftFile(null);
                            setEditingReportId(selectedReportDetail.id);
                            setIsResubmitMode(false);
                            // Find the request for this report
                            const requirementId =
                              selectedReportDetail.reportRequirement?.id;
                            if (requirementId) {
                              const request = reportRequests.find(
                                (r) => r.request_id === requirementId.toString()
                              );
                              if (request) {
                                setSelectedRequest(request);
                              }
                            }
                            setShowDetailModal(false);
                            setShowEditDialog(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={approvingReport}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Chỉnh sửa
                        </Button>
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (
                              !confirm(
                                "Bạn có chắc chắn muốn xóa báo cáo này? Hành động này không thể hoàn tác."
                              )
                            ) {
                              return;
                            }
                            try {
                              if (!selectedReportDetail.id) {
                                toast.error("Không tìm thấy thông tin báo cáo");
                                return;
                              }
                              setDeletingReport(true);
                              await deleteReport(selectedReportDetail.id);
                              toast.success("Báo cáo đã được xóa thành công");
                              setShowDetailModal(false);
                              setSelectedReportDetail(null);

                              // Refresh report requirements to update status
                              if (clubId && activeTab === "requests") {
                                const requirements =
                                  await getClubReportRequirementsForOfficer(
                                    clubId
                                  );
                                const mappedRequests: ReportRequest[] =
                                  requirements.map((req) =>
                                    mapRequirementToReportRequest(req)
                                  );
                                setReportRequests(mappedRequests);
                              }
                            } catch (err) {
                              console.error("Error deleting report:", err);
                              const errorMessage =
                                err instanceof Error
                                  ? err.message
                                  : "Không thể xóa báo cáo";
                              toast.error(errorMessage);
                            } finally {
                              setDeletingReport(false);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={approvingReport || deletingReport}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {deletingReport ? "Đang xóa..." : "Xóa"}
                        </Button>
                      </div>
                    );
                  }

                  // Nếu không phải creator, hiển thị nút Từ chối như cũ
                  return (
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button
                        onClick={async () => {
                          if (!selectedReportDetail.id) {
                            toast.error("Không tìm thấy thông tin báo cáo");
                            return;
                          }

                          try {
                            setApprovingReport(true);
                            const reviewRequest: ReviewReportByClubRequest = {
                              reportId: selectedReportDetail.id,
                              status: "APPROVED_CLUB",
                            };

                            await reviewReportByClub(reviewRequest);
                            toast.success(
                              "Báo cáo đã được chấp nhận và nộp lên trường"
                            );
                            setShowDetailModal(false);
                            setSelectedReportDetail(null);

                            // Refresh report requirements to update status
                            if (clubId && activeTab === "requests") {
                              const requirements =
                                await getClubReportRequirementsForOfficer(
                                  clubId
                                );
                              const mappedRequests: ReportRequest[] =
                                requirements.map((req) =>
                                  mapRequirementToReportRequest(req)
                                );
                              setReportRequests(mappedRequests);
                            }
                          } catch (err) {
                            console.error("Error approving report:", err);
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Không thể duyệt báo cáo";
                            toast.error(errorMessage);
                          } finally {
                            setApprovingReport(false);
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={approvingReport}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {approvingReport
                          ? "Đang xử lý..."
                          : selectedReportDetail.mustResubmit
                          ? "Nộp lại lên trường"
                          : "Chấp nhận và nộp lên trường"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRejectDialog(true);
                          setRejectReason("");
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={approvingReport}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Từ chối
                      </Button>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Action buttons for REJECTED_CLUB status when user is team officer */}
              {(() => {
                // Kiểm tra nếu đã quá hạn và báo cáo không được đánh dấu là đã nộp lại
                const reportRequirement = selectedReportDetail.reportRequirement;
                const deadline = reportRequirement?.dueDate;
                const isDeadlinePassed = deadline
                  ? new Date(deadline) < new Date()
                  : false;
                const shouldHideButtons =
                  isDeadlinePassed &&
                  selectedReportDetail &&
                  selectedReportDetail.mustResubmit !== true;

                const rawStatus = selectedReportDetail.status || "";
                const reportStatus = rawStatus.toUpperCase().trim();
                const isRejectedClub = reportStatus === "REJECTED_CLUB";

                const reportClubId = selectedReportDetail.club?.id;
                const isSameClub =
                  reportClubId !== undefined && clubId !== undefined
                    ? Number(reportClubId) === Number(clubId)
                    : true;

                // Kiểm tra nếu user là creator của report
                const currentUser = authService.getCurrentUser();
                const isCreator =
                  selectedReportDetail.createdBy?.id === currentUser?.id;

                // Ẩn các nút nếu đã quá hạn và báo cáo không được đánh dấu là đã nộp lại
                if (shouldHideButtons) {
                  return null;
                }

                // Tính toán điều kiện hiển thị cho Team_officer (chỉ khi là creator)
                const shouldShowForTeamOfficer =
                  !permissionsLoading &&
                  isRejectedClub &&
                  isTeamOfficer &&
                  isSameClub &&
                  isCreator;

                if (shouldShowForTeamOfficer) {
                  return (
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button
                        onClick={() => {
                          // Set up edit dialog for resubmission
                          setDraftTitle(selectedReportDetail.reportTitle);
                          setDraftContent(selectedReportDetail.content || "");
                          setDraftFileUrl(selectedReportDetail.fileUrl || "");
                          setDraftFile(null);
                          setEditingReportId(selectedReportDetail.id);
                          setIsResubmitMode(true);
                          // Find the request for this report
                          const requirementId =
                            selectedReportDetail.reportRequirement?.id;
                          if (requirementId) {
                            const request = reportRequests.find(
                              (r) => r.request_id === requirementId.toString()
                            );
                            if (request) {
                              setSelectedRequest(request);
                            }
                          }
                          setShowDetailModal(false);
                          setShowEditDialog(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Sửa lại
                      </Button>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Action buttons for REJECTED_UNIVERSITY status when user is creator */}
              {(() => {
                // Kiểm tra nếu đã quá hạn và báo cáo không được đánh dấu là đã nộp lại
                const reportRequirement = selectedReportDetail.reportRequirement;
                const deadline = reportRequirement?.dueDate;
                const isDeadlinePassed = deadline
                  ? new Date(deadline) < new Date()
                  : false;
                const shouldHideButtons =
                  isDeadlinePassed &&
                  selectedReportDetail &&
                  selectedReportDetail.mustResubmit !== true;

                const rawStatus = selectedReportDetail.status || "";
                const reportStatus = rawStatus.toUpperCase().trim();
                const isRejectedUniversity = reportStatus === "REJECTED_UNIVERSITY";

                const reportClubId = selectedReportDetail.club?.id;
                const isSameClub =
                  reportClubId !== undefined && clubId !== undefined
                    ? Number(reportClubId) === Number(clubId)
                    : true;

                // Kiểm tra nếu user là creator của report
                const currentUser = authService.getCurrentUser();
                const isCreator =
                  selectedReportDetail.createdBy?.id === currentUser?.id;

                // Ẩn các nút nếu đã quá hạn và báo cáo không được đánh dấu là đã nộp lại
                if (shouldHideButtons) {
                  return null;
                }

                // Nếu là creator và là club officer
                const shouldShowForClubOfficer =
                  !permissionsLoading &&
                  isRejectedUniversity &&
                  isClubPresident &&
                  isSameClub &&
                  isCreator;

                // Nếu là creator và là team officer
                const shouldShowForTeamOfficer =
                  !permissionsLoading &&
                  isRejectedUniversity &&
                  isTeamOfficer &&
                  isSameClub &&
                  isCreator;

                if (shouldShowForClubOfficer) {
                  // Club officer: hiển thị nút "Chỉnh sửa"
                  return (
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Set up edit dialog for resubmission to university
                          setDraftTitle(selectedReportDetail.reportTitle);
                          setDraftContent(selectedReportDetail.content || "");
                          setDraftFileUrl(selectedReportDetail.fileUrl || "");
                          setDraftFile(null);
                          setEditingReportId(selectedReportDetail.id);
                          setIsResubmitMode(true);
                          // Find the request for this report
                          const requirementId =
                            selectedReportDetail.reportRequirement?.id;
                          if (requirementId) {
                            const request = reportRequests.find(
                              (r) => r.request_id === requirementId.toString()
                            );
                            if (request) {
                              setSelectedRequest(request);
                            }
                          }
                          setShowDetailModal(false);
                          setShowEditDialog(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </Button>
                    </div>
                  );
                }

                if (shouldShowForTeamOfficer) {
                  // Team officer: hiển thị nút "Chỉnh sửa" và "Hủy"
                  return (
                    <div className="flex gap-2 justify-end pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDetailModal(false);
                        }}
                        className="bg-transparent"
                      >
                        Hủy
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Set up edit dialog for resubmission to club
                          setDraftTitle(selectedReportDetail.reportTitle);
                          setDraftContent(selectedReportDetail.content || "");
                          setDraftFileUrl(selectedReportDetail.fileUrl || "");
                          setDraftFile(null);
                          setEditingReportId(selectedReportDetail.id);
                          setIsResubmitMode(true);
                          // Find the request for this report
                          const requirementId =
                            selectedReportDetail.reportRequirement?.id;
                          if (requirementId) {
                            const request = reportRequests.find(
                              (r) => r.request_id === requirementId.toString()
                            );
                            if (request) {
                              setSelectedRequest(request);
                            }
                          }
                          setShowDetailModal(false);
                          setShowEditDialog(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </Button>
                    </div>
                  );
                }

                return null;
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && selectedReportDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Từ chối báo cáo</CardTitle>
              <CardDescription>
                Vui lòng nhập lý do từ chối báo cáo này
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Lý do từ chối</Label>
                <Textarea
                  placeholder="Nhập lý do từ chối..."
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectReason("");
                  }}
                  disabled={rejectingReport}
                >
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!selectedReportDetail.id) {
                      toast.error("Không tìm thấy thông tin báo cáo");
                      return;
                    }

                    if (!rejectReason.trim()) {
                      toast.error("Vui lòng nhập lý do từ chối");
                      return;
                    }

                    try {
                      setRejectingReport(true);
                      const reviewRequest: ReviewReportByClubRequest = {
                        reportId: selectedReportDetail.id,
                        status: "REJECTED_CLUB",
                        reviewerFeedback: rejectReason.trim(),
                      };

                      await reviewReportByClub(reviewRequest);
                      toast.success("Báo cáo đã bị từ chối");
                      setShowRejectDialog(false);
                      setShowDetailModal(false);
                      setSelectedReportDetail(null);
                      setRejectReason("");

                      // Refresh report requirements to update status
                      if (clubId && activeTab === "requests") {
                        const requirements =
                          await getClubReportRequirementsForOfficer(clubId);
                        const mappedRequests: ReportRequest[] =
                          requirements.map((req) =>
                            mapRequirementToReportRequest(req)
                          );
                        setReportRequests(mappedRequests);
                      }
                    } catch (err) {
                      console.error("Error rejecting report:", err);
                      const errorMessage =
                        err instanceof Error
                          ? err.message
                          : "Không thể từ chối báo cáo";
                      toast.error(errorMessage);
                    } finally {
                      setRejectingReport(false);
                    }
                  }}
                  disabled={rejectingReport || !rejectReason.trim()}
                >
                  {rejectingReport ? "Đang xử lý..." : "Xác nhận từ chối"}
                </Button>
              </div>
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
              <div className="mt-4">
                <Label>Tiêu đề báo cáo</Label>
                <Input
                  placeholder="Nhập tiêu đề báo cáo"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Nội dung chi tiết</Label>
                <Textarea
                  placeholder="Nhập nội dung chi tiết của báo cáo..."
                  rows={8}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>
                  Tệp đính kèm <span className="text-red-500">*</span>
                </Label>
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
                      onClick={() => {
                        setDraftFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
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
                          <p className="font-medium">
                            Kéo thả tệp hoặc nhấp để chọn
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Một file hoặc một tệp zip (tối đa 50MB)
                          </p>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error(
                                "File vượt quá kích thước tối đa 50MB"
                              );
                              e.target.value = "";
                              return;
                            }
                            // Kiểm tra là file hoặc zip
                            const fileName = file.name.toLowerCase();
                            const isZip = fileName.endsWith(".zip");
                            const isValidFile =
                              fileName.endsWith(".pdf") ||
                              fileName.endsWith(".doc") ||
                              fileName.endsWith(".docx") ||
                              fileName.endsWith(".xls") ||
                              fileName.endsWith(".xlsx") ||
                              fileName.endsWith(".ppt") ||
                              fileName.endsWith(".pptx") ||
                              fileName.endsWith(".txt") ||
                              fileName.endsWith(".jpg") ||
                              fileName.endsWith(".jpeg") ||
                              fileName.endsWith(".png") ||
                              isZip;

                            if (!isValidFile) {
                              toast.error(
                                "Vui lòng chọn một file hợp lệ hoặc một tệp zip"
                              );
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
                    setDraftTitle("");
                    setDraftContent("");
                    setDraftFileUrl("");
                  }}
                  className="bg-transparent"
                  disabled={savingDraft || submittingReport}
                >
                  Hủy
                </Button>
                {/* Nếu là club_officer, hiển thị 2 nút: Lưu và Nộp lên trường */}
                {isClubPresident ? (
                  <>
                <Button
                      onClick={async () => {
                        if (!draftTitle.trim() || !draftContent.trim()) {
                          toast.error(
                            "Vui lòng điền đầy đủ tiêu đề và nội dung"
                          );
                          return;
                        }

                        // File là bắt buộc
                        if (!draftFile && !draftFileUrl) {
                          toast.error("Vui lòng chọn file đính kèm");
                          return;
                        }

                        if (!clubId) {
                          toast.error("Không tìm thấy thông tin câu lạc bộ");
                          return;
                        }

                        try {
                          setSavingDraft(true);

                          let finalFileUrl = draftFileUrl;

                          // Nếu có file mới được chọn, upload file lên Cloudinary trước
                          if (draftFile) {
                            try {
                              const formData = new FormData();
                              formData.append("file", draftFile);

                              interface UploadResult {
                                url: string;
                                publicId: string;
                                format: string;
                                bytes: number;
                              }

                              const uploadResponse =
                                await axiosClient.post<UploadResult>(
                                  "/uploads/file",
                                  formData,
                                  {
                                    headers: {
                                      "Content-Type": "multipart/form-data",
                                    },
                                    timeout: 60000,
                                  }
                                );

                              if (
                                uploadResponse.code === 200 &&
                                uploadResponse.data &&
                                uploadResponse.data.url
                              ) {
                                finalFileUrl = uploadResponse.data.url;
                                toast.success(
                                  "File đã được tải lên thành công"
                                );
                              } else {
                                throw new Error(
                                  uploadResponse.message ||
                                    "Upload file failed: No URL returned"
                                );
                              }
                            } catch (err) {
                              console.error("Error uploading file:", err);
                              const errorMessage =
                                err instanceof Error
                                  ? err.message
                                  : "Không thể tải lên file";
                              toast.error(`Lỗi khi tải file: ${errorMessage}`);
                            }
                          }

                          if (editingReportId) {
                            // Update existing report
                            const updateRequest: UpdateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: finalFileUrl || undefined,
                            };

                            await updateReport(editingReportId, updateRequest);
                            toast.success(
                              "Báo cáo đã được cập nhật thành công"
                            );
                          } else {
                            // Create new report with autoSubmit=true (PENDING_CLUB - chờ CLB duyệt)
                            const createRequest: CreateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: finalFileUrl || undefined,
                              clubId: clubId,
                              reportRequirementId: Number(
                                selectedRequest.request_id
                              ),
                              autoSubmit: true, // Tạo với status PENDING_CLUB (chờ CLB duyệt)
                            };

                            const createdReport = await createReport(
                              createRequest,
                              draftFile || undefined
                            );
                            setEditingReportId(createdReport.id);
                            toast.success(
                              "Báo cáo đã được lưu với trạng thái chờ CLB duyệt"
                            );
                            setDraftFile(null);
                          }

                          setShowSubmitDialog(false);
                          setEditingReportId(null);
                          setDraftFile(null);
                          setDraftTitle("");
                          setDraftContent("");
                          setDraftFileUrl("");

                          // Refresh data
                          if (clubId && activeTab === "requests") {
                            const requirements =
                              await getClubReportRequirementsForOfficer(clubId);
                            const mappedRequests: ReportRequest[] =
                              requirements.map((req) =>
                                mapRequirementToReportRequest(req)
                              );
                            setReportRequests(mappedRequests);
                          }
                        } catch (err) {
                          console.error("Error saving report:", err);
                          const errorMessage =
                            err instanceof Error
                              ? err.message
                              : "Không thể lưu báo cáo";
                          toast.error(errorMessage);
                        } finally {
                          setSavingDraft(false);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={savingDraft || submittingReport}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {savingDraft ? "Đang lưu..." : "Lưu"}
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!draftTitle.trim() || !draftContent.trim()) {
                          toast.error(
                            "Vui lòng điền đầy đủ tiêu đề và nội dung"
                          );
                          return;
                        }

                        // File là bắt buộc
                        if (!draftFile && !draftFileUrl) {
                          toast.error("Vui lòng chọn file đính kèm");
                          return;
                        }

                        if (!clubId) {
                          toast.error("Không tìm thấy thông tin câu lạc bộ");
                          return;
                        }

                        try {
                          setSubmittingReport(true);

                          let finalFileUrl = draftFileUrl;

                          // Nếu có file mới được chọn, upload file lên Cloudinary trước
                          if (draftFile) {
                            try {
                              const formData = new FormData();
                              formData.append("file", draftFile);

                              interface UploadResult {
                                url: string;
                                publicId: string;
                                format: string;
                                bytes: number;
                              }

                              const uploadResponse =
                                await axiosClient.post<UploadResult>(
                                  "/uploads/file",
                                  formData,
                                  {
                                    headers: {
                                      "Content-Type": "multipart/form-data",
                                    },
                                    timeout: 60000,
                                  }
                                );

                              if (
                                uploadResponse.code === 200 &&
                                uploadResponse.data &&
                                uploadResponse.data.url
                              ) {
                                finalFileUrl = uploadResponse.data.url;
                                toast.success(
                                  "File đã được tải lên thành công"
                                );
                              } else {
                                throw new Error(
                                  uploadResponse.message ||
                                    "Upload file failed: No URL returned"
                                );
                              }
                            } catch (err) {
                              console.error("Error uploading file:", err);
                              const errorMessage =
                                err instanceof Error
                                  ? err.message
                                  : "Không thể tải lên file";
                              toast.error(`Lỗi khi tải file: ${errorMessage}`);
                            }
                          }

                          let reportIdToSubmit = editingReportId;

                          // Nếu chưa có report, tạo mới với autoSubmit=true (PENDING_CLUB)
                          if (!reportIdToSubmit) {
                            const createRequest: CreateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: finalFileUrl || undefined,
                              clubId: clubId,
                              reportRequirementId: Number(
                                selectedRequest.request_id
                              ),
                              autoSubmit: true, // Tạo với status PENDING_CLUB (chờ CLB duyệt)
                            };

                            const createdReport = await createReport(
                              createRequest,
                              draftFile || undefined
                            );
                            reportIdToSubmit = createdReport.id;
                            setEditingReportId(reportIdToSubmit);
                            setDraftFile(null);
                          } else {
                            // Update existing report trước khi submit
                            const updateRequest: UpdateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: finalFileUrl || undefined,
                            };
                            await updateReport(reportIdToSubmit, updateRequest);
                          }

                          // Nếu report đang ở trạng thái DRAFT, submit nó
                          // Nếu đã ở PENDING_CLUB, không cần submit lại
                          const currentReport =
                            await getClubReportByRequirementForOfficer(
                              Number(selectedRequest.request_id),
                              clubId
                            );

                          if (
                            currentReport &&
                            currentReport.status === "DRAFT"
                          ) {
                            const submitRequest: SubmitReportRequest = {
                              reportId: reportIdToSubmit,
                            };
                            await submitReport(submitRequest);
                          }

                          toast.success(
                            "Báo cáo đã được nộp lên trường thành công"
                          );
                          setShowSubmitDialog(false);
                          setEditingReportId(null);
                          setDraftFile(null);
                          setDraftTitle("");
                          setDraftContent("");
                          setDraftFileUrl("");

                          // Refresh data
                          if (clubId && activeTab === "requests") {
                            const requirements =
                              await getClubReportRequirementsForOfficer(clubId);
                            const mappedRequests: ReportRequest[] =
                              requirements.map((req) =>
                                mapRequirementToReportRequest(req)
                              );
                            setReportRequests(mappedRequests);
                          }
                        } catch (err) {
                          console.error("Error submitting report:", err);
                          const errorMessage =
                            err instanceof Error
                              ? err.message
                              : "Không thể nộp báo cáo";
                          toast.error(errorMessage);
                        } finally {
                          setSubmittingReport(false);
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={savingDraft || submittingReport}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {submittingReport ? "Đang nộp..." : "Nộp lên trường"}
                    </Button>
                  </>
                ) : (
                  /* Nếu là team_officer, hiển thị nút Lưu bản nháp như cũ */
                  <>
                    <Button
                      onClick={() =>
                        handleSaveDraft(selectedRequest.request_id)
                      }
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={savingDraft || submittingReport}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {savingDraft
                    ? "Đang lưu..."
                    : editingReportId
                    ? "Cập nhật"
                    : "Lưu bản nháp"}
                </Button>
                <Button
                  onClick={async () => {
                    if (!draftTitle.trim() || !draftContent.trim()) {
                          toast.error(
                            "Vui lòng điền đầy đủ tiêu đề và nội dung"
                          );
                      return;
                    }

                    // File là bắt buộc
                    if (!draftFile) {
                      toast.error("Vui lòng chọn file đính kèm");
                      return;
                    }

                    if (!clubId) {
                      toast.error("Không tìm thấy thông tin câu lạc bộ");
                      return;
                    }

                    try {
                      setSubmittingReport(true);

                      let reportIdToSubmit = editingReportId;

                      // Nếu chưa có draft, tạo mới trước
                      if (!reportIdToSubmit) {
                        const createRequest: CreateReportRequest = {
                          reportTitle: draftTitle,
                          content: draftContent,
                          fileUrl: draftFileUrl || undefined,
                          clubId: clubId,
                          reportRequirementId: Number(
                            selectedRequest.request_id
                          ),
                          autoSubmit: false, // Tạo draft trước, sau đó submit
                        };

                        const createdReport = await createReport(
                          createRequest,
                          draftFile || undefined
                        );
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
                        const requirements =
                          await getClubReportRequirementsForOfficer(clubId);
                        const mappedRequests: ReportRequest[] =
                          requirements.map((req) =>
                            mapRequirementToReportRequest(req)
                          );
                        setReportRequests(mappedRequests);
                      }
                    } catch (err) {
                      console.error("Error submitting report:", err);
                      const errorMessage =
                        err instanceof Error
                          ? err.message
                          : "Không thể nộp báo cáo";
                      toast.error(errorMessage);
                    } finally {
                      setSubmittingReport(false);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={savingDraft || submittingReport}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {submittingReport ? "Đang nộp..." : "Nộp báo cáo"}
                </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showEditDialog && (selectedSubmission || selectedReportDetail) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {isResubmitMode ? "Sửa lại báo cáo" : "Chỉnh sửa bản nháp"}
              </CardTitle>
              <CardDescription>
                {isResubmitMode
                  ? "Cập nhật nội dung báo cáo và nộp lại để phê duyệt"
                  : "Cập nhật nội dung báo cáo trước khi gửi phê duyệt"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mt-4">
                <Label>Tiêu đề báo cáo</Label>
                <Input
                  placeholder="Nhập tiêu đề báo cáo"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Nội dung chi tiết</Label>
                <Textarea
                  placeholder="Nhập nội dung chi tiết của báo cáo..."
                  rows={8}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>
                  Tệp đính kèm <span className="text-red-500">*</span>
                </Label>
                {draftFile || draftFileUrl ? (
                  <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md mt-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {draftFile ? draftFile.name : "File đã tải lên"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {draftFile ? (
                            `${(draftFile.size / 1024 / 1024).toFixed(2)} MB`
                          ) : (
                            <a
                              href={draftFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Xem file
                            </a>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDraftFile(null);
                        setDraftFileUrl("");
                        if (editFileInputRef.current) {
                          editFileInputRef.current.value = "";
                        }
                      }}
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
                          <p className="font-medium">
                            Kéo thả tệp hoặc nhấp để chọn
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Một file hoặc một tệp zip (tối đa 50MB)
                          </p>
                        </div>
                      </div>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error(
                                "File vượt quá kích thước tối đa 50MB"
                              );
                              e.target.value = "";
                              return;
                            }
                            // Kiểm tra là file hoặc zip
                            const fileName = file.name.toLowerCase();
                            const isZip = fileName.endsWith(".zip");
                            const isValidFile =
                              fileName.endsWith(".pdf") ||
                              fileName.endsWith(".doc") ||
                              fileName.endsWith(".docx") ||
                              fileName.endsWith(".xls") ||
                              fileName.endsWith(".xlsx") ||
                              fileName.endsWith(".ppt") ||
                              fileName.endsWith(".pptx") ||
                              fileName.endsWith(".txt") ||
                              fileName.endsWith(".jpg") ||
                              fileName.endsWith(".jpeg") ||
                              fileName.endsWith(".png") ||
                              isZip;

                            if (!isValidFile) {
                              toast.error(
                                "Vui lòng chọn một file hợp lệ hoặc một tệp zip"
                              );
                              e.target.value = "";
                              return;
                            }

                            setDraftFile(file);
                            // Xóa fileUrl cũ khi chọn file mới
                            setDraftFileUrl("");
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
                    setIsResubmitMode(false);
                  }}
                  className="bg-transparent"
                  disabled={
                    savingDraft || submittingReport || resubmittingReport
                  }
                >
                  Hủy
                </Button>
                {isResubmitMode ? (
                  // Resubmit mode: Show "Nộp lại" or "Nộp lại lên trường" or "Nộp lại lên câu lạc bộ" button
                  (() => {
                    // Kiểm tra xem đang resubmit từ REJECTED_UNIVERSITY hay không
                    const isResubmitFromUniversity =
                      selectedReportDetail?.status?.toUpperCase() ===
                      "REJECTED_UNIVERSITY";
                    const isClubOfficerResubmit =
                      isResubmitFromUniversity && isClubPresident;
                    const isTeamOfficerResubmitFromUniversity =
                      isResubmitFromUniversity && isTeamOfficer;

                    return (
                  <Button
                    onClick={async () => {
                      if (!draftTitle.trim() || !draftContent.trim()) {
                        toast.error("Vui lòng điền đầy đủ tiêu đề và nội dung");
                        return;
                      }

                      // File is required
                      if (!draftFile && !draftFileUrl) {
                        toast.error("Vui lòng chọn file đính kèm");
                        return;
                      }

                      if (!editingReportId) {
                        toast.error("Không tìm thấy thông tin báo cáo");
                        return;
                      }

                      try {
                        setResubmittingReport(true);

                        let finalFileUrl = draftFileUrl;

                        // If a new file is selected, upload it to Cloudinary first
                        if (draftFile) {
                          try {
                            const formData = new FormData();
                            formData.append("file", draftFile);

                            interface UploadResult {
                              url: string;
                              publicId: string;
                              format: string;
                              bytes: number;
                            }

                            const uploadResponse =
                              await axiosClient.post<UploadResult>(
                                "/uploads/file",
                                formData,
                                {
                                  headers: {
                                    "Content-Type": "multipart/form-data",
                                  },
                                  timeout: 60000,
                                }
                              );

                            if (
                              uploadResponse.code === 200 &&
                              uploadResponse.data &&
                              uploadResponse.data.url
                            ) {
                              finalFileUrl = uploadResponse.data.url;
                              toast.success("File đã được tải lên thành công");
                            } else {
                              throw new Error(
                                uploadResponse.message ||
                                  "Upload file failed: No URL returned"
                              );
                            }
                          } catch (err) {
                            console.error("Error uploading file:", err);
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Không thể tải lên file";
                            toast.error(`Lỗi khi tải file: ${errorMessage}`);
                            return;
                          }
                        }

                              // Update the report (this will also reset reviewerFeedback if backend handles it)
                        const updateRequest: UpdateReportRequest = {
                          reportTitle: draftTitle,
                          content: draftContent,
                          fileUrl: finalFileUrl || undefined,
                        };

                        await updateReport(editingReportId, updateRequest);

                        // Submit the report (resubmit)
                              // If resubmitting from REJECTED_UNIVERSITY, it will go to RESUBMITTED_UNIVERSITY
                              // If resubmitting from REJECTED_CLUB, it will go to UPDATED_PENDING_CLUB
                        const submitRequest: SubmitReportRequest = {
                          reportId: editingReportId,
                        };
                        await submitReport(submitRequest);

                              if (isClubOfficerResubmit) {
                                toast.success("Báo cáo đã được nộp lại lên trường thành công");
                              } else if (isTeamOfficerResubmitFromUniversity) {
                                toast.success("Báo cáo đã được nộp lại lên câu lạc bộ thành công");
                              } else {
                                toast.success("Báo cáo đã được nộp lại thành công");
                              }
                        setShowEditDialog(false);
                        setEditingReportId(null);
                        setDraftFile(null);
                        setIsResubmitMode(false);

                        // Refresh data
                        if (clubId && activeTab === "requests") {
                          const requirements =
                            await getClubReportRequirementsForOfficer(clubId);
                          const mappedRequests: ReportRequest[] =
                            requirements.map((req) =>
                              mapRequirementToReportRequest(req)
                            );
                          setReportRequests(mappedRequests);
                        }
                      } catch (err) {
                        console.error("Error resubmitting report:", err);
                        const errorMessage =
                          err instanceof Error
                            ? err.message
                            : "Không thể nộp lại báo cáo";
                        toast.error(errorMessage);
                      } finally {
                        setResubmittingReport(false);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={
                      savingDraft || submittingReport || resubmittingReport
                    }
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                          {resubmittingReport
                            ? "Đang nộp..."
                            : isClubOfficerResubmit
                            ? "Nộp lại lên trường"
                            : isTeamOfficerResubmitFromUniversity
                            ? "Nộp lại lên câu lạc bộ"
                            : "Nộp lại"}
                  </Button>
                    );
                  })()
                ) : (
                  // Normal edit mode: Show "Lưu thay đổi" and "Nộp báo cáo" buttons
                  <>
                    <Button
                      onClick={async () => {
                        // Lấy requestId từ selectedRequest hoặc selectedReportDetail
                        let requestId: string | undefined;
                        if (selectedRequest) {
                          requestId = selectedRequest.request_id;
                        } else if (
                          selectedReportDetail?.reportRequirement?.id
                        ) {
                          requestId =
                            selectedReportDetail.reportRequirement.id.toString();
                        }
                        await handleSaveDraft(requestId);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={savingDraft || submittingReport}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {savingDraft ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                    {editingReportId && (
                      <Button
                        onClick={async () => {
                          try {
                            setSubmittingReport(true);
                            const submitRequest: SubmitReportRequest = {
                              reportId: editingReportId,
                            };
                            await submitReport(submitRequest);
                            toast.success("Báo cáo đã được nộp thành công");
                            setShowEditDialog(false);
                            setEditingReportId(null);
                            setIsResubmitMode(false);

                            // Refresh data
                            if (clubId && activeTab === "requests") {
                              const requirements =
                                await getClubReportRequirementsForOfficer(
                                  clubId
                                );
                              const mappedRequests: ReportRequest[] =
                                requirements.map((req) =>
                                  mapRequirementToReportRequest(req)
                                );
                              setReportRequests(mappedRequests);
                            }
                          } catch (err) {
                            console.error("Error submitting report:", err);
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Không thể nộp báo cáo";
                            toast.error(errorMessage);
                          } finally {
                            setSubmittingReport(false);
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={savingDraft || submittingReport}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {submittingReport ? "Đang nộp..." : "Nộp báo cáo"}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
