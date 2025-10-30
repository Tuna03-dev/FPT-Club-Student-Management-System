"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Calendar,
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

type ApplicationStatus = "under_review" | "accepted" | "rejected" | "interview";
type QuestionType = "TEXT" | "MCQ" | "CHECKBOX" | "FILE";

interface RecruitmentForm {
  form_id?: string;
  question_text: string;
  question_type: QuestionType;
  question_order: number;
  options?: string[];
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
  title: string;
  form_questions: RecruitmentForm[];
  applications: RecruitmentApplication[];
}

interface ApplicationsListProps {
  selectedRecruitment: Recruitment;
  applications: RecruitmentApplication[];
  applicationsLoading: boolean;
  onUpdateApplicationStatus: (
    applicationId: string,
    newStatus: ApplicationStatus,
    notes?: string
  ) => void;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  totalElements?: number;
  onPageChange?: (page: number) => void;
  // Search and filter props
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  statusFilter?: ApplicationStatus | "all";
  onStatusFilterChange?: (status: ApplicationStatus | "all") => void;
}

interface StatusChangeDialogData {
  applicationId: string;
  applicationName: string;
  newStatus: ApplicationStatus;
}

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  under_review: "Đang xem xét",
  accepted: "Đã duyệt",
  rejected: "Từ chối",
  interview: "Phỏng vấn",
};

const applicationStatusColors: Record<ApplicationStatus, string> = {
  under_review: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  interview: "bg-purple-100 text-purple-700",
};

export function ApplicationsList({
  selectedRecruitment,
  applications,
  applicationsLoading,
  onUpdateApplicationStatus,
  currentPage = 0,
  totalPages = 1,
  totalElements = 0,
  onPageChange,
  searchQuery = "",
  onSearchChange,
  statusFilter = "all",
  onStatusFilterChange,
}: ApplicationsListProps) {
  const [selectedApplication, setSelectedApplication] =
    useState<RecruitmentApplication | null>(null);

  // Status change dialog state
  const [statusChangeDialog, setStatusChangeDialog] =
    useState<StatusChangeDialogData | null>(null);
  const [notes, setNotes] = useState("");

  // Notes-only dialog state
  const [notesDialog, setNotesDialog] = useState<{
    applicationId: string;
    applicationName: string;
    currentStatus: ApplicationStatus;
    currentNotes?: string;
  } | null>(null);

  // TRƯỚC: gọi onUpdateApplicationStatus(..., notes.trim() || undefined)
  // SAU (với trường phỏng vấn): gộp trường thành notesText
  const [interviewDatetime, setInterviewDatetime] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewNote, setInterviewNote] = useState("");

  const handleStatusChange = (
    applicationId: string,
    applicationName: string,
    newStatus: ApplicationStatus
  ) => {
    setStatusChangeDialog({ applicationId, applicationName, newStatus });
    setNotes("");
    if (newStatus === "interview") {
      setInterviewDatetime("");
      setInterviewLocation("");
      setInterviewLink("");
      setInterviewNote("");
    }
  };

  const handleConfirmStatusChange = () => {
    if (!statusChangeDialog) return;

    // Kiểm tra riêng cho mode phỏng vấn
    if (statusChangeDialog.newStatus === "interview") {
      if (!interviewDatetime.trim() || !interviewLocation.trim()) {
        return; // Không gửi nếu thiếu
      }
    }

    const notesText =
      statusChangeDialog?.newStatus === "interview"
        ? (
            (interviewDatetime ? `Ngày giờ: ${interviewDatetime}\n` : "") +
            (interviewLocation ? `Địa điểm: ${interviewLocation}\n` : "") +
            (interviewLink ? `Link: ${interviewLink}\n` : "") +
            (interviewNote ? `Yêu cầu chuẩn bị: ${interviewNote}` : "")
          ).trim()
        : notes.trim() || undefined;

    onUpdateApplicationStatus(
      statusChangeDialog.applicationId,
      statusChangeDialog.newStatus,
      notesText
    );

    setStatusChangeDialog(null);
    setSelectedApplication(null);
  };

  const handleCancelStatusChange = () => {
    setStatusChangeDialog(null);
    setNotes("");
    setInterviewDatetime("");
    setInterviewLocation("");
    setInterviewLink("");
    setInterviewNote("");
  };

  const handleOpenNotesDialog = (
    applicationId: string,
    applicationName: string,
    currentStatus: ApplicationStatus,
    currentNotes?: string
  ) => {
    setNotesDialog({
      applicationId,
      applicationName,
      currentStatus,
      currentNotes,
    });
    setNotes(currentNotes || "");
  };

  const handleSaveNotes = () => {
    if (!notesDialog) return;

    onUpdateApplicationStatus(
      notesDialog.applicationId,
      notesDialog.currentStatus,
      notes.trim() || undefined
    );

    setNotesDialog(null);
    setSelectedApplication(null);
  };

  const handleCancelNotesDialog = () => {
    setNotesDialog(null);
    setNotes("");
  };


  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{selectedRecruitment.title}</h2>
            <p className="text-muted-foreground">
              {totalElements} đơn ứng tuyển
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Tìm kiếm ứng viên..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              onStatusFilterChange?.(value as ApplicationStatus | "all")
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="under_review">Đang xem xét</SelectItem>
              <SelectItem value="interview">Phỏng vấn</SelectItem>
              <SelectItem value="accepted">Đã duyệt</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Applications Loading State */}
        {applicationsLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar skeleton */}
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        {/* User name */}
                        <Skeleton className="h-4 w-28" />
                        {/* Student ID */}
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Badge and date */}
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>

                    {/* Email section */}
                    <div className="text-sm space-y-1">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-4 w-44" />
                    </div>

                    {/* Phone section */}
                    <div className="text-sm space-y-1">
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-4 w-28" />
                    </div>

                    {/* Notes section (sometimes) */}
                    {index % 2 === 0 && (
                      <div className="border-l-2 border-blue-400 pl-3 py-2 space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-full rounded" />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-9 w-16" />
                      <Skeleton className="h-9 w-28" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Applications List */}
        {!applicationsLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {applications.map((application) => (
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
                        <h4 className="font-medium">{application.user_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {application.student_id}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        className={applicationStatusColors[application.status]}
                      >
                        {applicationStatusLabels[application.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(application.submitted_at).toLocaleDateString(
                          "vi-VN"
                        )}
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
                      <div className="text-sm border-l-2 border-blue-400 pl-3 py-2">
                        <div className="text-muted-foreground font-medium flex items-center gap-1 mb-1">
                          <MessageSquare className="h-3 w-3" />
                          {application.status === "interview"
                            ? "Thông tin PV:"
                            : "Ghi chú:"}
                        </div>
                        <div className="text-xs bg-blue-50 rounded p-2 line-clamp-2">
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
                      {application.status === "under_review" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(
                                application.application_id,
                                application.user_name,
                                "interview"
                              )
                            }
                            className="bg-transparent text-purple-600 border-purple-200 "
                            title="Mời phỏng vấn"
                          >
                            <Calendar className="h-4 w-4" /> Phỏng vấn
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(
                                application.application_id,
                                application.user_name,
                                "rejected"
                              )
                            }
                            className="bg-transparent text-red-600 border-red-200 "
                            title="Từ chối"
                          >
                            <XCircle className="h-4 w-4" /> Từ chối
                          </Button>
                        </>
                      )}
                      {application.status === "interview" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(
                                application.application_id,
                                application.user_name,
                                "accepted"
                              )
                            }
                            className="bg-transparent text-green-600 border-green-200 hover:bg-green-50"
                            title="Chấp nhận"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(
                                application.application_id,
                                application.user_name,
                                "rejected"
                              )
                            }
                            className="bg-transparent text-red-600 border-red-200 hover:bg-red-50"
                            title="Từ chối"
                          >
                            <XCircle className="h-4 w-4" /> Từ chối
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

        {!applicationsLoading && applications.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Không tìm thấy đơn ứng tuyển nào
            </p>
          </div>
        )}

        {/* Pagination for Applications */}
        {!applicationsLoading && onPageChange && totalPages > 1 && (
          <div className="space-y-4">
            {/* Results info */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Hiển thị{" "}
                <span className="font-semibold">
                  {Math.min(
                    currentPage * 10 + 1,
                    totalElements
                  )}{" "}
                  -{" "}
                  {Math.min(
                    (currentPage + 1) * 10,
                    totalElements
                  )}
                </span>{" "}
                trong tổng số{" "}
                <span className="font-semibold">
                  {totalElements}
                </span>{" "}
                đơn ứng tuyển
              </div>
              <div>
                Trang {currentPage + 1} / {totalPages}
              </div>
            </div>

            {/* Pagination controls */}
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        if (currentPage > 0) {
                          onPageChange(currentPage - 1);
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
                            onPageChange(0);
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
                      if (currentPage > 2 && pageNum === 0)
                        return null;
                      if (
                        currentPage < totalPages - 3 &&
                        pageNum === totalPages - 1
                      )
                        return null;

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => {
                              onPageChange(pageNum);
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
                            onPageChange(totalPages - 1);
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
                          onPageChange(currentPage + 1);
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
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                {selectedApplication.notes && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {selectedApplication.status === "interview"
                        ? "Thông tin phỏng vấn"
                        : "Ghi chú đánh giá"}
                    </h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedApplication.notes}
                      </p>
                    </div>
                  </div>
                )}

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
                  {selectedApplication.status === "under_review" && (
                    <>
                      <Button
                        onClick={() =>
                          handleStatusChange(
                            selectedApplication.application_id,
                            selectedApplication.user_name,
                            "interview"
                          )
                        }
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Mời phỏng vấn
                      </Button>
                      <Button
                        onClick={() =>
                          handleStatusChange(
                            selectedApplication.application_id,
                            selectedApplication.user_name,
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
                  {selectedApplication.status === "interview" && (
                    <>
                      <Button
                        onClick={() =>
                          handleStatusChange(
                            selectedApplication.application_id,
                            selectedApplication.user_name,
                            "accepted"
                          )
                        }
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Chấp nhận
                      </Button>
                      <Button
                        onClick={() =>
                          handleStatusChange(
                            selectedApplication.application_id,
                            selectedApplication.user_name,
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
                  <Button
                    variant="outline"
                    className="bg-transparent"
                    onClick={() =>
                      handleOpenNotesDialog(
                        selectedApplication.application_id,
                        selectedApplication.user_name,
                        selectedApplication.status,
                        selectedApplication.notes
                      )
                    }
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {selectedApplication.notes
                      ? "Chỉnh sửa ghi chú"
                      : "Thêm ghi chú"}
                  </Button>
                  <Button
                    variant="outline"
                    className="ml-auto"
                    onClick={() => setSelectedApplication(null)}
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Change Confirmation Dialog */}
      <Dialog
        open={!!statusChangeDialog}
        onOpenChange={(open) => !open && handleCancelStatusChange()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusChangeDialog?.newStatus === "interview" && "Mời phỏng vấn"}
              {statusChangeDialog?.newStatus === "accepted" && "Chấp nhận đơn"}
              {statusChangeDialog?.newStatus === "rejected" && "Từ chối đơn"}
            </DialogTitle>
            <DialogDescription>
              Xác nhận thay đổi trạng thái đơn của{" "}
              <strong>{statusChangeDialog?.applicationName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {statusChangeDialog?.newStatus === "interview" ? (
              <div className="space-y-2">
                <div>
                  <Label htmlFor="interviewDatetime">Ngày giờ phỏng vấn <span className="text-red-500">*</span></Label>
                  <Input
                    id="interviewDatetime"
                    type="datetime-local"
                    value={interviewDatetime}
                    onChange={(e) => setInterviewDatetime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="interviewLocation">Địa điểm <span className="text-red-500">*</span></Label>
                  <Input
                    id="interviewLocation"
                    placeholder="Nhập địa điểm (offline/online)"
                    value={interviewLocation}
                    onChange={(e) => setInterviewLocation(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="interviewLink">Link meeting (nếu có)</Label>
                  <Input
                    id="interviewLink"
                    placeholder="Ví dụ: https://meet.google.com/..."
                    value={interviewLink}
                    onChange={(e) => setInterviewLink(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="interviewNote">Yêu cầu chuẩn bị (nếu có)</Label>
                  <Textarea
                    id="interviewNote"
                    placeholder="Ví dụ: chuẩn bị CV, bài test..."
                    value={interviewNote}
                    onChange={(e) => setInterviewNote(e.target.value)}
                    rows={3}
                  />
                </div>
                {/* Hiển thị lỗi nếu thiếu bắt buộc */}
                {(!interviewDatetime.trim() || !interviewLocation.trim()) && (
                  <p className="text-sm text-red-500">Vui lòng nhập đủ ngày giờ và địa điểm phỏng vấn</p>
                )}
              </div>
            ) : (
              <div className='space-y-2'>
                <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelStatusChange}>
              Hủy
            </Button>
            <Button
              onClick={handleConfirmStatusChange}
              disabled={
                statusChangeDialog?.newStatus === "interview" &&
                (!interviewDatetime.trim() || !interviewLocation.trim())
              }
              className={
                statusChangeDialog?.newStatus === "interview"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : statusChangeDialog?.newStatus === "accepted"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {statusChangeDialog?.newStatus === "interview" &&
                "Xác nhận mời phỏng vấn"}
              {statusChangeDialog?.newStatus === "accepted" &&
                "Xác nhận chấp nhận"}
              {statusChangeDialog?.newStatus === "rejected" &&
                "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes-Only Dialog */}
      <Dialog
        open={!!notesDialog}
        onOpenChange={(open) => !open && handleCancelNotesDialog()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {notesDialog?.currentNotes ? "Chỉnh sửa ghi chú" : "Thêm ghi chú"}
            </DialogTitle>
            <DialogDescription>
              {notesDialog?.currentStatus === "interview"
                ? "Cập nhật thông tin phỏng vấn cho "
                : "Thêm ghi chú đánh giá cho "}
              <strong>{notesDialog?.applicationName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes-edit" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {notesDialog?.currentStatus === "interview"
                  ? "Thông tin về cuộc phỏng vấn"
                  : "Ghi chú"}
              </Label>
              <Textarea
                id="notes-edit"
                placeholder={
                  notesDialog?.currentStatus === "interview"
                    ? "Nhập thông tin về cuộc phỏng vấn (ngày giờ, địa điểm, link meeting, yêu cầu chuẩn bị...)..."
                    : notesDialog?.currentStatus === "accepted"
                    ? "Ghi chú về việc chấp nhận đơn..."
                    : notesDialog?.currentStatus === "rejected"
                    ? "Lý do từ chối hoặc ghi chú..."
                    : "Ghi chú đánh giá..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                {notes.trim()
                  ? `${notes.trim().length} ký tự`
                  : "Để trống để xóa ghi chú"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNotesDialog}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveNotes}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {notesDialog?.currentNotes ? "Cập nhật" : "Lưu ghi chú"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
