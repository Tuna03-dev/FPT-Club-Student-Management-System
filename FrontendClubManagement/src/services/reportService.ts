import { axiosClient } from "@/api/axiosClient";
import type {
  CreateReportRequirementRequest,
  ReportRequirementResponse,
  EventWithoutReportRequirementDto,
  ReportRequirementFilterRequest,
  PageResponse,
} from "@/types/dto/reportRequirement.dto";
import type { ClubDto } from "@/service/EventService";

/**
 * Create a new report requirement
 */
export async function createReportRequirement(
  request: CreateReportRequirementRequest
): Promise<ReportRequirementResponse> {
  const response = await axiosClient.post<ReportRequirementResponse>(
    "/reports/staff/requirements",
    request
  );
  if (!response.data) {
    throw new Error("Failed to create report requirement");
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

