import axiosClient from "@/api/axiosClient";

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
    payload
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
  const res = await axiosClient.get<EventData>(`/events/${id}`);
  if (!res.data) throw new Error("Event not found");
  return res.data;
}

export async function getEventsByClubId(clubId: number): Promise<EventData[]> {
  const res = await axiosClient.get<EventData[]>(`/events/club/${clubId}`);
  return res.data ?? [];
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
  });
  if (!res.data) throw new Error("Create event failed");
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

export async function getPendingRequests(): Promise<PendingRequestDto[]> {
  const res = await axiosClient.get<PendingRequestDto[]>("/events/pending-requests");
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

