"use client"

import { useState, useEffect } from "react"
import { MapPin, Clock, ChevronLeft, ChevronRight, Facebook } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { getEventById, computeEventStatus, type EventData } from "@/service/EventService"

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

  useEffect(() => {
    if (!id) return
    
    const fetchEvent = async () => {
      try {
        setLoading(true)
        setError("")
        const eventData = await getEventById(Number(id))
        setEvent(eventData)
        setCurrentMediaIndex(0) // Reset to first media when event changes
      } catch (e) {
        console.error("Error fetching news:", e)
        setError("Không thể tải thông tin sự kiện")
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [id])

  const handlePrevMedia = () => {
    if (!event?.mediaUrls) return
    setCurrentMediaIndex((prev) => (prev === 0 ? event.mediaUrls.length - 1 : prev - 1))
  }

  const handleNextMedia = () => {
    if (!event?.mediaUrls) return
    setCurrentMediaIndex((prev) => (prev === event.mediaUrls.length - 1 ? 0 : prev + 1))
  }

  // Get current media type (IMAGE or VIDEO)
  // Defaults to IMAGE if mediaTypes is not available
  const getCurrentMediaType = (): string => {
    if (!event?.mediaTypes || currentMediaIndex >= event.mediaTypes.length) return "IMAGE"
    return event.mediaTypes[currentMediaIndex] || "IMAGE"
  }

  const isCurrentMediaVideo = getCurrentMediaType() === "VIDEO"
  const currentMediaUrl = event?.mediaUrls?.[currentMediaIndex] || "/placeholder.svg"

  // Convert URLs in text to clickable links
  const convertUrlsToLinks = (text: string): React.ReactNode => {
    if (!text) return text
    
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      // Check if this part is a URL
      if (part.match(/^https?:\/\//)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {part}
          </a>
        )
      }
      return <span key={index}>{part}</span>
    })
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

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {/* Event Media (Image/Video) with Carousel */}
        <div className="relative rounded-lg overflow-hidden h-[500px] bg-muted mb-6 group">
          {isCurrentMediaVideo ? (
            <video
              key={currentMediaIndex}
              src={currentMediaUrl}
              controls
              className="w-full h-full object-contain"
              playsInline
              preload="metadata"
            >
              Trình duyệt của bạn không hỗ trợ video.
            </video>
          ) : (
            <img
              key={currentMediaIndex}
              src={currentMediaUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          )}

          {/* Media Navigation Buttons */}
          {event.mediaUrls && event.mediaUrls.length > 1 && (
            <>
              <button
                onClick={handlePrevMedia}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMedia}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Media Counter */}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium z-10">
                {currentMediaIndex + 1} / {event.mediaUrls.length}
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

        <div className="flex justify-end mb-6">
          <button 
            onClick={() => {
              const url = window.location.href
              // Facebook Share với text mặc định (quote parameter - có thể không hoạt động do Facebook đã deprecated)
              // Nhưng vẫn thử để có thể hoạt động trong một số trường hợp
              const shareText = `${event.title} - ${event.location || ''}`
              const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`
              window.open(facebookShareUrl, '_blank', 'width=600,height=400')
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Facebook className="w-5 h-5" />
            <span>Chia sẻ Facebook</span>
          </button>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">Mô tả sự kiện</h2>
          <div className="text-foreground text-sm leading-relaxed whitespace-pre-line">
            {convertUrlsToLinks(event.description || "")}
          </div>
        </div>
      </main>

      
    </div>
    )
}
