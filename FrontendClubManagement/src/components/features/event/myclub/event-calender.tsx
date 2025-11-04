"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
            const drafts = await getMyDraftEvents()
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
            for (const e of [...all, ...mappedDrafts]) {
              byId.set(e.id, { ...(byId.get(e.id) ?? {} as Event), ...e })
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
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [clubId])

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
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Đang tải sự kiện...</span>
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
                  const isClubPresident = !!user && user.systemRole === "CLUB_PRESIDENT"
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
            <div className="grid grid-cols-7 gap-2 mb-4">
              {dayNames.map((day) => (
                <div key={day} className="text-center font-semibold text-muted-foreground text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((day, index) => {
                const events = getEventsForDate(day)
                const hasUpcoming = events.some((e) => e.status === "upcoming")
                const hasOngoing = events.some((e) => e.status === "ongoing")
                const hasCompleted = events.some((e) => e.status === "completed")

                // Determine background color based on event status
                let bgColor = "bg-card"
                if (hasOngoing) bgColor = "bg-green-50"
                else if (hasUpcoming) bgColor = "bg-blue-50"
                else if (hasCompleted) bgColor = "bg-red-50"

                return (
                  <div
                    key={index}
                    className={`aspect-square p-2 rounded-lg border-2 transition-all flex flex-col ${
                      day ? "border-border hover:border-primary hover:shadow-md" : "border-transparent"
                    } ${bgColor}`}
                  >
                    {day && (
                      <>
                        <div className="text-sm font-semibold text-foreground mb-2">{day}</div>
                        
                        <div className="flex flex-col gap-1 flex-1 overflow-y-auto max-h-[80px]">
                          {events.map((event) => (
                            <div
                              key={event.id}
                              className={`text-xs px-2 py-1 rounded font-medium truncate cursor-pointer hover:opacity-80 flex-shrink-0 ${event.isMyDraft ? "bg-gray-400 text-white" : getStatusColor(event.status)}`}
                              title={`${event.title} - ${event.location} - ${event.startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEvent(event)
                              }}
                            >
                              <div className="truncate font-semibold">{event.title}</div>
                              <div className="truncate text-xs opacity-90">
                                {event.startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
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
                                    // STAFF: hoàn tất quy trình, loại khỏi danh sách
                                    setPendingRequests((prev) => (prev ?? []).filter(x => x.requestEventId !== req.requestEventId))
                                  } else if (userNow.systemRole === "CLUB_PRESIDENT") {
                                    await approveByClub(req.requestEventId, true)
                                    // PRESIDENT: chuyển trạng thái sang PENDING_UNIVERSITY, giữ item
                                    setPendingRequests((prev) => (prev ?? []).map(x => x.requestEventId === req.requestEventId ? { ...x, status: "PENDING_UNIVERSITY" } : x))
                                  }
                                } catch (e) {
                                  console.error("Approve failed", e)
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
                                  } else if (userNow.systemRole === "CLUB_PRESIDENT") {
                                    await approveByClub(req.requestEventId, false)
                                    // PRESIDENT từ chối: cập nhật status và ẩn nút
                                    setPendingRequests((prev) => (prev ?? []).map(x => x.requestEventId === req.requestEventId ? { ...x, status: "REJECTED_CLUB" } : x))
                                  }
                                } catch (e) {
                                  console.error("Reject failed", e)
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
            onSubmit={async (data: EventFormValues) => {
              const user = authService.getCurrentUser()
              if (!user) throw new Error("Bạn chưa đăng nhập")
              const isStaff = user.systemRole === "STAFF"
              const created = await createEvent({
                title: data.title,
                description: data.description,
                location: data.location,
                startTime: data.startTime,
                endTime: data.endTime,
                eventTypeId: data.eventType ? Number(data.eventType) : undefined,
                clubId: isStaff ? undefined : clubId,
                images: data.eventImages as File[],
              })
              // Update calendar view with new event
              setEvents(prev => ([
                ...prev,
                {
                  id: created.id.toString(),
                  title: created.title,
                  description: created.description,
                  startDate: new Date(created.startTime),
                  endDate: new Date(created.endTime),
                  location: created.location,
                  attendees: 0,
                  status: determineEventStatus(new Date(created.startTime), new Date(created.endTime)),
                  images: created.mediaUrls || [],
                }
              ]))
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
