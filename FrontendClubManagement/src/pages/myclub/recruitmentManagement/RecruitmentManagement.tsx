"use client";

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
  type RecruitmentCreateRequest,
} from "@/services/recruitmentService";
import { toast } from "sonner";
import { RecruitmentForm } from "@/components/features/recruitment/RecruitmentForm";
import { ApplicationsList } from "@/components/features/recruitment/ApplicationsList";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/useDebounce";

type RecruitmentStatus = "draft" | "open" | "closed" | "cancelled";
type ApplicationStatus = "under_review" | "accepted" | "rejected" | "interview";
type QuestionType = "TEXT" | "MCQ" | "CHECKBOX" | "FILE";

interface RecruitmentForm {
  form_id?: string; // Optional for new questions
  question_text: string;
  question_type: QuestionType;
  question_order: number;
  options?: string[]; // For MCQ and CHECKBOX
  required?: boolean;
}

interface RecruitmentApplication {
  application_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  student_id: string;
  submitted_at: string;
  status: ApplicationStatus;
  answers: Record<string, any>;
  score?: number;
  notes?: string;
  avatar?: string;
}

interface Recruitment {
  recruitment_id: string;
  club_id: string;
  semester_id: string;
  semester_name: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: RecruitmentStatus;
  requirements?: string[];
  benefits?: string[];
  form_questions: RecruitmentForm[];
  teamOptions?: Array<{ id: number; teamName: string; description?: string }>;
  applications: RecruitmentApplication[];
  totalApplications?: number; // Tổng số đơn ứng tuyển đã nộp từ API
  acceptedApplications?: number; // Số đơn đã được chấp nhận từ API
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<RecruitmentStatus, string> = {
  draft: "Bản nháp",
  open: "Đang mở",
  closed: "Đã đóng",
  cancelled: "Đã hủy",
};

const statusColors: Record<RecruitmentStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
  cancelled: "bg-blue-100 text-blue-700",
};

export function RecruitmentManagement() {
  const params = useParams();
  const clubIdParam = params.clubId;
  const clubId = clubIdParam ? Number(clubIdParam) : undefined;

  const [activeTab, setActiveTab] = useState<
    "list" | "create" | "applications"
  >("list");
  const [selectedRecruitment, setSelectedRecruitment] =
    useState<Recruitment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<RecruitmentStatus | "all">(
    "all"
  );

  // API data states
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [applications, setApplications] = useState<RecruitmentApplication[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRecruitment, setEditingRecruitment] =
    useState<Recruitment | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);

  // Pagination states for recruitments
  const [recruitmentsPage, setRecruitmentsPage] = useState(0);
  const [recruitmentsTotalPages, setRecruitmentsTotalPages] = useState(0);
  const [recruitmentsTotalElements, setRecruitmentsTotalElements] = useState(0);
  const recruitmentsPageSize = 10;

  // Pagination states for applications
  const [applicationsPage, setApplicationsPage] = useState(0);
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

  // Dialog states
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean;
    recruitmentId: string;
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
        page: recruitmentsPage,
        size: recruitmentsPageSize,
      });

      // Update pagination states
      setRecruitmentsTotalPages(response.totalPages);
      setRecruitmentsTotalElements(response.totalElements);

      // Map API data to component format
      const mappedRecruitments: Recruitment[] = response.content.map((r) => ({
        recruitment_id: r.id.toString(),
        club_id: r.clubId.toString(),
        semester_id: "Fall2024", // TODO: Get from API if available
        semester_name: "Fall 2024", // TODO: Get from API if available
        title: r.title,
        description: r.description,
        start_date: r.startDate,
        end_date: r.endDate,
        status: r.status.toLowerCase() as RecruitmentStatus,
        requirements: r.requirements ? r.requirements.split("\n") : [],
        benefits: [], // TODO: Get from API if available
        form_questions: (r.questions || []).map((q) => ({
          form_id: q.id.toString(),
          question_text: q.questionText,
          question_type: (q.questionType === "FILE_UPLOAD"
            ? "FILE"
            : q.questionType) as QuestionType,
          question_order: q.questionOrder,
          options: q.options,
          required: q.isRequired === 1, // Map from API isRequired field
        })),
        teamOptions: r.teamOptions,
        applications: [], // Will be fetched separately when needed
        totalApplications: r.totalApplications || 0,
        acceptedApplications: r.acceptedApplications || 0,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }));

      setRecruitments(mappedRecruitments);
    } catch (err: any) {
      console.error("Error fetching recruitments:", err);
      setError(err.message || "Không thể tải danh sách tuyển dụng");
      toast.error("Không thể tải danh sách tuyển dụng");
    } finally {
      setLoading(false);
    }
  }, [clubId, statusFilter, debouncedSearchQuery, recruitmentsPage]);

  // Fetch recruitments from API on mount and when filters change
  useEffect(() => {
    fetchRecruitments();
  }, [fetchRecruitments]);

  // Reset to page 0 when filter or debounced search query changes
  useEffect(() => {
    setRecruitmentsPage(0);
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
          parseInt(selectedRecruitment.recruitment_id),
          {
            status: apiStatus,
            keyword: debouncedApplicationsSearchQuery || undefined,
            page: applicationsPage,
            size: applicationsPageSize,
          }
        );

        // Update pagination states
        setApplicationsTotalPages(response.totalPages);
        setApplicationsTotalElements(response.totalElements);

        // Map API data to component format
        const mappedApplications: RecruitmentApplication[] =
          response.content.map((a) => {
            // Convert answers array to object format for the component
            const answersMap: Record<string, any> = {};
            if (a.answers && Array.isArray(a.answers)) {
              a.answers.forEach((answer) => {
                answersMap[answer.questionId.toString()] =
                  answer.answerText || answer.fileUrl || "";
              });
            }

            return {
              application_id: a.id.toString(),
              user_id: a.applicantId.toString(),
              user_name: a.userName,
              user_email: a.userEmail,
              user_phone: a.userPhone,
              student_id: a.studentId,
              submitted_at: a.submittedDate,
              status: a.status.toLowerCase() as ApplicationStatus,
              answers: answersMap,
              score: a.score,
              notes: a.reviewNotes,
            };
          });

        setApplications(mappedApplications);

        // Update selected recruitment with applications
        setSelectedRecruitment((prev) =>
          prev ? { ...prev, applications: mappedApplications } : null
        );
      } catch (err: any) {
        console.error("Error fetching applications:", err);
        toast.error("Không thể tải danh sách đơn ứng tuyển");
      } finally {
        setApplicationsLoading(false);
      }
    };

    fetchApplications();
  }, [
    selectedRecruitment?.recruitment_id,
    applicationsPage,
    debouncedApplicationsSearchQuery,
    applicationsStatusFilter,
  ]);

  // Reset applications page when recruitment, debounced search, or filter changes
  useEffect(() => {
    setApplicationsPage(0);
  }, [
    selectedRecruitment?.recruitment_id,
    debouncedApplicationsSearchQuery,
    applicationsStatusFilter,
  ]);

  const handleEditRecruitment = async (recruitment: Recruitment) => {
    // Check if recruitment is closed
    if (recruitment.status === "closed") {
      toast.error("Không thể chỉnh sửa đợt tuyển dụng đã đóng");
      return;
    }

    try {
      setEditLoading(true);
      setActiveTab("create"); // Switch to create tab immediately to show skeleton

      // Fetch fresh data from API to ensure we have the latest data
      const freshData = await getRecruitmentById(
        parseInt(recruitment.recruitment_id)
      );

      // Map API data to component format
      const mappedRecruitment: Recruitment = {
        recruitment_id: freshData.id.toString(),
        club_id: freshData.clubId.toString(),
        semester_id: "Fall2024",
        semester_name: "Fall 2024",
        title: freshData.title,
        description: freshData.description,
        start_date: freshData.startDate,
        end_date: freshData.endDate,
        status: freshData.status.toLowerCase() as RecruitmentStatus,
        requirements: freshData.requirements
          ? freshData.requirements.split("\n")
          : [],
        benefits: [],
        form_questions: (freshData.questions || []).map((q) => ({
          form_id: q.id.toString(),
          question_text: q.questionText,
          question_type: (q.questionType === "FILE_UPLOAD"
            ? "FILE"
            : q.questionType) as QuestionType,
          question_order: q.questionOrder,
          options: q.options,
          required: q.isRequired === 1, // Map from API isRequired field
        })),
        teamOptions: freshData.teamOptions, // Map team options
        applications: [],
        totalApplications: freshData.totalApplications || 0,
        acceptedApplications: freshData.acceptedApplications || 0,
        created_at: freshData.createdAt,
        updated_at: freshData.updatedAt,
      };

      console.log("Mapped recruitment for editing:", mappedRecruitment);
      console.log("Team options from API:", freshData.teamOptions);

      // Load recruitment data into form
      setEditingRecruitment(mappedRecruitment);
    } catch (err: any) {
      console.error("Error loading recruitment for edit:", err);
      toast.error("Không thể tải dữ liệu đợt tuyển dụng");
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
        await updateRecruitment(
          parseInt(editingRecruitment.recruitment_id),
          requestData
        );
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
      toast.error(
        err.message ||
          (isEdit
            ? "Không thể cập nhật đợt tuyển dụng"
            : "Không thể tạo đợt tuyển dụng")
      );
      throw err; // Re-throw to let the form component handle it
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateApplicationStatus = async (
    applicationId: string,
    newStatus: ApplicationStatus,
    notes?: string
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
        notes
      );

      // Map response back to component format
      const mappedStatus =
        updatedApplication.status.toLowerCase() as ApplicationStatus;

      // Update local state
      setApplications((prevApplications) =>
        prevApplications.map((app) =>
          app.application_id === applicationId
            ? {
                ...app,
                status: mappedStatus,
                notes: updatedApplication.reviewNotes,
              }
            : app
        )
      );

      // Update selected recruitment applications
      if (selectedRecruitment) {
        setSelectedRecruitment({
          ...selectedRecruitment,
          applications: selectedRecruitment.applications.map((app) =>
            app.application_id === applicationId
              ? {
                  ...app,
                  status: mappedStatus,
                  notes: updatedApplication.reviewNotes,
                }
              : app
          ),
        });
      }

      // Show success message
      const statusText = {
        under_review: "đang xem xét",
        accepted: "đã chấp nhận",
        rejected: "đã từ chối",
        interview: "đã mời phỏng vấn",
      }[mappedStatus];

      toast.success(`Đã cập nhật trạng thái đơn thành ${statusText}!`);
    } catch (err: any) {
      console.error("Error updating application status:", err);
      toast.error(err.message || "Không thể cập nhật trạng thái đơn");
    }
  };

  // Show status change confirmation dialog
  const showStatusChangeDialog = (
    recruitmentId: string,
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
    recruitmentId: string,
    newStatus: "OPEN" | "CLOSED"
  ) => {
    try {
      console.log(
        `Changing recruitment ${recruitmentId} status to ${newStatus}`
      );

      // Set loading state for this specific button
      setChangingStatusId(recruitmentId);

      await changeRecruitmentStatus(parseInt(recruitmentId), newStatus);

      const statusText = newStatus === "OPEN" ? "mở" : "đóng";
      toast.success(
        `${statusText === "mở" ? "Mở" : "Đóng"} đơn tuyển dụng thành công!`
      );

      // Update the recruitment in the local state immediately for instant UI update
      setRecruitments((prevRecruitments) =>
        prevRecruitments.map((r) =>
          r.recruitment_id === recruitmentId
            ? { ...r, status: newStatus.toLowerCase() as RecruitmentStatus }
            : r
        )
      );

      // Reset filter to "all" to show the updated recruitment
      // (so it doesn't disappear if user was filtering by specific status)
      if (statusFilter !== "all") {
        console.log("Resetting filter to 'all' to show updated recruitment");
        setStatusFilter("all");
      }

      console.log("Status changed successfully, list updated");
    } catch (err: any) {
      console.error("Error changing recruitment status:", err);
      toast.error(
        err.message || "Không thể thay đổi trạng thái đơn tuyển dụng"
      );

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
                  placeholder="Tìm kiếm đợt tuyển dụng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as RecruitmentStatus | "all")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                  <SelectItem value="open">Đang mở</SelectItem>
                  <SelectItem value="closed">Đã đóng</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
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
                    key={recruitment.recruitment_id}
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
                            {recruitment.status === "closed" && (
                              <Badge
                                variant="outline"
                                className="text-xs text-muted-foreground"
                              >
                                🔒 Không thể chỉnh sửa
                              </Badge>
                            )}
                            {/* <Badge variant="outline" className="text-xs">
                              {recruitment.semester_name}
                            </Badge> */}
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
                            Bắt đầu:
                          </span>
                          <div className="font-medium">
                            {new Date(
                              recruitment.start_date
                            ).toLocaleDateString("vi-VN")}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Kết thúc:
                          </span>
                          <div className="font-medium">
                            {new Date(recruitment.end_date).toLocaleDateString(
                              "vi-VN"
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
                          disabled={recruitment.status === "closed"}
                          title={
                            recruitment.status === "closed"
                              ? "Không thể chỉnh sửa đợt tuyển dụng đã đóng"
                              : "Chỉnh sửa đợt tuyển dụng"
                          }
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa
                        </Button>
                        {recruitment.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              showStatusChangeDialog(
                                recruitment.recruitment_id,
                                "OPEN",
                                recruitment.title
                              )
                            }
                            disabled={
                              changingStatusId === recruitment.recruitment_id
                            }
                            className="bg-transparent text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                          >
                            {changingStatusId === recruitment.recruitment_id ? (
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
                        {recruitment.status === "open" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              showStatusChangeDialog(
                                recruitment.recruitment_id,
                                "CLOSED",
                                recruitment.title
                              )
                            }
                            disabled={
                              changingStatusId === recruitment.recruitment_id
                            }
                            className="bg-transparent text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            {changingStatusId === recruitment.recruitment_id ? (
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
                          disabled={recruitment.status === "closed"}
                          onClick={async () => {
                            try {
                              const shareUrl = `${window.location.origin}/clubDetail/${recruitment.club_id}?tab=recruitment#recruitment-${recruitment.recruitment_id}`;
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
              <div className="space-y-4">
                {/* Results info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    Hiển thị{" "}
                    <span className="font-semibold">
                      {Math.min(
                        recruitmentsPage * recruitmentsPageSize + 1,
                        recruitmentsTotalElements
                      )}{" "}
                      -{" "}
                      {Math.min(
                        (recruitmentsPage + 1) * recruitmentsPageSize,
                        recruitmentsTotalElements
                      )}
                    </span>{" "}
                    trong tổng số{" "}
                    <span className="font-semibold">
                      {recruitmentsTotalElements}
                    </span>{" "}
                    đợt tuyển dụng
                  </div>
                  <div>
                    Trang {recruitmentsPage + 1} / {recruitmentsTotalPages}
                  </div>
                </div>

                {/* Pagination controls */}
                <div className="flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => {
                            if (recruitmentsPage > 0) {
                              setRecruitmentsPage(recruitmentsPage - 1);
                              window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                              });
                            }
                          }}
                          className={
                            recruitmentsPage === 0
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {/* First page */}
                      {recruitmentsPage > 2 && (
                        <>
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => {
                                setRecruitmentsPage(0);
                                window.scrollTo({
                                  top: 0,
                                  behavior: "smooth",
                                });
                              }}
                              className="cursor-pointer"
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                          {recruitmentsPage > 3 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                        </>
                      )}

                      {/* Pages around current page */}
                      {Array.from(
                        { length: Math.min(5, recruitmentsTotalPages) },
                        (_, i) => {
                          let pageNum;
                          if (recruitmentsTotalPages <= 5) {
                            pageNum = i;
                          } else if (recruitmentsPage <= 2) {
                            pageNum = i;
                          } else if (
                            recruitmentsPage >=
                            recruitmentsTotalPages - 3
                          ) {
                            pageNum = recruitmentsTotalPages - 5 + i;
                          } else {
                            pageNum = recruitmentsPage - 2 + i;
                          }

                          if (pageNum < 0 || pageNum >= recruitmentsTotalPages)
                            return null;
                          if (recruitmentsPage > 2 && pageNum === 0)
                            return null;
                          if (
                            recruitmentsPage < recruitmentsTotalPages - 3 &&
                            pageNum === recruitmentsTotalPages - 1
                          )
                            return null;

                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => {
                                  setRecruitmentsPage(pageNum);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                }}
                                isActive={recruitmentsPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum + 1}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                      )}

                      {/* Last page */}
                      {recruitmentsPage < recruitmentsTotalPages - 3 && (
                        <>
                          {recruitmentsPage < recruitmentsTotalPages - 4 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => {
                                setRecruitmentsPage(recruitmentsTotalPages - 1);
                                window.scrollTo({
                                  top: 0,
                                  behavior: "smooth",
                                });
                              }}
                              className="cursor-pointer"
                            >
                              {recruitmentsTotalPages}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => {
                            if (recruitmentsPage < recruitmentsTotalPages - 1) {
                              setRecruitmentsPage(recruitmentsPage + 1);
                              window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                              });
                            }
                          }}
                          className={
                            recruitmentsPage === recruitmentsTotalPages - 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
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
            selectedRecruitment={selectedRecruitment}
            applications={applications}
            applicationsLoading={applicationsLoading}
            onUpdateApplicationStatus={handleUpdateApplicationStatus}
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
