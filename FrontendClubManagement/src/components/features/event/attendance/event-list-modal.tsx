"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, MapPin, Users } from "lucide-react"
import { 
  getClubEventsForPresident, 
  getEventRegistrationCount,
  type EventData 
} from "@/service/EventService"
import { useNavigate } from "react-router-dom"

interface EventListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clubId: number
}

export function EventListModal({ open, onOpenChange, clubId }: EventListModalProps) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(false)
  const [eventCounts, setEventCounts] = useState<Record<number, number>>({})

  useEffect(() => {
    const fetchEvents = async () => {
      if (!open || !clubId) return
      
      try {
        setLoading(true)
        const eventList = await getClubEventsForPresident(clubId)
        setEvents(eventList)
        
        // Fetch registration counts for each event
        const counts: Record<number, number> = {}
        await Promise.all(
          eventList.map(async (event) => {
            try {
              const count = await getEventRegistrationCount(event.id)
              counts[event.id] = count
            } catch (error) {
              console.error(`Error fetching count for event ${event.id}:`, error)
              counts[event.id] = 0
            }
          })
        )
        setEventCounts(counts)
      } catch (error) {
        console.error("Error fetching events:", error)
        alert("Không thể tải danh sách sự kiện")
      } finally {
        setLoading(false)
      }
    }
    
    fetchEvents()
  }, [open, clubId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric" 
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("vi-VN", { 
      hour: "2-digit", 
      minute: "2-digit" 
    })
  }

  const handleMarkAttendance = (eventId: number) => {
    navigate(`/myclub/events/attendance/${eventId}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chọn sự kiện để điểm danh</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Đang tải danh sách sự kiện...</span>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Không có sự kiện nào để điểm danh</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {events.map((event) => {
              const startDate = new Date(event.startTime)
              const count = eventCounts[event.id] || 0
              
              return (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground mb-2">
                          {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          {event.location || "Chưa có địa điểm"}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(event.startTime)} - {formatTime(event.startTime)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">
                            {event.location || "Chưa có địa điểm"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{count} sinh viên</span>
                        </div>
                      </div>
                      
                      <Button
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => handleMarkAttendance(event.id)}
                      >
                        Điểm Danh
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}




