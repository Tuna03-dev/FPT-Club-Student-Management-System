"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface EventDetailModalProps {
  event: {
    id: string
    title: string
    description: string
    startDate: Date
    endDate: Date
    location: string
    attendees: number
    status: "upcoming" | "ongoing" | "completed"
    images: string[]
  }
  onClose: () => void
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? event.images.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === event.images.length - 1 ? 0 : prev + 1))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500 text-white"
      case "ongoing":
        return "bg-green-500 text-white"
      case "completed":
        return "bg-red-500 text-white"
      default:
        return "bg-muted text-foreground"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "upcoming":
        return "Sắp diễn ra"
      case "ongoing":
        return "Đang diễn ra"
      case "completed":
        return "Đã kết thúc"
      default:
        return status
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl max-h-[90vh] my-4 shadow-2xl">
        {/* Close button */}
        <div className="sticky top-0 flex justify-end p-4 bg-card border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Image Carousel */}
          {event.images.length > 0 && (
            <div className="space-y-4">
              <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                <img
                  src={event.images[currentImageIndex] || "/placeholder.svg"}
                  alt={`${event.title} - ảnh ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Navigation buttons */}
                {event.images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      aria-label="Ảnh trước"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      aria-label="Ảnh tiếp theo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Image counter only - no thumbnails */}
              <div className="text-sm text-muted-foreground text-center">
                Ảnh {currentImageIndex + 1} / {event.images.length}
              </div>
            </div>
          )}

          {/* Event Details */}
          <div>
            <div
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-white mb-3 ${getStatusColor(event.status)}`}
            >
              {getStatusLabel(event.status)}
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">{event.title}</h2>
            <p className="text-base text-muted-foreground">{event.description}</p>
          </div>

          {/* Event Info */}
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Thời gian</p>
                <p className="text-foreground font-medium">
                  {event.startDate.toLocaleDateString("vi-VN")} : {event.startDate.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                  {event.endDate.getTime() !== event.startDate.getTime() &&
                    ` - ${event.endDate.toLocaleDateString("vi-VN")} : ${event.endDate.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Địa điểm</p>
                <p className="text-foreground font-medium">{event.location}</p>
              </div>
            </div>

          </div>

          {/* Register button */}
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base">
            Đăng ký tham gia
          </Button>
        </div>
      </Card>
    </div>
  )
}
