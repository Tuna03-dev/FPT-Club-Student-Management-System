import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Eye,
  ArrowLeft,
  Search,
  Calendar,
  User,
  FileText,
  Users,
  Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ClubReportModal } from "@/components/features/report/ClubReportModal";
import {
  getClubsByReportRequirement,
  getClubReportByRequirement,
  getAllReportRequirements,
} from "@/services/reportService";
import type {
  ClubRequirementInfo,
  ReportRequirementResponse,
  ReportDetailResponse,
} from "@/types/dto/reportRequirement.dto";
import { toast } from "sonner";

type ReportStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "needs-review"
  | "not-submitted";

// Helper function to check if status is a university status (from school)
function isUniversityStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (
    status === "PENDING_UNIVERSITY" ||
    status === "APPROVED_UNIVERSITY" ||
    status === "REJECTED_UNIVERSITY" ||
    status === "RESUBMITTED_UNIVERSITY"
  );
}

// Helper function to map backend status to frontend status
function mapBackendStatusToFrontend(backendStatus: string | null | undefined): ReportStatus {
  if (backendStatus && isUniversityStatus(backendStatus)) {
    // If it's a university status, map it appropriately
    switch (backendStatus) {
      case "PENDING_UNIVERSITY":
        return "submitted"; // Chờ phê duyệt nhà trường
      case "APPROVED_UNIVERSITY":
        return "approved"; // Đã duyệt nhà trường
      case "REJECTED_UNIVERSITY":
        return "rejected"; // Bị từ chối nhà trường
      case "RESUBMITTED_UNIVERSITY":
        return "submitted"; // Đã nộp lại nhà trường
      default:
        return "not-submitted";
    }
  }
  // For all other statuses (DRAFT, PENDING_CLUB, APPROVED_CLUB, REJECTED_CLUB, UPDATED_PENDING_CLUB, null, etc.)
  // return "not-submitted"
  return "not-submitted";
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
}

interface Club {
  id: string;
  name: string;
  code: string;
  avatar: string;
  description: string;
}

interface ClubWithReport extends Club {
  reportStatus: ReportStatus;
  backendStatus: string | null; // Store the original backend status
  hasReport: boolean;
  report?: Report;
  clubRequirementId: number;
  clubId: number;
}

export function PeriodicReportClubs() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isClubReportModalOpen, setIsClubReportModalOpen] = useState(false);
  const [periodicReport, setPeriodicReport] =
    useState<ReportRequirementResponse | null>(null);
  const [clubsWithReports, setClubsWithReports] = useState<ClubWithReport[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  
  // Function to refresh clubs data
  const refreshClubsData = async () => {
    if (!reportId) return;
    
    try {
      const requirementId = parseInt(reportId);
      const clubs = await getClubsByReportRequirement(requirementId);
      
      const clubsWithReportsData: ClubWithReport[] = clubs.map((club) => ({
        id: club.clubId.toString(),
        name: club.clubName,
        code: club.clubCode,
        avatar: "",
        description: "",
        reportStatus: mapBackendStatusToFrontend(club.status),
        backendStatus: club.status || null,
        hasReport: isUniversityStatus(club.status),
        clubRequirementId: club.id,
        clubId: club.clubId,
      }));
      
      setClubsWithReports(clubsWithReportsData);
    } catch (error: any) {
      console.error("Error refreshing clubs data:", error);
      toast.error("Không thể làm mới dữ liệu");
    }
  };

  // Fetch report requirement details and clubs
  useEffect(() => {
    const fetchData = async () => {
      if (!reportId) {
        navigate("/staff/report");
        return;
      }

      setIsLoading(true);
      try {
        const requirementId = parseInt(reportId);

        // Validate requirementId
        if (isNaN(requirementId) || requirementId <= 0) {
          toast.error("ID yêu cầu báo cáo không hợp lệ");
          navigate("/staff/report");
          return;
        }

        // Fetch report requirement details
        const requirementsResponse = await getAllReportRequirements({
          page: 1,
          size: 1000, // Get all to find the one we need
        });

        const requirement = requirementsResponse.content.find(
          (r) => r.id === requirementId
        );

        if (!requirement) {
          toast.error("Không tìm thấy yêu cầu báo cáo");
          navigate("/staff/report");
          return;
        }

        setPeriodicReport(requirement);

        // Fetch clubs for this specific requirement
        // This API call will return only clubs that are assigned to this requirement
        const clubs = await getClubsByReportRequirement(requirementId);

        // Map to ClubWithReport format
        const clubsWithReportsData: ClubWithReport[] = clubs.map((club) => ({
          id: club.clubId.toString(),
          name: club.clubName,
          code: club.clubCode,
          avatar: "",
          description: "",
          reportStatus: mapBackendStatusToFrontend(club.status),
          backendStatus: club.status || null, // Store the original backend status
          // Only allow viewing report if status is from university (school)
          hasReport: isUniversityStatus(club.status),
          clubRequirementId: club.id,
          clubId: club.clubId,
        }));

        setClubsWithReports(clubsWithReportsData);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error(error.message || "Không thể tải dữ liệu");
        navigate("/staff/report");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [reportId, navigate]);

  const filteredClubs = clubsWithReports.filter((club) => {
    const matchesSearch =
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleApproveReport = (
    reportId: string,
    feedback: string,
    approve: boolean
  ) => {
    // Update report status
    // This should be an API call in production
    setClubsWithReports((prevClubs) =>
      prevClubs.map((club) => {
        if (club.report?.id === reportId) {
          return {
            ...club,
            report: {
              ...club.report,
              status: approve ? "approved" : "rejected",
              reviewer: "Người đánh giá hiện tại",
              reviewDate: new Date().toISOString().split("T")[0],
              approvalNotes: approve ? feedback : undefined,
              rejectionReason: !approve ? feedback : undefined,
            },
            reportStatus: approve ? "approved" : "rejected",
          };
        }
        return club;
      })
    );
    alert(approve ? "Báo cáo đã được chấp nhận" : "Báo cáo đã bị từ chối");
    setIsClubReportModalOpen(false);
  };

  const getStatusLabel = (status: ReportStatus, backendStatus?: string | null) => {
    // If we have the backend status and it's a university status, use the proper label
    if (backendStatus && isUniversityStatus(backendStatus)) {
      switch (backendStatus) {
        case "PENDING_UNIVERSITY":
          return "Chờ phê duyệt nhà trường";
        case "APPROVED_UNIVERSITY":
          return "Đã duyệt nhà trường";
        case "REJECTED_UNIVERSITY":
          return "Bị từ chối nhà trường";
        case "RESUBMITTED_UNIVERSITY":
          return "Đã nộp lại nhà trường";
        default:
          return "Chưa nộp";
      }
    }
    
    // For all other cases, show "Chưa nộp"
    return "Chưa nộp";
  };

  const getStatusColor = (status: ReportStatus, backendStatus?: string | null) => {
    // If we have the backend status and it's a university status, use specific colors
    if (backendStatus && isUniversityStatus(backendStatus)) {
      switch (backendStatus) {
        case "PENDING_UNIVERSITY":
          return "bg-blue-100 text-blue-700";
        case "APPROVED_UNIVERSITY":
          return "bg-green-100 text-green-700";
        case "REJECTED_UNIVERSITY":
          return "bg-red-100 text-red-700";
        case "RESUBMITTED_UNIVERSITY":
          return "bg-blue-100 text-blue-700";
        default:
          return "bg-red-100 text-red-700"; // Chưa nộp
      }
    }
    
    // For all other cases (not submitted), use red color
    return "bg-red-100 text-red-700";
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getReportTypeLabel = (reportType?: string) => {
    switch (reportType) {
      case "SEMESTER":
        return "Báo cáo định kỳ";
      case "EVENT":
        return "Báo cáo sau sự kiện";
      case "OTHER":
        return "Loại khác";
      default:
        return "Không xác định";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Đang tải...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!periodicReport) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/staff/report")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{periodicReport.title}</h1>
              <p className="text-muted-foreground mt-1">
                Danh sách câu lạc bộ và trạng thái nộp báo cáo
              </p>
            </div>
          </div>
        </div>

        {/* Report Requirement Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Info Grid - Moved to top */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Created By */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>Người tạo</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {periodicReport.createdBy?.fullName || "N/A"}
                  </p>
                </div>

                {/* Created Date */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Ngày tạo</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(periodicReport.createdAt)}
                  </p>
                </div>

                {/* Due Date */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Hạn chót</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(periodicReport.dueDate)}
                  </p>
                </div>

                {/* Report Type */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Loại báo cáo</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {getReportTypeLabel(periodicReport.reportType)}
                  </p>
                </div>
              </div>

              {/* File Attachment - If available */}
              {periodicReport.templateUrl && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Download className="h-4 w-4" />
                    <span>File đính kèm</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {periodicReport.templateUrl.split("/").pop() ||
                          "Template file"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        File template
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(periodicReport.templateUrl, "_blank")
                      }
                      className="flex-shrink-0"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Tải xuống
                    </Button>
                  </div>
                </div>
              )}

              {/* Description - Moved to bottom */}
              {periodicReport.description && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Mô tả yêu cầu</span>
                  </div>
                  <p className="text-sm text-foreground bg-secondary/50 p-3 rounded-lg whitespace-pre-wrap">
                    {periodicReport.description}
                  </p>
                </div>
              )}
            </div>

            {/* Club Count */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Tổng số câu lạc bộ cần nộp báo cáo:
              </span>
              <span className="text-sm font-semibold text-foreground">
                {clubsWithReports.length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="flex items-center bg-secondary rounded-lg px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground mr-3" />
          <Input
            placeholder="Tìm kiếm theo tên, mã, mô tả câu lạc bộ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 flex-1"
          />
        </div>

        {/* Clubs List */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hiển thị {filteredClubs.length} câu lạc bộ
          </p>

          {filteredClubs.length > 0 ? (
            <div className="space-y-3">
              {filteredClubs.map((club) => (
                <Card
                  key={club.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="py-2.5 px-3 md:py-3 md:px-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-2.5">
                      {/* Club Info */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                          <span className="text-xs font-semibold">
                            {club.avatar}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-foreground truncate mb-0.5">
                            {club.name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {club.description}
                          </p>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 ml-auto">
                        <div
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${getStatusColor(
                            club.reportStatus,
                            club.backendStatus
                          )}`}
                        >
                          <span>{getStatusLabel(club.reportStatus, club.backendStatus)}</span>
                        </div>

                        {/* Only show "View Report" button if status is from university (school) */}
                        {club.hasReport && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (!reportId || !club.hasReport) return;

                              setIsLoadingReport(true);
                              try {
                                const requirementId = parseInt(reportId);
                                const reportDetail =
                                  await getClubReportByRequirement(
                                    requirementId,
                                    club.clubId
                                  );

                                if (reportDetail) {
                                  // Convert ReportDetailResponse to Report format for modal
                                  const reportForModal: Report = {
                                    id: reportDetail.id.toString(),
                                    title: reportDetail.reportTitle,
                                    type: "periodic",
                                    status: mapBackendStatusToFrontend(
                                      reportDetail.status
                                    ),
                                    submittedBy:
                                      reportDetail.createdBy?.fullName || "N/A",
                                    submittedByAvatar: "",
                                    department: reportDetail.club?.clubName || "",
                                    createdAt: reportDetail.submittedDate
                                      ? new Date(
                                          reportDetail.submittedDate
                                        ).toLocaleDateString("vi-VN")
                                      : reportDetail.createdAt
                                      ? new Date(
                                          reportDetail.createdAt
                                        ).toLocaleDateString("vi-VN")
                                      : "",
                                    dueDate: reportDetail.reportRequirement
                                      ?.dueDate
                                      ? new Date(
                                          reportDetail.reportRequirement.dueDate
                                        ).toLocaleDateString("vi-VN")
                                      : "",
                                    content: reportDetail.content || "",
                                    fileUrl: reportDetail.fileUrl,
                                    reviewer: reportDetail.reviewedDate
                                      ? "Staff"
                                      : undefined,
                                    reviewDate: reportDetail.reviewedDate
                                      ? new Date(
                                          reportDetail.reviewedDate
                                        ).toLocaleDateString("vi-VN")
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
                                    clubId: club.id,
                                  };

                                  setSelectedReport(reportForModal);
                                  setSelectedClub(club);
                                  setIsClubReportModalOpen(true);
                                } else {
                                  toast.error("Không tìm thấy báo cáo");
                                }
                              } catch (error: any) {
                                console.error(
                                  "Error fetching report detail:",
                                  error
                                );
                                toast.error(
                                  error.message || "Không thể tải báo cáo"
                                );
                              } finally {
                                setIsLoadingReport(false);
                              }
                            }}
                            className="gap-2"
                            disabled={isLoadingReport}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden md:inline">Xem báo cáo</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Không tìm thấy câu lạc bộ nào phù hợp với tìm kiếm của bạn
              </CardContent>
            </Card>
          )}
        </div>

        {/* Club Report Modal */}
        {selectedReport && selectedClub && (
          <ClubReportModal
            open={isClubReportModalOpen}
            onOpenChange={(open) => {
              setIsClubReportModalOpen(open);
              // Refresh data when modal closes (after successful review)
              if (!open) {
                refreshClubsData();
              }
            }}
            club={selectedClub}
            report={selectedReport}
            onApprove={(feedback) => {
              handleApproveReport(selectedReport.id, feedback, true);
            }}
            onReject={(feedback) => {
              handleApproveReport(selectedReport.id, feedback, false);
            }}
          />
        )}
      </div>
    </div>
  );
}
