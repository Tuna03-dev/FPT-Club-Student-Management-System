import React from "react"
import { CalendarClock } from "lucide-react"
import type { UpcomingEvent } from "../../types/homepage"

interface Props {
  events: UpcomingEvent[]
}

const UpcomingEvents: React.FC<Props> = ({ events }) => {
  return (
    <div>
      <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
        <CalendarClock className="text-[#ff6b35]" />
        Sự Kiện Sắp Diễn Ra
      </h3>
      <div className="space-y-6">
        {events.slice(0, 3).map((event) => {
          const eventDate = new Date(event.startTime)
          const month = eventDate.toLocaleString("vi-VN", { month: "long" })
          const day = eventDate.getDate()
          const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          return (
            <div key={event.id} className="flex gap-4 items-start">
              <div className="text-center flex-shrink-0">
                <p className="text-sm text-gray-500">{month}</p>
                <p className="text-2xl font-bold text-[#ff6b35]">{day}</p>
              </div>
              <div className="border-l-2 pl-4">
                <h4 className="font-bold">{event.title}</h4>
                <p className="text-sm text-gray-600">bởi {event.clubName}</p>
                {daysUntil > 0 && (
                  <div className="mt-2 text-sm font-semibold text-blue-600">
                    Còn {daysUntil} ngày
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <a href="/events" className="inline-block mt-8 text-[#ff6b35] hover:underline font-medium">
        Xem tất cả sự kiện →
      </a>
    </div>
  )
}

export default UpcomingEvents
