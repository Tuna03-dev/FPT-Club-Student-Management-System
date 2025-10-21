import axiosClient from "@/api/axiosClient";

export interface EventData {
  id: number;
  title: string;
  description: string;
  location: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  draft: boolean;
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
  startTime?: string; // ISO
  endTime?: string;   // ISO
  page?: number;
  size?: number;
}

export interface EventTypeDto {
  id: number;
  typeName: string;
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

export async function getEventById(id: number): Promise<EventData> {
  const res = await axiosClient.get<EventData>(`/events/${id}`);
  if (!res.data) throw new Error("Event not found");
  return res.data;
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

