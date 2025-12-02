import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useWebSocket, type ClubCreationWebSocketPayload } from "@/hooks/useWebSocket";
import {
  ClubRequestForm,
  type ClubRequestFormData,
} from "@/components/features/club/ClubRequestForm";
import {
  ClubRequestCard,
  type ClubRequest,
} from "@/components/features/club/ClubRequestCard";
import { ClubRequestDialog } from "@/components/features/club/ClubRequestDialog";
import {
  clubCreationApi,
  type RequestEstablishmentResponse,
  type ClubCreationFinalFormResponse,
  type ClubCreationStepResponse,
  type WorkflowHistoryResponse,
  type ClubCategory,
} from "@/api/clubCreation";
import { Button } from "@/components/ui/button";
import { Card} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, Send, Trash2, Edit, Calendar, Eye, Download } from "lucide-react";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { authService } from "@/services/authService";

// Helper function to map BE status to FE status
const mapStatusToFE = (status: string): ClubRequest["status"] => {
  const statusMap: Record<string, ClubRequest["status"]> = {
    DRAFT: "draft",
    SUBMITTED: "pending_review",
    CONTACT_CONFIRMATION_PENDING: "under_review",
    CONTACT_CONFIRMED: "under_review",
    NAME_REVISION_REQUIRED: "revision_required",
    CONTACT_REJECTED: "rejected",
    PROPOSAL_REQUIRED: "pending_documents",
    PROPOSAL_SUBMITTED: "documents_submitted",
    PROPOSAL_REJECTED: "revision_required",
    PROPOSAL_APPROVED: "documents_submitted",
    DEFENSE_SCHEDULE_PROPOSED: "defense_scheduled",
    DEFENSE_SCHEDULE_APPROVED: "defense_schedule_approved",
    DEFENSE_SCHEDULE_REJECTED: "revision_required",
    DEFENSE_SCHEDULED: "defense_scheduled",
    DEFENSE_COMPLETED: "defense_completed",
    FEEDBACK_PROVIDED: "defense_completed",
    FINAL_FORM_SUBMITTED: "final_form_submitted",
    FINAL_FORM_REVIEWED: "final_form_submitted",
    APPROVED: "approved",
    REJECTED: "rejected",
  };
  return statusMap[status] || "pending_review";
};

// Helper function to map status to step code
const getStepCodeFromStatus = (status: string): string | null => {
  const statusToStepCodeMap: Record<string, string> = {
    SUBMITTED: "REQUEST_SUBMITTED",
    CONTACT_CONFIRMATION_PENDING: "REQUEST_REVIEW",
    CONTACT_CONFIRMED: "REQUEST_REVIEW",
    NAME_REVISION_REQUIRED: "REQUEST_REVIEW",
    PROPOSAL_REQUIRED: "PROPOSAL_REQUIRED", // Nhân viên phòng IC-PDP đã yêu cầu, đang chờ sinh viên nộp
    PROPOSAL_SUBMITTED: "PROPOSAL_SUBMITTED",
    PROPOSAL_APPROVED: "PROPOSAL_REVIEW", // Nhân viên phòng IC-PDP đã duyệt đề án
    PROPOSAL_REJECTED: "PROPOSAL_REVIEW", // Đã trải qua bước Nhân viên phòng IC-PDP duyệt (dù bị từ chối)
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
// Calculate currentStep from workflow history (for rejected requests)
const getCurrentStepFromHistory = (
  history: WorkflowHistoryResponse[],
  steps: ClubCreationStepResponse[]
): number => {
  if (!history || history.length === 0) {
    return 1;
  }

  // Find the highest orderIndex from completed steps in history
  let maxStep = 1;
  for (const h of history) {
    if (h.stepCode) {
      const step = steps.find((s) => s.code === h.stepCode);
      if (step && step.orderIndex) {
        maxStep = Math.max(maxStep, step.orderIndex);
      }
    }
  }

  return maxStep;
};

const getCurrentStep = (
  status: string,
  steps: ClubCreationStepResponse[],
  workflowHistory?: WorkflowHistoryResponse[]
): number => {
  // For rejected requests, calculate from workflow history
  if (status === "REJECTED" || status === "CONTACT_REJECTED") {
    if (workflowHistory && workflowHistory.length > 0) {
      return getCurrentStepFromHistory(workflowHistory, steps);
    }
    return 1;
  }

  if (status === "DRAFT") {
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

// Convert BE response to FE ClubRequest
const convertToClubRequest = (
  response: RequestEstablishmentResponse,
  steps: ClubCreationStepResponse[],
  workflowHistory?: WorkflowHistoryResponse[]
): ClubRequest => {
  return {
    id: response.id.toString(),
    clubName: response.clubName,
    clubCode: response.clubCode,
    submittedDate: response.sendDate || response.createdAt,
    rawStatus: response.status,
    status: mapStatusToFE(response.status),
    currentStep: getCurrentStep(response.status, steps, workflowHistory),
    totalSteps: steps.length > 0 ? steps.length : 1,
    reviewer: response.assignedStaffFullName,
  };
};

const CreateClubPage = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [clubRequests, setClubRequests] = useState<ClubRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ClubRequest | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Pagination state (for client-side pagination of filtered results)
  // Separate page state for each tab
  const [pendingPage, setPendingPage] = useState(0);
  const [completedPage, setCompletedPage] = useState(0);
  const [rejectedPage, setRejectedPage] = useState(0);
  const [pageSize] = useState(6);

  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [isDefenseScheduleDialogOpen, setIsDefenseScheduleDialogOpen] = useState(false);
  const [isFinalFormDialogOpen, setIsFinalFormDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestEstablishmentResponse | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<ClubCreationStepResponse[]>([]);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryResponse[]>([]);
  // Request detail data
  const [requestDetail, setRequestDetail] = useState<RequestEstablishmentResponse | null>(null);
  const [proposals, setProposals] = useState<import("@/api/clubCreation").ClubProposalResponse[]>([]);
  const [defenseSchedule, setDefenseSchedule] = useState<import("@/api/clubCreation").DefenseScheduleResponse | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<import("@/api/clubCreation").ClubProposalResponse | null>(null);
  const [isProposalDetailDialogOpen, setIsProposalDetailDialogOpen] = useState(false);
  const [isNameRevisionDialogOpen, setIsNameRevisionDialogOpen] = useState(false);
  const [nameRevisionRequestId, setNameRevisionRequestId] = useState<number | null>(null);
  const [nameRevisionValue, setNameRevisionValue] = useState("");
  const [nameRevisionError, setNameRevisionError] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteRequestId, setDeleteRequestId] = useState<number | null>(null);

  // Proposal form state
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [proposalFileUrl, setProposalFileUrl] = useState("");
  const [proposalNote, setProposalNote] = useState("");

  // Defense schedule form state
  const [defenseDate, setDefenseDate] = useState("");
  const [defenseTime, setDefenseTime] = useState("");
  const [defenseEndTime, setDefenseEndTime] = useState("");
  const [defenseLocation, setDefenseLocation] = useState("");
  const [defenseMeetingLink, setDefenseMeetingLink] = useState("");
  const [defenseNotes, setDefenseNotes] = useState("");

  // Final form state
  const [finalFormTitle, setFinalFormTitle] = useState("");
  const [finalFormFile, setFinalFormFile] = useState<File | null>(null);
  const [finalFormFileUrl, setFinalFormFileUrl] = useState("");
  const [finalFormNote, setFinalFormNote] = useState("");
  const [finalFormHistory, setFinalFormHistory] = useState<ClubCreationFinalFormResponse[]>([]);
  const [isFinalFormHistoryLoading, setIsFinalFormHistoryLoading] = useState(false);
  const [clubCategories, setClubCategories] = useState<ClubCategory[]>([]);
  const [isEditCategoriesLoading, setIsEditCategoriesLoading] = useState(false);

  // WebSocket connection
  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToUserQueue } = useWebSocket(token);

  // 🔔 WebSocket: Real-time updates for Club Creation
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribeToUserQueue((msg) => {
      if (msg.type !== "CLUB_CREATION") return;

      const payload = msg.payload as ClubCreationWebSocketPayload;
      const requestId = payload.requestId;

      // Update request list
      loadRequests();

      // Show toast notification based on action
      switch (msg.action) {
        case "REQUEST_ASSIGNED":
          toast.info("Yêu cầu của bạn đã được nhận", {
            description: `Nhân viên phòng IC-PDP ${payload.assignedStaffName} đã nhận yêu cầu. Hạn xác nhận: ${payload.deadline ? new Date(payload.deadline).toLocaleString("vi-VN") : "N/A"}`,
          });
          break;
        case "CONTACT_CONFIRMED":
          toast.success("Liên hệ đã được xác nhận", {
            description: payload.message || "Nhân viên phòng IC-PDP đã xác nhận liên hệ với bạn",
          });
          break;
        case "CONTACT_REJECTED":
          toast.error("Yêu cầu bị từ chối", {
            description: payload.reason || payload.message || "Yêu cầu của bạn đã bị từ chối",
          });
          break;
        case "PROPOSAL_REQUIRED":
          toast.warning("Yêu cầu nộp đề án", {
            description: payload.comment || payload.message || "Nhân viên phòng IC-PDP yêu cầu bạn nộp đề án chi tiết",
          });
          break;
        case "NAME_REVISION_REQUIRED":
          toast.warning("Cần cập nhật tên CLB", {
            description: payload.comment || payload.message || "Nhân viên phòng IC-PDP yêu cầu bạn chỉnh sửa tên CLB",
          });
          break;
        case "PROPOSAL_APPROVED":
          toast.success("Đề án đã được duyệt", {
            description: payload.proposalTitle ? `Đề án "${payload.proposalTitle}" đã được duyệt` : payload.message,
          });
          break;
        case "PROPOSAL_REJECTED":
          toast.error("Đề án bị từ chối", {
            description: payload.reason || payload.message || "Đề án của bạn đã bị từ chối",
          });
          break;
        case "DEFENSE_SCHEDULE_APPROVED":
          toast.success("Lịch bảo vệ đã được duyệt", {
            description: payload.defenseDate 
              ? `Lịch bảo vệ: ${new Date(payload.defenseDate).toLocaleString("vi-VN")} - ${payload.location || "Chưa có địa điểm"}`
              : payload.message,
          });
          break;
        case "DEFENSE_SCHEDULE_REJECTED":
          toast.warning("Lịch bảo vệ bị từ chối", {
            description: payload.reason || payload.message || "Vui lòng đề xuất lại lịch bảo vệ",
          });
          break;
        case "DEFENSE_COMPLETED":
          if (payload.defenseResult === "PASSED") {
            toast.success("🎉 Bảo vệ thành công!", {
              description: payload.feedback || "Chúc mừng bạn đã vượt qua bảo vệ",
            });
          } else {
            toast.error("Bảo vệ không đạt", {
              description: payload.feedback || payload.message || "Rất tiếc, bạn chưa vượt qua bảo vệ",
            });
          }
          break;
        case "FINAL_FORM_SUBMITTED":
          // This is sent to staff, not student
          break;
        case "CLUB_CREATED":
          toast.success("🎉 Chúc mừng! CLB đã được thành lập", {
            description: payload.clubName 
              ? `CLB "${payload.clubName}" đã được thành lập thành công!`
              : payload.message,
            duration: 10000,
          });

          // Sau khi CLB được tạo, refresh token để cập nhật quyền (CLUB_PRESIDENT, CLUB_OFFICER, ...)
          (async () => {
            try {
              const res = await authService.refreshToken();
              if (res.code === 200 && res.data) {
                authService.setTokens(res.data.accessToken);
                if (res.data.user) {
                  authService.setUser(res.data.user);
                }
              }
            } catch (error) {
              console.error("Failed to refresh token after club creation:", error);
            } finally {
              // Dù refresh thành công hay không, vẫn điều hướng sang trang CLB mới nếu có clubId
              if (payload.clubId) {
                setTimeout(() => {
                  window.location.href = `/myclub/${payload.clubId}`;
                }, 2000);
              }
            }
          })();

          break;
        default:
          // Handle other actions silently or with generic message
          if (payload.message) {
            toast.info(payload.message);
          }
      }

      // If dialog is open and showing this request, refresh detail data
      if (isDialogOpen && selectedRequest && parseInt(selectedRequest.id) === requestId) {
        loadRequestDetailData(requestId);
        loadWorkflowHistory(requestId);
      }
    });

    return () => unsubscribe?.();
  }, [isConnected, isDialogOpen, selectedRequest, subscribeToUserQueue]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsEditCategoriesLoading(true);
        const categories = await clubCreationApi.getClubCategories();
        setClubCategories(categories);
      } catch (error: any) {
        toast.error("Không thể tải danh sách lĩnh vực", {
          description: error.message || "Đã xảy ra lỗi",
        });
      } finally {
        setIsEditCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);
  const loadFinalForms = async (requestId: number) => {
    try {
      setIsFinalFormHistoryLoading(true);
      const responses = await clubCreationApi.getFinalForms(requestId);
      setFinalFormHistory(responses);
    } catch (error: any) {
      toast.error("Không thể tải danh sách Hồ sơ hoàn thiện", {
        description: error.message || "Đã xảy ra lỗi",
      });
      setFinalFormHistory([]);
    } finally {
      setIsFinalFormHistoryLoading(false);
    }
  };

  const parseFinalFormData = (formData?: string): { title?: string; fileUrl?: string } => {
    if (!formData) return {};
    try {
      return JSON.parse(formData);
    } catch {
      return {};
    }
  };

  // Load final forms when final form dialog is opened (for history in submit dialog)
  useEffect(() => {
    if (isFinalFormDialogOpen && selectedRequest) {
      loadFinalForms(parseInt(selectedRequest.id));
    }
  }, [isFinalFormDialogOpen, selectedRequest]);

  // Load workflow steps
  const loadWorkflowSteps = async () => {
    try {
      const steps = await clubCreationApi.getClubCreationSteps();
      setWorkflowSteps(steps);
    } catch (error: any) {
      toast.error("Không thể tải danh sách bước quy trình", {
        description: error.message || "Đã xảy ra lỗi",
      });
      // Fallback to empty array
      setWorkflowSteps([]);
    }
  };

  // Load requests (load all, then paginate filtered results on client)
  const loadRequests = async () => {
    setIsLoading(true);
    try {
      let steps = workflowSteps;
      if (steps.length === 0) {
        steps = await clubCreationApi.getClubCreationSteps();
        setWorkflowSteps(steps);
      }

      // Load all requests (with large page size to get all)
      const response = await clubCreationApi.getMyRequests(0, 200);
      
      // Convert requests
      const convertedRequests = response.content.map((req) => convertToClubRequest(req, steps));
      
      // For rejected requests, load workflow history to calculate correct currentStep
      const rejectedRequests = convertedRequests.filter(
        (r) => r.rawStatus === "REJECTED" || r.rawStatus === "CONTACT_REJECTED"
      );
      
      // Load workflow history for rejected requests in parallel
      const historyPromises = rejectedRequests.map(async (req) => {
        try {
          const historyResponse = await clubCreationApi.getWorkflowHistory(
            parseInt(req.id),
            0,
            100
          );
          return {
            requestId: req.id,
            history: historyResponse.content,
          };
        } catch (error) {
          console.error(`Failed to load history for request ${req.id}:`, error);
          return {
            requestId: req.id,
            history: [],
          };
        }
      });
      
      const histories = await Promise.all(historyPromises);
      const historyMap = new Map(
        histories.map((h) => [h.requestId, h.history])
      );
      
      // Update currentStep for rejected requests based on history
      const updatedRequests = convertedRequests.map((req) => {
        if (
          (req.rawStatus === "REJECTED" || req.rawStatus === "CONTACT_REJECTED") &&
          historyMap.has(req.id)
        ) {
          const history = historyMap.get(req.id) || [];
          return {
            ...req,
            currentStep: getCurrentStep(req.rawStatus, steps, history),
          };
        }
        return req;
      });
      
      setClubRequests(updatedRequests);
    } catch (error: any) {
      toast.error("Không thể tải danh sách yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflowSteps();
  }, []);

  useEffect(() => {
    if (workflowSteps.length > 0) {
      loadRequests();
    }
  }, [workflowSteps]);

  // Handle page change (client-side pagination)
  const handlePageChange = (page: number) => {
    if (page >= 0) {
      if (activeTab === "pending") setPendingPage(page);
      else if (activeTab === "completed") setCompletedPage(page);
      else if (activeTab === "rejected") setRejectedPage(page);
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Load workflow history when dialog opens
  const loadWorkflowHistory = async (requestId: number) => {
    try {
      const historyData = await clubCreationApi.getWorkflowHistory(requestId, 0, 100);
      setWorkflowHistory(historyData.content || []);
    } catch (error: any) {
      console.error("Failed to load workflow history:", error);
      setWorkflowHistory([]);
    }
  };

  // Load request detail data when dialog opens
  const loadRequestDetailData = async (requestId: number) => {
    try {
      const [detail, proposalsData, defenseScheduleData, finalFormsData] = await Promise.all([
        clubCreationApi.getRequestDetail(requestId),
        clubCreationApi.getProposals(requestId).catch(() => []),
        clubCreationApi.getDefenseSchedule(requestId).catch(() => null),
        clubCreationApi.getFinalForms(requestId).catch(() => []),
      ]);
      setRequestDetail(detail);
      setProposals(Array.isArray(proposalsData) ? proposalsData : []);
      setDefenseSchedule(defenseScheduleData);
      setFinalFormHistory(Array.isArray(finalFormsData) ? finalFormsData : []);
    } catch (error: any) {
      console.error("Failed to load request detail data:", error);
      setRequestDetail(null);
      setProposals([]);
      setDefenseSchedule(null);
      setFinalFormHistory([]);
    }
  };

  useEffect(() => {
    if (isDialogOpen && selectedRequest) {
      const requestId = parseInt(selectedRequest.id);
      loadRequestDetailData(requestId);
      loadWorkflowHistory(requestId);
    } else if (!isDialogOpen) {
      setRequestDetail(null);
      setProposals([]);
      setDefenseSchedule(null);
      setWorkflowHistory([]);
    }
  }, [isDialogOpen, selectedRequest]);

  // Handle form submission (create request)
  const handleFormSubmit = async (formData: ClubRequestFormData) => {
    // Email pattern khớp với BE: ^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$
    const emailRegex = /^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$/;
    // Phone pattern khớp với BE: hỗ trợ 0[0-9]{9}, 84[0-9]{9}, +84[0-9]{9}
    const phoneRegex = /^(0[0-9]{9}|84[0-9]{9}|\+84[0-9]{9})$/;
    
    // Validate email nếu có
    if (formData.email && formData.email.trim()) {
      if (!emailRegex.test(formData.email.trim())) {
        toast.error("Email không hợp lệ", {
          description: "Vui lòng nhập đúng định dạng email.",
        });
        return;
      }
    }
    
    // Validate phone nếu có
    if (formData.phone && formData.phone.trim()) {
      const trimmedPhone = formData.phone.trim().replace(/[\s-]/g, "");
      if (!phoneRegex.test(trimmedPhone)) {
        toast.error("Số điện thoại không hợp lệ", {
          description: "Vui lòng nhập số điện thoại Việt Nam (bắt đầu bằng 0, 84 hoặc +84).",
        });
        return;
      }
    }
    try {
      setIsLoading(true);
      await clubCreationApi.createRequest({
      clubName: formData.clubName,
      clubCode: formData.clubCode,
        clubCategory: formData.category,
        description: formData.description,
        activityObjectives: formData.targetMembers || undefined,
        expectedMemberCount: formData.expectedMemberCount,
        email: formData.email,
        phone: formData.phone,
        facebookLink: formData.facebookLink || undefined,
        instagramLink: formData.instagramLink || undefined,
        tiktokLink: formData.tiktokLink || undefined,
      });
      toast.success("Đã tạo yêu cầu thành công!", {
        description: "Bạn có thể chỉnh sửa hoặc gửi yêu cầu khi đã sẵn sàng.",
      });
      await loadRequests();
      setActiveTab("pending");
    } catch (error: any) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      toast.error("Không thể tạo yêu cầu", {
        description: apiMessage || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openNameRevisionDialog = (request: ClubRequest) => {
    setNameRevisionRequestId(parseInt(request.id));
    setNameRevisionValue(request.clubName);
    setNameRevisionError("");
    setIsNameRevisionDialogOpen(true);
  };

  const handleSubmitNameRevision = async () => {
    if (!nameRevisionRequestId) return;
    const trimmedName = nameRevisionValue.trim();
    if (!trimmedName) {
      setNameRevisionError("Tên CLB không được để trống");
      return;
    }

    try {
      setIsLoading(true);
      await clubCreationApi.submitNameRevision(nameRevisionRequestId, {
        newClubName: trimmedName,
      });
      toast.success("Đã cập nhật tên CLB thành công!");
      setIsNameRevisionDialogOpen(false);
      setNameRevisionRequestId(null);
      await loadRequests();
    } catch (error: any) {
      toast.error("Không thể cập nhật tên CLB", {
        description:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  //
  // Handle submit request (DRAFT -> SUBMITTED)
  const handleSubmitRequest = async (requestId: number) => {
    try {
      setIsLoading(true);
      await clubCreationApi.submitRequest(requestId);
      toast.success("Đã gửi yêu cầu thành công!", {
        description: "Yêu cầu của bạn đang được xem xét.",
      });
      await loadRequests();
    } catch (error: any) {
      toast.error("Không thể gửi yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete request - open confirmation dialog
  const handleDeleteRequest = (requestId: number) => {
    setDeleteRequestId(requestId);
    setIsDeleteDialogOpen(true);
  };

  // Confirm and execute delete
  const confirmDeleteRequest = async () => {
    if (!deleteRequestId) return;

    try {
      setIsLoading(true);
      await clubCreationApi.deleteRequest(deleteRequestId);
      toast.success("Đã xóa yêu cầu thành công!");
      setIsDeleteDialogOpen(false);
      setDeleteRequestId(null);
      await loadRequests();
    } catch (error: any) {
      toast.error("Không thể xóa yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle update request
  const handleUpdateRequest = async () => {
    if (!editingRequest) return;

    // Validate required fields
    const clubName = editingRequest.clubName?.trim();
    if (!clubName || clubName.length === 0) {
      toast.error("Tên CLB không được để trống", {
        description: "Vui lòng nhập tên CLB.",
      });
      return;
    }

    const clubCategory = editingRequest.clubCategory?.trim();
    if (!clubCategory || clubCategory.length === 0) {
      toast.error("Danh mục CLB không được để trống", {
        description: "Vui lòng chọn lĩnh vực hoạt động.",
      });
      return;
    }

    if (!editingRequest.expectedMemberCount || editingRequest.expectedMemberCount <= 0) {
      toast.error("Số lượng thành viên dự kiến không hợp lệ", {
        description: "Số lượng thành viên dự kiến phải lớn hơn 0.",
      });
      return;
    }

    // Email pattern khớp với BE: ^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$
    const emailRegex = /^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})$/;
    // Phone pattern khớp với BE: hỗ trợ 0[0-9]{9}, 84[0-9]{9}, +84[0-9]{9}
    const phoneRegex = /^(0[0-9]{9}|84[0-9]{9}|\+84[0-9]{9})$/;

    // Validate email nếu có
    if (editingRequest.email && editingRequest.email.trim()) {
      if (!emailRegex.test(editingRequest.email.trim())) {
        toast.error("Email không hợp lệ", {
          description: "Vui lòng nhập đúng định dạng email.",
        });
        return;
      }
    }

    // Validate phone nếu có
    if (editingRequest.phone && editingRequest.phone.trim()) {
      const trimmedPhone = editingRequest.phone.trim().replace(/[\s-]/g, "");
      if (!phoneRegex.test(trimmedPhone)) {
        toast.error("Số điện thoại không hợp lệ", {
          description: "Vui lòng nhập số điện thoại Việt Nam (bắt đầu bằng 0, 84 hoặc +84).",
        });
        return;
      }
    }

    try {
      setIsLoading(true);
      await clubCreationApi.updateRequest(editingRequest.id, {
        clubName: editingRequest.clubName,
        clubCode: editingRequest.clubCode,
        clubCategory: editingRequest.clubCategory,
        description: editingRequest.description,
        activityObjectives: editingRequest.activityObjectives,
        expectedMemberCount: editingRequest.expectedMemberCount,
        email: editingRequest.email,
        phone: editingRequest.phone,
        facebookLink: editingRequest.facebookLink,
        instagramLink: editingRequest.instagramLink,
        tiktokLink: editingRequest.tiktokLink,
      });
      toast.success("Đã cập nhật yêu cầu thành công!");
      setEditingRequest(null);
      await loadRequests();
    } catch (error: any) {
      // Lấy error message từ BE response (có thể là trùng tên CLB, trùng mã CLB, etc.)
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Đã xảy ra lỗi";
      toast.error("Không thể cập nhật yêu cầu", {
        description: apiMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle defense schedule submission
  const handleDefenseScheduleSubmit = async () => {
    if (!selectedRequest) return;
    
    if (!defenseDate) {
      toast.error("Vui lòng chọn ngày bảo vệ!");
      return;
    }
    
    if (!defenseLocation.trim()) {
      toast.error("Vui lòng nhập địa điểm bảo vệ!");
      return;
    }

    if (!defenseTime) {
      toast.error("Vui lòng chọn giờ bắt đầu bảo vệ!");
      return;
    }

    if (!defenseEndTime) {
      toast.error("Vui lòng chọn giờ kết thúc bảo vệ!");
      return;
    }

    // Combine date and time
    const defenseDateTime = `${defenseDate}T${defenseTime}:00`;
    const defenseEndDateTime = `${defenseDate}T${defenseEndTime}:00`;

    if (new Date(defenseEndDateTime) <= new Date(defenseDateTime)) {
      toast.error("Giờ kết thúc phải muộn hơn giờ bắt đầu!");
      return;
    }

    try {
      setIsLoading(true);
      await clubCreationApi.proposeDefenseSchedule(parseInt(selectedRequest.id), {
        defenseDate: defenseDateTime,
        defenseEndDate: defenseEndDateTime,
        location: defenseLocation.trim(),
        meetingLink: defenseMeetingLink.trim() || undefined,
        notes: defenseNotes.trim() || undefined,
      });
      toast.success(
        selectedRequest.status === "revision_required" && selectedRequest.currentStep === 5
          ? "Đã gửi lại đề xuất lịch bảo vệ thành công!"
          : "Đã gửi đề xuất lịch bảo vệ thành công!"
      );
      setIsDefenseScheduleDialogOpen(false);
      // Reset form
      setDefenseDate("");
      setDefenseTime("");
      setDefenseEndTime("");
      setDefenseLocation("");
      setDefenseMeetingLink("");
      setDefenseNotes("");
      await loadRequests();
    } catch (error: any) {
      toast.error("Không thể gửi đề xuất lịch bảo vệ", {
        description: error.message || "Đã xảy ra lỗi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle submit proposal
  const handleSubmitProposal = async () => {
    if (!selectedRequest) return;
    if (!proposalTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề đề án!");
      return;
    }
    if (!proposalFile && !proposalFileUrl) {
      toast.error("Vui lòng upload file đề án hoặc nhập fileUrl!");
      return;
    }

    // Validate file size (max 20MB)
    if (proposalFile) {
      const maxFileSize = 20 * 1024 * 1024; // 20MB in bytes
      if (proposalFile.size > maxFileSize) {
        const fileSizeMB = (proposalFile.size / (1024 * 1024)).toFixed(2);
        toast.error("Dung lượng file quá lớn", {
          description: `Kích thước tối đa cho phép là 20MB. File của bạn: ${fileSizeMB} MB`,
        });
        return;
      }
    }

    try {
      setIsLoading(true);
      await clubCreationApi.submitProposal(
        parseInt(selectedRequest.id),
        {
          title: proposalTitle,
          fileUrl: proposalFileUrl || undefined,
          comment: proposalNote.trim() || undefined,
        },
        proposalFile || undefined
      );
      const proposalToastMessage =
        selectedRequest.status === "revision_required"
          ? "Đã nộp lại đề án thành công!"
          : selectedRequest.rawStatus === "PROPOSAL_SUBMITTED"
          ? "Đã cập nhật đề án thành công!"
          : "Đã nộp đề án thành công!";
      toast.success(proposalToastMessage);
      setIsProposalDialogOpen(false);
      setProposalTitle("");
      setProposalFile(null);
      setProposalFileUrl("");
      setProposalNote("");
      await loadRequests();
    } catch (error: any) {
      // Lấy error message từ BE response (có thể là file quá lớn, sai format, etc.)
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Đã xảy ra lỗi";
      toast.error("Không thể nộp đề án", {
        description: apiMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle submit final form
  const handleSubmitFinalForm = async () => {
    if (!selectedRequest) return;
    if (!finalFormTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề Hồ sơ hoàn thiện!");
      return;
    }
    if (!finalFormFile && !finalFormFileUrl) {
      toast.error("Vui lòng upload file Hồ sơ hoàn thiện hoặc nhập fileUrl!");
      return;
    }

    // Validate file size (max 20MB)
    if (finalFormFile) {
      const maxFileSize = 20 * 1024 * 1024; // 20MB in bytes
      if (finalFormFile.size > maxFileSize) {
        const fileSizeMB = (finalFormFile.size / (1024 * 1024)).toFixed(2);
        toast.error("Dung lượng file quá lớn", {
          description: `Kích thước tối đa cho phép là 20MB. File của bạn: ${fileSizeMB} MB`,
        });
        return;
      }
    }

    try {
      setIsLoading(true);
      await clubCreationApi.submitFinalForm(
        parseInt(selectedRequest.id),
        {
          title: finalFormTitle,
          fileUrl: finalFormFileUrl || undefined,
          comment: finalFormNote.trim() || undefined,
        },
        finalFormFile || undefined
      );
      const finalFormToastMessage =
        selectedRequest.rawStatus === "FINAL_FORM_SUBMITTED"
          ? "Đã cập nhật Hồ sơ hoàn thiện thành công!"
          : "Đã nộp Hồ sơ hoàn thiện thành công!";
      toast.success(finalFormToastMessage);
      setIsFinalFormDialogOpen(false);
      setFinalFormTitle("");
      setFinalFormFile(null);
      setFinalFormFileUrl("");
      setFinalFormNote("");
      await loadRequests();
    } catch (error: any) {
      // Lấy error message từ BE response (có thể là file quá lớn, sai format, etc.)
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Đã xảy ra lỗi";
      toast.error("Không thể nộp Hồ sơ hoàn thiện", {
        description: apiMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = (request: ClubRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  // Filter requests by status
  const pendingRequests = clubRequests.filter(
    (r) =>
      r.status === "draft" ||
      r.status === "pending_review" ||
      r.status === "under_review" ||
      r.status === "pending_documents" ||
      r.status === "documents_submitted" ||
      r.status === "defense_scheduled" ||
      r.status === "defense_schedule_approved" ||
      r.status === "defense_completed" ||
      r.status === "final_form_submitted" ||
      r.status === "revision_required"
  );

  const completedRequests = clubRequests.filter((r) => r.status === "approved");
  const rejectedRequests = clubRequests.filter((r) => r.status === "rejected");

  // Paginate filtered results
  const getPaginatedRequests = (requests: ClubRequest[], page: number) => {
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    return requests.slice(startIndex, endIndex);
  };

  const getTotalPages = (requests: ClubRequest[]) => {
    return Math.ceil(requests.length / pageSize);
  };

  // Get paginated requests for each tab
  const paginatedPendingRequests = getPaginatedRequests(pendingRequests, pendingPage);
  const paginatedCompletedRequests = getPaginatedRequests(completedRequests, completedPage);
  const paginatedRejectedRequests = getPaginatedRequests(rejectedRequests, rejectedPage);

  // Get request detail for actions
  const getRequestDetail = async (requestId: number) => {
    try {
      return await clubCreationApi.getRequestDetail(requestId);
    } catch (error: any) {
      toast.error("Không thể tải thông tin yêu cầu", {
        description: error.message || "Đã xảy ra lỗi",
      });
      return null;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Đăng ký thành lập CLB</h1>
        <p className="text-muted-foreground">
          Tạo câu lạc bộ mới và theo dõi quá trình xét duyệt
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">Tạo mới</TabsTrigger>
          <TabsTrigger value="pending">
            Đang xử lý
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Đã hoàn thành
            {completedRequests.length > 0 && (
              <span className="ml-2 bg-green-500 text-white rounded-full px-2 py-0.5 text-xs">
                {completedRequests.length}
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

        {/* Create new request tab */}
        <TabsContent value="create" className="space-y-6">
          <ClubRequestForm onSubmit={handleFormSubmit} />
        </TabsContent>

        {/* Pending requests tab */}
        <TabsContent value="pending" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Đang tải...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có đơn đăng ký nào đang xử lý</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedPendingRequests.map((request) => {
                  return (
                    <Card key={request.id} className="hover:shadow-lg transition-shadow">
                      <div className="p-4 space-y-4">
                  <ClubRequestCard
                    request={request}
                    onViewDetails={handleViewDetails}
                  />
                        <div className="flex gap-2">
                          {request.status === "draft" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={async () => {
                                  const detail = await getRequestDetail(parseInt(request.id));
                                  if (detail) {
                                    setEditingRequest(detail);
                                  }
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Sửa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleDeleteRequest(parseInt(request.id))}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => handleSubmitRequest(parseInt(request.id))}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Gửi
                              </Button>
                            </>
                          )}
                          {request.status === "pending_documents" && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsProposalDialogOpen(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Nộp đề án
                            </Button>
                          )}
                          {request.rawStatus === "NAME_REVISION_REQUIRED" && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => openNameRevisionDialog(request)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Cập nhật tên CLB
                            </Button>
                          )}
                          {request.rawStatus === "PROPOSAL_SUBMITTED" && (
                            <Button
                              size="sm"
                              className="flex-1"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsProposalDialogOpen(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Cập nhật đề án
                            </Button>
                          )}
                          {/* Nộp lại đề án khi bị yêu cầu chỉnh sửa đề án (PROPOSAL_REJECTED - step PROPOSAL_REVIEW) */}
                          {request.status === "revision_required" && request.currentStep === 5 && (
                            <Button
                              size="sm"
                              className="flex-1"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsProposalDialogOpen(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Nộp lại đề án
                            </Button>
                          )}
                          {/* Đề xuất / đề xuất lại lịch bảo vệ */}
                          {(
                            // Sau khi đề án đã được duyệt (PROPOSAL_APPROVED → documents_submitted, step PROPOSAL_REVIEW = 5)
                            (request.status === "documents_submitted" && request.currentStep === 5) ||
                            // Sau khi lịch bảo vệ bị từ chối (DEFENSE_SCHEDULE_REJECTED → revision_required, step >= 6)
                            (request.status === "revision_required" && request.currentStep >= 6)
                          ) ? (
                            <Button
                              size="sm"
                              className="flex-1"
                              variant={request.status === "revision_required" ? "outline" : "default"}
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsDefenseScheduleDialogOpen(true);
                              }}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {request.status === "revision_required"
                                ? "Đề xuất lại lịch bảo vệ"
                                : "Đề xuất lịch bảo vệ"}
                            </Button>
                          ) : null}
                          {(request.status === "defense_completed" ||
                            request.rawStatus === "FINAL_FORM_SUBMITTED") && (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsFinalFormDialogOpen(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              {request.rawStatus === "FINAL_FORM_SUBMITTED"
                                ? "Cập nhật Hồ sơ hoàn thiện"
                                : "Nộp Hồ sơ hoàn thiện"}
                            </Button>
                          )}
                        </div>
              </div>
                    </Card>
                  );
                })}
                </div>
              {pendingRequests.length > pageSize && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (pendingPage > 0) handlePageChange(pendingPage - 1);
                        }}
                        className={pendingPage === 0 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: getTotalPages(pendingRequests) }, (_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(i);
                          }}
                          isActive={pendingPage === i}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (pendingPage < getTotalPages(pendingRequests) - 1) handlePageChange(pendingPage + 1);
                        }}
                        className={pendingPage >= getTotalPages(pendingRequests) - 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </TabsContent>

        {/* Completed requests tab */}
        <TabsContent value="completed" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Đang tải...</p>
            </div>
          ) : completedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có CLB nào được phê duyệt</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCompletedRequests.map((request) => (
                  <ClubRequestCard
                    key={request.id}
                    request={request}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
              {completedRequests.length > pageSize && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (completedPage > 0) handlePageChange(completedPage - 1);
                        }}
                        className={completedPage === 0 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: getTotalPages(completedRequests) }, (_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(i);
                          }}
                          isActive={completedPage === i}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (completedPage < getTotalPages(completedRequests) - 1) handlePageChange(completedPage + 1);
                        }}
                        className={completedPage >= getTotalPages(completedRequests) - 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </TabsContent>

        {/* Rejected requests tab */}
        <TabsContent value="rejected" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Đang tải...</p>
            </div>
          ) : rejectedRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có đơn nào bị từ chối</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedRejectedRequests.map((request) => (
                  <ClubRequestCard
                    key={request.id}
                    request={request}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
              {rejectedRequests.length > pageSize && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (rejectedPage > 0) handlePageChange(rejectedPage - 1);
                        }}
                        className={rejectedPage === 0 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: getTotalPages(rejectedRequests) }, (_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(i);
                          }}
                          isActive={rejectedPage === i}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (rejectedPage < getTotalPages(rejectedRequests) - 1) handlePageChange(rejectedPage + 1);
                        }}
                        className={rejectedPage >= getTotalPages(rejectedRequests) - 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Request detail dialog */}
      <ClubRequestDialog
        request={selectedRequest}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        workflowSteps={workflowSteps}
        workflowHistory={workflowHistory}
        requestDetail={requestDetail}
        proposals={proposals}
        defenseSchedule={defenseSchedule}
        finalForms={finalFormHistory}
        onViewProposalDetail={(proposal) => {
          setSelectedProposal(proposal);
          setIsProposalDetailDialogOpen(true);
        }}
      />

      {/* Edit request dialog */}
      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingRequest && (
            <>
              <DialogHeader>
                <DialogTitle>Chỉnh sửa yêu cầu</DialogTitle>
                <DialogDescription>
                  Cập nhật thông tin yêu cầu thành lập CLB
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clubName">Tên CLB *</Label>
                    <Input
                      id="clubName"
                      value={editingRequest.clubName || ""}
                      onChange={(e) =>
                        setEditingRequest({ ...editingRequest, clubName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clubCode">Mã CLB *</Label>
                    <Input
                      id="clubCode"
                      value={editingRequest.clubCode || ""}
                      onChange={(e) =>
                        setEditingRequest({ ...editingRequest, clubCode: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clubCategory">Lĩnh vực hoạt động *</Label>
                  <Select
                    value={editingRequest.clubCategory || ""}
                    onValueChange={(value) =>
                      setEditingRequest({ ...editingRequest, clubCategory: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isEditCategoriesLoading ? "Đang tải..." : "Chọn lĩnh vực"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {isEditCategoriesLoading ? (
                        <div className="px-4 py-2 text-sm text-muted-foreground">
                          Đang tải...
                        </div>
                      ) : clubCategories.length > 0 ? (
                        clubCategories.map((category) => (
                          <SelectItem key={category.id} value={category.categoryName}>
                            {category.categoryName}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-muted-foreground">
                          Chưa có dữ liệu lĩnh vực
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả *</Label>
                  <Textarea
                    id="description"
                    value={editingRequest.description || ""}
                    onChange={(e) =>
                      setEditingRequest({ ...editingRequest, description: e.target.value })
                    }
                    rows={4}
                    placeholder="Mô tả hoạt động, mục tiêu của CLB..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activityObjectives">Đối tượng hướng tới *</Label>
                  <Input
                    id="activityObjectives"
                    value={editingRequest.activityObjectives || ""}
                    onChange={(e) =>
                      setEditingRequest({ ...editingRequest, activityObjectives: e.target.value })
                    }
                    placeholder="VD: Sinh viên yêu thích lập trình, muốn phát triển kỹ năng coding"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expectedMemberCount">Số lượng thành viên dự kiến *</Label>
                    <Input
                      id="expectedMemberCount"
                      type="number"
                      min="1"
                      value={editingRequest.expectedMemberCount ?? ""}
                      onChange={(e) =>
                        setEditingRequest({
                          ...editingRequest,
                          expectedMemberCount: e.target.value
                            ? parseInt(e.target.value, 10)
                            : undefined,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email liên hệ *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editingRequest.email || ""}
                      onChange={(e) =>
                        setEditingRequest({ ...editingRequest, email: e.target.value })
                      }
                      placeholder="club@fpt.edu.vn"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={editingRequest.phone || ""}
                      onChange={(e) =>
                        setEditingRequest({ ...editingRequest, phone: e.target.value })
                      }
                      placeholder="0123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Người phụ trách</Label>
                    <Input
                      value={editingRequest.createdByFullName || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Mạng xã hội (không bắt buộc)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      placeholder="Facebook URL"
                      value={editingRequest.facebookLink || ""}
                      onChange={(e) =>
                        setEditingRequest({ ...editingRequest, facebookLink: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Instagram URL"
                      value={editingRequest.instagramLink || ""}
                      onChange={(e) =>
                        setEditingRequest({
                          ...editingRequest,
                          instagramLink: e.target.value,
                        })
                      }
                    />
                    <Input
                      placeholder="TikTok URL"
                      value={editingRequest.tiktokLink || ""}
                      onChange={(e) =>
                        setEditingRequest({ ...editingRequest, tiktokLink: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingRequest(null)}>
                  Hủy
                </Button>
                <Button onClick={handleUpdateRequest}>Lưu</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit proposal dialog */}
      <Dialog
        open={isProposalDialogOpen}
        onOpenChange={(open) => {
          setIsProposalDialogOpen(open);
          if (!open) {
            // Reset form when closing dialog
            setProposalTitle("");
            setProposalFile(null);
            setProposalFileUrl("");
            setProposalNote("");
            setSelectedRequest(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.status === "revision_required"
                ? "Nộp lại đề án chi tiết"
                : selectedRequest?.rawStatus === "PROPOSAL_SUBMITTED"
                ? "Cập nhật đề án chi tiết"
                : "Nộp đề án chi tiết"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === "revision_required"
                ? "Vui lòng chỉnh sửa và nộp lại đề án theo yêu cầu của Nhân viên phòng IC-PDP"
                : selectedRequest?.rawStatus === "PROPOSAL_SUBMITTED"
                ? "Bạn có thể cập nhật file đề án mới trước khi Nhân viên phòng IC-PDP duyệt"
                : "Upload file đề án (Word, Excel, PDF, PowerPoint)"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proposalTitle">Tiêu đề đề án *</Label>
              <Input
                id="proposalTitle"
                value={proposalTitle}
                onChange={(e) => setProposalTitle(e.target.value)}
                placeholder="VD: Đề án thành lập CLB Lập trình FPT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposalFile">File đề án *</Label>
              <Input
                id="proposalFile"
                type="file"
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.zip"
                onChange={(e) => setProposalFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposalFileUrl">Hoặc File URL</Label>
              <Input
                id="proposalFileUrl"
                value={proposalFileUrl}
                onChange={(e) => setProposalFileUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposalNote">Ghi chú cho Nhân viên phòng IC-PDP (không bắt buộc)</Label>
              <Textarea
                id="proposalNote"
                value={proposalNote}
                onChange={(e) => setProposalNote(e.target.value)}
                placeholder="Ví dụ: Đã cập nhật phần kinh phí, vui lòng xem giúp em..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Ghi chú sẽ được lưu trong lịch sử quy trình để Nhân viên phòng IC-PDP hiểu rõ nội dung cập nhật.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProposalDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitProposal}>
              <Upload className="mr-2 h-4 w-4" />
              {selectedRequest?.status === "revision_required"
                ? "Nộp lại đề án"
                : selectedRequest?.rawStatus === "PROPOSAL_SUBMITTED"
                ? "Cập nhật đề án"
                : "Nộp đề án"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Defense schedule dialog */}
      <Dialog
        open={isDefenseScheduleDialogOpen}
        onOpenChange={(open) => {
          setIsDefenseScheduleDialogOpen(open);
          if (!open) {
            // Reset form when closing dialog
            setDefenseDate("");
            setDefenseTime("");
            setDefenseEndTime("");
            setDefenseLocation("");
            setDefenseMeetingLink("");
            setDefenseNotes("");
            setSelectedRequest(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.status === "revision_required"
                ? "Đề xuất lại lịch bảo vệ"
                : "Đề xuất lịch bảo vệ"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === "revision_required"
                ? "Vui lòng chỉnh sửa và đề xuất lại lịch bảo vệ theo yêu cầu của Nhân viên phòng IC-PDP"
                : "Vui lòng chọn ngày, thời gian và địa điểm để bảo vệ đề án thành lập CLB"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defenseDate">Ngày bảo vệ *</Label>
                <Input
                  id="defenseDate"
                  type="date"
                  value={defenseDate}
                  onChange={(e) => setDefenseDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]} // Tomorrow
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defenseTime">Giờ bắt đầu *</Label>
                <Input
                  id="defenseTime"
                  type="time"
                  value={defenseTime}
                  onChange={(e) => setDefenseTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defenseEndTime">Giờ kết thúc *</Label>
                <Input
                  id="defenseEndTime"
                  type="time"
                  value={defenseEndTime}
                  onChange={(e) => setDefenseEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defenseLocation">Địa điểm bảo vệ *</Label>
              <Input
                id="defenseLocation"
                value={defenseLocation}
                onChange={(e) => setDefenseLocation(e.target.value)}
                placeholder="VD: Phòng AL101, Tòa nhà Alpha"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defenseNotes">Ghi chú</Label>
              <Textarea
                id="defenseNotes"
                value={defenseNotes}
                onChange={(e) => setDefenseNotes(e.target.value)}
                placeholder="Thời gian cụ thể, yêu cầu đặc biệt..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDefenseScheduleDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleDefenseScheduleSubmit}>
              <Send className="mr-2 h-4 w-4" />
              {selectedRequest?.status === "revision_required"
                ? "Gửi lại đề xuất"
                : "Gửi đề xuất"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit final form dialog */}
      <Dialog
        open={isFinalFormDialogOpen}
        onOpenChange={(open) => {
          setIsFinalFormDialogOpen(open);
          if (!open) {
            setFinalFormTitle("");
            setFinalFormFile(null);
            setFinalFormFileUrl("");
            setFinalFormNote("");
            setSelectedRequest(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.rawStatus === "FINAL_FORM_SUBMITTED"
                ? "Cập nhật Hồ sơ hoàn thiện"
                : "Nộp Hồ sơ hoàn thiện"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.rawStatus === "FINAL_FORM_SUBMITTED"
                ? "Bạn có thể thay thế file Hồ sơ hoàn thiện trước khi Nhân viên phòng IC-PDP duyệt."
                : "Upload file Hồ sơ hoàn thiện (Word, Excel, PDF, PowerPoint)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="finalFormTitle">Tiêu đề Hồ sơ hoàn thiện *</Label>
              <Input
                id="finalFormTitle"
                value={finalFormTitle}
                onChange={(e) => setFinalFormTitle(e.target.value)}
                placeholder="VD: Hồ sơ hoàn thiện thành lập CLB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalFormFile">File Hồ sơ hoàn thiện *</Label>
              <Input
                id="finalFormFile"
                type="file"
                accept=".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.zip"
                onChange={(e) => setFinalFormFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalFormFileUrl">Hoặc File URL</Label>
              <Input
                id="finalFormFileUrl"
                value={finalFormFileUrl}
                onChange={(e) => setFinalFormFileUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalFormNote">Ghi chú cho Nhân viên phòng IC-PDP (không bắt buộc)</Label>
              <Textarea
                id="finalFormNote"
                value={finalFormNote}
                onChange={(e) => setFinalFormNote(e.target.value)}
                placeholder="Ví dụ: Đã bổ sung chữ ký, vui lòng kiểm tra giúp em..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Ghi chú sẽ hiển thị trong lịch sử quy trình để Nhân viên phòng IC-PDP hiểu nội dung cập nhật.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Lịch sử Hồ sơ hoàn thiện đã nộp</Label>
              {isFinalFormHistoryLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              ) : finalFormHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có form nào được nộp.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {finalFormHistory.map((form) => {
                    const data = parseFinalFormData(form.formData);
                    return (
                      <div
                        key={form.id}
                        className="rounded-md border p-3 text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{data.title || "Không rõ tiêu đề"}</p>
                          <span className="text-xs text-muted-foreground">
                            {form.submittedAt
                              ? new Date(form.submittedAt).toLocaleString("vi-VN")
                              : ""}
                          </span>
                        </div>
                        {data.fileUrl && (
                          <a
                            href={data.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-xs underline"
                          >
                            Xem file
                          </a>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Trạng thái: {form.status || "SUBMITTED"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinalFormDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitFinalForm}>
              <Upload className="mr-2 h-4 w-4" />
              {selectedRequest?.rawStatus === "FINAL_FORM_SUBMITTED"
                ? "Cập nhật Hồ sơ hoàn thiện"
                : "Nộp Hồ sơ hoàn thiện"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Name revision dialog */}
      <Dialog
        open={isNameRevisionDialogOpen}
        onOpenChange={(open) => {
          setIsNameRevisionDialogOpen(open);
          if (!open) {
            setNameRevisionRequestId(null);
            setNameRevisionError("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cập nhật tên câu lạc bộ</DialogTitle>
            <DialogDescription>
              Nhân viên phòng IC-PDP đã yêu cầu bạn cập nhật tên CLB để tiếp tục quy trình xét duyệt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="nameRevision">Tên CLB mới</Label>
              <Input
                id="nameRevision"
                value={nameRevisionValue}
                onChange={(e) => {
                  setNameRevisionValue(e.target.value);
                  if (nameRevisionError) {
                    setNameRevisionError("");
                  }
                }}
                placeholder="Nhập tên CLB đầy đủ"
              />
              {nameRevisionError && (
                <p className="text-sm text-destructive">{nameRevisionError}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Tên CLB phải duy nhất trong hệ thống và không vượt quá 100 ký tự.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNameRevisionDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitNameRevision}>Gửi tên mới</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proposal Detail Dialog */}
      <Dialog open={isProposalDetailDialogOpen} onOpenChange={setIsProposalDetailDialogOpen}>
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
                      } else if (fileExtension === 'zip') {
                        // File ZIP: download trực tiếp
                        window.open(fileUrl, '_blank');
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
                <Button variant="outline" onClick={() => setIsProposalDetailDialogOpen(false)}>
                  Đóng
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa yêu cầu này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteRequestId(null);
              }}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRequest}
              disabled={isLoading}
            >
              {isLoading ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreateClubPage;
