import axiosClient, { axiosInstance } from "@/api/axiosClient";

export interface EventData {
  id: number;
  title: string;
  description: string;
  location: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  isDraft: boolean;
  clubId: number;
  clubName?: string;
  mediaUrls: string[];
  mediaTypes?: string[]; // "IMAGE" or "VIDEO" - maps to mediaUrls by index
  mediaIds?: number[]; // IDs của media - maps to mediaUrls by index
  eventTypeId?: number;
  eventTypeName?: string;
}

export interface EventResponse {
  total: number;
  count: number;
  data: EventData[];
}

export interface EventFilterRequest {
  keyword?: string;
  eventTypeId?: number;
  clubId?: number;
  startTime?: string; // ISO
  endTime?: string;   // ISO
  page?: number;
  size?: number;
}

export interface EventTypeDto {
  id: number;
  typeName: string;
}

export interface ClubDto {
  id: number;
  clubName: string;
}

export async function getAllEventsByFilter(
  payload: EventFilterRequest
): Promise<EventResponse> {
  const res = await axiosClient.post<EventResponse>(
    "/events/get-all-by-filter",
    payload,
    { timeout: 30000 }
  );
  if (!res.data) throw new Error("Empty response");
  return res.data;
}

export async function getAllEventTypes(): Promise<EventTypeDto[]> {
  const res = await axiosClient.get<EventTypeDto[]>(
    "/events/get-all-event-types"
  );
  return res.data ?? [];
}

export async function getAllClubs(): Promise<ClubDto[]> {
  const res = await axiosClient.get<ClubDto[]>(
    "/events/get-all-club"
  );
  return res.data ?? [];
}

export async function getEventById(id: number): Promise<EventData> {
  const res = await axiosClient.get<EventData>(`/events/${id}`, { timeout: 30000 });
  if (!res.data) throw new Error("Event not found");
  return res.data;
}

export async function getEventsByClubId(clubId: number, params?: { startTime?: string; endTime?: string }): Promise<EventData[]> {
  const res = await axiosClient.get<EventData[]>(`/events/club/${clubId}`, { params, timeout: 30000 });
  return res.data ?? [];
}

/**
 * Staff: Lấy tất cả events (không cần check membership)
 */
export async function getStaffAllEvents(params?: { startTime?: string; endTime?: string }): Promise<EventData[]> {
  const res = await axiosClient.get<EventData[]>("/events/staff/all", { params, timeout: 30000 });
  return res.data ?? [];
}

/**
 * Staff: Lấy events theo clubId (không cần check membership)
 */
export async function getStaffEventsByClubId(clubId: number, params?: { startTime?: string; endTime?: string }): Promise<EventData[]> {
  const res = await axiosClient.get<EventData[]>(`/events/staff/club/${clubId}`, { params, timeout: 30000 });
  return res.data ?? [];
}

// ===== Staff Cancelled Events =====
export async function getStaffCancelledEvents(clubId?: number): Promise<EventData[]> {
  const res = await axiosClient.get<EventData[]>(`/events/staff/cancelled`, { params: clubId ? { clubId } : undefined, timeout: 30000 });
  return res.data ?? [];
}

export async function cancelClubEventByStaff(eventId: number, reason?: string): Promise<void> {
  await axiosClient.post<void>(`/events/${eventId}/cancel`, undefined, { params: reason ? { reason } : undefined });
}

export async function restoreCancelledEventByStaff(eventId: number): Promise<void> {
  await axiosClient.post<void>(`/events/${eventId}/restore`);
}

export async function deleteCancelledEventByStaff(eventId: number): Promise<void> {
  await axiosClient.delete<void>(`/events/${eventId}/staff-hard-delete`);
}

export type EventStatusFilter = "all" | "upcoming" | "ongoing" | "completed";

export function computeEventStatus(nowIso: string, startIso: string, endIso: string): EventStatusFilter {
  const now = new Date(nowIso).getTime();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end)) return "all";
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "ongoing";
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  location?: string;
  startTime: string; // e.g. 2025-11-05T09:00
  endTime: string;
  eventTypeId?: number;
  clubId?: number; // omit for staff
  images?: File[];
}

export async function createEvent(payload: CreateEventPayload): Promise<EventData> {
  const form = new FormData();
  form.append("title", payload.title);
  if (payload.description) form.append("description", payload.description);
  if (payload.location) form.append("location", payload.location);
  form.append("startTime", payload.startTime);
  form.append("endTime", payload.endTime);
  if (payload.eventTypeId != null) form.append("eventTypeId", String(payload.eventTypeId));
  // Only append clubId if provided (non-staff). Staff should omit clubId so event has no club.
  if (payload.clubId != null) form.append("clubId", String(payload.clubId));
  (payload.images ?? []).forEach((file) => form.append("mediaFiles", file));

  const res = await axiosClient.post<EventData>("/events/create", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000, // increase timeout for large image uploads
  });
  if (!res.data) throw new Error("Create event failed");
  return res.data;
}

export interface UpdateEventPayload {
  deleteMediaIds?: number[]; // IDs của media cần xóa
  title?: string;
  description?: string;
  location?: string;
  startTime?: string; // ISO string or datetime-local to be parsed backend
  endTime?: string;
  eventTypeId?: number;
  images?: File[]; // append
}

export async function updateEvent(eventId: number, payload: UpdateEventPayload): Promise<EventData> {
  const form = new FormData();
  if (payload.title != null) form.append("title", payload.title);
  if (payload.description != null) form.append("description", payload.description);
  if (payload.location != null) form.append("location", payload.location);
  if (payload.startTime != null) form.append("startTime", payload.startTime);
  if (payload.endTime != null) form.append("endTime", payload.endTime);
  if (payload.eventTypeId != null) form.append("eventTypeId", String(payload.eventTypeId));
  if (payload.deleteMediaIds != null && payload.deleteMediaIds.length > 0) {
    payload.deleteMediaIds.forEach((id) => form.append("deleteMediaIds", String(id)));
  }
  (payload.images ?? []).forEach((file) => form.append("mediaFiles", file));
  const res = await axiosClient.put<EventData>(`/events/${eventId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000, // increase timeout for large image uploads
  });
  if (!res.data) throw new Error("Update event failed");
  return res.data;
}

export async function deleteEvent(eventId: number): Promise<void> {
  await axiosClient.delete(`/events/${eventId}`);
}

// ===== Staff Publish Event =====
export async function publishEventByStaff(eventId: number): Promise<EventData> {
  const res = await axiosClient.post<EventData>(`/events/${eventId}/publish`, undefined, { timeout: 30000 });
  if (!res.data) throw new Error("Publish event failed");
  return res.data;
}

// ===== Pending Requests =====
export interface PendingRequestDto {
  requestEventId: number;
  requestTitle: string;
  status: string; // RequestStatus enum name
  responseMessage?: string;
  description?: string;
  requestDate: string; // ISO
  event: {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    eventTypeName?: string;
    isDraft: boolean;
  } | null;
  club: { id: number; name: string } | null;
  createdBy: { id: number; fullName: string } | null;
}

export async function getPendingRequests(clubId?: number): Promise<PendingRequestDto[]> {
  const params = clubId && clubId > 0 ? { clubId } : {};
  const res = await axiosClient.get<PendingRequestDto[]>("/events/pending-requests", {
    params,
    timeout: 30000
  });
  return res.data ?? [];
}

// ===== Approvals =====
export async function approveByClub(
  requestEventId: number,
  approve: boolean,
  responseMessage?: string
): Promise<void> {
  await axiosClient.post<void>("/events/approve/club", {
    requestEventId,
    status: approve ? "APPROVED_CLUB" : "REJECTED_CLUB",
    responseMessage,
  });
}

export async function approveByUniversity(
  requestEventId: number,
  approve: boolean,
  responseMessage?: string
): Promise<void> {
  await axiosClient.post<void>("/events/approve/university", {
    requestEventId,
    status: approve ? "APPROVED_UNIVERSITY" : "REJECTED_UNIVERSITY",
    responseMessage,
  });
}

export interface MyDraftEventDto {
  event: EventData;
  requestStatus: string; // RequestStatus enum name
}

export async function getMyDraftEvents(clubId?: number): Promise<MyDraftEventDto[]> {
  const params = clubId ? { clubId } : undefined;
  const res = await axiosClient.get<MyDraftEventDto[]>("/events/my-draft-events", { params, timeout: 30000 });
  return res.data ?? [];
}

// ===== Event Registration =====
export async function registerForEvent(eventId: number): Promise<void> {
  await axiosClient.post<void>(`/events/${eventId}/register`);
}

export async function cancelEventRegistration(eventId: number): Promise<void> {
  await axiosClient.delete<void>(`/events/${eventId}/register`);
}

export async function getRegistrationStatus(eventId: number): Promise<boolean> {
  const res = await axiosClient.get<boolean>(`/events/${eventId}/registration-status`);
  return res.data ?? false;
}

export async function getEventRegistrationCount(eventId: number): Promise<number> {
  const res = await axiosClient.get<number>(`/events/${eventId}/registration-count`);
  return res.data ?? 0;
}

// ===== Event Attendance =====
export interface EventRegistrationDto {
  id: number;
  userId: number;
  fullName: string;
  studentCode: string;
  email: string;
  avatarUrl?: string;
  registrationTime: string; // ISO
  attendanceStatus?: string; // "REGISTERED" | "PRESENT" | "ABSENT"
  checkInTime?: string; // ISO
  notes?: string;
}

export async function getEventRegistrations(eventId: number, keyword?: string): Promise<EventRegistrationDto[]> {
  const res = await axiosClient.get<EventRegistrationDto[]>(`/events/${eventId}/registrations`, {
    params: keyword ? { keyword } : undefined,
  });
  return res.data ?? [];
}

export interface BatchMarkAttendanceItem {
  userId: number;
  attendanceStatus: "PRESENT" | "ABSENT";
  notes?: string;
}

export interface BatchMarkAttendanceRequest {
  eventId: number;
  attendances: BatchMarkAttendanceItem[];
}

export async function batchMarkAttendance(payload: BatchMarkAttendanceRequest): Promise<void> {
  await axiosClient.post<void>("/events/batch-mark-attendance", payload);
}

/**
 * Export danh sách điểm danh sự kiện ra file Excel
 * @param eventId ID của sự kiện
 * @returns Blob chứa file Excel
 */
export async function exportAttendanceExcel(eventId: number): Promise<Blob> {
  // Dùng axiosInstance trực tiếp để tránh wrapper parse JSON
  // axiosInstance đã được import ở đầu file
  const res = await axiosInstance.get(`/events/${eventId}/attendance/export-excel`, {
    responseType: 'blob',
    timeout: 60000, // Tăng timeout cho file lớn
  });
  
  // Kiểm tra xem response có phải là blob không
  if (res.data instanceof Blob) {
    return res.data;
  }
  
  // Nếu không phải blob, có thể là JSON error message - thử parse để lấy error
  if (typeof res.data === 'string') {
    try {
      const errorData = JSON.parse(res.data);
      throw new Error(errorData.message || errorData.data?.message || "Không thể xuất file Excel");
    } catch {
      throw new Error("Response is not a valid Excel file");
    }
  }
  
  throw new Error("Response is not a valid Excel file");
}

// ===== Paginated Response =====
export interface PagedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Lấy danh sách events đã được publish của một câu lạc bộ với phân trang và tìm kiếm
 */
export async function getPublishedEventsByClubId(
  clubId: number,
  keyword?: string,
  page: number = 0,
  size: number = 10,
  sort: string = "startTime,desc"
): Promise<PagedResponse<EventData>> {
  const res = await axiosClient.get<PagedResponse<EventData>>(
    `/events/clubs/${clubId}/published`,
    {
      params: { keyword, page, size, sort },
      timeout: 30000,
    }
  );
  if (!res.data) throw new Error("Empty response");
  return res.data;
}
