import axiosClient from "@/api/axiosClient";

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface RecruitmentQuestionData {
  id: number;
  questionText: string;
  questionType: string;
  questionOrder: number;
  isRequired?: number; // 0 = not required, 1 = required
  options?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamOptionData {
  id: number;
  teamName: string;
  description?: string;
}

export interface RecruitmentData {
  id: number;
  title: string;
  description: string;
  endDate: string; // ISO string - backend only has endDate
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  requirements?: string;
  clubId: number;
  questions?: RecruitmentQuestionData[];
  teamOptions?: TeamOptionData[]; // Danh sách team options cho phép sinh viên lựa chọn
  totalApplications?: number; // Tổng số đơn ứng tuyển đã nộp
  acceptedApplications?: number; // Số đơn đã được chấp nhận
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentApplicationData {
  id: number;
  recruitmentId: number;
  applicantId: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  studentId: string;
  teamId?: number;
  clubName?: string;
  recruitmentTitle?: string;
  teamName?: string;
  submittedDate: string;
  reviewedDate?: string;
  interviewTime?: string; // ISO string
  interviewAddress?: string;
  interviewPreparationRequirements?: string;
  status: "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "INTERVIEW";
  reviewNotes?: string;
  score?: number;
  createdAt: string;
  updatedAt: string;
  answers?: ApplicationAnswerData[];
}

// Lightweight interface for application list (without answers)
export interface RecruitmentApplicationListData {
  id: number;
  recruitmentId: number;
  applicantId: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  studentId: string;
  avatar?: string;
  teamId?: number;
  teamName?: string;
  submittedDate: string;
  interviewTime?: string; // ISO string
  interviewAddress?: string;
  interviewPreparationRequirements?: string;
  status: "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "INTERVIEW";
  reviewNotes?: string;
}

export interface ApplicationAnswerData {
  questionId: number;
  questionText: string;
  answerText?: string;
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentFilterRequest {
  status?: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  keyword?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ApplicationFilterRequest {
  status?: "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "INTERVIEW";
  keyword?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface RecruitmentQuestionRequest {
  id?: number | null;
  questionText: string;
  questionType: string;
  questionOrder: number;
  isRequired?: number; // 0 = not required, 1 = required
  options?: string[];
}

export interface RecruitmentCreateRequest {
  title: string;
  description: string;
  endDate: string; // ISO datetime string - backend only has endDate
  requirements?: string;
  status?: "DRAFT" | "OPEN"; // Status of recruitment
  questions?: RecruitmentQuestionRequest[];
  teamOptionIds?: number[]; // Danh sách ID của các team cho phép sinh viên lựa chọn
}

// Get all recruitments by club ID
export async function getRecruitmentsByClubId(
  clubId: number,
  params: RecruitmentFilterRequest = {}
): Promise<PagedResponse<RecruitmentData>> {
  const {
    status,
    keyword,
    page = 1,
    size = 10,
    sort = "endDate,desc",
  } = params;

  const queryParams = new URLSearchParams();
  if (status) queryParams.append("status", status);
  if (keyword && keyword.trim()) queryParams.append("keyword", keyword.trim());
  queryParams.append("page", page.toString());
  queryParams.append("size", size.toString());
  queryParams.append("sort", sort);

  const res = await axiosClient.get<PagedResponse<RecruitmentData>>(
    `/recruitments/clubs/${clubId}?${queryParams.toString()}`,
    {
      timeout: 30000, // 30 seconds
    }
  );

  if (!res.data) throw new Error("Empty response");
  return res.data;
}

// Get open recruitments by club ID
export async function getOpenRecruitmentsByClubId(
  clubId: number,
  params: RecruitmentFilterRequest = {}
): Promise<PagedResponse<RecruitmentData>> {
  const {
    status = "OPEN",
    keyword,
    page = 1,
    size = 10,
    sort = "endDate,desc",
  } = params;

  const queryParams = new URLSearchParams();
  if (status) queryParams.append("status", status);
  if (keyword && keyword.trim()) queryParams.append("keyword", keyword.trim());
  queryParams.append("page", page.toString());
  queryParams.append("size", size.toString());
  queryParams.append("sort", sort);

  const res = await axiosClient.get<PagedResponse<RecruitmentData>>(
    `/recruitments/clubs/${clubId}/open?${queryParams.toString()}`
  );

  if (!res.data) throw new Error("Empty response");
  return res.data;
}

// Get recruitment by ID
export async function getRecruitmentById(id: number): Promise<RecruitmentData> {
  const res = await axiosClient.get<RecruitmentData>(`/recruitments/${id}`);
  if (!res.data) throw new Error("Recruitment not found");
  return res.data;
}

// Get applications for a recruitment
export async function getApplicationsByRecruitmentId(
  recruitmentId: number,
  params: ApplicationFilterRequest = {}
): Promise<PagedResponse<RecruitmentApplicationListData>> {
  const {
    status,
    keyword,
    page = 1,
    size = 10,
    sort = "submittedDate,desc",
  } = params;

  const queryParams = new URLSearchParams();
  if (status) queryParams.append("status", status);
  if (keyword && keyword.trim()) queryParams.append("keyword", keyword.trim());
  queryParams.append("page", page.toString());
  queryParams.append("size", size.toString());
  queryParams.append("sort", sort);

  const res = await axiosClient.get<
    PagedResponse<RecruitmentApplicationListData>
  >(`/recruitments/${recruitmentId}/applications?${queryParams.toString()}`, {
    timeout: 30000, // 30 seconds
  });

  if (!res.data) throw new Error("Empty response");
  return res.data;
}

// Create recruitment
export async function createRecruitment(
  clubId: number,
  data: RecruitmentCreateRequest
): Promise<RecruitmentData> {
  const res = await axiosClient.post<RecruitmentData>(
    `/recruitments/clubs/${clubId}`,
    data,
    {
      timeout: 60000, // 60 seconds
    }
  );
  if (!res.data) throw new Error("Failed to create recruitment");
  return res.data;
}

// Update recruitment
export async function updateRecruitment(
  id: number,
  data: RecruitmentCreateRequest
): Promise<RecruitmentData> {
  const res = await axiosClient.put<RecruitmentData>(
    `/recruitments/${id}`,
    data,
    {
      timeout: 60000, // 60 seconds
    }
  );
  if (!res.data) throw new Error("Failed to update recruitment");
  return res.data;
}

// Change recruitment status
export async function changeRecruitmentStatus(
  id: number,
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED"
): Promise<void> {
  await axiosClient.patch<void>(`/recruitments/${id}/status?status=${status}`);
}

// Delete recruitment
export async function deleteRecruitment(id: number): Promise<void> {
  await axiosClient.delete<void>(`/recruitments/${id}`);
}

// Submit application
export interface FormAnswerRequest {
  questionId: number;
  answerText?: string;
  hasFile?: boolean; // Indicates whether this answer should use the uploaded file
}

export interface ApplicationSubmitRequest {
  recruitmentId: number;
  teamId?: number;
  answers: FormAnswerRequest[];
}

export async function submitApplication(
  request: ApplicationSubmitRequest,
  file?: File
): Promise<RecruitmentApplicationData> {
  const formData = new FormData();

  // Add request as JSON blob
  formData.append(
    "request",
    new Blob([JSON.stringify(request)], { type: "application/json" })
  );

  // Add single file if provided
  if (file) {
    formData.append("file", file);
  }

  const res = await axiosClient.post<RecruitmentApplicationData>(
    `/recruitments/applications/submit`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // 60 seconds
    }
  );
  if (!res.data) throw new Error("Failed to submit application");
  return res.data;
}

// Get my applications (for current user)
export async function getMyApplications(
  params: ApplicationFilterRequest = {}
): Promise<PagedResponse<RecruitmentApplicationListData>> {
  const {
    status,
    keyword,
    page = 1,
    size = 10,
    sort = "submittedDate,desc",
  } = params;

  const queryParams = new URLSearchParams();
  if (status) queryParams.append("status", status);
  if (keyword && keyword.trim()) queryParams.append("keyword", keyword.trim());
  queryParams.append("page", page.toString());
  queryParams.append("size", size.toString());
  queryParams.append("sort", sort);

  const res = await axiosClient.get<
    PagedResponse<RecruitmentApplicationListData>
  >(`/recruitments/myApplications?${queryParams.toString()}`, {
    timeout: 30000, // 30 seconds
  });

  if (!res.data) throw new Error("Empty response");
  return res.data;
}

// Get my application detail (for current user)
export async function getMyApplicationDetail(
  applicationId: number
): Promise<RecruitmentApplicationData> {
  const res = await axiosClient.get<RecruitmentApplicationData>(
    `/recruitments/myApplications/${applicationId}`
  );

  if (!res.data) throw new Error("Application not found");
  return res.data;
}

// Get application detail (for club officers)
export async function getApplicationDetail(
  applicationId: number
): Promise<RecruitmentApplicationData> {
  const res = await axiosClient.get<RecruitmentApplicationData>(
    `/recruitments/applications/${applicationId}`
  );

  if (!res.data) throw new Error("Application not found");
  return res.data;
}

// Review/Update application status
export interface ApplicationReviewRequest {
  applicationId: number;
  status: "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "INTERVIEW";
  reviewNotes?: string;
  interviewTime?: string; // ISO datetime string
  interviewAddress?: string;
  interviewPreparationRequirements?: string;
}

export async function updateApplicationStatus(
  applicationId: number,
  status: "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "INTERVIEW",
  reviewNotes?: string,
  interviewTime?: string,
  interviewAddress?: string,
  interviewPreparationRequirements?: string
): Promise<RecruitmentApplicationData> {
  const requestData: ApplicationReviewRequest = {
    applicationId,
    status,
    reviewNotes,
    interviewTime,
    interviewAddress,
    interviewPreparationRequirements,
  };

  const res = await axiosClient.post<RecruitmentApplicationData>(
    `/recruitments/applications/review`,
    requestData,
    {
      timeout: 30000, // 30 seconds
    }
  );

  // axiosClient returns ApiResponse<T>, so we need to access res.data for the actual data
  if (!res.data) throw new Error("Failed to update application status");
  return res.data;
}

// Update interview schedule
export interface InterviewUpdateRequest {
  applicationId: number;
  interviewTime?: string; // ISO datetime string
  interviewAddress?: string;
  interviewPreparationRequirements?: string;
}

export async function updateInterviewSchedule(
  applicationId: number,
  interviewTime?: string,
  interviewAddress?: string,
  interviewPreparationRequirements?: string
): Promise<RecruitmentApplicationData> {
  const requestData: InterviewUpdateRequest = {
    applicationId,
    interviewTime,
    interviewAddress,
    interviewPreparationRequirements,
  };

  const res = await axiosClient.put<RecruitmentApplicationData>(
    `/recruitments/applications/interview`,
    requestData,
    {
      timeout: 30000, // 30 seconds
    }
  );

  if (!res.data) throw new Error("Failed to update interview schedule");
  return res.data;
}

// Check application status
export interface ApplicationStatusCheckData {
  hasApplied: boolean;
}

export async function checkApplicationStatus(
  recruitmentId: number
): Promise<ApplicationStatusCheckData> {
  const res = await axiosClient.get<ApplicationStatusCheckData>(
    `/recruitments/${recruitmentId}/check-application`,
    {
      timeout: 30000, // 30 seconds
    }
  );

  if (!res.data) throw new Error("Failed to check application status");
  return res.data;
}
