"use client"
import { Video } from "lucide-react"
import type { CalendarEvent } from "./EventCalendarGrid"

interface EventCellProps {
  day: number | null
  events: CalendarEvent[]
  onDayClick: (day: number) => void
  onEventClick: (event: CalendarEvent) => void
  getStatusColor: (status: string) => string
}

export function EventCell({
  day,
  events,
  onDayClick,
  onEventClick,
  getStatusColor,
}: EventCellProps) {
  if (!day) {
    return (
      <div className="aspect-square p-2 border-r border-b border-border bg-muted/30" />
    )
  }

  const hasUpcoming = events.some((e) => e.status === "upcoming")
  const hasOngoing = events.some((e) => e.status === "ongoing")
  const hasCompleted = events.some((e) => e.status === "completed")

  let bgColor = "bg-card"
  if (hasOngoing) bgColor = "bg-green-50/50"
  else if (hasUpcoming) bgColor = "bg-blue-50/50"
  else if (hasCompleted) bgColor = "bg-red-50/50"

  return (
    <div
      className={`aspect-square p-2 border-r border-b border-border transition-all flex flex-col ${bgColor} hover:bg-accent/50 cursor-pointer`}
      onClick={() => onDayClick(day)}
    >
      <div className="text-sm font-semibold text-foreground mb-1 flex-shrink-0">
        {day}
      </div>
      <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto max-h-[100px] min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/30">
        {events.map((event) => {
          const isPendingPublish = event.isPendingPublish === true
          const isDraft =
            !isPendingPublish &&
            (event.isMyDraft === true ||
              (event.requestStatus !== undefined &&
                event.requestStatus !== null &&
                event.requestStatus !== ""))

          return (
            <div
              key={event.id}
              className={`text-[11px] px-1.5 py-0.5 rounded font-medium truncate cursor-pointer hover:opacity-90 flex-shrink-0 transition-opacity inline-flex items-center gap-1 ${
                isPendingPublish
                  ? "!bg-orange-500 !text-white"
                  : isDraft
                    ? "!bg-gray-400 !text-white"
                    : getStatusColor(event.status)
              }`}
              title={`${event.title}${event.isMyDraft ? " (Draft)" : ""} - ${event.location} - ${event.startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`}
              onClick={(e) => {
                e.stopPropagation()
                onEventClick(event)
              }}
            >
              {(() => {
                const t = event.eventTypeName
                  ? String(event.eventTypeName).trim().toUpperCase()
                  : ""
                if (t === "MEETING") {
                  return <Video className="w-3 h-3 align-middle flex-shrink-0 text-black dark:text-white" />
                }
                return null
              })()}
              {event.title}
            </div>
          )
        })}
      </div>
    </div>
  )
}

