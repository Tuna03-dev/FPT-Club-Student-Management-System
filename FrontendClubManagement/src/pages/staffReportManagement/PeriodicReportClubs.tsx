import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ClubReportModal } from "@/components/features/report/ClubReportModal";

type ReportStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "needs-review"
  | "not-submitted";

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
  hasReport: boolean;
  report?: Report;
}

// Mock clubs - should be moved to a shared file or fetched from API
const mockClubs: Club[] = [
  {
    id: "club-1",
    name: "CLB Lập trình",
    code: "CP",
    avatar: "/public/images/club-1.jpg",
    description: "Câu lạc bộ lập trình và công nghệ",
  },
  {
    id: "club-2",
    name: "CLB Kỹ năng mềm",
    code: "SS",
    avatar: "/public/images/club-2.jpg",
    description: "Câu lạc bộ phát triển kỹ năng mềm",
  },
  {
    id: "club-3",
    name: "CLB Tình nguyện",
    code: "VOL",
    avatar: "/public/images/club-3.jpg",
    description: "Câu lạc bộ tình nguyện viên",
  },
  {
    id: "club-4",
    name: "CLB Thể thao",
    code: "SP",
    avatar: "/public/images/club-4.jpg",
    description: "Câu lạc bộ thể thao và sức khỏe",
  },
  {
    id: "club-5",
    name: "CLB Nghệ thuật",
    code: "ART",
    avatar: "/public/images/club-5.jpg",
    description: "Câu lạc bộ nghệ thuật và sáng tạo",
  },
];

// Mock reports - should be fetched from API based on reportId
const mockReports: Report[] = [
  {
    id: "req-1",
    title: "Báo cáo hoạt động tháng 11/2024",
    type: "periodic",
    status: "submitted",
    submittedBy: "Lê Văn C",
    submittedByAvatar: "/male-user-avatar.png",
    department: "Phòng Sự vụ",
    createdAt: "2024-10-25",
    dueDate: "2024-11-15",
    content: "Báo cáo chi tiết các hoạt động...",
    clubId: "club-1",
  },
  {
    id: "req-3",
    title: "Báo cáo hoạt động tháng 10/2024",
    type: "periodic",
    status: "needs-review",
    submittedBy: "Phạm Thị D",
    submittedByAvatar: "/diverse-user-avatars.png",
    department: "CLB Kỹ năng mềm",
    createdAt: "2024-10-20",
    dueDate: "2024-10-31",
    content: "Báo cáo các hoạt động giao lưu...",
    clubId: "club-2",
  },
];

export function PeriodicReportClubs() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isClubReportModalOpen, setIsClubReportModalOpen] = useState(false);
  const [periodicReport, setPeriodicReport] = useState<Report | null>(null);
  const [clubsWithReports, setClubsWithReports] = useState<ClubWithReport[]>(
    []
  );

  useEffect(() => {
    // Fetch periodic report by ID
    // For now using mock data
    const report = mockReports.find((r) => r.id === reportId);
    if (report && report.type === "periodic") {
      setPeriodicReport(report);
    } else {
      // If report not found or not periodic, redirect back
      navigate("/staff/report");
    }
  }, [reportId, navigate]);

  useEffect(() => {
    if (!periodicReport) return;

    // Get club reports for this periodic report
    const clubReports = mockReports.filter(
      (r) => r.type === "periodic" && r.clubId
    );

    const clubs: ClubWithReport[] = mockClubs.map((club) => {
      const clubReport = clubReports.find((r) => r.clubId === club.id);
      return {
        ...club,
        reportStatus: clubReport?.status || "not-submitted",
        hasReport: !!clubReport,
        report: clubReport,
      };
    });

    setClubsWithReports(clubs);
  }, [periodicReport]);

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

  const getStatusLabel = (status: ReportStatus) => {
    switch (status) {
      case "not-submitted":
        return "Chưa nộp";
      case "approved":
        return "Đã phê duyệt";
      case "needs-review":
        return "Cần xem xét";
      case "rejected":
        return "Bị từ chối";
      case "submitted":
        return "Đã nộp";
      case "draft":
        return "Bản nháp";
      default:
        return status;
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "needs-review":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "submitted":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

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
                            {club.code}
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
                            club.reportStatus
                          )}`}
                        >
                          <span>{getStatusLabel(club.reportStatus)}</span>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (club.report) {
                              setSelectedReport(club.report);
                              setSelectedClub(club);
                              setIsClubReportModalOpen(true);
                            }
                          }}
                          className="gap-2"
                          disabled={!club.report}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden md:inline">Xem báo cáo</span>
                        </Button>
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
            onOpenChange={setIsClubReportModalOpen}
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
