"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X, Calendar, MapPin, Users, ClipboardCheck, UserPlus, UserMinus, Edit, Trash2, Eye, Loader2, Tag } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UpdateEventForm, type UpdateEventFormData } from "./update-event-form"
import { updateEvent, deleteEvent, getEventById, registerForEvent, cancelEventRegistration, getRegistrationStatus, cancelClubEventByStaff } from "@/service/EventService"
import { authService } from "@/services/authService"
import { toast } from "sonner"
import React from "react"

// Helper to normalize error messages
const getErrorMessage = (error: unknown, fallback = "Đã xảy ra lỗi"): string => {
  const anyErr = error as { response?: { data?: { message?: string } } ; message?: string }
  return anyErr?.response?.data?.message || anyErr?.message || fallback
}

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
    isMyDraft?: boolean
    requestStatus?: string
  }
  clubId?: number
  onClose: () => void
  onUpdated?: (updated: { id: string; title: string; description: string; startDate: Date; endDate: Date; location: string; attendees: number; status: "upcoming" | "ongoing" | "completed"; images: string[]; isMyDraft?: boolean; requestStatus?: string }) => void
  onDeleted?: (id: string) => void
  readOnly?: boolean
}

export function EventDetailModal({ event, clubId, onClose, onUpdated, onDeleted, readOnly }: EventDetailModalProps) {
  const navigate = useNavigate()
  const params = useParams()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [openUpdate, setOpenUpdate] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [images, setImages] = useState<string[]>(event.images ?? [])
  const [isRegistered, setIsRegistered] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [clubName, setClubName] = useState<string | null>(null)
  const [eventTypeName, setEventTypeName] = useState<string | null>(null)
  const [eventClubId, setEventClubId] = useState<number | null>(null)
  
  // Get clubId from props or URL params
  const currentClubId = clubId || (params.clubId ? parseInt(params.clubId as string, 10) : undefined)
  const user = authService.getCurrentUser()
  const isClubPresident = user?.systemRole === "CLUB_PRESIDENT"
  const isClubOfficer = user?.systemRole === "CLUB_OFFICER"
  const isStaff = user?.systemRole === "STAFF"
  const canMarkAttendance = isClubPresident || isClubOfficer
  const canManageMeeting = canMarkAttendance // FE: lãnh đạo CLB có quyền quản lý MEETING

  // Kiểm tra sự kiện đã kết thúc chưa
  const isEventEnded = new Date() >= event.endDate
  // Cho phép điểm danh trong vòng 1 ngày sau khi kết thúc
  const isWithinOneDayAfterEnd = new Date() < new Date(event.endDate.getTime() + 24 * 60 * 60 * 1000)
  const isEventUpcoming = new Date() < event.startDate
  const isMeeting = (eventTypeName ?? "").toUpperCase() === "MEETING"
  const canEditStaffEvent = isStaff && isEventUpcoming && (eventClubId == null)
  
  // Kiểm tra sự kiện đang diễn ra (thời gian hiện tại nằm giữa startDate và endDate)
  const isEventOngoing = new Date() >= event.startDate && new Date() < event.endDate

  // Fetch full event details to get clubName and mediaUrls
  React.useEffect(() => {
    let cancelled = false
    getEventById(Number(event.id))
      .then((full) => {
        if (!cancelled) {
          if (!images || images.length === 0) {
            setImages(full.mediaUrls ?? [])
          }
          setClubName(full.clubName || null)
          setEventTypeName(full.eventTypeName || null)
          setEventClubId(full.clubId ?? null)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  // Kiểm tra trạng thái đăng ký khi không phải draft
  React.useEffect(() => {
    if (!event.isMyDraft && !isEventEnded) {
      getRegistrationStatus(Number(event.id))
        .then((registered) => {
          setIsRegistered(registered)
        })
        .catch(() => {
          setIsRegistered(false)
        })
    }
  }, [event.id, event.isMyDraft, isEventEnded])

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
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

  const handleRegisterClick = async () => {
    try {
      setIsRegistering(true)
      if (isRegistered) {
        if (isEventOngoing) {
          toast.error("Không thể hủy đăng ký khi sự kiện đang diễn ra.")
          setIsRegistering(false)
          return
        }
        await cancelEventRegistration(Number(event.id))
        setIsRegistered(false)
        toast.success("Đã hủy đăng ký sự kiện")
      } else {
        await registerForEvent(Number(event.id))
        setIsRegistered(true)
        toast.success("Đăng ký tham gia sự kiện thành công!")
      }
    } catch (error: unknown) {
      console.error("Error registering for event:", error)
      toast.error(getErrorMessage(error, isRegistered ? "Không thể hủy đăng ký. Vui lòng thử lại." : "Không thể đăng ký. Vui lòng thử lại."))
    } finally {
      setIsRegistering(false)
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
          {images.length > 0 && (
            <div className="space-y-4">
              <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                <img
                  src={images[currentImageIndex] || "/placeholder.svg"}
                  alt={`${event.title} - ảnh ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Navigation buttons */}
                {images.length > 1 && (
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
                Ảnh {currentImageIndex + 1} / {images.length}
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
            {event.isMyDraft && event.requestStatus && (
              <div className="inline-block ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 align-middle">
                {event.requestStatus === 'PENDING_CLUB' ? 'Chờ duyệt CLB' : event.requestStatus === 'PENDING_UNIVERSITY' ? 'Chờ duyệt Nhà trường' : event.requestStatus}
              </div>
            )}
            <h2 className="text-3xl font-bold text-foreground mb-2">{event.title}</h2>
            <p className="text-base text-muted-foreground">{event.description}</p>
          </div>

          {/* Event Info */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Thời gian</p>
                <p className="text-sm text-foreground font-medium">
                  {event.startDate.toLocaleDateString("vi-VN")} : {event.startDate.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                  {event.endDate.getTime() !== event.startDate.getTime() &&
                    ` - ${event.endDate.toLocaleDateString("vi-VN")} : ${event.endDate.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Câu lạc bộ</p>
                <p className="text-sm text-foreground font-medium">{clubName || "Sự kiện toàn trường"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Địa điểm</p>
                <p className="text-sm text-foreground font-medium">{event.location}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Thể loại</p>
                <p className="text-sm text-foreground font-medium">{eventTypeName || "Không xác định"}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
        {!readOnly && (event.isMyDraft ? (
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10 text-sm gap-2"
                onClick={() => setOpenUpdate(true)}
              >
                <Edit className="w-4 h-4" />
                Cập nhật
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white h-10 text-sm gap-2"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true)
                    await deleteEvent(Number(event.id))
                    toast.success("Đã xóa sự kiện thành công")
                    onDeleted?.(event.id)
                    onClose()
                  } catch (error: unknown) {
                    console.error("Error deleting event:", error)
                    toast.error(getErrorMessage(error, "Không thể xóa sự kiện. Vui lòng thử lại."))
                  } finally {
                    setIsDeleting(false)
                  }
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Xóa
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              {/* Nút Sửa/Xóa cho sự kiện MEETING (lãnh đạo CLB) hoặc sự kiện STAFF tạo (toàn trường) trước khi bắt đầu */}
              {((isMeeting && canManageMeeting) || canEditStaffEvent) && isEventUpcoming && (
                <>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10 text-sm gap-2"
                    onClick={() => setOpenUpdate(true)}
                  >
                    <Edit className="w-4 h-4" />
                    Sửa
                  </Button>
                  <Button
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white h-10 text-sm gap-2"
                    disabled={isDeleting}
                    onClick={async () => {
                      try {
                        setIsDeleting(true)
                        await deleteEvent(Number(event.id))
                        toast.success("Đã xóa sự kiện thành công")
                        onDeleted?.(event.id)
                        onClose()
                      } catch (error: unknown) {
                        console.error("Error deleting event:", error)
                        toast.error(getErrorMessage(error, "Không thể xóa sự kiện. Vui lòng thử lại."))
                      } finally {
                        setIsDeleting(false)
                      }
                    }}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang xóa...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Xóa
                      </>
                    )}
                  </Button>
                </>
              )}
                  {/* STAFF: Hủy sự kiện CLB (đưa về nháp) trước khi bắt đầu */}
              {isStaff && eventClubId != null && isEventUpcoming && (
                    <Button
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-10 text-sm gap-2"
                      onClick={async () => {
                        try {
                          await cancelClubEventByStaff(Number(event.id))
                      toast.success("Đã hủy sự kiện (đưa về nháp)")
                          // Thông báo cho calendar refetch lại dữ liệu
                          try {
                            window.dispatchEvent(new CustomEvent('events:refetch'))
                          } catch {}
                          onClose()
                        } catch (error: unknown) {
                          console.error("Cancel event failed:", error)
                          toast.error(getErrorMessage(error, "Không thể hủy sự kiện. Vui lòng thử lại."))
                        }
                      }}
                    >
                      Hủy sự kiện
                    </Button>
                  )}
              {/* Nút Điểm danh/Xem điểm danh - chỉ hiện cho CLUB_PRESIDENT và CLUB_OFFICER */}
              {canMarkAttendance && currentClubId && (
                <Button
                  className={`${(!isEventEnded || isWithinOneDayAfterEnd) ? "flex-1" : "flex-1"} h-10 text-sm gap-2 ${
                    (isEventEnded && !isWithinOneDayAfterEnd)
                      ? "bg-white text-foreground border border-border hover:bg-orange-500 hover:text-white hover:border-orange-600"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  }`}
                  onClick={() => {
                    onClose()
                    const url = (isEventEnded && !isWithinOneDayAfterEnd)
                      ? `/myclub/${currentClubId}/events/attendance/${event.id}?mode=view`
                      : `/myclub/${currentClubId}/events/attendance/${event.id}`
                    navigate(url)
                  }}
                >
                  {(isEventEnded && !isWithinOneDayAfterEnd) ? (
                    <>
                      <Eye className="w-4 h-4" />
                      Xem điểm danh
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4" />
                      Điểm danh
                    </>
                  )}
                </Button>
              )}
              {/* Nút đăng ký - chỉ hiển thị nếu sự kiện chưa kết thúc và không phải STAFF */}
              {!isStaff && !isEventEnded && (
                <Button 
                  className={`${canMarkAttendance && currentClubId ? "flex-1" : "w-full"} h-10 text-sm gap-2 ${
                    isRegistered 
                      ? "bg-gray-500 hover:bg-gray-600 text-white" 
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                  onClick={handleRegisterClick}
                  disabled={isRegistering || (isRegistered && isEventOngoing)}
                  title={isRegistered && isEventOngoing ? "Không thể hủy đăng ký khi sự kiện đang diễn ra" : undefined}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : isRegistered ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      {isEventOngoing ? "Đã đăng ký" : "Hủy đăng ký"}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Đăng ký tham gia
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
      {/* Update Modal */}
      <Dialog open={openUpdate} onOpenChange={setOpenUpdate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cập nhật sự kiện</DialogTitle>
          </DialogHeader>
          <UpdateEventForm
            initial={{
              title: event.title,
              description: event.description,
              location: event.location,
              startTime: new Date(event.startDate).toISOString().slice(0,16),
              endTime: new Date(event.endDate).toISOString().slice(0,16),
              // eventTypeId không có sẵn trong event, để trống nghĩa là không đổi
            }}
            onSubmit={async (data: UpdateEventFormData) => {
              const payload = {
                title: data.title && data.title.trim() !== "" ? data.title : undefined,
                description: data.description && data.description.trim() !== "" ? data.description : undefined,
                location: data.location && data.location.trim() !== "" ? data.location : undefined,
                startTime: data.startTime && data.startTime !== "" ? data.startTime : undefined,
                endTime: data.endTime && data.endTime !== "" ? data.endTime : undefined,
                eventTypeId: data.eventTypeId ? Number(data.eventTypeId) : undefined,
                images: data.eventImages ?? [],
              }
              try {
                const updated = await updateEvent(Number(event.id), payload)
                toast.success("Cập nhật sự kiện thành công!")
                // Map back to local event shape
                onUpdated?.({
                  id: String(updated.id),
                  title: updated.title,
                  description: updated.description,
                  startDate: new Date(updated.startTime),
                  endDate: new Date(updated.endTime),
                  location: updated.location,
                  attendees: event.attendees,
                  status: (() => {
                    const now = new Date()
                    const s = new Date(updated.startTime)
                    const e = new Date(updated.endTime)
                    if (now < s) return "upcoming"
                    if (now >= s && now <= e) return "ongoing"
                    return "completed"
                  })(),
                  images: updated.mediaUrls || [],
                  isMyDraft: event.isMyDraft,
                  requestStatus: event.requestStatus,
                })
              } catch (error: unknown) {
                console.error("Error updating event:", error)
                toast.error(getErrorMessage(error, "Không thể cập nhật sự kiện. Vui lòng thử lại."))
                throw error
              }
            }}
            onSuccess={() => setOpenUpdate(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
