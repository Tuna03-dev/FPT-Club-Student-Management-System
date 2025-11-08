"use client"
import { type Dispatch, type SetStateAction } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { authService } from "@/services/authService"
import { useClubPermissions } from "@/hooks/useClubPermissions"
import { type PendingRequestDto, approveByClub, approveByUniversity, getPendingRequests } from "@/service/EventService"

interface Event {
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

interface PendingRequestsCardProps {
  clubId: number
  pendingRequests: PendingRequestDto[] | null
  loadingPending: boolean
  onRequestClick: (event: Event) => void
  onRefetch: () => Promise<void>
  determineEventStatus: (startDate: Date, endDate: Date) => "upcoming" | "ongoing" | "completed"
  getRequestStatusInfo: (status: string) => { label: string; className: string }
  getErrorMessage: (error: unknown, fallback?: string) => string
  setPendingRequests: Dispatch<SetStateAction<PendingRequestDto[] | null>>
}

export function PendingRequestsCard({
  clubId,
  pendingRequests,
  loadingPending,
  onRequestClick,
  onRefetch,
  determineEventStatus,
  getRequestStatusInfo,
  getErrorMessage,
  setPendingRequests,
}: PendingRequestsCardProps) {
  const { isClubPresident: isPresidentOfCurrentClub } = useClubPermissions(clubId)
  const user = authService.getCurrentUser()
  const roleUpper = user?.systemRole ? String(user.systemRole).trim().toUpperCase() : ""
  const canReview = !!user && (roleUpper === "STAFF" || roleUpper === "CLUB_OFFICER" || isPresidentOfCurrentClub)

  if (!canReview) return null

  const items = (pendingRequests ?? []).filter((req) => {
    if (clubId && clubId > 0) {
      return req.club?.id === clubId
    }
    return true
  })

  return (
    <Card className="p-6 shadow-lg mt-6 border-amber-300">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" />
        <h3 className="text-lg font-bold text-foreground">
          Chờ duyệt{items.length != null ? ` (${items.length})` : ""}
        </h3>
      </div>
      {loadingPending ? (
        <div className="text-sm text-muted-foreground">Đang tải danh sách...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Không có yêu cầu nào</div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {items.map((req) => {
            const user = authService.getCurrentUser()
            const roleUpper = user?.systemRole ? String(user.systemRole).trim().toUpperCase() : undefined
            const reqStatusUpper = req.status ? String(req.status).trim().toUpperCase() : undefined
            const isPresidentActionable = roleUpper === "CLUB_OFFICER" && reqStatusUpper === "PENDING_CLUB"
            const isStaffActionable = roleUpper === "STAFF" && reqStatusUpper === "PENDING_UNIVERSITY"
            const showActions = isPresidentActionable || isStaffActionable

            return (
              <div
                key={req.requestEventId}
                className="rounded-md border bg-amber-50 px-4 py-3 cursor-pointer"
                onClick={() => {
                  if (!req.event) return
                  const mapped: Event = {
                    id: String(req.event.id),
                    title: req.event.title,
                    description: req.description ?? "",
                    startDate: new Date(req.event.startTime),
                    endDate: new Date(req.event.endTime),
                    location: req.event.location ?? "",
                    attendees: 0,
                    status: determineEventStatus(new Date(req.event.startTime), new Date(req.event.endTime)),
                    images: [],
                    isMyDraft: true,
                    requestStatus: req.status,
                  }
                  onRequestClick(mapped)
                }}
              >
                <div className="font-semibold text-foreground">{req.requestTitle}</div>
                <div className="text-xs text-muted-foreground">Tạo bởi: {req.createdBy?.fullName ?? "N/A"}</div>
                {(() => {
                  const info = getRequestStatusInfo(req.status)
                  return (
                    <div className="text-xs text-muted-foreground mt-1 mb-3">
                      <span className={`inline-block rounded px-2 py-0.5 mr-2 ${info.className}`}>
                        {info.label}
                      </span>
                      {req.event ? (
                        <>
                          <span>
                            {new Date(req.event.startTime).toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                            {" - "}
                            {new Date(req.event.endTime).toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                          {req.event.location ? (
                            <div className="mt-1">📍 {req.event.location}</div>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  )
                })()}
                {showActions && (
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const userNow = authService.getCurrentUser()
                        if (!userNow) return
                        try {
                          if (userNow.systemRole === "STAFF") {
                            await approveByUniversity(req.requestEventId, true)
                            setPendingRequests((prev) => (prev ?? []).filter(x => x.requestEventId !== req.requestEventId))
                            toast.success("Đã duyệt sự kiện thành công")
                          } else if (userNow.systemRole === "CLUB_OFFICER") {
                            await approveByClub(req.requestEventId, true)
                            // Refresh pending requests to get updated status
                            const refreshed = await getPendingRequests()
                            setPendingRequests(refreshed)
                            toast.success("Đã duyệt sự kiện. Đang chờ duyệt từ Nhà trường")
                          }
                          await onRefetch()
                        } catch (e: unknown) {
                          console.error("Approve failed", e)
                          toast.error(getErrorMessage(e, "Không thể duyệt sự kiện. Vui lòng thử lại."))
                        }
                      }}
                    >
                      ✓ Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-rose-50 text-rose-600 hover:bg-rose-100"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const userNow = authService.getCurrentUser()
                        if (!userNow) return
                        try {
                          if (userNow.systemRole === "STAFF") {
                            await approveByUniversity(req.requestEventId, false)
                            setPendingRequests((prev) => (prev ?? []).filter(x => x.requestEventId !== req.requestEventId))
                            toast.success("Đã từ chối sự kiện")
                          } else if (userNow.systemRole === "CLUB_OFFICER") {
                            await approveByClub(req.requestEventId, false)
                            // Refresh pending requests to get updated status
                            const refreshed = await getPendingRequests()
                            setPendingRequests(refreshed)
                            toast.success("Đã từ chối sự kiện")
                          }
                          await onRefetch()
                        } catch (e: unknown) {
                          console.error("Reject failed", e)
                          toast.error(getErrorMessage(e, "Không thể từ chối sự kiện. Vui lòng thử lại."))
                        }
                      }}
                    >
                      ✗ Từ chối
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

