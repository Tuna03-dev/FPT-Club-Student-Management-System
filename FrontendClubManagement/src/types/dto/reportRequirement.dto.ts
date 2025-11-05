// DTOs for Report Requirement feature

export enum ReportType {
  SEMESTER = "SEMESTER",
  EVENT = "EVENT",
  OTHER = "OTHER",
}

export interface CreateReportRequirementRequest {
  title: string;
  description?: string;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  reportType?: ReportType;
  templateUrl?: string;
  clubIds: number[];
  eventId?: number; // Optional: if this requirement is related to an event
}

export interface EventWithoutReportRequirementDto {
  eventId: number;
  eventTitle: string;
  clubId: number;
  clubName: string;
}

export interface ReportRequirementResponse {
  id: number;
  title: string;
  description?: string;
  dueDate: string;
  reportType?: ReportType;
  templateUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserInfo;
  clubRequirements?: ClubRequirementInfo[];
}

export interface UserInfo {
  id: number;
  fullName: string;
  email: string;
  studentCode?: string;
}

export interface ClubRequirementInfo {
  id: number;
  clubId: number;
  clubName: string;
  clubCode: string;
  status: string;
  note?: string;
}

// Frontend mapping types
export type FrontendReportType = "periodic" | "post-event" | "other";

// Filter request for getting report requirements
export interface ReportRequirementFilterRequest {
  page?: number;
  size?: number;
  sort?: string[];
  reportType?: ReportType;
  clubId?: number;
  keyword?: string;
}

// Page response wrapper
export interface PageResponse<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Helper function to map frontend type to backend type
export function mapFrontendToBackendReportType(
  type: FrontendReportType
): ReportType | undefined {
  switch (type) {
    case "periodic":
      return ReportType.SEMESTER;
    case "post-event":
      return ReportType.EVENT;
    case "other":
      return ReportType.OTHER;
    default:
      return undefined;
  }
}

// Helper function to map backend type to frontend type
export function mapBackendToFrontendReportType(
  type?: ReportType
): FrontendReportType {
  switch (type) {
    case ReportType.SEMESTER:
      return "periodic";
    case ReportType.EVENT:
      return "post-event";
    case ReportType.OTHER:
      return "other";
    default:
      return "periodic";
  }
}

