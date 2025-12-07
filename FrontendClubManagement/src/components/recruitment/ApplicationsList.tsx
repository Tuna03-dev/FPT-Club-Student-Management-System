"use client";

import { useState, useEffect } from "react";
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
  Edit,
  NotepadText,
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
import { toast } from "sonner";
import {
  getApplicationDetail,
  type RecruitmentApplicationData,
  type RecruitmentApplicationListData,
} from "@/services/recruitmentService";

type ApplicationStatus = "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "INTERVIEW";

interface ApplicationsListProps {
  recruitmentTitle?: string;
  applications: RecruitmentApplicationListData[];
  applicationsLoading: boolean;
  onUpdateApplicationStatus: (
    applicationId: string,
    newStatus: ApplicationStatus,
    notes?: string,
    interviewTime?: string,
    interviewAddress?: string,
    interviewPreparationRequirements?: string,
    suppressToast?: boolean
  ) => void;
  onUpdateInterview: (
    applicationId: number,
    interviewTime?: string,
    interviewAddress?: string,
    interviewPreparationRequirements?: string
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
  UNDER_REVIEW: "Đang xem xét",
  ACCEPTED: "Đã duyệt",
  REJECTED: "Từ chối",
  INTERVIEW: "Phỏng vấn",
};

const applicationStatusColors: Record<ApplicationStatus, string> = {
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  INTERVIEW: "bg-purple-100 text-purple-700",
};

export function ApplicationsList({
  recruitmentTitle,
  applications,
  applicationsLoading,
  onUpdateApplicationStatus,
  onUpdateInterview,
  currentPage = 1,
  totalPages = 1,
  totalElements = 0,
  onPageChange,
  searchQuery = "",
  onSearchChange,
  statusFilter = "all",
  onStatusFilterChange,
}: ApplicationsListProps) {
  const [selectedApplicationListItem, setSelectedApplicationListItem] =
    useState<RecruitmentApplicationListData | null>(null);
  const [selectedApplicationDetail, setSelectedApplicationDetail] =
    useState<RecruitmentApplicationData | null>(null);
  const [loadingApplicationDetail, setLoadingApplicationDetail] =
    useState(false);

  // Status change dialog state
  const [statusChangeDialog, setStatusChangeDialog] =
    useState<StatusChangeDialogData | null>(null);
  const [notes, setNotes] = useState("");

  // Interview dialog state (for editing existing interview info)
  const [interviewDialog, setInterviewDialog] = useState<{
    applicationId: number;
    applicationName: string;
    currentInterviewTime?: string;
    currentInterviewAddress?: string;
    currentInterviewPreparationRequirements?: string;
  } | null>(null);

  // Review note dialog state (for writing review after interview)
  const [reviewNoteDialog, setReviewNoteDialog] = useState<{
    applicationId: number;
    applicationName: string;
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  // Interview fields for status change
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewAddress, setInterviewAddress] = useState("");
  const [
    interviewPreparationRequirements,
    setInterviewPreparationRequirements,
  ] = useState("");

  // Fetch full application details when a list item is selected
  useEffect(() => {
    const fetchApplicationDetail = async () => {
      if (!selectedApplicationListItem) {
        setSelectedApplicationDetail(null);
        return;
      }

      setLoadingApplicationDetail(true);
      try {
        const detail = await getApplicationDetail(
          selectedApplicationListItem.id
        );
        setSelectedApplicationDetail(detail);
      } catch (error: any) {
        console.error("Error fetching application detail:", error);
        toast.error("Không thể tải chi tiết đơn ứng tuyển");
        setSelectedApplicationListItem(null);
      } finally {
        setLoadingApplicationDetail(false);
      }
    };

    fetchApplicationDetail();
  }, [selectedApplicationListItem?.id]);

  const handleStatusChange = (
    applicationId: string,
    applicationName: string,
    newStatus: ApplicationStatus,
    currentApplication?: RecruitmentApplicationListData
  ) => {
    setStatusChangeDialog({ applicationId, applicationName, newStatus });
    setNotes("");
    if (newStatus === "INTERVIEW") {
      setInterviewTime("");
      setInterviewAddress("");
      setInterviewPreparationRequirements("");
    } else if (currentApplication?.interviewTime) {
      // Keep existing interview info when reviewing from interview status
      setInterviewTime(currentApplication.interviewTime.slice(0, 16));
      setInterviewAddress(currentApplication.interviewAddress || "");
      setInterviewPreparationRequirements(
        currentApplication.interviewPreparationRequirements || ""
      );
    }
  };

  const handleConfirmStatusChange = () => {
    if (!statusChangeDialog) return;

    // Validate interview fields if status is INTERVIEW
    if (statusChangeDialog.newStatus === "INTERVIEW") {
      if (!interviewTime.trim() || !interviewAddress.trim()) {
        toast.error("Vui lòng nhập đầy đủ thời gian và địa điểm phỏng vấn");
        return;
      }
    }

    // Always send interview info if it exists (to preserve it in database)
    const hasInterviewData = interviewTime.trim() && interviewAddress.trim();

    onUpdateApplicationStatus(
      statusChangeDialog.applicationId,
      statusChangeDialog.newStatus,
      notes.trim() || undefined,
      hasInterviewData ? interviewTime : undefined,
      hasInterviewData ? interviewAddress : undefined,
      hasInterviewData
        ? interviewPreparationRequirements.trim() || undefined
        : undefined
    );

    setStatusChangeDialog(null);
    setSelectedApplicationListItem(null);
    setSelectedApplicationDetail(null);
  };

  const handleCancelStatusChange = () => {
    setStatusChangeDialog(null);
    setNotes("");
    setInterviewTime("");
    setInterviewAddress("");
    setInterviewPreparationRequirements("");
  };

  const handleOpenInterviewDialog = (
    applicationId: number,
    applicationName: string,
    currentInterviewTime?: string,
    currentInterviewAddress?: string,
    currentInterviewPreparationRequirements?: string
  ) => {
    setInterviewDialog({
      applicationId,
      applicationName,
      currentInterviewTime,
      currentInterviewAddress,
      currentInterviewPreparationRequirements,
    });

    // Format datetime for datetime-local input (YYYY-MM-DDTHH:mm)
    const formattedTime = currentInterviewTime
      ? currentInterviewTime.slice(0, 16)
      : "";

    setInterviewTime(formattedTime);
    setInterviewAddress(currentInterviewAddress || "");
    setInterviewPreparationRequirements(
      currentInterviewPreparationRequirements || ""
    );
  };

  const handleSaveInterview = () => {
    if (!interviewDialog) return;

    if (!interviewTime.trim() || !interviewAddress.trim()) {
      toast.error("Vui lòng nhập đầy đủ thời gian và địa điểm phỏng vấn");
      return;
    }

    onUpdateInterview(
      interviewDialog.applicationId,
      interviewTime,
      interviewAddress,
      interviewPreparationRequirements.trim() || undefined
    );

    setInterviewDialog(null);
    setSelectedApplicationListItem(null);
    setSelectedApplicationDetail(null);
  };

  const handleCancelInterviewDialog = () => {
    setInterviewDialog(null);
    setInterviewTime("");
    setInterviewAddress("");
    setInterviewPreparationRequirements("");
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {recruitmentTitle || "Quản lý đơn ứng tuyển"}
            </h2>
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
              placeholder="Tìm kiếm theo tên, email của ứng viên"
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
              <SelectItem value="UNDER_REVIEW">Đang xem xét</SelectItem>
              <SelectItem value="INTERVIEW">Phỏng vấn</SelectItem>
              <SelectItem value="ACCEPTED">Đã duyệt</SelectItem>
              <SelectItem value="REJECTED">Từ chối</SelectItem>
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
                key={application.id}
                onClick={() => setSelectedApplicationListItem(application)}
                className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={application.avatar || "/placeholder.svg"}
                        />
                        <AvatarFallback>
                          {application.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{application.userName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {application.studentId}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <Badge
                        className={
                          applicationStatusColors[
                            application.status as ApplicationStatus
                          ]
                        }
                      >
                        {
                          applicationStatusLabels[
                            application.status as ApplicationStatus
                          ]
                        }
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(application.submittedDate).toLocaleString(
                          "vi-VN",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>

                    <div className="text-sm">
                      <div className="text-muted-foreground">Email:</div>
                      <div className="truncate">{application.userEmail}</div>
                    </div>

                    {application.userPhone && (
                      <div className="text-sm">
                        <div className="text-muted-foreground">SĐT:</div>
                        <div>{application.userPhone}</div>
                      </div>
                    )}

                    {application.status === "INTERVIEW" &&
                      application.interviewTime && (
                        <div className="text-sm border-l-2 border-purple-400 pl-3 py-2 bg-purple-50 rounded">
                          <div className="text-muted-foreground font-medium flex items-center gap-1 mb-1">
                            <Calendar className="h-3 w-3" />
                            Lịch phỏng vấn:
                          </div>
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="font-medium">Thời gian:</span>{" "}
                              {new Date(
                                application.interviewTime
                              ).toLocaleString("vi-VN", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            {application.interviewAddress && (
                              <div>
                                <span className="font-medium">Địa điểm:</span>{" "}
                                {application.interviewAddress}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {application.reviewNotes && (
                      <div
                        className={`text-sm border-l-2 pl-3 py-2 ${
                          application.status === "REJECTED"
                            ? "border-red-400"
                            : application.status === "ACCEPTED"
                              ? "border-green-400"
                              : "border-blue-400"
                        }`}
                      >
                        <div className="text-muted-foreground font-medium flex items-center gap-1 mb-1">
                          <MessageSquare className="h-3 w-3" />
                          Đánh giá:
                        </div>
                        <div
                          className={`text-xs rounded p-2 line-clamp-2 ${
                            application.status === "REJECTED"
                              ? "bg-red-50 text-red-700"
                              : application.status === "ACCEPTED"
                                ? "bg-green-50 text-green-700"
                                : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {application.reviewNotes}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedApplicationListItem(application);
                      }}
                      className="bg-transparent"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Xem chi tiết
                    </Button>
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
                  {Math.min((currentPage - 1) * 10 + 1, totalElements)} -{" "}
                  {Math.min(currentPage * 10, totalElements)}
                </span>{" "}
                trong tổng số{" "}
                <span className="font-semibold">{totalElements}</span> đơn ứng
                tuyển
              </div>
              <div>
                Trang {currentPage} / {totalPages}
              </div>
            </div>

            {/* Pagination controls */}
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        if (currentPage > 1) {
                          onPageChange(currentPage - 1);
                          window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }
                      }}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {/* First page */}
                  {currentPage > 3 && (
                    <>
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => {
                            onPageChange(1);
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
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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

                    if (pageNum < 0 || pageNum >= totalPages) return null;
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
                            onPageChange(pageNum);
                            window.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                          }}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {/* Last page */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => {
                            onPageChange(totalPages);
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
                        if (currentPage < totalPages) {
                          onPageChange(currentPage + 1);
                          window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }
                      }}
                      className={
                        currentPage === totalPages
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
      {selectedApplicationListItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  Chi tiết đơn ứng tuyển -{" "}
                  {selectedApplicationListItem.userName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedApplicationListItem(null);
                    setSelectedApplicationDetail(null);
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingApplicationDetail ? (
                <div className="space-y-6">
                  {/* Basic Info Skeleton */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Skeleton className="h-5 w-32 mb-3" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                    <div>
                      <Skeleton className="h-5 w-24 mb-3" />
                      <Skeleton className="h-8 w-32" />
                    </div>
                  </div>

                  {/* Answers Skeleton */}
                  <div className="border-t pt-4">
                    <Skeleton className="h-5 w-28 mb-3" />
                    <div className="space-y-4">
                      {[...Array(3)].map((_, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : selectedApplicationDetail ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Thông tin ứng viên</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Họ tên:</strong>{" "}
                          {selectedApplicationDetail.userName}
                        </div>
                        <div>
                          <strong>MSSV:</strong>{" "}
                          {selectedApplicationDetail.studentId}
                        </div>
                        <div>
                          <strong>Email:</strong>{" "}
                          {selectedApplicationDetail.userEmail}
                        </div>
                        {selectedApplicationDetail.userPhone && (
                          <div>
                            <strong>SĐT:</strong>{" "}
                            {selectedApplicationDetail.userPhone}
                          </div>
                        )}
                        {selectedApplicationDetail.teamName && (
                          <div>
                            <strong>Phòng ban ứng tuyển:</strong>{" "}
                            <span className="font-medium text-blue-600">
                              {selectedApplicationDetail.teamName}
                            </span>
                          </div>
                        )}
                        <div>
                          <strong>Nộp đơn:</strong>{" "}
                          {new Date(
                            selectedApplicationDetail.submittedDate
                          ).toLocaleString("vi-VN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Trạng thái</h4>
                      <div className="space-y-3">
                        <Badge
                          className={
                            applicationStatusColors[
                              selectedApplicationDetail.status as ApplicationStatus
                            ]
                          }
                        >
                          {
                            applicationStatusLabels[
                              selectedApplicationDetail.status as ApplicationStatus
                            ]
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Interview Info Section - show if interview data exists */}
                  {selectedApplicationDetail.interviewTime && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        Thông tin lịch phỏng vấn
                      </h4>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                        <div>
                          <strong className="text-sm">Thời gian:</strong>
                          <p className="text-sm mt-1">
                            {new Date(
                              selectedApplicationDetail.interviewTime
                            ).toLocaleString("vi-VN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              weekday: "long",
                            })}
                          </p>
                        </div>
                        {selectedApplicationDetail.interviewAddress && (
                          <div>
                            <strong className="text-sm">Địa điểm:</strong>
                            <p className="text-sm mt-1">
                              {selectedApplicationDetail.interviewAddress}
                            </p>
                          </div>
                        )}
                        {selectedApplicationDetail.interviewPreparationRequirements && (
                          <div>
                            <strong className="text-sm">
                              Yêu cầu chuẩn bị:
                            </strong>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {
                                selectedApplicationDetail.interviewPreparationRequirements
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes Section */}
                  {selectedApplicationDetail.reviewNotes && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Ghi chú đánh giá
                      </h4>
                      <div
                        className={`rounded-lg p-4 ${
                          selectedApplicationDetail.status === "REJECTED"
                            ? "bg-red-50 border border-red-200"
                            : selectedApplicationDetail.status === "ACCEPTED"
                              ? "bg-green-50 border border-green-200"
                              : "bg-blue-50 border border-blue-200"
                        }`}
                      >
                        <p
                          className={`text-sm whitespace-pre-wrap ${
                            selectedApplicationDetail.status === "REJECTED"
                              ? "text-red-700"
                              : selectedApplicationDetail.status === "ACCEPTED"
                                ? "text-green-700"
                                : "text-gray-700"
                          }`}
                        >
                          {selectedApplicationDetail.reviewNotes}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Answers */}
                  <div>
                    <h4 className="font-medium mb-3">Câu trả lời</h4>
                    <div className="space-y-4">
                      {selectedApplicationDetail.answers
                        ?.sort((a, b) => a.questionId - b.questionId)
                        .map((answer) => (
                          <div
                            key={answer.questionId}
                            className="border rounded-lg p-4"
                          >
                            <h5 className="font-medium mb-2">
                              {answer.questionText}
                            </h5>
                            <div className="bg-muted/30 rounded p-3">
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
                              ) : (
                                answer.answerText || "Chưa trả lời"
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    {selectedApplicationDetail.status === "UNDER_REVIEW" && (
                      <>
                        <Button
                          onClick={() =>
                            handleStatusChange(
                              selectedApplicationDetail.id.toString(),
                              selectedApplicationDetail.userName,
                              "INTERVIEW"
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
                              selectedApplicationDetail.id.toString(),
                              selectedApplicationDetail.userName,
                              "REJECTED"
                            )
                          }
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Từ chối
                        </Button>
                      </>
                    )}
                    {selectedApplicationDetail.status === "INTERVIEW" && (
                      <>
                        {/* Only show accept/reject buttons if interview time has passed */}
                        {selectedApplicationDetail.interviewTime &&
                          new Date(selectedApplicationDetail.interviewTime) <=
                            new Date() && (
                            <>
                              <Button
                                variant="outline"
                                className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                                onClick={() => {
                                  setReviewNoteDialog({
                                    applicationId: selectedApplicationDetail.id,
                                    applicationName:
                                      selectedApplicationDetail.userName,
                                  });
                                  setReviewNote(
                                    selectedApplicationDetail.reviewNotes || ""
                                  );
                                }}
                              >
                                <NotepadText className="h-4 w-4 mr-2" />
                                Ghi chú đánh giá
                              </Button>
                              <Button
                                onClick={() =>
                                  handleStatusChange(
                                    selectedApplicationDetail.id.toString(),
                                    selectedApplicationDetail.userName,
                                    "ACCEPTED",
                                    selectedApplicationListItem
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
                                    selectedApplicationDetail.id.toString(),
                                    selectedApplicationDetail.userName,
                                    "REJECTED",
                                    selectedApplicationListItem
                                  )
                                }
                                variant="destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Từ chối
                              </Button>
                            </>
                          )}
                      </>
                    )}
                    {/* Show edit interview button only for interview status and before interview time */}
                    {selectedApplicationDetail.status === "INTERVIEW" &&
                      selectedApplicationDetail.interviewTime &&
                      new Date(selectedApplicationDetail.interviewTime) >
                        new Date() && (
                        <>
                          <Button
                            variant="outline"
                            className="bg-transparent"
                            onClick={() =>
                              handleOpenInterviewDialog(
                                selectedApplicationDetail.id,
                                selectedApplicationDetail.userName,
                                selectedApplicationDetail.interviewTime,
                                selectedApplicationDetail.interviewAddress,
                                selectedApplicationDetail.interviewPreparationRequirements
                              )
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Chỉnh sửa lịch PV
                          </Button>
                          <span className="text-sm font-bold self-center text-orange-500 mr-2">
                            Có thể thực hiện đánh giá khi đến thời gian phỏng
                            vấn
                          </span>
                        </>
                      )}
                    <Button
                      variant="outline"
                      className="ml-auto"
                      onClick={() => {
                        setSelectedApplicationListItem(null);
                        setSelectedApplicationDetail(null);
                      }}
                    >
                      Đóng
                    </Button>
                  </div>
                </div>
              ) : null}
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
              {statusChangeDialog?.newStatus === "INTERVIEW" && "Mời phỏng vấn"}
              {statusChangeDialog?.newStatus === "ACCEPTED" && "Chấp nhận đơn"}
              {statusChangeDialog?.newStatus === "REJECTED" && "Từ chối đơn"}
            </DialogTitle>
            <DialogDescription>
              Xác nhận thay đổi trạng thái đơn của{" "}
              <strong>{statusChangeDialog?.applicationName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {statusChangeDialog?.newStatus === "INTERVIEW" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="interviewTime">
                    Ngày giờ phỏng vấn <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="interviewTime"
                    type="datetime-local"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interviewAddress">
                    Địa điểm <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="interviewAddress"
                    placeholder="Nhập địa điểm phỏng vấn"
                    value={interviewAddress}
                    onChange={(e) => setInterviewAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interviewPreparationRequirements">
                    Yêu cầu chuẩn bị (nếu có)
                  </Label>
                  <Textarea
                    id="interviewPreparationRequirements"
                    placeholder="Ví dụ: chuẩn bị CV, bài test..."
                    value={interviewPreparationRequirements}
                    onChange={(e) =>
                      setInterviewPreparationRequirements(e.target.value)
                    }
                    rows={3}
                  />
                </div>
                {/* Hiển thị lỗi nếu thiếu bắt buộc */}
                {(!interviewTime.trim() ||
                  !interviewAddress.trim() ||
                  (interviewTime.trim() &&
                    new Date(interviewTime) <= new Date())) && (
                  <p className="text-sm text-red-500">
                    {!interviewTime.trim() || !interviewAddress.trim()
                      ? "Vui lòng nhập đủ ngày giờ và địa điểm phỏng vấn"
                      : "Thời gian phỏng vấn phải lớn hơn thời gian hiện tại"}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="notes">Đánh giá (tùy chọn)</Label>
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
                !!(
                  statusChangeDialog?.newStatus === "INTERVIEW" &&
                  (!interviewTime.trim() ||
                    !interviewAddress.trim() ||
                    (interviewTime.trim() &&
                      new Date(interviewTime) <= new Date()))
                )
              }
              className={
                statusChangeDialog?.newStatus === "INTERVIEW"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : statusChangeDialog?.newStatus === "ACCEPTED"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
              }
            >
              {statusChangeDialog?.newStatus === "INTERVIEW" &&
                "Xác nhận mời phỏng vấn"}
              {statusChangeDialog?.newStatus === "ACCEPTED" &&
                "Xác nhận chấp nhận"}
              {statusChangeDialog?.newStatus === "REJECTED" &&
                "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Edit Dialog */}
      <Dialog
        open={!!interviewDialog}
        onOpenChange={(open) => !open && handleCancelInterviewDialog()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Chỉnh sửa thông tin phỏng vấn
            </DialogTitle>
            <DialogDescription>
              Cập nhật lịch phỏng vấn cho{" "}
              <strong>{interviewDialog?.applicationName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editInterviewTime">
                Ngày giờ phỏng vấn <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editInterviewTime"
                type="datetime-local"
                value={interviewTime}
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  const now = new Date();
                  if (selectedDate > now) {
                    setInterviewTime(e.target.value);
                  } else {
                    toast.error("Không thể chọn thời gian trong quá khứ");
                  }
                }}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editInterviewAddress">
                Địa điểm <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editInterviewAddress"
                placeholder="Nhập địa điểm phỏng vấn"
                value={interviewAddress}
                onChange={(e) => setInterviewAddress(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editInterviewPreparationRequirements">
                Yêu cầu chuẩn bị (nếu có)
              </Label>
              <Textarea
                id="editInterviewPreparationRequirements"
                placeholder="Ví dụ: chuẩn bị CV, bài test..."
                value={interviewPreparationRequirements}
                onChange={(e) =>
                  setInterviewPreparationRequirements(e.target.value)
                }
                rows={3}
              />
            </div>
            {(!interviewTime.trim() ||
              !interviewAddress.trim() ||
              (interviewTime.trim() &&
                new Date(interviewTime) <= new Date())) && (
              <p className="text-sm text-red-500">
                {!interviewTime.trim() || !interviewAddress.trim()
                  ? "Vui lòng nhập đủ ngày giờ và địa điểm phỏng vấn"
                  : "Thời gian phỏng vấn phải lớn hơn thời gian hiện tại"}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelInterviewDialog}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveInterview}
              disabled={
                !interviewTime.trim() ||
                !interviewAddress.trim() ||
                (interviewTime.trim() !== "" &&
                  new Date(interviewTime) <= new Date())
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Note Dialog - for writing review after interview */}
      <Dialog
        open={!!reviewNoteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setReviewNoteDialog(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <NotepadText className="h-5 w-5" />
              Ghi chú đánh giá phỏng vấn
            </DialogTitle>
            <DialogDescription>
              Viết ghi chú đánh giá cho ứng viên{" "}
              <strong>{reviewNoteDialog?.applicationName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reviewNote">Nội dung đánh giá</Label>
              <Textarea
                id="reviewNote"
                placeholder="Nhập ghi chú đánh giá về ứng viên sau buổi phỏng vấn..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Ghi chú này sẽ được lưu lại để bạn tham khảo khi quyết định chấp
                nhận hoặc từ chối ứng viên.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewNoteDialog(null);
                setReviewNote("");
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (!reviewNoteDialog) return;

                // Save review note by updating the application
                // We'll use the existing update interview function to preserve interview data and add notes
                const currentApp = applications.find(
                  (app) => app.id === reviewNoteDialog.applicationId
                );

                if (currentApp) {
                  // Call the review API to save review notes while keeping status INTERVIEW
                  onUpdateApplicationStatus(
                    reviewNoteDialog.applicationId.toString(),
                    "INTERVIEW",
                    reviewNote.trim(),
                    currentApp.interviewTime,
                    currentApp.interviewAddress,
                    currentApp.interviewPreparationRequirements,
                    true // suppress parent's status toast because we show a specific note-saved toast
                  );
                }

                toast.success("Đã lưu ghi chú đánh giá");
                setReviewNoteDialog(null);
                setReviewNote("");
                setSelectedApplicationListItem(null);
                setSelectedApplicationDetail(null);
              }}
              disabled={!reviewNote.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Lưu ghi chú
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
