import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getMyApplications,
  getMyApplicationDetail,
} from "@/services/recruitmentService";
import type {
  RecruitmentApplicationData,
  RecruitmentApplicationListData,
} from "@/services/recruitmentService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  FileText,
} from "lucide-react";

export function StudentRecruitment() {
  const [myApplications, setMyApplications] = useState<
    RecruitmentApplicationListData[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter states for my applications
  const [myAppSearchQuery, setMyAppSearchQuery] = useState("");
  const [myAppStatusFilter, setMyAppStatusFilter] = useState<string>("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Application detail dialog
  const [selectedApplicationDetail, setSelectedApplicationDetail] =
    useState<RecruitmentApplicationData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load my applications from API
  useEffect(() => {
    const fetchMyApplications = async () => {
      try {
        setIsLoading(true);
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

    fetchMyApplications();
  }, [myAppStatusFilter, currentPage, myAppSearchQuery]);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [myAppStatusFilter, myAppSearchQuery]);

  const handleViewApplicationDetail = async (
    application: RecruitmentApplicationListData
  ) => {
    try {
      setDetailLoading(true);
      setSelectedApplicationDetail(null); // Clear previous data
      const fullApplicationDetail = await getMyApplicationDetail(
        application.id
      );
      setSelectedApplicationDetail(fullApplicationDetail);
    } catch (error) {
      console.error("Failed to fetch application details:", error);
      alert("Không thể tải thông tin chi tiết đơn ứng tuyển");
      setSelectedApplicationDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseApplicationDetail = () => {
    setSelectedApplicationDetail(null);
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

        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Tìm kiếm theo tiêu đề, câu lạc bộ ứng tuyển"
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
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                          {(index % 4 === 0 || index % 4 === 1) && (
                            <div className="mt-3 space-y-2">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-16 w-full rounded" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-32" />
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
                        <span className="font-semibold">{totalElements}</span>{" "}
                        kết quả tìm kiếm
                      </>
                    ) : (
                      <>
                        Hiển thị{" "}
                        <span className="font-semibold">
                          {Math.min(currentPage * pageSize + 1, totalElements)}{" "}
                          -{" "}
                          {Math.min(
                            (currentPage + 1) * pageSize,
                            totalElements
                          )}
                        </span>{" "}
                        trong tổng số{" "}
                        <span className="font-semibold">{totalElements}</span>{" "}
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

              {/* Applications Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myApplications.map((application) => (
                  <Card key={application.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div>
                            <CardTitle className="text-lg">
                              Đơn ứng tuyển của {application.userName}
                            </CardTitle>
                            {application.teamName && (
                              <p className="text-sm text-muted-foreground">
                                Phòng ban: {application.teamName}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Nộp đơn:{" "}
                              {new Date(
                                application.submittedDate
                              ).toLocaleDateString("vi-VN")}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(application.status)}>
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
                            <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-purple-800">
                                Bạn đã được mời phỏng vấn
                              </h4>
                              <p className="text-sm text-purple-700 mt-1">
                                Vui lòng chuẩn bị và tham gia đúng giờ. Chúc bạn
                                may mắn!
                              </p>
                              {application.interviewTime && (
                                <div className="mt-3 space-y-2">
                                  <div>
                                    <div className="flex items-center gap-1 text-sm font-medium text-purple-800 mb-1">
                                      <Clock className="h-4 w-4" />
                                      <span>Thời gian phỏng vấn:</span>
                                    </div>
                                    <div className="text-sm text-purple-700 bg-purple-100 rounded p-2 border border-purple-200">
                                      {new Date(
                                        application.interviewTime
                                      ).toLocaleString("vi-VN", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        weekday: "long",
                                      })}
                                    </div>
                                  </div>
                                  {application.interviewAddress && (
                                    <div>
                                      <div className="flex items-center gap-1 text-sm font-medium text-purple-800 mb-1">
                                        <MessageSquare className="h-4 w-4" />
                                        <span>Địa điểm:</span>
                                      </div>
                                      <div className="text-sm text-purple-700 bg-purple-100 rounded p-2 border border-purple-200">
                                        {application.interviewAddress}
                                      </div>
                                    </div>
                                  )}
                                  {application.interviewPreparationRequirements && (
                                    <div>
                                      <div className="flex items-center gap-1 text-sm font-medium text-purple-800 mb-1">
                                        <FileText className="h-4 w-4" />
                                        <span>Yêu cầu chuẩn bị:</span>
                                      </div>
                                      <div className="text-sm text-purple-700 whitespace-pre-wrap bg-purple-100 rounded p-2 border border-purple-200">
                                        {
                                          application.interviewPreparationRequirements
                                        }
                                      </div>
                                    </div>
                                  )}
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
                                CLB sẽ phản hồi trong vòng 3-5 ngày làm việc.
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && myApplications.length > 0 && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => {
                            if (currentPage > 1) {
                              setCurrentPage(currentPage - 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {currentPage > 3 && (
                        <>
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => {
                                setCurrentPage(1);
                                window.scrollTo({ top: 0, behavior: "smooth" });
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

                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          if (pageNum < 1 || pageNum > totalPages) return null;
                          if (currentPage > 3 && pageNum === 1) return null;
                          if (
                            currentPage < totalPages - 2 &&
                            pageNum === totalPages
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
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                      )}

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
                                setCurrentPage(totalPages);
                                window.scrollTo({ top: 0, behavior: "smooth" });
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
                              setCurrentPage(currentPage + 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
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
                        <p className="text-muted-foreground">
                          Hãy khám phá và ứng tuyển vào các CLB yêu thích!
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Application Detail Dialog */}
      <Dialog
        open={detailLoading || !!selectedApplicationDetail}
        onOpenChange={(open) => !open && handleCloseApplicationDetail()}
      >
        <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chi tiết đơn ứng tuyển
              {selectedApplicationDetail?.recruitmentTitle
                ? ` - ${selectedApplicationDetail.recruitmentTitle}`
                : ""}
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
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>

              {/* Application Info Skeleton */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                </div>
              </div>

              {/* Answers Skeleton */}
              <div>
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-20 w-full mt-2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            selectedApplicationDetail && (
              <div className="space-y-6">
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
                                      : "Chờ phỏng vấn"}
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
                        {selectedApplicationDetail.teamName && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Phòng ban ứng tuyển:
                            </span>
                            <span className="font-medium text-blue-600">
                              {selectedApplicationDetail.teamName}
                            </span>
                          </div>
                        )}
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

                {selectedApplicationDetail.status === "INTERVIEW" &&
                  selectedApplicationDetail.interviewTime && (
                    <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                      <h4 className="font-medium mb-3 flex items-center gap-2 text-purple-800">
                        <Calendar className="h-4 w-4" />
                        Thông tin lịch phỏng vấn
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-1 text-sm font-medium text-purple-800 mb-1">
                            <Clock className="h-4 w-4" />
                            <span>Thời gian phỏng vấn:</span>
                          </div>
                          <div className="text-sm text-purple-700 bg-purple-100 rounded p-2 border border-purple-200">
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
                          </div>
                        </div>
                        {selectedApplicationDetail.interviewAddress && (
                          <div>
                            <div className="flex items-center gap-1 text-sm font-medium text-purple-800 mb-1">
                              <MessageSquare className="h-4 w-4" />
                              <span>Địa điểm:</span>
                            </div>
                            <div className="text-sm text-purple-700 bg-purple-100 rounded p-2 border border-purple-200">
                              {selectedApplicationDetail.interviewAddress}
                            </div>
                          </div>
                        )}
                        {selectedApplicationDetail.interviewPreparationRequirements && (
                          <div>
                            <div className="flex items-center gap-1 text-sm font-medium text-purple-800 mb-1">
                              <FileText className="h-4 w-4" />
                              <span>Yêu cầu chuẩn bị:</span>
                            </div>
                            <div className="text-sm text-purple-700 whitespace-pre-wrap bg-purple-100 rounded p-2 border border-purple-200">
                              {
                                selectedApplicationDetail.interviewPreparationRequirements
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {selectedApplicationDetail.reviewNotes &&
                  selectedApplicationDetail.status !== "INTERVIEW" && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {selectedApplicationDetail.status === "REJECTED"
                          ? "Phản hồi từ CLB"
                          : "Ghi chú từ CLB"}
                      </h4>
                      <div
                        className={`rounded p-3 text-sm whitespace-pre-wrap ${
                          selectedApplicationDetail.status === "REJECTED"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : selectedApplicationDetail.status === "ACCEPTED"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-muted/50"
                        }`}
                      >
                        {selectedApplicationDetail.reviewNotes}
                      </div>
                    </div>
                  )}

                <div>
                  <h4 className="font-medium mb-3">Câu trả lời của bạn</h4>
                  {selectedApplicationDetail.answers &&
                  selectedApplicationDetail.answers.length > 0 ? (
                    <div className="space-y-4">
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
