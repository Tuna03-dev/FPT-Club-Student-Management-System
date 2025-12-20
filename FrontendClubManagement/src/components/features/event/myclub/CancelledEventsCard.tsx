"use client"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { authService } from "@/services/authService"
import { getStaffCancelledEvents, restoreCancelledEventByStaff, deleteCancelledEventByStaff } from "@/service/EventService"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

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
  eventTypeName?: string
}

interface CancelledEventsCardProps {
  clubId: number
  cancelledEvents: Event[] | null
  loadingCancelled: boolean
  onRefetch: () => Promise<void>
  determineEventStatus: (startDate: Date, endDate: Date) => "upcoming" | "ongoing" | "completed"
  getErrorMessage: (error: unknown, fallback?: string) => string
  setCancelledEvents: (events: Event[]) => void
  onCancelledEventClick?: (event: Event) => void
}

export function CancelledEventsCard({
  clubId,
  cancelledEvents,
  loadingCancelled,
  onRefetch,
  determineEventStatus,
  getErrorMessage,
  setCancelledEvents,
  onCancelledEventClick,
}: CancelledEventsCardProps) {
  const user = authService.getCurrentUser()
  const isStaff = !!user && user.systemRole === "STAFF"
  
  // State cho confirm dialog xóa
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [deletingEventTitle, setDeletingEventTitle] = useState<string>("")

  if (!isStaff) return null

  const items = cancelledEvents ?? []

  return (
    <Card className="p-6 shadow-lg mt-6 border-gray-300">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block w-3 h-3 rounded-full bg-gray-400" />
        <h3 className="text-lg font-bold text-foreground">
          Sự kiện đã hủy{items.length != null ? ` (${items.length})` : ""}
        </h3>
      </div>
      {loadingCancelled ? (
        <div className="text-sm text-muted-foreground">Đang tải danh sách...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Không có sự kiện nào</div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {items.map((ev) => (
            <div 
              key={ev.id} 
              className="rounded-md border bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => {
                if (onCancelledEventClick) {
                  onCancelledEventClick(ev)
                }
              }}
            >
              <div className="font-semibold text-foreground">{ev.title}</div>
              <div className="text-xs text-muted-foreground mt-1 mb-3">
                <span>
                  {ev.startDate.toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                  {" - "}
                  {ev.endDate.toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
                {ev.location ? <div className="mt-1">📍 {ev.location}</div> : null}
              </div>
              <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                  disabled={(() => {
                    const now = new Date()
                    return ev.startDate <= now
                  })()}
                  onClick={async () => {
                    if ((() => {
                      const now = new Date()
                      return ev.startDate <= now
                    })()) return
                    await restoreCancelledEventByStaff(Number(ev.id))
                    toast.success("Đã khôi phục sự kiện")
                    const refreshed = await getStaffCancelledEvents(clubId && clubId > 0 ? clubId : undefined)
                    const mapped: Event[] = (refreshed ?? []).map((e) => ({
                      id: String(e.id),
                      title: e.title,
                      description: e.description,
                      startDate: new Date(e.startTime),
                      endDate: new Date(e.endTime),
                      location: e.location ?? "",
                      attendees: 0,
                      status: determineEventStatus(new Date(e.startTime), new Date(e.endTime)),
                      images: e.mediaUrls || [],
                      isMyDraft: true,
                      requestStatus: "CANCELLED",
                      eventTypeName: e.eventTypeName,
                    }))
                    setCancelledEvents(mapped)
                    await onRefetch()
                  }}
                >
                  Khôi phục
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-rose-50 text-rose-600 hover:bg-rose-100"
                  onClick={() => {
                    setDeletingEventId(ev.id)
                    setDeletingEventTitle(ev.title)
                    setDeleteDialogOpen(true)
                  }}
                >
                  Xóa
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Confirm Dialog xóa sự kiện */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa sự kiện</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa sự kiện "{deletingEventTitle}"? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeletingEventId(null)
                setDeletingEventTitle("")
              }}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deletingEventId) {
                  try {
                    await deleteCancelledEventByStaff(Number(deletingEventId))
                    toast.success("Đã xóa sự kiện")
                    setCancelledEvents((items ?? []).filter((x: Event) => x.id !== deletingEventId))
                    await onRefetch()
                    setDeleteDialogOpen(false)
                    setDeletingEventId(null)
                    setDeletingEventTitle("")
                  } catch (e: unknown) {
                    console.error(e)
                    toast.error(getErrorMessage(e, "Không thể xóa sự kiện"))
                  }
                }
              }}
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

