import { axiosClient } from "@/api/axiosClient";
import type {
  CreateReportRequirementRequest,
  ReportRequirementResponse,
  EventWithoutReportRequirementDto,
  ReportRequirementFilterRequest,
  PageResponse,
  ClubRequirementInfo,
  ReportFilterRequest,
  ReportListItemResponse,
  OfficerReportRequirementResponse,
} from "@/types/dto/reportRequirement.dto";
import type { ClubDto } from "@/service/EventService";
import type { ReportDetailResponse } from "@/types/dto/reportRequirement.dto";

// Re-export types for convenience
export type { ReportFilterRequest };

/**
 * Create a new report requirement
 * @param request - Report requirement data
 * @param file - Optional template file to upload
 */
export async function createReportRequirement(
  request: CreateReportRequirementRequest,
  file?: File
): Promise<ReportRequirementResponse> {
  // Always use FormData since backend endpoint requires multipart/form-data
  const formData = new FormData();

  // Create a Blob for the JSON request with correct content-type
  const requestBlob = new Blob([JSON.stringify(request)], {
    type: "application/json",
  });
  formData.append("request", requestBlob);

  // Only append file if provided (file is optional)
  if (file) {
    formData.append("file", file);
  }

  const response = await axiosClient.post<ReportRequirementResponse>(
    "/reports/staff/requirements",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // Increase timeout for file uploads
    }
  );
  if (!response.data) {
    throw new Error("Failed to create report requirement");
  }
  return response.data;
}

/**
 * Update report requirement request
 */
export interface UpdateReportRequirementRequest {
  title: string;
  description?: string;
  dueDate: string; // ISO datetime string (YYYY-MM-DDTHH:mm:ss)
}

/**
 * Update an existing report requirement
 * @param requirementId - Report requirement ID
 * @param request - Updated report requirement data
 * @param file - Optional template file to upload
 */
export async function updateReportRequirement(
  requirementId: number,
  request: UpdateReportRequirementRequest,
  file?: File
): Promise<ReportRequirementResponse> {
  // Always use FormData since backend endpoint requires multipart/form-data
  const formData = new FormData();

  // Create a Blob for the JSON request with correct content-type
  const requestBlob = new Blob([JSON.stringify(request)], {
    type: "application/json",
  });
  formData.append("request", requestBlob);

  // Only append file if provided (file is optional)
  if (file) {
    formData.append("file", file);
  }

  const response = await axiosClient.put<ReportRequirementResponse>(
    `/reports/staff/requirements/${requirementId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // Increase timeout for file uploads
    }
  );
  if (!response.data) {
    throw new Error("Failed to update report requirement");
  }
  return response.data;
}

/**
 * Get events without report requirement
 */
export async function getEventsWithoutReportRequirement(): Promise<
  EventWithoutReportRequirementDto[]
> {
  const response = await axiosClient.get<EventWithoutReportRequirementDto[]>(
    "/events/without-report-requirement"
  );
  if (!response.data) {
    throw new Error("Failed to get events without report requirement");
  }
  return response.data;
}

/**
 * Get all clubs (reuse from EventService)
 */
export async function getAllClubsForReport(): Promise<ClubDto[]> {
  const response = await axiosClient.get<ClubDto[]>("/events/get-all-club");
  if (!response.data) {
    throw new Error("Failed to get clubs");
  }
  return response.data;
}

/**
 * Get all report requirements with filters and pagination
 */
export async function getAllReportRequirements(
  request: ReportRequirementFilterRequest
): Promise<PageResponse<ReportRequirementResponse>> {
  const params = new URLSearchParams();

  if (request.reportType) params.append("reportType", request.reportType);
  if (request.clubId !== undefined)
    params.append("clubId", request.clubId.toString());
  if (request.keyword) params.append("keyword", request.keyword);
  if (request.page !== undefined)
    params.append("page", request.page.toString());
  if (request.size !== undefined)
    params.append("size", request.size.toString());
  if (request.sort) params.append("sort", request.sort);

  const response = await axiosClient.get<
    PageResponse<ReportRequirementResponse>
  >(`/reports/staff/requirements/filter?${params.toString()}`, {
    timeout: 30000, // Increase timeout for file uploads
  });
  if (!response.data) {
    throw new Error("Failed to get report requirements");
  }
  return response.data;
}

/**
 * Get a single report requirement by ID (for staff only)
 */
export async function getReportRequirementById(
  requirementId: number
): Promise<ReportRequirementResponse> {
  const response = await axiosClient.get<ReportRequirementResponse>(
    `/reports/staff/requirements/${requirementId}`
  );
  if (!response.data) {
    throw new Error("Failed to get report requirement");
  }
  return response.data;
}

/**
 * Get list of clubs that need to submit reports for a specific report requirement
 * Supports pagination and search by club name or code
 */
export async function getClubsByReportRequirement(
  requirementId: number,
  page: number = 0,
  size: number = 10,
  keyword?: string
): Promise<PageResponse<ClubRequirementInfo>> {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("size", size.toString());
  if (keyword) {
    params.append("keyword", keyword);
  }

  const response = await axiosClient.get<PageResponse<ClubRequirementInfo>>(
    `/reports/staff/requirements/${requirementId}/clubs?${params.toString()}`,
    { timeout: 30000 }
  );
  if (!response.data) {
    throw new Error("Failed to get clubs by report requirement");
  }
  return response.data;
}

/**
 * Get report of a specific club for a specific report requirement
 * Returns null if club hasn't submitted report yet
 */
export async function getClubReportByRequirement(
  requirementId: number,
  clubId: number
): Promise<ReportDetailResponse | null> {
  const response = await axiosClient.get<ReportDetailResponse | null>(
    `/reports/staff/requirements/${requirementId}/clubs/${clubId}/report`
  );
  return response.data ?? null;
}

/**
 * Club Report Requirement Filter Request
 */
export interface ClubReportRequirementFilterRequest {
  page?: number;
  size?: number;
  sort?: string;
  keyword?: string;
  status?: string; // OVERDUE, UNSUBMITTED, DRAFT, PENDING_CLUB, etc.
  semesterId?: number;
  teamId?: number; // Filter by team ID (for team officer to see only their assigned requirements)
}

/**
 * Get all report requirements for a club with filters and pagination (for CLUB_OFFICER or TEAM_OFFICER)
 * Returns optimized response with only essential fields
 */
export async function getClubReportRequirementsForOfficerWithFilters(
  clubId: number,
  request: ClubReportRequirementFilterRequest
): Promise<PageResponse<OfficerReportRequirementResponse>> {
  const params = new URLSearchParams();

  if (request.status) params.append("status", request.status);
  if (request.semesterId !== undefined)
    params.append("semesterId", request.semesterId.toString());
  if (request.keyword) params.append("keyword", request.keyword);
  if (request.teamId !== undefined)
    params.append("teamId", request.teamId.toString());
  if (request.page !== undefined)
    params.append("page", request.page.toString());
  if (request.size !== undefined)
    params.append("size", request.size.toString());
  if (request.sort) params.append("sort", request.sort);

  const response = await axiosClient.get<
    PageResponse<OfficerReportRequirementResponse>
  >(
    `/reports/club/${clubId}/requirements/officer/filter?${params.toString()}`,
    {
      timeout: 30000, // Increase timeout for file uploads
    }
  );
  if (!response.data) {
    throw new Error(
      "Failed to get club report requirements for officer with filters"
    );
  }
  return response.data;
}

/**
 * Get report of a specific club for a specific report requirement (for CLUB_OFFICER or TEAM_OFFICER)
 * Returns null if club hasn't submitted report yet
 */
export async function getClubReportByRequirementForOfficer(
  requirementId: number,
  clubId: number
): Promise<ReportDetailResponse | null> {
  const response = await axiosClient.get<ReportDetailResponse | null>(
    `/reports/club/${clubId}/requirements/${requirementId}/report`,
    {
      timeout: 30000, // Increase timeout for file uploads
    }
  );
  return response.data ?? null;
}

/**
 * Create a report (draft for team officer, can submit for club president)
 * Multipart/form-data endpoint
 * File upload is optional. If file is provided, it will be uploaded to Cloudinary.
 */
export interface CreateReportRequest {
  reportTitle: string;
  content?: string;
  fileUrl?: string;
  clubId: number;
  reportRequirementId: number;
  autoSubmit?: boolean;
}

export async function createReport(
  request: CreateReportRequest,
  file?: File
): Promise<ReportDetailResponse> {
  if (file) {
    // Upload with file using FormData
    const formData = new FormData();

    // Create a Blob for the JSON request with correct content-type
    const requestBlob = new Blob([JSON.stringify(request)], {
      type: "application/json",
    });
    formData.append("request", requestBlob);
    formData.append("file", file);

    const response = await axiosClient.post<ReportDetailResponse>(
      "/reports/club",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // Increase timeout for file uploads
      }
    );
    if (!response.data) {
      throw new Error("Failed to create report");
    }
    return response.data;
  } else {
    // Upload without file using JSON
    const formData = new FormData();
    const requestBlob = new Blob([JSON.stringify(request)], {
      type: "application/json",
    });
    formData.append("request", requestBlob);

    const response = await axiosClient.post<ReportDetailResponse>(
      "/reports/club",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    if (!response.data) {
      throw new Error("Failed to create report");
    }
    return response.data;
  }
}

/**
 * Update a draft report
 * Multipart/form-data endpoint
 * File upload is optional. If file is provided, it will be uploaded to Cloudinary.
 */
export interface UpdateReportRequest {
  reportTitle: string;
  content?: string;
  fileUrl?: string;
}

export async function updateReport(
  reportId: number,
  request: UpdateReportRequest,
  file?: File
): Promise<ReportDetailResponse> {
  // Always use FormData since backend endpoint requires multipart/form-data
  const formData = new FormData();

  // Create a Blob for the JSON request with correct content-type
  const requestBlob = new Blob([JSON.stringify(request)], {
    type: "application/json",
  });
  formData.append("request", requestBlob);

  // Only append file if provided (file is optional)
  if (file) {
    formData.append("file", file);
  }

  const response = await axiosClient.put<ReportDetailResponse>(
    `/reports/club/${reportId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // Increase timeout for file uploads
    }
  );
  if (!response.data) {
    throw new Error("Failed to update report");
  }
  return response.data;
}

/**
 * Submit a draft report (club president only)
 */
export interface SubmitReportRequest {
  reportId: number;
}

export async function submitReport(
  request: SubmitReportRequest
): Promise<ReportDetailResponse> {
  const response = await axiosClient.post<ReportDetailResponse>(
    "/reports/club/submit",
    request,
    { timeout: 30000 }
  );
  if (!response.data) {
    throw new Error("Failed to submit report");
  }
  return response.data;
}

/**
 * Delete a draft report (only creator can delete their own draft)
 */
export async function deleteReport(reportId: number): Promise<void> {
  const response = await axiosClient.delete<void>(`/reports/club/${reportId}`);
  if (response.code !== 200) {
    throw new Error(response.message || "Failed to delete report");
  }
}

/**
 * Review (approve/reject) a report at club level (for club president only)
 */
export interface ReviewReportByClubRequest {
  reportId: number;
  status: "PENDING_UNIVERSITY" | "REJECTED_CLUB";
  reviewerFeedback?: string;
}

export async function reviewReportByClub(
  request: ReviewReportByClubRequest
): Promise<ReportDetailResponse> {
  const response = await axiosClient.post<ReportDetailResponse>(
    "/reports/club/review",
    request
  );
  if (!response.data) {
    throw new Error("Failed to review report");
  }
  return response.data;
}

/**
 * Review (approve/reject) a report at university level (for staff only)
 */
export interface ReviewReportByStaffRequest {
  reportId: number;
  status: "APPROVED_UNIVERSITY" | "REJECTED_UNIVERSITY";
  reviewerFeedback?: string;
}

export async function reviewReportByStaff(
  request: ReviewReportByStaffRequest
): Promise<void> {
  const response = await axiosClient.post<void>(
    "/reports/staff/review",
    request
  );
  if (response.code !== 200) {
    throw new Error(response.message || "Failed to review report");
  }
}

/**
 * Get all reports with filters and pagination (for staff only)
 * Only returns reports with university-level status: PENDING_UNIVERSITY, APPROVED_UNIVERSITY, REJECTED_UNIVERSITY, RESUBMITTED_UNIVERSITY
 */
export async function getAllReports(
  request: ReportFilterRequest
): Promise<PageResponse<ReportListItemResponse>> {
  const params = new URLSearchParams();

  if (request.status) params.append("status", request.status.toString());
  if (request.clubId !== undefined)
    params.append("clubId", request.clubId.toString());
  if (request.semesterId !== undefined)
    params.append("semesterId", request.semesterId.toString());
  if (request.reportType) params.append("reportType", request.reportType);
  if (request.keyword) params.append("keyword", request.keyword);
  if (request.page !== undefined)
    params.append("page", request.page.toString());
  if (request.size !== undefined)
    params.append("size", request.size.toString());
  if (request.sort) params.append("sort", request.sort);

  const response = await axiosClient.get<PageResponse<ReportListItemResponse>>(
    `/reports/staff/filter?${params.toString()}`,
    { timeout: 30000 }
  );
  if (!response.data) {
    throw new Error("Failed to get reports");
  }
  return response.data;
}

/**
 * Get report detail by ID (for staff only)
 */
export async function getReportDetail(
  reportId: number
): Promise<ReportDetailResponse> {
  const response = await axiosClient.get<ReportDetailResponse>(
    `/reports/staff/${reportId}`
  );
  if (!response.data) {
    throw new Error("Failed to get report detail");
  }
  return response.data;
}

/**
 * Get all reports for a club (club president can see all, team officer can see their own)
 * Now supports filtering and pagination via GET request
 */
export async function getClubReports(
  request: ReportFilterRequest
): Promise<PageResponse<ReportListItemResponse>> {
  const params = new URLSearchParams();

  if (request.status) params.append("status", request.status.toString());
  if (request.semesterId !== undefined)
    params.append("semesterId", request.semesterId.toString());
  if (request.reportType) params.append("reportType", request.reportType);
  if (request.keyword) params.append("keyword", request.keyword);
  if (request.page !== undefined)
    params.append("page", request.page.toString());
  if (request.size !== undefined)
    params.append("size", request.size.toString());
  if (request.sort) params.append("sort", request.sort);

  const response = await axiosClient.get<PageResponse<ReportListItemResponse>>(
    `/reports/club/${request.clubId}?${params.toString()}`,
    {
      timeout: 30000, // Increase timeout for file uploads
    }
  );
  if (!response.data) {
    throw new Error("Failed to get club reports");
  }
  return response.data;
}

/**
 * Get my reports for a club (all reports created by current user)
 * Now supports filtering and pagination via GET request
 */
export async function getMyReports(
  request: ReportFilterRequest
): Promise<PageResponse<ReportListItemResponse>> {
  const params = new URLSearchParams();

  if (request.status) params.append("status", request.status.toString());
  if (request.semesterId !== undefined)
    params.append("semesterId", request.semesterId.toString());
  if (request.reportType) params.append("reportType", request.reportType);
  if (request.keyword) params.append("keyword", request.keyword);
  if (request.page !== undefined)
    params.append("page", request.page.toString());
  if (request.size !== undefined)
    params.append("size", request.size.toString());
  if (request.sort) params.append("sort", request.sort);

  const response = await axiosClient.get<PageResponse<ReportListItemResponse>>(
    `/reports/club/${request.clubId}/my-reports?${params.toString()}`
  );
  if (!response.data) {
    throw new Error("Failed to get my reports");
  }
  return response.data;
}

/**
 * Get report detail by report ID for club officers
 */
export async function getClubReportDetail(
  reportId: number,
  clubId: number
): Promise<ReportDetailResponse> {
  const response = await axiosClient.get<ReportDetailResponse>(
    `/reports/club/${clubId}/reports/${reportId}`
  );
  if (!response.data) {
    throw new Error("Failed to get report detail");
  }
  return response.data;
}

/**
 * Assign a team to a report requirement (for CLUB_OFFICER only)
 */
export interface AssignTeamToReportRequirementRequest {
  clubReportRequirementId: number;
  teamId: number;
}

export async function assignTeamToReportRequirement(
  clubId: number,
  request: AssignTeamToReportRequirementRequest
): Promise<ReportRequirementResponse> {
  const response = await axiosClient.post<ReportRequirementResponse>(
    `/reports/club/${clubId}/requirements/assign-team`,
    request
  );
  if (!response.data) {
    throw new Error("Failed to assign team to report requirement");
  }
  return response.data;
}
