import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  UserPlus,
  Send,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  clubCreationStaffApi,
  type RequestEstablishmentResponse,
  type ClubProposalResponse,
  type DefenseScheduleResponse,
  type ClubCreationFinalFormResponse,
} from "@/api/clubCreation";

interface ClubCreationRequest {
  id: string;
  clubName: string;
  clubCode: string;
  description: string;
  category: string;
  targetMembers?: string;
  email: string;
  phone: string;
  requestedBy: string;
  requestedAt: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  assignedStaff?: string;
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
    label: "Xác nhận liên hệ",
    description: "Liên hệ với sinh viên để xác nhận",
    icon: Users,
  },
  {
    id: 4,
    label: "Yêu cầu đề án",
    description: "Yêu cầu sinh viên nộp đề án chi tiết",
    icon: FileText,
  },
  {
    id: 5,
    label: "Xét duyệt đề án",
    description: "Xem xét và phê duyệt đề án",
    icon: CheckCircle2,
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
    description: "Sinh viên trình bày kế hoạch trước hội đồng",
    icon: Users,
  },
  {
    id: 8,
    label: "Hoàn tất",
    description: "Nhận quyết định phê duyệt",
    icon: CheckCircle2,
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  SUBMITTED: {
    label: "Chờ xét duyệt",
    color: "bg-blue-100 text-blue-800",
  },
  CONTACT_CONFIRMATION_PENDING: {
    label: "Chờ xác nhận liên hệ",
    color: "bg-yellow-100 text-yellow-800",
  },
  CONTACT_CONFIRMED: {
    label: "Đã xác nhận liên hệ",
    color: "bg-green-100 text-green-800",
  },
  CONTACT_REJECTED: {
    label: "Từ chối liên hệ",
    color: "bg-red-100 text-red-800",
  },
  PROPOSAL_REQUIRED: {
    label: "Chờ nộp đề án",
    color: "bg-orange-100 text-orange-800",
  },
  PROPOSAL_SUBMITTED: {
    label: "Đã nộp đề án",
    color: "bg-blue-100 text-blue-800",
  },
  PROPOSAL_APPROVED: {
    label: "Đề án đã duyệt",
    color: "bg-green-100 text-green-800",
  },
  PROPOSAL_REJECTED: {
    label: "Đề án bị từ chối",
    color: "bg-red-100 text-red-800",
  },
  DEFENSE_SCHEDULE_PROPOSED: {
    label: "Đã đề xuất lịch bảo vệ",
    color: "bg-purple-100 text-purple-800",
  },
  DEFENSE_SCHEDULE_APPROVED: {
    label: "Đã duyệt lịch bảo vệ",
    color: "bg-green-100 text-green-800",
  },
  DEFENSE_SCHEDULE_REJECTED: {
    label: "Từ chối lịch bảo vệ",
    color: "bg-red-100 text-red-800",
  },
  DEFENSE_COMPLETED: {
    label: "Đã bảo vệ",
    color: "bg-indigo-100 text-indigo-800",
  },
  FINAL_FORM_SUBMITTED: {
    label: "Đã nộp form cuối",
    color: "bg-blue-100 text-blue-800",
  },
  APPROVED: {
    label: "Đã phê duyệt",
    color: "bg-green-100 text-green-800",
  },
  REJECTED: {
    label: "Từ chối",
    color: "bg-red-100 text-red-800",
  },
};

// Helper function to calculate current step from status
const getCurrentStep = (status: string): number => {
  const stepMap: Record<string, number> = {
    SUBMITTED: 2,
    CONTACT_CONFIRMATION_PENDING: 3,
    CONTACT_CONFIRMED: 4,
    CONTACT_REJECTED: 2,
    PROPOSAL_REQUIRED: 4,
    PROPOSAL_SUBMITTED: 5,
    PROPOSAL_REJECTED: 4,
    PROPOSAL_APPROVED: 6,
    DEFENSE_SCHEDULE_PROPOSED: 6,
    DEFENSE_SCHEDULE_APPROVED: 6,
    DEFENSE_SCHEDULE_REJECTED: 5,
    DEFENSE_COMPLETED: 7,
    FINAL_FORM_SUBMITTED: 8,
    APPROVED: 8,
    REJECTED: 1,
  };
  return stepMap[status] || 1;
};

// Convert BE response to FE ClubCreationRequest
const convertToClubCreationRequest = (
  response: RequestEstablishmentResponse
): ClubCreationRequest => {
  return {
    id: response.id.toString(),
    clubName: response.clubName,
    clubCode: response.clubCode,
    description: response.description,
    category: response.clubCategory,
    targetMembers: response.expectedMemberCount?.toString(),
    email: response.createdByEmail,
    phone: "", // Not in response
    requestedBy: response.createdByFullName,
    requestedAt: response.sendDate || response.createdAt,
    status: response.status,
    currentStep: getCurrentStep(response.status),
    totalSteps: 8,
    assignedStaff: response.assignedStaffFullName,
  };
};

const parseFinalFormData = (formData?: string): { title?: string; fileUrl?: string } => {
  if (!formData) return {};
  try {
    return JSON.parse(formData);
  } catch {
    return {};
  }
};

export default function ClubCreationManagement() {
  const [activeTab, setActiveTab] = useState("pending");
  const [clubRequests, setClubRequests] = useState<ClubCreationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<ClubCreationRequest | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCompleteDefenseDialogOpen, setIsCompleteDefenseDialogOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [assignStaffId, setAssignStaffId] = useState("");
  const [defenseResult, setDefenseResult] = useState<"PASSED" | "FAILED">("PASSED");
  const [defenseFeedback, setDefenseFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [proposals, setProposals] = useState<ClubProposalResponse[]>([]);
  const [finalForms, setFinalForms] = useState<ClubCreationFinalFormResponse[]>([]);
  const [isFinalFormsLoading, setIsFinalFormsLoading] = useState(false);
  const [defenseSchedule, setDefenseSchedule] = useState<DefenseScheduleResponse | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedProposal, setSelectedProposal] = useState<ClubProposalResponse | null>(null);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);

  // Load pending requests
  const loadPendingRequests = async () => {
    setIsLoading(true);
    try {
      const response = await clubCreationStaffApi.getPendingRequests(page, 20);
      setClubRequests(response.content.map(convertToClubCreationRequest));
      setTotalPages(response.totalPages);
    } catch (error: any) {
      toast.error("Không thể tải danh sách yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "pending") {
      loadPendingRequests();
    }
  }, [activeTab, page]);

  // Load request detail with proposals and defense schedule
  const loadRequestDetail = async (requestId: number) => {
    try {
      setIsFinalFormsLoading(true);
      const [detail, proposalsData, defenseScheduleData, finalFormsData] = await Promise.all([
        clubCreationStaffApi.getRequestDetail(requestId),
        clubCreationStaffApi.getSubmittedProposals(requestId).catch(() => []),
        clubCreationStaffApi.getDefenseSchedule(requestId).catch(() => null),
        clubCreationStaffApi.getFinalForms(requestId).catch(() => []),
      ]);
      setSelectedRequest(convertToClubCreationRequest(detail));
      setProposals(Array.isArray(proposalsData) ? proposalsData : []);
      setDefenseSchedule(defenseScheduleData);
      setFinalForms(Array.isArray(finalFormsData) ? finalFormsData : []);
    } catch (error: any) {
      toast.error("Không thể tải thông tin chi tiết", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsFinalFormsLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = async (request: ClubCreationRequest) => {
    await loadRequestDetail(parseInt(request.id));
    setIsDetailDialogOpen(true);
  };

  // Handle assign request
  const handleAssignRequest = async () => {
    if (!selectedRequest || !assignStaffId) {
      toast.error("Vui lòng chọn staff để gán!");
      return;
    }

    try {
      setIsLoading(true);
      await clubCreationStaffApi.assignRequest(parseInt(selectedRequest.id), {
        staffId: parseInt(assignStaffId),
      });
      toast.success("Đã gán yêu cầu thành công!");
      setIsAssignDialogOpen(false);
      setAssignStaffId("");
      await loadPendingRequests();
      if (selectedRequest) {
        await loadRequestDetail(parseInt(selectedRequest.id));
      }
    } catch (error: any) {
      toast.error("Không thể gán yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle receive request
  const handleReceiveRequest = async (requestId: number) => {
    try {
      setIsLoading(true);
      await clubCreationStaffApi.receiveRequest(requestId);
      toast.success("Đã nhận yêu cầu thành công!");
      await loadPendingRequests();
    } catch (error: any) {
      toast.error("Không thể nhận yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle confirm contact
  const handleConfirmContact = async (requestId: number) => {
    try {
      setIsLoading(true);
      await clubCreationStaffApi.confirmContact(requestId);
      toast.success("Đã xác nhận liên hệ thành công!");
      await loadPendingRequests();
    } catch (error: any) {
      toast.error("Không thể xác nhận liên hệ", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reject contact
  const handleRejectContact = async (requestId: number, reason?: string) => {
    try {
      setIsLoading(true);
      await clubCreationStaffApi.rejectContact(requestId, { reason });
      toast.success("Đã từ chối liên hệ!");
      setIsReviewDialogOpen(false);
      setReviewNote("");
      await loadPendingRequests();
    } catch (error: any) {
      toast.error("Không thể từ chối liên hệ", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle request proposal
  const handleRequestProposal = async (requestId: number) => {
    try {
      setIsLoading(true);
      await clubCreationStaffApi.requestProposal(requestId);
      toast.success("Đã yêu cầu đề án thành công!");
      await loadPendingRequests();
    } catch (error: any) {
      toast.error("Không thể yêu cầu đề án", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle approve proposal
  const handleApproveProposal = async (requestId: number) => {
    try {
      setIsLoading(true);
      await clubCreationStaffApi.approveProposal(requestId);
      toast.success("Đã phê duyệt đề án thành công!");
      await loadPendingRequests();
      if (selectedRequest) {
        await loadRequestDetail(parseInt(selectedRequest.id));
      }
    } catch (error: any) {
      toast.error("Không thể phê duyệt đề án", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reject proposal
  const handleRejectProposal = async (requestId: number, reason?: string) => {
    try {
      setIsLoading(true);
      await clubCreationStaffApi.rejectProposal(requestId, { reason });
      toast.success("Đã từ chối đề án!");
      setIsReviewDialogOpen(false);
      setReviewNote("");
      await loadPendingRequests();
      if (selectedRequest) {
        await loadRequestDetail(parseInt(selectedRequest.id));
      }
    } catch (error: any) {
      toast.error("Không thể từ chối đề án", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle approve defense schedule
  const handleApproveDefenseSchedule = async (requestId: number) => {
    try {
      setIsLoading(true);
      await clubCreationStaffApi.approveDefenseSchedule(requestId);
      toast.success("Đã phê duyệt lịch bảo vệ thành công!");
      await loadPendingRequests();
      if (selectedRequest) {
        await loadRequestDetail(parseInt(selectedRequest.id));
      }
    } catch (error: any) {
      toast.error("Không thể phê duyệt lịch bảo vệ", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle approve final form (create club)
  const handleApproveFinalForm = async (requestId: number) => {
    try {
      setIsLoading(true);
      await clubCreationStaffApi.approveFinalForm(requestId);
      toast.success("Đã duyệt form cuối và tạo CLB thành công!");
      await loadPendingRequests();
      if (selectedRequest) {
        await loadRequestDetail(parseInt(selectedRequest.id));
      }
    } catch (error: any) {
      toast.error("Không thể duyệt form cuối", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reject defense schedule
  const handleRejectDefenseSchedule = async (requestId: number, reason?: string) => {
    try {
      setIsLoading(true);
      await clubCreationStaffApi.rejectDefenseSchedule(requestId, { reason });
      toast.success("Đã từ chối lịch bảo vệ!");
      setIsReviewDialogOpen(false);
      setReviewNote("");
      await loadPendingRequests();
      if (selectedRequest) {
        await loadRequestDetail(parseInt(selectedRequest.id));
      }
    } catch (error: any) {
      toast.error("Không thể từ chối lịch bảo vệ", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle complete defense
  const handleCompleteDefense = async () => {
    if (!selectedRequest) return;

    try {
      setIsLoading(true);
      await clubCreationStaffApi.completeDefense(parseInt(selectedRequest.id), {
        result: defenseResult,
        feedback: defenseFeedback || undefined,
      });
      toast.success(
        defenseResult === "PASSED"
          ? "Đã hoàn tất bảo vệ - Đã đạt!"
          : "Đã hoàn tất bảo vệ - Không đạt!"
      );
      setIsCompleteDefenseDialogOpen(false);
      setDefenseResult("PASSED");
      setDefenseFeedback("");
      await loadPendingRequests();
      if (selectedRequest) {
        await loadRequestDetail(parseInt(selectedRequest.id));
      }
    } catch (error: any) {
      toast.error("Không thể hoàn tất bảo vệ", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
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

    const requestId = parseInt(selectedRequest.id);

    if (reviewAction === "approve") {
      // Xử lý approve theo từng status
      if (selectedRequest.status === "SUBMITTED") {
        // Nếu chưa được gán, tự động nhận và gán cho chính mình
        handleReceiveRequest(requestId);
      } else if (selectedRequest.status === "CONTACT_CONFIRMATION_PENDING") {
        // Xác nhận liên hệ
        handleConfirmContact(requestId);
      } else if (selectedRequest.status === "CONTACT_CONFIRMED") {
        // Yêu cầu đề án
        handleRequestProposal(requestId);
      } else if (selectedRequest.status === "PROPOSAL_SUBMITTED") {
        // Phê duyệt đề án
        handleApproveProposal(requestId);
      } else if (selectedRequest.status === "DEFENSE_SCHEDULE_PROPOSED") {
        // Phê duyệt lịch bảo vệ
        handleApproveDefenseSchedule(requestId);
      } else if (selectedRequest.status === "DEFENSE_COMPLETED") {
        // Hoàn tất bảo vệ (mở dialog nhập kết quả)
        setIsCompleteDefenseDialogOpen(true);
        setIsReviewDialogOpen(false);
      } else {
        toast.error("Không thể thực hiện hành động này cho trạng thái hiện tại");
      }
    } else {
      // Xử lý reject
      if (selectedRequest.status === "PROPOSAL_SUBMITTED") {
        handleRejectProposal(requestId, reviewNote);
      } else if (selectedRequest.status === "DEFENSE_SCHEDULE_PROPOSED") {
        handleRejectDefenseSchedule(requestId, reviewNote);
      } else if (selectedRequest.status === "CONTACT_CONFIRMATION_PENDING") {
        handleRejectContact(requestId, reviewNote);
      } else {
        toast.error("Không thể từ chối ở trạng thái này");
      }
    }
  };

  // Filter requests by status
  // Pending: Chưa được staff xử lý (SUBMITTED, CONTACT_CONFIRMATION_PENDING)
  const pendingRequests = clubRequests.filter(
    (r) =>
      r.status === "SUBMITTED" || r.status === "CONTACT_CONFIRMATION_PENDING"
  );

  // Approved: Đang trong quá trình xử lý sau khi nhận (không bao gồm đã hoàn thành)
  const approvedRequests = clubRequests.filter(
    (r) =>
      r.status === "CONTACT_CONFIRMED" ||
      r.status === "PROPOSAL_REQUIRED" ||
      r.status === "PROPOSAL_SUBMITTED" ||
      r.status === "PROPOSAL_REJECTED" ||
      r.status === "PROPOSAL_APPROVED" ||
      r.status === "DEFENSE_SCHEDULE_PROPOSED" ||
      r.status === "DEFENSE_SCHEDULE_APPROVED" ||
      r.status === "DEFENSE_SCHEDULE_REJECTED" ||
      r.status === "DEFENSE_SCHEDULED" ||
      r.status === "DEFENSE_COMPLETED" ||
      r.status === "FEEDBACK_PROVIDED" ||
      r.status === "FINAL_FORM_SUBMITTED" ||
      r.status === "FINAL_FORM_REVIEWED"
  );

  const rejectedRequests = clubRequests.filter(
    (r) => r.status === "REJECTED" || r.status === "CONTACT_REJECTED"
  );

  const completedRequests = clubRequests.filter((r) => r.status === "APPROVED");

  // Render request card
  const renderRequestCard = (request: ClubCreationRequest) => {
    const statusConfig = STATUS_CONFIG[request.status] || {
      label: request.status,
      color: "bg-gray-100 text-gray-800",
    };
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
            {request.assignedStaff && (
              <div className="flex items-center text-sm text-blue-600 font-medium">
                <UserPlus className="mr-2 h-4 w-4" />
                Được gán cho: {request.assignedStaff}
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

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleViewDetails(request)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </Button>
            {request.status !== "APPROVED" &&
              request.status !== "REJECTED" &&
              request.status !== "CONTACT_REJECTED" && (
                <div className="flex gap-2">
                  {(request.status === "PROPOSAL_SUBMITTED" ||
                    request.status === "DEFENSE_SCHEDULE_PROPOSED" ||
                    request.status === "CONTACT_CONFIRMATION_PENDING") && (
                    <Button
                      variant="outline"
                      className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => handleReviewClick(request, "reject")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Từ chối
                    </Button>
                  )}
                  {(request.status === "SUBMITTED" ||
                    request.status === "CONTACT_CONFIRMATION_PENDING" ||
                    request.status === "CONTACT_CONFIRMED" ||
                    request.status === "PROPOSAL_SUBMITTED" ||
                    request.status === "DEFENSE_SCHEDULE_PROPOSED" ||
                    request.status === "FINAL_FORM_SUBMITTED") && (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const requestId = parseInt(request.id);
                        if (request.status === "SUBMITTED") {
                          handleReceiveRequest(requestId);
                        } else if (request.status === "CONTACT_CONFIRMATION_PENDING") {
                          handleConfirmContact(requestId);
                        } else if (request.status === "CONTACT_CONFIRMED") {
                          handleRequestProposal(requestId);
                        } else if (request.status === "PROPOSAL_SUBMITTED") {
                          handleApproveProposal(requestId);
                        } else if (request.status === "DEFENSE_SCHEDULE_PROPOSED") {
                          handleApproveDefenseSchedule(requestId);
                        } else if (request.status === "DEFENSE_SCHEDULE_APPROVED" || request.status === "DEFENSE_SCHEDULED") {
                          loadRequestDetail(requestId).then(() => {
                            setIsDetailDialogOpen(true);
                          });
                        } else if (request.status === "FINAL_FORM_SUBMITTED") {
                          handleApproveFinalForm(requestId);
                        }
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {request.status === "SUBMITTED"
                        ? "Nhận xử lý"
                        : request.status === "CONTACT_CONFIRMATION_PENDING"
                        ? "Xác nhận liên hệ"
                        : request.status === "CONTACT_CONFIRMED"
                        ? "Yêu cầu đề án"
                        : request.status === "PROPOSAL_SUBMITTED"
                        ? "Phê duyệt đề án"
                        : request.status === "DEFENSE_SCHEDULE_PROPOSED"
                        ? "Duyệt lịch bảo vệ"
                        : request.status === "DEFENSE_SCHEDULE_APPROVED" || request.status === "DEFENSE_SCHEDULED"
                        ? "Nhập kết quả bảo vệ"
                        : request.status === "FINAL_FORM_SUBMITTED"
                        ? "Duyệt form cuối"
                        : "Duyệt"}
                    </Button>
                  )}
                </div>
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
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="completed">
            Đã hoàn thành
            {completedRequests.length > 0 && (
              <span className="ml-2 bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs">
                {completedRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending requests tab */}
        <TabsContent value="pending" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Đang tải...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
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

        {/* Completed requests tab */}
        <TabsContent value="completed" className="space-y-6">
          {completedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có yêu cầu nào đã hoàn thành</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedRequests.map((request) => renderRequestCard(request))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    {selectedRequest.targetMembers && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Đối tượng hướng tới
                        </p>
                        <p className="text-sm">{selectedRequest.targetMembers}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Proposals Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Đề án đã nộp</h3>
                    {proposals.length > 0 && (
                      <Badge variant="outline">{proposals.length} đề án</Badge>
                    )}
                  </div>
                  {proposals.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">
                      Chưa có đề án nào được nộp
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {proposals.map((proposal, index) => (
                        <Card key={proposal.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{proposal.title}</p>
                                  {index === 0 && (
                                    <Badge className="bg-green-100 text-green-800 text-xs">
                                      Mới nhất
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Ngày nộp:{" "}
                                  {new Date(proposal.createdAt).toLocaleDateString("vi-VN", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                {proposal.updatedAt && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Cập nhật:{" "}
                                    {new Date(proposal.updatedAt).toLocaleDateString("vi-VN")}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {proposal.fileUrl && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          const detail = await clubCreationStaffApi.getProposalDetail(
                                            parseInt(selectedRequest!.id),
                                            proposal.id
                                          );
                                          setSelectedProposal(detail);
                                          setIsProposalDialogOpen(true);
                                        } catch (error: any) {
                                          toast.error("Không thể tải chi tiết đề án", {
                                            description: error.message || "Đã xảy ra lỗi",
                                          });
                                        }
                                      }}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      Xem chi tiết
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const link = document.createElement("a");
                                        link.href = proposal.fileUrl;
                                        link.download = proposal.title || "proposal";
                                        link.target = "_blank";
                                        link.click();
                                      }}
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      Tải
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
                </div>
                {proposals.length > 0 && <Separator />}

                {/* Defense Schedule Section */}
                {defenseSchedule && (
                  <>
                    <div className="space-y-3">
                      <h3 className="font-semibold">Lịch bảo vệ</h3>
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Ngày và giờ bảo vệ
                            </p>
                            <p className="text-sm">
                              {new Date(defenseSchedule.defenseDate).toLocaleString("vi-VN", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          {defenseSchedule.location && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Địa điểm
                              </p>
                              <p className="text-sm">{defenseSchedule.location}</p>
                            </div>
                          )}
                          {defenseSchedule.meetingLink && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Link meeting
                              </p>
                              <a
                                href={defenseSchedule.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {defenseSchedule.meetingLink}
                              </a>
                            </div>
                          )}
                          {defenseSchedule.notes && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Ghi chú
                              </p>
                              <p className="text-sm">{defenseSchedule.notes}</p>
                            </div>
                          )}
                          {defenseSchedule.feedback && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Feedback
                              </p>
                              <p className="text-sm">{defenseSchedule.feedback}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Final Form Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Form cuối đã nộp</h3>
                    {finalForms.length > 0 && (
                      <Badge variant="outline">{finalForms.length} form</Badge>
                    )}
                  </div>
                  {isFinalFormsLoading ? (
                    <p className="text-sm text-muted-foreground">Đang tải danh sách form...</p>
                  ) : finalForms.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Chưa có form cuối nào được nộp
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {finalForms.map((form, index) => {
                        const data = parseFinalFormData(form.formData);
                        return (
                          <Card key={form.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                      {data.title || `Form cuối #${form.id}`}
                                    </p>
                                    {index === 0 && (
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                                        Mới nhất
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Ngày nộp:{" "}
                                    {form.submittedAt
                                      ? new Date(form.submittedAt).toLocaleString("vi-VN", {
                                          year: "numeric",
                                          month: "2-digit",
                                          day: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "—"}
                                  </p>
                                </div>
                                {data.fileUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(data.fileUrl, "_blank")}
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    Xem file
                                  </Button>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Trạng thái: {form.status || "SUBMITTED"}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Separator />

                {/* Contact Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Thông tin liên hệ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Mail className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <p className="text-sm text-gray-700">{selectedRequest.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Users className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Người gửi</p>
                        <p className="text-sm text-gray-700">{selectedRequest.requestedBy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedRequest.status !== "APPROVED" &&
                selectedRequest.status !== "REJECTED" &&
                selectedRequest.status !== "CONTACT_REJECTED" && (
                  <DialogFooter className="gap-2 flex-wrap">
                    {selectedRequest.status === "SUBMITTED" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setIsAssignDialogOpen(true)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Gán staff
                        </Button>
                        <Button
                          onClick={() => handleReceiveRequest(parseInt(selectedRequest.id))}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Nhận xử lý
                        </Button>
                      </>
                    )}
                    {selectedRequest.status === "CONTACT_CONFIRMATION_PENDING" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleRejectContact(parseInt(selectedRequest.id), reviewNote)
                          }
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Từ chối liên hệ
                        </Button>
                        <Button
                          onClick={() => handleConfirmContact(parseInt(selectedRequest.id))}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Xác nhận liên hệ
                        </Button>
                      </>
                    )}
                    {selectedRequest.status === "CONTACT_CONFIRMED" && (
                      <Button
                        onClick={() => handleRequestProposal(parseInt(selectedRequest.id))}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Yêu cầu đề án
                      </Button>
                    )}
                    {selectedRequest.status === "PROPOSAL_SUBMITTED" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleReviewClick(selectedRequest, "reject")}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Từ chối đề án
                        </Button>
                        <Button
                          onClick={() => handleApproveProposal(parseInt(selectedRequest.id))}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Phê duyệt đề án
                        </Button>
                      </>
                    )}
                    {selectedRequest.status === "DEFENSE_SCHEDULE_PROPOSED" && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleReviewClick(selectedRequest, "reject")}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Từ chối lịch
                        </Button>
                        <Button
                          onClick={() =>
                            handleApproveDefenseSchedule(parseInt(selectedRequest.id))
                          }
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Phê duyệt lịch
                        </Button>
                      </>
                    )}
                    {selectedRequest.status === "DEFENSE_SCHEDULE_APPROVED" || selectedRequest.status === "DEFENSE_SCHEDULED" ? (
                      <>
                        {defenseSchedule && new Date(defenseSchedule.defenseDate) > new Date() ? (
                          <div className="space-y-2">
                            <Button
                              disabled
                              variant="outline"
                              className="w-full"
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Chưa đến thời gian bảo vệ
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                              Chỉ có thể nhập kết quả sau khi thời gian bảo vệ đã qua. 
                              Thời gian bảo vệ: {new Date(defenseSchedule.defenseDate).toLocaleString("vi-VN", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        ) : (
                          <Button
                            onClick={() => {
                              setIsCompleteDefenseDialogOpen(true);
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Nhập kết quả bảo vệ
                          </Button>
                        )}
                      </>
                    ) : null}
                    {selectedRequest.status === "FINAL_FORM_SUBMITTED" && (
                      <Button
                        onClick={() =>
                          handleApproveFinalForm(parseInt(selectedRequest.id))
                        }
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Duyệt form cuối & tạo CLB
                      </Button>
                    )}
                    {(selectedRequest.status === "PROPOSAL_REQUIRED" ||
                      selectedRequest.status === "PROPOSAL_APPROVED") && (
                      <div className="text-sm text-muted-foreground italic">
                        Đang chờ sinh viên thực hiện bước tiếp theo...
                      </div>
                    )}
                    {selectedRequest.status === "DEFENSE_COMPLETED" && (
                      <div className="text-sm text-muted-foreground italic">
                        Bảo vệ đã hoàn tất. Đang chờ sinh viên nộp form cuối...
                      </div>
                    )}
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

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gán staff xử lý</DialogTitle>
            <DialogDescription>
              Chọn staff để gán xử lý yêu cầu này
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staffId">Staff ID *</Label>
              <Input
                id="staffId"
                type="number"
                value={assignStaffId}
                onChange={(e) => setAssignStaffId(e.target.value)}
                placeholder="Nhập ID của staff"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleAssignRequest}>
              <UserPlus className="mr-2 h-4 w-4" />
              Gán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Defense Dialog */}
      <Dialog open={isCompleteDefenseDialogOpen} onOpenChange={setIsCompleteDefenseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hoàn tất bảo vệ</DialogTitle>
            <DialogDescription>
              Nhập kết quả và feedback cho buổi bảo vệ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defenseResult">Kết quả *</Label>
              <Select
                value={defenseResult}
                onValueChange={(value: "PASSED" | "FAILED") => setDefenseResult(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASSED">Đạt</SelectItem>
                  <SelectItem value="FAILED">Không đạt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defenseFeedback">Feedback (không bắt buộc)</Label>
              <Textarea
                id="defenseFeedback"
                value={defenseFeedback}
                onChange={(e) => setDefenseFeedback(e.target.value)}
                placeholder="Nhập feedback cho sinh viên..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCompleteDefenseDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleCompleteDefense}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proposal Detail Dialog */}
      <Dialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProposal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedProposal.title}</DialogTitle>
                <DialogDescription>
                  Đề án chi tiết - Request ID: {selectedProposal.requestEstablishmentId}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tiêu đề</p>
                    <p className="text-sm">{selectedProposal.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ngày nộp</p>
                    <p className="text-sm">
                      {new Date(selectedProposal.createdAt).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {selectedProposal.updatedAt && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cập nhật lần cuối</p>
                      <p className="text-sm">
                        {new Date(selectedProposal.updatedAt).toLocaleDateString("vi-VN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                  {selectedProposal.fileUrl && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">File đề án</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => window.open(selectedProposal.fileUrl, "_blank")}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Xem file
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = selectedProposal.fileUrl!;
                            link.download = selectedProposal.title || "proposal";
                            link.target = "_blank";
                            link.click();
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Tải xuống
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 break-all">
                        {selectedProposal.fileUrl}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsProposalDialogOpen(false)}>
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
