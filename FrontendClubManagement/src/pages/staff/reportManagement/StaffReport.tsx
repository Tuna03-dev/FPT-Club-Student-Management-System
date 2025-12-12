import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Eye, Search, AlertCircle, Calendar } from "lucide-react";
import {
  ReportSubmissionModal,
  type SubmissionFormData,
} from "@/components/report/ReportSubmissionModal";
import { Input } from "@/components/ui/input";
import { formatDateTimeVN } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  getAllReportRequirements,
  createReportRequirement,
  getAllClubsForReport,
  getAllReports,
  getReportDetail,
} from "@/services/reportService";
import { getEventById } from "@/service/EventService";
import type {
  ReportRequirementResponse,
  ReportType,
  CreateReportRequirementRequest,
  ReportListItemResponse,
} from "@/types/dto/reportRequirement.dto";
import {
  mapBackendToFrontendReportType,
  mapFrontendToBackendReportType,
} from "@/types/dto/reportRequirement.dto";
import { ClubReportModal } from "@/components/report/ClubReportModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FrontendReportType = "periodic" | "post-event" | "other" | "reports";

interface ReportRequirementDisplay {
  id: number;
  title: string;
  type: FrontendReportType;
  createdAt: string;
  dueDate: string;
  description?: string;
  createdBy?: string;
  clubCount?: number;
  reportType?: ReportType;
}

export function StaffReportManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState<ReportRequirementDisplay[]>([]);

  const [selectedReport] = useState<ReportRequirementResponse | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isReportContentModalOpen, setIsReportContentModalOpen] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const initialTab = (location.state as any)?.tab as
    | FrontendReportType
    | undefined;
  const [activeTab, setActiveTab] = useState<FrontendReportType>(
    initialTab ?? "reports"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // State for reports tab
  const [reportList, setReportList] = useState<ReportListItemResponse[]>([]);
  const [reportListPage, setReportListPage] = useState(1);
  const [reportListTotalPages, setReportListTotalPages] = useState(0);
  const [reportListTotalElements, setReportListTotalElements] = useState(0);
  const [reportListLoading, setReportListLoading] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("ALL");
  const [debouncedReportSearchQuery, setDebouncedReportSearchQuery] =
    useState("");
  const [selectedReportDetail, setSelectedReportDetail] = useState<any>(null);
  const [isReportDetailModalOpen, setIsReportDetailModalOpen] = useState(false);

  // Debounce search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounce report search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedReportSearchQuery(reportSearchQuery);
      setReportListPage(1); // Reset to first page when search changes
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [reportSearchQuery]);

  const fetchReportRequirements = useCallback(async () => {
    setIsLoading(true);
    try {
      // Only map if activeTab is not "reports"
      const backendType =
        activeTab !== "reports"
          ? mapFrontendToBackendReportType(
              activeTab as "periodic" | "post-event" | "other"
            )
          : undefined;
      const response = await getAllReportRequirements({
        page: currentPage,
        size: pageSize,
        sort: "createdAt,desc",
        reportType: backendType,
        keyword: debouncedSearchQuery || undefined,
      });

      // Map API response to display format
      const mappedReports: ReportRequirementDisplay[] = response.content.map(
        (req) => ({
          id: req.id,
          title: req.title,
          type: mapBackendToFrontendReportType(req.reportType),
          createdAt: req.createdAt,
          dueDate: req.dueDate,
          description: req.description,
          createdBy: req.createdBy?.fullName || "N/A",
          clubCount: req.clubCount || 0,
          reportType: req.reportType,
        })
      );

      setReports(mappedReports);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error: any) {
      console.error("Error fetching report requirements:", error);
      toast.error("Không thể tải danh sách yêu cầu nộp báo cáo");
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedSearchQuery, currentPage, pageSize]);

  // Fetch report requirements from API
  useEffect(() => {
    if (activeTab !== "reports") {
      fetchReportRequirements();
    }
  }, [fetchReportRequirements, activeTab]);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setReportListLoading(true);
    try {
      const response = await getAllReports({
        page: reportListPage,
        size: pageSize,
        sort: "submittedDate,desc",
        status:
          reportStatusFilter && reportStatusFilter !== "ALL"
            ? reportStatusFilter
            : undefined,
        keyword: debouncedReportSearchQuery || undefined,
      });

      setReportList(response.content);
      setReportListTotalPages(response.totalPages);
      setReportListTotalElements(response.totalElements);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Không thể tải danh sách báo cáo");
      setReportList([]);
    } finally {
      setReportListLoading(false);
    }
  }, [
    reportListPage,
    pageSize,
    reportStatusFilter,
    debouncedReportSearchQuery,
  ]);

  // Fetch reports when tab changes or filters change
  useEffect(() => {
    if (activeTab === "reports") {
      fetchReports();
    }
  }, [activeTab, fetchReports]);

  const handleSubmitReport = async (formData: SubmissionFormData) => {
    setIsSubmitting(true);
    try {
      // Get file from attachments if available
      const file =
        formData.attachments && formData.attachments.length > 0
          ? formData.attachments[0].file
          : undefined;

      // Determine club IDs based on report type
      let clubIds: number[] = [];

      if (formData.type === "periodic") {
        // For periodic reports, get all clubs
        const allClubs = await getAllClubsForReport();
        clubIds = allClubs.map((club) => club.id);
      } else if (formData.type === "post-event") {
        // For post-event reports, get club from the selected event
        if (!formData.selectedEventId) {
          toast.error("Vui lòng chọn sự kiện");
          return;
        }
        // Get event details to get the club that created the event
        try {
          const event = await getEventById(formData.selectedEventId);
          if (!event.clubId) {
            toast.error("Sự kiện không có thông tin câu lạc bộ");
            return;
          }
          // Only include the club that created the event
          clubIds = [event.clubId];
        } catch (error: any) {
          console.error("Error fetching event details:", error);
          toast.error("Không thể lấy thông tin sự kiện. Vui lòng thử lại.");
          return;
        }
      } else if (formData.type === "other") {
        // For other reports, use selected clubs
        if (
          !formData.selectedClubIds ||
          formData.selectedClubIds.length === 0
        ) {
          toast.error("Vui lòng chọn ít nhất một câu lạc bộ");
          return;
        }
        clubIds = formData.selectedClubIds;
      }

      // Validate that we have at least one club
      if (clubIds.length === 0) {
        toast.error("Không có câu lạc bộ nào được chọn để tạo yêu cầu báo cáo");
        return;
      }

      // Map frontend report type to backend
      const backendReportType = mapFrontendToBackendReportType(formData.type);

      // Build request - ensure clubIds are sent correctly
      const request: CreateReportRequirementRequest = {
        title: formData.title,
        description: formData.content,
        dueDate: formData.dueDate,
        reportType: backendReportType,
        clubIds: clubIds, // Send the correct club IDs based on report type
        eventId: formData.selectedEventId, // Send eventId for post-event reports
        templateUrl: undefined, // Will be set from uploaded file
      };

      // Create report requirement with file
      await createReportRequirement(request, file);

      toast.success("Tạo yêu cầu báo cáo thành công!");

      // Close modal immediately
      setIsSubmitDialogOpen(false);

      // Reload list after successful creation with loading state
      await fetchReportRequirements();
    } catch (error: any) {
      console.error("Error creating report requirement:", error);
      toast.error(error.message || "Không thể tạo yêu cầu báo cáo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePeriodicReportView = (report: ReportRequirementDisplay) => {
    navigate(`/staff/report/${report.id}/clubs`, {
      state: { fromTab: activeTab },
    });
  };

  const formatDate = (dateString: string) => formatDateTimeVN(dateString);

  const isDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const getReportTypeLabel = (type: FrontendReportType) => {
    switch (type) {
      case "periodic":
        return "Báo cáo Định kỳ";
      case "post-event":
        return "Báo cáo Sau sự kiện";
      case "other":
        return "Loại báo cáo khác";
      default:
        return type;
    }
  };

  // Helper functions for reports tab
  const getReportStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING_UNIVERSITY":
        return "Chờ phê duyệt";
      case "APPROVED_UNIVERSITY":
        return "Đã chấp nhận";
      case "REJECTED_UNIVERSITY":
        return "Đã từ chối";
      case "RESUBMITTED_UNIVERSITY":
        return "Đã nộp lại";
      default:
        return status;
    }
  };

  const getReportStatusColor = (status: string) => {
    switch (status) {
      case "PENDING_UNIVERSITY":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "APPROVED_UNIVERSITY":
        return "bg-green-100 text-green-700 border-green-300";
      case "REJECTED_UNIVERSITY":
        return "bg-red-100 text-red-700 border-red-300";
      case "RESUBMITTED_UNIVERSITY":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const handleViewReport = async (report: ReportListItemResponse) => {
    try {
      const reportDetail = await getReportDetail(report.id);

      // Convert to format expected by ClubReportModal
      const reportForModal = {
        id: reportDetail.id.toString(),
        title: reportDetail.reportTitle,
        type:
          mapBackendToFrontendReportType(
            reportDetail.reportRequirement?.reportType
          ) || "periodic",
        status:
          reportDetail.status === "PENDING_UNIVERSITY" ||
          reportDetail.status === "RESUBMITTED_UNIVERSITY"
            ? "submitted"
            : reportDetail.status === "APPROVED_UNIVERSITY"
              ? "approved"
              : reportDetail.status === "REJECTED_UNIVERSITY"
                ? "rejected"
                : "submitted",
        submittedBy: reportDetail.createdBy?.fullName || "N/A",
        submittedByAvatar: "",
        department: reportDetail.club?.clubName || "",
        createdAt: reportDetail.submittedDate
          ? formatDate(reportDetail.submittedDate)
          : reportDetail.createdAt
            ? formatDate(reportDetail.createdAt)
            : "",
        dueDate: reportDetail.reportRequirement?.dueDate
          ? formatDate(reportDetail.reportRequirement.dueDate)
          : "",
        content: reportDetail.content || "",
        fileUrl: reportDetail.fileUrl,
        reviewer: reportDetail.reviewedDate ? "Staff" : undefined,
        reviewDate: reportDetail.reviewedDate
          ? formatDate(reportDetail.reviewedDate)
          : undefined,
        approvalNotes:
          reportDetail.status !== "REJECTED_UNIVERSITY" &&
          reportDetail.reviewerFeedback &&
          reportDetail.reviewedDate
            ? reportDetail.reviewerFeedback
            : undefined,
        rejectionReason:
          reportDetail.status === "REJECTED_UNIVERSITY" &&
          reportDetail.reviewerFeedback
            ? reportDetail.reviewerFeedback
            : undefined,
        clubId: reportDetail.club?.id.toString(),
        reportRequirement: reportDetail.reportRequirement
          ? {
              id: reportDetail.reportRequirement.id,
              title: reportDetail.reportRequirement.title,
              description: reportDetail.reportRequirement.description,
              dueDate: reportDetail.reportRequirement.dueDate,
              reportType: reportDetail.reportRequirement.reportType,
              templateUrl: reportDetail.reportRequirement.templateUrl,
              createdBy: reportDetail.reportRequirement.createdBy,
            }
          : undefined,
      };

      const clubForModal = {
        id: reportDetail.club?.id.toString() || "",
        name: reportDetail.club?.clubName || "",
        code: reportDetail.club?.clubCode || "",
        avatar: "",
        description: "",
      };

      setSelectedReportDetail({ report: reportForModal, club: clubForModal });
      setIsReportDetailModalOpen(true);
    } catch (error: any) {
      console.error("Error fetching report detail:", error);
      toast.error(error.message || "Không thể tải chi tiết báo cáo");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Quản lý yêu cầu báo cáo</h1>
            <p className="text-muted-foreground mt-1">
              {activeTab === "reports"
                ? "Danh sách báo cáo đã nộp cho nhà trường"
                : "Hiển thị 1 yêu cầu trên 1"}
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
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as FrontendReportType);
            setCurrentPage(1);
            setReportListPage(1);
          }}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="reports">Danh sách báo cáo</TabsTrigger>
            <TabsTrigger value="periodic">Yêu cầu Định kỳ</TabsTrigger>
            <TabsTrigger value="post-event">Yêu cầu Sau sự kiện</TabsTrigger>
            <TabsTrigger value="other">Yêu cầu khác</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Filters */}
        {activeTab === "reports" ? (
          <div className="flex gap-2 items-center">
            <div className="flex items-center bg-secondary rounded-lg px-4 py-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground mr-3" />
              <Input
                placeholder="Tìm kiếm theo tiêu đề, câu lạc bộ, người nộp..."
                value={reportSearchQuery}
                onChange={(e) => setReportSearchQuery(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 flex-1"
              />
            </div>
            <Select
              value={reportStatusFilter}
              onValueChange={(value) => {
                setReportStatusFilter(value);
                setReportListPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING_UNIVERSITY">
                  Chờ phê duyệt
                </SelectItem>
                <SelectItem value="APPROVED_UNIVERSITY">
                  Đã chấp nhận
                </SelectItem>
                <SelectItem value="REJECTED_UNIVERSITY">Đã từ chối</SelectItem>
                <SelectItem value="RESUBMITTED_UNIVERSITY">
                  Đã nộp lại
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
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
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === "reports" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Hiển thị {reportList.length} / {reportListTotalElements} báo cáo
              </p>
            </div>

            {reportListLoading ? (
              <Card>
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b-2 border-border hover:bg-muted/50">
                      <TableHead className="w-[250px] font-semibold text-foreground">
                        Tiêu đề báo cáo
                      </TableHead>
                      <TableHead className="w-[150px] font-semibold text-foreground">
                        Câu lạc bộ
                      </TableHead>
                      <TableHead className="w-[150px] font-semibold text-foreground">
                        Người nộp
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-foreground">
                        Ngày nộp
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-foreground">
                        Ngày đánh giá
                      </TableHead>
                      <TableHead className="w-[150px] font-semibold text-foreground">
                        Trạng thái
                      </TableHead>
                      <TableHead className="w-[100px] text-right font-semibold text-foreground">
                        Hành động
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: pageSize }).map((_, i) => (
                      <TableRow key={`report-skel-${i}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : reportList.length > 0 ? (
              <>
                <Card>
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-b-2 border-border hover:bg-muted/50">
                        <TableHead className="w-[250px] font-semibold text-foreground">
                          Tiêu đề báo cáo
                        </TableHead>
                        <TableHead className="w-[150px] font-semibold text-foreground">
                          Câu lạc bộ
                        </TableHead>
                        <TableHead className="w-[150px] font-semibold text-foreground">
                          Người nộp
                        </TableHead>
                        <TableHead className="w-[120px] font-semibold text-foreground">
                          Ngày nộp
                        </TableHead>
                        <TableHead className="w-[120px] font-semibold text-foreground">
                          Ngày duyệt
                        </TableHead>
                        <TableHead className="w-[150px] font-semibold text-foreground">
                          Trạng thái
                        </TableHead>
                        <TableHead className="w-[100px] text-right font-semibold text-foreground">
                          Hành động
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportList.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            <span className="truncate">
                              {report.reportTitle}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                                <span className="text-xs font-semibold">
                                  {report.club?.clubCode?.charAt(0) || "?"}
                                </span>
                              </div>
                              <span className="text-sm">
                                {report.club?.clubName || "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {report.createdBy?.fullName || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {report.submittedDate
                                ? formatDate(report.submittedDate)
                                : "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {report.reviewedDate
                                ? formatDate(report.reviewedDate)
                                : "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getReportStatusColor(report.status)}
                            >
                              {getReportStatusLabel(report.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewReport(report)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">Xem</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                {/* Pagination */}
                {reportListTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setReportListPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={reportListPage === 1 || reportListLoading}
                    >
                      Trước
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Trang {reportListPage} / {reportListTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setReportListPage((prev) =>
                          Math.min(reportListTotalPages, prev + 1)
                        )
                      }
                      disabled={
                        reportListPage === reportListTotalPages ||
                        reportListLoading
                      }
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Không tìm thấy báo cáo nào
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Hiển thị {reports.length} / {totalElements} yêu cầu nộp báo cáo
              </p>
            </div>

            {isLoading ? (
              <Card>
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b-2 border-border hover:bg-muted/50">
                      <TableHead className="w-[300px] font-semibold text-foreground">
                        Tiêu đề
                      </TableHead>
                      <TableHead className="w-[150px] font-semibold text-foreground">
                        Loại báo cáo
                      </TableHead>
                      <TableHead className="w-[150px] font-semibold text-foreground">
                        Người tạo
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-foreground">
                        Ngày tạo
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-foreground">
                        Hạn nộp
                      </TableHead>
                      <TableHead className="w-[100px] font-semibold text-foreground">
                        Số CLB
                      </TableHead>
                      <TableHead className="w-[120px] font-semibold text-foreground">
                        Trạng thái
                      </TableHead>
                      <TableHead className="w-[100px] text-right font-semibold text-foreground">
                        Hành động
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: pageSize }).map((_, i) => (
                      <TableRow key={`req-skel-${i}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : reports.length > 0 ? (
              <>
                <Card>
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-b-2 border-border hover:bg-muted/50">
                        <TableHead className="w-[300px] font-semibold text-foreground">
                          Tiêu đề
                        </TableHead>
                        <TableHead className="w-[150px] font-semibold text-foreground">
                          Loại báo cáo
                        </TableHead>
                        <TableHead className="w-[150px] font-semibold text-foreground">
                          Người tạo
                        </TableHead>
                        <TableHead className="w-[120px] font-semibold text-foreground">
                          Ngày tạo
                        </TableHead>
                        <TableHead className="w-[120px] font-semibold text-foreground">
                          Hạn nộp
                        </TableHead>
                        <TableHead className="w-[100px] font-semibold text-foreground">
                          Số CLB
                        </TableHead>
                        <TableHead className="w-[120px] font-semibold text-foreground">
                          Trạng thái
                        </TableHead>
                        <TableHead className="w-[100px] text-right font-semibold text-foreground">
                          Hành động
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => {
                        const isDeadlineExp = isDeadlinePassed(report.dueDate);

                        return (
                          <TableRow
                            key={report.id}
                            className={
                              isDeadlineExp
                                ? "bg-red-50/30 hover:bg-red-50/50"
                                : ""
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="truncate">{report.title}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {getReportTypeLabel(report.type)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                                  <span className="text-xs font-semibold">
                                    {report.createdBy?.charAt(0) || "?"}
                                  </span>
                                </div>
                                <span className="text-sm">
                                  {report.createdBy || "N/A"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(report.createdAt)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div
                                className={`flex items-center gap-1 ${
                                  isDeadlineExp
                                    ? "text-red-600 font-semibold"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <Calendar
                                  className={`h-3 w-3 ${
                                    isDeadlineExp ? "text-red-600" : ""
                                  }`}
                                />
                                <span className="text-sm">
                                  {formatDate(report.dueDate)}
                                </span>
                                {isDeadlineExp && (
                                  <AlertCircle className="h-3 w-3 text-red-600" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {report.clubCount || 0}
                              </span>
                            </TableCell>
                            <TableCell>
                              {isDeadlineExp ? (
                                <Badge className="bg-red-100 text-red-700 border-red-300">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Quá hạn
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                  Đang hoạt động
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePeriodicReportView(report)}
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">Xem</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1 || isLoading}
                    >
                      Trước
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Trang {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages || isLoading}
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Không tìm thấy yêu cầu nộp báo cáo nào
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Submission Modal */}
        <ReportSubmissionModal
          open={isSubmitDialogOpen}
          onOpenChange={setIsSubmitDialogOpen}
          onSubmit={handleSubmitReport}
          isLoading={isSubmitting}
        />

        {/* Report Detail Modal */}
        {selectedReportDetail && (
          <ClubReportModal
            open={isReportDetailModalOpen}
            onOpenChange={(open) => {
              setIsReportDetailModalOpen(open);
              if (!open) {
                setSelectedReportDetail(null);
              }
            }}
            club={selectedReportDetail.club}
            report={selectedReportDetail.report}
            onApprove={async () => {
              // After successful approve in the modal, refresh the reports list with skeleton
              try {
                await fetchReports();
              } catch (err) {
                // Fetch errors handled inside fetchReports
              }
            }}
            onReject={async () => {
              // After successful reject in the modal, refresh the reports list with skeleton
              try {
                await fetchReports();
              } catch (err) {
                // Fetch errors handled inside fetchReports
              }
            }}
          />
        )}

        {/* Report Requirement Detail Modal */}
        {selectedReport && (
          <Dialog
            open={isReportContentModalOpen}
            onOpenChange={setIsReportContentModalOpen}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedReport.title}</DialogTitle>
                <DialogDescription>
                  Chi tiết yêu cầu nộp báo cáo
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Report Requirement Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Người tạo
                    </p>
                    <p className="font-semibold">
                      {selectedReport.createdBy?.fullName || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Ngày tạo
                    </p>
                    <p className="font-semibold">
                      {formatDate(selectedReport.createdAt)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Hạn chót
                    </p>
                    <p className="font-semibold">
                      {formatDate(selectedReport.dueDate)}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {selectedReport.description && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Mô tả yêu cầu</p>
                    <div className="bg-secondary p-4 rounded-lg min-h-[100px] max-h-[400px] overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedReport.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Club Requirements */}
                {selectedReport.clubRequirements &&
                  selectedReport.clubRequirements.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Danh sách câu lạc bộ (
                        {selectedReport.clubRequirements.length})
                      </p>
                      <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                        {selectedReport.clubRequirements.map((clubReq) => (
                          <div
                            key={clubReq.id}
                            className="p-3 border-b last:border-b-0 hover:bg-secondary/50"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {clubReq.clubName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {clubReq.clubCode}
                                </p>
                              </div>
                              <div
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  clubReq.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : clubReq.status === "SUBMITTED"
                                      ? "bg-blue-100 text-blue-700"
                                      : clubReq.status === "APPROVED"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                }`}
                              >
                                {clubReq.status === "PENDING"
                                  ? "Chờ nộp"
                                  : clubReq.status === "SUBMITTED"
                                    ? "Đã nộp"
                                    : clubReq.status === "APPROVED"
                                      ? "Đã duyệt"
                                      : "Từ chối"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
