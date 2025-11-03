"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, MapPin, Users, ChevronLeft, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  getClubEventsForPresident, 
  getEventRegistrationCount,
  type EventData 
} from "@/service/EventService"
import { computeEventStatus } from "@/service/EventService"
import { authService } from "@/services/authService"

export default function EventAttendanceListPage() {
  const navigate = useNavigate()
  const params = useParams()
  // Get clubId from parent route (route pattern: /myclub/:clubId/events/attendance-list)
  const clubId = params.clubId ? parseInt(params.clubId as string, 10) : undefined
  
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(false)
  const [eventCounts, setEventCounts] = useState<Record<number, number>>({})
  const [keyword, setKeyword] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "ongoing" | "completed">("all")

  useEffect(() => {
    const fetchEvents = async () => {
      if (!clubId) {
        alert("Không tìm thấy thông tin câu lạc bộ")
        navigate("/myclub/events")
        return
      }
      
      try {
        setLoading(true)
        const eventList: EventData[] = await getClubEventsForPresident(clubId, keyword ? { keyword } : undefined)
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
  }, [clubId, navigate])

  // Debounced client-side filter for status and refetch when keyword changes
  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        if (!clubId) return
        setLoading(true)
        try {
          const list = await getClubEventsForPresident(clubId, keyword ? { keyword } : undefined)
          const nowIso = new Date().toISOString()
          const filtered = list.filter(ev => {
            if (statusFilter === 'all') return true
            const st = computeEventStatus(nowIso, ev.startTime, ev.endTime)
            return st === statusFilter
          })
          setEvents(filtered)
        } finally {
          setLoading(false)
        }
      })()
    }, 300)
    return () => clearTimeout(t)
  }, [keyword, statusFilter, clubId])

  // removed client-side search/filter

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

  const getStatusInfo = (startIso?: string, endIso?: string): { label: string; className: string } => {
    if (!startIso || !endIso) return { label: "", className: "hidden" }
    const status = computeEventStatus(new Date().toISOString(), startIso, endIso)
    switch (status) {
      case "upcoming":
        return { label: "Sắp diễn ra", className: "bg-blue-100 text-blue-700 border border-blue-200" }
      case "ongoing":
        return { label: "Đang diễn ra", className: "bg-green-100 text-green-700 border border-green-200" }
      case "completed":
        return { label: "Đã kết thúc", className: "bg-red-100 text-red-700 border border-red-200" }
      default:
        return { label: status, className: "bg-muted text-foreground" }
    }
  }

  const handleMarkAttendance = (eventId: number) => {
    if (!clubId) {
      alert("Không tìm thấy thông tin câu lạc bộ")
      return
    }
    const user = authService.getCurrentUser()
    const isPresident = user?.systemRole === "CLUB_PRESIDENT"
    navigate(`/myclub/${clubId}/events/attendance/${eventId}${isPresident ? "" : "?mode=view"}`)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => navigate("/myclub/events")}
          >
            <ChevronLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Chọn sự kiện để điểm danh</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-1/2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tiêu đề / mô tả / địa điểm"
              className="pl-9"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="md:w-48">
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="upcoming">Sắp diễn ra</SelectItem>
                <SelectItem value="ongoing">Đang diễn ra</SelectItem>
                <SelectItem value="completed">Đã kết thúc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const startDate = new Date(event.startTime)
              const count = eventCounts[event.id] || 0
              const statusInfo = getStatusInfo(event.startTime, event.endTime)
              const statusVal = ((): "upcoming"|"ongoing"|"completed"|"all" => computeEventStatus(new Date().toISOString(), event.startTime, event.endTime))()
              const isCompleted = statusVal === "completed"
              
              return (
                <Card key={event.id} className="hover:shadow-lg transition-shadow h-full">
                  <CardContent className="pt-10 relative h-full">
                    {/* Badges */}
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className={`text-xs ${statusInfo.className}`}>{statusInfo.label}</Badge>
                    </div>
                    <div className="absolute top-2 right-2 z-10">
                      {event.eventTypeName ? (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border border-purple-200">
                          {event.eventTypeName}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="space-y-4 flex flex-col h-full">
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
                        className={`w-full ${isCompleted 
                          ? "bg-white text-foreground border border-border hover:bg-orange-500 hover:text-white hover:border-orange-600" 
                          : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                        onClick={() => isCompleted ? navigate(`/myclub/${clubId}/events/attendance/${event.id}?mode=view`) : handleMarkAttendance(event.id)}
                        style={{ marginTop: "auto" }}
                      >
                        {isCompleted ? "Xem" : "Điểm Danh"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

