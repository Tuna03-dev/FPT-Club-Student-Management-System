"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { EventDetailModal } from "./event-detail-modal";
import {
  type EventData,
  getEventsByClubId,
  getStaffEventsByClubId,
  getStaffAllEvents,
  createEvent,
  getAllEventTypes,
  getPendingRequests,
  type PendingRequestDto,
  getMyDraftEvents,
  type MyDraftEventDto,
  getStaffCancelledEvents,
  getRegistrationStatus,
} from "@/service/EventService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateEventForm } from "./create-event-form";
import { authService } from "@/services/authService";
import { useClubPermissions } from "@/hooks/useClubPermissions";
import { EventCalendarGrid, type CalendarEvent } from "./EventCalendarGrid";
import { EventCalendarSidebar } from "./EventCalendarSidebar";
import { useWebSocket, type EventWebSocketPayload } from "@/hooks/useWebSocket";

// Helper to normalize error messages
const getErrorMessage = (
  error: unknown,
  fallback = "Đã xảy ra lỗi"
): string => {
  const anyErr = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return anyErr?.response?.data?.message || anyErr?.message || fallback;
};

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  attendees: number;
  status: "upcoming" | "ongoing" | "completed";
  images: string[];
  isMyDraft?: boolean;
  requestStatus?: string;
  eventTypeName?: string;
  isPendingPublish?: boolean;
  clubId?: number;
  clubName?: string;
  isRegistered?: boolean; // Cache registration status
}
interface EventFormValues {
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  eventType: string;
  eventImages: File[];
}

interface EventCalendarProps {
  clubId: number;
}

const EVENT_PRIVILEGED_ROLES = [
  "CLUB_OFFICER",
  "TEAM_OFFICER",
  "CLUB_TREASURE",
  "CLUB_TREASURER",
];

export function EventCalendar({ clubId }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedReadOnly, setSelectedReadOnly] = useState<boolean>(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [defaultCreateStartISO, setDefaultCreateStartISO] = useState<
    string | null
  >(null);
  const [defaultCreateEndISO, setDefaultCreateEndISO] = useState<string | null>(
    null
  );
  const [eventTypes, setEventTypes] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [pendingRequests, setPendingRequests] = useState<
    PendingRequestDto[] | null
  >(null);
  const [loadingPending, setLoadingPending] = useState(false);
  const [cancelledEvents, setCancelledEvents] = useState<Event[] | null>(null);
  const [loadingCancelled, setLoadingCancelled] = useState(false);
  const [selectedPendingRequest, setSelectedPendingRequest] = useState<{
    requestEventId: number;
    status?: string;
  } | null>(null);
  const { isClubOfficer: isPresidentOfCurrentClub } =
    useClubPermissions(clubId);

  // WebSocket connection
  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToUserQueue, subscribeToSystemRole, subscribeToClub } = useWebSocket(token);

  // Fetch events from API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const startOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1,
          0,
          0,
          0
        );
        const endOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
          23,
          59,
          59
        );
        const range = {
          startTime: startOfMonth.toISOString(),
          endTime: endOfMonth.toISOString(),
        };
        const user = authService.getCurrentUser();
        const roleUpper = user?.systemRole
          ? String(user.systemRole).trim().toUpperCase()
          : undefined;
        const isStaff = roleUpper === "STAFF";
        let eventData: EventData[];
        if (isStaff) {
          if (clubId && clubId > 0) {
            eventData = await getStaffEventsByClubId(clubId, range);
          } else {
            eventData = await getStaffAllEvents(range);
          }
        } else {
          if (!clubId || clubId <= 0) {
            throw new Error("Club ID is required");
          }
          eventData = await getEventsByClubId(clubId, range);
        }
        const mappedEvents: Event[] = eventData.map((event: EventData) => ({
          id: event.id.toString(),
          title: event.title,
          description: event.description,
          startDate: new Date(event.startTime),
          endDate: new Date(event.endTime),
          location: event.location,
          attendees: 0,
          status: determineEventStatus(
            new Date(event.startTime),
            new Date(event.endTime)
          ),
          images: event.mediaUrls || [],
          eventTypeName: event.eventTypeName,
          clubId: event.clubId,
          clubName: event.clubName,
        }));
        let all: Event[] = mappedEvents;
        // Check if user can see draft events: STAFF or has CLUB_OFFICER/TEAM_OFFICER role in this club
        const clubRole = clubId ? authService.getClubRole(clubId) : null;
        const systemRoleInClub = clubRole?.systemRole?.toUpperCase();
        const canSeeDrafts =
          isStaff ||
          (clubId &&
            systemRoleInClub &&
            EVENT_PRIVILEGED_ROLES.includes(systemRoleInClub));
        
        if (canSeeDrafts) {
          try {
            const drafts = await getMyDraftEvents(
              clubId && clubId > 0 ? clubId : undefined
            );
            const mappedDrafts: Event[] = (drafts ?? [])
              .filter((d: MyDraftEventDto) => {
                // Show draft events that are:
                // 1. Pending (PENDING_CLUB or PENDING_UNIVERSITY) - for club officers/team officers
                // 2. null requestStatus - for STAFF draft events
                // Filter out cancelled events (events that are draft but not pending)
                const status = d.requestStatus?.toUpperCase();
                return status === "PENDING_CLUB" || status === "PENDING_UNIVERSITY" || d.requestStatus === null;
              })
              .map((d: MyDraftEventDto) => ({
                id: d.event.id.toString(),
                title: d.event.title,
                description: d.event.description,
                startDate: new Date(d.event.startTime),
                endDate: new Date(d.event.endTime),
                location: d.event.location,
                attendees: 0,
                status: determineEventStatus(
                  new Date(d.event.startTime),
                  new Date(d.event.endTime)
                ),
                images: d.event.mediaUrls || [],
                isMyDraft: true,
                requestStatus: d.requestStatus,
                eventTypeName: d.event.eventTypeName,
            isPendingPublish: d.requestStatus === null,
                clubId: d.event.clubId,
                clubName: d.event.clubName,
              }));
            const byId = new Map<string, Event>();
            for (const e of all) byId.set(e.id, e);
            for (const draft of mappedDrafts) {
              const existing = byId.get(draft.id);
              if (existing)
                byId.set(draft.id, {
                  ...existing,
                  ...draft,
                  isMyDraft: true,
                  requestStatus: draft.requestStatus,
                  isPendingPublish: draft.requestStatus === null,
                });
              else {
                // Only add if it's a pending draft (not cancelled)
                // Include STAFF drafts (requestStatus === null) and pending drafts
                const status = draft.requestStatus?.toUpperCase();
                if (status === "PENDING_CLUB" || status === "PENDING_UNIVERSITY" || draft.requestStatus === null) {
                  byId.set(draft.id, draft);
                }
              }
            }
            all = Array.from(byId.values());
          } catch (e: unknown) {
            console.warn("Failed to fetch my draft events", e);
          }
        }
        
        // Load registration status cho tất cả events (không phải draft, chưa kết thúc) - gọi song song
        const now = new Date();
        const eventsToCheck = all.filter(
          (e) => !e.isMyDraft && new Date(e.endDate) > now && !isStaff
        );
        
        if (eventsToCheck.length > 0) {
          try {
            const registrationStatuses = await Promise.allSettled(
              eventsToCheck.map((e) => getRegistrationStatus(Number(e.id)))
            );
            
            // Tạo Map để cập nhật registration status
            const registrationMap = new Map<string, boolean>();
            eventsToCheck.forEach((e, index) => {
              const result = registrationStatuses[index];
              if (result.status === 'fulfilled') {
                registrationMap.set(e.id, result.value);
              }
            });
            
            // Cập nhật events với registration status
            all = all.map((e) => {
              const registered = registrationMap.get(e.id);
              return registered !== undefined ? { ...e, isRegistered: registered } : e;
            });
          } catch (e: unknown) {
            console.warn("Failed to fetch registration statuses", e);
          }
        }
        
        setEvents(all);
      } catch (err: unknown) {
        console.error("Error fetching events:", err);
        setError("Không thể tải danh sách sự kiện");
        toast.error(getErrorMessage(err, "Không thể tải danh sách sự kiện"));
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [clubId, currentDate]);

  // Refetch events function - wrapped in useCallback to ensure stable reference
  const refetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
        0,
        0,
        0
      );
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
        23,
        59,
        59
      );
      const range = {
        startTime: startOfMonth.toISOString(),
        endTime: endOfMonth.toISOString(),
      };

      const user = authService.getCurrentUser();
      const roleUpper = user?.systemRole
        ? String(user.systemRole).trim().toUpperCase()
        : undefined;
      const isStaff = roleUpper === "STAFF";

      let eventData: EventData[];
      if (isStaff) {
        if (clubId && clubId > 0) {
          eventData = await getStaffEventsByClubId(clubId, range);
        } else {
          eventData = await getStaffAllEvents(range);
        }
      } else {
        if (!clubId || clubId <= 0) {
          throw new Error("Club ID is required");
        }
        eventData = await getEventsByClubId(clubId, range);
      }

      const mappedEvents: Event[] = eventData.map((event: EventData) => ({
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        startDate: new Date(event.startTime),
        endDate: new Date(event.endTime),
        location: event.location,
        attendees: 0,
        status: determineEventStatus(
          new Date(event.startTime),
          new Date(event.endTime)
        ),
        images: event.mediaUrls || [],
        eventTypeName: event.eventTypeName,
        isPendingPublish: false,
        clubId: event.clubId,
        clubName: event.clubName,
      }));

      let all: Event[] = mappedEvents;

      // Check if user can see draft events: STAFF or has CLUB_OFFICER/TEAM_OFFICER role in this club
      const isStaffRefetch = roleUpper === "STAFF";
      const clubRoleRefetch = clubId ? authService.getClubRole(clubId) : null;
      const systemRoleInClubRefetch = clubRoleRefetch?.systemRole?.toUpperCase();
      const canSeeDraftsRefetch =
        isStaffRefetch ||
        (clubId &&
          systemRoleInClubRefetch &&
          EVENT_PRIVILEGED_ROLES.includes(systemRoleInClubRefetch));

      if (canSeeDraftsRefetch) {
        try {
          const drafts = await getMyDraftEvents(
            clubId && clubId > 0 ? clubId : undefined
          );
          const mappedDrafts: Event[] = (drafts ?? [])
            .filter((d: MyDraftEventDto) => {
              // Show draft events that are:
              // 1. Pending (PENDING_CLUB or PENDING_UNIVERSITY) - for club officers/team officers
              // 2. null requestStatus - for STAFF draft events
              // Filter out cancelled events (events that are draft but not pending)
              const status = d.requestStatus?.toUpperCase();
              return status === "PENDING_CLUB" || status === "PENDING_UNIVERSITY" || d.requestStatus === null;
            })
            .map((d: MyDraftEventDto) => ({
              id: d.event.id.toString(),
              title: d.event.title,
              description: d.event.description,
              startDate: new Date(d.event.startTime),
              endDate: new Date(d.event.endTime),
              location: d.event.location,
              attendees: 0,
              status: determineEventStatus(
                new Date(d.event.startTime),
                new Date(d.event.endTime)
              ),
              images: d.event.mediaUrls || [],
              isMyDraft: true,
              requestStatus: d.requestStatus,
              eventTypeName: d.event.eventTypeName,
              isPendingPublish: d.requestStatus === null,
              clubId: d.event.clubId,
              clubName: d.event.clubName,
            }));
          const byId = new Map<string, Event>();
          // First add all regular events
          for (const e of all) {
            byId.set(e.id, e);
          }
          // Then merge drafts, preserving draft flags
          // Only add drafts that are pending (not cancelled)
          for (const draft of mappedDrafts) {
            const existing = byId.get(draft.id);
            if (existing) {
              // Merge but preserve draft flags
              byId.set(draft.id, {
                ...existing,
                ...draft,
                isMyDraft: true,
                requestStatus: draft.requestStatus,
                  isPendingPublish: draft.requestStatus === null,
              });
            } else {
              // Only add if it's a pending draft (not cancelled)
              // Include STAFF drafts (requestStatus === null) and pending drafts
              const status = draft.requestStatus?.toUpperCase();
              if (status === "PENDING_CLUB" || status === "PENDING_UNIVERSITY" || draft.requestStatus === null) {
                byId.set(draft.id, draft);
              }
            }
          }
          all = Array.from(byId.values());
        } catch (e: unknown) {
          console.warn("Failed to fetch my draft events", e);
        }
      }

      // Load registration status cho tất cả events (không phải draft, chưa kết thúc) - gọi song song
      const nowRefetch = new Date();
      const eventsToCheckRefetch = all.filter(
        (e) => !e.isMyDraft && new Date(e.endDate) > nowRefetch && !isStaffRefetch
      );
      
      if (eventsToCheckRefetch.length > 0) {
        try {
          const registrationStatuses = await Promise.allSettled(
            eventsToCheckRefetch.map((e) => getRegistrationStatus(Number(e.id)))
          );
          
          // Tạo Map để cập nhật registration status
          const registrationMap = new Map<string, boolean>();
          eventsToCheckRefetch.forEach((e, index) => {
            const result = registrationStatuses[index];
            if (result.status === 'fulfilled') {
              registrationMap.set(e.id, result.value);
            }
          });
          
          // Cập nhật events với registration status
          all = all.map((e) => {
            const registered = registrationMap.get(e.id);
            return registered !== undefined ? { ...e, isRegistered: registered } : e;
          });
        } catch (e: unknown) {
          console.warn("Failed to fetch registration statuses", e);
        }
      }

      setEvents(all);
      setLoading(false);
    } catch (err: unknown) {
      console.error("Error fetching events:", err);
      setError("Không thể tải danh sách sự kiện");
      toast.error(getErrorMessage(err, "Không thể tải danh sách sự kiện"));
      setLoading(false);
    }
  }, [currentDate, clubId]);

  // Load event types for create form
  useEffect(() => {
    (async () => {
      try {
        const types = await getAllEventTypes();
        const user = authService.getCurrentUser();
        const isStaff = user?.systemRole === "STAFF";
        
        // Filter MEETING ra khỏi danh sách cho STAFF
        const filteredTypes = isStaff 
          ? types.filter((t) => t.typeName.toUpperCase() !== "MEETING")
          : types;
        
        setEventTypes(
          filteredTypes.map((t) => ({ id: String(t.id), name: t.typeName }))
        );
      } catch (e: unknown) {
        console.error("Error fetching event types:", e);
      }
    })();
  }, []);

  const refreshPendingRequests = useCallback(async () => {
    const user = authService.getCurrentUser();
    if (!user) return;
    const roleUpper = user.systemRole
      ? String(user.systemRole).trim().toUpperCase()
      : "";
    const isReviewer = roleUpper === "STAFF" || isPresidentOfCurrentClub;
    if (!isReviewer) return;
    setLoadingPending(true);
    try {
      const list = await getPendingRequests(clubId && clubId > 0 ? clubId : undefined);
      setPendingRequests(list);
    } catch {
      setPendingRequests([]);
    } finally {
      setLoadingPending(false);
    }
  }, [clubId, isPresidentOfCurrentClub]);

  // Load pending requests (STAFF/CLUB_OFFICER) and cancelled events (STAFF)
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) return;
    const roleUpper = user.systemRole
      ? String(user.systemRole).trim().toUpperCase()
      : "";
    if (roleUpper === "STAFF" || isPresidentOfCurrentClub) {
      refreshPendingRequests();
    }
    if (roleUpper === "STAFF") {
      setLoadingCancelled(true);
      getStaffCancelledEvents(clubId && clubId > 0 ? clubId : undefined)
        .then((cancelled) => {
          const mapped: Event[] = (cancelled ?? []).map((e) => ({
            id: String(e.id),
            title: e.title,
            description: e.description,
            startDate: new Date(e.startTime),
            endDate: new Date(e.endTime),
            location: e.location ?? "",
            attendees: 0,
            status: determineEventStatus(
              new Date(e.startTime),
              new Date(e.endTime)
            ),
            images: e.mediaUrls || [],
            isMyDraft: true,
            requestStatus: "CANCELLED",
            eventTypeName: e.eventTypeName,
          }));
          setCancelledEvents(mapped);
        })
        .catch(() => setCancelledEvents([]))
        .finally(() => setLoadingCancelled(false));
    }
  }, [clubId, isPresidentOfCurrentClub, refreshPendingRequests]);


  // Listen to global refetch event (after cancel from modal)
  useEffect(() => {
    const handler = async () => {
      await refetchEvents();
      const user = authService.getCurrentUser();
      if (user?.systemRole === "STAFF") {
        const cancelled = await getStaffCancelledEvents(
          clubId && clubId > 0 ? clubId : undefined
        );
        const mapped: Event[] = (cancelled ?? []).map((e) => ({
          id: String(e.id),
          title: e.title,
          description: e.description,
          startDate: new Date(e.startTime),
          endDate: new Date(e.endTime),
          location: e.location ?? "",
          attendees: 0,
          status: determineEventStatus(
            new Date(e.startTime),
            new Date(e.endTime)
          ),
          images: e.mediaUrls || [],
          isMyDraft: true,
          requestStatus: "CANCELLED",
          eventTypeName: e.eventTypeName,
          isPendingPublish: false,
        }));
        setCancelledEvents(mapped);
      }
    };
    window.addEventListener("events:refetch", handler);
    return () => window.removeEventListener("events:refetch", handler);
  }, [clubId]);

  // 🔔 WebSocket: Real-time updates for Event Management
  useEffect(() => {
    if (!isConnected) return;

    const user = authService.getCurrentUser();
    if (!user) return;
    const roleUpper = user.systemRole
      ? String(user.systemRole).trim().toUpperCase()
      : "";

    // Subscribe to user queue (for personal notifications)
    const unsubscribeUser = subscribeToUserQueue((msg) => {
      if (msg.type !== "EVENT") return;

      const payload = msg.payload as EventWebSocketPayload;

      // Show toast notification based on action
      switch (msg.action) {
        case "REQUEST_SUBMITTED": {
          // Only show toast for Club Officers (not for Team Officers who created it)
          const clubRole = clubId ? authService.getClubRole(clubId) : null;
          const systemRoleInClub = clubRole?.systemRole?.toUpperCase();
          const isClubOfficer = systemRoleInClub === "CLUB_OFFICER";
          if (isClubOfficer) {
            toast.info("Yêu cầu tạo sự kiện mới", {
              description: payload.message || `Có yêu cầu tạo sự kiện "${payload.eventTitle}" chờ duyệt`,
            });
            // Refresh pending requests
            getPendingRequests(clubId && clubId > 0 ? clubId : undefined)
              .then((list) => {
                console.log("[EventCalendar] Refreshed pending requests after REQUEST_SUBMITTED:", list);
                setPendingRequests(list);
              })
              .catch((err) => {
                console.error("[EventCalendar] Error refreshing pending requests:", err);
              });
          }
          break;
        }
        case "REQUEST_APPROVED_BY_CLUB":
          toast.success("Yêu cầu đã được duyệt", {
            description: payload.message || `Yêu cầu tạo sự kiện "${payload.eventTitle}" đã được Club Officer duyệt`,
          });
          // Refresh draft events
          refetchEvents();
          break;
        case "REQUEST_REJECTED_BY_CLUB":
          toast.error("Yêu cầu đã bị từ chối", {
            description: payload.message || `Yêu cầu tạo sự kiện "${payload.eventTitle}" đã bị Club Officer từ chối`,
          });
          // Refresh draft events
          refetchEvents();
          break;
        case "REQUEST_APPROVED_BY_UNIVERSITY":
          toast.success("Yêu cầu đã được duyệt", {
            description: payload.message || `Yêu cầu tạo sự kiện "${payload.eventTitle}" đã được Nhân viên phòng IC-PDP duyệt và công bố`,
          });
          // Refresh events and draft events
          refetchEvents();
          break;
        case "REQUEST_REJECTED_BY_UNIVERSITY":
          toast.error("Yêu cầu đã bị từ chối", {
            description: payload.message || `Yêu cầu tạo sự kiện "${payload.eventTitle}" đã bị Nhân viên phòng IC-PDP từ chối`,
          });
          // Refresh draft events
          refetchEvents();
          break;
        case "CANCELLED_BY_STAFF":
          toast.warning("Sự kiện đã bị hủy", {
            description: payload.message || `Sự kiện "${payload.eventTitle}" đã bị Nhân viên phòng IC-PDP hủy`,
          });
          // Refresh events
          refetchEvents();
          break;
        case "RESTORED_BY_STAFF":
          toast.success("Sự kiện đã được khôi phục", {
            description: payload.message || `Sự kiện "${payload.eventTitle}" đã được Nhân viên phòng IC-PDP khôi phục`,
          });
          // Refresh events
          refetchEvents();
          break;
        case "AUTO_APPROVED":
          toast.success("Sự kiện đã được tự động duyệt", {
            description: payload.message || `Sự kiện "${payload.eventTitle}" đã được tự động duyệt do đổi sang loại MEETING`,
          });
          // Refresh events
          refetchEvents();
          break;
        case "PUBLISHED":
          console.log("[EventCalendar] Received PUBLISHED event from user queue:", payload);
          toast.info("Sự kiện mới đã được công bố", {
            description: payload.message || `Sự kiện "${payload.eventTitle}" đã được công bố`,
          });
          // Refresh events - ensure it's called
          console.log("[EventCalendar] Calling refetchEvents after PUBLISHED event from user queue");
          refetchEvents().catch((err) => {
            console.error("[EventCalendar] Error refetching events:", err);
          });
          break;
      }
    });

    // Subscribe to system role (for STAFF)
    let unsubscribeSystemRoleStaff: (() => void) | null = null;
    if (roleUpper === "STAFF") {
      unsubscribeSystemRoleStaff = subscribeToSystemRole("STAFF", (msg) => {
        if (msg.type !== "EVENT") return;

        const payload = msg.payload as EventWebSocketPayload;

        if (msg.action === "REQUEST_SUBMITTED") {
          toast.info("Yêu cầu tạo sự kiện mới", {
            description: payload.message || `Có yêu cầu tạo sự kiện "${payload.eventTitle}" chờ duyệt`,
          });
          // Refresh pending requests
          getPendingRequests(clubId && clubId > 0 ? clubId : undefined)
            .then((list) => setPendingRequests(list))
            .catch(() => {});
        }
      });
    }

    // Subscribe to system roles for event publication (for STUDENT/TEAM_OFFICER/CLUB_OFFICER)
    // Chỉ subscribe nếu không phải STAFF
    let unsubscribeSystemRoleStudent: (() => void) | null = null;
    let unsubscribeSystemRoleTeamOfficer: (() => void) | null = null;
    let unsubscribeSystemRoleClubOfficer: (() => void) | null = null;
    let unsubscribeSystemRoleClubTreasurer: (() => void) | null = null;
    let unsubscribeSystemRoleClubTreasurerAlt: (() => void) | null = null;
    
    if (roleUpper !== "STAFF" && roleUpper !== "ADMIN") {
      const handleEventPublished = (msg: any) => {
        if (msg.type !== "EVENT") return;

        const payload = msg.payload as EventWebSocketPayload;

        if (msg.action === "PUBLISHED") {
          console.log("[EventCalendar] Received PUBLISHED event:", payload);
          toast.info("Sự kiện mới đã được công bố", {
            description: payload.message || `Sự kiện "${payload.eventTitle}" đã được công bố`,
          });
          // Refresh events - ensure it's called
          console.log("[EventCalendar] Calling refetchEvents after PUBLISHED event");
          refetchEvents().catch((err) => {
            console.error("[EventCalendar] Error refetching events:", err);
          });
        }
      };

      // Subscribe to STUDENT role
      unsubscribeSystemRoleStudent = subscribeToSystemRole("STUDENT", handleEventPublished);
      
      // Subscribe to TEAM_OFFICER role
      unsubscribeSystemRoleTeamOfficer = subscribeToSystemRole("TEAM_OFFICER", handleEventPublished);
      
      // Subscribe to CLUB_OFFICER role
      unsubscribeSystemRoleClubOfficer = subscribeToSystemRole("CLUB_OFFICER", handleEventPublished);

      // Subscribe to CLUB_TREASURE roles
      unsubscribeSystemRoleClubTreasurer = subscribeToSystemRole("CLUB_TREASURE", handleEventPublished);
      unsubscribeSystemRoleClubTreasurerAlt = subscribeToSystemRole("CLUB_TREASURER", handleEventPublished);
    }

    // Subscribe to club (for Club Officers)
    // Check systemRole in clubRoleList instead of global systemRole
    let unsubscribeClub: (() => void) | null = null;
    if (clubId && clubId > 0) {
      const clubRole = authService.getClubRole(clubId);
      const systemRoleInClub = clubRole?.systemRole?.toUpperCase();
      const isPrivilegedInClub =
        systemRoleInClub && EVENT_PRIVILEGED_ROLES.includes(systemRoleInClub);

      console.log(
        `[EventCalendar] Subscribing to club ${clubId} (role=${systemRoleInClub ?? "UNKNOWN"})`
      );
      unsubscribeClub = subscribeToClub(clubId, (msg) => {
        console.log(`[EventCalendar] Received message from club ${clubId}:`, msg);
        if (msg.type !== "EVENT") return;

        const payload = msg.payload as EventWebSocketPayload;

        switch (msg.action) {
          case "REQUEST_SUBMITTED":
            if (!isPrivilegedInClub) {
              return;
            }
            toast.info("Yêu cầu tạo sự kiện mới", {
              description:
                payload.message || `Có yêu cầu tạo sự kiện "${payload.eventTitle}" chờ duyệt`,
            });
            getPendingRequests(clubId && clubId > 0 ? clubId : undefined)
              .then((list) => {
                console.log("[EventCalendar] Refreshed pending requests:", list);
                setPendingRequests(list);
              })
              .catch((err) => {
                console.error("[EventCalendar] Error refreshing pending requests:", err);
              });
            break;
          case "CANCELLED_BY_STAFF":
            console.log(
              "[EventCalendar] Received CANCELLED_BY_STAFF event from club topic:",
              payload
            );
            toast.warning("Sự kiện đã bị hủy", {
              description: payload.message || `Sự kiện "${payload.eventTitle}" đã bị Nhân viên phòng IC-PDP hủy`,
            });
            console.log(
              "[EventCalendar] Calling refetchEvents after CANCELLED_BY_STAFF event from club topic"
            );
            refetchEvents()
              .then(() => {
                console.log(
                  "[EventCalendar] Successfully refetched events after CANCELLED_BY_STAFF"
                );
              })
              .catch((err) => {
                console.error("[EventCalendar] Error refetching events:", err);
              });
            break;
          case "RESTORED_BY_STAFF":
            console.log(
              "[EventCalendar] Received RESTORED_BY_STAFF event from club topic:",
              payload
            );
            toast.success("Sự kiện đã được khôi phục", {
              description:
                payload.message || `Sự kiện "${payload.eventTitle}" đã được Nhân viên phòng IC-PDP khôi phục`,
            });
            console.log(
              "[EventCalendar] Calling refetchEvents after RESTORED_BY_STAFF event from club topic"
            );
            refetchEvents()
              .then(() => {
                console.log(
                  "[EventCalendar] Successfully refetched events after RESTORED_BY_STAFF"
                );
              })
              .catch((err) => {
                console.error("[EventCalendar] Error refetching events:", err);
              });
            break;
          case "MEETING_CREATED":
            toast.success("CLB có buổi meeting mới", {
              description:
                payload.message || `Buổi meeting "${payload.eventTitle}" vừa được tạo`,
            });
            refetchEvents()
              .then(() => {
                console.log(
                  "[EventCalendar] Successfully refetched events after MEETING_CREATED"
                );
              })
              .catch((err) => {
                console.error("[EventCalendar] Error refetching events:", err);
              });
            break;
        }
      });
    }

    return () => {
      unsubscribeUser();
      if (unsubscribeSystemRoleStaff) unsubscribeSystemRoleStaff();
      if (unsubscribeSystemRoleStudent) unsubscribeSystemRoleStudent();
      if (unsubscribeSystemRoleTeamOfficer) unsubscribeSystemRoleTeamOfficer();
      if (unsubscribeSystemRoleClubOfficer) unsubscribeSystemRoleClubOfficer();
      if (unsubscribeSystemRoleClubTreasurer) unsubscribeSystemRoleClubTreasurer();
      if (unsubscribeSystemRoleClubTreasurerAlt) unsubscribeSystemRoleClubTreasurerAlt();
      if (unsubscribeClub) unsubscribeClub();
    };
  }, [isConnected, clubId, subscribeToUserQueue, subscribeToSystemRole, subscribeToClub, refetchEvents, getPendingRequests]);

  const determineEventStatus = (
    startDate: Date,
    endDate: Date
  ): "upcoming" | "ongoing" | "completed" => {
    const now = new Date();
    if (now < startDate) return "upcoming";
    if (now >= startDate && now <= endDate) return "ongoing";
    return "completed";
  };

  const daysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthDays = useMemo(() => {
    const days = [];
    const firstDay = firstDayOfMonth(currentDate);
    const totalDays = daysInMonth(currentDate);
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  }, [currentDate]);

  const getEventsForDate = (day: number | null): CalendarEvent[] => {
    if (!day) return [];
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    return events
      .filter((event) => event.startDate.toDateString() === date.toDateString())
      .map(
        (event): CalendarEvent => ({
          id: event.id,
          title: event.title,
          location: event.location,
          startDate: event.startDate,
          status: event.status,
          isMyDraft: event.isMyDraft,
          requestStatus: event.requestStatus,
          eventTypeName: event.eventTypeName,
          isPendingPublish: event.isPendingPublish,
        })
      );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500 text-white";
      case "ongoing":
        return "bg-green-500 text-white";
      case "completed":
        return "bg-red-500 text-white";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getRequestStatusInfo = (
    status: string
  ): { label: string; className: string } => {
    switch (status) {
      case "PENDING_CLUB":
        return {
          label: "Chờ duyệt CLB",
          className: "bg-yellow-100 text-yellow-800",
        };
      case "APPROVED_CLUB":
        return {
          label: "Đã duyệt CLB",
          className: "bg-green-100 text-green-700",
        };
      case "REJECTED_CLUB":
        return { label: "Từ chối CLB", className: "bg-red-100 text-red-700" };
      case "PENDING_UNIVERSITY":
        return {
          label: "Chờ duyệt Nhà trường",
          className: "bg-yellow-100 text-yellow-800",
        };
      case "APPROVED_UNIVERSITY":
        return {
          label: "Đã duyệt Nhà trường",
          className: "bg-green-100 text-green-700",
        };
      case "REJECTED_UNIVERSITY":
        return {
          label: "Từ chối Nhà trường",
          className: "bg-red-100 text-red-700",
        };
      case "DRAFT":
        return { label: "Nháp", className: "bg-gray-100 text-gray-700" };
      default:
        return { label: status, className: "bg-muted text-foreground" };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Skeleton */}
        <div className="lg:col-span-2">
          <Card className="p-6 shadow-lg">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>

            {/* Day names Skeleton */}
            <div className="grid grid-cols-7 border-b border-border mb-4">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="text-center py-3 border-r border-border last:border-r-0"
                >
                  <Skeleton className="h-4 w-8 mx-auto" />
                </div>
              ))}
            </div>

            {/* Calendar grid Skeleton */}
            <div className="border-l border-t border-border">
              <div className="grid grid-cols-7">
                {[...Array(35)].map((_, index) => {
                  const isLastInRow = (index + 1) % 7 === 0;
                  const isLastRow = index >= 28;
                  return (
                    <div
                      key={index}
                      className={`aspect-square p-2 border-r border-b border-border ${
                        isLastInRow ? "border-r-0" : ""
                      } ${isLastRow ? "border-b-0" : ""}`}
                    >
                      <Skeleton className="h-4 w-6 mb-1" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Legend Skeleton */}
        <div>
          <Card className="p-6 shadow-lg">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Thử lại</Button>
        </div>
      </div>
    );
  }

  const handleDayClick = (day: number) => {
    const user = authService.getCurrentUser();
    if (!user) return;
    
    // Check permission: STAFF hoặc có systemRole CLUB_OFFICER/TEAM_OFFICER trong club hiện tại
    const isStaff = user.systemRole === "STAFF";
    const clubRole = clubId ? authService.getClubRole(clubId) : null;
    const systemRoleInClub = clubRole?.systemRole?.toUpperCase();
    const canCreate =
      isStaff ||
      (clubId &&
        systemRoleInClub &&
        EVENT_PRIVILEGED_ROLES.includes(systemRoleInClub));
    
    if (!canCreate) return;
    const start = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
      8,
      0,
      0
    );
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    setDefaultCreateStartISO(start.toISOString());
    setDefaultCreateEndISO(end.toISOString());
    setOpenCreate(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    // Find the full event from events array
    const fullEvent = events.find((e) => e.id === event.id);
    if (fullEvent) {
      setSelectedEvent(fullEvent);
      setSelectedReadOnly(false);
    }
  };

  const handleRequestClick = (
    event: Event,
    meta?: { requestEventId: number; status?: string }
  ) => {
    setSelectedEvent(event);
    setSelectedReadOnly(true);
    setSelectedPendingRequest(meta ?? null);
  };

  const handlePendingActionSuccess = async () => {
    await refetchEvents();
    await refreshPendingRequests();
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const handleCreateEvent = () => {
    setOpenCreate(true);
    setDefaultCreateStartISO(null);
    setDefaultCreateEndISO(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <EventCalendarGrid
            currentDate={currentDate}
            monthDays={monthDays}
            events={events.map(
              (e): CalendarEvent => ({
                id: e.id,
                title: e.title,
                location: e.location,
                startDate: e.startDate,
                status: e.status,
                isMyDraft: e.isMyDraft,
                requestStatus: e.requestStatus,
                eventTypeName: e.eventTypeName,
                isPendingPublish: e.isPendingPublish,
              })
            )}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onCreateEvent={handleCreateEvent}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            getStatusColor={getStatusColor}
            getEventsForDate={getEventsForDate}
            clubId={clubId as number | undefined}
          />
        </div>

        {/* Sidebar */}
        <div>
          <EventCalendarSidebar
            clubId={clubId}
            pendingRequests={pendingRequests}
            loadingPending={loadingPending}
            cancelledEvents={cancelledEvents}
            loadingCancelled={loadingCancelled}
            onRequestClick={handleRequestClick}
            onRefetch={refetchEvents}
            determineEventStatus={determineEventStatus}
            getRequestStatusInfo={getRequestStatusInfo}
            getErrorMessage={getErrorMessage}
            setCancelledEvents={setCancelledEvents}
            setPendingRequests={setPendingRequests}
          />
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo sự kiện</DialogTitle>
          </DialogHeader>
          <CreateEventForm
            eventTypes={eventTypes}
            onSubmit={async (data: EventFormValues) => {
              try {
                const user = authService.getCurrentUser();
                if (!user) throw new Error("Bạn chưa đăng nhập");
                const isStaff = user.systemRole === "STAFF";
                await createEvent({
                  title: data.title,
                  description: data.description,
                  location: data.location,
                  startTime: data.startTime,
                  endTime: data.endTime,
                  eventTypeId: data.eventType
                    ? Number(data.eventType)
                    : undefined,
                  clubId: isStaff ? undefined : clubId,
                  images: data.eventImages as File[],
                });
                toast.success("Tạo sự kiện thành công!");
                // Refetch events to get the latest data
                await refetchEvents();
              } catch (error: unknown) {
                console.error("Error creating event:", error);
                toast.error(
                  getErrorMessage(
                    error,
                    "Không thể tạo sự kiện. Vui lòng thử lại."
                  )
                );
                throw error;
              }
            }}
            onSuccess={() => setOpenCreate(false)}
            initialStartTime={defaultCreateStartISO ?? undefined}
            initialEndTime={defaultCreateEndISO ?? undefined}
          />
        </DialogContent>
      </Dialog>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          clubId={clubId}
          onClose={() => {
            setSelectedEvent(null);
            setSelectedReadOnly(false);
            setSelectedPendingRequest(null);
          }}
          onUpdated={(upd: Event) => {
            setEvents((prev) =>
              prev.map((e) => (e.id === upd.id ? { ...e, ...upd } : e))
            );
            setSelectedEvent(upd);
          }}
          onDeleted={(id) => {
            setEvents((prev) => prev.filter((e) => e.id !== id));
          }}
          readOnly={selectedReadOnly}
          pendingRequest={selectedPendingRequest ?? undefined}
          onPendingActionSuccess={handlePendingActionSuccess}
        />
      )}
    </>
  );
}
