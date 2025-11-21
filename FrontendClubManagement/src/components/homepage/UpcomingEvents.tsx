import React from "react"
import { CalendarClock } from "lucide-react"
import { Link } from "react-router-dom"
import type { UpcomingEvent } from "../../types/homepage"

interface Props {
  events: UpcomingEvent[]
}

const UpcomingEvents: React.FC<Props> = ({ events }) => {
  if (!events?.length) {
    return (
      <div>
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
          <CalendarClock className="text-[#ff6b35]" />
          Sự Kiện Sắp Diễn Ra
        </h3>
        <p className="text-sm text-gray-500">Hiện chưa có sự kiện nào sắp diễn ra.</p>
      </div>
    )
  }

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
          const daysUntil = Math.ceil(
            (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )

          return (
            <Link
              key={event.id}
              to={`/events/${event.id}`} // ✅ click là vào trang chi tiết
              className="flex gap-4 items-start group"
            >
              <div className="text-center flex-shrink-0">
                <p className="text-sm text-gray-500">{month}</p>
                <p className="text-2xl font-bold text-[#ff6b35]">{day}</p>
              </div>

              <div className="border-l-2 pl-4 group-hover:border-[#ff6b35] transition-colors">
                <h4 className="font-bold group-hover:text-[#ff6b35] transition-colors">
                  {event.title}
                </h4>
                <p className="text-sm text-gray-600">bởi {event.clubName}</p>
                {daysUntil > 0 && (
                  <div className="mt-2 text-sm font-semibold text-blue-600">
                    Còn {daysUntil} ngày
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      <Link
        to="/events"
        className="inline-block mt-8 text-[#ff6b35] hover:underline font-medium"
      >
        Xem tất cả sự kiện →
      </Link>
    </div>
  )
}

export default UpcomingEvents
