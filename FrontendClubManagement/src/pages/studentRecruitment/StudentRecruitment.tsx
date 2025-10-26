"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Search,
  Calendar,
  Users,
  Clock,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  ArrowLeft,
} from "lucide-react";

interface RecruitmentCampaign {
  id: string;
  clubId: string;
  clubName: string;
  clubImage: string;
  semesterId: string;
  semesterName: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED" | "UPCOMING";
  applicationsCount: number;
  maxApplications?: number;
  requirements: string[];
}

interface FormQuestion {
  id: string;
  recruitmentId: string;
  questionText: string;
  questionType: "TEXT" | "MCQ" | "CHECKBOX";
  options?: string[];
  required: boolean;
  order: number;
}

interface Application {
  id: string;
  recruitmentId: string;
  userId: string;
  answers: Record<string, any>;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  interviewDate?: string;
  score?: number;
}

export function StudentRecruitment() {
  const [activeView, setActiveView] = useState<"list" | "apply" | "status">(
    "status"
  );
  const [selectedRecruitment, setSelectedRecruitment] =
    useState<RecruitmentCampaign | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});

  // Mock data
  const recruitmentCampaigns: RecruitmentCampaign[] = [
    {
      id: "1",
      clubId: "1",
      clubName: "CLB Lập trình FPT",
      clubImage: "/placeholder-creu7.png",
      semesterId: "2024-1",
      semesterName: "Kỳ 1 - 2024",
      title: "Tuyển thành viên mới - Kỳ 1/2024",
      description:
        "Tuyển thành viên có đam mê lập trình, muốn học hỏi và phát triển kỹ năng công nghệ",
      startDate: "2024-01-15",
      endDate: "2024-01-30",
      status: "OPEN",
      applicationsCount: 45,
      maxApplications: 100,
      requirements: [
        "Sinh viên năm 1-3",
        "Có kiến thức cơ bản về lập trình",
        "Cam kết tham gia hoạt động",
      ],
    },
    {
      id: "2",
      clubId: "2",
      clubName: "CLB Khởi nghiệp FPT",
      clubImage: "/startup-pitch-competition-business.jpg",
      semesterId: "2024-1",
      semesterName: "Kỳ 1 - 2024",
      title: "Tuyển Core Member - Business Development",
      description:
        "Tìm kiếm những thành viên có tư duy kinh doanh, muốn phát triển startup",
      startDate: "2024-01-20",
      endDate: "2024-02-05",
      status: "OPEN",
      applicationsCount: 23,
      maxApplications: 50,
      requirements: [
        "GPA >= 3.0",
        "Có kinh nghiệm dự án",
        "Kỹ năng thuyết trình tốt",
      ],
    },
    {
      id: "3",
      clubId: "3",
      clubName: "CLB Nhiếp ảnh FPT",
      clubImage: "/placeholder-lvjzr.png",
      semesterId: "2024-1",
      semesterName: "Kỳ 1 - 2024",
      title: "Tuyển thành viên - Photography Team",
      description:
        "Dành cho những bạn yêu thích nhiếp ảnh và muốn học hỏi kỹ thuật chuyên nghiệp",
      startDate: "2024-01-10",
      endDate: "2024-01-25",
      status: "CLOSED",
      applicationsCount: 67,
      maxApplications: 80,
      requirements: [
        "Có máy ảnh cá nhân",
        "Đam mê nhiếp ảnh",
        "Sẵn sàng tham gia workshop",
      ],
    },
  ];

  const formQuestions: FormQuestion[] = [
    {
      id: "1",
      recruitmentId: "1",
      questionText: "Tại sao bạn muốn tham gia CLB Lập trình FPT?",
      questionType: "TEXT",
      required: true,
      order: 1,
    },
    {
      id: "2",
      recruitmentId: "1",
      questionText: "Bạn có kinh nghiệm với ngôn ngữ lập trình nào?",
      questionType: "MCQ",
      options: [
        "JavaScript",
        "Python",
        "Java",
        "C++",
        "C#",
        "Chưa có kinh nghiệm",
      ],
      required: true,
      order: 2,
    },
    {
      id: "3",
      recruitmentId: "1",
      questionText:
        "Bạn có thể tham gia các hoạt động nào? (Chọn nhiều đáp án)",
      questionType: "CHECKBOX",
      options: [
        "Workshop",
        "Hackathon",
        "Dự án nhóm",
        "Mentoring",
        "Tổ chức sự kiện",
      ],
      required: true,
      order: 3,
    },
    {
      id: "4",
      recruitmentId: "1",
      questionText: "Mô tả về bản thân và mục tiêu học tập",
      questionType: "TEXT",
      required: false,
      order: 4,
    },
  ];

  const myApplications: Application[] = [
    {
      id: "1",
      recruitmentId: "1",
      userId: "user1",
      answers: {
        "1": "Tôi muốn học hỏi và phát triển kỹ năng lập trình cùng các bạn có cùng đam mê",
        "2": "JavaScript",
        "3": ["Workshop", "Dự án nhóm"],
        "4": "Tôi là sinh viên năm 2, đam mê công nghệ và muốn trở thành developer giỏi",
      },
      status: "APPROVED",
      submittedAt: "2024-01-18T10:30:00Z",
      reviewedAt: "2024-01-20T14:15:00Z",
      reviewNote: "Ứng viên có tiềm năng tốt, phù hợp với CLB",
      interviewDate: "2024-01-25T09:00:00Z",
      score: 85,
    },
    {
      id: "2",
      recruitmentId: "2",
      userId: "user1",
      answers: {
        "1": "Tôi có ý tưởng startup và muốn học cách phát triển business",
        "2": "Có kinh nghiệm làm dự án nhóm và thuyết trình",
      },
      status: "PENDING",
      submittedAt: "2024-01-22T16:45:00Z",
    },
    {
      id: "3",
      recruitmentId: "3",
      userId: "user1",
      answers: {
        "1": "Tôi yêu thích chụp ảnh và muốn học kỹ thuật chuyên nghiệp",
      },
      status: "REJECTED",
      submittedAt: "2024-01-12T11:20:00Z",
      reviewedAt: "2024-01-15T09:30:00Z",
      reviewNote: "Đã đủ số lượng thành viên cho kỳ này. Hãy thử lại kỳ sau!",
    },
  ];

  const filteredCampaigns = recruitmentCampaigns.filter((campaign) => {
    const matchesSearch =
      campaign.clubName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      campaign.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const handleApply = (recruitmentId: string) => {
    const recruitment = recruitmentCampaigns.find(
      (r) => r.id === recruitmentId
    );
    if (recruitment) {
      setSelectedRecruitment(recruitment);
      setActiveView("apply");
    }
  };

  const handleSubmitApplication = () => {
    console.log("[v0] Submitting application:", formAnswers);
    // Reset form and go back to list
    setFormAnswers({});
    setActiveView("list");
    // Show success message
    alert("Đơn ứng tuyển đã được gửi thành công!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      case "PENDING":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (activeView === "apply" && selectedRecruitment) {
    const questions = formQuestions.filter(
      (q) => q.recruitmentId === selectedRecruitment.id
    );

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-6">
              <Button variant="ghost" onClick={() => setActiveView("list")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Đơn ứng tuyển</h1>
                <p className="text-muted-foreground">
                  {selectedRecruitment.clubName}
                </p>
              </div>
            </div>

            {/* Recruitment Info */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start space-x-4">
                  <img
                    src={selectedRecruitment.clubImage || "/placeholder.svg"}
                    alt={selectedRecruitment.clubName}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {selectedRecruitment.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {selectedRecruitment.description}
                    </CardDescription>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Hạn:{" "}
                        {new Date(
                          selectedRecruitment.endDate
                        ).toLocaleDateString("vi-VN")}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {selectedRecruitment.applicationsCount}/
                        {selectedRecruitment.maxApplications || "∞"} đơn
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Application Form */}
            <Card>
              <CardHeader>
                <CardTitle>Form ứng tuyển</CardTitle>
                <CardDescription>
                  Vui lòng điền đầy đủ thông tin để hoàn tất đơn ứng tuyển
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {questions
                  .sort((a, b) => a.order - b.order)
                  .map((question) => (
                    <div key={question.id} className="space-y-2">
                      <Label className="text-base font-medium">
                        {question.questionText}
                        {question.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>

                      {question.questionType === "TEXT" && (
                        <Textarea
                          placeholder="Nhập câu trả lời của bạn..."
                          value={formAnswers[question.id] || ""}
                          onChange={(e) =>
                            setFormAnswers((prev) => ({
                              ...prev,
                              [question.id]: e.target.value,
                            }))
                          }
                          className="min-h-[100px]"
                        />
                      )}

                      {question.questionType === "MCQ" && (
                        <RadioGroup
                          value={formAnswers[question.id] || ""}
                          onValueChange={(value) =>
                            setFormAnswers((prev) => ({
                              ...prev,
                              [question.id]: value,
                            }))
                          }
                        >
                          {question.options?.map((option, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2"
                            >
                              <RadioGroupItem
                                value={option}
                                id={`${question.id}-${index}`}
                              />
                              <Label htmlFor={`${question.id}-${index}`}>
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {question.questionType === "CHECKBOX" && (
                        <div className="space-y-2">
                          {question.options?.map((option, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`${question.id}-${index}`}
                                checked={(
                                  formAnswers[question.id] || []
                                ).includes(option)}
                                onCheckedChange={(checked) => {
                                  const currentAnswers =
                                    formAnswers[question.id] || [];
                                  if (checked) {
                                    setFormAnswers((prev) => ({
                                      ...prev,
                                      [question.id]: [
                                        ...currentAnswers,
                                        option,
                                      ],
                                    }));
                                  } else {
                                    setFormAnswers((prev) => ({
                                      ...prev,
                                      [question.id]: currentAnswers.filter(
                                        (a: string) => a !== option
                                      ),
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={`${question.id}-${index}`}>
                                {option}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                <div className="flex gap-4 pt-6">
                  <Button onClick={handleSubmitApplication} className="flex-1">
                    <Send className="h-4 w-4 mr-2" />
                    Gửi đơn ứng tuyển
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveView("list")}
                  >
                    Hủy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Tuyển dụng CLB</h1>
            <p className="text-muted-foreground">
              Khám phá và ứng tuyển vào các câu lạc bộ yêu thích
            </p>
          </div>
        </div>

        {activeView === "list" && (
          <>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm câu lạc bộ, vị trí tuyển dụng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="open">Đang mở</SelectItem>
                  <SelectItem value="closed">Đã đóng</SelectItem>
                  <SelectItem value="upcoming">Sắp mở</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recruitment List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredCampaigns.map((campaign) => (
                <Card
                  key={campaign.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-4">
                      <img
                        src={campaign.clubImage || "/placeholder.svg"}
                        alt={campaign.clubName}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {campaign.title}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground font-medium">
                              {campaign.clubName}
                            </p>
                          </div>
                          <Badge
                            variant={
                              campaign.status === "OPEN"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              campaign.status === "OPEN"
                                ? "bg-green-100 text-green-800"
                                : campaign.status === "CLOSED"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {campaign.status === "OPEN"
                              ? "Đang mở"
                              : campaign.status === "CLOSED"
                              ? "Đã đóng"
                              : "Sắp mở"}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2">
                          {campaign.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {new Date(campaign.startDate).toLocaleDateString(
                            "vi-VN"
                          )}{" "}
                          -{" "}
                          {new Date(campaign.endDate).toLocaleDateString(
                            "vi-VN"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Users className="h-4 w-4 mr-2" />
                        <span>
                          {campaign.applicationsCount}/
                          {campaign.maxApplications || "∞"} đơn
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Yêu cầu:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {campaign.requirements.map((req, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {campaign.status === "OPEN" ? (
                        <Button
                          onClick={() => handleApply(campaign.id)}
                          className="flex-1"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Ứng tuyển ngay
                        </Button>
                      ) : (
                        <Button disabled className="flex-1">
                          {campaign.status === "CLOSED" ? "Đã đóng" : "Chưa mở"}
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Chi tiết
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {activeView === "status" && (
          <>
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">
                Trạng thái đơn ứng tuyển của tôi
              </h2>

              {myApplications.map((application) => {
                const recruitment = recruitmentCampaigns.find(
                  (r) => r.id === application.recruitmentId
                );
                if (!recruitment) return null;

                return (
                  <Card key={application.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <img
                            src={recruitment.clubImage || "/placeholder.svg"}
                            alt={recruitment.clubName}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <CardTitle className="text-lg">
                              {recruitment.title}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {recruitment.clubName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Nộp đơn:{" "}
                              {new Date(
                                application.submittedAt
                              ).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(application.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(application.status)}
                            <span>
                              {application.status === "APPROVED"
                                ? "Đã duyệt"
                                : application.status === "REJECTED"
                                ? "Từ chối"
                                : "Đang xét duyệt"}
                            </span>
                          </div>
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {application.status === "APPROVED" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-green-800">
                                Chúc mừng! Đơn của bạn đã được chấp nhận
                              </h4>
                              {application.interviewDate && (
                                <p className="text-sm text-green-700 mt-1">
                                  <Calendar className="h-4 w-4 inline mr-1" />
                                  Lịch phỏng vấn:{" "}
                                  {new Date(
                                    application.interviewDate
                                  ).toLocaleString("vi-VN")}
                                </p>
                              )}
                              {application.score && (
                                <p className="text-sm text-green-700 mt-1">
                                  Điểm đánh giá: {application.score}/100
                                </p>
                              )}
                              {application.reviewNote && (
                                <p className="text-sm text-green-700 mt-2">
                                  <MessageSquare className="h-4 w-4 inline mr-1" />
                                  Ghi chú: {application.reviewNote}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {application.status === "REJECTED" && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-red-800">
                                Đơn ứng tuyển chưa được chấp nhận
                              </h4>
                              {application.reviewNote && (
                                <p className="text-sm text-red-700 mt-2">
                                  <MessageSquare className="h-4 w-4 inline mr-1" />
                                  Phản hồi: {application.reviewNote}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {application.status === "PENDING" && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-yellow-800">
                                Đơn đang được xét duyệt
                              </h4>
                              <p className="text-sm text-yellow-700 mt-1">
                                CLB sẽ phản hồi trong vòng 3-5 ngày làm việc.
                                Bạn sẽ nhận được thông báo qua email.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Xem đơn đã nộp
                        </Button>
                        {application.status === "REJECTED" && (
                          <Button variant="outline" size="sm">
                            Ứng tuyển lại
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {myApplications.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      Chưa có đơn ứng tuyển nào
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Hãy khám phá và ứng tuyển vào các CLB yêu thích!
                    </p>
                    <Button onClick={() => setActiveView("list")}>
                      Xem danh sách tuyển dụng
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
