"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X, Calendar, MapPin, Users, ClipboardCheck, UserPlus, UserMinus, Edit, Trash2, Eye, Loader2, Tag } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UpdateEventForm, type UpdateEventFormData } from "./update-event-form"
import { updateEvent, deleteEvent, getEventById, registerForEvent, cancelEventRegistration, getRegistrationStatus, cancelClubEventByStaff, publishEventByStaff, approveByClub, approveByUniversity, type UpdateEventPayload } from "@/service/EventService"
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
    clubId?: number
    clubName?: string
    eventTypeName?: string
    isRegistered?: boolean
  }
  clubId?: number
  onClose: () => void
  onUpdated?: (updated: { id: string; title: string; description: string; startDate: Date; endDate: Date; location: string; attendees: number; status: "upcoming" | "ongoing" | "completed"; images: string[]; isMyDraft?: boolean; requestStatus?: string; clubId?: number; clubName?: string; eventTypeName?: string; isRegistered?: boolean }) => void
  onDeleted?: (id: string) => void
  readOnly?: boolean
  pendingRequest?: { requestEventId: number; status?: string }
  onPendingActionSuccess?: () => Promise<void> | void
}

export function EventDetailModal({ event, clubId, onClose, onUpdated, onDeleted, readOnly, pendingRequest, onPendingActionSuccess }: EventDetailModalProps) {
  const navigate = useNavigate()
  const params = useParams()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [openUpdate, setOpenUpdate] = useState(false)
  const [updateFormMedia, setUpdateFormMedia] = useState<Array<{ id: number; url: string; type: "IMAGE" | "VIDEO" }>>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [images, setImages] = useState<string[]>(event.images ?? [])
  const [mediaTypes, setMediaTypes] = useState<string[]>([])
  const [isRegistered, setIsRegistered] = useState(event.isRegistered ?? false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(event.isRegistered === undefined) // Chỉ load nếu chưa có từ props
  const [clubName, setClubName] = useState<string | null>(event.clubName || null)
  const [eventTypeName, setEventTypeName] = useState<string | null>(event.eventTypeName || null)
  const [eventClubId, setEventClubId] = useState<number | null>(event.clubId ?? null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isProcessingPendingAction, setIsProcessingPendingAction] = useState(false)
  const [pendingRejectDialogOpen, setPendingRejectDialogOpen] = useState(false)
  const [pendingRejectReason, setPendingRejectReason] = useState("")
  
  // Get clubId from props or URL params
  const currentClubId = clubId || (params.clubId ? parseInt(params.clubId as string, 10) : undefined)
  const user = authService.getCurrentUser()
  const isStaff = user?.systemRole === "STAFF"
  // Check systemRole in clubRoleList instead of global systemRole
  const clubRole = currentClubId ? authService.getClubRole(currentClubId) : null
  const systemRoleInClub = clubRole?.systemRole?.toUpperCase()
  const isClubPresident = currentClubId && systemRoleInClub === "CLUB_OFFICER"
  const isClubOfficer =
    currentClubId &&
    (systemRoleInClub === "TEAM_OFFICER" ||
      systemRoleInClub === "CLUB_TREASURE" ||
      systemRoleInClub === "CLUB_TREASURER")
  const canMarkAttendance = isClubPresident || isClubOfficer
  const canManageMeeting = canMarkAttendance // FE: lãnh đạo CLB có quyền quản lý MEETING

  // Kiểm tra sự kiện đã kết thúc chưa
  const isEventEnded = new Date() >= event.endDate
  // Cho phép điểm danh trong vòng 1 ngày sau khi kết thúc
  const isWithinOneDayAfterEnd = new Date() < new Date(event.endDate.getTime() + 24 * 60 * 60 * 1000)
  const isEventUpcoming = new Date() < event.startDate
  const isMeeting = (eventTypeName ?? "").toUpperCase() === "MEETING"
  const canEditStaffEvent = isStaff && isEventUpcoming && (eventClubId == null)
  const pendingStatusUpper = pendingRequest?.status
    ? String(pendingRequest.status).trim().toUpperCase()
    : undefined
  const canHandlePending =
    !!pendingRequest &&
    ((pendingStatusUpper === "PENDING_CLUB" && systemRoleInClub === "CLUB_OFFICER") ||
      (pendingStatusUpper === "PENDING_UNIVERSITY" && isStaff))
  const isPendingEventStarted = new Date(event.startDate) < new Date()

  const handleApprovePending = async () => {
    if (!pendingRequest || !pendingStatusUpper) return
    if (isPendingEventStarted) {
      toast.error("Sự kiện đã bắt đầu, không thể duyệt.")
      return
    }
    try {
      setIsProcessingPendingAction(true)
      if (pendingStatusUpper === "PENDING_UNIVERSITY") {
        await approveByUniversity(pendingRequest.requestEventId, true)
        toast.success("Đã duyệt sự kiện thành công")
      } else {
        await approveByClub(pendingRequest.requestEventId, true)
        toast.success("Đã duyệt. Đang chờ duyệt từ Nhà trường")
      }
      await onPendingActionSuccess?.()
      onClose()
    } catch (error) {
      console.error("Approve pending failed:", error)
      toast.error(getErrorMessage(error, "Không thể duyệt sự kiện. Vui lòng thử lại."))
    } finally {
      setIsProcessingPendingAction(false)
    }
  }

  const handleRejectPending = async () => {
    if (!pendingRequest || !pendingStatusUpper) return
    if (!pendingRejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối")
      return
    }
    try {
      setIsProcessingPendingAction(true)
      if (pendingStatusUpper === "PENDING_UNIVERSITY") {
        await approveByUniversity(pendingRequest.requestEventId, false, pendingRejectReason.trim())
      } else {
        await approveByClub(pendingRequest.requestEventId, false, pendingRejectReason.trim())
      }
      toast.success("Đã từ chối sự kiện")
      setPendingRejectDialogOpen(false)
      setPendingRejectReason("")
      await onPendingActionSuccess?.()
      onClose()
    } catch (error) {
      console.error("Reject pending failed:", error)
      toast.error(getErrorMessage(error, "Không thể từ chối sự kiện. Vui lòng thử lại."))
    } finally {
      setIsProcessingPendingAction(false)
    }
  }
  
  // Kiểm tra sự kiện đang diễn ra (thời gian hiện tại nằm giữa startDate và endDate)
  const isEventOngoing = new Date() >= event.startDate && new Date() < event.endDate

  // Fetch full event details to get clubName and mediaUrls - gọi song song để tối ưu
  React.useEffect(() => {
    let cancelled = false
    setIsLoadingDetails(true)
    
    // Nếu là draft hoặc đã kết thúc, không cần check registration
    const needsRegistrationCheck = !event.isMyDraft && !isEventEnded && event.isRegistered === undefined
    if (!needsRegistrationCheck) {
      setIsLoadingRegistration(false)
    }
    
    // Gọi API song song thay vì tuần tự
    const fetchDetails = async () => {
      try {
        const [fullEventData, registrationData] = await Promise.allSettled([
          getEventById(Number(event.id)),
          needsRegistrationCheck
            ? getRegistrationStatus(Number(event.id))
            : Promise.resolve(event.isRegistered ?? false)
        ])
        
        if (cancelled) return
        
        // Xử lý kết quả getEventById
        if (fullEventData.status === 'fulfilled') {
          const full = fullEventData.value
          if (!images || images.length === 0) {
            setImages(full.mediaUrls ?? [])
          }
          setMediaTypes(full.mediaTypes ?? [])
          // Chỉ cập nhật nếu chưa có từ props
          if (!clubName) setClubName(full.clubName || null)
          if (!eventTypeName) setEventTypeName(full.eventTypeName || null)
          if (eventClubId === null) setEventClubId(full.clubId ?? null)
        }
        
        // Xử lý kết quả getRegistrationStatus
        if (needsRegistrationCheck) {
          if (registrationData.status === 'fulfilled') {
            setIsRegistered(registrationData.value as boolean)
          } else if (registrationData.status === 'rejected') {
            setIsRegistered(false)
          }
        } else if (registrationData.status === 'fulfilled') {
          // Nếu đã có từ props, vẫn cập nhật nếu API trả về khác
          const apiValue = registrationData.value as boolean
          if (apiValue !== event.isRegistered) {
            setIsRegistered(apiValue)
          }
        }
        // Đánh dấu đã load xong registration status
        setIsLoadingRegistration(false)
      } catch (error) {
        console.error("Error fetching event details:", error)
        if (needsRegistrationCheck) {
          setIsLoadingRegistration(false)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetails(false)
        }
      }
    }
    
    fetchDetails()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const newRegistered = false
        setIsRegistered(newRegistered)
        // Cập nhật lại event trong calendar
        onUpdated?.({
          ...event,
          isRegistered: newRegistered,
        })
        toast.success("Đã hủy đăng ký sự kiện")
      } else {
        await registerForEvent(Number(event.id))
        const newRegistered = true
        setIsRegistered(newRegistered)
        // Cập nhật lại event trong calendar
        onUpdated?.({
          ...event,
          isRegistered: newRegistered,
        })
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
          {/* Media Carousel (Images & Videos) */}
          {images.length > 0 && (
            <div className="space-y-4">
              <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                {mediaTypes[currentImageIndex] === "VIDEO" ? (
                  <video
                    src={images[currentImageIndex]}
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={images[currentImageIndex] || "/placeholder.svg"}
                    alt={`${event.title} - ${mediaTypes[currentImageIndex] === "VIDEO" ? "video" : "ảnh"} ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Navigation buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      aria-label="Media trước"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      aria-label="Media tiếp theo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Media counter */}
              <div className="text-sm text-muted-foreground text-center">
                {mediaTypes[currentImageIndex] === "VIDEO" ? "Video" : "Ảnh"} {currentImageIndex + 1} / {images.length}
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
              {/* Nút Public cho STAFF draft events (toàn trường, không có club) */}
              {isStaff && eventClubId == null && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10 text-sm gap-2"
                  disabled={isPublishing}
                  onClick={async () => {
                    try {
                      setIsPublishing(true)
                      const published = await publishEventByStaff(Number(event.id))
                      toast.success("Đã public sự kiện thành công!")
                      // Cập nhật event state
                      onUpdated?.({
                        id: String(published.id),
                        title: published.title,
                        description: published.description,
                        startDate: new Date(published.startTime),
                        endDate: new Date(published.endTime),
                        location: published.location,
                        attendees: event.attendees,
                        status: (() => {
                          const now = new Date()
                          const s = new Date(published.startTime)
                          const e = new Date(published.endTime)
                          if (now < s) return "upcoming"
                          if (now >= s && now <= e) return "ongoing"
                          return "completed"
                        })(),
                        images: published.mediaUrls || [],
                        isMyDraft: false,
                        requestStatus: undefined,
                        clubId: published.clubId,
                        clubName: published.clubName,
                        eventTypeName: published.eventTypeName,
                      })
                      // Thông báo cho calendar refetch lại dữ liệu
                      try {
                        window.dispatchEvent(new CustomEvent('events:refetch'))
                      } catch { /* empty */ }
                    } catch (error: unknown) {
                      console.error("Error publishing event:", error)
                      toast.error(getErrorMessage(error, "Không thể public sự kiện. Vui lòng thử lại."))
                    } finally {
                      setIsPublishing(false)
                    }
                  }}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang public...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      Công Khai
                    </>
                  )}
                </Button>
              )}
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10 text-sm gap-2"
                onClick={async () => {
                  // Fetch lại media để đảm bảo có mediaIds
                  try {
                    const full = await getEventById(Number(event.id))
                    const mediaUrls = full.mediaUrls ?? []
                    const mediaTypes = full.mediaTypes ?? []
                    const mediaIds = full.mediaIds ?? []
                    setUpdateFormMedia(mediaUrls.map((url, idx) => ({
                      id: mediaIds[idx] ?? 0,
                      url,
                      type: (mediaTypes[idx] ?? "IMAGE") as "IMAGE" | "VIDEO"
                    })))
                    setOpenUpdate(true)
                  } catch {
                    setOpenUpdate(true)
                  }
                }}
              >
                <Edit className="w-4 h-4" />
                Cập nhật
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white h-10 text-sm gap-2"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteDialogOpen(true)
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
                    onClick={async () => {
                      // Fetch lại media để đảm bảo có mediaIds
                      try {
                        const full = await getEventById(Number(event.id))
                        const mediaUrls = full.mediaUrls ?? []
                        const mediaTypes = full.mediaTypes ?? []
                        const mediaIds = full.mediaIds ?? []
                        setUpdateFormMedia(mediaUrls.map((url, idx) => ({
                          id: mediaIds[idx] ?? 0,
                          url,
                          type: (mediaTypes[idx] ?? "IMAGE") as "IMAGE" | "VIDEO"
                        })))
                        setOpenUpdate(true)
                      } catch {
                        setOpenUpdate(true)
                      }
                    }}
                  >
                    <Edit className="w-4 h-4" />
                    Sửa
                  </Button>
                  <Button
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white h-10 text-sm gap-2"
                    disabled={isDeleting}
                    onClick={() => {
                      setDeleteDialogOpen(true)
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
              {isStaff && isEventUpcoming && (
                    <>
                      {isLoadingDetails && eventClubId === null ? (
                        <Button
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-10 text-sm gap-2"
                          disabled
                        >
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang tải...
                        </Button>
                      ) : eventClubId != null ? (
                        <Button
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-10 text-sm gap-2"
                          onClick={() => {
                            setCancelReason("");
                            setCancelDialogOpen(true);
                          }}
                        >
                          Hủy sự kiện
                        </Button>
                      ) : null}
                    </>
                  )}
              {/* Nút Điểm danh/Xem điểm danh - chỉ hiện cho CLUB_OFFICER và TEAM_OFFICER */}
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
                    isLoadingRegistration
                      ? "bg-muted text-muted-foreground" 
                      : isRegistered 
                        ? "bg-gray-500 hover:bg-gray-600 text-white" 
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                  onClick={handleRegisterClick}
                  disabled={isRegistering || isLoadingRegistration || (isRegistered && isEventOngoing)}
                  title={isRegistered && isEventOngoing ? "Không thể hủy đăng ký khi sự kiện đang diễn ra" : undefined}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : isLoadingRegistration ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải...
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

          {pendingRequest && canHandlePending && (
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground mb-2">Phê duyệt yêu cầu</p>
              <div className="flex flex-col gap-2">
                {isPendingEventStarted && (
                  <span className="text-xs text-amber-600">
                    Sự kiện đã bắt đầu nên không thể duyệt. Vui lòng kiểm tra lại.
                  </span>
                )}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-sm gap-2"
                    disabled={isProcessingPendingAction || isPendingEventStarted}
                    onClick={handleApprovePending}
                  >
                    {isProcessingPendingAction ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-4 h-4" />
                        Duyệt
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white h-10 text-sm gap-2"
                    disabled={isProcessingPendingAction}
                    onClick={() => {
                      setPendingRejectReason("")
                      setPendingRejectDialogOpen(true)
                    }}
                  >
                    <X className="w-4 h-4" />
                    Từ chối
                  </Button>
                </div>
              </div>
            </div>
          )}
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
              ...(updateFormMedia.length > 0 ? { existingMedia: updateFormMedia } : {})
            }}
            onSubmit={async (data: UpdateEventFormData) => {
              const payload: UpdateEventPayload = {
                title: data.title && data.title.trim() !== "" ? data.title : undefined,
                description: data.description && data.description.trim() !== "" ? data.description : undefined,
                location: data.location && data.location.trim() !== "" ? data.location : undefined,
                startTime: data.startTime && data.startTime !== "" ? data.startTime : undefined,
                endTime: data.endTime && data.endTime !== "" ? data.endTime : undefined,
                eventTypeId: data.eventTypeId ? Number(data.eventTypeId) : undefined,
                images: data.eventImages ?? [],
                deleteMediaIds: data.deleteMediaIds && data.deleteMediaIds.length > 0 ? data.deleteMediaIds : undefined,
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
                  clubId: updated.clubId,
                  clubName: updated.clubName,
                  eventTypeName: updated.eventTypeName,
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
      
      {/* Dialog nhập lý do từ chối yêu cầu (Pending) */}
      <Dialog open={pendingRejectDialogOpen} onOpenChange={(open) => {
        setPendingRejectDialogOpen(open)
        if (!open) {
          setPendingRejectReason("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pending-reject-reason">Lý do từ chối *</Label>
              <Textarea
                id="pending-reject-reason"
                placeholder="Nhập lý do từ chối sự kiện..."
                value={pendingRejectReason}
                onChange={(e) => setPendingRejectReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingRejectDialogOpen(false)
                setPendingRejectReason("")
              }}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={isProcessingPendingAction}
              onClick={handleRejectPending}
            >
              {isProcessingPendingAction ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận từ chối"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog nhập lý do hủy sự kiện (chỉ cho STAFF) */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy sự kiện</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancel-reason">Lý do hủy *</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Nhập lý do hủy sự kiện..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason("");
              }}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!cancelReason.trim()) {
                  toast.error("Vui lòng nhập lý do hủy");
                  return;
                }
                try {
                  await cancelClubEventByStaff(Number(event.id), cancelReason.trim());
                  toast.success("Đã hủy sự kiện (đưa về nháp)");
                  // Thông báo cho calendar refetch lại dữ liệu
                  try {
                    window.dispatchEvent(new CustomEvent('events:refetch'));
                  } catch { /* empty */ }
                  setCancelDialogOpen(false);
                  setCancelReason("");
                  onClose();
                } catch (error: unknown) {
                  console.error("Cancel event failed:", error);
                  toast.error(getErrorMessage(error, "Không thể hủy sự kiện. Vui lòng thử lại."));
                }
              }}
            >
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog xóa sự kiện */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa sự kiện</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa sự kiện "{event.title}"? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
              }}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                try {
                  setIsDeleting(true)
                  await deleteEvent(Number(event.id))
                  toast.success("Đã xóa sự kiện thành công")
                  onDeleted?.(event.id)
                  setDeleteDialogOpen(false)
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
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Đang xóa...
                </>
              ) : (
                "Xác nhận xóa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
