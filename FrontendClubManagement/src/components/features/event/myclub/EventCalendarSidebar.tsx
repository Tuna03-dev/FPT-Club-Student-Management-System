"use client"
import { type Dispatch, type SetStateAction } from "react"
import { EventLegend } from "./EventLegend"
import { PendingRequestsCard } from "./PendingRequestsCard"
import { CancelledEventsCard } from "./CancelledEventsCard"
import { type PendingRequestDto } from "@/service/EventService"

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
  isPendingPublish?: boolean
}

interface EventCalendarSidebarProps {
  clubId: number
  pendingRequests: PendingRequestDto[] | null
  loadingPending: boolean
  cancelledEvents: Event[] | null
  loadingCancelled: boolean
  onRequestClick: (event: Event, meta?: { requestEventId: number; status?: string }) => void
  onRefetch: () => Promise<void>
  determineEventStatus: (startDate: Date, endDate: Date) => "upcoming" | "ongoing" | "completed"
  getRequestStatusInfo: (status: string) => { label: string; className: string }
  getErrorMessage: (error: unknown, fallback?: string) => string
  setCancelledEvents: (events: Event[]) => void
  setPendingRequests: Dispatch<SetStateAction<PendingRequestDto[] | null>>
}

export function EventCalendarSidebar({
  clubId,
  pendingRequests,
  loadingPending,
  cancelledEvents,
  loadingCancelled,
  onRequestClick,
  onRefetch,
  determineEventStatus,
  getRequestStatusInfo,
  getErrorMessage,
  setCancelledEvents,
  setPendingRequests,
}: EventCalendarSidebarProps) {
  return (
    <div>
      <EventLegend clubId={clubId} />
      <PendingRequestsCard
        clubId={clubId}
        pendingRequests={pendingRequests}
        loadingPending={loadingPending}
        onRequestClick={onRequestClick}
        onRefetch={onRefetch}
        determineEventStatus={determineEventStatus}
        getRequestStatusInfo={getRequestStatusInfo}
        getErrorMessage={getErrorMessage}
        setPendingRequests={setPendingRequests}
      />
      <CancelledEventsCard
        clubId={clubId}
        cancelledEvents={cancelledEvents}
        loadingCancelled={loadingCancelled}
        onRefetch={onRefetch}
        determineEventStatus={determineEventStatus}
        getErrorMessage={getErrorMessage}
        setCancelledEvents={setCancelledEvents}
      />
    </div>
  )
}

