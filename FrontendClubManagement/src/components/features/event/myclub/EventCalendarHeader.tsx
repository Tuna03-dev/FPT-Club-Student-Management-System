"use client"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authService } from "@/services/authService"

interface EventCalendarHeaderProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onCreateEvent: () => void
  clubId?: number
}

const monthNames = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
]

export function EventCalendarHeader({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onCreateEvent,
  clubId,
}: EventCalendarHeaderProps) {
  const user = authService.getCurrentUser()
  if (!user) {
    return null
  }
  
  // Check permission: STAFF hoặc có systemRole CLUB_OFFICER/TEAM_OFFICER trong club hiện tại
  const isStaff = user.systemRole === "STAFF"
  const clubRole = clubId ? authService.getClubRole(clubId) : null
  const systemRoleInClub = clubRole?.systemRole?.toUpperCase()
  const canCreate =
    isStaff ||
    (clubId &&
      systemRoleInClub &&
      ["CLUB_OFFICER", "TEAM_OFFICER", "CLUB_TREASURE", "CLUB_TREASURER"].includes(
        systemRoleInClub
      ))

  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-foreground">
        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
      </h2>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={onPrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        {canCreate && (
          <Button onClick={onCreateEvent}>+ Tạo sự kiện mới</Button>
        )}
      </div>
    </div>
  )
}

