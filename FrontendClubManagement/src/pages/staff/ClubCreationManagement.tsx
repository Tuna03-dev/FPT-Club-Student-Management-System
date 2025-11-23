import { useState, useEffect, useCallback } from "react";
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
  Send,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  clubCreationStaffApi,
  clubCreationApi,
  type RequestEstablishmentResponse,
  type ClubProposalResponse,
  type DefenseScheduleResponse,
  type ClubCreationFinalFormResponse,
  type ClubCreationStepResponse,
  type WorkflowHistoryResponse,
} from "@/api/clubCreation";
import { useWebSocket, type ClubCreationWebSocketPayload } from "@/hooks/useWebSocket";

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

// WORKFLOW_STEPS đã được thay thế bằng dữ liệu động từ API (workflowSteps)

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

// Helper function to map status to step code
const getStepCodeFromStatus = (status: string): string | null => {
  const statusToStepCodeMap: Record<string, string> = {
    SUBMITTED: "REQUEST_SUBMITTED",
    CONTACT_CONFIRMATION_PENDING: "REQUEST_REVIEW",
    CONTACT_CONFIRMED: "REQUEST_REVIEW",
    PROPOSAL_REQUIRED: "PROPOSAL_REQUIRED",
    PROPOSAL_SUBMITTED: "PROPOSAL_SUBMITTED",
    PROPOSAL_APPROVED: "PROPOSAL_REVIEW",
    PROPOSAL_REJECTED: "PROPOSAL_REVIEW", // Đã trải qua bước staff duyệt (dù bị từ chối)
    DEFENSE_SCHEDULE_PROPOSED: "PROPOSE_DEFENSE_TIME",
    DEFENSE_SCHEDULE_APPROVED: "DEFENSE_SCHEDULE_CONFIRMED",
    DEFENSE_SCHEDULE_REJECTED: "PROPOSE_DEFENSE_TIME", // Từ chối lịch bảo vệ vẫn thuộc bước lịch bảo vệ
    DEFENSE_COMPLETED: "DEFENSE_COMPLETED",
    FINAL_FORM_SUBMITTED: "FINAL_FORM",
    APPROVED: "CLUB_CREATED",
  };
  return statusToStepCodeMap[status] || null;
};

// Helper function to calculate current step from status using steps from API
const getCurrentStep = (status: string, steps: ClubCreationStepResponse[]): number => {
  if (status === "REJECTED" || status === "CONTACT_REJECTED") {
    return 1;
  }
  
  const stepCode = getStepCodeFromStatus(status);
  if (!stepCode) {
    return 1;
  }
  
  const step = steps.find((s) => s.code === stepCode);
  if (!step) {
    return 1;
  }
  
  return step.orderIndex || 1;
};

// Convert BE response to FE ClubCreationRequest
const convertToClubCreationRequest = (
  response: RequestEstablishmentResponse,
  steps: ClubCreationStepResponse[]
): ClubCreationRequest => {
  return {
    id: response.id.toString(),
    clubName: response.clubName,
    clubCode: response.clubCode,
    description: response.description,
    category: response.clubCategory,
    targetMembers: response.activityObjectives, // Sửa: map từ activityObjectives thay vì expectedMemberCount
    email: response.email || response.createdByEmail,
    phone: response.phone || "",
    requestedBy: response.createdByFullName,
    requestedAt: response.sendDate || response.createdAt,
    status: response.status,
    currentStep: getCurrentStep(response.status, steps),
    totalSteps: steps.length,
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
  const [isCompleteDefenseDialogOpen, setIsCompleteDefenseDialogOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [defenseResult, setDefenseResult] = useState<"PASSED" | "FAILED">("PASSED");
  const [defenseFeedback, setDefenseFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [proposals, setProposals] = useState<ClubProposalResponse[]>([]);
  const [finalForms, setFinalForms] = useState<ClubCreationFinalFormResponse[]>([]);
  const [isFinalFormsLoading, setIsFinalFormsLoading] = useState(false);
  const [defenseSchedule, setDefenseSchedule] = useState<DefenseScheduleResponse | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ClubProposalResponse | null>(null);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<ClubCreationStepResponse[]>([]);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryResponse[]>([]);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);
  const [requestDetail, setRequestDetail] = useState<RequestEstablishmentResponse | null>(null);
  const [isRequestProposalDialogOpen, setIsRequestProposalDialogOpen] = useState(false);
  const [proposalRequestNote, setProposalRequestNote] = useState("");
  const [proposalRequestTarget, setProposalRequestTarget] = useState<ClubCreationRequest | null>(null);

  // WebSocket connection
  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToUserQueue, subscribeToSystemRole } = useWebSocket(token);

  // Load workflow steps
  const loadWorkflowSteps = async () => {
    try {
      const steps = await clubCreationApi.getClubCreationSteps();
      setWorkflowSteps(steps);
    } catch (error: any) {
      toast.error("Không thể tải danh sách bước quy trình", {
        description: error.message || "Đã xảy ra lỗi",
      });
      setWorkflowSteps([]);
    }
  };

  // Load pending requests
  const loadPendingRequests = useCallback(async () => {
    try {
      // Đảm bảo workflowSteps đã được load
      let steps = workflowSteps;
      if (steps.length === 0) {
        steps = await clubCreationApi.getClubCreationSteps();
        setWorkflowSteps(steps);
      }
      
      const response = await clubCreationStaffApi.getPendingRequests(0, 20);
      setClubRequests(response.content.map((req) => convertToClubCreationRequest(req, steps)));
    } catch (error: any) {
      toast.error("Không thể tải danh sách yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    }
  }, [workflowSteps]);

  // 🔔 WebSocket: Real-time updates for Club Creation (Staff)
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to user queue (for assigned requests)
    const unsubscribeUser = subscribeToUserQueue((msg) => {
      if (msg.type !== "CLUB_CREATION") return;

      const payload = msg.payload as ClubCreationWebSocketPayload;
      const requestId = payload.requestId;

      // Show toast notification based on action
      switch (msg.action) {
        case "REQUEST_SUBMITTED":
          toast.info("Yêu cầu mới đã được gửi", {
            description: `Sinh viên ${payload.creatorName} đã gửi yêu cầu thành lập CLB "${payload.clubName}"`,
          });
          // Refresh request list (luôn refresh để cập nhật UI)
          if (activeTab === "pending") {
            loadPendingRequests();
          }
          break;
        case "PROPOSAL_SUBMITTED":
          toast.info("Đề án mới đã được nộp", {
            description: payload.proposalTitle 
              ? `Đề án "${payload.proposalTitle}" đã được nộp cho yêu cầu "${payload.clubName}"`
              : payload.message,
          });
          // Refresh request list để hiển thị nút duyệt (luôn refresh, không cần check activeTab)
          loadPendingRequests();
          // Refresh detail if dialog is open
          if (isDetailDialogOpen && selectedRequest && parseInt(selectedRequest.id) === requestId) {
            loadRequestDetail(requestId);
          }
          break;
        case "DEFENSE_SCHEDULE_PROPOSED":
          toast.info("Lịch bảo vệ mới đã được đề xuất", {
            description: payload.defenseDate
              ? `Lịch bảo vệ: ${new Date(payload.defenseDate).toLocaleString("vi-VN")} - ${payload.location || "Chưa có địa điểm"}`
              : payload.message,
          });
          // Refresh request list để hiển thị nút duyệt (luôn refresh, không cần check activeTab)
          loadPendingRequests();
          // Refresh detail if dialog is open
          if (isDetailDialogOpen && selectedRequest && parseInt(selectedRequest.id) === requestId) {
            loadRequestDetail(requestId);
          }
          break;
        case "FINAL_FORM_SUBMITTED":
          toast.info("Form cuối đã được nộp", {
            description: payload.finalFormTitle
              ? `Form cuối "${payload.finalFormTitle}" đã được nộp cho yêu cầu "${payload.clubName}"`
              : payload.message,
          });
          // Refresh request list để hiển thị nút duyệt (luôn refresh, không cần check activeTab)
          loadPendingRequests();
          // Refresh detail if dialog is open
          if (isDetailDialogOpen && selectedRequest && parseInt(selectedRequest.id) === requestId) {
            loadRequestDetail(requestId);
          }
          break;
        default:
          // Handle other actions silently
          break;
      }
    });

    // Subscribe to STAFF role broadcast (for new requests)
    const unsubscribeStaff = subscribeToSystemRole("STAFF", (msg) => {
      if (msg.type !== "CLUB_CREATION") return;

      const payload = msg.payload as ClubCreationWebSocketPayload;

      if (msg.action === "REQUEST_SUBMITTED") {
        toast.info("Yêu cầu mới đã được gửi", {
          description: `Sinh viên ${payload.creatorName} đã gửi yêu cầu thành lập CLB "${payload.clubName}"`,
        });
        // Refresh request list if on pending tab
        if (activeTab === "pending") {
          loadPendingRequests();
        }
      }
    });

    return () => {
      unsubscribeUser?.();
      unsubscribeStaff?.();
    };
  }, [isConnected, activeTab, isDetailDialogOpen, selectedRequest, subscribeToUserQueue, subscribeToSystemRole, loadPendingRequests]);

  useEffect(() => {
    loadWorkflowSteps();
  }, []);

  useEffect(() => {
    if (activeTab === "pending" && workflowSteps.length > 0) {
      loadPendingRequests();
    }
  }, [activeTab, workflowSteps]);

  // Load workflow history
  const loadWorkflowHistory = async (requestId: number) => {
    try {
      const historyData = await clubCreationStaffApi.getWorkflowHistory(requestId, 0, 100);
      setWorkflowHistory(historyData.content || []);
    } catch (error: any) {
      console.error("Failed to load workflow history:", error);
      setWorkflowHistory([]);
    }
  };

  const openRequestProposalDialog = (request: ClubCreationRequest) => {
    setProposalRequestTarget(request);
    setProposalRequestNote("");
    setIsRequestProposalDialogOpen(true);
  };

  const handleSubmitProposalRequest = async () => {
    if (!proposalRequestTarget) return;
    const requestId = parseInt(proposalRequestTarget.id);
    const comment = proposalRequestNote.trim();
    const success = await handleRequestProposal(requestId, comment || undefined);
    if (success) {
      setIsRequestProposalDialogOpen(false);
      setProposalRequestTarget(null);
      setProposalRequestNote("");
    }
  };

  // Load request detail with proposals and defense schedule
  const loadRequestDetail = async (requestId: number) => {
    try {
      setIsFinalFormsLoading(true);
      
      // Đảm bảo workflowSteps đã được load
      let steps = workflowSteps;
      if (steps.length === 0) {
        steps = await clubCreationApi.getClubCreationSteps();
        setWorkflowSteps(steps);
      }
      
      const [detail, proposalsData, defenseScheduleData, finalFormsData] = await Promise.all([
        clubCreationStaffApi.getRequestDetail(requestId),
        clubCreationStaffApi.getSubmittedProposals(requestId).catch(() => []),
        clubCreationStaffApi.getDefenseSchedule(requestId).catch(() => null),
        clubCreationStaffApi.getFinalForms(requestId).catch(() => []),
      ]);
      setRequestDetail(detail);
      setSelectedRequest(convertToClubCreationRequest(detail, steps));
      setProposals(Array.isArray(proposalsData) ? proposalsData : []);
      setDefenseSchedule(defenseScheduleData);
      setFinalForms(Array.isArray(finalFormsData) ? finalFormsData : []);
      
      // Load workflow history when detail dialog opens
      await loadWorkflowHistory(requestId);
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
  const handleRequestProposal = async (requestId: number, comment?: string) => {
    try {
      setIsLoading(true);
      await clubCreationStaffApi.requestProposal(requestId, comment ? { comment } : undefined);
      toast.success("Đã yêu cầu đề án thành công!");
      await loadPendingRequests();
      if (selectedRequest && parseInt(selectedRequest.id) === requestId) {
        await loadRequestDetail(requestId);
      }
      return true;
    } catch (error: any) {
      toast.error("Không thể yêu cầu đề án", {
        description: error.message || "Đã xảy ra lỗi",
      });
      return false;
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
        // Tự động nhận yêu cầu
        handleReceiveRequest(requestId);
      } else if (selectedRequest.status === "CONTACT_CONFIRMATION_PENDING") {
        // Xác nhận liên hệ
        handleConfirmContact(requestId);
      } else if (selectedRequest.status === "CONTACT_CONFIRMED") {
        // Yêu cầu đề án với ghi chú
        setIsReviewDialogOpen(false);
        openRequestProposalDialog(selectedRequest);
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
                        const status = request.status as string;
                        const requestId = parseInt(request.id);
                        if (status === "SUBMITTED") {
                          handleReceiveRequest(requestId);
                        } else if (status === "CONTACT_CONFIRMATION_PENDING") {
                          handleConfirmContact(requestId);
                        } else if (status === "CONTACT_CONFIRMED") {
                          openRequestProposalDialog(request);
                        } else if (status === "PROPOSAL_SUBMITTED") {
                          handleApproveProposal(requestId);
                        } else if (status === "DEFENSE_SCHEDULE_PROPOSED") {
                          handleApproveDefenseSchedule(requestId);
                        } else if (status === "DEFENSE_SCHEDULE_APPROVED" || status === "DEFENSE_SCHEDULED") {
                          loadRequestDetail(requestId).then(() => {
                            setIsDetailDialogOpen(true);
                          });
                        } else if (status === "FINAL_FORM_SUBMITTED") {
                          handleApproveFinalForm(requestId);
                        }
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {(() => {
                        const status = request.status as string;
                        return status === "SUBMITTED"
                          ? "Nhận xử lý"
                          : status === "CONTACT_CONFIRMATION_PENDING"
                          ? "Xác nhận liên hệ"
                          : status === "CONTACT_CONFIRMED"
                          ? "Yêu cầu đề án"
                          : status === "PROPOSAL_SUBMITTED"
                          ? "Phê duyệt đề án"
                          : status === "DEFENSE_SCHEDULE_PROPOSED"
                          ? "Duyệt lịch bảo vệ"
                          : status === "DEFENSE_SCHEDULE_APPROVED" || status === "DEFENSE_SCHEDULED"
                          ? "Nhập kết quả bảo vệ"
                          : status === "FINAL_FORM_SUBMITTED"
                          ? "Duyệt đề án cuối"
                          : "Duyệt";
                      })()}
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
      <Dialog 
        open={isDetailDialogOpen} 
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open);
          if (!open) {
            setRequestDetail(null);
            setIsTimelineExpanded(false);
          }
        }}
      >
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
                {/* Progress Overview - Clickable to toggle workflow timeline */}
                <div 
                  className="space-y-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                  onClick={() => setIsTimelineExpanded((prev) => !prev)}
                >
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
                  <p className="text-xs text-muted-foreground text-center">
                    {isTimelineExpanded ? "Nhấn để thu gọn" : "Nhấn để xem chi tiết quy trình"}
                  </p>
                </div>

                {isTimelineExpanded && selectedRequest && workflowSteps.length > 0 && (
                  <div className="space-y-4 rounded-lg border border-orange-100 bg-orange-50/40 p-4">
                    {(() => {
                      // Group history by step_code
                      const completedStepCodes = new Set(
                        workflowHistory.map((h) => h.stepCode).filter((code): code is string => Boolean(code))
                      );

                      const historyByStepCode = workflowHistory.reduce(
                        (acc, h) => {
                          if (!h.stepCode) return acc;
                          if (!acc[h.stepCode]) {
                            acc[h.stepCode] = [];
                          }
                          acc[h.stepCode].push(h);
                          return acc;
                        },
                        {} as Record<string, WorkflowHistoryResponse[]>
                      );

                      // Convert steps to display format
                      const timelineSteps = workflowSteps
                        .map((step) => ({
                          id: step.id,
                          label: step.name,
                          description: step.description || "",
                          icon: getIconForStepCode(step.code),
                          orderIndex: step.orderIndex,
                          code: step.code,
                        }))
                        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

                      if (timelineSteps.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Chưa có dữ liệu quy trình để hiển thị.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {timelineSteps.map((step, index) => {
                            const hasHistory = step.code ? completedStepCodes.has(step.code) : false;
                            const isCompleted = hasHistory || step.orderIndex < selectedRequest.currentStep;
                            const isCurrent = step.orderIndex === selectedRequest.currentStep;
                            const StepIcon = step.icon;
                            const stepHistories = step.code ? historyByStepCode[step.code] || [] : [];

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
                                  {index < timelineSteps.length - 1 && (
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
                                  {stepHistories.length > 0 && (
                                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                      {stepHistories.map((history) => (
                                        <p key={history.id}>
                                          <span className="font-medium">
                                            {history.actionDate
                                              ? new Date(history.actionDate).toLocaleString("vi-VN")
                                              : ""}
                                          </span>
                                          {history.comments && (
                                            <>
                                              {" — "}
                                              {history.comments}
                                            </>
                                          )}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <Separator />

                {/* Club Information */}
                {requestDetail && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Thông tin câu lạc bộ</h3>
                    <div className="space-y-3">
                      {requestDetail.clubName && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Tên CLB
                          </p>
                          <p className="text-sm">{requestDetail.clubName}</p>
                        </div>
                      )}
                      {requestDetail.clubCode && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Mã CLB
                          </p>
                          <p className="text-sm">{requestDetail.clubCode}</p>
                        </div>
                      )}
                      {requestDetail.clubCategory && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Lĩnh vực
                          </p>
                          <p className="text-sm">{requestDetail.clubCategory}</p>
                        </div>
                      )}
                      {requestDetail.description && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Mô tả
                          </p>
                          <p className="text-sm">{requestDetail.description}</p>
                        </div>
                      )}
                      {requestDetail.activityObjectives && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Đối tượng hướng tới
                          </p>
                          <p className="text-sm">{requestDetail.activityObjectives}</p>
                        </div>
                      )}
                      {requestDetail.expectedActivities && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Hoạt động dự kiến
                          </p>
                          <p className="text-sm">{requestDetail.expectedActivities}</p>
                        </div>
                      )}
                      {requestDetail.expectedMemberCount && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Số lượng thành viên dự kiến
                          </p>
                          <p className="text-sm">{requestDetail.expectedMemberCount} thành viên</p>
                        </div>
                      )}
                      {(requestDetail.email || requestDetail.phone) && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Thông tin liên hệ
                          </p>
                          <div className="space-y-1">
                            {requestDetail.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">{requestDetail.email}</p>
                              </div>
                            )}
                            {requestDetail.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm">{requestDetail.phone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {(requestDetail.facebookLink || requestDetail.instagramLink || requestDetail.tiktokLink) && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Mạng xã hội
                          </p>
                          <div className="space-y-1">
                            {requestDetail.facebookLink && (
                              <div>
                                <p className="text-xs text-muted-foreground">Facebook</p>
                                <a
                                  href={requestDetail.facebookLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {requestDetail.facebookLink}
                                </a>
                              </div>
                            )}
                            {requestDetail.instagramLink && (
                              <div>
                                <p className="text-xs text-muted-foreground">Instagram</p>
                                <a
                                  href={requestDetail.instagramLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {requestDetail.instagramLink}
                                </a>
                              </div>
                            )}
                            {requestDetail.tiktokLink && (
                              <div>
                                <p className="text-xs text-muted-foreground">TikTok</p>
                                <a
                                  href={requestDetail.tiktokLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {requestDetail.tiktokLink}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                                      Tải về
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
                        <div className="text-sm space-y-1">
                          <span className="block">
                            {new Date(defenseSchedule.defenseDate).toLocaleString("vi-VN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {defenseSchedule.defenseEndDate && (
                            <span className="block text-muted-foreground text-xs">
                              Đến{" "}
                              {new Date(defenseSchedule.defenseEndDate).toLocaleString("vi-VN", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
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

                {/* Contact Information - Student and Staff */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Thông tin liên hệ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requestDetail?.assignedStaffFullName && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Người xét duyệt
                          </p>
                          <p className="text-sm text-blue-700">{requestDetail.assignedStaffFullName}</p>
                          {requestDetail.assignedStaffEmail && (
                            <p className="text-xs text-blue-600 mt-1">{requestDetail.assignedStaffEmail}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Users className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Người gửi</p>
                        <p className="text-sm text-gray-700">{selectedRequest.requestedBy}</p>
                        {requestDetail?.createdByEmail && (
                          <p className="text-xs text-gray-600 mt-1">{requestDetail.createdByEmail}</p>
                        )}
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
                        onClick={() => openRequestProposalDialog(selectedRequest)}
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
                            <p className="text-xs text-muted-foreground text-center space-y-1">
                              <span className="block">
                                Chỉ có thể nhập kết quả sau khi thời gian bảo vệ đã qua.
                              </span>
                              <span className="block">
                                Thời gian bảo vệ:{" "}
                                {new Date(defenseSchedule.defenseDate).toLocaleString("vi-VN", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {defenseSchedule.defenseEndDate &&
                                  ` - ${new Date(defenseSchedule.defenseEndDate).toLocaleString("vi-VN", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`}
                              </span>
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
                        Duyệt đề án cuối & tạo CLB
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

      {/* Request Proposal Dialog */}
      <Dialog
        open={isRequestProposalDialogOpen}
        onOpenChange={(open) => {
          setIsRequestProposalDialogOpen(open);
          if (!open) {
            setProposalRequestTarget(null);
            setProposalRequestNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yêu cầu sinh viên nộp đề án</DialogTitle>
            <DialogDescription>
              {proposalRequestTarget?.clubName} - {proposalRequestTarget?.clubCode}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="proposalRequestNote">Ghi chú (tùy chọn)</Label>
            <Textarea
              id="proposalRequestNote"
              placeholder="Ví dụ: Nộp kế hoạch hoạt động chi tiết, dự trù kinh phí..."
              value={proposalRequestNote}
              onChange={(e) => setProposalRequestNote(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Ghi chú sẽ xuất hiện trong lịch sử quy trình để sinh viên biết cần chuẩn bị gì.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRequestProposalDialogOpen(false);
                setProposalRequestTarget(null);
                setProposalRequestNote("");
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleSubmitProposalRequest} disabled={isLoading}>
              Gửi yêu cầu
            </Button>
          </DialogFooter>
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
                  Đề án chi tiết: {selectedRequest?.clubName} 
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
                  {selectedProposal.fileUrl && (() => {
                    // Kiểm tra extension của file
                    const fileUrl = selectedProposal.fileUrl;
                    const fileExtension = fileUrl.split('.').pop()?.toLowerCase() || '';
                    
                    // Hàm để mở file trực tiếp trong trình duyệt
                    const openFileInBrowser = () => {
                      if (fileExtension === 'pdf') {
                        // PDF có thể mở trực tiếp
                        window.open(fileUrl, '_blank');
                      } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension)) {
                        // File Office: dùng Office Online Viewer
                        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
                        window.open(viewerUrl, '_blank');
                      } else {
                        // File khác: thử mở trực tiếp
                        window.open(fileUrl, '_blank');
                      }
                    };
                    
                    return (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">File đề án</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={openFileInBrowser}
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
                            Tải về
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
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

// Helper function to get icon for step code (same as ClubRequestDialog)
const getIconForStepCode = (code: string): React.ElementType => {
  const iconMap: Record<string, React.ElementType> = {
    REQUEST_SUBMITTED: FileText,
    REQUEST_REVIEW: Clock,
    PROPOSAL_REQUIRED: FileText,
    PROPOSAL_SUBMITTED: FileText,
    PROPOSAL_REVIEW: FileText,
    PROPOSE_DEFENSE_TIME: Calendar,
    DEFENSE_SCHEDULE_CONFIRMED: Calendar,
    DEFENSE_COMPLETED: Users,
    FINAL_FORM: FileText,
    FINAL_FORM_APPROVED: CheckCircle2,
    CLUB_CREATED: CheckCircle2,
  };
  return iconMap[code] || FileText;
};
