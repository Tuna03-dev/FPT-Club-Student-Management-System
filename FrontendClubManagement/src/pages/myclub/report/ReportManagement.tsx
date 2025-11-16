import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import {
  getClubReportRequirementsForOfficer,
  getClubReportRequirementsForOfficerWithFilters,
  getClubReportByRequirementForOfficer,
  createReport,
  updateReport,
  submitReport,
  deleteReport,
  reviewReportByClub,
  getClubReports,
  getMyReports,
  getClubReportDetail,
  assignTeamToReportRequirement,
  type CreateReportRequest,
  type UpdateReportRequest,
  type SubmitReportRequest,
  type ReviewReportByClubRequest,
  type ClubReportRequirementFilterRequest,
} from "@/services/reportService";
import {
  mapBackendToFrontendReportType,
  type ReportDetailResponse,
} from "@/types/dto/reportRequirement.dto";
import { toast } from "sonner";
import { useClubPermissions } from "@/hooks/useClubPermissions";
import { authService } from "@/services/authService";
import { useTeams } from "@/hooks/useTeams";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Skeleton from "@/components/common/Skeleton";
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
  Edit,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportListItemResponse } from "@/types/dto/reportRequirement.dto";
import { clubService, type SemesterDTO } from "@/services/clubService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ReportType = "periodic" | "post_event";
type ReportStatusFilter =
  | "OVERDUE"
  | "UNSUBMITTED"
  | "DRAFT"
  | "PENDING_CLUB"
  | "APPROVED_CLUB"
  | "REJECTED_CLUB"
  | "UPDATED_PENDING_CLUB"
  | "PENDING_UNIVERSITY"
  | "APPROVED_UNIVERSITY"
  | "REJECTED_UNIVERSITY"
  | "RESUBMITTED_UNIVERSITY";

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
  teamId?: number | null; // Team ID assigned to this requirement
  report?: {
    id: number;
    reportTitle: string;
    status?: string;
    submittedDate?: string;
    createdAt: string;
    updatedAt: string;
    mustResubmit?: boolean;
    createdBy?: {
      id: number;
      fullName: string;
      email: string;
      studentCode?: string;
    };
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

// Status labels for ClubReportRequirementStatus
// This maps the ReportStatus from backend when report exists, or null when no report
// Backend returns report.status in clubRequirement.status if report exists
const requirementStatusLabels: Record<string, string> = {
  // When status is null (no report exists)
  UNSUBMITTED: "Chưa nộp",
  // ReportStatus enum values from backend
  DRAFT: "Bản nháp",
  PENDING_CLUB: "Chờ phê duyệt từ CLB",
  APPROVED_CLUB: "Đã duyệt từ CLB",
  REJECTED_CLUB: "Bị từ chối từ CLB",
  UPDATED_PENDING_CLUB: "Đã cập nhật - Chờ phê duyệt từ CLB",
  PENDING_UNIVERSITY: "Chờ phê duyệt từ nhà trường",
  APPROVED_UNIVERSITY: "Đã duyệt từ nhà trường",
  REJECTED_UNIVERSITY: "Bị từ chối từ nhà trường",
  RESUBMITTED_UNIVERSITY: "Đã nộp lại lên nhà trường",
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

// Ordered list of report statuses for dropdown filter
const reportStatusFilterOptions: ReportStatusFilter[] = [
  "OVERDUE",
  "UNSUBMITTED",
  "DRAFT",
  "PENDING_CLUB",
  "APPROVED_CLUB",
  "REJECTED_CLUB",
  "UPDATED_PENDING_CLUB",
  "PENDING_UNIVERSITY",
  "APPROVED_UNIVERSITY",
  "REJECTED_UNIVERSITY",
  "RESUBMITTED_UNIVERSITY",
];

// Status labels for filter dropdown (includes UNSUBMITTED and OVERDUE)
const reportStatusFilterLabels: Record<ReportStatusFilter, string> = {
  OVERDUE: "Quá hạn",
  UNSUBMITTED: "Chưa nộp",
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

export function ClubReportManagement() {
  const params = useParams();
  const clubIdParam = params.clubId;
  const clubId = clubIdParam ? Number(clubIdParam) : undefined;
  const {
    isClubOfficer,
    isTeamOfficer,
    loading: permissionsLoading,
  } = useClubPermissions(clubId);

  // Get teams for club officer to assign
  const { data: teams, loading: teamsLoading } = useTeams(clubId);

  // Get current user's team ID if team officer
  const currentUserTeamId = useMemo(() => {
    if (!isTeamOfficer || !teams || teams.length === 0) return null;
    // Get the first team where user is an officer
    const userTeam = teams.find(
      (team) => team.myRoles && team.myRoles.length > 0
    );
    return userTeam?.teamId || null;
  }, [isTeamOfficer, teams]);

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
          createdBy: clubRequirement.report.createdBy,
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
      teamId: clubRequirement?.teamId || null,
    };
  };

  const [activeTab, setActiveTab] = useState<
    "requests" | "my_reports" | "club_reports"
  >("requests");
  const [selectedRequest, setSelectedRequest] = useState<ReportRequest | null>(
    null
  );
  const [selectedSubmission] = useState<ReportSubmission | null>(null);
  const [selectedReportDetail, setSelectedReportDetail] =
    useState<ReportDetailResponse | null>(null);
  const [loadingReportDetailId, setLoadingReportDetailId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter | "all">(
    "all"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(9); // 3 columns x 3 rows = 9 items per page
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
  const [semesters, setSemesters] = useState<SemesterDTO[]>([]);
  const [, setLoadingSemesters] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [, setTotalElements] = useState(0);
  const [, setHasNext] = useState(false);
  const [, setHasPrevious] = useState(false);

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
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

  // State for assign team modal
  const [showAssignTeamModal, setShowAssignTeamModal] = useState(false);
  const [selectedRequirementForAssign, setSelectedRequirementForAssign] =
    useState<ReportRequest | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [assigningTeam, setAssigningTeam] = useState(false);

  // Fetch semesters from API
  useEffect(() => {
    const fetchSemesters = async () => {
      if (!clubId) {
        return;
      }

      try {
        setLoadingSemesters(true);
        const response = await clubService.getSemesters(clubId);
        if (response.data) {
          setSemesters(response.data);
        }
      } catch (err) {
        console.error("Error fetching semesters:", err);
        // Don't show error toast for semesters as it's not critical
      } finally {
        setLoadingSemesters(false);
      }
    };

    fetchSemesters();
  }, [clubId]);

  // Fetch report requirements from API with filters and pagination
  useEffect(() => {
    const fetchReportRequirements = async () => {
      if (!clubId || activeTab !== "requests") {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Build filter request
        const filterRequest: ClubReportRequirementFilterRequest = {
          page: currentPage,
          size: pageSize,
          sort: ["createdAt,desc"],
          keyword: debouncedSearchQuery || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          semesterId:
            semesterFilter !== "all" ? Number(semesterFilter) : undefined,
          // Backend will automatically filter by teamId for team officers
          // For club officers, teamId can be passed explicitly if needed
        };

        const response = await getClubReportRequirementsForOfficerWithFilters(
          clubId,
          filterRequest
        );

        // Map API response to ReportRequest format
        // Note: Backend already filters by teamId for team officers, so no need to filter here
        const mappedRequests: ReportRequest[] = response.content.map((req) =>
          mapRequirementToReportRequest(req)
        );

        setReportRequests(mappedRequests);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
        setHasNext(response.hasNext);
        setHasPrevious(response.hasPrevious);
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

    fetchReportRequirements();
  }, [
    clubId,
    activeTab,
    currentPage,
    pageSize,
    debouncedSearchQuery,
    statusFilter,
    semesterFilter,
  ]);

  // Fetch my reports when submissions tab is active
  useEffect(() => {
    const fetchMyReports = async () => {
      if (!clubId || activeTab !== "my_reports") return;

      try {
        setLoadingMyReports(true);
        // Try to get my reports, fallback to filtering club reports if API doesn't exist
        try {
          const reports = await getMyReports(clubId);
          setMyReports(reports);
        } catch (err) {
          // If API doesn't exist, get all club reports and filter by current user
          const allReports = await getClubReports(clubId);
          const currentUser = authService.getCurrentUser();
          if (currentUser?.id) {
            const filtered = allReports.filter(
              (report) => report.createdBy?.id === currentUser.id
            );
            setMyReports(filtered);
          } else {
            setMyReports([]);
          }
        }
      } catch (err) {
        console.error("Error fetching my reports:", err);
        toast.error("Không thể tải danh sách báo cáo của tôi");
        setMyReports([]);
      } finally {
        setLoadingMyReports(false);
      }
    };

    fetchMyReports();
  }, [clubId, activeTab]);

  // Fetch all club reports when approval tab is active (only for club officers)
  useEffect(() => {
    const fetchAllClubReports = async () => {
      if (!clubId || activeTab !== "club_reports" || !isClubOfficer) return;

      try {
        setLoadingAllClubReports(true);
        const reports = await getClubReports(clubId);
        setAllClubReports(reports);
      } catch (err) {
        console.error("Error fetching all club reports:", err);
        toast.error("Không thể tải danh sách báo cáo của câu lạc bộ");
        setAllClubReports([]);
      } finally {
        setLoadingAllClubReports(false);
      }
    };

    fetchAllClubReports();
  }, [clubId, activeTab, isClubOfficer]);

  // Helper function to refresh all tabs data after actions
  const refreshAllTabsData = async () => {
    if (!clubId) return;

    try {
      // Always refresh requests tab
      // Note: Backend already filters by teamId for team officers
      const requirements = await getClubReportRequirementsForOfficer(clubId);
      const mappedRequests: ReportRequest[] = requirements.map((req) =>
        mapRequirementToReportRequest(req)
      );

      setReportRequests(mappedRequests);

      // Always refresh submissions tab (my reports)
      try {
        const reports = await getMyReports(clubId);
        setMyReports(reports);
      } catch (err) {
        // If API doesn't exist, get all club reports and filter by current user
        const allReports = await getClubReports(clubId);
        const currentUser = authService.getCurrentUser();
        if (currentUser?.id) {
          const filtered = allReports.filter(
            (report) => report.createdBy?.id === currentUser.id
          );
          setMyReports(filtered);
        } else {
          setMyReports([]);
        }
      }

      // Always refresh approval tab (all club reports) if user is club president
      if (isClubOfficer) {
        const reports = await getClubReports(clubId);
        setAllClubReports(reports);
      }
    } catch (err) {
      console.error("Error refreshing tabs data:", err);
      // Don't show error toast here as it might be called multiple times
    }
  };

  // State for reports
  const [myReports, setMyReports] = useState<ReportListItemResponse[]>([]);
  const [allClubReports, setAllClubReports] = useState<
    ReportListItemResponse[]
  >([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);
  const [loadingAllClubReports, setLoadingAllClubReports] = useState(false);

  // Use semesters from API, sorted by startDate descending (most recent first)
  const availableSemesters = useMemo(() => {
    return [...semesters].sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateB.getTime() - dateA.getTime();
    });
  }, [semesters]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    if (activeTab === "requests") {
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery, semesterFilter, statusFilter, activeTab]);

  // Filter my reports
  const filteredMyReports = useMemo(() => {
    return myReports.filter((report) => {
      const matchesSearch =
        report.reportTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.content?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false);

      // Filter by semester
      if (semesterFilter !== "all") {
        if (
          !report.semester ||
          report.semester.id.toString() !== semesterFilter
        ) {
          return false;
        }
      }

      // Filter by status
      if (statusFilter !== "all") {
        // OVERDUE and UNSUBMITTED don't apply to reports tab (reports are already submitted)
        if (statusFilter === "OVERDUE" || statusFilter === "UNSUBMITTED") {
          return false;
        }
        const reportStatus = report.status?.toUpperCase();
        if (reportStatus !== statusFilter) {
          return false;
        }
      }

      return matchesSearch;
    });
  }, [myReports, searchQuery, statusFilter, semesterFilter]);

  // Filter all club reports
  const filteredAllClubReports = useMemo(() => {
    return allClubReports.filter((report) => {
      const matchesSearch =
        report.reportTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.content?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false);

      // Filter by semester
      if (semesterFilter !== "all") {
        if (
          !report.semester ||
          report.semester.id.toString() !== semesterFilter
        ) {
          return false;
        }
      }

      // Filter by status
      if (statusFilter !== "all") {
        // OVERDUE and UNSUBMITTED don't apply to reports tab (reports are already submitted)
        if (statusFilter === "OVERDUE" || statusFilter === "UNSUBMITTED") {
          return false;
        }
        const reportStatus = report.status?.toUpperCase();
        if (reportStatus !== statusFilter) {
          return false;
        }
      }

      return matchesSearch;
    });
  }, [allClubReports, searchQuery, statusFilter, semesterFilter]);

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

  const handleOpenAssignTeamModal = (request: ReportRequest) => {
    setSelectedRequirementForAssign(request);
    setSelectedTeamId(null);
    setShowAssignTeamModal(true);
  };

  const handleAssignTeam = async () => {
    if (!clubId || !selectedRequirementForAssign || !selectedTeamId) {
      toast.error("Vui lòng chọn phòng ban");
      return;
    }

    try {
      setAssigningTeam(true);

      // Find the actual club requirement ID from the API response
      // We need to get it from the original requirement data
      const requirement = await getClubReportRequirementsForOfficer(clubId);
      const clubRequirement = requirement.find(
        (r) => r.id.toString() === selectedRequirementForAssign.request_id
      )?.clubRequirements?.[0];

      if (!clubRequirement) {
        toast.error("Không tìm thấy yêu cầu báo cáo");
        return;
      }

      await assignTeamToReportRequirement(clubId, {
        clubReportRequirementId: clubRequirement.id,
        teamId: selectedTeamId,
      });

      toast.success("Đã gán báo cáo cho phòng ban thành công");
      setShowAssignTeamModal(false);
      setSelectedRequirementForAssign(null);
      setSelectedTeamId(null);

      // Refresh data
      await refreshAllTabsData();
    } catch (error: any) {
      console.error("Error assigning team:", error);
      toast.error(
        error?.response?.data?.message ||
          "Không thể gán báo cáo cho phòng ban. Vui lòng thử lại."
      );
    } finally {
      setAssigningTeam(false);
    }
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
        // Nếu có file mới, gửi file trực tiếp với API (backend sẽ xử lý upload)
        // Nếu không có file mới, giữ fileUrl cũ
        const updateRequest: UpdateReportRequest = {
          reportTitle: draftTitle,
          content: draftContent,
          fileUrl: draftFile ? undefined : draftFileUrl || undefined, // Chỉ dùng fileUrl cũ nếu không có file mới
        };

        await updateReport(
          editingReportId,
          updateRequest,
          draftFile || undefined
        );
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

      // Refresh all tabs data to update status
      await refreshAllTabsData();
    } catch (err) {
      console.error("Error saving draft:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Không thể lưu báo cáo";
      toast.error(errorMessage);
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="order-1 md:order-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Quản lý Báo cáo
              </h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Xem yêu cầu và nộp báo cáo lên nhà trường
              </p>
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-row gap-2 w-full md:w-auto order-2 md:order-2">
              <Button
                variant={activeTab === "requests" ? "default" : "outline"}
                onClick={() => setActiveTab("requests")}
                className={`
                  transition-all duration-300 ease-in-out w-full md:w-auto md:flex-none
                  ${
                    activeTab === "requests"
                      ? "bg-primary text-primary-foreground shadow-md md:scale-105 border-primary ring-2 ring-primary/30"
                      : "border-primary/30"
                  }
                `}
              >
                <FileText className="h-4 w-4 mr-2" />
                Yêu cầu nộp
              </Button>
              <Button
                variant={activeTab === "my_reports" ? "default" : "outline"}
                onClick={() => setActiveTab("my_reports")}
                className={`
                  transition-all duration-300 ease-in-out w-full md:w-auto md:flex-none
                  ${
                    activeTab === "my_reports"
                      ? "bg-primary text-primary-foreground shadow-md md:scale-105 border-primary ring-2 ring-primary/30"
                      : "border-primary/30"
                  }
                `}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Báo cáo của tôi
              </Button>
              {isClubOfficer && (
                <Button
                  variant={activeTab === "club_reports" ? "default" : "outline"}
                  onClick={() => setActiveTab("club_reports")}
                  className={`
                    transition-all duration-300 ease-in-out w-full md:w-auto md:flex-none
                    ${
                      activeTab === "club_reports"
                        ? "bg-primary text-primary-foreground shadow-md md:scale-105 border-primary ring-2 ring-primary/30"
                        : "border-primary/30"
                    }
                  `}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Báo cáo CLB
                </Button>
              )}
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
                    <SelectItem
                      key={semester.id}
                      value={semester.id.toString()}
                    >
                      {semester.semesterName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as ReportStatusFilter | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {reportStatusFilterOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {reportStatusFilterLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Loading State: show card skeletons */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: pageSize }).map((_, idx) => (
                  <Card
                    key={idx}
                    className="hover:shadow-lg transition-shadow animate-pulse"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Skeleton width={80} height={20} />
                            <Skeleton width={80} height={20} />
                          </div>
                          <CardTitle className="text-lg mb-1">
                            <Skeleton width="60%" height={18} />
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Skeleton width={120} height={12} />
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Skeleton width={140} height={12} />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground mb-2"></Label>
                          <ul className="text-sm space-y-1 ml-4">
                            <li className="list-disc text-muted-foreground">
                              <Skeleton width="100%" height={10} />
                            </li>
                            <li className="list-disc text-muted-foreground">
                              <Skeleton width="90%" height={10} />
                            </li>
                            <li className="list-disc text-muted-foreground">
                              <Skeleton width="80%" height={10} />
                            </li>
                          </ul>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Skeleton width={100} height={32} />
                          <Skeleton width={120} height={32} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportRequests.map((request) => {
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
                              {/* Badge "phải nộp lại" khi mustResubmit = true, nhưng ẩn khi status là PENDING_UNIVERSITY hoặc RESUBMITTED_UNIVERSITY */}
                              {request.report?.mustResubmit === true &&
                                request.status?.toUpperCase() !==
                                  "PENDING_UNIVERSITY" &&
                                request.status?.toUpperCase() !==
                                  "RESUBMITTED_UNIVERSITY" && (
                                  <Badge className="bg-orange-100 text-orange-700 border border-orange-300 font-semibold">
                                    Phải nộp lại lên trường
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

                          {/* Báo cáo đang chờ phê duyệt từ CLB */}
                          {(request.status === "PENDING_CLUB" ||
                            request.status === "UPDATED_PENDING_CLUB") &&
                            (isClubOfficer ? (
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                                <CheckCircle className="h-4 w-4 inline mr-2" />
                                Báo cáo đang chờ phê duyệt
                              </div>
                            ) : (
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                                <CheckCircle className="h-4 w-4 inline mr-2" />
                                Báo cáo đã được nộp và đang chờ phê duyệt từ CLB
                              </div>
                            ))}

                          {/* Báo cáo đã được CLB phê duyệt, đang chờ nhà trường */}
                          {request.status === "APPROVED_CLUB" &&
                            (isClubOfficer ? (
                              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                                <CheckCircle className="h-4 w-4 inline mr-2" />
                                Báo cáo đang chờ phê duyệt từ nhà trường
                              </div>
                            ) : (
                              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                                <CheckCircle className="h-4 w-4 inline mr-2" />
                                Báo cáo đã được CLB phê duyệt, đang chờ phê
                                duyệt từ nhà trường
                              </div>
                            ))}

                          {/* Báo cáo bị CLB từ chối */}
                          {request.status === "REJECTED_CLUB" &&
                            (isClubOfficer ? (
                              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                                <div className="flex items-center gap-2 mb-2">
                                  <XCircle className="h-4 w-4" />
                                  <span className="font-semibold">
                                    Báo cáo bị CLB từ chối.
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                                <div className="flex items-center gap-2 mb-2">
                                  <XCircle className="h-4 w-4" />
                                  <span className="font-semibold">
                                    Báo cáo bị CLB từ chối. Vui lòng kiểm tra và
                                    gửi lại.
                                  </span>
                                </div>
                              </div>
                            ))}

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

                          {/* Hiển thị thông báo khi báo cáo đã được giao cho phòng ban - chỉ hiển thị cho club officer hoặc team officer không phải team được gán */}
                          {request.teamId &&
                            (isClubOfficer ||
                              (isTeamOfficer &&
                                request.teamId !== currentUserTeamId)) && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                                <UserPlus className="h-4 w-4 inline mr-2" />
                                Báo cáo đã được giao cho phòng{" "}
                                {teams?.find((t) => t.teamId === request.teamId)
                                  ?.teamName || ""}
                              </div>
                            )}

                          {/* Hiển thị thông báo khi báo cáo ở trạng thái DRAFT và user không phải người tạo */}
                          {request.status === "DRAFT" &&
                            request.report?.createdBy &&
                            (() => {
                              const currentUser = authService.getCurrentUser();
                              const isCreator =
                                currentUser?.id ===
                                request.report?.createdBy?.id;
                              if (!isCreator) {
                                return (
                                  <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800">
                                    <FileText className="h-4 w-4 inline mr-2" />
                                    Người {request.report.createdBy.fullName} đã
                                    tạo báo cáo ở trạng thái bản nháp
                                  </div>
                                );
                              }
                              return null;
                            })()}

                          <div className="flex gap-2 pt-2 flex-wrap">
                            {/* Hiển thị button dựa trên trạng thái yêu cầu và thông tin báo cáo từ backend */}
                            {/* Nếu status là DRAFT, chỉ hiển thị nút xem cho người tạo */}
                            {request.status === "DRAFT" && request.report ? (
                              (() => {
                                const currentUser =
                                  authService.getCurrentUser();
                                const isCreator =
                                  currentUser?.id ===
                                  request.report?.createdBy?.id;
                                if (isCreator) {
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          setLoadingReportDetailId(
                                            request.request_id
                                          );
                                          const reportDetail =
                                            await getClubReportByRequirementForOfficer(
                                              Number(request.request_id),
                                              clubId!
                                            );
                                          if (reportDetail) {
                                            setSelectedReportDetail(
                                              reportDetail
                                            );
                                            setShowDetailModal(true);
                                          } else {
                                            toast.error(
                                              "Không tìm thấy báo cáo"
                                            );
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
                                        loadingReportDetailId ===
                                        request.request_id
                                      }
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      {loadingReportDetailId ===
                                      request.request_id
                                        ? "Đang tải..."
                                        : "Xem bản nháp"}
                                    </Button>
                                  );
                                }
                                return null;
                              })()
                            ) : request.report || // Nếu có report, hiển thị nút xem (luôn hiển thị, kể cả khi quá hạn)
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
                              // Hiển thị nút "Tạo báo cáo" nếu:
                              // - Chưa quá hạn VÀ
                              // - (Không có teamId HOẶC (có teamId VÀ user là team officer VÀ teamId của requirement = teamId của user))
                              !isDeadlineExp &&
                              (!request.teamId ||
                                (isTeamOfficer &&
                                  request.teamId === currentUserTeamId)) && (
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

                            {/* Nút "Giao báo cáo cho phòng ban" - chỉ hiển thị cho club officer, yêu cầu chưa có báo cáo và chưa được gán team */}
                            {isClubOfficer &&
                              !isDeadlineExp &&
                              (!request.report ||
                                request.status === "UNSUBMITTED" ||
                                request.status === null) &&
                              !request.teamId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenAssignTeamModal(request)
                                  }
                                  className="border-green-600 text-green-600 hover:bg-green-500"
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Giao báo cáo cho phòng ban
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

            {!loading && !error && reportRequests.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Không tìm thấy yêu cầu nào
                </p>
              </div>
            )}

            {/* Pagination */}
            {!loading &&
              !error &&
              reportRequests.length > 0 &&
              totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => {
                            setCurrentPage((prev) => Math.max(1, prev - 1));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {/* Show page numbers with ellipsis when needed */}
                      {(() => {
                        const pages: (number | "ellipsis")[] = [];

                        if (totalPages <= 7) {
                          // Show all pages if 7 or fewer
                          for (let i = 1; i <= totalPages; i++) {
                            pages.push(i);
                          }
                        } else {
                          // Always show first page
                          pages.push(1);

                          // Show ellipsis if current page is far from start
                          if (currentPage > 3) {
                            pages.push("ellipsis");
                          }

                          // Show pages around current (avoid duplicates with first/last)
                          const start = Math.max(2, currentPage - 1);
                          const end = Math.min(totalPages - 1, currentPage + 1);
                          for (let i = start; i <= end; i++) {
                            if (i !== 1 && i !== totalPages) {
                              pages.push(i);
                            }
                          }

                          // Show ellipsis if current page is far from end
                          if (currentPage < totalPages - 2) {
                            pages.push("ellipsis");
                          }

                          // Always show last page (if not already shown)
                          if (totalPages !== 1) {
                            pages.push(totalPages);
                          }
                        }

                        // Remove duplicates
                        const seen = new Set<number | string>();
                        const uniquePages: (number | "ellipsis")[] = [];
                        for (const item of pages) {
                          if (item === "ellipsis") {
                            // Only add ellipsis if not immediately after another ellipsis
                            if (
                              uniquePages[uniquePages.length - 1] !== "ellipsis"
                            ) {
                              uniquePages.push(item);
                            }
                          } else {
                            if (!seen.has(item)) {
                              seen.add(item);
                              uniquePages.push(item);
                            }
                          }
                        }

                        return uniquePages.map((item, index) => {
                          if (item === "ellipsis") {
                            return (
                              <PaginationItem key={`ellipsis-${index}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return (
                            <PaginationItem key={item}>
                              <PaginationLink
                                onClick={() => {
                                  setCurrentPage(item);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                }}
                                isActive={currentPage === item}
                                className="cursor-pointer"
                              >
                                {item}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        });
                      })()}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => {
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            );
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
          </div>
        )}

        {activeTab === "my_reports" && (
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
                    <SelectItem
                      key={semester.id}
                      value={semester.id.toString()}
                    >
                      {semester.semesterName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as ReportStatusFilter | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {reportStatusFilterOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {reportStatusFilterLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table for My Reports */}
            {loadingMyReports ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Tiêu đề</TableHead>
                      <TableHead className="w-[150px]">Ngày tạo</TableHead>
                      <TableHead className="w-[150px]">Ngày nộp</TableHead>
                      <TableHead className="w-[200px]">Người tạo</TableHead>

                      <TableHead className="w-[120px]">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell className="font-medium">
                          <Skeleton width="80%" height={12} />
                        </TableCell>

                        <TableCell>
                          <Skeleton width={80} height={12} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={80} height={12} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={120} height={12} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={80} height={12} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton width={60} height={28} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : filteredMyReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Không có báo cáo nào</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Tiêu đề</TableHead>
                      <TableHead className="w-[150px]">Ngày tạo</TableHead>
                      <TableHead className="w-[150px]">Ngày nộp</TableHead>
                      <TableHead className="w-[200px]">Người tạo</TableHead>
                      <TableHead className="w-[120px]">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMyReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <span
                            className="truncate block max-w-[250px]"
                            title={report.reportTitle}
                          >
                            {report.reportTitle}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {report.submittedDate
                              ? new Date(
                                  report.submittedDate
                                ).toLocaleDateString("vi-VN")
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {report.createdBy?.fullName || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              requirementStatusColors[report.status] ||
                              "bg-gray-100 text-gray-700"
                            }
                          >
                            {requirementStatusLabels[report.status] ||
                              report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  setLoadingReportDetailId(
                                    report.id.toString()
                                  );
                                  const reportDetail =
                                    await getClubReportDetail(
                                      report.id,
                                      clubId!
                                    );
                                  setSelectedReportDetail(reportDetail);
                                  setShowDetailModal(true);
                                } catch (error) {
                                  console.error(
                                    "Error fetching report detail:",
                                    error
                                  );
                                  toast.error("Không thể tải chi tiết báo cáo");
                                } finally {
                                  setLoadingReportDetailId(null);
                                }
                              }}
                              disabled={
                                loadingReportDetailId === report.id.toString()
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Xem
                            </Button>
                            {report.status === "DRAFT" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const reportDetail =
                                        await getClubReportDetail(
                                          report.id,
                                          clubId!
                                        );
                                      setSelectedReportDetail(reportDetail);
                                      setDraftTitle(reportDetail.reportTitle);
                                      setDraftContent(
                                        reportDetail.content || ""
                                      );
                                      setDraftFileUrl(
                                        reportDetail.fileUrl || ""
                                      );
                                      setEditingReportId(report.id);
                                      setShowEditDialog(true);
                                    } catch (error) {
                                      toast.error(
                                        "Không thể tải thông tin báo cáo"
                                      );
                                    }
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Sửa
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        "Bạn có chắc chắn muốn xóa báo cáo này?"
                                      )
                                    ) {
                                      try {
                                        setDeletingReport(true);
                                        await deleteReport(report.id);
                                        toast.success("Xóa báo cáo thành công");
                                        // Refresh list
                                        const reports = await getMyReports(
                                          clubId!
                                        );
                                        setMyReports(reports);
                                      } catch (error) {
                                        toast.error("Không thể xóa báo cáo");
                                      } finally {
                                        setDeletingReport(false);
                                      }
                                    }
                                  }}
                                  disabled={deletingReport}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Xóa
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {activeTab === "club_reports" && (
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
                    <SelectItem
                      key={semester.id}
                      value={semester.id.toString()}
                    >
                      {semester.semesterName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as ReportStatusFilter | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {reportStatusFilterOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {reportStatusFilterLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table for All Club Reports */}
            {loadingAllClubReports ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Tiêu đề</TableHead>
                      <TableHead className="w-[150px]">Ngày tạo</TableHead>
                      <TableHead className="w-[150px]">Ngày nộp</TableHead>
                      <TableHead className="w-[200px]">Người tạo</TableHead>

                      <TableHead className="w-[120px]">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell className="font-medium">
                          <Skeleton width="80%" height={12} />
                        </TableCell>

                        <TableCell>
                          <Skeleton width={80} height={12} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={80} height={12} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={120} height={12} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={80} height={12} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton width={60} height={28} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : filteredAllClubReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Không có báo cáo nào</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Tiêu đề</TableHead>
                      <TableHead className="w-[150px]">Ngày tạo</TableHead>
                      <TableHead className="w-[150px]">Ngày nộp</TableHead>
                      <TableHead className="w-[200px]">Người tạo</TableHead>

                      <TableHead className="w-[120px]">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllClubReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <span
                            className="truncate block max-w-[250px]"
                            title={report.reportTitle}
                          >
                            {report.reportTitle}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {report.submittedDate
                              ? new Date(
                                  report.submittedDate
                                ).toLocaleDateString("vi-VN")
                              : "—"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {report.createdBy?.fullName || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              requirementStatusColors[report.status] ||
                              "bg-gray-100 text-gray-700"
                            }
                          >
                            {requirementStatusLabels[report.status] ||
                              report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  setLoadingReportDetailId(
                                    report.id.toString()
                                  );
                                  const reportDetail =
                                    await getClubReportDetail(
                                      report.id,
                                      clubId!
                                    );
                                  setSelectedReportDetail(reportDetail);
                                  setShowDetailModal(true);
                                } catch (error) {
                                  console.error(
                                    "Error fetching report detail:",
                                    error
                                  );
                                  toast.error("Không thể tải chi tiết báo cáo");
                                } finally {
                                  setLoadingReportDetailId(null);
                                }
                              }}
                              disabled={
                                loadingReportDetailId === report.id.toString()
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Xem
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
                    {/* Badge "phải nộp lại" khi mustResubmit = true, nhưng ẩn khi status là PENDING_UNIVERSITY hoặc RESUBMITTED_UNIVERSITY */}
                    {selectedReportDetail.mustResubmit &&
                      selectedReportDetail.status?.toUpperCase() !==
                        "PENDING_UNIVERSITY" &&
                      selectedReportDetail.status?.toUpperCase() !==
                        "RESUBMITTED_UNIVERSITY" && (
                        <Badge className="bg-orange-100 text-orange-700 border border-orange-300">
                          Phải nộp lại lên trường
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

              {/* Thông tin yêu cầu báo cáo */}
              {selectedReportDetail.reportRequirement && (
                <div className="border-t pt-3">
                  <h4 className="font-semibold mb-2 text-sm flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Thông tin yêu cầu báo cáo
                  </h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                      <span className="font-medium text-blue-900">
                        Tiêu đề:
                      </span>
                      <span className="text-blue-800">
                        {selectedReportDetail.reportRequirement.title}
                      </span>
                      {selectedReportDetail.reportRequirement.description && (
                        <>
                          <span className="font-medium text-blue-900">
                            Mô tả:
                          </span>
                          <span className="text-blue-800 whitespace-pre-wrap line-clamp-2">
                            {selectedReportDetail.reportRequirement.description}
                          </span>
                        </>
                      )}
                      <span className="font-medium text-blue-900">
                        Hạn nộp:
                      </span>
                      <span className="text-blue-800 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(
                          selectedReportDetail.reportRequirement.dueDate
                        ).toLocaleDateString("vi-VN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      {selectedReportDetail.reportRequirement.createdBy && (
                        <>
                          <span className="font-medium text-blue-900">
                            Người tạo:
                          </span>
                          <span className="text-blue-800 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {
                              selectedReportDetail.reportRequirement.createdBy
                                .fullName
                            }
                          </span>
                        </>
                      )}
                      {selectedReportDetail.reportRequirement.templateUrl && (
                        <>
                          <span className="font-medium text-blue-900">
                            Template:
                          </span>
                          <a
                            href={
                              selectedReportDetail.reportRequirement.templateUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Tải file template</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

              {/* Action buttons for DRAFT status */}
              {(() => {
                // Kiểm tra nếu đã quá hạn và báo cáo không được đánh dấu là đã nộp lại
                const reportRequirement =
                  selectedReportDetail.reportRequirement;
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
                  isClubOfficer &&
                  isSameClub &&
                  isCreator;

                // Tính toán điều kiện hiển thị cho Team_officer (chỉ khi là creator)
                const shouldShowForTeamOfficer =
                  !permissionsLoading &&
                  isDraft &&
                  isTeamOfficer &&
                  isSameClub &&
                  isCreator;

                // Nếu là Club_officer và status là DRAFT và là creator, hiển thị các nút
                if (shouldShowForPresident) {
                  return (
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t">
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                        onClick={async () => {
                          if (!selectedReportDetail.id) {
                            toast.error("Không tìm thấy thông tin báo cáo");
                            return;
                          }

                          try {
                            setApprovingReport(true);
                            const reviewRequest = {
                              reportId: selectedReportDetail.id,
                              status: "APPROVED_CLUB" as const,
                            };
                            await reviewReportByClub(reviewRequest);
                            toast.success("Báo cáo đã được nộp lên trường");
                            setShowDetailModal(false);
                            setSelectedReportDetail(null);

                            // Refresh all tabs data to update status
                            await refreshAllTabsData();
                          } catch (err) {
                            console.error("Error submitting report:", err);
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "Không thể nộp báo cáo";
                            toast.error(errorMessage);
                          } finally {
                            setApprovingReport(false);
                          }
                        }}
                        disabled={approvingReport}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {submitting ? "Đang nộp..." : "Nộp lên trường"}
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-transparent w-full sm:w-auto"
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

                            // Refresh all tabs data to update status
                            await refreshAllTabsData();
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

                // Nếu là Team_officer và status là DRAFT và là creator, hiển thị các nút
                if (shouldShowForTeamOfficer) {
                  return (
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t">
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
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

                            // Refresh all tabs data to update status
                            await refreshAllTabsData();
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
                        disabled={submitting}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {submitting ? "Đang nộp..." : "Nộp lên để phê duyệt"}
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-transparent w-full sm:w-auto"
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

                            // Refresh all tabs data to update status
                            await refreshAllTabsData();
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
                const reportRequirement =
                  selectedReportDetail.reportRequirement;
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
                // const currentUser = authService.getCurrentUser();
                // const isCreator =
                //   selectedReportDetail.createdBy?.id === currentUser?.id;

                // Ẩn các nút nếu đã quá hạn và báo cáo không được đánh dấu là đã nộp lại
                if (shouldHideButtons) {
                  return null;
                }

                const shouldShowForPresident =
                  !permissionsLoading &&
                  isPendingClub &&
                  isClubOfficer &&
                  isSameClub;

                if (shouldShowForPresident) {
                  // Nếu là creator, hiển thị nút Chỉnh sửa và Xóa thay vì Từ chối
                  // if (isCreator) {
                  //   return (
                  //     <div className="flex gap-2 justify-end pt-4 border-t">
                  //       <Button
                  //         onClick={async () => {
                  //           if (!selectedReportDetail.id) {
                  //             toast.error("Không tìm thấy thông tin báo cáo");
                  //             return;
                  //           }

                  //           try {
                  //             setApprovingReport(true);
                  //             const reviewRequest: ReviewReportByClubRequest = {
                  //               reportId: selectedReportDetail.id,
                  //               status: "APPROVED_CLUB",
                  //             };

                  //             await reviewReportByClub(reviewRequest);
                  //             toast.success(
                  //               "Báo cáo đã được chấp nhận và nộp lên trường"
                  //             );
                  //             setShowDetailModal(false);
                  //             setSelectedReportDetail(null);

                  //             // Refresh all tabs data to update status
                  //             await refreshAllTabsData();
                  //           } catch (err) {
                  //             console.error("Error approving report:", err);
                  //             const errorMessage =
                  //               err instanceof Error
                  //                 ? err.message
                  //                 : "Không thể duyệt báo cáo";
                  //             toast.error(errorMessage);
                  //           } finally {
                  //             setApprovingReport(false);
                  //           }
                  //         }}
                  //         className="bg-green-600 hover:bg-green-700 text-white"
                  //         disabled={approvingReport}
                  //       >
                  //         <CheckCircle className="h-4 w-4 mr-2" />
                  //         {approvingReport
                  //           ? "Đang xử lý..."
                  //           : selectedReportDetail.mustResubmit
                  //           ? "Nộp lại lên trường"
                  //           : "Chấp nhận và nộp lên trường"}
                  //       </Button>
                  //       <Button
                  //         variant="outline"
                  //         onClick={() => {
                  //           // Set up edit dialog
                  //           setDraftTitle(selectedReportDetail.reportTitle);
                  //           setDraftContent(selectedReportDetail.content || "");
                  //           setDraftFileUrl(selectedReportDetail.fileUrl || "");
                  //           setDraftFile(null);
                  //           setEditingReportId(selectedReportDetail.id);
                  //           setIsResubmitMode(false);
                  //           // Find the request for this report
                  //           const requirementId =
                  //             selectedReportDetail.reportRequirement?.id;
                  //           if (requirementId) {
                  //             const request = reportRequests.find(
                  //               (r) => r.request_id === requirementId.toString()
                  //             );
                  //             if (request) {
                  //               setSelectedRequest(request);
                  //             }
                  //           }
                  //           setShowDetailModal(false);
                  //           setShowEditDialog(true);
                  //         }}
                  //         className="bg-blue-600 hover:bg-blue-700 text-white"
                  //         disabled={approvingReport}
                  //       >
                  //         <FileText className="h-4 w-4 mr-2" />
                  //         Chỉnh sửa
                  //       </Button>
                  //       <Button
                  //         variant="outline"
                  //         onClick={async () => {
                  //           if (
                  //             !confirm(
                  //               "Bạn có chắc chắn muốn xóa báo cáo này? Hành động này không thể hoàn tác."
                  //             )
                  //           ) {
                  //             return;
                  //           }
                  //           try {
                  //             if (!selectedReportDetail.id) {
                  //               toast.error("Không tìm thấy thông tin báo cáo");
                  //               return;
                  //             }
                  //             setDeletingReport(true);
                  //             await deleteReport(selectedReportDetail.id);
                  //             toast.success("Báo cáo đã được xóa thành công");
                  //             setShowDetailModal(false);
                  //             setSelectedReportDetail(null);

                  //             // Refresh all tabs data to update status
                  //             await refreshAllTabsData();
                  //           } catch (err) {
                  //             console.error("Error deleting report:", err);
                  //             const errorMessage =
                  //               err instanceof Error
                  //                 ? err.message
                  //                 : "Không thể xóa báo cáo";
                  //             toast.error(errorMessage);
                  //           } finally {
                  //             setDeletingReport(false);
                  //           }
                  //         }}
                  //         className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  //         disabled={approvingReport || deletingReport}
                  //       >
                  //         <XCircle className="h-4 w-4 mr-2" />
                  //         {deletingReport ? "Đang xóa..." : "Xóa"}
                  //       </Button>
                  //     </div>
                  //   );
                  // }

                  // Nếu không phải creator, hiển thị nút Từ chối như cũ
                  return (
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t">
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
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

                            // Refresh all tabs data to update status
                            await refreshAllTabsData();
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
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                        onClick={() => {
                          setShowRejectDialog(true);
                          setRejectReason("");
                        }}
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
                const reportRequirement =
                  selectedReportDetail.reportRequirement;
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
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
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
                const reportRequirement =
                  selectedReportDetail.reportRequirement;
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
                const isRejectedUniversity =
                  reportStatus === "REJECTED_UNIVERSITY";

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
                  isClubOfficer &&
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
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t">
                      <Button
                        variant="outline"
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
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
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t">
                      <Button
                        variant="outline"
                        className="bg-transparent w-full sm:w-auto"
                        onClick={() => {
                          setShowDetailModal(false);
                        }}
                      >
                        Hủy
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
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
                  className="w-full sm:w-auto"
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

                      // Refresh all tabs data to update status
                      await refreshAllTabsData();
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
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4">
                <Button
                  variant="outline"
                  className="bg-transparent w-full sm:w-auto"
                  onClick={() => {
                    setShowSubmitDialog(false);
                    setEditingReportId(null);
                    setDraftFile(null);
                    setDraftTitle("");
                    setDraftContent("");
                    setDraftFileUrl("");
                  }}
                  disabled={savingDraft || submittingReport}
                >
                  Hủy
                </Button>
                {/* Nếu là club_officer, hiển thị 2 nút: Lưu và Nộp lên trường */}
                {isClubOfficer ? (
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

                          if (editingReportId) {
                            // Update existing report
                            // Nếu có file mới, gửi file trực tiếp với API (backend sẽ xử lý upload)
                            // Nếu không có file mới, giữ fileUrl cũ
                            const updateRequest: UpdateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: draftFile
                                ? undefined
                                : draftFileUrl || undefined, // Chỉ dùng fileUrl cũ nếu không có file mới
                            };

                            await updateReport(
                              editingReportId,
                              updateRequest,
                              draftFile || undefined
                            );
                            toast.success(
                              "Báo cáo đã được cập nhật thành công"
                            );
                          } else {
                            // Create new report with autoSubmit=false (DRAFT)
                            const createRequest: CreateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: draftFileUrl || undefined,
                              clubId: clubId,
                              reportRequirementId: Number(
                                selectedRequest.request_id
                              ),
                              autoSubmit: false,
                            };

                            const createdReport = await createReport(
                              createRequest,
                              draftFile || undefined
                            );
                            setEditingReportId(createdReport.id);
                            toast.success(
                              "Báo cáo đã được lưu với trạng thái bản nháp"
                            );
                            setDraftFile(null);
                          }

                          setShowSubmitDialog(false);
                          setEditingReportId(null);
                          setDraftFile(null);
                          setDraftTitle("");
                          setDraftContent("");
                          setDraftFileUrl("");

                          // Refresh all tabs data to update status
                          await refreshAllTabsData();
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

                          let reportIdToSubmit = editingReportId;
                          let currentReportStatus: string | null = null;

                          // Nếu chưa có report, tạo mới với autoSubmit=false (DRAFT)
                          if (!reportIdToSubmit) {
                            const createRequest: CreateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: draftFileUrl || undefined,
                              clubId: clubId,
                              reportRequirementId: Number(
                                selectedRequest.request_id
                              ),
                              autoSubmit: false, // Tạo với status DRAFT
                            };

                            const createdReport = await createReport(
                              createRequest,
                              draftFile || undefined
                            );
                            reportIdToSubmit = createdReport.id;
                            currentReportStatus = createdReport.status;
                            setEditingReportId(reportIdToSubmit);
                            setDraftFile(null);
                          } else {
                            // Update existing report trước khi submit
                            // Nếu có file mới, gửi file trực tiếp với API (backend sẽ xử lý upload)
                            // Nếu không có file mới, giữ fileUrl cũ
                            const updateRequest: UpdateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: draftFile
                                ? undefined
                                : draftFileUrl || undefined, // Chỉ dùng fileUrl cũ nếu không có file mới
                            };
                            await updateReport(
                              reportIdToSubmit,
                              updateRequest,
                              draftFile || undefined
                            );

                            // Lấy trạng thái hiện tại của report sau khi update
                            const currentReport =
                              await getClubReportByRequirementForOfficer(
                                Number(selectedRequest.request_id),
                                clubId
                              );
                            currentReportStatus = currentReport?.status || null;
                          }

                          // Nếu report đang ở trạng thái DRAFT, submit nó để chuyển sang PENDING_CLUB
                          if (currentReportStatus === "DRAFT") {
                            const submitRequest: SubmitReportRequest = {
                              reportId: reportIdToSubmit,
                            };
                            await submitReport(submitRequest);
                            // Sau khi submit, status sẽ là PENDING_CLUB
                            currentReportStatus = "PENDING_CLUB";
                          }

                          // Nếu report đang ở PENDING_CLUB hoặc UPDATED_PENDING_CLUB,
                          // gọi reviewReportByClub với status APPROVED_CLUB để nộp lên trường (PENDING_UNIVERSITY)
                          if (
                            currentReportStatus === "PENDING_CLUB" ||
                            currentReportStatus === "UPDATED_PENDING_CLUB"
                          ) {
                            const reviewRequest = {
                              reportId: reportIdToSubmit,
                              status: "APPROVED_CLUB" as const,
                            };
                            await reviewReportByClub(reviewRequest);
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

                          // Refresh all tabs data to update status
                          await refreshAllTabsData();
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

                          // Refresh all tabs data to update status
                          await refreshAllTabsData();
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
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4">
                <Button
                  variant="outline"
                  className="bg-transparent w-full sm:w-auto"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingReportId(null);
                    setDraftFile(null);
                    setIsResubmitMode(false);
                  }}
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
                      isResubmitFromUniversity && isClubOfficer;
                    const isTeamOfficerResubmitFromUniversity =
                      isResubmitFromUniversity && isTeamOfficer;

                    return (
                      <Button
                        onClick={async () => {
                          if (!draftTitle.trim() || !draftContent.trim()) {
                            toast.error(
                              "Vui lòng điền đầy đủ tiêu đề và nội dung"
                            );
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

                            // Update the report (this will also reset reviewerFeedback if backend handles it)
                            // Nếu có file mới, gửi file trực tiếp với API (backend sẽ xử lý upload)
                            // Nếu không có file mới, giữ fileUrl cũ
                            const updateRequest: UpdateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: draftFile
                                ? undefined
                                : draftFileUrl || undefined, // Chỉ dùng fileUrl cũ nếu không có file mới
                            };

                            await updateReport(
                              editingReportId,
                              updateRequest,
                              draftFile || undefined
                            );

                            // Submit the report (resubmit)
                            // If resubmitting from REJECTED_UNIVERSITY, it will go to RESUBMITTED_UNIVERSITY
                            // If resubmitting from REJECTED_CLUB, it will go to UPDATED_PENDING_CLUB
                            const submitRequest: SubmitReportRequest = {
                              reportId: editingReportId,
                            };
                            await submitReport(submitRequest);

                            if (isClubOfficerResubmit) {
                              toast.success(
                                "Báo cáo đã được nộp lại lên trường thành công"
                              );
                            } else if (isTeamOfficerResubmitFromUniversity) {
                              toast.success(
                                "Báo cáo đã được nộp lại lên câu lạc bộ thành công"
                              );
                            } else {
                              toast.success(
                                "Báo cáo đã được nộp lại thành công"
                              );
                            }
                            setShowEditDialog(false);
                            setEditingReportId(null);
                            setDraftFile(null);
                            setIsResubmitMode(false);

                            // Refresh all tabs data to update status
                            await refreshAllTabsData();
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
                    {editingReportId &&
                      (() => {
                        // Kiểm tra nếu user là club officer
                        const shouldSubmitToSchool =
                          !permissionsLoading && isClubOfficer;

                        return (
                          <Button
                            onClick={async () => {
                              try {
                                setSubmittingReport(true);

                                if (shouldSubmitToSchool) {
                                  // Nếu là club officer cần lưu thay đổi trước (nếu có) rồi mới nộp lên trường
                                  // Cập nhật báo cáo nếu có thay đổi
                                  // Nếu có file mới, gửi file trực tiếp với API (backend sẽ xử lý upload)
                                  // Nếu không có file mới, giữ fileUrl cũ
                                  const updateRequest: UpdateReportRequest = {
                                    reportTitle: draftTitle,
                                    content: draftContent,
                                    fileUrl: draftFile
                                      ? undefined
                                      : draftFileUrl || undefined, // Chỉ dùng fileUrl cũ nếu không có file mới
                                  };
                                  await updateReport(
                                    editingReportId,
                                    updateRequest,
                                    draftFile || undefined
                                  );

                                  // Sau đó gọi API reviewReportByClub với status APPROVED_CLUB để nộp lên trường
                                  const reviewRequest: ReviewReportByClubRequest =
                                    {
                                      reportId: editingReportId,
                                      status: "APPROVED_CLUB",
                                    };
                                  await reviewReportByClub(reviewRequest);
                                  toast.success(
                                    "Báo cáo đã được nộp lên trường thành công"
                                  );
                                } else {
                                  // Nếu không, gọi API submitReport như bình thường
                                  const submitRequest: SubmitReportRequest = {
                                    reportId: editingReportId,
                                  };
                                  await submitReport(submitRequest);
                                  toast.success(
                                    "Báo cáo đã được nộp thành công"
                                  );
                                }

                                setShowEditDialog(false);
                                setEditingReportId(null);
                                setIsResubmitMode(false);
                                setDraftFile(null);

                                // Refresh all tabs data to update status
                                await refreshAllTabsData();
                              } catch (err) {
                                console.error("Error submitting report:", err);
                                const errorMessage =
                                  err instanceof Error
                                    ? err.message
                                    : shouldSubmitToSchool
                                    ? "Không thể nộp báo cáo lên trường"
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
                            {submittingReport
                              ? "Đang nộp..."
                              : shouldSubmitToSchool
                              ? "Nộp báo cáo lên trường"
                              : "Nộp báo cáo"}
                          </Button>
                        );
                      })()}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal chọn team để gán báo cáo */}
      <Dialog open={showAssignTeamModal} onOpenChange={setShowAssignTeamModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Giao báo cáo cho phòng ban</DialogTitle>
            <DialogDescription>
              Chọn phòng ban để gán yêu cầu báo cáo này
            </DialogDescription>
          </DialogHeader>

          {selectedRequirementForAssign && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  {selectedRequirementForAssign.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Hạn nộp:{" "}
                  {new Date(
                    selectedRequirementForAssign.deadline
                  ).toLocaleDateString("vi-VN")}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Chọn phòng ban</Label>
                {teamsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Đang tải danh sách phòng ban...
                  </p>
                ) : teams && teams.length > 0 ? (
                  <Select
                    value={selectedTeamId?.toString() || ""}
                    onValueChange={(value) => setSelectedTeamId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phòng ban" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem
                          key={team.teamId}
                          value={team.teamId.toString()}
                        >
                          {team.teamName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Không có phòng ban nào trong câu lạc bộ
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignTeamModal(false);
                setSelectedRequirementForAssign(null);
                setSelectedTeamId(null);
              }}
              disabled={assigningTeam}
            >
              Hủy
            </Button>
            <Button
              onClick={handleAssignTeam}
              disabled={!selectedTeamId || assigningTeam || teamsLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {assigningTeam ? "Đang gán..." : "Gán báo cáo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
