import React from "react";
import { CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import type { UpcomingEvent } from "../../types/homepage";

interface Props {
  events: UpcomingEvent[];
}

const UpcomingEvents: React.FC<Props> = ({ events }) => {
  return (
    <div>
      <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
        <CalendarClock className="text-[#ff6b35]" />
        Sự Kiện Sắp Diễn Ra
      </h3>

      {/* Không có sự kiện */}
      {!events ||
        (events.length === 0 && (
          <p className="text-sm text-gray-500">
            Hiện chưa có sự kiện nào sắp diễn ra.
          </p>
        ))}

      {/* Danh sách sự kiện */}
      <div className="space-y-6">
        {events?.slice(0, 3).map((event) => {
          // Parse time an toàn (tránh Safari lỗi)
          const eventDate = new Date(event.startTime + "+07:00");
          const now = new Date();

          const month = eventDate.toLocaleString("vi-VN", { month: "long" });
          const day = eventDate.getDate();

          const diffMs = eventDate.getTime() - now.getTime();
          const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          const isOngoing = daysUntil <= 0;

          return (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="flex gap-4 items-start group"
            >
              {/* Date */}
              <div className="text-center flex-shrink-0">
                <p className="text-sm text-gray-500 capitalize">{month}</p>
                <p className="text-2xl font-bold text-[#ff6b35]">{day}</p>
              </div>

              {/* Content */}
              <div className="border-l-2 pl-4 group-hover:border-[#ff6b35] transition-colors">
                <h4 className="font-bold group-hover:text-[#ff6b35] transition-colors">
                  {event.title}
                </h4>

                <p className="text-sm text-gray-600">
                  bởi {event.clubName ?? "Phòng ICPDP"}
                </p>

                {/* Status */}
                {isOngoing ? (
                  <div className="mt-2 text-sm font-semibold text-green-600">
                    Đang diễn ra
                  </div>
                ) : (
                  <div className="mt-2 text-sm font-semibold text-blue-600">
                    Còn {daysUntil} ngày
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Xem tất cả */}
      {events && events.length > 0 && (
        <Link
          to="/events"
          className="inline-block mt-8 text-[#ff6b35] hover:underline font-medium"
        >
          Xem tất cả sự kiện →
        </Link>
      )}
    </div>
  );
};

export default UpcomingEvents;
