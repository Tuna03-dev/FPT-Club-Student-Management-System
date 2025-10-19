"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, MapPin, Clock, Heart, ChevronLeft, ChevronRight, Facebook, Phone } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { getEventById, computeEventStatus, type EventData } from "@/service/EventService"

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isLiked, setIsLiked] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    if (!id) return
    
    const fetchEvent = async () => {
      try {
        setLoading(true)
        setError("")
        const eventData = await getEventById(Number(id))
        setEvent(eventData)
      } catch (err) {
        setError("Không thể tải thông tin sự kiện")
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [id])

  const handlePrevImage = () => {
    if (!event?.mediaUrls) return
    setCurrentImageIndex((prev) => (prev === 0 ? event.mediaUrls.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    if (!event?.mediaUrls) return
    setCurrentImageIndex((prev) => (prev === event.mediaUrls.length - 1 ? 0 : prev + 1))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Không tìm thấy sự kiện"}</p>
          <Link to="/events" className="text-primary hover:underline">
            Quay lại danh sách sự kiện
          </Link>
        </div>
      </div>
    )
  }

  const startDate = new Date(event.startTime)
  const endDate = new Date(event.endTime)
  const status = computeEventStatus(new Date().toISOString(), event.startTime, event.endTime)
  
  const statusConfig: Record<string, { label: string; className: string }> = {
    upcoming: { label: "Sắp diễn ra", className: "bg-blue-100 text-blue-700" },
    ongoing: { label: "Đang diễn ra", className: "bg-green-100 text-green-700" },
    completed: { label: "Đã kết thúc", className: "bg-gray-100 text-gray-600" },
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/events" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Quay lại</span>
          </Link>
          <button onClick={() => setIsLiked(!isLiked)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <Heart className={`w-5 h-5 ${isLiked ? "fill-primary text-primary" : "text-foreground"}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {/* Event Image with Carousel */}
        <div className="relative rounded-lg overflow-hidden h-64 bg-muted mb-6 group">
          <img
            src={event.mediaUrls?.[currentImageIndex] || "/placeholder.svg"}
            alt={event.title}
            className="w-full h-full object-cover"
          />

          {/* Image Navigation Buttons */}
          {event.mediaUrls && event.mediaUrls.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Image Counter */}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
                {currentImageIndex + 1} / {event.mediaUrls.length}
              </div>
            </>
          )}

          {event.eventTypeName && (
            <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
              {event.eventTypeName}
            </div>
          )}
          {event.clubName && (
            <div className="absolute top-3 left-3 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-semibold">
              {event.clubName}
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-4">{event.title}</h1>

        {/* Time Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Start Date Card */}
          <div className="border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">Ngày bắt đầu</div>
            <div className="p-3 space-y-2">
              <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold inline-block">
                {startDate.toLocaleDateString("vi-VN", { month: "long" }).toUpperCase()}
              </div>
              <div className="text-3xl font-bold text-blue-900">{startDate.getDate()}</div>
              <div className="flex items-center gap-1 text-primary font-semibold text-sm">
                <Clock className="w-4 h-4" />
                <span>{startDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>

          {/* End Date Card */}
          <div className="border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold">Ngày kết thúc</div>
            <div className="p-3 space-y-2">
              <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold inline-block">
                {endDate.toLocaleDateString("vi-VN", { month: "long" }).toUpperCase()}
              </div>
              <div className="text-3xl font-bold text-blue-900">{endDate.getDate()}</div>
              <div className="flex items-center gap-1 text-primary font-semibold text-sm">
                <Clock className="w-4 h-4" />
                <span>{endDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-border">
          <div className="flex items-start gap-2 text-foreground">
            <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-sm">{event.location}</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig[status].className}`}>
            {statusConfig[status].label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
            <Phone className="w-4 h-4" />
            <span>Liên hệ</span>
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
            <Facebook className="w-4 h-4" />
            <span>Chia sẻ Facebook</span>
          </button>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">Mô tả sự kiện</h2>
          <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">{event.description}</p>
        </div>
      </main>

      <footer className="border-t border-border bg-card/30 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <h3 className="font-bold mb-2">Về chúng tôi</h3>
              <p className="text-sm opacity-90">Nền tảng quản lý câu lạc bộ sinh viên FPT</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Liên kết nhanh</h3>
              <ul className="text-sm space-y-1 opacity-90">
                <li>
                  <Link to="/events" className="hover:opacity-100">
                    Sự kiện
                  </Link>
                </li>
                <li>
                  <Link to="/clubs" className="hover:opacity-100">
                    Câu lạc bộ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-2">Liên hệ</h3>
              <p className="text-sm opacity-90">Email: info@fpt.edu.vn</p>
            </div>
          </div>
          <div className="border-t border-background/20 pt-4 text-center text-sm opacity-75">
            <p>&copy; 2025 FPT University Clubs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
    )
}
