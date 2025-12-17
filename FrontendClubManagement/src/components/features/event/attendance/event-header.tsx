

import { Calendar, MapPin, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Event {
  id: string
  name: string
  date: string
  time: string
  location: string
}

interface EventHeaderProps {
  event?: Event
}

export function EventHeader({ event }: EventHeaderProps) {
  const eventName = event?.name || "Điểm Danh Sự Kiện"
  const eventDate = event?.date || new Date().toLocaleDateString("vi-VN")
  const eventTime = event?.time || new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  const eventLocation = event?.location || "Tòa nhà FPT"

  return (
    <Card className="border-2 border-primary bg-gradient-to-r from-primary/10 to-primary/5">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">{eventName}</h1>
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">📋</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{eventDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{eventTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">{eventLocation}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
