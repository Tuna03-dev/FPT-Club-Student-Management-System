// DTOs for Report Requirement feature

// report-types.ts
export type ReportType = "SEMESTER" | "EVENT" | "OTHER";

export interface CreateReportRequirementRequest {
  title: string;
  description?: string;
  dueDate: string; // ISO datetime string (YYYY-MM-DDTHH:mm:ss)
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
  clubRequirements?: ClubRequirementInfo[]; // Only populated in specific endpoints
  clubCount?: number; // Count of clubs - returned by getAllReportRequirements
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
  status: string; // ReportStatus enum from backend (DRAFT, PENDING_CLUB, etc.) or null if no report exists
  teamId?: number | null; // Team ID assigned to this requirement
  note?: string;
  report?: ReportInfo;
}

export interface ReportInfo {
  id: number;
  reportTitle: string;
  status?: string; // ReportStatus enum: DRAFT, PENDING_CLUB, APPROVED_CLUB, REJECTED_CLUB, UPDATED_PENDING_CLUB, PENDING_UNIVERSITY, APPROVED_UNIVERSITY, REJECTED_UNIVERSITY, RESUBMITTED_UNIVERSITY
  submittedDate?: string;
  createdAt: string;
  updatedAt: string;
  mustResubmit?: boolean;
  createdBy?: UserInfo;
}

// Report Detail Response
export interface ReportDetailResponse {
  id: number;
  reportTitle: string;
  content?: string;
  fileUrl?: string;
  status: string; // DRAFT, PENDING_CLUB, APPROVED_CLUB, REJECTED_CLUB, UPDATED_PENDING_CLUB, PENDING_UNIVERSITY, APPROVED_UNIVERSITY, REJECTED_UNIVERSITY, RESUBMITTED_UNIVERSITY
  submittedDate?: string;
  reviewedDate?: string;
  reviewerFeedback?: string;
  mustResubmit?: boolean;
  createdAt: string;
  updatedAt: string;
  club?: ClubInfo;
  semester?: SemesterInfo;
  createdBy?: UserInfo;
  reportRequirement?: ReportRequirementInfo;
}

export interface ClubInfo {
  id: number;
  clubName: string;
  clubCode: string;
}

export interface SemesterInfo {
  id: number;
  semesterName: string;
  semesterCode: string;
}

export interface ReportRequirementInfo {
  id: number;
  title: string;
  description?: string;
  dueDate: string;
  reportType?: ReportType;
  templateUrl?: string;
  createdBy?: UserInfo;
}

// Frontend mapping types
export type FrontendReportType = "periodic" | "post-event" | "other";

// Filter request for getting report requirements
export interface ReportRequirementFilterRequest {
  page?: number;
  size?: number;
  sort?: string;
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
      return "SEMESTER";
    case "post-event":
      return "EVENT";
    case "other":
      return "OTHER";
    default:
      return undefined;
  }
}

// Helper function to map backend type to frontend type
export function mapBackendToFrontendReportType(
  type?: ReportType
): FrontendReportType {
  switch (type) {
    case "SEMESTER":
      return "periodic";
    case "EVENT":
      return "post-event";
    case "OTHER":
      return "other";
    default:
      return "periodic";
  }
}

// Optimized Report Requirement Response for Officers (club officer/team officer)
export interface OfficerReportRequirementResponse {
  id: number; // submissionReportRequirementId
  title: string;
  description?: string;
  dueDate: string;
  reportType?: ReportType;
  templateUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  createdByName?: string;
  clubRequirement: {
    id: number; // clubReportRequirementId
    clubId: number;
    teamId?: number | null;
    report?: {
      id: number;
      status?: string; // ReportStatus enum
      mustResubmit?: boolean;
      createdBy?: number;
      createdByUserName: string;
    };
  };
}

// Report Status enum
// report-status.ts
export type ReportStatus =
  | "DRAFT"
  | "PENDING_CLUB"
  | "APPROVED_CLUB"
  | "REJECTED_CLUB"
  | "UPDATED_PENDING_CLUB"
  | "PENDING_UNIVERSITY"
  | "APPROVED_UNIVERSITY"
  | "REJECTED_UNIVERSITY"
  | "RESUBMITTED_UNIVERSITY";

// Report List Item Response (for staff to view all reports)
export interface ReportListItemResponse {
  id: number;
  reportTitle: string;
  content?: string;
  fileUrl?: string;
  status: string; // ReportStatus enum
  submittedDate?: string;
  reviewedDate?: string;
  mustResubmit?: boolean;
  createdAt: string;
  club?: ClubInfo;
  semester?: SemesterInfo;
  createdBy?: UserInfo;
}

// Filter request for getting reports (for staff)
export interface ReportFilterRequest {
  page?: number;
  size?: number;
  sort?: string;
  status?: ReportStatus | string; // Can be ReportStatus enum or string
  clubId?: number;
  semesterId?: number;
  reportType?: ReportType;
  keyword?: string;
}
