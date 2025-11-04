"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { EventDetailModal } from "./event-detail-modal"
import { type EventData, getEventsByClubId, getStaffEventsByClubId, getStaffAllEvents, createEvent, getAllEventTypes, getPendingRequests, type PendingRequestDto, approveByClub, approveByUniversity, getMyDraftEvents, type MyDraftEventDto } from "@/service/EventService"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreateEventForm } from "./create-event-form"
import { authService } from "@/services/authService"

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
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [defaultCreateStartISO, setDefaultCreateStartISO] = useState<string | null>(null)
  const [defaultCreateEndISO, setDefaultCreateEndISO] = useState<string | null>(null)
  const [eventTypes, setEventTypes] = useState<Array<{ id: string; name: string }>>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequestDto[] | null>(null)
  const [loadingPending, setLoadingPending] = useState(false)

  // Fetch events from API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Check if user is STAFF - if yes, use staff API (no membership check)
        const user = authService.getCurrentUser()
        const roleUpper = user?.systemRole ? String(user.systemRole).trim().toUpperCase() : undefined
        const isStaff = roleUpper === "STAFF"
        
        let eventData: EventData[]
        if (isStaff) {
          // Staff: use staff API - can view events by clubId or all events
          // clubId = 0 or null means "all events"
          if (clubId && clubId > 0) {
            eventData = await getStaffEventsByClubId(clubId)
          } else {
            eventData = await getStaffAllEvents()
          }
        } else {
          // Non-staff: use regular API (requires membership check)
          // Must have valid clubId
          if (!clubId || clubId <= 0) {
            throw new Error("Club ID is required")
          }
          eventData = await getEventsByClubId(clubId)
        }
        
        // Map API data to Event interface
        const mappedEvents: Event[] = eventData.map((event: EventData) => ({
          id: event.id.toString(),
          title: event.title,
          description: event.description,
          startDate: new Date(event.startTime),
          endDate: new Date(event.endTime),
          location: event.location,
          attendees: 0, // Default value since attendees not in EventData
          status: determineEventStatus(new Date(event.startTime), new Date(event.endTime)),
          images: event.mediaUrls || []
        }))
        
        let all: Event[] = mappedEvents

        // If user is CLUB_PRESIDENT or CLUB_OFFICER, also fetch my draft events and merge
        if (roleUpper === "CLUB_PRESIDENT" || roleUpper === "CLUB_OFFICER") {
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
            }))
            // Merge by id, prefer draft flag if same id appears
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
          } catch (e) {
            console.warn("Failed to fetch my draft events", e)
          }
        }

        setEvents(all)
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Không thể tải danh sách sự kiện')
        toast.error('Không thể tải danh sách sự kiện')
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
        images: event.mediaUrls || []
      }))
      
      let all: Event[] = mappedEvents

      if (roleUpper === "CLUB_PRESIDENT" || roleUpper === "CLUB_OFFICER") {
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
        } catch (e) {
          console.warn("Failed to fetch my draft events", e)
        }
      }

      setEvents(all)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching events:', err)
      setError('Không thể tải danh sách sự kiện')
      toast.error('Không thể tải danh sách sự kiện')
      setLoading(false)
    }
  }

  // Load event types for create form
  useEffect(() => {
    (async () => {
      try {
        const types = await getAllEventTypes()
        setEventTypes(types.map(t => ({ id: String(t.id), name: t.typeName })))
      } catch (e) {
        console.error("Error fetching event types:", e)
      }
    })()
  }, [])

  // Load pending requests for STAFF or CLUB_PRESIDENT
  useEffect(() => {
    const user = authService.getCurrentUser()
    if (!user) return
    const isReviewer = ["STAFF", "CLUB_PRESIDENT"].includes(user.systemRole)
    if (!isReviewer) return
    setLoadingPending(true)
    getPendingRequests()
      .then((list) => setPendingRequests(list))
      .catch(() => setPendingRequests([]))
      .finally(() => setLoadingPending(false))
  }, [])

  // Determine event status based on dates
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

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(i)
    }
    return days
  }, [currentDate])

  const getEventsForDate = (day: number | null) => {
    if (!day) return []
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return events.filter(
      (event) => event.startDate.toDateString() === date.toDateString()
    )
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


  const monthNames = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ]

  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

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

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="p-6 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {(() => {
                  const user = authService.getCurrentUser()
                  const canCreate = !!user && ["STAFF", "CLUB_PRESIDENT", "CLUB_OFFICER"].includes(user.systemRole)
                  
                  return (
                    <>
                      {canCreate && (
                        <Button onClick={() => setOpenCreate(true)}>+ Tạo sự kiện mới</Button>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 border-b border-border">
              {dayNames.map((day) => (
                <div key={day} className="text-center font-semibold text-muted-foreground text-sm py-3 border-r border-border last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="border-l border-t border-border">
              <div className="grid grid-cols-7">
                {monthDays.map((day, index) => {
                  const events = getEventsForDate(day)
                  const hasUpcoming = events.some((e) => e.status === "upcoming")
                  const hasOngoing = events.some((e) => e.status === "ongoing")
                  const hasCompleted = events.some((e) => e.status === "completed")

                  // Determine background color based on event status
                  let bgColor = "bg-card"
                  if (hasOngoing) bgColor = "bg-green-50/50"
                  else if (hasUpcoming) bgColor = "bg-blue-50/50"
                  else if (hasCompleted) bgColor = "bg-red-50/50"

                  const isLastInRow = (index + 1) % 7 === 0
                  const isLastRow = index >= monthDays.length - 7

                  return (
                <div
                      key={index}
                      className={`aspect-square p-2 border-r border-b border-border transition-all flex flex-col ${
                        isLastInRow ? "border-r-0" : ""
                      } ${isLastRow ? "border-b-0" : ""} ${
                        day ? `${bgColor} hover:bg-accent/50 cursor-pointer` : "bg-muted/30"
                      }`}
                      onClick={() => {
                        if (!day) return
                        const user = authService.getCurrentUser()
                        const canCreate = !!user && ["STAFF", "CLUB_PRESIDENT", "CLUB_OFFICER"].includes(user.systemRole)
                        if (!canCreate) return
                        // Prefill start 08:00, end +2h for selected day
                        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 8, 0, 0)
                        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
                        setDefaultCreateStartISO(start.toISOString())
                        setDefaultCreateEndISO(end.toISOString())
                        setOpenCreate(true)
                      }}
                    >
                      {day && (
                        <>
                          <div className="text-sm font-semibold text-foreground mb-1 flex-shrink-0">{day}</div>
                          
                          <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto max-h-[100px] min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30">
                            {events.map((event) => {
                              // Determine color: draft events should be gray, regardless of status
                              // Check if event is draft: either has isMyDraft flag or has requestStatus
                              const isDraft = event.isMyDraft === true || (event.requestStatus !== undefined && event.requestStatus !== null && event.requestStatus !== "")
                              
                              // Debug log (remove after testing)
                              if (event.isMyDraft || event.requestStatus) {
                                console.log("Draft event detected:", { id: event.id, title: event.title, isMyDraft: event.isMyDraft, requestStatus: event.requestStatus, isDraft })
                              }
                              
                              return (
                                <div
                                  key={event.id}
                                  className={`text-[11px] px-1.5 py-0.5 rounded font-medium truncate cursor-pointer hover:opacity-90 flex-shrink-0 transition-opacity ${
                                    isDraft 
                                      ? "!bg-gray-400 !text-white" 
                                      : getStatusColor(event.status)
                                  }`}
                                  title={`${event.title}${event.isMyDraft ? ' (Draft)' : ''} - ${event.location} - ${event.startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedEvent(event)
                                  }}
                                >
                                  {event.title}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Legend */}
        <div>
          <Card className="p-6 shadow-lg">
            <h3 className="text-lg font-bold text-foreground mb-4">Trạng thái sự kiện</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-sm text-foreground">Sắp diễn ra</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm text-foreground">Đang diễn ra</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span className="text-sm text-foreground">Đã kết thúc</span>
              </div>
              {(() => {
                const user = authService.getCurrentUser()
                const roleUpper = user?.systemRole ? String(user.systemRole).trim().toUpperCase() : undefined
                const canSeeDraft = roleUpper === "CLUB_PRESIDENT" || roleUpper === "CLUB_OFFICER"
                
                if (canSeeDraft) {
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded bg-gray-400"></div>
                      <span className="text-sm text-foreground">Chờ duyệt</span>
                    </div>
                  )
                }
                return null
              })()}
            </div>
            
            
          </Card>
          {/* Pending requests card (STAFF/CLUB_PRESIDENT) */}
          {(() => {
            const user = authService.getCurrentUser()
            const canReview = !!user && ["STAFF", "CLUB_PRESIDENT"].includes(user.systemRole)
            if (!canReview) return null
            const items = pendingRequests ?? []
            return (
              <Card className="p-6 shadow-lg mt-6 border-amber-300">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" />
                  <h3 className="text-lg font-bold text-foreground">Chờ duyệt{items.length != null ? ` (${items.length})` : ""}</h3>
                </div>
                {loadingPending ? (
                  <div className="text-sm text-muted-foreground">Đang tải danh sách...</div>
                ) : items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Không có yêu cầu nào</div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {items.map((req) => {
                      const user = authService.getCurrentUser()
                      const roleUpper = user?.systemRole ? String(user.systemRole).trim().toUpperCase() : undefined
                      const reqStatusUpper = req.status ? String(req.status).trim().toUpperCase() : undefined
                      const isPresidentActionable = roleUpper === "CLUB_PRESIDENT" && reqStatusUpper === "PENDING_CLUB"
                      const isStaffActionable = roleUpper === "STAFF" && reqStatusUpper === "PENDING_UNIVERSITY"
                      const showActions = isPresidentActionable || isStaffActionable
                      // Debug: check console to verify values
                      console.log("Debug approve buttons:", { userRole: roleUpper, reqStatus: req.status, reqStatusUpper, isStaffActionable, showActions })
                      return (
                      <div key={req.requestEventId} className="rounded-md border bg-amber-50 px-4 py-3">
                        <div className="font-semibold text-foreground">{req.requestTitle}</div>
                        <div className="text-xs text-muted-foreground">Tạo bởi: {req.createdBy?.fullName ?? "N/A"}</div>
                        {(() => {
                          const info = getRequestStatusInfo(req.status)
                          return (
                            <div className="text-xs text-muted-foreground mt-1 mb-3">
                              <span className={`inline-block rounded px-2 py-0.5 mr-2 ${info.className}`}>{info.label}</span>
                              {req.event ? (
                                <>
                                  <span>
                                    {new Date(req.event.startTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                    {" - "}
                                    {new Date(req.event.endTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                  </span>
                                  {req.event.location ? (<div className="mt-1">📍 {req.event.location}</div>) : null}
                                </>
                              ) : null}
                            </div>
                          )
                        })()}
                        {showActions && (
                          <div className="flex gap-3">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              onClick={async () => {
                                const userNow = authService.getCurrentUser()
                                if (!userNow) return
                                try {
                                  if (userNow.systemRole === "STAFF") {
                                    await approveByUniversity(req.requestEventId, true)
                                    setPendingRequests((prev) => (prev ?? []).filter(x => x.requestEventId !== req.requestEventId))
                                    toast.success("Đã duyệt sự kiện thành công")
                                  } else if (userNow.systemRole === "CLUB_PRESIDENT") {
                                    await approveByClub(req.requestEventId, true)
                                    setPendingRequests((prev) => (prev ?? []).map(x => x.requestEventId === req.requestEventId ? { ...x, status: "PENDING_UNIVERSITY" } : x))
                                    toast.success("Đã duyệt sự kiện. Đang chờ duyệt từ Nhà trường")
                                  }
                                  // Refetch events to update calendar
                                  await refetchEvents()
                                } catch (e: any) {
                                  console.error("Approve failed", e)
                                  toast.error(e?.response?.data?.message || "Không thể duyệt sự kiện. Vui lòng thử lại.")
                                }
                              }}
                            >
                              ✓ Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-rose-50 text-rose-600 hover:bg-rose-100"
                              onClick={async () => {
                                const userNow = authService.getCurrentUser()
                                if (!userNow) return
                                try {
                                  if (userNow.systemRole === "STAFF") {
                                    await approveByUniversity(req.requestEventId, false)
                                    setPendingRequests((prev) => (prev ?? []).filter(x => x.requestEventId !== req.requestEventId))
                                    toast.success("Đã từ chối sự kiện")
                                  } else if (userNow.systemRole === "CLUB_PRESIDENT") {
                                    await approveByClub(req.requestEventId, false)
                                    setPendingRequests((prev) => (prev ?? []).map(x => x.requestEventId === req.requestEventId ? { ...x, status: "REJECTED_CLUB" } : x))
                                    toast.success("Đã từ chối sự kiện")
                                  }
                                } catch (e: any) {
                                  console.error("Reject failed", e)
                                  toast.error(e?.response?.data?.message || "Không thể từ chối sự kiện. Vui lòng thử lại.")
                                }
                              }}
                            >
                              ✗ Từ chối
                            </Button>
                          </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })()}
          
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
            initialStartTime={defaultCreateStartISO ?? undefined}
            initialEndTime={defaultCreateEndISO ?? undefined}
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
              } catch (error: any) {
                console.error("Error creating event:", error)
                toast.error(error?.response?.data?.message || "Không thể tạo sự kiện. Vui lòng thử lại.")
                throw error
              }
            }}
            onSuccess={() => setOpenCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          clubId={clubId}
          onClose={() => setSelectedEvent(null)}
          onUpdated={(upd: Event) => {
            setEvents(prev => prev.map(e => e.id === upd.id ? { ...e, ...upd } : e))
            setSelectedEvent(upd)
          }}
          onDeleted={(id) => {
            setEvents(prev => prev.filter(e => e.id !== id))
          }}
        />
      )}
    </>
  )
}
