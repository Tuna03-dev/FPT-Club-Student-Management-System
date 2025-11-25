import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
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
import type { ReportRequirementResponse } from "@/types/dto/reportRequirement.dto";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
function mapBackendStatusToFrontend(
  backendStatus: string | null | undefined
): ReportStatus {
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
  fileUrl?: string;
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
  mustResubmit: boolean; // Store mustResubmit flag from report
  hasReport: boolean;
  report?: Report;
  clubRequirementId: number;
  clubId: number;
}

export function PeriodicReportClubs() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
        mustResubmit: club.report?.mustResubmit || false, // Store mustResubmit flag
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
          page: 0,
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
          mustResubmit: club.report?.mustResubmit || false, // Store mustResubmit flag
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

  const getStatusLabel = (
    backendStatus?: string | null,
    mustResubmit?: boolean
  ) => {
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
          return "Đang yêu cầu nộp lại";
      }
    }

    // For all other cases (not university statuses)
    // If mustResubmit is true, show "Đang yêu cầu nộp lại"
    // Otherwise, show "Chưa nộp"
    if (mustResubmit === true) {
      return "Đang yêu cầu nộp lại";
    }
    return "Chưa nộp";
  };

  const getStatusColor = (
    backendStatus?: string | null,
    mustResubmit?: boolean
  ) => {
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
          return "bg-orange-100 text-orange-700"; // Đang yêu cầu nộp lại
      }
    }

    // For all other cases (not university statuses)
    // If mustResubmit is true, use orange color for "Đang yêu cầu nộp lại"
    // Otherwise, use red color for "Chưa nộp"
    if (mustResubmit === true) {
      return "bg-orange-100 text-orange-700";
    }
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

  // Do not early-return while loading so we can show skeletons in-place

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">{periodicReport?.title}</h1>
              <p className="text-muted-foreground mt-1">
                Danh sách câu lạc bộ và trạng thái nộp báo cáo
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const fromTab = (location.state as any)?.fromTab ?? "periodic";
              navigate("/staff/reports", { state: { tab: fromTab } });
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </div>

        {/* Report Requirement Info Card */}
        {periodicReport ? (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Info Grid - Compact layout */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {/* Created By */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                      <User className="h-3 w-3" />
                      <span>Người tạo</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {periodicReport.createdBy?.fullName || "N/A"}
                    </p>
                  </div>

                  {/* Created Date */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>Ngày tạo</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(periodicReport.createdAt)}
                    </p>
                  </div>

                  {/* Due Date */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>Hạn chót</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(periodicReport.dueDate)}
                    </p>
                  </div>

                  {/* Report Type */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                      <FileText className="h-3 w-3" />
                      <span>Loại báo cáo</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {getReportTypeLabel(periodicReport.reportType)}
                    </p>
                  </div>

                  {/* Club Count - Integrated into grid */}
                  <div className="col-span-2 md:col-span-2 lg:col-span-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                      <Users className="h-3 w-3" />
                      <span>Số CLB cần nộp</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {clubsWithReports.length} câu lạc bộ
                    </p>
                  </div>
                </div>

                {/* File Attachment and Description - Compact inline layout */}
                {(periodicReport.templateUrl || periodicReport.description) && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                    {/* File Attachment - If available */}
                    {periodicReport.templateUrl && (
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                          <Download className="h-3 w-3" />
                          <span>File đính kèm</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-md">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {periodicReport.templateUrl.split("/").pop() ||
                                "Template file"}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(periodicReport.templateUrl, "_blank")
                            }
                            className="flex-shrink-0 h-7 px-2"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Description - Compact */}
                    {periodicReport.description && (
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                          <FileText className="h-3 w-3" />
                          <span>Mô tả</span>
                        </div>
                        <p className="text-xs text-foreground bg-secondary/50 p-2 rounded-md line-clamp-2">
                          {periodicReport.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div>
                    <Skeleton className="h-3 w-24" />
                    <div className="mt-2">
                      <Skeleton className="h-5 w-40" />
                    </div>
                  </div>
                  <div>
                    <Skeleton className="h-3 w-20" />
                    <div className="mt-2">
                      <Skeleton className="h-5 w-28" />
                    </div>
                  </div>
                  <div>
                    <Skeleton className="h-3 w-20" />
                    <div className="mt-2">
                      <Skeleton className="h-5 w-28" />
                    </div>
                  </div>
                  <div>
                    <Skeleton className="h-3 w-20" />
                    <div className="mt-2">
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-2 lg:col-span-2">
                    <Skeleton className="h-3 w-28" />
                    <div className="mt-2">
                      <Skeleton className="h-5 w-36" />
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

          {isLoading ? (
            <Card>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b-2 border-border hover:bg-muted/50">
                    <TableHead className="w-[250px] font-semibold text-foreground">
                      Tên câu lạc bộ
                    </TableHead>
                    <TableHead className="w-[150px] font-semibold text-foreground">
                      Mã CLB
                    </TableHead>
                    <TableHead className="w-[180px] font-semibold text-foreground">
                      Trạng thái
                    </TableHead>
                    <TableHead className="w-[120px] text-center font-semibold text-foreground">
                      Hành động
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={`club-skel-${i}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : filteredClubs.length > 0 ? (
            <Card>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b-2 border-border hover:bg-muted/50">
                    <TableHead className="w-[250px] font-semibold text-foreground">
                      Tên câu lạc bộ
                    </TableHead>
                    <TableHead className="w-[150px] font-semibold text-foreground">
                      Mã CLB
                    </TableHead>
                    <TableHead className="w-[180px] font-semibold text-foreground">
                      Trạng thái
                    </TableHead>
                    <TableHead className="w-[120px] text-center font-semibold text-foreground">
                      Hành động
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClubs.map((club) => (
                    <TableRow key={club.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                            <span className="text-xs font-semibold">
                              {club.avatar || club.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="truncate">{club.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {club.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusColor(
                            club.backendStatus,
                            club.mustResubmit
                          )} whitespace-nowrap`}
                        >
                          {getStatusLabel(
                            club.backendStatus,
                            club.mustResubmit
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
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
                                    department:
                                      reportDetail.club?.clubName || "",
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
                                      reportDetail.status !==
                                        "REJECTED_UNIVERSITY" &&
                                      reportDetail.reviewerFeedback &&
                                      reportDetail.reviewedDate
                                        ? reportDetail.reviewerFeedback
                                        : undefined,
                                    rejectionReason:
                                      reportDetail.status ===
                                        "REJECTED_UNIVERSITY" &&
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
                            <span className="hidden sm:inline">
                              Xem báo cáo
                            </span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
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
