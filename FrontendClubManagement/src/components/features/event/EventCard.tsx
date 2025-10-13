import { MapPin, Users, Clock } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Event {
  id: number
  title: string
  date: string
  time: string
  location: string
  category: string
  attendees: number
  maxAttendees: number
  image: string
  description: string
  organizer: string
  status: string
}

interface EventCardProps {
  event: Event
}

const categoryColors: Record<string, string> = {
  Workshop: "bg-primary/10 text-primary border-primary/20",
  Competition: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  Seminar: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  Entertainment: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  Career: "bg-chart-5/10 text-chart-5 border-chart-5/20",
}

export function EventCard({ event }: EventCardProps) {
  const attendancePercentage = (event.attendees / event.maxAttendees) * 100
  const isAlmostFull = attendancePercentage >= 80

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border group">
      <div className="relative h-48 overflow-hidden bg-muted">
        <img
        src={event.image || "/placeholder.svg"}
        alt={event.title}
        className="object-cover w-full h-48 group-hover:scale-105 transition-transform duration-300"
        />

        <div className="absolute top-3 right-3">
          <Badge className={categoryColors[event.category] || "bg-secondary"}>{event.category}</Badge>
        </div>
      </div>

      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-lg flex flex-col items-center justify-center border border-primary/20">
            <span className="text-xs font-medium text-primary uppercase">
              {new Date(event.date).toLocaleDateString("vi-VN", { month: "short" })}
            </span>
            <span className="text-xl font-bold text-primary">{new Date(event.date).getDate()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <p className="text-sm text-muted-foreground">{event.organizer}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              {event.attendees}/{event.maxAttendees} người tham gia
            </span>
            {isAlmostFull && (
              <Badge
                variant="secondary"
                className="ml-auto text-xs bg-destructive/10 text-destructive border-destructive/20"
              >
                Sắp đầy
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${attendancePercentage}%` }}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0 flex gap-2">
        <Button className="flex-1" size="sm">
          Đăng ký ngay
        </Button>
        <Button variant="outline" size="sm">
          Chi tiết
        </Button>
      </CardFooter>
    </Card>
  )
}
