import { useState, useMemo, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import {
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
  type ReportFilterRequest,
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
  UserPlus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
import { formatDateTimeVN } from "@/lib/dateUtils";

type ReportType = "periodic" | "post_event";
type ReportStatusFilter =
  | "OVERDUE"
  | "UNSUBMITTED"
  | "DRAFT"
  | "PENDING_CLUB"
  | "REJECTED_CLUB"
  | "UPDATED_PENDING_CLUB"
  | "PENDING_UNIVERSITY"
  | "APPROVED_UNIVERSITY"
  | "REJECTED_UNIVERSITY"
  | "RESUBMITTED_UNIVERSITY";

interface ReportRequest {
  clubReportRequirementId: number; // clubReportRequirementId
  submissionRequirementId: number; // submissionReportRequirementId (used for API calls)
  reportType: ReportType;
  title: string;
  description: string;
  deadline: string;
  createdBy: string;
  createdAt: string;
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
    createdByUserName: string;
  };
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
  PENDING_CLUB: "Chờ phê duyệt từ CLB",
  REJECTED_CLUB: "Bị từ chối từ CLB",
  UPDATED_PENDING_CLUB: "Đã cập nhật - Chờ phê duyệt từ CLB",
  PENDING_UNIVERSITY: "Chờ phê duyệt từ nhà trường",
  APPROVED_UNIVERSITY: "Đã duyệt từ nhà trường",
  REJECTED_UNIVERSITY: "Bị từ chối từ nhà trường",
  RESUBMITTED_UNIVERSITY: "Đã nộp lại lên nhà trường",
};

const reportStatusColors: Record<string, string> = {
  DRAFT: "bg-gray-600 text-white",
  PENDING_CLUB: "bg-yellow-100 text-yellow-700",
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
  PENDING_CLUB: "Chờ phê duyệt từ CLB",
  REJECTED_CLUB: "Bị từ chối từ CLB",
  UPDATED_PENDING_CLUB: "Đã cập nhật - Chờ phê duyệt từ CLB",
  PENDING_UNIVERSITY: "Chờ phê duyệt từ nhà trường",
  APPROVED_UNIVERSITY: "Đã duyệt từ nhà trường",
  REJECTED_UNIVERSITY: "Bị từ chối từ nhà trường",
  RESUBMITTED_UNIVERSITY: "Đã nộp lại lên nhà trường",
};

export function ClubReportManagement() {
  // Use shared `formatDateTimeVN` from `src/lib/dateUtils`
  const params = useParams();
  const clubIdParam = params.clubId;
  const clubId = clubIdParam ? Number(clubIdParam) : undefined;
  const {
    isClubOfficer,
    isTeamOfficer,
    isClubTreasurer,
    loading: permissionsLoading,
  } = useClubPermissions(clubId);

  // Get teams for club officer to assign
  const { data: teams, loading: teamsLoading } = useTeams(clubId);

  // Get current user's team ID if team officer
  const currentUserTeamId = useMemo(() => {
    if (!(isTeamOfficer || isClubTreasurer) || !teams || teams.length === 0)
      return null;
    // Get the first team where user is an officer
    const userTeam = teams.find(
      (team) => team.myRoles && team.myRoles.length > 0
    );
    return userTeam?.teamId || null;
  }, [isTeamOfficer, isClubTreasurer, teams]);

  // Helper function to map API response to ReportRequest format
  const mapRequirementToReportRequest = (req: any): ReportRequest => {
    const reportType = mapBackendToFrontendReportType(req.reportType);

    const finalReportType: ReportType =
      reportType === "post-event"
        ? "post_event"
        : reportType === "other"
          ? "periodic"
          : reportType;

    // Extract IDs from new backend structure
    // req.id is submissionReportRequirementId
    // req.clubRequirement.id is clubReportRequirementId
    const submissionReqId = req.id ?? 0;
    const clubReqId = req.clubRequirement?.id ?? 0;
    const teamId = req.clubRequirement?.teamId ?? null;

    // Extract report info from nested clubRequirement.report
    const nestedReport = req.clubRequirement?.report;
    const reportInfo = nestedReport
      ? {
          id: nestedReport.id ?? 0,
          reportTitle: req.title || "", // Use requirement title as report title
          status: nestedReport.status ?? undefined,
          submittedDate: undefined,
          createdAt: "",
          updatedAt: "",
          mustResubmit: nestedReport.mustResubmit ?? false,
          createdBy: nestedReport.createdBy
            ? {
                id: nestedReport.createdBy,
                fullName: "",
                email: "",
              }
            : undefined,
          createdByUserName: nestedReport.createdByUserName || "",
        }
      : undefined;

    // Determine final status to display on the requirement card.
    // Priority:
    // 1. If a report exists, use the report's status
    // 2. Otherwise treat as UNSUBMITTED
    const finalStatus = reportInfo?.status ?? "UNSUBMITTED";

    return {
      clubReportRequirementId: clubReqId,
      submissionRequirementId: submissionReqId,
      reportType: finalReportType,
      title: req.title,
      description: req.description || "",
      deadline: req.dueDate,
      createdBy: req.createdByName || "Phòng Quản lý Sinh viên",
      createdAt: req.createdAt || "",
      templateUrl: req.templateUrl,
      status: finalStatus,
      report: reportInfo,
      teamId: teamId,
    };
  };

  const [activeTab, setActiveTab] = useState<
    "requests" | "my_reports" | "club_reports"
  >("requests");
  const [selectedRequest, setSelectedRequest] = useState<ReportRequest | null>(
    null
  );
  const [selectedReportDetail, setSelectedReportDetail] =
    useState<ReportDetailResponse | null>(null);
  const [loadingReportDetailId, setLoadingReportDetailId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Separate filters: requests tab has its own filters; my_reports and club_reports share a reports filter
  const [semesterFilterRequests, setSemesterFilterRequests] =
    useState<string>("all");
  const [statusFilterRequests, setStatusFilterRequests] = useState<
    ReportStatusFilter | "all"
  >("all");

  const [semesterFilterReports, setSemesterFilterReports] =
    useState<string>("all");
  const [statusFilterReports, setStatusFilterReports] = useState<
    ReportStatusFilter | "all"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(9); // 3 columns x 3 rows = 9 items per page
  const [currentPageMyReports, setCurrentPageMyReports] = useState(1);
  const [totalPagesMyReports, setTotalPagesMyReports] = useState(1);
  const [currentPageClubReports, setCurrentPageClubReports] = useState(1);
  const [totalPagesClubReports, setTotalPagesClubReports] = useState(1);
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

  // State for delete confirmation dialog (replace window.confirm)
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteTargetReportId, setDeleteTargetReportId] = useState<
    number | null
  >(null);

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

        // Build filter request (requests tab uses its own filters)
        const filterRequest: ClubReportRequirementFilterRequest = {
          page: currentPage,
          size: pageSize,
          sort: "createdAt,desc",
          keyword: debouncedSearchQuery || undefined,
          status:
            statusFilterRequests !== "all" ? statusFilterRequests : undefined,
          semesterId:
            semesterFilterRequests !== "all"
              ? Number(semesterFilterRequests)
              : undefined,
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
    statusFilterRequests,
    semesterFilterRequests,
  ]);

  // Fetch my reports when submissions tab is active
  useEffect(() => {
    const fetchMyReports = async () => {
      if (!clubId || activeTab !== "my_reports") return;

      try {
        setLoadingMyReports(true);
        setError(null);

        // Build filter request
        const filterRequest: ReportFilterRequest = {
          clubId: clubId,
          page: currentPageMyReports,
          size: pageSize,
          sort: "createdAt,desc",
          keyword: debouncedSearchQuery || undefined,
          status:
            statusFilterReports !== "all" &&
            statusFilterReports !== "OVERDUE" &&
            statusFilterReports !== "UNSUBMITTED"
              ? statusFilterReports
              : undefined,
          semesterId:
            semesterFilterReports !== "all"
              ? Number(semesterFilterReports)
              : undefined,
        };

        const response = await getMyReports(filterRequest);
        setMyReports(response.content);
        setTotalPagesMyReports(response.totalPages);
      } catch (err) {
        console.error("Error fetching my reports:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách báo cáo của tôi";
        setError(errorMessage);
        toast.error(errorMessage);
        setMyReports([]);
      } finally {
        setLoadingMyReports(false);
      }
    };

    fetchMyReports();
  }, [
    clubId,
    activeTab,
    currentPageMyReports,
    pageSize,
    debouncedSearchQuery,
    statusFilterReports,
    semesterFilterReports,
  ]);

  // Fetch all club reports when approval tab is active (only for club officers)
  useEffect(() => {
    const fetchAllClubReports = async () => {
      if (!clubId || activeTab !== "club_reports" || !isClubOfficer) return;

      try {
        setLoadingAllClubReports(true);
        setError(null);

        // Build filter request
        const filterRequest: ReportFilterRequest = {
          clubId: clubId,
          page: currentPageClubReports,
          size: pageSize,
          sort: "createdAt,desc",
          keyword: debouncedSearchQuery || undefined,
          status:
            statusFilterReports !== "all" &&
            statusFilterReports !== "OVERDUE" &&
            statusFilterReports !== "UNSUBMITTED"
              ? statusFilterReports
              : undefined,
          semesterId:
            semesterFilterReports !== "all"
              ? Number(semesterFilterReports)
              : undefined,
        };

        const response = await getClubReports(filterRequest);
        setAllClubReports(response.content);
        setTotalPagesClubReports(response.totalPages);
      } catch (err) {
        console.error("Error fetching all club reports:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách báo cáo của câu lạc bộ";
        setError(errorMessage);
        toast.error(errorMessage);
        setAllClubReports([]);
      } finally {
        setLoadingAllClubReports(false);
      }
    };

    fetchAllClubReports();
  }, [
    clubId,
    activeTab,
    isClubOfficer,
    currentPageClubReports,
    pageSize,
    debouncedSearchQuery,
    statusFilterReports,
    semesterFilterReports,
  ]);

  // Helper function to refresh all tabs data after actions
  const refreshAllTabsData = async () => {
    if (!clubId) return;

    try {
      // Set loading states to show skeleton
      setLoading(true);
      setLoadingMyReports(true);
      if (isClubOfficer) {
        setLoadingAllClubReports(true);
      }

      // Always refresh requests tab (use paginated API to match backend)
      // Note: Backend already filters by teamId for team officers
      const requestsFilter: ClubReportRequirementFilterRequest = {
        page: currentPage,
        size: pageSize,
        sort: "createdAt,desc",
        keyword: debouncedSearchQuery || undefined,
        status:
          statusFilterRequests !== "all" ? statusFilterRequests : undefined,
        semesterId:
          semesterFilterRequests !== "all"
            ? Number(semesterFilterRequests)
            : undefined,
      };

      const requestsResponse =
        await getClubReportRequirementsForOfficerWithFilters(
          clubId,
          requestsFilter
        );

      const mappedRequests: ReportRequest[] = requestsResponse.content.map(
        (req) => mapRequirementToReportRequest(req)
      );

      setReportRequests(mappedRequests);
      setTotalPages(requestsResponse.totalPages);
      setTotalElements(requestsResponse.totalElements);
      setHasNext(requestsResponse.hasNext);
      setHasPrevious(requestsResponse.hasPrevious);
      setLoading(false);

      // Always refresh submissions tab (my reports)
      const myReportsFilter: ReportFilterRequest = {
        clubId: clubId,
        page: currentPageMyReports,
        size: pageSize,
        sort: "createdAt,desc",
      };
      const myReportsResponse = await getMyReports(myReportsFilter);
      setMyReports(myReportsResponse.content);
      setTotalPagesMyReports(myReportsResponse.totalPages);
      setLoadingMyReports(false);

      // Always refresh approval tab (all club reports) if user is club president
      if (isClubOfficer) {
        const clubReportsFilter: ReportFilterRequest = {
          clubId: clubId,
          page: currentPageClubReports,
          size: pageSize,
          sort: "createdAt,desc",
        };
        const clubReportsResponse = await getClubReports(clubReportsFilter);
        setAllClubReports(clubReportsResponse.content);
        setTotalPagesClubReports(clubReportsResponse.totalPages);
        setLoadingAllClubReports(false);
      }
    } catch (err) {
      console.error("Error refreshing tabs data:", err);
      // Reset loading states on error
      setLoading(false);
      setLoadingMyReports(false);
      setLoadingAllClubReports(false);
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
    } else if (activeTab === "my_reports") {
      setCurrentPageMyReports(1);
    } else if (activeTab === "club_reports") {
      setCurrentPageClubReports(1);
    }
  }, [
    debouncedSearchQuery,
    semesterFilterRequests,
    statusFilterRequests,
    semesterFilterReports,
    statusFilterReports,
    activeTab,
  ]);

  const isDeadlinePassed = (deadline: string) =>
    new Date(deadline) < new Date();

  const handleSubmitReport = async (requestId: string) => {
    // Chỉ mở form, KHÔNG gọi API ở bước bấm nút ngoài card
    if (!clubId) {
      toast.error("Không tìm thấy thông tin câu lạc bộ");
      return;
    }

    setSelectedRequest(
      reportRequests.find(
        (r) => r.clubReportRequirementId === Number(requestId)
      ) || null
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

      await assignTeamToReportRequirement(clubId, {
        clubReportRequirementId:
          selectedRequirementForAssign.clubReportRequirementId,
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
            requestId =
              selectedReportDetail.reportRequirement?.id != null
                ? String(selectedReportDetail.reportRequirement.id)
                : undefined;
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
                value={semesterFilterRequests}
                onValueChange={(value) => setSemesterFilterRequests(value)}
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
                value={statusFilterRequests}
                onValueChange={(value) =>
                  setStatusFilterRequests(value as ReportStatusFilter | "all")
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

                  // Debug: Log để kiểm tra dữ liệu
                  console.log("Request data:", {
                    clubReportRequirementId: request.clubReportRequirementId,
                    status: request.status,
                    report: request.report,
                    reportStatus: request.report?.status,
                    hasReport: !!request.report,
                  });

                  // Determine whether the card should act as a click-to-view area.
                  const currentUser = authService.getCurrentUser();
                  const isCreator =
                    currentUser?.id === request.report?.createdBy?.id;
                  const showViewForCreator =
                    request.status === "DRAFT" && request.report && isCreator;
                  const showViewGeneral =
                    !!request.report ||
                    (request.status &&
                      request.status !== "UNSUBMITTED" &&
                      request.status !== null);
                  const cardClickable = showViewForCreator || showViewGeneral;

                  const handleCardClick = async () => {
                    if (!cardClickable) return;
                    try {
                      setLoadingReportDetailId(
                        String(request.clubReportRequirementId)
                      );
                      const reportDetail =
                        await getClubReportByRequirementForOfficer(
                          request.submissionRequirementId,
                          clubId!
                        );
                      if (reportDetail) {
                        setSelectedReportDetail(reportDetail);
                        setShowDetailModal(true);
                      } else {
                        toast.error("Không tìm thấy báo cáo");
                      }
                    } catch (error) {
                      console.error("Error fetching report detail:", error);
                      toast.error("Không thể tải chi tiết báo cáo");
                    } finally {
                      setLoadingReportDetailId(null);
                    }
                  };

                  return (
                    <Card
                      key={request.clubReportRequirementId}
                      onClick={cardClickable ? handleCardClick : undefined}
                      className={`hover:shadow-lg transition-shadow flex flex-col h-full ${
                        cardClickable ? "cursor-pointer" : ""
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge
                                className={reportTypeColors[request.reportType]}
                              >
                                {reportTypeLabels[request.reportType]}
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
                      <CardContent className="flex flex-col flex-1">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Hạn nộp:{" "}
                              <strong>
                                {formatDateTimeVN(request.deadline)}
                              </strong>
                            </span>
                            {isDeadlineExp && (
                              <Badge className="bg-red-100 text-red-700 border border-red-300 font-semibold ml-auto">
                                Quá hạn
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Yêu cầu từ: {request.createdBy}</span>
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

                          {/* Description */}
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2">
                              Mô tả:
                            </Label>
                            <p className="text-sm text-muted-foreground ml-4">
                              {request.description || "Không có mô tả"}
                            </p>
                          </div>

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

                          {/* Hiển thị thông báo khi báo cáo đã được giao cho phòng ban */}
                          {request.teamId &&
                            isClubOfficer &&
                            teams?.find((t) => t.teamId === request.teamId)
                              ?.teamName && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                                <UserPlus className="h-4 w-4 inline mr-2" />
                                Báo cáo đã được giao cho phòng{" "}
                                {
                                  teams.find((t) => t.teamId === request.teamId)
                                    ?.teamName
                                }
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
                                    {request.report.createdByUserName} đã tạo
                                    báo cáo ở trạng thái bản nháp
                                  </div>
                                );
                              }
                              return null;
                            })()}
                        </div>

                        <div className="flex gap-2 pt-4 flex-wrap mt-auto">
                          {/* Hiển thị button dựa trên trạng thái yêu cầu và thông tin báo cáo từ backend */}
                          {/* Ưu tiên kiểm tra request.report trước để đảm bảo hiển thị nút xem khi có báo cáo */}
                          {request.report
                            ? (() => {
                                // Nếu status là DRAFT, chỉ hiển thị nút xem cho người tạo
                                if (request.status === "DRAFT") {
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
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            setLoadingReportDetailId(
                                              String(
                                                request.clubReportRequirementId
                                              )
                                            );
                                            const reportDetail =
                                              await getClubReportByRequirementForOfficer(
                                                request.submissionRequirementId,
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
                                          String(
                                            request.clubReportRequirementId
                                          )
                                        }
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        {loadingReportDetailId ===
                                        String(request.clubReportRequirementId)
                                          ? "Đang tải..."
                                          : "Xem bản nháp"}
                                      </Button>
                                    );
                                  }
                                  return null;
                                }

                                // Nếu không phải DRAFT, hiển thị nút xem cho tất cả
                                return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        setLoadingReportDetailId(
                                          String(
                                            request.clubReportRequirementId
                                          )
                                        );
                                        const reportDetail =
                                          await getClubReportByRequirementForOfficer(
                                            request.submissionRequirementId,
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
                                      loadingReportDetailId ===
                                      String(request.clubReportRequirementId)
                                    }
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    {loadingReportDetailId ===
                                    String(request.clubReportRequirementId)
                                      ? "Đang tải..."
                                      : "Xem báo cáo"}
                                  </Button>
                                );
                              })()
                            : // Hiển thị nút "Tạo báo cáo" nếu:
                              // - Chưa quá hạn VÀ
                              // - (Không có teamId HOẶC (có teamId VÀ user là team officer VÀ teamId của requirement = teamId của user))
                              !isDeadlineExp &&
                              (!request.teamId ||
                                ((isTeamOfficer || isClubTreasurer) &&
                                  request.teamId === currentUserTeamId)) && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleSubmitReport(
                                      String(request.clubReportRequirementId)
                                    )
                                  }
                                  className="bg-blue-600 hover:bg-blue-700"
                                  disabled={
                                    request.status === "APPROVED_UNIVERSITY"
                                  }
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  {"Tạo báo cáo"}
                                </Button>
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
                value={semesterFilterReports}
                onValueChange={(value) => setSemesterFilterReports(value)}
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
                value={statusFilterReports}
                onValueChange={(value) =>
                  setStatusFilterReports(value as ReportStatusFilter | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {reportStatusFilterOptions
                    .filter((s) => s !== "OVERDUE" && s !== "UNSUBMITTED")
                    .map((status) => (
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
            ) : myReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Không có báo cáo nào</p>
              </div>
            ) : (
              <>
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
                      {myReports.map((report) => (
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
                              {formatDateTimeVN(report.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {report.submittedDate
                                ? formatDateTimeVN(report.submittedDate)
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
                                    toast.error(
                                      "Không thể tải chi tiết báo cáo"
                                    );
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

                {/* Pagination */}
                {totalPagesMyReports > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageMyReports(1)}
                        disabled={currentPageMyReports === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPageMyReports((prev) =>
                            Math.max(1, prev - 1)
                          )
                        }
                        disabled={currentPageMyReports === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.min(5, totalPagesMyReports) },
                          (_, i) => {
                            let pageNum;
                            if (totalPagesMyReports <= 5) {
                              pageNum = i + 1;
                            } else if (currentPageMyReports <= 3) {
                              pageNum = i + 1;
                            } else if (
                              currentPageMyReports >=
                              totalPagesMyReports - 2
                            ) {
                              pageNum = totalPagesMyReports - 4 + i;
                            } else {
                              pageNum = currentPageMyReports - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPageMyReports === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPageMyReports(pageNum)}
                                className="w-10"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPageMyReports((prev) =>
                            Math.min(totalPagesMyReports, prev + 1)
                          )
                        }
                        disabled={currentPageMyReports === totalPagesMyReports}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPageMyReports(totalPagesMyReports)
                        }
                        disabled={currentPageMyReports === totalPagesMyReports}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
                value={semesterFilterReports}
                onValueChange={(value) => setSemesterFilterReports(value)}
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
                value={statusFilterReports}
                onValueChange={(value) =>
                  setStatusFilterReports(value as ReportStatusFilter | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {reportStatusFilterOptions
                    .filter(
                      (s) =>
                        s !== "OVERDUE" && s !== "UNSUBMITTED" && s !== "DRAFT"
                    )
                    .map((status) => (
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
            ) : allClubReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Không có báo cáo nào</p>
              </div>
            ) : (
              <>
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
                      {allClubReports.map((report) => (
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
                              {formatDateTimeVN(report.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {report.submittedDate
                                ? formatDateTimeVN(report.submittedDate)
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
                                    toast.error(
                                      "Không thể tải chi tiết báo cáo"
                                    );
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

                {/* Pagination */}
                {totalPagesClubReports > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageClubReports(1)}
                        disabled={currentPageClubReports === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPageClubReports((prev) =>
                            Math.max(1, prev - 1)
                          )
                        }
                        disabled={currentPageClubReports === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.min(5, totalPagesClubReports) },
                          (_, i) => {
                            let pageNum;
                            if (totalPagesClubReports <= 5) {
                              pageNum = i + 1;
                            } else if (currentPageClubReports <= 3) {
                              pageNum = i + 1;
                            } else if (
                              currentPageClubReports >=
                              totalPagesClubReports - 2
                            ) {
                              pageNum = totalPagesClubReports - 4 + i;
                            } else {
                              pageNum = currentPageClubReports - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  currentPageClubReports === pageNum
                                    ? "default"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  setCurrentPageClubReports(pageNum)
                                }
                                className="w-10"
                              >
                                {pageNum}
                              </Button>
                            );
                          }
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPageClubReports((prev) =>
                            Math.min(totalPagesClubReports, prev + 1)
                          )
                        }
                        disabled={
                          currentPageClubReports === totalPagesClubReports
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPageClubReports(totalPagesClubReports)
                        }
                        disabled={
                          currentPageClubReports === totalPagesClubReports
                        }
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
                    {formatDateTimeVN(selectedReportDetail.createdAt)}
                  </div>
                </div>
                {selectedReportDetail.submittedDate && (
                  <div>
                    <span className="text-muted-foreground">Ngày nộp:</span>
                    <div className="font-medium">
                      {formatDateTimeVN(selectedReportDetail.submittedDate)}
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
                        {formatDateTimeVN(
                          selectedReportDetail.reportRequirement.dueDate
                        )}
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
              {selectedReportDetail.status?.toUpperCase() ===
                "APPROVED_UNIVERSITY" &&
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
                      {formatDateTimeVN(selectedReportDetail.reviewedDate)}
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
                        {formatDateTimeVN(selectedReportDetail.reviewedDate)}
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

                // Tính toán điều kiện hiển thị cho Team_officer or Club_treasurer (chỉ khi là creator)
                const shouldShowForTeamOfficer =
                  !permissionsLoading &&
                  isDraft &&
                  (isTeamOfficer || isClubTreasurer) &&
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
                              status: "PENDING_UNIVERSITY" as const,
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
                              (r) =>
                                r.clubReportRequirementId ===
                                Number(requirementId)
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
                        onClick={() => {
                          if (!selectedReportDetail?.id) {
                            toast.error("Không tìm thấy thông tin báo cáo");
                            return;
                          }
                          setDeleteTargetReportId(selectedReportDetail.id);
                          setShowDeleteConfirmDialog(true);
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
                              (r) =>
                                r.clubReportRequirementId ===
                                Number(requirementId)
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
                        onClick={() => {
                          if (!selectedReportDetail?.id) {
                            toast.error("Không tìm thấy thông tin báo cáo");
                            return;
                          }
                          setDeleteTargetReportId(selectedReportDetail.id);
                          setShowDeleteConfirmDialog(true);
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
                              status: "PENDING_UNIVERSITY",
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

                // Tính toán điều kiện hiển thị cho Team_officer or Club_treasurer (chỉ khi là creator)
                const shouldShowForTeamOfficer =
                  !permissionsLoading &&
                  isRejectedClub &&
                  (isTeamOfficer || isClubTreasurer) &&
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
                              (r) =>
                                r.clubReportRequirementId ===
                                Number(requirementId)
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
                  (isTeamOfficer || isClubTreasurer) &&
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
                              (r) =>
                                r.clubReportRequirementId ===
                                Number(requirementId)
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
                              (r) =>
                                r.clubReportRequirementId ===
                                Number(requirementId)
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

      {/* Delete confirmation dialog (replaces window.confirm) */}
      <Dialog
        open={showDeleteConfirmDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteConfirmDialog(false);
            setDeleteTargetReportId(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa báo cáo</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa bản nháp này? Hành động này không thể
              hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4" />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirmDialog(false);
                setDeleteTargetReportId(null);
              }}
              disabled={deletingReport}
            >
              Hủy
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!deleteTargetReportId) {
                  toast.error("Không tìm thấy thông tin báo cáo");
                  return;
                }
                try {
                  setDeletingReport(true);
                  await deleteReport(deleteTargetReportId);
                  toast.success("Báo cáo đã được xóa thành công");
                  setShowDeleteConfirmDialog(false);
                  setShowDetailModal(false);
                  setSelectedReportDetail(null);
                  setDeleteTargetReportId(null);

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
              className="text-red-600"
              disabled={deletingReport}
            >
              {deletingReport ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Label>
                  Tiêu đề báo cáo <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nhập tiêu đề báo cáo"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>
                  Nội dung <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Nhập nội dung có trong báo cáo..."
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
                          <p className="font-medium">Nhấp để chọn file</p>
                          <p className="text-xs text-muted-foreground">
                            Một file hoặc một tệp zip (tối đa 20MB)
                          </p>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;

                          // Enforce single-file upload
                          if (files.length > 1) {
                            toast.error("Chỉ được phép tải lên một tệp");
                            e.target.value = "";
                            return;
                          }

                          const file = files[0];
                          if (file.size > 20 * 1024 * 1024) {
                            toast.error("File vượt quá kích thước tối đa 20MB");
                            e.target.value = "";
                            return;
                          }
                          setDraftFile(file);
                        }}
                        className="hidden"
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
                              reportRequirementId:
                                selectedRequest.submissionRequirementId,
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

                        if (!draftTitle.trim() || !draftContent.trim()) {
                          toast.error(
                            "Vui lòng điền đầy đủ tiêu đề và nội dung"
                          );
                          return;
                        }

                        try {
                          setSubmittingReport(true);

                          let reportIdToSubmit = editingReportId;

                          // Nếu chưa có report, tạo mới với autoSubmit=false (DRAFT)
                          if (!reportIdToSubmit) {
                            const createRequest: CreateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: draftFileUrl || undefined,
                              clubId: clubId,
                              reportRequirementId:
                                selectedRequest.submissionRequirementId,
                              autoSubmit: false, // Tạo với status DRAFT
                            };

                            const createdReport = await createReport(
                              createRequest,
                              draftFile || undefined
                            );
                            reportIdToSubmit = createdReport.id;
                            setEditingReportId(reportIdToSubmit);
                          } else {
                            // Update existing report trước khi submit
                            // Nếu có file mới, gửi file trực tiếp với API (backend sẽ xử lý upload)
                            // Nếu không có file mới, giữ fileUrl cũ
                            const updateRequest: UpdateReportRequest = {
                              reportTitle: draftTitle,
                              content: draftContent,
                              fileUrl: draftFile
                                ? undefined
                                : draftFileUrl || undefined,
                            };
                            await updateReport(
                              reportIdToSubmit,
                              updateRequest,
                              draftFile || undefined
                            );
                          }

                          // Gọi reviewReportByClub trực tiếp để nộp lên trường
                          // Backend hỗ trợ review từ DRAFT và sẽ tự động set submittedDate
                          const reviewRequest = {
                            reportId: reportIdToSubmit,
                            status: "PENDING_UNIVERSITY" as const,
                          };
                          await reviewReportByClub(reviewRequest);

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
                        handleSaveDraft(
                          String(selectedRequest.submissionRequirementId)
                        )
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
                              reportRequirementId:
                                selectedRequest.submissionRequirementId,
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

      {showEditDialog && selectedReportDetail && (
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
                <Label>
                  Tiêu đề báo cáo<span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nhập tiêu đề báo cáo"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>
                  Nội dung <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Nhập nội dung có trong báo cáo..."
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
                          <p className="font-medium">Nhấp để chọn file</p>
                          <p className="text-xs text-muted-foreground">
                            Một file hoặc một tệp zip (tối đa 20MB)
                          </p>
                        </div>
                      </div>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;

                          // Enforce single-file upload
                          if (files.length > 1) {
                            toast.error("Chỉ được phép tải lên một tệp");
                            e.target.value = "";
                            return;
                          }

                          const file = files[0];
                          if (file.size > 20 * 1024 * 1024) {
                            toast.error("File vượt quá kích thước tối đa 20MB");
                            e.target.value = "";
                            return;
                          }
                          setDraftFile(file);
                          // Xóa fileUrl cũ khi chọn file mới
                          setDraftFileUrl("");
                        }}
                        className="hidden"
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
                      isResubmitFromUniversity &&
                      (isTeamOfficer || isClubTreasurer);

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
                          requestId = String(
                            selectedRequest.submissionRequirementId
                          );
                        } else if (
                          selectedReportDetail?.reportRequirement?.id
                        ) {
                          requestId =
                            selectedReportDetail.reportRequirement?.id != null
                              ? String(
                                  selectedReportDetail.reportRequirement.id
                                )
                              : undefined;
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

                                  // Sau đó gọi API reviewReportByClub để nộp lên trường
                                  const reviewRequest: ReviewReportByClubRequest =
                                    {
                                      reportId: editingReportId,
                                      status: "PENDING_UNIVERSITY",
                                    };
                                  await reviewReportByClub(reviewRequest);
                                  toast.success(
                                    "Báo cáo đã được nộp lên trường thành công"
                                  );
                                } else {
                                  // Nếu không (team officer), cập nhật báo cáo trước rồi nộp lên câu lạc bộ
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

                                  // Sau đó gọi API submitReport để nộp lên câu lạc bộ
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
                <p className="text-xs text-gray-500 mt-1"></p>
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
