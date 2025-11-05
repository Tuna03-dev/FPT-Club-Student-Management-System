import { useState, useEffect, useCallback } from "react";
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
  Search,
} from "lucide-react";
import {
  ReportSubmissionModal,
  type SubmissionFormData,
} from "@/components/features/report/ReportSubmissionModal";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getAllReportRequirements, createReportRequirement, getAllClubsForReport } from "@/services/reportService";
import type {
  ReportRequirementResponse,
  ReportType,
  CreateReportRequirementRequest,
} from "@/types/dto/reportRequirement.dto";
import {
  mapBackendToFrontendReportType,
  mapFrontendToBackendReportType,
} from "@/types/dto/reportRequirement.dto";

type FrontendReportType = "periodic" | "post-event" | "other";

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
  const [reports, setReports] = useState<ReportRequirementDisplay[]>([]);
  const [reportsFullData, setReportsFullData] = useState<
    Map<number, ReportRequirementResponse>
  >(new Map());
  const [selectedReport, setSelectedReport] =
    useState<ReportRequirementResponse | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isReportContentModalOpen, setIsReportContentModalOpen] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FrontendReportType>("periodic");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Debounce search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchReportRequirements = useCallback(async () => {
    setIsLoading(true);
    try {
      const backendType = mapFrontendToBackendReportType(activeTab);
      const response = await getAllReportRequirements({
        page: currentPage,
        size: pageSize,
        sort: ["createdAt,desc"],
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
          clubCount: req.clubRequirements?.length || 0,
          reportType: req.reportType,
        })
      );

      // Store full data in map for quick access
      const fullDataMap = new Map<number, ReportRequirementResponse>();
      response.content.forEach((req) => {
        fullDataMap.set(req.id, req);
      });
      setReportsFullData(fullDataMap);

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
    fetchReportRequirements();
  }, [fetchReportRequirements]);

  const handleSubmitReport = async (formData: SubmissionFormData) => {
    setIsSubmitting(true);
    try {
      // Get file from attachments if available
      const file = formData.attachments && formData.attachments.length > 0 
        ? formData.attachments[0].file 
        : undefined;

      // Determine club IDs based on report type
      let clubIds: number[] = [];
      
      if (formData.type === "periodic") {
        // For periodic reports, get all clubs
        const allClubs = await getAllClubsForReport();
        clubIds = allClubs.map((club) => club.id);
      } else if (formData.type === "post-event") {
        // For post-event reports, get clubs from the selected event
        // Note: This would require getting clubs from event, but for now we'll use all clubs
        // TODO: Get clubs from selected event
        if (!formData.selectedEventId) {
          toast.error("Vui lòng chọn sự kiện");
          return;
        }
        // For now, use all clubs - this should be updated to get clubs from event
        const allClubs = await getAllClubsForReport();
        clubIds = allClubs.map((club) => club.id);
      } else if (formData.type === "other") {
        // For other reports, use selected clubs
        if (!formData.selectedClubIds || formData.selectedClubIds.length === 0) {
          toast.error("Vui lòng chọn ít nhất một câu lạc bộ");
          return;
        }
        clubIds = formData.selectedClubIds;
      }

      // Map frontend report type to backend
      const backendReportType = mapFrontendToBackendReportType(formData.type);

      // Build request
      const request: CreateReportRequirementRequest = {
        title: formData.title,
        description: formData.content,
        dueDate: formData.dueDate,
        reportType: backendReportType,
        clubIds: clubIds,
        eventId: formData.selectedEventId,
        templateUrl: undefined, // Will be set from uploaded file
      };

      // Create report requirement with file
      await createReportRequirement(request, file);
      
      toast.success("Tạo yêu cầu báo cáo thành công!");
      
      // Reload list after successful creation
      await fetchReportRequirements();
      setIsSubmitDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating report requirement:", error);
      toast.error(error.message || "Không thể tạo yêu cầu báo cáo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePeriodicReportView = (report: ReportRequirementDisplay) => {
    navigate(`/staff/report/${report.id}/clubs`);
  };

  const handleReportRequirementView = (report: ReportRequirementDisplay) => {
    // Get full data from stored map
    const fullReport = reportsFullData.get(report.id);
    if (fullReport) {
      setSelectedReport(fullReport);
      setIsReportContentModalOpen(true);
    } else {
      // Fallback to basic info if not found in map
      const basicReport: ReportRequirementResponse = {
        id: report.id,
        title: report.title,
        description: report.description,
        dueDate: report.dueDate,
        reportType: report.reportType,
        createdAt: report.createdAt,
        updatedAt: report.createdAt,
      };
      setSelectedReport(basicReport);
      setIsReportContentModalOpen(true);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN");
    } catch {
      return dateString;
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
              onClick={() => {
                setActiveTab(tab.id as FrontendReportType);
                setCurrentPage(1); // Reset to first page when changing tab
              }}
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

        </div>

        {/* Reports List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Hiển thị {reports.length} / {totalElements} yêu cầu nộp báo cáo
            </p>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Đang tải...
              </CardContent>
            </Card>
          ) : reports.length > 0 ? (
            <>
              <div className="space-y-3">
                {reports.map((report) => {
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
                              {report.createdBy?.charAt(0) || "?"}
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
                                  {report.createdBy || "N/A"}
                                </span>
                              </span>
                              <span>Tạo: {formatDate(report.createdAt)}</span>
                              <span>Hạn: {formatDate(report.dueDate)}</span>
                              {report.clubCount !== undefined && (
                                <span>
                                  {report.clubCount} câu lạc bộ
                                </span>
                              )}
                            </div>

                            {/* Actions - Mobile */}
                            <div className="flex flex-row items-center gap-2 mt-2 md:hidden">
                              {report.type === "periodic" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handlePeriodicReportView(report)
                                  }
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>Xem</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleReportRequirementView(report)
                                  }
                                  className="gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>Xem</span>
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Actions - Desktop */}
                          <div className="hidden md:flex flex-row items-center gap-2 ml-auto">
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleReportRequirementView(report)
                                }
                                className="gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                <span>Xem</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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

        {/* Submission Modal */}
        <ReportSubmissionModal
          open={isSubmitDialogOpen}
          onOpenChange={setIsSubmitDialogOpen}
          onSubmit={handleSubmitReport}
          isLoading={isSubmitting}
        />

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
                        Danh sách câu lạc bộ ({selectedReport.clubRequirements.length})
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
