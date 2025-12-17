"use client";
import { type Dispatch, type SetStateAction, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { useClubPermissions } from "@/hooks/useClubPermissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type PendingRequestDto,
  approveByClub,
  approveByUniversity,
  getPendingRequests,
} from "@/service/EventService";

interface Event {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  attendees: number;
  status: "upcoming" | "ongoing" | "completed";
  images: string[];
  isMyDraft?: boolean;
  requestStatus?: string;
}

interface PendingRequestMeta {
  requestEventId: number;
  status?: string;
}

interface PendingRequestsCardProps {
  clubId: number;
  pendingRequests: PendingRequestDto[] | null;
  loadingPending: boolean;
  onRequestClick: (event: Event, meta?: PendingRequestMeta) => void;
  onRefetch: () => Promise<void>;
  determineEventStatus: (
    startDate: Date,
    endDate: Date
  ) => "upcoming" | "ongoing" | "completed";
  getRequestStatusInfo: (status: string) => {
    label: string;
    className: string;
  };
  getErrorMessage: (error: unknown, fallback?: string) => string;
  setPendingRequests: Dispatch<SetStateAction<PendingRequestDto[] | null>>;
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
  const { isClubOfficer: isPresidentOfCurrentClub } =
    useClubPermissions(clubId);
  const user = authService.getCurrentUser();
  const roleUpper = user?.systemRole
    ? String(user.systemRole).trim().toUpperCase()
    : "";
  const canReview =
    !!user && (roleUpper === "STAFF" || isPresidentOfCurrentClub);
  
  // State cho dialog nhập lý do từ chối
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);

  const handleReject = async (requestEventId: number, isStaff: boolean, reason: string) => {
    try {
      if (isStaff) {
        await approveByUniversity(requestEventId, false, reason || undefined);
        setPendingRequests((prev) =>
          (prev ?? []).filter(
            (x) => x.requestEventId !== requestEventId
          )
        );
        toast.success("Đã từ chối sự kiện");
        await onRefetch();
        // Refresh lại trang sau khi từ chối
        window.location.reload();
      } else {
        await approveByClub(requestEventId, false, reason || undefined);
        const refreshed = await getPendingRequests(clubId && clubId > 0 ? clubId : undefined);
        setPendingRequests(refreshed);
        toast.success("Đã từ chối sự kiện");
      }
      await onRefetch();
    } catch (e: unknown) {
      console.error("Reject failed", e);
      toast.error(
        getErrorMessage(
          e,
          "Không thể từ chối sự kiện. Vui lòng thử lại."
        )
      );
    }
  };

  if (!canReview) return null;

  const items = (pendingRequests ?? []).filter((req) => {
    if (clubId && clubId > 0) {
      return req.club?.id === clubId;
    }
    return true;
  });

  return (
    <Card className="p-6 shadow-lg mt-6 border-amber-300">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" />
        <h3 className="text-lg font-bold text-foreground">
          Chờ duyệt{items.length != null ? ` (${items.length})` : ""}
        </h3>
      </div>
      {loadingPending ? (
        <div className="text-sm text-muted-foreground">
          Đang tải danh sách...
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Không có yêu cầu nào
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {items.map((req) => {
            const user = authService.getCurrentUser();
            const roleUpper = user?.systemRole
              ? String(user.systemRole).trim().toUpperCase()
              : undefined;
            const reqStatusUpper = req.status
              ? String(req.status).trim().toUpperCase()
              : undefined;
            // Check systemRole in clubRoleList instead of global systemRole
            const clubRole = clubId ? authService.getClubRole(clubId) : null;
            const systemRoleInClub = clubRole?.systemRole?.toUpperCase();
            const isPresidentActionable =
              (systemRoleInClub === "CLUB_OFFICER" || roleUpper === "CLUB_OFFICER") && reqStatusUpper === "PENDING_CLUB";
            const isStaffActionable =
              roleUpper === "STAFF" && reqStatusUpper === "PENDING_UNIVERSITY";
            const showActions = isPresidentActionable || isStaffActionable;

            return (
              <div
                key={req.requestEventId}
                className="rounded-md border bg-amber-50 px-4 py-3 cursor-pointer"
                onClick={() => {
                  if (!req.event) return;
                  const mapped: Event = {
                    id: String(req.event.id),
                    title: req.event.title,
                    description: req.description ?? "",
                    startDate: new Date(req.event.startTime),
                    endDate: new Date(req.event.endTime),
                    location: req.event.location ?? "",
                    attendees: 0,
                    status: determineEventStatus(
                      new Date(req.event.startTime),
                      new Date(req.event.endTime)
                    ),
                    images: [],
                    isMyDraft: true,
                    requestStatus: req.status,
                  };
                  onRequestClick(mapped, {
                    requestEventId: req.requestEventId,
                    status: req.status,
                  });
                }}
              >
                <div className="font-semibold text-foreground">
                  {req.requestTitle}
                </div>
                <div className="text-xs text-muted-foreground">
                  Tạo bởi: {req.createdBy?.fullName ?? "N/A"}
                </div>
                {(() => {
                  const info = getRequestStatusInfo(req.status);
                  return (
                    <div className="text-xs text-muted-foreground mt-1 mb-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 mr-2 ${info.className}`}
                      >
                        {info.label}
                      </span>
                      {req.event ? (
                        <>
                          <span>
                            {new Date(req.event.startTime).toLocaleString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              }
                            )}
                            {" - "}
                            {new Date(req.event.endTime).toLocaleString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              }
                            )}
                          </span>
                          {req.event.location ? (
                            <div className="mt-1">📍 {req.event.location}</div>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  );
                })()}
                {showActions && (() => {
                  // Kiểm tra xem sự kiện đã bắt đầu chưa
                  const isEventStarted = req.event ? new Date(req.event.startTime) < new Date() : false;
                  
                  return (
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      disabled={isEventStarted}
                      title={isEventStarted ? "Sự kiện đã bắt đầu, không thể duyệt" : ""}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const userNow = authService.getCurrentUser();
                        if (!userNow) return;
                        try {
                          if (userNow.systemRole === "STAFF") {
                            await approveByUniversity(req.requestEventId, true);
                            setPendingRequests((prev) =>
                              (prev ?? []).filter(
                                (x) => x.requestEventId !== req.requestEventId
                              )
                            );
                            toast.success("Đã duyệt sự kiện thành công");
                            await onRefetch();
                            // Refresh lại trang sau khi duyệt
                            window.location.reload();
                          } else {
                            // Check systemRole in clubRoleList instead of global systemRole
                            const clubRole = clubId ? authService.getClubRole(clubId) : null;
                            const systemRoleInClub = clubRole?.systemRole?.toUpperCase();
                            if (systemRoleInClub === "CLUB_OFFICER") {
                              await approveByClub(req.requestEventId, true);
                              // Refresh pending requests to get updated status
                              const refreshed = await getPendingRequests(clubId && clubId > 0 ? clubId : undefined);
                              setPendingRequests(refreshed);
                              toast.success(
                                "Đã duyệt sự kiện. Đang chờ duyệt từ Nhà trường"
                              );
                            }
                          }
                          await onRefetch();
                        } catch (e: unknown) {
                          console.error("Approve failed", e);
                          toast.error(
                            getErrorMessage(
                              e,
                              "Không thể duyệt sự kiện. Vui lòng thử lại."
                            )
                          );
                        }
                      }}
                    >
                      ✓ Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-rose-50 text-rose-600 hover:bg-rose-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        const userNow = authService.getCurrentUser();
                        if (!userNow) return;
                        // Mở dialog để nhập lý do cho cả STAFF và CLUB_OFFICER
                        setRejectingRequestId(req.requestEventId);
                        setRejectReason("");
                        setRejectDialogOpen(true);
                      }}
                    >
                      ✗ Từ chối
                    </Button>
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Dialog nhập lý do từ chối (cho cả STAFF và CLUB_OFFICER) */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối sự kiện</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Lý do từ chối *</Label>
              <Textarea
                id="reject-reason"
                placeholder="Nhập lý do từ chối sự kiện..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason("");
                setRejectingRequestId(null);
              }}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!rejectReason.trim()) {
                  toast.error("Vui lòng nhập lý do từ chối");
                  return;
                }
                if (rejectingRequestId !== null) {
                  const userNow = authService.getCurrentUser();
                  const isStaff = userNow?.systemRole === "STAFF";
                  await handleReject(rejectingRequestId, isStaff, rejectReason.trim());
                  setRejectDialogOpen(false);
                  setRejectReason("");
                  setRejectingRequestId(null);
                }
              }}
            >
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
