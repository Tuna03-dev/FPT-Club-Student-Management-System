"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Send,
  BarChart3,
  Download,
  MessageSquare,
  Star,
  Share2,
} from "lucide-react";

type RecruitmentStatus = "draft" | "active" | "closed" | "completed";
type ApplicationStatus = "pending" | "approved" | "rejected" | "interview";
type QuestionType = "TEXT" | "MCQ" | "CHECKBOX";

interface RecruitmentForm {
  form_id: string;
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
  active: "Đang tuyển",
  closed: "Đã đóng",
  completed: "Hoàn thành",
};

const statusColors: Record<RecruitmentStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
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

  // Form states for creating recruitment
  const [newRecruitment, setNewRecruitment] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    max_applications: "",
    requirements: [""],
    benefits: [""],
  });
  const [formQuestions, setFormQuestions] = useState<
    Omit<RecruitmentForm, "form_id">[]
  >([
    {
      question_text: "Tại sao bạn muốn tham gia câu lạc bộ?",
      question_type: "TEXT",
      question_order: 1,
      required: true,
    },
  ]);

  // Mock data
  const recruitments: Recruitment[] = [
    {
      recruitment_id: "1",
      club_id: "1",
      semester_id: "Fall2024",
      semester_name: "Fall 2024",
      title: "Tuyển thành viên mới kỳ Fall 2024",
      description:
        "Câu lạc bộ Lập trình FPT tuyển thành viên mới cho kỳ Fall 2024. Chúng tôi tìm kiếm những bạn sinh viên có đam mê với lập trình và công nghệ.",
      start_date: "2024-01-15",
      end_date: "2024-02-15",
      status: "active",
      max_applications: 50,
      requirements: [
        "Sinh viên năm 1, 2, 3 tại FPT University",
        "Có kiến thức cơ bản về lập trình",
        "Có thời gian tham gia hoạt động CLB",
        "Tinh thần trách nhiệm cao",
      ],
      benefits: [
        "Học hỏi kiến thức lập trình từ các anh chị khóa trên",
        "Tham gia các dự án thực tế",
        "Networking với các bạn cùng sở thích",
        "Cơ hội thực tập tại các công ty công nghệ",
      ],
      form_questions: [
        {
          form_id: "1",
          question_text: "Tại sao bạn muốn tham gia câu lạc bộ?",
          question_type: "TEXT",
          question_order: 1,
          required: true,
        },
        {
          form_id: "2",
          question_text: "Bạn có kinh nghiệm gì về lập trình?",
          question_type: "TEXT",
          question_order: 2,
          required: true,
        },
        {
          form_id: "3",
          question_text: "Ngôn ngữ lập trình bạn biết:",
          question_type: "CHECKBOX",
          question_order: 3,
          options: ["JavaScript", "Python", "Java", "C#", "C++", "PHP", "Khác"],
          required: false,
        },
        {
          form_id: "4",
          question_text: "Thời gian bạn có thể tham gia hoạt động CLB:",
          question_type: "MCQ",
          question_order: 4,
          options: [
            "1-2 tiếng/tuần",
            "3-5 tiếng/tuần",
            "6-10 tiếng/tuần",
            "Trên 10 tiếng/tuần",
          ],
          required: true,
        },
      ],
      applications: [
        {
          application_id: "1",
          user_id: "101",
          user_name: "Nguyễn Văn A",
          user_email: "nguyenvana@fpt.edu.vn",
          user_phone: "0123456789",
          student_id: "SE160001",
          submitted_at: "2024-01-20T10:30:00Z",
          status: "pending",
          answers: {
            "1": "Tôi muốn tham gia CLB để học hỏi thêm kiến thức lập trình và kết nối với những bạn cùng sở thích.",
            "2": "Tôi đã học Java cơ bản và làm một số project nhỏ về web development.",
            "3": ["JavaScript", "Java", "Python"],
            "4": "3-5 tiếng/tuần",
          },
          score: 85,
          avatar: "/male-user-avatar.png",
        },
        {
          application_id: "2",
          user_id: "102",
          user_name: "Trần Thị B",
          user_email: "tranthib@fpt.edu.vn",
          student_id: "SE160002",
          submitted_at: "2024-01-22T14:15:00Z",
          status: "approved",
          answers: {
            "1": "Tôi có đam mê với công nghệ và muốn phát triển kỹ năng lập trình thông qua các hoạt động thực tế.",
            "2": "Tôi đã tự học Python và JavaScript, có kinh nghiệm làm chatbot đơn giản.",
            "3": ["JavaScript", "Python", "C++"],
            "4": "6-10 tiếng/tuần",
          },
          score: 92,
          notes: "Ứng viên xuất sắc, có kinh nghiệm tốt",
          avatar: "/female-user-avatar.png",
        },
        {
          application_id: "3",
          user_id: "103",
          user_name: "Lê Văn C",
          user_email: "levanc@fpt.edu.vn",
          student_id: "SE160003",
          submitted_at: "2024-01-25T09:45:00Z",
          status: "interview",
          answers: {
            "1": "Tôi muốn tham gia để cải thiện kỹ năng teamwork và học hỏi từ các senior.",
            "2": "Mới bắt đầu học lập trình, chủ yếu là HTML/CSS và một chút JavaScript.",
            "3": ["JavaScript"],
            "4": "1-2 tiếng/tuần",
          },
          score: 70,
          notes: "Cần phỏng vấn để đánh giá thêm",
          avatar: "/diverse-user-avatars.png",
        },
      ],
      created_at: "2024-01-10T08:00:00Z",
      updated_at: "2024-01-20T15:30:00Z",
    },
    {
      recruitment_id: "2",
      club_id: "1",
      semester_id: "Summer2024",
      semester_name: "Summer 2024",
      title: "Tuyển Ban Kỹ thuật Summer 2024",
      description:
        "Tuyển thành viên cho Ban Kỹ thuật, yêu cầu có kinh nghiệm lập trình và quản lý dự án.",
      start_date: "2024-05-01",
      end_date: "2024-05-20",
      status: "completed",
      max_applications: 20,
      requirements: [
        "Có ít nhất 1 năm kinh nghiệm lập trình",
        "Biết sử dụng Git và GitHub",
        "Có khả năng làm việc nhóm",
      ],
      benefits: [
        "Được training về quản lý dự án",
        "Tham gia các dự án lớn của CLB",
        "Cơ hội trở thành Team Lead",
      ],
      form_questions: [],
      applications: [],
      created_at: "2024-04-20T08:00:00Z",
      updated_at: "2024-05-25T15:30:00Z",
    },
  ];

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
    if (!selectedRecruitment) return [];
    return selectedRecruitment.applications.filter((app) => {
      const matchesSearch =
        app.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.student_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        applicationStatusFilter === "all" ||
        app.status === applicationStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [selectedRecruitment, searchQuery, applicationStatusFilter]);

  const addRequirement = () => {
    setNewRecruitment((prev) => ({
      ...prev,
      requirements: [...prev.requirements, ""],
    }));
  };

  const addBenefit = () => {
    setNewRecruitment((prev) => ({
      ...prev,
      benefits: [...prev.benefits, ""],
    }));
  };

  const addQuestion = () => {
    setFormQuestions((prev) => [
      ...prev,
      {
        question_text: "",
        question_type: "TEXT",
        question_order: prev.length + 1,
        required: false,
      },
    ]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setFormQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const removeQuestion = (index: number) => {
    setFormQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateRecruitment = () => {
    // Logic to create recruitment
    console.log("Creating recruitment:", newRecruitment, formQuestions);
    setActiveTab("list");
  };

  const handleUpdateApplicationStatus = (
    applicationId: string,
    newStatus: ApplicationStatus
  ) => {
    // Logic to update application status
    console.log("Updating application status:", applicationId, newStatus);
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
                className="bg-transparent border-primary-foreground/20"
              >
                <FileText className="h-4 w-4 mr-2" />
                Danh sách
              </Button>
              <Button
                variant={activeTab === "create" ? "secondary" : "outline"}
                onClick={() => setActiveTab("create")}
                className="bg-transparent border-primary-foreground/20"
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
                  <SelectItem value="active">Đang tuyển</SelectItem>
                  <SelectItem value="closed">Đã đóng</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recruitment Cards */}
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
                          <Badge variant="outline" className="text-xs">
                            {recruitment.semester_name}
                          </Badge>
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
                        <span className="text-muted-foreground">Bắt đầu:</span>
                        <div className="font-medium">
                          {new Date(recruitment.start_date).toLocaleDateString(
                            "vi-VN"
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kết thúc:</span>
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
                        <span className="text-muted-foreground">Đã duyệt:</span>
                        <div className="font-medium text-green-600">
                          {
                            recruitment.applications.filter(
                              (app) => app.status === "approved"
                            ).length
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
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
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </Button>
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

            {filteredRecruitments.length === 0 && (
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

        {/* Create Recruitment Tab */}
        {activeTab === "create" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cơ bản</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Tiêu đề đợt tuyển dụng</Label>
                  <Input
                    id="title"
                    value={newRecruitment.title}
                    onChange={(e) =>
                      setNewRecruitment((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="VD: Tuyển thành viên mới kỳ Fall 2024"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    value={newRecruitment.description}
                    onChange={(e) =>
                      setNewRecruitment((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Mô tả chi tiết về đợt tuyển dụng..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="start_date">Ngày bắt đầu</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={newRecruitment.start_date}
                      onChange={(e) =>
                        setNewRecruitment((prev) => ({
                          ...prev,
                          start_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">Ngày kết thúc</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={newRecruitment.end_date}
                      onChange={(e) =>
                        setNewRecruitment((prev) => ({
                          ...prev,
                          end_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_applications">Số lượng tối đa</Label>
                    <Input
                      id="max_applications"
                      type="number"
                      value={newRecruitment.max_applications}
                      onChange={(e) =>
                        setNewRecruitment((prev) => ({
                          ...prev,
                          max_applications: e.target.value,
                        }))
                      }
                      placeholder="50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Yêu cầu
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addRequirement}
                    className="bg-transparent"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm yêu cầu
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {newRecruitment.requirements.map((req, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={req}
                      onChange={(e) => {
                        const newReqs = [...newRecruitment.requirements];
                        newReqs[index] = e.target.value;
                        setNewRecruitment((prev) => ({
                          ...prev,
                          requirements: newReqs,
                        }));
                      }}
                      placeholder="Nhập yêu cầu..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newReqs = newRecruitment.requirements.filter(
                          (_, i) => i !== index
                        );
                        setNewRecruitment((prev) => ({
                          ...prev,
                          requirements: newReqs,
                        }));
                      }}
                      className="bg-transparent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Quyền lợi
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addBenefit}
                    className="bg-transparent"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm quyền lợi
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {newRecruitment.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={benefit}
                      onChange={(e) => {
                        const newBenefits = [...newRecruitment.benefits];
                        newBenefits[index] = e.target.value;
                        setNewRecruitment((prev) => ({
                          ...prev,
                          benefits: newBenefits,
                        }));
                      }}
                      placeholder="Nhập quyền lợi..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newBenefits = newRecruitment.benefits.filter(
                          (_, i) => i !== index
                        );
                        setNewRecruitment((prev) => ({
                          ...prev,
                          benefits: newBenefits,
                        }));
                      }}
                      className="bg-transparent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Form Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Câu hỏi trong đơn ứng tuyển
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addQuestion}
                    className="bg-transparent"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm câu hỏi
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {formQuestions.map((question, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Câu hỏi {index + 1}</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        className="bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <Input
                      value={question.question_text}
                      onChange={(e) =>
                        updateQuestion(index, "question_text", e.target.value)
                      }
                      placeholder="Nhập câu hỏi..."
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Loại câu hỏi</Label>
                        <Select
                          value={question.question_type}
                          onValueChange={(value) =>
                            updateQuestion(index, "question_type", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEXT">Văn bản</SelectItem>
                            <SelectItem value="MCQ">
                              Trắc nghiệm (1 đáp án)
                            </SelectItem>
                            <SelectItem value="CHECKBOX">
                              Trắc nghiệm (nhiều đáp án)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id={`required-${index}`}
                          checked={question.required}
                          onChange={(e) =>
                            updateQuestion(index, "required", e.target.checked)
                          }
                        />
                        <Label htmlFor={`required-${index}`}>Bắt buộc</Label>
                      </div>
                    </div>

                    {(question.question_type === "MCQ" ||
                      question.question_type === "CHECKBOX") && (
                      <div>
                        <Label>Các lựa chọn (mỗi dòng một lựa chọn)</Label>
                        <Textarea
                          value={question.options?.join("\n") || ""}
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              "options",
                              e.target.value.split("\n").filter((o) => o.trim())
                            )
                          }
                          placeholder="Lựa chọn 1&#10;Lựa chọn 2&#10;Lựa chọn 3"
                          rows={4}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => setActiveTab("list")}
                className="bg-transparent"
              >
                Hủy
              </Button>
              <Button variant="outline" className="bg-transparent">
                Lưu bản nháp
              </Button>
              <Button onClick={handleCreateRecruitment}>
                <Send className="h-4 w-4 mr-2" />
                Tạo và Công bố
              </Button>
            </div>
          </div>
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

            {/* Applications List */}
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
                        <div className="truncate">{application.user_email}</div>
                      </div>

                      {application.user_phone && (
                        <div className="text-sm">
                          <div className="text-muted-foreground">SĐT:</div>
                          <div>{application.user_phone}</div>
                        </div>
                      )}

                      {application.notes && (
                        <div className="text-sm">
                          <div className="text-muted-foreground">Ghi chú:</div>
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

            {filteredApplications.length === 0 && (
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
                            : "Trắc nghiệm (nhiều đáp án)"}
                        </div>
                        <div className="bg-muted/30 rounded p-3">
                          {Array.isArray(
                            selectedApplication.answers[question.form_id]
                          )
                            ? selectedApplication.answers[
                                question.form_id
                              ].join(", ")
                            : selectedApplication.answers[question.form_id] ||
                              "Chưa trả lời"}
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
