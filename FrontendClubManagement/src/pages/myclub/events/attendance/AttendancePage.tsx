"use client"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { AttendancePage } from "@/components/features/event/attendance/attendance-page"

export default function EventAttendancePage() {
  const params = useParams()
  const navigate = useNavigate()
  const eventId = params.eventId as string
  const clubId = params.clubId as string

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => navigate(`/myclub/${clubId}/events`)}
          >
            <ChevronLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </div>
      </div>

      <AttendancePage eventId={eventId} />
    </main>
  )
}
