"use client"
import { useState, useMemo, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { EventDetailModal } from "./event-detail-modal"
import { type EventData, getEventsByClubId, getStaffEventsByClubId, getStaffAllEvents, createEvent, getAllEventTypes, getPendingRequests, type PendingRequestDto, getMyDraftEvents, type MyDraftEventDto, getStaffCancelledEvents } from "@/service/EventService"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreateEventForm } from "./create-event-form"
import { authService } from "@/services/authService"
import { useClubPermissions } from "@/hooks/useClubPermissions"
import { EventCalendarGrid, type CalendarEvent } from "./EventCalendarGrid"
import { EventCalendarSidebar } from "./EventCalendarSidebar"

// Helper to normalize error messages
const getErrorMessage = (error: unknown, fallback = "Đã xảy ra lỗi"): string => {
  const anyErr = error as { response?: { data?: { message?: string } } ; message?: string }
  return anyErr?.response?.data?.message || anyErr?.message || fallback
}

interface Event {
  id: string
  title: string
  description: string
  startDate: Date
  endDate: Date
  location: string
  attendees: number
  status: "upcoming" | "ongoing" | "completed"
  images: string[]
  isMyDraft?: boolean
  requestStatus?: string
  eventTypeName?: string
}
interface EventFormValues {
  title: string
  description: string
  location: string
  startTime: string
  endTime: string
  eventType: string
  eventImages: File[]
}

interface EventCalendarProps {
  clubId: number;
}

export function EventCalendar({ clubId }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedReadOnly, setSelectedReadOnly] = useState<boolean>(false)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [defaultCreateStartISO, setDefaultCreateStartISO] = useState<string | null>(null)
  const [defaultCreateEndISO, setDefaultCreateEndISO] = useState<string | null>(null)
  const [eventTypes, setEventTypes] = useState<Array<{ id: string; name: string }>>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequestDto[] | null>(null)
  const [loadingPending, setLoadingPending] = useState(false)
  const [cancelledEvents, setCancelledEvents] = useState<Event[] | null>(null)
  const [loadingCancelled, setLoadingCancelled] = useState(false)
  const { isClubPresident: isPresidentOfCurrentClub } = useClubPermissions(clubId)

  // Fetch events from API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)
        const user = authService.getCurrentUser()
        const roleUpper = user?.systemRole ? String(user.systemRole).trim().toUpperCase() : undefined
        const isStaff = roleUpper === "STAFF"
        let eventData: EventData[]
        if (isStaff) {
          if (clubId && clubId > 0) {
            eventData = await getStaffEventsByClubId(clubId)
          } else {
            eventData = await getStaffAllEvents()
          }
        } else {
          if (!clubId || clubId <= 0) {
            throw new Error("Club ID is required")
          }
          eventData = await getEventsByClubId(clubId)
        }
        const mappedEvents: Event[] = eventData.map((event: EventData) => ({
          id: event.id.toString(),
          title: event.title,
          description: event.description,
          startDate: new Date(event.startTime),
          endDate: new Date(event.endTime),
          location: event.location,
          attendees: 0,
          status: determineEventStatus(new Date(event.startTime), new Date(event.endTime)),
          images: event.mediaUrls || [],
          eventTypeName: event.eventTypeName,
        }))
        let all: Event[] = mappedEvents
        const userUpper = roleUpper
        if (userUpper === "CLUB_OFFICER" || userUpper === "TEAM_OFFICER" || userUpper === "STAFF") {
          try {
            const drafts = await getMyDraftEvents(clubId && clubId > 0 ? clubId : undefined)
            const mappedDrafts: Event[] = (drafts ?? []).map((d: MyDraftEventDto) => ({
              id: d.event.id.toString(),
              title: d.event.title,
              description: d.event.description,
              startDate: new Date(d.event.startTime),
              endDate: new Date(d.event.endTime),
              location: d.event.location,
              attendees: 0,
              status: determineEventStatus(new Date(d.event.startTime), new Date(d.event.endTime)),
              images: d.event.mediaUrls || [],
              isMyDraft: true,
              requestStatus: d.requestStatus,
              eventTypeName: d.event.eventTypeName,
            }))
            const byId = new Map<string, Event>()
            for (const e of all) byId.set(e.id, e)
            for (const draft of mappedDrafts) {
              const existing = byId.get(draft.id)
              if (existing) byId.set(draft.id, { ...existing, ...draft, isMyDraft: true, requestStatus: draft.requestStatus })
              else byId.set(draft.id, draft)
            }
            all = Array.from(byId.values())
          } catch (e: unknown) {
            console.warn("Failed to fetch my draft events", e)
          }
        }
        setEvents(all)
      } catch (err: unknown) {
        console.error('Error fetching events:', err)
        setError('Không thể tải danh sách sự kiện')
        toast.error(getErrorMessage(err, 'Không thể tải danh sách sự kiện'))
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [clubId])

  // Refetch events function
  const refetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const user = authService.getCurrentUser()
      const roleUpper = user?.systemRole ? String(user.systemRole).trim().toUpperCase() : undefined
      const isStaff = roleUpper === "STAFF"
      
      let eventData: EventData[]
      if (isStaff) {
        if (clubId && clubId > 0) {
          eventData = await getStaffEventsByClubId(clubId)
        } else {
          eventData = await getStaffAllEvents()
        }
      } else {
        if (!clubId || clubId <= 0) {
          throw new Error("Club ID is required")
        }
        eventData = await getEventsByClubId(clubId)
      }
      
      const mappedEvents: Event[] = eventData.map((event: EventData) => ({
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        startDate: new Date(event.startTime),
        endDate: new Date(event.endTime),
        location: event.location,
        attendees: 0,
        status: determineEventStatus(new Date(event.startTime), new Date(event.endTime)),
        images: event.mediaUrls || [],
        eventTypeName: event.eventTypeName,
      }))
      
      let all: Event[] = mappedEvents

      if (roleUpper === "CLUB_OFFICER" || roleUpper === "TEAM_OFFICER" || roleUpper === "STAFF") {
        try {
          const drafts = await getMyDraftEvents(clubId && clubId > 0 ? clubId : undefined)
          const mappedDrafts: Event[] = (drafts ?? []).map((d: MyDraftEventDto) => ({
            id: d.event.id.toString(),
            title: d.event.title,
            description: d.event.description,
            startDate: new Date(d.event.startTime),
            endDate: new Date(d.event.endTime),
            location: d.event.location,
            attendees: 0,
            status: determineEventStatus(new Date(d.event.startTime), new Date(d.event.endTime)),
            images: d.event.mediaUrls || [],
            isMyDraft: true,
            requestStatus: d.requestStatus,
            eventTypeName: d.event.eventTypeName,
          }))
          const byId = new Map<string, Event>()
          // First add all regular events
          for (const e of all) {
            byId.set(e.id, e)
          }
          // Then merge drafts, preserving draft flags
          for (const draft of mappedDrafts) {
            const existing = byId.get(draft.id)
            if (existing) {
              // Merge but preserve draft flags
              byId.set(draft.id, { ...existing, ...draft, isMyDraft: true, requestStatus: draft.requestStatus })
            } else {
              byId.set(draft.id, draft)
            }
          }
          all = Array.from(byId.values())
        } catch (e: unknown) {
          console.warn("Failed to fetch my draft events", e)
        }
      }

      setEvents(all)
      setLoading(false)
    } catch (err: unknown) {
      console.error('Error fetching events:', err)
      setError('Không thể tải danh sách sự kiện')
      toast.error(getErrorMessage(err, 'Không thể tải danh sách sự kiện'))
      setLoading(false)
    }
  }

  // Load event types for create form
  useEffect(() => {
    (async () => {
      try {
        const types = await getAllEventTypes()
        setEventTypes(types.map(t => ({ id: String(t.id), name: t.typeName })))
      } catch (e: unknown) {
        console.error("Error fetching event types:", e)
      }
    })()
  }, [])

  // Load pending requests (STAFF/CLUB_OFFICER) and cancelled events (STAFF)
  useEffect(() => {
    const user = authService.getCurrentUser()
    if (!user) return
    const roleUpper = user.systemRole ? String(user.systemRole).trim().toUpperCase() : ""
    const isReviewer = roleUpper === "STAFF" || isPresidentOfCurrentClub
    if (isReviewer) {
      setLoadingPending(true)
      getPendingRequests()
        .then((list) => setPendingRequests(list))
        .catch(() => setPendingRequests([]))
        .finally(() => setLoadingPending(false))
    }
    if (roleUpper === "STAFF") {
      setLoadingCancelled(true)
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
            status: determineEventStatus(new Date(e.startTime), new Date(e.endTime)),
            images: e.mediaUrls || [],
            isMyDraft: true,
            requestStatus: "CANCELLED",
            eventTypeName: e.eventTypeName,
          }))
          setCancelledEvents(mapped)
        })
        .catch(() => setCancelledEvents([]))
        .finally(() => setLoadingCancelled(false))
    }
  }, [clubId, isPresidentOfCurrentClub])

  // Listen to global refetch event (after cancel from modal)
  useEffect(() => {
    const handler = async () => {
      await refetchEvents()
      const user = authService.getCurrentUser()
      if (user?.systemRole === "STAFF") {
        const cancelled = await getStaffCancelledEvents(clubId && clubId > 0 ? clubId : undefined)
        const mapped: Event[] = (cancelled ?? []).map((e) => ({
          id: String(e.id),
          title: e.title,
          description: e.description,
          startDate: new Date(e.startTime),
          endDate: new Date(e.endTime),
          location: e.location ?? "",
          attendees: 0,
          status: determineEventStatus(new Date(e.startTime), new Date(e.endTime)),
          images: e.mediaUrls || [],
          isMyDraft: true,
          requestStatus: "CANCELLED",
          eventTypeName: e.eventTypeName,
        }))
        setCancelledEvents(mapped)
      }
    }
    window.addEventListener('events:refetch', handler)
    return () => window.removeEventListener('events:refetch', handler)
  }, [clubId])

  const determineEventStatus = (startDate: Date, endDate: Date): "upcoming" | "ongoing" | "completed" => {
    const now = new Date()
    if (now < startDate) return "upcoming"
    if (now >= startDate && now <= endDate) return "ongoing"
    return "completed"
  }

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const monthDays = useMemo(() => {
    const days = []
    const firstDay = firstDayOfMonth(currentDate)
    const totalDays = daysInMonth(currentDate)
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= totalDays; i++) days.push(i)
    return days
  }, [currentDate])

  const getEventsForDate = (day: number | null): CalendarEvent[] => {
    if (!day) return []
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return events
      .filter((event) => event.startDate.toDateString() === date.toDateString())
      .map((event): CalendarEvent => ({
        id: event.id,
        title: event.title,
        location: event.location,
        startDate: event.startDate,
        status: event.status,
        isMyDraft: event.isMyDraft,
        requestStatus: event.requestStatus,
        eventTypeName: event.eventTypeName,
      }))
  }




  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500 text-white"
      case "ongoing":
        return "bg-green-500 text-white"
      case "completed":
        return "bg-red-500 text-white"
      default:
        return "bg-muted text-foreground"
    }
  }

  const getRequestStatusInfo = (status: string): { label: string; className: string } => {
    switch (status) {
      case "PENDING_CLUB":
        return { label: "Chờ duyệt CLB", className: "bg-yellow-100 text-yellow-800" };
      case "APPROVED_CLUB":
        return { label: "Đã duyệt CLB", className: "bg-green-100 text-green-700" };
      case "REJECTED_CLUB":
        return { label: "Từ chối CLB", className: "bg-red-100 text-red-700" };
      case "PENDING_UNIVERSITY":
        return { label: "Chờ duyệt Nhà trường", className: "bg-yellow-100 text-yellow-800" };
      case "APPROVED_UNIVERSITY":
        return { label: "Đã duyệt Nhà trường", className: "bg-green-100 text-green-700" };
      case "REJECTED_UNIVERSITY":
        return { label: "Từ chối Nhà trường", className: "bg-red-100 text-red-700" };
      case "DRAFT":
        return { label: "Nháp", className: "bg-gray-100 text-gray-700" };
      default:
        return { label: status, className: "bg-muted text-foreground" };
    }
  }

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
                <div key={i} className="text-center py-3 border-r border-border last:border-r-0">
                  <Skeleton className="h-4 w-8 mx-auto" />
                </div>
              ))}
            </div>

            {/* Calendar grid Skeleton */}
            <div className="border-l border-t border-border">
              <div className="grid grid-cols-7">
                {[...Array(35)].map((_, index) => {
                  const isLastInRow = (index + 1) % 7 === 0
                  const isLastRow = index >= 28
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
                  )
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
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  const handleDayClick = (day: number) => {
    const user = authService.getCurrentUser()
    const canCreate = !!user && ["STAFF", "CLUB_OFFICER", "TEAM_OFFICER"].includes(user.systemRole)
    if (!canCreate) return
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 8, 0, 0)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    setDefaultCreateStartISO(start.toISOString())
    setDefaultCreateEndISO(end.toISOString())
    setOpenCreate(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    // Find the full event from events array
    const fullEvent = events.find(e => e.id === event.id)
    if (fullEvent) {
      setSelectedEvent(fullEvent)
      setSelectedReadOnly(false)
    }
  }

  const handleRequestClick = (event: Event) => {
    setSelectedEvent(event)
    setSelectedReadOnly(true)
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const handleCreateEvent = () => {
    setOpenCreate(true)
    setDefaultCreateStartISO(null)
    setDefaultCreateEndISO(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <EventCalendarGrid
            currentDate={currentDate}
            monthDays={monthDays}
            events={events.map((e): CalendarEvent => ({
              id: e.id,
              title: e.title,
              location: e.location,
              startDate: e.startDate,
              status: e.status,
              isMyDraft: e.isMyDraft,
              requestStatus: e.requestStatus,
              eventTypeName: e.eventTypeName,
            }))}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onCreateEvent={handleCreateEvent}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            getStatusColor={getStatusColor}
            getEventsForDate={getEventsForDate}
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
                const user = authService.getCurrentUser()
                if (!user) throw new Error("Bạn chưa đăng nhập")
                const isStaff = user.systemRole === "STAFF"
                await createEvent({
                  title: data.title,
                  description: data.description,
                  location: data.location,
                  startTime: data.startTime,
                  endTime: data.endTime,
                  eventTypeId: data.eventType ? Number(data.eventType) : undefined,
                  clubId: isStaff ? undefined : clubId,
                  images: data.eventImages as File[],
                })
                toast.success("Tạo sự kiện thành công!")
                // Refetch events to get the latest data
                await refetchEvents()
              } catch (error: unknown) {
                console.error("Error creating event:", error)
                toast.error(getErrorMessage(error, "Không thể tạo sự kiện. Vui lòng thử lại."))
                throw error
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
          onClose={() => { setSelectedEvent(null); setSelectedReadOnly(false) }}
          onUpdated={(upd: Event) => {
            setEvents(prev => prev.map(e => e.id === upd.id ? { ...e, ...upd } : e))
            setSelectedEvent(upd)
          }}
          onDeleted={(id) => {
            setEvents(prev => prev.filter(e => e.id !== id))
          }}
          readOnly={selectedReadOnly}
        />
      )}
    </>
  )
}
