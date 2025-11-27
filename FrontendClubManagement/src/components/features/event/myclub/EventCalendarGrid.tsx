
import { Card } from "@/components/ui/card"
import { EventCalendarHeader } from "./EventCalendarHeader"
import { EventCell } from "./EventCell"
// Define the CalendarEvent interface
export interface CalendarEvent {
  id: string
  title: string
  location: string
  startDate: Date
  status: "upcoming" | "ongoing" | "completed"
  isMyDraft?: boolean
  requestStatus?: string
  eventTypeName?: string
  isPendingPublish?: boolean
}

interface EventCalendarGridProps {
  currentDate: Date
  monthDays: (number | null)[]
  events: CalendarEvent[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onCreateEvent: () => void
  onDayClick: (day: number) => void
  onEventClick: (event: CalendarEvent) => void
  getStatusColor: (status: string) => string
  getEventsForDate: (day: number | null) => CalendarEvent[]
  clubId?: number
}

const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

export function EventCalendarGrid({
  currentDate,
  monthDays,
  onPrevMonth,
  onNextMonth,
  onCreateEvent,
  onDayClick,
  onEventClick,
  getStatusColor,
  getEventsForDate,
  clubId,
}: EventCalendarGridProps) {
  return (
    <Card className="p-6 shadow-lg">
      <EventCalendarHeader
        currentDate={currentDate}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onCreateEvent={onCreateEvent}
        clubId={clubId}
      />

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-border">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-muted-foreground text-sm py-3 border-r border-border last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="border-l border-t border-border">
        <div className="grid grid-cols-7">
          {monthDays.map((day, index) => {
            const dayEvents = getEventsForDate(day)
            const isLastInRow = (index + 1) % 7 === 0
            const isLastRow = index >= monthDays.length - 7

            return (
              <div
                key={index}
                className={`${
                  isLastInRow ? "border-r-0" : ""
                } ${isLastRow ? "border-b-0" : ""}`}
              >
                <EventCell
                  day={day}
                  events={dayEvents}
                  onDayClick={onDayClick}
                  onEventClick={onEventClick}
                  getStatusColor={getStatusColor}
                />
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

