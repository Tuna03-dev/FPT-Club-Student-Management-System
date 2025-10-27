"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  BarChart3,
  Download,
  MessageSquare,
  Share2,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";
import {
  getRecruitmentsByClubId,
  getApplicationsByRecruitmentId,
  getRecruitmentById,
  createRecruitment,
  updateRecruitment,
  changeRecruitmentStatus,
  type RecruitmentCreateRequest,
} from "@/service/RecruitmentService";
import { toast } from "sonner";
import { RecruitmentForm } from "@/components/features/recruitment/RecruitmentForm";

type RecruitmentStatus = "draft" | "open" | "closed" | "cancelled";
type ApplicationStatus = "pending" | "approved" | "rejected" | "interview";
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
  max_applications?: number;
  requirements?: string[];
  benefits?: string[];
  form_questions: RecruitmentForm[];
  applications: RecruitmentApplication[];
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

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: "Chờ xét duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  interview: "Phỏng vấn",
};

const applicationStatusColors: Record<ApplicationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  interview: "bg-blue-100 text-blue-700",
};

export function RecruitmentManagement() {
  const [activeTab, setActiveTab] = useState<
    "list" | "create" | "applications"
  >("list");
  const [selectedRecruitment, setSelectedRecruitment] =
    useState<Recruitment | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<RecruitmentApplication | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RecruitmentStatus | "all">(
    "all"
  );
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<
    ApplicationStatus | "all"
  >("all");

  // API data states
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [applications, setApplications] = useState<RecruitmentApplication[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRecruitment, setEditingRecruitment] =
    useState<Recruitment | null>(null);

  // Get current user and clubId
  // const currentUser = authService.getCurrentUser();
  const clubId = 1; // Use user ID as clubId, or default to 1

  // Function to fetch recruitments
  const fetchRecruitments = useCallback(async () => {
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
        page: 0,
        size: 100,
      });

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
        max_applications: r.maxApplicants,
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
          required: true, // TODO: Get from API if available
        })),
        applications: [], // Will be fetched separately when needed
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
  }, [clubId, statusFilter]);

  // Fetch recruitments from API on mount and when filters change
  useEffect(() => {
    fetchRecruitments();
  }, [fetchRecruitments]);

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
          applicationStatusFilter !== "all"
            ? (applicationStatusFilter.toUpperCase() as
                | "PENDING"
                | "APPROVED"
                | "REJECTED"
                | "INTERVIEW")
            : undefined;

        const response = await getApplicationsByRecruitmentId(
          parseInt(selectedRecruitment.recruitment_id),
          {
            status: apiStatus,
            page: 0,
            size: 100,
          }
        );

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
  }, [selectedRecruitment?.recruitment_id, applicationStatusFilter]);

  const filteredRecruitments = useMemo(() => {
    return recruitments.filter((recruitment) => {
      const matchesSearch =
        recruitment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recruitment.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || recruitment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [recruitments, searchQuery, statusFilter]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.student_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        applicationStatusFilter === "all" ||
        app.status === applicationStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchQuery, applicationStatusFilter]);

  const handleEditRecruitment = async (recruitment: Recruitment) => {
    try {
      setLoading(true);

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
        max_applications: freshData.maxApplicants,
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
          required: true,
        })),
        applications: [],
        created_at: freshData.createdAt,
        updated_at: freshData.updatedAt,
      };

      // Load recruitment data into form
      setEditingRecruitment(mappedRecruitment);
      setActiveTab("create");
    } catch (err: any) {
      console.error("Error loading recruitment for edit:", err);
      toast.error("Không thể tải dữ liệu đợt tuyển dụng");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelForm = () => {
    setEditingRecruitment(null);
    setActiveTab("list");
  };

  const handleSaveRecruitment = async (
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

  const handleUpdateApplicationStatus = (
    applicationId: string,
    newStatus: ApplicationStatus
  ) => {
    // Logic to update application status
    console.log("Updating application status:", applicationId, newStatus);
  };

  const handleChangeRecruitmentStatus = async (
    recruitmentId: string,
    newStatus: "OPEN" | "CLOSED"
  ) => {
    try {
      setLoading(true);
      await changeRecruitmentStatus(parseInt(recruitmentId), newStatus);

      const statusText = newStatus === "OPEN" ? "mở" : "đóng";
      toast.success(
        `${statusText === "mở" ? "Mở" : "Đóng"} đơn tuyển dụng thành công!`
      );

      // Refetch recruitments to update the list
      await fetchRecruitments();
    } catch (err: any) {
      console.error("Error changing recruitment status:", err);
      toast.error(
        err.message || "Không thể thay đổi trạng thái đơn tuyển dụng"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Quản lý Tuyển dụng
              </h1>
              <p className="text-muted-foreground mt-1">
                Tạo và quản lý các đợt tuyển thành viên mới
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === "list" ? "secondary" : "outline"}
                onClick={() => setActiveTab("list")}
                className="border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-glow transition-all"
              >
                <FileText className="h-4 w-4 mr-2" />
                Danh sách
              </Button>
              <Button
                variant={activeTab === "create" ? "secondary" : "outline"}
                onClick={() => {
                  setEditingRecruitment(null);
                  setActiveTab("create");
                }}
                className="border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm hover:shadow-glow transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tạo mới
              </Button>
              {selectedRecruitment && (
                <Button
                  variant={
                    activeTab === "applications" ? "secondary" : "outline"
                  }
                  onClick={() => setActiveTab("applications")}
                  className="bg-transparent border-primary-foreground/20"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Đơn ứng tuyển
                </Button>
              )}
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
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Đang tải...</span>
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
                {filteredRecruitments.map((recruitment) => (
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
                            {recruitment.applications.length}
                            {recruitment.max_applications &&
                              ` / ${recruitment.max_applications}`}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Đã duyệt:
                          </span>
                          <div className="font-medium text-green-600">
                            {
                              recruitment.applications.filter(
                                (app) => app.status === "approved"
                              ).length
                            }
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
                          Xem đơn
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
                          onClick={() => handleEditRecruitment(recruitment)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa
                        </Button>
                        {recruitment.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleChangeRecruitmentStatus(
                                recruitment.recruitment_id,
                                "OPEN"
                              )
                            }
                            className="bg-transparent text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                          >
                            <Unlock className="h-4 w-4 mr-2" />
                            Mở đơn
                          </Button>
                        )}
                        {recruitment.status === "open" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleChangeRecruitmentStatus(
                                recruitment.recruitment_id,
                                "CLOSED"
                              )
                            }
                            className="bg-transparent text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Đóng đơn
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-transparent"
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

            {!loading && !error && filteredRecruitments.length === 0 && (
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
          </div>
        )}

        {/* Create/Edit Recruitment Tab */}
        {activeTab === "create" && (
          <RecruitmentForm
            editingRecruitment={editingRecruitment}
            onSave={handleSaveRecruitment}
            onCancel={handleCancelForm}
            createLoading={createLoading}
          />
        )}

        {/* Applications Tab */}
        {activeTab === "applications" && selectedRecruitment && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedRecruitment.title}
                </h2>
                <p className="text-muted-foreground">
                  {selectedRecruitment.applications.length} đơn ứng tuyển
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Xuất Excel
                </Button>
                <Button variant="outline" className="bg-transparent">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Thống kê
                </Button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm ứng viên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={applicationStatusFilter}
                onValueChange={(value) =>
                  setApplicationStatusFilter(value as ApplicationStatus | "all")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="pending">Chờ xét duyệt</SelectItem>
                  <SelectItem value="interview">Phỏng vấn</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="rejected">Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Applications Loading State */}
            {applicationsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">
                  Đang tải đơn ứng tuyển...
                </span>
              </div>
            )}

            {/* Applications List */}
            {!applicationsLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredApplications.map((application) => (
                  <Card
                    key={application.application_id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={application.avatar || "/placeholder.svg"}
                            />
                            <AvatarFallback>
                              {application.user_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">
                              {application.user_name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {application.student_id}
                            </p>
                          </div>
                        </div>
                        {/* {application.score && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {application.score}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            điểm
                          </div>
                        </div>
                      )} */}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge
                            className={
                              applicationStatusColors[application.status]
                            }
                          >
                            {applicationStatusLabels[application.status]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(
                              application.submitted_at
                            ).toLocaleDateString("vi-VN")}
                          </span>
                        </div>

                        <div className="text-sm">
                          <div className="text-muted-foreground">Email:</div>
                          <div className="truncate">
                            {application.user_email}
                          </div>
                        </div>

                        {application.user_phone && (
                          <div className="text-sm">
                            <div className="text-muted-foreground">SĐT:</div>
                            <div>{application.user_phone}</div>
                          </div>
                        )}

                        {application.notes && (
                          <div className="text-sm">
                            <div className="text-muted-foreground">
                              Ghi chú:
                            </div>
                            <div className="text-xs bg-muted/50 rounded p-2">
                              {application.notes}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedApplication(application)}
                            className="bg-transparent"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Xem
                          </Button>
                          {application.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdateApplicationStatus(
                                    application.application_id,
                                    "approved"
                                  )
                                }
                                className="bg-transparent text-green-600 border-green-200 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdateApplicationStatus(
                                    application.application_id,
                                    "rejected"
                                  )
                                }
                                className="bg-transparent text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!applicationsLoading && filteredApplications.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Không tìm thấy đơn ứng tuyển nào
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  Chi tiết đơn ứng tuyển - {selectedApplication.user_name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedApplication(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Thông tin ứng viên</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Họ tên:</strong> {selectedApplication.user_name}
                      </div>
                      <div>
                        <strong>MSSV:</strong> {selectedApplication.student_id}
                      </div>
                      <div>
                        <strong>Email:</strong> {selectedApplication.user_email}
                      </div>
                      {selectedApplication.user_phone && (
                        <div>
                          <strong>SĐT:</strong> {selectedApplication.user_phone}
                        </div>
                      )}
                      <div>
                        <strong>Nộp đơn:</strong>{" "}
                        {new Date(
                          selectedApplication.submitted_at
                        ).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Trạng thái</h4>
                    <div className="space-y-3">
                      <Badge
                        className={
                          applicationStatusColors[selectedApplication.status]
                        }
                      >
                        {applicationStatusLabels[selectedApplication.status]}
                      </Badge>
                      {/* {selectedApplication.score && (
                        <div className="text-2xl font-bold text-primary">
                          {selectedApplication.score} điểm
                        </div>
                      )} */}
                      {selectedApplication.notes && (
                        <div className="text-sm bg-muted/50 rounded p-3">
                          <strong>Ghi chú:</strong> {selectedApplication.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <div>
                  <h4 className="font-medium mb-3">Câu trả lời</h4>
                  <div className="space-y-4">
                    {selectedRecruitment?.form_questions.map((question) => (
                      <div
                        key={question.form_id}
                        className="border rounded-lg p-4"
                      >
                        <h5 className="font-medium mb-2">
                          {question.question_text}
                        </h5>
                        <div className="text-sm text-muted-foreground mb-2">
                          Loại:{" "}
                          {question.question_type === "TEXT"
                            ? "Văn bản"
                            : question.question_type === "MCQ"
                            ? "Trắc nghiệm (1 đáp án)"
                            : question.question_type === "CHECKBOX"
                            ? "Trắc nghiệm (nhiều đáp án)"
                            : "Tải lên file"}
                        </div>
                        <div className="bg-muted/30 rounded p-3">
                          {question.question_type === "FILE" ? (
                            selectedApplication.answers[question.form_id!] ? (
                              <a
                                href={
                                  selectedApplication.answers[question.form_id!]
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-2"
                              >
                                <FileText className="h-4 w-4" />
                                Xem file đã tải lên
                              </a>
                            ) : (
                              "Chưa tải lên file"
                            )
                          ) : Array.isArray(
                              selectedApplication.answers[question.form_id!]
                            ) ? (
                            selectedApplication.answers[question.form_id!].join(
                              ", "
                            )
                          ) : (
                            selectedApplication.answers[question.form_id!] ||
                            "Chưa trả lời"
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedApplication.status === "pending" && (
                    <>
                      <Button
                        onClick={() =>
                          handleUpdateApplicationStatus(
                            selectedApplication.application_id,
                            "interview"
                          )
                        }
                        variant="outline"
                        className="bg-transparent"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Mời phỏng vấn
                      </Button>
                      <Button
                        onClick={() =>
                          handleUpdateApplicationStatus(
                            selectedApplication.application_id,
                            "approved"
                          )
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Duyệt đơn
                      </Button>
                      <Button
                        onClick={() =>
                          handleUpdateApplicationStatus(
                            selectedApplication.application_id,
                            "rejected"
                          )
                        }
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Từ chối
                      </Button>
                    </>
                  )}
                  {/* <Button variant="outline" className="bg-transparent">
                    <Star className="h-4 w-4 mr-2" />
                    Chấm điểm
                  </Button> */}
                  <Button variant="outline" className="bg-transparent">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ghi chú
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
