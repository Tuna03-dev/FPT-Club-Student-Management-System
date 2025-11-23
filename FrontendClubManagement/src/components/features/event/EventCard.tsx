import { MapPin, Clock } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { EventData } from "@/service/EventService"
import { Badge } from "@/components/ui/badge"
import { computeEventStatus } from "@/service/EventService"
import { Link } from "react-router-dom"

interface EventCardProps {
  event: EventData
}

export function EventCard({ event }: EventCardProps) {
  const start = new Date(event.startTime)
  const end = new Date(event.endTime)
  const dateLabel = start.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
  const timeLabel = `${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
  const imageUrl = event.mediaUrls?.[0] || "/placeholder.svg"
  const status = computeEventStatus(new Date().toISOString(), event.startTime, event.endTime)

  const statusConfig: Record<string, { label: string; className: string }> = {
    upcoming: { label: "Sắp diễn ra", className: "bg-blue-100 text-blue-700 border-blue-200" },
    ongoing: { label: "Đang diễn ra", className: "bg-green-100 text-green-700 border-green-200" },
    completed: { label: "Đã kết thúc", className: "bg-gray-100 text-gray-600 border-gray-200" },
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border group">
      <Link to={`/events/${event.id}`} className="block">
        <div className="relative h-48 overflow-hidden bg-muted cursor-pointer">
          <img
            src={imageUrl}
            alt={event.title}
            className="object-cover w-full h-48 group-hover:scale-105 transition-transform duration-300"
          />
          {event.eventTypeName && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {event.eventTypeName}
              </Badge>
            </div>
          )}
          {event.clubName && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-muted/80 text-foreground border-border">
                {event.clubName}
              </Badge>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-lg flex flex-col items-center justify-center border border-primary/20">
            <span className="text-xs font-medium text-primary uppercase">
              {start.toLocaleDateString("vi-VN", { month: "short" })}
            </span>
            <span className="text-xl font-bold text-primary">{start.getDate()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <Link to={`/events/${event.id}`} className="block">
              <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors cursor-pointer hover:underline">
                {event.title}
              </h3>
            </Link>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>
              {dateLabel} • {timeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
          <div>
            <Badge variant="secondary" className={statusConfig[status].className}>{statusConfig[status].label}</Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0">
        <Link to={`/events/${event.id}`} className="w-full">
          <Button className="w-full" variant="outline" size="sm">
            Xem chi tiết
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
