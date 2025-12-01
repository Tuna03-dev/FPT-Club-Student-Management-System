import { axiosClient } from "./axiosClient";

// ===== Types =====
export type RequestEstablishmentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CONTACT_CONFIRMATION_PENDING"
  | "CONTACT_CONFIRMED"
  | "NAME_REVISION_REQUIRED"
  | "CONTACT_REJECTED"
  | "PROPOSAL_REQUIRED"
  | "PROPOSAL_SUBMITTED"
  | "PROPOSAL_REJECTED"
  | "PROPOSAL_APPROVED"
  | "DEFENSE_SCHEDULE_PROPOSED"
  | "DEFENSE_SCHEDULE_APPROVED"
  | "DEFENSE_SCHEDULE_REJECTED"
  | "DEFENSE_SCHEDULED"
  | "DEFENSE_COMPLETED"
  | "FEEDBACK_PROVIDED"
  | "FINAL_FORM_SUBMITTED"
  | "FINAL_FORM_REVIEWED"
  | "APPROVED"
  | "REJECTED";

export interface RequestEstablishmentResponse {
  id: number;
  clubName: string;
  clubCode: string;
  clubCategory: string;
  description: string;
  activityObjectives?: string;
  expectedActivities?: string;
  expectedMemberCount?: number;
  email?: string;
  phone?: string;
  facebookLink?: string;
  instagramLink?: string;
  tiktokLink?: string;
  status: RequestEstablishmentStatus;
  sendDate?: string;
  confirmationDeadline?: string;
  confirmedAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Created by info
  createdById: number;
  createdByFullName: string;
  createdByEmail: string;
  
  // Assigned staff info
  assignedStaffId?: number;
  assignedStaffFullName?: string;
  assignedStaffEmail?: string;
}

export interface CreateRequestEstablishmentRequest {
  clubName: string;
  clubCode: string;
  clubCategory: string;
  description: string;
  activityObjectives?: string;
  expectedActivities?: string;
  expectedMemberCount: number;
  email: string;
  phone: string;
  facebookLink?: string;
  instagramLink?: string;
  tiktokLink?: string;
}

export interface UpdateRequestEstablishmentRequest {
  clubName?: string;
  clubCode?: string;
  clubCategory?: string;
  description?: string;
  activityObjectives?: string;
  expectedActivities?: string;
  expectedMemberCount?: number;
  email?: string;
  phone?: string;
  facebookLink?: string;
  instagramLink?: string;
  tiktokLink?: string;
}

export interface ClubProposalResponse {
  id: number;
  title: string;
  fileUrl: string;
  requestEstablishmentId: number;
  clubId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitProposalRequest {
  title: string;
  fileUrl?: string;
  comment?: string;
}

export interface RenameClubPayload {
  newClubName: string;
}

export interface RequestNameRevisionPayload {
  comment?: string;
}

export interface DefenseScheduleResponse {
  id: number;
  defenseDate: string;
  defenseEndDate?: string;
  location?: string;
  meetingLink?: string;
  panelMembers?: string;
  notes?: string;
  result?: "PASSED" | "FAILED";
  feedback?: string;
  fapBookingId?: number;
  isAutoBooked: boolean;
  fapBookingStatus?: string;
  fapBookingLink?: string;
  requestEstablishmentId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProposeDefenseScheduleRequest {
  defenseDate: string;
  defenseEndDate: string;
  location?: string;
  meetingLink?: string;
  notes?: string;
}

export interface ClubCreationFinalFormResponse {
  id: number;
  formData: string; // JSON string
  status: string;
  submittedAt?: string;
  reviewedAt?: string;
  requestEstablishmentId: number;
  submittedById: number;
  submittedByFullName: string;
  submittedByEmail: string;
  reviewedById?: number;
  reviewedByFullName?: string;
  reviewedByEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitFinalFormRequest {
  title: string;
  fileUrl?: string;
  comment?: string;
}

export interface ClubCategory {
  id: number;
  categoryName: string;
}

export interface ClubCreationStepResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  orderIndex: number;
  active: boolean;
}

export interface WorkflowHistoryResponse {
  // Basic identifiers
  id: number;
  requestEstablishmentId: number;

  // New fields from BE DTO
  actionDate?: string; // Thời điểm hành động
  comments?: string; // Nội dung comment/ghi chú
  createdAt?: string;

  // Step info
  stepId?: number;
  stepCode?: string;
  stepName?: string;
  stepDescription?: string;

  // User info
  actedById?: number;
  actedByFullName?: string;
  actedByEmail?: string;

  // Legacy fields kept for backward compatibility (nếu BE còn trả về)
  history?: string;
  actedAt?: string;
}

// Staff APIs
export interface AssignRequestEstablishmentRequest {
  staffId: number;
}

export interface RejectContactRequest {
  reason?: string;
}

export interface RequestProposalPayload {
  comment?: string;
}

export interface RejectProposalRequest {
  reason?: string;
}

export interface RejectDefenseScheduleRequest {
  reason?: string;
}

export interface CompleteDefenseRequest {
  result: "PASSED" | "FAILED";
  feedback?: string;
}

// ===== Student APIs =====
export const clubCreationApi = {
  // Get club categories
  getClubCategories: async (): Promise<ClubCategory[]> => {
    const res = await axiosClient.get<ClubCategory[]>("/club-categories");
    if (res.code !== 200) throw new Error(res.message || "Không thể tải danh sách lĩnh vực");
    return res.data ?? [];
  },

  // Get club creation steps
  getClubCreationSteps: async (): Promise<ClubCreationStepResponse[]> => {
    const res = await axiosClient.get<ClubCreationStepResponse[]>("/club-creation/requests/steps");
    if (res.code !== 200) throw new Error(res.message || "Không thể tải danh sách bước quy trình");
    return res.data ?? [];
  },

  // Create request
  createRequest: async (
    data: CreateRequestEstablishmentRequest
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      "/club-creation/requests",
      data
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to create request");
    return res.data!;
  },

  // Get my requests
  getMyRequests: async (
    page: number = 0,
    size: number = 10
  ): Promise<{
    content: RequestEstablishmentResponse[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  }> => {
    const res = await axiosClient.get<{
      content: RequestEstablishmentResponse[];
      totalElements: number;
      totalPages: number;
    }>("/club-creation/requests", {
      params: { page, size },
    });
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch requests");
    return {
      content: res.data?.content ?? [],
      totalElements: res.data?.totalElements ?? 0,
      totalPages: res.data?.totalPages ?? 0,
      currentPage: page,
      pageSize: size,
    };
  },

  // Get request detail
  getRequestDetail: async (
    requestId: number
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.get<RequestEstablishmentResponse>(
      `/club-creation/requests/${requestId}`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch request detail");
    return res.data!;
  },

  // Update request
  updateRequest: async (
    requestId: number,
    data: UpdateRequestEstablishmentRequest
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.put<RequestEstablishmentResponse>(
      `/club-creation/requests/${requestId}`,
      data
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to update request");
    return res.data!;
  },

  // Delete request
  deleteRequest: async (requestId: number): Promise<void> => {
    const res = await axiosClient.delete(`/club-creation/requests/${requestId}`);
    if (res.code !== 200) throw new Error(res.message || "Failed to delete request");
  },

  // Submit request
  submitRequest: async (
    requestId: number
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/club-creation/requests/${requestId}/submit`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to submit request");
    return res.data!;
  },

  // Submit proposal
  submitProposal: async (
    requestId: number,
    data: SubmitProposalRequest,
    file?: File
  ): Promise<RequestEstablishmentResponse> => {
    const formData = new FormData();
    formData.append("title", data.title);
    if (data.fileUrl) {
      formData.append("fileUrl", data.fileUrl);
    }
    if (data.comment) {
      formData.append("comment", data.comment);
    }
    if (file) {
      formData.append("file", file);
    }

    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/club-creation/requests/${requestId}/proposal`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to submit proposal");
    return res.data!;
  },

  // Get proposals
  getProposals: async (
    requestId: number
  ): Promise<ClubProposalResponse[]> => {
    const res = await axiosClient.get<ClubProposalResponse[]>(
      `/club-creation/requests/${requestId}/proposals`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch proposals");
    return res.data ?? [];
  },

  // Get proposal detail
  getProposalDetail: async (
    requestId: number,
    proposalId: number
  ): Promise<ClubProposalResponse> => {
    const res = await axiosClient.get<ClubProposalResponse>(
      `/club-creation/requests/${requestId}/proposals/${proposalId}`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch proposal detail");
    return res.data!;
  },

  // Propose defense schedule
  proposeDefenseSchedule: async (
    requestId: number,
    data: ProposeDefenseScheduleRequest
  ): Promise<DefenseScheduleResponse> => {
    const res = await axiosClient.post<DefenseScheduleResponse>(
      `/club-creation/requests/${requestId}/defense-schedule/propose`,
      data
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to propose defense schedule");
    return res.data!;
  },

  // Get defense schedule
  getDefenseSchedule: async (
    requestId: number
  ): Promise<DefenseScheduleResponse> => {
    const res = await axiosClient.get<DefenseScheduleResponse>(
      `/club-creation/requests/${requestId}/defense-schedule`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch defense schedule");
    return res.data!;
  },

  // Update defense schedule
  updateDefenseSchedule: async (
    requestId: number,
    data: ProposeDefenseScheduleRequest
  ): Promise<DefenseScheduleResponse> => {
    const res = await axiosClient.put<DefenseScheduleResponse>(
      `/club-creation/requests/${requestId}/defense-schedule`,
      data
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to update defense schedule");
    return res.data!;
  },

  // Submit final form
  submitFinalForm: async (
    requestId: number,
    data: SubmitFinalFormRequest,
    file?: File
  ): Promise<ClubCreationFinalFormResponse> => {
    const formData = new FormData();
    formData.append("title", data.title);
    if (data.fileUrl) {
      formData.append("fileUrl", data.fileUrl);
    }
    if (data.comment) {
      formData.append("comment", data.comment);
    }
    if (file) {
      formData.append("file", file);
    }

    const res = await axiosClient.post<ClubCreationFinalFormResponse>(
      `/club-creation/requests/${requestId}/final-form`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    if (res.code !== 200) throw new Error(res.message || "Không thể nộp Hồ sơ hoàn thiện");
    return res.data!;
  },

  // Get final form history (all versions) for student
  getFinalForms: async (
    requestId: number
  ): Promise<ClubCreationFinalFormResponse[]> => {
    const res = await axiosClient.get<ClubCreationFinalFormResponse[]>(
      `/club-creation/requests/${requestId}/final-forms`
    );
    if (res.code !== 200) throw new Error(res.message || "Không thể tải danh sách Hồ sơ hoàn thiện");
    return res.data ?? [];
  },

  // Get workflow history
  getWorkflowHistory: async (
    requestId: number,
    page: number = 0,
    size: number = 20
  ): Promise<{ content: WorkflowHistoryResponse[]; totalElements: number; totalPages: number }> => {
    const res = await axiosClient.get<{
      content: WorkflowHistoryResponse[];
      totalElements: number;
      totalPages: number;
    }>(`/club-creation/requests/${requestId}/history`, {
      params: { page, size },
    });
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch workflow history");
    return res.data!;
  },

  // Submit name revision
  submitNameRevision: async (
    requestId: number,
    data: RenameClubPayload
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.put<RequestEstablishmentResponse>(
      `/club-creation/requests/${requestId}/rename`,
      data
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to update club name");
    return res.data!;
  },
};

// ===== Staff APIs =====
export const clubCreationStaffApi = {
  // Get pending requests
  getPendingRequests: async (
    page: number = 0,
    size: number = 20
  ): Promise<{ content: RequestEstablishmentResponse[]; totalElements: number; totalPages: number }> => {
    const res = await axiosClient.get<{
      content: RequestEstablishmentResponse[];
      totalElements: number;
      totalPages: number;
    }>("/staff/club-creation/requests/pending", {
      params: { page, size },
    });
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch pending requests");
    return res.data!;
  },

  // Get request detail
  getRequestDetail: async (
    requestId: number
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.get<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch request detail");
    return res.data!;
  },

  // Get final form history for staff (assigned request)
  getFinalForms: async (
    requestId: number
  ): Promise<ClubCreationFinalFormResponse[]> => {
    const res = await axiosClient.get<ClubCreationFinalFormResponse[]>(
      `/staff/club-creation/requests/${requestId}/final-forms`
    );
    if (res.code !== 200) throw new Error(res.message || "Không thể tải danh sách Hồ sơ hoàn thiện");
    return res.data ?? [];
  },

  // Approve final form and create club
  approveFinalForm: async (
    requestId: number
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/final-forms/approve`
    );
    if (res.code !== 200) throw new Error(res.message || "Không thể duyệt Hồ sơ hoàn thiện");
    return res.data!;
  },

  // Assign request
  assignRequest: async (
    requestId: number,
    data: AssignRequestEstablishmentRequest
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/assign`,
      data
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to assign request");
    return res.data!;
  },

  // Receive request
  receiveRequest: async (
    requestId: number
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/receive`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to receive request");
    return res.data!;
  },

  // Confirm contact
  confirmContact: async (
    requestId: number
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/contact/confirm`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to confirm contact");
    return res.data!;
  },

  // Reject contact
  rejectContact: async (
    requestId: number,
    data: RejectContactRequest
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/contact/reject`,
      data
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to reject contact");
    return res.data!;
  },

  // Request proposal
  requestProposal: async (
    requestId: number,
    data?: RequestProposalPayload
  ): Promise<RequestEstablishmentResponse> => {
    const payload =
      data && data.comment && data.comment.trim().length > 0
        ? { comment: data.comment.trim() }
        : {};
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/request-proposal`,
      payload
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to request proposal");
    return res.data!;
  },

  // Get submitted proposals for a specific request
  getSubmittedProposals: async (
    requestId: number
  ): Promise<ClubProposalResponse[]> => {
    const res = await axiosClient.get<ClubProposalResponse[]>(
      `/staff/club-creation/requests/${requestId}/proposals`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch proposals");
    return res.data ?? [];
  },

  // Get proposal detail
  getProposalDetail: async (
    requestId: number,
    proposalId: number
  ): Promise<ClubProposalResponse> => {
    const res = await axiosClient.get<ClubProposalResponse>(
      `/staff/club-creation/requests/${requestId}/proposals/${proposalId}`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch proposal detail");
    return res.data!;
  },

  // Approve proposal
  approveProposal: async (
    requestId: number
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/proposals/approve`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to approve proposal");
    return res.data!;
  },

  // Reject proposal
  rejectProposal: async (
    requestId: number,
    data: RejectProposalRequest
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/proposals/reject`,
      data
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to reject proposal");
    return res.data!;
  },

  // Get proposed defense schedules
  getProposedDefenseSchedules: async (
    requestId: number
  ): Promise<DefenseScheduleResponse[]> => {
    const res = await axiosClient.get<DefenseScheduleResponse[]>(
      `/staff/club-creation/requests/${requestId}/defense-schedules`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch defense schedules");
    return res.data ?? [];
  },

  // Get defense schedule
  getDefenseSchedule: async (
    requestId: number
  ): Promise<DefenseScheduleResponse> => {
    const res = await axiosClient.get<DefenseScheduleResponse>(
      `/staff/club-creation/requests/${requestId}/defense-schedule`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch defense schedule");
    return res.data!;
  },

  // Approve defense schedule
  approveDefenseSchedule: async (
    requestId: number
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/defense-schedule/approve`
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to approve defense schedule");
    return res.data!;
  },

  // Reject defense schedule
  rejectDefenseSchedule: async (
    requestId: number,
    data: RejectDefenseScheduleRequest
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/defense-schedule/reject`,
      data
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to reject defense schedule");
    return res.data!;
  },

  // Complete defense
  completeDefense: async (
    requestId: number,
    data: CompleteDefenseRequest
  ): Promise<RequestEstablishmentResponse> => {
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/defense/complete`,
      data
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to complete defense");
    return res.data!;
  },

  // Get workflow history
  getWorkflowHistory: async (
    requestId: number,
    page: number = 0,
    size: number = 20
  ): Promise<{ content: WorkflowHistoryResponse[]; totalElements: number; totalPages: number }> => {
    const res = await axiosClient.get<{
      content: WorkflowHistoryResponse[];
      totalElements: number;
      totalPages: number;
    }>(`/staff/club-creation/requests/${requestId}/history`, {
      params: { page, size },
    });
    if (res.code !== 200) throw new Error(res.message || "Failed to fetch workflow history");
    return res.data!;
  },

  // Request name revision
  requestNameRevision: async (
    requestId: number,
    data?: RequestNameRevisionPayload
  ): Promise<RequestEstablishmentResponse> => {
    const payload = data?.comment?.trim()
      ? { comment: data.comment.trim() }
      : {};
    const res = await axiosClient.post<RequestEstablishmentResponse>(
      `/staff/club-creation/requests/${requestId}/request-name-revision`,
      payload
    );
    if (res.code !== 200) throw new Error(res.message || "Failed to request name revision");
    return res.data!;
  },
};

