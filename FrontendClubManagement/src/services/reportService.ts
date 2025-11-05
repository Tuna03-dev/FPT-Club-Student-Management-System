import { axiosClient } from "@/api/axiosClient";
import type {
  CreateReportRequirementRequest,
  ReportRequirementResponse,
  EventWithoutReportRequirementDto,
  ReportRequirementFilterRequest,
  PageResponse,
  ClubRequirementInfo,
} from "@/types/dto/reportRequirement.dto";
import type { ClubDto } from "@/service/EventService";
import type { ReportDetailResponse } from "@/types/dto/reportRequirement.dto";

/**
 * Create a new report requirement
 * @param request - Report requirement data
 * @param file - Optional template file to upload
 */
export async function createReportRequirement(
  request: CreateReportRequirementRequest,
  file?: File
): Promise<ReportRequirementResponse> {
  if (file) {
    // Upload with file using FormData
    const formData = new FormData();
    
    // Create a Blob for the JSON request with correct content-type
    const requestBlob = new Blob([JSON.stringify(request)], {
      type: "application/json",
    });
    formData.append("request", requestBlob, "request.json");
    formData.append("file", file);

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
  } else {
    // Upload without file using JSON
    const response = await axiosClient.post<ReportRequirementResponse>(
      "/reports/staff/requirements",
      request
    );
    if (!response.data) {
      throw new Error("Failed to create report requirement");
    }
    return response.data;
  }
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
  const response = await axiosClient.get<ClubDto[]>(
    "/events/get-all-club"
  );
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
  const response = await axiosClient.post<PageResponse<ReportRequirementResponse>>(
    "/reports/staff/requirements/filter",
    request
  );
  if (!response.data) {
    throw new Error("Failed to get report requirements");
  }
  return response.data;
}

/**
 * Get list of clubs that need to submit reports for a specific report requirement
 */
export async function getClubsByReportRequirement(
  requirementId: number
): Promise<ClubRequirementInfo[]> {
  const response = await axiosClient.get<ClubRequirementInfo[]>(
    `/reports/staff/requirements/${requirementId}/clubs`
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

