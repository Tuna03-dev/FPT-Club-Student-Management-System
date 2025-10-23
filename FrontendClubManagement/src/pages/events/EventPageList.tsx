"use client"

import { useEffect, useMemo, useState } from "react"
import { EventCard } from "../../components/features/event/EventCard"
import { EventFilters } from "../../components/features/event/EventFilter"
import { Calendar, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { computeEventStatus, getAllEventTypes, getAllEventsByFilter, type EventStatusFilter, type EventTypeDto, type EventData } from "@/service/EventService"

export function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<EventStatusFilter>("all")
  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([])
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")

  // Fetch event types once
  useEffect(() => {
    let mounted = true
    getAllEventTypes()
      .then((types) => {
        if (mounted) setEventTypes(types)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  // Fetch events when keyword or type changes (server-side filtering & paging already applied on BE)
  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    const fetchData = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await getAllEventsByFilter({
          keyword: searchQuery || undefined,
          eventTypeId: selectedTypeId !== "all" ? Number(selectedTypeId) : undefined,
          page: 1,
          size: 30,
        })
        if (mounted) setEvents(res.data)
      } catch (mounted) {
        if (mounted) setError("Không thể tải danh sách sự kiện")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    const debounce = setTimeout(fetchData, 300)
    return () => {
      mounted = false
      controller.abort()
      clearTimeout(debounce)
    }
  }, [searchQuery, selectedTypeId])

  const filteredEvents = useMemo(() => {
    if (selectedStatus === "all") return events
    const nowIso = new Date().toISOString()
    return events.filter((e) => computeEventStatus(nowIso, e.startTime, e.endTime) === selectedStatus)
  }, [events, selectedStatus])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">FPT</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">FPT Club Management</h1>
                <p className="text-sm text-muted-foreground">Quản lý câu lạc bộ sinh viên</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Trang chủ
              </a>
              <a href="#" className="text-sm font-medium text-primary">
                Sự kiện
              </a>
              <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Câu lạc bộ
              </a>
              <a href="#" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                Liên hệ
              </a>
            </nav>
            <Button className="hidden md:flex">Đăng nhập</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-accent/20 to-background border-b border-border">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Calendar className="w-4 h-4" />
              <span>Sự kiện</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              Khám phá các sự kiện tại FPT University
            </h1>
            <p className="text-lg text-muted-foreground mb-8 text-pretty">
              Tham gia các hoạt động, workshop, và sự kiện thú vị được tổ chức bởi các câu lạc bộ sinh viên FPT
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm kiếm sự kiện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-base bg-card border-border shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <EventFilters
            eventTypes={eventTypes}
            selectedTypeId={selectedTypeId}
            selectedStatus={selectedStatus}
            onTypeChange={setSelectedTypeId}
            onStatusChange={(s) => setSelectedStatus(s as EventStatusFilter)}
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Tất cả sự kiện</h2>
            <p className="text-muted-foreground mt-1">
              {loading ? "Đang tải..." : `Tìm thấy ${filteredEvents.length} sự kiện`}
            </p>
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {!loading && filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Không tìm thấy sự kiện</h3>
            <p className="text-muted-foreground">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        )}
      </div>
    </div>
  )
}
