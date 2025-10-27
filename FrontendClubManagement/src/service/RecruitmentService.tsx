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
  options?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentData {
  id: number;
  title: string;
  description: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  maxApplicants?: number;
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  requirements?: string;
  clubId: number;
  questions?: RecruitmentQuestionData[];
  teamOptionIds?: number[]; // Danh sách ID của các team cho phép sinh viên lựa chọn
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
  submittedDate: string;
  reviewedDate?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "INTERVIEW" | "SUBMITTED";
  reviewNotes?: string;
  score?: number;
  createdAt: string;
  updatedAt: string;
  answers?: ApplicationAnswerData[];
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
  page?: number;
  size?: number;
  sort?: string;
}

export interface ApplicationFilterRequest {
  status?: "PENDING" | "APPROVED" | "REJECTED" | "INTERVIEW";
  page?: number;
  size?: number;
  sort?: string;
}

export interface RecruitmentQuestionRequest {
  id?: number | null;
  questionText: string;
  questionType: string;
  questionOrder: number;
  options?: string[];
}

export interface RecruitmentCreateRequest {
  title: string;
  description: string;
  startDate: string; // ISO datetime string
  endDate: string;   // ISO datetime string
  maxApplicants?: number;
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
  const { status, page = 0, size = 10, sort = "startDate,desc" } = params;
  
  const queryParams = new URLSearchParams();
  if (status) queryParams.append("status", status);
  queryParams.append("page", page.toString());
  queryParams.append("size", size.toString());
  queryParams.append("sort", sort);

  const res = await axiosClient.get<PagedResponse<RecruitmentData>>(
    `/recruitments/clubs/${clubId}?${queryParams.toString()}`
  );
  
  if (!res.data) throw new Error("Empty response");
  return res.data;
}

// Get recruitment by ID
export async function getRecruitmentById(
  id: number
): Promise<RecruitmentData> {
  const res = await axiosClient.get<RecruitmentData>(`/recruitments/${id}`);
  if (!res.data) throw new Error("Recruitment not found");
  return res.data;
}

// Get applications for a recruitment
export async function getApplicationsByRecruitmentId(
  recruitmentId: number,
  params: ApplicationFilterRequest = {}
): Promise<PagedResponse<RecruitmentApplicationData>> {
  const { status, page = 0, size = 10, sort = "submittedDate,desc" } = params;
  
  const queryParams = new URLSearchParams();
  if (status) queryParams.append("status", status);
  queryParams.append("page", page.toString());
  queryParams.append("size", size.toString());
  queryParams.append("sort", sort);

  const res = await axiosClient.get<PagedResponse<RecruitmentApplicationData>>(
    `/recruitments/${recruitmentId}/applications?${queryParams.toString()}`
  );
  
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
    data
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
    data
  );
  if (!res.data) throw new Error("Failed to update recruitment");
  return res.data;
}

// Change recruitment status
export async function changeRecruitmentStatus(
  id: number,
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED"
): Promise<RecruitmentData> {
  const res = await axiosClient.patch<RecruitmentData>(
    `/recruitments/${id}/status?status=${status}`
  );
  if (!res.data) throw new Error("Failed to change recruitment status");
  return res.data;
}

// Delete recruitment
export async function deleteRecruitment(id: number): Promise<void> {
  await axiosClient.delete<void>(`/recruitments/${id}`);
}

// Submit application
export interface FormAnswerRequest {
  questionId: number;
  answerText?: string;
  fileUrl?: string;
}

export interface ApplicationSubmitRequest {
  recruitmentId: number;
  teamId?: number;
  answers: FormAnswerRequest[];
}

export async function submitApplication(
  request: ApplicationSubmitRequest,
  filesByQuestionId?: Map<number, File>
): Promise<RecruitmentApplicationData> {
  const formData = new FormData();
  
  // Add request as JSON blob
  formData.append(
    "request",
    new Blob([JSON.stringify(request)], { type: "application/json" })
  );
  
  // Add files with questionId mapping if provided
  if (filesByQuestionId && filesByQuestionId.size > 0) {
    filesByQuestionId.forEach((file, questionId) => {
      formData.append(`file_${questionId}`, file);
    });
  }
  
  const res = await axiosClient.post<RecruitmentApplicationData>(
    `/recruitments/applications/submit`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  if (!res.data) throw new Error("Failed to submit application");
  return res.data;
}

