import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Eye,
  Edit,
  Share2,
  Loader2,
  Lock,
  Unlock,
  AlertTriangle,
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
  getRecruitmentsByClubId,
  getApplicationsByRecruitmentId,
  getRecruitmentById,
  createRecruitment,
  updateRecruitment,
  changeRecruitmentStatus,
  updateApplicationStatus,
  updateInterviewSchedule,
  type RecruitmentCreateRequest,
  type RecruitmentApplicationListData,
  type RecruitmentData,
} from "@/services/recruitmentService";
import { toast } from "sonner";
import { RecruitmentForm } from "@/components/recruitment/RecruitmentForm";
import { ApplicationsList } from "@/components/recruitment/ApplicationsList";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/useDebounce";

type ApplicationStatus = "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "INTERVIEW";

const statusLabels: Record<string, string> = {
  DRAFT: "Bản nháp",
  OPEN: "Đang mở",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã hủy",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  OPEN: "bg-green-100 text-green-700",
  CLOSED: "bg-red-100 text-red-700",
  CANCELLED: "bg-orange-100 text-orange-700",
};

export function RecruitmentManagement() {
  const params = useParams();
  const clubIdParam = params.clubId;
  const clubId = clubIdParam ? Number(clubIdParam) : undefined;

  const [activeTab, setActiveTab] = useState<
    "list" | "create" | "applications"
  >("list");
  const [selectedRecruitment, setSelectedRecruitment] =
    useState<RecruitmentData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<
    "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED" | "all"
  >("all");

  // API data states
  const [recruitments, setRecruitments] = useState<RecruitmentData[]>([]);
  const [applications, setApplications] = useState<
    RecruitmentApplicationListData[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRecruitment, setEditingRecruitment] =
    useState<RecruitmentData | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);

  // Pagination states for recruitments
  const [recruitmentsPage, setRecruitmentsPage] = useState(1);
  const [recruitmentsTotalPages, setRecruitmentsTotalPages] = useState(0);
  const [, setRecruitmentsTotalElements] = useState(0);
  const recruitmentsPageSize = 10;

  // Pagination states for applications
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsTotalPages, setApplicationsTotalPages] = useState(0);
  const [applicationsTotalElements, setApplicationsTotalElements] = useState(0);
  const applicationsPageSize = 10;

  // Search and filter states for applications
  const [applicationsSearchQuery, setApplicationsSearchQuery] = useState("");
  const debouncedApplicationsSearchQuery = useDebounce(
    applicationsSearchQuery,
    300
  );
  const [applicationsStatusFilter, setApplicationsStatusFilter] = useState<
    ApplicationStatus | "all"
  >("all");
  const [applicationsRefreshTrigger, setApplicationsRefreshTrigger] =
    useState(0);

  // Dialog states
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean;
    recruitmentId: number;
    newStatus: "OPEN" | "CLOSED";
    title: string;
  } | null>(null);
  const [cancelFormDialog, setCancelFormDialog] = useState(false);
  const [saveWithOpenStatusDialog, setSaveWithOpenStatusDialog] = useState<{
    open: boolean;
    requestData: RecruitmentCreateRequest;
    isEdit: boolean;
  } | null>(null);

  // Function to fetch recruitments
  const fetchRecruitments = useCallback(async () => {
    if (!clubId) return;

    setLoading(true);
    setError(null);
    try {
      const apiStatus =
        statusFilter !== "all"
          ? (statusFilter.toUpperCase() as
              | "DRAFT"
              | "OPEN"
              | "CLOSED"
              | "CANCELLED")
          : undefined;

      const response = await getRecruitmentsByClubId(clubId, {
        status: apiStatus,
        keyword: debouncedSearchQuery || undefined,
        page: recruitmentsPage, // Backend now accepts 1-based pagination
        size: recruitmentsPageSize,
      });

      // Update pagination states
      setRecruitmentsTotalPages(response.totalPages);
      setRecruitmentsTotalElements(response.totalElements);

      // Use API data directly (no mapping needed)
      setRecruitments(response.content);
    } catch (err: any) {
      console.error("Error fetching recruitments:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Không thể tải danh sách tuyển dụng";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [clubId, statusFilter, debouncedSearchQuery, recruitmentsPage]);

  // Fetch recruitments from API on mount and when filters change
  useEffect(() => {
    fetchRecruitments();
  }, [fetchRecruitments]);

  // Reset to page 1 when filter or debounced search query changes
  useEffect(() => {
    setRecruitmentsPage(1);
  }, [statusFilter, debouncedSearchQuery]);

  // Fetch applications when a recruitment is selected
  useEffect(() => {
    const fetchApplications = async () => {
      if (!selectedRecruitment) {
        setApplications([]);
        return;
      }

      setApplicationsLoading(true);
      try {
        const apiStatus =
          applicationsStatusFilter !== "all"
            ? (applicationsStatusFilter.toUpperCase() as
                | "UNDER_REVIEW"
                | "ACCEPTED"
                | "REJECTED"
                | "INTERVIEW")
            : undefined;

        const response = await getApplicationsByRecruitmentId(
          selectedRecruitment.id,
          {
            status: apiStatus,
            keyword: debouncedApplicationsSearchQuery || undefined,
            page: applicationsPage, // Backend now accepts 1-based pagination
            size: applicationsPageSize,
          }
        );

        // Update pagination states
        setApplicationsTotalPages(response.totalPages);
        setApplicationsTotalElements(response.totalElements);

        // Use API data directly (no mapping needed)
        setApplications(response.content);
      } catch (err: any) {
        console.error("Error fetching applications:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Không thể tải danh sách đơn ứng tuyển";
        toast.error(errorMessage);
      } finally {
        setApplicationsLoading(false);
      }
    };

    fetchApplications();
  }, [
    selectedRecruitment?.id,
    applicationsPage,
    debouncedApplicationsSearchQuery,
    applicationsStatusFilter,
    applicationsRefreshTrigger,
  ]);

  // Reset to page 1 when applications filter changes
  useEffect(() => {
    setApplicationsPage(1);
  }, [
    selectedRecruitment?.id,
    debouncedApplicationsSearchQuery,
    applicationsStatusFilter,
  ]);

  const handleEditRecruitment = async (recruitment: RecruitmentData) => {
    // Check if recruitment is closed
    if (recruitment.status === "CLOSED") {
      toast.error("Không thể chỉnh sửa đợt tuyển dụng đã đóng");
      return;
    }

    try {
      setEditLoading(true);
      setActiveTab("create"); // Switch to create tab immediately to show skeleton

      // Fetch fresh data from API to ensure we have the latest data
      const freshData = await getRecruitmentById(recruitment.id);

      // Load recruitment data into form (use directly from API)
      setEditingRecruitment(freshData);
    } catch (err: any) {
      console.error("Error loading recruitment for edit:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Không thể tải dữ liệu đợt tuyển dụng";
      toast.error(errorMessage);
      setActiveTab("list"); // Go back to list on error
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelForm = () => {
    // Show confirmation dialog
    setCancelFormDialog(true);
  };

  const confirmCancelForm = () => {
    setEditingRecruitment(null);
    setEditLoading(false); // Reset edit loading state
    setActiveTab("list");
    setCancelFormDialog(false);
  };

  const handleSaveRecruitment = async (
    requestData: RecruitmentCreateRequest,
    isEdit: boolean
  ) => {
    // Nếu status là OPEN, hiển thị dialog xác nhận
    if (requestData.status === "OPEN") {
      setSaveWithOpenStatusDialog({
        open: true,
        requestData,
        isEdit,
      });
      return;
    }

    // Nếu không phải OPEN, tiến hành save trực tiếp
    await performSaveRecruitment(requestData, isEdit);
  };

  // Hàm thực hiện save recruitment (sau khi đã xác nhận hoặc không cần xác nhận)
  const performSaveRecruitment = async (
    requestData: RecruitmentCreateRequest,
    isEdit: boolean
  ) => {
    setCreateLoading(true);
    try {
      if (isEdit && editingRecruitment) {
        // Update existing recruitment
        await updateRecruitment(editingRecruitment.id, requestData);
        toast.success("Cập nhật đợt tuyển dụng thành công!");
      } else {
        // Create new recruitment
        if (!clubId) {
          throw new Error("Club ID không hợp lệ");
        }
        await createRecruitment(clubId, requestData);
        toast.success("Tạo đợt tuyển dụng thành công!");
      }

      // Reset form
      setEditingRecruitment(null);
      setActiveTab("list");

      // Refetch recruitments
      await fetchRecruitments();
    } catch (err: any) {
      console.error("Error saving recruitment:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        (isEdit
          ? "Không thể cập nhật đợt tuyển dụng"
          : "Không thể tạo đợt tuyển dụng");
      toast.error(errorMessage);
      throw err; // Re-throw to let the form component handle it
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateApplicationStatus = async (
    applicationId: string,
    newStatus: ApplicationStatus,
    notes?: string,
    interviewTime?: string,
    interviewAddress?: string,
    interviewPreparationRequirements?: string,
    suppressToast?: boolean
  ) => {
    try {
      // Convert status to API format
      const apiStatus = newStatus.toUpperCase() as
        | "UNDER_REVIEW"
        | "ACCEPTED"
        | "REJECTED"
        | "INTERVIEW";

      // Call API to update application status
      const updatedApplication = await updateApplicationStatus(
        parseInt(applicationId),
        apiStatus,
        notes,
        interviewTime,
        interviewAddress,
        interviewPreparationRequirements
      );

      // Map response back to component format
      // No need to convert - backend already returns UPPERCASE
      const mappedStatus = updatedApplication.status;

      // Update local state
      setApplications((prevApplications) =>
        prevApplications.map((app) =>
          app.id === parseInt(applicationId)
            ? {
                ...app,
                status: mappedStatus,
                notes: updatedApplication.reviewNotes,
                interviewTime: updatedApplication.interviewTime,
                interviewAddress: updatedApplication.interviewAddress,
                interviewPreparationRequirements:
                  updatedApplication.interviewPreparationRequirements,
              }
            : app
        )
      );

      // Show success message (unless suppressed)
      if (!suppressToast) {
        const statusText = {
          UNDER_REVIEW: "đang xem xét",
          ACCEPTED: "đã chấp nhận",
          REJECTED: "đã từ chối",
          INTERVIEW: "đã mời phỏng vấn",
        }[mappedStatus];

        toast.success(`Đã cập nhật trạng thái đơn thành ${statusText}!`);
      }

      // Trigger refresh to get latest data from server
      setApplicationsRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error updating application status:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Không thể cập nhật trạng thái đơn";
      toast.error(errorMessage);
    }
  };

  const handleUpdateInterview = async (
    applicationId: number,
    interviewTime?: string,
    interviewAddress?: string,
    interviewPreparationRequirements?: string
  ) => {
    try {
      const updatedApplication = await updateInterviewSchedule(
        applicationId,
        interviewTime,
        interviewAddress,
        interviewPreparationRequirements
      );

      // Update local state
      setApplications((prevApplications) =>
        prevApplications.map((app) =>
          app.id === applicationId
            ? {
                ...app,
                interviewTime: updatedApplication.interviewTime,
                interviewAddress: updatedApplication.interviewAddress,
                interviewPreparationRequirements:
                  updatedApplication.interviewPreparationRequirements,
              }
            : app
        )
      );

      toast.success("Đã cập nhật thông tin phỏng vấn!");

      // Trigger refresh to get latest data from server
      setApplicationsRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error updating interview schedule:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Không thể cập nhật thông tin phỏng vấn";
      toast.error(errorMessage);
    }
  };

  // Show status change confirmation dialog
  const showStatusChangeDialog = (
    recruitmentId: number,
    newStatus: "OPEN" | "CLOSED",
    title: string
  ) => {
    setStatusChangeDialog({
      open: true,
      recruitmentId,
      newStatus,
      title,
    });
  };

  // Actual status change function (called after confirmation)
  const handleChangeRecruitmentStatus = async (
    recruitmentId: number,
    newStatus: "OPEN" | "CLOSED"
  ) => {
    try {
      // Set loading state for this specific button
      setChangingStatusId(recruitmentId);

      await changeRecruitmentStatus(recruitmentId, newStatus);

      const statusText = newStatus === "OPEN" ? "mở" : "đóng";
      toast.success(
        `${statusText === "mở" ? "Mở" : "Đóng"} đơn tuyển dụng thành công!`
      );

      // Update the recruitment in the local state immediately for instant UI update
      setRecruitments((prevRecruitments) =>
        prevRecruitments.map((r) =>
          r.id === recruitmentId ? { ...r, status: newStatus } : r
        )
      );

      // Reset filter to "all" to show the updated recruitment
      // (so it doesn't disappear if user was filtering by specific status)
      if (statusFilter !== "all") {
        setStatusFilter("all");
      }
    } catch (err: any) {
      console.error("Error changing recruitment status:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Không thể thay đổi trạng thái đơn tuyển dụng";
      toast.error(errorMessage);

      // Refetch on error to ensure consistency
      await fetchRecruitments();
    } finally {
      setChangingStatusId(null);
      setStatusChangeDialog(null);
    }
  };

  // Confirm status change
  const confirmStatusChange = async () => {
    if (!statusChangeDialog) return;

    await handleChangeRecruitmentStatus(
      statusChangeDialog.recruitmentId,
      statusChangeDialog.newStatus
    );
  };

  // Confirm save with OPEN status
  const confirmSaveWithOpenStatus = async () => {
    if (!saveWithOpenStatusDialog) return;

    setSaveWithOpenStatusDialog(null);
    await performSaveRecruitment(
      saveWithOpenStatusDialog.requestData,
      saveWithOpenStatusDialog.isEdit
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Quản lý Tuyển dụng
              </h1>
              <p className="text-muted-foreground mt-1">
                Tạo và quản lý các đợt tuyển thành viên mới
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant={activeTab === "list" ? "default" : "outline"}
                onClick={() => setActiveTab("list")}
                className={`
                    transition-all duration-300 ease-in-out flex-1 md:flex-none
                    ${
                      activeTab === "list"
                        ? "bg-primary text-primary-foreground shadow-md scale-105 border-primary ring-2 ring-primary/30"
                        : "border-primary/30"
                    }
                  `}
              >
                <FileText className="h-4 w-4 mr-2" />
                Danh sách
              </Button>
              <Button
                variant={activeTab === "create" ? "default" : "outline"}
                onClick={() => {
                  setEditingRecruitment(null);
                  setEditLoading(false); // Reset edit loading state
                  setActiveTab("create");
                }}
                className={`
                    transition-all duration-300 ease-in-out flex-1 md:flex-none
                    ${
                      activeTab === "create"
                        ? "bg-primary text-primary-foreground shadow-md scale-105 border-primary ring-2 ring-primary/30"
                        : "border-primary/30 "
                    }
                  `}
              >
                {activeTab === "create" && editingRecruitment ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Chỉnh sửa
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo mới
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Recruitment List Tab */}
        {activeTab === "list" && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm đợt tuyển dụng theo tiêu đề và mô tả"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(
                    value as "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED" | "all"
                  )
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="DRAFT">Bản nháp</SelectItem>
                  <SelectItem value="OPEN">Đang mở</SelectItem>
                  <SelectItem value="CLOSED">Đã đóng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, index) => (
                  <Card
                    key={index}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Title */}
                          <Skeleton className="h-5 w-3/4" />
                          {/* Badges */}
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-20 rounded-full" />
                            {index === 1 && (
                              <Skeleton className="h-5 w-32 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Description - 3 lines */}
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-4/5" />
                        </div>

                        {/* Grid stats - 2x2 */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="space-y-1">
                              <Skeleton className="h-3 w-20" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                          ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap">
                          <Skeleton className="h-9 w-20" />
                          <Skeleton className="h-9 w-24" />
                          <Skeleton className="h-9 w-20" />
                          <Skeleton className="h-9 w-20" />
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
                <p className="text-red-500 mb-4">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Thử lại
                </Button>
              </div>
            )}

            {/* Recruitment Cards */}
            {!loading && !error && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {recruitments.map((recruitment) => (
                  <Card
                    key={recruitment.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {recruitment.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={statusColors[recruitment.status]}>
                              {statusLabels[recruitment.status]}
                            </Badge>
                            {recruitment.status === "CLOSED" && (
                              <Badge
                                variant="outline"
                                className="text-xs text-muted-foreground"
                              >
                                🔒 Không thể chỉnh sửa
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {recruitment.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Kết thúc:
                          </span>
                          <div className="font-medium">
                            {new Date(recruitment.endDate).toLocaleString(
                              "vi-VN",
                              {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Đơn ứng tuyển:
                          </span>
                          <div className="font-medium">
                            {recruitment.totalApplications ?? 0}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Đã duyệt:
                          </span>
                          <div className="font-medium text-green-600">
                            {recruitment.acceptedApplications ?? 0}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRecruitment(recruitment);
                            setActiveTab("applications");
                            setApplicationsRefreshTrigger((prev) => prev + 1);
                          }}
                          className="bg-transparent"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Các đơn ứng tuyển
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          onClick={() => handleEditRecruitment(recruitment)}
                          disabled={recruitment.status === "CLOSED"}
                          title={
                            recruitment.status === "CLOSED"
                              ? "Không thể chỉnh sửa đợt tuyển dụng đã đóng"
                              : "Chỉnh sửa đợt tuyển dụng"
                          }
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa
                        </Button>
                        {recruitment.status === "DRAFT" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              showStatusChangeDialog(
                                recruitment.id,
                                "OPEN",
                                recruitment.title
                              )
                            }
                            disabled={changingStatusId === recruitment.id}
                            className="bg-transparent text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                          >
                            {changingStatusId === recruitment.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <Unlock className="h-4 w-4 mr-2" />
                                Mở đơn
                              </>
                            )}
                          </Button>
                        )}
                        {recruitment.status === "OPEN" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              showStatusChangeDialog(
                                recruitment.id,
                                "CLOSED",
                                recruitment.title
                              )
                            }
                            disabled={changingStatusId === recruitment.id}
                            className="bg-transparent text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            {changingStatusId === recruitment.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Đóng đơn
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          disabled={recruitment.status === "CLOSED"}
                          onClick={async () => {
                            try {
                              const shareUrl = `${window.location.origin}/clubDetail/${recruitment.clubId}?tab=recruitment#recruitment-${recruitment.id}`;
                              await navigator.clipboard.writeText(shareUrl);
                              toast.success("Đã sao chép đường dẫn chia sẻ");
                            } catch (e) {
                              toast.error("Không thể sao chép đường dẫn");
                            }
                          }}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Chia sẻ
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && !error && recruitments.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Không tìm thấy đợt tuyển dụng nào
                </p>
                <Button
                  variant="outline"
                  className="mt-4 bg-transparent"
                  onClick={() => setActiveTab("create")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo đợt tuyển dụng mới
                </Button>
              </div>
            )}

            {/* Pagination for Recruitments */}
            {!loading && !error && recruitmentsTotalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => {
                          setRecruitmentsPage((prev) => Math.max(1, prev - 1));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={
                          recruitmentsPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {/* Show page numbers with ellipsis when needed */}
                    {(() => {
                      const pages: (number | "ellipsis")[] = [];

                      if (recruitmentsTotalPages <= 7) {
                        // Show all pages if 7 or fewer
                        for (let i = 1; i <= recruitmentsTotalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Always show first page
                        pages.push(1);

                        // Show ellipsis if current page is far from start
                        if (recruitmentsPage > 3) {
                          pages.push("ellipsis");
                        }

                        // Show pages around current (avoid duplicates with first/last)
                        const start = Math.max(2, recruitmentsPage - 1);
                        const end = Math.min(
                          recruitmentsTotalPages - 1,
                          recruitmentsPage + 1
                        );
                        for (let i = start; i <= end; i++) {
                          if (i !== 1 && i !== recruitmentsTotalPages) {
                            pages.push(i);
                          }
                        }

                        // Show ellipsis if current page is far from end
                        if (recruitmentsPage < recruitmentsTotalPages - 2) {
                          pages.push("ellipsis");
                        }

                        // Always show last page (if not already shown)
                        if (recruitmentsTotalPages !== 1) {
                          pages.push(recruitmentsTotalPages);
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
                                setRecruitmentsPage(item);
                                window.scrollTo({
                                  top: 0,
                                  behavior: "smooth",
                                });
                              }}
                              isActive={recruitmentsPage === item}
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
                          setRecruitmentsPage((prev) =>
                            Math.min(recruitmentsTotalPages, prev + 1)
                          );
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={
                          recruitmentsPage === recruitmentsTotalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      ></PaginationNext>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Recruitment Tab */}
        {activeTab === "create" && (
          <RecruitmentForm
            clubId={clubId}
            editingRecruitment={editingRecruitment}
            onSave={handleSaveRecruitment}
            onCancel={handleCancelForm}
            createLoading={createLoading}
            editLoading={editLoading}
          />
        )}

        {/* Applications Tab */}
        {activeTab === "applications" && selectedRecruitment && (
          <ApplicationsList
            recruitmentTitle={selectedRecruitment.title}
            applications={applications}
            applicationsLoading={applicationsLoading}
            onUpdateApplicationStatus={handleUpdateApplicationStatus}
            onUpdateInterview={handleUpdateInterview}
            currentPage={applicationsPage}
            totalPages={applicationsTotalPages}
            totalElements={applicationsTotalElements}
            onPageChange={(page) => setApplicationsPage(page)}
            searchQuery={applicationsSearchQuery}
            onSearchChange={setApplicationsSearchQuery}
            statusFilter={applicationsStatusFilter}
            onStatusFilterChange={setApplicationsStatusFilter}
          />
        )}
      </div>

      {/* Status Change Confirmation Dialog */}
      <Dialog
        open={statusChangeDialog?.open || false}
        onOpenChange={(open) => !open && setStatusChangeDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-full ${
                  statusChangeDialog?.newStatus === "OPEN"
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                <AlertTriangle
                  className={`h-6 w-6 ${
                    statusChangeDialog?.newStatus === "OPEN"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                />
              </div>
              <div>
                <DialogTitle>
                  {statusChangeDialog?.newStatus === "OPEN"
                    ? "Xác nhận mở đơn tuyển dụng"
                    : "Xác nhận đóng đơn tuyển dụng"}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <DialogDescription className="py-4">
            <div className="space-y-3">
              <p className="text-base">
                {statusChangeDialog?.newStatus === "OPEN" ? (
                  <>
                    Bạn có chắc chắn muốn{" "}
                    <strong className="text-green-600">mở đơn</strong> cho đợt
                    tuyển dụng:
                  </>
                ) : (
                  <>
                    Bạn có chắc chắn muốn{" "}
                    <strong className="text-red-600">đóng đơn</strong> cho đợt
                    tuyển dụng:
                  </>
                )}
              </p>
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium text-foreground">
                  "{statusChangeDialog?.title}"
                </p>
              </div>
              {statusChangeDialog?.newStatus === "OPEN" && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      ✓ Sinh viên sẽ có thể nộp đơn ứng tuyển sau khi mở
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      ⚠️ Tất cả các đợt tuyển dụng khác đang mở sẽ tự động
                      chuyển sang trạng thái "Đã đóng"
                    </p>
                  </div>
                </>
              )}
              {statusChangeDialog?.newStatus === "CLOSED" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    ⚠️ Sau khi đóng, đợt tuyển dụng sẽ không thể chỉnh sửa và
                    sinh viên không thể nộp đơn nữa
                  </p>
                </div>
              )}
            </div>
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusChangeDialog(null)}
              disabled={changingStatusId !== null}
            >
              Hủy
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={changingStatusId !== null}
              className={
                statusChangeDialog?.newStatus === "OPEN"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {changingStatusId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  {statusChangeDialog?.newStatus === "OPEN"
                    ? "Mở đơn"
                    : "Đóng đơn"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Form Confirmation Dialog */}
      <Dialog open={cancelFormDialog} onOpenChange={setCancelFormDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-100">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <DialogTitle>Xác nhận hủy thao tác</DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <DialogDescription className="py-4">
            <div className="space-y-3">
              <p className="text-base">
                Bạn có chắc chắn muốn hủy{" "}
                {editingRecruitment ? "chỉnh sửa" : "tạo mới"} đợt tuyển dụng?
              </p>
              {editingRecruitment && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium text-foreground">
                    "{editingRecruitment.title}"
                  </p>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  ⚠️ Các thay đổi chưa lưu sẽ bị mất
                </p>
              </div>
            </div>
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelFormDialog(false)}
            >
              Tiếp tục chỉnh sửa
            </Button>
            <Button variant="destructive" onClick={confirmCancelForm}>
              Hủy bỏ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save with OPEN Status Confirmation Dialog */}
      <Dialog
        open={saveWithOpenStatusDialog?.open || false}
        onOpenChange={(open) => !open && setSaveWithOpenStatusDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100">
                <AlertTriangle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle>
                  Xác nhận{" "}
                  {saveWithOpenStatusDialog?.isEdit ? "cập nhật" : "tạo"} đợt
                  tuyển dụng
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <DialogDescription className="py-4">
            <div className="space-y-3">
              <p className="text-base">
                {saveWithOpenStatusDialog?.isEdit ? (
                  <>
                    Bạn đang cập nhật đợt tuyển dụng với trạng thái{" "}
                    <strong className="text-green-600">"Đang mở"</strong>
                  </>
                ) : (
                  <>
                    Bạn đang tạo đợt tuyển dụng mới với trạng thái{" "}
                    <strong className="text-green-600">"Đang mở"</strong>
                  </>
                )}
              </p>
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium text-foreground">
                  "{saveWithOpenStatusDialog?.requestData.title}"
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 font-medium">
                  ⚠️ Lưu ý quan trọng:
                </p>
                <p className="text-sm text-amber-800 mt-2">
                  Tất cả các đợt tuyển dụng khác đang ở trạng thái "Đang mở" sẽ
                  tự động chuyển sang trạng thái "Đã đóng" để đảm bảo chỉ có một
                  đợt tuyển dụng mở tại một thời điểm.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✓ Sinh viên sẽ có thể nộp đơn ứng tuyển cho đợt tuyển dụng này
                </p>
              </div>
            </div>
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveWithOpenStatusDialog(null)}
              disabled={createLoading}
            >
              Hủy
            </Button>
            <Button
              onClick={confirmSaveWithOpenStatus}
              disabled={createLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {createLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  Xác nhận{" "}
                  {saveWithOpenStatusDialog?.isEdit ? "cập nhật" : "tạo"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
