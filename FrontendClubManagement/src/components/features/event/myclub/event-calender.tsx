"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EventDetailModal } from "./event-detail-modal"
import { type EventData, getEventsByClubId } from "@/service/EventService"

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

  // Fetch events from API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)
        const eventData = await getEventsByClubId(clubId)
        
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
        
        setEvents(mappedEvents)
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Không thể tải danh sách sự kiện')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [clubId])

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
                              className={`text-xs px-2 py-1 rounded font-medium truncate cursor-pointer hover:opacity-80 flex-shrink-0 ${getStatusColor(event.status)}`}
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
        </div>
      </div>

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </>
  )
}
