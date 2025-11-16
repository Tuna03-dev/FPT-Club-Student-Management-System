import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Shield,
  Users,
  XCircle,
  Mail,
  Phone,
  Circle,
} from "lucide-react";
import { toast } from "sonner";

interface ClubCreationRequest {
  id: string;
  clubName: string;
  clubCode: string;
  description: string;
  category: string;
  targetMembers: string;
  email: string;
  phone: string;
  requestedBy: string;
  requestedAt: string;
  status:
    | "pending_review"
    | "under_review"
    | "pending_documents"
    | "documents_submitted"
    | "defense_scheduled"
    | "defense_completed"
    | "approved"
    | "rejected";
  currentStep: number;
  totalSteps: number;
  proposalFile?: string;
  defenseDate?: string;
  defenseTime?: string;
  defenseLocation?: string;
  defenseNote?: string;
  rejectionReason?: string;
}

interface WorkflowStep {
  id: number;
  label: string;
  description: string;
  icon: React.ElementType;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 1,
    label: "Nộp đơn",
    description: "Gửi đơn đăng ký thành lập CLB",
    icon: FileText,
  },
  {
    id: 2,
    label: "Xét duyệt đơn",
    description: "Ban quản lý xem xét đơn đăng ký",
    icon: Clock,
  },
  {
    id: 3,
    label: "Bổ sung hồ sơ",
    description: "Nộp các giấy tờ bổ sung nếu cần",
    icon: FileText,
  },
  {
    id: 4,
    label: "Phỏng vấn",
    description: "Tham gia phỏng vấn với ban quản lý",
    icon: Users,
  },
  {
    id: 5,
    label: "Chuẩn bị bảo vệ",
    description: "Chuẩn bị kế hoạch hoạt động và slide",
    icon: FileText,
  },
  {
    id: 6,
    label: "Lên lịch bảo vệ",
    description: "Xác nhận lịch bảo vệ đề án",
    icon: Calendar,
  },
  {
    id: 7,
    label: "Bảo vệ đề án",
    description: "Trình bày kế hoạch trước hội đồng",
    icon: Users,
  },
  {
    id: 8,
    label: "Hoàn tất",
    description: "Nhận quyết định phê duyệt",
    icon: CheckCircle2,
  },
];

const STATUS_CONFIG = {
  pending_review: {
    label: "Chờ xét duyệt",
    color: "bg-blue-100 text-blue-800",
  },
  under_review: {
    label: "Đang xét duyệt",
    color: "bg-yellow-100 text-yellow-800",
  },
  pending_documents: {
    label: "Chờ bổ sung hồ sơ",
    color: "bg-orange-100 text-orange-800",
  },
  documents_submitted: {
    label: "Đã nộp hồ sơ",
    color: "bg-blue-100 text-blue-800",
  },
  defense_scheduled: {
    label: "Đã lên lịch bảo vệ",
    color: "bg-purple-100 text-purple-800",
  },
  defense_completed: {
    label: "Đã bảo vệ",
    color: "bg-indigo-100 text-indigo-800",
  },
  approved: {
    label: "Đã phê duyệt",
    color: "bg-green-100 text-green-800",
  },
  rejected: {
    label: "Từ chối",
    color: "bg-red-100 text-red-800",
  },
};

// Mock data
const MOCK_REQUESTS: ClubCreationRequest[] = [
  {
    id: "1",
    clubName: "CLB Trí tuệ nhân tạo",
    clubCode: "FPTU_AI",
    description: "Câu lạc bộ nghiên cứu và phát triển các ứng dụng AI",
    category: "Công nghệ",
    targetMembers: "Sinh viên yêu thích AI và Machine Learning",
    email: "ai.club@fpt.edu.vn",
    phone: "0123456789",
    requestedBy: "Nguyễn Văn A",
    requestedAt: "2024-11-01",
    status: "pending_review",
    currentStep: 1,
    totalSteps: 8,
  },
  {
    id: "2",
    clubName: "CLB Blockchain",
    clubCode: "FPTU_BLOCKCHAIN",
    description: "Nghiên cứu công nghệ blockchain và cryptocurrency",
    category: "Công nghệ",
    targetMembers: "Sinh viên quan tâm đến công nghệ blockchain",
    email: "blockchain@fpt.edu.vn",
    phone: "0987654321",
    requestedBy: "Trần Thị B",
    requestedAt: "2024-11-05",
    status: "documents_submitted",
    currentStep: 4,
    totalSteps: 8,
    proposalFile: "blockchain-club-proposal.pdf",
  },
  {
    id: "3",
    clubName: "CLB Game Development",
    clubCode: "FPTU_GAMEDEV",
    description: "Phát triển game và ứng dụng giải trí",
    category: "Công nghệ",
    targetMembers: "Sinh viên đam mê phát triển game",
    email: "gamedev@fpt.edu.vn",
    phone: "0369258147",
    requestedBy: "Lê Văn C",
    requestedAt: "2024-10-28",
    status: "defense_scheduled",
    currentStep: 6,
    totalSteps: 8,
    proposalFile: "game-dev-proposal.pdf",
    defenseDate: "2024-11-25",
    defenseTime: "09:45",
    defenseLocation: "A301",
    defenseNote: "Cần chuẩn bị demo game prototype",
  },
];

export default function ClubCreationManagement() {
  const [activeTab, setActiveTab] = useState("pending");
  const [clubRequests, setClubRequests] =
    useState<ClubCreationRequest[]>(MOCK_REQUESTS);
  const [selectedRequest, setSelectedRequest] =
    useState<ClubCreationRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">(
    "approve"
  );

  // Handle view details
  const handleViewDetails = (request: ClubCreationRequest) => {
    setSelectedRequest(request);
    setIsDetailDialogOpen(true);
  };

  // Handle review action
  const handleReviewClick = (
    request: ClubCreationRequest,
    action: "approve" | "reject"
  ) => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewNote("");
    setIsReviewDialogOpen(true);
  };

  // Handle submit review
  const handleSubmitReview = () => {
    if (!selectedRequest) return;

    if (reviewAction === "approve") {
      // Move to next step
      const updatedRequests = clubRequests.map((req) =>
        req.id === selectedRequest.id
          ? {
              ...req,
              status:
                selectedRequest.status === "pending_review"
                  ? ("under_review" as const)
                  : selectedRequest.status === "documents_submitted"
                  ? ("defense_scheduled" as const)
                  : selectedRequest.status === "defense_scheduled"
                  ? ("defense_completed" as const)
                  : selectedRequest.status === "defense_completed"
                  ? ("approved" as const)
                  : req.status,
              currentStep: Math.min(req.currentStep + 1, req.totalSteps),
            }
          : req
      );
      setClubRequests(updatedRequests);
      toast.success("Đã phê duyệt yêu cầu!", {
        description: `${selectedRequest.clubName} đã được chuyển sang bước tiếp theo.`,
      });
    } else {
      // Reject
      const updatedRequests = clubRequests.map((req) =>
        req.id === selectedRequest.id
          ? {
              ...req,
              status: "rejected" as const,
              rejectionReason: reviewNote || "Không đáp ứng yêu cầu",
            }
          : req
      );
      setClubRequests(updatedRequests);
      toast.error("Đã từ chối yêu cầu", {
        description: `${selectedRequest.clubName} đã bị từ chối.`,
      });
    }

    setIsReviewDialogOpen(false);
    setReviewNote("");
  };

  // Filter requests by status
  const pendingRequests = clubRequests.filter(
    (r) =>
      r.status === "pending_review" ||
      r.status === "under_review" ||
      r.status === "pending_documents" ||
      r.status === "documents_submitted" ||
      r.status === "defense_scheduled" ||
      r.status === "defense_completed"
  );

  const approvedRequests = clubRequests.filter((r) => r.status === "approved");
  const rejectedRequests = clubRequests.filter((r) => r.status === "rejected");

  // Render request card
  const renderRequestCard = (request: ClubCreationRequest) => {
    const statusConfig = STATUS_CONFIG[request.status];
    const progress = (request.currentStep / request.totalSteps) * 100;

    return (
      <Card key={request.id} className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{request.clubName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Mã: {request.clubCode}
              </p>
            </div>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-2 h-4 w-4" />
              Ngày gửi:{" "}
              {new Date(request.requestedAt).toLocaleDateString("vi-VN")}
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="mr-2 h-4 w-4" />
              Người gửi: {request.requestedBy}
            </div>
            {request.defenseDate && (
              <div className="flex items-center text-sm text-purple-600 font-medium">
                <Calendar className="mr-2 h-4 w-4" />
                Lịch bảo vệ:{" "}
                {new Date(request.defenseDate).toLocaleDateString(
                  "vi-VN"
                )} - {request.defenseTime}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tiến độ</span>
              <span className="font-medium">
                {request.currentStep}/{request.totalSteps}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {request.status === "rejected" && request.rejectionReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                <strong>Lý do từ chối:</strong> {request.rejectionReason}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleViewDetails(request)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </Button>
            {request.status !== "approved" && request.status !== "rejected" && (
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleReviewClick(request, "approve")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Duyệt
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-lg">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Quản lý đăng ký thành lập CLB
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Xét duyệt và theo dõi các yêu cầu thành lập câu lạc bộ
            </p>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Đang xử lý
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Đã phê duyệt
            {approvedRequests.length > 0 && (
              <span className="ml-2 bg-green-500 text-white rounded-full px-2 py-0.5 text-xs">
                {approvedRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Bị từ chối
            {rejectedRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                {rejectedRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending requests tab */}
        <TabsContent value="pending" className="space-y-6">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Không có yêu cầu nào đang chờ xử lý</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingRequests.map((request) => renderRequestCard(request))}
            </div>
          )}
        </TabsContent>

        {/* Approved requests tab */}
        <TabsContent value="approved" className="space-y-6">
          {approvedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có CLB nào được phê duyệt</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedRequests.map((request) => renderRequestCard(request))}
            </div>
          )}
        </TabsContent>

        {/* Rejected requests tab */}
        <TabsContent value="rejected" className="space-y-6">
          {rejectedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có yêu cầu nào bị từ chối</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rejectedRequests.map((request) => renderRequestCard(request))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {selectedRequest.clubName}
                </DialogTitle>
                <DialogDescription>
                  Mã CLB: {selectedRequest.clubCode} • Ngày gửi:{" "}
                  {new Date(selectedRequest.requestedAt).toLocaleDateString(
                    "vi-VN"
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Progress Overview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Tiến độ xử lý</h3>
                    <Badge variant="outline">
                      Bước {selectedRequest.currentStep}/
                      {selectedRequest.totalSteps}
                    </Badge>
                  </div>
                  <Progress
                    value={
                      (selectedRequest.currentStep /
                        selectedRequest.totalSteps) *
                      100
                    }
                    className="h-3"
                  />
                  <p className="text-sm text-muted-foreground">
                    Hoàn thành{" "}
                    {Math.round(
                      (selectedRequest.currentStep /
                        selectedRequest.totalSteps) *
                        100
                    )}
                    %
                  </p>
                </div>

                <Separator />

                {/* Club Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Thông tin câu lạc bộ</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Lĩnh vực
                      </p>
                      <p className="text-sm">{selectedRequest.category}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Mô tả
                      </p>
                      <p className="text-sm">{selectedRequest.description}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Đối tượng hướng tới
                      </p>
                      <p className="text-sm">{selectedRequest.targetMembers}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Timeline */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Quy trình xét duyệt</h3>
                  <div className="space-y-4">
                    {WORKFLOW_STEPS.map((step) => {
                      const isCompleted = step.id < selectedRequest.currentStep;
                      const isCurrent = step.id === selectedRequest.currentStep;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.id} className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`rounded-full p-2 ${
                                isCompleted
                                  ? "bg-green-100 text-green-600"
                                  : isCurrent
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : isCurrent ? (
                                <StepIcon className="h-5 w-5" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </div>
                            {step.id < WORKFLOW_STEPS.length && (
                              <div
                                className={`w-0.5 h-12 ${
                                  isCompleted ? "bg-green-200" : "bg-gray-200"
                                }`}
                              />
                            )}
                          </div>
                          <div className="flex-1 pb-8">
                            <h4
                              className={`font-medium ${
                                isCurrent ? "text-blue-600" : ""
                              }`}
                            >
                              {step.label}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Thông tin liên hệ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Email
                        </p>
                        <p className="text-sm text-gray-700">
                          {selectedRequest.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Phone className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Số điện thoại
                        </p>
                        <p className="text-sm text-gray-700">
                          {selectedRequest.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Users className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Người gửi
                        </p>
                        <p className="text-sm text-gray-700">
                          {selectedRequest.requestedBy}
                        </p>
                      </div>
                    </div>

                    {selectedRequest.defenseDate && (
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-purple-900">
                            Lịch bảo vệ
                          </p>
                          <p className="text-sm text-purple-700">
                            {new Date(
                              selectedRequest.defenseDate
                            ).toLocaleDateString("vi-VN")}{" "}
                            - {selectedRequest.defenseTime}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedRequest.status === "rejected" &&
                  selectedRequest.rejectionReason && (
                    <>
                      <Separator />
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h3 className="font-semibold text-red-900 mb-2">
                          Lý do từ chối
                        </h3>
                        <p className="text-sm text-red-700">
                          {selectedRequest.rejectionReason}
                        </p>
                      </div>
                    </>
                  )}
              </div>

              {selectedRequest.status !== "approved" &&
                selectedRequest.status !== "rejected" && (
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleReviewClick(selectedRequest, "reject")
                      }
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Từ chối
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        handleReviewClick(selectedRequest, "approve")
                      }
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Phê duyệt
                    </Button>
                  </DialogFooter>
                )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Phê duyệt" : "Từ chối"} yêu cầu
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.clubName} - {selectedRequest?.clubCode}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reviewNote">
                {reviewAction === "approve"
                  ? "Ghi chú (không bắt buộc)"
                  : "Lý do từ chối"}
              </Label>
              <Textarea
                id="reviewNote"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={
                  reviewAction === "approve"
                    ? "Nhập ghi chú cho quyết định này..."
                    : "Nhập lý do từ chối..."
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              className={
                reviewAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : ""
              }
              variant={reviewAction === "approve" ? "default" : "destructive"}
              onClick={handleSubmitReview}
            >
              {reviewAction === "approve" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Xác nhận phê duyệt
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Xác nhận từ chối
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
