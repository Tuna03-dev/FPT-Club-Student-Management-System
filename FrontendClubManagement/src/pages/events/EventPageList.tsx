"use client"

import { useEffect, useMemo, useState } from "react"
import { EventCard } from "../../components/features/event/EventCard"
import { EventCardSkeleton } from "../../components/features/event/EventCardSkeleton"
import { EventFilters } from "../../components/features/event/EventFilter"
import { Calendar, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { computeEventStatus, getAllEventTypes, getAllClubs, getAllEventsByFilter, type EventStatusFilter, type EventTypeDto, type ClubDto, type EventData } from "@/service/EventService"

export function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all")
  const [selectedClubId, setSelectedClubId] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<EventStatusFilter>("all")
  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([])
  const [clubs, setClubs] = useState<ClubDto[]>([])
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  

  // Fetch event types and clubs once
  useEffect(() => {
    let mounted = true
    
    const fetchData = async () => {
      try {
        const [types, clubsData] = await Promise.all([
          getAllEventTypes(),
          getAllClubs()
        ])
        if (mounted) {
          setEventTypes(types)
          setClubs(clubsData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }
    
    fetchData()
    return () => {
      mounted = false
    }
  }, [])

  // Fetch events when keyword, type, club, or page changes (server-side filtering & paging already applied on BE)
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
          clubId: selectedClubId !== "all" ? Number(selectedClubId) : undefined,
          page: currentPage,
          size: 12,
        })
        if (mounted) {
          setEvents(res.data)
          setTotalPages(Math.ceil(res.total / 12))
        }
      } catch (e) {
        console.error("Error fetching events:", e)
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
  }, [searchQuery, selectedTypeId, selectedClubId, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedTypeId, selectedClubId, selectedStatus])

  const filteredEvents = useMemo(() => {
    if (selectedStatus === "all") return events
    const nowIso = new Date().toISOString()
    return events.filter((e) => computeEventStatus(nowIso, e.startTime, e.endTime) === selectedStatus)
  }, [events, selectedStatus])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background">
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
            clubs={clubs}
            selectedTypeId={selectedTypeId}
            selectedClubId={selectedClubId}
            selectedStatus={selectedStatus}
            onTypeChange={setSelectedTypeId}
            onClubChange={setSelectedClubId}
            onStatusChange={(s) => setSelectedStatus(s as EventStatusFilter)}
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Tất cả sự kiện</h2>
            <p className="text-muted-foreground mt-1">
              {loading ? "Đang tải..." : `Trang ${currentPage} - Hiển thị ${filteredEvents.length} sự kiện${selectedStatus !== "all" ? ` (đã lọc theo trạng thái)` : ""}`}
            </p>
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 12 }, (_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center mt-12">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Trước
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-10 h-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Sau
              </Button>
            </div>
          </div>
        )}

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
