"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { EventCard } from "../../components/features/event/EventCard"
import { EventCardSkeleton } from "../../components/features/event/EventCardSkeleton"
import { EventFilters } from "../../components/features/event/EventFilter"
import { Calendar, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { computeEventStatus, getAllEventTypes, getAllClubs, getAllEventsByFilter, type EventStatusFilter, type EventTypeDto, type ClubDto, type EventData } from "@/service/EventService"
import { useWebSocket, type EventWebSocketPayload } from "@/hooks/useWebSocket"
import { toast } from "sonner"
import { authService } from "@/services/authService"

export function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all")
  const [selectedClubId, setSelectedClubId] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<EventStatusFilter>("all")
  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([])
  const [clubs, setClubs] = useState<ClubDto[]>([])
  const [events, setEvents] = useState<EventData[]>([])
  const [allFilteredEvents, setAllFilteredEvents] = useState<EventData[]>([]) // Store all filtered events when searching
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

  // Use ref to track if filters just changed to prevent pagination effect from running
  const filtersJustChangedRef = useRef(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0) // Trigger to force refresh

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
    filtersJustChangedRef.current = true
  }, [searchQuery, selectedTypeId, selectedClubId, selectedStatus])

  // Fetch events when filters change
  // Backend filters AFTER pagination, so we need to fetch all pages when searching
  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    const fetchData = async () => {
      setLoading(true)
      setError("")
      
      const hasKeyword = !!searchQuery
      
      // If searching, fetch all pages and filter client-side
      // Otherwise, just fetch page 1
      if (hasKeyword) {
        try {
          // Fetch all pages to find all matching results
          const allResults: EventData[] = []
          let page = 1
          let hasMore = true
          let totalFromServer = 0
          
          while (hasMore && mounted) {
            const res = await getAllEventsByFilter({
              keyword: searchQuery || undefined,
              eventTypeId: selectedTypeId !== "all" ? Number(selectedTypeId) : undefined,
              clubId: selectedClubId !== "all" ? Number(selectedClubId) : undefined,
              page: page,
              size: 12,
            })
            
            totalFromServer = res.total
            const filtered = res.data || []
            
            // Add filtered results (even if empty, we need to check all pages)
            if (filtered.length > 0) {
              allResults.push(...filtered)
            }
            
            // Check if there are more pages to fetch
            // Continue fetching even if current page has no results
            const totalPages = Math.ceil(totalFromServer / 12)
            hasMore = page < totalPages
            page++
            
            // Safety limit: don't fetch more than 50 pages
            if (page > 50) break
          }
          
          if (mounted) {
            // Store all filtered results for client-side pagination
            setAllFilteredEvents(allResults)
            
            // Paginate the filtered results client-side
            const pageSize = 12
            const totalFiltered = allResults.length
            const totalPagesFiltered = Math.ceil(totalFiltered / pageSize)
            const startIndex = (1 - 1) * pageSize
            const endIndex = startIndex + pageSize
            const paginatedResults = allResults.slice(startIndex, endIndex)
            
            setEvents(paginatedResults)
            setTotalPages(totalPagesFiltered > 0 ? totalPagesFiltered : 1)
            setCurrentPage(1)
            filtersJustChangedRef.current = false
          }
        } catch (e) {
          console.error("Error fetching events:", e)
          if (mounted) setError("Không thể tải danh sách sự kiện")
          filtersJustChangedRef.current = false
        } finally {
          if (mounted) setLoading(false)
        }
      } else {
        // No keyword, normal pagination
        const requestParams = {
          keyword: undefined,
          eventTypeId: selectedTypeId !== "all" ? Number(selectedTypeId) : undefined,
          clubId: selectedClubId !== "all" ? Number(selectedClubId) : undefined,
          page: 1,
          size: 12,
        }
        
        try {
          const res = await getAllEventsByFilter(requestParams)
          if (mounted) {
            setEvents(res.data)
            setAllFilteredEvents([]) // Clear when no keyword search
            const hasFilters = selectedTypeId !== "all" || selectedClubId !== "all"
            let actualTotal = res.total
            
            if (hasFilters && res.count !== undefined && res.count !== null && res.count > 0) {
              actualTotal = res.count
            }
            
            const serverTotalPages = actualTotal > 0 ? Math.ceil(actualTotal / 12) : 1
            setTotalPages(serverTotalPages)
            setCurrentPage(1)
            filtersJustChangedRef.current = false
          }
        } catch (e) {
          console.error("Error fetching events:", e)
          if (mounted) setError("Không thể tải danh sách sự kiện")
          filtersJustChangedRef.current = false
        } finally {
          if (mounted) setLoading(false)
        }
      }
    }

    const debounce = setTimeout(fetchData, 300)
    return () => {
      mounted = false
      controller.abort()
      clearTimeout(debounce)
    }
  }, [searchQuery, selectedTypeId, selectedClubId, selectedStatus, refreshTrigger])

  // Handle pagination - use client-side pagination if searching, otherwise server-side
  useEffect(() => {
    // Skip if filters just changed (handled by filter effect above)
    if (filtersJustChangedRef.current) return
    // Skip if we're on page 1 (already handled by filter effect above)
    if (currentPage === 1) return

    const hasKeyword = !!searchQuery
    
    // If searching, use client-side pagination from allFilteredEvents
    if (hasKeyword && allFilteredEvents.length > 0) {
      const pageSize = 12
      const startIndex = (currentPage - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedResults = allFilteredEvents.slice(startIndex, endIndex)
      setEvents(paginatedResults)
      return
    }

    // Otherwise, fetch from server
    let mounted = true
    const controller = new AbortController()

    const fetchData = async () => {
      setLoading(true)
      setError("")
      
      const requestParams = {
        keyword: undefined,
        eventTypeId: selectedTypeId !== "all" ? Number(selectedTypeId) : undefined,
        clubId: selectedClubId !== "all" ? Number(selectedClubId) : undefined,
        page: currentPage,
        size: 12,
      }
      
      try {
        const res = await getAllEventsByFilter(requestParams)
        if (mounted) {
          setEvents(res.data)
          const hasFilters = selectedTypeId !== "all" || selectedClubId !== "all"
          let actualTotal = res.total
          
          if (hasFilters && res.count !== undefined && res.count !== null && res.count > 0) {
            actualTotal = res.count
          }
          
          const serverTotalPages = actualTotal > 0 ? Math.ceil(actualTotal / 12) : 1
          setTotalPages(serverTotalPages)
        }
      } catch (e) {
        console.error("Error fetching events:", e)
        if (mounted) setError("Không thể tải danh sách sự kiện")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [currentPage, searchQuery, selectedTypeId, selectedClubId, allFilteredEvents])

  const filteredEvents = useMemo(() => {
    if (selectedStatus === "all") return events
    const nowIso = new Date().toISOString()
    return events.filter((e) => computeEventStatus(nowIso, e.startTime, e.endTime) === selectedStatus)
  }, [events, selectedStatus])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // WebSocket connection for real-time event updates
  const token = localStorage.getItem("accessToken") || null;
  const { isConnected, subscribeToSystemRole, subscribeToUserQueue } = useWebSocket(token);

  // 🔔 WebSocket: Subscribe to STUDENT/TEAM_OFFICER/CLUB_OFFICER roles for event publication notifications
  useEffect(() => {
    if (!isConnected) return;

    const user = authService.getCurrentUser();
    if (!user) return;
    
    const roleUpper = user.systemRole
      ? String(user.systemRole).trim().toUpperCase()
      : "";
    
    // Only subscribe if user is not STAFF (STUDENT, TEAM_OFFICER, CLUB_OFFICER)
    if (roleUpper === "STAFF" || roleUpper === "ADMIN") return;

    const handleEventPublished = (msg: any) => {
      if (msg.type !== "EVENT") return;

      const payload = msg.payload as EventWebSocketPayload;

      if (msg.action === "PUBLISHED") {
        toast.info("Sự kiện mới đã được công bố", {
          description: payload.message || `Sự kiện "${payload.eventTitle}" đã được công bố`,
        });
        
        // Refresh events list by triggering refresh
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    // Subscribe to STUDENT role
    const unsubscribeStudent = subscribeToSystemRole("STUDENT", handleEventPublished);
    
    // Subscribe to TEAM_OFFICER role
    const unsubscribeTeamOfficer = subscribeToSystemRole("TEAM_OFFICER", handleEventPublished);
    
    // Subscribe to CLUB_OFFICER role
    const unsubscribeClubOfficer = subscribeToSystemRole("CLUB_OFFICER", handleEventPublished);

    // Subscribe to CLUB_TREASURE roles
    const unsubscribeClubTreasurer = subscribeToSystemRole("CLUB_TREASURE", handleEventPublished);
    const unsubscribeClubTreasurerAlt = subscribeToSystemRole("CLUB_TREASURER", handleEventPublished);

    // Also subscribe to user queue for personal notifications
    const unsubscribeUser = subscribeToUserQueue(handleEventPublished);

    return () => {
      unsubscribeStudent();
      unsubscribeTeamOfficer();
      unsubscribeClubOfficer();
      unsubscribeClubTreasurer();
      unsubscribeClubTreasurerAlt();
      unsubscribeUser();
    };
  }, [isConnected, subscribeToSystemRole, subscribeToUserQueue]);

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
