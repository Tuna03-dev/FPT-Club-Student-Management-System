"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getMyApplications,
  getRecruitmentById,
  getMyApplicationDetail,
} from "@/services/recruitmentService";
import type {
  RecruitmentApplicationData,
  RecruitmentData,
} from "@/services/recruitmentService";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  required: boolean; // Keep for mock data compatibility
  order: number;
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
  const [myApplications, setMyApplications] = useState<
    RecruitmentApplicationData[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listLoading] = useState(false);

  // Filter states for my applications
  const [myAppSearchQuery, setMyAppSearchQuery] = useState("");
  const [myAppStatusFilter, setMyAppStatusFilter] = useState<string>("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10; // Number of items per page

  // Application detail dialog
  const [selectedApplicationDetail, setSelectedApplicationDetail] =
    useState<RecruitmentApplicationData | null>(null);
  const [recruitmentDetail, setRecruitmentDetail] =
    useState<RecruitmentData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Mock data
  // TODO: Replace with real data fetched from the API.
  const recruitmentCampaigns: RecruitmentCampaign[] = [];

  // TODO: Load recruitment form questions from API when applying.
  const formQuestions: FormQuestion[] = [];

  // Load my applications from API
  useEffect(() => {
    const fetchMyApplications = async () => {
      try {
        setIsLoading(true);
        // Convert status filter for API call
        const statusParam =
          myAppStatusFilter === "all"
            ? undefined
            : (myAppStatusFilter as
                | "UNDER_REVIEW"
                | "ACCEPTED"
                | "REJECTED"
                | "INTERVIEW");

        const response = await getMyApplications({
          page: currentPage,
          size: pageSize,
          status: statusParam,
          keyword: myAppSearchQuery.trim() || undefined,
        });
        setMyApplications(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      } catch (error) {
        console.error("Failed to fetch my applications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeView === "status") {
      fetchMyApplications();
    }
  }, [activeView, myAppStatusFilter, currentPage, myAppSearchQuery]); // Re-fetch when status filter, page, or search query changes

  // Reset to page 0 when filter or search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [myAppStatusFilter, myAppSearchQuery]);

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
    // Reset form and go back to list
    setFormAnswers({});
    setActiveView("list");
    // Show success message
    alert("Đơn ứng tuyển đã được gửi thành công!");
  };

  const handleViewApplicationDetail = async (
    application: RecruitmentApplicationData
  ) => {
    try {
      setDetailLoading(true);

      // Fetch full application details from the new API
      const fullApplicationDetail = await getMyApplicationDetail(
        application.id
      );
      setSelectedApplicationDetail(fullApplicationDetail);

      // Fetch recruitment details to get questions
      const recruitment = await getRecruitmentById(application.recruitmentId);
      setRecruitmentDetail(recruitment);
    } catch (error) {
      console.error("Failed to fetch application details:", error);
      alert("Không thể tải thông tin chi tiết đơn ứng tuyển");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseApplicationDetail = () => {
    setSelectedApplicationDetail(null);
    setRecruitmentDetail(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UNDER_REVIEW":
        return "bg-yellow-100 text-yellow-800";
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "INTERVIEW":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "UNDER_REVIEW":
        return <AlertCircle className="h-4 w-4" />;
      case "ACCEPTED":
        return <CheckCircle className="h-4 w-4" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      case "INTERVIEW":
        return <MessageSquare className="h-4 w-4" />;
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
        <div className="container mx-auto px-12 py-8">
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
      <div className="container mx-auto px-12 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Trạng thái đơn ứng tuyển của tôi
            </h1>
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

            {/* Loading Skeleton for List */}
            {listLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[...Array(4)].map((_, index) => (
                  <Card
                    key={index}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start space-x-4">
                        {/* Club logo skeleton */}
                        <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              {/* Title */}
                              <Skeleton className="h-5 w-3/4" />
                              {/* Club name */}
                              <Skeleton className="h-4 w-1/2" />
                            </div>
                            {/* Status badge */}
                            <Skeleton className="h-6 w-20 rounded-full ml-2" />
                          </div>
                          {/* Description */}
                          <div className="mt-2 space-y-1">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-5/6" />
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Date and applicants info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>

                      {/* Requirements */}
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <div className="space-y-1">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Skeleton className="h-1 w-1 rounded-full mt-2" />
                              <Skeleton className="h-3 flex-1" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2">
                        <Skeleton className="h-10 flex-1 rounded" />
                        <Skeleton className="h-10 w-24 rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Recruitment List */
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
                            {campaign.status === "CLOSED"
                              ? "Đã đóng"
                              : "Chưa mở"}
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
            )}
          </>
        )}

        {activeView === "status" && (
          <>
            <div className="space-y-6">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Tìm kiếm theo ID, tên, email, MSSV..."
                    value={myAppSearchQuery}
                    onChange={(e) => setMyAppSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={myAppStatusFilter}
                  onValueChange={setMyAppStatusFilter}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Lọc theo trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Đang xem xét</SelectItem>
                    <SelectItem value="INTERVIEW">Chờ phỏng vấn</SelectItem>
                    <SelectItem value="ACCEPTED">Đã duyệt</SelectItem>
                    <SelectItem value="REJECTED">Từ chối</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(4)].map((_, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="space-y-2 flex-1">
                              {/* Application ID title */}
                              <Skeleton className="h-5 w-40" />
                              {/* User name */}
                              <Skeleton className="h-4 w-32" />
                              {/* Submitted date */}
                              <Skeleton className="h-3 w-36" />
                            </div>
                          </div>
                          {/* Status badge */}
                          <Skeleton className="h-6 w-28 rounded-full" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Status info box - varies by status */}
                        <div
                          className={`border rounded-lg p-4 ${
                            index % 4 === 0
                              ? "bg-green-50 border-green-200"
                              : index % 4 === 1
                                ? "bg-purple-50 border-purple-200"
                                : index % 4 === 2
                                  ? "bg-red-50 border-red-200"
                                  : "bg-yellow-50 border-yellow-200"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-full" />
                              {/* Notes section for some statuses */}
                              {(index % 4 === 0 || index % 4 === 1) && (
                                <div className="mt-3 space-y-2">
                                  <Skeleton className="h-3 w-24" />
                                  <Skeleton className="h-16 w-full rounded" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <Skeleton className="h-9 w-32" />
                          {index % 4 === 2 && <Skeleton className="h-9 w-28" />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  {/* Results count and info */}
                  {myApplications.length > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div>
                        {myAppSearchQuery ? (
                          <>
                            Tìm thấy{" "}
                            <span className="font-semibold">
                              {totalElements}
                            </span>{" "}
                            kết quả tìm kiếm
                          </>
                        ) : (
                          <>
                            Hiển thị{" "}
                            <span className="font-semibold">
                              {Math.min(
                                currentPage * pageSize + 1,
                                totalElements
                              )}{" "}
                              -{" "}
                              {Math.min(
                                (currentPage + 1) * pageSize,
                                totalElements
                              )}
                            </span>{" "}
                            trong tổng số{" "}
                            <span className="font-semibold">
                              {totalElements}
                            </span>{" "}
                            đơn
                          </>
                        )}
                      </div>
                      {totalPages > 1 && (
                        <div>
                          Trang {currentPage + 1} / {totalPages}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Applications Grid - 3 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myApplications.map((application) => {
                      // For now, we don't have recruitment data joined in the response
                      // You may need to fetch recruitment details separately or modify backend to include it
                      return (
                        <Card key={application.id} className="overflow-hidden">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-4">
                                <div>
                                  <CardTitle className="text-lg">
                                    Đơn ứng tuyển #{application.id}
                                  </CardTitle>
                                  <p className="text-sm text-muted-foreground">
                                    {application.userName}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Nộp đơn:{" "}
                                    {new Date(
                                      application.submittedDate
                                    ).toLocaleDateString("vi-VN")}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                className={getStatusColor(application.status)}
                              >
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(application.status)}
                                  <span>
                                    {application.status === "UNDER_REVIEW"
                                      ? "Đang xem xét"
                                      : application.status === "ACCEPTED"
                                        ? "Đã duyệt"
                                        : application.status === "REJECTED"
                                          ? "Từ chối"
                                          : application.status === "INTERVIEW"
                                            ? "Chờ phỏng vấn"
                                            : "Đang xét duyệt"}
                                  </span>
                                </div>
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            {application.status === "ACCEPTED" && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-green-800">
                                      Chúc mừng! Đơn của bạn đã được chấp nhận
                                    </h4>
                                    {application.reviewNotes && (
                                      <div className="mt-3">
                                        <div className="flex items-center gap-1 text-sm font-medium text-green-800 mb-1">
                                          <MessageSquare className="h-4 w-4" />
                                          <span>Ghi chú:</span>
                                        </div>
                                        <div className="text-sm text-green-700 whitespace-pre-wrap bg-green-100 rounded p-2 border border-green-200">
                                          {application.reviewNotes}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {application.status === "INTERVIEW" && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                  <MessageSquare className="h-5 w-5 text-purple-600 mt-0.5" />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-purple-800">
                                      Bạn đã được mời phỏng vấn
                                    </h4>
                                    <p className="text-sm text-purple-700 mt-1">
                                      Vui lòng chuẩn bị và tham gia đúng giờ.
                                      Chúc bạn may mắn!
                                    </p>
                                    {application.reviewNotes && (
                                      <div className="mt-3">
                                        <div className="flex items-center gap-1 text-sm font-medium text-purple-800 mb-1">
                                          <MessageSquare className="h-4 w-4" />
                                          <span>Thông tin phỏng vấn:</span>
                                        </div>
                                        <div className="text-sm text-purple-700 whitespace-pre-wrap bg-purple-100 rounded p-2 border border-purple-200">
                                          {application.reviewNotes}
                                        </div>
                                      </div>
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
                                    {application.reviewNotes && (
                                      <div className="mt-3">
                                        <div className="flex items-center gap-1 text-sm font-medium text-red-800 mb-1">
                                          <MessageSquare className="h-4 w-4" />
                                          <span>Phản hồi:</span>
                                        </div>
                                        <div className="text-sm text-red-700 whitespace-pre-wrap bg-red-100 rounded p-2 border border-red-200">
                                          {application.reviewNotes}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {application.status === "UNDER_REVIEW" && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-yellow-800">
                                      Đơn đang được xét duyệt
                                    </h4>
                                    <p className="text-sm text-yellow-700 mt-1">
                                      CLB sẽ phản hồi trong vòng 3-5 ngày làm
                                      việc.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleViewApplicationDetail(application)
                                }
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Xem đơn đã nộp
                              </Button>
                              {/* {application.status === "REJECTED" && (
                                <Button variant="outline" size="sm">
                                  Ứng tuyển lại
                                </Button>
                              )} */}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && myApplications.length > 0 && (
                    <div className="flex justify-center mt-6">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => {
                                if (currentPage > 0) {
                                  setCurrentPage(currentPage - 1);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                }
                              }}
                              className={
                                currentPage === 0
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>

                          {/* First page */}
                          {currentPage > 2 && (
                            <>
                              <PaginationItem>
                                <PaginationLink
                                  onClick={() => {
                                    setCurrentPage(0);
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
                              {currentPage > 3 && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                            </>
                          )}

                          {/* Pages around current page */}
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i;
                              } else if (currentPage <= 2) {
                                pageNum = i;
                              } else if (currentPage >= totalPages - 3) {
                                pageNum = totalPages - 5 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              if (pageNum < 0 || pageNum >= totalPages)
                                return null;
                              if (currentPage > 2 && pageNum === 0) return null;
                              if (
                                currentPage < totalPages - 3 &&
                                pageNum === totalPages - 1
                              )
                                return null;

                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationLink
                                    onClick={() => {
                                      setCurrentPage(pageNum);
                                      window.scrollTo({
                                        top: 0,
                                        behavior: "smooth",
                                      });
                                    }}
                                    isActive={currentPage === pageNum}
                                    className="cursor-pointer"
                                  >
                                    {pageNum + 1}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                          )}

                          {/* Last page */}
                          {currentPage < totalPages - 3 && (
                            <>
                              {currentPage < totalPages - 4 && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                              <PaginationItem>
                                <PaginationLink
                                  onClick={() => {
                                    setCurrentPage(totalPages - 1);
                                    window.scrollTo({
                                      top: 0,
                                      behavior: "smooth",
                                    });
                                  }}
                                  className="cursor-pointer"
                                >
                                  {totalPages}
                                </PaginationLink>
                              </PaginationItem>
                            </>
                          )}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => {
                                if (currentPage < totalPages - 1) {
                                  setCurrentPage(currentPage + 1);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                }
                              }}
                              className={
                                currentPage === totalPages - 1
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}

                  {myApplications.length === 0 && (
                    <Card>
                      <CardContent className="text-center py-12">
                        {myAppSearchQuery || myAppStatusFilter !== "all" ? (
                          <>
                            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                              Không tìm thấy kết quả phù hợp
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setMyAppSearchQuery("");
                                setMyAppStatusFilter("all");
                              }}
                            >
                              Xóa bộ lọc
                            </Button>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Application Detail Dialog */}
      <Dialog
        open={!!selectedApplicationDetail}
        onOpenChange={(open) => !open && handleCloseApplicationDetail()}
      >
        <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chi tiết đơn ứng tuyển #{selectedApplicationDetail?.id}
            </DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về đơn ứng tuyển của bạn
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-6">
              {/* Recruitment Info Skeleton */}
              <div className="border rounded-lg p-4 bg-primary/5">
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              </div>

              {/* Application Status Skeleton */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left column - Application info */}
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-40" />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </div>

                  {/* Right column - Applicant info */}
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-36" />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Notes Skeleton (optional) */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-20 w-full rounded" />
              </div>

              {/* Answers Skeleton */}
              <div className="space-y-4">
                <Skeleton className="h-5 w-36" />
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                      <Skeleton className="h-5 w-3/4" />
                    </div>
                    <div className="ml-8">
                      <Skeleton className="h-20 w-full rounded" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Close button */}
              <div className="flex justify-end pt-6 border-t">
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          ) : (
            selectedApplicationDetail && (
              <div className="space-y-6">
                {/* Recruitment Info */}
                {recruitmentDetail && (
                  <div className="border rounded-lg p-4 bg-primary/5">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Thông tin tuyển dụng
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tiêu đề: </span>
                        <span className="font-medium">
                          {recruitmentDetail.title}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mô tả: </span>
                        <span>{recruitmentDetail.description}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Thời gian:{" "}
                        </span>
                        <span>
                          {new Date(
                            recruitmentDetail.startDate
                          ).toLocaleDateString("vi-VN")}{" "}
                          -{" "}
                          {new Date(
                            recruitmentDetail.endDate
                          ).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Application Status */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-3">
                        Thông tin đơn ứng tuyển
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Trạng thái:
                          </span>
                          <Badge
                            className={getStatusColor(
                              selectedApplicationDetail.status
                            )}
                          >
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(selectedApplicationDetail.status)}
                              <span>
                                {selectedApplicationDetail.status ===
                                "UNDER_REVIEW"
                                  ? "Đang xem xét"
                                  : selectedApplicationDetail.status ===
                                      "ACCEPTED"
                                    ? "Đã duyệt"
                                    : selectedApplicationDetail.status ===
                                        "REJECTED"
                                      ? "Từ chối"
                                      : selectedApplicationDetail.status ===
                                          "INTERVIEW"
                                        ? "Chờ phỏng vấn"
                                        : "Đang xét duyệt"}
                              </span>
                            </div>
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Ngày nộp:
                          </span>
                          <span className="font-medium">
                            {new Date(
                              selectedApplicationDetail.submittedDate
                            ).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        {selectedApplicationDetail.reviewedDate && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Ngày xét duyệt:
                            </span>
                            <span className="font-medium">
                              {new Date(
                                selectedApplicationDetail.reviewedDate
                              ).toLocaleString("vi-VN")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Thông tin ứng viên</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Họ tên:</span>
                          <span className="font-medium">
                            {selectedApplicationDetail.userName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium">
                            {selectedApplicationDetail.userEmail}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">MSSV:</span>
                          <span className="font-medium">
                            {selectedApplicationDetail.studentId}
                          </span>
                        </div>
                        {selectedApplicationDetail.userPhone && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">SĐT:</span>
                            <span className="font-medium">
                              {selectedApplicationDetail.userPhone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Notes */}
                {selectedApplicationDetail.reviewNotes && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {selectedApplicationDetail.status === "INTERVIEW"
                        ? "Thông tin phỏng vấn"
                        : selectedApplicationDetail.status === "REJECTED"
                          ? "Phản hồi từ CLB"
                          : "Ghi chú từ CLB"}
                    </h4>
                    <div className="bg-muted/50 rounded p-3 text-sm whitespace-pre-wrap">
                      {selectedApplicationDetail.reviewNotes}
                    </div>
                  </div>
                )}

                {/* Answers */}
                <div>
                  <h4 className="font-medium mb-3">Câu trả lời của bạn</h4>
                  {selectedApplicationDetail.answers &&
                  selectedApplicationDetail.answers.length > 0 ? (
                    <div className="space-y-4">
                      {/* Sort answers by questionId to maintain order */}
                      {[...selectedApplicationDetail.answers]
                        .sort((a, b) => a.questionId - b.questionId)
                        .map((answer, index) => (
                          <div
                            key={answer.questionId}
                            className="border rounded-lg p-4"
                          >
                            <h5 className="font-medium mb-2 flex items-start gap-2">
                              <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm flex-shrink-0">
                                {index + 1}
                              </span>
                              <span>{answer.questionText}</span>
                            </h5>
                            <div className="ml-8 bg-muted/30 rounded p-3 mt-2">
                              {answer.fileUrl ? (
                                <a
                                  href={answer.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-2"
                                >
                                  <FileText className="h-4 w-4" />
                                  Xem file đã tải lên
                                </a>
                              ) : answer.answerText ? (
                                <p className="text-sm whitespace-pre-wrap">
                                  {answer.answerText}
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">
                                  Chưa có câu trả lời
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border rounded-lg bg-muted/30">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">
                        Không có câu trả lời nào được lưu
                      </p>
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleCloseApplicationDetail}
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
